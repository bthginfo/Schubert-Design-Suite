import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {config} from 'dotenv';
import {withTenant,insert,one,closePools} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {login} from './login.js';
config({quiet:true});

const actor:ActorContext={tenantId:process.env.TEST_TENANT_ID!,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID!,actorId:process.env.TEST_SUPERADMIN_ID!,role:'SuperAdmin',permissions:[],permissionVersion:1,correlationId:randomUUID(),employeeId:null,actorType:'employee',identityAssurance:'individual_session'};
let connection:string|undefined;
test.beforeAll(async()=>{
  if(!actor.tenantId)throw Error('Isolated synthetic tenant required.');
  await withTenant(actor,async db=>{if(!await one(db,"SELECT id FROM integration_connections WHERE provider='openai' AND status='configured'"))connection=(await insert(db,'integration_connections',{tenant_id:actor.tenantId,legal_entity_id:actor.legalEntityId,provider:'openai',name:'TEST multimodal transport only',configuration:{},status:'configured'})).id;});
  await mkdir('work/multimodal-chat-2026-10-28',{recursive:true});
});
test.afterAll(async()=>{try{if(connection)await withTenant(actor,db=>db.query('DELETE FROM integration_connections WHERE id=$1',[connection]));}finally{await closePools();}});
async function begin(page:Page){await login(page,'OWNER');await page.getByRole('button',{name:'Assistent',exact:true}).click();const panel=page.locator('#assistant-drawer');await panel.getByRole('button',{name:'Chat',exact:true}).click();return panel;}
async function syntheticMicrophone(page:Page){await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext();await ctx.resume();const output=ctx.createMediaStreamDestination(),osc=ctx.createOscillator();osc.connect(output);osc.start();output.stream.getAudioTracks()[0].addEventListener('ended',()=>void ctx.close());return output.stream;};});}

