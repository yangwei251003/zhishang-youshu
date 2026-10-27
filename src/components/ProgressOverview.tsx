import { useMemo, useState } from 'react';
import { Download, BookOpenCheck } from 'lucide-react';
import type { ProjectDocument } from '../types';
import { buildProgressOverview, uniqueCurrentProjects } from '../io/progress-overview';
import { downloadLearningRecords } from '../io/files';
import './progress-overview.css';

const shortDate = (value: string) => new Date(value).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

export default function ProgressOverview({ projects }: { projects: ProjectDocument[] }) {
  const summary = useMemo(() => buildProgressOverview(projects), [projects]);
  const works = useMemo(() => uniqueCurrentProjects(projects), [projects]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const selected = works.find(project => project.id === selectedId) ?? works[0];
  if (!works.length) return <section className="progress-overview" aria-label="学习进度"><h3><BookOpenCheck size={18}/>学习进度</h3><p className="progress-scope">还没有本机作品记录。完成实验后，这里会整理你的探索。</p></section>;
  function download() {
    if (!selected) return;
    try { downloadLearningRecords(selected); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '学习记录暂时无法导出，请重试。'); }
  }
  return <section className="progress-overview" aria-label="学习进度">
    <h3><BookOpenCheck size={18}/>学习进度</h3>
    <ul className="progress-summary">
      <li>屏幕实验：<strong>{summary.lessonsCompleted}</strong> / {summary.lessonsTotal} 课已记录完成</li>
      <li>预测与结构相符：{summary.predictionsTotal ? <><strong>{summary.predictionsMatched}</strong> / {summary.predictionsTotal} 次作答</> : '还没有作答记录'}</li>
      <li>迁移完成记录：<strong>{summary.transferCompleted}</strong> 次独立 · <strong>{summary.transferWithHint}</strong> 次有提示{summary.transferUnclassified > 0 && <> · {summary.transferUnclassified} 次辅助情况不完整</>}</li>
      <li>当前 {summary.projectsTotal} 份作品共保留 <strong>{summary.totalCuts}</strong> 刀{summary.firstAt && summary.lastAt && <> · {shortDate(summary.firstAt)}至{shortDate(summary.lastAt)}</>}</li>
    </ul>
    <p className="progress-scope">仅统计当前本机留存作品；同课完成去重、事件按尝试合并。记录随作品保存在本机，不代表学习效果或实剪验证。{summary.legacyPredictionsTotal > 0 && `含 ${summary.legacyPredictionsTotal} 条旧版留存答案，按参与编号与课程合并，未推测尝试次数。`}{summary.hasIncompleteRecords && '部分较早事件已截断，独立完成采用保守统计。'}</p>
    <div className="progress-export"><label>导出哪份作品的记录<select aria-label="选择学习记录所属作品" value={selected?.id ?? ''} onChange={event => { setSelectedId(event.target.value); setError(''); }}>{works.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><button type="button" className="small-button" onClick={download}><Download size={15}/>导出学习记录</button></div>
    {error && <p className="progress-export-error" role="alert">{error}</p>}
  </section>;
}
