# 纸上有数 · 第三版 0.3.0

实施日期：2026-09-28。唯一项目目录内完成，未公开部署、未提交比赛，未停止或改动 5187/5189 服务。审查方案仍保留在 `docs/v3-review-2026-09-27/`；本文记录实际实现与证据。

## 体验与复跑

- 双击根目录 `启动第三版.cmd`，访问 http://127.0.0.1:5190 。需要本机已有 Node.js；已构建的核心工坊无需安装依赖或连接外网。
- 首次选择「纸上第一课 · 完整七任务」，跟随认识工坊、预测、落剪、展开、诊断、修复、打印；顶栏随时续导。「使用引导」保留六步快速路径。
- 「剪纸灵感库」包含五类、10 段真人教程；点开才联网。每段署名、原站链接和静态步骤均可见。
- 音效可关闭；原创轻音乐默认不播放，每次进入需主动开启。旧作品在旧端口导出 JSON 后导入此版本，浏览器不同端口不共享存档。
- 开发默认5190；`npm run test:e2e` 默认使用5192的独立 dev 服务，可用 `PAPER_TEST_PORT` 覆盖。`platform.spec.ts` 会导入 `/src/`，不能以生产服务器替代 dev。`npm run verify:production` 默认核对5190生产构建。

## 修改前复现与源码核对

根 AGENTS、01/02/04/05 审查文档和 evidence 均已读取，检查了预测遮挡、参数窗口遮挡及手机截图。当前关键源码与 V2 实施哈希一致，没有把审查方案当成已完成修复。对当前源码重新构建后复现：

|缺陷|修改前实测|第三版处理|
|---|---|---|
|P0-11 字体 CSP|首屏6条 `data:` 字体阻断错误|`font-src 'self' data:`；生产验收新增 console error=0 及版本0.3.0断言|
|P1-11 引导遮挡|1100×800，卡片与预测区交叠34,574.53 px²|右、下、上、左避让；不足时底部停靠；弹窗独立滚动；短视口保留可操作区域|

原始数据：[baseline-reproduction.json](evidence/baseline-reproduction.json)、[baseline-hashes.json](evidence/baseline-hashes.json)。

|对照|修改前|修改后|
|---|---|---|
|1100预测卡|[前](evidence/before-prediction-1100.png)|[后](evidence/after-guide-prediction-1100.png)|
|参数／修复弹窗|[审查旧图副本](evidence/before-parameters-review.png)|[修复对照](evidence/after-guide-repair-1280.png)|
|七任务毕业|无|[毕业状态](evidence/after-graduated-1100.png)|
|实际200%浏览器缩放|未测|[原生缩放](evidence/native-zoom-200-prediction.png)|

## 已实施功能

1. **纸上第一课**：独立 `ApprenticeTasks`、四张导览卡、九幕三段式讲解；七项只由真实行为完成。`paperWorkshop.apprentice.v1` 保存断点、跳过、毕业及 V2 编码的引导事件。练习副本不写入正式作品库，正式学习不被算成已独立完成。
2. **经典纹样**：新增三课、两迁移题，总计13课。目标、留剪标记、预测门槛、全序列修复、毫米打印使用原管线；samples 输出17组初态／修复样例。具体见 [课程记录](lessons.md)。
3. **纸上成真与灵感库**：五类10视频，独立组件、点击加载 iframe、静音暂停、来源标注；离线和失败可退回本地步骤及图示。[来源与使用方式](../content-sources.md) 包含全部视频和原创音频。
4. **声音与镜像生长**：落剪、展开、成功、拒绝、修复音效采用 Web Audio；首个真实手势之前不创建 AudioContext，异常静默；`paperWorkshop.audio.v1` 单独保存设置。原创《素纸微光》五声音阶环境曲总线约−25dB。展开新增镜像组420ms过渡；减少动态与后台页面禁用。
5. **健壮性**：修复计算独立线程，5秒后提供继续等待／当前刀简化比较／取消；简化只减少候选刀，不削弱完整刀序、未来历史和全目标核查。打印被拦截可下载完整HTML。IndexedDB与偏好存储故障常显警示，切换作品使用会话缓存；新建及每10刀提醒备份。
6. **交付**：0.3.0、5190严格端口、新启动器、生产资源 MIME 与嵌入来源白名单同步；不新增账号、社区、云同步或大模型调用。

