import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {config} from 'dotenv';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {withTenant,insert,one,closePools} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
import {login} from './login.js';
import {chooseSelect,nativeSelect} from './select-choice.js';
config({quiet:true});
const fixtureActor:ActorContext={tenantId:process.env.TEST_TENANT_ID!,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID!,actorId:process.env.TEST_SUPERADMIN_ID!,role:'SuperAdmin',permissions:[],permissionVersion:1,correlationId:randomUUID(),employeeId:null,actorType:'employee',identityAssurance:'individual_session'};
let syntheticConnection:string|null=null;

test.beforeAll(async()=>{
 if(!fixtureActor.tenantId)throw Error('Isolated synthetic test tenant required.');
 await mkdir('work/ux-review',{recursive:true});
 // Only the model transport is stubbed below. Commands and persistence are real.
 // No provider credential is installed and no model request leaves the browser.
 await withTenant(fixtureActor,async db=>{if(!await one(db,"SELECT id FROM integration_connections WHERE provider='openai' AND status='configured'")){const row=await insert(db,'integration_connections',{tenant_id:fixtureActor.tenantId,legal_entity_id:fixtureActor.legalEntityId,provider:'openai',name:'TEST · mocked model transport',configuration:{},status:'configured'});syntheticConnection=row.id;}});
});
test.afterAll(async()=>{try{if(syntheticConnection)await withTenant(fixtureActor,db=>db.query('DELETE FROM integration_connections WHERE id=$1',[syntheticConnection]));}finally{await closePools();}});

