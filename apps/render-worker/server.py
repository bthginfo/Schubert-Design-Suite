"""Isolated, authenticated deterministic renderer. No URL fetching or production credentials."""
from __future__ import annotations
import base64, hashlib, hmac, http.client, io, ipaddress, json, os, re, shutil, socket, sqlite3, ssl, subprocess, tempfile, threading, time
from urllib.parse import urlsplit, urlencode
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from contextlib import contextmanager

VERSION = 'schubert-blender/1.0.0'
MAX_BODY = 120 * 1024 * 1024
WORK_ROOT = Path(os.environ.get('RENDER_TMP', tempfile.gettempdir())) / 'schubert-render'
WORK_ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
DATABASE = WORK_ROOT / 'fences.sqlite'
LOCK = threading.Lock()
RENDER_SLOT = threading.BoundedSemaphore(int(os.environ.get('RENDER_CONCURRENCY', '1')))

class RenderError(Exception):
    def __init__(self, code, message, status=422):
        super().__init__(message); self.code, self.status = code, status

def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode('utf-8')).hexdigest()

def fail(condition, code, message, status=422):
    if not condition: raise RenderError(code, message, status)

@contextmanager
def database():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, fence INTEGER NOT NULL, request_hash TEXT NOT NULL, result TEXT, touched REAL NOT NULL)')
    try:
        with connection:yield connection
    finally:connection.close()

def fetch_private_asset(asset):
    """Only the fixed app gateway is reachable, never a URL supplied in a catalogue."""
    url=urlsplit(os.environ.get('ASSET_GATEWAY_URL',''))
    local=os.environ.get('ALLOW_LOCAL_ASSET_GATEWAY')=='1' and url.hostname in ('127.0.0.1','localhost')
    fail(url.path=='/api/v1/render-assets/read' and not url.query and not url.fragment and not url.username and not url.password and (url.scheme=='https' and url.port in (None,443) or local and url.scheme=='http'),'ASSET_GATEWAY','Der feste private Originaldatei-Gateway ist noch nicht sicher eingerichtet.',503)
    port=url.port or (443 if url.scheme=='https' else 80)
    addresses=socket.getaddrinfo(url.hostname,port,type=socket.SOCK_STREAM)
    fail(addresses and (local or all(ipaddress.ip_address(item[4][0]).is_global for item in addresses)),'ASSET_GATEWAY_ADDRESS','Interne Zieladresse ist für den privaten Gateway gesperrt.')
    size=int(asset.get('byteLength',0));fail(0<size<=40*1024*1024,'ASSET_SIZE','Originaldateigröße ist ungültig.')
    parts=[]
    for offset in range(0,size,1024*1024):
        length=min(1024*1024,size-offset)
        connection=http.client.HTTPConnection(url.hostname,port,timeout=25)
        # Resolve once and pin that address through the TLS handshake. Redirects
        # are rejected; the requested hostname remains the certificate/SNI name.
        raw=socket.create_connection(addresses[0][4][:2],timeout=25)
        connection.sock=ssl.create_default_context().wrap_socket(raw,server_hostname=url.hostname) if url.scheme=='https' else raw
        body=json.dumps({'token':asset['sourceRef'],'offset':offset,'length':length},separators=(',',':'))
        try:
            connection.request('POST',url.path,body,{'Content-Type':'application/json','Origin':f'{url.scheme}://{url.netloc}'})
            response=connection.getresponse();fail(response.status==200,'ASSET_GATEWAY_ACCESS','Originaldateibereich ist nicht mehr für diesen Jobversuch freigegeben.',409 if response.status in (401,403,409) else 502)
            chunk=response.read(length+1);fail(len(chunk)==length,'ASSET_CHUNK','Originaldateibereich ist abgeschnitten oder überschreitet das Limit.');parts.append(chunk)
        finally:connection.close()
    return b''.join(parts)

