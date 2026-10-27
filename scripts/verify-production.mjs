import './check-contrast.mjs';
import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const checks = [];
const port = Number(process.env.PAPER_PORT || 5192);
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => { window.print = () => {}; });
    const external = [], failures = [], errors = [], consoleErrors = [], requests = new Set();
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { external.push(url.href); return route.abort(); }
      requests.add(url.pathname); return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failures.push(request.url()));
    const response = await page.goto(`http://127.0.0.1:${port}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-security-policy'], /font-src 'self' data:/);
    await expect(page.locator('.site-footer')).toContainText('v0.4.0');
    await page.getByRole('button', { name: '直接进入，不再提示' }).click();
    await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
    await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(page.locator('.workspace-meta')).toContainText('04');
    await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.workspace-meta')).toContainText('04');
    await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
    await page.getByRole('button', { name: '重做', exact: true }).click();
    await expect(page.locator('.workspace-meta')).toContainText('05');
    await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出', exact: true }).click();
    await page.getByRole('button', { name: /^矢量图案/ }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.svg$/);
    assert.equal(await download.failure(), null);
    await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
    await page.locator('.transfer-list > summary').click();
    await page.getByRole('button', { name: '让纸重新相连', exact: true }).click();
    await page.getByRole('button', { name: '保存当前并开始' }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '记录预测，展开观察' }).click();
    await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
    const popupWait = page.waitForEvent('popup');
    await page.getByRole('button', { name: '打印纸样', exact: true }).click();
    const popup = await popupWait;
    await expect(popup.locator('body')).toContainText('100 mm');
    await expect(popup.locator('body')).not.toContainText('首次产生分离');
    await popup.close();
    assert.deepEqual(external, []); assert.deepEqual(failures, []); assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, [], '生产控制台必须零错误');
    assert.ok([...requests].some(path => /worker.*\.js/.test(path)), '生产计算 Worker 必须实际加载');
    assert.ok([...requests].some(path => /\.woff2$/.test(path)), '打包本地字体必须实际加载');
    checks.push({ channel, version: await browser.version(), appVersion: '0.4.0', status: 'PASS', externalRequests: external.length, failedRequests: failures.length, scriptErrors: errors.length, consoleErrors: consoleErrors.length, localResourceCount: requests.size, checks: ['production CSP', 'zero console errors', 'Worker', 'local fonts', 'undo/redo', 'IndexedDB reload', 'SVG download', 'external network blocked', 'transfer print withholds causal step before hint'], buildAssets: [...requests].filter(path => /\.(js|css)$/.test(path)) });
  } finally { await browser.close(); }
}
await mkdir('docs/v4-implementation/evidence', { recursive: true });
await writeFile('docs/v4-implementation/evidence/production-checks.json', JSON.stringify({ date: new Date().toISOString(), note: '阻断所有非本机HTTP请求；未拔除网线，未验证真实打印机。', checks }, null, 2));
console.log(JSON.stringify(checks));
