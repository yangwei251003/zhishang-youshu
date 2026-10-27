export const WORKSHOP_FILM = {
  src: `${import.meta.env.BASE_URL}videos/workshop-intro.mp4`,
  poster: `${import.meta.env.BASE_URL}videos/workshop-poster.jpg`,
  captions: `${import.meta.env.BASE_URL}videos/workshop-intro.vtt`,
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
  { number: '01', name: '杨炜晨', role: '队长 · 项目统筹', focus: '方向与整体交付', duties: '负责需求与范围取舍，协调成员分工与进度，统筹版本整合、作品检查及答辩。' },
  { number: '02', name: '翁宇航', role: '课程与交互策划', focus: '学习路径与内容组织', duties: '负责课程与学习路径、预测和观察内容、六步引导及操作说明。' },
  { number: '03', name: '陈立军', role: '前端与交互开发', focus: '可操作的工坊界面', duties: '负责绘制编辑、历史回看、作品管理与媒体播放，兼顾响应式布局和不同设备的操作体验。' },
  { number: '04', name: '郭宇', role: '几何与数据逻辑', focus: '毫米、折叠与连接', duties: '负责几何内核适配、折叠展开与结构判断，维护毫米坐标、存档和文件导入导出的一致性。' },
  { number: '05', name: '林纳川', role: '视觉、质量与答辩', focus: '纸艺表达与成果展示', duties: '负责纸艺视觉与素材归属，组织操作及无障碍检查，编制答辩图文与讲解内容。' },
];