def check_request(data,load_assets=True):
    fail(isinstance(data, dict), 'REQUEST', 'Renderauftrag fehlt.')
    fail(re.fullmatch(r'[a-zA-Z0-9_-]{1,200}', str(data.get('jobId', ''))) is not None, 'JOB_ID', 'Gültige Jobreferenz fehlt.')
    fail(re.fullmatch(r'[0-9]{1,15}', str(data.get('fencingToken', ''))) is not None, 'JOB_FENCE', 'Monotones Fencingtoken fehlt.')
    fail(data.get('profile') in ('preview', 'final'), 'PROFILE', 'Renderprofil fehlt.')
    fail(data.get('generatorVersion') == VERSION, 'GENERATOR_VERSION', 'Rendererversion stimmt nicht mit dem Auftrag überein.')
    fail(data.get('sceneAdapterVersion','schubert-scene/1.0.3') in ('schubert-scene/1.0.3','schubert-scene/1.0.4'),'SCENE_ADAPTER_VERSION','Die eingefrorene Szeneversion wird von diesem Worker nicht unterstützt.')
    canonical = data.get('canonicalSnapshot', '')
    fail(isinstance(canonical, str) and digest(canonical) == data.get('contentHash'), 'REVISION_HASH', 'Kanonischer Revisionsinhalt wurde verändert.')
    try: snapshot = json.loads(canonical)
    except (ValueError, TypeError): raise RenderError('SNAPSHOT', 'Revisionsinhalt ist ungültig.')
    fail(snapshot == data.get('snapshot') and snapshot.get('schemaVersion') == 1 and snapshot.get('unit') == 'mm' and snapshot.get('coordinateSystem') == 'right_handed_z_up', 'SNAPSHOT_CONTRACT', 'Revisionsvertrag oder Koordinatenkonvention stimmt nicht.')
    fail(isinstance(data.get('geometry'), dict), 'GEOMETRY', 'Geprüfter Geometrieadapter fehlt.')
    assets = {str(a.get('assetVersionId')): a for a in data.get('privateAssets', [])}
    total = 0
    for entry in snapshot.get('assetManifest', []):
        asset = assets.get(entry['assetVersionId'])
        fail(asset is not None and asset.get('contentHash') == entry['contentHash'] and asset.get('rightsVerified') is True and entry['rightsVerified'] is True, 'ASSET_RIGHTS', 'Ein versionsgebundener Rechte-/Originalnachweis fehlt.')
        if not load_assets and asset.get('sourceRef'):continue
        try: original = fetch_private_asset(asset) if asset.get('sourceRef') else base64.b64decode(asset['bytesBase64'], validate=True)
        except (ValueError, KeyError): raise RenderError('ASSET_ENCODING', 'Originaldatei ist unvollständig.')
        asset['bytesBase64']=base64.b64encode(original).decode()
        total += len(original)
        fail(len(original) <= 40*1024*1024 and total <= 80*1024*1024 and digest(original) == asset.get('sourceHash'), 'ASSET_HASH', 'Originaldatei und gespeicherte Quelldateiversion stimmen nicht überein.')
        if asset.get('kind') == 'mesh':
            fail(asset.get('geometryVerified') is True and original[:4] == b'glTF', 'ASSET_MESH', 'Nur geprüftes, vollständig eingebettetes GLB zulässig.')
            import struct
            fail(len(original) >= 20 and struct.unpack_from('<II', original, 4) == (2, len(original)), 'GLB_HEADER', 'GLB-Original ist abgeschnitten.')
            size, kind = struct.unpack_from('<II', original, 12)
            fail(kind == 0x4e4f534a and size <= len(original)-20, 'GLB_JSON', 'GLB-Szene fehlt.')
            model = json.loads(original[20:20+size])
            fail(all(not item.get('uri') for key in ('buffers', 'images') for item in model.get(key, [])), 'GLB_NETWORK', 'Netzwerkreferenzen im Originalmodell sind gesperrt.')
            fail(not model.get('animations') and not model.get('skins'), 'GLB_DYNAMIC', 'Originalmodell muss statisch sein.')
    final = data['profile'] == 'final'
    if final:
        fail(not data['geometry'].get('warnings'), 'RENDER_UNRESOLVED', '\n'.join(data['geometry'].get('warnings', [])))
        for inscription in data['geometry'].get('glyphs', []):
            fail(inscription.get('renderingBasis') in ('verified_contours', 'verified_3d') and inscription.get('placements'), 'LICENSED_GLYPHS_REQUIRED', 'Finales Render benötigt die lizenzierten, geprüften Originalzeichen. Shopbilder liefern keine genaue Ersatzschrift.')
        for body in data['geometry'].get('bodies', []):
            fail(body.get('depthMm') is not None, 'RENDER_UNKNOWN_HEIGHT', 'Ein Körper hat keine belegte Höhe oder Stärke.')
    return assets

