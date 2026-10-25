import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {login} from './login.js';

const evidence='work/experience-2026-10-25/browser';
async function command(page:Page,name:string,payload:Record<string,unknown>){
  const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name,payload,idempotencyKey:randomUUID()}});
  expect(response.ok(),await response.text()).toBe(true);return (await response.json()).result;
}
async function audit(page:Page,scope:string){const result=await new AxeBuilder({page}).include(scope).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations).toEqual([]);}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual((page.viewportSize()?.width??0)+1);}
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});});

test('Backoffice: customer tiles keep orders, inquiry, full lists and new records in the same customer context',async({page})=>{
  await login(page,'OFFICE');const marker=randomUUID().slice(0,8);
  const customer=await command(page,'crm.customer.create',{name:'TEST · Kundenübersicht '+marker,party_type:'person',phone:'030 000000',email:'kunde.'+marker+'@example.invalid',city:'Berlin'});
  const other=await command(page,'crm.customer.create',{name:'TEST · Anderer Kunde '+marker});
  const order=await command(page,'sales.order.create',{title:'TEST · Waschtisch '+marker,customer_id:customer.id,currency:'EUR'});
  const inquiry=await command(page,'crm.inquiry.create',{title:'TEST · Grabmalanfrage '+marker,customer_id:customer.id});
  const foreign=await command(page,'sales.order.create',{title:'TEST · Fremder Auftrag '+marker,customer_id:other.id,currency:'EUR'});
  await page.goto('/customers/'+customer.id);await expect(page.locator('.customer-workspace')).toBeVisible();
  await expect(page.getByRole('heading',{level:1,name:customer.name,exact:true})).toBeVisible();
  await expect(page.locator('.section-navigation')).toHaveCount(0);
  await expect(page.locator('.customer-record[href="/orders/'+order.id+'"]')).toBeVisible();
  await expect(page.locator('.customer-record[href="/inquiries/'+inquiry.id+'"]')).toBeVisible();
  await expect(page.getByText(foreign.title,{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/^Aufträge 1/}).click();await expect(page.locator('.customer-focus h2')).toHaveText('Aufträge');
  await page.getByRole('link',{name:'Alle Aufträge ansehen',exact:true}).click();await expect(page).toHaveURL(new RegExp('/orders\\?customer_id='+customer.id));
  await expect(page.locator('a[href="/orders/'+order.id+'"]').first()).toBeVisible();await expect(page.locator('a[href="/orders/'+foreign.id+'"]')).toHaveCount(0);
  await page.goto('/customers/'+customer.id);await page.getByRole('link',{name:'Anfrage anlegen',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText(customer.name);
  await page.keyboard.press('Escape');await page.goto('/customers/'+customer.id);
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);await noOverflow(page);await audit(page,'.customer-workspace');await page.screenshot({path:evidence+'/customer-'+viewport.width+'.png',animations:'disabled'});}
  await page.getByRole('button',{name:/^Aufträge 1/}).click();await expect(page.locator('#customer-records-title')).toBeFocused();await expect(page.locator('#customer-records-title')).toBeInViewport();
  await page.getByRole('link',{name:'Daten, Kommunikation & Verlauf',exact:true}).click();await expect(page.getByRole('link',{name:'Zur Kundenübersicht',exact:true})).toBeVisible();
});

for(const kind of ['memorial','room_plan'] as const)test('Studio '+kind+': large canvas, cm/m input, unchanged canonical dimensions when switching and reopening',async({page})=>{
  test.setTimeout(120000);await login(page,'PLANNER');
  const plan=await command(page,'planning.project.create',{kind,name:'TEST · Einheiten '+kind+' '+randomUUID().slice(0,8)});
  await page.goto('/studio/'+plan.project.id+'?variant='+plan.variant.id);await expect(page.locator('.studio-workspace')).toBeVisible();
  const unit=page.getByRole('combobox',{name:'Maßeinheit',exact:true});await unit.selectOption('cm');
  await expect(page.locator('#studio-elements-panel')).toHaveCount(0);await expect(page.locator('#studio-properties-panel')).toHaveCount(0);
  const canvas=await page.locator('svg[role=application]').boundingBox();expect(canvas!.width).toBeGreaterThan(1000);expect(canvas!.height).toBeGreaterThan(570);
  await page.getByRole('button',{name:kind==='memorial'?'Ersten Stein anlegen':'Raum anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
  await dialog.getByLabel(kind==='memorial'?'Breite (cm)':'Lichte Raumbreite (cm)',{exact:true}).fill(kind==='memorial'?'80':'420');
  await dialog.getByLabel(kind==='memorial'?'Höhe (cm)':'Raumhöhe (cm)',{exact:true}).fill(kind==='memorial'?'120':'260');
  if(kind==='memorial')await dialog.getByLabel('Materialstärke (cm)',{exact:true}).fill('16');
  else {await dialog.getByLabel('Lichte Raumtiefe (cm)',{exact:true}).fill('320');await dialog.getByLabel('Wandstärke ohne Belag (cm)',{exact:true}).fill('20');}
  const save=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===`/api/v1/designs/${plan.variant.id}/commands`);
  await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();const response=await save;expect(response.ok()).toBe(true);const body=await response.json(),state=body.result??body;
  if(kind==='memorial'){expect(Object.values(state.revision.snapshot.measurements).some((m:any)=>m.valueMm==='1200')).toBe(true);expect(Object.values(state.revision.snapshot.measurements).some((m:any)=>m.valueMm==='160')).toBe(true);}
  else {const nodes=state.revision.snapshot.elements.filter((e:any)=>e.kind==='node');expect(nodes[0].point).toEqual({xMm:'-100',yMm:'-100',zMm:'0'});expect(nodes[2].point).toEqual({xMm:'4300',yMm:'3300',zMm:'0'});}
  await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
  const revision=await page.locator('.revision-chip').innerText();let writes=0;page.on('request',r=>{if(r.method()==='POST'&&/\/designs\/.+\/commands$/.test(new URL(r.url()).pathname))writes++;});
  await unit.selectOption('m');await expect(page.locator('.plan-units')).toHaveText('m');
  await expect(page.locator('.revision-chip')).toHaveText(revision);await page.reload();await expect(unit).toHaveValue('m');
  await expect(page.locator('.revision-chip')).toHaveText(revision);await expect(page.locator('svg[role=application]')).toContainText(kind==='memorial'?'1,2':'4,2');
  await unit.selectOption('mm');await expect(page.locator('.revision-chip')).toHaveText(revision);expect(writes).toBe(0);
  await page.screenshot({path:evidence+'/'+kind+'-desktop.png',animations:'disabled'});await audit(page,'.studio-root');
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.desktop-panel-label')).toBeHidden();await expect(page.locator('.mobile-panel-label')).toBeVisible();await noOverflow(page);expect((await page.locator('.canvas-panel').boundingBox())!.height).toBeGreaterThan(300);await audit(page,'.studio-root');await page.screenshot({path:evidence+'/'+kind+'-mobile.png',animations:'disabled'});
});

test('Büro and Einkauf open concise task hubs rather than a long module strip',async({page})=>{
  await login(page,'OFFICE');await page.getByRole('navigation',{name:'Arbeitsbereiche'}).getByRole('link',{name:'Büro',exact:true}).click();
  await expect(page).toHaveURL(/\/office$/);await expect(page.locator('.workspace-hub')).toBeVisible();await expect(page.locator('.hub-card')).toHaveCount(2);await audit(page,'.workspace-hub');
  await page.screenshot({path:evidence+'/office-desktop.png',animations:'disabled'});
  await page.goto('/purchasing');await expect(page.locator('.workspace-hub')).toBeVisible();await page.setViewportSize({width:390,height:844});await noOverflow(page);await audit(page,'.workspace-hub');await page.screenshot({path:evidence+'/purchasing-mobile.png',animations:'disabled'});
});

test('Studio: invalid lengths stay visible, cannot be submitted or silently converted, and explicit suffixes commit canonical values',async({page})=>{
  await login(page,'PLANNER');const plan=await command(page,'planning.project.create',{kind:'memorial',name:'TEST · Eingabeprüfung '+randomUUID().slice(0,8)});
  await page.goto('/studio/'+plan.project.id+'?variant='+plan.variant.id);const unit=page.getByRole('combobox',{name:'Maßeinheit',exact:true});await unit.selectOption('cm');
  await page.getByRole('button',{name:'Ersten Stein anlegen',exact:true}).click();const dialog=page.getByRole('dialog'),width=dialog.getByRole('textbox',{name:'Breite (cm)',exact:true});
  await width.fill('80,0,0');await width.press('Tab');await expect(width).toHaveAttribute('aria-invalid','true');await expect(width).toHaveAccessibleDescription(/Ein eindeutiges Maß eingeben/);
  await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeVisible();await expect(width).toHaveValue('80,0,0');
  await width.fill('0,8 m');await dialog.getByLabel('Höhe (cm)',{exact:true}).fill('1.2 m');await dialog.getByLabel('Materialstärke (cm)',{exact:true}).fill('160 mm');
  await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
  const thickness=page.getByRole('textbox',{name:/^Materialstärke cm$/});await expect(thickness).toHaveValue('16');
  await thickness.fill('2,5,0');await unit.selectOption('m');await expect(unit).toHaveValue('cm');await expect(thickness).toHaveValue('2,5,0');await expect(thickness).toBeFocused();
  const save=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===`/api/v1/designs/${plan.variant.id}/commands`);
  await thickness.fill('18');await thickness.press('Tab');const response=await save;expect(response.ok()).toBe(true);const body=await response.json(),snapshot=(body.result??body).revision.snapshot;
  const stone=snapshot.elements.find((e:any)=>e.kind==='stone_piece');expect(snapshot.measurements[stone.thicknessMeasureId].valueMm).toBe('180');
  await unit.selectOption('m');await expect(page.getByRole('textbox',{name:/^Materialstärke m$/})).toHaveValue('0,18');await unit.selectOption('mm');
});

test('Dark blue manufacturer filters and customer tiles remain readable, named and within the mobile viewport',async({page})=>{
  test.setTimeout(120000);await login(page,'SUPERADMIN');await page.goto('/account');const appearance=page.locator('.appearance-settings');await appearance.getByRole('radio',{name:/^Dunkel /}).check();await appearance.getByRole('radio',{name:'Hellblau',exact:true}).check();
  const save=page.getByRole('button',{name:'Darstellung speichern',exact:true});if(await save.isEnabled()){await save.click();await expect(appearance.getByRole('status')).toContainText('gespeichert');}
  try{
    await page.goto('/manufacturer-assets');await expect(page.locator('.manufacturer-library .toolbar')).toBeVisible();
    for(const width of [1440,920,390]){await page.setViewportSize({width,height:width===390?844:1000});await noOverflow(page);await audit(page,'.manufacturer-library');await page.screenshot({path:evidence+'/manufacturer-dark-'+width+'.png',animations:'disabled'});}
    const customer=await command(page,'crm.customer.create',{name:'TEST · Dunkle Kundenübersicht '+randomUUID().slice(0,8)});await page.goto('/customers/'+customer.id);await expect(page.locator('.customer-tile')).toHaveCount(6);await audit(page,'.customer-workspace');await page.screenshot({path:evidence+'/customer-dark-mobile.png',animations:'disabled'});
  }finally{await page.goto('/account');await page.getByRole('button',{name:'Schubert-Standard auswählen',exact:true}).click();if(await save.isEnabled()){await save.click();await expect(page.locator('.appearance-settings').getByRole('status')).toContainText('gespeichert');}}
});

test('Customer planning: explain a missing assignment, then create and rediscover the actual linked project through its tile',async({page})=>{
  await login(page,'OWNER');const marker=randomUUID().slice(0,8),customer=await command(page,'crm.customer.create',{name:'TEST · Kundenplanung '+marker});
  await page.goto('/customers/'+customer.id);await page.getByRole('button',{name:/^Planungen 0/}).click();await page.getByRole('link',{name:'Alle Planungen ansehen',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Zuerst das Vorhaben zuordnen',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Auftragsentwurf anlegen',exact:true})).toHaveAttribute('href','/orders?create=1&customer_id='+customer.id);
  await command(page,'sales.order.create',{title:'TEST · Grabmal '+marker,customer_id:customer.id,currency:'EUR'});await page.reload();
  await page.getByLabel('Projektname',{exact:true}).fill('TEST · Entwurf für Kunden '+marker);await expect(page.locator('#planning-project-order')).not.toHaveValue('');
  await page.getByRole('button',{name:'Planung beginnen',exact:true}).click();await expect(page.locator('.studio-workspace')).toBeVisible();const projectId=new URL(page.url()).pathname.split('/').at(-1)!;
  await page.goto('/customers/'+customer.id);await page.getByRole('button',{name:/^Planungen 1/}).click();const linked=page.locator('.customer-record').filter({hasText:'TEST · Entwurf für Kunden '+marker});await expect(linked).toHaveAttribute('href','/studio/'+projectId);await linked.click();await expect(page.locator('.studio-project-title')).toContainText('TEST · Entwurf für Kunden '+marker);
});
