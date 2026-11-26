import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import chatHandler from './api/chat.js';

// Load local environment variables for development
dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-serverless-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/chat' && req.method === 'POST') {
            let rawBody = '';
            req.on('data', chunk => {
              rawBody += chunk;
            });

            req.on('end', async () => {
              try {
                req.body = rawBody ? JSON.parse(rawBody) : {};
              } catch {
                req.body = {};
              }

              // Create Express/Vercel compatible response helper
              const mockRes = {
                statusCode: 200,
                setHeader: (name, value) => res.setHeader(name, value),
                status(code) {
                  this.statusCode = code;
                  return this;
                },
                json(data) {
                  res.statusCode = this.statusCode;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                },
                end(data) {
                  res.statusCode = this.statusCode;
                  res.end(data);
                }
              };

              try {
                await chatHandler(req, mockRes);
              } catch (err) {
                console.error('Dev Serverless Function Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Internal server error in development middleware' }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: false
  }
});
