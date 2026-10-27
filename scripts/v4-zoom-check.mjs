import { chromium, expect } from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const context=await chromium.launchPersistentContext('artifacts/v4-zoom-profile',{channel:'chrome',headless:true,viewport:{width:1440,height:900}});
context.setDefaultTimeout(15000);
try {
  const settings=context.pages()[0];await settings.goto('chrome://settings/appearance');
  await settings.locator('#zoomLevel').selectOption('2');await expect(settings.locator('#zoomLevel')).toHaveValue('2');
  const page=await context.newPage();await page.goto(process.env.PAPER_URL??'http://127.0.0.1:5192');
  const viewport=await page.evaluate(()=>({innerWidth,innerHeight,devicePixelRatio}));
  console.log('Native zoom viewport',viewport);
  if(viewport.innerWidth!==720)throw new Error('Chrome native zoom did not halve CSS viewport: '+JSON.stringify(viewport));
  await expect(page.getByText('已自动保存',{exact:true})).toBeAttached();
  const welcome=page.getByRole('button',{name:'直接进入，不再提示',exact:true});if(await welcome.count())await welcome.click();
  await expect(page.getByTestId('geometry-status')).toHaveText('纸张连成一片');
  console.log('Workspace ready at native 200%');
  await page.getByRole('button',{name:'使用引导',exact:true}).click();await page.locator('.tour-card').getByRole('button',{name:'下一步',exact:true}).click();
  await expect(page.getByRole('radio').first()).toBeVisible();await page.getByRole('radio').first().check();await page.getByRole('button',{name:'记录预测，展开观察',exact:true}).click();
  await page.screenshot({path:'docs/v4-implementation/evidence/native-zoom-200-prediction.png'});
  await page.keyboard.press('Escape');await expect(page.locator('.tour-card')).toHaveCount(0);
  await page.getByRole('button',{name:'学习手册',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  await writeFile('docs/v4-implementation/evidence/native-zoom-200.json',JSON.stringify({date:new Date().toISOString(),method:'Chrome appearance page #zoomLevel=2 in isolated project-owned persistent profile. Browser zoom, not CSS zoom.',viewport,overflow,checks:['native200percent','prediction choice clickable','submit prediction','Escape exits tour','manual keyboard Escape']},null,2));
  if(overflow)throw Error('200% page overflow');console.log(viewport);
} finally {await context.close()}
