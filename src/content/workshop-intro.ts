export const WORKSHOP_FILM = {
  src: '/videos/workshop-intro.mp4',
  poster: '/videos/workshop-poster.jpg',
  captions: '/videos/workshop-intro.vtt',
  title: '一张纸，会藏着什么？',
  durationLabel: '1 分 38 秒',
  music: { title: 'Ripples', author: 'Kevin MacLeod', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100691', license: 'https://creativecommons.org/licenses/by/4.0/' },
};

/** Keep this text aligned with the published film's narration. */
export const WORKSHOP_TRANSCRIPT = [
  '一张纸，折几次，剪一刀。你猜，展开以后，会是什么样？',
  '这里是纸上有数。一个可以边剪、边看，也可以慢慢试错的剪纸工坊。',
  '第一次来，就跟着引导走一遍。认识工作台，再从纸边，落下第一刀。先留下你的预测，再展开看一看。猜错也没关系。',
  '在左边，拖出一个小小的剪口。松开手，右边的图案，就跟着变了。',
  '别急着剪下一刀，把纸一层层展开。看看同一个缺口，怎样变成一圈对称的花纹。',
  '剪得太深了？没关系。先看看结构提示，再回到刚才那一刀。比较修改前后，留住该留的连接。',
  '也可以双击历史里的剪口，改改大小和位置。同一张纸，试出不一样的节奏。',
  '没有灵感的时候，就去灵感库逛逛。从雪花、团花，到蝴蝶和花边，挑一个喜欢的方向，再回来动手。',
  '喜欢这次的尝试，就把作品保存下来。导出项目或矢量图，也能打印纸样。拿一张真正的纸，再试一次。打印时，先量量标尺。',
  '想回看短片、查一查方法，就到工坊指南。准备好了，就跟着做一遍吧。下一张花纹，等你来剪。',
];

export const WORKSHOP_TEAM = [
  { number: '01', role: '队长 · 项目负责人', focus: '让每一步有方向', duties: '梳理真实使用场景，确定产品取舍，协调进度与分工，统筹各部分的交付和检查。' },
  { number: '02', role: '交互与视觉设计', focus: '把复杂的事讲清楚', duties: '设计页面、操作流程和纸张视觉，打磨引导、动效与手机端体验，让第一次使用也有路可循。' },
  { number: '03', role: '前端与交互开发', focus: '让想法在屏幕上发生', duties: '实现绘制、历史回看、作品管理和媒体播放，把设计落到可操作的页面，并照顾不同设备。' },
  { number: '04', role: '几何与数据逻辑', focus: '认真对待每一道剪口', duties: '负责折叠与展开、连通和孔洞的计算，维护毫米坐标、剪切记录以及文件导入导出的一致性。' },
  { number: '05', role: '内容与体验测试', focus: '替第一次来的人多想一步', duties: '编排实验与说明，整理素材来源，检查操作、文字和无障碍体验，收集使用反馈并推动改进。' },
];
