import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS, createProject } from '../src/lessons/index';
import { analyzeProject, getRepairs } from '../src/geometry/engine';
import { parseProject, printHtml, projectSvg } from '../src/io/files';
import type { ProjectDocument } from '../src/types';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'artifacts/print-samples');
await mkdir(out, { recursive: true });
const manifest: unknown[] = [];
for (const lesson of LESSONS) {
  const original = createProject(lesson.id);
  const variants: { name: string; project: ProjectDocument }[] = [{ name: lesson.id, project: original }];
  if (['bridge', 'transfer-bridge', 'transfer-happiness', 'transfer-border'].includes(lesson.id)) {
    const repair = getRepairs(original, lesson.goal)[0];
    if (!repair) throw new Error(`${lesson.id} 没有可验证的修复`);
    variants.push({ name: `${lesson.id}-repaired`, project: { ...original, id: `${original.id}-repaired`, title: `${original.title} · 修改后`, cuts: repair.cuts, revision: original.revision + 1 } });
  }
  for (const { name, project } of variants) {
    parseProject(JSON.stringify(project));
    const analysis = analyzeProject(project, lesson.goal);
    if (!analysis.validSequence) throw new Error(`${name} 存在无效剪口`);
    if (!['bridge', 'transfer-bridge', 'transfer-happiness', 'transfer-border'].includes(name) && !analysis.goalPassed) throw new Error(`${name} 尚未通过完整课程目标`);
    await writeFile(resolve(out, `${name}.paper.json`), JSON.stringify(project, null, 2));
    await writeFile(resolve(out, `${name}.svg`), projectSvg(project, analysis));
    await writeFile(resolve(out, `${name}.html`), printHtml(project, analysis));
    manifest.push({ id: name, title: project.title, componentCount: analysis.componentCount, holeCount: analysis.holeCount, status: analysis.status, goalPassed: analysis.goalPassed, physicalValidation: 'NOT_TESTED', userValidation: 'NOT_TESTED' });
  }
}
await writeFile(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(out, '阅读说明.md'), `# 折剪验证样例\n\n本文件夹包含${LESSONS.length}个学习案例（其中${LESSONS.filter(l => l.transfer).length}个迁移任务）及4个修复后版本，每项有项目JSON、SVG和两页A4打印HTML。打开HTML即可按100%打印；项目JSON可导入工坊继续编辑。\n\nbridge、transfer-bridge、transfer-happiness、transfer-border为有意保留的分离失败设计；对应repaired文件已通过数字几何与课程目标检查。islands允许多片作品。manifest列出实际计算结果。\n\nV3双喜是上下对称的喜纹结构模型，并非标准囍字描摹；二方连续花边由四层镜像构造四个重复单元，没有新增平移折法。\n\n实物制作和真人试用均未执行；不能把数字检查当成实剪证据。优先打印half、quarter、flower、print、bridge和bridge-repaired六例，按docs/manual-validation.md填写真实记录。\n`);
console.log(`已生成 ${manifest.length} 组项目 / SVG / A4模板，实物状态均标为NOT_TESTED。`);
