from pathlib import Path
import sys, asyncio, json, subprocess, math, re, shutil
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'pydeps'))
import edge_tts, imageio_ffmpeg, requests
FF=imageio_ffmpeg.get_ffmpeg_exe()
P=ROOT/'public'; A=P/'audio'; A.mkdir(parents=True,exist_ok=True)
scenes=json.loads((ROOT/'script.json').read_text(encoding='utf8'))
async def produce(i,j,text):
    raw=A/f'{i:02d}-{j:02d}-raw.mp3'; out=A/f'{i:02d}-{j:02d}.wav'
    if not raw.exists(): await edge_tts.Communicate(text,'zh-CN-XiaoxiaoNeural',rate='-4%',pitch='-2Hz').save(str(raw))
    p=subprocess.run([FF,'-y','-i',str(raw),'-af','silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,loudnorm=I=-18:TP=-3:LRA=7','-ar','48000','-ac','1',str(out)],capture_output=True,text=True,encoding='utf8',errors='replace')
    if p.returncode: raise RuntimeError(p.stderr)
    import wave
    with wave.open(str(out)) as w: dur=w.getnframes()/w.getframerate()
    return {'text':text,'src':f'audio/{out.name}','duration':round(dur,3),'frames':math.ceil(dur*30)}
async def main():
    cursor=0; final=[]; captions=[]
    for i,scene in enumerate(scenes):
        voices=[]; local=20
        for j,txt in enumerate(scene['lines']):
            v=await produce(i,j,txt);v['from']=cursor+local;voices.append(v); captions.append(v)
            local+=v['frames']+11
        frames=max(local+21,210)
        final.append({**scene,'from':cursor,'frames':frames,'voices':voices})
        cursor+=frames
        print(scene['id'],frames/30,flush=True)
    timeline={'fps':30,'width':1920,'height':1080,'durationInFrames':cursor,'duration':cursor/30,'scenes':final,'captions':captions,'voice':{'provider':'Microsoft Edge online natural voice via edge-tts','name':'zh-CN-XiaoxiaoNeural','rate':'-4%','pitch':'-2Hz'}}
    (ROOT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf8')
    shutil.copy(ROOT.parent/'public/audio/zs-track-1.mp3',A/'ripples.mp3')
    for name,id in [('paper-slide',1530),('paper-turn',1104),('scissors',2378)]:
        response=requests.get(f'https://assets.mixkit.co/active_storage/sfx/{id}/{id}-preview.mp3',timeout=30);response.raise_for_status();(A/f'{name}.mp3').write_bytes(response.content)
    def stamp(sec):
        ms=round(sec*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
    vtt='WEBVTT\n\n'+'\n\n'.join(f'{stamp(c["from"]/30)} --> {stamp((c["from"]+c["frames"])/30)}\n{c["text"]}' for c in captions)+'\n'
    (ROOT.parent/'public/videos/workshop-intro.vtt').write_text(vtt,encoding='utf8')
    (ROOT.parent/'docs/v5-video/script.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf8')
    print('TOTAL',cursor/30,flush=True)
asyncio.run(main())
