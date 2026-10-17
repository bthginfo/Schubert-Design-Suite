import type {SalesLine} from '@schubert/contracts';
import {dec,requireRule} from '@schubert/domain';
/** Hidden commercial costs cannot be erased or supplied through an ordinary office edit. */
export function bindLineCosts(lines:SalesLine[],existing:any[],mayWriteCosts:boolean){return lines.map((line,index)=>{
 const prior=existing.find(old=>line.id?old.id===line.id:old.position===index+1),sameBasis=prior&&prior.description===line.description&&prior.unit===line.unit&&(prior.product_id??null)===(line.product_id??null),explicit=mayWriteCosts&&line.cost_unit!==undefined;
 if(explicit){requireRule(line.cost_unit===null||dec(line.cost_unit!).gte(0),'LINE_COST','Geplante Einzelkosten müssen nichtnegativ sein. Leer bleibt unbekannt.');return{...line,cost_unit:line.cost_unit,cost_review_required:line.cost_unit===null,cost_evidence:line.cost_unit===null?{reason:'explicit_unknown'}:{reason:'explicit_confirmed_input'}};}
 if(sameBasis)return{...line,cost_unit:prior.cost_unit??null,cost_review_required:prior.cost_review_required??false,cost_evidence:prior.cost_evidence??null};
 return{...line,cost_unit:null,cost_review_required:!!prior?.cost_unit||prior?.cost_review_required||false,cost_evidence:prior?.cost_unit?{reason:'changed_cost_basis',previousCostUnit:prior.cost_unit,previousProductId:prior.product_id,previousUnit:prior.unit}:null};
});}
