import { APP_VERSION, MAX_CUTS, MAX_VERTICES } from '../types';
import type { Analysis, Cut, Point, ProjectDocument, Region } from '../types';
import { LESSONS } from '../lessons';
import { buildLearningRecords } from './learning';

const MAX_FILE_BYTES = 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(message: string): never { throw new Error(`无法导入项目：${message}`); }
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name}格式不正确。`);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], name: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail(`${name}含有未知字段。`);
}
function string(value: unknown, name: string, max = 128, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`${name}不是有效文本。`);
}
function identifier(value: unknown, name: string): void {
  string(value, name, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(value)) fail(`${name}格式不正确。`);
}
function integer(value: unknown, name: string, min: number, max: number): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(`${name}超出允许范围。`);
}
function date(value: unknown, name: string): void {
  string(value, name, 32);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${name}不是有效日期。`);
}
function array(value: unknown, name: string, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${name}数量超出允许范围。`);
}
function rejectUnsafeKeys(value: unknown, depth = 0): void {
  if (depth > 16) fail('文件嵌套过深。');
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) fail('文件包含不允许的字段。');
    rejectUnsafeKeys(child, depth + 1);
  }
}
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-8;
const samePoint = (a: Point, b: Point) => close(a.x, b.x) && close(a.y, b.y);
function onSegment(a: Point, b: Point, p: Point): boolean {
  return close(cross(a, b, p), 0) && p.x >= Math.min(a.x, b.x) - 1e-8 && p.x <= Math.max(a.x, b.x) + 1e-8 && p.y >= Math.min(a.y, b.y) - 1e-8 && p.y <= Math.max(a.y, b.y) + 1e-8;
}
function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return true;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}
function validatePolygon(points: Point[], name: string): void {
  let doubleArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (samePoint(a, b)) fail(`${name}含重复顶点。`);
    doubleArea += a.x * b.y - b.x * a.y;
    const c = points[(i + 2) % points.length];
    if (close(cross(a, b, c), 0) && (onSegment(a, b, c) || onSegment(b, c, a))) fail(`${name}含重叠边。`);
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (segmentsIntersect(a, b, points[j], points[(j + 1) % points.length])) fail(`${name}存在交叉或接触的非相邻边。`);
    }
  }
  if (Math.abs(doubleArea) < 0.0002) fail(`${name}面积过小或为零。`);
}

/** Import only our bounded native project format; arbitrary SVG/HTML is never accepted. */
export function parseProject(text: string): ProjectDocument {
  if (typeof text !== 'string' || text.length > MAX_FILE_BYTES || new TextEncoder().encode(text).length > MAX_FILE_BYTES) fail('文件不能大于 1 MB。');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { fail('请使用有效的项目 JSON 文件。'); }
  rejectUnsafeKeys(parsed);
  const root = object(parsed, '项目');
  keys(root, ['schemaVersion', 'id', 'title', 'createdAt', 'updatedAt', 'revision', 'paperSizeMm', 'foldMode', 'cuts', 'cursor', 'mode', 'lessonId', 'progress', 'events', 'participantId', 'feedbackMode'], '项目');
  if (root.schemaVersion !== 1) fail('不支持此文件版本。');
  identifier(root.id, '项目编号'); string(root.title, '作品名称', 120);
  date(root.createdAt, '创建时间'); date(root.updatedAt, '更新时间');
  integer(root.revision, '操作版本', 0, Number.MAX_SAFE_INTEGER);
  if (typeof root.paperSizeMm !== 'number' || !Number.isFinite(root.paperSizeMm) || root.paperSizeMm < 80 || root.paperSizeMm > 180) fail('纸张边长须为 80–180 mm。');
  const paperSizeMm = root.paperSizeMm;
  if (![2, 4, 8].includes(root.foldMode as number)) fail('只支持 2、4、8 层折叠。');
  if (root.mode !== 'learn' && root.mode !== 'create') fail('学习模式不正确。');
  if (root.feedbackMode !== 'explained' && root.feedbackMode !== 'basic') fail('反馈模式不正确。');
  identifier(root.lessonId, '课程编号');
  if (!LESSONS.some((lesson) => lesson.id === root.lessonId)) fail('无法识别此课程。');
  identifier(root.participantId, '匿名编号');
  array(root.cuts, '剪切步骤', MAX_CUTS);
  integer(root.cursor, '当前步骤', 0, root.cuts.length);
  const cutIds = new Set<string>();
  for (const [index, item] of root.cuts.entries()) {
    const name = `第 ${index + 1} 刀`, cut = object(item, name);
    keys(cut, ['id', 'shape', 'points', 'label'], name);
    identifier(cut.id, `${name}编号`); string(cut.label, `${name}名称`, 120);
    if (cutIds.has(cut.id as string)) fail('剪切步骤编号不能重复。');
    cutIds.add(cut.id as string);
    if (!['rectangle', 'triangle', 'polygon'].includes(cut.shape as string)) fail(`${name}形状不正确。`);
    array(cut.points, `${name}顶点`, MAX_VERTICES);
    if (cut.points.length < 3 || (cut.shape === 'triangle' && cut.points.length !== 3) || (cut.shape === 'rectangle' && cut.points.length !== 4)) fail(`${name}顶点数量不匹配。`);
    const points: Point[] = cut.points.map((point, pointIndex) => {
      const pt = object(point, `${name}顶点 ${pointIndex + 1}`);
      keys(pt, ['x', 'y'], `${name}顶点`);
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number' || !Number.isFinite(pt.x) || !Number.isFinite(pt.y) || Math.abs(pt.x) > paperSizeMm * 2 || Math.abs(pt.y) > paperSizeMm * 2) fail(`${name}坐标无效或超出范围。`);
      return { x: pt.x, y: pt.y };
    });
    validatePolygon(points, name);
    validatePolygon(points.map((point) => ({ x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 })), `${name}（0.01 mm 网格）`);
    if (cut.shape === 'rectangle') for (let i = 0; i < 4; i++) {
      const a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4];
      if ((!close(a.x, b.x) && !close(a.y, b.y)) || !close((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y), 0)) fail(`${name}须为边平行于坐标轴的矩形。`);
    }
  }
  array(root.progress, '学习进度', 100);
  for (const item of root.progress) {
    const progress = object(item, '学习进度'); keys(progress, ['lessonId', 'prediction', 'completedAt'], '学习进度');
    identifier(progress.lessonId, '进度课程编号'); string(progress.prediction, '预测', 4096, true);
    if (progress.completedAt !== undefined) date(progress.completedAt, '完成时间');
  }
  array(root.events, '学习记录', 10000);
  for (const item of root.events) {
    const event = object(item, '学习记录'); keys(event, ['at', 'type', 'lessonId', 'value'], '学习记录');
    date(event.at, '记录时间'); string(event.type, '记录类型', 64); string(event.value, '记录内容', 4096, true);
    if (event.lessonId !== undefined) identifier(event.lessonId, '记录课程编号');
  }
  return parsed as ProjectDocument;
}

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const fmt = (n: number) => Number(n.toFixed(3)).toString();
const pathFor = (points: Point[]) => points.length ? `M${points.map((point) => `${fmt(point.x)},${fmt(point.y)}`).join('L')}Z` : '';
const regionPath = (region: Region) => [region.outer, ...region.holes].map(pathFor).join('');
function checkAnalysis(project: ProjectDocument, analysis: Analysis): void {
  if (analysis.revision !== project.revision) throw new Error('几何计算尚未更新，请等待当前操作完成后再导出。');
}
function foldLines(project: ProjectDocument): string {
  const h = project.paperSizeMm / 2;
  let lines = `<line x1="0" y1="-${h}" x2="0" y2="${h}"/>`;
  if (project.foldMode >= 4) lines += `<line x1="-${h}" y1="0" x2="${h}" y2="0"/>`;
  if (project.foldMode === 8) lines += `<line x1="-${h}" y1="-${h}" x2="${h}" y2="${h}"/><line x1="-${h}" y1="${h}" x2="${h}" y2="-${h}"/>`;
  return `<g fill="none" stroke="#746e63" stroke-width="0.2" stroke-dasharray="2 2">${lines}</g>`;
}

export function projectSvg(project: ProjectDocument, analysis: Analysis): string {
  checkAnalysis(project, analysis);
  const size = project.paperSizeMm, h = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="-${h} -${h} ${size} ${size}" role="img"><title>${escapeXml(project.title)}</title><desc>纸上有数 ${APP_VERSION}；边长 ${size} mm；${project.foldMode} 层；操作版本 ${project.revision}。几何连通不代表纸张牢固。</desc><g fill="#b94232" fill-rule="evenodd">${analysis.unfolded.map((region) => `<path d="${regionPath(region)}"/>`).join('')}</g>${foldLines(project)}</svg>`;
}

