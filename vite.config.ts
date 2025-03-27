import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configuração para WebAssembly
  optimizeDeps: {
    exclude: ['zbar.wasm']
  },
  
  // Configuração para tratamento de arquivos binários
  assetsInclude: ['**/*.wasm', '**/*.bin'],
  
  // Habilitar suporte a WebAssembly
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: ['zbar.wasm']
        }
      }
    }
  },
  
  // Resolver caminhos para importação
  resolve: {
    alias: {
      'zbar.wasm': 'zbar.wasm/dist'
    }
  }
})