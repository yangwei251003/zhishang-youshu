// 只读测量：定位首页留白与三栏高度来源。不修改项目任何文件。
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');

const URL = process.env.TARGET_URL || 'http://127.0.0.1:5192/';
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { channel: 'chrome' }),
  headless: true,
});

async function probe(width, height, tag) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.site-header').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);

  const out = await page.evaluate(() => {
    const h = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return Math.round(r.height);
    };
    const children = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return [...el.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { cls: (c.className || c.tagName).toString().slice(0, 42), h: Math.round(r.height) };
      });
    };
    const body = document.querySelector('.workbench-body');
    const bodyRect = body ? body.getBoundingClientRect() : null;
    // 中栏「最后一块内容」到栏底的距离
    const cw = document.querySelector('.canvas-workspace');
    let midLastBottom = null;
    if (cw) {
      let maxB = 0;
      [...cw.children].forEach((c) => { const r = c.getBoundingClientRect(); maxB = Math.max(maxB, r.bottom); });
      midLastBottom = Math.round(bodyRect.bottom - maxB);
    }
    const lr = document.querySelector('.left-rail');
    let leftLastBottom = null;
    if (lr) {
      let maxB = 0;
      [...lr.children].forEach((c) => { const r = c.getBoundingClientRect(); maxB = Math.max(maxB, r.bottom); });
      leftLastBottom = Math.round(bodyRect.bottom - maxB);
    }
    const rr = document.querySelector('.right-rail');
    let rightLastBottom = null;
    if (rr) {
      let maxB = 0;
      [...rr.children].forEach((c) => { const r = c.getBoundingClientRect(); maxB = Math.max(maxB, r.bottom); });
      rightLastBottom = Math.round(bodyRect.bottom - maxB);
    }
    return {
      bodyHeight: h('.workbench-body'),
      workbenchHeight: h('.workbench'),
      left: h('.left-rail'), mid: h('.canvas-workspace'), right: h('.right-rail'),
      midBlank: midLastBottom, leftBlank: leftLastBottom, rightBlank: rightLastBottom,
      midChildren: children('.canvas-workspace'),
      rightChildren: children('.right-rail'),
      leftChildren: children('.left-rail'),
      bodyMinH: body ? getComputedStyle(body).minHeight : null,
      bodyAlign: body ? getComputedStyle(body).alignItems : null,
      bodyRows: body ? getComputedStyle(body).gridTemplateRows : null,
      wbMinH: (() => { const w = document.querySelector('.workbench'); return w ? getComputedStyle(w).minHeight : null; })(),
      railHelpMarginTop: (() => { const el = document.querySelector('.rail-help'); return el ? getComputedStyle(el).marginTop : null; })(),
      scrollHeight: Math.round(document.documentElement.scrollHeight),
      header: h('.site-header'),
    };
  });
  await page.close();
  return { tag, width, height, ...out };
}

const r1 = await probe(1600, 900, 'desktop-1600');
console.log(JSON.stringify(r1, null, 2));

await browser.close();
