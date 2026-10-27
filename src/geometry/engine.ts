import { area, difference, FillRule, intersect, union, xor, type Path64, type Paths64 } from 'clipper2-ts';
import { MAX_CUTS, MAX_VERTICES, type Analysis, type Cut, type FoldMode, type GeometryIssue, type Goal, type Point, type ProjectDocument, type Region, type RepairCandidate } from '../types';
import { accessibleRemoval, fromGrid, hasUncertainTopology, pathsRegions, positive, retainedAt, SCALE, simplePolygon, toGrid, totalArea } from './kernel';

export function getFoldedOutline(size: number, mode: FoldMode): Point[] {
  const h = size / 2;
  if (mode === 2) return [{ x: 0, y: -h }, { x: h, y: -h }, { x: h, y: h }, { x: 0, y: h }];
  if (mode === 4) return [{ x: 0, y: 0 }, { x: h, y: 0 }, { x: h, y: h }, { x: 0, y: h }];
  return [{ x: 0, y: 0 }, { x: h, y: 0 }, { x: h, y: h }];
}

function reflectPaths(paths: Paths64, mode: FoldMode): Paths64 {
  const variants: ((p: Point) => Point)[] = [(p) => p, (p) => ({ x: -p.x, y: p.y })];
  if (mode >= 4) variants.push((p) => ({ x: p.x, y: -p.y }), (p) => ({ x: -p.x, y: -p.y }));
  if (mode === 8) variants.push((p) => ({ x: p.y, y: p.x }), (p) => ({ x: -p.y, y: p.x }), (p) => ({ x: p.y, y: -p.x }), (p) => ({ x: -p.y, y: -p.x }));
  return paths.flatMap(path => variants.map(transform => {
    const output = path.map(transform);
    return area(path) * area(output) < 0 ? output.reverse() : output;
  }));
}

/** Clip to the physical folded packet before mirroring every layer. */
export function expandCut(points: Point[], size: number, mode: FoldMode): Point[][] {
  const clipped = intersect([positive(points.map(toGrid))], [getFoldedOutline(size, mode).map(toGrid)], FillRule.NonZero);
  return reflectPaths(clipped, mode).map(path => path.map(fromGrid));
}

export function regionPath(regions: Region[]): string {
  return regions.flatMap(r => [r.outer, ...r.holes]).map(path => path.length
    ? `M${path.map(p => `${Number(p.x.toFixed(2))},${Number(p.y.toFixed(2))}`).join('L')}Z` : '').join('');
}

function unfold(paths: Paths64, mode: FoldMode): Paths64 {
  return union(reflectPaths(paths, mode), FillRule.NonZero);
}

function documentIssue(project: ProjectDocument): string | undefined {
  if (!Number.isFinite(project.paperSizeMm) || project.paperSizeMm < 80 || project.paperSizeMm > 180) return '纸张边长须在 80–180 mm 之间。';
  if (![2, 4, 8].includes(project.foldMode)) return '只支持 2、4、8 层折法。';
  if (!Array.isArray(project.cuts) || project.cuts.length > MAX_CUTS) return `最多支持 ${MAX_CUTS} 次剪切。`;
  if (!Number.isInteger(project.cursor) || project.cursor < 0 || project.cursor > project.cuts.length) return '操作历史位置无效。';
  if (new Set(project.cuts.map(c => c.id)).size !== project.cuts.length) return '剪口编号重复，无法可靠定位步骤。';
}

function cutIssue(cut: Cut, size: number): string | undefined {
  if (!Array.isArray(cut.points) || cut.points.length < 3 || cut.points.length > MAX_VERTICES) return `剪口须有 3–${MAX_VERTICES} 个顶点。`;
  if (cut.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > size * 2 || Math.abs(p.y) > size * 2)) return '剪口含无效坐标或超出允许范围。';
  if (!['rectangle', 'triangle', 'polygon'].includes(cut.shape)) return '剪口类型无效。';
  if (cut.shape === 'triangle' && cut.points.length !== 3) return '三角形剪口应有 3 个顶点。';
  if (cut.shape === 'rectangle' && (cut.points.length !== 4 || cut.points.some((p, i) => {
    const n = cut.points[(i + 1) % 4]; return p.x !== n.x && p.y !== n.y;
  }))) return '矩形剪口须为四边平行于坐标轴的矩形。';
  if (!simplePolygon(cut.points.map(toGrid))) return '剪口不能自相交、重叠或在 0.01 mm 网格上退化。';
}