保留 clipper2-ts、0.01mm网格、2/4/8固定折法、首刀锁定、schemaVersion=1和V2事件编码。既有71单测与32双浏览器E2E保留；旧课程集成测试仅把导入固定到原8课 `LEGACY_LESSONS`，原断言一条未删，新13课另增覆盖。[原测试文件指纹](evidence/legacy-test-preservation.json)及[仅导入别名变化的逐字校验](evidence/legacy-lessons-import-check.json)可复核。

## 验收证据

最终汇总：[verification-summary.json](evidence/verification-summary.json)。所有结果均对应0.3.0当前源码与生产构建。

|命令／检查|最终结果|原始证据|
|---|---|---|
|npm test|103/103通过，0失败|[单测JSON](evidence/unit-results.json)|
|npm run typecheck|通过，退出码0|[类型检查日志](evidence/typecheck.log)|
|npm run build|通过，退出码0|[构建日志](evidence/build.log)|
|npm run test:e2e|Chrome40＋Edge40，共80/80；0跳过、0失败、0不稳定重试；12.1分钟|[完整报告](evidence/e2e-results.json)、[日志](evidence/e2e-final.log)|
|npm run verify:production|两浏览器通过；核心流程外部请求0、失败请求0、脚本错误0、控制台错误0|[生产检查](evidence/production-checks.json)|
|五视口|工坊与灵感库均无整页横溢出、首屏iframe为0|[布局记录](evidence/visual-layout.json)|
|实际200%缩放|预测提交、Esc退出和手册操作通过|[原生缩放](evidence/native-zoom-200.json)|

- 1100／1280完整九幕、真实七任务、参数与修复弹窗、打印文件、毕业；1440／390／360预测文字与点击。五视口无整页横溢出，截图见 `evidence/workshop-*.png` 与 `inspiration-*-top.png`。
- 键盘 Tab／Shift+Tab／Esc；跳过后刷新；断点续导；13课预测旁路与导出门槛；历史真实V1文件导入、刷新、导出后毫米坐标和历史不变。
- 拦截外网请求重跑预测、修复与打印文件，核心零外部请求、零失败请求；没有拔除物理网线。第三方视频本身需要网络，未声称可离线播放。
- 注入存储拒绝、打印弹窗拒绝、修复线程延迟、音频构造失败；无手势静默。保留全部中途失败报告，最终不以删断言换通过。
- 真正 Chrome 200% 页面缩放：在项目内隔离浏览器配置中操作外观设置，1440×900变为720×450 CSS视口，dpr=2；预测和Esc通过。[原生缩放数据](evidence/native-zoom-200.json)。另测等效视口的参数弹窗与减少动态。
- 10/10原站播放器实际解码并推进时间，默认 paused=true、muted=true；站内惰性加载、分类和离线组件另有双浏览器回归。[视频证据](evidence/media-playback.json)。完整视频人工观看未执行。

### D1–D10 对照

