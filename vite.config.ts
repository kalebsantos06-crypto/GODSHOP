import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'date-fns',
      'sonner',
      '@supabase/supabase-js'
    ],
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
  server: {
    hmr: false,
  },
});
