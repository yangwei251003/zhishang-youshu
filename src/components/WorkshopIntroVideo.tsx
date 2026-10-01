import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { stopMusic } from '../audio/sfx';
import { WORKSHOP_FILM, WORKSHOP_TRANSCRIPT } from '../content/workshop-intro';

// Watching position belongs to this visit, never to a project or a saved preference.
const playbackPositions = new Map<string, number>();

export default function WorkshopIntroVideo({ playOnOpen = false }: { playOnOpen?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const source = WORKSHOP_FILM.src;
  const pendingRestore = useRef<number | null>(playbackPositions.get(source) ?? 0);
  const [failed, setFailed] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);

  function savePosition(media: HTMLVideoElement | null) {
    if (!media || pendingRestore.current !== null || media.readyState < 1 || !Number.isFinite(media.duration) || media.duration <= 0) return;
    if (media.ended) { playbackPositions.set(source, 0); return; }
    if (Number.isFinite(media.currentTime)) playbackPositions.set(source, Math.max(0, Math.min(media.currentTime, media.duration)));
  }
  function restorePosition(media: HTMLVideoElement) {
    if (pendingRestore.current === null || media.readyState < 1 || !Number.isFinite(media.duration) || media.duration <= 0) return;
    const desired = Number.isFinite(pendingRestore.current) ? Math.max(0, Math.min(pendingRestore.current, media.duration)) : 0;
    try {
      media.currentTime = desired;
      pendingRestore.current = null;
    } catch { /* A later metadata/duration event can retry a not-yet-seekable source. */ }
  }
  function play(media: HTMLVideoElement | null) {
    if (media) void media.play().catch(() => setNeedsPlay(true));
  }
  function restart() {
    const media = video.current;
    playbackPositions.set(source, 0);
    // Set the requested start before load/pause can dispatch events with an old position.
    pendingRestore.current = 0;
    setFailed(false); setNeedsPlay(false);
    if (!media) return;
    if (media.error) media.load();
    restorePosition(media);
    play(media);
  }
  function retry() {
    const media = video.current;
    savePosition(media);
    pendingRestore.current = playbackPositions.get(source) ?? 0;
    setFailed(false); setNeedsPlay(false);
    media?.load();
    play(media);
  }
  useEffect(() => {
    const media = video.current;
    if (playOnOpen && media) void media.play().catch(() => setNeedsPlay(true));
    const hide = () => { if (document.hidden) media?.pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); savePosition(media); media?.pause(); };
  }, [playOnOpen]);
  return <div className="workshop-film">
    <div className="workshop-film-screen">
      <video ref={video} controls playsInline preload="none" poster={WORKSHOP_FILM.poster} tabIndex={0} aria-label="纸上有数工坊介绍短片" onLoadedMetadata={event => restorePosition(event.currentTarget)} onDurationChange={event => restorePosition(event.currentTarget)} onPause={event => savePosition(event.currentTarget)} onEnded={() => { playbackPositions.set(source, 0); }} onPlay={() => { stopMusic(); setNeedsPlay(false); }} onError={event => { savePosition(event.currentTarget); setFailed(true); }}>
        <source src={WORKSHOP_FILM.src} type="video/mp4"/>
        <track kind="captions" src={WORKSHOP_FILM.captions} srcLang="zh-CN" label="简体中文字幕"/>
        你的浏览器暂时无法播放这段视频。下方有完整文字版介绍。
      </video>
    </div>
    <div className="film-playback-tools"><button className="small-button" onClick={restart}><RotateCcw size={14}/>从头播放</button>{needsPlay && !failed && <button className="small-button" onClick={() => play(video.current)}><Play size={14}/>点此开始播放</button>}</div>
    {failed && <div className="film-fallback" role="status"><p>短片暂时没有载入。你可以先读文字版，或直接动手试试。</p><button className="small-button" onClick={retry}><RotateCcw size={14}/>重新加载短片</button></div>}
    <p className="film-credit">{WORKSHOP_FILM.durationLabel} · 音乐 <a href={WORKSHOP_FILM.music.source} target="_blank" rel="noreferrer">《{WORKSHOP_FILM.music.title}》— {WORKSHOP_FILM.music.author}（incompetech.com）</a> · <a href={WORKSHOP_FILM.music.license} target="_blank" rel="noreferrer">CC BY 4.0</a><span>本片作节选、淡入淡出和混音。</span></p>
    <details className="film-transcript"><summary>阅读短片文字版</summary><div>{WORKSHOP_TRANSCRIPT.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></details>
  </div>;
}
