import { useEffect, useState } from 'react';
import { ExternalLink, Play, Scissors, WifiOff, X } from 'lucide-react';
import { embedUrl, PAPER_PRACTICE_STEPS, sourceUrl, videoForLesson, type InspirationCategory, type RealCutSource } from '../content/videos';
import '../styles/media.css';
import {LOCAL_VIDEOS} from '../content/local-videos';

/** Original decorative cover, deliberately independent from the cutting engine. */
export function VideoMotif({ category }: { category: InspirationCategory }) {
  return <svg className={`video-motif video-motif-${category}`} viewBox="0 0 240 160" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 30V12h18M212 12h18v18M230 130v18h-18M28 148H10v-18" opacity=".3" /></g>
    {category === 'happiness' ? <g fill="currentColor"><text x="120" y="119" textAnchor="middle" fontFamily="serif" fontSize="114" fontWeight="700">囍</text></g>
      : category === 'animal' ? <g fill="currentColor" transform="translate(120 80)"><path d="M-4-8C-84-98-98 16-16 13C-83 7-62 75-6 30L-3 8ZM4-8C84-98 98 16 16 13C83 7 62 75 6 30L3 8Z"/><path d="M-3-26L-9-39M3-26L9-39M0-24V37" stroke="currentColor" strokeWidth="4"/><g fill="var(--paper)"><path d="M-18-10C-56-53-63-13-24 0ZM18-10C56-53 63-13 24 0ZM-16 21L-40 32-24 39ZM16 21L40 32 24 39Z"/></g></g>
      : category === 'border' ? <g fill="currentColor">{[0, 1, 2, 3].map(index => <g key={index} transform={`translate(${29 + index * 61} 80)`}><path d="M0-35L29 0 0 35-29 0ZM0-22L-16 0 0 22 16 0Z" fillRule="evenodd"/><path d="M-33-4h66v8h-66Z"/><circle r="7" fill="var(--paper)"/></g>)}</g>
      : <g transform="translate(120 80)" fill="currentColor">{Array.from({ length: category === 'snowflake' ? 6 : 8 }, (_, index) => <g key={index} transform={`rotate(${index * (category === 'snowflake' ? 60 : 45)})`}>{category === 'snowflake' ? <path d="M-3-7V-60L0-70 3-60V-7ZM0-32L-24-48-20-54 0-41 20-54 24-48ZM0-16L-19-28-16-34 0-24 16-34 19-28Z"/> : <path d="M0-66C-28-54-24-28-6-12L0-7 6-12C24-28 28-54 0-66ZM0-51C9-40 10-32 0-24-10-32-9-40 0-51Z" fillRule="evenodd"/>}</g>)}<circle r="10" fill="var(--paper)"/><circle r="4"/></g>}
  </svg>;
}

export interface RealCutVideoProps { lessonId?: string; video?: RealCutSource; compact?: boolean; heading?: string }

export default function RealCutVideo({ lessonId, video, compact = false, heading = '看真人怎么剪' }: RealCutVideoProps) {
  const selected = video ?? videoForLesson(lessonId);
  return <VideoCard key={selected.id} video={selected} compact={compact} heading={heading}/>;
}

