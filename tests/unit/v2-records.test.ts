import { describe, expect, it } from 'vitest';
import { appendLearningEvent, buildLearningRecords, createAttemptId, decodeLearningEvent, makeLearningEvent } from '../../src/io/learning';
import { parseProject } from '../../src/io/files';
import { createProject, getLesson, LESSONS, lessonGuide, lessonHint } from '../../src/lessons';

const event = (type = 'attempt_start', attemptId = createAttemptId()) => makeLearningEvent({ type, attemptId, lessonId: 'half', origin: 'study', feedbackMode: 'basic', metadata: { seenResult: false, questionRevision: 0 } });

describe('V2学习记录与V1项目兼容', () => {
  it('元数据在V1文件往返后完整保留，重复导出具有稳定eventId', () => {
    const project = createProject('half');
    project.events = [event()];
    const restored = parseProject(JSON.stringify(project));
    expect(restored).toEqual(project);
    const decoded = decodeLearningEvent(restored.events[0]);
    expect(decoded).toMatchObject({ legacy: false, eventVersion: 2, origin: 'study', feedbackMode: 'basic', metadata: { seenResult: false } });
    expect(buildLearningRecords(restored).events).toEqual(buildLearningRecords(project).events);
  });
  it('两次失败与成功属于同次尝试，重新开始有新attemptId，引导独立标记', () => {
    const attemptId = createAttemptId(), project = createProject('half');
    for (const type of ['attempt_start', 'cut_rejected', 'cut_rejected', 'cut_applied', 'attempt_end']) project.events = appendLearningEvent(project.events, event(type, attemptId));
    project.events.push(makeLearningEvent({ type: 'attempt_start', attemptId: createAttemptId(), origin: 'onboarding', feedbackMode: 'explained' }));
    const records = buildLearningRecords(project).events;
    expect(records.filter(e => e.type === 'cut_rejected')).toHaveLength(2);
    expect(records.slice(0, 5).every(e => !e.legacy && e.attemptId === attemptId)).toBe(true);
    expect(records[5]).toMatchObject({ origin: 'onboarding' });
    expect(records[5]).not.toMatchObject({ attemptId });
  });
  it('按eventId去重，但旧文本保留且不伪造开始时间或尝试信息', () => {
    const project = createProject(), first = event();
    const legacy = { at: project.createdAt, type: 'prediction', value: '2 个' };
    project.events = [first, first, legacy, legacy];
    const output = buildLearningRecords(project);
    expect(output.recordSchemaVersion).toBe(2);
    expect(output.events).toHaveLength(3);
    expect(output.events[1]).toEqual({ ...legacy, legacy: true });
    expect(decodeLearningEvent({ ...legacy, value: '{"eventVersion":2}' })).toMatchObject({ legacy: true });
  });
  it('连续超过上限后保留累计截断标记和最近事件', () => {
    let events = [event(), event()];
    for (let i = 0; i < 4; i++) events = appendLearningEvent(events, event('cut_rejected'), 3);
    expect(events).toHaveLength(3);
    expect(decodeLearningEvent(events[0])).toMatchObject({ type: 'records_truncated', metadata: { droppedEvents: 4, limit: 3 } });
    expect(buildLearningRecords({ ...createProject(), events }).truncated).toBe(true);
    expect(appendLearningEvent(events, events[2], 3)).toBe(events);
  });
  it('拒绝超长数据，不静默截断预测原文；拒绝不可用的元数据', () => {
    expect(() => makeLearningEvent({ type: 'prediction_submitted', attemptId: createAttemptId(), origin: 'practice', feedbackMode: 'explained', metadata: { prediction: 'a'.repeat(4096) } })).toThrow('4096');
    expect(() => makeLearningEvent({ type: 'cut_applied', attemptId: createAttemptId(), origin: 'practice', feedbackMode: 'explained', metadata: { count: NaN } })).toThrow('元数据');
  });
});

describe('课程文案按阶段提供', () => {
  it('进入指南不提供孔数或修复刀号，迁移历史使用中性名称', () => {
    for (const lesson of LESSONS) expect(lessonGuide(lesson, false).join('')).not.toMatch(/两处孔洞|修改第二刀|第2刀|减深|100%/);
    expect(getLesson('quarter').description).not.toContain('两处');
    expect(getLesson('transfer-bridge').cuts.map(c => c.label)).toEqual(['第1刀', '第2刀']);
    expect(lessonGuide(getLesson('transfer-bridge'), true).join('')).not.toMatch(/第2刀|第二刀|斜折边/);
    expect(lessonHint(getLesson('transfer-bridge'))).toContain('第2刀');
  });
});
