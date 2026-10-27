# V4 本地音视频来源与处理记录

获取日期：2026-09-28。此清单记录实际获取的素材与技术核验，不替代真人试听、完整教学审查或实体实剪。

## 音乐

四首均为 Kevin MacLeod 的独立器乐作品，从作者 Incompetech 官方下载按钮指向的公开 MP3 获取；未使用登录、cookies、付费或访问控制绕过。站内保留原题与作者，中文短名为本工坊译名。

作者页面标注 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本版修改包括截短、首尾淡化、响度处理与 MP3 编码；应保留曲名、作者、来源链接、许可链接及改动说明。页面说明与曲库元数据保存在 `artifacts/v4-media/music-source-page.html` 和 `music-catalogue.json`。

|站内文件 / 使用位置|原题 / 作者|来源页 / 原始直链|原片摘录|成品时长|大小（MB）|实测 LUFS / dBTP|
|---|---|---|---|---:|---:|---|
|`public/audio/zs-track-1.mp3` / 顶栏轻音乐选曲面板|Ripples · Kevin MacLeod|[作者页面](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100691) · [公开 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Ripples.mp3)|00:00.00–02:55.00|175.05s|3.502|-16.06 / -2.20|
|`public/audio/zs-track-2.mp3` / 顶栏轻音乐选曲面板|Senbazuru · Kevin MacLeod|[作者页面](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100821) · [公开 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Senbazuru.mp3)|00:00.00–01:34.02|94.07s|1.882|-16.00 / -2.41|
|`public/audio/zs-track-3.mp3` / 顶栏轻音乐选曲面板|Meditation Impromptu 01 · Kevin MacLeod|[作者页面](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100163) · [公开 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2001.mp3)|00:00.00–02:55.00|175.05s|3.502|-16.12 / -2.34|
|`public/audio/zs-track-4.mp3` / 顶栏轻音乐选曲面板|Morning · Kevin MacLeod|[作者页面](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2300003) · [公开 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Morning.mp3)|00:00.00–02:33.26|153.31s|3.067|-16.00 / -2.49|

音频总大小：11.952 MB。所有文件 160 kbps、44.1 kHz、双声道 MP3；已移除原文件附带封面，`zs-track-1-cover.svg` 至 `zs-track-4-cover.svg` 为本工坊原创几何封面（currentColor），无第三方图片。

音色选择依据作者乐器说明：Ripples 为筝类拨弦，Senbazuru 为筝 / 笛 / 大提琴 / 合成器，Meditation Impromptu 01 为钢琴，Morning 为古典吉他 / 竖琴 / 笛。四首作者元数据均不含歌唱声部；真人全曲听感审查仍待验证。

处理链：2 秒淡入、3 秒淡出 → 两遍 `loudnorm=I=-16:TP=-1.5:LRA=11` → 按第一次编码实测结果作小幅增益补偿 → −2 dBFS limiter 保留 MP3 真峰值余量 → 160 kbps 编码。所有最终文件再次实测 LUFS 与 dBTP；具体 measured 值、补偿值、ffprobe、SHA-256 见 `evidence/media-audio-{1..4}.json`，原始 FFmpeg 日志在 `artifacts/v4-media/`。

第五项 `generated` 为原有《素纸微光》，作者纸上有数，Web Audio 生成乐句，无本地或第三方音频文件。音频引擎实现与现场响度体验由集成验收覆盖。

## 真人剪纸视频

五类均来自现有灵感库的真实公开视频，原片720公开档已取得并核验。仅使用未登录可播放的公开流，无 cookies 或访问控制绕过。B站公开投稿不等于开放再授权：以下未取得或宣称独立再使用许可，按用户已确认的素材策略记录原作者与原站来源。原始直链含有效期参数，准确链接保存在每条 `evidence/media-video-类别.json` 的 `directStreams` 与下载 `.info.json`，到期应从来源页重新获取。

|类别 / 文件 / 使用位置|原题 / 作者|稳定来源|准确原片摘录|成品时长 / 大小|
|---|---|---|---|---|
|雪花 · `public/videos/snowflake-local.mp4` / 对应分类与课时视频离线备用|超级漂亮的雪花剪纸教程，窗花剪纸教程简单易学，一看就会的对称剪纸，你学会了吗#雪花剪纸 #儿童剪纸 #剪纸 #对称剪纸 #窗花剪纸 · 妍琦剪纸|[原视频](https://www.bilibili.com/video/BV1QV4y1w7W8/)|00:00.00–01:36.50|96.52s / 6.264 MB|
|团花 · `public/videos/flower-local.mp4` / 对应分类与课时视频离线备用|剪纸20集教程 \|  05 莲花团花（下）\| 非遗传统手工艺 · 慧子手工_非遗文创|[原视频](https://www.bilibili.com/video/BV1q84y1q7CV/)|08:00.00–09:05.00|65.00s / 6.984 MB|
|喜字 · `public/videos/happiness-local.mp4` / 对应分类与课时视频离线备用|剪纸20集教程 \| 06 双喜剪纸 \| 非遗传统手工艺 · 慧子手工_非遗文创|[原视频](https://www.bilibili.com/video/BV1U24y1k7hX/)|04:15.00–05:25.00|70.00s / 6.957 MB|
|动物 · `public/videos/animal-local.mp4` / 对应分类与课时视频离线备用|剪纸20集教程 \| 07 蝴蝶剪纸 \| 非遗传统手工艺 · 慧子手工_非遗文创|[原视频](https://www.bilibili.com/video/BV1tV4y1P7ns/)|09:15.00–10:20.00|65.00s / 7.164 MB|
|花边 · `public/videos/border-local.mp4` / 对应分类与课时视频离线备用|二方连续剪纸教程“金鱼” · 云高剪纸|[原视频](https://www.bilibili.com/video/BV183411N7B3/)|00:00.00–01:52.15|112.16s / 7.786 MB|

成品统一 H.264 / yuv420p、1280×720、25fps、AAC 64kbps、faststart。雪花原片为720×1280竖屏，按比例缩放并补边，保留完整手部与纸面；其他原片1280×720，无放大冒充原生高清。未变速、未拼贴步骤、未删除原视频水印或字幕。雪花与花边保留完整短示范；长课保留连续的实际修剪/展开摘录，页面明确标为摘录，完整步骤仍链接原站。

## 核验与可复跑脚本

- `scripts/v4-media-download.py`：公开来源视频与元数据下载。
- `scripts/v4-media-audio.py` → `v4-media-refine-audio.py`：下载、两遍响度处理、最终编码与测量、原创封面。
- `scripts/v4-media-video.py`：按上述连续时间段剪辑与720p压缩。
- `scripts/v4-media-report.py`：完整解码、体积 / 时长 / 响度 / 分辨率断言与本清单。
- `evidence/media-contact-*.jpg`：原视频12帧走查，已目视确认实际折、画、剪、展；`media-quality-*.jpg` 为最终文件代表帧。
- `evidence/media-waveform-{1..4}.png`：最终音乐波形；`media-asset-checks.json` 为完整解码和哈希校验。

已验证：4首真实本地曲目、5类真实本地视频、编码可解码、体积与时长限制、最终响度与真峰值、素材来源与署名数据。集成已验证：站内选择、播放控件、三秒回落；Chrome/Edge实际解码五类视频与本地音乐，见 evidence/production-media.json 和最终E2E。待真人验证：系统音量50%的听感、长时间连续听感、完整教程可教性、实际打印与实剪；不把技术检查写成人工试用。
