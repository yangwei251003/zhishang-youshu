import { useEffect, useState } from 'react';
import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import Dialog from './Dialog';
import { TASKS, type ApprenticeState, type ApprenticeTaskId } from '../onboarding/apprentice';

export default function ApprenticeTasks({ state, onTask, onDismiss, collapsedInitially = false }: { state: ApprenticeState; onTask: (id: ApprenticeTaskId) => void; onDismiss: () => void; collapsedInitially?: boolean }) {
  const [expanded, setExpanded] = useState(!collapsedInitially && window.innerWidth > 750 && state.status === 'active');
  useEffect(() => { if (state.status !== 'active' || collapsedInitially) setExpanded(false); }, [state.status, collapsedInitially]);
  const runTask = (id: ApprenticeTaskId) => { setExpanded(false); onTask(id); };
  const count = Object.keys(state.tasks).length;
  const next = TASKS.find(task => !state.tasks[task.id]);
  return <section className={`apprentice-tasks ${state.status === 'graduated' ? 'apprentice-graduated' : ''}`} aria-label="纸上第一课" data-tour="apprentice">
    <button className="apprentice-summary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><GraduationCap size={19}/><span>{state.status === 'graduated' ? '已出徒' : '纸上第一课'}<small>{count} / 7 项真实体验</small></span><ChevronDown size={15}/></button><div className="apprentice-progress" role="progressbar" aria-label="第一课进度" aria-valuemin={0} aria-valuemax={7} aria-valuenow={count}><span style={{width:`${count / 7 * 100}%`}}/></div>
    {expanded && <><p className="apprentice-intro">一张纸的完整旅程。练习副本不影响正式学习。</p><ol>{TASKS.map(task => <li key={task.id} className={`${state.tasks[task.id] ? 'task-complete' : ''} ${task.id === next?.id ? 'task-next' : ''}`}><button onClick={() => runTask(task.id)} title={task.description}><span className="task-check">{state.tasks[task.id] && <Check size={13}/>}</span><span>{task.title}</span>{state.tasks[task.id] && <small className="task-stamp">已成</small>}</button><details><summary aria-label={`${task.title}说明`}>?</summary><p>{task.description}</p></details></li>)}</ol>{next && <button className="primary-button apprentice-resume" onClick={() => runTask(next.id)}>继续 · {next.title}</button>}<button className="apprentice-dismiss" onClick={onDismiss}>跳过全部，直接探索</button></>}
  </section>;
}

const INTRO = [
  { title: '这是一间可以反悔的剪纸工坊', action: '在屏幕上先练一刀，观察折叠与展开。', why: '先理解每一刀带来的改变，再选择自己的图案。', paper: '最后可以带走按毫米绘制的真实纸样。' },
  { title: '一张纸，走过七个小任务', action: '预测 → 剪切 → 展开 → 找问题 → 修复。', why: '留下预测，再对照结果，才能看见自己的理解。', paper: '剪断的纸接不回；屏幕让你先试，再换新纸做。' },
  { title: '纹样的背后，是相连的几何', action: '看红色的正形，也看空白的负形。', why: '中国剪纸是联合国教科文组织人类非遗；对称、重复和连通构成它的骨架。', paper: '留下的连接，让窗花能够完整地被拿起来。' },
  { title: '把发现留住，再带回手心', action: '用项目文件备份；打印时选实际大小。', why: '作品留在这台设备，备份才能换设备继续。', paper: '先量 100 mm 标尺，再用新纸折、剪、核对。' },
];
export function ApprenticeIntroduction({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [index, setIndex] = useState(0); const item = INTRO[index];
  return <Dialog title={item.title} eyebrow={`纸上第一课 · 认识工坊 ${index + 1} / 4`} onClose={onClose}><div className="apprentice-introduction"><p><strong>做什么</strong>{item.action}</p><p><strong>为什么</strong>{item.why}</p><p><strong>和真纸的关系</strong>{item.paper}</p></div><div className="dialog-actions"><button className="secondary-button" disabled={!index} onClick={() => setIndex(index - 1)}>上一张</button><button className="primary-button" onClick={() => index === INTRO.length - 1 ? onComplete() : setIndex(index + 1)}>{index === INTRO.length - 1 ? '认识了，开始第一课' : '下一张说明'}</button></div><p className="microcopy">约 30 秒，可按自己的速度阅读。关闭后可从任务栏继续。</p></Dialog>;
}
