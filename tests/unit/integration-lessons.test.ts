import { describe, expect, it } from 'vitest';
import { LEGACY_LESSONS as LESSONS, createProject } from '../../src/lessons';
import { analyzeProject, getRepairs } from '../../src/geometry/engine';

describe('课程与几何契约的集成', () => {
  it('提供6案例、2迁移题与4单元', () => {
    expect(LESSONS.filter(l => !l.transfer)).toHaveLength(6);
    expect(LESSONS.filter(l => l.transfer)).toHaveLength(2);
    expect(new Set(LESSONS.map(l => l.unit)).size).toBe(4);
  });
  for (const lesson of LESSONS) it(`${lesson.id} 每个预置剪口均能从实际边界进入`, () => {
    const analysis = analyzeProject(createProject(lesson.id), lesson.goal);
    expect(analysis.issues.filter(i => i.step), JSON.stringify(analysis.issues)).toEqual([]);
    expect(analysis.validSequence).toBe(true);
    expect(analysis.areaMm2).toBeGreaterThan(0);
    if (!['bridge', 'transfer-bridge'].includes(lesson.id)) expect(analysis.goalPassed, JSON.stringify(analysis.goals)).toBe(true);
  });
  for (const id of ['bridge', 'transfer-bridge']) it(`${id} 修复保留图案目标，不能靠裁空或删全部操作通过`, () => {
    const lesson = LESSONS.find(l => l.id === id)!;
    const project = createProject(id);
    expect(analyzeProject(project, lesson.goal).status).toBe('separated');
    const repairs = getRepairs(project, lesson.goal);
    expect(repairs.length).toBeGreaterThan(0);
    for (const repair of repairs) {
      expect(repair.cuts.length).toBe(project.cuts.length);
      const independentlyReplayed = analyzeProject({ ...project, cuts: repair.cuts }, lesson.goal);
      expect(independentlyReplayed.validSequence).toBe(true);
      expect(independentlyReplayed.goalPassed).toBe(true);
      expect(independentlyReplayed.componentCount).toBe(1);
      expect(repair.changedAreaMm2).toBeGreaterThan(0);
    }
    expect(analyzeProject({ ...project, cursor: 0 }, lesson.goal).goalPassed).toBe(false);
  });
  it('对称预测与独立几何结果一致', () => {
    expect(analyzeProject(createProject('quarter')).holeCount).toBe(2);
    expect(analyzeProject(createProject('transfer-symmetry')).holeCount).toBe(4);
    expect(analyzeProject(createProject('islands')).componentCount).toBe(2);
  });
});
