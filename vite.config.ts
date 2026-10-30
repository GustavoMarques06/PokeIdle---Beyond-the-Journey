import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { assetManifest } from './scripts/asset-manifest.mjs';

export default defineConfig({
  plugins: [react(), assetManifest()],
  // Caminhos relativos para funcionar empacotado (ex.: Tauri) sem servidor.
  base: './',
  build: {
    // O maior arquivo é o de dados (espécies, golpes, mundo: ~875 kB, ~120 kB com gzip),
    // que é só conteúdo e fica em cache; o código do jogo fica bem abaixo disso.
    chunkSizeWarningLimit: 950,
    rolldownOptions: {
      output: {
        // React e os dados gerados mudam pouco: ficam em arquivos próprios, que o
        // navegador mantém em cache entre versões do jogo.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 2 },
            { name: 'game-data', test: /src[\\/]game-data[\\/]generated[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
