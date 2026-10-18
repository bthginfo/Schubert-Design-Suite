import {feedbackPage,feedbackControls,type FeedbackContext,type FeedbackStep} from '@schubert/contracts';

let owner='',enabled=false;
let steps:(Omit<FeedbackStep,'age_seconds'>&{at:number})[]=[];
const lifetime=900_000;
export function configureFeedback(actor:string,active:boolean){if(owner!==actor||!active)steps=[];owner=actor;enabled=active;}
export function recordFeedbackStep(kind:FeedbackStep['kind'],action:string,outcome:FeedbackStep['outcome'],error?:{code?:string;correlationId?:string}){
 if(!enabled||typeof location==='undefined')return;
 const now=Date.now(),page=feedbackPage(location.pathname+location.search).path;
 const item={kind,action,page,outcome,at:now,...(/^[A-Z][A-Z0-9_]{0,59}$/.test(error?.code??'')?{error_code:error!.code}:{}),...(/^[a-f0-9-]{36}$/i.test(error?.correlationId??'')?{correlation_id:error!.correlationId}:{})};
 const last=steps.at(-1);if(last&&now-last.at<500&&last.kind===kind&&last.action===action&&last.page===page&&last.outcome===outcome)return;
 steps=[...steps.filter(s=>now-s.at<=lifetime),item].slice(-40);
}
export function recordFeedbackClick(event:MouseEvent){
 if(!(event.target instanceof Element)||event.target.closest('[data-feedback-private]'))return;
 const button=event.target.closest('button,summary,[role="button"]');if(!button)return;
 const label=(button.getAttribute('aria-label')||button.textContent||'').replace(/\s+/g,' ').trim();
 if(feedbackControls.includes(label))recordFeedbackStep('control',label,'opened');
}
export function feedbackRequestAction(path:string,body:unknown):{kind:'command'|'request';action:string}|null{
 if(!enabled)return null;
 if(path==='/api/v1/commands'){
  const name=body&&typeof body==='object'&&'name' in body?String(body.name):'';
  if(!/^[a-z][a-z0-9_.]{1,99}$/.test(name)||/^(feedback\.|account\.|administration\.user\.|integration\.|settings\.)/.test(name))return null;
  return{kind:'command',action:name};
 }
 const action=path==='/api/v1/uploads'?'Datei hochladen':/^\/api\/v1\/(?:planning\/|designs\/[a-f0-9-]{36}\/commands$)/i.test(path)?'Planung bearbeiten':/^\/api\/v1\/ai\/(?:chat|transcribe|proposals\/[a-f0-9-]{36}\/apply)$/.test(path)?'KI-Anfrage':path==='/api/v1/time/sync'?'Zeiten abgleichen':null;
 return action?{kind:'request',action}:null;
}
/** Observe only a known design operation's result, never its geometry or text payload. */
export async function feedbackFetch(path:string,init:RequestInit){
 const trace=feedbackRequestAction(path,undefined);if(trace)recordFeedbackStep(trace.kind,trace.action,'started');
 try{const response=await fetch(path,init);if(trace){let details:{code?:string;correlationId?:string}|undefined;if(!response.ok){const result=await response.clone().json().catch(()=>null);details=result?.error&&typeof result.error==='object'?{code:result.error.code,correlationId:result.error.correlationId}:undefined;}recordFeedbackStep(trace.kind,trace.action,response.ok?'succeeded':'failed',details);}return response;
 }catch(error){if(trace)recordFeedbackStep(trace.kind,trace.action,'failed',{code:'REQUEST_FAILED'});throw error;}
}
export function feedbackSnapshot(release:string):FeedbackContext{
 const ua=navigator.userAgent,now=Date.now();
 return{steps:steps.filter(s=>now-s.at<=lifetime).map(({at,...s})=>({...s,age_seconds:Math.floor((now-at)/1000)})),browser:/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other',os:/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other',viewport:{width:Math.max(200,Math.min(10000,innerWidth)),height:Math.max(200,Math.min(10000,innerHeight))},client_release:/^[a-f0-9]{7,40}$/.test(release)?release:'development'};
}
