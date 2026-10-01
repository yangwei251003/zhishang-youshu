import { describe, expect, it } from 'vitest';
import { nextApprenticeTask, parseApprentice, TASKS } from '../../src/onboarding/apprentice';

describe('V3 independent apprentice preference', () => {
  it('starts at the first unfinished real task without guessing prior achievements', () => {
    const state = parseApprentice(JSON.stringify({ version: 3, status: 'active', tasks: { 'tour-interface': '2026-09-28T00:00:00.000Z', 'first-prediction': '2026-09-28T00:01:00.000Z' } }));
    expect(nextApprenticeTask(state)).toBe('first-cut');
    expect(Object.keys(state.tasks)).toHaveLength(2);
  });
  it('never converts dismissal or an invalid preference into graduation', () => {
    expect(parseApprentice('{')).toMatchObject({ status: 'active', tasks: {} });
    expect(parseApprentice(JSON.stringify({ version: 3, tasks: {}, status: 'graduated' })).status).toBe('active');
    expect(parseApprentice(JSON.stringify({ version: 3, tasks: {}, status: 'dismissed' })).status).toBe('dismissed');
  });
  it('ignores unknown task IDs and invalid timestamps', () => {
    const state = parseApprentice(JSON.stringify({ version: 3, status: 'active', tasks: { 'first-cut': 'bad date', 'fake-task': new Date().toISOString() } }));
    expect(state.tasks).toEqual({});
  });
  it('graduates only after all seven known completion timestamps are present', () => {
    const tasks = Object.fromEntries(TASKS.map(task => [task.id, '2026-09-28T00:00:00.000Z']));
    const state = parseApprentice(JSON.stringify({ version: 3, status: 'active', tasks }));
    expect(state.status).toBe('graduated'); expect(nextApprenticeTask(state)).toBeUndefined();
  });
});
