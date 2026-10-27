import { expect, test, type Page, type Locator } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const evidence = process.env.PAPER_EVIDENCE_DIR || 'docs/v3-implementation/evidence';
test.beforeAll(() => mkdir(evidence,{recursive:true}).then(() => undefined));
const key = 'paperWorkshop.apprentice.v1';
const next = (page: Page) => page.locator('.tour-card').getByRole('button', { name: '下一步', exact: true }).click();
async function clearOfCard(page: Page, target: Locator) {
  await expect.poll(async () => {
    const a = await target.boundingBox(), b = await page.locator('.tour-card').boundingBox();
    return !!a && !!b && (a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  }).toBe(true);
}
async function begin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '纸上第一课 · 完整七任务', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一张说明' }).click();
  await page.getByRole('button', { name: '认识了，开始第一课' }).click();
  await expect(page.locator('.tour-counter')).toContainText('2 / 9');
}
async function predict(page: Page) {
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click();
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成');
}
async function cut(page: Page) {
  const points = await page.getByTestId('folded-canvas').evaluate(node => [[81, -60], [65, -40]].map(([x,y]) => {
    const p = new DOMPoint(x,y).matrixTransform((node as SVGSVGElement).getScreenCTM()!); return {x:p.x,y:p.y};
  }));
  await page.mouse.move(points[0].x,points[0].y); await page.mouse.down(); await page.mouse.move(points[1].x,points[1].y,{steps:6}); await page.mouse.up();
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成');
}
for (const width of [1100, 1280]) test(`V3 ${width}px 七任务真实完成、参数及修复弹窗避让、正式作品隔离`, async ({ page }) => {
  test.setTimeout(90_000); await page.setViewportSize({width,height:800});
  await begin(page); await clearOfCard(page,page.locator('[data-tour="prediction"]'));
  await page.screenshot({path:`${evidence}/after-guide-prediction-${width}.png`});
  await predict(page); await next(page); await clearOfCard(page,page.getByTestId('folded-canvas')); await cut(page); await next(page);
  await page.getByRole('button',{name:'下一步展开',exact:true}).click(); await next(page);
  await page.getByRole('button',{name:/回看第 1 刀/}).click(); await page.getByRole('button',{name:'调整参数',exact:true}).click();
  await clearOfCard(page,page.getByRole('dialog')); await page.getByLabel('宽度（mm）',{exact:true}).fill('18'); await page.getByLabel('左侧位置 X（mm）').fill('62');
  await page.getByRole('button',{name:'检查并应用修改'}).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await next(page);
  await expect(page.getByTestId('geometry-status')).toContainText('3 片');
  await page.getByRole('button',{name:/第 2 步出现分离/}).click(); await next(page);
  await page.getByRole('button',{name:'比较修改建议'}).click(); await page.locator('.repair-link').first().click();
  await clearOfCard(page,page.getByRole('dialog')); await page.screenshot({path:`${evidence}/after-guide-repair-${width}.png`}); await page.getByRole('button',{name:'应用到设计'}).click();
  await expect(page.locator('.tour-state')).toContainText('本步操作已完成'); await next(page);
  await expect(page.locator('.prediction-panel')).toBeVisible(); await predict(page); await next(page);
  await page.getByRole('button',{name:'导出',exact:true}).click();
  const download = page.waitForEvent('download'); await page.getByRole('button',{name:/^导出打印文件/}).click(); expect((await download).suggestedFilename()).toMatch(/\.html$/);
  await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).status,key)).toBe('graduated');
  expect(await page.evaluate(k => Object.keys(JSON.parse(localStorage.getItem(k)!).tasks).length,key)).toBe(7);
  await page.getByRole('button',{name:'开始我的实验',exact:true}).click(); await expect(page.locator('.work-title')).toContainText('一纸，生万象');
  await page.reload(); await expect(page.getByRole('button',{name:/已出徒/})).toBeVisible();
  await page.screenshot({path:`${evidence}/after-graduated-${width}.png`});
});

test('V3 任务进度断点续导与跳过刷新，不把练习当作正式记录', async ({page}) => {
  await begin(page); await predict(page); await page.keyboard.press('Escape'); await expect(page.getByText('已自动保存',{exact:true})).toBeVisible(); await page.reload();
  await page.getByRole('button',{name:'纸上第一课',exact:true}).click(); await expect(page.locator('.tour-counter')).toContainText('3 / 9');
  await expect(page.locator('.tour-card').getByRole('button',{name:'下一步',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape'); const tasks = page.getByRole('region',{name:'纸上第一课',exact:true});
  await tasks.locator('.apprentice-summary').click(); await tasks.getByRole('button',{name:'跳过全部，直接探索'}).click(); await expect(page.getByText('已自动保存',{exact:true})).toBeVisible(); await page.reload();
  await expect(page.locator('.apprentice-summary')).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).status,key)).toBe('dismissed');
});

for (const width of [1440,390,360]) test(`V3 ${width}px 预测文字可见并可点击`, async ({page}) => {
  await page.setViewportSize({width,height:844}); await begin(page); await clearOfCard(page,page.locator('[data-tour="prediction"]')); await predict(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('V3 200% 等效 CSS 视口 720×450 的预测、参数滚动、Esc与减少动态', async ({page}) => {
  test.setTimeout(90_000); await page.setViewportSize({width:720,height:450}); await page.emulateMedia({reducedMotion:'reduce'});
  await begin(page); await predict(page); await next(page);
  await page.locator('.tour-card').getByRole('button',{name:'先看说明，跳过本步操作',exact:true}).click();
  await page.getByRole('button',{name:'下一步展开',exact:true}).click();
  const animations = await page.locator('.mirror-growth').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).animationName));
  expect(animations.every(name => name === 'none')).toBe(true); await next(page);
  await page.getByRole('button',{name:/回看第 1 刀/}).click(); await page.getByRole('button',{name:'调整参数',exact:true}).click();
  await clearOfCard(page,page.getByRole('dialog')); await page.getByLabel('宽度（mm）',{exact:true}).fill('18'); await page.getByLabel('左侧位置 X（mm）').fill('62');
  await page.getByRole('button',{name:'检查并应用修改'}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({path:`${evidence}/after-guide-200-percent-equivalent.png`});
  await page.keyboard.press('Escape'); await expect(page.locator('.tour-card')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
