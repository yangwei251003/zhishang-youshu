import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 }));
    localStorage.setItem('paperWorkshop.apprentice.v1', JSON.stringify({ status: 'dismissed', tasks: {}, version: 3 }));
  });
});

async function library(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '剪纸灵感库', exact: true }).click();
  const section = page.locator('.inspiration-library');
  await expect(section.getByRole('heading', { name: /剪纸灵感库/ })).toBeVisible();
  return section;
}

test('灵感库五类十段均有标题作者来源，首屏不创建播放器或外部请求', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) externalRequests.push(request.url()); });
  const section = await library(page);
  await expect(section.locator('.real-cut-video')).toHaveCount(10);
  await expect(section.locator('iframe')).toHaveCount(0);
  for (const card of await section.locator('.real-cut-video').all()) {
    await expect(card.getByRole('heading')).not.toBeEmpty();
    await expect(card.locator('.real-cut-byline')).toContainText('作者：');
    await expect(card.getByRole('link', { name: 'B 站原视频' })).toHaveAttribute('href', /^https:\/\/www\.bilibili\.com\/video\/BV[\w]+\/$/);
  }
  for (const name of ['雪花', '团花', '喜字', '动物', '花边']) {
    await section.getByRole('navigation', { name: '剪纸视频分类' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await expect(section.locator('.inspiration-category')).toHaveCount(1);
    await expect(section.locator('.real-cut-video')).toHaveCount(2);
  }
  expect(externalRequests).toEqual([]);
});

test('只有点击才挂载静音不自动播放的官方播放器，收起后卸载', async ({ page }) => {
  const playerRequests: string[] = [];
  // The platform is stubbed here; actual decoding is independently recorded in media-playback.json.
  await page.route('https://player.bilibili.com/**', route => {
    playerRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<html lang="zh-CN"><body>播放器测试替身</body></html>' });
  });
  const section = await library(page);
  await expect(section.locator('iframe')).toHaveCount(0);
  const card = section.locator('.real-cut-video').first();
  await card.getByRole('button', { name: /^打开视频：/ }).focus();
  await page.keyboard.press('Enter');
  const frame = card.locator('iframe');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('title', /雪花/);
  const url = new URL((await frame.getAttribute('src'))!);
  expect(url.origin).toBe('https://player.bilibili.com');
  expect(url.searchParams.get('autoplay')).toBe('0');
  expect(url.searchParams.get('muted')).toBe('1');
  expect(url.searchParams.get('danmaku')).toBe('0');
  expect(await frame.getAttribute('allow')).not.toContain('autoplay');
  await expect.poll(() => playerRequests.length).toBe(1);
  await card.getByRole('button', { name: '收起视频', exact: true }).click();
  await expect(section.locator('iframe')).toHaveCount(0);
});

test('离线信号卸载播放器、显示本地三步提示，来源与练习仍可用', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://player.bilibili.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>播放器测试替身</body></html>' }));
  const section = await library(page);
  await section.locator('.real-cut-video').first().getByRole('button', { name: /^打开视频：/ }).click();
  await expect(section.locator('iframe')).toHaveCount(1);
  // This is a deterministic offline-event regression, not the separate real-network core-workflow check.
  await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { value: false, configurable: true }); window.dispatchEvent(new Event('offline')); });
  await expect(section.locator('iframe')).toHaveCount(0);
  await expect(section.locator('.real-cut-offline-steps')).toHaveCount(10);
  await expect(section.locator('.real-cut-status').first()).toContainText('当前离线');
  await expect(section.locator('.real-cut-video').first().getByRole('button', { name: /^离线：/ })).toBeDisabled();
  await expect(section.getByRole('link', { name: 'B 站原视频' })).toHaveCount(10);
  await expect(section.getByRole('button', { name: '来屏幕上试一试' })).toHaveCount(5);
  await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }); window.dispatchEvent(new Event('online')); });
  await expect(section.locator('.real-cut-video').first().getByRole('button', { name: /^打开视频：/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('每一类都有实际课程入口，手机灵感库无水平溢出', async ({ page }) => {
  const destinations = [['雪花', '四面有回声'], ['团花', '一纸，生万象'], ['喜字', '红纸上的双喜'], ['动物', '一只蝴蝶的两半'], ['花边', '连续的花边']];
  await library(page);
  for (const [category, title] of destinations) {
    const section = page.locator('.inspiration-library');
    await section.getByRole('navigation', { name: '剪纸视频分类' }).getByRole('button', { name: new RegExp(`^${category}`) }).click();
    await section.getByRole('button', { name: '来屏幕上试一试' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '剪纸灵感库', exact: true }).click();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.inspiration-library')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
