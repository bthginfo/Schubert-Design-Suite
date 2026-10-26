import {studioPanel,studioAdd,studioMetadata} from './select-choice.js';
import {chooseSelect,nativeSelect,studioAction,setDisplayOption} from './select-choice.js';
import {login} from './login.js';
import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';

test('Representative memorial and room: persisted dimensions, drawings, camera and PDF',async({page,context})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await login(page,'PLANNER');
  await mkdir('work/final-studios',{recursive:true});
  for(const kind of ['memorial','room_plan'] as const){
    const name='Abnahme '+(kind==='memorial'?'Grabmal':'Bad')+' '+randomUUID().slice(0,8);
    const created=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{name,kind},idempotencyKey:randomUUID()}});
    expect(created.ok()).toBeTruthy();const {result}=await created.json();
    await page.goto('/studio/'+result.project.id+'?variant='+result.variant.id);
    await expect(page.locator('.studio-workspace')).toBeVisible();
    // Autosave can complete before a human reaches Save. Observe the actual
    // committed final geometry instead of racing a correctly disabled button.
    let committed:any;
    const finalMarker=kind==='memorial'?'circular_arc':'Tür · 900 × 2100 mm';
    const observeSaved=(response:any)=>{
      if(response.ok()&&response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/v1/designs/'+result.variant.id+'/commands'){
        void response.json().then((body:any)=>{const state=body.result??body;if(JSON.stringify(state.revision?.snapshot??{}).includes(finalMarker))committed=state;}).catch(()=>{});
      }
    };
    page.on('response',observeSaved);
    const dialog=page.getByRole('dialog');
    await page.getByRole('button',{name:kind==='memorial'?'Ersten Stein anlegen':'Raum anlegen',exact:true}).click();
    await dialog.getByLabel('Bezeichnung',{exact:true}).fill(kind==='memorial'?'Stele · 800 × 1200 × 160 mm':'Bad · 4200 × 3200 mm Innenmaße');
    await dialog.getByLabel(kind==='memorial'?'Breite (mm)':'Lichte Raumbreite (mm)',{exact:true}).fill(kind==='memorial'?'800':'4200');
    await dialog.getByLabel(kind==='memorial'?'Höhe (mm)':'Raumhöhe (mm)',{exact:true}).fill(kind==='memorial'?'1200':'2600');
    if(kind==='memorial')await dialog.getByLabel('Materialstärke (mm)',{exact:true}).fill('160');
    else {await dialog.getByLabel('Lichte Raumtiefe (mm)',{exact:true}).fill('3200');await dialog.getByLabel('Wandstärke ohne Belag (mm)',{exact:true}).fill('200');}
    await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
    if(kind==='memorial'){
      await page.locator('.geometry-details>summary').click();
      await page.getByRole('button',{name:'Kontur & Bögen bearbeiten',exact:true}).click();
      const edges=page.locator('.contour-editor .edge');
      await edges.nth(1).getByLabel('Endpunkt Y mm',{exact:true}).fill('800');await edges.nth(1).getByLabel('Endpunkt Y mm',{exact:true}).press('Tab');
      await edges.nth(2).getByLabel('Endpunkt Y mm',{exact:true}).fill('800');await edges.nth(2).getByLabel('Endpunkt Y mm',{exact:true}).press('Tab');
      await chooseSelect(page,edges.nth(2).getByRole('combobox',{name:'Kantentyp',exact:true}),'circular_arc');
      await edges.nth(2).getByLabel('Mittelpunkt X mm',{exact:true}).fill('400');await edges.nth(2).getByLabel('Mittelpunkt X mm',{exact:true}).press('Tab');
      await page.getByRole('button',{name:'Kontur übernehmen',exact:true}).click();await expect(page.locator('.contour-editor')).toBeHidden();
    }
    if(kind==='room_plan'){
      await studioAdd(page,'Tür / Fenster');
      await dialog.getByLabel('Bezeichnung',{exact:true}).fill('Tür · 900 × 2100 mm');
      await chooseSelect(page,dialog.getByRole('combobox',{name:'Bezugswand',exact:true}),{index:1});
      await dialog.getByLabel('Öffnungsbreite (mm)',{exact:true}).fill('900');await dialog.getByLabel('Öffnungshöhe (mm)',{exact:true}).fill('2100');
      await dialog.getByLabel('Abstand längs der Wand (mm)',{exact:true}).fill('600');await dialog.getByLabel('Brüstungshöhe (mm)',{exact:true}).fill('0');
      await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
    }
    await expect.poll(()=>!!committed,{timeout:30000,message:'Final geometry must be confirmed by a successful authenticated design command'}).toBe(true);
    page.off('response',observeSaved);const state=committed;await writeFile('work/final-studios/'+kind+'-saved.json',JSON.stringify(state,null,2));
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
    if(await page.getByRole('button',{name:'Feedback',exact:true}).count()){
      await page.getByRole('button',{name:'Feedback',exact:true}).click();const feedback=page.locator('dialog.feedback-dialog');await feedback.getByText('Mitgesendeten Kontext ansehen',{exact:false}).click();await expect(feedback).toContainText('Planung bearbeiten · erfolgreich');await feedback.getByRole('button',{name:'Feedback schließen'}).click();
    }
    await page.reload();
    const svg=page.locator('svg[role="application"]');await expect(svg).toBeVisible();
    for(const label of ['Front','Seite',kind==='memorial'?'Drauf':'Grundriss']){
      await page.getByRole('button',{name:label,exact:true}).click();
      const strokes=await svg.locator('.plan-shape path').evaluateAll(paths=>paths.map(path=>Number(path.getAttribute('stroke-width'))*Math.abs((path as SVGGraphicsElement).getScreenCTM()!.a)));
      expect(strokes.length).toBeGreaterThan(0);expect(Math.min(...strokes)).toBeGreaterThanOrEqual(1);
    }
    await page.getByRole('button',{name:kind==='memorial'?'Front':'Grundriss',exact:true}).click();
    const dimensions=page.locator('.dimension-annotation');await expect(dimensions).toHaveCount(kind==='memorial'?2:6);
    if(kind==='room_plan'){
      // Four wall axes plus two usable interior spans, with their distinct labels.
      await expect(dimensions.filter({hasText:'4.200 · innen'})).toHaveCount(1);await expect(dimensions.filter({hasText:'3.200 · innen'})).toHaveCount(1);
      await expect(dimensions.filter({hasText:'4.400 · Achse'})).toHaveCount(2);await expect(dimensions.filter({hasText:'3.400 · Achse'})).toHaveCount(2);
    }
    await setDisplayOption(page,'Maße',false);await expect(page.locator('.dimension-annotation')).toHaveCount(0);await setDisplayOption(page,'Maße',true);
    const revision=await page.locator('.revision-chip').innerText();
    const box=()=>svg.getAttribute('viewBox').then(v=>v!.split(' ').map(Number));const before=await box();
    await page.getByRole('button',{name:'Vergrößern',exact:true}).click();const after=await box();
    expect(after[0]+after[2]/2).toBeCloseTo(before[0]+before[2]/2,5);expect(after[1]+after[3]/2).toBeCloseTo(before[1]+before[3]/2,5);
    await page.getByRole('button',{name:'Einpassen',exact:true}).click();
    await page.locator('.studio-workspace').screenshot({path:'work/final-studios/'+kind+'-2d.png'});
    // Selection then camera keyboard interaction must never modify the saved plan.
    await studioPanel(page,'elements');await page.locator('.element-tree button').filter({has:page.locator('small').filter({hasText:kind==='memorial'?/^Naturstein$/:/^Wand$/})}).first().click();
    await page.getByRole('button',{name:'3D',exact:true}).click();const canvas=page.locator('.three-stage canvas');await expect(canvas).toBeVisible();
    await page.locator('.camera-disclosure summary').click();const turn=page.getByRole('button',{name:'Kamera nach links drehen',exact:true});await turn.focus();await page.keyboard.press('ArrowLeft');await turn.click();
    await page.getByRole('button',{name:'Vorn',exact:true}).click();await page.getByRole('button',{name:'Einpassen',exact:true}).click();await page.locator('.camera-disclosure summary').click();
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
    for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
      await page.setViewportSize(viewport);await expect(canvas).toBeVisible();
      const geometry=await page.evaluate(()=>{const model=document.querySelector('.three-canvas')!.getBoundingClientRect(),tools=document.querySelector('.three-footer')!.getBoundingClientRect();return {width:document.documentElement.scrollWidth,modelBottom:model.bottom,toolsTop:tools.top};});
      expect(geometry.width).toBeLessThanOrEqual(viewport.width+1);expect(geometry.modelBottom).toBeLessThanOrEqual(geometry.toolsTop+1);
      const caption=page.locator('.three-caption'),zoomBar=(await page.locator('.canvas-bottom').boundingBox())!;
      if(await caption.isVisible()){const bounds=(await caption.boundingBox())!;expect(bounds.y+bounds.height).toBeLessThanOrEqual(zoomBar.y+1);}
      else await expect(page.locator('.camera-disclosure summary')).toBeVisible();
      await page.locator('.canvas-panel').screenshot({path:'work/final-studios/'+kind+'-3d-'+viewport.width+'.png'});
      if(viewport.width===375){
        await page.locator('.camera-disclosure summary').click();await page.getByRole('button',{name:'Oben',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Oben',exact:true})).toBeVisible();
        const bottom=await page.getByRole('button',{name:'Oben',exact:true}).boundingBox(),panel=await page.locator('.canvas-panel').boundingBox();
        expect(bottom!.y+bottom!.height).toBeLessThan(panel!.y+panel!.height);await page.locator('.camera-disclosure summary').click();
      }
      const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([]);
    }
    await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:kind==='memorial'?'Front':'Grundriss',exact:true}).click();await expect(page.locator('.revision-chip')).toHaveText(revision);
    const pdfResponse=context.waitForEvent('response',{predicate:r=>r.url().includes('/export?kind=pdf'),timeout:60000});await studioAction(page,'Planungs-PDF');const pdfUrl=(await pdfResponse).url();const file=await page.request.get(pdfUrl,{timeout:60000});expect(file.status()).toBe(200);const bytes=await file.body();expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(4);await writeFile('work/final-studios/'+kind+'.pdf',bytes);
    await writeFile('work/final-studios/'+kind+'-result.json',JSON.stringify({project:result.project.id,variant:result.variant.id,revision:state.revision.id,sourceHash:state.revision.content_hash,pdfBytes:bytes.length,url:page.url(),errors},null,2));
    // The browser owns inline PDF viewer pages; context teardown closes them together.
  }
  expect(errors).toEqual([]);
});
