"""Blender 4.5 LTS scene adapter. Input remains Z-up millimetres; Blender uses Z-up metres."""
import hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

source,target=map(Path,sys.argv[sys.argv.index('--')+1:])
request=json.loads(source.read_text(encoding='utf-8')); geometry=request['geometry']
assets={a['assetVersionId']:a for a in request['privateAssets']}
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.resolution_x=1440 if request['profile']=='preview' else 3840;scene.render.resolution_y=1080 if request['profile']=='preview' else 2880;scene.render.resolution_percentage=100
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
objects=[];wall_solids=[];layer_solids={};protected=[];protected_sources=set();warnings=list(geometry.get('warnings',[]));outline_imports=[]
if any(body['kind']!='catalog_object' or not (assets.get(body.get('assetVersionId'),{}).get('kind')=='mesh' and assets.get(body.get('assetVersionId'),{}).get('geometryVerified')) for body in geometry.get('bodies',[])):warnings.append('Neutral material appearance; no verified physical slab texture supplied.')
chord_error=float(geometry.get('tessellationChordErrorMm','0.005'))

def centre_mm(body):
    points=body.get('mesh',{}).get('verticesMm',[])
    if not points:
        contour=body.get('contour',{});points=[[float(e['from']['xMm']),float(e['from']['yMm']),float(body.get('zMm',0) or 0)] for part in [contour]+contour.get('islands',[]) for e in part.get('outer',[])]
    local=[(min(float(p[i]) for p in points)+max(float(p[i]) for p in points))/2 for i in range(3)] if points else [0,0,0]
    m=body['matrix'];return[sum(float(m[i*4+j])*local[j] for j in range(3))+float(m[i*4+3]) for i in range(3)]
centres=[centre_mm(body) for body in geometry.get('bodies',[])]
render_origin_mm=[(min(p[i] for p in centres)+max(p[i] for p in centres))/2 for i in range(3)] if centres else [0,0,0]

def matrix_mm(flat,local_origin_mm=None):
    rows=[list(map(float,flat[i:i+4])) for i in range(0,16,4)];local=local_origin_mm or [0,0,0]
    for i in range(3):rows[i][3]=(float(flat[i*4+3])+sum(float(flat[i*4+j])*local[j] for j in range(3))-render_origin_mm[i])/1000
    return Matrix(rows)

def sample_ring(edges):
    points=[]
    for edge in edges:
        a,b=edge['from'],edge['to'];x,y=float(a['xMm']),float(a['yMm']);points.append((x/1000,y/1000))
        if edge['kind']=='circular_arc':
            c=edge['center'];cx,cy=float(c['xMm']),float(c['yMm']);r=math.hypot(x-cx,y-cy)
            start=math.atan2(y-cy,x-cx);end=math.atan2(float(b['yMm'])-cy,float(b['xMm'])-cx)
            sweep=(end-start)%(2*math.pi)
            if edge['clockwise']:sweep=-((start-end)%(2*math.pi))
            if abs(sweep)<1e-12:sweep=-2*math.pi if edge['clockwise'] else 2*math.pi
            step=2*math.acos(max(-1,min(1,1-(chord_error/2)/r))) if r>chord_error/2 else math.pi/8
            count=max(2,math.ceil(abs(sweep)/max(step,1e-8)))
            if count>65536:raise ValueError('Arc exceeds bounded tessellation limit')
            for i in range(1,count):
                angle=start+sweep*i/count;points.append(((cx+r*math.cos(angle))/1000,(cy+r*math.sin(angle))/1000))
    return points

def oriented(points,positive):
    area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))
    return points if (area>0)==positive else list(reversed(points))

def material(name,color,metallic=0,roughness=.52):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    return m

stone=material('Neutral stone appearance; physical slab variation unconfirmed',(.36,.35,.32),0,.48)
wall=material('Neutral mineral finish',(.75,.75,.70),0,.72)
metal=material('Neutral metal appearance',(.33,.23,.11),.72,.32)
envelope=material('Verified bounding envelope only',(.10,.24,.18),0,.7)

