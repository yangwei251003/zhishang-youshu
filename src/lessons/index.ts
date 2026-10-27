import type { Cut, Lesson, Point, ProjectDocument } from '../types';
import { CLASSIC_LESSONS } from './classics';

const p = (x: number, y: number): Point => ({ x, y });
const triangle = (id: string, label: string, points: Point[]): Cut => ({ id, label, shape: 'triangle', points });
const rectangle = (id: string, label: string, x: number, y: number, w: number, h: number): Cut => ({
  id, label, shape: 'rectangle', points: [p(x, y), p(x + w, y), p(x + w, y + h), p(x, y + h)],
});

const flower: Cut[] = [
  triangle('flower-core', '花心 · 折角', [p(0, 0), p(15, 0), p(15, 15)]),
  triangle('flower-edge-a', '花瓣 · 外沿一', [p(80, 12), p(59, 23), p(80, 34)]),
  triangle('flower-edge-b', '花瓣 · 外沿二', [p(80, 46), p(66, 56), p(80, 68)]),
  triangle('flower-window', '花窗 · 横折边', [p(27, 0), p(36, 14), p(45, 0)]),
  triangle('flower-diagonal', '叶影 · 斜折边', [p(43, 43), p(54, 42), p(61, 61)]),
];

export const LEGACY_LESSONS: Lesson[] = [
  {
    id: 'half', unit: '01 折叠与对称', title: '一剪，两相映', subtitle: '对折 · 对称预测',
    description: '从折叠纸的外边剪入一个三角口，先想象展开后的样子。',
    prompt: '沿竖直中线对折后，在右侧外边剪一个三角形，展开会出现几个对应缺口？',
    knowledge: '对折将两层纸重合。展开时，每个剪口会关于折线产生镜像；落在折线上的剪口可能合并。',
    predictionOptions: ['1 个', '2 个', '4 个'], expectedPrediction: '2 个', foldMode: 2,
    cuts: [triangle('half-edge', '外沿三角', [p(80, -22), p(57, 0), p(80, 22)])],
    goal: { requireConnected: true, minCuts: 1, requiredRetained: [p(0, 0)], requiredRemoved: [p(72, 0), p(-72, 0)] },
    guide: ['先选择你的预测，再展开观察。', '提交后，再沿折线比较剪口的位置。', '提交后可修改剪口，再比较变化。'],
  },
  {
    id: 'quarter', unit: '01 折叠与对称', title: '四面有回声', subtitle: '四折 · 重复与合并',
    description: '从横折边剪入一个三角口。先想一想，展开后会留下几个独立的孔？',
    prompt: '四层折叠中，在横折边中部剪一个三角口，展开后会出现几个独立孔洞？',
    knowledge: '镜像次数与孔洞数不总是相同。相邻层的剪口在折线上接合，会组成同一个孔。',
    predictionOptions: ['1 个', '2 个', '4 个'], expectedPrediction: '2 个', foldMode: 4,
    cuts: [triangle('quarter-window', '横折边三角窗', [p(24, 0), p(36, 20), p(48, 0)])],
    goal: { requireConnected: true, minCuts: 1, minHoles: 2, requiredRetained: [p(0, 0)], requiredRemoved: [p(36, 8)] },
    guide: ['预测展开后的孔数。', '展开第一条折线，再展开第二条折线。', '比较重复的剪口与最后合并的孔洞。'],
  },
  {
    id: 'flower', unit: '02 裁去与保留', title: '一纸，生万象', subtitle: '八折 · 团花工坊',
    description: '用五个简单剪口组合花心、花瓣和叶影，观察空白怎样参与构图。',
    prompt: '八层折叠后，从纸心折角剪去一小块，展开会得到什么？',
    knowledge: '红色是保留的纸，空白是裁去的部分。八层对称把局部选择组合成完整纹样，纸心处的剪口会汇成一个中心孔。',
    predictionOptions: ['一个中心孔', '八张分离的小纸', '没有变化'], expectedPrediction: '一个中心孔', foldMode: 8,
    cuts: flower,
    goal: { requireConnected: true, minCuts: 3, minHoles: 1, requiredRetained: [p(22, 20)], requiredRemoved: [p(0, 0)] },
    guide: ['先观察折叠纸上的五个剪口。', '沿两条中线和一条对角线依次展开。', '修改一个花瓣，再比较空白和纸片的关系。'],
  },
  {
    id: 'islands', unit: '02 裁去与保留', title: '孔，还是一座岛', subtitle: '保留区域 · 结构辨认',
    description: '观察折叠纸上的两道剪口，先判断展开后纸与空白的关系。',
    prompt: '红色区域被一条完整的白色带隔开后，还能作为一张纸拿起来吗？',
    knowledge: '孔洞是被一片保留纸包围的空白，分离区域则是另一片纸。它们的数量分别计算，不能混用。此案例允许多片作品。',
    predictionOptions: ['仍是一张', '已成为多片', '只有孔数改变'], expectedPrediction: '已成为多片', foldMode: 2,
    cuts: [triangle('islands-hole', '中线孔洞', [p(0, -48), p(17, -38), p(0, -28)]), rectangle('islands-band', '横贯切带', -1, 6, 82, 10)],
    goal: { requireConnected: false, minCuts: 2, minHoles: 1, requiredRemoved: [p(0, 11)], requiredRetained: [p(0, 60)] },
    guide: ['先区分纸与空白。', '查看“纸片”和“孔洞”两个计数。', '逐步回放，找到纸片数量增加的那一刀。'],
  },
  {
    id: 'bridge', unit: '03 连通与分离', title: '留住这一线', subtitle: '连接修复 · 修改比较',
    description: '这张纸需要保持完整，同时保留花窗和外侧缺口。先判断你会怎样修改。',
    prompt: '观察这两道剪口，怎样修改设计才能保留花窗并使纸连成一片？',
    knowledge: '修复建议代表回到剪切前修改模板，不是把已剪掉的纸补回来。修改早期步骤后，后续每一刀也必须重新检查。',
    predictionOptions: ['继续剪掉更多连接', '回到第二刀，减小剪入深度', '把所有剪口删除'], expectedPrediction: '回到第二刀，减小剪入深度', foldMode: 4,
    cuts: [triangle('bridge-window', '保留的花窗', [p(20, 0), p(29, 14), p(38, 0)]), rectangle('bridge-band', '第2刀', -1, 32, 82, 10)],
    goal: { requireConnected: true, minCuts: 2, minHoles: 1, requiredRemoved: [p(29, 6), p(74, 37)], requiredRetained: [p(0, 0), p(0, 70)] },
    guide: ['先预测应如何修改。', '提交后回放各步，观察结构变化。', '尝试修改，再检查花窗是否保留。', '应用修改后，再检查整段剪切过程。'],
  },
  {
    id: 'print', unit: '04 尺寸与实物', title: '从屏幕，到手心', subtitle: '毫米尺寸 · 打印校准',
    description: '将数字模板变成实际尺寸的纸样。先判断标尺读数与纸样尺寸的关系。',
    prompt: '打印页上的 100 mm 标尺实际只有 96 mm，应先做什么？',
    knowledge: '打印请选择“实际大小”或“100%”，关闭适应页面。标尺偏差超过 1 mm 时先校准；几何连通不保证纸张牢固。',
    predictionOptions: ['直接开始裁切', '调整打印缩放并重新测量', '修改软件中的孔洞数量'], expectedPrediction: '调整打印缩放并重新测量', foldMode: 4,
    cuts: [triangle('print-center', '中央菱形', [p(0, 0), p(16, 0), p(0, 16)]), triangle('print-edge', '边缘花瓣', [p(80, 20), p(60, 34), p(80, 48)])],
    goal: { requireConnected: true, minCuts: 2, minHoles: 1, requiredRemoved: [p(0, 0)], requiredRetained: [p(35, 35)] },
    guide: ['先留下你对尺寸问题的判断。', '测量 100 mm 标尺并记录结果。', '按顺序折叠，沿折叠态刀线剪切。', '展开实物，对照屏幕并记录差异。'],
  },
  {
    id: 'transfer-symmetry', unit: '01 折叠与对称', title: '新题：折线上的相遇', subtitle: '迁移练习 · 先预测再验证',
    description: '换一个剪口位置，运用刚学到的对称与合并关系。',
    prompt: '八层折叠时，从横折边中段剪一个三角口，展开后形成几个孔洞？',
    knowledge: '先想象每次镜像，再判断在折线上接合的区域。迁移题的结果用于观察理解情况。',
    predictionOptions: ['2 个', '4 个', '8 个'], expectedPrediction: '4 个', foldMode: 8, transfer: true,
    cuts: [triangle('transfer-window', '新位置的三角窗', [p(38, 0), p(47, 12), p(56, 0)])],
    goal: { requireConnected: true, minCuts: 1, minHoles: 4, requiredRemoved: [p(47, 4)], requiredRetained: [p(0, 0)] },
    guide: ['独立提交你的预测。', '逐次展开并数出独立孔洞。', '用自己的话解释“八层”和“孔数”的关系。'],
  },
  {
    id: 'transfer-bridge', unit: '03 连通与分离', title: '新题：让纸重新相连', subtitle: '迁移练习 · 保留图案',
    description: '换成八层折叠，在保留花心和外侧缺口的条件下，独立尝试让纸保持完整。',
    prompt: '保留花心和外侧缺口，应该优先修改哪一刀？',
    knowledge: '修改必须同时满足连通与图案目标。删除全部剪口，或者切掉必须保留的区域，都不算完成。',
    predictionOptions: ['删除花心', '缩短横贯纸片的第二刀', '不作修改'], expectedPrediction: '缩短横贯纸片的第二刀', foldMode: 8, transfer: true,
    cuts: [triangle('transfer-core', '第1刀', [p(0, 0), p(12, 0), p(12, 12)]), rectangle('transfer-band', '第2刀', 29, -1, 10, 42)],
    goal: { requireConnected: true, minCuts: 2, minHoles: 1, requiredRemoved: [p(0, 0), p(34, 3)], requiredRetained: [p(18, 10), p(60, 45)] },
    guide: ['指出导致分离的步骤。', '选择你认为需要修改的步骤，试着保住连接。', '检查中心孔和外侧缺口是否保留。', '记录你的修改思路。'],
  },
];

