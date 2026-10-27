import { describe, expect, it } from 'vitest';
import { analyzeProject, expandCut, getFoldedOutline, getRepairs, regionPath } from '../../src/geometry/engine';
import { hasUncertainTopology, pathsRegions, toGrid, totalArea } from '../../src/geometry/kernel';
import { union, FillRule } from 'clipper2-ts';
import type { Cut, FoldMode, Point, ProjectDocument } from '../../src/types';

function rectangle(x1: number, y1: number, x2: number, y2: number): Point[] {
  return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
}
const rect = (id: string, x1: number, y1: number, x2: number, y2: number): Cut => ({ id, shape: 'rectangle', label: id, points: rectangle(x1, y1, x2, y2) });
const poly = (id: string, points: Point[]): Cut => ({ id, shape: 'polygon', label: id, points });
function project(foldMode: FoldMode, cuts: Cut[] = []): ProjectDocument {
  return { schemaVersion: 1, id: 'test', title: 'fixture', createdAt: '2026-09-26', updatedAt: '2026-09-26', revision: 9, paperSizeMm: 160, foldMode, cuts, cursor: cuts.length, mode: 'create', lessonId: '', progress: [], events: [], participantId: 'anonymous', feedbackMode: 'explained' };
}

describe('physical folded packet and independent exact-area fixtures', () => {
  it.each([2, 4, 8] as const)('unfolds an uncut %i-layer packet into exactly one 160 mm square', mode => {
    const a = analyzeProject(project(mode));
    expect(a.areaMm2).toBe(25600);
    expect(a.componentCount).toBe(1);
    expect(a.holeCount).toBe(0);
    expect(a.status).toBe('connected');
    expect(a.revision).toBe(9);
  });

  it('a 10 × 10 edge notch in two layers gives one 20 × 10 central hole', () => {
    const a = analyzeProject(project(2, [rect('hole', -1, -5, 10, 5)]));
    expect(a.areaMm2).toBe(25400);
    expect(a.componentCount).toBe(1);
    expect(a.holeCount).toBe(1);
    expect(a.validSequence).toBe(true);
  });

  it('four-layer axis corner produces a central 20 × 20 hole', () => {
    const a = analyzeProject(project(4, [rect('corner', -1, -1, 10, 10)]));
    expect(a.areaMm2).toBe(25200);
    expect(a.holeCount).toBe(1);
    expect(a.status).toBe('connected');
  });

  it('an eight-layer 50 mm² triangle removes a 400 mm² square on unfolding', () => {
    const a = analyzeProject(project(8, [{ id: 'triangle', label: 'triangle', shape: 'triangle', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }]));
    expect(a.areaMm2).toBe(25200);
    expect(a.holeCount).toBe(1);
    expect(a.componentCount).toBe(1);
    expect(expandCut([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 160, 8)).toHaveLength(8);
  });

  it('two-layer full-width horizontal cut makes two pieces and identifies its step', () => {
    const a = analyzeProject(project(2, [rect('separate', -1, -5, 81, 5)]));
    expect(a.areaMm2).toBe(24000);
    expect(a.componentCount).toBe(2);
    expect(a.holeCount).toBe(0);
    expect(a.firstSeparationStep).toBe(1);
    expect(a.status).toBe('separated');
    expect(a.goalPassed).toBe(true); // Separation is allowed in free creation.
  });

  it('four-layer horizontal cut produces three retained strips', () => {
    const a = analyzeProject(project(4, [rect('strips', -1, 30, 81, 40)]));
    expect(a.areaMm2).toBe(22400);
    expect(a.componentCount).toBe(3);
    expect(a.firstSeparationStep).toBe(1);
  });

  it('preserves an island nested inside a hole as another connected component', () => {
    const nested = [rectangle(0, 0, 100, 100), rectangle(20, 20, 80, 80).reverse(), rectangle(40, 40, 60, 60)].map(p => p.map(toGrid));
    const regions = pathsRegions(nested);
    expect(regions).toHaveLength(2);
    expect(regions.reduce((n, r) => n + r.holes.length, 0)).toBe(1);
    expect(totalArea(regions)).toBe(6800);
    expect(regionPath(regions).match(/M/g)).toHaveLength(3);
  });

  it('collinear overlap at a sheet edge remains a valid entry', () => {
    const a = analyzeProject(project(4, [rect('edge', 70, 20, 80, 30)]));
    expect(a.validSequence).toBe(true);
    expect(a.areaMm2).toBe(25200);
  });

  it('rejects a cut touching the edge at only a single vertex', () => {
    const a = analyzeProject(project(4, [poly('point', [{ x: 0, y: 20 }, { x: 10, y: 15 }, { x: 10, y: 25 }])]));
    expect(a.validSequence).toBe(false);
    expect(a.issues[0].code).toBe('inaccessible');
    expect(a.areaMm2).toBe(25600);
  });

  it('marks point-contact and near-grid thin connections as uncertain', () => {
    const touching = union([rectangle(0, 0, 10, 10), rectangle(10, 10, 20, 20)].map(p => p.map(toGrid)), FillRule.NonZero);
    expect(hasUncertainTopology(touching)).toBe(true);
    const neck = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4.99 }, { x: 20, y: 4.99 }, { x: 20, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 5.01 }, { x: 10, y: 5.01 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(hasUncertainTopology([neck.map(toGrid)])).toBe(true);
  });
});

describe('sequence correctness, goals and constrained repairs', () => {
  it('rejects duplicate cut material instead of counting it as another success', () => {
    const a = analyzeProject(project(4, [rect('one', 70, 20, 81, 30), rect('two', 70, 20, 81, 30)]));
    expect(a.validSequence).toBe(false);
    expect(a.steps[1].valid).toBe(false);
    expect(a.issues.some(i => i.code === 'no-material')).toBe(true);
    expect(a.areaMm2).toBe(25200);
  });

  it('rechecks later boundary entry when an earlier notch moves', () => {
    const first = rect('entrance', 70, 20, 81, 30), second = rect('later', 60, 22, 75, 28);
    const original = analyzeProject(project(4, [first, second]));
    expect(original.validSequence).toBe(true);
    const modified = analyzeProject(project(4, [rect('entrance', 70, 40, 81, 50), second]));
    expect(modified.validSequence).toBe(false);
    expect(modified.issues.find(i => i.cutId === 'later')?.code).toBe('inaccessible');
  });

  it('does not apply self-intersecting or completely interior cuts', () => {
    const bad = poly('cross', [{ x: 0, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 }, { x: 30, y: 0 }]);
    expect(analyzeProject(project(4, [bad])).status).toBe('invalid');
    expect(analyzeProject(project(4, [rect('interior', 20, 20, 30, 30)])).issues[0].code).toBe('inaccessible');
  });

  it('empty paper cannot satisfy even a free-creation goal', () => {
    const a = analyzeProject(project(4, [rect('all', -1, -1, 81, 81)]));
    expect(a.status).toBe('empty');
    expect(a.areaMm2).toBe(0);
    expect(a.goalPassed).toBe(false);
  });

  it('retained/removed targets and hole count cannot be bypassed', () => {
    const p = project(4, [rect('hole', -1, -1, 10, 10)]);
    expect(analyzeProject(p, { requireConnected: true, minCuts: 1, minHoles: 1, requiredRemoved: [{ x: 0, y: 0 }], requiredRetained: [{ x: 50, y: 50 }] }).goalPassed).toBe(true);
    expect(analyzeProject(p, { requireConnected: true, minCuts: 1, minHoles: 2 }).goalPassed).toBe(false);
    expect(analyzeProject(p, { requireConnected: true, minCuts: 1, requiredRetained: [{ x: 0, y: 0 }] }).goalPassed).toBe(false);
    expect(analyzeProject(p, { requireConnected: true, minCuts: 1, requiredRemoved: [{ x: 50, y: 50 }] }).goalPassed).toBe(false);
  });

  it('offers only full-history-valid repairs which preserve the central hole', () => {
    const p = project(4, [rect('hole', -1, -1, 10, 10), rect('bridge', -1, 30, 81, 40)]);
    const goal = { requireConnected: true, minCuts: 2, minHoles: 1, requiredRemoved: [{ x: 0, y: 0 }], requiredRetained: [{ x: 70, y: 70 }] };
    expect(analyzeProject(p, goal).goalPassed).toBe(false);
    const candidates = getRepairs(p, goal);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(3);
    for (const c of candidates) {
      expect(c.cuts).toHaveLength(2);
      expect(c.analysis.validSequence).toBe(true);
      expect(c.analysis.goalPassed).toBe(true);
      expect(c.analysis.componentCount).toBe(1);
      expect(c.analysis.holeCount).toBeGreaterThanOrEqual(1);
      expect(c.changedAreaMm2).toBeGreaterThan(0);
    }
    expect(getRepairs(p, { ...goal, minCuts: 3 })).toEqual([]);
  });

  it('honours undo/redo cursor and refuses oversized documents', () => {
    const p = project(4, [rect('hole', -1, -1, 10, 10), rect('strip', -1, 30, 81, 40)]);
    expect(analyzeProject({ ...p, cursor: 1 }).componentCount).toBe(1);
    expect(analyzeProject({ ...p, cursor: 0 }).areaMm2).toBe(25600);
    expect(analyzeProject(p).componentCount).toBe(3);
    expect(analyzeProject({ ...p, paperSizeMm: 999 }).status).toBe('invalid');
    expect(analyzeProject({ ...p, cursor: 3 }).status).toBe('invalid');
    expect(getFoldedOutline(160, 8)).toEqual([{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }]);
  });

  it('does not propose an active-step repair that invalidates the redo tail entrance', () => {
    const p = project(4, [rect('band', -1, 30, 81, 40), rect('dependent', 70, 25, 75, 35)]);
    expect(analyzeProject(p).validSequence).toBe(true);
    const current = { ...p, cursor: 1 };
    const goal = { requireConnected: true, minCuts: 1, minHoles: 2 };
    // Without the future-dependent operation, shortening this band has valid repairs.
    expect(getRepairs({ ...current, cuts: p.cuts.slice(0, 1) }, goal).length).toBeGreaterThan(0);
    // Every supported shortening removes the entry used by the currently undone cut.
    expect(getRepairs(current, goal)).toEqual([]);
  });

  it('validates redo feasibility without requiring an undone future to meet the current goal', () => {
    const p = { ...project(4, [rect('band', -1, 30, 81, 40), rect('future-band', -1, 50, 81, 60)]), cursor: 1 };
    const goal = { requireConnected: true, minCuts: 1 };
    const candidates = getRepairs(p, goal);
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.analysis.goalPassed).toBe(true);
      const future = analyzeProject({ ...p, cuts: candidate.cuts, cursor: candidate.cuts.length }, goal);
      expect(future.validSequence).toBe(true);
      expect(future.goalPassed).toBe(false); // The deliberate future cut separates again.
    }
  });

  it('checks 50 eight-layer cuts without dropping steps', () => {
    const cuts = Array.from({ length: 50 }, (_, i) => rect(`n${i}`, 79, 1 + i * 1.5, 81, 1.5 + i * 1.5));
    const start = performance.now();
    const a = analyzeProject(project(8, cuts));
    const elapsed = performance.now() - start;
    expect(a.steps).toHaveLength(50);
    expect(a.validSequence).toBe(true);
    expect(a.areaMm2).toBe(25400); // Each notch removes 0.5 mm² × 8 layers.
    expect(elapsed).toBeLessThan(3000);
  });
});
