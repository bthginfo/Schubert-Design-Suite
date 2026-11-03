import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

// Local transport fixture. No provider requests, real keys or model quality claim.
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV||process.env.VERCEL)throw Error('Synthetic provider is local-only.');
const port=Number(process.env.TEST_AI_PROVIDER_PORT??8854);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local test port.');
createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/responses'){res.writeHead(404).end();return;}
  let raw='';for await(const part of req){raw+=part;if(raw.length>100000){res.writeHead(413).end();return;}}
  try{
    const input=JSON.parse(raw),read=(input.tools??[]).some(t=>t.name==='inspect_current_plan');
    const item=read?{type:'function_call',name:'inspect_current_plan',call_id:'synthetic_current_plan',id:'fc_'+randomUUID(),status:'completed',arguments:'{}'}:
      {type:'message',id:'msg_'+randomUUID(),role:'assistant',status:'completed',content:[{type:'output_text',annotations:[],text:JSON.stringify({text:'Transportprüfung: Der gespeicherte Plan wurde berechnet. Dies ist keine technische Freigabe.',targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null})}]};
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({id:'resp_local_transport_'+randomUUID(),object:'response',status:'completed',created_at:Math.floor(Date.now()/1000),model:input.model,output:[item],usage:{input_tokens:1000,output_tokens:100,total_tokens:1100,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}));
  }catch{res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:{type:'synthetic_invalid_request',message:'Invalid fixture payload'}}));}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic AI transport only: 127.0.0.1:'+port));
