import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const lessons = [
  { id: 'double-happiness', title: '红纸上的双喜', option: '红色笔画', cuts: 9, transfer: false },
  { id: 'butterfly', title: '一只蝴蝶的两半', option: '在蝶身接成一个孔', cuts: 5, transfer: false },
  { id: 'border-pattern', title: '连续的花边', option: '4 个', cuts: 5, transfer: false },
  { id: 'transfer-happiness', title: '喜字少一笔', option: '同时检查连接和留、剪目标', cuts: 10, transfer: true },
  { id: 'transfer-border', title: '花边断了', option: '保留图案并检查单元之间的连接', cuts: 6, transfer: true },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 })));
});

async function saved(page: Page) { await expect(page.getByText('已自动保存', { exact: true })).toBeVisible(); }
async function ready(page: Page) { await saved(page); await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/); }
async function begin(page: Page, lesson: typeof lessons[number]) {
  await page.goto('/'); await ready(page);
  if (lesson.transfer) await page.locator('.transfer-list > summary').click();
  await page.getByRole('button', { name: lesson.title, exact: true }).click();
  await page.getByRole('button', { name: '保存当前并开始' }).click();
  await expect(page.locator('.prediction-panel')).toBeVisible(); await saved(page);
}
async function projectJson(page: Page) {
  await saved(page); await page.getByRole('button', { name: '导出', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^项目文件/ }).click();
  const download = await pending;
  const project = JSON.parse(await readFile((await download.path())!, 'utf8'));
  await page.keyboard.press('Escape');
  return project;
}
async function attemptCut(page: Page) {
  const canvas = page.getByTestId('folded-canvas'); await canvas.scrollIntoViewIfNeeded();
  const points = await canvas.evaluate(node => [[80, 15], [70, 25]].map(([x, y]) => {
    const point = new DOMPoint(x, y).matrixTransform((node as SVGSVGElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  }));
  await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 6 }); await page.mouse.up();
}

for (const lesson of lessons) test(`V3 ${lesson.id}：预测旁路锁定、原生备份、留剪标记与打印模板`, async ({ page, context }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => { window.print = () => {}; });
  await begin(page, lesson);
  await expect(page.locator('.result-canvas,.paper-stats,.goal-panel,.insight-panel,.repair-panel')).toHaveCount(0);
  await expect(page.getByTestId('geometry-status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '记录预测，展开观察' })).toBeDisabled();
  for (const name of ['打印纸样', '把实验带到纸上', '撤销', '重做', '对比上一刀']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /看纸是怎样展开的/ })).toBeDisabled();
  await expect(page.locator('.history-step')).toHaveCount(lesson.cuts + 1);
  for (const button of await page.locator('.history-step').all()) await expect(button).toBeDisabled();
  await expect(page.getByRole('button', { name: '调整参数', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '重新绘制', exact: true })).toHaveCount(0);
  const before = await projectJson(page);
  expect(before.schemaVersion).toBe(1); expect(before.lessonId).toBe(lesson.id); expect(before.cuts).toHaveLength(lesson.cuts);
  await attemptCut(page); await page.keyboard.press('Control+z');
  const after = await projectJson(page);
  expect(after.cuts).toEqual(before.cuts); expect(after.cursor).toBe(before.cursor);
  await page.getByRole('button', { name: '导出', exact: true }).click();
  for (const name of [/^矢量图案/, /^A4 实剪模板/, /^导出打印文件/]) await expect(page.getByRole('button', { name })).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('先留下预测'); await page.keyboard.press('Escape');

  await page.getByRole('radio', { name: lesson.option, exact: false }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  await expect(page.getByTestId('unfolded-canvas')).toBeVisible();
  await expect(page.getByLabel('显示留 / 剪位置')).toBeChecked();
  expect(await page.getByTestId('folded-canvas').locator('.goal-marker-retained').count()).toBeGreaterThan(0);
  expect(await page.getByTestId('folded-canvas').locator('.goal-marker-removed').count()).toBeGreaterThan(0);
  expect(await page.getByTestId('unfolded-canvas').locator('.goal-marker-retained').count()).toBeGreaterThan(0);
  expect(await page.getByTestId('unfolded-canvas').locator('.goal-marker-removed').count()).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: '打印纸样', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled({ enabled: !lesson.transfer });
  const popupPending = page.waitForEvent('popup');
  await page.getByRole('button', { name: '打印纸样', exact: true }).click();
  const popup = await popupPending;
  await expect(popup.locator('body')).toContainText(before.title);
  await expect(popup.locator('body')).toContainText('100 mm 校准标尺');
  await expect(popup.locator('body')).toContainText('折叠');
  await expect(popup.locator('svg').first()).toHaveAttribute('width', '160mm');
  await expect(popup.locator('body')).toContainText(before.cuts[lesson.cuts - 1].label);
  await popup.close(); expect(errors).toEqual([]);
});

for (const lesson of lessons.filter(lesson => lesson.transfer)) test(`V3 ${lesson.id}：迁移题提示前不泄露刀号，辅助修复后完整目标通过`, async ({ page }) => {
  await begin(page, lesson);
  await page.getByRole('radio', { name: lesson.option, exact: false }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  await expect(page.locator('.diagnosis-panel')).not.toContainText(/第\s*(6|10)\s*步|减深|收窄/);
  await expect(page.locator('.hint-note,.history-warning,.insight-panel,.repair-link')).toHaveCount(0);
  await expect(page.locator('.history-track')).not.toContainText(/过深|切断连接|出现分离/);
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '比较修改建议', exact: true }).click();
  await expect(page.locator('.repair-link').first()).toBeVisible();
  await page.locator('.repair-link').first().click();
  await expect(page.getByRole('dialog')).toContainText('修改后 · 1 片');
  await page.getByRole('button', { name: '应用到设计', exact: true }).click(); await ready(page);
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled();
  const project = await projectJson(page);
  expect(project.cuts).toHaveLength(lesson.cuts);
  expect(project.events.some((event: { type: string }) => event.type === 'hint_opened')).toBe(true);
  expect(project.events.some((event: { type: string }) => event.type === 'apply_repair')).toBe(true);
});
