import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
const dir='docs/v2-implementation/evidence';const full=await read(`${dir}/e2e-results.json`), retry=await read(`${dir}/e2e-confirmation.json`), unit=await read(`${dir}/unit-results.json`);
const cases=new Map();function visit(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[])cases.set(`${spec.file}|${spec.title}|${test.projectName}`,{title:spec.title,file:spec.file,project:test.projectName,status:test.results.at(-1)?.status});for(const child of suite.suites??[])visit(child)}
const final=await read(`${dir}/e2e-final.json`);
for(const s of final.suites)visit(s);
const result={unit:{passed:unit.numPassedTests,failed:unit.numFailedTests},initialBrowserRun:full.stats,confirmationRun:retry.stats,finalBrowserRun:final.stats,uniqueBrowserCases:cases.size,latestPassed:[...cases.values()].filter(c=>c.status==='passed').length,note:'保留初次几何等待超时及定向确认报告；最终运行独立覆盖全部32项。生产检查另发现并修复撤销后保存状态竞态，保留刷新恢复断言。',cases:[...cases.values()]};await writeFile(`${dir}/validation-summary.json`,JSON.stringify(result,null,2));console.log({unit:result.unit,finalBrowserRun:result.finalBrowserRun,uniqueBrowserCases:result.uniqueBrowserCases,latestPassed:result.latestPassed});
