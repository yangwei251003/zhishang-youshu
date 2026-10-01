# 先例与选择依据

核验日期2026-09-26。阅读仓库说明、源码、包清单与许可证；未执行这些第三方完整应用。

|项目|已知机制|本项目的取舍|
|---|---|---|
|[PAPERCUTTING.art](https://github.com/jackbdu/PAPERCUTTING.art)|JS/p5/Vite，几何—操作—渲染分层，SVG和模板导出|未找到明确许可证，不复制代码；参考交互和分层|
|[Snowflake Maker 2000](https://github.com/snowflakeMaker2000/snowflakeMaker2000.github.io)|SVG遮罩与12扇区镜像，GPL-3.0|借鉴对称表达，不作为连通分析引擎|
|[WWDC20 Papercutting](https://github.com/fengyangyang98/Papercutting)|Swift/AppKit/SpriteKit/Vision，提示、挑战和图像相似评分，MIT|参考渐进任务；本项目用独立几何目标而非图像相似度判断|
|[QR_STENCILER](https://github.com/golanlevin/QR_STENCILER)|Processing/Java连通域、桥接、PDF，CC BY-NC-SA及附加声明|只研究方法，不移植代码；岛屿检测和加桥不是原创算法|
|[OrigamiSimulator](https://github.com/amandaghassaei/OrigamiSimulator)|Three.js/GPU/FOLD物理折纸，MIT|不同问题，首版不引入三维求解|
|[Super Snowflake Maker](https://shalanah.com/snowflake)|折剪、动画和打印产品|本次未发现可核验公开代码许可，仅作体验参照|

选择 [countertype/clipper2-ts](https://github.com/countertype/clipper2-ts)，包2.0.1-18，Boost Software License 1.0。它以JS Number保存安全整数，部分中间运算使用BigInt，并非完整int64。只用布尔、洞层级与必要轮廓运算，不用仍需谨慎评估的三角化功能。阅读[上游精度边界](https://www.angusj.com/clipper2/Docs/Robustness.htm)。

未采用 polygon-clipping（无offset）、Paper.js（首版无需完整曲线编辑场景图）或第二WASM内核。IRobot1同名仓库对应另一包clipper2-js，明确记录测试未全通过，不能混用。

本项目拟验证的贡献是将操作历史、结构解释、受限修改和迁移练习连接起来，并用打印实剪与小规模成人试用检验。不能声称首创剪纸、对称变换、连通检测或自动桥接。
