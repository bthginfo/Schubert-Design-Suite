import {studioPanel,studioAdd,studioMetadata} from './select-choice.js';
import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {login} from './login.js';
import {chooseSelect,nativeSelect,visibleSelect} from './select-choice.js';
import {config} from 'dotenv';
import {withTenant,one,closePools} from '@schubert/db';
import type {ActorContext} from '@schubert/contracts';
config({quiet:true});
const trainingActor:ActorContext={tenantId:process.env.TEST_TENANT_ID!,legalEntityId:process.env.TEST_LEGAL_ENTITY_ID!,actorId:process.env.TEST_SUPERADMIN_ID!,role:'SuperAdmin',permissions:[],permissionVersion:1,correlationId:randomUUID(),employeeId:null,actorType:'employee',identityAssurance:'individual_session'};
let previousTraining:boolean|undefined;
// Exercise the extra notice height explicitly in the isolated UAT tenant.
// No sample records are created or removed; restore the original flag.
test.beforeAll(async()=>{if(!trainingActor.tenantId)throw Error('Isolated synthetic tenant required.');await withTenant(trainingActor,async db=>{const row=await one<any>(db,'SELECT training_mode FROM legal_entities WHERE id=$1 FOR UPDATE',[trainingActor.legalEntityId]);previousTraining=row.training_mode;if(!previousTraining)await db.query('UPDATE legal_entities SET training_mode=true WHERE id=$1',[trainingActor.legalEntityId]);});});
test.afterAll(async()=>{try{if(previousTraining===false)await withTenant(trainingActor,db=>db.query('UPDATE legal_entities SET training_mode=false WHERE id=$1',[trainingActor.legalEntityId]));}finally{await closePools();}});

async function openedList(page:Page,input:Awaited<ReturnType<typeof visibleSelect>>){
 const id=(await input.getAttribute('aria-controls'))!;
 const list=page.locator(`[id=${JSON.stringify(id)}]`);await expect(list).toBeVisible();return list;
}

async function room(page:Page){
 await page.goto('/studio?q=Synthetische%20Studio-QA');
 await page.getByRole('link',{name:/Synthetische Studio-QA Raum /}).click();
 await expect(page.locator('.studio-workspace')).toBeVisible();
}

async function viewportWorkbench(page:Page){
 const geometry=await page.locator('.studio-root').evaluate(root=>{const rect=root.getBoundingClientRect(),canvas=root.querySelector('.canvas-panel')!.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,scroll:root.scrollHeight-root.clientHeight,canvasWidth:canvas.width,canvasHeight:canvas.height};});
 expect(Math.abs(geometry.x)).toBeLessThanOrEqual(1);expect(Math.abs(geometry.y)).toBeLessThanOrEqual(1);
 expect(Math.abs(geometry.width-geometry.viewportWidth)).toBeLessThanOrEqual(1);expect(Math.abs(geometry.height-geometry.viewportHeight)).toBeLessThanOrEqual(1);
 expect(geometry.scroll).toBeLessThanOrEqual(1);expect(geometry.canvasWidth).toBeGreaterThan(200);expect(geometry.canvasHeight).toBeGreaterThan(120);
}

