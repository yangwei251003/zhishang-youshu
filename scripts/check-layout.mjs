import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=Number(process.env.PAPER_PORT||5192),dir='docs/v4-implementation/evidence';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),results=[];
try {
  for(const width of [1920,1600,1440,1280,1100,390,360]) {
    const page=await browser.newPage({viewport:{width,height:width<751?844:900},reducedMotion:'reduce'});
    await page.goto(`http://127.0.0.1:${port}`);await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();
    await expect(page.getByText('已自动保存',{exact:true})).toBeAttached();await page.evaluate(()=>document.fonts.ready);
    for(const expanded of [false,true]){
      if(expanded)await page.locator('.apprentice-summary').click();
      const measure=await page.evaluate(()=>({
        header:document.querySelector('.site-header').getBoundingClientRect().height,
        overflow:document.documentElement.scrollWidth>innerWidth,
        align:getComputedStyle(document.querySelector('.workbench-body')).alignItems,
        rails:['.left-rail','.canvas-workspace','.right-rail'].map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),children=[...el.children].filter(c=>c.getBoundingClientRect().height>0);return {selector,height:r.height,bottomBlank:r.bottom-Math.max(...children.map(c=>c.getBoundingClientRect().bottom))};}),
      }));
      assert.equal(measure.overflow,false,`${width}: no horizontal overflow`);
      if(width>=1280){assert.equal(measure.align,'stretch');for(const rail of measure.rails)assert.ok(rail.bottomBlank<=160,`${width} ${rail.selector} ${rail.bottomBlank}`);}
      if(width<=390)assert.ok(measure.header<=120,`Mobile header ${measure.header}`);
      results.push({width,expanded,...measure});
      await page.screenshot({path:`${dir}/after-home-${width}-${expanded?'expanded':'compact'}.png`,fullPage:true,animations:'disabled'});
      if(width===1600&&expanded){await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.screenshot({path:`${dir}/after-bottom-1600.png`});}
    }
    await page.close();
  }
}finally{await browser.close();}
await fs.writeFile(`${dir}/layout-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log(JSON.stringify(results));
