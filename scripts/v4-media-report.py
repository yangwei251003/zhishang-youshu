"""Read final probes and masters, verify decode/limits, and write asset provenance."""
from pathlib import Path
import hashlib
import json
import subprocess
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs' / 'v4-implementation' / 'evidence'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
audio = json.loads((EVIDENCE / 'media-audio-summary.json').read_text(encoding='utf8'))
video = json.loads((EVIDENCE / 'media-video-summary.json').read_text(encoding='utf8'))
checks = []
for data, path in [(d, ROOT / 'public' / 'audio' / f'{d["id"]}.mp3') for d in audio] + [
    (d, ROOT / 'public' / 'videos' / f'{d["category"]}-local.mp4') for d in video]:
    assert hashlib.sha256(path.read_bytes()).hexdigest() == data['sha256']
    decoded = subprocess.run([FFMPEG, '-hide_banner', '-v', 'error', '-threads', '2', '-i', str(path), '-f', 'null', '-'], capture_output=True, text=True)
    assert decoded.returncode == 0 and decoded.stderr.strip() == '', decoded.stderr
    checks.append({'path': str(path.relative_to(ROOT)), 'decodeExitCode': decoded.returncode,
                   'decodeErrors': decoded.stderr, 'bytes': path.stat().st_size, 'sha256Verified': True})
assert sum(d['bytes'] for d in audio) <= 16_000_000
for d in audio:
    assert d['bytes'] <= 4_000_000
    assert float(d['finalProbe']['format']['duration']) <= 180
    assert abs(float(d['finalLoudness']['input_i'])+16) <= .3
    assert float(d['finalLoudness']['input_tp']) <= -1.5
    assert float(d['finalLoudness']['input_lra']) <= 11
for d in video:
    assert d['bytes'] <= 8_000_000
    stream = next(s for s in d['finalProbe']['streams'] if s['codec_type'] == 'video')
    assert (stream['width'], stream['height'], stream['codec_name']) == (1280, 720, 'h264')

def stamp(t):
    return f'{int(t)//60:02d}:{t%60:05.2f}'

lines = [
    '# V4 本地音视频来源与处理记录', '',
    '获取日期：2026-09-28。此清单记录实际获取的素材与技术核验，不替代真人试听、完整教学审查或实体实剪。', '',
    '## 音乐', '',
    '四首均为 Kevin MacLeod 的独立器乐作品，从作者 Incompetech 官方下载按钮指向的公开 MP3 获取；未使用登录、cookies、付费或访问控制绕过。站内保留原题与作者，中文短名为本工坊译名。', '',
    '作者页面标注 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本版修改包括截短、首尾淡化、响度处理与 MP3 编码；应保留曲名、作者、来源链接、许可链接及改动说明。页面说明与曲库元数据保存在 `artifacts/v4-media/music-source-page.html` 和 `music-catalogue.json`。', '',
    '|站内文件 / 使用位置|原题 / 作者|来源页 / 原始直链|原片摘录|成品时长|大小（MB）|实测 LUFS / dBTP|',
    '|---|---|---|---|---:|---:|---|',
]
for d in audio:
    dur = float(d['finalProbe']['format']['duration'])
    lines.append(f'|`public/audio/{d["id"]}.mp3` / 顶栏轻音乐选曲面板|{d["title"]} · Kevin MacLeod|[作者页面]({d["sourceUrl"]}) · [公开 MP3]({d["downloadUrl"]})|{stamp(d["sourceExcerptSeconds"][0])}–{stamp(d["sourceExcerptSeconds"][1])}|{dur:.2f}s|{d["bytes"]/1e6:.3f}|{d["finalLoudness"]["input_i"]} / {d["finalLoudness"]["input_tp"]}|')
