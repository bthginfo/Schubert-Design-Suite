import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { mkdir,writeFile } from 'node:fs/promises';

const unique='UAT '+new Date().toISOString().slice(0,10)+' '+randomUUID().slice(0,8);
const authenticated=new Map<string,Awaited<ReturnType<BrowserContext['cookies']>>>();
async function navigate(page:Page,path:string){await page.goto(path);await page.waitForLoadState('networkidle');}
async function login(page:Page,role='OWNER',credentials?:{email:string;password:string}){
  const email=credentials?.email||process.env[`TEST_${role}_EMAIL`],password=credentials?.password||process.env[`TEST_${role}_PASSWORD`];
  if(!email||!password)throw Error('Synthetic role credentials missing: '+role);
  const cookies=authenticated.get(email);
  if(cookies){await page.context().addCookies(cookies);await navigate(page,'/');if(!page.url().endsWith('/login'))return;authenticated.delete(email);}
  await navigate(page,'/login');
  await page.getByLabel('E-Mail', {exact:false}).fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button',{name:'Sicher anmelden',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login/);
  authenticated.set(email,await page.context().cookies());
}
async function createInquiry(page:Page,title:string){
  await navigate(page,'/inquiries');await page.getByRole('button',{name:'Anfrage anlegen',exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Vorhaben *',{exact:true}).fill(title);
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('link',{name:title,exact:true}).first().click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
}

test('Customer: required fields, invalid email, Unicode, country and persisted record',async({page})=>{
  await login(page);await navigate(page,'/customers');await page.getByRole('button',{name:'Kunde anlegen',exact:true}).first().click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(dialog).toBeVisible();
  await dialog.locator('#field-name').fill(unique+' Müller & Söhne');
  await dialog.locator('#field-email').fill('keine-adresse');await dialog.getByRole('button',{name:'Speichern',exact:true}).click();await expect(dialog).toBeVisible();
  await dialog.locator('#field-email').fill('uat@example.invalid');
  await dialog.locator('#field-party_type').selectOption('organization');
  await dialog.locator('#field-country').selectOption({label:'Deutschland'});
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();await expect(dialog).toBeHidden();
  await page.getByRole('link',{name:unique+' Müller & Söhne',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:unique+' Müller & Söhne',exact:true})).toBeVisible();
  await page.reload();await page.waitForLoadState('networkidle');await expect(page.getByRole('heading',{name:unique+' Müller & Söhne',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await expect(page.locator('#field-country')).toHaveValue('DE');
});

test('Inquiry: invalid draft can be resumed or discarded without losing the saved version',async({page})=>{
  await login(page);const title=unique+' Badplanung';await createInquiry(page,title);
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();const dialog=page.getByRole('dialog');
  await dialog.locator('#field-title').fill('');await page.keyboard.press('Escape');
  await expect(dialog.getByRole('heading',{name:'Ungespeicherte Eingaben',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Weiter bearbeiten',exact:true}).click();await expect(dialog.locator('#field-title')).toHaveValue('');
  await page.keyboard.press('Escape');await dialog.getByRole('button',{name:'Ungespeicherte Eingaben verwerfen',exact:true}).click();
  await expect(dialog).toBeHidden();await page.reload();await page.waitForLoadState('networkidle');await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await dialog.locator('#field-title').fill(title+' geändert');
  await expect(dialog.getByText('Vom Server bestätigt gespeichert',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Rückgängig',exact:true}).click();await expect(dialog.locator('#field-title')).toHaveValue(title);
  await expect(dialog.getByText('Letztes Autospeichern nachvollziehbar zurückgenommen',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Schließen',exact:true}).last().click();await page.reload();await page.waitForLoadState('networkidle');await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
});

test('Unsaved new forms protect browser back navigation and can be deliberately discarded',async({page})=>{
  await login(page);await navigate(page,'/customers');await page.getByRole('link',{name:'Anfragen',exact:true}).click();
  await page.getByRole('button',{name:'Anfrage anlegen',exact:true}).first().click();const dialog=page.getByRole('dialog');
  await dialog.locator('#field-title').fill(unique+' nicht speichern');
  await page.goBack();await expect(dialog.getByRole('heading',{name:'Ungespeicherte Eingaben',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Weiter bearbeiten',exact:true}).click();await expect(page).toHaveURL(/\/inquiries/);await expect(dialog.locator('#field-title')).toHaveValue(unique+' nicht speichern');
  await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await dialog.getByRole('button',{name:'Ungespeicherte Eingaben verwerfen',exact:true}).click();await expect(dialog).toBeHidden();
  await expect(page.getByRole('link',{name:unique+' nicht speichern',exact:true})).toHaveCount(0);
});

test('Reference pickers exclude erased customers and keep all workflow filters available',async({page})=>{
  await login(page);await navigate(page,'/inquiries');
  await expect(page.locator('#record-status option')).toContainText(['Alle Status','Neu','In Klärung','In Planung']);
  await page.getByRole('button',{name:'Anfrage anlegen',exact:true}).first().click();
  await expect(page.getByRole('dialog').locator('#field-customer_id')).not.toContainText('Entferntes Geschäftspartnerprofil');
});

test('Quote: comma amounts and unselected options survive save and reopening',async({page})=>{
  await login(page);await navigate(page,'/quotes');await page.getByRole('button',{name:'Angebot anlegen',exact:true}).first().click();const dialog=page.getByRole('dialog');
  await dialog.locator('#field-title').fill(unique+' Angebot');
  const customer=dialog.locator('#field-customer_id');const option=await customer.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value).find(Boolean));expect(option).toBeTruthy();await customer.selectOption(option!);
  for(let i=0;i<2;i++){
    await dialog.getByRole('button',{name:'Position hinzufügen',exact:true}).click();
    await dialog.locator('#line-description-'+i).fill(i?'Zusätzliche Pflege · optional':'Naturstein einschließlich Zuschnitt');
    await dialog.locator('#line-quantity-'+i).fill(i?'1':'2,5');await dialog.locator('#line-price-'+i).fill(i?'100':'12,50');await dialog.locator('#line-tax-'+i).fill('19');
  }
  const optional=dialog.locator('.line-item').nth(1);await optional.getByLabel('Optionale Position',{exact:true}).check();await optional.getByLabel('In ausgewähltem Umfang enthalten',{exact:true}).uncheck();
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();await expect(dialog).toBeHidden();
  await page.getByRole('link',{name:unique+' Angebot',exact:true}).first().click();await expect(page.getByText(/31,25/).first()).toBeVisible();
  await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await expect(dialog.locator('#line-quantity-0')).toHaveValue('2,5');await expect(dialog.locator('#line-price-0')).toHaveValue('12,5');await expect(dialog.locator('.line-item').nth(1).getByLabel('In ausgewähltem Umfang enthalten',{exact:true})).not.toBeChecked();
});

test('Desktop and mobile regressions: no viewport overflow and no automated WCAG violations',async({page})=>{
  await login(page);
  for(const width of [1440,375])for(const path of ['/studio','/documents','/time','/sales-prices']){
    await page.setViewportSize({width,height:1000});await navigate(page,path);await page.getByRole('heading',{level:1}).waitFor();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth),path+' at '+width).toBeLessThanOrEqual(width+1);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations,path+' at '+width).toEqual([]);
  }
});

test('Form UX: optional accordions, keyboard operation, inline error and narrow layout',async({page})=>{
  await login(page);await navigate(page,'/customers');await page.getByRole('button',{name:'Kunde anlegen',exact:true}).first().click();
  const dialog=page.getByRole('dialog'),accounting=dialog.locator('details').filter({has:page.locator('summary').filter({hasText:'Abrechnung'})});
  await expect(accounting).not.toHaveAttribute('open');
  await dialog.locator('#field-name').fill(unique+' Formularprüfung');
  await accounting.locator('summary').focus();await page.keyboard.press('Enter');await expect(accounting).toHaveAttribute('open');
  await dialog.locator('#field-payment_days').fill('-1');await accounting.locator('summary').click();
  await dialog.getByRole('button',{name:'Speichern',exact:true}).click();
  await expect(accounting).toHaveAttribute('open');await expect(dialog.locator('#field-payment_days')).toHaveAttribute('aria-invalid','true');await expect(dialog.locator('#field-payment_days')).toBeFocused();
  await dialog.locator('#field-payment_days').fill('14');
  await expect(dialog.locator('#field-payment_days')).toHaveAttribute('aria-invalid','false');
  for(const width of [1440,720,375]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([]);
    await expect(dialog.getByRole('button',{name:'Speichern',exact:true})).toBeInViewport();
  }
  await page.setViewportSize({width:1440,height:1000});await mkdir('work/uat-screenshots',{recursive:true});await page.screenshot({path:'work/uat-screenshots/form-desktop.png'});
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:'work/uat-screenshots/form-mobile.png'});
  await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await dialog.getByRole('button',{name:'Ungespeicherte Eingaben verwerfen',exact:true}).click();
  await navigate(page,'/time?date=2026-02-31');await expect(page.locator('#time-day')).not.toHaveValue('');await expect(page.locator('#time-day')).not.toHaveValue('2026-02-31');
});

test('Employee access: finance pages and direct finance commands stay blocked',async({page})=>{
  await login(page,'EMPLOYEE');await navigate(page,'/time');await expect(page.getByRole('heading',{name:'Meine Arbeitszeit',exact:true})).toBeVisible();
  const result=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'billing.invoice.create',idempotencyKey:randomUUID(),payload:{title:'Unzulässiger UAT-Zugriff'}}});expect([403,404]).toContain(result.status());expect((await result.json()).error.code).toBe('FORBIDDEN');
  await navigate(page,'/invoices');await expect(page.getByRole('button',{name:'Rechnung anlegen',exact:true})).toHaveCount(0);await expect(page.locator('main')).toContainText(/Berechtigung|Zugriff|verfügbar/);
});

test('Employee mobile: offline work, pause and finish sync once connection returns',async({page,context})=>{
  await login(page);
  const reauth=await page.request.post('/api/v1/reauth',{headers:{origin:new URL(page.url()).origin},data:{password:process.env.TEST_OWNER_PASSWORD}});
  expect(reauth.ok()).toBeTruthy();
  const credentials={email:'uat.'+randomUUID()+'@example.invalid',password:randomUUID()+randomUUID()};
  const command=async(name:string,payload:unknown)=>{const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name,payload,idempotencyKey:randomUUID()}});const body=await response.json();expect(response.ok(),body.error?.message).toBeTruthy();return body.result;};
  const user=await command('administration.user.create',{...credentials,name:unique+' Offline-Prüfung',role:'Employee'});
  await command('workforce.employee.create',{name:unique+' Offline-Prüfung',user_id:user.user_id,employment_start:'2026-01-01',weekly_hours:'40',work_pattern:'[8,8,8,8,8,0,0]',holiday_region:'DE-BY'});
  await page.request.post('/api/auth/sign-out',{headers:{origin:new URL(page.url()).origin}});
  await page.setViewportSize({width:375,height:812});await login(page,'EMPLOYEE',credentials);await navigate(page,'/time');
  await expect(page.getByRole('button',{name:'Arbeit starten',exact:true})).toBeEnabled();
  await context.setOffline(true);
  try{
    await page.getByRole('button',{name:'Arbeit starten',exact:true}).click();await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Weiterarbeiten',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Weiterarbeiten',exact:true}).click();await page.getByRole('button',{name:'Feierabend',exact:true}).click();
    // A second local session must wait for the first session's pending finish.
    await page.getByRole('button',{name:'Arbeit starten',exact:true}).click();await page.getByRole('button',{name:'Feierabend',exact:true}).click();
    await expect(page.getByRole('button',{name:'Arbeit starten',exact:true})).toBeVisible();
  }finally{await context.setOffline(false);}
  await page.getByRole('button',{name:'Synchronisieren',exact:true}).click();
  await expect(page.getByText('Keine ausstehenden Übertragungen. Bestätigte Zeiten und genehmigte Klärungen sind im Serverbestand gespeichert.',{exact:true})).toBeVisible();
  await page.reload();await page.waitForLoadState('networkidle');await expect(page.getByRole('button',{name:'Arbeit starten',exact:true})).toBeVisible();
});

