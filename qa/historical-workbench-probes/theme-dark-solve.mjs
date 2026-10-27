// 深色主题品牌色求解：找出满足 WCAG 4.5:1 的组合
const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
const lin = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

const papers = { '玄墨': '#211F1C', '玄墨底': '#151412', '靛夜': '#1C242B', '靛夜底': '#12171C' };
const fills = ['#C0392B', '#B93A26', '#C4422C', '#A8321F', '#D0452F', '#CE4A32', '#C74830'];
const onBrandsLight = ['#FBF4EA', '#FFFFFF'];
const onBrandsDark = ['#1A1512', '#241C18', '#2A1F19'];
const brandTexts = ['#F08A72', '#EF907C', '#E88A6E', '#FF9A80', '#F5A08A', '#EE9078', '#F29B84'];

console.log('== 按钮填充：fill + onBrand ==');
for (const fill of fills) {
  const withLight = onBrandsLight.map(o => `${o}:${ratio(o, fill).toFixed(2)}`).join('  ');
  const withDark = onBrandsDark.map(o => `${o}:${ratio(o, fill).toFixed(2)}`).join('  ');
  console.log(`fill ${fill}  亮字 → ${withLight}   暗字 → ${withDark}`);
}

console.log('\n== 正文中的朱砂强调：brandText on paper ==');
for (const b of brandTexts) {
  const cells = Object.entries(papers).map(([k, p]) => `${k}:${ratio(b, p).toFixed(2)}`).join('  ');
  console.log(`${b}  ${cells}`);
}
