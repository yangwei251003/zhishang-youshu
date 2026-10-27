import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts/video', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, recordVideo: { dir: 'artifacts/video/raw', size: { width: 1600, height: 1000 } } });
const page = await context.newPage();
const video = page.video();
const chapters = [], start = Date.now();
async function caption(text) {
  chapters.push({ seconds: Math.round((Date.now() - start) / 1000), text });
  await page.evaluate(text => {
    let overlay = document.getElementById('demo-caption');
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'demo-caption';
      Object.assign(overlay.style, { position: 'fixed', left: '50%', bottom: '18px', transform: 'translateX(-50%)', zIndex: '10000', color: '#fff7eb', background: '#392c24ed', padding: '12px 24px', borderRadius: '3px', font: '17px Microsoft YaHei,sans-serif', pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center' });
      document.body.append(overlay);
    }
    overlay.textContent = text;
  }, text);
}
try {
  await page.goto('http://127.0.0.1:5187');
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await page.evaluate(() => document.fonts.ready);
  await caption('纸上有数 · 本地软件实际操作演示'); await page.waitForTimeout(2200);
  await page.getByRole('button', { name: /看纸是怎样展开的/ }).click();
  await caption('同一个局部剪口，经过逐层镜像形成完整图案');
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(900); await page.getByRole('button', { name: '下一步展开' }).click(); }
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '留住这一线', exact: true }).click();
  await caption('换一道结构实验：怎样保留花窗，同时让纸连成一片？'); await page.waitForTimeout(1900);
  await page.getByRole('button', { name: '保存当前并开始' }).click();
  await page.getByRole('radio', { name: /回到第二刀/ }).check();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '记录预测，展开观察' }).click();
  await expect(page.getByTestId('geometry-status')).toContainText('独立纸张');
  await caption('第二刀产生分离：3 片纸与 2 个孔洞，分别计算'); await page.waitForTimeout(2300);
  await page.getByRole('button', { name: '比较修改建议' }).click();
  await page.locator('.repair-link').first().click();
  await caption('修改原剪口前，比较纸片数、孔洞与图案面积变化'); await page.waitForTimeout(2700);
  await page.getByRole('button', { name: '应用到设计' }).click();
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await caption('重新检查所有步骤和任务目标。实物需要换纸重剪。'); await page.waitForTimeout(2400);
  await page.getByRole('button', { name: '记录本次学习', exact: true }).click();
  await page.getByRole('button', { name: '导出', exact: true }).click();
  await caption('保存项目、导出矢量图、打印实际尺寸模板与匿名记录'); await page.waitForTimeout(2400);
  await page.getByRole('dialog').getByRole('button', { name: '关闭对话框' }).click();
  await caption('几何连通不代表纸张牢固。实剪与真人试用尚待验证。'); await page.waitForTimeout(2500);
} finally {
  await context.close();
  await video.saveAs('artifacts/video/软件实际操作演示.webm');
  await browser.close();
}
await writeFile('artifacts/video/录屏说明.json', JSON.stringify({ createdAt: new Date().toISOString(), type: '自动操作实际本地软件的无声录屏', physicalValidation: 'NOT_TESTED', humanParticipants: 0, note: '字幕为录屏辅助层，不是产品界面；按钮、计算与结果均为实际运行。不可将自动演示事件当作真人试验数据。', chapters }, null, 2));
console.log('已生成 artifacts/video/软件实际操作演示.webm');
