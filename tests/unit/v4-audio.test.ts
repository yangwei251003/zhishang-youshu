import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_KEY, AUDIO_V2_KEY, parseAudioPreferences, nextAvailableTrack } from '../../src/audio/preferences';

const ids = ['zs-track-1', 'zs-track-2', 'zs-track-3', 'zs-track-4', 'generated'];
let dispose: (() => void) | undefined;
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { dispose?.(); dispose = undefined; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

async function harness(options: { old?: object; saved?: object; failFiles?: boolean; pendingPlay?: boolean } = {}) {
  const storage = new Map<string, string>();
  if (options.old) storage.set(AUDIO_KEY, JSON.stringify(options.old));
  if (options.saved) storage.set(AUDIO_V2_KEY, JSON.stringify(options.saved));
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  const handlers = new Map<string, (event?: { isTrusted: boolean }) => void>();
  const doc = { hidden: false, addEventListener: (name: string, fn: (event?: { isTrusted: boolean }) => void) => handlers.set(name, fn), removeEventListener: vi.fn() };
  vi.stubGlobal('document', doc); vi.stubGlobal('window', { addEventListener: doc.addEventListener, removeEventListener: vi.fn() });
  const gains: FakeNode[] = [], connections: Array<[FakeNode, FakeNode]> = [], playingMedia = new Set<FakeAudio>(), media: FakeAudio[] = [], order: string[] = [];
  let maxSimultaneous = 0;
  class Param {
    value = 0;
    setValueAtTime = vi.fn((value: number) => { this.value = value; });
    linearRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
    exponentialRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
    cancelScheduledValues = vi.fn();
  }
  class FakeNode {
    gain = new Param(); frequency = new Param(); onended: (() => void) | null = null;
    connect = vi.fn((node: FakeNode) => { connections.push([this, node]); return node; });
    disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
  }
  class FakeContext {
    currentTime = 10; sampleRate = 44100; state = 'running'; destination = new FakeNode();
    resume = vi.fn(async () => { this.state = 'running'; });
    close = vi.fn(async () => { this.state = 'closed'; });
    createGain = () => { const node = new FakeNode(); gains.push(node); return node; };
    createOscillator = () => new FakeNode(); createBufferSource = () => new FakeNode(); createBiquadFilter = () => new FakeNode();
    createMediaElementSource = () => new FakeNode();
    createBuffer = (_channels: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) });
  }
  const contexts: FakeContext[] = [];
  class ConstructedContext extends FakeContext { constructor() { super(); contexts.push(this); } }
  class FakeAudio {
    src = ''; preload = ''; currentTime = 0; onended: (() => void) | null = null; onerror: (() => void) | null = null;
    resolvePlay?: () => void;
    constructor() { media.push(this); }
    play = vi.fn(() => {
      order.push(`play:${this.src}`);
      if (options.failFiles) return Promise.reject(new Error('unavailable recording'));
      playingMedia.add(this); maxSimultaneous = Math.max(maxSimultaneous, playingMedia.size);
      if (options.pendingPlay) return new Promise<void>(resolve => { this.resolvePlay = resolve; });
      return Promise.resolve();
    });
    pause = vi.fn(() => { order.push(`pause:${this.src}`); playingMedia.delete(this); });
    removeAttribute = (name: string) => { if (name === 'src') this.src = ''; };
    load = vi.fn();
  }
  vi.stubGlobal('AudioContext', ConstructedContext); vi.stubGlobal('Audio', FakeAudio);
  const audio = await import('../../src/audio/sfx'); dispose = audio.installAudioGestures();
  return { audio, storage, handlers, doc, gains, contexts, connections, media, order, playingMedia, maxSimultaneous: () => maxSimultaneous,
    gesture: () => handlers.get('pointerdown')!({ isTrusted: true }), flush: () => vi.advanceTimersByTimeAsync(0) };
}

describe('V4 audio preference migration', () => {
  it('preserves V1 booleans while assigning the new independent defaults', () => {
    expect(parseAudioPreferences(null, JSON.stringify({ sfx: false, music: true }), ids)).toEqual({ sfx: false, music: true, volume: .6, sfxVolume: .8, trackId: 'zs-track-1', loop: 'all' });
  });
  it('preserves zero volume, clamps limits, and rejects unknown tracks and corrupt data', () => {
    expect(parseAudioPreferences(JSON.stringify({ volume: 0, sfxVolume: 5, trackId: 'remote-track', loop: 'unknown' }), null, ids)).toMatchObject({ volume: 0, sfxVolume: 1, trackId: 'zs-track-1', loop: 'all' });
    expect(parseAudioPreferences('{', JSON.stringify({ sfx: false, music: false }), ids)).toMatchObject({ sfx: false, music: false, volume: .6 });
  });
  it('finishes a failure walk without retrying unavailable files', () => {
    expect(nextAvailableTrack(ids, 'zs-track-4', new Set(ids.slice(0, 4)))).toBe('generated');
    expect(nextAvailableTrack(ids, 'generated', new Set(ids))).toBeUndefined();
  });
});

