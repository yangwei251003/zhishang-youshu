import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const out='docs/v3-implementation/evidence'; await mkdir(out,{recursive:true});
if (!(await readFile('src/types.ts','utf8')).includes("APP_VERSION = '0.2.0'")) throw new Error('此脚本只复现未修改的V2，禁止用V3覆盖修改前证据。');
const root=process.cwd(), hashes=[];
async function walk(dir){for(const ent of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,ent.name);if(ent.isDirectory())await walk(p);else hashes.push({path:relative(root,p),sha256:createHash('sha256').update(await readFile(p)).digest('hex')});}}
await walk('src');await walk('tests');await walk('scripts');
const prior=JSON.parse(await readFile('docs/v2-implementation/evidence/source-hashes.json','utf8'));
const comparison=[];for(const p of prior){const target=resolve(p.path);if(relative(root,target).startsWith('..'))throw Error('outside project');comparison.push({path:p.path,changedSinceV2:createHash('sha256').update(await readFile(target)).digest('hex').toUpperCase()!==p.current})}
await writeFile(out+'/baseline-hashes.json',JSON.stringify({date:new Date().toISOString(),files:hashes,comparison},null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:5190');await page.getByRole('button',{name:'带我完成第一剪'}).waitFor();
await page.screenshot({path:out+'/before-welcome-1100.png'});
await page.getByRole('button',{name:'带我完成第一剪'}).click();await page.locator('.tour-card').getByRole('button',{name:'下一步',exact:true}).click();
await page.waitForTimeout(300);await page.screenshot({path:out+'/before-prediction-1100.png'});
const overlap=await page.evaluate(()=>{const a=document.querySelector('[data-tour="prediction"]').getBoundingClientRect(),b=document.querySelector('.tour-card').getBoundingClientRect();return{anchor:a.toJSON(),card:b.toJSON(),intersection:Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))}});
await page.keyboard.press('Escape');
await writeFile(out+'/baseline-reproduction.json',JSON.stringify({date:new Date().toISOString(),fontErrors:errors.length,errors,overlap},null,2));console.log(JSON.stringify({fontErrors:errors.length,overlap}));
}finally{await browser.close()}
