import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = resolve(root, 'artifacts/print-samples');
const items = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1250 } });
const report = [];
try {
  for (const item of items) {
    await page.setContent(await readFile(resolve(folder, `${item.id}.html`), 'utf8'));
    await page.emulateMedia({ media: 'print' });
    const result = await page.evaluate(() => {
      const ruler = document.querySelector('.ruler').getBoundingClientRect();
      const pattern = document.querySelector('.pattern svg').getBoundingClientRect();
      return { rulerCssPx: ruler.width, patternCssPx: pattern.width, horizontalOverflow: document.querySelector('.page').scrollWidth > document.querySelector('.page').clientWidth + 1 };
    });
    if (Math.abs(result.rulerCssPx - 100 * 96 / 25.4) > 1 || result.horizontalOverflow) throw new Error(`${item.id} 打印布局不匹配: ${JSON.stringify(result)}`);
    const pdf = await page.pdf({ path: resolve(folder, `${item.id}.pdf`), format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    const pageCount = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
    if (pageCount !== 2) throw new Error(`${item.id} 输出${pageCount}页，应为2页，请检查溢出`);
    report.push({ id: item.id, pdfPages: pageCount, ...result, printerMeasured: false });
  }
  await page.setContent(await readFile(resolve(folder, 'flower.html'), 'utf8'));
  await page.emulateMedia({ media: 'screen' });
  await mkdir(resolve(root, 'artifacts/screenshots'), { recursive: true });
  await page.locator('.page').first().screenshot({ path: resolve(root, 'artifacts/screenshots/print-flower.png') });
  await writeFile(resolve(folder, 'print-layout-checks.json'), JSON.stringify(report, null, 2));
  console.log(`${report.length}份A4 PDF，各2页，数字布局与100mm标尺校验通过；未连接打印机。`);
} finally { await browser.close(); }
