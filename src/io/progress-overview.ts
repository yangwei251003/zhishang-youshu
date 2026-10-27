import { LESSONS } from '../lessons';
import type { ProjectDocument } from '../types';
import { decodeLearningEvent, type DecodedLearningEvent } from './learning';

export interface ProgressOverview {
  lessonsTotal: number;
  lessonsCompleted: number;
  predictionsTotal: number;
  predictionsMatched: number;
  transferCompleted: number;
  transferWithHint: number;
  transferUnclassified: number;
  legacyPredictionsTotal: number;
  totalCuts: number;
  projectsTotal: number;
  firstAt: string | null;
  lastAt: string | null;
  hasIncompleteRecords: boolean;
}

type ModernEvent = Extract<DecodedLearningEvent, { legacy: false }>;
type Attempt = { lessonId: string; events: ModernEvent[]; participants: Set<string>; truncated: boolean };
const validTime = (value: string | undefined): value is string => !!value && Number.isFinite(Date.parse(value));
const compareTime = (a: string, b: string) => Date.parse(a) - Date.parse(b);
const participantLesson = (participant: string, lesson: string) => `${participant}\u0000${lesson}`;

/** Current documents only: duplicate snapshots of one project are not extra works. */
export function uniqueCurrentProjects(projects: ProjectDocument[]): ProjectDocument[] {
  const current = new Map<string, ProjectDocument>();
  for (const project of projects) {
    const prior = current.get(project.id);
    if (!prior || project.revision > prior.revision || (project.revision === prior.revision && compareTime(project.updatedAt, prior.updatedAt) > 0)) current.set(project.id, project);
  }
  return [...current.values()];
}

/** Summarise retained records, never infer effective learning time or physical success. */
export function buildProgressOverview(projects: ProjectDocument[]): ProgressOverview {
  const current = uniqueCurrentProjects(projects);
  const lessons = new Map(LESSONS.map(lesson => [lesson.id, lesson]));
  const result: ProgressOverview = { lessonsTotal: LESSONS.filter(lesson => !lesson.transfer).length, lessonsCompleted: 0,
    predictionsTotal: 0, predictionsMatched: 0, transferCompleted: 0, transferWithHint: 0, transferUnclassified: 0,
    legacyPredictionsTotal: 0, totalCuts: 0, projectsTotal: current.length, firstAt: null, lastAt: null, hasIncompleteRecords: false };
  const completedLessons = new Set<string>(), seenEvents = new Set<string>();
  const attempts = new Map<string, Attempt>();
  const legacyAnswers = new Map<string, { lessonId: string; prediction: string; updatedAt: string }>();
  const transferProgress = new Set<string>(), modernPredictions = new Set<string>(), recordedTransfers = new Set<string>();

  for (const project of current) {
    result.totalCuts += project.cursor;
    const decoded = project.events.map(decodeLearningEvent);
    const truncated = decoded.some(event => !event.legacy && event.type === 'records_truncated');
    result.hasIncompleteRecords ||= truncated;
    for (const progress of project.progress) {
      const lesson = lessons.get(progress.lessonId);
      if (!lesson) continue;
      const related = decoded.filter(event => event.lessonId === progress.lessonId);
      // Rehearsal exports can be imported; they must not become formal completion.
      if (related.length && related.every(event => !event.legacy && event.origin === 'onboarding')) continue;
      const key = participantLesson(project.participantId, lesson.id);
      if (validTime(progress.completedAt)) {
        if (lesson.transfer) transferProgress.add(key); else completedLessons.add(lesson.id);
      }
      if (progress.prediction.trim()) {
        const prior = legacyAnswers.get(key);
        if (!prior || compareTime(project.updatedAt, prior.updatedAt) > 0) legacyAnswers.set(key, { lessonId: lesson.id, prediction: progress.prediction, updatedAt: project.updatedAt });
      }
    }
    for (const event of decoded) {
      if (!event.legacy && event.origin === 'onboarding') continue;
      if (validTime(event.at)) {
        if (!result.firstAt || compareTime(event.at, result.firstAt) < 0) result.firstAt = event.at;
        if (!result.lastAt || compareTime(event.at, result.lastAt) > 0) result.lastAt = event.at;
      }
      if (event.legacy || !event.lessonId || !lessons.has(event.lessonId)) continue;
      if (event.type === 'prediction_submitted' && typeof event.metadata.option === 'string' && event.metadata.option.trim()) modernPredictions.add(participantLesson(project.participantId, event.lessonId));
      const key = `${event.lessonId}\u0000${event.attemptId}`;
      const attempt = attempts.get(key) ?? { lessonId: event.lessonId, events: [], participants: new Set<string>(), truncated: false };
      attempt.participants.add(project.participantId);
      attempt.truncated ||= truncated;
      if (!seenEvents.has(event.eventId)) { attempt.events.push(event); seenEvents.add(event.eventId); }
      attempts.set(key, attempt);
    }
  }

  for (const attempt of attempts.values()) {
    const lesson = lessons.get(attempt.lessonId)!;
    const events = [...attempt.events].sort((a, b) => compareTime(a.at, b.at) || a.eventId.localeCompare(b.eventId));
    const prediction = events.find(event => event.type === 'prediction_submitted' && typeof event.metadata.option === 'string' && event.metadata.option.trim());
    if (prediction) {
      result.predictionsTotal++;
      if (prediction.metadata.option === lesson.expectedPrediction) result.predictionsMatched++;
    }
    if (!lesson.transfer) continue;
    const completion = events.find(event => event.type === 'transfer_complete' || (event.type === 'attempt_end' && event.metadata.outcome === 'completed' && event.metadata.goalPassed === true));
    if (!completion) continue;
    for (const participant of attempt.participants) recordedTransfers.add(participantLesson(participant, lesson.id));
    const beforeCompletion = events.filter(event => compareTime(event.at, completion.at) <= 0);
    const end = beforeCompletion.find(event => event.type === 'attempt_end' && event.metadata.outcome === 'completed' && event.metadata.goalPassed === true);
    const hinted = beforeCompletion.some(event => event.type === 'hint_opened') || end?.metadata.assisted === true;
    const resumed = beforeCompletion.some(event => event.type === 'attempt_resumed' || event.metadata.alreadySeenResult === true);
    if (hinted) result.transferWithHint++;
    else if (end?.metadata.assisted === false && end.metadata.independent === true && !resumed && !attempt.truncated
      && prediction && beforeCompletion.some(event => event.type === 'attempt_start')) result.transferCompleted++;
    else result.transferUnclassified++;
  }

  // V1 has no reliable attempt identity. Keep one retained answer per participant
  // and lesson, clearly labelled in the UI, instead of inventing legacy attempts.
  for (const [key, answer] of legacyAnswers) if (!modernPredictions.has(key)) {
    result.legacyPredictionsTotal++; result.predictionsTotal++;
    if (answer.prediction === lessons.get(answer.lessonId)?.expectedPrediction) result.predictionsMatched++;
  }
  for (const key of transferProgress) if (!recordedTransfers.has(key)) result.transferUnclassified++;
  result.lessonsCompleted = completedLessons.size;
  return result;
}
