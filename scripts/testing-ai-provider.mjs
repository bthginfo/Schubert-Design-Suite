import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

const answer=fields=>({type:'text',text:JSON.stringify({targetId:null,baseVersion:null,commands:[],missingInputs:[],assumptions:[],clarifications:[],planningDraft:null,visualization:null,...fields})});
const toolUse=(name,input,id)=>({type:'tool_use',id,name,input});
const userPayload=body=>JSON.parse(body.messages[0].content.find(block=>block.type==='text').text);
const results=body=>body.messages.flatMap(message=>Array.isArray(message.content)?message.content:[]).filter(block=>block.type==='tool_result').map(block=>JSON.parse(block.content));
const offered=(body,name)=>body.tool_choice?.type!=='none'&&(body.tools??[]).some(tool=>tool.name===name);

function suiteOutput(body){
  const user=userPayload(body);
  const match=/^TEST Suite (Kunde|Rechnung|Angebot|Plan) (.+)$/.exec(user.message);
  if(!match)return null;
  const [, intent, query]=match,area={Kunde:'customers',Rechnung:'orders',Angebot:'customers',Plan:'studio'}[intent];
  if(offered(body,'find_suite_records'))return [toolUse('find_suite_records',{area,query,details:true,status:null,from:null,to:null},'toolu_synthetic_suite_record')];
  const evidence=results(body)[0].result;
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
  return [answer({text:record?(intent==='Kunde'?'Gefunden: '+record.name+' · '+record.email:'Der Entwurf ist zur Prüfung vorbereitet.'):'Kein Treffer.',commands})];
}

// Local Claude Messages API transport fixture. No provider requests, real keys or model quality claim.
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV||process.env.VERCEL)throw Error('Synthetic provider is local-only.');
const port=Number(process.env.TEST_AI_PROVIDER_PORT??8854);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local test port.');
// Optional artificial latency to review progress states in the browser.
const delay=Math.min(Math.max(Number(process.env.TEST_AI_PROVIDER_DELAY_MS??0),0),30000);
const json=(res,status,body)=>res.writeHead(status,{'content-type':'application/json','request-id':'req_synthetic_'+randomUUID()}).end(JSON.stringify(body));
createServer(async(req,res)=>{
  const modelProbe=/^\/v1\/models\/([a-z0-9.-]+)$/.exec(req.url??'');
  if(req.method==='GET'&&modelProbe){json(res,200,{type:'model',id:modelProbe[1],display_name:'Synthetic '+modelProbe[1],created_at:new Date().toISOString()});return;}
  if(req.method!=='POST'||!['/v1/messages','/v1/messages/count_tokens'].includes(req.url??'')){res.writeHead(404).end();return;}
  let raw='';for await(const part of req){raw+=part;if(raw.length>400000){res.writeHead(413).end();return;}}
  if(req.url==='/v1/messages/count_tokens'){json(res,200,{input_tokens:Math.ceil(raw.length/3)});return;}
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  try{
    const body=JSON.parse(raw);
    const content=suiteOutput(body)??(offered(body,'inspect_current_plan')?[toolUse('inspect_current_plan',{},'toolu_synthetic_current_plan')]:
      [answer({text:'Transportprüfung: Der gespeicherte Plan wurde berechnet. Dies ist keine technische Freigabe.'})]);
    json(res,200,{id:'msg_local_transport_'+randomUUID(),type:'message',role:'assistant',model:body.model,content,
      stop_reason:content.some(block=>block.type==='tool_use')?'tool_use':'end_turn',stop_sequence:null,stop_details:null,
      usage:{input_tokens:1000,output_tokens:100,cache_creation_input_tokens:0,cache_read_input_tokens:0}});
  }catch{json(res,400,{type:'error',error:{type:'invalid_request_error',message:'Invalid fixture payload'}});}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic Claude transport only: http://127.0.0.1:'+port));
