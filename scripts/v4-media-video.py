"""Produce small genuine tutorial excerpts; no generated or replacement footage."""
from pathlib import Path
import hashlib
import json
import subprocess
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts' / 'v4-media'
PUBLIC = ROOT / 'public' / 'videos'
EVIDENCE = ROOT / 'docs' / 'v4-implementation' / 'evidence'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FFPROBE = str(WORK / 'ffprobe.exe')
CLIPS = {
    'snowflake': (0, 96.5, 540),
    'flower': (480, 65, 810),
    'happiness': (255, 70, 750),
    'animal': (555, 65, 810),
    'border': (0, 112.15, 480),
}

def run(command):
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result

def probe(path):
    return json.loads(run([FFPROBE, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)

if __name__ == '__main__':
    PUBLIC.mkdir(parents=True, exist_ok=True)
    summary = []
    for category, (start, duration, maxrate) in CLIPS.items():
        source = WORK / f'{category}-original.mp4'
        target = PUBLIC / f'{category}-local.mp4'
        # 720p landscape canvas keeps all original pixels in frame; portrait
        # snowflake footage is letterboxed, never cropped or mislabelled HD.
        command = [FFMPEG, '-hide_banner', '-y', '-ss', str(start), '-i', str(source), '-t', str(duration),
                   '-map', '0:v:0', '-map', '0:a:0?', '-vf',
                   'scale=1280:720:force_original_aspect_ratio=decrease:flags=lanczos,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
                   '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-maxrate', f'{maxrate}k', '-bufsize', f'{maxrate*2}k',
                   '-threads', '2', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '64k', '-ar', '44100',
                   '-movflags', '+faststart', '-map_metadata', '-1', str(target)]
        encoded = run(command)
        (WORK / f'{category}-encode.log').write_text(encoded.stderr, encoding='utf8')
        original_metadata = json.loads((WORK / f'{category}-original.info.json').read_text(encoding='utf8'))
        result = {'category': category, 'originalTitle': original_metadata['title'],
                  'author': original_metadata.get('uploader'), 'sourceUrl': original_metadata['webpage_url'],
                  'directStreams': [{'format_id': f['format_id'], 'url': f['url']} for f in original_metadata.get('requested_formats', [])],
                  'acquiredDate': '2026-09-28', 'sourceExcerptSeconds': [start, start+duration],
                  'licenseStatus': 'Public Bilibili upload; no separate reuse license obtained or claimed.',
                  'sourceProbe': probe(source), 'finalProbe': probe(target), 'command': command,
                  'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
        if result['bytes'] > 8_000_000:
            raise RuntimeError(f'{category} exceeds 8MB: {result["bytes"]}')
        (EVIDENCE / f'media-video-{category}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
        run([FFMPEG, '-hide_banner', '-y', '-ss', str(duration*.65), '-i', str(target), '-frames:v', '1',
             str(EVIDENCE / f'media-quality-{category}.jpg')])
        summary.append(result)
        print(category, result['bytes'], flush=True)
    (EVIDENCE / 'media-video-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf8')
