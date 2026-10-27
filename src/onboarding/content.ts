export const CORE_STEPS = [
  { anchor: 'lesson-entry', title: '选一张纸', action: '认识章节，然后留下你的第一个预测。', why: '先猜后看，才能发现自己怎样理解对称。', paper: '独立练习副本已准备好；原作品会保留。' },
  { anchor: 'prediction', title: '先想一想', action: '选择一项，再点击“记录预测，展开观察”。', why: '猜错也没关系，比较预测与结果才是实验。', paper: '折着的纸藏起了其他层；先想象它们的位置。' },
  { anchor: 'folded-canvas', title: '试着剪入', action: '在纸的外边按下，向纸里拖，再松开。', why: '每一刀都要能从当前纸边进入。', paper: '重叠的纸会一起被剪；红色是留下的部分。' },
  { anchor: 'unfold-controls', title: '看纸展开', action: '点击“下一步展开”，直到最后一层打开。', why: '沿折线照映的同一刀，组成对称的图案。', paper: '慢慢打开真纸，别拉断折线附近的细连接。' },
  { anchor: 'history', title: '回看一刀', action: '点选一刀，打开“调整参数”并通过检查。', why: '修改这一刀后，也要重查后面的每一步。', paper: '屏幕可以重改，真纸要换一张重新制作。' },
  { anchor: 'export', title: '带到纸上', action: '打开“打印纸样”，或导出备用打印文件。', why: '毫米尺寸把屏幕上的发现带到手心。', paper: '打印选实际大小；先量 100 mm 标尺再剪。' },
];
export const APPRENTICE_STEPS = [...CORE_STEPS.slice(0, 5),
  { anchor: 'diagnosis', title: '找出哪里断了', action: '点“第 2 步出现分离”，定位剪断连接的一刀。', why: '这张纸成为 3 片；本题要求仍能完整拿起。', paper: '屏幕能倒回修改；真纸剪断后要用新纸重做。' },
  { anchor: 'repair', title: '修好这条连接', action: '比较修改建议，打开对照，再应用到设计。', why: '候选必须重查所有剪口及留 / 剪目标。', paper: '连成一片还不代表牢固，细连接仍要实剪验证。' },
  { anchor: 'prediction', title: '换张纸，试试是不是真懂', action: '为这道新题留下预测，再对照展开结果。', why: '换位置后仍能判断，才不只是记住上一题。', paper: '真纸的纹样会变，折线与连接的道理可以迁移。' },
  CORE_STEPS[5],
];
