import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, eyebrow, children, onClose, wide = false }: {
  title: string; eyebrow?: string; children: ReactNode; onClose: () => void; wide?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], summary, [tabindex="0"]') ?? [])]
      .filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    const first = focusable()[0];
    first?.focus({preventScroll:true});
    if(panel.current)panel.current.scrollTop=0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      if (!items.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? items.at(-1) : items[0])?.focus(); }
      else if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = old; previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop"><div ref={panel} className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header className="dialog-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭对话框"><X size={20}/></button></header>
    {children}
  </div></div>;
}
