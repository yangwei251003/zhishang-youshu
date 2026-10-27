import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts/screenshots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5187');
  await page.getByTestId('geometry-status').filter({ hasText: '纸张连成一片' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/screenshots/workshop-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/screenshots/workshop-mobile.png', fullPage: true });
  console.log(JSON.stringify({ browser: await browser.version(), desktop: 'artifacts/screenshots/workshop-desktop.png', mobile: 'artifacts/screenshots/workshop-mobile.png' }));
} finally { await browser.close(); }