def run_render(data):
    check_request(data,load_assets=False)
    identity={k:v for k,v in data.items() if k not in ('fencingToken','privateAssets','outputTargets')}
    identity['privateAssets']=[{k:v for k,v in asset.items() if k not in ('bytesBase64','sourceRef')} for asset in data.get('privateAssets',[])]
    request_hash = digest(json.dumps(identity, ensure_ascii=False, separators=(',', ':'), sort_keys=True))
    fence, job_id = int(data['fencingToken']), data['jobId']
    with LOCK, database() as db:
        previous = db.execute('SELECT fence,request_hash,result FROM jobs WHERE id=?', (job_id,)).fetchone()
        if previous:
            fail(fence >= previous[0], 'STALE_FENCE', 'Verspäteter Jobversuch ist gesperrt.', 409)
            fail(previous[1] == request_hash, 'IDEMPOTENCY_CONFLICT', 'Jobreferenz wurde mit einem anderen Revisions-/Renderinhalt wiederverwendet.', 409)
            if previous[2]:
                result = json.loads(previous[2]); result['fencingToken'] = str(fence)
                db.execute('UPDATE jobs SET fence=?,touched=? WHERE id=?', (fence,time.time(),job_id)); return result
        db.execute('INSERT INTO jobs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET fence=excluded.fence,touched=excluded.touched', (job_id,fence,request_hash,None,time.time()))
    fail(RENDER_SLOT.acquire(timeout=2), 'RENDER_BUSY', 'Renderkapazität ist belegt. Job mit demselben Schlüssel später wiederaufnehmen.', 503)
    try:
        assets=check_request(data)
        blender = os.environ.get('BLENDER_BIN', 'blender')
        fail(shutil.which(blender) is not None or Path(blender).is_file(), 'BLENDER_UNAVAILABLE', 'Blender ist im Worker noch nicht installiert.', 503)
        with tempfile.TemporaryDirectory(prefix='job-', dir=WORK_ROOT) as scratch:
            directory = Path(scratch); safe_assets = []
            for asset in assets.values():
                local = dict(asset); original = base64.b64decode(local.pop('bytesBase64'))
                suffix = '.glb' if local.get('kind') == 'mesh' else '.svg' if local.get('kind') == 'outline' else '.bin'
                path = directory / (digest(local['assetVersionId']) + suffix); path.write_bytes(original); local['localPath'] = str(path); safe_assets.append(local)
            payload = {key:value for key,value in data.items() if key!='outputTargets'}; payload['privateAssets'] = safe_assets
            source, target = directory/'request.json', directory/'result.json'
            source.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
            env = {key:value for key,value in os.environ.items() if key in ('PATH','SYSTEMROOT','WINDIR','TEMP','TMP','LD_LIBRARY_PATH')}
            env.update({'HOME':scratch,'TMPDIR':scratch,'OMP_NUM_THREADS':os.environ.get('RENDER_THREADS','4')})
            command = [blender,'--background','--factory-startup','--disable-autoexec','--threads',env['OMP_NUM_THREADS'],'--python-exit-code','1','--python',str(Path(__file__).with_name('render_scene.py')),'--',str(source),str(target)]
            try: process = subprocess.run(command,cwd=scratch,env=env,capture_output=True,timeout=int(os.environ.get('RENDER_TIMEOUT_SECONDS','480')))
            except subprocess.TimeoutExpired: raise RenderError('RENDER_TIMEOUT','Renderzeit überschritten. Profil oder geprüfte Modellableitung verkleinern.',504)
            if process.returncode or not target.exists():
                # Blender output may contain private paths and material names. Never return it to a client.
                raise RenderError('BLENDER_FAILED','Geometrie oder private Originaldatei konnte nicht sicher gerendert werden.',422)
            result = json.loads(target.read_text(encoding='utf-8'))
            image = directory/'beauty.png'; mask = directory/'protected.png'
            result.update({'imageBase64':base64.b64encode(image.read_bytes()).decode(),'maskBase64':base64.b64encode(mask.read_bytes()).decode(),'revisionId':data['snapshot']['revisionId'],'contentHash':data['contentHash'],'jobId':job_id,'fencingToken':str(fence),'generatorVersion':VERSION})
            result['imageHash'],result['maskHash'] = digest(image.read_bytes()),digest(mask.read_bytes())
            result['imageByteLength'],result['maskByteLength']=image.stat().st_size,mask.stat().st_size
            result['manifestHash'] = digest(json.dumps(result['manifest'],sort_keys=True,separators=(',',':'),ensure_ascii=False))
        with LOCK, database() as db:
            current = db.execute('SELECT fence FROM jobs WHERE id=?',(job_id,)).fetchone()
            fail(current and current[0] == fence,'STALE_FENCE','Ein neuerer Jobversuch hat dieses Ergebnis abgelöst.',409)
            db.execute('UPDATE jobs SET result=?,touched=? WHERE id=? AND fence=?',(json.dumps(result,separators=(',',':')),time.time(),job_id,fence))
            db.execute('DELETE FROM jobs WHERE touched<?',(time.time()-86400,))
        return result
    finally: RENDER_SLOT.release()

