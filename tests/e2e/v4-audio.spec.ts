import { writeFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function retainMeasurement(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(name); await writeFile(path, JSON.stringify(value, null, 2));
  await info.attach(name, { path, contentType: 'application/json' });
}

async function instrument(page: Page, oldPreference = { sfx: true, music: false }) {
  await page.addInitScript(old => {
    localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 }));
    if (!localStorage.getItem('paperWorkshop.audio.v1')) localStorage.setItem('paperWorkshop.audio.v1', JSON.stringify(old));
    const state = { contexts: [] as AudioContext[], gains: [] as GainNode[], media: [] as HTMLAudioElement[], maxPlaying: 0, plays: 0, analyser: undefined as AnalyserNode | undefined };
    (window as unknown as { audioProbe: typeof state }).audioProbe = state;
    const NativeContext = window.AudioContext, NativeAudio = window.Audio;
    window.AudioContext = class extends NativeContext {
      constructor(...args: ConstructorParameters<typeof AudioContext>) { super(...args); state.contexts.push(this); }
      createGain() { const node = super.createGain(); state.gains.push(node); return node; }
    };
    window.Audio = class extends NativeAudio {
      constructor(...args: ConstructorParameters<typeof Audio>) { super(...args); state.media.push(this); }
      async play() { state.plays++; await super.play(); state.maxPlaying = Math.max(state.maxPlaying, state.media.filter(item => !item.paused).length); }
    };
  }, oldPreference);
}
async function openSettings(page: Page) { await page.getByRole('button', { name: '工坊设置', exact: true }).click(); await page.getByRole('tab', { name: '声音', exact: true }).click(); }
async function start(page: Page) { await openSettings(page); await page.getByRole('button', { name: '开启轻音乐', exact: true }).click(); await expect(page.getByRole('button', { name: '关闭轻音乐', exact: true })).toHaveAttribute('aria-pressed', 'true'); }
async function playback(page: Page) {
  return page.evaluate(() => {
    const probe = (window as unknown as { audioProbe: { contexts: AudioContext[]; media: HTMLAudioElement[]; maxPlaying: number; plays: number } }).audioProbe;
    return { contexts: probe.contexts.length, media: probe.media.length, maxPlaying: probe.maxPlaying, plays: probe.plays, playing: probe.media.filter(item => !item.paused).map(item => item.src) };
  });
}
async function sampleMusic(page: Page, milliseconds = 1600) {
  return page.evaluate(async duration => {
    const probe = (window as unknown as { audioProbe: { contexts: AudioContext[]; gains: GainNode[]; media: HTMLAudioElement[]; analyser?: AnalyserNode } }).audioProbe;
    const ctx = probe.contexts.filter(value => value.state !== 'closed').at(-1)!;
    if (!probe.analyser || probe.analyser.context !== ctx) {
      const analyser = ctx.createAnalyser(), silence = ctx.createGain(); silence.gain.value = 0;
      analyser.fftSize = 2048; probe.gains.filter(node => node.context === ctx)[1].connect(analyser).connect(silence).connect(ctx.destination); probe.analyser = analyser;
    }
    const analyser = probe.analyser, data = new Float32Array(analyser.fftSize);
    let peak = 0, sumSquares = 0, sampleCount = 0;
    await new Promise<void>(resolve => {
      const timer = setInterval(() => { analyser.getFloatTimeDomainData(data); for (const value of data) { peak = Math.max(peak, Math.abs(value)); sumSquares += value * value; sampleCount++; } }, 20);
      setTimeout(() => { clearInterval(timer); resolve(); }, duration);
    });
    const rms = Math.sqrt(sumSquares / Math.max(sampleCount, 1));
    return { peak, peakDbFS: peak ? 20 * Math.log10(peak) : null, rms, rmsDbFS: rms ? 20 * Math.log10(rms) : null, sampleCount,
      contextStates: probe.contexts.map(value => ({ state: value.state, time: value.currentTime })), gains: probe.gains.map(node => node.gain.value),
      media: probe.media.filter(item => !item.paused).map(item => ({ src: item.src, currentTime: item.currentTime, duration: item.duration, readyState: item.readyState, error: item.error?.message })) };
  }, milliseconds);
}

