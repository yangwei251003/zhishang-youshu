import type { Analysis, Goal, ProjectDocument, RepairCandidate } from '../types';

let worker: Worker | undefined;
let nextRequest = 0;
const pending = new Map<number, { resolve: (result: unknown) => void; reject: (error: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<{ requestId: number; result?: unknown; error?: string }>) => {
    const task = pending.get(event.data.requestId);
    if (!task) return;
    pending.delete(event.data.requestId);
    if (event.data.error) task.reject(new Error(event.data.error));
    else task.resolve(event.data.result);
  };
  const failAll = () => {
    for (const task of pending.values()) task.reject(new Error('几何计算线程意外停止，请重试。'));
    pending.clear();
    worker?.terminate();
    worker = undefined;
  };
  worker.onerror = failAll;
  worker.onmessageerror = failAll;
  return worker;
}

function request<T>(kind: 'analyze' | 'repairs', project: ProjectDocument, goal?: Goal): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = ++nextRequest;
    try {
      const target = getWorker();
      pending.set(requestId, { resolve: result => resolve(result as T), reject });
      target.postMessage({ requestId, kind, project, goal });
    } catch (error) {
      pending.delete(requestId);
      reject(error);
    }
  });
}

export const analyzeAsync = (project: ProjectDocument, goal?: Goal) => request<Analysis>('analyze', project, goal);
export const repairsAsync = (project: ProjectDocument, goal?: Goal) => request<RepairCandidate[]>('repairs', project, goal);