def protect_pixels(original_bytes, candidate_bytes, mask_bytes):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS=50_000_000
    with Image.open(io.BytesIO(original_bytes),formats=['PNG']) as original,Image.open(io.BytesIO(candidate_bytes),formats=['PNG']) as candidate,Image.open(io.BytesIO(mask_bytes),formats=['PNG']) as mask:
        fail(original.size==candidate.size==mask.size,'PROTECTED_CAMERA','Original, Kandidat und Maske brauchen denselben unveränderten Bildausschnitt.')
        fail(original.width*original.height<=50_000_000,'IMAGE_LIMIT','Bild überschreitet das Pixellimit.')
        # Threshold any nonzero antialias pixel to fully protected. No blending can
        # modify even the edge pixels of an original inscription.
        binary=mask.convert('L').point(lambda value:255 if value>0 else 0)
        result=Image.composite(original.convert('RGBA'),candidate.convert('RGBA'),binary)
        output=io.BytesIO();result.save(output,format='PNG',compress_level=9);return output.getvalue()

def archived_composite(data):
    """Compose from immutable private originals; no dependency on a prior replica's cache."""
    job_id=str(data.get('jobId',''));fence=int(str(data.get('fencingToken','0')))
    fail(re.fullmatch(r'[a-zA-Z0-9_-]{1,200}',job_id) is not None and 0<fence<10**15,'JOB_ID','Gültiger Konzeptauftrag mit monotonem Fencingtoken fehlt.')
    fail(job_id!=data.get('sourceJobId'),'COMPOSITE_SOURCE_JOB','Konzeptauftrag braucht eine eigene Jobreferenz.')
    refs=[data.get(key) for key in ('originalRef','maskRef','candidateRef')]
    fail(all(isinstance(ref,dict) and re.fullmatch(r'[a-f0-9]{64}',str(ref.get('sourceHash',''))) and 0<int(ref.get('byteLength',0))<=40*1024*1024 for ref in refs) and sum(int(ref['byteLength']) for ref in refs)<=80*1024*1024,'COMPOSITE_SOURCES','Drei begrenzte unveränderliche Bildreferenzen fehlen.')
    proof=data.get('sourceManifest',{});canonical=proof.get('workerManifestCanonical','')
    fail(isinstance(canonical,str) and digest(canonical)==proof.get('workerManifestHash'),'COMPOSITE_MANIFEST','Originalkamera und deren Inhaltsnachweis fehlen.')
    try:source_manifest=json.loads(canonical)
    except(ValueError,TypeError):raise RenderError('COMPOSITE_MANIFEST','Originalkameranachweis ist ungültig.')
    fail(source_manifest.get('revisionId')==data.get('revisionId') and source_manifest.get('contentHash')==data.get('contentHash') and source_manifest.get('camera') and proof.get('sourceJobId')==data.get('sourceJobId') and str(proof.get('sourceFencingToken'))==str(data.get('sourceFencingToken')) and proof.get('imageHash')==refs[0]['sourceHash'] and proof.get('maskHash')==refs[1]['sourceHash'],'COMPOSITE_REVISION','Originalbild, Schutzmaske und Kamera gehören nicht zum selben Planstand.')
    identity={'operation':'protected-composite/v1','revisionId':data['revisionId'],'contentHash':data['contentHash'],'sourceJobId':data['sourceJobId'],'sourceManifestHash':proof['workerManifestHash'],'sourceHashes':[ref['sourceHash'] for ref in refs]}
    request_hash=digest(json.dumps(identity,sort_keys=True,separators=(',',':')))
    with LOCK,database() as db:
        previous=db.execute('SELECT fence,request_hash,result FROM jobs WHERE id=?',(job_id,)).fetchone()
        if previous:
            fail(fence>=previous[0],'STALE_FENCE','Ein neuerer Konzeptauftrag hat dieses Ergebnis abgelöst.',409)
            fail(previous[1]==request_hash,'IDEMPOTENCY_CONFLICT','Konzeptauftrag wurde mit anderen Original-/Kandidatenbytes wiederverwendet.',409)
            if previous[2]:
                result=json.loads(previous[2]);result['fencingToken']=str(fence);db.execute('UPDATE jobs SET fence=?,touched=? WHERE id=?',(fence,time.time(),job_id));return result
        db.execute('INSERT INTO jobs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET fence=excluded.fence,touched=excluded.touched',(job_id,fence,request_hash,None,time.time()))
    fail(RENDER_SLOT.acquire(timeout=2),'RENDER_BUSY','Bildverarbeitung ist belegt; denselben Auftrag später fortsetzen.',503)
    try:
        originals=[fetch_private_asset(ref) for ref in refs]
        for ref,original in zip(refs,originals):fail(len(original)==int(ref['byteLength']) and digest(original)==ref['sourceHash'],'COMPOSITE_SOURCE_HASH','Originalbildbereich stimmt nicht mit dem privaten Inhaltsnachweis überein.')
        image=protect_pixels(originals[0],originals[2],originals[1])
        from PIL import Image
        with Image.open(io.BytesIO(image)) as verified:width,height=verified.size
        fail(width==proof.get('width') and height==proof.get('height'),'COMPOSITE_RESOLUTION','Originalbild und archivierter Kameranachweis haben verschiedene Bildgrößen.')
        manifest={**identity,'generatorVersion':VERSION,'camera':source_manifest['camera'],'protectedElementIds':source_manifest.get('protectedElementIds',[]),'width':width,'height':height,'pixelProtection':'all_nonzero_mask_pixels_copied_from_original_rgba_without_blending','candidateAccuracy':'concept_visualization','sourceFencingToken':str(data['sourceFencingToken'])}
        manifest_canonical=json.dumps(manifest,sort_keys=True,separators=(',',':'),ensure_ascii=False)
        result={'jobId':job_id,'fencingToken':str(fence),'revisionId':data['revisionId'],'contentHash':data['contentHash'],'width':width,'height':height,'imageBase64':base64.b64encode(image).decode(),'imageByteLength':len(image),'imageHash':digest(image),'maskBase64':base64.b64encode(originals[1]).decode(),'maskByteLength':len(originals[1]),'maskHash':refs[1]['sourceHash'],'sourceImageHash':refs[0]['sourceHash'],'candidateHash':refs[2]['sourceHash'],'sourceJobId':data['sourceJobId'],'accuracy':'concept_visualization_with_protected_original_pixels','generatorVersion':VERSION,'manifest':manifest,'manifestHash':digest(manifest_canonical)}
        with LOCK,database() as db:
            current=db.execute('SELECT fence FROM jobs WHERE id=?',(job_id,)).fetchone();fail(current and current[0]==fence,'STALE_FENCE','Ein neuerer Konzeptauftrag hat das Ergebnis abgelöst.',409)
            db.execute('UPDATE jobs SET result=?,touched=? WHERE id=? AND fence=?',(json.dumps(result,separators=(',',':')),time.time(),job_id,fence))
        return result
    finally:RENDER_SLOT.release()