lines += ['', f'音频总大小：{sum(d["bytes"] for d in audio)/1e6:.3f} MB。所有文件 160 kbps、44.1 kHz、双声道 MP3；已移除原文件附带封面，`zs-track-1-cover.svg` 至 `zs-track-4-cover.svg` 为本工坊原创几何封面（currentColor），无第三方图片。', '',
    '音色选择依据作者乐器说明：Ripples 为筝类拨弦，Senbazuru 为筝 / 笛 / 大提琴 / 合成器，Meditation Impromptu 01 为钢琴，Morning 为古典吉他 / 竖琴 / 笛。四首作者元数据均不含歌唱声部；真人全曲听感审查仍待验证。', '',
    '处理链：2 秒淡入、3 秒淡出 → 两遍 `loudnorm=I=-16:TP=-1.5:LRA=11` → 按第一次编码实测结果作小幅增益补偿 → −2 dBFS limiter 保留 MP3 真峰值余量 → 160 kbps 编码。所有最终文件再次实测 LUFS 与 dBTP；具体 measured 值、补偿值、ffprobe、SHA-256 见 `evidence/media-audio-{1..4}.json`，原始 FFmpeg 日志在 `artifacts/v4-media/`。', '',
    '第五项 `generated` 为原有《素纸微光》，作者纸上有数，Web Audio 生成乐句，无本地或第三方音频文件。音频引擎实现与现场响度体验由集成验收覆盖。', '',
    '## 真人剪纸视频', '',
    '五类均来自现有灵感库的真实公开视频，原片720公开档已取得并核验。仅使用未登录可播放的公开流，无 cookies 或访问控制绕过。B站公开投稿不等于开放再授权：以下未取得或宣称独立再使用许可，按用户已确认的素材策略记录原作者与原站来源。原始直链含有效期参数，准确链接保存在每条 `evidence/media-video-类别.json` 的 `directStreams` 与下载 `.info.json`，到期应从来源页重新获取。', '',
    '|类别 / 文件 / 使用位置|原题 / 作者|稳定来源|准确原片摘录|成品时长 / 大小|',
    '|---|---|---|---|---|',
]
names = {'snowflake':'雪花','flower':'团花','happiness':'喜字','animal':'动物','border':'花边'}
for d in video:
    title = d['originalTitle'].replace('|', r'\|')
    lines.append(f'|{names[d["category"]]} · `public/videos/{d["category"]}-local.mp4` / 对应分类与课时视频离线备用|{title} · {d["author"]}|[原视频]({d["sourceUrl"]})|{stamp(d["sourceExcerptSeconds"][0])}–{stamp(d["sourceExcerptSeconds"][1])}|{float(d["finalProbe"]["format"]["duration"]):.2f}s / {d["bytes"]/1e6:.3f} MB|')
lines += ['', '成品统一 H.264 / yuv420p、1280×720、25fps、AAC 64kbps、faststart。雪花原片为720×1280竖屏，按比例缩放并补边，保留完整手部与纸面；其他原片1280×720，无放大冒充原生高清。未变速、未拼贴步骤、未删除原视频水印或字幕。雪花与花边保留完整短示范；长课保留连续的实际修剪/展开摘录，页面明确标为摘录，完整步骤仍链接原站。', '',
    '## 核验与可复跑脚本', '',
    '- `scripts/v4-media-download.py`：公开来源视频与元数据下载。',
    '- `scripts/v4-media-audio.py` → `v4-media-refine-audio.py`：下载、两遍响度处理、最终编码与测量、原创封面。',
    '- `scripts/v4-media-video.py`：按上述连续时间段剪辑与720p压缩。',
    '- `scripts/v4-media-report.py`：完整解码、体积 / 时长 / 响度 / 分辨率断言与本清单。',
    '- `evidence/media-contact-*.jpg`：原视频12帧走查，已目视确认实际折、画、剪、展；`media-quality-*.jpg` 为最终文件代表帧。',
    '- `evidence/media-waveform-{1..4}.png`：最终音乐波形；`media-asset-checks.json` 为完整解码和哈希校验。', '',
    '已验证：4首真实本地曲目、5类真实本地视频、编码可解码、体积与时长限制、最终响度与真峰值、素材来源与署名数据。待集成验证：站内选择 / 播放控件 / 离线自动回落。待真人验证：系统音量50%的听感、长时间连续听感、完整教程可教性、实际打印与实剪；不把技术检查写成人工试用。', '',
]
(ROOT / 'docs' / 'v4-implementation' / 'media-sources.md').write_text('\n'.join(lines), encoding='utf8')
(EVIDENCE / 'media-asset-checks.json').write_text(json.dumps({'date':'2026-09-28','pass':True,'checks':checks}, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'pass':True,'assets':len(checks),'audioBytes':sum(d['bytes'] for d in audio),'videoBytes':sum(d['bytes'] for d in video)}))
