import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {login} from './login.js';

test('Companion → actual API → actual plan read → SDK transport → rendered answer',async({page})=>{
  test.skip(process.env.UAT_AI_TOOL_PROVIDER!=='synthetic-local','Requires the explicitly configured loopback SDK transport; never spend real API funds from browser UAT.');
  await login(page,'OWNER');
  const created=await page.request.post('/api/v1/commands',{headers:{origin:new URL(page.url()).origin},data:{name:'planning.project.create',payload:{name:'TEST AI Fachabfrage '+randomUUID().slice(0,8),kind:'memorial'},idempotencyKey:randomUUID()}});
  expect(created.status()).toBe(200);const plan=(await created.json()).result;
  await page.goto('/studio/'+plan.project.id+'?variant='+plan.variant.id);
  await expect(page.locator('.studio-workspace')).toBeVisible();
  await page.getByRole('button',{name:'Assistent',exact:true}).click();const panel=page.locator('#assistant-drawer');await panel.getByRole('button',{name:'Chat',exact:true}).click();
  await panel.locator('#assistant-message').fill('TEST Transport: Bitte prüfe den aktuellen gespeicherten Planstand. '+randomUUID());
  const returned=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/ai/chat'&&r.request().method()==='POST');
  await panel.getByRole('button',{name:'Senden',exact:true}).click();const result=await returned;
  expect(result.status()).toBe(200);const body=(await result.json()).result;
  expect(body.toolsUsed).toHaveLength(1);expect(body.toolsUsed[0].name).toBe('inspect_current_plan');expect(Number(body.actualCost)).toBeGreaterThan(0);
  await expect(panel).toContainText('Der gespeicherte Plan wurde berechnet.');
  await expect(panel).toContainText('Dies ist keine technische Freigabe.');
  expect(body.proposal).toBeNull();
});
