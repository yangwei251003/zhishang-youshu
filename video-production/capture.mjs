import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const out='public/captures'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2,recordVideo:{dir:'../artifacts/v5-video/raw',size:{width:1920,height:1080}}});
await context.addInitScript(()=>{localStorage.setItem('paperWorkshop.onboarding.v1',JSON.stringify({status:'skipped',tourVersion:1}));window.print=()=>{};});
const page=await context.newPage(), video=page.video();const start=Date.now();const clips=[],layout={};
page.on('pageerror',e=>console.error(e));
async function settle(){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(950);}
async function ready(){await expect(page.getByTestId('geometry-status')).not.toHaveText(/正在计算|等待计算/);await settle();}
async function shot(name,selector){await settle();const el=selector?page.locator(selector).first():page;await el.screenshot({path:`${out}/${name}.png`,...(selector?{}:{fullPage:true})});layout[name]=selector?await el.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height,pageH:document.documentElement.scrollHeight};}):await page.evaluate(()=>({x:0,y:0,w:innerWidth,h:document.documentElement.scrollHeight,pageH:document.documentElement.scrollHeight}));console.log('captured',name);}
async function clip(name,fn){await page.waitForTimeout(650);const from=(Date.now()-start)/1000;await fn();await page.waitForTimeout(700);clips.push({name,from,duration:(Date.now()-start)/1000-from});}
async function drag(a,b){const pts=await page.getByTestId('folded-canvas').evaluate((svg,arr)=>arr.map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y};}),[a,b]);await page.mouse.move(pts[0].x,pts[0].y);await page.waitForTimeout(450);await page.mouse.down();for(let i=1;i<=35;i++){await page.mouse.move(pts[0].x+(pts[1].x-pts[0].x)*i/35,pts[0].y+(pts[1].y-pts[0].y)*i/35);await page.waitForTimeout(32);}await page.waitForTimeout(350);await page.mouse.up();await ready();}
try{
 await page.goto('http://127.0.0.1:5194');await ready();
 await shot('overview');await shot('hero-art','.artboard');await shot('dual','.dual-canvas');await shot('history','.history-section');await shot('tools','.left-rail');
 await page.getByRole('button',{name:'使用引导',exact:true}).click();await settle();await shot('guide');await page.keyboard.press('Escape');await settle();
 await page.getByRole('button',{name:/看纸是怎样展开的/}).click();await page.locator('.dual-canvas').scrollIntoViewIfNeeded();await settle();
 await clip('unfold',async()=>{await shot('unfold-0','.unfolded-pane');for(let i=1;i<=3;i++){await page.getByRole('button',{name:'下一步展开'}).click();await page.waitForTimeout(1450);await shot(`unfold-${i}`,'.unfolded-pane');}});
 await page.getByRole('button',{name:/返回完整展开图/}).click();await ready();
 await page.getByRole('button',{name:'新建',exact:true}).click();await page.getByLabel('作品名称').fill('春日 · 第一剪');await page.getByRole('dialog').getByRole('combobox').selectOption('8');await shot('new','.dialog');await page.getByRole('button',{name:'保存当前并新建'}).click();await ready();
 await page.locator('.dual-canvas').scrollIntoViewIfNeeded();await settle();
 await shot('cut-before','.dual-canvas');
 await clip('cut',async()=>{await page.waitForTimeout(700);await drag([81,14],[60,32]);await page.waitForTimeout(1800);});
 await shot('cut-after','.dual-canvas');
 await drag([81,48],[63,65]);await shot('cut-two','.dual-canvas');
 await page.getByRole('button',{name:/回看第 1 刀/}).dblclick();await shot('edit','.dialog');
 await page.getByLabel('宽度（mm）',{exact:true}).fill('18');await page.getByLabel('左侧位置 X（mm）').fill('63');await shot('edit-changed','.dialog');await page.getByRole('button',{name:'检查并应用修改'}).click();await ready();await shot('edited-result','.dual-canvas');
 await page.getByRole('button',{name:'留住这一线',exact:true}).click();await page.getByRole('button',{name:'保存当前并开始'}).click();await page.getByRole('radio',{name:/回到第二刀/}).check();await page.getByRole('button',{name:'记录预测，展开观察'}).click();await ready();await shot('problem');await shot('problem-paper','.artboard');await shot('problem-status','.right-rail');
 await page.getByRole('button',{name:'比较修改建议'}).click();await page.locator('.repair-link').first().click();await shot('repair','.dialog');await page.getByRole('button',{name:'应用到设计'}).click();await ready();await shot('repair-result','.artboard');await shot('repair-history','.history-section');
 await page.getByRole('button',{name:'剪纸灵感库',exact:true}).click();await settle();await shot('inspiration');await shot('inspiration-top','.inspiration-hero');await page.getByRole('button',{name:/^团花/}).click();await shot('inspiration-flower');
 await page.getByRole('button',{name:'实验工坊',exact:true}).click();await ready();await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByRole('button',{name:'我的作品',exact:true}).click();await shot('works','.dialog');await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();
 await page.getByRole('button',{name:'导出',exact:true}).click();await shot('export','.dialog');await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();
 const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'打印纸样',exact:true}).click();const popup=await popupPromise;await popup.waitForLoadState();await popup.evaluate(()=>document.fonts.ready);await popup.screenshot({path:`${out}/print.png`,fullPage:true});layout.print=await popup.evaluate(()=>({x:0,y:0,w:innerWidth,h:document.documentElement.scrollHeight}));await popup.close();
 await page.getByRole('button',{name:'工坊指南',exact:true}).click();await shot('manual','.dialog');
}finally{await fs.writeFile('capture-layout.json',JSON.stringify(layout,null,2));await fs.writeFile('capture-clips.json',JSON.stringify(clips,null,2));await context.close();await video.saveAs('../artifacts/v5-video/capture-raw.webm');await browser.close();}
