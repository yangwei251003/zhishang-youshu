from pathlib import Path
import subprocess,imageio_ffmpeg
R=Path(__file__).parent.parent;A=R/'artifacts/v5-video';FF=imageio_ffmpeg.get_ffmpeg_exe()
filters='[0:v]split=3[a][b][c];[a]trim=start_frame=0:end_frame=824,setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[b]trim=start_frame=1053:end_frame=1888,setpts=PTS-STARTPTS[v2];[2:v]setpts=PTS-STARTPTS[v3];[c]trim=start_frame=2213:end_frame=2931,setpts=PTS-STARTPTS[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]'
for name,source in [('bgm',R/'public/videos/workshop-intro.mp4')]:
    args=[FF,'-y','-i',str(source),'-i',str(A/'patch-cut.mp4'),'-i',str(A/'patch-inspiration.mp4'),'-filter_complex',filters,'-map','[v]','-map','0:a','-c:v','libx264','-crf','19','-preset','fast','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(A/f'revised-{name}.mp4')]
    p=subprocess.run(args,capture_output=True,text=True,encoding='utf8',errors='replace');(A/f'revised-{name}-encode.log').write_text(p.stderr,encoding='utf8')
    if p.returncode:raise RuntimeError(p.stderr)
    print('REVISED',name,flush=True)
# Reuse exactly one final video stream for both versions. Only the audio differs.
p=subprocess.run([FF,'-y','-i',str(A/'revised-bgm.mp4'),'-i',str(A/'workshop-intro-nobgm.mp4'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(A/'revised-nobgm.tmp.mp4')],capture_output=True,text=True,encoding='utf8',errors='replace')
if p.returncode:raise RuntimeError(p.stderr)
(A/'revised-nobgm.tmp.mp4').replace(A/'revised-nobgm.mp4')
(A/'revised-nobgm-encode.log').write_text(p.stderr,encoding='utf8')
print('REVISED nobgm — shared video stream',flush=True)