def composite(data):
    if data.get('originalRef'):return archived_composite(data)
    with LOCK,database() as db:cached=db.execute('SELECT fence,result FROM jobs WHERE id=?',(str(data.get('jobId','')),)).fetchone()
    fail(cached and cached[1],'PROTECTED_SOURCE','Geprüftes Ursprungsrender ist nicht mehr im Worker verfügbar; denselben Job erneut laden.',409)
    original=json.loads(cached[1]);fail(str(cached[0])==str(data.get('fencingToken')) and original['contentHash']==data.get('contentHash'),'PROTECTED_REVISION','Schutzmaske gehört zu einem anderen Job-/Revisionsstand.',409)
    candidate=fetch_private_asset(data['candidateRef']) if data.get('candidateRef') else base64.b64decode(data['candidateBase64'],validate=True);fail(len(candidate)<=40*1024*1024,'IMAGE_LIMIT','Kandidat ist zu groß.')
    if data.get('candidateRef'):fail(digest(candidate)==data['candidateRef'].get('sourceHash'),'CANDIDATE_HASH','Konzeptkandidat stimmt nicht mit seiner privaten Dateiversion überein.')
    image=protect_pixels(base64.b64decode(original['imageBase64']),candidate,base64.b64decode(original['maskBase64']))
    encoded=base64.b64encode(image).decode();image_hash=digest(image);artifact_id=digest(candidate)
    derived=original.setdefault('derivedImages',{});derived[artifact_id]={'imageBase64':encoded,'imageHash':image_hash}
    while len(derived)>3:derived.pop(next(iter(derived)))
    with LOCK,database() as db:
        current=db.execute('SELECT fence FROM jobs WHERE id=?',(data['jobId'],)).fetchone();fail(current and str(current[0])==str(data['fencingToken']),'STALE_FENCE','Neuerer Jobversuch hat diese Ableitung abgelöst.',409)
        db.execute('UPDATE jobs SET result=?,touched=? WHERE id=? AND fence=?',(json.dumps(original,separators=(',',':')),time.time(),data['jobId'],current[0]))
    result={'imageHash':image_hash,'imageRef':{'byteLength':len(image),'contentHash':image_hash,'artifactId':artifact_id},'jobId':data['jobId'],'fencingToken':str(cached[0]),'revisionId':original['revisionId'],'contentHash':original['contentHash'],'sourceImageHash':original['imageHash'],'maskHash':original['maskHash'],'manifestHash':original['manifestHash'],'accuracy':'concept_visualization_with_protected_original_pixels','generatorVersion':VERSION,'width':original['width'],'height':original['height']}
    if len(encoded)<=1_000_000:result['imageBase64']=encoded
    return result

