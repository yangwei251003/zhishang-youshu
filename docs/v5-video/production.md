# 纸上有数工坊介绍短片 · 制作记录

本轮制作方式为自主创作。成片用于首次进入网站时的介绍，以及「工坊指南」中的回看。制作以真实网站界面、自然中文讲解、可跟随的操作为核心，不写团队经历、奖项或未经验证的学习成效。

## 产品简报与执行取舍

受众是第一次接触工坊、希望亲手尝试剪纸的人。视频先唤起对一张纸的好奇，再展示从预测、下刀到展开、修改、保存与打印的过程。网站不是单纯图片生成器；镜头把“左侧在折叠态剪、右侧看对称展开”和“回到某一刀修改”作为核心关系。

| 用户需要 | 本片执行 |
|---|---|
| 好看、细致地介绍网站 | 1920×1080、30 fps、97.7 秒，10 个章节；主体使用本机真实网页采集 |
| 讲清怎么操作 | 一段实际鼠标拖拽录像；逐层展开的四个真实状态；预测、参数、比较、作品与导出界面 |
| 口播有人情味 | 短句、第二人称、动作前留白；“慢慢试错”“猜错也没关系”；不念功能清单，不夸大功效 |
| 音乐应景 | Kevin MacLeod《Ripples》筝类拨弦低音量铺底，少量纸张翻动和剪刀拟音 |
| 初次进入有选择 | 视频以邀请结束；网站的播放、引导、收纳与续看由网站实现，不在视频里虚构操作 |
| 可持续修改 | 独立 Remotion 工程、原始截图与录屏、逐句 WAV、JSON 时码、VTT；另存无 BGM 版 |

## 视觉与动效基准

色彩直接复用素纸主题：米白 `#FFFCF5`、暖纸 `#F5EFE3`、墨色 `#302821`、朱红 `#B72D24`、辅色 `#6B5748` 和纸边 `#C9B79C`。标题用项目已有 Noto Serif SC，字幕用系统微软雅黑。标题约 60–114 px；主字幕 56 px，32 px 音乐署名。保留纸张留白与克制细线，不引入赛博色、强闪光或手持抖动。

动效采用安静、可跟随的教育型节奏：约 1–1.4 秒入场，缓入缓出、没有大幅回弹。真实页面图像均来自 2 倍像素截图；需要读的关键信息另以大字解释，页面小字作为界面背景，不冒充适合小屏逐字阅读。拖剪段保留左右画布关系，场景间直接切换，主要动作是纸艺揭示、轻推近、展开状态递进、真实纵向浏览和参数前后切换。

项目已有明确色板、字体和纸张视觉，因此按技能允许的“已有严格品牌规范”分支，以实际页面和 Remotion 关键帧验证代替另画无关的 HTML 提案。`artifacts/v5-video/frames/` 为风格与构图检查帧。

应用了 `video-shotcraft` 的制作、审美与声音规则，以及 `remotion` 插件的 create/markup/render 技能。技能目录为稀疏检出，引用通过其 Git HEAD 读取，完整副本留在 `video-production/references/`。选用 Gallery `paper-title-card`，准确参考为 `demos/typography/paper-title-card/PaperTitleCard.tsx`；保留 1.28→1 的压印缩放、9 帧缓动、4 帧错峰，换成中文纸色标题。时长延长为开场叙述与停留，其余镜头为本项目定制。没有声称逐像素复制 Gallery 样片。

有意识的适配：不采用技能范例的强鼓点电子乐和发布会式高冲击结尾。剪纸工坊的品牌与观看场景更适合稀疏拨弦、人声优先和安静的邀请；不做强节拍卡点，不添加整屏泵动。翻纸/剪刀拟音集中记录于 `src/Film.tsx` 的 SFX 表，均相对章节起点定位并限制播放时长。

## 真实页面与数据

`capture.mjs`、`supplement.mjs` 和 `recapture-inspiration.mjs` 使用独立、无用户既有状态的 Chrome 上下文，访问本项目 `127.0.0.1:5194`。预设课程和本轮新建的“春日 · 第一剪”仅用于演示，没有客户、成员姓名、真实研究参与者或个人信息。没有读取相邻比赛作品。截图与录屏均在项目内部。

主体截图、坐标表和实录位于 `video-production/public/captures/`、`capture-layout.json`、`artifacts/v5-video/`。开场与结尾的花纹来自网站原有 `public/v2/paper-flower-hero.svg`，是品牌装饰，并非可打印实剪样本。第三方 B 站教学视频未被剪入宣传片；灵感库镜头展示的是网站自己的卡片与纸面示意，没有播放原站视频。

## 声音和授权

