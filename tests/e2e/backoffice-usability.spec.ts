import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {login} from './login.js';

const evidence='work/usability-2026-10-28/backoffice';
async function command(page:Page,name:string,payload:Record<string,unknown>){
  const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name,payload,idempotencyKey:randomUUID()}});
  expect(response.ok(),await response.text()).toBe(true);return (await response.json()).result;
}

test('Backoffice: request text survives the quote draft and mobile price errors focus the exact editable control',async({page})=>{
  await mkdir(evidence,{recursive:true});await login(page,'OFFICE');
  const marker='TEST UAT 2026-10-28 · Quellen-Nachtest '+randomUUID().slice(0,6);
  const customer=await command(page,'crm.customer.create',{name:marker+' Weber'});
  const description='Grabmal Helga Weber · dunkelgrauer Granit, 80 × 120 × 16 cm, * 1938 † 2026. Preis und Termin noch offen.';
  const inquiry=await command(page,'crm.inquiry.create',{title:marker+' Grabmal',customer_id:customer.id,description,business_unit:'memorial'});
  await page.goto('/inquiries/'+inquiry.id);
  await page.getByRole('link',{name:'Angebot aus Anfrage anlegen',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.locator('#field-title')).toHaveValue(inquiry.title);
  await expect.poll(()=>dialog.locator('#field-notes').inputValue()).toContain(description);
  await expect(dialog).toContainText('Aus Anfrage übernommen');
  await expect(dialog.getByRole('link',{name:new RegExp(inquiry.number)})).toHaveAttribute('href','/inquiries/'+inquiry.id);
  const advanced=dialog.locator('details.form-disclosure').filter({hasText:'Weitere Angaben'});
  await expect(advanced).not.toHaveAttribute('open','');
  await expect(dialog.locator('#field-service_date')).toBeHidden();await expect(dialog.locator('#field-valid_until')).toHaveValue('');
  await page.screenshot({path:evidence+'/30-anfrage-angebot-vorbelegt.png',animations:'disabled'});
  await dialog.getByRole('button',{name:'Position hinzufügen',exact:true}).click();
  await dialog.locator('#line-description-0').fill('Bestätigte synthetische QA-Leistung nach Kundenzeichnung');
  await dialog.locator('#line-quantity-0').fill('1');await dialog.locator('#line-tax-0').fill('19');
  await dialog.locator('#line-price-0').fill('2400,50');
  const saved=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/v1/commands'&&response.request().postDataJSON()?.name==='sales.quote.create');
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();const result=await (await saved).json();expect(result.ok).toBe(true);const quote=result.result;
  await expect(dialog).toBeHidden();
  const back=page.getByRole('link',{name:'Zur Kundenübersicht',exact:true});await expect(back).toHaveAttribute('href','/customers/'+customer.id);
  await back.click();await expect(page.getByRole('heading',{level:1,name:customer.name,exact:true})).toBeVisible();
  await page.screenshot({path:evidence+'/31-kundenrueckweg.png',animations:'disabled'});

  await page.setViewportSize({width:390,height:844});await page.goto('/quotes/'+quote.id);
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await expect(dialog).toBeVisible();
  await expect.poll(()=>dialog.locator('#field-notes').inputValue()).toContain(description);
  const price=dialog.locator('#line-price-0');await price.fill('2400,5,0');
  const rejected=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/v1/commands'&&response.request().postDataJSON()?.name==='sales.quote.update');
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();const rejection=await rejected;expect(rejection.status()).toBe(422);
  const failure=await rejection.json();expect(failure.error.fields['lines.0.unit_price']).toContain('2400,50');
  await expect(price).toHaveValue('2400,5,0');await expect(price).toHaveAttribute('aria-invalid','true');
  await expect(price).toHaveAccessibleDescription('Eine eindeutige Zahl eingeben, zum Beispiel 2400,50.');
  await expect(price).toBeFocused();await expect(price).toBeInViewport();
  await expect(dialog.locator('#line-error-0-unit_price')).toBeVisible();
  await page.screenshot({path:evidence+'/32-betragsfehler-mobil-mit-fokus.png',animations:'disabled'});
  expect((await new AxeBuilder({page}).include('.modal').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await price.fill('2450,50');await expect(price).toHaveAttribute('aria-invalid','false');
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();await expect(dialog).toBeHidden();
  await page.reload();await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await expect(price).toHaveValue('2450,5');
  await expect.poll(()=>dialog.locator('#field-notes').inputValue()).toContain(description);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:evidence+'/33-korrigierter-preis-gespeichert.png',animations:'disabled'});
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
});
