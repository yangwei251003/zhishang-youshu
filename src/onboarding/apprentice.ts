import { useCallback, useRef, useState } from 'react';
import { appendLearningEvent, makeLearningEvent, decodeLearningEvent } from '../io/learning';
import type { LearningEvent } from '../types';

export const APPRENTICE_KEY = 'paperWorkshop.apprentice.v1';
export const TASKS = [
  { id: 'tour-interface', title: '认识这间工坊', description: '看完四张说明卡，认识预测、折剪与保存。', step: 0 },
  { id: 'first-prediction', title: '留下第一次预测', description: '选择你的判断，再亲手提交；猜错也没关系。', step: 1 },
  { id: 'first-cut', title: '剪下第一刀', description: '从真实纸边向内拖动，完成一个可进入的剪口。', step: 2 },
  { id: 'first-unfold', title: '看纸展开', description: '点击分步展开，直到最后一层打开。', step: 3 },
  { id: 'find-problem', title: '读懂一个问题', description: '点击分离诊断，定位剪断连接的那一刀。', step: 5 },
  { id: 'first-repair', title: '修好它', description: '应用修复，或修改剪口后通过完整目标。', step: 6 },
  { id: 'print-template', title: '带到纸上', description: '打开打印纸样，或下载备用打印文件。', step: 8 },
] as const;
export type ApprenticeTaskId = typeof TASKS[number]['id'];
export interface ApprenticeState {
  version: 3;
  tasks: Partial<Record<ApprenticeTaskId, string>>;
  status: 'active' | 'graduated' | 'dismissed';
  events: LearningEvent[];
}
let sessionState: ApprenticeState | undefined;
export function parseApprentice(raw: string | null): ApprenticeState {
  const empty: ApprenticeState = { version: 3, tasks: {}, status: 'active', events: [] };
  try {
    const data = JSON.parse(raw ?? 'null');
    if (data?.version !== 3 || !data.tasks || typeof data.tasks !== 'object') return empty;
    const tasks: ApprenticeState['tasks'] = {};
    for (const { id } of TASKS) if (typeof data.tasks[id] === 'string' && Number.isFinite(Date.parse(data.tasks[id]))) tasks[id] = data.tasks[id];
    const events: LearningEvent[] = Array.isArray(data.events) ? data.events.slice(-60).filter((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const event = item as LearningEvent;
      if (typeof event.value !== 'string' || event.value.length > 4096 || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at)) || !['apprentice_task_done', 'apprentice_graduated', 'apprentice_dismissed'].includes(event.type)) return false;
      const decoded = decodeLearningEvent(event); return !decoded.legacy && decoded.origin === 'onboarding';
    }) : [];
    return { version: 3, tasks, status: Object.keys(tasks).length === TASKS.length ? 'graduated' : data.status === 'dismissed' ? 'dismissed' : 'active', events };
  } catch { return empty; }
}
export function nextApprenticeTask(state: ApprenticeState): ApprenticeTaskId | undefined { return TASKS.find(task => !state.tasks[task.id])?.id; }
function read() { try { return parseApprentice(localStorage.getItem(APPRENTICE_KEY)); } catch { return sessionState ?? parseApprentice(null); } }
export function useApprentice() {
  const [state, setState] = useState(read);
  const current = useRef(state); current.current = state;
  const commit = useCallback((next: ApprenticeState) => {
    current.current = next; sessionState = next; setState(next);
    try { localStorage.setItem(APPRENTICE_KEY, JSON.stringify(next)); } catch { /* Remain usable in this session. */ }
  }, []);
  const event = (type: string, taskId?: string) => makeLearningEvent({ type, attemptId: 'apprentice-v3', origin: 'onboarding', feedbackMode: 'explained', metadata: taskId ? { taskId } : {} });
  const complete = useCallback((taskId: ApprenticeTaskId) => {
    const old = current.current;
    if (old.tasks[taskId]) return false;
    const tasks = { ...old.tasks, [taskId]: new Date().toISOString() };
    const graduated = Object.keys(tasks).length === TASKS.length;
    let events = appendLearningEvent(old.events, event('apprentice_task_done', taskId), 60);
    if (graduated) events = appendLearningEvent(events, event('apprentice_graduated'), 60);
    commit({ ...old, tasks, status: graduated ? 'graduated' : old.status, events });
    return true;
  }, [commit]);
  const dismiss = useCallback(() => commit({ ...current.current, status: current.current.status === 'graduated' ? 'graduated' : 'dismissed', events: appendLearningEvent(current.current.events, event('apprentice_dismissed'), 60) }), [commit]);
  const resume = useCallback(() => { if (current.current.status === 'dismissed') commit({ ...current.current, status: 'active' }); }, [commit]);
  return { state, complete, dismiss, resume, next: nextApprenticeTask(state) };
}
