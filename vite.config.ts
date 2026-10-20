import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleCafeteriaAuth } from './src/services/authHandler.js';

function cafeteriaAuthPlugin(): Plugin {
  return {
    name: 'cafeteria-auth-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/auth' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { username, password } = JSON.parse(body || '{}');
              const result = await handleCafeteriaAuth(username, password);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Auth internal error' }));
            }
          });
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/auth' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { username, password } = JSON.parse(body || '{}');
              const result = await handleCafeteriaAuth(username, password);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Auth internal error' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cafeteriaAuthPlugin()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
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
            }
          });
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
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
            }
          });
        }
      }
    }
  }
});
