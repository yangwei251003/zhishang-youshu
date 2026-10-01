import {test,expect} from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('V3 no-gesture audio silence, preference restore, keyboard audio toggle',async({page})=>{
  await page.addInitScript(()=>{const Original=window.AudioContext; (window as unknown as {audioCreations:number}).audioCreations=0; window.AudioContext=class extends Original {constructor(...args:ConstructorParameters<typeof AudioContext>){super(...args);(window as unknown as {audioCreations:number}).audioCreations++}};if(!localStorage.getItem('paperWorkshop.audio.v1'))localStorage.setItem('paperWorkshop.audio.v1',JSON.stringify({sfx:true,music:true}));});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('tab',{name:'声音',exact:true}).click();
  await expect(page.getByRole('button',{name:'开启轻音乐',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {audioCreations:number}).audioCreations)).toBe(0);
  await page.getByRole('button',{name:'音效开',exact:true}).click();
  await page.getByRole('button',{name:'开启轻音乐',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'关闭轻音乐',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('paperWorkshop.audio.v1')!))).toEqual({sfx:false,music:true});
  await page.reload();await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('tab',{name:'声音',exact:true}).click();await expect(page.getByRole('button',{name:'开启轻音乐',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'音效关',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {audioCreations:number}).audioCreations)).toBe(0);
  expect(errors).toEqual([]);
});

test('blocked persistent storage permits editing, lesson switching and JSON backup',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get:()=>{throw new Error('storage denied')}}); Storage.prototype.setItem=()=>{throw new Error('storage denied')};});
  await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'本机保存不可用'})).toBeVisible();
  await page.getByRole('button',{name:'留住这一线',exact:true}).click();await page.getByRole('button',{name:'保存当前并开始',exact:true}).click();
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'记录预测，展开观察',exact:true}).click();
  await expect(page.getByTestId('geometry-status')).toHaveText('3 片独立纸张');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出项目备份',exact:true}).click();
  expect((await pending).suggestedFilename()).toMatch(/\.paper\.json$/);
  await page.getByRole('button',{name:'我的作品',exact:true}).click();await expect(page.locator('.work-list-item')).toHaveCount(2);
  await page.locator('.work-list-item').filter({hasText:'一纸，生万象'}).click();await expect(page.locator('.work-title')).toContainText('一纸，生万象');
});

test('print popup blocked offers a standalone file and keeps prediction gating',async({page})=>{
  await page.addInitScript(()=>{window.open=()=>null});await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await expect(page.getByTestId('geometry-status')).toBeVisible();
  await page.getByRole('button',{name:'打印纸样',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出打印文件',exact:true}).first().click();
  const file=await pending;expect(file.suggestedFilename()).toMatch(/\.html$/);expect(await file.failure()).toBe(null);
});

test('repair timeout offers choices while undo stays responsive',async({page})=>{
  await page.addInitScript(()=>{const Native=window.Worker;window.Worker=class extends Native {delays:ReturnType<typeof setTimeout>[]=[];postMessage(message:unknown){if((message as {kind?:string}).kind==='repairs'){this.delays.push(setTimeout(()=>super.postMessage(message),11000));}else super.postMessage(message)}terminate(){this.delays.forEach(clearTimeout);super.terminate()}}});
  await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await page.getByRole('button',{name:'留住这一线',exact:true}).click();await page.getByRole('button',{name:'保存当前并开始',exact:true}).click();
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'记录预测，展开观察',exact:true}).click();
  await page.getByRole('button',{name:'比较修改建议',exact:true}).click();
  await expect(page.getByRole('button',{name:'继续等待',exact:true})).toBeVisible({timeout:8000});
  await expect(page.getByRole('button',{name:'只看当前刀简化比较',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'只看当前刀简化比较',exact:true}).click();
  await expect(page.getByRole('button',{name:'继续等待',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  await expect(page.getByRole('button',{name:'继续等待',exact:true})).toHaveCount(0);
  await expect(page.getByTestId('geometry-status')).toBeVisible();
});

test('external network blocked: prediction, repair and export remain entirely local',async({page,context})=>{
  const outside:string[]=[],failed:string[]=[],errors:string[]=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){outside.push(url.href);return route.abort()}return route.continue()});
  page.on('requestfailed',r=>failed.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await page.getByRole('button',{name:'留住这一线',exact:true}).click();await page.getByRole('button',{name:'保存当前并开始',exact:true}).click();
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'记录预测，展开观察',exact:true}).click();
  await page.getByRole('button',{name:'比较修改建议',exact:true}).click();await page.locator('.repair-link').first().click();
  await page.getByRole('button',{name:'应用到设计',exact:true}).click();await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  await page.getByRole('button',{name:'导出',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:/^导出打印文件/}).click();
  expect((await pending).suggestedFilename()).toMatch(/\.html$/);
  expect(outside).toEqual([]);expect(failed).toEqual([]);expect(errors).toEqual([]);
});

test('actual archived V1 project imports and restores its millimetre geometry',async({page})=>{
  const source='docs/v2-review-2026-09-27/evidence/review-project.paper.json';
  const original=JSON.parse(await readFile(source,'utf8'));
  await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
  await expect(page.getByText('已自动保存',{exact:true})).toBeVisible();await page.getByTestId('project-import').setInputFiles(source);
  await expect(page.locator('.work-title')).toContainText('· 导入');await expect(page.getByText('已自动保存',{exact:true})).toBeVisible();
  await page.reload();await expect(page.locator('.work-title')).toContainText('· 导入');
  await page.getByRole('button',{name:'导出',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:/^项目文件/}).click();
  const current=JSON.parse(await readFile((await (await pending).path())!,'utf8'));
  for(const key of ['schemaVersion','paperSizeMm','foldMode','cuts','cursor','progress'])expect(current[key]).toEqual(original[key]);
  expect(current.events).toEqual(expect.arrayContaining(original.events));
  expect(current).not.toHaveProperty('apprentice');expect(current).not.toHaveProperty('audio');
});
