// 只读测量二：导航激活态 + 移动端头部。不修改项目任何文件。
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');

const URL = process.env.TARGET_URL || 'http://127.0.0.1:5192/';
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { channel: 'chrome' }),
  headless: true,
});

const navState = (page) => page.evaluate(() => {
  const nav = document.querySelector('.main-nav');
  return [...nav.querySelectorAll('button')].map((b) => ({
    label: b.textContent.trim().slice(0, 8),
    cls: b.className || '(none)',
    ariaCurrent: b.getAttribute('aria-current'),
    hasDot: !!b.querySelector('.nav-dot'),
  }));
});

// 首屏会被 V3 新手引导弹层挡住，先记录它再关掉
async function dismissOnboarding(page) {
  const info = await page.evaluate(() => {
    const bd = document.querySelector('.dialog-backdrop');
    if (!bd) return null;
    const h = bd.querySelector('.dialog-header h2');
    return {
      present: true,
      title: h ? h.textContent.trim() : null,
      buttons: [...bd.querySelectorAll('button')].map((b) => b.textContent.trim().slice(0, 14)).filter(Boolean).slice(0, 12),
    };
  });
  if (!info) return null;
  // 优先找"跳过/暂不/关闭"
  const skip = page.locator('.dialog-backdrop button').filter({ hasText: /跳过|暂不|关闭|以后|直接/ }).first();
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(500); }
  if (await page.locator('.dialog-backdrop').count()) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
  const stillBlocking = await page.locator('.dialog-backdrop').count();
  return { ...info, stillBlocking };
}

// —— 桌面：导航激活态 ——
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.site-header').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
  const onboarding = await dismissOnboarding(page);
  await page.waitForTimeout(600);
  const onWorkshop = await navState(page);
  // 切到灵感库
  await page.getByRole('button', { name: '剪纸灵感库' }).click();
  await page.waitForTimeout(900);
  const onInspiration = await navState(page);
  const libVisible = await page.evaluate(() => {
    const lib = document.querySelector('.inspiration-library');
    const main = document.querySelector('main');
    return { libRendered: !!lib, libHeight: lib ? Math.round(lib.getBoundingClientRect().height) : 0, mainHidden: main ? main.hasAttribute('hidden') : null };
  });
  // 打开"我的作品"弹窗
  await page.getByRole('button', { name: '我的作品' }).click();
  await page.waitForTimeout(700);
  const onWorksModal = await navState(page);
  const dialogTitle = await page.evaluate(() => { const d = document.querySelector('.dialog-header h2'); return d ? d.textContent.trim() : null; });
  console.log('=== NAV ===');
  console.log(JSON.stringify({ onboarding, onWorkshop, onInspiration, libVisible, onWorksModal, dialogTitle }, null, 2));
  await page.close();
}

// —— 移动端：头部高度与折行 ——
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.site-header').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
  const mobile = await page.evaluate(() => {
    const hdr = document.querySelector('.site-header');
    const r = hdr.getBoundingClientRect();
    const kids = [...hdr.children].map((c) => ({ cls: (c.className || c.tagName).toString().slice(0, 30), h: Math.round(c.getBoundingClientRect().height) }));
    return {
      headerHeight: Math.round(r.height),
      viewportH: window.innerHeight,
      pct: Math.round((r.height / window.innerHeight) * 100),
      kids,
      docScrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      navWraps: (() => { const n = document.querySelector('.main-nav'); return n ? Math.round(n.getBoundingClientRect().height) : 0; })(),
    };
  });
  console.log('=== MOBILE ===');
  console.log(JSON.stringify(mobile, null, 2));
  await page.close();
}

await browser.close();
