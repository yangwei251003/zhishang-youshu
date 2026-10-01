"""Reproducible V4 local music masters from the author's public download links."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import re
import subprocess
import urllib.parse
import requests
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts' / 'v4-media'
PUBLIC = ROOT / 'public' / 'audio'
EVIDENCE = ROOT / 'docs' / 'v4-implementation' / 'evidence'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FFPROBE = str(WORK / 'ffprobe.exe')
TITLES = ['Ripples', 'Senbazuru', 'Meditation Impromptu 01', 'Morning']

def run(args):
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result

def loudness(stderr):
    return json.loads(re.findall(r'\{\s*"input_i".*?\}', stderr, re.S)[-1])

def master(entry):
    number, title = entry
    catalogue = json.loads((WORK / 'music-catalogue.json').read_text(encoding='utf8'))
    metadata = next(p for p in catalogue if p['title'] == title)
    source_url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + urllib.parse.quote(metadata['filename'])
    source = WORK / f'zs-track-{number}-original.mp3'
    if not source.exists():
        response = requests.get(source_url, timeout=45)
        response.raise_for_status()
        source.write_bytes(response.content)
    probe = json.loads(run([FFPROBE, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(source)]).stdout)
    duration = min(175, float(probe['format']['duration']) - .05)
    fade = f'atrim=duration={duration},asetpts=PTS-STARTPTS,afade=t=in:d=2,afade=t=out:st={duration-3}:d=3'
    measurement = run([FFMPEG, '-hide_banner', '-i', str(source), '-af', fade + ',loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    measured = loudness(measurement.stderr)
    (WORK / f'zs-track-{number}-loudnorm-firstpass.log').write_text(measurement.stderr, encoding='utf8')
    normalize = (f'loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={measured["input_i"]}'
                 f':measured_TP={measured["input_tp"]}:measured_LRA={measured["input_lra"]}'
                 f':measured_thresh={measured["input_thresh"]}:offset={measured["target_offset"]}:linear=true:print_format=json')
    output = PUBLIC / f'zs-track-{number}.mp3'
    result = run([FFMPEG, '-hide_banner', '-y', '-i', str(source), '-af', fade + ',' + normalize,
                  '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', '-map_metadata', '-1',
                  '-metadata', f'title={title} (workshop excerpt)', '-metadata', 'artist=Kevin MacLeod',
                  '-metadata', 'copyright=CC BY 4.0 https://creativecommons.org/licenses/by/4.0/', str(output)])
    (WORK / f'zs-track-{number}-encode.log').write_text(result.stderr, encoding='utf8')
    final_probe = json.loads(run([FFPROBE, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(output)]).stdout)
    final_measure = run([FFMPEG, '-hide_banner', '-i', str(output), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])
    (WORK / f'zs-track-{number}-final-loudness.log').write_text(final_measure.stderr, encoding='utf8')
    data = {'id': f'zs-track-{number}', 'title': title, 'author': 'Kevin MacLeod', 'metadata': metadata,
            'sourceUrl': f'https://incompetech.com/music/royalty-free/index.html?isrc={metadata["isrc"]}',
            'downloadUrl': source_url, 'acquiredDate': '2026-09-28', 'sourceExcerptSeconds': [0, duration],
            'license': 'CC BY 4.0; author official download page', 'normalization': normalize,
            'fade': fade, 'sourceProbe': probe, 'finalProbe': final_probe, 'finalLoudness': loudness(final_measure.stderr),
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size}
    (EVIDENCE / f'media-audio-{number}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')
    print(title, output.stat().st_size, data['finalLoudness']['input_i'], data['finalLoudness']['input_tp'], flush=True)
    return data

if __name__ == '__main__':
    PUBLIC.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        result = list(pool.map(master, enumerate(TITLES, 1)))
    (EVIDENCE / 'media-audio-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
