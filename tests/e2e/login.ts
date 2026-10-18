import {expect,type Page,type BrowserContext} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Keep real authenticated sessions in worker memory. Repeated UI scenarios must
// not create a login burst or require weakening the production rate limiter.
const sessions=new Map<string,Awaited<ReturnType<BrowserContext['cookies']>>>();
async function finishLogin(page:Page){await page.waitForLoadState('networkidle');if(await page.locator('dialog.onboarding[open]').count()){await page.getByRole('button',{name:'Für später schließen',exact:true}).click();await expect(page.locator('dialog.onboarding')).toHaveCount(0);}}
export async function login(page:Page,role='OWNER',credentials?:{email:string;password:string}){
 const email=credentials?.email||process.env['TEST_'+role+'_EMAIL'],password=credentials?.password||process.env['TEST_'+role+'_PASSWORD'];
 if(!email||!password)throw Error('Synthetic role credentials missing: '+role);
 const cachePath='work/uat-sessions/'+createHash('sha256').update(email+password+(process.env.UAT_BASE_URL||'local')).digest('hex')+'.json';
 let cookies=sessions.get(email);if(!cookies)try{const saved=JSON.parse(await readFile(cachePath,'utf8'));if(Date.now()-saved.at<3600000)cookies=saved.cookies;}catch{}
 if(cookies){await page.context().addCookies(cookies);await page.goto('/');if(!new URL(page.url()).pathname.startsWith('/login')){await finishLogin(page);return;}sessions.delete(email);}
 await page.goto('/login');await page.getByLabel('E-Mail',{exact:false}).fill(email);await page.locator('#login-password').fill(password);
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Sicher anmelden',exact:true}).click();const response=await responsePromise;
 expect(response.status(),'Real login must pass without disabling its rate limit').toBe(200);await expect(page).not.toHaveURL(/\/login/);
 sessions.set(email,await page.context().cookies());
 await mkdir('work/uat-sessions',{recursive:true});await writeFile(cachePath,JSON.stringify({at:Date.now(),cookies:sessions.get(email)}),{mode:0o600});
 await finishLogin(page);
}
