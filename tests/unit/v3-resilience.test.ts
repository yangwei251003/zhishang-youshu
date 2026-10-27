import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject, getLesson } from '../../src/lessons';
import { getRepairs, analyzeProject } from '../../src/geometry/engine';
import { APP_VERSION } from '../../src/types';
import { parseProject, printHtml } from '../../src/io/files';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('V3 resilience keeps the original geometry and document contract', () => {
  it('simplifying repair candidates still verifies the complete project goal', () => {
    const project=createProject('bridge'), goal=getLesson('bridge').goal;
    const candidates=getRepairs(project,goal,project.cuts[1].id);
    expect(candidates.length).toBeGreaterThan(0);
    for(const candidate of candidates) { expect(candidate.changedCutId).toBe(project.cuts[1].id); const result=analyzeProject({...project,cuts:candidate.cuts},goal); expect(result.validSequence).toBe(true); expect(result.goalPassed).toBe(true); }
    expect(getRepairs(project,goal,'missing-cut')).toEqual([]);
  });
  it('storage denial retains a recoverable session and reports the failure', async () => {
    vi.stubGlobal('indexedDB', {open:()=>{throw new Error('private mode')}});
    const storage=await import('../../src/io/storage'), health=await import('../../src/io/storage-health');
    const first=createProject('half'), second=createProject('quarter');
    await expect(storage.saveProject(first)).rejects.toThrow('private mode');
    await storage.saveForTransition(second);
    expect(health.isStorageUnavailable()).toBe(true);
    expect((await storage.loadForSession(first.id))?.id).toBe(first.id);
    expect((await storage.loadForSession())?.id).toBe(second.id);
    expect(await storage.listForSession()).toHaveLength(2);
    expect(parseProject(JSON.stringify(first)).schemaVersion).toBe(1);
  });
  it('no gesture creates no audio context, even with a saved music preference', async () => {
    const create=vi.fn(); vi.stubGlobal('AudioContext',create);
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({sfx:true,music:true}),setItem:vi.fn()});
    const audio=await import('../../src/audio/sfx');
    audio.playSfx('cut'); audio.playSfx('unfold'); audio.setMusic(true);
    expect(create).not.toHaveBeenCalled(); expect(audio.audioState().playing).toBe(false);
  });
  it('denied audio construction is silent after a gesture', async () => {
    const handlers=new Map();
    vi.stubGlobal('document',{hidden:false,addEventListener:(type:string,fn:unknown)=>handlers.set(type,fn),removeEventListener:vi.fn()});
    vi.stubGlobal('AudioContext',function(){throw new Error('audio denied')});
    const audio=await import('../../src/audio/sfx'); const stop=audio.installAudioGestures();
    handlers.get('pointerdown')({isTrusted:true});
    expect(()=>{audio.playSfx('reject');audio.setMusic(true);stop()}).not.toThrow();
    expect(audio.audioState().playing).toBe(false);
  });
  it('standalone print HTML retains millimetres and opens without network resources', () => {
    const project=createProject('half'), html=printHtml(project,analyzeProject(project));
    expect(html).toContain('100 mm'); expect(html).toContain('160 × 160 mm');
    expect(html).not.toMatch(/<script|<iframe|<link/); expect(html).toContain(APP_VERSION);
  });
});
