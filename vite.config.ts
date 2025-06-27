import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          openai: ['openai'],
          ui: ['@heroicons/react']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      // Proxy for Supabase through Kong
      '/supabase-proxy': {
        target: 'http://host.docker.internal:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, '/rest'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Kong proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Kong:', req.method, req.url);
            console.log('Original headers:', req.headers);
            
            // Set headers for Kong + Supabase routing
            proxyReq.setHeader('Host', 'supabase.blufix.co.uk');
            
            // Use Kong Bearer token for authentication
            proxyReq.setHeader('Authorization', 'Bearer testauth');
            
            // Preserve Supabase API key
            if (req.headers.apikey) {
              proxyReq.setHeader('apikey', req.headers.apikey);
            }
            if (req.headers['content-type']) {
              proxyReq.setHeader('Content-Type', req.headers['content-type']);
            }
            
            console.log('Kong proxy headers set:', {
              host: proxyReq.getHeader('Host'),
              authorization: proxyReq.getHeader('Authorization'),
              apikey: proxyReq.getHeader('apikey')
            });
          });
        },
      },
      // Alternative Kong proxy
      '/kong-proxy': {
        target: 'http://kong:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kong-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Kong direct proxy error', err);
          });
        },
      }
    }
  }
})
