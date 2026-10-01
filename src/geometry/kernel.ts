import {
  area, booleanOpWithPolyTree, ClipType, EndType, FillRule, inflatePaths, JoinType,
  pointInPolygon, PointInPolygonResult, PolyTree64, type Path64, type Paths64,
  type PolyPath64,
} from 'clipper2-ts';
import type { Point, Region } from '../types';

export const SCALE = 100;
export const toGrid = (p: Point): Point => ({ x: Math.round(p.x * SCALE), y: Math.round(p.y * SCALE) });
export const fromGrid = (p: Point): Point => ({ x: p.x / SCALE, y: p.y / SCALE });
export const quantize = (p: Point): Point => fromGrid(toGrid(p));
export const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const positive = (p: Path64): Path64 => area(p) < 0 ? [...p].reverse() : p;

export function onSegment(p: Point, a: Point, b: Point): boolean {
  return cross(a, b, p) === 0 && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x)
    && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  return onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}

export function simplePolygon(path: Path64): boolean {
  if (path.length < 3 || Math.abs(area(path)) < 1) return false;
  for (let i = 0; i < path.length; i++) {
    if (same(path[i], path[(i + 1) % path.length])) return false;
    for (let j = i + 1; j < path.length; j++) {
      if (j === i + 1 || (i === 0 && j === path.length - 1)) continue;
      if (segmentsIntersect(path[i], path[(i + 1) % path.length], path[j], path[(j + 1) % path.length])) return false;
    }
  }
  return true;
}

export function pathsTree(paths: Paths64): PolyTree64 {
  const tree = new PolyTree64();
  booleanOpWithPolyTree(ClipType.Union, paths, null, tree, FillRule.NonZero);
  return tree;
}

/** PolyTree preserves islands within holes as independent retained regions. */
export function treeRegions(tree: PolyTree64): Region[] {
  const regions: Region[] = [];
  const visit = (node: PolyPath64) => {
    if (node.poly && !node.isHole) {
      const holes: Point[][] = [];
      for (let i = 0; i < node.count; i++) {
        const child = node.child(i);
        if (child.isHole && child.poly) holes.push(child.poly.map(fromGrid));
      }
      regions.push({ outer: node.poly.map(fromGrid), holes });
    }
    for (let i = 0; i < node.count; i++) visit(node.child(i));
  };
  visit(tree);
  return regions.sort((a, b) => regionArea(b) - regionArea(a));
}

export const pathsRegions = (paths: Paths64): Region[] => treeRegions(pathsTree(paths));
export const regionArea = (r: Region) => Math.abs(area(r.outer)) - r.holes.reduce((n, h) => n + Math.abs(area(h)), 0);
export const totalArea = (regions: Region[]) => regions.reduce((n, r) => n + regionArea(r), 0);

export function retainedAt(point: Point, regions: Region[]): 'inside' | 'outside' | 'boundary' {
  const p = toGrid(point);
  for (const r of regions) {
    const outer = pointInPolygon(p, r.outer.map(toGrid));
    if (outer === PointInPolygonResult.IsOn) return 'boundary';
    if (outer !== PointInPolygonResult.IsInside) continue;
    let inHole = false;
    for (const hole of r.holes) {
      const inside = pointInPolygon(p, hole.map(toGrid));
      if (inside === PointInPolygonResult.IsOn) return 'boundary';
      if (inside === PointInPolygonResult.IsInside) inHole = true;
    }
    if (!inHole) return 'inside';
  }
  return 'outside';
}

function segmentCoveredLength(a: Point, b: Point, polygon: Path64): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return 0;
  const stops = [0, 1];
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i], d = polygon[(i + 1) % polygon.length];
    const ex = d.x - c.x, ey = d.y - c.y;
    const den = dx * ey - dy * ex;
    if (den !== 0) {
      const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / den;
      const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) stops.push(t);
    } else if (cross(a, b, c) === 0) {
      stops.push(Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / lengthSq)));
      stops.push(Math.max(0, Math.min(1, ((d.x - a.x) * dx + (d.y - a.y) * dy) / lengthSq)));
    }
  }
  const sorted = [...new Set(stops)].sort((x, y) => x - y);
  let covered = 0;
  for (let i = 1; i < sorted.length; i++) {
    const t = (sorted[i - 1] + sorted[i]) / 2;
    // Midpoints remain unrounded: rounding can turn a point-only contact into an entry.
    const p = { x: a.x + dx * t, y: a.y + dy * t };
    if (pointInPolygon(p, polygon) !== PointInPolygonResult.IsOutside) covered += sorted[i] - sorted[i - 1];
  }
  return covered * Math.sqrt(lengthSq);
}

/** A positive-length opening is required for each removed component, not a vertex touch. */
export function accessibleRemoval(removed: Region[], folded: Paths64): boolean {
  return removed.length > 0 && removed.every(r => folded.some(path => path.some((p, i) =>
    segmentCoveredLength(p, path[(i + 1) % path.length], r.outer.map(toGrid)) > 1)));
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Numerical ambiguity only; this is deliberately not a material-strength predictor. */
export function hasUncertainTopology(paths: Paths64, regions = pathsRegions(paths)): boolean {
  for (const path of paths) {
    if (Math.abs(area(path)) < 100) return true;
    for (let i = 0; i < path.length; i++) {
      if (Math.hypot(path[i].x - path[(i + 1) % path.length].x, path[i].y - path[(i + 1) % path.length].y) <= 2) return true;
      for (let j = 0; j < path.length; j++) {
        if (j === i || (j + 1) % path.length === i) continue;
        if (distanceToSegment(path[i], path[j], path[(j + 1) % path.length]) <= 1) return true;
      }
    }
  }
  for (let a = 0; a < paths.length; a++) for (let b = a + 1; b < paths.length; b++) {
    for (const p of paths[a]) for (let j = 0; j < paths[b].length; j++) {
      if (distanceToSegment(p, paths[b][j], paths[b][(j + 1) % paths[b].length]) <= 1) return true;
    }
  }
  if (!paths.length) return false;
  // A two-grid-unit erosion that breaks a component reveals a near-degenerate neck.
  const eroded = inflatePaths(paths, -2, JoinType.Miter, EndType.Polygon);
  return pathsRegions(eroded).length > regions.length;
}