async function createPlan(page:Page,kind:'memorial'|'room_plan'){
 const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{kind,name:'TEST · Geführter '+(kind==='memorial'?'Grabmalentwurf':'Raumentwurf')+' '+randomUUID().slice(0,6)},idempotencyKey:randomUUID()}});
 expect(response.ok()).toBe(true);const {result}=await response.json();await page.goto('/studio/'+result.project.id+'?variant='+result.variant.id);await expect(page.locator('.studio-workspace')).toBeVisible();return result;
}
async function addStone(page:Page){
 await page.getByRole('button',{name:'Ersten Stein anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.locator('.shape-options')).not.toHaveAttribute('open','');
 await dialog.getByLabel('Breite (mm)',{exact:true}).fill('800');await dialog.getByLabel('Höhe (mm)',{exact:true}).fill('1200');await dialog.getByLabel('Materialstärke (mm)',{exact:true}).fill('160');
 await expect(dialog.getByLabel('Position X (mm)',{exact:true})).toBeHidden();await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
}
async function audit(page:Page,scope:string){const result=await new AxeBuilder({page}).include(scope).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations).toEqual([]);}

test('Steinmetz: four clear steps, exact inscription, saved geometry and a usable mobile canvas',async({page})=>{
 test.setTimeout(150000);await login(page,'PLANNER');await createPlan(page,'memorial');
 await expect(page.locator('.planning-steps button')).toHaveCount(4);await expect(page.locator('.inspector')).toHaveCount(0);
 await addStone(page);await expect(page.locator('.inspector')).toContainText('Außenmaße & Material');
 await expect(page.locator('.placement-details').first()).not.toHaveAttribute('open','');
 await page.locator('.planning-steps').getByRole('button',{name:/Inschrift & Details/}).click();
 await page.locator('.step-actions').getByRole('button',{name:'Beschriftung anlegen',exact:true}).click();
 const exact='Anna Müller\n* 12.03.1948  † 01.01.2025';const dialog=page.getByRole('dialog');await dialog.getByLabel('Wörtlicher Text / Namen und Daten',{exact:true}).fill(exact);await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
 await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled({timeout:30000});await page.reload();
 await expect(page.locator('.lettering-preview text')).toHaveText(exact.split('\n'));await expect(page.locator('.planning-steps button[aria-current=step]')).toContainText('Inschrift & Details');
 await page.screenshot({path:'work/ux-review/memorial-desktop.png',animations:'disabled'});await audit(page,'.studio-root');
 await page.locator('.planning-steps').getByRole('button',{name:/Prüfen/}).click();await expect(page.locator('.inspector')).toContainText('Prüfstand');await expect(page.getByRole('button',{name:'Fertigungsfreigabe vorbereiten',exact:true})).toBeDisabled();
 await page.locator('.planning-steps').getByRole('button',{name:/Präsentieren/}).click();await expect(page.locator('.inspector')).toContainText('Planungsunterlagen');
 await page.setViewportSize({width:375,height:812});await expect(page.locator('.canvas-panel')).toBeVisible();expect((await page.locator('.canvas-panel').boundingBox())!.height).toBeGreaterThanOrEqual(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
 await page.screenshot({path:'work/ux-review/memorial-mobile.png',animations:'disabled'});await audit(page,'.studio-root');
});

test('Steinmetz: room dimensions use inner wall faces, persist exact geometry and offer manufacturer selection',async({page})=>{
 test.setTimeout(120000);await login(page,'PLANNER');await createPlan(page,'room_plan');await page.getByRole('button',{name:'Raum anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('radio',{name:/Lichte Innenmaße/})).toBeChecked();await dialog.getByLabel('Lichte Raumbreite (mm)',{exact:true}).fill('4200');await dialog.getByLabel('Lichte Raumtiefe (mm)',{exact:true}).fill('3200');await dialog.getByLabel('Raumhöhe (mm)',{exact:true}).fill('2600');await dialog.getByLabel('Wandstärke ohne Belag (mm)',{exact:true}).fill('200');
 const responsePromise=page.waitForResponse(response=>response.request().method()==='POST'&&/\/api\/v1\/designs\/.+\/commands$/.test(new URL(response.url()).pathname));await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();
 const response=await responsePromise;expect(response.ok()).toBe(true);const body=await response.json(),state=body.result??body,nodes=state.revision.snapshot.elements.filter((element:any)=>element.kind==='node');expect(nodes[0].point).toEqual({xMm:'-100',yMm:'-100',zMm:'0'});expect(nodes[2].point).toEqual({xMm:'4300',yMm:'3300',zMm:'0'});
 await page.reload();await expect(page.locator('.plan-shape')).not.toHaveCount(0);await page.screenshot({path:'work/ux-review/room-desktop.png',animations:'disabled'});
 await page.getByRole('button',{name:'Herstellerdaten',exact:true}).click();const library=page.getByRole('dialog',{name:'Herstellerdaten auswählen'});await expect(library).toBeVisible();await expect(library).toContainText('Maßeinheit und Maßstab');await audit(page,'dialog');await page.keyboard.press('Escape');await expect(library).toBeHidden();
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:'work/ux-review/room-mobile.png',animations:'disabled'});await audit(page,'.studio-root');
});

test('AI contract (stubbed model): saves before sending, binds revision and step, separates conversations and stops after a failed save',async({page})=>{
 test.setTimeout(150000);await login(page,'PLANNER');const plan=await createPlan(page,'memorial');await addStone(page);await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled({timeout:30000});
 let savedRevision='',modelRevision='',calls:any[]=[];
 page.on('response',response=>{if(response.ok()&&new URL(response.url()).pathname===`/api/v1/designs/${plan.variant.id}/commands`)void response.json().then(body=>savedRevision=(body.result??body).revision.id);});
 await page.route('**/api/v1/ai/chat',async route=>{const body=route.request().postDataJSON();calls.push(body);modelRevision=body.context.planning_work.revision_id;await route.fulfill({json:{ok:true,result:{text:'Synthetischer Schritthinweis. Keine Modellkosten.'}}});});
 const thickness=page.getByLabel('Materialstärke',{exact:false}).first();await thickness.fill('180');await thickness.press('Tab');
 await page.getByRole('button',{name:'KI für diesen Schritt',exact:true}).click();const assistant=page.getByRole('dialog',{name:'Schubert Begleiter'});await expect(assistant.locator('.assistant-context')).toContainText('Stein & Maße');await assistant.getByRole('button',{name:'Senden',exact:true}).click();await expect(assistant.getByText('Synthetischer Schritthinweis. Keine Modellkosten.',{exact:true})).toBeVisible();
 expect(savedRevision).toBeTruthy();expect(modelRevision).toBe(savedRevision);expect(calls[0].context.planning_work.step).toBe('geometry');expect(calls[0].context.selected_element_ids).toHaveLength(1);
 await assistant.getByRole('button',{name:'Assistent schließen',exact:true}).click();await page.locator('.planning-steps').getByRole('button',{name:/Prüfen/}).click();await page.getByRole('button',{name:'KI für diesen Schritt',exact:true}).click();await assistant.getByRole('button',{name:'Senden',exact:true}).click();await expect.poll(()=>calls.length).toBe(2);expect(calls[1].context.planning_work.step).toBe('review');expect(calls[1].history).toEqual([]);
 await assistant.getByRole('button',{name:'Assistent schließen',exact:true}).click();await page.locator('.planning-steps').getByRole('button',{name:/Stein & Maße/}).click();
 await page.route(`**/api/v1/designs/${plan.variant.id}/commands`,route=>route.fulfill({status:503,json:{error:{message:'Synthetisch unterbrochene Verbindung.'}}}));await page.getByLabel('Materialstärke',{exact:false}).first().fill('190');await page.getByLabel('Materialstärke',{exact:false}).first().press('Tab');await page.getByRole('button',{name:'KI für diesen Schritt',exact:true}).click();await assistant.getByRole('button',{name:'Senden',exact:true}).click();await expect(assistant.getByRole('alert')).toContainText('Synthetisch unterbrochene Verbindung');expect(calls).toHaveLength(2);
 await page.screenshot({path:'work/ux-review/ai-context-save-failure.png',animations:'disabled'});
});

test('Backoffice: section shortcuts, exact decimal totals, selected options, scoped AI review and actual saved quote',async({page})=>{
 test.setTimeout(150000);await login(page,'OFFICE');
 const customer=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'crm.customer.create',idempotencyKey:randomUUID(),payload:{name:'TEST · Büro '+randomUUID().slice(0,6),party_type:'person'}}});expect(customer.ok()).toBe(true);const {result:party}=await customer.json();
 await page.goto('/quotes?create=1&customer_id='+party.id);const editor=page.getByRole('dialog');await expect(editor).toBeVisible();await expect(editor.getByRole('navigation',{name:'Abschnitte im Formular'})).toBeVisible();
 const title='TEST · Natursteinangebot '+randomUUID().slice(0,6);await editor.locator('#field-title').fill(title);await editor.locator('#field-valid_until').fill('2026-12-01');
 await editor.getByRole('button',{name:'Position hinzufügen',exact:true}).click();await editor.locator('#line-description-0').fill('Waschtischplatte · Naturstein');await editor.locator('#line-quantity-0').fill('2');await editor.locator('#line-price-0').fill('250,50');await editor.locator('#line-tax-0').fill('19');
 await expect(editor.locator('.document-totals')).toContainText('501,00');await expect(editor.locator('.document-totals')).toContainText('596,19');
 await editor.getByRole('navigation',{name:'Abschnitte im Formular'}).getByRole('button',{name:'Positionen',exact:true}).click();await expect(editor.locator('#line-description-0')).toBeFocused();
 await editor.getByRole('button',{name:'Position hinzufügen',exact:true}).click();await editor.locator('#line-description-1').fill('Optionale Imprägnierung');await editor.locator('#line-quantity-1').fill('1');await editor.locator('#line-price-1').fill('100');await editor.locator('#line-tax-1').fill('19');const line=editor.locator('.line-item').nth(1);await line.getByLabel('Optionale Position',{exact:true}).check();await line.getByLabel('In ausgewähltem Umfang enthalten',{exact:true}).uncheck();await expect(editor.locator('.document-totals')).toContainText('596,19');
 let requestBody:any;await page.route('**/api/v1/ai/chat',async route=>{requestBody=route.request().postDataJSON();await route.fulfill({json:{ok:true,result:{text:'Synthetische Rückfrage: Welche Oberfläche wurde vereinbart?'}}});});
 await editor.locator('.draft-review>summary').click();await editor.getByRole('button',{name:'Eingaben prüfen',exact:true}).click();await expect(editor.locator('.review-answer')).toContainText('Welche Oberfläche');expect(requestBody.context.editor.module).toBe('quotes');expect(requestBody.context.editor.lines).toHaveLength(2);expect(JSON.stringify(requestBody.context.editor)).not.toContain('cost_unit');
 await editor.locator('#field-title').fill(title+' · Variante A');await expect(editor.locator('.review-stale')).toBeVisible();await page.screenshot({path:'work/ux-review/backoffice-desktop.png',animations:'disabled'});await audit(page,'.modal');
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:'work/ux-review/backoffice-mobile.png',animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);await editor.getByRole('button',{name:'Speichern',exact:true}).click();await expect(editor).toBeHidden();await page.getByRole('link',{name:title+' · Variante A',exact:true}).click();await expect(page.locator('.page-content')).toContainText('596,19');
});

