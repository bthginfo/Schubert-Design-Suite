<script lang="ts">
  import { onMount,untrack } from 'svelte';
  import { T,useThrelte } from '@threlte/core';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  import type { Contour,DesignSnapshot,Point3 } from '@schubert/contracts';
  import { sampleRing,measureValue,worldMatrix,surfaceMatrix,worldPoint,toRenderer,roomContour,hasAssetUsage,wallCoreMesh,wallLayerMeshes,layerSlices,contourParts,withThroughCutouts,stoneDepthSlices,hostMachining,miterCut } from '@schubert/geometry';
  import{stoneAppearance}from'./stone-appearance.ts';
  import{letteringLayout,loadPlanningFont}from'./lettering-layout.ts';
  import'./planning-fonts.css';
  import{clipSolid}from'./clip-solid.ts';
  import {fitPerspectiveBounds} from './camera-fit.ts';
  import {isWallSurface} from './wall-visibility.ts';
  import type{CameraCommand}from'./camera-navigation.ts';
  let {snapshot,showWalls=true,resetKey=0,materials=[],assets=[],glyphs=[],cameraCommand=null,onzoomchange=()=>{}}:{snapshot:DesignSnapshot;showWalls?:boolean;resetKey?:number;materials?:any[];assets?:any[];glyphs?:any[];cameraCommand?:CameraCommand|null;onzoomchange?:(zoom:number)=>void}=$props();
  const context=useThrelte(),{size}=context;let mounted=$state(false),controls:OrbitControls|undefined;
  const root=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1,.01,10000);
  let fitted=false,lastReset=-1,generation=0;const downloads=new Set<AbortController>();
  let fittedDistance=1,lastCommand:CameraCommand|null=null;
  function cameraChanged(){if(controls)onzoomchange(fittedDistance/Math.max(.00001,camera.position.distanceTo(controls.target)));context.invalidate();}
  function navigate(command:CameraCommand){
    if(!controls)return;
    const offset=camera.position.clone().sub(controls.target),distance=Math.max(.00001,offset.length());
    if(command.action.startsWith('pan_')){const step=distance*.08,right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),translation=command.action==='pan_left'?right.multiplyScalar(-step):command.action==='pan_right'?right.multiplyScalar(step):up.multiplyScalar(command.action==='pan_up'?step:-step);camera.position.add(translation);controls.target.add(translation);}
    else if(command.action==='zoom_in'||command.action==='zoom_out'){offset.setLength(THREE.MathUtils.clamp(distance*(command.action==='zoom_in'?.8:1.25),fittedDistance*.05,fittedDistance*20));camera.position.copy(controls.target).add(offset);}
    else if(command.action==='front'||command.action==='side'||command.action==='top'){offset.copy(command.action==='front'?new THREE.Vector3(0,0,1):command.action==='side'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,.0001)).setLength(distance);camera.position.copy(controls.target).add(offset);}
    else{const spherical=new THREE.Spherical().setFromVector3(offset),step=Math.PI/12;spherical.theta+=command.action==='left'?step:command.action==='right'?-step:0;spherical.phi=THREE.MathUtils.clamp(spherical.phi+(command.action==='up'?-step:command.action==='down'?step:0),.015,Math.PI-.015);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));}
    controls.update();if(['front','side','top'].includes(command.action))fitCamera();else cameraChanged();
  }
  const C=new THREE.Matrix4().set(1,0,0,0,0,0,1,0,0,-1,0,0,0,0,0,1);
  function disposeObject(child:THREE.Object3D){child.traverse(object=>{const o=object as THREE.Mesh;if(o.geometry)o.geometry.dispose();if(o.material){for(const material of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(material))if(value instanceof THREE.Texture)value.dispose();material.dispose();}}});}
  function dispose(){generation++;for(const controller of downloads)controller.abort();downloads.clear();for(const child of [...root.children]){disposeObject(child);root.remove(child);}}
  function sourceAxis(value:string){const n=value.startsWith('-')?-1:1;return value.endsWith('X')?new THREE.Vector3(n,0,0):value.endsWith('Y')?new THREE.Vector3(0,n,0):new THREE.Vector3(0,0,n);}
  async function loadOriginal(element:Extract<DesignSnapshot['elements'][number],{kind:'catalog_object'}>,placeholder:THREE.Object3D[],sequence:number){
    const asset=assets.find(a=>a.id===element.assetVersionId);if(!asset||!hasAssetUsage(asset,'internal_consultation')||!asset.geometry_verified||asset.accuracy!=='verified_original'||asset.validation_report?.format!=='glb2'||asset.source_handedness!=='right_handed')return;
    const controller=new AbortController();downloads.add(controller);
    try{const response=await fetch(`/api/v1/documents/${asset.document_id}/download?version=${asset.document_version_id}`,{signal:controller.signal});if(!response.ok)throw new Error('Private Originaldatei ist nicht verfügbar.');const bytes=await response.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==asset.content_hash)throw new Error('Originaldatei hat einen abweichenden Inhalt.');
      const gltf=await new GLTFLoader().parseAsync(bytes,'');if(sequence!==generation){disposeObject(gltf.scene);return;}
      const up=sourceAxis(asset.source_up_axis),forward=sourceAxis(asset.source_forward_axis),right=new THREE.Vector3().crossVectors(forward,up),factor=asset.source_unit==='mm'?.001:1;
      const basis=new THREE.Matrix4().set(right.x*factor,right.y*factor,right.z*factor,0,forward.x*factor,forward.y*factor,forward.z*factor,0,up.x*factor,up.y*factor,up.z*factor,0,0,0,0,1),group=new THREE.Group();group.matrixAutoUpdate=false;group.matrix.copy(C).multiply(matrixFor(element.id)).multiply(basis);group.add(gltf.scene);root.add(group);for(const item of placeholder){root.remove(item);disposeObject(item);}fitCamera();context.invalidate();
    }catch(error){if(!controller.signal.aborted)console.warn('Das geprüfte Originalmodell konnte nicht geladen werden; die gekennzeichnete Hülle bleibt sichtbar.');}finally{downloads.delete(controller);}
  }
  function shapeFor(contour:Contour){return contourParts(contour).map(part=>{const shape=new THREE.Shape(sampleRing(part.outer).map(p=>new THREE.Vector2(Number(p.xMm)/1000,Number(p.yMm)/1000)));for(const hole of part.holes)shape.holes.push(new THREE.Path(sampleRing(hole).map(p=>new THREE.Vector2(Number(p.xMm)/1000,Number(p.yMm)/1000))));return shape;});}
  function matrixFor(id:string){const m=surfaceMatrix(snapshot,id);return new THREE.Matrix4().set(m[0],m[1],m[2],m[3]/1000,m[4],m[5],m[6],m[7]/1000,m[8],m[9],m[10],m[11]/1000,0,0,0,1);}
  function addGeometry(geometry:THREE.BufferGeometry,matrix:THREE.Matrix4,color:number,wire=false,materialId?:string){geometry.applyMatrix4(matrix).applyMatrix4(C);geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.05,side:THREE.DoubleSide,transparent:wire,opacity:wire ? .3 : 1});const source=materials.find(m=>m.id===materialId);if(source){const appearance=stoneAppearance(source);material.color.set(appearance.color);material.roughness=appearance.roughness;const sequence=generation;new THREE.TextureLoader().load(appearance.path,texture=>{if(sequence!==generation){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.25,1.25);texture.anisotropy=Math.min(8,context.renderer.capabilities.getMaxAnisotropy());material.map=texture;material.needsUpdate=true;context.invalidate();});}const mesh=new THREE.Mesh(geometry,material);root.add(mesh);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,20),new THREE.LineBasicMaterial({color:wire?0x617d70:0x444d47}));root.add(edge);}
  async function addLettering(element:Extract<DesignSnapshot['elements'][number],{kind:'inscription'}>,sequence:number){
    try{await loadPlanningFont(element.previewFontKey);if(sequence!==generation||!mounted)return;
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
      const font=letteringLayout(snapshot,element).font,layout=letteringLayout(snapshot,element,(text,size)=>{ctx.font=`400 ${size}px "${font.family}"`;return ctx.measureText(text).width;}),padding=Math.max(3,layout.fontSize*.06),width=layout.width+padding*2,height=layout.height+padding*2,density=Math.min(3,4096/width,4096/height);
      canvas.width=Math.max(1,Math.ceil(width*density));canvas.height=Math.max(1,Math.ceil(height*density));ctx.scale(density,density);ctx.font=`400 ${layout.fontSize}px "${font.family}"`;ctx.textBaseline='alphabetic';ctx.textAlign=layout.anchor==='middle'?'center':layout.anchor as CanvasTextAlign;ctx.fillStyle=layout.color;ctx.strokeStyle='#25231f';ctx.lineWidth=.35;
      ctx.translate(padding-layout.left,padding+layout.top);ctx.scale(layout.scale,1);for(const row of layout.rows){ctx.strokeText(row.text,0,-row.baseline);ctx.fillText(row.text,0,-row.baseline);}
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
      const geometry=new THREE.PlaneGeometry(width/1000,height/1000),matrix=matrixFor(element.surfaceElementId).multiply(new THREE.Matrix4().makeTranslation(Number(element.originUV.uMm)/1000,Number(element.originUV.vMm)/1000,.0008)).multiply(new THREE.Matrix4().makeRotationZ(Number(element.rotationDeg)*Math.PI/180)).multiply(new THREE.Matrix4().makeTranslation((layout.left+layout.width/2)/1000,(layout.top-layout.bottom)/2000,0));
      geometry.applyMatrix4(matrix).applyMatrix4(C);const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));mesh.userData.lettering=true;root.add(mesh);context.invalidate();
    }catch{if(sequence===generation)console.warn('Entwurfsschrift ist derzeit nicht verfügbar. Die Inschrift bleibt gespeichert.');}
  }
  function rebuild(){dispose();
    for(const e of snapshot.elements.filter(e=>e.phase!=='demolition')){
      const firstChild=root.children.length;
      if(e.kind==='stone_piece'){
        const {slices}=stoneDepthSlices(snapshot,e),miters=hostMachining(snapshot,e.id).filter(f=>f.machiningType==='miter');
        if(!slices.length)addGeometry(new THREE.ShapeGeometry(shapeFor(e.finishedContour)),matrixFor(e.id),0xc9c4b8,false,e.materialSpecVersionId);
        for(const slice of slices){let geometry:THREE.BufferGeometry=new THREE.ExtrudeGeometry(shapeFor(slice.contour),{depth:(Number(slice.topMm)-Number(slice.bottomMm))/1000,bevelEnabled:false,curveSegments:32});geometry.translate(0,0,Number(slice.bottomMm)/1000);for(const feature of miters)if(feature.miter){const next=clipSolid(geometry,miterCut(snapshot,e,feature.miter.edgeIndex,feature.miter.angleDeg,feature.face).keepPlane);geometry.dispose();geometry=next;}addGeometry(geometry,matrixFor(e.id),e.purpose==='memorial'?0xb7b4aa:0xc9c4b8,false,e.materialSpecVersionId);}
      }
      if(e.kind==='wall'){
        const a=snapshot.elements.find(n=>n.id===e.startNodeId),b=snapshot.elements.find(n=>n.id===e.endNodeId),height=measureValue(snapshot,e.heightMeasureId),thickness=measureValue(snapshot,e.coreThicknessMeasureId);
        if(a?.kind!=='node'||b?.kind!=='node'||height===null||thickness===null)continue;
        const p=worldPoint(snapshot,a.id),q=worldPoint(snapshot,b.id),dx=Number(q.xMm)-Number(p.xMm),dy=Number(q.yMm)-Number(p.yMm),length=Math.hypot(dx,dy);if(!length)continue;
        const mesh=wallCoreMesh(snapshot,e.id);if(!mesh)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(mesh.verticesMm.flatMap(p=>p.map(v=>Number(v)/1000)),3));geometry.setIndex(mesh.faces.flatMap(f=>Array.from({length:f.length-2},(_,i)=>[f[0],f[i+1],f[i+2]]).flat()));geometry.computeVertexNormals();
        const ux=dx/length,uy=dy/length,t=Number(thickness)/2000;
        // Local x along wall, y vertical, extrusion toward the right wall face.
        const matrix=new THREE.Matrix4().set(ux,0,uy,Number(p.xMm)/1000-uy*t,uy,0,-ux,Number(p.yMm)/1000+ux*t,0,1,0,Number(p.zMm)/1000,0,0,0,1);
        addGeometry(geometry,matrix,0xe1e2dc);
        for(const layer of wallLayerMeshes(snapshot,e.id)){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(layer.mesh.verticesMm.flatMap(p=>p.map(v=>Number(v)/1000)),3));g.setIndex(layer.mesh.faces.flatMap(f=>Array.from({length:f.length-2},(_,i)=>[f[0],f[i+1],f[i+2]]).flat()));addGeometry(g,matrix,0xd3d3cc);}
      }
      if(e.kind==='room'){const contour=roomContour(snapshot,e.id),slices=layerSlices(snapshot,e);if(contour){if(!slices.layers.length){const geometry=new THREE.ShapeGeometry(shapeFor(contour));const level=measureValue(snapshot,e.finishedFloorLevelMeasureId);if(level!==null)addGeometry(geometry,new THREE.Matrix4().makeTranslation(0,0,Number(level)/1000),0xddd8cb);else geometry.dispose();}for(const layer of slices.layers){const geometry=new THREE.ExtrudeGeometry(shapeFor(contour),{depth:(Number(layer.topMm)-Number(layer.bottomMm))/1000,bevelEnabled:false});addGeometry(geometry,new THREE.Matrix4().makeTranslation(0,0,Number(layer.bottomMm)/1000),0xddd8cb);}}}
      if(e.kind==='catalog_object'){const h=measureValue(snapshot,e.heightMeasureId??null),index=root.children.length;addGeometry(h!==null?new THREE.ExtrudeGeometry(shapeFor(e.footprint),{depth:Number(h)/1000,bevelEnabled:false}):new THREE.ShapeGeometry(shapeFor(e.footprint)),matrixFor(e.id),0x315c4c,true);if(e.assetVersionId)void loadOriginal(e,root.children.slice(index),generation);}
      if(e.kind==='surface'){const slices=layerSlices(snapshot,e),color=e.surfaceType==='shower'?0xaebfb3:0xd2cbbd;if(!slices.layers.length)addGeometry(new THREE.ShapeGeometry(shapeFor(e.contour)),matrixFor(e.id),color,false,e.layers.at(-1)?.materialSpecVersionId);for(const layer of slices.layers){const geometry=new THREE.ExtrudeGeometry(shapeFor(e.contour),{depth:(Number(layer.topMm)-Number(layer.bottomMm))/1000,bevelEnabled:false});geometry.translate(0,0,Number(layer.bottomMm)/1000);addGeometry(geometry,matrixFor(e.id),color,false,layer.materialSpecVersionId);}}
      if(e.kind==='inscription'&&e.renderingBasis==='shop_image_reference')void addLettering(e,generation);
      if(e.kind==='inscription'&&e.renderingBasis==='verified_contours'){
        const base=matrixFor(e.surfaceElementId).multiply(new THREE.Matrix4().makeTranslation(Number(e.originUV.uMm)/1000,Number(e.originUV.vMm)/1000,.0001)).multiply(new THREE.Matrix4().makeRotationZ(Number(e.rotationDeg)*Math.PI/180));
        for(const placement of e.glyphPlacements){const glyph=glyphs.find(g=>g.id===placement.glyphAssetVersionId),manifest=snapshot.assetManifest.find(a=>a.assetVersionId===placement.glyphAssetVersionId);if(!glyph||!hasAssetUsage(glyph,'internal_consultation')||!glyph.geometry_verified||!glyph.contour||manifest?.contentHash!==glyph.content_hash||glyph.text!==placement.codepointText)continue;
          const local=base.clone().multiply(new THREE.Matrix4().makeTranslation(Number(placement.uMm)/1000,Number(placement.vMm)/1000,0));addGeometry(new THREE.ShapeGeometry(shapeFor(glyph.contour)),local,0x77746c);
        }
      }
      if(e.kind==='clearance')addGeometry(new THREE.ShapeGeometry(shapeFor(e.contour)),matrixFor(e.id),0xb5ab76,true);
      for(const child of root.children.slice(firstChild))child.userData.wall=isWallSurface(e);
    }
    untrack(applyWallVisibility);
    if(!fitted){fitCamera(true);fitted=true;}
    context.invalidate();
  }
  function applyWallVisibility(){for(const child of root.children)child.visible=!child.userData.wall||showWalls;context.invalidate();}
  $effect(()=>{showWalls;if(mounted)applyWallVisibility();});
  function fitCamera(resetDirection=false){
    const box=new THREE.Box3().setFromObject(root);if(box.isEmpty()||!controls)return;
    const direction=resetDirection?new THREE.Vector3(.8,.7,1):camera.position.clone().sub(controls.target);
    camera.aspect=Math.max(1,size.current.width)/Math.max(1,size.current.height);
    fittedDistance=fitPerspectiveBounds(camera,box,direction);controls.target.copy(box.getCenter(new THREE.Vector3()));
    controls.minDistance=fittedDistance*.05;controls.maxDistance=fittedDistance*20;controls.update();cameraChanged();
  }
  $effect(()=>{const {width,height}=$size;if(mounted&&width>0&&height>0&&fitted)fitCamera();});
  onMount(()=>{context.scene.add(root);context.scene.background=new THREE.Color(0xf4f4ef);const ambient=new THREE.HemisphereLight(0xffffff,0x7d8576,2.7),sun=new THREE.DirectionalLight(0xfff8ec,3);sun.position.set(3,6,4);context.scene.add(ambient,sun);controls=new OrbitControls(camera,context.renderer.domElement);controls.enableDamping=false;controls.addEventListener('change',cameraChanged);mounted=true;return()=>{mounted=false;dispose();controls?.dispose();context.scene.remove(root,ambient,sun);};});
  $effect(()=>{snapshot;assets;glyphs;materials;if(mounted)rebuild();});
  $effect(()=>{const reset=resetKey;if(mounted&&reset!==lastReset){fitCamera(true);lastReset=reset;}});
  $effect(()=>{if(mounted&&cameraCommand&&cameraCommand!==lastCommand){lastCommand=cameraCommand;navigate(cameraCommand);}});
</script>
<T is={camera} makeDefault/>
