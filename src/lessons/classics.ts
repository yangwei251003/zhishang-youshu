import type { Cut, Lesson, Point } from '../types';

const p = (x: number, y: number): Point => ({ x, y });
const rectangle = (id: string, label: string, x: number, y: number, width: number, height: number): Cut => ({
  id, label, shape: 'rectangle', points: [p(x, y), p(x + width, y), p(x + width, y + height), p(x, y + height)],
});
const polygon = (id: string, label: string, coordinates: number[][]): Cut => ({
  id, label, shape: coordinates.length === 3 ? 'triangle' : 'polygon', points: coordinates.map(([x, y]) => p(x, y)),
});

// A four-layer packet mirrors across both axes. This deliberately stylised
// wedding motif is not a claim that a standard 囍 glyph has horizontal symmetry.
// The narrow mouth entrances keep every cut accessible to scissors.
const happiness: Cut[] = [
  rectangle('happiness-top', '齐边 · 留下字高', -1, 68, 82, 13),
  rectangle('happiness-side', '齐边 · 留下字宽', 66, -1, 15, 70),
  rectangle('happiness-between', '中缝 · 留下相连的一横', -1, 6, 19, 63),
  rectangle('happiness-low-left', '字肩 · 左侧留白', -1, 28, 39, 8),
  rectangle('happiness-low-right', '字肩 · 右侧留白', 46, 28, 35, 8),
  rectangle('happiness-high-left', '字冠 · 左侧留白', -1, 44, 39, 10),
  rectangle('happiness-high-right', '字冠 · 右侧留白', 46, 44, 35, 10),
  rectangle('happiness-mouth-entry', '口部 · 从右边开小入口', 58, 14, 23, 4),
  rectangle('happiness-mouth', '口部 · 沿入口扩出字腔', 26, 10, 34, 12),
];

const butterfly: Cut[] = [
  polygon('butterfly-crown', '上翅 · 剪出蝶翅外轮廓', [[-1, -80], [81, -80], [81, -48], [74, -48], [65, -66], [45, -70], [15, -36], [8, -52], [-1, -54]]),
  polygon('butterfly-outline', '下翅 · 留下蝶身与尾端', [[81, -48], [74, -48], [70, -28], [43, 0], [68, 24], [66, 44], [50, 64], [26, 50], [9, 25], [7, 58], [-1, 63], [-1, 81], [81, 81]]),
  polygon('butterfly-upper-mark', '上翅 · 一道翅纹', [[72, -38], [48, -40], [70, -28]]),
  polygon('butterfly-lower-mark', '下翅 · 一道翅纹', [[66, 44], [42, 30], [58, 54]]),
  polygon('butterfly-body-window', '蝶身 · 折线小窗', [[0, -12], [3, -5], [0, 2]]),
];

const border: Cut[] = [
  rectangle('border-trim', '齐边 · 留成一条纸带', -1, 30, 82, 51),
  polygon('border-petal-inner', '近处花瓣 · 从外边剪入', [[8, 30], [20, 20], [32, 30]]),
  polygon('border-petal-outer', '远处花瓣 · 从外边剪入', [[48, 30], [60, 20], [72, 30]]),
  polygon('border-window-inner', '近处花窗 · 从折边剪入', [[12, 0], [20, 12], [28, 0]]),
  polygon('border-window-outer', '远处花窗 · 从折边剪入', [[52, 0], [60, 12], [68, 0]]),
];

