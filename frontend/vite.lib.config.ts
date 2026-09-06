import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ bundleTypes: true, tsconfigPath: './tsconfig.json' })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist-lib',
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
    },
  },
});
