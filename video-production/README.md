# 纸上有数 · 视频制作工程

此目录独立于网站根依赖。成片总长 **97.7 秒 / 2931 帧 / 1920×1080 / 30 fps**。

## 文件

- `script.json`：10 段口播原稿；`timeline.json`：逐句生成音频的准确帧时码。
- `src/`：Remotion 镜头、色板、字幕与相对帧号声音表。
- `public/captures/`：真实页面 2 倍截图；`public/clips/cut.mp4`：真实拖剪录像。
- `public/audio/`：逐句旁白、音乐、纸声；原始素材仅服务本片制作。
- `references/`：所用技能规则、Gallery 记录与准确示例代码副本。
- `../docs/v5-video/production.md`：制作依据、来源和限制。

## 复跑

在本目录运行，Node 24、Python 3.12、Chrome 可用；Python 需要 imageio-ffmpeg、numpy、scipy、Pillow、requests，edge-tts 依赖隔离于 `pydeps`。

1. `npm ci` 安装本目录锁定的 Remotion 4.0.529 依赖。
2. 需要更新口播时：`python prepare-audio.py`。它读取稿件、调用自然语音、生成 WAV 与时码/VTT。修改已有文本时应先移动对应 `*-raw.mp3` 缓存再生成；不要误用旧声音。
3. 网站在 5194 严格端口运行时：`node capture.mjs`、`node supplement.mjs`、`node recapture-inspiration.mjs`，随后 `python prepare-clips.py`。只使用独立浏览器状态。`supplement` 仅在录屏页移除鼠标焦点装饰，保留产品本身键盘样式。
4. `node render.mjs --poster` 输出封面；`node render.mjs --stills` 输出逐镜头关键帧；`node render.mjs` 输出带 BGM / 无 BGM 两个完整版本。
5. `python media-qa.py` 检查编码、时长、完整解码、响度、真峰值、faststart、双版本逐帧视频哈希、旁白相关对齐与字幕句数。结果写到 `../artifacts/v5-video/media-qa.json`。

本轮两个场景的质量修复采用 `node render-revisions.mjs` 局部渲染（cut 824–1052；inspiration 1888–2212），然后 `python patch-masters.py` 精确替换画面并复制原完整音频。无 BGM 版直接复用修订主片的视频流，不需要第二次画面编码。输出 `artifacts/v5-video/revised-bgm.mp4`、`revised-nobgm.mp4`。`media-qa.py` 优先检查这两个修订文件；做新一轮完整渲染时，应先移动旧修订文件，以免验收到过期媒体。不在运行网站端到端测试时替换 public 最终文件，以免开发服务器刷新测试页面。

`finalize-revisions.py` 是本轮一次性的双版画面统一与复验记录：保持已验证的完整音轨，只复制视频流，最后完整解码最终无 BGM 容器，并抽取真实编码帧。当前 `patch-masters.py` 已包含同视频流策略，后续复跑不必重复这个修正步骤。最终参数、响度、SHA256 和验证边界见制作记录；音频未削波，27 句字幕与文本对应。

先检查已有进程与输出，再启动昂贵的完整渲染。Studio 可使用 `npx remotion studio src/index.tsx --no-open --port=5197`；端口占用时选择其他未使用端口，不停止别的服务。

## 已知边界

工程渲染不等于真人试听。配音为自然声音合成，不冒充团队真人录音。页面动作均真实采集；参数前后状态在片中有编辑切换。网站演示存档不是用户研究数据。作品的几何连通不意味着实纸牢固。
