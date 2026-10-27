import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function saved(page: Page) { await expect(page.getByText('已自动保存', { exact: true })).toBeVisible(); }
async function ready(page: Page) { await saved(page); await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/); }
async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '直接进入，不再提示', exact: true }).click();
  await ready(page);
}
async function lesson(page: Page, name: string, transfer = false) {
  if (transfer && await page.locator('.transfer-list').getAttribute('open') === null) await page.locator('.transfer-list > summary').click();
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: '保存当前并开始' }).click();
  await expect(page.locator('.prediction-panel')).toBeVisible(); await saved(page);
}
async function predict(page: Page) {
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
}
async function downloadJson(page: Page, records = false) {
  await saved(page); await page.getByRole('button', { name: '导出', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: records ? /^匿名学习记录/ : /^项目文件/ }).click();
  const download = await pending;
  const result = JSON.parse(await readFile((await download.path())!, 'utf8'));
  await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  return result;
}
async function drag(page: Page, a: [number, number], b: [number, number]) {
  const canvas = page.getByTestId('folded-canvas'); await canvas.scrollIntoViewIfNeeded();
  const points = await canvas.evaluate((node, input) => input.map(([x, y]) => {
    const point = new DOMPoint(x, y).matrixTransform((node as SVGSVGElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  }), [a, b]);
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 6 }); await page.mouse.up();
}

