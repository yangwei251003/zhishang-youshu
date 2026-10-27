import { useRef, useState } from 'react';
import { ImageDown, LoaderCircle } from 'lucide-react';
import type { Analysis, ProjectDocument } from '../types';
import { exportShareCardPng } from '../io/share-card';
import './share-card.css';

export default function ShareCardButton({ project, analysis, onError, disabled = false }: {
  project: ProjectDocument; analysis: Analysis; onError: (message: string) => void; disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function download() {
    if (disabled || pending.current) return;
    pending.current = true; setBusy(true);
    try { await exportShareCardPng(project, analysis); }
    catch (error) { onError(error instanceof Error ? error.message : '分享图暂时无法保存，请重试。'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <button type="button" className="share-card-button" disabled={disabled || busy} aria-busy={busy} onClick={download}>
    {busy ? <LoaderCircle size={25} className="spinning"/> : <ImageDown size={25}/>}
    <span><strong>{busy ? '正在生成分享图…' : '保存分享图（PNG）'}</strong><small>1080 × 1350 · 含作品名称、图案和统计，纯本地生成</small></span>
  </button>;
}