export const CLASSIC_LESSONS: Lesson[] = [
  {
    id: 'double-happiness', unit: '02 裁去与保留', title: '红纸上的双喜', subtitle: '经典纹样 · 四折喜纹结构', foldMode: 4,
    description: '用九道矩形剪口组织字冠、字腔与相连的一横，练习双喜纹样中的留白。这里采用上下对称的喜纹结构模型。',
    prompt: '字腔从窄入口扩出来以后，红色的笔画与白色的空隙，哪一部分是最后拿在手里的纸？',
    knowledge: '红色笔画是正形，剪去的白色是负形；窄入口让剪刀能进入字腔。四层折法会同时产生左右、上下镜像，因此本课是对称双喜结构练习，并非标准“囍”字的描字模板。真正字样请参考真人教程描画与折剪。',
    predictionOptions: ['红色笔画', '白色空隙', '红白两部分都留下'], expectedPrediction: '红色笔画', cuts: happiness,
    goal: { requireConnected: true, minCuts: 9, requiredRetained: [p(0, 0), p(42, 40), p(-42, -40)], requiredRemoved: [p(40, 16), p(-40, -16), p(12, 40)] },
    guide: ['逐次展开，辨认成对的喜纹与相连的一横。', '顺着第8刀的小入口，找到第9刀扩出的字腔。', '改变字腔前先检查笔画宽度；数字连通不代表实纸一定牢固。', '打印后核对标尺，按刀序在新纸上试剪。'],
  },
  {
    id: 'butterfly', unit: '01 折叠与对称', title: '一只蝴蝶的两半', subtitle: '经典纹样 · 对折蝴蝶', foldMode: 2,
    description: '先勾出半只蝴蝶的翅膀，再剪翅纹与蝶身小窗。试着把纸的边界看成一只蝶。',
    prompt: '蝶身的小三角窗有一整条边贴在对折线上，打开这一折后，这道剪口会怎样相遇？',
    knowledge: '对折只沿竖直中线镜像。贴在折线上的两半剪口接合为一个孔，左右翅膀则互为镜像。上翅与下翅可以不同；留下的蝶身要把两侧翅膀连起来。',
    predictionOptions: ['在蝶身接成一个孔', '分成两个互不相连的孔', '让左右两翼分成两片'], expectedPrediction: '在蝶身接成一个孔', cuts: butterfly,
    goal: { requireConnected: true, minCuts: 5, minHoles: 1, requiredRetained: [p(0, 16), p(35, -40), p(-35, -40)], requiredRemoved: [p(0, -5), p(76, 0)] },
    guide: ['先看蝶身小窗，再辨认上、下翅的不同轮廓。', '对照两边翅纹，解释为什么左右相同、上下不同。', '修改翅纹时保留蝶身和翅根，不把两翼剪开。', '在真纸上沿对折线留住蝶身，从外边逐步剪入。'],
  },
  {
    id: 'border-pattern', unit: '01 折叠与对称', title: '连续的花边', subtitle: '经典纹样 · 二方连续入门', foldMode: 4,
    description: '在一条纸带上留下花瓣和菱形花窗，辨认沿水平方向重复的单元。',
    prompt: '两处花窗剪口都贴着横折边；再打开左右对折后，整条花边会有几个独立的菱形孔？',
    knowledge: '本课用四层镜像得到四个并排的菱形单元，观察二方连续的节奏。软件仍采用两条中线镜像，没有把平移当成新折法；真纸要继续加长花边，可以参考手风琴折叠教程。上下花瓣之间的纸带负责把单元连接起来。',
    predictionOptions: ['2 个', '4 个', '8 个'], expectedPrediction: '4 个', cuts: border,
    goal: { requireConnected: true, minCuts: 5, minHoles: 4, requiredRetained: [p(0, 0), p(40, 0), p(-40, 0)], requiredRemoved: [p(20, 4), p(60, 4), p(-60, 4)] },
    guide: ['依次打开两折，数一数完整的菱形花窗。', '找出四个花窗的等距节奏，区分镜像操作与纹样重复。', '观察花窗之间留下的连接，再尝试改变一个花瓣。', '实剪长花边可换成手风琴折法，折叠层数与本模型分别核对。'],
  },
  {
    id: 'transfer-happiness', unit: '02 裁去与保留', title: '新题：喜字少一笔', subtitle: '迁移练习 · 喜纹连接', foldMode: 4, transfer: true,
    description: '把喜纹换一个局部剪法。保留字腔与标出的笔画，独立检查这份新纸样。',
    prompt: '如果两枚喜纹要从纸上完整地一起拿起，你会用什么依据判断这份设计？',
    knowledge: '字形辨认与纸张连通要同时考虑。逐刀检查纸片数量和留、剪标记，找到影响连接的步骤；修改后重算全部刀序，不能用删光图案来代替修复。',
    predictionOptions: ['只比较两边是否对称', '同时检查连接和留、剪目标', '只数矩形剪口有几个'], expectedPrediction: '同时检查连接和留、剪目标',
    cuts: [...happiness, rectangle('happiness-new-notch', '新添的一刀', -1, -1, 23, 10)],
    goal: { requireConnected: true, minCuts: 10, requiredRetained: [p(0, 0), p(42, 40)], requiredRemoved: [p(40, 16), p(12, 4.5)] },
    guide: ['独立找出纸片数量改变的那一步。', '在保留字腔和指定缺口的条件下调整剪口。', '验证全部刀序，再说明你留下了哪一段连接。', '修复表示更改下一张纸的模板，不能复原已经剪掉的纸。'],
  },
  {
    id: 'transfer-border', unit: '01 折叠与对称', title: '新题：花边断了', subtitle: '迁移练习 · 连续纹样', foldMode: 4, transfer: true,
    description: '这条花边多了一道新剪口。保留四个花窗和指定缺口，试着让整条纸带仍可完整拿起。',
    prompt: '要判断重复单元能否连成一条花边，下面哪项检查最可靠？',
    knowledge: '重复的形状不一定彼此连接。沿纸带查找相邻单元之间的通路，再检查每一道剪口的可进入性；修改必须同时保住花窗、指定缺口和留下的纸。',
    predictionOptions: ['花窗数量相同就可以', '保留图案并检查单元之间的连接', '左右对称就一定连通'], expectedPrediction: '保留图案并检查单元之间的连接',
    cuts: [...border, rectangle('border-new-notch', '新添的一刀', 36, -1, 8, 32)],
    goal: { requireConnected: true, minCuts: 6, minHoles: 4, requiredRetained: [p(0, 0), p(40, 0), p(72, 0)], requiredRemoved: [p(20, 4), p(60, 4), p(40, 26)] },
    guide: ['独立回看刀序，观察花边从哪一步不再完整。', '保留花窗和指定缺口，试着留下贯通的纸带。', '检查修复后的整段刀序，并解释连接出现在哪里。', '在新纸上验证修改，不把屏幕修复当成给旧纸补纸。'],
  },
];
