import {it,expect} from 'vitest';
import {replayPrivacy} from './restore-privacy.js';
it('replays document identity without erasing independently permitted identical bytes',()=>{
 const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64),snapshot:any={tables:{documents:[{id,content_hash:hash},{id:other,content_hash:hash,status:'available'}],document_versions:[{id:'v1',document_id:id,blob_object_id:'shared'},{id:'v2',document_id:other,blob_object_id:'shared'}],blob_objects:[{id:'shared',storage_key:'private/shared',status:'available'}],search_documents:[{document_id:id,content:'PII'},{document_id:other,content:'separate purpose'}],document_extractions:[{document_version_id:'v1',value:'PII'}]}};
 const result=replayPrivacy(snapshot,[{entityType:'document',entityId:id,relatedIds:[],objectHash:hash,deletionJobId:'33333333-3333-4333-8333-333333333333'}]);
 expect(snapshot.tables.documents[0].status).toBe('erased');expect(snapshot.tables.documents[1].status).toBe('available');expect(result.excludedStorage.size).toBe(0);expect(snapshot.tables.document_extractions).toEqual([]);expect(snapshot.tables.search_documents).toHaveLength(1);
});
