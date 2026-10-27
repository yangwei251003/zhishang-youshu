/** Curated external demonstrations. These never enter project JSON or cutting geometry. */
export type InspirationCategory = 'snowflake' | 'flower' | 'happiness' | 'animal' | 'border';

export interface RealCutSource {
  id: string;
  category: InspirationCategory;
  title: string;
  sourceTitle: string;
  author: string;
  bvid: string;
  duration: string;
  summary: string;
  watchFor: string[];
}

export const VIDEO_CATEGORIES: { id: InspirationCategory; title: string; caption: string; description: string; lessonId: string; lessonTitle: string; relation: string }[] = [
  { id: 'snowflake', title: '雪花', caption: '折痕，藏着重复的秘密', description: '先看纸怎样折，再看一刀如何在展开后相遇。把看似复杂的雪花，拆回一个小小的剪口。', lessonId: 'quarter', lessonTitle: '四面有回声', relation: '本站从 2 / 4 / 8 层镜像练起；视频中的六角折法留给真纸探索。' },
  { id: 'flower', title: '团花', caption: '一圈留白，一纸生花', description: '花瓣围着中心相拥，空白也在构成图案。跟着完整教程，观察折、画、剪、展的节奏。', lessonId: 'flower', lessonTitle: '一纸，生万象', relation: '在八折团花里，试着分辨哪些是保留的纸，哪些是剪去的空。' },
  { id: 'happiness', title: '喜字', caption: '把祝福，留在红纸上', description: '熟悉的双喜藏着横竖笔画和连接。看清哪里该剪，哪里要为整张纸留下一条路。', lessonId: 'double-happiness', lessonTitle: '红纸上的双喜', relation: '先用矩形剪口练习双喜的结构，再把视频里的运剪方法带到纸上。' },
  { id: 'animal', title: '动物', caption: '对折以后，生命有了两半', description: '沿着中线，一半翅膀成为一只蝴蝶。观察轮廓与翅膀内的留白怎样彼此呼应。', lessonId: 'butterfly', lessonTitle: '一只蝴蝶的两半', relation: '用对折蝴蝶理解镜像：折线上相连，纸面上相映。' },
  { id: 'border', title: '花边', caption: '重复的美，要连得起来', description: '一个小单元，展开成一串故事。把视线留在纹样之间，那里藏着花边不断开的原因。', lessonId: 'border-pattern', lessonTitle: '连续的花边', relation: '本站练四折镜像单元与连接；长纸条的反复折叠，在真人示范里继续观察。' },
];

export const REAL_CUT_VIDEOS: RealCutSource[] = [
  { id: 'snowflake-yanqi', category: 'snowflake', title: '雪花剪纸 · 从折纸到展开', sourceTitle: '超级漂亮的雪花剪纸教程，窗花剪纸教程简单易学，一看就会的对称剪纸，你学会了吗#雪花剪纸 #儿童剪纸 #剪纸 #对称剪纸 #窗花剪纸', author: '妍琦剪纸', bvid: 'BV1QV4y1w7W8', duration: '01:37', summary: '一段短示范，观察折好的纸如何变成放射的雪花。', watchFor: ['先找尖角和开口边，再观察下剪的位置。', '展开时一层一层打开，比较重复的剪口。'] },
  { id: 'snowflake-laomao', category: 'snowflake', title: '一张纸的雪花', sourceTitle: '如何制作剪纸雪花？简单易学，赶快来动动小手吧！', author: '老猫创意手工', bvid: 'BV15Q4y1t78d', duration: '02:58', summary: '从一张纸出发，跟着折叠、剪制与展开观察雪花的变化。', watchFor: ['暂停在折好的一刻，画出你看到的折线。', '把剪下的部分与展开后的空白对应起来。'] },
  { id: 'lotus-fold', category: 'flower', title: '莲花团花 · 上篇', sourceTitle: '剪纸20集教程 | 04 莲花团花（上） | 非遗传统手工艺', author: '慧子手工_非遗文创（杨慧子）', bvid: 'BV1Gt4y1u7vP', duration: '12:04', summary: '循序学习莲花团花，留意构图与折叠如何为后面的剪制做准备。', watchFor: ['观察重复的花瓣怎样落到折叠的小纸面。', '分清轮廓、内部装饰与不能剪断的连接。'] },
  { id: 'lotus-cut', category: 'flower', title: '莲花团花 · 下篇', sourceTitle: '剪纸20集教程 | 05 莲花团花（下）| 非遗传统手工艺', author: '慧子手工_非遗文创（杨慧子）', bvid: 'BV1q84y1q7CV', duration: '10:40', summary: '接着上篇看剪制与成形，把局部的留白放回整幅团花。', watchFor: ['比较大轮廓与小细节的运剪节奏。', '展开后沿着纸面找一条不断开的路径。'] },
  { id: 'double-happiness', category: 'happiness', title: '双喜剪纸', sourceTitle: '剪纸20集教程 | 06 双喜剪纸 | 非遗传统手工艺', author: '慧子手工_非遗文创（杨慧子）', bvid: 'BV1U24y1k7hX', duration: '05:30', summary: '一张红纸里的双喜：观察横竖笔画、对称和相连的结构。', watchFor: ['用手指沿保留的笔画走一圈，再看哪些空白被剪去。', '分辨折线旁的剪口展开后会合并还是成双。'] },
  { id: 'happiness-flower', category: 'happiness', title: '双喜团花 · 构图与剪制', sourceTitle: '剪纸20集教程 | 08 双喜团花（上） | 非遗传统手工艺', author: '慧子手工_非遗文创（杨慧子）', bvid: 'BV1T14y1T7kN', duration: '12:24', summary: '把喜字放进团花，观察文字与周围装饰如何成为一张完整的纸。', watchFor: ['比较喜字主体与外围纹样各自的对称。', '找出文字和花纹之间保留下来的连接处。'] },
  { id: 'butterfly-huizi', category: 'animal', title: '蝴蝶剪纸 · 轮廓与留白', sourceTitle: '剪纸20集教程 | 07 蝴蝶剪纸 | 非遗传统手工艺', author: '慧子手工_非遗文创（杨慧子）', bvid: 'BV1tV4y1P7ns', duration: '11:00', summary: '从蝴蝶的轮廓看到翅膀内部，练习同时关注留下的形与剪去的空。', watchFor: ['把蝴蝶的中线与纸的折线对应起来。', '看翅膀上的装饰如何保留足够的连接。'] },
  { id: 'butterfly-culture', category: 'animal', title: '四次对称剪纸 · 蝴蝶', sourceTitle: '【走进中国剪纸】四次对称剪纸：蝴蝶', author: '北京市文化馆', bvid: 'BV1864y1P7Jh', duration: '20:48', summary: '文化馆的完整教学，从折叠、造型到双蝶图样的设计与剪制。', watchFor: ['观察对称如何帮助组织多只蝴蝶。', '暂停在设计阶段，先预测展开后相邻的轮廓。'] },
  { id: 'border-goldfish', category: 'border', title: '二方连续 · 金鱼', sourceTitle: '二方连续剪纸教程“金鱼”', author: '云高剪纸', bvid: 'BV183411N7B3', duration: '01:53', summary: '让金鱼排成一条花边，观察一个单元如何重复、又如何连在一起。', watchFor: ['找到单个金鱼的轮廓和相邻金鱼的连接。', '比较长纸条反复折叠与本站镜像练习的异同。'] },
  { id: 'border-pattern', category: 'border', title: '二方连续 · 纹样练习', sourceTitle: '二方连续纹样剪纸', author: '不务正业的豆豆老师', bvid: 'BV1XP4y1o7b8', duration: '05:06', summary: '从单独纹样走到连续花边，观察折痕两侧保留的连接。', watchFor: ['先认出重复单元，再追踪连续展开的方向。', '想一想：若把连接处也剪掉，结果会怎样？'] },
];

