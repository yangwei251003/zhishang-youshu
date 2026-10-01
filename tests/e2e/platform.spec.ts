import { test, expect } from '@playwright/test';

test('本机多作品保存、指定恢复与计算Worker实际运行', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const storageUrl = '/src/io/storage.ts', lessonsUrl = '/src/lessons/index.ts', clientUrl = '/src/geometry/client.ts';
    const storage = await import(storageUrl), lessons = await import(lessonsUrl), geometry = await import(clientUrl);
    const first = lessons.createProject('half'), second = lessons.createProject('quarter');
    first.id = 'e2e-first'; second.id = 'e2e-second';
    first.title = '第一份本地作品'; second.title = '第二份本地作品';
    await storage.saveProject(first); await storage.saveProject(second);
    const restored = await storage.loadProject(first.id), latest = await storage.loadProject();
    const all = await storage.listProjects();
    const [a, b] = await Promise.all([geometry.analyzeAsync(first), geometry.analyzeAsync(second)]);
    return { restored: restored.title, latest: latest.title, ids: all.map((p: { id: string }) => p.id), firstHoles: a.holeCount, secondHoles: b.holeCount, firstValid: a.validSequence, secondValid: b.validSequence };
  });
  expect(results.restored).toBe('第一份本地作品');
  expect(results.latest).toBe('第二份本地作品');
  expect(results.ids).toEqual(expect.arrayContaining(['e2e-first', 'e2e-second']));
  expect(results.firstValid && results.secondValid).toBe(true);
  expect(results.firstHoles).toBe(0); expect(results.secondHoles).toBe(2);
});

test('真实浏览器Worker性能：50刀 × 8层且不借助网络接口', async ({ page }) => {
  await page.goto('/');
  const performance = await page.evaluate(async () => {
    const lessonsUrl = '/src/lessons/index.ts', clientUrl = '/src/geometry/client.ts';
    const lessons = await import(lessonsUrl), geometry = await import(clientUrl);
    const project = lessons.createProject();
    project.cuts = Array.from({ length: 50 }, (_, i) => ({ id: `stress-${i}`, label: `小剪口${i}`, shape: 'triangle', points: [{ x: 80, y: 1 + i * 1.45 }, { x: 78.5, y: 1.35 + i * 1.45 }, { x: 80, y: 1.7 + i * 1.45 }] }));
    project.cursor = 50;
    const started = window.performance.now();
    const result = await geometry.analyzeAsync(project);
    return { elapsedMs: window.performance.now() - started, count: result.steps.length, valid: result.validSequence, regions: result.componentCount, area: result.areaMm2 };
  });
  expect(performance.valid).toBe(true); expect(performance.count).toBe(50);
  expect(performance.area).toBeGreaterThan(0);
  expect(performance.elapsedMs).toBeLessThan(5000);
  console.log('50刀8层首次Worker计算（含初始化）', JSON.stringify(performance));
});