for(const kind of ['Raum','Stele'])test('Studio '+kind+': saved geometry, views, readable controls, real PDF and BOM',async({page,context})=>{
  await login(page,'PLANNER');await navigate(page,'/studio');
  await page.getByRole('link',{name:new RegExp('Synthetische Studio-QA '+kind+' ')}).click();
  await expect(page.locator('.studio-workspace')).toBeVisible();
  const svg=page.locator('svg[role="application"]');await expect(svg).toBeVisible();
  const revision=await page.locator('.revision-chip').innerText();const original=await svg.getAttribute('viewBox');
  await page.getByRole('button',{name:'Vergrößern',exact:true}).click();await expect(svg).not.toHaveAttribute('viewBox',original!);
  await page.getByRole('button',{name:'Einpassen',exact:true}).click();await expect(svg).toHaveAttribute('viewBox',original!);
  await page.getByRole('button',{name:'3D',exact:true}).click();await expect(page.locator('.three-stage canvas')).toBeVisible({timeout:45000});
  await page.locator('.camera-disclosure summary').click();
  await page.getByRole('button',{name:'Kamera nach links drehen',exact:true}).click();
  await page.getByRole('button',{name:'Front',exact:true}).click();await expect(svg).toBeVisible();
  await expect(page.locator('.revision-chip')).toHaveText(revision);
  const responsePromise=context.waitForEvent('response',response=>response.url().includes('/export?kind=pdf'));
  await page.getByRole('button',{name:'Planungs-PDF',exact:true}).click();const response=await responsePromise;expect(response.status()).toBe(200);
  // Chromium hands inline PDF navigations to its viewer, which owns the original response body.
  const originalFile=await page.request.get(response.url());expect(originalFile.status()).toBe(200);
  const pdf=await originalFile.body();expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0);
  await mkdir('work/uat-pdfs',{recursive:true});await writeFile('work/uat-pdfs/'+kind+'.pdf',pdf);
  await page.getByRole('button',{name:'Stückliste',exact:true}).click();await expect(page.getByRole('heading',{name:'Stück- und Bearbeitungsliste',exact:true})).toBeVisible();expect(await page.locator('.bom-panel tbody tr').count()).toBeGreaterThan(0);
  for(const width of [1440,375]){
    await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(a11y.violations).toEqual([]);
  }
});
