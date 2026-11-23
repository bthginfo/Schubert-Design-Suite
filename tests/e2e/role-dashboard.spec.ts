import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {login} from './login.js';

for(const [role,label,pathname] of [
  ['DISPATCHER','Einsatzplan öffnen','/dispatch'],
  ['WORKSHOP','Zur Zeiterfassung','/time'],
  ['TAXADVISOR','Auswertungen öffnen','/reports'],
  ['TECHADMIN','Verarbeitung prüfen','/jobs'],
]){
  test(role+' opens the actual primary workspace from the daily overview',async({page})=>{
    await login(page,role);
    const action=page.locator('.dashboard-heading').getByRole('link',{name:label,exact:true});
    await action.click();
    await expect(page).toHaveURL(url=>url.pathname===pathname);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByText('Dieser Bereich ist nicht freigegeben.',{exact:true})).toHaveCount(0);
  });
}

test('saved order views use the applied customer filter and remain distinct while typing',async({page})=>{
  await login(page,'OFFICE');
  const [first,second]=[randomUUID(),randomUUID()];
  for(const [id,name] of [[first,'Auswahl Eins'],[second,'Auswahl Zwei']]){
    await page.goto('/orders?customer_id='+id);
    await page.locator('.record-filter-toggle').click();
    await page.getByText('Aktuelle Filter als Ansicht speichern',{exact:true}).click();
    await page.getByLabel('Name der Ansicht').fill(name!);
    await page.getByRole('button',{name:'Ansicht speichern',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:name!})).toBeVisible();
  }
  const views=page.locator('[aria-label="Gespeicherte Ansichten"]');
  await expect(views.getByRole('link',{name:'Auswahl Zwei'})).toHaveAttribute('aria-current','true');
  await expect(views.getByRole('link',{name:'Auswahl Eins'})).not.toHaveAttribute('aria-current');
  await page.locator('#record-search').fill('noch nicht angewendet');
  await expect(views.getByRole('link',{name:'Auswahl Zwei'})).toHaveAttribute('aria-current','true');
  await views.getByRole('link',{name:'Auswahl Eins'}).click();
  await expect(page).toHaveURL(url=>url.searchParams.get('customer_id')===first);
  await expect(views.getByRole('link',{name:'Auswahl Eins'})).toHaveAttribute('aria-current','true');
});

test('A customer signs into the separate project portal, posts a message and closes the session',async({page,browser})=>{
  await login(page,'OWNER');
  const origin=new URL(page.url()).origin;
  const command=async(name:string,payload:Record<string,unknown>)=>{
    const response=await page.request.post('/api/v1/commands',{headers:{origin},data:{name,payload,idempotencyKey:randomUUID()}});
    expect(response.status()).toBe(200);return (await response.json()).result;
  };
  const company=await command('crm.customer.create',{name:'TEST Kundenportal '+randomUUID()});
  const password=randomUUID()+randomUUID();
  const access=await command('portal.access.create',{customer_id:company.id,contact_name:'Testkontakt',password,identity_assurance:'shared_access'});
  const external=await browser.newContext({viewport:{width:390,height:844}});
  try{
    const client=await external.newPage();
    await client.goto(access.url);
    await client.getByLabel('Portalpasswort').fill(password);
    await client.getByRole('button',{name:'Projektbereich öffnen'}).click();
    const message='TEST · Bitte um Rückmeldung zum Aufmaß '+randomUUID().slice(0,8);
    await client.getByLabel('Ihr Name').fill('Testkontakt');
    await client.getByLabel('Nachricht oder Änderungswunsch').fill(message);
    await client.getByRole('button',{name:'Nachricht senden'}).click();
    await expect(client.locator('.portal-message').getByText(message,{exact:true})).toBeVisible();
    await client.reload();
    await expect(client.locator('.portal-message').getByText(message,{exact:true})).toBeVisible();
    const otherPassword=randomUUID();
    const other=await command('portal.access.create',{customer_id:company.id,contact_name:'Zweiter Testkontakt',password:otherPassword,identity_assurance:'individual_session'});
    const second=await external.newPage();
    await second.goto(other.url);
    await expect(second.getByLabel('Portalpasswort')).toBeVisible();
    await expect(second.locator('.portal-message')).toHaveCount(0);
    await second.getByLabel('Portalpasswort').fill(otherPassword);
    await second.getByRole('button',{name:'Projektbereich öffnen'}).click();
    await expect(second.getByLabel('Nachricht oder Änderungswunsch')).toBeVisible();
    await client.getByLabel('Ihr Name').fill('Testkontakt');
    await client.getByLabel('Nachricht oder Änderungswunsch').fill('TEST · Falsche Zuordnung verhindern');
    await client.getByRole('button',{name:'Nachricht senden'}).click();
    await expect(client.getByRole('alert')).toContainText('anderer Portalzugang');
    await second.getByRole('button',{name:'Zugang schließen'}).click();
    await expect(second.getByLabel('Portalpasswort')).toBeVisible();
    await client.reload();
    await expect(client.getByLabel('Portalpasswort')).toBeVisible();
    await expect(client.locator('.portal-message')).toHaveCount(0);
  }finally{await external.close();}
});
