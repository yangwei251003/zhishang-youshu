import { describe, expect, it } from 'vitest';
import { createProject, getLesson } from '../../src/lessons';
import { makeLearningEvent } from '../../src/io/learning';
import { buildProgressOverview, uniqueCurrentProjects } from '../../src/io/progress-overview';
import { buildShareCardSvg, SHARE_CARD_SIZE } from '../../src/io/share-card';
import { analyzeProject } from '../../src/geometry/engine';
import { projectSvg } from '../../src/io/files';
import type { ProjectDocument } from '../../src/types';

const time = (second: number) => new Date(Date.UTC(2026, 8, 28, 0, 0, second)).toISOString();
function project(id: string, lessonId = 'half'): ProjectDocument {
  return { ...createProject(lessonId), id, participantId: 'participant-one', createdAt: time(0), updatedAt: time(20), mode: 'learn' };
}
function event(lessonId: string, attemptId: string, type: string, second: number, metadata: Record<string, string | boolean | number | null> = {}, origin: 'practice' | 'onboarding' = 'practice') {
  return makeLearningEvent({ lessonId, attemptId, type, at: time(second), origin, feedbackMode: 'explained', metadata });
}
function transfer(attemptId: string, assisted = false, extra: ProjectDocument['events'] = []): ProjectDocument {
  const item = project(attemptId, 'transfer-symmetry');
  item.progress = [{ lessonId: item.lessonId, prediction: '4 个', completedAt: time(8) }];
  item.events = [event(item.lessonId, attemptId, 'attempt_start', 1, { alreadySeenResult: false }),
    event(item.lessonId, attemptId, 'prediction_submitted', 2, { option: '4 个', alreadySeenResult: false }), ...extra,
    event(item.lessonId, attemptId, 'attempt_end', 7, { outcome: 'completed', goalPassed: true, assisted, independent: true }),
    event(item.lessonId, attemptId, 'transfer_complete', 8)];
  return item;
}

describe('V4 retained learning record overview', () => {
  it('keeps the empty state finite and does not invent dates or success', () => {
    expect(buildProgressOverview([])).toEqual({ lessonsTotal: 9, lessonsCompleted: 0, predictionsTotal: 0, predictionsMatched: 0,
      transferCompleted: 0, transferWithHint: 0, transferUnclassified: 0, legacyPredictionsTotal: 0,
      totalCuts: 0, projectsTotal: 0, firstAt: null, lastAt: null, hasIncompleteRecords: false });
  });
  it('counts saved predictions without completedAt but does not count them as completion', () => {
    const item = project('prediction-only');
    item.progress = [{ lessonId: 'half', prediction: '2 个' }];
    expect(buildProgressOverview([item])).toMatchObject({ lessonsCompleted: 0, predictionsTotal: 1, predictionsMatched: 1, legacyPredictionsTotal: 1 });
    item.progress[0].completedAt = time(3);
    expect(buildProgressOverview([item])).toMatchObject({ lessonsCompleted: 1 });
  });
  it('deduplicates completion by lesson across works and modern events by attempt', () => {
    const first = project('original');
    first.progress = [{ lessonId: 'half', prediction: '2 个', completedAt: time(4) }];
    first.events = [event('half', 'attempt-first', 'attempt_start', 1), event('half', 'attempt-first', 'prediction_submitted', 2, { option: '2 个' }), event('half', 'attempt-first', 'lesson_complete', 4)];
    const copy = { ...structuredClone(first), id: 'imported-copy' };
    copy.events.push(copy.events[1]);
    expect(buildProgressOverview([first, copy])).toMatchObject({ lessonsCompleted: 1, predictionsTotal: 1, predictionsMatched: 1, legacyPredictionsTotal: 0, totalCuts: 2, projectsTotal: 2 });
  });
  it('keeps distinct attempts but takes only the first submitted answer in each', () => {
    const item = project('repeated-attempt');
    item.events = [event('half', 'attempt-one', 'prediction_submitted', 1, { option: '1 个' }),
      event('half', 'attempt-one', 'prediction_submitted', 2, { option: '2 个' }),
      event('half', 'attempt-two', 'prediction_submitted', 3, { option: '2 个' })];
    expect(buildProgressOverview([item])).toMatchObject({ predictionsTotal: 2, predictionsMatched: 1 });
  });
  it('selects current snapshots by project identity without mutating inputs', () => {
    const first = project('same-document'), second = { ...structuredClone(first), revision: 3, cursor: 0 };
    const input = [second, first], before = structuredClone(input);
    expect(uniqueCurrentProjects(input)).toEqual([second]);
    expect(buildProgressOverview(input)).toMatchObject({ projectsTotal: 1, totalCuts: 0 });
    expect(input).toEqual(before);
  });
  it('classifies completed transfer attempts using actual end metadata and hint events', () => {
    const alone = transfer('attempt-independent');
    const guided = transfer('attempt-guided', true, [event('transfer-symmetry', 'attempt-guided', 'hint_opened', 3)]);
    const copy = { ...structuredClone(alone), id: 'copy-of-independent' };
    expect(buildProgressOverview([alone, guided, copy])).toMatchObject({ transferCompleted: 1, transferWithHint: 1, transferUnclassified: 0, predictionsTotal: 2, lessonsCompleted: 0 });
  });
  it('does not label resumed or truncated attempts as independent', () => {
    const resumed = transfer('attempt-resumed', false, [event('transfer-symmetry', 'attempt-resumed', 'attempt_resumed', 3, { independent: false, alreadySeenResult: true })]);
    const truncated = transfer('attempt-truncated', false, [event('transfer-symmetry', 'attempt-truncated', 'records_truncated', 6, { droppedEvents: 12 })]);
    expect(buildProgressOverview([resumed, truncated])).toMatchObject({ transferCompleted: 0, transferWithHint: 0, transferUnclassified: 2, hasIncompleteRecords: true });
  });
  it('preserves legacy completion without guessing an attempt or assistance status', () => {
    const item = project('old-transfer', 'transfer-symmetry');
    item.progress = [{ lessonId: item.lessonId, prediction: '4 个', completedAt: time(6) }];
    item.events = [{ at: time(2), type: 'prediction', lessonId: item.lessonId, value: '4 个' }, { at: time(6), type: 'transfer_complete', lessonId: item.lessonId, value: 'done' }];
    const copy = { ...structuredClone(item), id: 'legacy-copy' };
    expect(buildProgressOverview([item, copy])).toMatchObject({ predictionsTotal: 1, legacyPredictionsTotal: 1, transferCompleted: 0, transferWithHint: 0, transferUnclassified: 1 });
  });
  it('excludes rehearsal predictions and completion, even in an imported rehearsal', () => {
    const item = project('onboarding-copy');
    item.progress = [{ lessonId: 'half', prediction: '2 个', completedAt: time(6) }];
    item.events = [event('half', 'tour-attempt', 'attempt_start', 1, {}, 'onboarding'),
      event('half', 'tour-attempt', 'prediction_submitted', 2, { option: '2 个' }, 'onboarding'),
      event('half', 'tour-attempt', 'lesson_complete', 6, {}, 'onboarding')];
    expect(buildProgressOverview([item])).toMatchObject({ predictionsTotal: 0, lessonsCompleted: 0, firstAt: null, lastAt: null });
  });
  it('finds date bounds across unordered events and ignores unknown lessons', () => {
    const item = project('dates');
    item.progress = [{ lessonId: 'unknown', prediction: 'yes', completedAt: time(5) }];
    item.events = [event('half', 'date-attempt', 'attempt_end', 9), event('half', 'date-attempt', 'attempt_start', 1)];
    expect(buildProgressOverview([item])).toMatchObject({ firstAt: time(1), lastAt: time(9), lessonsCompleted: 0, predictionsTotal: 0 });
  });
  it('does not rewrite a completed independent attempt because of later exploration hints', () => {
    const item = transfer('completed-then-explored');
    item.events.push(event(item.lessonId, 'completed-then-explored', 'hint_opened', 10));
    expect(buildProgressOverview([item])).toMatchObject({ transferCompleted: 1, transferWithHint: 0 });
  });
});