function goalsFor(project: ProjectDocument, goal: Goal | undefined, result: Pick<Analysis, 'unfolded' | 'validSequence' | 'status' | 'componentCount' | 'holeCount'>) {
  const goals = [
    { passed: result.validSequence, label: '每一步剪口都可从当时纸边进入' },
    { passed: result.unfolded.length > 0, label: '保留非空纸张' },
    { passed: result.status !== 'uncertain', label: '结构没有待核对的退化接触' },
  ];
  if (!goal) return goals;
  goals.push({ passed: project.cursor >= goal.minCuts, label: `完成至少 ${goal.minCuts} 次有效剪切` });
  if (goal.requireConnected) goals.push({ passed: result.componentCount === 1, label: '展开后整张保持连通' });
  if (goal.minHoles !== undefined) goals.push({ passed: result.holeCount >= goal.minHoles, label: `展开后至少有 ${goal.minHoles} 个孔洞` });
  if (goal.requiredRetained?.length) goals.push({ passed: goal.requiredRetained.every(p => retainedAt(p, result.unfolded) === 'inside'), label: '保留任务指定的位置' });
  if (goal.requiredRemoved?.length) goals.push({ passed: goal.requiredRemoved.every(p => retainedAt(p, result.unfolded) === 'outside'), label: '剪去任务指定的位置' });
  return goals;
}

export function analyzeProject(project: ProjectDocument, goal?: Goal): Analysis {
  const issues: GeometryIssue[] = [];
  const base: Analysis = { revision: project.revision, folded: [], unfolded: [], componentCount: 0, holeCount: 0, areaMm2: 0, status: 'invalid', validSequence: false, issues, steps: [], goals: [], goalPassed: false };
  const invalidDocument = documentIssue(project);
  if (invalidDocument) { issues.push({ code: 'invalid-document', message: invalidDocument }); return base; }
  let folded: Paths64 = [getFoldedOutline(project.paperSizeMm, project.foldMode).map(toGrid)];
  let unfolded: Paths64 = unfold(folded, project.foldMode);
  let previousCount = 1, validSequence = true;
  for (let i = 0; i < project.cursor; i++) {
    const cut = project.cuts[i], step = i + 1;
    const invalidCut = cutIssue(cut, project.paperSizeMm);
    let message = invalidCut, code = 'invalid-cut';
    let clipped: Paths64 = [];
    if (!invalidCut) {
      clipped = intersect(folded, [positive(cut.points.map(toGrid))], FillRule.NonZero);
      if (!clipped.length || Math.abs(clipped.reduce((n, p) => n + area(p), 0)) < 1) {
        message = '这一剪没有剪去现存纸张；重复剪口或已剪空区域不能算作有效步骤。'; code = 'no-material';
      } else if (!accessibleRemoval(pathsRegions(clipped), folded)) {
        message = '剪口无法从当时折叠纸的边界进入。请延伸到纸边；点接触不足以让剪刀进入。'; code = 'inaccessible';
      }
    }
    if (message) {
      validSequence = false;
      issues.push({ code, message, cutId: cut.id, step });
      const state = pathsRegions(unfolded);
      base.steps.push({ step, cutId: cut.id, componentCount: state.length, holeCount: state.reduce((n, r) => n + r.holes.length, 0), areaMm2: totalArea(state), valid: false, newlySeparated: false });
      // Invalid cuts are not applied. Later cuts are still checked against actual retained paper.
      continue;
    }
    folded = difference(folded, clipped, FillRule.NonZero);
    unfolded = unfold(folded, project.foldMode);
    const state = pathsRegions(unfolded), newlySeparated = state.length > previousCount;
    if (newlySeparated && base.firstSeparationStep === undefined) base.firstSeparationStep = step;
    base.steps.push({ step, cutId: cut.id, componentCount: state.length, holeCount: state.reduce((n, r) => n + r.holes.length, 0), areaMm2: totalArea(state), valid: true, newlySeparated });
    previousCount = state.length;
  }
  const foldedRegions = pathsRegions(folded), regions = pathsRegions(unfolded);
  const uncertain = hasUncertainTopology(unfolded, regions) || hasUncertainTopology(folded, foldedRegions);
  if (uncertain) issues.push({ code: 'uncertain-topology', message: '存在点接触或接近计算网格的细连接，需要放大检查和实剪核对；此结果不表示纸张牢固。' });
  const result: Analysis = {
    ...base, folded: foldedRegions, unfolded: regions, componentCount: regions.length,
    holeCount: regions.reduce((n, r) => n + r.holes.length, 0), areaMm2: Math.round(totalArea(regions) * 10000) / 10000,
    validSequence, status: !validSequence ? 'invalid' : !regions.length ? 'empty' : uncertain ? 'uncertain' : regions.length > 1 ? 'separated' : 'connected',
  };
  result.goals = goalsFor(project, goal, result);
  result.goalPassed = result.goals.every(g => g.passed);
  return result;
}