|项|实现与验收路径|边界|
|---|---|---|
|D1 修复等待|独立Worker；5秒故障注入出现等待/简化/取消，点击简化后仍可撤销|简化仍检查全部目标与完整刀序|
|D2 打印|正常弹窗及被拦截后的HTML下载两条路径|实体打印待验证|
|D3 存储|同时拒绝IndexedDB和localStorage，切课、备份、作品列表和会话恢复|刷新会丢失无法持久化的会话缓存，常显警示|
|D4 音频|无手势零AudioContext、构造失败静默、键盘开关与偏好恢复|硬件听感待验证|
|D5 CSP|生产两浏览器检查字体、Worker、版本及控制台|以最终production-checks.json为准|
|D6 启动|实际执行“启动第三版.cmd”后HTTP200；[启动记录](evidence/launcher-check.json)|需要本机已有Node；没有新机器验收|
|D7 断网|阻断外网后预测→修复→导出；未点击视频时零外部请求|外站视频联网，按9月28日嵌入优先决定覆盖旧“视频全本地”条款|
|D8 中屏|预测区在画布前，1100/1280引导避让及200%缩放|真人手机触控待验证|
|D9 保存|保留撤销/重做、保存票据、id/revision守卫；旧作品恢复|音视频与独立偏好不回写几何|
|D10 性能|100刀分析/修复及浏览器展开计时留档|无同机V2基线，不声称无劣化|

### 验收过程中修正的问题

快速键盘跳过曾受几何busy状态干扰，已将“任务是否完成”和“计算是否繁忙”分开，原跳过断言保留。生成目录的HTML轨迹曾触发开发服务刷新；按 [Vite文件监听配置](https://vite.dev/config/server-options#server-watch) 排除artifacts/docs/playwright-report/test-results，并重启本轮dev服务。两条超时trace实际显示本地资源加载缓慢，未见外网规则误拦截，也没有证据把这两次超时直接归因于中途刷新；原断言、原时限复跑4/4通过，见 [局部复查](evidence/e2e-watch-recheck.json)。随后重新执行全量，保留中途日志和失败trace，不把部分通过与最后完整结果相加。

Windows启动器实际执行曾出现中文echo解析残片；改为ASCII启动提示并保存CRLF后复跑正常，服务内中文提示仍正常显示。此修正只涉及本轮5190启动器。

## 性能与范围取舍

[100刀实测](evidence/performance-100.json)：单次本机自由100刀分析约1.65秒；分离100刀分析约0.79秒，完整修复约14.43秒，2个全目标通过候选。SVG路径生成约5ms，不等同浏览器绘制。[浏览器展开测量](evidence/render-100.json)中，真实100刀JSON导入到最终SVG及两帧为1024.28ms；包含校验、Worker与界面更新，SVG为25,282字符。没有重建历史同机基线，不能宣称性能改善。

六折及P2未纳入，未合入半成品算法。四折双喜是**上下对称喜纹结构练习，不是标准囍字描字模板**；花边是镜像重复单元，真实长条二方连续需手风琴折法。界面与课程均说明范围。

## 待验证

**真人试用、真人首用是否无需指导、真实手机触控、实体打印100mm标尺、实剪与牢固性、教学效果均待验证。** 当前截图、测试和播放抽查由自动化代理完成。没有访谈数据或实剪照片，不将软件测试通过称为实物验证。

视频完整内容人工质检、地区网络差异、原站广告及账号要求待验证。视频使用官方公开播放器引用，不宣称已取得额外开放许可证。轻音乐硬件扬声器听感未进行真人试听。干净无Node机器的开箱运行未验证；本地包明确要求已有Node。

生产“零控制台错误”指首屏及本站核心流程。真实嵌入播放器抽查出现1条来自B站指纹组件的console error（report is not found），本站pageerror仍为0；不隐藏或归为本站字体错误。该次初始暂停、静音正确，媒体解码通过，但自动化误选隐藏中央播放图标导致控件点击超时，保留 [站内原始抽查](evidence/media-site-playback.json) 和 [截图](evidence/media-site-playback.png)，不把媒体API播放当成控件验证。

随后依据实际截图和DOM改用可见底栏控件，在新会话中完成V05「双喜剪纸」站内真实播放／暂停：初始0秒、暂停、静音，UI点击播放推进2.02秒、解码55帧，再点底栏成功暂停；全程未调用媒体播放API。[真实控件记录](evidence/media-site-controls.json)、[截图](evidence/media-site-controls.png)。这项只抽查1条，仍不等于10段全片真人观看。
