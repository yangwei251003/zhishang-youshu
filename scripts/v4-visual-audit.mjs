import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=Number(process.env.PAPER_PORT||5192),dir='docs/v4-implementation/evidence';
const browser=await chromium.launch({channel:'chrome'}),checks=[];
const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
async function audit(theme,scene){
  const colors=await page.evaluate(()=>{
    const rgb=s=>s.match(/[\d.]+/g)?.map(Number)??[0,0,0,0];
    const lum=rgb=>rgb.slice(0,3).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
    return [...document.querySelectorAll('body *')].filter(e=>e.namespaceURI==='http://www.w3.org/1999/xhtml'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden').map(e=>{
      let bg=[0,0,0,0];const ancestry=[];for(let x=e;x;x=x.parentElement)ancestry.push(x);
      for(const x of ancestry.reverse()){const c=rgb(getComputedStyle(x).backgroundColor),a=c[3]??1;bg=c.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a));}
      const fg=rgb(getComputedStyle(e).color),a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      return {text:e.textContent.trim().slice(0,50),class:e.className,ratio:+ratio.toFixed(3)};
    });
  });
  const failures=colors.filter(c=>c.ratio<4.5);checks.push({theme,scene,textNodes:colors.length,failures});
  if(failures.length)console.error(theme,scene,failures);
}
try{
 await page.goto(`http://127.0.0.1:${port}`);await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();await expect(page.getByText('已自动保存',{exact:true})).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 for(const [theme,label] of [['plain','素纸'],['bamboo','竹青'],['lacquer','朱漆'],['ink','玄墨'],['indigo','靛夜']]){
   await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('tab',{name:'纸色',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
   await audit(theme,'theme-settings');await page.screenshot({path:`${dir}/after-settings-${theme}.png`});
   await page.getByRole('tab',{name:'声音',exact:true}).click();await page.getByRole('button',{name:'开启轻音乐',exact:true}).hover();await audit(theme,'music-hover');
   if(theme==='ink')await page.screenshot({path:`${dir}/after-music-ink.png`});await page.keyboard.press('Escape');
   await audit(theme,'workshop');await page.screenshot({path:`${dir}/after-theme-${theme}.png`,fullPage:true});
   for(const label of ['学习手册','我的作品']){await page.getByRole('button',{name:label,exact:true}).click();await audit(theme,label);await page.keyboard.press('Escape');}
   await page.getByRole('button',{name:'剪纸灵感库',exact:true}).click();await audit(theme,'inspiration');
   if(theme==='ink')await page.screenshot({path:`${dir}/after-nav-inspiration.png`});
   await page.getByRole('button',{name:'我的作品',exact:true}).click();if(theme==='ink')await page.screenshot({path:`${dir}/after-nav-works.png`});await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'实验工坊',exact:true}).click();
 }
 for(const width of [1920,1600,1440,1280,1100,390,360]){
   await page.setViewportSize({width,height:width<751?844:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`${dir}/after-indigo-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
}finally{await browser.close();await fs.writeFile(`${dir}/live-contrast.json`,JSON.stringify({date:new Date().toISOString(),method:'Computed text/background pairs in real DOM. CSS gradients, SVG paths, opacity and photographic content additionally need visual review; this does not claim exhaustive pixel contrast certification.',checks,errors,consoleErrors},null,2));}
assert.ok(checks.every(c=>c.failures.length===0),'Computed foreground/background regressions');console.log(`Live contrast: ${checks.length} theme/scenes, ${checks.reduce((sum,c)=>sum+c.textNodes,0)} text nodes, 0 failures.`);
