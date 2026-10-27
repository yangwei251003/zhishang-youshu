import type { Analysis, ProjectDocument } from '../types';
import { projectSvg } from './files';

export const SHARE_CARD_SIZE = { width: 1080, height: 1350 } as const;
const FONT = '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif';
const COLORS = { paper: '#FFFCF5', frame: '#D8C8B1', text: '#302821', secondary: '#6B5748', brand: '#B72D24' };
interface ShareCardOptions { dateLabel?: string; includeText?: boolean }
interface TextLine { text: string; x: number; y: number; size: number; weight: number; color: string; maxWidth: number }
const escapeXml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
const filename = (title: string) => title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 70) || '纸上有数';

function titleLines(title: string): string[] {
  const chars = Array.from(title.trim() || '我的纸上实验');
  const lines: string[] = []; let line = '', width = 0;
  for (const char of chars) {
    const advance = /[\u0000-\u007f]/.test(char) ? 0.6 : 1;
    if (width + advance > 19) { lines.push(line); line = ''; width = 0; }
    line += char; width += advance;
  }
  if (line) lines.push(line);
  if (lines.length > 2) return [lines[0], `${Array.from(lines[1]).slice(0, -1).join('')}…`];
  return lines;
}

function cardText(project: ProjectDocument, analysis: Analysis, options: ShareCardOptions): TextLine[] {
  return [
    { text: '纸上有数  /  我的剪纸实验', x: 78, y: 72, size: 22, weight: 500, color: COLORS.brand, maxWidth: 920 },
    ...titleLines(project.title).map((text, i) => ({ text, x: 78, y: 147 + i * 60, size: 46, weight: 600, color: COLORS.text, maxWidth: 920 })),
    { text: `${project.foldMode} 层折叠 · ${project.cursor} 刀 · 纸 ${project.paperSizeMm} mm`, x: 78, y: 257, size: 26, weight: 400, color: COLORS.secondary, maxWidth: 920 },
    { text: `${analysis.componentCount} 片纸  ·  ${analysis.holeCount} 个孔  ·  保留 ${Math.round(analysis.areaMm2 / (project.paperSizeMm ** 2) * 100)}%`, x: 78, y: 1199, size: 24, weight: 400, color: COLORS.text, maxWidth: 920 },
    { text: '纸上有数 · 让几何在指尖发生', x: 78, y: 1250, size: 29, weight: 600, color: COLORS.brand, maxWidth: 920 },
    { text: `数字图案 · 几何连通不代表纸张牢固${options.dateLabel ? `  /  ${options.dateLabel}` : ''}`, x: 78, y: 1296, size: 20, weight: 400, color: COLORS.secondary, maxWidth: 920 },
  ];
}

/** Fixed paper colours keep saved cards independent from the current UI theme. */
export function buildShareCardSvg(project: ProjectDocument, analysis: Analysis, options: ShareCardOptions = {}): string {
  if (!analysis.validSequence || analysis.unfolded.length === 0) throw new Error('请先得到有效且非空的展开图案，再保存分享图。');
  // projectSvg checks the revision and is the sole source of all geometry paths.
  const pattern = projectSvg(project, analysis).replace(/<svg\b[^>]*>/, `<svg x="120" y="306" width="840" height="840" viewBox="-${project.paperSizeMm / 2} -${project.paperSizeMm / 2} ${project.paperSizeMm} ${project.paperSizeMm}" overflow="hidden">`);
  const text = options.includeText === false ? '' : cardText(project, analysis, options).map(line => `<text x="${line.x}" y="${line.y}" font-family="${escapeXml(FONT)}" font-size="${line.size}" font-weight="${line.weight}" fill="${line.color}">${escapeXml(line.text)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_CARD_SIZE.width}" height="${SHARE_CARD_SIZE.height}" viewBox="0 0 ${SHARE_CARD_SIZE.width} ${SHARE_CARD_SIZE.height}" role="img"><title>${escapeXml(project.title)} · 纸上有数分享卡</title><desc>纯本地生成的数字剪纸图案，不是实际尺寸打印模板，不包含实剪或学习效果结论。</desc><rect width="1080" height="1350" fill="${COLORS.paper}"/><path d="M78 92H1002M78 1210H1002" fill="none" stroke="${COLORS.frame}" stroke-width="1"/><rect x="96" y="282" width="888" height="888" fill="none" stroke="${COLORS.frame}" stroke-width="1"/>${pattern}${text}</svg>`;
}

function loadLocalSvg(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('本地图案暂时无法转换为图片，请重试。')); };
    image.src = url;
  });
}

/** Rasterise local paths, then draw text with the page's fully loaded Chinese font. */
export async function exportShareCardPng(project: ProjectDocument, analysis: Analysis): Promise<void> {
  const dateLabel = new Date().toLocaleDateString('sv-SE');
  const options = { dateLabel, includeText: false };
  const svg = buildShareCardSvg(project, analysis, options);
  const lines = cardText(project, analysis, options);
  if (document.fonts) {
    await document.fonts.load(`46px ${FONT}`, lines.map(line => line.text).join(''));
    await document.fonts.ready;
  }
  const image = await loadLocalSvg(svg);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_SIZE.width; canvas.height = SHARE_CARD_SIZE.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成分享图片，请使用矢量图案导出。');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const line of lines) {
    context.font = `${line.weight} ${line.size}px ${FONT}`;
    context.fillStyle = line.color;
    context.fillText(line.text, line.x, line.y, line.maxWidth);
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    try { canvas.toBlob(value => value ? resolve(value) : reject(new Error('分享图片生成失败，请重试。')), 'image/png'); }
    catch { reject(new Error('当前浏览器未能导出本地图片，请使用矢量图案导出。')); }
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url; anchor.download = `${filename(project.title)}-${dateLabel}-分享卡.png`;
    anchor.hidden = true; document.body.append(anchor); anchor.click();
  } finally {
    anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
