import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Try to use HTTPS in development if certificates exist
  let httpsConfig: any = false;
  
  if (mode === 'development') {
    try {
      // Check if certificates exist (you can create self-signed ones)
      const keyPath = path.resolve(__dirname, 'dev-certs/key.pem');
      const certPath = path.resolve(__dirname, 'dev-certs/cert.pem');
      
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsConfig = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        console.log('🔒 Using HTTPS for Pi SDK compatibility');
      } else {
        console.log('⚠️ HTTPS certificates not found. Pi SDK may have CORS issues.');
        console.log('Run: npm run setup:https to create development certificates');
      }
    } catch (error) {
      console.log('⚠️ Could not setup HTTPS for development');
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      https: httpsConfig,
      cors: {
        origin: [
          'http://localhost:8080',
          'https://localhost:8080',
          'http://localhost:8081', 
          'https://localhost:8081',
          'https://droplink.space',
          'https://sdk.minepi.com',
          'https://app-cdn.minepi.com',
          'https://api.minepi.com'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Opener-Policy': 'unsafe-none'
      }
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      global: 'globalThis',
    }
  };
});
