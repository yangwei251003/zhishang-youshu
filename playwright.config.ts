import { defineConfig, devices } from '@playwright/test';
// platform.spec imports /src modules: keep the dev test host separate from production 5192.
const port = Number(process.env.PAPER_TEST_PORT || 5194);
export default defineConfig({
  testDir: './tests/e2e', timeout: 45_000, expect: { timeout: 12_000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'artifacts/e2e-results.json' }]],
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1536, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1536, height: 1000 } } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1536, height: 1000 } } },
  ],
  webServer: { command: `npm run dev -- --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI, timeout: 30_000 },
});