test('Searchable choices filter German labels locally, cancel safely and commit once by keyboard',async({page})=>{
 test.setTimeout(150000);await login(page,'OWNER');await page.goto('/customers');
 await page.getByRole('button',{name:'Kunde anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
 const native=dialog.locator('#field-country');await chooseSelect(page,native,'DE');
 const input=await visibleSelect(page,native);await page.waitForLoadState('networkidle');
 const requests:string[]=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.method()+' '+new URL(request.url()).pathname);});
 await native.evaluate(select=>{select.dataset.testInputs='0';select.dataset.testChanges='0';select.addEventListener('input',()=>select.dataset.testInputs=String(Number(select.dataset.testInputs)+1));select.addEventListener('change',()=>select.dataset.testChanges=String(Number(select.dataset.testChanges)+1));});
 await input.click();await input.fill('kein-land-78291');const empty=await openedList(page,input);
 await expect(empty.locator('[role="option"][data-index]')).toHaveCount(0);
 await expect(empty.getByRole('option')).toHaveAttribute('aria-disabled','true');await expect(native).toHaveValue('DE');
 await input.press('Enter');await expect(native).toHaveValue('DE');await expect(empty).toBeVisible();
 await input.press('Escape');await expect(empty).toBeHidden();await expect(input).toHaveValue('Deutschland');await expect(input).toBeFocused();
 await input.click();await input.fill('osterreich');const list=await openedList(page,input);
 await expect(list.getByRole('option',{name:'Österreich',exact:true})).toBeVisible();await expect(native).toHaveValue('DE');
 await input.press('ArrowDown');await input.press('Enter');await expect(native).toHaveValue('AT');await expect(input).toHaveValue('Österreich');
 await expect(native).toHaveAttribute('data-test-inputs','1');await expect(native).toHaveAttribute('data-test-changes','1');
 await input.click();await input.fill('unbestätigter Freitext');await input.press('Tab');await expect(native).toHaveValue('AT');await expect(input).toHaveValue('Österreich');
 expect(requests).toEqual([]);await expect(native).toHaveAttribute('data-test-changes','1');
});