def extrusion(name,contour,depth_mm,z_mm,matrix,mat):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.resolution_u=1;curve.render_resolution_u=1
    depth=float(depth_mm or 0)/1000;curve.extrude=depth/2;curve.bevel_depth=0
    rings=[oriented(sample_ring(ring),index==0) for part in [contour]+contour.get('islands',[]) for index,ring in enumerate([part['outer']]+part.get('holes',[]))]
    all_points=[p for ring in rings for p in ring];origin=[(min(p[i] for p in all_points)+max(p[i] for p in all_points))/2 for i in range(2)]
    for points in rings:
        spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
        for point,(x,y) in zip(spline.points,points):point.co=(x-origin[0],y-origin[1],0,1)
        spline.use_cyclic_u=True
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj);curve.materials.append(mat)
    local=[origin[0]*1000,origin[1]*1000,float(z_mm)+depth*500]
    obj.matrix_world=matrix_mm(matrix,local) if isinstance(matrix,list) else matrix@Matrix.Translation(tuple(v/1000 for v in local))
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
    if depth>0:
        import bmesh
        bm=bmesh.new();bm.from_mesh(obj.data);extent=max(abs(v) for p in all_points for v in [p[0]-origin[0],p[1]-origin[1],depth/2]);weld=max(1e-8,extent*2**-22)
        if weld>chord_error/2000:bm.free();raise ValueError('Local solid exceeds documented float precision; split the workpiece before rendering')
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=weld);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        if any(not e.is_manifold for e in bm.edges):bm.free();raise ValueError('Canonical extruded contour is not watertight: '+name)
        bm.to_mesh(obj.data);bm.free()
    objects.append(obj);return obj

def solid_mesh(body,mat):
    data=body['mesh'];origin=[(min(float(p[i]) for p in data['verticesMm'])+max(float(p[i]) for p in data['verticesMm']))/2 for i in range(3)];mesh=bpy.data.meshes.new(body['id']);mesh.from_pydata([tuple((float(v)-origin[i])/1000 for i,v in enumerate(p)) for p in data['verticesMm']],[],data['faces']);mesh.update()
    obj=bpy.data.objects.new(body['id'],mesh);scene.collection.objects.link(obj);obj.matrix_world=matrix_mm(body['matrix'],origin);mesh.materials.append(mat)
    # A wall Boolean may only consume a closed, consistently oriented core.
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh)
    if any(not e.is_manifold for e in bm.edges):bm.free();raise ValueError('Canonical wall core is not watertight')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();objects.append(obj);return obj

def import_glb(body,asset):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=asset['localPath'],import_pack_images=True)
    added=set(bpy.data.objects)-before;roots=[o for o in added if o.parent not in added]
    axes=asset['sourceAxes'];axis=lambda text:Vector(((-1 if text.startswith('-') else 1) if text.endswith('X') else 0,(-1 if text.startswith('-') else 1) if text.endswith('Y') else 0,(-1 if text.startswith('-') else 1) if text.endswith('Z') else 0))
    up,forward=axis(axes['up']),axis(axes['forward']);right=forward.cross(up);scale=.001 if axes['unit']=='mm' else 1
    basis=Matrix(((*right,0),(*forward,0),(*up,0),(0,0,0,1)))@Matrix.Diagonal((scale,scale,scale,1))
    # Blender's glTF importer maps source (x,y,z) to (x,-z,y). Undo it once,
    # then apply the documented source basis and the canonical world frame.
    conversion=matrix_mm(body['matrix'])@basis@Matrix.Rotation(-math.pi/2,4,'X')
    for root in roots:root.matrix_world=conversion@root.matrix_world
    for obj in added:
        if obj.type=='MESH':objects.append(obj)