/** Offline prompts written for this workshop, not a transcript of the linked films. */
export const PAPER_PRACTICE_STEPS: Record<InspirationCategory, string[]> = {
  snowflake: ['把薄方纸对角折成三角，再对折；认清折边与开口边。', '从开口边画几个小缺口，保留相连的纸，不把整条折边剪掉。', '剪好后逐层展开，数一数同一个缺口重复了几次。'],
  flower: ['先选一张薄方纸，按你熟悉的折法压平折痕。', '先画花瓣轮廓，再标出要剪去的空白，为花瓣留出连接。', '从边缘慢慢剪入，再轻轻展开，沿着纸面检查是否仍然连通。'],
  happiness: ['先把方纸对折，画下横竖笔画与折线的位置。', '用阴影标出要剪去的部分，让保留的笔画彼此相接。', '从纸边剪入，展开后再对照双喜结构，观察哪里需要调整。'],
  animal: ['把纸对折，让折线作为蝴蝶身体的中线。', '只画半边翅膀与翅内小缺口，保留身体和翅膀之间的纸。', '沿边缘剪出轮廓，缓慢展开，对照左右两半。'],
  border: ['把长纸条等宽反复折叠，压平每一道折痕。', '画一个小纹样，在左右折边处各保留连接，不把两边都剪断。', '剪去标记的空白，依次打开，观察重复单元怎样连成一条。'],
};

const LESSON_VIDEO: Record<string, string> = {
  half: 'butterfly-huizi', quarter: 'snowflake-laomao', flower: 'lotus-fold', islands: 'lotus-cut',
  bridge: 'border-goldfish', print: 'snowflake-yanqi', 'transfer-symmetry': 'butterfly-huizi',
  'transfer-bridge': 'border-goldfish', 'double-happiness': 'double-happiness', butterfly: 'butterfly-huizi',
  'border-pattern': 'border-pattern', 'transfer-happiness': 'double-happiness', 'transfer-border': 'border-goldfish',
};

export function videoForLesson(lessonId?: string): RealCutSource {
  return REAL_CUT_VIDEOS.find(video => video.id === LESSON_VIDEO[lessonId ?? 'flower']) ?? REAL_CUT_VIDEOS[2];
}

export function sourceUrl(video: RealCutSource): string { return `https://www.bilibili.com/video/${video.bvid}/`; }

/** Parameters documented by https://player.bilibili.com/. No autoplay permission is delegated. */
export function embedUrl(video: RealCutSource): string {
  return `https://player.bilibili.com/player.html?bvid=${video.bvid}&p=1&autoplay=0&muted=1&danmaku=0&poster=1`;
}