function VideoCard({ video, compact, heading }: { video: RealCutSource; compact: boolean; heading: string }) {
  const [expanded, setExpanded] = useState(!compact);
  const local = LOCAL_VIDEOS[video.category];
  const [localFailed, setLocalFailed] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [player, setPlayer] = useState<'idle' | 'loading' | 'ready' | 'failed' | 'local'>('idle');
  const [showPaperSteps, setShowPaperSteps] = useState(false);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setPlayer(navigator.onLine ? 'idle' : 'local'); };
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    if (player !== 'loading') return;
    const timeout = window.setTimeout(() => setPlayer('local'), 3000);
    return () => window.clearTimeout(timeout);
  }, [player]);
  const useLocal = expanded && !!local && !localFailed && (player === 'local' || !online);
  const loaded = player === 'loading' || player === 'ready';
  return <article className={`real-cut-video${compact ? ' real-cut-compact' : ''}`} data-video-id={video.id}>
    {compact && <button className="real-cut-expand" aria-expanded={expanded} onClick={() => { setExpanded(!expanded); if(expanded) setPlayer('idle'); }}><Scissors size={16}/><span>{heading}<small>{video.title}</small></span><span>{expanded ? '收起' : '展开'}</span></button>}
    {expanded && <>{heading && !compact && <div className="real-cut-eyebrow"><Scissors size={16}/><span>{heading}</span><span className="real-cut-duration">{video.duration}</span></div>}
    <div className="real-cut-player">
      {useLocal ? <video key={local.src} controls muted playsInline preload="none" src={local.src} aria-label={`本地示范：${local.title}`} onError={() => { setLocalFailed(true); setPlayer('failed'); }}/> : loaded ? <>
        <iframe src={embedUrl(video)} title={`${video.title} · ${video.author}`} loading="lazy" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setPlayer('ready')} onError={() => setPlayer('local')}/>
        {player === 'loading' && <p className="real-cut-loading" role="status">正在打开播放器…</p>}
      </> : <button className="real-cut-cover" type="button" onClick={() => { if (navigator.onLine) { setOnline(true); setShowPaperSteps(false); setPlayer('loading'); } else { setOnline(false); setPlayer('local'); } }} disabled={!online && !local} aria-label={online ? `打开视频：${video.title}` : `离线：${video.title}`}>
        <VideoMotif category={video.category}/><span className="real-cut-play">{online ? <Play size={20} fill="currentColor"/> : <WifiOff size={20}/>}</span>
        <span className="real-cut-cover-label">{online ? player === 'failed' ? '重新打开视频' : '点开真人示范' : '离线时，先看下方观察提示'}</span>
      </button>}
    </div>
    <div className="real-cut-body">
      {!online && useLocal && <button disabled aria-label={`离线：${video.title}`} className="local-online-unavailable">在线原版暂不可用 · 可看本站片段</button>}
      {localFailed && <p className="real-cut-status" role="status">本站片段暂时无法播放。可查看下面的文字步骤，或打开原站来源。</p>}
      {useLocal && <p className="local-video-credit">本类别的本站备用片段：{local.title}<br/>作者：{local.author} · {local.excerpt}<br/><a href={local.sourceUrl} target="_blank" rel="noopener noreferrer">查看片段原视频与来源</a></p>}
      <h3>{useLocal ? local.title : video.title}</h3><p className="real-cut-summary">{video.summary}</p>
      <p className="real-cut-byline">作者：{useLocal ? local.author : video.author}</p>
      <div className="real-cut-links"><a href={useLocal ? local.sourceUrl : sourceUrl(video)} target="_blank" rel="noopener noreferrer">B 站原视频 <ExternalLink size={13}/></a>{loaded && local && <button type="button" onClick={() => setPlayer('local')}>播放本站片段</button>}{loaded && <button type="button" onClick={() => setPlayer('idle')}><X size={13}/>收起视频</button>}</div>
      {(!online || player === 'failed' || player === 'local') && <p className="real-cut-status" role="status">{!online ? '当前离线。可播放本站片段；文字提示和工坊练习仍然可用。' : '播放器暂时没有打开。你可以重试，或在原站观看；这不影响工坊练习。'}</p>}
      {(!online || player === 'failed' || player === 'local' || showPaperSteps) && <div className="real-cut-offline-steps"><h4>先在纸上试三步</h4><ol>{PAPER_PRACTICE_STEPS[video.category].map(step => <li key={step}>{step}</li>)}</ol><p>本工坊的入门提示，可先用废纸试剪。</p></div>}
      {loaded && <p className="real-cut-play-note">默认静音，不自动播放。若无法播放，可打开原视频，或<button type="button" onClick={() => { setPlayer('idle'); setShowPaperSteps(true); }}>改看文字步骤</button>。</p>}
      <details className="real-cut-observations" open={!online || player === 'failed'}>
        <summary>带着两个问题看</summary><ol>{video.watchFor.map(item => <li key={item}>{item}</li>)}</ol>
        <p className="real-cut-original-title">原视频：{video.sourceTitle}</p>
      </details>
    </div></>}
  </article>;
}
