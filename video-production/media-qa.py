from pathlib import Path
import subprocess,json,re,hashlib,struct,wave
import numpy as np
from scipy.signal import correlate
import imageio_ffmpeg
R=Path(__file__).parent;P=R.parent;A=P/'artifacts/v5-video';FF=imageio_ffmpeg.get_ffmpeg_exe();FP=P/'artifacts/v4-media/ffprobe.exe'
def run(args):
 p=subprocess.run(args,capture_output=True,text=True,encoding='utf8',errors='replace')
 if p.returncode: raise RuntimeError(p.stderr)
 return p
report={'timeline':json.loads((R/'timeline.json').read_text(encoding='utf8')),'assets':{}}
for name in ['bgm','nobgm']:
 f=A/f'revised-{name}.mp4'
 if not f.exists(): f=P/'public/videos/workshop-intro.mp4' if name=='bgm' else A/'workshop-intro-nobgm.mp4'
 probe=json.loads(run([str(FP),'-v','error','-show_format','-show_streams','-of','json',str(f)]).stdout)
 decode=run([FF,'-v','error','-i',str(f),'-f','null','-'])
 measure=run([FF,'-hide_banner','-i',str(f),'-af','loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json','-f','null','-'])
 loud=json.loads(re.findall(r'\{\s*"input_i".*?\}',measure.stderr,re.S)[-1]);(A/f'{name}-loudness.log').write_text(measure.stderr,encoding='utf8')
 data=f.read_bytes();atoms=[];i=0
 while i+8<=len(data):
  size,typ=struct.unpack('>I4s',data[i:i+8]);atoms.append((typ.decode(errors='replace'),i,size));
  if size==1:size=struct.unpack('>Q',data[i+8:i+16])[0]
  if size<=0:break
  i+=size
 vhash=run([FF,'-v','error','-i',str(f),'-map','0:v','-f','hash','-hash','sha256','-']).stdout.strip()
 report['assets'][name]={'file':str(f),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'probe':probe,'fullDecode':'PASS' if not decode.stderr else decode.stderr,'loudness':loud,'atoms':atoms,'faststart':next(a[1] for a in atoms if a[0]=='moov')<next(a[1] for a in atoms if a[0]=='mdat'),'decodedVideoHash':vhash}
 print(name,'duration',probe['format']['duration'],'loudness',loud['input_i'],'peak',loud['input_tp'],flush=True)
# Compare rendered AAC voice timing against exact original narration WAVs.
target=A/'revised-nobgm.mp4'
if not target.exists():target=A/'workshop-intro-nobgm.mp4'
p=subprocess.run([FF,'-v','error','-i',str(target),'-vn','-ac','1','-ar','48000','-f','f32le','-'],capture_output=True)
full=np.frombuffer(p.stdout,dtype=np.float32);align=[]
for cap in report['timeline']['captions'][::4]:
 with wave.open(str(R/'public'/cap['src'])) as w:ref=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
 expected=round(cap['from']/30*48000);left=max(0,expected-12000);clip=full[left:expected+len(ref)+12000]
 corr=correlate(clip,ref,mode='valid',method='fft');pos=int(np.argmax(corr))+left;offset=pos-expected
 align.append({'text':cap['text'],'expected_frame':cap['from'],'offset_samples':offset,'offset_frames':round(offset/1600,4)})
report['narrationAlignment']=align
report['sameVideoBothVersions']=report['assets']['bgm']['decodedVideoHash']==report['assets']['nobgm']['decodedVideoHash']
vtt=(P/'public/videos/workshop-intro.vtt').read_text(encoding='utf8');report['vtt']={'cues':vtt.count(' --> '),'sameNarrationText':all(c['text'] in vtt for c in report['timeline']['captions']),'lastCueEnd':max((c['from']+c['frames'])/30 for c in report['timeline']['captions'])}
(A/'media-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('sameVideo',report['sameVideoBothVersions'],'alignment',align,'vtt',report['vtt'])
