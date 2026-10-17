import type{DesignSnapshot}from'@schubert/contracts';
import{D}from'./precision.js';
import{measureValue}from'./model.js';
import{contourBounds}from'./contours.js';
import type{DesignValidation}from'./validation.js';
export type AssetUsage='internal_consultation'|'customer_visualization'|'supplier_package'|'manufacturing';
/** An inquiry or a free-text license description cannot substitute for an approved purpose. */
export function hasAssetUsage(asset:{rights_verified?:boolean;approved_at?:unknown;validation_report?:any},purpose:AssetUsage){return asset.rights_verified===true&&!!asset.approved_at&&Array.isArray(asset.validation_report?.usageScopes)&&asset.validation_report.usageScopes.includes(purpose);}
export type CatalogBindingReferences={
  fonts?:Array<{id:string;version_id?:string;supply_form?:string;material_references?:Record<string,string[]>;available_heights_mm?:string[];source_hash?:string|null}>;
  products?:Array<{id:string;version_id?:string;width_mm:string|null;depth_mm:string|null;height_mm?:string|null;status?:string;content_hash?:string|null}>;
};
/** Repeat on the server with tenant-authorized immutable catalog rows. */
export function validateCatalogBindings(snapshot:DesignSnapshot,references:CatalogBindingReferences,options:{forRelease?:boolean}={}):DesignValidation{
  const blocking:string[]=[],warnings:string[]=[];const issue=(message:string)=>(options.forRelease?blocking:warnings).push(message);
  for(const element of snapshot.elements){
    if(element.kind==='inscription'){
      const font=references.fonts?.find(f=>(f.version_id??f.id)===element.fontVariantVersionId);
      if(!font){issue(`„${element.label}“: eingefrorene Hersteller-/Schriftversion fehlt.`);continue;}
      if(font.supply_form&&font.supply_form!==element.supplyForm)blocking.push(`„${element.label}“: Lieferform gehört nicht zur gewählten Schriftversion.`);
      const materials=Object.values(font.material_references??{}).flat();
      if(element.materialArticleReference&&materials.length&&!materials.includes(element.materialArticleReference))blocking.push(`„${element.label}“: Materialartikel ${element.materialArticleReference} ist für die gewählte Schriftversion nicht belegt.`);
      if(!element.materialArticleReference)issue(`„${element.label}“: konkrete Hersteller-Materialartikelreferenz offen.`);
      const requested=measureValue(snapshot,element.requestedHeightMeasureId);
      if(requested!==null&&font.available_heights_mm?.length&&!font.available_heights_mm.some(h=>new D(h).eq(requested)))warnings.push(`„${element.label}“: gewünschte Höhe ${requested} mm liegt außerhalb belegter Kataloggrößen. Lieferant muss die konkrete Ausführung bestätigen; keine stille Rundung.`);
    }
    if(element.kind==='catalog_object'&&!element.productVariantVersionId.startsWith('unassigned')){
      const product=references.products?.find(p=>(p.version_id??p.id)===element.productVariantVersionId);
      if(!product){issue(`„${element.label}“: technische Produktversion fehlt.`);continue;}
      const bounds=contourBounds(element.footprint);
      const approvedCurve=element.accuracy==='approximate'&&element.footprint.importProvenance?.review&&snapshot.assetManifest.some(a=>a.assetVersionId===element.assetVersionId&&a.geometryVerified&&a.rightsVerified);if(element.accuracy!=='verified_original'&&!approvedCurve&&product.width_mm!==null&&product.depth_mm!==null&&(!new D(bounds.width).eq(product.width_mm)||!new D(bounds.height).eq(product.depth_mm)))blocking.push(`„${element.label}“: Hüllmaße weichen von der eingefrorenen Produktvariante ab.`);
      if(product.status&&product.status!=='approved')issue(`„${element.label}“: technische Herstellerfassung noch nicht fachlich freigegeben.`);
      const height=measureValue(snapshot,element.heightMeasureId??null);
      if(height!==null&&product.height_mm!==null&&product.height_mm!==undefined&&!new D(height).eq(product.height_mm))blocking.push(`„${element.label}“: Hüllhöhe weicht von der Katalogversion ab.`);
      if(element.heightMeasureId&&snapshot.measurements[element.heightMeasureId]?.semantic!=='catalog_nominal')blocking.push(`„${element.label}“: Produktnennhöhe darf nicht als frei veränderliches Wunsch-/Aufmaß geführt werden.`);
    }
  }return{blocking,warnings};
}
