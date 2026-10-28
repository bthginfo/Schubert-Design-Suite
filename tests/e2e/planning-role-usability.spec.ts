import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {login} from './login.js';

for (const role of ['OFFICE','EMPLOYEE']) for (const kind of ['memorial','room_plan']) {
  test(`${role}: create, edit and reopen ${kind} using the visible studio flow`,async({page})=>{
    if(role==='EMPLOYEE')await page.setViewportSize({width:390,height:844});
    await login(page,role);
    await page.goto('/studio');
    const name=`TEST UX 28.10.2026 ${role} ${kind} ${randomUUID().slice(0,6)}`;
    await page.getByRole('heading',{name:'Was möchten Sie planen?',exact:true}).waitFor();
    if(kind==='room_plan')await page.getByRole('button',{name:'Raum & Naturstein Aufmaß, Bauteile & Material',exact:true}).click();
    await page.getByRole('textbox',{name:'Projektname',exact:true}).fill(name);
    await page.getByRole('button',{name:'Planung beginnen',exact:true}).click();
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Grundmaße erfassen',exact:true}).click();
    const dialog=page.getByRole('dialog');
    const fields=kind==='memorial'?[['Breite (mm)','600'],['Höhe (mm)','900'],['Materialstärke (mm)','120']]:[['Lichte Raumbreite (mm)','3000'],['Lichte Raumtiefe (mm)','2400'],['Raumhöhe (mm)','2500'],['Wandstärke ohne Belag (mm)','115']];
    for(const [label,value]of fields)await dialog.getByRole('textbox',{name:label,exact:true}).fill(value);
    await dialog.getByRole('button',{name:'In den Plan übernehmen',exact:true}).click();
    await expect(dialog).toBeHidden();
    const closeProperties=page.getByRole('button',{name:'Eigenschaften schließen',exact:true});
    if(await closeProperties.isVisible())await closeProperties.click();
    await page.getByRole('combobox',{name:'Maßeinheit',exact:true}).selectOption('m');
    if(kind==='room_plan'){
      await page.locator('#studio-properties-toggle').click();
      await expect(page.locator('.selection-move')).not.toContainText('isabled}');
      await expect(page.getByRole('textbox',{name:'Auswahlversatz X (m)',exact:true})).toBeVisible();
      await page.getByRole('textbox',{name:'Auswahlversatz X (m)',exact:true}).fill('0,1');
      await page.getByRole('button',{name:'Gesamte Auswahl versetzen',exact:true}).click();
      await closeProperties.click();
    }
    if(await page.getByRole('button',{name:'Speichern',exact:true}).isEnabled())await page.getByRole('button',{name:'Speichern',exact:true}).click();
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
    await page.reload();
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Speichern',exact:true})).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1);
    const audit=await new AxeBuilder({page}).include('.studio-root.workbench').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await mkdir('work/usability-role-planning-2026-10-28/browser',{recursive:true});
    await page.screenshot({path:`work/usability-role-planning-2026-10-28/browser/${role}-${kind}.png`,animations:'disabled'});
  });
}
