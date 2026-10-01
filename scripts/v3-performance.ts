import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createProject } from '../src/lessons';
import { analyzeProject, getRepairs, regionPath } from '../src/geometry/engine';
import type { Cut, Goal } from '../src/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/v3-implementation/evidence');
await mkdir(out, { recursive: true });
function notches(count: number): Cut[] {
  return Array.from({ length: count }, (_, i) => {
    const y = Number((1 + i * 0.72).toFixed(2));
    return { id: `stress-${i}`, label: `小剪口${i + 1}`, shape: 'triangle', points: [{ x: 80, y }, { x: 78.5, y: Number((y + 0.18).toFixed(2)) }, { x: 80, y: Number((y + 0.35).toFixed(2)) }] };
  });
}
const cut: Cut = { id: 'stress-separation', label: '横贯折叠纸的一刀', shape: 'rectangle', points: [{ x: 29, y: -1 }, { x: 39, y: -1 }, { x: 39, y: 41 }, { x: 29, y: 41 }] };
const goal: Goal = { requireConnected: true, minCuts: 100, requiredRemoved: [{ x: 34, y: 3 }], requiredRetained: [{ x: 18, y: 10 }, { x: 60, y: 45 }] };
const rows = [];
for (const entry of [{ name: 'free-connected-100', cuts: notches(100), goal: undefined }, { name: 'separated-goal-100', cuts: [...notches(99), cut], goal }]) {
  const project = { ...createProject(), title: entry.name, cuts: entry.cuts, cursor: 100 };
  const start = performance.now();
  const analysis = analyzeProject(project, entry.goal);
  const analyzeMs = performance.now() - start;
  const pathStart = performance.now();
  const unfoldedPath = regionPath(analysis.unfolded);
  const svgPathMs = performance.now() - pathStart;
  const repairStart = performance.now();
  const repairs = getRepairs(project, entry.goal);
  const repairMs = performance.now() - repairStart;
  if (!analysis.validSequence || analysis.steps.length !== 100) throw new Error(`${entry.name} 的100刀样例无效：${JSON.stringify(analysis.issues)}`);
  if (entry.goal && (!repairs.length || repairs.some(candidate => !candidate.analysis.goalPassed || !candidate.analysis.validSequence))) throw new Error('分离样例没有完整目标通过的修复');
  rows.push({ name: entry.name, foldMode: project.foldMode, cutCount: analysis.steps.length, validSequence: analysis.validSequence, componentCount: analysis.componentCount, holeCount: analysis.holeCount, goalPassed: analysis.goalPassed, areaMm2: analysis.areaMm2, analyzeMs: Number(analyzeMs.toFixed(3)), svgPathMs: Number(svgPathMs.toFixed(3)), svgPathCharacters: unfoldedPath.length, repairMs: Number(repairMs.toFixed(3)), repairCount: repairs.length, repairCandidates: repairs.map(candidate => ({ title: candidate.title, changedCutId: candidate.changedCutId, allGoalsPassed: candidate.analysis.goalPassed, componentCount: candidate.analysis.componentCount })) });
  console.log(`${entry.name}: analyze=${analyzeMs.toFixed(1)}ms, SVG path=${svgPathMs.toFixed(1)}ms, repair=${repairMs.toFixed(1)}ms`);
}
const report = { measuredAt: new Date().toISOString(), runtime: { node: process.version, platform: platform(), osRelease: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length }, method: 'Single sequential measurement per scenario, no hard performance threshold. Host concurrency is not controlled. 160 mm paper, 8 layers; 100 small edge notches share the existing 50-cut fixture depth and occupy the same edge at twice the density. Separated scenario replaces the final notch with a full-width folded strip.', renderBoundary: 'svgPathMs measures exact unfolded SVG path serialization, not browser DOM/layout/paint or Worker startup.', baselineComparison: 'NOT_TESTED: no historical runtime baseline was re-created; these are current V3 measurements only.', rows };
await writeFile(resolve(out, 'performance-100.json'), JSON.stringify(report, null, 2));
