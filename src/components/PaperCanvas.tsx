import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, CornerDownLeft, X } from 'lucide-react';
import { getFoldedOutline, regionPath } from '../geometry/engine';
import { GoalLegend, GoalMarkers, useSvgPixelScale, type TargetFocus } from './GoalMarkers';
import type { Analysis, Cut, CutShape, FoldMode, Goal, Point, Region } from '../types';

export const linePath = (points: Point[], close = true) => points.length ? `M${points.map(p => `${p.x},${p.y}`).join('L')}${close ? 'Z' : ''}` : '';
export function PaperArt({ regions, size, guides = false, folded = false, foldMode = 8, selected, step, issues = [], interactive = false }: {
  regions: Region[]; size: number; guides?: boolean; folded?: boolean; foldMode?: FoldMode; selected?: Point[];
  step?: number; issues?: Analysis['issues']; interactive?: boolean;
}) {
  const half = size / 2;
  let staged = regions;
  let births = regions.map(() => 0);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => { const change = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change); }, []);
  if (step !== undefined) {
    const transform = (items: Region[], fn: (p: Point) => Point) => items.map(r => ({ outer: r.outer.map(fn), holes: r.holes.map(h => h.map(fn)) }));
    const mirror = (at: number, fn: (p: Point) => Point) => { births = [...births, ...staged.map(() => at)]; staged = [...staged, ...transform(staged, fn)]; };
    if (foldMode === 8 && step >= 1) mirror(1, p => ({ x: p.y, y: p.x }));
    if ((foldMode === 8 && step >= 2) || (foldMode === 4 && step >= 1)) mirror(foldMode === 8 ? 2 : 1, p => ({ x: p.x, y: -p.y }));
    if ((foldMode === 8 && step >= 3) || (foldMode === 4 && step >= 2) || (foldMode === 2 && step >= 1)) mirror(foldMode === 8 ? 3 : foldMode === 4 ? 2 : 1, p => ({ x: -p.x, y: p.y }));
  }
  return <>
    {!folded && <rect x={-half} y={-half} width={size} height={size} className="paper-original"/>}
    {staged.map((region, i) => <g key={`${i}-${births[i]}`} className={visible && step !== undefined && step > 0 && births[i] === step ? `mirror-growth ${foldMode === 8 && step === 1 ? 'mirror-diagonal' : (foldMode === 8 && step === 2) || (foldMode === 4 && step === 1) ? 'mirror-y' : 'mirror-x'}` : undefined}><path d={regionPath([region])} fillRule="evenodd" className={`paper-material ${!folded && step === undefined && i > 0 ? 'paper-fragment' : ''}`} style={interactive ? undefined : { pointerEvents: 'none' }}/></g>) }
    {guides && <g className="fold-guides">
      <path d={`M0,${-half}V${half}`}/>
      {foldMode >= 4 && <path d={`M${-half},0H${half}`}/>}
      {foldMode === 8 && <path d={`M${-half},${-half}L${half},${half}M${-half},${half}L${half},${-half}`}/>}
    </g>}
    {selected?.length ? <path className="selected-cut" d={linePath(selected)}/> : null}
    {issues.filter(i => i.at).slice(0, 4).map((issue, index) => <circle key={index} className="issue-marker" cx={issue.at!.x} cy={issue.at!.y} r={3}/>) }
  </>;
}

