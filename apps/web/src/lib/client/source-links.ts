import type {AppData} from './types.ts';
/** A visible report never promises access to an unavailable source workspace. */
export function sourceHref(data:AppData,href:string|undefined,fallback='/reports?tab=quality'){
 if(!href||!href.startsWith('/')||href.startsWith('//'))return fallback;
 const url=new URL(href,'https://app.invalid'),slug=url.pathname.split('/')[1];
 if(!slug||['reports','help','account'].includes(slug)||data.navigation?.some((item:{slug:string})=>item.slug===slug))return url.pathname+url.search+url.hash;
 if(data.context?.permissions.some(p=>['finance','finance.read'].includes(p))&&['orders','invoices','payments','receivables','performance-valuations'].includes(slug)){
  const params=new URLSearchParams(url.search);for(const [key,value]of Object.entries({from:data.summary?.reportContext?.from,to:data.summary?.reportContext?.to,business_unit:data.summary?.reportContext?.businessUnit})){if(value&&!params.has(key))params.set(key,String(value));}params.set('tab','sources');params.set('source',slug);const id=url.pathname.split('/')[2];if(id&&/^[0-9a-f-]{36}$/i.test(id))params.set('source_id',id);return '/reports?'+params;
 }
 return fallback;
}
