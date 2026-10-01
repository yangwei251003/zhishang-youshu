import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const results=[],port=Number(process.env.PAPER_PORT||5192),dir='docs/v4-implementation/evidence';
for(const channel of ['chrome','msedge']){
  const browser=await chromium.launch({channel});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const outside=[],errors=[],consoleErrors=[];
    await context.route('**/*',route=>{if(!['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)){outside.push(route.request().url());return route.abort();}return route.continue();});
    await context.addInitScript(()=>{Object.defineProperty(navigator,'onLine',{value:false,configurable:true});localStorage.setItem('paperWorkshop.onboarding.v1',JSON.stringify({status:'skipped',tourVersion:1}));});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await page.goto(`http://127.0.0.1:${port}`);await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
    await page.getByRole('button',{name:'剪纸灵感库',exact:true}).click();
    const videos=[];
    for(const category of await page.locator('.inspiration-category').all()){
      const player=category.locator('video').first();await expect(player).toBeAttached();
      assert.equal(await player.evaluate(e=>e.paused),true);await player.evaluate(e=>e.play());
      await expect.poll(()=>player.evaluate(e=>e.currentTime)).toBeGreaterThan(.5);
      const state=await player.evaluate(e=>({src:e.currentSrc,width:e.videoWidth,height:e.videoHeight,frames:e.getVideoPlaybackQuality().totalVideoFrames,time:e.currentTime,preload:e.preload,muted:e.muted,autoplay:e.autoplay}));
      assert.equal(state.height,720);assert.ok(state.frames>0);assert.equal(state.preload,'none');assert.equal(state.autoplay,false);assert.equal(state.muted,true);videos.push(state);
      await player.evaluate(e=>e.pause());
      if(channel==='chrome')await category.screenshot({path:`${dir}/after-local-video-${videos.length}.png`});
    }
    // Localhost remains reachable with all external network routes blocked; this is not an OS cable-disconnect claim.
    await page.getByRole('button',{name:'工坊设置',exact:true}).click();await page.getByRole('tab',{name:'声音',exact:true}).click();
    await page.getByRole('button',{name:'开启轻音乐',exact:true}).click();await expect(page.getByRole('button',{name:'关闭轻音乐',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'关闭轻音乐',exact:true}).click();await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(outside,[]);
    results.push({channel,version:await browser.version(),videos,musicPlayed:true,errors,consoleErrors,outside});
  }finally{await browser.close();}
}
await fs.writeFile(`${dir}/production-media.json`,JSON.stringify({date:new Date().toISOString(),method:'Block every external host; signal offline to UI; local HTTP media stays reachable. Video decoding and timed frames are real. Hardware listening not measured.',results},null,2));console.log(JSON.stringify(results));