function scaledCut(cut: Cut, axis: 'x' | 'y', anchor: number, factor: number): Cut {
  return { ...cut, points: cut.points.map(p => ({ ...p, [axis]: Math.round((anchor + (p[axis] - anchor) * factor) * SCALE) / SCALE })) };
}

/** Finite proposals; every one must survive the complete history and full lesson goal. */
export function getRepairs(project: ProjectDocument, goal?: Goal, onlyCutId?: string): RepairCandidate[] {
  const original = analyzeProject(project, goal);
  if (original.goalPassed && original.status === 'connected') return [];
  const priority = original.firstSeparationStep ?? original.issues.find(i => i.step)?.step ?? project.cursor;
  const indexes = (onlyCutId ? [project.cuts.findIndex(c => c.id === onlyCutId)] : [...new Set([priority - 1, project.cursor - 1])]).filter(i => i >= 0 && i < project.cursor);
  const candidates: RepairCandidate[] = [], seen = new Set<string>();
  const originalPaths = original.unfolded.flatMap(r => [r.outer, ...r.holes]).map(p => p.map(toGrid));
  for (const index of indexes) {
    const cut = project.cuts[index];
    if (!cut || cut.shape === 'polygon') continue;
    for (const axis of ['x', 'y'] as const) {
      const values = cut.points.map(p => p[axis]), min = Math.min(...values), max = Math.max(...values);
      for (const anchor of [min, max, (min + max) / 2]) for (const factor of [0.8, 0.6, 0.4]) {
        const replacement = scaledCut(cut, axis, anchor, factor);
        const key = JSON.stringify(replacement.points);
        if (seen.has(key)) continue;
        seen.add(key);
        const cuts = project.cuts.map((c, i) => i === index ? replacement : c);
        const analysis = analyzeProject({ ...project, cuts }, goal);
        if (!analysis.goalPassed || analysis.status !== 'connected') continue;
        // Keep the user's undo position, but never offer a change that makes a
        // currently undone operation impossible to redo. Lesson targets belong
        // to the active cursor only; the future may legitimately separate again.
        if (project.cursor < cuts.length && !analyzeProject({ ...project, cuts, cursor: cuts.length }).validSequence) continue;
        const nextPaths = analysis.unfolded.flatMap(r => [r.outer, ...r.holes]).map(p => p.map(toGrid));
        const delta = totalArea(pathsRegions(xor(originalPaths, nextPaths, FillRule.NonZero)));
        if (delta < 0.01) continue;
        candidates.push({ id: `${cut.id}-${axis}-${anchor}-${factor}`, title: `第 ${index + 1} 剪${axis === 'x' ? '收窄' : '减深'}至 ${Math.round(factor * 100)}%`, description: `保留 ${anchor === min ? '最小' : anchor === max ? '最大' : '中心'}${axis === 'x' ? '横' : '纵'}坐标位置，已重新检查全部后续剪口与任务目标。`, cuts, analysis, changedAreaMm2: Math.round(delta * 100) / 100, changedCutId: cut.id });
      }
    }
  }
  // Prefer the smallest actual material change, rather than the smallest parameter change.
  return candidates.sort((a, b) => a.changedAreaMm2 - b.changedAreaMm2).slice(0, 3);
}
