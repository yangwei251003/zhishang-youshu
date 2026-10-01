import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/v3-implementation/evidence';await mkdir(out,{recursive:true});
const base=process.env.PAPER_URL??'http://127.0.0.1:5190';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try {
for(const [width,height] of [[1440,900],[1280,800],[1100,800],[390,844],[360,800]]) {
  const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'直接进入，不再提示',exact:true}).click();await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');await expect(page.getByText('已自动保存',{exact:true})).toBeAttached();
  await page.screenshot({path:`${out}/workshop-${width}.png`,fullPage:true});
  const workshop=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  await page.getByRole('button',{name:'剪纸灵感库',exact:true}).click();await expect(page.locator('.inspiration-library')).toBeVisible();
  await page.screenshot({path:`${out}/inspiration-${width}-top.png`});
  const library=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,players:document.querySelectorAll('iframe').length}));
  results.push({width,height,workshop,library,errors});await context.close();
}
await writeFile(`${out}/visual-layout.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));
for(const row of results){if(row.workshop.scroll>row.width+1||row.library.scroll>row.width+1||row.errors.length)throw Error(JSON.stringify(row))}
console.log(JSON.stringify(results));
}finally{await browser.close()}
