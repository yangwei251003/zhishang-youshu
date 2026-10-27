import { analyzeProject, getRepairs } from './engine';
import type { Goal, ProjectDocument } from '../types';

self.onmessage = (event: MessageEvent<{ requestId: number; kind: 'analyze' | 'repairs'; project: ProjectDocument; goal?: Goal; onlyCutId?: string }>) => {
  const { requestId, kind, project, goal, onlyCutId } = event.data;
  try {
    const result = kind === 'analyze' ? analyzeProject(project, goal) : getRepairs(project, goal, onlyCutId);
    self.postMessage({ requestId, result });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : '几何计算失败' });
  }
};
