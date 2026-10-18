import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {config} from 'dotenv';
import {withTenant,closePools} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
config({quiet:true});
const fixtureIds:string[]=[];
const usageActor:ActorContext={tenantId:process.env.TEST_TENANT_ID!,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID!,actorId:process.env.TEST_OWNER_ID!,role:'Owner',permissions:[],permissionVersion:1,correlationId:randomUUID(),actorType:'employee',identityAssurance:'individual_session'};
test.beforeAll(async()=>{
 if(!usageActor.tenantId||!usageActor.legalEntityId)throw Error('Synthetic tenant required.');
 await withTenant(usageActor,async db=>{for(const row of [{task:'office_assistant',input:9000,output:1500,cost:'.75'},{task:'room_review',input:1000,output:1000,cost:'1.25'},{task:'image_generation',input:null,output:null,cost:null}]){const id=randomUUID();fixtureIds.push(id);await db.query("INSERT INTO ai_runs(id,tenant_id,legal_entity_id,actor_id,capability,task_type,model_id,request_hash,input_tokens,output_tokens,cost_actual,cost_basis,status,created_at) VALUES($1,$2,$3,$4,'assistant_reasoning',$5,'synthetic-usage-test',$9,$6,$7,$8,'configured_estimate','completed','2003-04-15T12:00:00Z')",[id,usageActor.tenantId,usageActor.legalEntityId,usageActor.actorId,row.task,row.input,row.output,row.cost,id]);}});
});
test.afterAll(async()=>{try{if(fixtureIds.length)await withTenant(usageActor,db=>db.query('DELETE FROM ai_runs WHERE id=ANY($1::uuid[])',[fixtureIds]));}finally{await closePools();}});
async function login(page:Page,role='OWNER'){
 await page.goto('/login');await page.getByLabel('E-Mail',{exact:false}).fill(process.env['TEST_'+role+'_EMAIL']!);await page.locator('#login-password').fill(process.env['TEST_'+role+'_PASSWORD']!);await page.getByRole('button',{name:'Sicher anmelden',exact:true}).click();await expect(page).not.toHaveURL(/\/login/);
}
async function capture(page:Page,name:string){
 await mkdir('work/features-browser',{recursive:true});await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'work/features-browser/'+name+'-desktop.png',fullPage:true,animations:'disabled'});
 const audit=await new AxeBuilder({page}).include('.page-content').analyze();expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await page.setViewportSize({width:375,height:812});await expect.poll(async()=>{const box=await page.locator('.sidebar').boundingBox();return box?box.x+box.width:0;}).toBeLessThanOrEqual(1);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'work/features-browser/'+name+'-mobile.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.setViewportSize({width:1440,height:1000});
}
test('Usage dashboard, historical month and permission boundary',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);
 await expect(page.getByRole('heading',{name:'KI-Verbrauch',exact:true})).toBeVisible();await page.getByRole('link',{name:'Verbrauch im Detail'}).click();
 await expect(page.getByRole('heading',{name:'KI-Verbrauch & Kosten'})).toBeVisible();await expect(page.locator('.ai-test-form')).toBeHidden();
 await page.getByLabel('Monat',{exact:true}).fill('2003-04');await page.getByRole('button',{name:'Monat anzeigen'}).click();await expect(page.getByRole('rowheader').filter({hasText:'Grundriss · vertiefte Prüfung'})).toBeVisible();await expect(page.locator('.usage-incomplete')).toContainText('1 Aufrufen');await capture(page,'usage');await page.getByLabel('Monat',{exact:true}).fill('2001-01');await page.getByRole('button',{name:'Monat anzeigen'}).click();
 await expect(page).toHaveURL(/period=2001-01/);await expect(page.getByRole('heading',{name:'Noch keine KI-Aufrufe in diesem Monat'})).toBeVisible();await page.reload();await expect(page.getByLabel('Monat',{exact:true})).toHaveValue('2001-01');expect(errors).toEqual([]);
});
test('Page-specific help, searchable FAQs and restartable personal onboarding',async({page})=>{
 test.setTimeout(150000);await login(page);await page.goto('/customers');await page.getByRole('link',{name:'Hilfe zu dieser Seite'}).click();
 await expect(page.getByRole('heading',{name:'Diese Seite: Kunden'})).toBeVisible();await page.getByText('Was trage ich in die Felder ein?',{exact:true}).click();await expect(page.locator('.help-field-list').getByText('Name / Firma',{exact:false})).toBeVisible();
 await page.getByLabel('Anleitungen und Fragen durchsuchen').fill('Grundriss');await expect(page.getByText('Einen Grundriss planen',{exact:true})).toBeVisible();await page.getByLabel('Anleitungen und Fragen durchsuchen').fill('xyzkeinbegriff');await expect(page.getByRole('heading',{name:'Keine passende Anleitung gefunden'})).toBeVisible();await page.getByRole('button',{name:'Suche zurücksetzen'}).click();await capture(page,'help');
 await page.getByRole('button',{name:'Einführung neu starten'}).click();await expect(page.locator('.onboarding')).toBeVisible();await page.locator('.onboarding').getByRole('button',{name:'Weiter',exact:true}).click();await expect(page.locator('.onboarding h3')).toHaveText('Vom Kunden zur Anfrage');await capture(page,'onboarding');
 await page.getByRole('button',{name:'Für später schließen'}).click();await expect(page.locator('.onboarding')).toHaveCount(0);await page.reload();await expect(page.locator('.onboarding')).toHaveCount(0);
 await page.goto('/help');await page.getByRole('button',{name:'Einführung neu starten'}).click();await expect(page.locator('.onboarding')).toBeVisible();
 while(await page.locator('.onboarding').getByRole('button',{name:'Weiter',exact:true}).count())await page.locator('.onboarding').getByRole('button',{name:'Weiter',exact:true}).click();
 await page.getByRole('button',{name:'Einführung abschließen'}).click();await expect(page.locator('.onboarding')).toHaveCount(0);await page.reload();await expect(page.locator('.onboarding')).toHaveCount(0);
});
test('Numbering preview, persisted settings and actual quote allocation',async({page})=>{
 await login(page);await page.goto('/settings?tab=numbering');await expect(page.getByRole('heading',{name:'Ihre Nummernkreise'})).toBeVisible();await page.getByLabel('Welche Nummer möchten Sie einstellen?').selectOption('quotes');
 await page.getByLabel('Aufbau der Nummer *',{exact:true}).fill('TEST-AN/{JJ}/{NR}');await page.getByLabel('Mindeststellen der laufenden Nummer *',{exact:true}).fill('4');
 const input=page.getByLabel(/Nächste freie Nummer/),next=Number(await input.inputValue())+25;await input.fill(String(next));await page.getByLabel('Grund und Grundlage des Startstands *',{exact:true}).fill('Synthetischer Browsertest des Umstiegs im laufenden Jahr.');
 const preview=await page.locator('.numbering-preview strong').innerText();await capture(page,'numbering');await page.getByLabel('Eigene Passphrase bestätigen *',{exact:true}).fill(process.env.TEST_OWNER_PASSWORD!);await page.getByRole('button',{name:'Nummernkreis speichern'}).click();await expect(page.getByRole('status').filter({hasText:'Nummernkreis gespeichert'})).toBeVisible();
 const headers={origin:new URL(page.url()).origin};const call=async(name:string,payload:object)=>{const response=await page.request.post('/api/v1/commands',{headers,data:{name,payload,idempotencyKey:randomUUID()}});expect(response.ok()).toBeTruthy();return(await response.json()).result;};
 const customer=await call('crm.customer.create',{name:'TEST · Nummernkreis '+randomUUID().slice(0,6),party_type:'person'});
 const quote=await call('sales.quote.create',{title:'TEST · Konfigurierte Angebotsnummer',customer_id:customer.id,lines:[{description:'Testleistung',quantity:'1',unit:'piece',unit_price:'100',tax_rate:'19',discount_percent:'0',line_type:'item',optional:false,selected:true}]});expect(quote.number).toBe(preview);
 await page.reload();await page.getByLabel('Welche Nummer möchten Sie einstellen?').selectOption('quotes');await expect(input).toHaveValue(String(next+1));await page.getByRole('link',{name:'Hilfe zu dieser Seite'}).click();await expect(page.getByText('Nummernkreise beim Umstieg',{exact:true})).toBeVisible();
});
test('Employees have help but cannot view administrative usage or numbering',async({page})=>{
 await login(page,'EMPLOYEE');await expect(page.getByRole('link',{name:'Verbrauch im Detail'})).toHaveCount(0);await page.goto('/help');await expect(page.getByRole('heading',{name:'Wie können wir Ihnen helfen?'})).toBeVisible();await expect(page.getByText('KI-Verbrauch und Verbindungen',{exact:true})).toHaveCount(0);
 await page.goto('/settings?tab=usage');await expect(page.getByRole('heading',{name:'KI-Verbrauch & Kosten'})).toHaveCount(0);
});
