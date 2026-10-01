import { AUDIO_TRACKS } from '../content/audio-tracks';
import { markStorageUnavailable } from '../io/storage-health';
import { AUDIO_KEY, AUDIO_V2_KEY, boundedVolume, nextAvailableTrack, parseAudioPreferences, type AudioPreferences } from './preferences';
export { AUDIO_KEY, AUDIO_V2_KEY } from './preferences';
export type SfxKind = 'cut' | 'unfold' | 'success' | 'reject' | 'repair';
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'paused-hidden' | 'blocked' | 'unavailable';
const FADE_SECONDS = .2;
const LOAD_TIMEOUT_MS = 10000;
const trackIds = AUDIO_TRACKS.map(track => track.id);
let preferences: AudioPreferences = parseAudioPreferences(null, null, trackIds);
try {
  preferences = parseAudioPreferences(localStorage.getItem(AUDIO_V2_KEY), localStorage.getItem(AUDIO_KEY), trackIds);
  localStorage.setItem(AUDIO_V2_KEY, JSON.stringify(preferences));
  localStorage.setItem(AUDIO_KEY, JSON.stringify({ sfx: preferences.sfx, music: preferences.music }));
} catch { markStorageUnavailable(); }

let context: AudioContext | undefined, musicGain: GainNode | undefined, duckGain: GainNode | undefined, sfxGain: GainNode | undefined;
let gesture = false, playing = false, status: PlaybackStatus = 'idle', message = '', requestId = 0;
let gestureUsers = 0, removeGestureListeners: (() => void) | undefined;
const failed = new Set<string>();
const subscribers = new Set<() => void>();
interface MusicSession { id: string; gain: GainNode; dispose: () => void; stopped: boolean; fade?: Promise<void>; position?: () => number }
let session: MusicSession | undefined;
const resumePositions = new Map<string, number>();
export function subscribeAudio(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener); }; }
export function audioState() { return { ...preferences, playing, status, message, failedTrackIds: [...failed], activeTrackId: session?.id }; }
function emit() { for (const listener of subscribers) listener(); }
function persist() {
  try { localStorage.setItem(AUDIO_V2_KEY, JSON.stringify(preferences)); localStorage.setItem(AUDIO_KEY, JSON.stringify({ sfx: preferences.sfx, music: preferences.music })); }
  catch { markStorageUnavailable(); }
  emit();
}
function hidden() { return typeof document !== 'undefined' && document.hidden; }
function ramp(parameter: AudioParam, value: number, duration = .04) {
  if (!context || context.state === 'closed') return;
  parameter.cancelScheduledValues(context.currentTime); parameter.setValueAtTime(parameter.value, context.currentTime);
  parameter.linearRampToValueAtTime(value, context.currentTime + duration);
}
function getContext(): AudioContext | undefined {
  if (!gesture || hidden()) return;
  try {
    if (!context || context.state === 'closed') {
      context = new AudioContext();
      // Recordings are mastered to −16 LUFS with at least 2 dB true-peak headroom.
      // The displayed slider is the actual linear gain: 60% adds −4.44 dB.
      musicGain = context.createGain(); musicGain.gain.value = preferences.volume;
      duckGain = context.createGain(); duckGain.gain.value = 1;
      sfxGain = context.createGain(); sfxGain.gain.value = preferences.sfxVolume;
      musicGain.connect(duckGain).connect(context.destination); sfxGain.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    return context;
  } catch { return; }
}
function disposeSession(value: MusicSession) {
  if (value.stopped) return;
  value.stopped = true;
  try { value.dispose(); } catch { /* Media failures never interrupt editing. */ }
  try { value.gain.disconnect(); } catch { /* Already disconnected. */ }
  if (session === value) session = undefined;
}
async function fadeOut() {
  const current = session;
  if (!current || current.stopped) return;
  if (current.fade) return current.fade;
  try { ramp(current.gain.gain, 0, FADE_SECONDS); } catch { disposeSession(current); return; }
  current.fade = new Promise<void>(resolve => setTimeout(() => { disposeSession(current); resolve(); }, FADE_SECONDS * 1000));
  return current.fade;
}
function halt(next: PlaybackStatus, reason = '') {
  if ((next === 'paused' || next === 'paused-hidden') && session?.position) {
    const position = session.position(); if (Number.isFinite(position)) resumePositions.set(session.id, position);
  }
  requestId++; if (session) disposeSession(session); playing = false; status = next; message = reason; emit();
}
/** Install at the app root; unmounting settings alone must never stop playback. */
export function installAudioGestures() {
  if (typeof document === 'undefined') return () => {};
  gestureUsers++;
  if (!removeGestureListeners) {
    const activate = (event: Event) => { if (event.isTrusted) gesture = true; };
    const visibility = () => { if (hidden() && (playing || status === 'loading')) halt('paused-hidden', '离开页面时已暂停，回来后请主动继续。'); };
    const pagehide = () => {
      halt('paused', '已暂停，请主动继续。'); gesture = false;
      const old = context; context = undefined; musicGain = undefined; duckGain = undefined; sfxGain = undefined;
      try { void old?.close().catch(() => {}); } catch { /* Browser teardown. */ }
    };
    document.addEventListener('pointerdown', activate, true); document.addEventListener('keydown', activate, true); document.addEventListener('visibilitychange', visibility);
    if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehide);
    removeGestureListeners = () => {
      document.removeEventListener('pointerdown', activate, true); document.removeEventListener('keydown', activate, true); document.removeEventListener('visibilitychange', visibility);
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide);
      pagehide();
    };
  }
  let disposed = false;
  return () => { if (disposed) return; disposed = true; gestureUsers--; if (!gestureUsers) { removeGestureListeners?.(); removeGestureListeners = undefined; } };
}
function tone(ctx: AudioContext, bus: AudioNode, frequency: number, at: number, duration: number, level: number, kind: OscillatorType = 'sine', sources?: Set<OscillatorNode>) {
  const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
  oscillator.type = kind; oscillator.frequency.setValueAtTime(frequency, at);
  envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(level, at + .012); envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(envelope).connect(bus); sources?.add(oscillator); oscillator.start(at); oscillator.stop(at + duration + .02);
  oscillator.onended = () => { sources?.delete(oscillator); try { oscillator.disconnect(); envelope.disconnect(); } catch { /* teardown */ } };
}
function duckMusic(ctx: AudioContext, duration: number) {
  if (!duckGain || !playing) return;
  const gain = duckGain.gain, now = ctx.currentTime;
  gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(.12, now + .012); gain.setValueAtTime(.12, now + duration + .06); gain.linearRampToValueAtTime(1, now + duration + .38);
}
export function playSfx(kind: SfxKind) {
  if (!preferences.sfx || preferences.sfxVolume === 0) return;
  const ctx = getContext(); if (!ctx || !sfxGain) return;
  try {
    const now = ctx.currentTime, bus = sfxGain, duration = kind === 'cut' ? .075 : kind === 'unfold' ? .22 : .15;
    duckMusic(ctx, duration);
    if (kind === 'success' || kind === 'reject') {
      tone(ctx, bus, kind === 'success' ? 410 : 145, now, .15, .09);
      if (kind === 'success') tone(ctx, bus, 820, now + .025, .11, .025);
      return;
    }
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer; filter.type = kind === 'cut' ? 'bandpass' : 'lowpass'; filter.frequency.setValueAtTime(kind === 'cut' ? 2800 : 950, now); filter.frequency.exponentialRampToValueAtTime(350, now + duration);
    gain.gain.value = kind === 'cut' ? .16 : .07;
    source.connect(filter).connect(gain).connect(bus); source.start();
    source.onended = () => { try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* teardown */ } };
  } catch { /* Audio is supplemental; a cut remains usable without it. */ }
}
export function setSfx(enabled: boolean) { preferences = { ...preferences, sfx: enabled }; persist(); }
export function setSfxVolume(value: number) { preferences = { ...preferences, sfxVolume: boundedVolume(value, preferences.sfxVolume) }; try { if (sfxGain) ramp(sfxGain.gain, preferences.sfxVolume); } catch { /* silent */ } persist(); }
export function setMusicVolume(value: number) { preferences = { ...preferences, volume: boundedVolume(value, preferences.volume) }; try { if (musicGain) ramp(musicGain.gain, preferences.volume); } catch { /* silent */ } persist(); }
export function setLoop(loop: 'one' | 'all') { preferences = { ...preferences, loop }; persist(); }
export function stopMusic() { halt('paused'); }

