import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import vercelAdapter from '@sveltejs/adapter-vercel';
import nodeAdapter from '@sveltejs/adapter-node';
const adapter=process.platform==='win32'&&!process.env.VERCEL?nodeAdapter({out:'build'}):vercelAdapter({runtime:'nodejs24.x',regions:['fra1'],maxDuration:800});
export default defineConfig({ plugins: [sveltekit({ adapter, csrf: { trustedOrigins: [] } })], server: { port: 5173, strictPort: true } });
