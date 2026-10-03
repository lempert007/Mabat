import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      // 127.0.0.1 rather than localhost: on Windows, Node resolves localhost to ::1 first, and
      // uvicorn only listens on IPv4, so every proxied request would be refused.
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Only the shared, always-needed libraries are grouped by hand. Naming a chunk for
        // three.js would put it in the entry's graph and have it preloaded, which is exactly
        // what lazily loading the viewer route is meant to avoid.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'framer-motion', 'zustand'],
        },
      },
    },
  },
});