function foldedTemplate(project: ProjectDocument): string {
  const h = project.paperSizeMm / 2, two = project.foldMode === 2;
  const bounds = two ? `0 -${h} ${h} ${project.paperSizeMm}` : `0 0 ${h} ${h}`;
  const paper = two ? [ {x: 0, y: -h}, {x: h, y: -h}, {x: h, y: h}, {x: 0, y: h} ] : project.foldMode === 4 ? [{x:0,y:0},{x:h,y:0},{x:h,y:h},{x:0,y:h}] : [{x:0,y:0},{x:h,y:0},{x:h,y:h}];
  const cuts = project.cuts.slice(0, project.cursor);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${h}mm" height="${two ? project.paperSizeMm : h}mm" viewBox="${bounds}"><defs><clipPath id="folded-paper"><path d="${pathFor(paper)}"/></clipPath></defs><path d="${pathFor(paper)}" fill="#faf7ef" stroke="#222" stroke-width="0.3"/><g clip-path="url(#folded-paper)">${cuts.map((cut, index) => {
    const centre = cut.points.reduce((sum, point) => ({x: sum.x + point.x / cut.points.length, y: sum.y + point.y / cut.points.length}), {x:0,y:0});
    return `<path d="${pathFor(cut.points)}" fill="#b94232" fill-opacity="0.08" stroke="#b94232" stroke-width="0.35" stroke-dasharray="1.2 0.7"/><text x="${fmt(centre.x)}" y="${fmt(centre.y)}" fill="#8d241e" font-family="sans-serif" font-size="3" text-anchor="middle">${index + 1}</text>`;
  }).join('')}</g></svg>`;
}

const foldInstructions = (project: ProjectDocument) => [
  '将正方形纸沿竖直中线对折，左半面叠到右半面。',
  ...(project.foldMode >= 4 ? ['再沿水平中线对折，上半面叠到下半面，形成四层正方形。'] : []),
  ...(project.foldMode === 8 ? ['将四层正方形沿纸心至右下角的对角线折叠，下侧叠到上侧，留下 0 ≤ y ≤ x 的三角形。'] : []),
  '对齐折叠态模板，按编号逐刀剪切所有叠层。红色虚线为刀线，实线为折后纸边。',
  '逆折叠顺序展开，与第 1 页参照比较。',
];

export function printHtml(project: ProjectDocument, analysis: Analysis): string {
  checkAnalysis(project, analysis);
  const labels = { connected: '几何连通', separated: '存在分离纸片', uncertain: '需人工检查', empty: '没有保留纸片', invalid: '剪切序列无效' };
  const status = labels[analysis.status];
  const verified = analysis.validSequence && analysis.status !== 'invalid' && analysis.status !== 'empty' && analysis.status !== 'uncertain';
  const issues = analysis.issues.map((issue) => `<li>${escapeXml(issue.message)}</li>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeXml(project.title)} · 打印模板</title><style>
