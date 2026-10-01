import fs from 'node:fs';
import assert from 'node:assert/strict';
const themes = JSON.parse(fs.readFileSync(new URL('../src/theme/palettes.json', import.meta.url)));
const pairs = JSON.parse(fs.readFileSync(new URL('./lib/contrast-pairs.json', import.meta.url)));
export function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
export function ratio(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
// Include the actual interactive surfaces, not only the base palette.
const statePairs = ['hover-bg','active-bg','bg-sunken','disabled-bg'].flatMap(bg => ['text-primary','text-secondary','text-muted','brand-text'].map(fg => [`${fg}/${bg}`,fg,bg,4.5]));
statePairs.push(['disabled','disabled-text','disabled-bg',3],['selected border','selected-border','active-bg',3],['warning','warn','bg-paper',4.5],['danger','danger','bg-paper',4.5]);
let failures=0;
const results=[];
const sourceCss=['src/styles.css','src/styles/media.css'];
const literals=sourceCss.flatMap(path=>fs.readFileSync(path,'utf8').match(/#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi)??[]);
assert.ok(literals.length<=12, `Semantic migration regressed: ${literals.length} color literals outside palette definitions`);
for(const theme of themes) {
  assert.equal(Object.keys(theme.tokens).length,35, 'Specification lists 35 semantic tokens');
  for(const [label,fg,bg,min] of [...pairs,...statePairs]) {
    const value=ratio(theme.tokens[fg],theme.tokens[bg]); const pass=value>=min;
    results.push({theme:theme.id,label,ratio:+value.toFixed(3),minimum:min,pass});
    if(!pass){failures++;console.error(`${theme.label}: ${label} ${value.toFixed(2)} < ${min}`);}
  }
}
const generated = '/* Generated from palettes.json by check:contrast; do not edit. */\n'+themes.map(t => `${t.id==='plain'?':root, ':''}:root[data-theme="${t.id}"] {\n  color-scheme: ${t.dark?'dark':'light'};\n${Object.entries(t.tokens).map(([k,v])=>`  --zs-${k}: ${v};`).join('\n')}\n}`).join('\n');
if (!failures) fs.writeFileSync(new URL('../src/theme/palettes.css',import.meta.url),generated+'\n');
const reportDir = new URL('../docs/v4-implementation/evidence/',import.meta.url);
fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(new URL('contrast.json',reportDir),JSON.stringify({date:new Date().toISOString(),results,failures},null,2));
console.log(`Theme contrast: ${results.length-failures}/${results.length} passed`);
if(failures)process.exitCode=1;
