import {calendarDate} from '@schubert/contracts';
import type {Field,Row} from './types';

type Lookups=Record<string,{id:string;name:string}[]>;

/** Proposals only: the editor still requires an explicit save and server validation. */
export function createContext(fields:Field[],lookups:Lookups,params:URLSearchParams,initialValues:Row={}):Row{
 const result:Row={};
 for(const field of fields){
  const proposed=initialValues[field.key]??params.get(field.key)??(field.key==='order_id'?params.get('order'):null);
  if(typeof proposed!=='string'||!proposed)continue;
  if(field.type==='reference'){
   const match=(lookups[field.reference??'']??[]).find(item=>item.id.toLowerCase()===proposed.toLowerCase());
   if(match)result[field.key]=match.id;
  }else if(field.type==='date'&&calendarDate(proposed))result[field.key]=proposed;
  // Editable text comes from explicit in-app start values, never URL text.
  else if(Object.hasOwn(initialValues,field.key)&&['title','notes'].includes(field.key)&&['text','textarea'].includes(field.type)&&proposed.length<=20000)result[field.key]=proposed;
  // Calendar suggestions are local editable form values, never timestamps from URL input.
  else if(field.type==='datetime-local'&&Object.hasOwn(initialValues,field.key)&&['starts_at','ends_at'].includes(field.key)&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(proposed)&&calendarDate(proposed.slice(0,10)))result[field.key]=proposed;
 }
 return result;
}

export function dispatchCreateContext(day:string,employeeId?:string):Row{
 if(!calendarDate(day))return {};
 return {starts_at:day+'T08:00',ends_at:day+'T09:00',...(employeeId?{employee_id:employeeId}:{})};
}

export function createHref(slug:string,context:Record<string,unknown>):string{
 const params=new URLSearchParams({create:'1'});
 for(const key of ['customer_id','order_id','supplier_id','site_id','grave_plot_id','purchase_order_id',...(slug==='quotes'?['inquiry_id']:[])]){
  const value=context[key];if(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))params.set(key,value);
 }
 return '/'+slug+'?'+params;
}
