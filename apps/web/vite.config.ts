import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import vercelAdapter from '@sveltejs/adapter-vercel';
import nodeAdapter from '@sveltejs/adapter-node';
const adapter=process.platform==='win32'&&!process.env.VERCEL?nodeAdapter({out:'build'}):vercelAdapter({runtime:'nodejs24.x',regions:['fra1'],maxDuration:800});
export default defineConfig({
  plugins: [sveltekit({ adapter, csrf: { trustedOrigins: [] } })],
  // Personal color-scheme is set at runtime. Preserve the same native
  // light-dark() support already required by the inline appearance tokens;
  // lowered helper variables cannot follow that dynamic inline declaration.
  build: { cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5', 'ios17.5'] },
  server: { port: 5173, strictPort: true },
});
