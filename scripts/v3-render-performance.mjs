import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>localStorage.setItem('paperWorkshop.onboarding.v1','{"status":"skipped","tourVersion":1}'));
 await page.goto(process.env.PAPER_URL??'http://127.0.0.1:5190');await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
 const project=JSON.parse(await readFile('artifacts/print-samples/flower.paper.json','utf8'));
 project.title='100刀浏览器绘制测量';project.mode='create';project.cuts=Array.from({length:100},(_,i)=>{const y=Number((1+i*.72).toFixed(2));return{id:`render-${i}`,label:`小剪口${i+1}`,shape:'triangle',points:[{x:80,y},{x:78.5,y:Number((y+.18).toFixed(2))},{x:80,y:Number((y+.35).toFixed(2))}]}});project.cursor=100;
 const start=performance.now();await page.getByTestId('project-import').setInputFiles({name:'100cuts.paper.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await expect(page.locator('.work-title')).toContainText(project.title);await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
 await expect(page.locator('.workspace-meta')).toContainText('100');
 const render=await page.getByTestId('unfolded-canvas').evaluate(async node=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return{svgCharacters:node.outerHTML.length,paths:node.querySelectorAll('path').length,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}});
 const elapsed=performance.now()-start;await page.screenshot({path:'docs/v3-implementation/evidence/render-100.png',fullPage:true});
 await writeFile('docs/v3-implementation/evidence/render-100.json',JSON.stringify({date:new Date().toISOString(),browser:await browser.version(),cutCount:100,importToTwoAnimationFramesMs:elapsed,render,method:'真实100刀JSON导入到最终展开SVG及两次requestAnimationFrame；含导入校验、Worker计算与UI更新，非GPU纯绘制时间。单次本机测量，无历史基线。'},null,2));console.log({elapsed,render});
}finally{await browser.close()}
