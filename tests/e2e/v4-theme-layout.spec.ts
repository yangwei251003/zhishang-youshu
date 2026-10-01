import {test,expect} from '@playwright/test';
async function enter(page:import('@playwright/test').Page){await page.goto('/');await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');}
test('five real themes persist and keep printed millimetres and SVG independent',async({page})=>{
  await page.context().addInitScript(()=>{window.print=()=>{}});
  await enter(page);
  const outputs:string[]=[];
  for(const [id,label] of [['plain','素纸'],['bamboo','竹青'],['lacquer','朱漆'],['ink','玄墨'],['indigo','靛夜']]){
    await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('tab',{name:'纸色',exact:true}).click();
    await page.getByRole('button',{name:new RegExp(label)}).click();await expect(page.locator('html')).toHaveAttribute('data-theme',id);
    await page.getByRole('tab',{name:'声音',exact:true}).click();await page.getByRole('button',{name:'开启轻音乐',exact:true}).hover();
    await expect.poll(()=>page.locator('.audio-play').evaluate(e=>getComputedStyle(e).color)).toBe(await page.evaluate(()=>{const e=document.createElement('span');e.style.color='var(--zs-text-on-brand)';document.body.append(e);const color=getComputedStyle(e).color;e.remove();return color;}));
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
    const result=await page.evaluate(async()=>{const lp='/src/lessons/index.ts',gp='/src/geometry/engine.ts',fp='/src/io/files.ts';const {createProject}=await import(lp),{analyzeProject}=await import(gp),{printHtml,projectSvg}=await import(fp);const project=createProject('quarter');project.id='theme-isolation';project.participantId='theme-test';project.createdAt=project.updatedAt='2026-09-28T00:00:00.000Z';const analysis=analyzeProject(project);return {html:printHtml(project,analysis),svg:projectSvg(project,analysis)};});
    expect(result.html).toContain('100 mm');expect(result.html).toContain('160 × 160 mm');expect(result.html).not.toContain('--zs-');expect(result.svg).not.toContain('--zs-');
    outputs.push(result.svg);
    const pending=page.waitForEvent('popup');await page.getByRole('button',{name:'打印纸样',exact:true}).click();
    const popup=await pending;{await popup.waitForLoadState();await popup.emulateMedia({media:'print'});expect(await popup.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');await popup.close();}
  }
  expect(new Set(outputs).size).toBe(1);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','indigo');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('paperWorkshop.theme.v1')!))).toEqual({mode:'manual',value:'indigo'});
});
test('reduced motion and missing View Transitions switch directly; system theme follows device',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  await page.addInitScript(()=>{Object.defineProperty(document,'startViewTransition',{value:undefined,configurable:true});});
  await enter(page);await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('button',{name:'竹青',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','bamboo');
  await page.getByRole('checkbox',{name:'跟随设备的明暗模式'}).check();await expect(page.locator('html')).toHaveAttribute('data-theme','ink');
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','plain');
  expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
});
test('navigation distinguishes current page from open overlay and returns focus with Escape',async({page})=>{
  await enter(page);const nav=page.getByRole('navigation',{name:'主导航'});
  await expect(nav.getByRole('button',{name:'实验工坊',exact:true})).toHaveAttribute('aria-current','page');
  await nav.getByRole('button',{name:'剪纸灵感库',exact:true}).click();await expect(nav.locator('[aria-current="page"]')).toHaveText('剪纸灵感库');await expect(nav.locator('.nav-dot')).toHaveCount(1);
  for(const label of ['工坊指南','我的作品']){const button=nav.getByRole('button',{name:label,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(nav.locator('[aria-current="page"]')).toHaveText('剪纸灵感库');await page.keyboard.press('Escape');await expect(button).toHaveAttribute('aria-pressed','false');await expect(button).toBeFocused();}
});
test('first task collapses the rail without hiding its progress',async({page})=>{
  await enter(page);await page.locator('.apprentice-summary').click();await expect(page.locator('.apprentice-summary')).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:'认识这间工坊',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('.apprentice-summary')).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('progressbar',{name:'第一课进度'})).toBeVisible();
});
test('all five categories fall back to real local videos after three seconds',async({page})=>{
  await page.route('https://player.bilibili.com/**',async route=>{await new Promise(resolve=>setTimeout(resolve,4000));try{await route.fulfill({status:200,contentType:'text/html',body:'<body>延迟的播放器</body>'});}catch{/* The fallback intentionally unmounts a slow frame. */}});
  await enter(page);await page.getByRole('button',{name:'剪纸灵感库',exact:true}).click();
  for(const section of await page.locator('.inspiration-category').all()){
    const card=section.locator('.real-cut-video').first();await card.getByRole('button',{name:/^打开视频：/}).click();await expect(card.locator('iframe')).toHaveCount(1);await expect(card.locator('video')).toBeVisible({timeout:5000});
    const video=card.locator('video');await expect(video).toHaveAttribute('preload','none');expect(await video.evaluate((e:HTMLVideoElement)=>e.paused&&e.muted&&e.controls&&!e.autoplay)).toBe(true);await expect(card.locator('.local-video-credit')).toContainText('作者');
  }
});
