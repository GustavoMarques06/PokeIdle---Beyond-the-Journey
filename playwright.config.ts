// Testes de tela (e2e): abrem o jogo de verdade num Chromium sem janela, com um save pronto
// (e2e/fixtures/save.json), e conferem que as telas abrem, a batalha roda e nada some ou corta.
// Uso: npm run e2e   (o Vite sobe sozinho na porta 5199)

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
