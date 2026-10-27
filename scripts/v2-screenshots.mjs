import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'docs/v2-implementation/evidence'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:5188'); await page.getByRole('button',{name:'直接进入，不再提示'}).click(); await page.getByText('已自动保存',{exact:true}).waitFor();
await page.screenshot({path:`${out}/01-desktop-1440.png`,fullPage:true});
const metrics=[];
for(const [w,h] of [[1440,900],[1280,800],[390,844],[360,800],[720,450]]){
 await page.setViewportSize({width:w,height:h}); await page.screenshot({path:`${out}/workspace-${w}.png`,fullPage:true});
 metrics.push(await page.evaluate(()=>({viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelector('[data-testid="folded-canvas"]').getBoundingClientRect().width,body:document.body.scrollWidth})));
}
await writeFile(`${out}/layout-metrics.json`,JSON.stringify(metrics,null,2)); console.log(metrics);
await browser.close();