test('Searchable dropdowns stay inside a small dialog viewport and retain labels and focus',async({page})=>{
 test.setTimeout(150000);await page.setViewportSize({width:375,height:812});await login(page,'OWNER');await page.goto('/customers');
 await page.getByRole('button',{name:'Kunde anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
 const native=dialog.locator('#field-country'),section=native.locator('xpath=ancestor::details[1]');
 if(await section.count()&&await section.getAttribute('open')===null)await section.locator('summary').click();
 const input=await visibleSelect(page,native);await input.scrollIntoViewIfNeeded();await input.click();
 const list=await openedList(page,input),bounds=await list.boundingBox();expect(bounds).not.toBeNull();
 expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(376);expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(813);
 await expect(input).toHaveAccessibleName(/Land/);await expect(input).toHaveCSS('font-size','16px');
 await page.keyboard.press('Escape');await expect(list).toBeHidden();await expect(dialog).toBeVisible();await expect(input).toBeFocused();
 await input.click();await input.fill('kein-land-78291');await expect(list.locator('[role="option"][data-index]')).toHaveCount(0);
 const audit=await new AxeBuilder({page}).include('.modal').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(audit.violations).toEqual([]);
 await input.locator('..').locator('.searchable-select-toggle').click();
 await expect(input).toHaveAttribute('aria-expanded','false');await expect(list).toBeHidden();await expect(input).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await expect(dialog).toBeHidden();
});

test('Planning workbench fills native and fallback fullscreen, keeps dropdowns usable and restores scroll',async({page})=>{
 test.setTimeout(240000);await login(page,'PLANNER');await room(page);const root=page.locator('.studio-root');
 const revision=await page.locator('.revision-chip').innerText(),overflow=await page.evaluate(()=>document.body.style.overflow);
 await page.getByRole('button',{name:'Vollbild',exact:true}).click();await expect(root).toHaveAttribute('data-fullscreen-mode','native');await viewportWorkbench(page);
 await studioPanel(page,'elements');await studioPanel(page,'properties');const before=await page.locator('.canvas-panel').boundingBox();
 await page.getByRole('button',{name:'Elementliste ein- oder ausblenden',exact:true}).click();
 await page.getByRole('button',{name:'Eigenschaften ein- oder ausblenden',exact:true}).click();
 const expanded=await page.locator('.canvas-panel').boundingBox();expect(expanded!.width).toBeGreaterThan(before!.width+250);
 await page.getByRole('button',{name:'Elementliste ein- oder ausblenden',exact:true}).click();
 await studioPanel(page,'elements');await page.locator('.element-tree button').filter({has:page.locator('small').filter({hasText:/^Wand$/})}).first().click();
 await page.getByRole('button',{name:'Eigenschaften ein- oder ausblenden',exact:true}).click();
 await studioMetadata(page);const phase=page.getByRole('combobox',{name:'Planungsphase',exact:true}),native=await nativeSelect(page,phase),original=await native.inputValue();
 await phase.click();const list=await openedList(page,phase);expect(await list.evaluate(node=>!!document.fullscreenElement?.contains(node))).toBe(true);
 await phase.fill('kein-passender-begriff');await expect(list.locator('[role="option"][data-index]')).toHaveCount(0);await expect(native).toHaveValue(original);
 await page.getByRole('button',{name:'Vollbild beenden',exact:true}).click();await expect(root).toHaveAttribute('data-fullscreen-mode','none');await expect(list).toBeHidden();
 await expect(page.locator('.revision-chip')).toHaveText(revision);expect(await page.evaluate(()=>document.body.style.overflow)).toBe(overflow);
 await root.evaluate(node=>{Object.defineProperty(node,'requestFullscreen',{configurable:true,value:async()=>{throw new DOMException('Synthetic denial','NotAllowedError');}});});
 await page.getByRole('button',{name:'Vollbild',exact:true}).click();await expect(root).toHaveAttribute('data-fullscreen-mode','fallback');await viewportWorkbench(page);
 expect(await root.evaluate(node=>document.elementFromPoint(2,innerHeight-2)?.closest('.studio-root')===node)).toBe(true);
 await page.keyboard.press('Escape');await expect(root).toHaveAttribute('data-fullscreen-mode','none');expect(await page.evaluate(()=>document.body.style.overflow)).toBe(overflow);
 await expect(page.locator('.revision-chip')).toHaveText(revision);
});

test('Compact planning keeps the canvas first and opens element and property drawers deliberately',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:375,height:812});await login(page,'PLANNER');await room(page);
 const canvas=page.locator('.canvas-panel'),bounds=await canvas.boundingBox();expect(bounds!.y).toBeLessThan(812*.7);expect(bounds!.height).toBeGreaterThanOrEqual(220);
 await expect.poll(async()=>(await canvas.locator('svg[role="application"]').boundingBox())?.height??0,{message:'The phone editor must leave at least220px of actual drawing paper'}).toBeGreaterThanOrEqual(220);
 await expect(page.getByText('Testbetrieb',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Hinweise zum Testen',exact:true})).toBeInViewport();
 await expect(page.locator('.workbench-drawer[open]')).toHaveCount(0);
 const elements=page.getByRole('button',{name:'Elementliste ein- oder ausblenden',exact:true});await elements.click();
 const drawer=page.getByRole('dialog',{name:'Elemente',exact:true});await expect(drawer).toBeVisible();
 await drawer.getByRole('button',{name:'Elementliste schließen',exact:true}).click();await expect(drawer).toBeHidden();await expect(elements).toBeFocused();await elements.click();
 await drawer.locator('.element-tree button').filter({has:page.locator('small').filter({hasText:/^Wand$/})}).first().click();
 await expect(drawer).toBeHidden();await expect.poll(()=>page.evaluate(()=>!!document.activeElement?.closest('.canvas-panel'))).toBe(true);
 await expect(page.locator('.workbench-drawer[open]')).toHaveCount(0);await expect(canvas).toBeInViewport();
 const properties=page.getByRole('button',{name:'Eigenschaften ein- oder ausblenden',exact:true});await properties.click();
 const inspector=page.locator('dialog#studio-properties-panel');await expect(inspector).toBeVisible();await studioMetadata(page);await expect(inspector.getByRole('combobox',{name:'Planungsphase',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(inspector).toBeHidden();await expect(properties).toBeFocused();await expect(canvas).toBeInViewport();
 await page.getByRole('button',{name:'Vollbild',exact:true}).click();await viewportWorkbench(page);
 await page.getByRole('button',{name:'Vollbild beenden',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('Locked planning properties disable searchable choices through the actual parent fieldset',async({page})=>{
 test.setTimeout(180000);await login(page,'PLANNER');
 const created=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{kind:'memorial',name:'TEST · Gesperrte Suchauswahl '+randomUUID().slice(0,8)},idempotencyKey:randomUUID()}});
 expect(created.ok()).toBe(true);const {result}=await created.json();await page.goto('/studio/'+result.project.id+'?variant='+result.variant.id);
 await page.getByRole('button',{name:'Ersten Stein anlegen',exact:true}).click();const dialog=page.getByRole('dialog');
 for(const [name,value]of [['Breite (mm)','800'],['Höhe (mm)','1200'],['Materialstärke (mm)','160']])await dialog.getByLabel(name,{exact:true}).fill(value);
 await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
 await studioMetadata(page);const phase=page.getByRole('combobox',{name:'Planungsphase',exact:true}),native=await nativeSelect(page,phase),value=await native.inputValue();
 await page.getByRole('button',{name:'Sperren',exact:true}).click();await expect(phase).toBeDisabled();expect(await native.evaluate(select=>select.matches(':disabled')&&!select.hasAttribute('disabled'))).toBe(true);
 await expect(native).toHaveValue(value);await page.getByRole('button',{name:'Entsperren',exact:true}).click();await expect(phase).toBeEnabled();
 await phase.click();const list=await openedList(page,phase);await expect(list.getByRole('option')).not.toHaveCount(0);await phase.press('Escape');await expect(native).toHaveValue(value);
 await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled({timeout:30000});
});

test('Short fullscreen keeps the 3D model separate from its open camera controls and companion',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:1180,height:650});await login(page,'PLANNER');await room(page);
 const root=page.locator('.studio-root'),revision=await page.locator('.revision-chip').innerText();
 await page.getByRole('button',{name:'Vollbild',exact:true}).click();await expect(root).toHaveAttribute('data-fullscreen-mode','native');
 await page.getByRole('button',{name:'3D',exact:true}).click();await expect(root.locator('.three-stage canvas')).toBeVisible();
 await root.locator('.camera-disclosure summary').click();
 await expect(page.getByRole('button',{name:'Kamera nach links drehen',exact:true})).toBeVisible();
 await expect.poll(async()=>root.evaluate(node=>{
  const scene=node.querySelector('.three-canvas')!.getBoundingClientRect(),camera=node.querySelector('.three-footer')!.getBoundingClientRect(),panel=node.querySelector('.canvas-panel')!.getBoundingClientRect();
  const overlapX=Math.min(scene.right,camera.right)-Math.max(scene.left,camera.left),overlapY=Math.min(scene.bottom,camera.bottom)-Math.max(scene.top,camera.top);
  return scene.width>200&&scene.height>100&&camera.width>100&&camera.height>40&&(overlapX<=1||overlapY<=1)&&scene.left>=panel.left-1&&scene.right<=panel.right+1&&camera.left>=panel.left-1&&camera.right<=panel.right+1&&camera.bottom<=panel.bottom+1;
 }),{message:'The open camera must leave a useful separate 3D model area'}).toBe(true);
 const fab=await page.getByRole('button',{name:'Assistent',exact:true}).boundingBox();expect(fab).not.toBeNull();
 for(const button of await root.locator('.canvas-bottom button').all())if(await button.isVisible()){
  const bounds=(await button.boundingBox())!;
  const overlapX=Math.min(bounds.x+bounds.width,fab!.x+fab!.width)-Math.max(bounds.x,fab!.x),overlapY=Math.min(bounds.y+bounds.height,fab!.y+fab!.height)-Math.max(bounds.y,fab!.y);
  expect(overlapX<=1||overlapY<=1,'The companion must leave the editor controls reachable').toBe(true);
 }
 await page.getByRole('button',{name:'Kamera nach links drehen',exact:true}).click();await page.getByRole('button',{name:'Vorn',exact:true}).click();
 await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();await expect(page.locator('.revision-chip')).toHaveText(revision);
 await page.getByRole('button',{name:'Vollbild beenden',exact:true}).click();await expect(root).toHaveAttribute('data-fullscreen-mode','none');
});
