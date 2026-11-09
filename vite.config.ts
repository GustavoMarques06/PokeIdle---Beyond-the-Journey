import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { assetManifest } from './scripts/asset-manifest.mjs';

// Muda a cada build: é assim que o jogo aberto percebe que saiu versão nova (components/UpdateNotice.tsx).
const buildId = String(Date.now());

export default defineConfig({
  plugins: [react(), assetManifest({ buildId })],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  // Caminhos relativos para funcionar empacotado (ex.: Tauri) sem servidor.
  base: './',
  build: {
    // O maior arquivo é o de dados (721 espécies, golpes, mundo: ~990 kB, ~142 kB com gzip),
    // que é só conteúdo e fica em cache; o código do jogo fica bem abaixo disso.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      // Duas páginas: o jogo (index.html) e o guia de ajuda (ajuda.html), que abre em outra aba.
      input: { main: 'index.html', ajuda: 'ajuda.html' },
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
    // Os testes de interface montam o jogo inteiro: numa máquina ocupada, 5 s não bastam e eles falhavam à toa.
    testTimeout: 20_000,
  },
});
