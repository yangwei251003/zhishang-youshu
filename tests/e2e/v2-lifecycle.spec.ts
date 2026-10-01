import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function records(page: Page) { await expect(page.getByText('已自动保存', { exact: true })).toBeVisible(); await page.getByRole('button', { name: '导出', exact: true }).click(); const wait = page.waitForEvent('download'); await page.getByRole('button', { name: /^匿名学习记录/ }).click(); const d = await wait; const result = JSON.parse(await readFile((await d.path())!, 'utf8')); await page.keyboard.press('Escape'); return result; }
test('同课重做与恢复保留独立attemptId，手机选择课程后收起目录', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', '{"status":"skipped","tourVersion":1}'));
  await page.goto('/'); await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '一剪，两相映', exact: true }).click(); await page.getByRole('button', { name: '保存当前并开始' }).click();
    await expect(page.locator('.prediction-panel')).toBeVisible();
    if (!i) { await page.getByRole('radio', { name: /2 个/ }).check(); await page.getByRole('button', { name: '记录预测，展开观察' }).click(); }
    await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  }
  const two = await records(page), starts = two.events.filter((e: { type: string }) => e.type === 'attempt_start');
  expect(starts).toHaveLength(2); expect(starts[0].attemptId).not.toBe(starts[1].attemptId);
  expect(two.events.find((e: { type: string }) => e.type === 'attempt_end').metadata.outcome).toBe('left');
  await page.getByRole('button', { name: '我的作品', exact: true }).click(); await page.locator('.work-list-item').nth(1).click();
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled(); await page.getByRole('button', { name: '记录本次学习', exact: true }).click();
  const resumed = await records(page); const end = resumed.events.filter((e: { type: string }) => e.type === 'attempt_end').at(-1);
  expect(end.metadata).toMatchObject({ outcome: 'completed', independent: false }); expect(end.attemptId).not.toBe(starts[0].attemptId);
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('.mobile-lessons-summary').click();
  await page.getByRole('button', { name: '四面有回声', exact: true }).click(); await page.getByRole('button', { name: '保存当前并开始' }).click();
  await expect(page.locator('.prediction-panel')).toBeVisible(); await expect(page.locator('details.lessons-section')).not.toHaveAttribute('open');
});
