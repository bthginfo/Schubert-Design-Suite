import {expect,type Page,type BrowserContext} from '@playwright/test';
// Keep real authenticated sessions in worker memory. Repeated UI scenarios must
// not create a login burst or require weakening the production rate limiter.
const sessions=new Map<string,Awaited<ReturnType<BrowserContext['cookies']>>>();
export async function login(page:Page,role='OWNER',credentials?:{email:string;password:string}){
 const email=credentials?.email||process.env['TEST_'+role+'_EMAIL'],password=credentials?.password||process.env['TEST_'+role+'_PASSWORD'];
 if(!email||!password)throw Error('Synthetic role credentials missing: '+role);
 const cookies=sessions.get(email);
 if(cookies){await page.context().addCookies(cookies);await page.goto('/');if(!new URL(page.url()).pathname.startsWith('/login'))return;sessions.delete(email);}
 await page.goto('/login');await page.getByLabel('E-Mail',{exact:false}).fill(email);await page.locator('#login-password').fill(password);
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Sicher anmelden',exact:true}).click();const response=await responsePromise;
 expect(response.status(),'Real login must pass without disabling its rate limit').toBe(200);await expect(page).not.toHaveURL(/\/login/);
 sessions.set(email,await page.context().cookies());
}
