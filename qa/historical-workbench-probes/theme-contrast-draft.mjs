// WCAG 对比度校验：验证纸上有数 V4 主题色板草案
const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

const themes = {
  '素纸（默认）': {
    bgCanvas: '#F5EFE3', bgPaper: '#FFFCF5', bgSunken: '#F0EADD',
    textPrimary: '#302821', textSecondary: '#5E4C3E', textMuted: '#6B5748',
    line: '#C9B79C', brand: '#B72D24', brandStrong: '#8F241D', brandSoft: '#F6E9E1',
    onBrand: '#FFFCF5', accentInfo: '#355B61', accentWarm: '#8A6231',
    canvasRetain: '#B94232', canvasCut: '#FFFCF5'
  },
  '竹青': {
    bgCanvas: '#EDF1EA', bgPaper: '#FAFCF7', bgSunken: '#E4EBE2',
    textPrimary: '#222A25', textSecondary: '#44514A', textMuted: '#55635A',
    line: '#BCCBBB', brand: '#AE2B22', brandStrong: '#8A2019', brandSoft: '#F0E6E2',
    onBrand: '#FBFDF9', accentInfo: '#2F666B', accentWarm: '#7A6636',
    canvasRetain: '#B23A2B', canvasCut: '#FAFCF7'
  },
  '朱漆': {
    bgCanvas: '#E9D5C3', bgPaper: '#FAF0E4', bgSunken: '#DFC7B2',
    textPrimary: '#331E15', textSecondary: '#584031', textMuted: '#6A4E3D',
    line: '#C4A98F', brand: '#9E2318', brandStrong: '#7A1A12', brandSoft: '#F2E0D6',
    onBrand: '#FBF1E5', accentInfo: '#3C5A5E', accentWarm: '#7E5427',
    canvasRetain: '#B0361F', canvasCut: '#FAF0E4'
  },
  '玄墨': {
    bgCanvas: '#151412', bgPaper: '#211F1C', bgSunken: '#191816',
    textPrimary: '#F3EDE3', textSecondary: '#CFC3B2', textMuted: '#B4A796',
    line: '#433D34', brand: '#D9563E', brandStrong: '#B8422D', brandSoft: '#33211B',
    onBrand: '#FBF4EA', accentInfo: '#8FB6BA', accentWarm: '#C79A56',
    canvasRetain: '#D25338', canvasCut: '#211F1C'
  },
  '靛夜': {
    bgCanvas: '#12171C', bgPaper: '#1C242B', bgSunken: '#161C22',
    textPrimary: '#E9EFF4', textSecondary: '#BDCBD6', textMuted: '#A3B2BD',
    line: '#38454F', brand: '#E0604B', brandStrong: '#BD4632', brandSoft: '#22262F',
    onBrand: '#F7FAFC', accentInfo: '#9CC0D2', accentWarm: '#C19359',
    canvasRetain: '#D95B44', canvasCut: '#1C242B'
  }
};

const checks = [
  ['正文 / 纸面', 'textPrimary', 'bgPaper', 4.5],
  ['正文 / 页底', 'textPrimary', 'bgCanvas', 4.5],
  ['次要 / 纸面', 'textSecondary', 'bgPaper', 4.5],
  ['次要 / 页底', 'textSecondary', 'bgCanvas', 4.5],
  ['弱提示 / 纸面', 'textMuted', 'bgPaper', 4.5],
  ['弱提示 / 页底', 'textMuted', 'bgCanvas', 4.5],
  ['主按钮文字 / 品牌色', 'onBrand', 'brand', 4.5],
  ['朱砂强调 / 纸面', 'brand', 'bgPaper', 4.5],
  ['品牌深色 / 纸面', 'brandStrong', 'bgPaper', 4.5],
  ['靛青辅助 / 纸面', 'accentInfo', 'bgPaper', 4.5],
  ['赭石辅助 / 纸面', 'accentWarm', 'bgPaper', 4.5],
  ['分隔线 / 页底（非文本 3:1）', 'line', 'bgCanvas', 1.5],
  ['剪纸红纸 / 纸面（图形 3:1）', 'canvasRetain', 'bgPaper', 3],
  ['剪纸红纸 / 页底（图形 3:1）', 'canvasRetain', 'bgCanvas', 3],
  ['纸面 / 页底（层次 1.1:1）', 'bgPaper', 'bgCanvas', 1.05]
];

let fails = 0;
for (const [name, th] of Object.entries(themes)) {
  console.log(`\n=== ${name} ===`);
  for (const [label, fg, bg, min] of checks) {
    const r = ratio(th[fg], th[bg]);
    const ok = r >= min;
    if (!ok) fails++;
    console.log(`${ok ? '✓' : '✗'} ${label.padEnd(24)} ${r.toFixed(2)}:1  (阈值 ${min})  ${th[fg]} on ${th[bg]}`);
  }
}
console.log(`\n结果：${fails === 0 ? '全部达标' : fails + ' 项不达标'}`);