test('V2 首访键盘跳过后刷新记住选择，重看引导退出保留旧作品与正式记录', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('button', { name: '直接进入，不再提示', exact: true });
  await expect(skip).toBeVisible(); await skip.focus(); await page.keyboard.press('Enter'); await ready(page);
  const before = await downloadJson(page);
  await page.reload(); await ready(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paperWorkshop.onboarding.v1')!).status)).toBe('skipped');
  await page.getByRole('button', { name: '使用引导', exact: true }).click();
  await expect(page.getByRole('region', { name: '实景使用引导' })).toBeVisible();
  await expect(page.locator('.work-title')).toContainText('引导练习');
  await page.keyboard.press('Escape'); await expect(page.locator('.tour-card')).toHaveCount(0); await ready(page);
  const after = await downloadJson(page);
  for (const key of ['id', 'title', 'cuts', 'cursor', 'foldMode', 'progress', 'events']) expect(after[key]).toEqual(before[key]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paperWorkshop.onboarding.v1')!).status)).toBe('skipped');
  await page.reload(); await ready(page); await expect(page.locator('.work-title')).toContainText(before.title);
});

test('V2 六课两新题预测前关闭展开、历史、打印及SVG全部正常旁路', async ({ page }) => {
  test.setTimeout(90_000); await open(page);
  const titles = ['一剪，两相映', '四面有回声', '一纸，生万象', '孔，还是一座岛', '留住这一线', '从屏幕，到手心', '折线上的相遇', '让纸重新相连'];
  for (const [index, title] of titles.entries()) {
    await test.step(title, async () => {
      await lesson(page, title, index >= 6);
      await expect(page.locator('.result-canvas')).toHaveCount(0);
      await expect(page.getByTestId('geometry-status')).toHaveCount(0);
      await expect(page.locator('.paper-stats,.goal-panel,.insight-panel,.repair-panel')).toHaveCount(0);
      for (const name of ['打印纸样', '把实验带到纸上', '撤销', '重做', '对比上一刀']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
      await expect(page.getByRole('button', { name: /看纸是怎样展开的/ })).toBeDisabled();
      for (const button of await page.locator('.history-step').all()) await expect(button).toBeDisabled();
      await expect(page.locator('.history-warning')).toHaveCount(0);
      const before = await downloadJson(page);
      await drag(page, [80, 15], [70, 25]);
      const after = await downloadJson(page); expect(after.cuts).toEqual(before.cuts); expect(after.cursor).toBe(before.cursor);
      await page.getByRole('button', { name: '导出', exact: true }).click();
      await expect(page.getByRole('button', { name: /^矢量图案/ })).toBeDisabled();
      await expect(page.getByRole('button', { name: /^A4 实剪模板/ })).toBeDisabled();
      await expect(page.getByRole('dialog')).toContainText('先留下预测');
      await page.keyboard.press('Escape');
    });
  }
});

test('V2 迁移独立观察不指认修复刀号，主动提示后才显示并记录辅助', async ({ page }) => {
  await open(page); await lesson(page, '让纸重新相连', true); await predict(page);
  await expect(page.locator('.diagnosis-panel')).not.toContainText(/第\s*2\s*步/);
  await expect(page.locator('.hint-note,.history-warning,.insight-panel')).toHaveCount(0);
  await expect(page.locator('.repair-link')).toHaveCount(0);
  await expect(page.locator('.history-track')).not.toContainText(/过深|切断连接|出现分离/);
  await page.getByRole('button', { name: '需要一点提示（记为有辅助）' }).click(); await ready(page);
  await expect(page.locator('.hint-note')).toContainText('回看第2刀');
  const records = await downloadJson(page, true);
  expect(records.events.filter((event: { type: string }) => event.type === 'hint_opened')).toHaveLength(1);
});

test('V2 第一课X77宽3未达标时定位真实毫米标记，恢复后目标同步', async ({ page }) => {
  await open(page); await lesson(page, '一剪，两相映'); await predict(page);
  await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  await page.getByLabel('左侧位置 X（mm）').fill('77'); await page.getByLabel('宽度（mm）', { exact: true }).fill('3');
  await page.getByRole('button', { name: '检查并应用修改' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await ready(page);
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /剪：标记处还没有剪到/ }).click();
  const folded = page.getByTestId('folded-canvas').locator('.goal-marker-removed');
  await expect(folded).toHaveCount(1); await expect(folded).toHaveClass(/goal-marker-focused/);
  await expect(folded).toHaveAttribute('transform', /^translate\(72 0\)/); await expect(folded).toContainText('剪1、2');
  const circleBefore = await page.getByTestId('unfolded-canvas').locator('.goal-marker-removed circle').first().boundingBox();
  await page.getByRole('button', { name: '放大作品', exact: true }).click();
  await expect.poll(async () => (await page.getByTestId('unfolded-canvas').locator('.goal-marker-removed circle').first().boundingBox())!.width).toBeCloseTo(circleBefore!.width, 0);
  await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  await page.getByLabel('左侧位置 X（mm）').fill('57'); await page.getByLabel('宽度（mm）', { exact: true }).fill('23');
  await page.getByRole('button', { name: '检查并应用修改' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await ready(page);
  await expect(page.getByRole('button', { name: /剪：标记处已剪去/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled();
});

test('V2 两次非法修改保留失败草稿和历史，一次成功后清除并导出完整事件', async ({ page }) => {
  await open(page); await lesson(page, '一剪，两相映'); await predict(page);
  const before = await downloadJson(page);
  await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  await page.getByLabel('左侧位置 X（mm）').fill('30'); await page.getByLabel('宽度（mm）', { exact: true }).fill('10');
  await page.getByRole('button', { name: '检查并应用修改' }).click();
  await expect(page.locator('.edit-error')).toContainText(/边界|纸边/); await saved(page);
  await page.getByLabel('左侧位置 X（mm）').fill('35');
  await page.getByRole('button', { name: '检查并应用修改' }).click();
  await expect(page.locator('.rejected-cut')).toHaveAttribute('d', /^M/); await saved(page);
  await page.keyboard.press('Escape'); await ready(page);
  await expect(page.locator('.rejected-feedback')).toBeVisible(); await expect(page.locator('.accessible-boundary')).toHaveCount(1);
  const rejected = await downloadJson(page); expect(rejected.cuts).toEqual(before.cuts); expect(rejected.cursor).toBe(before.cursor);
  await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  await page.getByLabel('左侧位置 X（mm）').fill('60'); await page.getByLabel('宽度（mm）', { exact: true }).fill('20');
  await page.getByRole('button', { name: '检查并应用修改' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await ready(page);
  await expect(page.locator('.rejected-cut,.rejected-feedback')).toHaveCount(0);
  const records = await downloadJson(page, true);
  expect(records.recordSchemaVersion).toBe(2);
  expect(records.events.filter((event: { type: string }) => event.type === 'cut_rejected')).toHaveLength(2);
  expect(records.events.filter((event: { type: string }) => event.type === 'cut_applied')).toHaveLength(1);
  const ids = records.events.map((event: { eventId: string }) => event.eventId); expect(new Set(ids).size).toBe(ids.length);
  expect(records.events.every((event: { origin: string }) => event.origin === 'practice')).toBe(true);
});
