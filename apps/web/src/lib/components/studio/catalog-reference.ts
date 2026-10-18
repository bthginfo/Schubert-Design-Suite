import{isPublicProductReference}from'@schubert/contracts';
import{request}from'#lib/client/api.ts';
/** Resolve a user-selected immutable version, including choices outside the first page. */
export async function frozenProductVersion(id:string){
 const result=await request(`/api/v1/lookups/product-versions?${new URLSearchParams({include_id:id})}`,undefined,'GET'),rows=Array.isArray(result)?result:result?.items??result?.records??[],version=rows.find((row:any)=>row.id===id);
 if(!version||(!version.approved_at&&!isPublicProductReference(version))||!version.width_mm||!version.depth_mm)throw Error('Diese Produktfassung ist nicht mehr als belegte Katalogfassung mit Nennmaßen verfügbar. Auswahl und technischen Katalogstand prüfen.');
 return version;
}
