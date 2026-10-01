/** Original decorative cut-paper drawings. Never used as printable cutting geometry. */
export type WorkshopStage = 'think' | 'fold' | 'cut' | 'unfold' | 'revise' | 'print';

const stagePaths: Record<WorkshopStage, string> = {
  think: 'M5 16V5h14v11h-5l-3 4v-4H5M9 8h6M9 11h4',
  fold: 'M4 4h16v16H4ZM12 4v16M4 4l8 8L4 20',
  cut: 'M9 8l11 10M9 16L20 5M8 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  unfold: 'M12 4L3 7v13l9-3 9 3V7L12 4ZM12 4v13M7 9v6M17 9v6',
  revise: 'M19 8a8 8 0 1 0 1 8M19 3v5h-5M8 16l1-4 6-6 3 3-6 6-4 1Z',
  print: 'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6ZM17 11h1',
};

export function StageIcon({ stage, size = 24 }: { stage: WorkshopStage; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={stagePaths[stage]}/></svg>;
}

export function UnitMotif({ index, className = '' }: { index: number; className?: string }) {
  const paths = [
    'M12 3v18M10 5C2 3 2 12 10 12C2 12 2 21 10 19M14 5C22 3 22 12 14 12C22 12 22 21 14 19',
    'M3 3h18v18H3ZM12 6l6 6-6 6-6-6 6-6ZM3 12h3M18 12h3M12 3v3M12 18v3',
    'M3 8l5-5 5 5-5 5-5-5ZM11 16l5-5 5 5-5 5-5-5ZM8 8l8 8',
    'M3 4h18v16H3ZM7 4v5M12 4v3M17 4v5M3 15h18M8 15v5M16 15v5',
  ];
  return <svg className={`unit-motif ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" aria-hidden="true"><path d={paths[((index % 4) + 4) % 4]}/></svg>;
}

const stages: [WorkshopStage, string][] = [['think', '想'], ['fold', '折'], ['cut', '剪'], ['unfold', '展'], ['revise', '改'], ['print', '印']];

export function Hero({ compact = false }: { compact?: boolean }) {
  return <div className={`workshop-ornament${compact ? ' is-compact' : ''}`} aria-label="想、折、剪、展、改、印，六阶段纸上实验">
    <img className="hero-paper-flower" src="/v2/paper-flower-hero.svg" alt="原创朱红镂空团花与花叶，装饰示意" width="340" height="220"/>
    <div className="workshop-stages">{stages.map(([stage, label]) => <span key={stage}><StageIcon stage={stage} size={20}/><span>{label}</span></span>)}</div>
  </div>;
}
