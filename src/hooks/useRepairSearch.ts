import { useCallback, useEffect, useRef, useState } from 'react';
import type { Goal, ProjectDocument, RepairCandidate } from '../types';

type Request = { project: ProjectDocument; goal?: Goal; onResult: (result: RepairCandidate[]) => void; onError: (error: Error) => void; selectedCutId?: string };
/** Repair searches have a disposable worker, so a slow search never queues ahead of undo/analysis. */
export function useRepairSearch() {
  const [busy, setBusy] = useState(false), [slow, setSlow] = useState(false);
  const active = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), request = useRef<Request | null>(null);
  const cancel = useCallback(() => { clearTimeout(timer.current); active.current?.terminate(); active.current = null; request.current = null; setBusy(false); setSlow(false); }, []);
  const arm = () => { clearTimeout(timer.current); setSlow(false); timer.current = setTimeout(() => setSlow(true), 5000); };
  function run(value: Request, simplified = false) {
    cancel(); request.current = value; setBusy(true); arm();
    try {
      const worker = new Worker(new URL('../geometry/worker.ts', import.meta.url), { type: 'module' }); active.current = worker;
      worker.onmessage = (event: MessageEvent<{result?: RepairCandidate[]; error?: string}>) => {
        if (active.current !== worker) return;
        cancel(); if (event.data.error) value.onError(new Error(event.data.error)); else value.onResult(event.data.result ?? []);
      };
      worker.onerror = worker.onmessageerror = () => { if (active.current === worker) { cancel(); value.onError(new Error('比较线程未能完成。可以撤销或手动修改这一刀。')); } };
      worker.postMessage({ requestId: 1, kind: 'repairs', project: value.project, goal: value.goal, ...(simplified ? { onlyCutId: value.selectedCutId ?? value.project.cuts[value.project.cursor - 1]?.id } : {}) });
    } catch (error) { cancel(); value.onError(error instanceof Error ? error : new Error('比较暂不可用')); }
  }
  useEffect(() => () => { clearTimeout(timer.current); active.current?.terminate(); }, []);
  return { busy, slow, cancel,
    start: (project: ProjectDocument, goal: Goal | undefined, onResult: Request['onResult'], onError: Request['onError'], selectedCutId?: string) => run({project,goal,onResult,onError,selectedCutId}),
    continueWaiting: () => { if (active.current) arm(); },
    simplify: () => { if (request.current) run(request.current, true); },
  };
}
