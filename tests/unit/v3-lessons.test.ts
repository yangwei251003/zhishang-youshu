import { describe, expect, it } from 'vitest';
import { CLASSIC_LESSONS } from '../../src/lessons/classics';
import { createProject, LEGACY_LESSONS, LESSONS, lessonGuide } from '../../src/lessons';
import { analyzeProject, getRepairs } from '../../src/geometry/engine';
import { parseProject, printHtml, projectSvg } from '../../src/io/files';
import { goalMarkers } from '../../src/components/GoalMarkers';

describe('V3 classic motifs use the existing lesson, millimetre and repair contracts', () => {
  it('adds three classic lessons and two transfers while retaining the eight V2 objects unchanged', () => {
    expect(LEGACY_LESSONS).toHaveLength(8);
    expect(LESSONS).toHaveLength(13);
    expect(LESSONS.slice(0, 8)).toEqual(LEGACY_LESSONS);
    expect(CLASSIC_LESSONS.filter(l => !l.transfer)).toHaveLength(3);
    expect(CLASSIC_LESSONS.filter(l => l.transfer)).toHaveLength(2);
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(13);
    expect(new Set(LESSONS.map(l => l.unit)).size).toBe(4);
  });

  it.each(CLASSIC_LESSONS)('$id keeps all cuts accessible and preserves native JSON and print output', lesson => {
    const project = createProject(lesson.id);
    const analysis = analyzeProject(project, lesson.goal);
    expect(analysis.validSequence, JSON.stringify(analysis.issues)).toBe(true);
    expect(analysis.issues).toEqual([]);
    expect(analysis.steps).toHaveLength(lesson.cuts.length);
    expect(parseProject(JSON.stringify(project))).toEqual(project);
    expect(project.schemaVersion).toBe(1);
    expect(projectSvg(project, analysis)).toContain('viewBox="-80 -80 160 160"');
    const template = printHtml(project, analysis);
    expect(template).toContain(lesson.title);
    expect(template).toContain('100 mm 校准标尺');
    for (const cut of lesson.cuts) expect(template).toContain(cut.label);
    const markers = goalMarkers(lesson.goal, lesson.foldMode, 0);
    expect(markers.some(marker => marker.kind === 'retained')).toBe(true);
    expect(markers.some(marker => marker.kind === 'removed')).toBe(true);
  });

  it.each(CLASSIC_LESSONS.filter(l => !l.transfer))('$id passes all initial goals, with no geometry shortcut', lesson => {
    const project = createProject(lesson.id);
    const analysis = analyzeProject(project, lesson.goal);
    expect(analysis.status).toBe('connected');
    expect(analysis.goalPassed, JSON.stringify(analysis.goals)).toBe(true);
    expect(analyzeProject({ ...project, cursor: 0 }, lesson.goal).goalPassed).toBe(false);
    expect(analyzeProject(project, { ...lesson.goal, requiredRetained: lesson.goal.requiredRemoved }).goalPassed).toBe(false);
    expect(analyzeProject(project, { ...lesson.goal, requiredRemoved: lesson.goal.requiredRetained }).goalPassed).toBe(false);
  });

  it('matches the butterfly and flower-border predictions against independent unfolded counts', () => {
    expect(analyzeProject(createProject('butterfly')).holeCount).toBe(1);
    expect(analyzeProject(createProject('border-pattern')).holeCount).toBe(4);
    expect(createProject('double-happiness').cuts).toHaveLength(9);
  });

  it.each(CLASSIC_LESSONS.filter(l => l.transfer))('$id starts as a meaningful failure and offers complete valid repairs', lesson => {
    const project = createProject(lesson.id);
    const original = analyzeProject(project, lesson.goal);
    expect(original.status).toBe('separated');
    expect(original.goalPassed).toBe(false);
    expect(original.firstSeparationStep).toBe(project.cuts.length);
    const repairs = getRepairs(project, lesson.goal);
    expect(repairs.length).toBeGreaterThan(0);
    for (const candidate of repairs) {
      expect(candidate.cuts).toHaveLength(project.cuts.length);
      const replayed = analyzeProject({ ...project, cuts: candidate.cuts }, lesson.goal);
      expect(replayed.validSequence).toBe(true);
      expect(replayed.componentCount).toBe(1);
      expect(replayed.goalPassed).toBe(true);
      expect(candidate.changedAreaMm2).toBeGreaterThan(0);
    }
    expect(analyzeProject({ ...project, cursor: project.cursor - 1 }, lesson.goal).goalPassed).toBe(false);
    expect(analyzeProject({ ...project, cursor: 0 }, lesson.goal).goalPassed).toBe(false);
  });

  it.each(CLASSIC_LESSONS)('$id preserves prediction and explicit transfer-hint boundaries', lesson => {
    expect(lesson.predictionOptions).toHaveLength(3);
    expect(lesson.predictionOptions).toContain(lesson.expectedPrediction);
    expect(lessonGuide(lesson, false)).toEqual(lessonGuide(LEGACY_LESSONS[0], false));
    if (lesson.transfer) {
      expect(lessonGuide(lesson, true, false)).not.toEqual(lesson.guide);
      expect(lessonGuide(lesson, true, true)).toEqual(lesson.guide);
      expect(lessonGuide(lesson, true, false).join('')).not.toMatch(/第 ?[610] ?刀|80%|60%|40%/);
    }
  });

  it('rechecks the mouth entry when an earlier happiness cut changes', () => {
    const lesson = CLASSIC_LESSONS.find(l => l.id === 'double-happiness')!;
    const project = createProject(lesson.id);
    const cuts = project.cuts.map(cut => cut.id === 'happiness-mouth-entry'
      ? { ...cut, points: cut.points.map(point => ({ x: point.x, y: point.y + 12 })) } : cut);
    const analysis = analyzeProject({ ...project, cuts }, lesson.goal);
    expect(analysis.validSequence).toBe(false);
    expect(analysis.issues.some(issue => issue.cutId === 'happiness-mouth' && issue.code === 'inaccessible')).toBe(true);
  });
});
