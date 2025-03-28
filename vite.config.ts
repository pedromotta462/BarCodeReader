import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Configuração específica para WASM
  optimizeDeps: {
    exclude: ['@undecaf/zbar-wasm']
  },

  // Copiar arquivos WASM para pasta pública durante o build
  build: {
    assetsInlineLimit: 0, // Não inlinear arquivos grandes como WASM
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar dependências WebAssembly
          'zbar-wasm': ['@undecaf/zbar-wasm']
        }
      }
    }
  },

  // Configuração para garantir tratamento correto de arquivos WASM e BIN
  assetsInclude: ['**/*.wasm', '**/*.bin'],

  resolve: {
    alias: {
      // Ajudar Vite a encontrar arquivos WASM
      '@zbar-wasm': resolve(__dirname, 'node_modules/@undecaf/zbar-wasm/dist')
    }
  },

  // Permitir qualquer host
  server: {
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "51b6-2804-7f7-df02-948c-2595-3eaf-987b-3c9e.ngrok-free.app",
    ],
  },
});