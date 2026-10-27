import { APP_VERSION } from '../types';
import type { LearningEvent, ProjectDocument } from '../types';

export type LearningOrigin = 'practice' | 'onboarding' | 'study';
export type LearningMetadata = Record<string, string | number | boolean | null>;
export interface EventDetails {
  eventVersion: 2;
  eventId: string;
  attemptId: string;
  origin: LearningOrigin;
  feedbackMode: ProjectDocument['feedbackMode'];
  metadata: LearningMetadata;
}
export interface LearningEventInput {
  type: string;
  lessonId?: string;
  attemptId: string;
  origin: LearningOrigin;
  feedbackMode: ProjectDocument['feedbackMode'];
  metadata?: LearningMetadata;
  at?: string;
}
const uniqueId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
export const createAttemptId = (): string => uniqueId('attempt');
const isId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function validDetails(value: unknown): value is EventDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Partial<EventDetails>;
  return Object.keys(data).every(key => ['eventVersion', 'eventId', 'attemptId', 'origin', 'feedbackMode', 'metadata'].includes(key))
    && data.eventVersion === 2 && isId(data.eventId) && isId(data.attemptId)
    && ['practice', 'onboarding', 'study'].includes(data.origin ?? '')
    && ['basic', 'explained'].includes(data.feedbackMode ?? '')
    && !!data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    && Object.entries(data.metadata).every(([key, item]) => /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
      && !['constructor', 'prototype', '__proto__'].includes(key)
      && (item === null || typeof item === 'boolean' || typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item))));
}

/** Keep the native V1 project envelope; only the bounded value string carries V2 metadata. */
export function makeLearningEvent(input: LearningEventInput): LearningEvent {
  const details: EventDetails = { eventVersion: 2, eventId: uniqueId('event'), attemptId: input.attemptId,
    origin: input.origin, feedbackMode: input.feedbackMode, metadata: input.metadata ?? {} };
  if (!validDetails(details)) throw new Error('学习记录元数据无效。');
  const value = JSON.stringify(details);
  if (value.length > 4096) throw new Error('学习记录内容超过 4096 字符。');
  const at = input.at ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at || input.type.length > 64 || !input.type.trim() || /[\u0000-\u001f]/.test(input.type)
    || (input.lessonId !== undefined && !isId(input.lessonId))) throw new Error('学习记录时间或类型无效。');
  return { at, type: input.type, ...(input.lessonId ? { lessonId: input.lessonId } : {}), value };
}

export type DecodedLearningEvent = ({ at: string; type: string; lessonId?: string; legacy: false } & EventDetails)
  | { at: string; type: string; lessonId?: string; value: string; legacy: true };
export function decodeLearningEvent(event: LearningEvent): DecodedLearningEvent {
  try {
    const details: unknown = JSON.parse(event.value);
    if (validDetails(details)) return { at: event.at, type: event.type, ...(event.lessonId ? { lessonId: event.lessonId } : {}), ...details, legacy: false };
  } catch { /* Old plain text is preserved, never guessed into a new attempt. */ }
  return { ...event, legacy: true };
}

/** Persist a cumulative loss marker inside the existing event envelope when the cap is reached. */
export function appendLearningEvent(events: LearningEvent[], event: LearningEvent, limit = 2000): LearningEvent[] {
  if (!Number.isInteger(limit) || limit < 2 || limit > 10000) throw new Error('记录上限须为 2–10000。');
  const incoming = decodeLearningEvent(event);
  if (!incoming.legacy && events.some(item => { const decoded = decodeLearningEvent(item); return !decoded.legacy && decoded.eventId === incoming.eventId; })) return events;
  const all = [...events, event];
  if (all.length <= limit) return all;
  let droppedEvents = 0;
  const normal = all.filter(item => {
    const decoded = decodeLearningEvent(item);
    if (!decoded.legacy && decoded.type === 'records_truncated') {
      const count = decoded.metadata.droppedEvents;
      droppedEvents += typeof count === 'number' && Number.isSafeInteger(count) && count > 0 ? count : 0;
      return false;
    }
    return true;
  });
  const dropNow = Math.max(0, normal.length - limit + 1);
  droppedEvents += dropNow;
  const marker = makeLearningEvent({ type: 'records_truncated', attemptId: incoming.legacy ? createAttemptId() : incoming.attemptId,
    origin: incoming.legacy ? 'practice' : incoming.origin, feedbackMode: incoming.legacy ? 'explained' : incoming.feedbackMode,
    at: event.at, metadata: { droppedEvents, limit } });
  return [marker, ...normal.slice(dropNow)];
}

export function buildLearningRecords(project: ProjectDocument) {
  const seen = new Set<string>();
  const events = project.events.map(decodeLearningEvent).filter(event => {
    if (event.legacy) return true;
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId); return true;
  });
  const truncation = events.filter(event => !event.legacy && event.type === 'records_truncated');
  return {
    recordSchemaVersion: 2, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), participantId: project.participantId,
    projectId: project.id, feedbackMode: project.feedbackMode, lessonId: project.lessonId, progress: project.progress, events,
    truncated: truncation.length > 0,
    completeness: truncation.length ? '已达到本机记录上限，较早事件已截断；见 records_truncated。' : '当前文件未记录截断；旧版本是否曾截断不可追溯。',
    legacyNote: 'legacy=true 保留原始文本；旧记录没有尝试编号、开始时间或失败次数时不补猜。按 eventId 合并多次导出；旧记录不自动去重。',
    note: '匿名本地操作记录，不自动上传。elapsedMs 是总经过时间，不是有效学习时间。origin=onboarding 为引导，不能当作独立试用。记录不证明学习效果或实剪结果。',
  };
}