test('Image, typed text and real browser dictation share one composer, survive rejection, and send together',async({page})=>{
  const panel=await begin(page),original=randomUUID(),preview=randomUUID(),version=randomUUID();let audioCalls=0,chatBody:any;
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1cAAAAASUVORK5CYII=','base64');
  await page.route('**/api/v1/uploads',route=>route.fulfill({json:{ok:true,result:{id:original}}}));
  await page.route('**/api/v1/ai/attachments/'+original,route=>route.fulfill({json:{ok:true,result:{status:'available'}}}));
  await page.route('**/api/v1/commands',route=>route.request().postDataJSON().name==='documents.preview'?route.fulfill({json:{ok:true,result:{status:'completed',job_id:randomUUID(),document_id:preview,document_version_id:version,width:1,height:1}}}):route.continue());
  await page.route('**/api/v1/documents/'+preview+'/download**',route=>route.fulfill({body:png,contentType:'image/png'}));
  await page.route('**/api/v1/ai/transcribe',route=>{audioCalls++;expect(route.request().postDataBuffer()!.length).toBeGreaterThan(3000);return route.fulfill(audioCalls===1?{status:422,json:{ok:false,error:{code:'AUDIO_INSPECTION',message:'Audioaufnahme unvollständig. Text und Bildanhänge bleiben erhalten.'}}}:{json:{ok:true,result:{text:'Die Breite beträgt 600 Millimeter.'}}});});
  await page.route('**/api/v1/ai/chat',route=>{chatBody=route.request().postDataJSON();return route.fulfill({json:{ok:true,result:{text:'Synthetische kombinierte Nachricht erhalten.'}}});});
  await panel.locator('#assistant-message').fill('Bitte diese Skizze verwenden.');
  await panel.locator('input[type=file]').setInputFiles({name:'UX-TEST Skizze.png',mimeType:'image/png',buffer:png});
  await expect(panel.locator('.assistant-attachments')).toContainText('Bereit');
  await expect(panel.locator('.companion-options')).not.toHaveAttribute('open');
  await syntheticMicrophone(page);await panel.getByRole('button',{name:'Sprechen',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Stoppen',exact:true})).toBeVisible();
  await panel.locator('#assistant-message').fill('Bitte diese Skizze verwenden. Oberfläche matt.');
  await page.waitForTimeout(1300);await panel.getByRole('button',{name:'Stoppen',exact:true}).click();
  await expect(panel.getByRole('alert')).toContainText('Audioaufnahme');
  await expect(panel.locator('#assistant-message')).toHaveValue('Bitte diese Skizze verwenden. Oberfläche matt.');
  await expect(panel.locator('.assistant-attachments')).toContainText('UX-TEST Skizze.png');
  await panel.getByRole('button',{name:'Spracherkennung erneut versuchen',exact:true}).click();
  await expect(panel.locator('#assistant-message')).toHaveValue('Bitte diese Skizze verwenden. Oberfläche matt.\nDie Breite beträgt 600 Millimeter.');
  expect(audioCalls).toBe(2);
  const desktop=await panel.evaluate(node=>({width:node.clientWidth,messages:node.querySelector('.assistant-messages')!.clientHeight,composer:node.querySelector('.assistant-input')!.clientHeight}));
  expect(desktop.width).toBeGreaterThan(900);expect(desktop.messages).toBeGreaterThan(desktop.composer);
  await page.screenshot({path:'work/multimodal-chat-2026-10-28/combined-desktop.png'});
  await panel.getByRole('button',{name:'Senden',exact:true}).click();await expect(panel).toContainText('Synthetische kombinierte Nachricht erhalten.');
  expect(chatBody.message).toContain('Oberfläche matt.\nDie Breite beträgt 600 Millimeter.');expect(chatBody.references).toEqual([{document_id:original,page_index:0,include_image:true}]);
  await panel.getByRole('button',{name:'Chat verkleinern',exact:true}).click();await expect(panel).not.toHaveAttribute('aria-modal');
  await panel.getByRole('button',{name:'Chat vergrößern',exact:true}).click();await expect(panel).toHaveAttribute('aria-modal','true');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  const rect=await panel.getByRole('button',{name:'Senden',exact:true}).boundingBox();expect(rect!.y+rect!.height).toBeLessThanOrEqual(844);
  const audit=await new AxeBuilder({page}).include('#assistant-drawer').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(audit.violations).toEqual([]);
  await page.screenshot({path:'work/multimodal-chat-2026-10-28/combined-mobile.png'});
});

test('Empty audio never reaches the provider and typing remains available',async({page})=>{
  const panel=await begin(page);let requests=0;await page.route('**/api/v1/ai/transcribe',route=>{requests++;return route.abort();});
  await syntheticMicrophone(page);await page.evaluate(()=>{(window as any).MediaRecorder=class{static isTypeSupported(){return true;}state='inactive';mimeType='audio/webm';onstop:any;start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>this.onstop());}};});
  await panel.locator('#assistant-message').fill('Diese Eingabe bleibt erhalten.');await panel.getByRole('button',{name:'Sprechen',exact:true}).click();await panel.getByRole('button',{name:'Stoppen',exact:true}).click();
  await expect(panel.getByRole('alert')).toContainText('keinen Ton');await expect(panel.locator('#assistant-message')).toHaveValue('Diese Eingabe bleibt erhalten.');expect(requests).toBe(0);
});

test('Late microphone permission after cancellation cannot start a hidden recording',async({page})=>{
  const panel=await begin(page);await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{(window as any).resolveMicrophone=resolve;});});
  await panel.getByRole('button',{name:'Sprechen',exact:true}).click();await panel.getByRole('button',{name:'Abbrechen',exact:true}).click();
  const stopped=await page.evaluate(async()=>{const ctx=new AudioContext(),output=ctx.createMediaStreamDestination();(window as any).resolveMicrophone(output.stream);await new Promise(resolve=>setTimeout(resolve,30));const ended=output.stream.getTracks().every(track=>track.readyState==='ended');await ctx.close();return ended;});
  expect(stopped).toBe(true);await expect(panel.getByRole('button',{name:'Sprechen',exact:true})).toBeEnabled();await expect(panel.getByRole('button',{name:'Stoppen',exact:true})).toHaveCount(0);
});
