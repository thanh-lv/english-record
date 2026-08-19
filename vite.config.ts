import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Plugin inject BUILD_TIMESTAMP vào sw.js để mỗi lần build
 * có một cache name mới → SW cũ tự xóa cache → không bị blank page.
 */
function swCacheBustPlugin(): Plugin {
  const timestamp = Date.now();
  return {
    name: 'sw-cache-bust',
    // Sau khi build xong, patch sw.js trong dist/
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8');
        content = content.replace(/__BUILD_TIMESTAMP__/g, String(timestamp));
        fs.writeFileSync(swPath, content);
        console.log(`[sw-cache-bust] Cache name stamped: ${timestamp}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swCacheBustPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-s3': ['@aws-sdk/client-s3'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
