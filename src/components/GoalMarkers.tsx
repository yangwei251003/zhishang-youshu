import { useEffect, useState, type RefObject } from 'react';
import type { FoldMode, Goal, Point } from '../types';

export type TargetFocus = 'retained' | 'removed';
export interface GoalMarker { point: Point; kind: TargetFocus; indices: number[] }

/** Inverse of the fixed fold sequence; all inputs and outputs remain millimetres. */
export function projectGoalPoint(point: Point, fold: FoldMode, stage = 0): Point {
  if (fold === 2) return stage >= 1 ? { ...point } : { x: Math.abs(point.x), y: point.y };
  if (fold === 4) return stage >= 2 ? { ...point } : { x: Math.abs(point.x), y: stage >= 1 ? point.y : Math.abs(point.y) };
  if (stage >= 3) return { ...point };
  if (stage >= 2) return { x: Math.abs(point.x), y: point.y };
  const x = Math.abs(point.x), y = Math.abs(point.y);
  return stage >= 1 ? { x, y } : { x: Math.max(x, y), y: Math.min(x, y) };
}

export function goalMarkers(goal: Goal | undefined, fold: FoldMode, stage?: number): GoalMarker[] {
  const markers = new Map<string, GoalMarker>();
  for (const kind of ['retained', 'removed'] as const) {
    const points = kind === 'retained' ? goal?.requiredRetained : goal?.requiredRemoved;
    points?.forEach((source, index) => {
      const point = stage === undefined ? { ...source } : projectGoalPoint(source, fold, stage);
      // Same 0.01 mm precision as the geometry grid; preserve every original number.
      const key = `${kind}:${Math.round(point.x * 100)}:${Math.round(point.y * 100)}`;
      const existing = markers.get(key);
      if (existing) existing.indices.push(index + 1);
      else markers.set(key, { point, kind, indices: [index + 1] });
    });
  }
  return [...markers.values()];
}

export function useSvgPixelScale(ref: RefObject<SVGSVGElement | null>, span: number) {
  const [units, setUnits] = useState(span / 320);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const update = () => {
      const matrix = svg.getScreenCTM();
      if (matrix) setUnits(1 / Math.hypot(matrix.a, matrix.b));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [ref, span]);
  return units;
}

export function GoalMarkers({ goal, fold, stage, targetFocus, pixelScale }: {
  goal?: Goal; fold: FoldMode; stage?: number; targetFocus?: TargetFocus; pixelScale: number;
}) {
  return <g className="goal-markers">{goalMarkers(goal, fold, stage).map(marker => {
    const label = `${marker.kind === 'retained' ? '留' : '剪'}${marker.indices.join('、')}`;
    const description = `${label}：这里需要${marker.kind === 'retained' ? '保留纸' : '剪去'}（原纸毫米坐标投影）`;
    const focused = targetFocus === marker.kind;
    return <g key={`${marker.kind}:${marker.indices.join('-')}`} transform={`translate(${marker.point.x} ${marker.point.y}) scale(${pixelScale})`}
      className={`goal-marker goal-marker-${marker.kind}${focused ? ' goal-marker-focused' : ''}`} role="img" aria-label={description} tabIndex={0}
      onPointerDown={event => event.stopPropagation()}>
      <title>{description}</title>
      {focused && <circle className="goal-focus-ring" r={17} fill="none" stroke="var(--zs-text-primary)" strokeWidth={2} strokeDasharray="3 2"/>}
      <circle r={10} fill={marker.kind === 'retained' ? 'var(--zs-goal-retain)' : 'var(--zs-bg-paper)'} stroke={marker.kind === 'retained' ? 'var(--zs-bg-paper)' : 'var(--zs-goal-cut)'} strokeWidth={2}/>
      {marker.kind === 'removed' ? <path d="M-4-4L4 4M4-4L-4 4" fill="none" stroke="var(--zs-goal-cut)" strokeWidth={2}/> : <circle r={3} fill="var(--zs-bg-paper)"/>}
      <text x={13} y={4} fontSize={12} fontWeight={700} fill="var(--zs-text-primary)" stroke="var(--zs-bg-paper)" strokeWidth={3} paintOrder="stroke">{label}</text>
    </g>;
  })}</g>;
}

export function GoalLegend({ goal }: { goal?: Goal }) {
  if (!goal?.requiredRetained?.length && !goal?.requiredRemoved?.length) return null;
  return <div className="goal-legend" aria-label="目标位置图例">
    {!!goal.requiredRetained?.length && <span>● 留：这里需要保留纸</span>}
    {!!goal.requiredRemoved?.length && <span>⊗ 剪：这里需要剪去</span>}
    <small>编号对应原纸位置；折叠重合的编号合并显示</small>
  </div>;
}
