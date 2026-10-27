"""Share the tested video stream, then validate the changed container once."""
from pathlib import Path
import hashlib, json, struct, subprocess
import imageio_ffmpeg
R=Path(__file__).parent.parent; A=R/'artifacts/v5-video'
FF=imageio_ffmpeg.get_ffmpeg_exe(); FP=R/'artifacts/v4-media/ffprobe.exe'
def run(args):
    p=subprocess.run(args,capture_output=True,text=True,encoding='utf8',errors='replace')
    if p.returncode:raise RuntimeError(p.stderr)
    return p
def audio_hash(file):
    return run([FF,'-v','error','-i',str(file),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).stdout.strip()
report=json.loads((A/'media-qa.json').read_text(encoding='utf8'))
bgm=A/'revised-bgm.mp4'; nobgm=A/'revised-nobgm.mp4'; temp=A/'revised-nobgm.tmp.mp4'
old_audio_hash=audio_hash(nobgm)
report['preRemuxNoBgm']=report['assets']['nobgm'].copy()
run([FF,'-y','-v','error','-i',str(bgm),'-i',str(nobgm),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(temp)])
temp.replace(nobgm)
probe=json.loads(run([str(FP),'-v','error','-show_format','-show_streams','-of','json',str(nobgm)]).stdout)
# One complete decode covers both streams while hashing every decoded video frame.
p=run([FF,'-v','error','-threads','2','-i',str(nobgm),'-map','0:v:0','-f','hash','-hash','sha256','-','-map','0:a:0','-f','null','-'])
data=nobgm.read_bytes(); atoms=[]; i=0
while i+8<=len(data):
    size,typ=struct.unpack('>I4s',data[i:i+8]); atoms.append((typ.decode(errors='replace'),i,size))
    if size==1:size=struct.unpack('>Q',data[i+8:i+16])[0]
    if size<=0:break
    i+=size
final_audio_hash=audio_hash(nobgm)
report['assets']['nobgm'].update(file=str(nobgm),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),probe=probe,fullDecode='PASS' if not p.stderr else p.stderr,decodedVideoHash=p.stdout.strip(),atoms=atoms,faststart=next(a[1] for a in atoms if a[0]=='moov')<next(a[1] for a in atoms if a[0]=='mdat'),audioStreamHash=final_audio_hash)
report['sameVideoBothVersions']=report['assets']['bgm']['decodedVideoHash']==p.stdout.strip()
report['noBgmAudioUnchangedByRemux']=old_audio_hash==final_audio_hash
assert report['sameVideoBothVersions'] and report['noBgmAudioUnchangedByRemux']
report['finalization']='Final no-BGM version copies the tested main video stream and its previously measured no-BGM audio stream; the final container is fully decoded and video-hashed again. Audio packet hash is unchanged.'
(A/'media-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('FINAL VERIFIED',json.dumps({k:{'bytes':v['bytes'],'sha256':v['sha256']} for k,v in report['assets'].items()}),flush=True)
for frame in [869,984,1473,1933,2048,2544,2880]:
    run([FF,'-v','error','-threads','2','-ss',f'{frame/30:.8f}','-i',str(bgm),'-frames:v','1','-y',str(A/'frames'/f'final-encoded-{frame}.png')])
print('ENCODED FRAMES READY',flush=True)
