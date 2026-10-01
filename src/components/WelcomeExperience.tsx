import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Play, Scissors, X } from 'lucide-react';
import WorkshopIntroVideo from './WorkshopIntroVideo';
import { WORKSHOP_FILM } from '../content/workshop-intro';
import '../styles/guide.css';

const WELCOME_KEY = 'paperWorkshop.welcome.v1';
let sessionChoice = false;
export function hasWelcomeChoice() { try { return sessionChoice || !!localStorage.getItem(WELCOME_KEY); } catch { return sessionChoice; } }
export function rememberWelcomeChoice(choice: 'film' | 'tour' | 'skip' | 'apprentice') {
  sessionChoice = true;
  try { localStorage.setItem(WELCOME_KEY, JSON.stringify({ choice, version: 1 })); } catch { /* The current visit still remembers the choice. */ }
}

export function WorkshopFilmDock({ onOpen }: { onOpen: () => void }) {
  return <button className="workshop-film-dock" data-film-dock onClick={onOpen} aria-label="观看工坊介绍短片"><span className="film-dock-thumb" data-film-dock-target><img src={WORKSHOP_FILM.poster} alt=""/><Play size={15} fill="currentColor"/></span><span><strong>工坊介绍短片</strong><small>{WORKSHOP_FILM.durationLabel} · 随时重看</small></span><ArrowRight size={14}/></button>;
}

export default function WelcomeExperience({ onTour, onSkip, onApprentice }: { onTour: () => Promise<void>; onSkip: () => void; onApprentice: () => void }) {
  const [watching, setWatching] = useState(false);
  const [departing, setDeparting] = useState(false);
  const panel = useRef<HTMLDivElement>(null), preview = useRef<HTMLDivElement>(null), screen = useRef<HTMLDivElement>(null);
  const flight = useRef<HTMLElement | null>(null);
  const locked = useRef(false), mounted = useRef(true);
  const close = useRef<() => void>(() => {});
  const titleId = useId();
  close.current = () => { if (!locked.current) void leave('skip'); };
  useEffect(() => { if (watching) screen.current?.querySelector('video')?.focus({ preventScroll: true }); }, [watching]);
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], video, summary, [tabindex="0"]') ?? [])].filter(node => node.getClientRects().length);
      if (!nodes.length) return;
      const index = nodes.indexOf(document.activeElement as HTMLElement);
      if (index < 0 || (!event.shiftKey && index === nodes.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault(); (event.shiftKey ? nodes.at(-1) : nodes[0])?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => { mounted.current = false; document.removeEventListener('keydown', key); document.body.style.overflow = originalOverflow; flight.current?.remove(); previous?.focus({ preventScroll: true }); };
  }, []);

  async function dockFilm() {
    const source = (watching ? screen.current?.querySelector('video') : preview.current)?.getBoundingClientRect();
    const target = document.querySelector<HTMLElement>('[data-film-dock-target]');
    if (!source || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // The sidebar can sit below the fold on a phone; measure after making its real destination visible.
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const destination = target.getBoundingClientRect();
    if (!destination.width || !destination.height) return;
    const copy = document.createElement('div'); copy.className = 'intro-dock-flight'; copy.setAttribute('aria-hidden', 'true');
    const poster = document.createElement('img'); poster.src = WORKSHOP_FILM.poster; poster.alt = ''; copy.append(poster);
    Object.assign(copy.style, { left: `${source.left}px`, top: `${source.top}px`, width: `${source.width}px`, height: `${source.height}px` });
    document.body.append(copy); flight.current = copy;
    try {
      if (typeof copy.animate !== 'function') return;
      const animation = copy.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '4px' },
        { transform: `translate(${destination.left - source.left}px, ${destination.top - source.top}px) scale(${destination.width / source.width}, ${destination.height / source.height})`, opacity: .95, borderRadius: '4px' },
      ], { duration: 680, easing: 'cubic-bezier(.22,.68,.18,1)', fill: 'forwards' });
      await animation.finished;
      if (mounted.current && typeof target.animate === 'function') target.animate([{ boxShadow: '0 0 0 0px var(--zs-brand-soft)' }, { boxShadow: '0 0 0 8px transparent' }], { duration: 500 });
    } catch { /* Finishing the choice never depends on animation support. */ }
    finally { copy.remove(); flight.current = null; }
  }

  async function leave(choice: 'tour' | 'skip' | 'apprentice') {
    if (locked.current) return;
    locked.current = true; setDeparting(true);
    screen.current?.querySelector('video')?.pause();
    try {
      try { await dockFilm(); } catch { /* A browser animation error must not block either way into the workshop. */ }
      if (!mounted.current) return;
      rememberWelcomeChoice(choice);
      if (choice === 'tour') await onTour(); else if (choice === 'apprentice') onApprentice(); else onSkip();
    } finally { if (mounted.current) { locked.current = false; setDeparting(false); } }
  }

  return <div className={`dialog-backdrop welcome-backdrop${departing ? ' is-departing' : ''}`}>
    <div className={`dialog welcome-dialog${watching ? ' is-watching' : ''}`} ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="welcome-header"><span className="guide-kicker">欢迎来到纸上有数</span><button className="icon-button" aria-label="直接进入工坊" disabled={departing} onClick={() => void leave('skip')}><X size={20}/></button></header>
      <div className="welcome-heading"><h2 id={titleId}>{watching ? '先看一眼，这张纸的故事。' : <>一张纸，<br/>先从好奇开始。</>}</h2><p>{watching ? '看完不急着离开，下一刀就轮到你。' : '可以先看一段短片，也可以跟着剪一刀。\n不用准备工具，现在就能试试。'}</p></div>
      {watching ? <div ref={screen} className="welcome-screen"><WorkshopIntroVideo playOnOpen/></div> : <div className="welcome-choices">
        <article className="welcome-watch-choice"><div className="welcome-film-preview" ref={preview}><img src={WORKSHOP_FILM.poster} alt="纸上有数介绍短片封面"/><span className="welcome-preview-play" aria-hidden="true"><Play size={25} fill="currentColor"/></span><span className="welcome-preview-caption">{WORKSHOP_FILM.title}</span></div><div className="welcome-choice-copy"><span className="guide-kicker">看见工坊</span><h3>先看短片</h3><p>认识这张纸能做的事，<br/>再挑一个想法试试。</p><button className="primary-button" disabled={departing} onClick={() => { rememberWelcomeChoice('film'); setWatching(true); }}>先看短片 <Play size={16}/></button></div></article>
        <article className="welcome-try-choice"><div className="welcome-paper-fold" aria-hidden="true"><Scissors size={33}/><span>想 · 折 · 剪 · 展</span></div><div className="welcome-choice-copy"><span className="guide-kicker">动手认识</span><h3>跟着做一遍</h3><p>留个预测，剪下一角，<br/>一步步看看它怎样展开。</p><button className="secondary-button" disabled={departing} onClick={() => void leave('tour')}>跟着做一遍 <ArrowRight size={16}/></button></div></article>
      </div>}
      {watching && <div className="welcome-after-film"><button className="primary-button" disabled={departing} onClick={() => void leave('tour')}>跟着做一遍 <ArrowRight size={16}/></button><span>短片会收进侧栏，想看时随时回来。</span></div>}
      <footer className="welcome-footer"><button disabled={departing} onClick={() => void leave('skip')}>直接进入，不再提示 <ArrowRight size={14}/></button><button disabled={departing} onClick={() => void leave('apprentice')}>纸上第一课 · 完整七任务</button></footer>
      <p className="welcome-footnote">不用登录。作品留在本机，也可以导出备份。</p>
    </div>
  </div>;
}
