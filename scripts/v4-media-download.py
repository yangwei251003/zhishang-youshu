"""Fetch public tutorial streams using the project's explicitly authorized V4 scope.

No cookies, login, proxy, or access-control workaround is used. Sources and the
exact public stream URLs are retained in the .info.json files beside originals.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v4-media'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'snowflake': 'BV1QV4y1w7W8',
    'flower': 'BV1q84y1q7CV',
    'happiness': 'BV1U24y1k7hX',
    'animal': 'BV1tV4y1P7ns',
    'border': 'BV183411N7B3',
}

def fetch(entry):
    category, bvid = entry
    command = [
        'yt-dlp', '--no-playlist', '--no-warnings', '--socket-timeout', '20',
        '--retries', '0', '--fragment-retries', '0', '--write-info-json',
        '--ffmpeg-location', imageio_ffmpeg.get_ffmpeg_exe(),
        '-f', 'bestvideo[width<=1280][height<=1280]+bestaudio/best',
        '--merge-output-format', 'mp4', '--newline',
        '-o', str(OUT / f'{category}-original.%(ext)s'),
        f'https://www.bilibili.com/video/{bvid}/',
    ]
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf8', errors='replace')
    (OUT / f'{category}-download.log').write_text(result.stdout + result.stderr, encoding='utf8')
    print(category, result.returncode, flush=True)
    return result.returncode

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(fetch, SOURCES.items()))
    raise SystemExit(any(results))