for body in geometry.get('bodies',[]):
    outline_source=body.get('contour',{}).get('importProvenance')
    if outline_source:
        outline_imports.append({'elementId':body['id'],**outline_source})
        if outline_source.get('approximated'):warnings.append(body['id']+': controlled original-curve approximation; maximum '+outline_source['curveErrorBoundMm']+' mm including coordinate quantization')
    if body.get('assetVersionId'):
        asset=assets.get(body['assetVersionId'])
        if asset and asset['kind']=='mesh' and asset.get('geometryVerified') and asset.get('rightsVerified'):
            import_glb(body,asset);continue
    if body['kind']=='catalog_object' and request['profile']=='final':warnings.append(body['id']+': verified envelope, no original shape')
    obj=solid_mesh(body,wall) if body.get('mesh') else extrusion(body['id'],body['contour'],body.get('depthMm'),body['zMm'],body['matrix'],stone if body['kind']=='stone_piece' else envelope if body['kind']=='catalog_object' else wall)
    if body['kind']=='wall':wall_solids.append(obj)
    if body['kind']=='wall_layer':layer_solids.setdefault(body.get('materialVersionId','unassigned'),[]).append(obj)
    for index,cut in enumerate(body.get('cuts',[])):
        if cut.get('mesh'):
            cutter=solid_mesh({'id':body['id']+'-cut-'+str(index),'mesh':cut['mesh'],'matrix':body['matrix']},stone)
        else:
            depth=cut.get('depthMm')
            if depth is None:raise ValueError('Machining depth is unknown')
            cutter=extrusion(body['id']+'-cut-'+str(index),cut['contour'],str(float(depth)+.02),cut.get('zMm',str(-float(depth))),body['matrix'],stone)
        modifier=obj.modifiers.new('Canonical machining cut','BOOLEAN');modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=modifier.name)
        objects.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)

# Canonical wall cores can overlap at a shared node. Union their real solids
# before shading, removing coincident internal faces without moving a wall.
for solids in [wall_solids,*layer_solids.values()]:
    if len(solids)<2:continue
    merged=solids[0]
    for other in solids[1:]:
        modifier=merged.modifiers.new('Shared-node wall union','BOOLEAN');modifier.operation='UNION';modifier.solver='EXACT';modifier.object=other
        bpy.context.view_layer.objects.active=merged;bpy.ops.object.modifier_apply(modifier=modifier.name)
        objects.remove(other);bpy.data.objects.remove(other,do_unlink=True)

for inscription in geometry.get('glyphs',[]):
    if inscription['renderingBasis']=='shop_image_reference' or not inscription['placements']:
        warnings.append(inscription['id']+': shop reference only; no replacement typography rendered');continue
    covered=''.join(p['codepointText'] for p in inscription['placements'])
    if ''.join(covered.split())!=''.join(inscription['exactText'].split()):raise ValueError('Original glyph sequence does not cover literal inscription')
    for index,placement in enumerate(inscription['placements']):
        asset=assets.get(placement['glyphAssetVersionId'])
        if not asset or not asset.get('contour') or not asset.get('geometryVerified') or not asset.get('rightsVerified'):raise ValueError('Licensed original glyph is unavailable')
        requested=inscription.get('requestedHeightMm');nominal=asset.get('nominalHeightMm')
        if requested is None or nominal is None or abs(float(requested)-float(nominal))>.01:raise ValueError('Requested character height differs from approved glyph article')
        outline_source=asset['contour'].get('importProvenance')
        if outline_source:
            outline_imports.append({'elementId':inscription['id'],'glyphAssetVersionId':asset['assetVersionId'],**outline_source})
            if outline_source.get('approximated'):warnings.append(inscription['id']+': reviewed original glyph approximation; maximum '+outline_source['curveErrorBoundMm']+' mm')
        matrix=matrix_mm(inscription['matrix'])@Matrix.Translation((float(placement['uMm'])/1000,float(placement['vMm'])/1000,.0001))
        glyph=extrusion(inscription['id']+'-glyph-'+str(index),asset['contour'],'0','0',matrix,metal)
        if inscription['phase']=='existing' or inscription.get('locked'):protected.append(glyph);protected_sources.add(inscription['id'])

if not objects:raise ValueError('The canonical scene has no renderable geometry')
bpy.context.view_layer.update()
corners=[obj.matrix_world@Vector(corner) for obj in objects for corner in obj.bound_box]
minimum=Vector(tuple(min(c[i] for c in corners) for i in range(3)));maximum=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
center=(minimum+maximum)/2;extent=max(maximum-minimum);extent=max(extent,.1)
camera_data=bpy.data.cameras.new('Frozen consultation camera');camera=bpy.data.objects.new('Frozen consultation camera',camera_data);scene.collection.objects.link(camera)
direction=Vector((.65,-1.6,.72 if request['snapshot']['kind']=='memorial' else 1.4)).normalized();camera.location=center+direction*extent*2.2
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.lens=50;camera_data.clip_start=.001;camera_data.clip_end=max(100,extent*100);scene.camera=camera
# Fit actual camera-plane bounds, including isolated imported walls and height.
# A world-axis maximum alone can crop a long diagonal scene after projection.
rotation=camera.rotation_euler.to_matrix();projected=[rotation.transposed()@(corner-center) for corner in corners]
left,right=min(p.x for p in projected),max(p.x for p in projected);bottom,top=min(p.y for p in projected),max(p.y for p in projected)
camera.location+=rotation@Vector(((left+right)/2,(bottom+top)/2,0));camera_data.ortho_scale=max((top-bottom)*(4/3),right-left,.1)*1.16
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
normalized=[world_to_camera_view(scene,camera,corner) for corner in corners]
if any(p.x<.02 or p.x>.98 or p.y<.02 or p.y>.98 for p in normalized):raise ValueError('Actual canonical geometry does not fit the frozen camera bounds')

