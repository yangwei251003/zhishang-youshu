import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('dist-v4');
const prefix = '/zhishang-youshu/';
const types = { '.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.vtt':'text/vtt','.mp3':'audio/mpeg','.woff':'font/woff','.woff2':'font/woff2' };
const server = createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if (!pathname.startsWith(prefix)) {res.writeHead(404);res.end();return;}
    const relative=pathname.slice(prefix.length)||'index.html';
    const file=resolve(root,relative);
    if (!file.startsWith(root)) {res.writeHead(403);res.end();return;}
    const data=await readFile(file);let start=0,end=data.length-1,status=200;
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){start=+range[1];end=range[2]?Math.min(+range[2],end):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${data.length}`);}
    res.writeHead(status,{'Content-Type':types[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'});res.end(data.subarray(start,end+1));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],bad=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});
page.on('request',r=>requests.push(r.url()));
try {
  await page.goto(url,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/一纸之间/}).waitFor({state:'visible'});
  const hero=page.locator('.hero-paper-flower');
  assert.equal(await hero.evaluate(n=>n.complete&&n.naturalWidth>0),true,'hero image must load below repository subpath');
  const welcomePoster=page.locator('.welcome-film-preview img');
  if(await welcomePoster.count()) {
    assert.equal(await welcomePoster.evaluate(n=>n.complete&&n.naturalWidth>0),true,'welcome poster loads at repository prefix');
    await page.getByRole('button',{name:'直接进入工坊',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await mkdir('docs/public-release',{recursive:true});
  await page.screenshot({path:'docs/public-release/workshop-desktop.png',fullPage:true});
  const media=['videos/workshop-intro.mp4','videos/workshop-poster.jpg','videos/workshop-intro.vtt',...Array.from({length:4},(_,i)=>`audio/zs-track-${i+1}.mp3`)];
  for(const asset of media){const response=await page.request.get(url+asset,{headers:{Range:'bytes=0-1023'}});assert.ok(response.ok(),`${asset} status`);assert.equal(response.status(),206,`${asset} range`);}
  assert.equal(requests.some(u=>/^http:\/\/127\.0\.0\.1:\d+\/(v2|audio|videos)\//.test(u)),false,'runtime assets stay below repository prefix');
  await page.getByRole('button',{name:'工坊指南',exact:true}).click();
  await page.getByRole('tab',{name:'我们的团队'}).click();
  await page.getByRole('heading',{name:'杨炜晨',exact:true}).waitFor({state:'visible'});
  await page.getByText('广州科技职业技术大学',{exact:true}).first().waitFor({state:'visible'});
  await page.screenshot({path:'docs/public-release/team-desktop.png',fullPage:true});
  assert.deepEqual(errors,[],'no app runtime exceptions');assert.deepEqual(bad,[],'no failed HTTP responses');
  const report={checkedAt:new Date().toISOString(),browser:'Chrome headless',prefix,checks:['core UI','hero at repository prefix','intro/music range','no root-absolute runtime asset fetches','local team update visible','no app exceptions','no failed HTTP responses'],pageErrors:errors,httpFailures:bad,media:media.length};
  await import('node:fs/promises').then(fs=>fs.writeFile('../pages-check.json',JSON.stringify(report,null,2)));
  console.log(JSON.stringify(report));
}finally {await browser.close();server.close();}
