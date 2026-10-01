import { useEffect, useRef, useState } from 'react';
import './OnboardingTour.css';
import { APPRENTICE_STEPS, CORE_STEPS } from '../onboarding/content';
const KEY = 'paperWorkshop.onboarding.v1';
let sessionChoice = false;
export function hasOnboardingChoice() { try { return sessionChoice || !!localStorage.getItem(KEY); } catch { return sessionChoice; } }
export function rememberOnboarding(status: 'completed' | 'skipped') { sessionChoice = true; try { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify({ status, tourVersion: 1 })); } catch { /* session preference still works */ } }
export default function OnboardingTour({ step, ready, busy = false, extended = false, onMove, onExit }: { step: number; ready: boolean; busy?: boolean; extended?: boolean; onMove: (step: number, explanationOnly?: boolean) => void; onExit: (completed?: boolean) => void }) {
  const card = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect>();
  const [placement, setPlacement] = useState<{ left?: number; top?: number; docked: boolean }>({ docked: window.innerWidth <= 750 });
  const exit = useRef(onExit); exit.current = onExit;
  const steps = extended ? APPRENTICE_STEPS : CORE_STEPS;
  const item = steps[step];
  const last = step === steps.length - 1;
  useEffect(() => {
    const target = item.anchor === 'folded-canvas' ? document.querySelector<HTMLElement>('[data-testid="folded-canvas"]') : document.querySelector<HTMLElement>(`[data-tour="${item.anchor}"]`);
    // Prediction disappears after a real submission. Keep its observation panel as the live anchor.
    const anchor = target ?? (item.anchor === 'prediction' || item.anchor === 'repair' ? document.querySelector<HTMLElement>('.right-rail') : null);
    if (!anchor) { setRect(undefined); return; }
    if (anchor instanceof HTMLDetailsElement) anchor.open = true;
    anchor.classList.add('tour-highlight');
    let docking = window.innerWidth <= 750;
    let frame = 0;
    const update = () => {
      const dialog = document.querySelector<HTMLElement>('.dialog');
      const box = (dialog ?? anchor).getBoundingClientRect();
      setRect(box);
      const width = 326, height = Math.min(card.current?.offsetHeight ?? 360, window.innerHeight - 24), gap = 14;
      const choices = [
        { left: box.right + gap, top: Math.max(12, Math.min(box.top, innerHeight - height - 12)) },
        { left: Math.max(12, Math.min(box.left, innerWidth - width - 12)), top: box.bottom + gap },
        { left: Math.max(12, Math.min(box.left, innerWidth - width - 12)), top: box.top - height - gap },
        { left: box.left - width - gap, top: Math.max(12, Math.min(box.top, innerHeight - height - 12)) },
      ];
      const available = !docking && innerWidth > 750 ? choices.find(p => p.left >= 12 && p.top >= 12 && p.left + width <= innerWidth - 12 && p.top + height <= innerHeight - 12) : undefined;
      docking = !available;
      setPlacement(available ? { ...available, docked: false } : { docked: true });
      document.documentElement.style.setProperty('--tour-dock-height', `${Math.min(card.current?.offsetHeight ?? 340, innerHeight * .43) + 12}px`);
    };
    anchor.scrollIntoView({ block: 'center', behavior: 'instant' });
    update();
    const fit = () => {
      update();
      if (docking && !document.querySelector('.dialog')) {
        const box = anchor.getBoundingClientRect(), available = innerHeight - Math.min(card.current?.offsetHeight ?? 340, innerHeight * .43) - 20;
        const desired = Math.max(12, (available - box.height) / 2);
        const scroller = innerHeight <= 600 ? document.querySelector<HTMLElement>('.app-shell') : null;
        if (scroller) scroller.scrollBy({ top: box.top - desired, behavior: 'instant' }); else window.scrollBy({ top: box.top - desired, behavior: 'instant' }); update();
      }
    };
    frame = requestAnimationFrame(() => { fit(); frame = requestAnimationFrame(fit); });
    const observer = new ResizeObserver(() => { update(); }); observer.observe(anchor); if (card.current) observer.observe(card.current);
    const mutation = new MutationObserver(() => { const dialog = document.querySelector('.dialog'); if (dialog) observer.observe(dialog); update(); });
    mutation.observe(document.querySelector('.app-shell') ?? document.body, { childList: true, subtree: true });
    const resize = () => { docking = innerWidth <= 750; fit(); };
    window.addEventListener('scroll', update, true); window.addEventListener('resize', resize);
    // Keep keyboard and pointer work inside the actual target, the guide, or its parameter dialog.
    const allowed = (node: EventTarget | null) => node instanceof Element && (!!node.closest('.tour-card,.dialog-backdrop,.print-fallback') || anchor.contains(node));
    const guard = (e: Event) => { if (e.target instanceof HTMLAnchorElement && e.target.hasAttribute('download') && e.target.href.startsWith('blob:')) return; if (!allowed(e.target)) { e.preventDefault(); e.stopPropagation(); } };
    const tab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || document.querySelector('.dialog-backdrop')) return;
      const selector = 'button:not([disabled]),input:not([disabled]),select,summary,[tabindex="0"]';
      const items = [...anchor.querySelectorAll<HTMLElement>(selector), ...(card.current?.querySelectorAll<HTMLElement>(selector) ?? [])].filter(el => el.getClientRects().length);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLElement);
      e.preventDefault(); items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    };
    document.addEventListener('keydown', tab);
    const focus = (e: FocusEvent) => { if (!allowed(e.target)) card.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); };
    document.addEventListener('click', guard, true); document.addEventListener('pointerdown', guard, true); document.addEventListener('focusin', focus);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', tab); anchor.classList.remove('tour-highlight'); observer.disconnect(); mutation.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', resize); document.removeEventListener('click', guard, true); document.removeEventListener('pointerdown', guard, true); document.removeEventListener('focusin', focus); };
  }, [item.anchor, step, ready]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.dialog-backdrop')) { e.preventDefault(); exit.current(false); } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, []);
  useEffect(() => { card.current?.focus(); }, [step]);
  return <>
    {!placement.docked && rect && <div className="tour-outline" aria-hidden="true" style={{ left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 }}/>}
    <div ref={card} className={`tour-card ${placement.docked ? 'tour-docked' : ''}`} role="region" aria-label="实景使用引导" tabIndex={-1} style={placement.docked ? undefined : { left: placement.left, top: placement.top }}>
      <span className="tour-counter">{extended ? '纸上第一课' : '引导练习'} · {step + 1} / {steps.length}</span><h2>{item.title}</h2><div className="tour-copy"><p><strong>做什么</strong>{item.action}</p><p><strong>为什么</strong>{item.why}</p><p><strong>和真纸的关系</strong>{item.paper}</p></div>
      <p className="tour-state" aria-live="polite">{step > 0 && (!last || extended) ? ready ? '本步操作已完成，可以继续。' : '等待你操作；也可先看说明，不计作完成。' : '练习不计入正式测验。'}</p>
      <div className="tour-actions"><button disabled={step === 0} onClick={() => onMove(step - 1)}>上一步</button><button className="primary-button" disabled={!ready || busy} onClick={() => last ? onExit(true) : onMove(step + 1)}>{last ? '开始我的实验' : '下一步'}</button></div>
      {!ready && <button className="tour-skip-step" onClick={() => last ? onExit(true) : onMove(step + 1, true)}>先看说明，跳过本步操作</button>}
      <button className="tour-exit" onClick={() => onExit(false)}>{extended ? '先到这里，下次继续（Esc）' : '跳过且不再提示（Esc）'}</button>
    </div>
    {placement.docked && <div className="tour-mobile-space"/>}
  </>;
}
