import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
config({path:'.env.testing.local',quiet:true});
const baseURL=process.env.UAT_BASE_URL||'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(baseURL).hostname))throw new Error('Mutation UAT runs only against a local app and its synthetic development tenant.');
export default defineConfig({
  testDir:'./tests/e2e',workers:1,timeout:90000,expect:{timeout:15000},
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL,actionTimeout:15000,navigationTimeout:45000,channel:process.env.UAT_BROWSER_CHANNEL||'msedge',viewport:{width:1440,height:1000},locale:'de-DE',timezoneId:'Europe/Berlin',screenshot:'only-on-failure',trace:'retain-on-failure'},
});
