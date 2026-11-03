import {createServer} from 'node:http';

// Local synthetic browser UAT against the real built application. The Node
// adapter defaults to HTTPS; this loopback wrapper supplies the actual scheme.
if(process.env.APP_ENV==='production'||process.env.VERCEL_ENV||process.env.VERCEL)throw Error('Synthetic browser server is local-only.');
const database=new URL(process.env.DATABASE_URL??''),provider=new URL(process.env.OPENAI_BASE_URL??'');
if(!['localhost','127.0.0.1'].includes(database.hostname)||!['localhost','127.0.0.1'].includes(provider.hostname)||provider.protocol!=='http:')throw Error('Browser UAT requires a local synthetic database and local provider fixture.');
const port=Number(process.env.TEST_SERVER_PORT??5186);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local test port.');
process.env.PROTOCOL_HEADER='x-forwarded-proto';
process.env.BETTER_AUTH_URL='http://127.0.0.1:'+port;
for(const key of ['VERCEL_TOKEN','DATABASE_MIGRATION_URL','APP_DB_PASSWORD'])delete process.env[key];
const {handler}=await import('../apps/web/build/handler.js');
createServer((request,response)=>{request.headers['x-forwarded-proto']='http';handler(request,response);}).listen(port,'127.0.0.1',()=>console.log('Built application, synthetic browser UAT: http://127.0.0.1:'+port));