def upload_render_output(target, content, data, kind):
    """An exact-path, expiring PUT capability; no bucket credential or arbitrary host."""
    fail(isinstance(target,dict),'RENDER_UPLOAD_TARGET','Private Uploadfreigabe fehlt.')
    token=target.get('token','');pathname=target.get('pathname','');expires=target.get('expiresAt',0)
    fail(isinstance(token,str) and re.fullmatch(r'vercel_blob_client_[a-zA-Z0-9]+_[a-zA-Z0-9+/=]+',token) is not None,'RENDER_UPLOAD_TOKEN','Begrenzte Uploadfreigabe ist ungültig.')
    try:
        encoded=token.split('_',4)[4];signed=base64.b64decode(encoded,validate=True).decode();constraints=json.loads(base64.b64decode(signed.split('.',1)[1],validate=True))
    except(ValueError,UnicodeError,IndexError,TypeError):raise RenderError('RENDER_UPLOAD_TOKEN','Uploadgrenzen sind ungültig.')
    prefix=r'[a-f0-9-]{36}/render-output/'+re.escape(str(data['jobId']))+'/'+re.escape(str(data['fencingToken']))+r'/[a-f0-9-]{36}/'+kind+r'\.png'
    fail(re.fullmatch(prefix,pathname) is not None and constraints.get('pathname')==pathname and constraints.get('validUntil')==expires and time.time()*1000<expires<=time.time()*1000+900000 and constraints.get('maximumSizeInBytes')==target.get('maximumSizeInBytes')==40*1024*1024 and constraints.get('allowedContentTypes')==['image/png'] and constraints.get('allowOverwrite') is False and constraints.get('addRandomSuffix') is False and target.get('contentType')=='image/png','RENDER_UPLOAD_SCOPE','Uploadfreigabe ist nicht genau auf diesen Jobversuch begrenzt.')
    fail(0<len(content)<=40*1024*1024 and content[:8]==b'\x89PNG\r\n\x1a\n','RENDER_UPLOAD_SIZE','Renderdatei ist keine begrenzte PNG-Datei.')
    connection=http.client.HTTPSConnection('vercel.com',443,timeout=120,context=ssl.create_default_context())
    try:
        connection.request('PUT','/api/blob/?'+urlencode({'pathname':pathname}),content,{'Authorization':'Bearer '+token,'x-api-version':'13','x-vercel-blob-store-id':token.split('_')[3],'x-vercel-blob-access':'private','x-content-type':'image/png','Content-Length':str(len(content))})
        response=connection.getresponse();body=response.read(128*1024+1)
        fail(len(body)<=128*1024,'RENDER_UPLOAD_RESPONSE','Dateispeicher antwortet außerhalb des begrenzten Vertrags.',502)
        # A replay cannot overwrite its immutable target. The app independently
        # reads the preissued path and checks actual SHA-256 before registration.
        fail(response.status in (200,201,409),'RENDER_UPLOAD_FAILED','Der private Dateispeicher hat das Renderbild nicht angenommen.',503)
        if response.status!=409:
            try:uploaded=json.loads(body)
            except(ValueError,TypeError):raise RenderError('RENDER_UPLOAD_RESPONSE','Dateispeichernachweis ist ungültig.',502)
            fail(uploaded.get('pathname')==pathname,'RENDER_UPLOAD_PATH','Der Dateispeicher hat einen anderen Zielpfad gemeldet.',502)
    finally:connection.close()
    return{'pathname':pathname,'byteLength':len(content),'contentHash':digest(content)}

