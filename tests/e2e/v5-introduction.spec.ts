import { test, expect, type Page } from '@playwright/test';

const film = '/videos/workshop-intro.mp4';
async function skip(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '直接进入，不再提示', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function audio(page: Page) {
  return page.evaluate(async () => { const path = '/src/audio/player.ts'; return (await import(path)).audioState(); });
}

test('首访两种入口不抢先加载影片，收回后启动漫游并保留侧栏入口', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: '先看短片', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '跟着做一遍', exact: true })).toBeVisible();
  expect(requests).not.toContain(film);
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '跟着做一遍', exact: true }).click();
  await expect(page.locator('.intro-dock-flight')).toBeVisible();
  await expect(page.locator('.intro-dock-flight')).toHaveCount(0);
  await expect(page.locator('.tour-counter')).toContainText('1 / 6');
  await expect(page.locator('[data-film-dock]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.work-title')).toContainText('一纸，生万象');
  await page.reload();
  await expect(page.locator('.welcome-backdrop')).toHaveCount(0);
  expect(requests).not.toContain(film);
});

test('真实短片可解码、有中文轨道，离开停止播放并可从侧栏重播', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '先看短片', exact: true }).click();
  const video = page.getByLabel('纸上有数工坊介绍短片');
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.1);
  const metadata = await video.evaluate((node: HTMLVideoElement) => ({ width: node.videoWidth, height: node.videoHeight, duration: node.duration, controls: node.controls, inline: node.playsInline, tracks: node.textTracks.length }));
  expect(metadata.width).toBe(1920); expect(metadata.height).toBe(1080);
  expect(metadata.duration).toBeGreaterThan(60); expect(metadata.duration).toBeLessThan(160);
  expect(metadata.controls && metadata.inline).toBe(true); expect(metadata.tracks).toBe(1);
  await video.evaluate((node: HTMLVideoElement) => { node.currentTime = 20; });
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThanOrEqual(20);
  await page.getByRole('button', { name: '跟着做一遍', exact: true }).click();
  await expect(page.locator('.tour-counter')).toContainText('1 / 6');
  await expect(page.locator('video')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '观看工坊介绍短片', exact: true }).click();
  await expect(page.getByRole('tab', { name: '认识工坊', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThanOrEqual(20);
  await page.getByRole('button', { name: '从头播放', exact: true }).click();
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeLessThan(3);
  await page.getByRole('tab', { name: '我们的团队', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('指南保留操作说明与五人分工，键盘切页及关闭焦点正确', async ({ page }) => {
  await skip(page);
  const entry = page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '工坊指南', exact: true });
  await entry.click();
  const about = page.getByRole('tab', { name: '认识工坊', exact: true });
  await about.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '动手指南', exact: true })).toBeFocused();
  await expect(page.getByLabel('反馈展示方式')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出匿名记录', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('0.01 mm');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: '我们的团队', exact: true })).toBeFocused();
  await expect(page.locator('.guide-team-list article')).toHaveCount(5);
  await expect(page.locator('.guide-team-list')).toContainText('队长 · 项目负责人');
  const close = page.getByRole('button', { name: '关闭对话框', exact: true });
  await close.focus(); await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => {
    const node = document.activeElement as HTMLElement;
    return !!node.closest('[role="dialog"]') && !node.closest('[hidden]') && node.getClientRects().length > 0;
  })).toBe(true);
  await page.keyboard.press('Escape'); await expect(entry).toBeFocused();
});

test('短片与站内轻音乐互斥，保留音乐偏好并且不擅自恢复', async ({ page }) => {
  await skip(page);
  await page.getByRole('button', { name: '工坊设置', exact: true }).click();
  await page.getByRole('tab', { name: '声音', exact: true }).click();
  await page.getByRole('button', { name: '开启轻音乐', exact: true }).click();
  await expect.poll(async () => (await audio(page)).playing).toBe(true);
  const before = await audio(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '观看工坊介绍短片', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.1);
  const state = await audio(page);
  expect(state.playing).toBe(false); expect(state.music).toBe(before.music); expect(state.trackId).toBe(before.trackId);
  await page.keyboard.press('Escape'); expect((await audio(page)).playing).toBe(false);
});

test('媒体失败时仍可读文字和进入漫游', async ({ page }) => {
  await page.route('**/videos/workshop-intro.mp4', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/'); await page.getByRole('button', { name: '先看短片', exact: true }).click();
  await expect(page.locator('.film-fallback')).toBeVisible();
  await page.locator('.film-transcript summary').click();
  await expect(page.locator('.film-transcript[open]')).toContainText('纸上有数');
  await page.getByRole('button', { name: '跟着做一遍', exact: true }).click();
  await expect(page.locator('.tour-counter')).toContainText('1 / 6');
});

test('减少动态效果和缺失动画接口都能顺利进入', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await page.getByRole('button', { name: '跟着做一遍', exact: true }).click();
  await expect(page.locator('.tour-counter')).toContainText('1 / 6');
  await expect(page.locator('.intro-dock-flight')).toHaveCount(0);
  const second = await page.context().browser()!.newContext();
  try {
    await second.addInitScript(() => { Object.defineProperty(Element.prototype, 'animate', { value: undefined, configurable: true }); });
    const noAnimation = await second.newPage(); await noAnimation.goto(page.url());
    await noAnimation.getByRole('button', { name: '跟着做一遍', exact: true }).click();
    await expect(noAnimation.locator('.tour-counter')).toContainText('1 / 6');
  } finally { await second.close(); }
});

test('360像素首访和指南内容无横向溢出，字幕与封面能够加载', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto('/');
  await expect(page.getByRole('button', { name: '先看短片', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '跟着做一遍', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: '直接进入，不再提示', exact: true }).click();
  await page.getByRole('button', { name: '工坊指南', exact: true }).click();
  for (const name of ['认识工坊', '动手指南', '我们的团队']) {
    await page.getByRole('tab', { name, exact: true }).click();
    expect(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
  const captions = await request.get('/videos/workshop-intro.vtt');
  expect(captions.ok()).toBe(true); expect(captions.headers()['content-type']).toContain('text/vtt');
  expect(await captions.text()).toMatch(/^WEBVTT/);
  const poster = await request.get('/videos/workshop-poster.jpg');
  expect(poster.ok()).toBe(true); expect(poster.headers()['content-type']).toContain('image/jpeg');
});
