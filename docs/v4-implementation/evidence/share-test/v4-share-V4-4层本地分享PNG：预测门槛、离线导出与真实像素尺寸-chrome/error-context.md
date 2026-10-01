# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v4-share.spec.ts >> V4 4层本地分享PNG：预测门槛、离线导出与真实像素尺寸
- Location: tests\e2e\v4-share.spec.ts:17:4

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 45000ms exceeded.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "纸上有数首页" [ref=e5] [cursor=pointer]:
      - /url: "#workshop"
      - generic [ref=e13]:
        - text: 纸上有数
        - generic [ref=e14]: PAPER · PATTERN · POSSIBILITY
    - navigation "主导航" [ref=e15]:
      - button "实验工坊" [ref=e16] [cursor=pointer]
      - button "剪纸灵感库" [ref=e18] [cursor=pointer]
      - button "学习手册" [ref=e19] [cursor=pointer]
      - button "我的作品" [ref=e20] [cursor=pointer]
      - button "纸上第一课" [ref=e21] [cursor=pointer]
      - button "使用引导" [ref=e22] [cursor=pointer]
    - button "工坊设置" [ref=e23] [cursor=pointer]:
      - generic [ref=e27]: 设置
  - main [ref=e28]:
    - generic [ref=e29]:
      - generic [ref=e30]:
        - heading "一纸之间，万象可见。" [level=1] [ref=e31]
        - paragraph [ref=e32]: 折叠，对称，连通。让每一次剪切，都成为一次发现。
      - generic "想、折、剪、展、改、印，六阶段纸上实验" [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: 想
          - generic [ref=e39]: 折
          - generic [ref=e43]: 剪
          - generic [ref=e47]: 展
          - generic [ref=e51]: 改
          - generic [ref=e55]: 印
    - region "剪纸实验工作台" [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e63]: 四面有回声
          - generic [ref=e64]: 学习实验
        - generic [ref=e65]:
          - status [ref=e66]:
            - generic [ref=e70]: 已自动保存
          - button "新建" [ref=e71] [cursor=pointer]
          - button "保存" [ref=e76] [cursor=pointer]
          - button "导入" [ref=e82] [cursor=pointer]
          - button "导出" [ref=e87] [cursor=pointer]
          - button "打印纸样" [disabled] [ref=e92]
          - button "导入项目文件" [ref=e97]
      - paragraph [ref=e98]: 先留下预测，再查看完整结果；题目剪口暂时锁定，项目备份仍可用。
      - generic [ref=e99]:
        - complementary "实验与剪切工具" [ref=e100]:
          - region "纸上第一课" [ref=e101]:
            - button "纸上第一课 1 / 7 项真实体验" [ref=e102] [cursor=pointer]:
              - generic [ref=e106]:
                - text: 纸上第一课
                - generic [ref=e107]: 1 / 7 项真实体验
            - progressbar "第一课进度" [ref=e110]
          - generic [ref=e112]:
            - button "自由创作" [ref=e113] [cursor=pointer]
            - button "循序学习" [ref=e114] [cursor=pointer]
          - group [ref=e115]:
            - generic [ref=e116]: 实验章节
            - generic [ref=e120]:
              - generic [ref=e121]:
                - generic [ref=e124]: "01"
                - text: 折叠与对称
              - button "一剪，两相映" [ref=e125] [cursor=pointer]
              - button "四面有回声" [ref=e129] [cursor=pointer]
              - button "一只蝴蝶的两半" [ref=e133] [cursor=pointer]
              - button "连续的花边" [ref=e137] [cursor=pointer]
            - generic [ref=e141]:
              - generic [ref=e142]:
                - generic [ref=e145]: "02"
                - text: 裁去与保留
              - button "一纸，生万象" [ref=e146] [cursor=pointer]
              - button "孔，还是一座岛" [ref=e150] [cursor=pointer]
              - button "红纸上的双喜" [ref=e154] [cursor=pointer]
            - generic [ref=e158]:
              - generic [ref=e159]:
                - generic [ref=e162]: "03"
                - text: 连通与分离
              - button "留住这一线" [ref=e163] [cursor=pointer]
            - generic [ref=e167]:
              - generic [ref=e168]:
                - generic [ref=e171]: "04"
                - text: 尺寸与实物
              - button "从屏幕，到手心" [ref=e172] [cursor=pointer]
            - group [ref=e176]:
              - generic "试试新题 4" [ref=e177] [cursor=pointer]:
                - text: 试试新题
                - generic [ref=e178]: "4"
          - generic [ref=e181]:
            - generic [ref=e182]: 折叠方式
            - generic [ref=e188]:
              - button "2 层折叠" [disabled] [ref=e189]:
                - strong [ref=e191]: 2 层
              - button "4 层折叠" [disabled] [ref=e192]:
                - strong [ref=e194]: 4 层
              - button "8 层折叠" [disabled] [ref=e195]:
                - strong [ref=e197]: 8 层
            - paragraph [ref=e198]: 首刀后折法固定；新建可更换。
          - generic [ref=e199]:
            - generic [ref=e200]: 剪切工具
            - generic [ref=e208]:
              - button "三角剪口 已选" [pressed] [ref=e209] [cursor=pointer]:
                - generic [ref=e212]: 三角剪口
                - generic [ref=e213]: 已选
              - button "矩形剪口" [ref=e214] [cursor=pointer]
              - button "多边形" [ref=e218] [cursor=pointer]
            - paragraph [ref=e224]:
              - generic [ref=e227]: 在折叠纸边缘拖拽，松开完成一刀。须从当前纸边进入。
          - button "第一次来到工坊？" [ref=e228] [cursor=pointer]
        - generic [ref=e235]:
          - generic [ref=e236]:
            - generic [ref=e237]:
              - generic [ref=e238]: "01"
              - text: 道剪口
              - generic [ref=e239]: ·
              - text: 160 × 160 mm
            - generic [ref=e240]:
              - button "显示或隐藏折线" [ref=e241] [cursor=pointer]
              - button "撤销" [disabled] [ref=e245]
              - button "重做" [disabled] [ref=e249]
          - generic [ref=e253]:
            - generic [ref=e254]:
              - generic [ref=e255]:
                - generic [ref=e256]: A
                - generic [ref=e257]:
                  - heading "在折叠中，落下一剪" [level=2] [ref=e258]
                  - generic [ref=e259]: FOLD & CUT
              - generic [ref=e261]:
                - img "折叠态剪纸画布，使用鼠标拖动绘制剪口" [ref=e262]:
                  - generic: 每一刀 · 穿过 4 层纸
                - generic [ref=e266]:
                  - generic [ref=e267]: 拖拽绘制剪口
                  - generic [ref=e268]: 160 mm / 4 层
              - generic [ref=e271]:
                - text: 十字双折
                - strong [ref=e272]: 4 层叠合 · 每一层同时裁切
              - button "看纸是怎样展开的" [disabled] [ref=e273]
            - generic [ref=e280]:
              - generic [ref=e281]:
                - generic [ref=e282]: B
                - generic [ref=e283]:
                  - heading "在展开时，看见万象" [level=2] [ref=e284]
                  - generic [ref=e285]: UNFOLD & DISCOVER
                - generic [ref=e286]: 实时展开
              - generic [ref=e288]:
                - generic [ref=e289]:
                  - generic [ref=e290]: 想 · 一 · 想
                  - heading "先留下你的预测" [level=3] [ref=e291]
                  - paragraph [ref=e292]: 先完成本页的预测，再展开观察。
                  - button "去预测" [ref=e293] [cursor=pointer]
                - generic [ref=e296]:
                  - generic [ref=e297]: 160 mm
                  - generic [ref=e299]:
                    - button "缩小作品" [ref=e300] [cursor=pointer]
                    - generic [ref=e302]: 100%
                    - button "放大作品" [ref=e303] [cursor=pointer]
                    - button "恢复画布尺寸" [ref=e305] [cursor=pointer]
              - generic [ref=e311]:
                - generic [ref=e312]: 保留的纸
                - generic [ref=e314]: 裁去的部分
                - button "对比上一刀" [disabled] [ref=e316]
          - region "剪切历史" [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]:
                - heading "每一步，都有迹可循" [level=2] [ref=e326]
                - generic [ref=e327]: 点击回看 · 双击修改
              - generic [ref=e328]: 1 / 1
            - generic [ref=e329]:
              - button "一张白纸 起点" [disabled] [ref=e330]:
                - generic [ref=e334]: 一张白纸
                - generic [ref=e335]: 起点
              - button "回看第 1 刀 第1刀" [disabled] [ref=e336]:
                - generic [ref=e337]: "01"
                - generic [ref=e341]: 第1刀
                - generic [ref=e342]: 剪切完成
              - generic [ref=e343]: 下一刀，由你决定。
        - complementary "结构观察与学习反馈" [ref=e346]:
          - generic [ref=e347]:
            - generic [ref=e348]: 观察与发现
            - generic [ref=e349]: 观
          - generic [ref=e350]:
            - generic [ref=e351]: 先预测，再观察
            - heading "四层折叠中，在横折边中部剪一个三角口，展开后会出现几个独立孔洞？" [level=3] [ref=e352]
            - generic [ref=e353]:
              - generic [ref=e354] [cursor=pointer]:
                - radio "A 1 个" [ref=e355]
                - generic [ref=e356]: A
                - text: 1 个
              - generic [ref=e357] [cursor=pointer]:
                - radio "B 2 个" [checked] [ref=e358]
                - generic [ref=e359]: B
                - text: 2 个
              - generic [ref=e360] [cursor=pointer]:
                - radio "C 4 个" [ref=e361]
                - generic [ref=e362]: C
                - text: 4 个
            - button "记录预测，展开观察" [ref=e363] [cursor=pointer]
            - paragraph [ref=e366]: 答案不影响探索。预测会留在本机学习记录里。
          - generic [ref=e367]:
            - text: 记 / 01
            - paragraph [ref=e368]: 纸张连通，不等于纸张牢固。
            - generic [ref=e369]: 屏幕上的发现，值得在一张真纸上再试一次。
            - button "把实验带到纸上" [disabled] [ref=e370]
      - generic [ref=e377]:
        - generic [ref=e378]: 毫米坐标设计 · 本地几何计算
        - generic [ref=e380]: 红色是纸，空白也是作品的一部分。
        - button "快捷操作与说明" [ref=e381] [cursor=pointer]
    - generic [ref=e385]:
      - generic [ref=e386]: 纸上有数 / 让几何在指尖发生
      - generic [ref=e387]: 互动学习实验作品 · v0.4.0
  - dialog [ref=e389]:
    - banner [ref=e390]:
      - generic [ref=e391]:
        - generic [ref=e392]: KEEP YOUR DISCOVERY
        - heading "把这一纸，带走" [level=2] [ref=e393]
      - button "关闭对话框" [active] [ref=e394] [cursor=pointer]
    - generic [ref=e398]:
      - button "保存分享图（PNG） 1080 × 1350 · 含作品名称、图案和统计，纯本地生成" [disabled] [ref=e399]:
        - generic [ref=e405]:
          - strong [ref=e406]: 保存分享图（PNG）
          - generic [ref=e407]: 1080 × 1350 · 含作品名称、图案和统计，纯本地生成
      - button "项目文件 JSON · 包含每一刀、历史和学习记录，可再次导入编辑" [ref=e408] [cursor=pointer]:
        - generic [ref=e411]:
          - strong [ref=e412]: 项目文件
          - generic [ref=e413]: JSON · 包含每一刀、历史和学习记录，可再次导入编辑
      - button "矢量图案 SVG · 按毫米输出展开作品，用于展示或排版" [disabled] [ref=e416]:
        - generic [ref=e421]:
          - strong [ref=e422]: 矢量图案
          - generic [ref=e423]: SVG · 按毫米输出展开作品，用于展示或排版
      - button "A4 实剪模板 包含折叠步骤、刀线和 100 mm 标尺，也可另存 PDF" [disabled] [ref=e426]:
        - generic [ref=e431]:
          - strong [ref=e432]: A4 实剪模板
          - generic [ref=e433]: 包含折叠步骤、刀线和 100 mm 标尺，也可另存 PDF
      - button "导出打印文件 HTML · 弹窗被拦截时，下载后用浏览器打开打印" [disabled] [ref=e436]:
        - generic [ref=e441]:
          - strong [ref=e442]: 导出打印文件
          - generic [ref=e443]: HTML · 弹窗被拦截时，下载后用浏览器打开打印
      - button "匿名学习记录 导出预测、操作和学习完成情况，仅处理本机数据" [ref=e446] [cursor=pointer]:
        - generic [ref=e449]:
          - strong [ref=e450]: 匿名学习记录
          - generic [ref=e451]: 导出预测、操作和学习完成情况，仅处理本机数据
    - paragraph [ref=e454]: 先留下预测，再查看完整结果。项目备份仍可下载。
    - paragraph [ref=e455]: 打印时选「实际大小 / 100%」，先测量标尺再剪。几何结果不能代替实物检验。
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { readFile } from 'node:fs/promises';
  3  | 
  4  | test.beforeEach(async ({ page }) => {
  5  |   await page.addInitScript(() => localStorage.setItem('paperWorkshop.onboarding.v1', JSON.stringify({ status: 'skipped', tourVersion: 1 })));
  6  | });
  7  | async function ready(page: Page) {
  8  |   await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/);
  9  |   await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  10 | }
  11 | async function exportModal(page: Page) { await page.getByRole('button', { name: '导出', exact: true }).click(); }
  12 | 
  13 | for (const lesson of [
  14 |   { title: '一剪，两相映', prediction: '2 个', fold: 2 },
  15 |   { title: '四面有回声', prediction: '2 个', fold: 4 },
  16 |   { title: '一纸，生万象', prediction: '一个中心孔', fold: 8 },
  17 | ]) test(`V4 ${lesson.fold}层本地分享PNG：预测门槛、离线导出与真实像素尺寸`, async ({ page }, testInfo) => {
  18 |   const errors: string[] = [], externalRequests: string[] = [];
  19 |   page.on('pageerror', error => errors.push(error.message));
  20 |   await page.goto('/'); await ready(page);
  21 |   await page.getByRole('button', { name: lesson.title, exact: true }).click();
  22 |   await page.getByRole('button', { name: '保存当前并开始', exact: true }).click();
  23 |   await expect(page.locator('.prediction-panel')).toBeVisible();
  24 |   await expect(page.getByText('已自动保存', { exact: true })).toBeVisible();
  25 |   await exportModal(page);
  26 |   await expect(page.getByRole('button', { name: /^保存分享图（PNG）/ })).toBeDisabled();
  27 |   await page.keyboard.press('Escape');
  28 |   await page.getByRole('radio', { name: lesson.prediction, exact: false }).check();
  29 |   await page.getByRole('button', { name: '记录预测，展开观察' }).click(); await ready(page);
  30 |   const origin = new URL(page.url()).origin;
  31 |   await page.route('**/*', route => {
  32 |     const url = route.request().url();
  33 |     if (/^https?:/.test(url) && new URL(url).origin !== origin) { externalRequests.push(url); return route.abort(); }
  34 |     return route.continue();
  35 |   });
  36 |   await exportModal(page);
> 37 |   const pending = page.waitForEvent('download');
     |                        ^ Error: page.waitForEvent: Test timeout of 45000ms exceeded.
  38 |   await page.getByRole('button', { name: /^保存分享图（PNG）/ }).click();
  39 |   const download = await pending;
  40 |   expect(download.suggestedFilename()).toMatch(/\d{4}-\d{2}-\d{2}-分享卡\.png$/);
  41 |   expect(download.suggestedFilename()).toContain(lesson.title);
  42 |   const output = testInfo.outputPath(`share-${lesson.fold}-layers.png`);
  43 |   await download.saveAs(output);
  44 |   const png = await readFile(output);
  45 |   expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  46 |   expect(png.readUInt32BE(16)).toBe(1080);
  47 |   expect(png.readUInt32BE(20)).toBe(1350);
  48 |   expect(png.length).toBeGreaterThan(15_000);
  49 |   await testInfo.attach(`share-${lesson.fold}-layers`, { path: output, contentType: 'image/png' });
  50 |   await expect(page.getByRole('button', { name: /^保存分享图（PNG）/ })).toBeEnabled();
  51 |   expect(externalRequests).toEqual([]); expect(errors).toEqual([]);
  52 | });
  53 | 
  54 | test('V4 我的作品汇总复制记录去重，按作品导出与既有记录格式一致', async ({ page }) => {
  55 |   await page.goto('/'); await ready(page);
  56 |   const expected = await page.evaluate(async () => {
  57 |     const lessonsUrl = '/src/lessons/index.ts', learningUrl = '/src/io/learning.ts', storageUrl = '/src/io/storage.ts';
  58 |     const lessons = await import(lessonsUrl);
  59 |     const learning = await import(learningUrl);
  60 |     const storage = await import(storageUrl);
  61 |     const first = lessons.createProject('half');
  62 |     first.id = 'progress-completed'; first.participantId = 'progress-participant'; first.title = '进度汇总测试作品'; first.mode = 'learn';
  63 |     first.progress = [{ lessonId: 'half', prediction: '2 个', completedAt: '2026-09-28T02:00:03.000Z' }];
  64 |     first.events = [
  65 |       learning.makeLearningEvent({ type: 'attempt_start', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:01.000Z' }),
  66 |       learning.makeLearningEvent({ type: 'prediction_submitted', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:02.000Z', metadata: { option: '2 个', alreadySeenResult: false } }),
  67 |       learning.makeLearningEvent({ type: 'lesson_complete', lessonId: 'half', attemptId: 'progress-attempt', origin: 'practice', feedbackMode: 'explained', at: '2026-09-28T02:00:03.000Z' }),
  68 |     ];
  69 |     await storage.saveProject(first);
  70 |     await storage.saveProject({ ...structuredClone(first), id: 'progress-copy', title: '同一尝试的备份副本' });
  71 |     const record = learning.buildLearningRecords(first);
  72 |     const { exportedAt: _exportedAt, ...stable } = record;
  73 |     return stable;
  74 |   });
  75 |   await page.getByRole('button', { name: '我的作品', exact: true }).click();
  76 |   const summary = page.getByRole('region', { name: '学习进度', exact: true });
  77 |   await expect(summary).toContainText('1 / 9 课已记录完成');
  78 |   await expect(summary).toContainText('1 / 1 次作答');
  79 |   await expect(summary).toContainText('不代表学习效果或实剪验证');
  80 |   await summary.getByRole('combobox', { name: '选择学习记录所属作品' }).selectOption('progress-completed');
  81 |   const pending = page.waitForEvent('download');
  82 |   await summary.getByRole('button', { name: '导出学习记录', exact: true }).click();
  83 |   const download = await pending;
  84 |   const actual = JSON.parse(await readFile((await download.path())!, 'utf8'));
  85 |   delete actual.exportedAt;
  86 |   expect(actual).toEqual(expected);
  87 |   await page.keyboard.press('Escape');
  88 |   await page.getByRole('button', { name: '我的作品', exact: true }).click();
  89 |   await expect(page.getByRole('region', { name: '学习进度', exact: true })).toContainText('1 / 1 次作答');
  90 | });
  91 | 
```