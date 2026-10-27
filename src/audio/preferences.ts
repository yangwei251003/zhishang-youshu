export const AUDIO_KEY = 'paperWorkshop.audio.v1';
export const AUDIO_V2_KEY = 'paperWorkshop.audio.v2';
export interface AudioPreferences {
  sfx: boolean; sfxVolume: number; music: boolean;
  trackId: string; volume: number; loop: 'one' | 'all';
}
export const DEFAULT_AUDIO: AudioPreferences = { sfx: true, sfxVolume: .8, music: false, trackId: 'zs-track-1', volume: .6, loop: 'all' };
export function boundedVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
function object(raw: string | null): Record<string, unknown> | undefined {
  try { const value: unknown = JSON.parse(raw ?? 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; } catch { return; }
}
/** V2 remains a preference, never an instruction to play at page load. */
export function parseAudioPreferences(v2: string | null, v1: string | null, trackIds: readonly string[]): AudioPreferences {
  const data = object(v2) ?? object(v1) ?? {};
  return {
    sfx: typeof data.sfx === 'boolean' ? data.sfx : DEFAULT_AUDIO.sfx,
    music: typeof data.music === 'boolean' ? data.music : DEFAULT_AUDIO.music,
    sfxVolume: boundedVolume(data.sfxVolume, DEFAULT_AUDIO.sfxVolume),
    volume: boundedVolume(data.volume, DEFAULT_AUDIO.volume),
    trackId: typeof data.trackId === 'string' && trackIds.includes(data.trackId) ? data.trackId : trackIds[0] ?? DEFAULT_AUDIO.trackId,
    loop: data.loop === 'one' ? 'one' : 'all',
  };
}
/** A failure walk visits each real track at most once, then ends at the local synth. */
export function nextAvailableTrack(trackIds: readonly string[], currentId: string, failedIds: ReadonlySet<string>): string | undefined {
  const start = Math.max(0, trackIds.indexOf(currentId));
  for (let offset = 1; offset <= trackIds.length; offset++) {
    const id = trackIds[(start + offset) % trackIds.length];
    if (!failedIds.has(id)) return id;
  }
  return;
}
