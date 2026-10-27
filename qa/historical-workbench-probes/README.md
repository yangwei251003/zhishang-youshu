# 早期工作台与主题检查程序

保全2026-09-27同项目的5个独有QA脚本，不作为新产品。两份布局/导航脚本仅把私人Playwright与Chrome路径改成便携参数；三份色板脚本保留原草案算法和颜色。

在项目根安装锁定依赖后，先启动本项目，再运行：

```sh
node qa/historical-workbench-probes/layout-probe.mjs
node qa/historical-workbench-probes/nav-mobile-probe.mjs
node qa/historical-workbench-probes/theme-contrast-v2.mjs
```

需要Node22+、`npm ci`与本机Chrome；默认URL为`http://127.0.0.1:5192/`。可设置`TARGET_URL`和可选`PLAYWRIGHT_EXECUTABLE_PATH`。`PLAYWRIGHT_MODULE`仅供已有运行环境选择兼容模块；普通使用无需设置。使用隔离、无账号的无头Chrome，不连接用户浏览器会话。

这是历史诊断代码，草案中失败配色原样保留。分隔线的旧1.5阈值不代表WCAG非文本3:1合格；是否适用取决于元素功能，见[W3C说明](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。旧标签有歧义，不能据此宣布整站符合无障碍标准。当前正式检查仍使用根脚本`npm run check:contrast`与既有应用测试。三份历史色板与两份DOM测量摘要见VALIDATION.json。

布局脚本仅报告匹配选择器的尺寸/滚动，缺少元素可能得到null；不负责页面错误、所有主题或所有功能验收。原匿名线上networkidle等待曾超时，按[Playwright官方就绪建议](https://playwright.dev/docs/api/class-page#page-goto-option-wait-until)改为明确等待页头与字体，并用既有已验证构建产物的本地服务完成DOM检查；没有更改原目录或真实用户状态，不把本机DOM诊断说成匿名线上验收。