describe('V4 audio transport', () => {
  it('creates no context or media without a trusted gesture, despite a saved on preference', async () => {
    const h = await harness({ old: { sfx: true, music: true } });
    h.audio.setMusic(true); h.audio.playSfx('cut'); h.handlers.get('pointerdown')!({ isTrusted: false }); h.audio.setMusic(true); await h.flush();
    expect(h.contexts).toHaveLength(0); expect(h.media).toHaveLength(0); expect(h.audio.audioState().playing).toBe(false);
    expect(JSON.parse(h.storage.get(AUDIO_KEY)!)).toEqual({ sfx: true, music: true });
    expect(JSON.parse(h.storage.get(AUDIO_V2_KEY)!)).toMatchObject({ volume: .6, sfxVolume: .8, music: true });
  });
  it('starts the selected local recording on independent music and effects buses', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush();
    expect(h.contexts).toHaveLength(1); expect(h.media[0].preload).toBe('none'); expect(h.media[0].src).toBe('/audio/zs-track-1.mp3');
    expect(h.gains[0].gain.value).toBeCloseTo(.6); expect(h.gains[2].gain.value).toBe(.8);
    expect(h.audio.audioState()).toMatchObject({ playing: true, status: 'playing', trackId: 'zs-track-1' });
  });
  it('fades out and stops before the latest requested track starts; rapid switching never overlaps', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush();
    h.audio.selectTrack('zs-track-2', true); h.audio.selectTrack('zs-track-3', true);
    await vi.advanceTimersByTimeAsync(199); expect(h.media).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1); expect(h.media).toHaveLength(2); expect(h.media[1].src).toBe('/audio/zs-track-3.mp3');
    expect(h.maxSimultaneous()).toBe(1);
    expect(h.order.indexOf('pause:/audio/zs-track-1.mp3')).toBeLessThan(h.order.indexOf('play:/audio/zs-track-3.mp3'));
  });
  it('adjusts the sliders separately and ducks music around a cut', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush();
    h.audio.setMusicVolume(0); expect(h.audio.audioState().playing).toBe(true); expect(h.gains[0].gain.value).toBe(0); expect(h.gains[2].gain.value).toBe(.8);
    h.audio.setMusicVolume(1); h.audio.setSfxVolume(.25); h.audio.playSfx('cut');
    expect(h.gains[0].gain.value).toBe(1); expect(h.gains[2].gain.value).toBe(.25);
    expect(h.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(.12, 10.012);
    expect(h.audio.audioState().volume).toBe(1);
  });
  it('tries unavailable recordings only once and reaches the generated fallback', async () => {
    const h = await harness({ failFiles: true }); h.gesture(); h.audio.setMusic(true); await h.flush();
    expect(h.media).toHaveLength(4); expect(h.audio.audioState()).toMatchObject({ playing: true, trackId: 'generated', status: 'playing' });
    expect(h.audio.audioState().failedTrackIds).toEqual(ids.slice(0, 4)); expect(h.audio.audioState().message).toContain('生成乐句');
    await vi.advanceTimersByTimeAsync(25000); expect(h.media).toHaveLength(4);
  });
  it('pauses on hidden and requires a new play action, retaining position for resume', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush(); h.media[0].currentTime = 23;
    h.doc.hidden = true; h.handlers.get('visibilitychange')!(); expect(h.playingMedia.size).toBe(0); expect(h.audio.audioState().status).toBe('paused-hidden');
    h.doc.hidden = false; h.handlers.get('visibilitychange')!(); await h.flush(); expect(h.media).toHaveLength(1); expect(h.audio.audioState().playing).toBe(false);
    h.audio.setMusic(true); await h.flush(); expect(h.media[1].currentTime).toBe(23); expect(h.audio.audioState().playing).toBe(true);
  });
  it('implements single-track and playlist endings without simultaneous streams', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush(); h.audio.setLoop('one');
    h.media[0].onended!(); await vi.advanceTimersByTimeAsync(200); expect(h.media[1].src).toBe('/audio/zs-track-1.mp3');
    h.audio.setLoop('all'); h.media[1].onended!(); await vi.advanceTimersByTimeAsync(200); expect(h.media[2].src).toBe('/audio/zs-track-2.mp3'); expect(h.maxSimultaneous()).toBe(1);
  });
  it('cancels a pending load and ignores a late resolution', async () => {
    const h = await harness({ pendingPlay: true }); h.gesture(); h.audio.setMusic(true); await h.flush(); expect(h.audio.audioState().status).toBe('loading');
    h.audio.setMusic(false); h.media[0].resolvePlay!(); await h.flush();
    expect(h.playingMedia.size).toBe(0); expect(h.audio.audioState()).toMatchObject({ playing: false, music: false, status: 'paused' });
  });
  it('cleans up media and context on pagehide without retaining gesture permission', async () => {
    const h = await harness(); h.gesture(); h.audio.setMusic(true); await h.flush(); h.handlers.get('pagehide')!();
    expect(h.playingMedia.size).toBe(0); expect(h.contexts[0].close).toHaveBeenCalledOnce(); h.audio.setMusic(true); await h.flush(); expect(h.media).toHaveLength(1);
  });
});
