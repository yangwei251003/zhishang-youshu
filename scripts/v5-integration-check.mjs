import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = `http://127.0.0.1:${process.env.PAPER_PORT || 5192}`;
const out = 'docs/v5-video/evidence';
await fs.mkdir(out, { recursive: true });
const results = [];
async function screenshot(page, path) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path });
}
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  const errors = [], failedRequests = [], externalRequests = [], scenes = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) { externalRequests.push(url.href); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), reason: request.failure()?.errorText ?? 'unknown' }));
    await page.goto(base);
    await expect(page.locator('.welcome-choices')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await screenshot(page, `${out}/${channel}-welcome.png`);
    await page.getByRole('button', { name: '先看短片', exact: true }).click();
    const video = page.getByLabel('纸上有数工坊介绍短片');
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(.2);
    const media = await video.evaluate(async v => {
      v.currentTime = 32;
      await new Promise(resolve => v.addEventListener('seeked', resolve, { once: true }));
      v.pause();
      return { width: v.videoWidth, height: v.videoHeight, duration: v.duration, decoded: v.getVideoPlaybackQuality().totalVideoFrames };
    });
    assert.equal(media.width, 1920); assert.equal(media.height, 1080); assert.ok(media.decoded > 0);
    await screenshot(page, `${out}/${channel}-video.png`);
    await page.getByRole('button', { name: '跟着做一遍', exact: true }).click();
    const flight = await page.locator('.intro-dock-flight').evaluate(node => {
      const animation = node.getAnimations()[0], effect = animation.effect;
      const frame = effect.getKeyframes().at(-1), transform = new DOMMatrix(frame.transform);
      const target = document.querySelector('[data-film-dock-target]').getBoundingClientRect();
      return {
        duration: effect.getTiming().duration,
        destination: { x: parseFloat(node.style.left) + transform.e, y: parseFloat(node.style.top) + transform.f, width: parseFloat(node.style.width) * transform.a, height: parseFloat(node.style.height) * transform.d },
        target: { x: target.x, y: target.y, width: target.width, height: target.height },
      };
    });
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(flight.destination[key] - flight.target[key]) < 1);
    await expect(page.locator('.tour-counter')).toContainText('1 / 6');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '工坊指南', exact: true }).click();
    await screenshot(page, `${out}/${channel}-guide-about.png`);
    await page.getByRole('tab', { name: '我们的团队', exact: true }).click();
    await screenshot(page, `${out}/${channel}-team.png`);
    await page.keyboard.press('Escape');
    for (const [theme, label] of [['plain', '素纸'], ['bamboo', '竹青'], ['lacquer', '朱漆'], ['ink', '玄墨'], ['indigo', '靛夜']]) {
      await page.getByRole('button', { name: '工坊设置', exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '工坊指南', exact: true }).click();
      for (const section of ['认识工坊', '动手指南', '我们的团队']) {
        await page.getByRole('tab', { name: section, exact: true }).click();
        const checked = await page.getByRole('dialog').evaluate(dialog => {
          const rgb = value => value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
          const lum = color => color.slice(0, 3).map(c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
          const pairs = [...dialog.querySelectorAll('*')].filter(node => node.namespaceURI === 'http://www.w3.org/1999/xhtml' && node.getClientRects().length && [...node.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(node => {
            let background = [255, 255, 255], ancestors = [];
            for (let current = node; current; current = current.parentElement) ancestors.push(current);
            for (const current of ancestors.reverse()) { const color = rgb(getComputedStyle(current).backgroundColor), alpha = color[3] ?? 1; background = color.slice(0, 3).map((v, i) => v * alpha + background[i] * (1 - alpha)); }
            const a = lum(rgb(getComputedStyle(node).color)), b = lum(background);
            return { text: node.textContent.trim().slice(0, 60), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          });
          return { horizontalOverflow: dialog.scrollWidth > dialog.clientWidth + 1, nodes: pairs.length, contrastFailures: pairs.filter(pair => pair.ratio < 4.5) };
        });
        assert.equal(checked.horizontalOverflow, false); assert.deepEqual(checked.contrastFailures, []);
        scenes.push({ theme, section, ...checked });
      }
      if (theme === 'ink') await screenshot(page, `${out}/${channel}-team-ink.png`);
      await page.keyboard.press('Escape');
    }
    for (const width of [360, 390, 750, 1100]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByRole('button', { name: '工坊指南', exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await screenshot(page, `${out}/${channel}-guide-${width}.png`);
      await page.keyboard.press('Escape');
    }
    const vtt = await context.request.get(`${base}/videos/workshop-intro.vtt`);
    assert.equal(vtt.status(), 200); assert.match(vtt.headers()['content-type'], /text\/vtt/); assert.match(await vtt.text(), /^WEBVTT/);
    const poster = await context.request.get(`${base}/videos/workshop-poster.jpg`);
    assert.equal(poster.status(), 200); assert.match(poster.headers()['content-type'], /image\/jpeg/);
    const range = await context.request.get(`${base}/videos/workshop-intro.mp4`, { headers: { Range: 'bytes=0-1023' } });
    assert.equal(range.status(), 206); assert.equal((await range.body()).length, 1024);
    // Seeking or removing a decoded HTML video may cancel its in-flight byte range.
    // Retain these records, but distinguish deliberate browser cancellation from load failure.
    const unexpectedFailures = failedRequests.filter(request => !(request.url === `${base}/videos/workshop-intro.mp4` && request.reason === 'net::ERR_ABORTED' && media.decoded > 0));
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedFailures, []); assert.deepEqual(externalRequests, []);
    results.push({ channel, browserVersion: browser.version(), status: 'PASS', media, flight, scenes, errors, failedRequests, externalRequests, vttContentType: vtt.headers()['content-type'], posterContentType: poster.headers()['content-type'], rangeStatus: range.status() });
  } catch (error) {
    results.push({ channel, status: 'FAIL', error: String(error), errors, failedRequests, externalRequests, scenes });
    throw error;
  } finally {
    await browser.close();
    await fs.writeFile(`${out}/production-integration.json`, JSON.stringify({ checkedAt: new Date().toISOString(), base, results, note: '真实浏览器媒体解码和界面检查；未作为真人听感或实体打印证明。颜色审计不替代图片与渐变逐像素检查。' }, null, 2));
  }
}
console.log(JSON.stringify(results.map(({ channel, status, media, scenes }) => ({ channel, status, media, themeScenes: scenes.length }))));
