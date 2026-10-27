/** Geometry coordinates are millimetres, centred at the middle of the unfolded square. */
export interface Point { x: number; y: number }
export type FoldMode = 2 | 4 | 8;
export type CutShape = 'rectangle' | 'triangle' | 'polygon';
export interface Cut { id: string; shape: CutShape; points: Point[]; label: string }
export interface Region { outer: Point[]; holes: Point[][] }
export interface Goal { requireConnected: boolean; minCuts: number; minHoles?: number; requiredRetained?: Point[]; requiredRemoved?: Point[] }
export interface LessonProgress { lessonId: string; prediction: string; completedAt?: string }
export interface LearningEvent { at: string; type: string; lessonId?: string; value: string }
export interface ProjectDocument {
  schemaVersion: 1; id: string; title: string; createdAt: string; updatedAt: string; revision: number;
  paperSizeMm: number; foldMode: FoldMode; cuts: Cut[]; cursor: number; mode: 'learn' | 'create';
  lessonId: string; progress: LessonProgress[]; events: LearningEvent[]; participantId: string;
  feedbackMode: 'explained' | 'basic';
}
export interface Lesson {
  id: string; unit: string; title: string; subtitle: string; description: string; prompt: string;
  knowledge: string; predictionOptions: string[]; expectedPrediction: string; foldMode: FoldMode;
  cuts: Cut[]; goal: Goal; transfer?: boolean; guide: string[];
}
export interface GeometryIssue { code: string; message: string; cutId?: string; step?: number; at?: Point }
export interface StepAnalysis { step: number; cutId: string; componentCount: number; holeCount: number; areaMm2: number; valid: boolean; newlySeparated: boolean }
export type GeometryStatus = 'connected' | 'separated' | 'uncertain' | 'empty' | 'invalid';
export interface Analysis {
  revision: number; folded: Region[]; unfolded: Region[]; componentCount: number; holeCount: number;
  areaMm2: number; status: GeometryStatus; validSequence: boolean; issues: GeometryIssue[];
  steps: StepAnalysis[]; goals: { passed: boolean; label: string }[]; goalPassed: boolean;
  firstSeparationStep?: number;
}
export interface RepairCandidate { id: string; title: string; description: string; cuts: Cut[]; analysis: Analysis; changedAreaMm2: number; changedCutId: string }
export const MAX_CUTS = 100;
export const MAX_VERTICES = 64;
export const APP_VERSION = '0.4.0';
