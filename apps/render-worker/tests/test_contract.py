import base64,copy,hashlib,importlib.util,io,json,tempfile,time,unittest
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('render_server',Path(__file__).parents[1]/'server.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)

class WorkerContract(unittest.TestCase):
    def request(self):
        snapshot={'schemaVersion':1,'unit':'mm','coordinateSystem':'right_handed_z_up','revisionId':'revision4','assetManifest':[]}
        canonical=json.dumps(snapshot,separators=(',',':'))
        return{'snapshot':snapshot,'canonicalSnapshot':canonical,'contentHash':server.digest(canonical),'profile':'final','jobId':'synthetic-job','fencingToken':'1','generatorVersion':server.VERSION,'geometry':{'bodies':[],'glyphs':[],'warnings':[]},'privateAssets':[]}
    def test_revision_binding(self):
        data=self.request();server.check_request(data);data['snapshot']['revisionId']='revision5'
        with self.assertRaises(server.RenderError) as result:server.check_request(data)
        self.assertEqual(result.exception.code,'SNAPSHOT_CONTRACT')
    def test_scene_versions_preserve_legacy_replay_and_reject_unknown_lighting(self):
        data=self.request()
        for version in ('schubert-scene/1.0.3','schubert-scene/1.0.4'):
            data['sceneAdapterVersion']=version;server.check_request(data)
        data['sceneAdapterVersion']='schubert-scene/9'
        with self.assertRaises(server.RenderError) as result:server.check_request(data)
        self.assertEqual(result.exception.code,'SCENE_ADAPTER_VERSION')
    def test_unlicensed_exact_glyphs_are_blocked(self):
        data=self.request();data['geometry']['glyphs']=[{'renderingBasis':'shop_image_reference','placements':[]}]
        with self.assertRaises(server.RenderError) as result:server.check_request(data)
        self.assertEqual(result.exception.code,'LICENSED_GLYPHS_REQUIRED')
    def test_protected_pixels_are_unchanged(self):
        from PIL import Image
        def png(image):
            result=io.BytesIO();image.save(result,format='PNG');return result.getvalue()
        source=Image.new('RGBA',(10,8),(97,24,155,255));candidate=Image.new('RGBA',source.size,(0,200,20,255));mask=Image.new('L',source.size,0)
        for x in range(2,7):
            for y in range(1,5):mask.putpixel((x,y),1 if x==2 else 255)
        result=Image.open(io.BytesIO(server.protect_pixels(png(source),png(candidate),png(mask))))
        for x in range(10):
            for y in range(8):self.assertEqual(result.getpixel((x,y)),source.getpixel((x,y)) if mask.getpixel((x,y)) else candidate.getpixel((x,y)))
    def test_candidate_cannot_change_camera_size(self):
        from PIL import Image
        def png(size):
            output=io.BytesIO();Image.new('RGBA',size).save(output,format='PNG');return output.getvalue()
        with self.assertRaises(server.RenderError) as result:server.protect_pixels(png((5,5)),png((6,5)),png((5,5)))
        self.assertEqual(result.exception.code,'PROTECTED_CAMERA')
    def test_archived_composite_survives_a_different_worker_replica(self):
        from PIL import Image
        def png(mode,color):
            output=io.BytesIO();Image.new(mode,(4,3),color).save(output,format='PNG');return output.getvalue()
        source=png('RGBA',(45,70,95,255));candidate=png('RGBA',(1,2,3,255));mask_image=Image.new('L',(4,3),0);mask_image.putpixel((1,1),1);output=io.BytesIO();mask_image.save(output,format='PNG');mask=output.getvalue()
        originals={'source':source,'mask':mask,'candidate':candidate}
        manifest={'revisionId':'revision','contentHash':'a'*64,'camera':{'x':1.0},'protectedElementIds':['original-glyph']};canonical=json.dumps(manifest,sort_keys=True,separators=(',',':'),ensure_ascii=False)
        data={'jobId':'new-composite-job','fencingToken':'4','sourceJobId':'old-render-job','sourceFencingToken':'2','revisionId':'revision','contentHash':'a'*64,'sourceManifest':{'workerManifestCanonical':canonical,'workerManifestHash':server.digest(canonical),'sourceJobId':'old-render-job','sourceFencingToken':'2','imageHash':server.digest(source),'maskHash':server.digest(mask),'width':4,'height':3}}
        for key,name in [('originalRef','source'),('maskRef','mask'),('candidateRef','candidate')]:data[key]={'sourceRef':name,'sourceHash':server.digest(originals[name]),'byteLength':len(originals[name])}
        with tempfile.TemporaryDirectory() as scratch,patch.object(server,'DATABASE',Path(scratch)/'replica.sqlite'),patch.object(server,'fetch_private_asset',side_effect=lambda ref:originals[ref['sourceRef']]) as gateway:
            result=server.archived_composite(data)
            self.assertEqual(gateway.call_count,3)
            image=Image.open(io.BytesIO(base64.b64decode(result['imageBase64'])))
            self.assertEqual(image.getpixel((1,1)),(45,70,95,255));self.assertEqual(image.getpixel((0,0)),(1,2,3,255))
            self.assertEqual(result['accuracy'],'concept_visualization_with_protected_original_pixels')
            data['fencingToken']='5';replay=server.archived_composite(data);self.assertEqual(replay['imageHash'],result['imageHash']);self.assertEqual(gateway.call_count,3)
            data['fencingToken']='4'
            with self.assertRaises(server.RenderError) as failure:server.archived_composite(data)
            self.assertEqual(failure.exception.code,'STALE_FENCE')
    def test_private_output_capability_rejects_broad_or_foreign_paths(self):
        from PIL import Image
        output=io.BytesIO();Image.new('RGB',(2,2)).save(output,format='PNG');content=output.getvalue();data={'jobId':'own-job','fencingToken':'7'};pathname='11111111-1111-1111-1111-111111111111/render-output/own-job/7/22222222-2222-2222-2222-222222222222/image.png';expiry=int(time.time()*1000)+60000
        def ticket(path,overwrite=False):
            constraints={'pathname':path,'validUntil':expiry,'maximumSizeInBytes':40*1024*1024,'allowedContentTypes':['image/png'],'allowOverwrite':overwrite,'addRandomSuffix':False};payload=base64.b64encode(json.dumps(constraints).encode()).decode();token='vercel_blob_client_store_'+base64.b64encode(('signature.'+payload).encode()).decode();return{'pathname':path,'token':token,'expiresAt':expiry,'maximumSizeInBytes':40*1024*1024,'contentType':'image/png'}
        with patch.object(server.http.client,'HTTPSConnection') as connection:
            response=connection.return_value.getresponse.return_value;response.status=200;response.read.return_value=json.dumps({'pathname':pathname}).encode();ref=server.upload_render_output(ticket(pathname),content,data,'image');self.assertEqual(ref['contentHash'],server.digest(content));self.assertEqual(connection.call_args.args[:2],('vercel.com',443))
            for target in [ticket(pathname.replace('/own-job/','/other-job/')),ticket(pathname,True)]:
                with self.assertRaises(server.RenderError) as failure:server.upload_render_output(target,content,data,'image')
                self.assertEqual(failure.exception.code,'RENDER_UPLOAD_SCOPE')

if __name__=='__main__':unittest.main()
