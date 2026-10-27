# V5 产品介绍片：素材来源与使用边界

核实日期：2026-09-28。本清单记录研究阶段的许可与素材选择；实际成片文件、节选区间、配音来源、编码和混音测量应以制作 Agent 的最终交付清单为准。

**制作阶段已采用：**《Ripples》、本项目真实界面与操作录屏、原创口播自然声音合成，以及 Mixkit 三条纸张/剪刀音效；《Senbazuru》和参考创作者影片没有进入成片。最终来源、准确范围与输出见 [production.md](production.md)，本页以下保留研究阶段的选择依据。

## 计划采用的音乐

**首选：《Ripples》 / Kevin MacLeod。**

- 作者曲目页：[Incompetech / ISRC USUAN1100691](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100691)。
- 作者公开原始 MP3：[Ripples.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Ripples.mp3)。
- 本项目已有本地版本：`public/audio/zs-track-1.mp3`；来源、下载和处理记录见 `docs/v4-implementation/media-sources.md`。本轮复用，未重复下载同一文件。
- 2026-09-28 用 Firecrawl JavaScript 渲染重新确认页面标注 **Creative Commons Attribution 4.0**；许可：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。插件证据 `scrapeId=01a0e674-e8ff-757b-932e-69cfb4a739c8`，页面状态 200。
- 原作长度 3:25，57 bpm；乐器栏为 Koto，描述正文称 Chinese guzheng，所以本站采用不误导的“筝类拨弦”称呼。
- V4 本地版本已节选并作淡入淡出、响度和 MP3 编码处理。新片会进一步连续节选、配合口播降低音量和淡入淡出；实际范围由成片记录补充。

建议成片片尾与视频旁保留署名：

> 音乐《Ripples》— Kevin MacLeod（incompetech.com）
> CC BY 4.0。本片作节选、淡入淡出与混音处理。

站内用可点击原作和许可链接；视频单独传播时，说明栏也保留这些信息。署名不表示音乐作者为纸上有数背书。

## 备选音乐

**《Senbazuru》 / Kevin MacLeod。**

- [作者曲目页 / ISRC USUAN1100821](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100821)。
- [作者公开原始 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Senbazuru.mp3)。
- 已有文件 `public/audio/zs-track-2.mp3`，沿用 V4 下载与改编记录。
- 2026-09-28 核实 CC BY 4.0；插件证据 `scrapeId=01a0e674-fbb3-74ac-9a97-16485e95d23b`，页面状态 200。
- 原作 1:34，48 bpm；作者列出的乐器为 Koto、Synth、Cello、Flute。
- 本轮仅作为音乐方向备选，不把“已研究”写成“成片已使用”。

## 画面、字幕与音效

|内容|来源与处理|当前使用建议|
|---|---|---|
|真实网站页面、鼠标操作和几何展开图|本项目当前版本的本地页面；截图和录屏只包含这个项目。|构成主片主体；清理测试存档与浏览器杂项，只拍实际可完成步骤。|
|片头几何纸样、标题和转场|围绕本项目纸样、品牌色和自制矢量元素制作。|可组合进视频；片头艺术动效不伪装为物理实剪验证。|
|中文口播与字幕|本轮原创文案，见 `research.md`；最终合成语音由制作记录注明来源。|不模仿名人、成员或其他已知个人，不声称是真人配音。|
|纸张或点击拟音|研究阶段未下载新的第三方音效。|并非必需；若制作时生成简洁点击声，应登记为合成音效，不标成现场纸张录音。|
|Presscut、VVTerm、Screen Studio、Glide 参考片|官方网页中的创作者或产品演示。未取得对外再使用许可。|仅作为研究参考并链接来源，没有下载、截取或植入宣传片。|
|项目已有 B 站教学视频|V4 素材清单已明确这些公开投稿没有额外开放再使用许可。|不再剪入这次品牌片；本片用自己的真实产品页面即可。|

没有引入与任务无关的素材库，没有通过登录、支付、访问控制绕过或用户 cookies 下载内容。

## 证据位置

- `artifacts/v5-research/source-checks.json`：成功的 Firecrawl 页面状态、抓取编号、作者音乐事实及研究范围。
- `docs/v4-implementation/media-sources.md`：现有本地音乐的原始来源和处理链。
- `docs/v5-video/research.md`：参考片例、分镜、口播和模块文案。

本轮来源核实可支持上述素材选择；它不能替代最终成片播放、混音与字幕检查。真人完整试听和新手理解程度仍需要实际体验反馈。
