// WCAG 对比度校验 v2：纸上有数 V4 主题色板（修正版）
const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

const themes = {
  '素纸（默认）': {
    bgCanvas: '#F5EFE3', bgPaper: '#FFFCF5', bgSunken: '#F0EADD',
    textPrimary: '#302821', textSecondary: '#5E4C3E', textMuted: '#6B5748',
    line: '#C9B79C', lineStrong: '#9C8264', focusRing: '#8F241D',
    brand: '#B72D24', brandStrong: '#8F241D', brandSoft: '#F6E9E1', brandText: '#A3261E', onBrand: '#FFFCF5',
    accentInfo: '#355B61', accentWarm: '#8A6231',
    canvasRetain: '#B94232', canvasCut: '#FFFCF5', canvasGoalRetain: '#355B61', canvasGoalCut: '#B72D24'
  },
  '竹青': {
    bgCanvas: '#EDF1EA', bgPaper: '#FAFCF7', bgSunken: '#E4EBE2',
    textPrimary: '#222A25', textSecondary: '#44514A', textMuted: '#55635A',
    line: '#B2C3B1', lineStrong: '#7C8E7C', focusRing: '#8A2019',
    brand: '#AE2B22', brandStrong: '#8A2019', brandSoft: '#F0E6E2', brandText: '#9C2820', onBrand: '#FBFDF9',
    accentInfo: '#2F666B', accentWarm: '#7A6636',
    canvasRetain: '#B23A2B', canvasCut: '#FAFCF7', canvasGoalRetain: '#2F666B', canvasGoalCut: '#AE2B22'
  },
  '朱漆': {
    bgCanvas: '#E9D5C3', bgPaper: '#FAF0E4', bgSunken: '#DFC7B2',
    textPrimary: '#331E15', textSecondary: '#584031', textMuted: '#6A4E3D',
    line: '#C4A98F', lineStrong: '#8E6F52', focusRing: '#7A1A12',
    brand: '#9E2318', brandStrong: '#7A1A12', brandSoft: '#F2E0D6', brandText: '#922116', onBrand: '#FBF1E5',
    accentInfo: '#3C5A5E', accentWarm: '#7E5427',
    canvasRetain: '#B0361F', canvasCut: '#FAF0E4', canvasGoalRetain: '#3C5A5E', canvasGoalCut: '#9E2318'
  },
  '玄墨（深色）': {
    bgCanvas: '#151412', bgPaper: '#211F1C', bgSunken: '#191816',
    textPrimary: '#F3EDE3', textSecondary: '#CFC3B2', textMuted: '#B4A796',
    line: '#433D34', lineStrong: '#7A7163', focusRing: '#F08A72',
    brand: '#C0392B', brandStrong: '#A8321F', brandSoft: '#33211B', brandText: '#F08A72', onBrand: '#FBF4EA',
    accentInfo: '#8FB6BA', accentWarm: '#C79A56',
    canvasRetain: '#D25338', canvasCut: '#211F1C', canvasGoalRetain: '#8FB6BA', canvasGoalCut: '#F08A72'
  },
  '靛夜（深色）': {
    bgCanvas: '#12171C', bgPaper: '#1C242B', bgSunken: '#161C22',
    textPrimary: '#E9EFF4', textSecondary: '#BDCBD6', textMuted: '#A3B2BD',
    line: '#38454F', lineStrong: '#647787', focusRing: '#F08A72',
    brand: '#C0392B', brandStrong: '#A8321F', brandSoft: '#22262F', brandText: '#F08A72', onBrand: '#FBF4EA',
    accentInfo: '#9CC0D2', accentWarm: '#C19359',
    canvasRetain: '#D95B44', canvasCut: '#1C242B', canvasGoalRetain: '#9CC0D2', canvasGoalCut: '#F08A72'
  }
};

const checks = [
  ['正文 / 纸面', 'textPrimary', 'bgPaper', 4.5],
  ['正文 / 页底', 'textPrimary', 'bgCanvas', 4.5],
  ['次要 / 纸面', 'textSecondary', 'bgPaper', 4.5],
  ['次要 / 页底', 'textSecondary', 'bgCanvas', 4.5],
  ['弱提示 / 纸面', 'textMuted', 'bgPaper', 4.5],
  ['弱提示 / 页底', 'textMuted', 'bgCanvas', 4.5],
  ['按钮文字 / 品牌底', 'onBrand', 'brand', 4.5],
  ['按钮文字 / 品牌按下', 'onBrand', 'brandStrong', 4.5],
  ['朱砂正文强调 / 纸面', 'brandText', 'bgPaper', 4.5],
  ['朱砂正文强调 / 页底', 'brandText', 'bgCanvas', 4.5],
  ['靛青辅助 / 纸面', 'accentInfo', 'bgPaper', 4.5],
  ['赭石辅助 / 纸面', 'accentWarm', 'bgPaper', 4.5],
  ['控件边框 / 纸面（非文本 3:1）', 'lineStrong', 'bgPaper', 3],
  ['焦点环 / 纸面（非文本 3:1）', 'focusRing', 'bgPaper', 3],
  ['分隔线可辨 / 页底（装饰 ≥1.5）', 'line', 'bgCanvas', 1.5],
  ['剪纸红纸 / 纸面（图形 3:1）', 'canvasRetain', 'bgPaper', 3],
  ['剪纸红纸 / 页底（图形 3:1）', 'canvasRetain', 'bgCanvas', 3],
  ['留标记 / 纸面', 'canvasGoalRetain', 'bgPaper', 3],
  ['剪标记 / 纸面', 'canvasGoalCut', 'bgPaper', 3],
  ['纸面 / 页底（层次）', 'bgPaper', 'bgCanvas', 1.05],
  ['纸面 / 凹陷底（层次）', 'bgPaper', 'bgSunken', 1.03]
];

let fails = 0, total = 0;
for (const [name, th] of Object.entries(themes)) {
  console.log(`\n=== ${name} ===`);
  for (const [label, fg, bg, min] of checks) {
    const r = ratio(th[fg], th[bg]); total++;
    const ok = r >= min;
    if (!ok) { fails++; console.log(`✗ ${label.padEnd(26)} ${r.toFixed(2)}:1 (阈值 ${min})  ${th[fg]} on ${th[bg]}`); }
  }
  console.log(`  ${checks.length} 项检查完成`);
}
console.log(`\n总计 ${total} 项，${fails === 0 ? '✅ 全部达标' : '❌ ' + fails + ' 项不达标'}`);