world=bpy.data.worlds.new('Frozen neutral studio world');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.88,.90,.91,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
for name,offset,power,size in [('Key',(-1,-2,3),120,2.5),('Fill',(2,-1,1),60,2),('Rim',(0,2,2),85,1.8)]:
    light_data=bpy.data.lights.new(name,'AREA');light_data.energy=power*extent*extent;light_data.shape='DISK';light_data.size=size*extent
    light=bpy.data.objects.new(name,light_data);scene.collection.objects.link(light);light.location=center+Vector(offset)*extent;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()

scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8 if request['profile']=='preview' else 16;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2;scene.cycles.seed=27419;scene.cycles.use_animated_seed=False;scene.cycles.use_denoising=True
scene.render.resolution_x=1440 if request['profile']=='preview' else 3840;scene.render.resolution_y=1080 if request['profile']=='preview' else 2880;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8';scene.render.image_settings.compression=90;scene.render.film_transparent=False
scene.render.use_file_extension=True;scene.render.use_stamp=False;scene.view_settings.view_transform='AgX';scene.render.filepath=str(source.parent/'beauty.png')
bpy.ops.render.render(write_still=True)

# Separate opaque object mask for protected literal originals. Future image edits must
# composite the original beauty pixels through this mask; no generated text is accepted.
def mask_material(name,color):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');emission.inputs['Color'].default_value=(*color,1);mat.node_tree.links.new(emission.outputs[0],output.inputs['Surface']);return mat
black,white=mask_material('Unprotected pixels',(0,0,0)),mask_material('Protected original pixels',(1,1,1))
for obj in objects:
    if obj.type=='MESH':obj.data.materials.clear();obj.data.materials.append(white if obj in protected else black)
world.node_tree.nodes['Background'].inputs['Color'].default_value=(0,0,0,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=0
scene.view_settings.view_transform='Standard';scene.cycles.samples=1;scene.cycles.use_denoising=False;scene.render.filepath=str(source.parent/'protected.png');bpy.ops.render.render(write_still=True)
manifest={
    'generatorVersion':request['generatorVersion'],'sceneAdapterVersion':'schubert-scene/1.0.3',
    'blenderVersion':bpy.app.version_string,'geometryEngineVersion':request['snapshot']['geometryEngineVersion'],
    'revisionId':request['snapshot']['revisionId'],'contentHash':request['contentHash'],'profile':request['profile'],
    'unit':'mm','coordinateSystem':'right_handed_z_up','renderOriginMm':render_origin_mm,
    'tessellationChordErrorMm':str(chord_error),'numericWeldErrorBudgetMm':str(chord_error/2),
    'camera':{'location':list(camera.location),'rotationEuler':list(camera.rotation_euler),'projection':'ORTHO','scaleM':camera_data.ortho_scale,'framingVersion':'projected-bounds/1'},
    'lightingVersion':'neutral-studio/1','wallUnionVersion':'shared-node-solids/2',
    'machiningVersion':'front-back-wedges/1','materialStackVersion':'oriented-stacks/1',
    'samples':8 if request['profile']=='preview' else 16,'seed':27419,
    'assetVersions':[{'id':a['assetVersionId'],'contentHash':a['contentHash'],'sourceHash':a['sourceHash']} for a in assets.values()],
    'protectedElementIds':sorted(protected_sources),'outlineImports':outline_imports,'warnings':warnings
}
target.write_text(json.dumps({'width':scene.render.resolution_x,'height':scene.render.resolution_y,'accuracy':'verified_geometry' if not warnings else 'model_based','warnings':warnings,'manifest':manifest},ensure_ascii=False),encoding='utf-8')
