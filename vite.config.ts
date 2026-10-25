import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // o catálogo (≈80 KB) entra como JSON.parse('…'), que o navegador lê mais rápido que um objeto literal
  json: { stringify: true },
  build: { target: 'es2020', cssCodeSplit: false },
});
