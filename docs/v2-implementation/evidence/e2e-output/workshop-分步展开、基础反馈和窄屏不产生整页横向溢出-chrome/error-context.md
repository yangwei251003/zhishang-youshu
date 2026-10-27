# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workshop.spec.ts >> 分步展开、基础反馈和窄屏不产生整页横向溢出
- Location: tests\e2e\workshop.spec.ts:97:1

# Error details

```
Error: expect(locator).not.toHaveText(expected) failed

Locator: getByTestId('geometry-status')
Expected pattern: not /正在计算|等待计算/
Received string: "正在计算"
Timeout: 12000ms

Call log:
  - Expect "not toHaveText" getByTestId('geometry-status') with timeout 12000ms
  - waiting for getByTestId('geometry-status')
    27 × locator resolved to <h3 data-testid="geometry-status">正在计算</h3>
       - unexpected value "正在计算"

```

```yaml
- heading "正在计算" [level=3]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { readFile } from 'node:fs/promises';
  3   | 
  4   | test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 }))); });
  5   | 
  6   | async function ready(page: Page) {
> 7   |   await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/);
      |                                                         ^ Error: expect(locator).not.toHaveText(expected) failed
  8   |   await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  9   | }
  10  | async function dragCut(page: Page, a: [number, number], b: [number, number]) {
  11  |   const canvas = page.getByTestId('folded-canvas');
  12  |   await canvas.scrollIntoViewIfNeeded();
  13  |   const positions = await canvas.evaluate((node, points) => {
  14  |     const matrix = (node as SVGSVGElement).getScreenCTM()!;
  15  |     return points.map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y }; });
  16  |   }, [a, b]);
  17  |   await page.mouse.move(positions[0].x, positions[0].y); await page.mouse.down();
  18  |   await page.mouse.move(positions[1].x, positions[1].y, { steps: 8 }); await page.mouse.up();
  19  | }
  20  | 
  21  | test('新建、边界剪切、撤销重做、参数修改、重开与非法导入保护', async ({ page }) => {
  22  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  23  |   await page.goto('/'); await ready(page);
  24  |   await page.getByRole('button', { name: '新建', exact: true }).click();
  25  |   await page.getByLabel('作品名称').fill('浏览器流程验证');
  26  |   await page.getByRole('dialog').getByRole('combobox').selectOption('2');
  27  |   await page.getByRole('button', { name: '保存当前并新建' }).click(); await ready(page);
  28  |   await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  29  |   // 内部封闭剪口不能由剪刀进入，不应进入历史。
  30  |   await dragCut(page, [30, -10], [45, 10]);
  31  |   await expect(page.locator('.toast')).toContainText(/纸边|边界|进入/);
  32  |   await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  33  |   // 从外边向内剪入，保留一整张纸。
  34  |   await dragCut(page, [81, -18], [59, 18]);
  35  |   await expect(page.getByRole('button', { name: /回看第 1 刀/ })).toBeVisible(); await ready(page);
  36  |   await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  37  |   await expect(page.getByRole('button', { name: '4 层折叠' })).toBeDisabled();
  38  |   await page.getByRole('button', { name: '撤销', exact: true }).click(); await ready(page);
  39  |   await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  40  |   await page.getByRole('button', { name: '重做', exact: true }).click(); await ready(page);
  41  |   await page.getByRole('button', { name: /回看第 1 刀/ }).dblclick();
  42  |   await page.getByLabel('宽度（mm）', { exact: true }).fill('18');
  43  |   // 保持外端在 x=81，使修改仍从纸边进入。
  44  |   await page.getByLabel('左侧位置 X（mm）').fill('63');
  45  |   await page.getByRole('button', { name: '检查并应用修改' }).click();
  46  |   await expect(page.getByRole('dialog')).toHaveCount(0); await ready(page);
  47  |   const before = await page.getByTestId('unfolded-canvas').innerHTML();
  48  |   await page.reload(); await ready(page);
  49  |   await expect(page.locator('.work-title')).toContainText('浏览器流程验证');
  50  |   expect(await page.getByTestId('unfolded-canvas').innerHTML()).toBe(before);
  51  |   await page.getByTestId('project-import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}') });
  52  |   await expect(page.locator('.toast')).toContainText('导入失败');
  53  |   await expect(page.locator('.work-title')).toContainText('浏览器流程验证');
  54  |   expect(await page.getByTestId('unfolded-canvas').innerHTML()).toBe(before);
  55  |   expect(errors).toEqual([]);
  56  | });
  57  | 
  58  | test('预测、定位分离、比较修复、完成学习、项目导出重导入和打印', async ({ page, context }) => {
  59  |   await context.addInitScript(() => { window.print = () => {}; });
  60  |   await page.goto('/'); await ready(page);
  61  |   await page.getByRole('button', { name: '留住这一线', exact: true }).click();
  62  |   await page.getByRole('button', { name: '保存当前并开始' }).click();
  63  |   await expect(page.getByText('先留下你的预测')).toBeVisible();
  64  |   await page.getByRole('radio', { name: /回到第二刀/ }).check();
  65  |   await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  66  |   await expect(page.getByTestId('geometry-status')).toContainText('独立纸张');
  67  |   await expect(page.getByRole('button', { name: '记录本次学习', exact: true })).toBeDisabled();
  68  |   await page.getByRole('button', { name: '比较修改建议' }).click();
  69  |   await page.locator('.repair-link').first().click();
  70  |   await expect(page.getByRole('dialog')).toContainText('修改后 · 1 片');
  71  |   await page.getByRole('button', { name: '应用到设计' }).click(); await ready(page);
  72  |   await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  73  |   await page.getByRole('button', { name: '记录本次学习', exact: true }).click();
  74  |   await expect(page.getByRole('button', { name: '屏幕实验已记录' })).toBeDisabled(); await ready(page);
  75  |   await page.getByRole('button', { name: '导出', exact: true }).click();
  76  |   const downloadPromise = page.waitForEvent('download');
  77  |   await page.getByRole('button', { name: /^项目文件/ }).click();
  78  |   const download = await downloadPromise;
  79  |   const serialized = await readFile((await download.path())!, 'utf8');
  80  |   const saved = JSON.parse(serialized);
  81  |   expect(saved.progress[0].completedAt).toBeTruthy(); expect(saved.cursor).toBe(2);
  82  |   await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  83  |   await page.getByTestId('project-import').setInputFiles({ name: 'roundtrip.paper.json', mimeType: 'application/json', buffer: Buffer.from(serialized) });
  84  |   await expect(page.locator('.work-title')).toContainText('· 导入'); await ready(page);
  85  |   await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  86  |   const popupPromise = page.waitForEvent('popup');
  87  |   await page.getByRole('button', { name: '打印纸样', exact: true }).click();
  88  |   const popup = await popupPromise;
  89  |   await expect(popup.locator('body')).toContainText('100 mm');
  90  |   await expect(popup.locator('body')).toContainText('折叠');
  91  |   expect(await popup.locator('svg').first().getAttribute('width')).toBe('160mm');
  92  |   await popup.close();
  93  |   await page.getByRole('button', { name: '我的作品', exact: true }).click();
  94  |   await expect(page.locator('.work-list-item')).toHaveCount(3);
  95  | });
  96  | 
  97  | test('分步展开、基础反馈和窄屏不产生整页横向溢出', async ({ page }) => {
  98  |   await page.goto('/'); await ready(page);
  99  |   await page.getByRole('button', { name: /看纸是怎样展开的/ }).click();
  100 |   await expect(page.locator('.unfold-controls')).toContainText('折叠状态');
  101 |   for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步展开' }).click();
  102 |   await expect(page.getByRole('button', { name: '下一步展开' })).toBeDisabled();
  103 |   await page.getByRole('button', { name: '学习手册', exact: true }).click();
  104 |   await page.getByLabel('反馈展示方式').selectOption('basic');
  105 |   await page.getByRole('dialog').getByRole('button', { name: /关闭/ }).click();
  106 |   await expect(page.locator('.insight-panel')).toHaveCount(0);
  107 |   await page.setViewportSize({ width: 390, height: 844 });
```