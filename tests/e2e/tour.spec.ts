import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const preferenceKey = 'paperWorkshop.onboarding.v1';
async function next(page: Page) { await page.locator('.tour-card').getByRole('button', { name: '下一步', exact: true }).click(); }
async function archive(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('zhishang-youshu', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = database.transaction('projects', 'readonly').objectStore('projects').getAll();
        request.onsuccess = () => resolve(request.result.filter(v => v && typeof v === 'object'));
        request.onerror = () => reject(request.error);
      });
    } finally { database.close(); }
  });
}
async function preference(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), preferenceKey); }
async function submitPrediction(page: Page) {
  await page.getByRole('radio', { name: /2 个/ }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click();
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成');
}
async function cut(page: Page) {
  const canvas = page.getByTestId('folded-canvas'); await canvas.scrollIntoViewIfNeeded();
  const points = await canvas.evaluate(node => [[81, -60], [65, -40]].map(([x, y]) => {
    const point = new DOMPoint(x, y).matrixTransform((node as SVGSVGElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  }));
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成');
}

test('真实六步漫游完成、刷新持久与原作品及记录隔离', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  const before = await archive(page); expect(before).toHaveLength(1);
  await page.getByRole('button', { name: '跟着做一遍' }).click();
  await expect(page.locator('.tour-counter')).toContainText('1 / 6');
  await next(page);
  await expect(page.locator('.tour-card').getByRole('button', { name: '下一步', exact: true })).toBeDisabled();
  await submitPrediction(page); await next(page); await cut(page); await next(page);
  await page.getByRole('button', { name: '下一步展开', exact: true }).click();
  await next(page);
  await page.getByRole('button', { name: /回看第 1 刀/ }).click();
  await page.getByRole('button', { name: '调整参数', exact: true }).click();
  await page.getByLabel('宽度（mm）', { exact: true }).fill('18');
  await page.getByLabel('左侧位置 X（mm）').fill('62');
  await page.getByRole('button', { name: '检查并应用修改' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成'); await next(page);
  await expect(page.locator('.tour-counter')).toContainText('6 / 6');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^匿名学习记录/ }).click();
  const download = await pending;
  const records = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(records.events.length).toBeGreaterThan(3);
  expect(records.events.every((event: { origin: string }) => event.origin === 'onboarding')).toBe(true);
  expect(records.events.filter((event: { type: string }) => event.type === 'prediction_submitted')).toHaveLength(1);
  await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  expect(await archive(page)).toEqual(before);
  await page.getByRole('button', { name: '开始我的实验', exact: true }).click();
  await expect(page.locator('.tour-card')).toHaveCount(0);
  await expect(page.locator('.work-title')).toContainText('一纸，生万象');
  await expect.poll(() => preference(page)).toMatchObject({ status: 'completed' });
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  const after = await archive(page); expect(after).toHaveLength(1);
  for (const key of ['id', 'participantId', 'cuts', 'cursor', 'foldMode', 'progress', 'events']) expect(after[0][key]).toEqual(before[0][key]);
  await page.reload();
  await expect(page.getByRole('button', { name: '跟着做一遍' })).toHaveCount(0);
  await expect(page.locator('.work-title')).toContainText('一纸，生万象');
  expect(errors).toEqual([]);
});

test('键盘Tab与ShiftTab可达真实目标、Esc退出，重看保留skipped偏好', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '直接进入，不再提示', exact: true }).click();
  await expect.poll(() => preference(page)).toMatchObject({ status: 'skipped' });
  await page.reload();
  await page.getByRole('button', { name: '使用引导', exact: true }).click(); await next(page);
  const radio = page.getByRole('radio', { name: /2 个/ }); await radio.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-tour="prediction"],.tour-card'))).toBe(true);
  await page.keyboard.press('Shift+Tab'); await expect(radio).toBeFocused();
  await page.keyboard.press('Space'); await expect(radio).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tour-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '使用引导', exact: true })).toBeFocused();
  expect(await preference(page)).toMatchObject({ status: 'skipped' });
  await page.getByRole('button', { name: '使用引导', exact: true }).click();
  for (let step = 0; step < 5; step++) {
    const skip = page.getByRole('button', { name: '先看说明，跳过本步操作', exact: true });
    if (await skip.count()) await skip.click(); else await next(page);
  }
  await page.getByRole('button', { name: '开始我的实验', exact: true }).click();
  expect(await preference(page)).toMatchObject({ status: 'skipped' });
  await page.reload(); await expect(page.getByRole('button', { name: '跟着做一遍' })).toHaveCount(0);
});

test('390px漫游的预测和绘制目标不被提示卡覆盖', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: '跟着做一遍' }).click(); await next(page);
  async function checkSpace(selector: string) {
    await expect.poll(async () => {
      const target = await page.locator(selector).boundingBox(), card = await page.locator('.tour-card').boundingBox();
      return !!target && !!card && target.y >= 0 && target.y + target.height <= card.y;
    }, { message: `${selector} must be visible above the mobile guide` }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await checkSpace('[data-tour="prediction"]');
  await submitPrediction(page); await next(page);
  await checkSpace('[data-testid="folded-canvas"]');
  expect((await page.getByTestId('folded-canvas').boundingBox())!.width).toBeGreaterThanOrEqual(280);
  await page.keyboard.press('Escape');
  await expect(page.locator('.tour-card')).toHaveCount(0);
});