describe('V4 local share-card composition', () => {
  it.each(['half', 'quarter', 'flower'])('%s reuses all original geometry paths and exact statistics', lessonId => {
    const item = createProject(lessonId), analysis = analyzeProject(item, getLesson(lessonId).goal);
    const svg = buildShareCardSvg(item, analysis, { dateLabel: '2026-09-28' });
    expect(SHARE_CARD_SIZE).toEqual({ width: 1080, height: 1350 });
    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain(`${item.foldMode} 层折叠 · ${item.cursor} 刀 · 纸 ${item.paperSizeMm} mm`);
    expect(svg).toContain(`${analysis.componentCount} 片纸  ·  ${analysis.holeCount} 个孔`);
    for (const match of projectSvg(item, analysis).matchAll(/<path d="([^"]+)"/g)) expect(svg).toContain(`d="${match[1]}"`);
    expect(svg).not.toMatch(/<(?:image|foreignObject)|(?:href|src)=|url\(/i);
    expect(svg).toContain('几何连通不代表纸张牢固');
  });
  it('escapes user text and never turns a title into an external image', () => {
    const item = { ...createProject('half'), title: '<image href="https://example.com/pixel"/> & 中文' };
    const svg = buildShareCardSvg(item, analyzeProject(item));
    expect(svg).not.toContain('<image');
    expect(svg).toContain('&lt;image href=&quot;https://example.com/pixel&quot;/&gt; &amp; 中文');
    expect(buildShareCardSvg(item, analyzeProject(item), { includeText: false })).not.toContain('<text');
  });
  it('rejects stale or empty analyses instead of exporting a misleading image', () => {
    const item = createProject('half'), analysis = analyzeProject(item);
    expect(() => buildShareCardSvg({ ...item, revision: item.revision + 1 }, analysis)).toThrow('尚未更新');
    expect(() => buildShareCardSvg(item, { ...analysis, unfolded: [] })).toThrow('非空');
  });
});