export function FoldedCanvas({ size, fold, regions, tool, onCut, disabled, selected, guides, replacing, onCancelReplace, goal, targetFocus, rejectedDraft, onClearRejected }: {
  size: number; fold: FoldMode; regions: Region[]; tool: CutShape; onCut: (points: Point[], shape: CutShape) => void;
  disabled?: boolean; selected?: Cut; guides: boolean; replacing?: boolean; onCancelReplace: () => void;
  goal?: Goal; targetFocus?: TargetFocus; rejectedDraft?: { points: Point[]; message: string }; onClearRejected?: () => void;
}) {
  const canvas = useRef<SVGSVGElement>(null);
  const origin = useRef<Point | null>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const outline = getFoldedOutline(size, fold);
  const xs = outline.map(p => p.x), ys = outline.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const span = Math.max(width, height) * 1.28;
  const pixelScale = useSvgPixelScale(canvas, span);
  const left = (Math.max(...xs) + Math.min(...xs) - span) / 2;
  const top = (Math.max(...ys) + Math.min(...ys) - span) / 2;
  useEffect(() => { setDraft([]); origin.current = null; }, [tool, fold, size, replacing]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDraft([]); origin.current = null; onCancelReplace(); } };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, [onCancelReplace]);
  function point(event: PointerEvent<SVGSVGElement>): Point {
    const svg = canvas.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
  }
  function shape(a: Point, b: Point): Point[] {
    return tool === 'triangle' ? [a, { x: b.x, y: (a.y + b.y) / 2 }, { x: a.x, y: b.y }] : [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
  }
  function finishPolygon() {
    if (draft.length >= 3 && !disabled) { onCut(draft, 'polygon'); setDraft([]); }
  }
  return <div className="folded-editor">
    <svg ref={canvas} viewBox={`${left} ${top} ${span} ${span}`} data-testid="folded-canvas" data-tour="folded-canvas" tabIndex={0} role="img" aria-label="折叠态剪纸画布，使用鼠标拖动绘制剪口" className={`folded-canvas ${disabled ? 'canvas-disabled' : ''}`}
      onPointerDown={e => {
        if (disabled || e.button !== 0) return;
        const p = point(e);
        onClearRejected?.();
        if (tool === 'polygon') { setDraft(old => old.length < 64 ? [...old, p] : old); return; }
        origin.current = p; setDraft([]); e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => { const p = point(e); setCursor(p); if (origin.current) setDraft(shape(origin.current, p)); }}
      onPointerUp={e => {
        if (!origin.current || disabled) return;
        const p = point(e), start = origin.current; origin.current = null; setDraft([]);
        if (Math.abs(p.x - start.x) > 0.1 && Math.abs(p.y - start.y) > 0.1) onCut(shape(start, p), tool);
      }}
      onPointerCancel={() => { origin.current = null; setDraft([]); }}
      onPointerLeave={() => setCursor(null)}>
      <defs><pattern id="fold-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10,0H0V10" fill="none" stroke="var(--zs-canvas-grid)" strokeWidth="0.12"/></pattern></defs>
      <rect x={left} y={top} width={span} height={span} fill="url(#fold-grid)"/>
      <path className="fold-outline" d={linePath(outline)}/>
      <PaperArt regions={regions} size={size} foldMode={fold} folded guides={guides} selected={selected?.points}/>
      {rejectedDraft && <g className="rejected-draft-layer" pointerEvents="none">
        <path d={regionPath(regions)} className="accessible-boundary" fill="none" stroke="var(--zs-goal-retain)" strokeWidth={2.5} vectorEffect="non-scaling-stroke"/>
        <path d={linePath(rejectedDraft.points)} className="rejected-cut" fill="var(--zs-brand-soft)" stroke="var(--zs-brand-text)" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke"/>
      </g>}
      <GoalMarkers goal={goal} fold={fold} stage={0} targetFocus={targetFocus} pixelScale={pixelScale}/>
      <g className="edge-label"><text x={left + span * 0.04} y={top + span * 0.06}>每一刀 · 穿过 {fold} 层纸</text></g>
      {draft.length > 0 && <g><path d={linePath(draft, tool !== 'polygon')} className="cut-draft"/>{draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={span / 140} className="draft-point"/>)}</g>}
    </svg>
    <div className="canvas-caption"><span>{replacing ? '重新绘制选中步骤' : tool === 'polygon' ? `${draft.length} 个顶点` : '拖拽绘制剪口'}</span><span className="numeric">{cursor ? `${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)} mm` : `${size} mm / ${fold} 层`}</span></div>
    <GoalLegend goal={goal}/>
    {rejectedDraft && <div className="rejected-feedback" role="alert"><strong>这一刀还没有应用</strong><p>{rejectedDraft.message}</p><p>虚线是刚才的剪口，靛青描线是当前真实纸边。请从纸边重新画入，或调整参数。</p><button className="small-button" onClick={() => { onClearRejected?.(); setDraft([]); origin.current = null; canvas.current?.focus(); }}>清除草稿，重新画</button></div>}
    {tool === 'polygon' && draft.length > 0 && <div className="polygon-actions"><button className="small-button" disabled={draft.length < 3 || disabled} onClick={finishPolygon}><Check size={13}/>闭合并剪切</button><button className="icon-button" onClick={() => setDraft(old => old.slice(0, -1))} aria-label="撤回最后一个顶点"><CornerDownLeft size={14}/></button><button className="icon-button" onClick={() => setDraft([])} aria-label="清空多边形"><X size={14}/></button></div>}
  </div>;
}

export function ResultCanvas({ analysis, size, fold, guides, zoom = 1, stage, highlight = [], small = false, goal, targetFocus }: {
  analysis: Analysis; size: number; fold: FoldMode; guides?: boolean; zoom?: number; stage?: number; highlight?: Point[][]; small?: boolean; goal?: Goal; targetFocus?: TargetFocus;
}) {
  const span = size * 1.2 / zoom;
  const canvas = useRef<SVGSVGElement>(null);
  const pixelScale = useSvgPixelScale(canvas, span);
  return <svg ref={canvas} className={`result-canvas ${small ? 'result-small' : ''}`} viewBox={`${-span / 2} ${-span / 2} ${span} ${span}`} role="img" aria-label="展开后的剪纸作品" data-testid={small ? undefined : 'unfolded-canvas'}>
    <PaperArt regions={stage !== undefined ? analysis.folded : analysis.unfolded} size={size} foldMode={fold} guides={guides} step={stage} issues={analysis.issues}/>
    <GoalMarkers goal={goal} fold={fold} stage={stage} targetFocus={targetFocus} pixelScale={pixelScale}/>
    {highlight.map((p, i) => <path key={i} className="selected-cut" d={linePath(p)}/>)}
  </svg>;
}

/** Editing preview is a labelled drawing aid, never an acceptance result. */
export function EditPreview({ size, fold, points, regions }: { size: number; fold: FoldMode; points: Point[]; regions?: Region[] }) {
  const outline = getFoldedOutline(size, fold);
  const xs = outline.map(p => p.x), ys = outline.map(p => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.28;
  const left = (Math.max(...xs) + Math.min(...xs) - span) / 2;
  const top = (Math.max(...ys) + Math.min(...ys) - span) / 2;
  return <figure className="edit-preview"><svg viewBox={`${left} ${top} ${span} ${span}`} role="img" aria-label="参数剪口预览，虚线为待提交剪口">
    <PaperArt regions={regions ?? [{ outer: outline, holes: [] }]} size={size} foldMode={fold} folded/>
    <path d={regionPath(regions ?? [{ outer: outline, holes: [] }])} fill="none" stroke="var(--zs-goal-retain)" strokeWidth={2} vectorEffect="non-scaling-stroke"/>
    <path d={linePath(points)} fill="var(--zs-bg-paper)" stroke="var(--zs-text-primary)" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke"/>
  </svg><figcaption>虚线：待提交剪口 · 描线：当前纸边。提交后检查完整剪切序列。</figcaption></figure>;
}
