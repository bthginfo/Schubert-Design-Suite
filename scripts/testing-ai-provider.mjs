import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

function suiteOutput(input){
  const user=typeof input.input==='string'?JSON.parse(input.input):JSON.parse(input.input[0].content);
  const match=/^TEST Suite (Kunde|Rechnung|Angebot|Plan) (.+)$/.exec(user.message);
  if(!match)return null;
  const [, intent, query]=match,area={Kunde:'customers',Rechnung:'orders',Angebot:'customers',Plan:'studio'}[intent];
  if(input.tools.some(tool=>tool.name==='find_suite_records'))return {type:'function_call',name:'find_suite_records',
    call_id:'synthetic_suite_record',id:'fc_'+randomUUID(),status:'completed',arguments:JSON.stringify({area,query,details:true,status:null,from:null,to:null})};
  const evidence=JSON.parse(input.input.at(-1).content).readOnlyEvidence[0].result;
  const record=evidence.items.find(row=>row.id===query);
  const commands=[];
  const command=(name,payload,targetId=null,baseVersion=null)=>commands.push({name,inputJson:JSON.stringify(payload),targetId,baseVersion});
  if(record&&intent==='Rechnung')command('billing.invoice.create',{title:'TEST Rechnung aus dem Chat',kind:'normal',order_id:record.id,
    lines:evidence.lines.map(({tax_category,...line})=>line)});
  if(record&&intent==='Angebot')command('sales.quote.create',{title:'TEST Angebot aus dem Chat',customer_id:record.id});
  if(record&&intent==='Plan'){
    const plan=evidence.planningTarget,element=evidence.planningContext.snapshot.elements.find(element=>element.kind==='stone_piece');
    command('planning.design.change',{base_revision_id:plan.revisionId,operations:[{type:'rename_element',elementId:element.id,label:'Im Suite-Chat benannt'}]},plan.variantId,plan.baseVersion);
  }
  return {type:'message',id:'msg_'+randomUUID(),role:'assistant',status:'completed',content:[{type:'output_text',annotations:[],
    text:JSON.stringify({text:record?(intent==='Kunde'?'Gefunden: '+record.name+' · '+record.email:'Der Entwurf ist zur Prüfung vorbereitet.'):'Kein Treffer.',
      targetId:null,baseVersion:null,commands,missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null})}]};
}

// Local transport fixture. No provider requests, real keys or model quality claim.
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV||process.env.VERCEL)throw Error('Synthetic provider is local-only.');
const port=Number(process.env.TEST_AI_PROVIDER_PORT??8854);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local test port.');
createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/responses'){res.writeHead(404).end();return;}
  let raw='';for await(const part of req){raw+=part;if(raw.length>100000){res.writeHead(413).end();return;}}
  try{
    const input=JSON.parse(raw),read=(input.tools??[]).some(t=>t.name==='inspect_current_plan');
    const item=suiteOutput(input)??(read?{type:'function_call',name:'inspect_current_plan',call_id:'synthetic_current_plan',id:'fc_'+randomUUID(),status:'completed',arguments:'{}'}:
      {type:'message',id:'msg_'+randomUUID(),role:'assistant',status:'completed',content:[{type:'output_text',annotations:[],text:JSON.stringify({text:'Transportprüfung: Der gespeicherte Plan wurde berechnet. Dies ist keine technische Freigabe.',targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null})}]});
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({id:'resp_local_transport_'+randomUUID(),object:'response',status:'completed',created_at:Math.floor(Date.now()/1000),model:input.model,output:[item],usage:{input_tokens:1000,output_tokens:100,total_tokens:1100,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}));
  }catch{res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:{type:'synthetic_invalid_request',message:'Invalid fixture payload'}}));}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic AI transport only: 127.0.0.1:'+port));
