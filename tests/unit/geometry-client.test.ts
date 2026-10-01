import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Analysis, ProjectDocument } from '../../src/types';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  sent: { requestId: number; kind: string; project: ProjectDocument }[] = [];
  terminated = false;
  constructor() { ControlledWorker.instances.push(this); }
  postMessage(message: { requestId: number; kind: string; project: ProjectDocument }) { this.sent.push(message); }
  terminate() { this.terminated = true; }
  reply(index: number, result: unknown) { this.onmessage?.({ data: { requestId: this.sent[index].requestId, result } }); }
}

describe('geometry worker client isolation and recovery', () => {
  beforeEach(() => { vi.resetModules(); ControlledWorker.instances = []; vi.stubGlobal('Worker', ControlledWorker); });
  afterEach(() => vi.unstubAllGlobals());

  it('routes reversed replies to their original requests without crossing revisions', async () => {
    const { analyzeAsync, repairsAsync } = await import('../../src/geometry/client');
    const p1 = analyzeAsync({ revision: 1 } as ProjectDocument);
    const p2 = analyzeAsync({ revision: 2 } as ProjectDocument);
    const repair = repairsAsync({ revision: 2 } as ProjectDocument);
    expect(ControlledWorker.instances).toHaveLength(1);
    const w = ControlledWorker.instances[0];
    w.reply(2, []);
    w.reply(1, { revision: 2 } as Analysis);
    w.reply(0, { revision: 1 } as Analysis);
    expect((await p1).revision).toBe(1);
    expect((await p2).revision).toBe(2);
    expect(await repair).toEqual([]);
  });

  it('rejects all pending requests after worker failure and lazily recreates it', async () => {
    const { analyzeAsync } = await import('../../src/geometry/client');
    const failed = analyzeAsync({ revision: 3 } as ProjectDocument);
    const expectation = expect(failed).rejects.toThrow('几何计算线程意外停止');
    ControlledWorker.instances[0].onerror?.();
    await expectation;
    expect(ControlledWorker.instances[0].terminated).toBe(true);
    const next = analyzeAsync({ revision: 4 } as ProjectDocument);
    expect(ControlledWorker.instances).toHaveLength(2);
    ControlledWorker.instances[1].reply(0, { revision: 4 });
    expect((await next).revision).toBe(4);
  });

  it('propagates a calculation error only to its own caller', async () => {
    const { analyzeAsync } = await import('../../src/geometry/client');
    const first = analyzeAsync({ revision: 5 } as ProjectDocument);
    const second = analyzeAsync({ revision: 6 } as ProjectDocument);
    const expectation = expect(first).rejects.toThrow('输入错误');
    const worker = ControlledWorker.instances[0];
    worker.onmessage?.({ data: { requestId: worker.sent[0].requestId, error: '输入错误' } });
    worker.reply(1, { revision: 6 });
    await expectation;
    expect((await second).revision).toBe(6);
  });
});
