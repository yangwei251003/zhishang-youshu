from pathlib import Path
import json,subprocess,imageio_ffmpeg
R=Path(__file__).parent;FF=imageio_ffmpeg.get_ffmpeg_exe();(R/'public/clips').mkdir(exist_ok=True)
c=json.loads((R/'capture-cut.json').read_text(encoding='utf8'));b=c['box'];crop=f'crop=1270:828:295:{round(b["y"])}'
res=subprocess.run([FF,'-y','-ss',str(c['from']),'-i',str(R.parent/'artifacts/v5-video/supplement-raw.webm'),'-t',str(c['duration']),'-vf',crop+',fps=30','-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(R/'public/clips/cut.mp4')],capture_output=True,text=True,encoding='utf8',errors='replace')
if res.returncode: raise RuntimeError(res.stderr)
(R.parent/'artifacts/v5-video/clip-encode.log').write_text(res.stderr,encoding='utf8')
print('clip ready',c)
