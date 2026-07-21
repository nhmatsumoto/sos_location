import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  // WebGL via SwiftShader: contextos simultâneos degradam picking/FPS.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    // Evita que animações do MapLibre monopolizem o SwiftShader no ambiente
    // headless; a posição final e os eventos funcionais continuam validados.
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  },
  reporter: [['list']],
});
