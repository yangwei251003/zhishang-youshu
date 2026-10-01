import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 }))); });

async function ready(page: Page) {
  await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/);
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
}
async function dragCut(page: Page, a: [number, number], b: [number, number]) {
  const canvas = page.getByTestId('folded-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const positions = await canvas.evaluate((node, points) => {
    const matrix = (node as SVGSVGElement).getScreenCTM()!;
    return points.map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y }; });
  }, [a, b]);
  await page.mouse.move(positions[0].x, positions[0].y); await page.mouse.down();
  await page.mouse.move(positions[1].x, positions[1].y, { steps: 8 }); await page.mouse.up();
}

test('新建、边界剪切、撤销重做、参数修改、重开与非法导入保护', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: '新建', exact: true }).click();
  await page.getByLabel('作品名称').fill('浏览器流程验证');
  await page.getByRole('dialog').getByRole('combobox').selectOption('2');
  await page.getByRole('button', { name: '保存当前并新建' }).click(); await ready(page);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  // 内部封闭剪口不能由剪刀进入，不应进入历史。
  await dragCut(page, [30, -10], [45, 10]);
  await expect(page.locator('.toast')).toContainText(/纸边|边界|进入/);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  // 从外边向内剪入，保留一整张纸。
  await dragCut(page, [81, -18], [59, 18]);
  await expect(page.getByRole('button', { name: /回看第 1 刀/ })).toBeVisible(); await ready(page);
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await expect(page.getByRole('button', { name: '4 层折叠' })).toBeDisabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click(); await expect(page.locator('.save-label')).toContainText('正在保存'); await ready(page);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '重做', exact: true }).click(); await ready(page);
  await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  await page.getByLabel('宽度（mm）', { exact: true }).fill('18');
  // 保持外端在 x=81，使修改仍从纸边进入。
  await page.getByLabel('左侧位置 X（mm）').fill('63');
  await page.getByRole('button', { name: '检查并应用修改' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await ready(page);
  const before = await page.getByTestId('unfolded-canvas').innerHTML();
  await page.reload(); await ready(page);
  await expect(page.locator('.work-title')).toContainText('浏览器流程验证');
  expect(await page.getByTestId('unfolded-canvas').innerHTML()).toBe(before);
  await page.getByTestId('project-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}') });
  await expect(page.locator('.toast')).toContainText('导入失败');
  await expect(page.locator('.work-title')).toContainText('浏览器流程验证');
  expect(await page.getByTestId('unfolded-canvas').innerHTML()).toBe(before);
  expect(errors).toEqual([]);
});

test('预测、定位分离、比较修复、完成学习、项目导出重导入和打印', async ({ page, context }) => {
  await context.addInitScript(() => { window.print = () => {}; });
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: '留住这一线', exact: true }).click();
  await page.getByRole('button', { name: '保存当前并开始' }).click();
  await expect(page.getByText('先留下你的预测')).toBeVisible();
  await page.getByRole('radio', { name: /回到第二刀/ }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  await expect(page.getByTestId('geometry-status')).toContainText('独立纸张');
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '比较修改建议' }).click();
  await page.locator('.repair-link').first().click();
  await expect(page.getByRole('dialog')).toContainText('修改后 · 1 片');
  await page.getByRole('button', { name: '应用到设计' }).click(); await ready(page);
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await page.getByRole('button', { name: '记录本次学习', exact: true }).click();
  await expect(page.getByRole('button', { name: '屏幕实验已记录' })).toBeDisabled(); await ready(page);
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^项目文件/ }).click();
  const download = await downloadPromise;
  const serialized = await readFile((await download.path())!, 'utf8');
  const saved = JSON.parse(serialized);
  expect(saved.progress[0].completedAt).toBeTruthy(); expect(saved.cursor).toBe(2);
  await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  await page.getByTestId('project-import').setInputFiles({ name: 'roundtrip.paper.json', mimeType: 'application/json', buffer: Buffer.from(serialized) });
  await expect(page.locator('.work-title')).toContainText('· 导入'); await ready(page);
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '打印纸样', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.locator('body')).toContainText('100 mm');
  await expect(popup.locator('body')).toContainText('折叠');
  expect(await popup.locator('svg').first().getAttribute('width')).toBe('160mm');
  await popup.close();
  await page.getByRole('button', { name: '我的作品', exact: true }).click();
  await expect(page.locator('.work-list-item')).toHaveCount(3);
});

test('分步展开、基础反馈和窄屏不产生整页横向溢出', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: /看纸是怎样展开的/ }).click();
  await expect(page.locator('.unfold-controls')).toContainText('折叠状态');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步展开' }).click();
  await expect(page.getByRole('button', { name: '下一步展开' })).toBeDisabled();
  await page.getByRole('button', { name: '工坊指南', exact: true }).click();
  await page.getByRole('tab', { name: '动手指南', exact: true }).click();
  await page.getByLabel('反馈展示方式').selectOption('basic');
  await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  await expect(page.locator('.insight-panel')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('重做同课重新预测，新的匿名参与者与旧记录分开', async ({ page }) => {
  await page.goto('/'); await ready(page);
  async function openLesson() {
    await page.getByRole('button', { name: '一剪，两相映', exact: true }).click();
    await page.getByRole('button', { name: '保存当前并开始' }).click();
    await expect(page.getByText('先留下你的预测')).toBeVisible();
  }
  await openLesson();
  await page.getByRole('radio', { name: /2 个/ }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  await page.getByRole('button', { name: '记录本次学习', exact: true }).click(); await ready(page);
  await openLesson();
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '工坊指南', exact: true }).click();
  await page.getByRole('tab', { name: '动手指南', exact: true }).click();
  const prior = (await page.getByRole('dialog').innerText()).match(/参与编号：(anon-[\w-]+)/)?.[1];
  expect(prior).toBeTruthy();
  await page.getByRole('button', { name: '开始新的匿名参与记录', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '工坊指南', exact: true }).click();
  await page.getByRole('tab', { name: '动手指南', exact: true }).click();
  const next = (await page.getByRole('dialog').innerText()).match(/参与编号：(anon-[\w-]+)/)?.[1];
  expect(next).toBeTruthy(); expect(next).not.toBe(prior);
  await expect(page.getByRole('dialog')).toContainText('本作品记录 2 次操作');
});

test('计算线程失败不能沿用旧版通过结果记录成绩', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      postMessage(message: unknown) {
        if ((window as unknown as { failGeometry: boolean }).failGeometry) {
          queueMicrotask(() => this.dispatchEvent(new Event('error'))); return;
        }
        super.postMessage(message);
      }
    };
  });
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: '一剪，两相映', exact: true }).click();
  await page.getByRole('button', { name: '保存当前并开始' }).click();
  await page.getByRole('radio', { name: /2 个/ }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled();
  await page.evaluate(() => { (window as unknown as { failGeometry: boolean }).failGeometry = true; });
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('几何计算未完成');
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '打印纸样', exact: true })).toBeDisabled();
  await page.evaluate(() => { (window as unknown as { failGeometry: boolean }).failGeometry = false; });
  await page.getByRole('button', { name: '重做', exact: true }).click(); await ready(page);
  await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeEnabled();
});
