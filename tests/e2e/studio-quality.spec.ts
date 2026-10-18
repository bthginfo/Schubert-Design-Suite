import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';

test('Representative memorial and room: persisted dimensions, drawings, camera and PDF',async({page,context})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/login');await page.getByLabel('E-Mail',{exact:false}).fill(process.env.TEST_PLANNER_EMAIL!);await page.locator('#login-password').fill(process.env.TEST_PLANNER_PASSWORD!);await page.getByRole('button',{name:'Sicher anmelden',exact:true}).click();await expect(page).not.toHaveURL(/\/login/);
  await mkdir('work/final-studios',{recursive:true});
  for(const kind of ['memorial','room_plan'] as const){
    const name='Abnahme '+(kind==='memorial'?'Grabmal':'Bad')+' '+randomUUID().slice(0,8);
    const created=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{name,kind},idempotencyKey:randomUUID()}});
    expect(created.ok()).toBeTruthy();const {result}=await created.json();
    await page.goto('/studio/'+result.project.id+'?variant='+result.variant.id);
    await expect(page.locator('.studio-workspace')).toBeVisible();
    const dialog=page.getByRole('dialog');
    await page.getByRole('button',{name:kind==='memorial'?'Ersten Stein anlegen':'Raum anlegen',exact:true}).click();
    await dialog.getByLabel('Bezeichnung',{exact:true}).fill(kind==='memorial'?'Stele · 800 × 1200 × 160 mm':'Bad · 4200 × 3200 mm Wandachsen');
    await dialog.getByLabel('Breite / X-Länge (mm)',{exact:true}).fill(kind==='memorial'?'800':'4200');
    await dialog.getByLabel('Höhe / Länge (mm)',{exact:true}).fill(kind==='memorial'?'1200':'2600');
    if(kind==='memorial')await dialog.getByLabel('Stärke (mm)',{exact:true}).fill('160');
    else {await dialog.getByLabel('Tiefe / Y-Länge (mm)',{exact:true}).fill('3200');await dialog.getByLabel('Wandkern (mm)',{exact:true}).fill('200');}
    await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
    if(kind==='memorial'){
      await page.getByRole('button',{name:'Kontur & Bögen bearbeiten',exact:true}).click();
      const edges=page.locator('.contour-editor .edge');
      await edges.nth(1).getByLabel('Endpunkt Y',{exact:true}).fill('800');await edges.nth(1).getByLabel('Endpunkt Y',{exact:true}).press('Tab');
      await edges.nth(2).getByLabel('Endpunkt Y',{exact:true}).fill('800');await edges.nth(2).getByLabel('Endpunkt Y',{exact:true}).press('Tab');
      await edges.nth(2).getByRole('combobox',{name:'Kantentyp',exact:true}).selectOption('circular_arc');
      await edges.nth(2).getByLabel('Mittelpunkt X',{exact:true}).fill('400');await edges.nth(2).getByLabel('Mittelpunkt X',{exact:true}).press('Tab');
      await page.getByRole('button',{name:'Kontur übernehmen',exact:true}).click();await expect(page.locator('.contour-editor')).toBeHidden();
    }
    if(kind==='room_plan'){
      await page.getByRole('button',{name:'Tür / Fenster',exact:true}).click();
      await dialog.getByLabel('Bezeichnung',{exact:true}).fill('Tür · 900 × 2100 mm');
      await dialog.getByRole('combobox',{name:'Bezugswand',exact:true}).selectOption({index:1});
      await dialog.getByLabel('Breite / X-Länge (mm)',{exact:true}).fill('900');await dialog.getByLabel('Höhe / Länge (mm)',{exact:true}).fill('2100');
      await dialog.getByLabel('Abstand längs der Wand (mm)',{exact:true}).fill('600');await dialog.getByLabel('Brüstungshöhe (mm)',{exact:true}).fill('0');
      await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();await expect(dialog).toBeHidden();
    }
    const savedPromise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/designs/')&&r.url().endsWith('/commands'));
    await page.getByRole('button',{name:'Speichern',exact:true}).click();const saved=await savedPromise;expect(saved.status()).toBe(200);
    const payload=await saved.json(),state=payload.result??payload;await writeFile('work/final-studios/'+kind+'-saved.json',JSON.stringify(state,null,2));
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();await page.reload();
    const svg=page.locator('svg[role="application"]');await expect(svg).toBeVisible();
    for(const label of ['Front','Seite',kind==='memorial'?'Drauf':'Grundriss']){
      await page.getByRole('button',{name:label,exact:true}).click();
      const strokes=await svg.locator('.plan-shape path').evaluateAll(paths=>paths.map(path=>Number(path.getAttribute('stroke-width'))*Math.abs((path as SVGGraphicsElement).getScreenCTM()!.a)));
      expect(strokes.length).toBeGreaterThan(0);expect(Math.min(...strokes)).toBeGreaterThanOrEqual(1);
    }
    await page.getByRole('button',{name:kind==='memorial'?'Front':'Grundriss',exact:true}).click();
    await expect(page.locator('.dimension-annotation')).toHaveCount(kind==='memorial'?2:4);
    await page.getByLabel('Maße',{exact:true}).uncheck();await expect(page.locator('.dimension-annotation')).toHaveCount(0);await page.getByLabel('Maße',{exact:true}).check();
    const revision=await page.locator('.revision-chip').innerText();
    const box=()=>svg.getAttribute('viewBox').then(v=>v!.split(' ').map(Number));const before=await box();
    await page.getByRole('button',{name:'Vergrößern',exact:true}).click();const after=await box();
    expect(after[0]+after[2]/2).toBeCloseTo(before[0]+before[2]/2,5);expect(after[1]+after[3]/2).toBeCloseTo(before[1]+before[3]/2,5);
    await page.getByRole('button',{name:'Einpassen',exact:true}).click();
    await page.locator('.studio-workspace').screenshot({path:'work/final-studios/'+kind+'-2d.png'});
    // Selection then camera keyboard interaction must never modify the saved plan.
    await page.locator('.element-tree button').filter({has:page.locator('small').filter({hasText:kind==='memorial'?/^Naturstein$/:/^Wand$/})}).first().click();
    await page.getByRole('button',{name:'3D',exact:true}).click();const canvas=page.locator('.three-stage canvas');await expect(canvas).toBeVisible();
    await page.locator('.camera-disclosure summary').click();const turn=page.getByRole('button',{name:'Kamera nach links drehen',exact:true});await turn.focus();await page.keyboard.press('ArrowLeft');await turn.click();
    await page.getByRole('button',{name:'Vorn',exact:true}).click();await page.getByRole('button',{name:'Einpassen',exact:true}).click();await page.locator('.camera-disclosure summary').click();
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
    for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
      await page.setViewportSize(viewport);await expect(canvas).toBeVisible();
      const geometry=await page.evaluate(()=>{const model=document.querySelector('.three-canvas')!.getBoundingClientRect(),tools=document.querySelector('.three-footer')!.getBoundingClientRect();return {width:document.documentElement.scrollWidth,modelBottom:model.bottom,toolsTop:tools.top};});
      expect(geometry.width).toBeLessThanOrEqual(viewport.width+1);expect(geometry.modelBottom).toBeLessThanOrEqual(geometry.toolsTop+1);
      const caption=await page.locator('.three-caption').boundingBox(),zoomBar=await page.locator('.canvas-bottom').boundingBox();expect(caption!.y+caption!.height).toBeLessThanOrEqual(zoomBar!.y+1);
      await page.locator('.canvas-panel').screenshot({path:'work/final-studios/'+kind+'-3d-'+viewport.width+'.png'});
      if(viewport.width===375){
        await page.locator('.camera-disclosure summary').click();await expect(page.getByRole('button',{name:'Oben',exact:true})).toBeVisible();
        const bottom=await page.getByRole('button',{name:'Oben',exact:true}).boundingBox(),panel=await page.locator('.canvas-panel').boundingBox();
        expect(bottom!.y+bottom!.height).toBeLessThan(panel!.y+panel!.height);await page.locator('.camera-disclosure summary').click();
      }
      const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([]);
    }
    await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:kind==='memorial'?'Front':'Grundriss',exact:true}).click();await expect(page.locator('.revision-chip')).toHaveText(revision);
    const pdfResponse=context.waitForEvent('response',r=>r.url().includes('/export?kind=pdf'));await page.getByRole('button',{name:'Planungs-PDF',exact:true}).click();const pdfUrl=(await pdfResponse).url();const file=await page.request.get(pdfUrl);expect(file.status()).toBe(200);const bytes=await file.body();expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(4);await writeFile('work/final-studios/'+kind+'.pdf',bytes);
    await writeFile('work/final-studios/'+kind+'-result.json',JSON.stringify({project:result.project.id,variant:result.variant.id,revision:state.revision.id,sourceHash:state.revision.content_hash,pdfBytes:bytes.length,url:page.url(),errors},null,2));
    // The browser owns inline PDF viewer pages; context teardown closes them together.
  }
  expect(errors).toEqual([]);
});
