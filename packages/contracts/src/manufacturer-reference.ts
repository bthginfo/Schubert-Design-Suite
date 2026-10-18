/** Publicly sourced dimensions are usable for consultation, never a manufacturing approval. */
export function isPublicProductReference(version:{status?:string;content_hash?:string|null;source_url?:string|null;validation_report?:any}){
 return version.status==='source_reference'&&!!version.content_hash&&version.validation_report?.kind==='manufacturer_public_reference'&&version.validation_report?.sourceHash?.match(/^[a-f0-9]{64}$/)&&version.source_url?.startsWith('https:')?true:false;
}