- 旁白：本片自写中文稿，Microsoft 在线自然声音 `zh-CN-XiaoxiaoNeural`（通过 edge-tts 7.2.8），语速 −4%、音调 −2 Hz。逐句生成后移除首尾静音，归一到 −18 LUFS 目标、−3 dBTP 上限，48 kHz 单声道 WAV。没有仿冒或克隆真实成员声音。
- 音乐：《Ripples》，Kevin MacLeod，作者来源页 <https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100691>；许可 <https://creativecommons.org/licenses/by/4.0/>。官方来源核实见同目录 `asset-sources.md` 和研究证据。本片使用项目既有本地母版前 97.7 秒，音量系数 0.115，片头与片尾淡化。作者器乐说明有 Koto/guzheng 名称差异，因此统一称“筝类拨弦”。
- 纸声：Mixkit `Paper slide`（1530）、`Page turn single`（1104）、`Scissors cutting paper`（2378），官方目录 <https://mixkit.co/free-sound-effects/paper/>，许可 <https://mixkit.co/license/#sfxFree>。下载地址采用 `https://assets.mixkit.co/active_storage/sfx/编号/编号-preview.mp3`。仅作低音量动作拟音，限定在对应动作窗口；原文件与处理时码保留。
- 片尾保留作者、曲名、来源域名、CC BY 4.0 和“节选与混音”署名，网站播放器下方另给来源与许可链接。无 BGM 版保留旁白和纸声，供以后替换配乐。

## 输出与可复跑

主片：`public/videos/workshop-intro.mp4`；封面：`public/videos/workshop-poster.jpg`；逐句字幕：`public/videos/workshop-intro.vtt`。无 BGM 版：`artifacts/v5-video/workshop-intro-nobgm.mp4`。两版来自相同 Remotion 时间线，输出 1920×1080 / 30 fps / H.264 High / 8 位 4:2:0 / AAC-LC（48 kHz，双声道，192 kbps 目标），并检查 faststart。编码设置为 `yuv420p`，实际文件保留来源的全范围色彩标记，ffprobe 显示 `yuvj420p`；这里按实际探测结果记录。

字幕烧录到画面，同时提供默认不开启的外部 VTT。网站用户打开外部字幕时可能看到两层相同文本，网站文字稿用于独立阅读；不把烧录字幕当作屏幕阅读器文本。

制作工程及逐步复跑说明见 `video-production/README.md`；正式脚本、逐句时码见 `script.json`；分镜见 `storyboard.md`。根应用不引入 Remotion 运行依赖，部署网站时只提供媒体文件。

## 验证口径

已实际执行：网站素材采集、自然声生成、10 镜头 Remotion 制作、双版本渲染和静帧目视检查。审片中发现并修复：修改对比图标签重叠、灵感库残留上一步提示、录屏中鼠标焦点边框。其中灵感页残留由独立审片 Agent 指出，最终修订由主 Agent 复核。局部重渲后保留原整条音频，精确按帧替换受影响场景，最终结果见 `artifacts/v5-video/media-qa.json` 与 [复核记录](final-review.md)。

最终修订母版为 `artifacts/v5-video/revised-bgm.mp4` 和 `revised-nobgm.mp4`。无 BGM 版复用同一主片视频流，保留原无 BGM 音轨；两版全部解码后的视频 SHA256 完全一致，复制前后无 BGM 音频包 SHA256 完全一致。两份最终文件均完整解码通过，`moov` 在 `mdat` 前，可边下载边播放。原始双次渲染的压缩图像不完全逐像素相同，因此没有沿用原双次渲染的“同画面”假设。

| 最终检查 | 带配乐 | 无 BGM |
|---|---:|---:|
| 帧数 / 时间线 | 2931 / 97.7 秒 | 2931 / 97.7 秒 |
| MP4 容器时长（含 AAC 尾部） | 97.749333 秒 | 97.749333 秒 |
| 文件大小 | 13,265,334 字节 | 13,265,334 字节 |
| 综合响度 | −18.51 LUFS | −18.56 LUFS |
| 真峰值 | −5.66 dBTP | −6.00 dBTP |
| 响度范围 | 3.10 LU | 3.10 LU |
| 完整解码 / faststart | 通过 / 通过 | 通过 / 通过 |

字幕共 27 句，VTT 与旁白文本逐句一致，末句结束 96.633333 秒。抽取 7 句原 WAV 与成片音轨做相关对齐，实测声音相对时间线晚 42.3–43.0 ms（1.27–1.29 帧），在本片 0.1 秒同步容差内。没有把编码填充误称为人工逐字听审。实际成片解码得到的修复帧位于 `artifacts/v5-video/frames/final-encoded-*.png`，可核对 869、984、1473、1933、2048、2544、2880 帧。

最终文件 SHA256：

- 带配乐：`06e40096f342ef6d4cf19823fbd308503c39171f9d79523b6e8933360aeb2be6`
- 无 BGM：`a77d31509df9a3868f2741892fa468c5ba3dd7734e32526d07d966b46be77583`

技术检查不等于真人听感或实体验证。自然声的主观亲切程度、不同手机外放的体验，以及纸样实剪仍需人实际体验；本片不宣称已完成这些试用。

Remotion 工具许可：当前按本地非商业制作/评估用途使用。官方 [LICENSE](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) 与 [价格/许可说明](https://www.remotion.dev/docs/license/pricing) 对团队和商业用途有适用条件，不能据当前制作推断五人团队未来持续商业制作永久免费。未来团队商业使用前应复核当时条款；网站播放已导出的 MP4 不加载 Remotion 运行时。本轮未付费或接受新的购买协议。
