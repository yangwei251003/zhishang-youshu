import { describe, expect, it } from 'vitest';
import { goalMarkers, projectGoalPoint } from '../../src/components/GoalMarkers';
import { getFoldedOutline } from '../../src/geometry/engine';
import type { FoldMode, Goal } from '../../src/types';

const goal: Goal = { requireConnected: true, minCuts: 1, requiredRemoved: [{ x: -75, y: 4 }, { x: 75, y: 4 }], requiredRetained: [{ x: 40, y: 20 }] };

describe('millimetre teaching target markers', () => {
  it('merges symmetric folded markers while retaining both source numbers', () => {
    expect(goalMarkers(goal, 2, 0)).toEqual([
      { point: { x: 40, y: 20 }, kind: 'retained', indices: [1] },
      { point: { x: 75, y: 4 }, kind: 'removed', indices: [1, 2] },
    ]);
    expect(goalMarkers(goal, 2)).toHaveLength(3);
  });
  it.each([2, 4, 8] as const)('projects all quadrants into the %i-layer physical packet', (fold: FoldMode) => {
    const outline = getFoldedOutline(160, fold);
    for (const x of [-75, -20, 0, 20, 75]) for (const y of [-75, -20, 0, 20, 75]) {
      const p = projectGoalPoint({ x, y }, fold);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(Math.max(...outline.map(q => q.x)));
      expect(p.y).toBeGreaterThanOrEqual(fold === 2 ? -80 : 0);
      expect(p.y).toBeLessThanOrEqual(fold === 8 ? p.x : 80);
    }
  });
  it('reverses the same diagonal, horizontal, vertical order as paper unfolding', () => {
    const p = { x: -20, y: -60 };
    expect([0, 1, 2, 3].map(stage => projectGoalPoint(p, 8, stage))).toEqual([
      { x: 60, y: 20 }, { x: 20, y: 60 }, { x: 20, y: -60 }, p,
    ]);
    expect(projectGoalPoint(p, 4, 1)).toEqual({ x: 20, y: -60 });
    expect(projectGoalPoint(p, 4, 2)).toEqual(p);
    expect(projectGoalPoint(p, 2, 1)).toEqual(p);
  });
  it('does not collapse retained and removed requirements or mutate source truth', () => {
    const source = { requireConnected: true, minCuts: 1, requiredRetained: [{ x: -3, y: 5 }], requiredRemoved: [{ x: 3, y: 5 }] };
    expect(goalMarkers(source, 2, 0)).toHaveLength(2);
    expect(source.requiredRetained[0]).toEqual({ x: -3, y: 5 });
    expect(goalMarkers(undefined, 2)).toEqual([]);
  });
});
