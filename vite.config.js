import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import chatHandler from './api/chat.js';

// Load environment variables for local `npm run dev` without exposing them to the browser.
// Only variables prefixed with VITE_ are ever exposed to client code by Vite.
dotenv.config({ path: '.env.local' });
dotenv.config();

function localApiPlugin() {
  return {
    name: 'local-vercel-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        let rawBody = '';

        req.on('data', chunk => {
          rawBody += chunk;
        });

        req.on('end', async () => {
          try {
            req.body = rawBody ? JSON.parse(rawBody) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
            return;
          }

          const vercelRes = {
            statusCode: 200,
            setHeader(name, value) {
              res.setHeader(name, value);
              return this;
            },
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(payload) {
              res.statusCode = this.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
            end(data) {
              res.statusCode = this.statusCode;
              res.end(data);
            }
          };

          try {
            await chatHandler(req, vercelRes);
          } catch (err) {
            console.error('Local /api/chat middleware error:', err);
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Internal server error in local API handler.' }));
            }
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 3000
  }
});