def public_render_result(result, request=None):
    payload=dict(result)
    payload.pop('derivedImages',None)
    # Preserve the exact UTF-8 serialization for cross-runtime float hashing.
    payload['manifestCanonical']=json.dumps(result['manifest'],sort_keys=True,separators=(',',':'),ensure_ascii=False)
    if request and request.get('outputTargets'):
        for kind in ('image','mask'):
            payload[kind+'Blob']=upload_render_output(request['outputTargets'].get(kind),base64.b64decode(result[kind+'Base64'],validate=True),request,kind)
            payload.pop(kind+'Base64',None);payload.pop(kind+'Ref',None)
        return payload
    for kind,key in [('image','imageBase64'),('mask','maskBase64')]:
        payload[kind+'Ref']={'byteLength':result.get(kind+'ByteLength',len(base64.b64decode(result[key]))),'contentHash':result[kind+'Hash']}
    if len(payload['imageBase64'])+len(payload['maskBase64'])>1_000_000:
        payload.pop('imageBase64');payload.pop('maskBase64')
    return payload

def artifact(data):
    with LOCK,database() as db:cached=db.execute('SELECT fence,result FROM jobs WHERE id=?',(str(data.get('jobId','')),)).fetchone()
    fail(cached and cached[1] and str(cached[0])==str(data.get('fencingToken')),'ARTIFACT_FENCE','Renderartefakt gehört nicht zu diesem Jobversuch.',409)
    result=json.loads(cached[1]);kind=data.get('kind');offset,length=data.get('offset'),data.get('length')
    fail(kind in ('image','mask') and isinstance(offset,int) and isinstance(length,int) and offset>=0 and 0<length<=1024*1024,'ARTIFACT_RANGE','Renderbildbereich ist ungültig.')
    if data.get('artifactId'):
        derived=result.get('derivedImages',{}).get(data['artifactId']);fail(derived and kind=='image','ARTIFACT_REFERENCE','Geprüfte Bildableitung ist nicht mehr verfügbar.',409);result={**result,**derived}
    content=base64.b64decode(result[kind+'Base64']);fail(offset+length<=len(content),'ARTIFACT_RANGE','Renderbildbereich überschreitet die Originalgröße.')
    return{'jobId':data['jobId'],'fencingToken':str(cached[0]),'offset':offset,'byteLength':len(content),'contentHash':result[kind+'Hash'],'bytesBase64':base64.b64encode(content[offset:offset+length]).decode()}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,status,payload):
        body=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path != '/health': return self.send_json(404,{'error':'NOT_FOUND'})
        blender=os.environ.get('BLENDER_BIN','blender')
        self.send_json(200,{'generatorVersion':VERSION,'blenderAvailable':bool(shutil.which(blender) or Path(blender).is_file()),'ready':len(os.environ.get('RENDER_WORKER_SECRET',''))>=32})
    def do_POST(self):
        expected=os.environ.get('RENDER_WORKER_SECRET','')
        if len(expected)<32: return self.send_json(503,{'error':'WORKER_NOT_CONFIGURED','message':'Isolierter Worker-Zugang ist noch nicht eingerichtet.'})
        if not hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+expected): return self.send_json(401,{'error':'UNAUTHORIZED'})
        if self.path not in ('/render','/composite','/render/artifact'): return self.send_json(404,{'error':'NOT_FOUND'})
        try:
            size=int(self.headers.get('Content-Length','0'));fail(0<size<=MAX_BODY,'REQUEST_SIZE','Renderauftrag ist zu groß.',413)
            self.connection.settimeout(30)
            data=json.loads(self.rfile.read(size));result=public_render_result(run_render(data),data) if self.path=='/render' else artifact(data) if self.path=='/render/artifact' else public_render_result(composite(data),data) if data.get('originalRef') else composite(data);self.send_json(200,result)
        except RenderError as error:self.send_json(error.status,{'error':error.code,'message':str(error),'blocked':error.status==422})
        except Exception:self.send_json(422,{'error':'INVALID_RENDER_REQUEST','message':'Renderauftrag konnte nicht sicher verarbeitet werden.','blocked':True})

if __name__=='__main__':
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()