function createGenerated(ctx: AudioContext, gain: GainNode, token: number): MusicSession {
  const sources = new Set<OscillatorNode>(); let timer: ReturnType<typeof setTimeout> | undefined, step = 0;
  const phrase = [0, 4, 7, 9, 7, 4, 2, 0, 7, 12, 9, 7, 4, 2, 4, 0];
  // The note envelopes already provide headroom; do not apply the old −25 dB pad.
  const soft = ctx.createGain(); soft.gain.value = 1; soft.connect(gain);
  const value: MusicSession = { id: 'generated', gain, stopped: false, dispose: () => {
    clearTimeout(timer); for (const source of sources) { try { source.stop(); source.disconnect(); } catch { /* already ended */ } } sources.clear(); soft.disconnect();
  } };
  const schedule = () => {
    if (value.stopped || token !== requestId || hidden()) return;
    if (step > 0 && step % phrase.length === 0 && preferences.loop === 'all') {
      const next = nextAvailableTrack(trackIds, 'generated', failed);
      if (next && next !== 'generated') { void launchTrack(next); return; }
    }
    try {
      const frequency = 220 * Math.pow(2, phrase[step % phrase.length] / 12), now = ctx.currentTime;
      tone(ctx, soft, frequency, now, 2.7, .35, 'sine', sources); tone(ctx, soft, frequency * 2, now + .018, 1.2, .035, 'sine', sources);
      if (step % 4 === 0) tone(ctx, soft, 110, now, 4, .15, 'sine', sources);
      step++; timer = setTimeout(schedule, 1350);
    } catch { halt('unavailable', '声音暂不可用，工坊仍可正常使用。'); }
  };
  session = value; schedule(); return value;
}
async function createLocal(ctx: AudioContext, gain: GainNode, id: string, src: string, token: number): Promise<MusicSession> {
  const media = new Audio(); media.preload = 'none'; media.src = src;
  const position = resumePositions.get(id) ?? 0;
  if (position > 0) { try { media.currentTime = position; } catch { /* Unseekable recording starts at the beginning. */ } }
  const source = ctx.createMediaElementSource(media); source.connect(gain);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const value: MusicSession = { id, gain, stopped: false, position: () => media.currentTime, dispose: () => {
    clearTimeout(timer); media.onended = null; media.onerror = null; media.pause(); media.removeAttribute('src'); media.load(); source.disconnect();
  } };
  session = value;
  media.onended = () => {
    if (token !== requestId || value.stopped || !preferences.music || hidden()) return;
    resumePositions.delete(id);
    const next = preferences.loop === 'one' ? id : nextAvailableTrack(trackIds, id, failed);
    if (next) void launchTrack(next);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('audio load timeout')), LOAD_TIMEOUT_MS);
      media.onerror = () => reject(new Error('audio file unavailable'));
      void media.play().then(resolve, reject);
    });
    clearTimeout(timer);
    media.onerror = () => {
      if (token === requestId && !value.stopped) {
        failed.add(id); const next = nextAvailableTrack(trackIds, id, failed);
        if (next) void launchTrack(next, true); else halt('unavailable', '声音暂不可用，工坊仍可正常使用。');
      }
    };
    return value;
  } catch (error) { disposeSession(value); throw error; }
}
async function launchTrack(id: string, recovered = false) {
  const token = ++requestId;
  preferences = { ...preferences, trackId: id }; playing = false;
  if (!gesture || hidden()) { status = hidden() ? 'paused-hidden' : 'idle'; message = '点播放后再开始，不会自动出声。'; persist(); return; }
  status = 'loading'; message = ''; persist();
  try {
    await fadeOut();
    if (token !== requestId || hidden()) return;
    const ctx = getContext();
    if (!ctx || !musicGain) { status = 'blocked'; message = '浏览器暂未开启声音，请再次点播放。'; emit(); return; }
    if (ctx.state === 'suspended') await ctx.resume();
    if (token !== requestId || hidden()) return;
    const attempted = new Set<string>(); let next: string | undefined = id, usedFallback = recovered;
    while (next && token === requestId && !hidden()) {
      const track = AUDIO_TRACKS.find(item => item.id === next);
      if (!track || attempted.has(next)) break;
      attempted.add(next);
      const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(musicGain);
      try {
        const value = track.src ? await createLocal(ctx, gain, track.id, track.src, token) : createGenerated(ctx, gain, token);
        if (token !== requestId || hidden() || value.stopped) { disposeSession(value); return; }
        session = value; preferences = { ...preferences, trackId: track.id };
        playing = true; status = 'playing'; message = usedFallback ? track.id === 'generated' ? '本地曲目暂不可用，已切换生成乐句。' : '上一首暂不可用，已切换下一首。' : '';
        ramp(gain.gain, 1, FADE_SECONDS); persist(); return;
      } catch (error) {
        try { gain.disconnect(); } catch { /* teardown */ }
        if (token !== requestId) return;
        if (error instanceof Error && error.name === 'NotAllowedError') { status = 'blocked'; message = '浏览器需要再次确认播放，请点播放重试。'; emit(); return; }
        failed.add(track.id); usedFallback = true; emit();
        next = nextAvailableTrack(trackIds, track.id, new Set([...failed, ...attempted]));
      }
    }
    if (token === requestId) halt('unavailable', '声音暂不可用，工坊仍可正常使用。');
  } catch { if (token === requestId) halt('blocked', '声音暂未开启，请点播放重试。'); }
}
export function setMusic(enabled: boolean) {
  preferences = { ...preferences, music: enabled }; persist();
  if (enabled) void launchTrack(preferences.trackId); else halt('paused');
}
export function selectTrack(id: string, autoplay = playing || status === 'loading') {
  if (!trackIds.includes(id)) return;
  if (id !== preferences.trackId) resumePositions.delete(id);
  preferences = { ...preferences, trackId: id, music: autoplay ? true : preferences.music }; persist();
  if (autoplay) void launchTrack(id); else if (session) halt('paused');
}
export function changeTrack(direction: -1 | 1) {
  const index = trackIds.indexOf(preferences.trackId);
  for (let offset = 1; offset <= trackIds.length; offset++) {
    const id = trackIds[(index + direction * offset + trackIds.length * 2) % trackIds.length];
    if (!failed.has(id)) { selectTrack(id); return; }
  }
}
export function retryMusic() { const id = [...failed][0] ?? preferences.trackId; failed.clear(); preferences = { ...preferences, music: true }; persist(); void launchTrack(id); }
