import {login as sharedLogin} from './login.js';
import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const login=(page:Page,role='SUPERADMIN')=>sharedLogin(page,role);
async function call(page:Page,name:string,payload:object,version?:number,id?:string){return page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name,payload,expectedVersion:version,id,idempotencyKey:randomUUID()}});}
async function capture(page:Page,name:string,selector:string){
 await mkdir('work/feedback-browser',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'work/feedback-browser/'+name+'.png',fullPage:false,animations:'disabled'});
 const audit=await new AxeBuilder({page}).include(selector).analyze();expect(audit.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
}
test('Feedback captures useful actions without field values; retries once, triages and exports',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);await page.goto('/settings?tab=feedback');
 await expect(page.getByRole('heading',{name:'Rückmeldungen aus dem Testbetrieb'})).toBeVisible();
 const toggle=page.getByLabel('Feedback-Button für das Team anzeigen');if(!await toggle.isChecked()){await toggle.check();await page.getByRole('button',{name:'Einstellung speichern',exact:true}).click();await expect(page.getByRole('status')).toContainText('eingeschaltet');}
 await page.goto('/customers');await page.getByRole('button',{name:'Kunde anlegen',exact:true}).click();
 const privateMarker='FIELD-PRIVATE-'+randomUUID();await page.getByLabel('Name / Firma',{exact:false}).fill(privateMarker);
 const correlation=randomUUID();await page.route('**/api/v1/commands',async route=>{if(route.request().postDataJSON()?.name==='crm.customer.create'){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'Synthetischer Fehler zur Prüfung der Rückmeldung.',code:'VALIDATION_ERROR',correlationId:correlation}})});}else await route.continue();});
 await page.getByRole('button',{name:'Speichern',exact:true}).click();await expect(page.locator('.modal').getByRole('alert')).toContainText('Synthetischer Fehler');await page.unroute('**/api/v1/commands');
 // Open above an existing business modal using the keyboard; its draft remains intact.
 await page.keyboard.press('Alt+Shift+F');const dialog=page.locator('dialog.feedback-dialog');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading')).toHaveText('Was können wir verbessern?');await dialog.getByText('Mitgesendeten Kontext ansehen',{exact:false}).click();await expect(dialog).not.toContainText(privateMarker);
 const comment='UAT '+randomUUID().slice(0,8)+' · Die Bedienung im Kundendialog ist unklar.';await dialog.getByLabel('Ihr Kommentar',{exact:false}).fill(comment);
 await dialog.getByText('Gewünschtes Verhalten ergänzen',{exact:false}).click();await dialog.getByLabel('Was hätten Sie erwartet?').fill('Ein gut sichtbarer Hinweis zur nächsten Eingabe.');
 await capture(page,'dialog-desktop','dialog.feedback-dialog');await page.setViewportSize({width:375,height:812});await capture(page,'dialog-mobile','dialog.feedback-dialog');
 let sent:any,attempt=0;await page.route('**/api/v1/commands',async route=>{const data=route.request().postDataJSON();if(data?.name==='feedback.submit'){sent=data;attempt++;if(attempt===1){await route.abort('failed');return;}}await route.continue();});
 await dialog.getByRole('button',{name:'Feedback senden',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Server ist nicht erreichbar');await expect(dialog.getByLabel('Ihr Kommentar',{exact:false})).toHaveValue(comment);const retryKey=sent.idempotencyKey;
 const sendError=await dialog.getByRole('alert').boundingBox();expect(sendError!.y).toBeGreaterThanOrEqual(0);expect(sendError!.y+sendError!.height).toBeLessThanOrEqual(812);await page.screenshot({path:'work/feedback-browser/dialog-mobile-error.png'});
 await dialog.getByRole('button',{name:'Feedback senden',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('wurde gespeichert');expect(sent.idempotencyKey).toBe(retryKey);expect(JSON.stringify(sent)).not.toContain(privateMarker);expect(sent.payload.page).toBe('/customers');expect(sent.payload.context.steps.some((s:any)=>s.kind==='navigation')).toBeTruthy();
 expect(sent.payload.context.steps.some((s:any)=>s.action==='crm.customer.create'&&s.outcome==='failed'&&s.correlation_id===correlation)).toBeTruthy();
 const receipt=(await dialog.getByRole('status').innerText()).match(/FB-\d+/)![0];await dialog.getByRole('button',{name:'Fertig',exact:true}).click();await expect(page.getByLabel('Name / Firma',{exact:false})).toHaveValue(privateMarker);await page.getByRole('button',{name:'Abbrechen',exact:true}).click();await page.unroute('**/api/v1/commands');
 await page.setViewportSize({width:1440,height:1000});await page.goto('/settings?tab=feedback');await page.locator('.feedback-row').filter({hasText:receipt}).click();await expect(page.locator('.feedback-original')).toContainText(comment);
 await page.getByLabel('Bearbeitungsstatus').selectOption('planned');await page.getByLabel('Priorität',{exact:true}).selectOption('high');await page.getByLabel('Notizen zur Umsetzung').fill('Hinweistext prüfen und im mobilen Kundendialog abnehmen.');await page.getByRole('button',{name:'Einordnung speichern'}).click();await expect(page.getByRole('status')).toContainText('wurde aktualisiert');
 const selected=new URL(page.url()).searchParams.get('report');await page.goto('/settings?tab=feedback&status=planned&report='+selected);await capture(page,'admin-desktop','.feedback-admin');await page.setViewportSize({width:375,height:812});await expect(page.locator('.feedback-list')).toBeHidden();await expect(page.getByRole('link',{name:'Zur Liste',exact:true})).toBeVisible();await capture(page,'admin-mobile','.feedback-admin');
 await page.locator('.feedback-detail').scrollIntoViewIfNeeded();await page.screenshot({path:'work/feedback-browser/admin-mobile-detail.png',fullPage:false,animations:'disabled'});
 const href=await page.getByRole('link',{name:'JSON herunterladen'}).getAttribute('href'),response=await page.request.get(href!);expect(response.ok()).toBeTruthy();expect(response.headers()['cache-control']).toContain('no-store');const packet=await response.json();expect(packet.original.comment).toBe(comment);expect(packet.triage.status).toBe('planned');expect(packet.diagnostics.steps.length).toBeGreaterThan(0);expect(JSON.stringify(packet)).not.toContain(privateMarker);expect(packet.handling).toContain('gesondertem Auftrag');
 const markdown=await page.request.get(href!+'?format=markdown');expect(markdown.headers()['content-disposition']).toContain('.md');expect(await markdown.text()).toContain(comment);
 await page.getByLabel('Notizen zur Umsetzung').fill('Mobile Rückmeldung nach Speichern und Fehler geprüft.');
 await page.route('**/api/v1/commands',async route=>{if(route.request().postDataJSON()?.name==='feedback.update')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{message:'Synthetischer Speicherfehler. Bitte erneut versuchen.',code:'REQUEST_FAILED'}})});else await route.continue();});
 await page.getByRole('button',{name:'Einordnung speichern'}).click();const reportError=page.locator('#feedback-save-notice');await expect(reportError).toContainText('Synthetischer Speicherfehler');let box=await reportError.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(812);await page.screenshot({path:'work/feedback-browser/admin-mobile-error.png'});await page.unroute('**/api/v1/commands');
 await page.getByRole('button',{name:'Einordnung speichern'}).click();await expect(reportError).toContainText('wurde aktualisiert');box=await reportError.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(812);await page.screenshot({path:'work/feedback-browser/admin-mobile-success.png'});
 await writeFile('work/feedback-browser/evidence.json',JSON.stringify({report:packet.reference,id:packet.id,retrySameKey:true,formValuesExcluded:true,reviewAndExport:true,pageErrors:errors},null,2));expect(errors).toEqual([]);
});
test('Only SuperAdmin reviews feedback; off disables stale clients and on restores the button',async({page,browser})=>{
 test.setTimeout(150000);await login(page);await page.goto('/settings?tab=feedback');
 const other=await browser.newContext({baseURL:process.env.UAT_BASE_URL||'http://127.0.0.1:5173'}),employee=await other.newPage();await login(employee,'EMPLOYEE');await employee.goto('/help');await expect(employee.getByRole('button',{name:'Feedback',exact:true})).toBeVisible();
 const ownerContext=await browser.newContext({baseURL:process.env.UAT_BASE_URL||'http://127.0.0.1:5173'}),owner=await ownerContext.newPage();await login(owner,'OWNER');await owner.goto('/settings?tab=feedback');await expect(owner.getByRole('heading',{name:'Rückmeldungen aus dem Testbetrieb'})).toHaveCount(0);
 const anyLink=await page.locator('.feedback-row').first().getAttribute('href');if(anyLink){const id=new URL(anyLink,'http://test.invalid').searchParams.get('report');expect((await owner.request.get('/api/v1/feedback/'+id+'/export')).status()).toBe(403);expect((await employee.request.get('/api/v1/feedback/'+id+'/export')).status()).toBe(403);}
 const denied=await call(owner,'feedback.settings.update',{enabled:false},1);expect(denied.status()).toBe(403);
 await employee.getByRole('button',{name:'Feedback',exact:true}).click();await employee.getByLabel('Ihr Kommentar',{exact:false}).fill('Dieser Kommentar darf nach dem Ausschalten nicht gespeichert werden.');
 await page.getByLabel('Feedback-Button für das Team anzeigen').uncheck();await page.getByRole('button',{name:'Einstellung speichern',exact:true}).click();await expect(page.getByRole('status')).toContainText('ausgeschaltet');await expect(page.getByRole('button',{name:'Feedback',exact:true})).toHaveCount(0);
 await employee.getByRole('button',{name:'Feedback senden',exact:true}).click();await expect(employee.locator('dialog').getByRole('alert')).toContainText('Testbetrieb wurde beendet');await expect(employee.getByLabel('Ihr Kommentar',{exact:false})).toHaveValue('Dieser Kommentar darf nach dem Ausschalten nicht gespeichert werden.');
 await page.getByLabel('Feedback-Button für das Team anzeigen').check();await page.getByRole('button',{name:'Einstellung speichern',exact:true}).click();await expect(page.getByRole('status')).toContainText('eingeschaltet');await expect(page.getByRole('button',{name:'Feedback',exact:true})).toBeVisible();
 await other.close();await ownerContext.close();
});
