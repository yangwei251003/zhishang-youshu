# 第四版交付记录 · 0.4.0

日期：2026-09-28。体验地址：[本机第四版](http://127.0.0.1:5192)。双击根目录 `启动第四版.cmd`，或在本目录执行 `npm start`。需已有 Node.js；已构建运行包无需安装开发依赖。

本记录是实际实施与验证结果；`docs/v4-review-2026-09-28` 保留原审查方案，不能把方案当成果。唯一工作根为本项目目录，没有公开部署或参赛提交。5187、5189、5190既有服务未停止。第四版构建独立放在 `dist-v4`，第三版5190仍读取旧 `dist`。不同端口的浏览器存档不共享，旧作品可导出JSON再导入。

## 先复现的三个问题

初始71份受检查文件与第三版最终源码哈希一致。重新在生产版检查：展开七任务后，1600×900三栏高度1693.72px，中栏底部余白690.17px、右栏476.19px；Grid实际按stretch拉齐左栏。进入灵感库后主区域已切换，导航仍写死高亮实验工坊。音乐旧增益0.056234，测得主音峰值约−34.12dBFS，落剪约−15.92dBFS，且没有本地曲目文件。数据在 [baseline.json](evidence/baseline.json)。

CSS先独立收敛：7处750px媒体查询合并，清理history/rail-help重复覆盖；对5档计算样式回归无差异。1100/750/390/360截图逐像素一致；1600截图有2966像素差异，尺寸与计算样式相同，未将其声称为逐像素一致。随后才做主题与布局变化。

## 已实施的变化

- **纸色与设置**：素纸、竹青、朱漆、玄墨、靛夜五套色板，默认素纸，可跟随系统。规格实际列出35个token（正文写34），全部使用同一份色板JSON。品牌填充与强调文字分离；主样式及媒体样式的硬编码颜色已清零。主题与声音合入顶栏一个设置入口。主题独立保存，520ms圆形涟漪以实际点击点为圆心；减少动态效果、API缺失时直接切换。
- **真实音乐与音效**：4首本地曲目及生成式兜底，默认音乐音量60%，音效独立滑块，选曲/上一首/下一首/单曲或列表循环、淡入淡出、失败跳过。切曲先停止旧曲，落剪时压低背景音乐。v1偏好迁移到v2；刷新不自动播放，隐藏页面暂停，须主动继续。首次用户手势前不创建音频上下文、不加载曲目。
- **布局**：保留三栏stretch，任务面板有高度上限、首次任务操作后收起且保留进度条；课程列表最大300px滚动；本课视频56px摘要行；画布与历史之间用纸纹弹性区域承接余量。手机头部112px，六项导航在单行可横向滚动、支持键盘到达；没有添加新的导航入口。
- **导航**：单一数据源，工坊/灵感库使用唯一aria-current；手册/作品/第一课/引导只在打开时aria-pressed，关闭恢复。弹窗Esc、焦点限制和关闭后焦点返回保留。
- **本地视频**：雪花、团花、喜字、动物、花边各1段真人操作片段。在线先尝试官方iframe，加载错误或3秒未加载回落本地；用户也能直接选择本站片段。播放器controls、preload=none、静音、不自动播放；缺失时显示静态步骤。删除重复allowFullScreen声明。
- **学习与分享**：「我的作品」顶部跨作品聚合完成课程、独立预测与迁移记录，按事件/尝试去重且保留旧记录限制说明；可下载学习记录。2/4/8层作品可导出1080×1350中文PNG分享卡，复用projectSvg，等待本地字体，不使用外链图；预测门槛继续保护分享入口。
- **工程**：0.4.0、5192、独立构建及第四版启动器。服务增加音视频Range/HEAD支持。几何引擎、Worker、原打印与SVG导出、V2事件编码文件哈希不变；schemaVersion仍为1。所有18个旧测试文件保留，仅两处旧测试适配版本号及设置入口，断言未删。

## 验证结果与证据

|检查|结果|证据|
|---|---|---|
|单元测试|134/134，含原103条|[日志](evidence/unit-final.log)|
|类型检查、生产构建|通过|[类型](evidence/typecheck-final.log)、[构建](evidence/build-final.log)|
|颜色护栏|205/205（105基础+100交互），构建和生产验收均强制执行|[数据](evidence/contrast.json)|
|实际页面文字颜色|5主题×6场景，4920文字节点，0不达标计算颜色对|[数据](evidence/live-contrast.json)|
|完整Chrome/Edge E2E|106/106（每浏览器53；原80包含早期32，不重复相加）|[最终日志](evidence/e2e-final.log)、[JSON](evidence/e2e-results.json)|
|最终生产构建|两浏览器控制台错误0、脚本错误0、外部请求0|[数据](evidence/production-checks.json)|
|布局脚本|1920/1600/1440/1280/1100/390/360，任务展开与收起均无页面横向溢出|[数据](evidence/layout-checks.json)|
|200%原生缩放|1440物理视口→720 CSS px、DPR2；预测可点击、Esc可退出、无页面溢出|[数据](evidence/native-zoom-200.json)|
|涟漪与降级|实测点击圆心、520ms；有API但减少动态效果、无API但正常动态效果分别通过|[数据](evidence/final-interactions.json)|
|本地媒体|9文件完整解码通过；两浏览器5类视频实际出帧、本地音乐播放|[文件](evidence/media-asset-checks.json)、[浏览器](evidence/production-media.json)|
|音视频Range|206范围、尾部范围、416非法范围通过|[数据](evidence/server-range.json)|
|17组打印样例|重新生成项目/SVG/HTML，合法序列与完整目标检查通过；实物NOT_TESTED|[日志](evidence/samples-final.log)|
|本地运行包|217份构建文件逐一哈希一致；独立5196临时服务、CSP、音视频Range通过，测试后仅关闭该临时进程|[数据](evidence/package-checks.json)|
|旧版保护|核心6文件与旧测试完整性核对；5190响应与旧dist哈希一致|[完整性](evidence/integrity.json)、[最终清单](evidence/final-manifest.json)|

自动化还覆盖：全部预测旁路、1100/1280七任务完成、跳过后刷新、存储失败、5秒修复超时、打印弹窗被拦截、实际旧V1作品恢复、v1声音迁移、音量/主题刷新保持、首次无手势静默、四曲真实解码与生成式音量、导航与Esc、2/4/8层分享PNG和学习记录去重。

五主题均验证打印白底、毫米标尺与SVG输出一致。规格末尾写“三套深色”，实际提供两套暗色（玄墨、靛夜）与三套浅色；本轮检查全部五套，没有虚构第六套。

**断网边界**：阻断外网、保留本机服务器时，核心及全部本地音视频通过。另在页面/字体/Worker已载入后，将浏览器上下文完全离线（含localhost），剪切、计算、撤销重做、自动保存、JSON下载、打印均成功；打印新窗口请求favicon.svg出现1条预期网络断开日志，保留在final-interactions.json，不将它混称为零网络错误。完全离线后重新从服务器冷加载页面不在此测试结论内；本产品不是已安装的离线PWA。

实际DOM对比度审计计算文字和祖先背景颜色，不能替代渐变、图片、SVG及所有叠加透明度的逐像素认证。已查看最终暗色工坊、设置、移动页、导航、媒体画面和分享卡截图；真人视觉与长期使用感受仍待验证。

## 前后截图

|内容|之前|之后|
|---|---|---|
|1600首页底部|[大块余白](evidence/before-expanded-bottom-1600.png)|[纸纹过渡与齐平底部](evidence/after-bottom-1600.png)|
|灵感库导航|[工坊误高亮](evidence/before-nav-inspiration.png)|[灵感库正确高亮](evidence/after-nav-inspiration.png)|
|作品弹窗导航|[没有临时状态](evidence/before-nav-works.png)|[临时选中且页面位置保留](evidence/after-nav-works.png)|
|手机|[旧头部](evidence/before-mobile.png)|[390px靛夜](evidence/after-indigo-390.png)|

桌面四档、任务展开/收起、五套纸色和设置截图均在evidence。代表：[素纸](evidence/after-theme-plain.png)、[竹青](evidence/after-theme-bamboo.png)、[朱漆](evidence/after-theme-lacquer.png)、[玄墨](evidence/after-theme-ink.png)、[靛夜](evidence/after-theme-indigo.png)、[声音设置](evidence/after-music-ink.png)、[本地教学](evidence/after-local-video-3.png)、[分享卡](evidence/after-share-4-layers.png)。

1600任务展开后三栏高1206.95px（原1693.72px），四档桌面左/中/右底部余白均0/0/40px，均低于160px。手机头部112px（审查232px），低于120px。

## 素材与许可记录

完整登记：[content-sources.md](../content-sources.md)；本次转码、截取时间、质量与署名：[media-sources.md](media-sources.md)。4首Kevin MacLeod曲目来自作者官网、CC BY 4.0，站内可见标题/作者/来源/许可与改编说明。5类视频来自妍琦剪纸、慧子手工、云高剪纸公开B站教程；公开可播放不等于获得开放许可证，未声称额外授权，按用户已明确的素材策略收录并署名。

音乐为160kbps/44.1kHz立体声，每首94–175秒，共11.95MB；双遍loudnorm加淡入淡出，成品实测−16.00至−16.12LUFS，真峰值−2.20至−2.49dBTP（为MP3编码保留余量）。视频H.264/yuv420p/1280×720/25fps/AAC，单段6.26–7.79MB，共35.16MB，支持本机离线播放；竖屏雪花源为720×1280，保比例置于720p画布，不宣称横向原生高清细节。

## 未做或待验证

- **待验证**：真人试听（含系统50%音量）、长时间听感、真机触屏体验、真人学习效果、实体打印尺寸、纸张强度与实剪。未生成或编造真人反馈、实剪照片。
- 在线B站在当前网络条件下不能保证正常播放；iframe的跨域内部播放器报错不一定触发宿主onError。已提供三秒未加载回落、离线回落、手动本地片段入口；未宣称能检测所有原站内部错误。
- 看图还原挑战按可延期项未纳入；教师打印包、六折未做。
- 首轮分享卡专项有一次失败，原因与开发刷新相关但未充分证明；初轮颜色审计发现并修复hover颜色覆盖。中途日志保留，最终全量结果另列，不用一次失败或部分重跑冒称全量成功。
- 启动器文件编码/内容已检查；当前体验服务由同一服务脚本启动。未为测试双击启动器而中断正在运行的5192。

复跑顺序：`npm test` → `npm run typecheck` → `npm run build` → `npm run check:contrast`；另开dev服务5194执行 `npm run test:e2e`（platform.spec需源码模块），保留生产5192执行 `npm run verify:production`、`node scripts/check-layout.mjs`、`node scripts/v4-zoom-check.mjs`。运行包由 `npm run package:local` 生成，包含dist-v4、本地媒体、启动入口、来源与验证记录。测试/浏览器输出使用项目内独立目录，避免热更新影响结果。

## 2026-10-01 维护记录（定向复跑与版本基线）

### 一、两项残留失败产物的定向复跑

`test-results/` 中曾残留 2 份失败产物，来源与本次复跑结果如下：

| 用例 | 残留产物的失败信息 | 2026-10-01 定向复跑 |
|---|---|---|
| `tests/e2e/tour.spec.ts:38` 真实六步漫游完成、刷新持久与原作品及记录隔离 | `Test timeout of 45000ms exceeded` | Chrome 13.3s 通过；Edge 13.6s 通过 |
| `tests/e2e/v2.spec.ts:58` V2 六课两新题预测前关闭展开、历史、打印及SVG全部正常旁路 | `browserContext.close: ENOENT ... .playwright-artifacts-1\traces\*-recording2.trace` | Chrome 38.2s 通过；Edge 40.7s 通过 |

复跑命令：`node node_modules/@playwright/test/cli.js test -g "真实六步漫游|V2 六课两新题" --reporter=list`。环境：Windows、Node.js 24.15.0，真实 Chrome 与 Edge，1 worker（沿用 `fullyParallel: false, workers: 1`）。

**判断与边界：**
- 两项本次均**不可复现**，未发现产品缺陷证据。tour 的失败是测试超时（同用例本次 13.3s，为超时上限的约 29%）；v2 的失败发生在 `browserContext.close` 落盘阶段，属 trace 文件写入异常，不是断言失败。
- 残留产物已由本次运行清除，`test-results/` 现仅剩 `.last-run.json`。
- 该现象更像测试基础设施与运行环境问题（同目录被并发或中断的 Playwright 运行复用）而非代码缺陷；**未做充分证明**，按本项目约定不将其列为"已修复"。
- **本次是定向复跑，不是全量回归**，不得用它冒称全量成功。全量口径仍以 `artifacts/e2e-results.json`（expected 120、unexpected 0、flaky 0、skipped 0）与本仓 WORKLOG 记录为准。为避免覆盖这两份已有证据，本次复跑显式使用 `--reporter=list`，未重新生成报告与结果 JSON。
- 复跑只读取与执行测试，未改动 `src/`、`tests/` 或 `playwright.config.ts`。

**待改进（尚未实施）：** `playwright.config.ts` 的 `reporter` 将 HTML 报告与 `artifacts/e2e-results.json` 固定为单一输出路径，`test-results/` 亦为共享目录；两个 Playwright 进程同时运行时会互相覆盖。建议定向复跑统一显式指定 `--output`（现有 `artifacts/e2e-*` 的做法），或每次运行单独目录，避免再次出现无法归因的残缺产物。

### 二、版本控制基线

项目此前从未提交（`git log` 报 `your current branch 'master' does not have any commits yet`，全部文件为未跟踪），已建立首次提交作为可回滚节点：

- 提交内容：`src/`、`tests/`、`scripts/`、`docs/`（文本）、`video-production/`（脚本与配置）、配置文件与启动脚本，共 219 个文件，约 1.48MB；未改动任何业务代码。
- 扩充 `.gitignore`（原文件未覆盖 `dist-v4/`）：新增 `dist-v4/`、`artifacts/`、`docs/**/evidence/`、`*.zip`、`*.mp4`、`*.webm`、`*.exe`，以及 `video-production` 的依赖与产物、`public/videos/`、`public/audio/`。理由：这些目录合计约 1.6GB（`artifacts/` 1.2GB、`video-production/` 154MB、`docs/v4-implementation/` 57MB、`dist-v4/` 66MB），入库后会使仓库膨胀且难以回退；这些文件均保留在本地，未被删除。
- 影响：仓库副本不含站点媒体与验收产物，克隆后需自行准备 `public/videos/`、`public/audio/` 才能完整运行工坊。若需要连媒体一起入库，需相应调整 `.gitignore`。