test('V4 冷启动音乐保持关闭，v1迁移与双音量偏好刷新可恢复', async ({ page }) => {
  await instrument(page, { sfx: false, music: true }); const requests: string[] = [];
  page.on('request', request => { if (/\/audio\/[^/]+\.mp3(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await page.goto('/'); await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  expect(await playback(page)).toMatchObject({ contexts: 0, media: 0, plays: 0 }); expect(requests).toEqual([]);
  await openSettings(page); await expect(page.getByRole('button', { name: '音效关', exact: true })).toBeVisible();
  await expect(page.getByRole('slider', { name: '音乐音量', exact: true })).toHaveValue('0.6');
  await expect(page.getByRole('slider', { name: '音效音量', exact: true })).toHaveValue('0.8');
  await page.getByRole('slider', { name: '音乐音量', exact: true }).fill('0'); await page.getByRole('slider', { name: '音效音量', exact: true }).fill('0.35');
  await page.getByRole('combobox', { name: '循环方式' }).selectOption('one');
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: '工坊设置', exact: true })).toBeFocused();
  await page.reload(); expect(await playback(page)).toMatchObject({ contexts: 0, plays: 0 }); await openSettings(page);
  await expect(page.getByRole('slider', { name: '音乐音量', exact: true })).toHaveValue('0'); await expect(page.getByRole('slider', { name: '音效音量', exact: true })).toHaveValue('0.35');
  await expect(page.getByRole('combobox', { name: '循环方式' })).toHaveValue('one');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paperWorkshop.audio.v1')!))).toEqual({ sfx: false, music: true });
});

test('V4 四首本地曲真实解码播放、输出非静音，断外网且切曲无叠播', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000); await instrument(page);
  const outside: string[] = [], errors: string[] = [];
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { outside.push(url.href); return route.abort(); } return route.continue(); });
  page.on('pageerror', error => errors.push(error.message)); await page.goto('/'); await start(page);
  const measurements: object[] = [];
  for (const [index, name] of ['水纹', '千纸鹤', '冥想即兴曲', '晨光'].entries()) {
    await page.getByRole('option', { name: new RegExp(name) }).click(); await expect(page.getByRole('button', { name: '关闭轻音乐', exact: true })).toBeVisible();
    await expect.poll(async () => (await playback(page)).playing.some(url => url.endsWith(`zs-track-${index + 1}.mp3`))).toBe(true);
    await expect(page.locator('.audio-current-copy')).toContainText('Kevin MacLeod'); await expect(page.getByRole('link', { name: '曲目来源' })).toHaveAttribute('href', /incompetech\.com/);
    await expect(page.getByRole('link', { name: 'CC BY 4.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    const measurement = await sampleMusic(page); measurements.push({ track: index + 1, volume: .6, ...measurement });
    await retainMeasurement(testInfo, `track-${index + 1}-output.json`, measurement);
    expect(measurement.peak).toBeGreaterThan(.001); expect(measurement.peak).toBeLessThan(1);
  }
  await retainMeasurement(testInfo, 'music-output-measurements.json', measurements);
  expect((await playback(page)).maxPlaying).toBe(1); expect(outside).toEqual([]); expect(errors).toEqual([]);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '剪纸灵感库', exact: true }).click(); expect((await playback(page)).playing).toHaveLength(1);
});

test('V4 暂停与切页隐藏不会自动恢复，明确播放后恢复同一首', async ({ page }) => {
  await instrument(page); await page.goto('/'); await start(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.audio-status')).toContainText('已暂停'); expect((await playback(page)).playing).toEqual([]);
  const oldPlays = (await playback(page)).plays;
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect((await playback(page)).plays).toBe(oldPlays);
  await page.getByRole('button', { name: '开启轻音乐', exact: true }).click(); await expect(page.getByRole('button', { name: '关闭轻音乐', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭轻音乐', exact: true }).click(); expect((await playback(page)).playing).toEqual([]);
});

test('V4 四首文件失败时有界跳过并进入生成乐句，保持可关闭', async ({ page }, testInfo) => {
  await instrument(page); const attempts: string[] = [], errors: string[] = [];
  await page.route('**/audio/*.mp3', route => { attempts.push(route.request().url()); return route.abort(); });
  page.on('pageerror', error => errors.push(error.message)); await page.goto('/'); await start(page);
  await expect(page.locator('.audio-current-copy')).toContainText('素纸微光'); await expect(page.locator('.audio-status')).toContainText('已切换生成乐句');
  await expect(page.getByRole('option', { name: /暂时不可用/ })).toHaveCount(4);
  expect(attempts).toHaveLength(4); expect(new Set(attempts).size).toBe(4); expect(errors).toEqual([]);
  const defaultOutput = await sampleMusic(page, 2700);
  expect(defaultOutput.peak).toBeGreaterThan(.015); expect(defaultOutput.rms).toBeGreaterThan(.0045);
  await page.getByRole('slider', { name: '音乐音量', exact: true }).fill('1');
  const maximumOutput = await sampleMusic(page, 2700);
  expect(maximumOutput.peak).toBeLessThan(1); expect(maximumOutput.rms).toBeGreaterThan(.0045);
  await retainMeasurement(testInfo, 'generated-output-measurements.json', { defaultOutput, maximumOutput });
  await page.getByRole('button', { name: '关闭轻音乐', exact: true }).click(); await expect(page.locator('.audio-status')).toContainText('已暂停');
});
