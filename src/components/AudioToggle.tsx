import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { ExternalLink, Music2, Pause, Play, Repeat2, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { AUDIO_TRACKS } from '../content/audio-tracks';
import { audioState, changeTrack, retryMusic, selectTrack, setLoop, setMusic, setMusicVolume, setSfx, setSfxVolume, subscribeAudio } from '../audio/sfx';
import './AudioToggle.css';

/** Settings content only: the app owns the dialog, focus return, and lifetime listeners. */
export default function AudioToggle() {
  const [audio, setAudio] = useState(audioState);
  const volumeId = useId(), sfxVolumeId = useId();
  useEffect(() => subscribeAudio(() => setAudio(audioState())), []);
  const track = AUDIO_TRACKS.find(item => item.id === audio.trackId) ?? AUDIO_TRACKS[0];
  const loading = audio.status === 'loading';
  const statusText = loading ? '正在准备曲目…' : audio.playing ? '正在播放' : audio.status === 'paused-hidden' ? '已暂停 · 请主动继续' : audio.status === 'paused' ? '已暂停' : audio.status === 'blocked' || audio.status === 'unavailable' ? '等待重新播放' : '尚未播放';
  function browseTracks(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  return <section className="audio-settings" aria-label="工坊声音">
    <div className="audio-current">
      <div className={`audio-record ${audio.playing ? 'is-playing' : ''}`} aria-hidden="true"><Music2 size={28}/></div>
      <div className="audio-current-copy"><span className="audio-eyebrow">工坊曲单 · 离线可听</span><h3>{track.title}</h3><p>{track.author}</p>{track.sourceUrl ? <><div className="audio-source-links"><a href={track.sourceUrl} target="_blank" rel="noreferrer">曲目来源 <ExternalLink size={12}/></a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></div><span className="audio-eyebrow">摘录 · 响度调整 · 淡入淡出</span></> : <span className="audio-eyebrow">本站原创生成乐句</span>}</div>
    </div>
    <div className="audio-transport" role="group" aria-label="音乐播放控制">
      <button aria-label="上一首" onClick={() => changeTrack(-1)}><SkipBack size={18}/></button>
      <button className="audio-play" aria-label={loading ? '取消音乐加载' : audio.playing ? '关闭轻音乐' : '开启轻音乐'} aria-pressed={audio.playing} onClick={() => setMusic(!(audio.playing || loading))}>{audio.playing || loading ? <Pause size={18}/> : <Play size={18}/>}<span>{loading ? '取消加载' : audio.playing ? '暂停音乐' : audio.status === 'paused-hidden' || audio.status === 'paused' ? '继续播放' : '播放音乐'}</span></button>
      <button aria-label="下一首" onClick={() => changeTrack(1)}><SkipForward size={18}/></button>
    </div>
    <p className="audio-status" role="status" aria-live="polite">{statusText}{audio.volume === 0 && audio.playing ? ' · 音乐音量为零' : ''}{audio.message && <span>{audio.message}</span>}</p>
    <div className="audio-track-list" role="listbox" aria-label="选择音乐曲目" onKeyDown={browseTracks}>
      {AUDIO_TRACKS.map((item, index) => <button key={item.id} role="option" aria-selected={audio.trackId === item.id} disabled={audio.failedTrackIds.includes(item.id)} onClick={() => selectTrack(item.id, true)}><span className="audio-track-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.title}</strong><small>{audio.failedTrackIds.includes(item.id) ? '这首暂时不可用' : item.src ? item.author : '工坊原创 · 离线生成'}</small></span>{audio.trackId === item.id && <Music2 size={15}/>}</button>)}
    </div>
    {audio.failedTrackIds.length > 0 && <button className="audio-retry" onClick={retryMusic}>重新尝试不可用曲目</button>}
    <div className="audio-volume-row"><label htmlFor={volumeId}>音乐音量 <output>{Math.round(audio.volume * 100)}%</output></label><input id={volumeId} aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={event => setMusicVolume(Number(event.target.value))}/></div>
    <label className="audio-loop"><span><Repeat2 size={16}/>循环方式</span><select aria-label="循环方式" value={audio.loop} onChange={event => setLoop(event.target.value as 'one' | 'all')}><option value="all">列表循环</option><option value="one">单曲循环</option></select></label>
    <div className="audio-effects"><div className="audio-effects-heading"><span>剪纸音效</span><button aria-pressed={audio.sfx} onClick={() => setSfx(!audio.sfx)}>{audio.sfx ? <Volume2 size={16}/> : <VolumeX size={16}/>}音效{audio.sfx ? '开' : '关'}</button></div><div className="audio-volume-row"><label htmlFor={sfxVolumeId}>音效音量 <output>{Math.round(audio.sfxVolume * 100)}%</output></label><input id={sfxVolumeId} aria-label="音效音量" type="range" min="0" max="1" step="0.05" value={audio.sfxVolume} onChange={event => setSfxVolume(Number(event.target.value))}/></div></div>
    <p className="audio-footnote">离开标签页会暂停；回到工坊后请主动继续。落剪时音乐会短暂降低，让操作声更清楚。</p>
  </section>;
}