export const LESSONS: Lesson[] = [...LEGACY_LESSONS, ...CLASSIC_LESSONS];

export function getLesson(id: string): Lesson {
  return LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[2];
}

function identifier(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`;
}

export function createProject(lessonId = 'flower'): ProjectDocument {
  const lesson = getLesson(lessonId);
  const now = new Date().toISOString();
  const cuts = structuredClone(lesson.cuts);
  return {
    schemaVersion: 1, id: identifier('paper'), title: lesson.title, createdAt: now, updatedAt: now,
    revision: 0, paperSizeMm: 160, foldMode: lesson.foldMode, cuts, cursor: cuts.length,
    mode: 'create', lessonId: lesson.id, progress: [], events: [], participantId: identifier('anon'), feedbackMode: 'explained',
  };
}

/** Before prediction, guides describe actions without revealing geometry or solutions. */
export function lessonGuide(lesson: Lesson, revealed: boolean, hintOpened = false): string[] {
  if (!revealed) return ['先观察折叠纸与题目，留下你的预测。', '提交后展开观察，再尝试修改。', '屏幕实验之后，可打印纸样做实剪验证。'];
  if (lesson.id === 'transfer-symmetry' && !hintOpened) return ['独立观察展开结果。', '比较你的预测与观察，用自己的话说明理由。', '需要帮助时，可主动打开提示；记录会注明使用了辅助。'];
  if (lesson.transfer && !hintOpened) return ['独立观察展开结果。', '选择你认为需要修改的步骤，试着保住连接与图案。', '需要帮助时，可主动打开提示；记录会注明使用了辅助。'];
  return lesson.guide;
}

/** Show only after prediction; transfer lessons require an explicit hint action. */
export function lessonHint(lesson: Lesson): string {
  if (lesson.id === 'transfer-bridge') return '回看第2刀，试着缩短剪口，让斜折边附近留出连接；同时检查花心和外侧缺口。';
  if (lesson.id === 'bridge') return '回到第2刀，固定右侧纸边，把剪口向内收短，再检查整个剪切序列与花窗。';
  return lesson.knowledge;
}
