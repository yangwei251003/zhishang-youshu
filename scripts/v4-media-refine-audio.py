"""Verify encoded loudness, compensate encoder gain, and remove source cover art.

All final masters are encoded from original audio, not from an MP3 generation.
The small measured gain correction is followed by a -2dBFS sample limiter to
retain true-peak headroom after MP3 encoding; final LUFS/TP are measured again.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import runpy
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts' / 'v4-media'
EVIDENCE = ROOT / 'docs' / 'v4-implementation' / 'evidence'
PUBLIC = ROOT / 'public' / 'audio'
API = runpy.run_path(str(ROOT / 'scripts' / 'v4-media-audio.py'))
run, loudness = API['run'], API['loudness']
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FFPROBE = str(WORK / 'ffprobe.exe')

results = []
for number in range(1, 5):
    evidence = EVIDENCE / f'media-audio-{number}.json'
    data = json.loads(evidence.read_text(encoding='utf8'))
    measured_gain = round(-16 - float(data['finalLoudness']['input_i']), 2)
    source = WORK / f'zs-track-{number}-original.mp3'
    final = PUBLIC / f'zs-track-{number}.mp3'
    output = WORK / f'zs-track-{number}-refined.mp3'
    correction = f'volume={measured_gain}dB,alimiter=limit=0.794328:level=false:latency=true'
    args = [FFMPEG, '-hide_banner', '-y', '-i', str(source), '-vn', '-af',
            data['fade'] + ',' + data['normalization'] + ',' + correction,
            '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', '-map_metadata', '-1',
            '-metadata', f'title={data["title"]} (workshop excerpt)', '-metadata', 'artist=Kevin MacLeod',
            '-metadata', 'copyright=CC BY 4.0 https://creativecommons.org/licenses/by/4.0/', str(output)]
    encoded = run(args)
    (WORK / f'zs-track-{number}-refined-encode.log').write_text(encoded.stderr, encoding='utf8')
    data['previousMasterLoudness'] = data['finalLoudness']
    data['encoderCompensation'] = correction
    data['finalProbe'] = json.loads(run([FFPROBE, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(output)]).stdout)
    measurement = run([FFMPEG, '-hide_banner', '-i', str(output), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    data['finalLoudness'] = loudness(measurement.stderr)
    (WORK / f'zs-track-{number}-refined-loudness.log').write_text(measurement.stderr, encoding='utf8')
    assert abs(float(data['finalLoudness']['input_i']) + 16) <= .3, data['finalLoudness']
    assert float(data['finalLoudness']['input_tp']) <= -1.5, data['finalLoudness']
    assert float(data['finalProbe']['format']['duration']) <= 180
    assert output.stat().st_size <= 4_000_000
    assert all(s['codec_type'] == 'audio' for s in data['finalProbe']['streams'])
    data['sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    data['bytes'] = output.stat().st_size
    data['finalProbe']['format']['filename'] = str(final)
    output.replace(final)
    evidence.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')
    cover = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Original geometric record cover {number}">
  <rect width="240" height="240" rx="24" fill="none"/>
  <g fill="none" stroke="currentColor" stroke-width="1.6">
    <circle cx="120" cy="120" r="91"/><circle cx="120" cy="120" r="80" opacity=".3"/>
    <circle cx="120" cy="120" r="66" opacity=".22"/><circle cx="120" cy="120" r="51" opacity=".18"/>
    <circle cx="120" cy="120" r="7"/>
    <path d="M120 38Q145 92 202 120Q147 148 120 202Q92 146 38 120Q92 93 120 38Z" opacity=".6" transform="rotate({number*22.5} 120 120)"/>
  </g>
  <text x="120" y="224" text-anchor="middle" fill="currentColor" font-family="serif" font-size="13" letter-spacing="5">0{number} / PAPER</text>
</svg>'''
    (PUBLIC / f'zs-track-{number}-cover.svg').write_text(cover, encoding='utf8')
    run([FFMPEG, '-hide_banner', '-y', '-i', str(final), '-filter_complex',
         'showwavespic=s=1200x160:colors=9d392e', '-frames:v', '1', str(EVIDENCE / f'media-waveform-{number}.png')])
    results.append(data)
    print(number, data['finalLoudness']['input_i'], data['finalLoudness']['input_tp'], data['bytes'], flush=True)
(EVIDENCE / 'media-audio-summary.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf8')
