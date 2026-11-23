import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { planningDraftOperations } from '@schubert/ai';
import { login } from './login.js';

async function command(page:Page,name:string,payload:Record<string,unknown>,row?:{id:string;version:number}){
  const response=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name,payload,id:row?.id,expectedVersion:row?.version,idempotencyKey:randomUUID()}});
  expect(response.status(),await response.text()).toBe(200);return(await response.json()).result;
}
async function openChat(page:Page){
  await page.getByRole('button',{name:'Assistent',exact:true}).click();
  const panel=page.locator('#assistant-drawer');
  await panel.getByRole('button',{name:/^Chat(?: · \d+)?$/}).click();return panel;
}
async function send(page:Page,text:string){
  const panel=page.locator('#assistant-drawer');
  await panel.getByRole('textbox',{name:'Nachricht an den Assistenten'}).fill(text);
  await panel.getByRole('button',{name:'Senden',exact:true}).click();
}

test('Stubbed companion UI keeps one conversation, labels its origins and retains optional separate page chats',async({page})=>{
  test.setTimeout(150_000);await login(page);
  const customer=await command(page,'crm.customer.create',{name:'TEST Begleiter '+randomUUID().slice(0,6)});
  await page.goto('/customers/'+customer.id);
  const calls:any[]=[];
  await page.route('**/api/v1/ai/chat',async route=>{
    calls.push(route.request().postDataJSON());
    await route.fulfill({json:{ok:true,result:{text:'Kontrollierte Begleiterantwort '+calls.length,
      toolsUsed:[{name:'find_suite_records',label:'Vorgänge in der Suite',cached:false,elapsedMs:2,resultItems:2}]}}});
  });
  const panel=await openChat(page);
  const scope = panel.locator('.conversation-picker > summary');
  await expect(scope).toHaveText('Suite-Chat');
  await expect(panel.getByRole('checkbox',{name:/Aktuelle Seite einbeziehen/})).toBeChecked();
  await send(page,'Was ist hier als Nächstes zu tun?');
  await expect(panel.getByText('Kontrollierte Begleiterantwort 1',{exact:true})).toBeVisible();
  await panel.getByText('Datenabfragen (1)',{exact:true}).click();
  await expect(panel.getByText('Vorgänge in der Suite',{exact:true})).toBeVisible();
  await expect(panel.getByText('2 Treffer im Auszug',{exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Arbeitsbereiche'}).getByRole('link',{name:'Büro',exact:true}).click();
  await expect(page).toHaveURL(/\/office$/);
  await expect(panel.getByText('Kontrollierte Begleiterantwort 1',{exact:true})).toBeVisible();
  await expect(panel.locator('.reply-origin a').first()).toHaveAttribute('href','/customers/'+customer.id);
  await send(page,'Und wie lege ich hier einen Entwurf an?');
  await expect(panel.getByText('Kontrollierte Begleiterantwort 2',{exact:true})).toBeVisible();
  expect(calls[1].context.path).toBe('office');expect(calls[1].context.scope).toBeUndefined();
  expect(calls[1].history[0].text).toContain('/customers/'+customer.id);
  await scope.click();
  await panel.getByRole('button',{name:'Separater Seitenchat',exact:true}).click();
  await expect(scope).toHaveText('Seitenchat');
  await panel.getByRole('button',{name:/^Chat(?: · \d+)?$/}).click();
  await send(page,'Eine unabhängige Frage nur für diese Seite.');
  await expect(panel.getByText('Kontrollierte Begleiterantwort 3',{exact:true})).toBeVisible();
  expect(calls[2].history).toEqual([]);
  const scopeOptions=panel.getByRole('group',{name:'Gesprächsbezug',exact:true});
  if(!await scopeOptions.isVisible())await scope.click();
  await scopeOptions.getByRole('button',{name:'Suite-Chat',exact:true}).click();
  await expect(scope).toHaveText('Suite-Chat');
  await expect(panel.getByText('Kontrollierte Begleiterantwort 2',{exact:true})).toBeVisible();
  await expect(panel.getByText('Kontrollierte Begleiterantwort 3',{exact:true})).toHaveCount(0);
  await mkdir('work/companion-reliability',{recursive:true});
  await page.screenshot({path:'work/companion-reliability/conversation-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  const audit=await new AxeBuilder({page}).include('#assistant-drawer').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({path:'work/companion-reliability/conversation-mobile.png'});
});

test('Stubbed companion UI retains an in-flight plan request and excludes private or disabled page context',async({page})=>{
  test.setTimeout(150_000);await login(page);
  const plan=await command(page,'planning.project.create',{kind:'memorial',name:'TEST Bezugsplan '+randomUUID().slice(0,6)});
  const saved=await command(page,'planning.design.change',{base_revision_id:plan.revision.id,
    operations:planningDraftOperations({snapshot:plan.revision.snapshot},{kind:'memorial_slab',label:'Teststein',widthMm:'800',heightMm:'1200',thicknessMm:'160'})},plan.variant);
  const href='/studio/'+plan.project.id+'?variant='+plan.variant.id;
  await page.goto(href);await expect(page.locator('.studio-workspace')).toBeVisible();
  let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>release=resolve),calls:any[]=[];
  await page.route('**/api/v1/ai/chat',async route=>{
    calls.push(route.request().postDataJSON());if(calls.length===1)await pending;
    await route.fulfill({json:{ok:true,result:{text:'Antwort mit gebundenem Ursprung '+calls.length}}});
  });
  const panel=await openChat(page);
  const sent=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/v1/ai/chat');
  await send(page,'Prüfe diesen Plan, ohne ihn zu ändern.');await sent;
  expect(calls[0].context.planning_work.revision_id).toBe(saved.revision.id);
  await page.getByRole('navigation',{name:'Arbeitsbereiche'}).getByRole('link',{name:'Administration',exact:true}).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(panel.getByRole('checkbox',{name:/Aktuelle Seite einbeziehen/})).toHaveCount(0);
  release();
  await expect(panel.getByText('Antwort mit gebundenem Ursprung 1',{exact:true})).toBeVisible();
  await expect(panel.locator('.reply-origin a').first()).toHaveAttribute('href',href);
  await send(page,'Welche allgemeinen Aufgaben kannst du erledigen?');
  await expect(panel.getByText('Antwort mit gebundenem Ursprung 2',{exact:true})).toBeVisible();
  expect(calls[1].context).toEqual({path:'settings',scope:'suite'});
  await panel.locator('.reply-origin a').first().click();
  await expect(page.locator('.studio-workspace')).toBeVisible();
  await page.getByRole('button',{name:'Assistent',exact:true}).click();
  await panel.getByRole('checkbox',{name:/Aktuelle Seite einbeziehen/}).uncheck();
  await send(page,'Beantworte diese Frage ohne Bezug auf die geöffnete Seite.');
  await expect(panel.getByText('Antwort mit gebundenem Ursprung 3',{exact:true})).toBeVisible();
  expect(calls[2].context).toEqual({path:'studio/'+plan.project.id,scope:'suite'});
  expect(calls).toHaveLength(3);
});
