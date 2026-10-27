import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeProject } from '../../src/geometry/engine';
import { createProject, LESSONS } from '../../src/lessons';
import { parseProject, printHtml, projectSvg, openPrint } from '../../src/io/files';
import { loadProject, saveProject } from '../../src/io/storage';
import type { ProjectDocument } from '../../src/types';

const importChanged = (change: (project: ProjectDocument) => void) => {
  const project = createProject(); change(project); return () => parseProject(JSON.stringify(project));
};
afterEach(() => vi.unstubAllGlobals());

describe('有界原生项目导入', () => {
  for (const lesson of LESSONS) it(`${lesson.id} 导出数据可以无损重新导入`, () => {
    const project = createProject(lesson.id);
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });
  it('拒绝无效JSON和原型污染键', () => {
    expect(() => parseProject('<svg onload="alert(1)">')).toThrow('JSON');
    const json = JSON.stringify(createProject()).replace('"schemaVersion":1', '"schemaVersion":1,"__proto__":{"polluted":true}');
    expect(() => parseProject(json)).toThrow('不允许');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
  it('按UTF-8字节数拒绝超过1MB的文件', () => {
    expect(() => parseProject(`{"title":"${'纸'.repeat(350_000)}"}`)).toThrow('1 MB');
  });
  it('拒绝未知格式、字段、非法日期及非有限数字', () => {
    expect(importChanged(p => { p.schemaVersion = 2 as 1; })).toThrow('版本');
    expect(importChanged(p => { Object.assign(p, { runScript: 'anything' }); })).toThrow('未知字段');
    expect(importChanged(p => { p.createdAt = '2026-02-31T12:00:00.000Z'; })).toThrow('日期');
    expect(importChanged(p => { p.cuts[0].points[0].x = Infinity; })).toThrow('坐标');
  });
  it('限制尺寸、折法、历史游标和顶点复杂度', () => {
    expect(importChanged(p => { p.paperSizeMm = 79; })).toThrow('80–180');
    expect(importChanged(p => { p.foldMode = 3 as 2; })).toThrow('折叠');
    expect(importChanged(p => { p.cursor = p.cuts.length + 1; })).toThrow('当前步骤');
    expect(importChanged(p => { p.cuts[0].shape = 'polygon'; p.cuts[0].points = Array.from({length:65}, (_, i) => ({x:i,y:i % 4})); })).toThrow('顶点');
    expect(importChanged(p => { p.cuts = Array.from({length:101}, (_, i) => ({...p.cuts[0], id: `cut-${i}`})); })).toThrow('剪切步骤');
  });
  it('拒绝自交、不相邻边接触、重叠和网格退化', () => {
    expect(importChanged(p => { p.cuts[0].shape = 'polygon'; p.cuts[0].points = [{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]; })).toThrow('交叉');
    expect(importChanged(p => { p.cuts[0].shape = 'polygon'; p.cuts[0].points = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:5,y:0},{x:0,y:10}]; })).toThrow('接触');
    expect(importChanged(p => { p.cuts[0].points = [{x:0,y:0},{x:10,y:0},{x:3,y:0}]; })).toThrow('重叠');
    expect(importChanged(p => { p.cuts[0].points = [{x:0,y:0},{x:.004,y:0},{x:0,y:2}]; })).toThrow('网格');
  });
  it('拒绝伪装的矩形、重复步骤编号及学习记录超限', () => {
    expect(importChanged(p => { p.cuts[0].shape = 'rectangle'; p.cuts[0].points = [{x:0,y:0},{x:4,y:0},{x:3,y:3},{x:0,y:3}]; })).toThrow('矩形');
    expect(importChanged(p => { p.cuts[1].id = p.cuts[0].id; })).toThrow('重复');
    expect(importChanged(p => { p.events = Array.from({length:10001}, () => ({at:p.createdAt,type:'x',value:''})); })).toThrow('学习记录');
  });
  it('导入错误不会修改现有项目', () => {
    const original = createProject(), snapshot = structuredClone(original);
    expect(() => parseProject('{bad}')).toThrow();
    expect(original).toEqual(snapshot);
  });
});

describe('统一数据生成矢量与等比例打印', () => {
  it('SVG以毫米描述真实纸张尺寸，洞使用evenodd', () => {
    const project = createProject(), svg = projectSvg(project, analyzeProject(project));
    expect(svg).toContain('width="160mm" height="160mm"');
    expect(svg).toContain('viewBox="-80 -80 160 160"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
  it('打印带A4、完整折序、折叠刀线、100mm标尺和版本', () => {
    const project = createProject(), html = printHtml(project, analyzeProject(project));
    expect(html).toContain('@page{size:A4 portrait');
    expect(html).toContain('width="100mm" height="9mm"');
    expect(html).toContain('100 mm 校准标尺');
    expect(html).toContain('折叠态刀线');
    expect(html).toContain('沿竖直中线对折');
    expect(html).toContain('沿水平中线对折');
    expect(html).toContain('对角线折叠');
    expect(html).toContain('花心 · 折角');
    expect(html).toContain('操作 0');
    expect(html).toContain('当前文件不包含实物验证结论');
  });
  it('转义用户名称与刀线标签，防止可执行内容进入打印页', () => {
    const project = createProject();
    project.title = '<img src=x onerror=alert(1)>'; project.cuts[0].label = '</li><script>alert(1)</script>';
    const html = printHtml(project, analyzeProject(project));
    expect(html).not.toContain('<img'); expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img'); expect(html).toContain('&lt;script&gt;');
  });
  it('陈旧分析不能输出；无效过程只能生成明确标记的检查模板', () => {
    const project = createProject(), analysis = analyzeProject(project);
    expect(() => projectSvg({ ...project, revision: project.revision + 1 }, analysis)).toThrow('计算尚未更新');
    expect(printHtml(project, { ...analysis, validSequence: false, status: 'invalid' })).toContain('检查用模板 · 暂不作为制作依据');
  });
  it('二折模板具有正确物理长宽，撤销步骤不出现在打印刀线列表', () => {
    const project = createProject('half');
    const html = printHtml(project, analyzeProject(project));
    expect(html).toContain('width="80mm" height="160mm" viewBox="0 -80 80 160"');
    project.cursor = 0;
    expect(printHtml(project, analyzeProject(project))).not.toContain('外沿三角（');
  });
  it('弹窗拦截以可恢复错误报告', () => {
    vi.stubGlobal('window', { open: () => null });
    const project = createProject();
    expect(() => openPrint(project, analyzeProject(project))).toThrow('拦截');
  });
});

describe('本地存储故障', () => {
  it('不吞掉不可用存储错误，允许界面提示导出备份', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(saveProject(createProject())).rejects.toThrow('导出项目');
    await expect(loadProject()).rejects.toThrow('本地存储');
  });
});
