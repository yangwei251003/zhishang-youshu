import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 })));
});
async function ready(page: Page) {
  await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/);
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
}
async function exportModal(page: Page) { await page.getByRole('button', { name: '导出', exact: true }).click(); }

for (const lesson of [
  { title: '一剪，两相映', prediction: '2 个', fold: 2 },
  { title: '四面有回声', prediction: '2 个', fold: 4 },
  { title: '一纸，生万象', prediction: '一个中心孔', fold: 8 },
]) test(`V4 ${lesson.fold}层本地分享PNG：预测门槛、离线导出与真实像素尺寸`, async ({ page }, testInfo) => {
  const errors: string[] = [], externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: lesson.title, exact: true }).click();
  await page.getByRole('button', { name: '保存当前并开始', exact: true }).click();
  await expect(page.locator('.prediction-panel')).toBeVisible();
  await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  await exportModal(page);
  await expect(page.getByRole('button', { name: /^保存分享图（PNG）/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: lesson.prediction, exact: false }).check();
  await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  const origin = new URL(page.url()).origin;
  await page.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) { externalRequests.push(url); return route.abort(); }
    return route.continue();
  });
  await exportModal(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^保存分享图（PNG）/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\d{4}-\d{2}-\d{2}-分享卡\.png$/);
  expect(download.suggestedFilename()).toContain(lesson.title);
  const output = testInfo.outputPath(`share-${lesson.fold}-layers.png`);
  await download.saveAs(output);
  const png = await readFile(output);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1350);
  expect(png.length).toBeGreaterThan(15_000);
  await testInfo.attach(`share-${lesson.fold}-layers`, { path: output, contentType: 'image/png' });
  await expect(page.getByRole('button', { name: /^保存分享图（PNG）/ })).toBeEnabled();
  expect(externalRequests).toEqual([]); expect(errors).toEqual([]);
});

test('V4 我的作品汇总复制记录去重，按作品导出与既有记录格式一致', async ({ page }) => {
  await page.goto('/'); await ready(page);
  const expected = await page.evaluate(async () => {
    const lessonsUrl = '/src/lessons/index.ts', learningUrl = '/src/io/learning.ts', storageUrl = '/src/io/storage.ts';
    const lessons = await import(lessonsUrl);
    const learning = await import(learningUrl);
    const storage = await import(storageUrl);
    const first = lessons.createProject('half');
    first.id = 'progress-completed'; first.participantId = 'progress-participant'; first.title = '进度汇总测试作品'; first.mode = 'learn';
    first.progress = [{ lessonId: 'half', prediction: '2 个', completedAt: '2026-09-28T02:00:03.000Z' }];
    first.events = [
      learning.makeLearningEvent({ type: 'attempt_start', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:01.000Z' }),
      learning.makeLearningEvent({ type: 'prediction_submitted', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:02.000Z', metadata: { option: '2 个', alreadySeenResult: false } }),
      learning.makeLearningEvent({ type: 'lesson_complete', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:03.000Z' }),
    ];
    await storage.saveProject(first);
    await storage.saveProject({ ...structuredClone(first), id: 'progress-copy', title: '同一尝试的备份副本' });
    const record = learning.buildLearningRecords(first);
    const { exportedAt: _exportedAt, ...stable } = record;
    return stable;
  });
  await page.getByRole('button', { name: '我的作品', exact: true }).click();
  const summary = page.getByRole('region', { name: '学习进度', exact: true });
  await expect(summary).toContainText('1 / 9 课已记录完成');
  await expect(summary).toContainText('1 / 1 次作答');
  await expect(summary).toContainText('不代表学习效果或实剪验证');
  await summary.getByRole('combobox', { name: '选择学习记录所属作品' }).selectOption('progress-completed');
  const pending = page.waitForEvent('download');
  await summary.getByRole('button', { name: '导出学习记录', exact: true }).click();
  const download = await pending;
  const actual = JSON.parse(await readFile((await download.path())!, 'utf8'));
  delete actual.exportedAt;
  expect(actual).toEqual(expected);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '我的作品', exact: true }).click();
  await expect(page.getByRole('region', { name: '学习进度', exact: true })).toContainText('1 / 1 次作答');
});
