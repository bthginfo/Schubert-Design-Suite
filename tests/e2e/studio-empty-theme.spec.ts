import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {login} from './login.js';

test('Empty memorial and room canvases remain readable and usable in light and dark mode',async({page})=>{
 test.setTimeout(180000);await login(page,'PLANNER');await mkdir('.impeccable/review',{recursive:true});
 const projects=[];
 for(const kind of ['memorial','room_plan']){
  const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{kind,name:'TEST empty-state contrast '+kind+' '+randomUUID().slice(0,6)},idempotencyKey:randomUUID()}});
  expect(response.ok()).toBe(true);projects.push({kind,...(await response.json()).result});
 }
 for(const mode of ['light','dark']){
  await page.goto('/account');await page.waitForLoadState('networkidle');await page.getByRole('radio',{name:mode==='light'?/^Hell /:/^Dunkel /}).check();await page.getByRole('radio',{name:mode==='light'?'Waldgrün':'Mintgrün',exact:true}).check();
  const save=page.getByRole('button',{name:'Darstellung speichern',exact:true});if(await save.isEnabled()){await save.click();await expect(page.locator('.appearance-settings').getByRole('status')).toContainText('gespeichert');}
  for(const project of projects){
   await page.goto('/studio/'+project.project.id+'?variant='+project.variant.id);const card=page.locator('.canvas-empty-content');await expect(card).toBeVisible();
   expect(await page.locator('.drawing-area>svg').evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(246, 247, 242)');
   expect(await card.evaluate(node=>getComputedStyle(node).backgroundColor)).toBe(mode==='light'?'rgb(255, 255, 255)':'rgb(24, 36, 55)');
   const audit=await new AxeBuilder({page}).include('.canvas-empty-content').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
   await page.screenshot({path:'.impeccable/review/empty-'+project.kind+'-'+mode+'-desktop.png'});
   if(mode==='dark'){await page.setViewportSize({width:375,height:812});await card.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);await page.screenshot({path:'.impeccable/review/empty-'+project.kind+'-'+mode+'-mobile.png'});await page.setViewportSize({width:1440,height:1000});}
   await card.getByRole('button',{name:project.kind==='memorial'?'Ersten Stein anlegen':'Raum anlegen',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  }
 }
 await page.goto('/account');await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Schubert-Standard auswählen'}).click();await page.getByRole('button',{name:'Darstellung speichern',exact:true}).click();await expect(page.locator('.appearance-settings').getByRole('status')).toContainText('gespeichert');
});
