import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { exclude: ['lucide-react'] },
  server: {
    host: '0.0.0.0',
    proxy: { '/api': 'http://localhost:8000' },
  },
});
