import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // o catálogo (≈80 KB) entra como JSON.parse('…'), que o navegador lê mais rápido que um objeto literal
  json: { stringify: true },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    // o build da pré-renderização não precisa das fotos de public/
    copyPublicDir: !isSsrBuild,
  },
  // no build da pré-renderização tudo vai junto num arquivo só (o gsap não roda como módulo no Node)
  ssr: { noExternal: true },
}));