@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#24211d;background:#e7e3da;font-family:"Microsoft YaHei",sans-serif;font-size:10pt;line-height:1.55}.page{width:186mm;margin:8mm auto;padding:0;background:#fff;break-after:page}.page:last-child{break-after:auto}h1{font-size:18pt;margin:0 0 2mm}h2{font-size:14pt;margin:0 0 3mm}p{margin:2mm 0}.meta{font-size:9pt;color:#59534a}.pattern{text-align:center;margin:4mm 0}.pattern svg{display:inline-block;max-width:none}.status{border-left:1mm solid #b94232;padding-left:3mm;font-size:9pt}.ruler{display:block;width:100mm;height:9mm;margin:4mm 0 1mm}.footer{font-size:8pt;color:#625c51;border-top:.2mm solid #ddd;padding-top:2mm;margin-top:3mm}.fold-layout{display:flex;gap:7mm;align-items:flex-start}.fold-layout .instructions{flex:1;font-size:9pt}.fold-layout .template{flex:none}.steps{font-size:9pt;columns:2;column-gap:8mm}.steps li{break-inside:avoid}ol{padding-left:5mm}button{padding:10px 20px;cursor:pointer}.screen{width:186mm;margin:6mm auto;background:#fff;padding:4mm}@media print{body{background:#fff}.page{margin:0}.screen{display:none}button{display:none}}
</style></head><body><div class="screen"><b>打印设置：</b>选择 A4、实际大小 / 100%，关闭“适应页面”和浏览器页眉页脚。共有展开参照与折剪步骤两部分。请先核对标尺。</div>
<section class="page"><h1>纸上有数 · ${escapeXml(project.title)}</h1><p class="meta">${project.paperSizeMm} × ${project.paperSizeMm} mm · ${project.foldMode} 层折叠 · ${project.cursor} 刀 · 版本 ${APP_VERSION} / 操作 ${project.revision}</p><p class="status">${verified ? '数字几何结果' : '检查用模板 · 暂不作为制作依据'}：${status}；${analysis.componentCount} 片纸，${analysis.holeCount} 个孔。${analysis.firstSeparationStep ? `第 ${analysis.firstSeparationStep} 刀首次产生分离。` : ''}</p><div class="pattern">${projectSvg(project, analysis)}</div><p class="meta">展开参照（实际大小）。红色为保留纸，空白为裁去区域，灰色虚线为折线参照。</p><svg xmlns="http://www.w3.org/2000/svg" class="ruler" width="100mm" height="9mm" viewBox="0 0 100 9"><path d="M0 1V5M0 3H100M100 1V5M10 2V4M20 2V4M30 2V4M40 2V4M50 1V5M60 2V4M70 2V4M80 2V4M90 2V4" fill="none" stroke="#222" stroke-width=".3"/><text x="50" y="8" font-size="2.7" text-anchor="middle">100 mm 校准标尺 · 超过 ±1 mm 请先校准</text></svg><p class="footer">此模板只说明几何关系，不保证实际可剪或纸张牢固。制作前记录纸张、打印比例、工具与版本；完成后记录实物差异。当前文件不包含实物验证结论。</p></section>
<section class="page"><h2>折叠态刀线与制作顺序</h2><p class="meta">${escapeXml(project.title)} · 折叠后模板为实际大小；纸心对应坐标原点。</p><div class="fold-layout"><div class="template">${foldedTemplate(project)}</div><div class="instructions"><ol>${foldInstructions(project).map((step) => `<li>${escapeXml(step)}</li>`).join('')}</ol><p>修复是在动剪刀前修改模板；已剪去的纸无法用追加剪切补回。</p></div></div><h2 style="margin-top:5mm">剪切记录</h2><ol class="steps">${project.cuts.slice(0, project.cursor).map((cut: Cut) => `<li>${escapeXml(cut.label)}（${cut.shape === 'rectangle' ? '矩形' : cut.shape === 'triangle' ? '三角形' : '多边形'}）</li>`).join('') || '<li>尚未剪切。</li>'}</ol>${issues ? `<h2>待检查项</h2><ul>${issues}</ul>` : ''}<p class="footer">纸张：________　打印标尺实测：________ mm　工具：________<br>制作日期：________　结果与差异：________________________________</p></section></body></html>`;
}

function filename(title: string): string { return title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 80) || '纸上有数'; }
function download(text: string, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.hidden = true; document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadProject(project: ProjectDocument): void {
  const safe = parseProject(JSON.stringify(project));
  download(JSON.stringify(safe, null, 2), `${filename(project.title)}.paper.json`, 'application/json;charset=utf-8');
}
export function downloadSvg(project: ProjectDocument, analysis: Analysis): void {
  download(projectSvg(project, analysis), `${filename(project.title)}.svg`, 'image/svg+xml;charset=utf-8');
}
export function downloadPrintHtml(project: ProjectDocument, analysis: Analysis): void {
  download(printHtml(project, analysis), `${filename(project.title)}-打印纸样.html`, 'text/html;charset=utf-8');
}
export function openPrint(project: ProjectDocument, analysis: Analysis): void {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('打印窗口被浏览器拦截。请允许此页面打开弹出窗口后重试。');
  try {
    popup.opener = null;
    popup.document.open(); popup.document.write(printHtml(project, analysis)); popup.document.close();
    popup.focus(); window.setTimeout(() => { if (!popup.closed) popup.print(); }, 250);
  } catch (error) { popup.close(); throw error; }
}
export function downloadLearningRecords(project: ProjectDocument): void {
  const record = buildLearningRecords(project);
  download(JSON.stringify(record, null, 2), `${project.participantId}-学习记录.json`, 'application/json;charset=utf-8');
}
