import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://ssip-cafeteria.whew.life',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            res.setHeader('Access-Control-Expose-Headers', 'Nonce, Cart-Token, *');
            const sc = proxyRes.headers['set-cookie'];
            if (sc) {
              const cookies = Array.isArray(sc) ? sc : [sc];
              const cleaned = cookies.map(c =>
                c.replace(/;\s*secure\b/gi, '')
                 .replace(/;\s*domain=[^;]+/gi, '')
                 .replace(/;\s*SameSite=[^;]+/gi, '; SameSite=Lax')
              );
              proxyRes.headers['set-cookie'] = cleaned;
              res.setHeader('set-cookie', cleaned);
              console.log('[Proxy] Rewrote cookies:', cleaned);
            }
          });
        }
      }
    }
  }
});
