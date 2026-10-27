import fs from 'node:fs';import postcss from 'postcss';
const paths=['src/styles.css','src/styles/media.css',...fs.readdirSync('src/components').filter(p=>p.endsWith('.css')&&!['AudioToggle.css','ProgressOverview.css','ShareCardButton.css','WorkshopSettings.css'].includes(p)).map(p=>'src/components/'+p)];
const aliases={paper:'bg-paper',warm:'bg-canvas',ink:'text-primary',muted:'text-muted',line:'line',red:'brand','red-dark':'brand-strong','red-soft':'brand-soft'};
const conversions=[];
function token(color,prop,selector){let h=color.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const [r,g,b]=h.slice(0,6).match(/../g).map(x=>parseInt(x,16));const max=Math.max(r,g,b),min=Math.min(r,g,b),bright=(r+g+b)/3;const red=r>g*1.2&&r>b*1.25,blue=b>r*1.05||g>r*1.05;
 if(/shadow/.test(prop))return 'shadow-card';
 if(prop==='color'||prop==='fill'&&/text|label|point/.test(selector)){if(bright>230)return 'text-on-brand';if(red)return 'brand-text';if(blue)return 'accent-info';return bright<90?'text-primary':'text-muted';}
 if(/stroke|border|outline/.test(prop)){if(prop==='outline')return 'focus-ring';if(red)return 'selected-border';if(blue)return 'accent-info';return bright>180?'line':'line-strong';}
 if(prop==='fill'){if(red)return 'canvas-retain';if(blue)return 'goal-retain';return bright>210?'canvas-cut':'accent-warm';}
 if(red&&max-min>75&&bright<170)return 'brand';
 if(/overlay|backdrop/.test(selector))return 'bg-overlay';
 if(bright<80)return 'bg-overlay';
 if(bright>245)return 'bg-paper';
 if(red&&max-min>40)return 'brand-soft';
 return bright>235?'bg-paper':'bg-sunken';}
for(const path of paths){const root=postcss.parse(fs.readFileSync(path,'utf8'));root.walkDecls(d=>{if(d.prop.startsWith('--')){if(aliases[d.prop.slice(2)])d.value=`var(--zs-${aliases[d.prop.slice(2)]})`;return;}if(d.prop==='box-shadow'){d.value=`var(--zs-${/dialog/.test(d.parent.selector)?'shadow-dialog':/tour|toast/.test(d.parent.selector)?'shadow-float':'shadow-card'})`;return;}
 d.value=d.value.replace(/#[\da-f]{3,8}\b/gi,c=>{const t=token(c,d.prop,d.parent.selector??'');conversions.push({path,selector:d.parent.selector,property:d.prop,from:c,to:t});if(c.length===9&&d.prop!=='color'){const alpha=parseInt(c.slice(7),16)/255;return `color-mix(in srgb, var(--zs-${t}) ${Math.round(alpha*100)}%, transparent)`;}return `var(--zs-${t})`;}).replace(/rgba?\([^)]*\)/g,()=>`var(--zs-bg-overlay)`).replace(/\bwhite\b/g,'var(--zs-text-on-brand)').replace(/\bblack\b/g,'var(--zs-text-primary)');
 if(['color','stroke','outline-color','border-color'].includes(d.prop))d.value=d.value.replace(/var\(--red(?:-dark)?\)/g,'var(--zs-brand-text)');
 if(d.prop==='fill'&&d.value==='var(--red)')d.value='var(--zs-canvas-retain)';
 if(d.prop==='color'&&d.value==='var(--paper)')d.value='var(--zs-text-on-brand)';
});fs.writeFileSync(path,root.toString());}
fs.writeFileSync('docs/v4-implementation/evidence/color-migration.json',JSON.stringify(conversions,null,2));
