import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos para funcionar empacotado (ex.: Tauri) sem servidor.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
