import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = 'docs/v3-implementation/evidence';
const readJson = async name => JSON.parse(await readFile(`${dir}/${name}`, 'utf8'));
const [unit, e2e, production, views, render] = await Promise.all([
  readJson('unit-results.json'), readJson('e2e-results.json'),
  readJson('production-checks.json'), readJson('visual-layout.json'), readJson('render-100.json'),
]);
const baseline = await readJson('baseline-hashes.json');
const hashes = await Promise.all(baseline.files.map(async file => {
  const sha256 = createHash('sha256').update(await readFile(file.path)).digest('hex');
  return { path: file.path, before: file.sha256, after: sha256, changed: file.sha256 !== sha256 };
}));
await writeFile(`${dir}/source-hashes.json`, JSON.stringify({date:new Date().toISOString(),files:hashes},null,2));
const summary = {
  version: '0.3.0', date: new Date().toISOString(),
  unit: {total:unit.numTotalTests, passed:unit.numPassedTests, failed:unit.numFailedTests, skipped:unit.numPendingTests},
  e2e: e2e.stats,
  production: production.checks,
  views: views.results,
  performance: render,
  pending: ['真人试用','真实手机触控','实体打印与实剪','真人试听','视频完整人工质检','V2同机性能基线'],
};
await writeFile(`${dir}/verification-summary.json`,JSON.stringify(summary,null,2));
if (unit.numPassedTests !== 103 || unit.numFailedTests || e2e.stats.expected !== 80 || e2e.stats.unexpected || e2e.stats.skipped || e2e.stats.flaky) throw Error('最终回归数量或状态不符合交付预期，请检查原始报告。');
console.log(JSON.stringify(summary));
