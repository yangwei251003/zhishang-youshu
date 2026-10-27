# 纸上有数：项目工作边界

唯一项目根为本文件所在目录。所有代码、依赖、记录、截图、测试和交付文件均写入本目录。不得读用或修改相邻 prd-digital-twin 项目的实现，不得在父目录建立共享配置或终止其他项目服务。

已批准方案：React / TypeScript / Vite / SVG，countertype/clipper2-ts 作为唯一几何内核；毫米数据统一预览与打印。2/4/8层固定折法，首刀后不能换折法。候选修改必须重算全序列的可进入性和完整课程目标；诊断不能宣称物理牢固或全球首创。

Node 24.15.0、npm 11.12.1 已核验。开发和本地交付端口 5187，strictPort；遇到占用报告，不结束占用进程。测试入口 npm test / npm run typecheck / npm run build / npm run test:e2e。

当前分工：主Agent负责 contracts/types、工程配置、集成、端到端测试与文档；geometry Agent负责 src/geometry 与几何单测；io Agent负责 src/io、src/lessons 与相应单测；ui Agent负责 src/App.tsx、src/styles.css、src/components。修改其他责任区前先沟通。共享接口变更由主Agent整合。

人工验证记录只写真实数据。实剪、访谈、真人试用的空白记录不能当成结果。公开部署和正式参赛提交未授权。

## V2已核实接续事实（2026-09-27）

0.2.0实现与验收索引在docs/v2-implementation/README.md；旧审查目录继续保留，不混当新成果。原5187服务身份未变更，不停止。V2开发验收使用5188，生产体验与“启动第二版.cmd”使用5189；PAPER_TEST_PORT/PAPER_PORT支持明确覆盖，仍strictPort且仅本机。不同端口的浏览器存档不共享；旧作品通过V1 JSON备份导入迁移。

V2保留schemaVersion=1，事件value用V2编码（src/io/learning.ts）；不能随意增加V1顶层字段。引导副本不写正式作品库。动态视觉与目标标记不能进入几何或正式刀线。后续验证更新本轮README与证据，不把旧版14项/本轮新增项混计；并行Playwright运行必须使用不同output目录。

## V3接续事实（2026-09-28）

当前版本0.3.0，当前开发/生产体验端口5190，启动器“启动第三版.cmd”；原有5187/5189服务不得停止。全量Playwright默认5192独立dev服务，platform.spec依赖/src/模块，不能用生产服务器运行该项。验收索引为docs/v3-implementation/README.md，审查方案仍在docs/v3-review-2026-09-27，不当作已修复证据。

偏好独立于作品schema：paperWorkshop.apprentice.v1保存七任务及断点，paperWorkshop.audio.v1保存声音选项；音乐刷新后需用户主动开启。原71单测与32双浏览器E2E保留；LEGACY_LESSONS固定原8课，新增课程另增覆盖。13课仍用2/4/8层固定折法，没有六折。四折喜纹不是标准囍字描字模板，花边为镜像重复单元。

用户允许优质第三方素材，要求站内署名及docs/content-sources.md登记，iframe优先。现有10段公开视频使用B站官方播放器；默认暂停、静音，点击才联网，离线有本地步骤。来源清单不冒充额外许可。修复5秒后提供降级与取消；当前刀简化只缩小候选范围，必须继续检查完整刀序、未来历史和全部目标。

本轮并行修改已收回主Agent整合；后续先查当前文件与验收记录再分工，不能沿用旧责任区假定。新项目事实仅记录本项目；真人试用、实体打印、实剪与学习效果仍待验证。

V3最终软件检查：103/103单测、80/80双浏览器E2E、类型检查与构建通过；生产首屏与核心流程两浏览器控制台零错误。第三方播放器内部可能产生原站日志，勿把核心检查范围扩展为所有外站零错误。开发监听排除artifacts/docs/playwright-report/test-results，避免测试轨迹HTML触发刷新；不要重新加入这些输出目录。Windows启动器采用ASCII提示与CRLF，实际CMD执行已验证。

## V4接续事实（2026-09-28）

当前第四版0.4.0，生产/开发默认5192，独立构建dist-v4，启动第四版.cmd；E2E独立dev默认5194。5187/5189/5190不得停止，旧dist继续服务第三版。V4验收索引docs/v4-implementation/README.md，旧审查文件不混为实施证据。

五主题使用src/theme/palettes.json的35个语义token，npm run check:contrast为205项强制构建护栏。打印和projectSvg保持独立固定色；不要把主题token注入导出纸样。theme.v1、audio.v2均独立偏好；audio.v2兼容v1，刷新不自动播放。顶栏统一设置入口，页面导航aria-current和弹层aria-pressed分开。

4首本地音乐和5类本地720p视频在public/audio与public/videos，来源与改编记录在docs/content-sources.md；第三方公开视频没有额外开放许可证，不可表述为项目原创。服务器提供媒体Range；在线iframe加载完毕后跨域内部错误不可可靠检测，保留显式本地播放入口。

原103单测/80双浏览器E2E保留（80已包含早期32），现134/134、106/106通过。两浏览器生产核心控制台零错误，桌面底部空白0/0/40px，手机头部112px，真实浏览器200%缩放通过。全部测试是工程验证，真人试听、使用、实体打印与实剪待验证。看图挑战延期，教师包与六折未做。本轮并行职责均已收回；下轮以当前文件和交付记录为准。

## 工坊介绍短片接续事实（2026-09-28）

本轮增量保留第四版0.4.0、生产5192/dist-v4和测试5194；交付索引docs/v5-video/README.md。顶部“学习手册”改为“工坊指南”，有认识工坊/动手指南/我们的团队，旧手册保留。五人只写职责、队长为负责人；姓名与经历尚未提供，不能编造。首访选择保存于paperWorkshop.welcome.v1，视频续看只在当前访问内记忆；不改作品schema。

介绍片public/videos/workshop-intro.mp4约98秒、1080p，配套VTT/JPEG，来源与制作记录在docs/v5-video。播放视频暂停站内音乐但不改音乐偏好、不自动恢复音乐。减少动态效果直接进入；正常收回使用真实侧栏目标矩形。scripts/serve.mjs必须保留VTT/JPEG的正确MIME及媒体Range。制作工程video-production独立依赖，不进入网站运行包；Vite继续忽略此目录，避免渲染触发测试页面刷新。

本轮134单测、120/120双浏览器E2E（原106+新14）、205对比度护栏、构建和正式页面双浏览器补充检查通过。媒体完整解码与技术音量检查不代表真人试听。并行制作与集成已收回主Agent，后续按当前文件和本轮记录重新分派。