test('SuperAdmin: separate manufacturer area, resumable source drafts, explicit rights gates and delegated permission control',async({page})=>{
 test.setTimeout(120000);await login(page,'SUPERADMIN');await page.goto('/manufacturer-assets');await expect(page.getByRole('heading',{name:'Herstellerbibliothek',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Herstellerunterlage hinzufügen',exact:true}).click();const editor=page.getByRole('dialog');const name='TEST · Herstellerunterlage '+randomUUID().slice(0,6);await editor.getByLabel('Bezeichnung *',{exact:true}).fill(name);await editor.getByLabel('Hersteller *',{exact:true}).fill('Synthetischer Hersteller');await chooseSelect(page,editor.locator('#asset-scope'),'both');await chooseSelect(page,editor.locator('#asset-kind'),'reference');await editor.getByRole('button',{name:'Speichern & Verwendung prüfen',exact:true}).click();
 await expect(editor).toContainText('Ergänzen Sie zuerst die Originaldatei');await expect(editor.getByRole('button',{name:'In den Studios bereitstellen',exact:true})).toBeDisabled();await audit(page,'.modal');await page.screenshot({path:'work/ux-review/manufacturer-draft.png',animations:'disabled'});
 await editor.getByRole('button',{name:'Für später schließen',exact:true}).click();await page.getByLabel('Herstellerunterlagen durchsuchen',{exact:true}).fill(name);await page.getByRole('button',{name:'Suchen',exact:true}).click();await expect(page.locator('.manufacturer-row')).toHaveCount(1);await page.locator('.manufacturer-row').getByRole('button',{name:'Datei ergänzen',exact:true}).click();await expect(editor.getByLabel('Bezeichnung *',{exact:true})).toHaveValue(name);await page.keyboard.press('Escape');
 await page.setViewportSize({width:375,height:812});await page.screenshot({path:'work/ux-review/manufacturer-mobile.png',animations:'disabled'});await audit(page,'.manufacturer-library');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
 await page.setViewportSize({width:1440,height:1000});await page.goto('/settings?tab=users');await page.waitForLoadState('networkidle');const member=page.locator('.integration-row').filter({hasText:'Test Office'});await member.getByRole('button',{name:'Rolle prüfen',exact:true}).click();await expect(page.getByLabel(/Herstellerbibliothek verwalten/)).toBeVisible();
});

test('Manufacturer selection: both studios retain exact source versions; contours require unit confirmation and AI never starts on selection',async({page})=>{
 test.setTimeout(150000);
 const prefix='TEST · UI-Quellenauswahl '+randomUUID().slice(0,6),assets:any[]=[];
 // Synthetic available-file metadata tests selection only. No upload, private
 // object, malware scan, preview worker or provider result is simulated here.
 try{
  await withTenant(fixtureActor,async db=>{
   for(const [kind,mime,extension] of [['plan','application/pdf','pdf'],['plan','image/svg+xml','svg'],['reference','image/png','png']]){
    const base={tenant_id:fixtureActor.tenantId,legal_entity_id:fixtureActor.legalEntityId,created_by:fixtureActor.actorId};
    const asset=await insert(db,'manufacturer_assets',{...base,name:prefix+' · '+extension,manufacturer_name:'Synthetischer UI-Hersteller',kind,studio_scope:'both',source_unit:extension==='svg'?'cm':null});
    const blob=await insert(db,'blob_objects',{...base,storage_key:fixtureActor.tenantId+'/synthetic-ui/'+randomUUID(),provider:'vercel_blob',content_hash:'a'.repeat(64),mime_type:mime,size_bytes:26,scan_status:'clean',status:'available'});
    const doc=await insert(db,'documents',{...base,name:asset.name+'.'+extension,original_name:asset.name+'.'+extension,mime_type:mime,size_bytes:26,content_hash:'a'.repeat(64),entity_type:'manufacturer-assets',entity_id:asset.id,visibility:'internal',status:'available'});
    const version=await insert(db,'document_versions',{...base,document_id:doc.id,blob_object_id:blob.id,content_hash:'a'.repeat(64),revision:1,status:'available'});
    await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2',[version.id,doc.id]);
    await db.query("UPDATE manufacturer_assets SET document_version_id=$1,source_hash=$2,use_planning=$3,use_ai=$4,published_at=now(),published_by=$5,rights_statement='Synthetische Metadaten nur zur UI-Auswahlprüfung.',status='available' WHERE id=$6",[version.id,'a'.repeat(64),kind==='plan',kind==='reference',fixtureActor.actorId,asset.id]);
    assets.push({id:asset.id,name:asset.name,documentId:doc.id,versionId:version.id,extension});
   }
  });
  await login(page,'PLANNER');let calls=0;await page.route('**/api/v1/ai/chat',route=>{calls++;return route.abort();});
  async function picker(){await page.getByRole('button',{name:'Herstellerdaten',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Herstellerdaten auswählen'});await dialog.getByLabel('Hersteller oder Modell suchen',{exact:true}).fill(prefix);await dialog.getByRole('button',{name:'Suchen',exact:true}).click();await expect(dialog.locator('article')).toHaveCount(3);return dialog;}
  for(const kind of ['memorial','room_plan'] as const){
   await createPlan(page,kind);if(kind==='memorial')await addStone(page);
   let library=await picker();const pdf=assets.find(asset=>asset.extension==='pdf');await library.locator('article').filter({hasText:pdf.name}).getByRole('button',{name:'Als Planvorlage öffnen',exact:true}).click();
   let source=page.locator('dialog[open]');await expect(await nativeSelect(page,source.getByLabel('Versionierte Originaldatei',{exact:true}))).toHaveValue(pdf.versionId);await page.keyboard.press('Escape');
   if(kind==='memorial'){
    library=await picker();const svg=assets.find(asset=>asset.extension==='svg');await library.locator('article').filter({hasText:svg.name}).getByRole('button',{name:'Kontur übernehmen',exact:true}).click();source=page.locator('dialog[open]');
    await expect(await nativeSelect(page,source.getByLabel('Private Originalversion',{exact:true}))).toHaveValue(svg.versionId);await expect(await nativeSelect(page,source.getByLabel('Tatsächliche Originaleinheit',{exact:true}))).toHaveValue('cm');await expect(source.getByRole('checkbox')).not.toBeChecked();await expect(source.getByRole('button',{name:'Konturen prüfen und anzeigen',exact:true})).toBeDisabled();await page.keyboard.press('Escape');
   }
   library=await picker();await audit(page,'dialog');await page.screenshot({path:'work/ux-review/manufacturer-picker-'+kind+'.png',animations:'disabled'});const image=assets.find(asset=>asset.extension==='png');await library.locator('article').filter({hasText:image.name}).getByRole('button',{name:'Als KI-Referenz auswählen',exact:true}).click();
   const assistant=page.getByRole('dialog',{name:'Schubert Begleiter'});await expect(assistant).toBeVisible();await expect(await nativeSelect(page,assistant.getByRole('combobox',{name:'Geprüfte Unterlage *',exact:true}))).toHaveValue(image.documentId);await expect(assistant.getByLabel('Sichtbaren Bild- oder PDF-Inhalt dieser Seite mitgeben',{exact:true})).toBeChecked();expect(calls).toBe(0);await assistant.getByRole('button',{name:'Assistent schließen',exact:true}).click();
  }
 }finally{if(assets.length)await withTenant(fixtureActor,db=>db.query("UPDATE manufacturer_assets SET status='archived' WHERE id=ANY($1::uuid[])",[assets.map(asset=>asset.id)]));}
});
