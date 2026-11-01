import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Painel do Robson (/painel/): build separado, depois do build do site, gravando dentro do mesmo dist/.
// Separado para não mexer no JS do site (sem pedaços em comum, o carregamento do site fica como está).
export default defineConfig({
  plugins: [react()],
  json: { stringify: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: false, // o site já está no dist/
    copyPublicDir: false, // as fotos e as fontes já foram copiadas pelo build do site
    rollupOptions: { input: { painel: 'painel/index.html' } },
  },
});
