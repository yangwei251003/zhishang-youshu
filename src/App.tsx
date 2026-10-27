import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Download, Eye, FilePlus2, FolderOpen, Grid2X2, Layers3, LoaderCircle, Maximize2,
  Minus, MousePointer2, MoveUpRight, Pencil, Plus, Printer, Redo2, RotateCcw, Save, Scissors,
  Shapes, SlidersHorizontal, Sparkles, Square, Triangle, Undo2, Upload, X,
} from 'lucide-react';
import type { Analysis, Cut, CutShape, FoldMode, Lesson, Point, ProjectDocument, RepairCandidate } from './types';
import { APP_VERSION, MAX_CUTS } from './types';
import { expandCut } from './geometry/engine';
import { analyzeAsync } from './geometry/client';
import { createProject, getLesson, LESSONS } from './lessons';
import { listForSession as listProjects, loadForSession as loadProject, saveProject, saveForTransition } from './io/storage';
import { downloadLearningRecords, downloadProject, downloadSvg, downloadPrintHtml, openPrint, parseProject } from './io/files';
import Dialog from './components/Dialog';
import { FoldedCanvas, ResultCanvas, EditPreview } from './components/PaperCanvas';

import { Hero, UnitMotif } from './components/WorkshopOrnaments';
import OnboardingTour, { hasOnboardingChoice, rememberOnboarding } from './components/OnboardingTour';
import { appendLearningEvent, makeLearningEvent, decodeLearningEvent } from './io/learning';
import { lessonGuide, lessonHint } from './lessons';
import ApprenticeTasks, { ApprenticeIntroduction } from './components/ApprenticeTasks';
import { useApprentice, TASKS, type ApprenticeTaskId } from './onboarding/apprentice';
import ProgressOverview from './components/ProgressOverview';
import ShareCardButton from './components/ShareCardButton';
import WorkshopSettings from './components/WorkshopSettings';
import WorkshopNavigation from './components/WorkshopNavigation';
import WorkshopGuide, { type GuideSection } from './components/WorkshopGuide';
import WelcomeExperience, { hasWelcomeChoice, rememberWelcomeChoice, WorkshopFilmDock } from './components/WelcomeExperience';
import { playSfx, installAudioGestures } from './audio/sfx';
import StorageNotice from './components/StorageNotice';
import RepairWait from './components/RepairWait';
import { useRepairSearch } from './hooks/useRepairSearch';
import RealCutVideo from './components/RealCutVideo';
import InspirationLibrary from './components/InspirationLibrary';

const SHAPES: { key: CutShape; label: string; icon: typeof Square }[] = [
  { key: 'triangle', label: '三角剪口', icon: Triangle }, { key: 'rectangle', label: '矩形剪口', icon: Square }, { key: 'polygon', label: '多边形', icon: Shapes },
];
const UNITS = ['折叠与对称', '裁去与保留', '连通与分离', '尺寸与实物'];
const FOLD_NAMES: Record<FoldMode, string> = { 2: '对折', 4: '十字双折', 8: '八层团花' };
const EMPTY_REGIONS: Analysis['folded'] = [];
const uid = () => crypto.randomUUID();
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作未能完成，请重试。';

export default function App() {
  useEffect(() => installAudioGestures(), []);
  const [project, setProject] = useState<ProjectDocument>(() => createProject());
  const documentRef = useRef(project);
  const interactionRef = useRef(0);
  const operationRef = useRef(0);
  const analysisRequest = useRef(0);
  const [hydrated, setHydrated] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [busy, setBusy] = useState(true);
  const [saveState, setSaveState] = useState<'pending' | 'saved' | 'error'>('pending');
  const [tool, setTool] = useState<CutShape>('triangle');
  const [guides, setGuides] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [stage, setStage] = useState<number | undefined>();
  const [selectedCut, setSelectedCut] = useState<string | undefined>();
  const [replacing, setReplacing] = useState<string | undefined>();
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<Analysis>();
  const [compareLast, setCompareLast] = useState(false);
  const [previousAnalysis, setPreviousAnalysis] = useState<Analysis>();
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'new' | 'manual' | 'works' | 'export' | 'edit' | null>(null);
  const [guideSection, setGuideSection] = useState<GuideSection>('about');
  const [playGuideFilm, setPlayGuideFilm] = useState(false);
  const [pendingLesson, setPendingLesson] = useState<Lesson>();
  const [newTitle, setNewTitle] = useState('我的剪纸实验');
  const [newSize, setNewSize] = useState(160);
  const [newFold, setNewFold] = useState<FoldMode>(8);
  const [archive, setArchive] = useState<ProjectDocument[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [repairs, setRepairs] = useState<RepairCandidate[]>([]);
  const repairSearch = useRepairSearch();
  const repairsBusy = repairSearch.busy;
  const [repairsRequested, setRepairsRequested] = useState(false);
  const [candidate, setCandidate] = useState<RepairCandidate>();
  const [editX, setEditX] = useState(0);
  const [editY, setEditY] = useState(0);
  const [editWidth, setEditWidth] = useState(1);
  const [editHeight, setEditHeight] = useState(1);
  const [narrow, setNarrow] = useState(window.innerWidth <= 750);
  useEffect(() => { const resize = () => setNarrow(window.innerWidth <= 750); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  const [welcome, setWelcome] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [extendedTour, setExtendedTour] = useState(false);
  const apprentice = useApprentice();
  const [introduction, setIntroduction] = useState(false);
  const [returningDevice, setReturningDevice] = useState(hasOnboardingChoice);
  const [inspiration, setInspiration] = useState(false);
  const [printBlocked, setPrintBlocked] = useState(false);
  const [backupReminder, setBackupReminder] = useState(false);
  const tourOriginal = useRef<ProjectDocument | null>(null);
  const [tourActions, setTourActions] = useState({ cut: false, edit: false, unfold: false, problem: false, repair: false, print: false });
  const [canvasTab, setCanvasTab] = useState<'folded' | 'result'>('folded');
  const [showTargets, setShowTargets] = useState(true);
  const [targetFocus, setTargetFocus] = useState<'retained' | 'removed'>();
  const [rejectedDraft, setRejectedDraft] = useState<{ points: Point[]; message: string }>();
  const [editBase, setEditBase] = useState<Analysis>();
  const [fixedRight, setFixedRight] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const saveRequest = useRef(0);
  const lesson = getLesson(project.lessonId);
  const progress = project.progress.find(p => p.lessonId === project.lessonId);
  const revealed = project.mode === 'create' || !!progress?.prediction;
  const selected = project.cuts.find(c => c.id === selectedCut);
  const shown = previewStep === null ? analysis : previewAnalysis;
  const isReadOnly = !hydrated || busy || previewStep !== null || !revealed;
  const attempt = readAttempt(project);
  const hinted = project.events.some(e => { const v = eventData(e.value); return e.type === 'hint_opened' && v?.attemptId === attempt.id; });
  const canExplain = revealed && project.feedbackMode === 'explained' && (!lesson.transfer || project.mode === 'create' || hinted);
  const canExportResult = revealed && !!analysis && !busy && analysis.revision === project.revision;
  const goalMarkers = project.mode === 'learn' && revealed && showTargets ? lesson.goal : undefined;
  const totalStages = project.foldMode === 8 ? 3 : project.foldMode === 4 ? 2 : 1;
  const activeCuts = project.cuts.slice(0, project.cursor);
  const highlight = useMemo(() => selected && previewStep === null ? expandCut(selected.points, project.paperSizeMm, project.foldMode) : [], [selected, project.paperSizeMm, project.foldMode, previewStep]);

  const notify = useCallback((message: string) => setToast(message), []);
  const closeModal = useCallback(() => setModal(null), []);
  const closeLesson = useCallback(() => setPendingLesson(undefined), []);
  const closeCandidate = useCallback(() => setCandidate(undefined), []);
  const cancelReplace = useCallback(() => setReplacing(undefined), []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6500); return () => clearTimeout(timer); }, [toast]);

  function updateDocument(next: ProjectDocument, event?: { type: string; value: string }) {
    repairSearch.cancel();
    interactionRef.current++;
    operationRef.current++;
    // Invalidate any older save immediately, before React paints the changed document.
    saveRequest.current++;
    setSaveState(tourOriginal.current ? 'saved' : 'pending');
    const value = { ...next, updatedAt: new Date().toISOString(), revision: Math.max(next.revision, documentRef.current.revision) + 1 };
    if (event) value.events = withEvent(value, event.type, { message: event.value });
    documentRef.current = value;
    setProject(value);
    setRepairs([]); setRepairsRequested(false); setCandidate(undefined);
    return value;
  }

  useEffect(() => {
    let cancelled = false;
    const initialInteraction = interactionRef.current;
    loadProject().then(saved => {
      if (!cancelled && !saved && !hasOnboardingChoice() && !hasWelcomeChoice()) setWelcome(true);
      if (!cancelled && saved) setReturningDevice(true);
      if (cancelled || !saved || initialInteraction !== interactionRef.current) return;
      const restored = resumeAttempt(saved); documentRef.current = restored; setProject(restored);
    }).catch(() => { if (!cancelled) notify('未能读取本地作品。你仍可以创作，也可以导入之前的项目文件。'); })
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    const ticket = ++analysisRequest.current;
    setBusy(true);
    analyzeAsync(project, project.mode === 'learn' ? getLesson(project.lessonId).goal : undefined).then(result => {
      if (ticket !== analysisRequest.current) return;
      setAnalysis(result); setBusy(false);
    }).catch(error => { if (ticket === analysisRequest.current) { setAnalysis(undefined); setBusy(false); notify(`几何计算未完成：${errorText(error)}`); } });
    return () => { analysisRequest.current++; };
  }, [project, notify]);

  useEffect(() => {
    if (!hydrated || tourOriginal.current) return;
    const ticket = ++saveRequest.current;
    setSaveState('pending');
    const timer = setTimeout(() => {
      saveProject(project).then(() => { if (ticket === saveRequest.current) setSaveState('saved'); })
        .catch(() => { if (ticket === saveRequest.current) { setSaveState('error'); notify('本地保存失败，请导出项目文件备份。'); } });
    }, 650);
    return () => clearTimeout(timer);
  }, [project, hydrated, notify]);

  useEffect(() => {
    if (previewStep === null) { setPreviewAnalysis(undefined); return; }
    let cancelled = false;
    setPreviewAnalysis(undefined);
    analyzeAsync({ ...project, cursor: previewStep }, project.mode === 'learn' ? lesson.goal : undefined).then(result => { if (!cancelled) setPreviewAnalysis(result); }).catch(error => notify(errorText(error)));
    return () => { cancelled = true; };
  }, [previewStep, project, lesson.goal, notify]);

  useEffect(() => {
    if (!compareLast || project.cursor === 0) { setPreviousAnalysis(undefined); return; }
    let cancelled = false;
    analyzeAsync({ ...project, cursor: project.cursor - 1 }, project.mode === 'learn' ? lesson.goal : undefined).then(result => { if (!cancelled) setPreviousAnalysis(result); }).catch(error => notify(errorText(error)));
    return () => { cancelled = true; };
  }, [compareLast, project, lesson.goal, notify]);

  useEffect(() => {
    if (modal !== 'edit' || !selected) { setEditBase(undefined); return; }
    let cancelled = false; setEditBase(undefined);
    analyzeAsync({ ...project, cursor: project.cuts.findIndex(c => c.id === selected.id) }).then(result => { if (!cancelled) setEditBase(result); }).catch(() => { if (!cancelled) setEditBase(undefined); });
    return () => { cancelled = true; };
  }, [modal, selected, project]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saveState !== 'saved') event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [saveState]);

  async function saveNow() {
    if (tourOriginal.current) { notify('引导练习仅在当前页面体验，原作品已安全保存。'); return; }
    const snapshot = documentRef.current;
    try {
      await saveProject(snapshot);
      if (documentRef.current.id === snapshot.id && documentRef.current.revision === snapshot.revision) {
        setSaveState('saved'); notify('已保存在这台设备。');
      }
    } catch (error) {
      if (documentRef.current.id === snapshot.id && documentRef.current.revision === snapshot.revision) {
        setSaveState('error'); notify(`保存失败：${errorText(error)}。请导出项目文件备份。`);
      }
    }
  }

  async function switchProject(next: ProjectDocument, inheritRecords = false) {
    if (tourOriginal.current) return;
    try {
      const source = documentRef.current;
      const current = endAttempt(source, 'left');
      await saveForTransition(current);
      if (documentRef.current.id !== current.id || documentRef.current.revision !== source.revision) { notify('保存期间作品有新的修改，请再次选择要打开的作品。'); return; }
      setAnalysis(undefined); setSelectedCut(undefined); setReplacing(undefined); setPreviewStep(null); setCompareLast(false); setStage(undefined); setZoom(1); setPrediction('');
      setRejectedDraft(undefined); setTargetFocus(undefined);
      const events = inheritRecords && next.participantId === current.participantId ? mergeEvents(current.events, next.events) : next.events;
      updateDocument(resumeAttempt({ ...next, events }));
      const directory = document.querySelector<HTMLDetailsElement>('details.lessons-section');
      if (directory && narrow) directory.open = false;
      setModal(null); setPendingLesson(undefined);
    } catch (error) { notify(`当前作品尚未保存，已保留在编辑台：${errorText(error)}`); }
  }

  async function acceptEdit(next: ProjectDocument, message: string, event: string) {
    if (!revealed || busy) return;
    const changed = next.cuts.find((c, i) => JSON.stringify(c) !== JSON.stringify(documentRef.current.cuts[i]));
    const reject = (message: string, code: string) => {
      playSfx('reject');
      setRejectedDraft({ points: changed?.points ?? [], message });
      const current = documentRef.current;
      updateDocument({ ...current, events: withEvent(current, 'cut_rejected', { code, operation: event, cutId: changed?.id ?? '', step: changed ? next.cuts.indexOf(changed) + 1 : 0 }) });
      setBusy(false); notify(message);
    };
    const ticket = ++operationRef.current;
    const originalId = documentRef.current.id;
    const originalRevision = documentRef.current.revision;
    const proposed = { ...next, revision: originalRevision + 1 };
    setBusy(true);
    try {
      if ((event === 'modify_cut' || event === 'apply_repair') && proposed.cursor < proposed.cuts.length) {
        const wholeHistory = await analyzeAsync({ ...proposed, cursor: proposed.cuts.length });
        if (!wholeHistory.validSequence) { if (ticket === operationRef.current) { reject('这次修改会使后续历史中的剪口无法进入，原作品已保留。请调整剪口后重试。', 'invalid_future_sequence'); } return; }
      }
      const result = await analyzeAsync(proposed, proposed.mode === 'learn' ? getLesson(proposed.lessonId).goal : undefined);
      if (ticket !== operationRef.current || documentRef.current.id !== originalId || documentRef.current.revision !== originalRevision) return;
      if (!result.validSequence) {
        const issue = result.issues.find(i => i.code !== 'separated');
        reject(issue?.message ?? '这条剪口不能从当前纸边进入。请从纸边向内绘制。', issue?.code ?? 'invalid_cut'); return;
      }
      if (event === 'apply_repair' && (!result.goalPassed || result.status !== 'connected')) { reject('该修改未通过当前完整目标检查，原方案已保留。', 'goal_failed'); return; }
      setAnalysis(result); updateDocument({ ...proposed, events: withEvent(proposed, 'cut_applied', { operation: event, cutId: changed?.id ?? '', componentCount: result.componentCount, holeCount: result.holeCount }) }, { type: event, value: message });
      setRejectedDraft(undefined);
      playSfx(event === 'apply_repair' ? 'repair' : 'cut');
      if (event === 'add_cut') apprentice.complete('first-cut');
      if ((event === 'apply_repair' || (event === 'modify_cut' && analysis?.goalPassed === false)) && result.goalPassed) { apprentice.complete('first-repair'); setTourActions(old => ({ ...old, repair: true })); }
      if (!tourOriginal.current && proposed.cursor > 0 && proposed.cursor % 10 === 0) setBackupReminder(true);
      setTourActions(old => ({ ...old, cut: old.cut || event === 'add_cut', edit: old.edit || event === 'modify_cut' }));
      setSelectedCut(undefined); setReplacing(undefined); setPreviewStep(null); setModal(null); setStage(undefined);
      if (!tourOriginal.current) notify(message);
    } catch (error) { notify(errorText(error)); if (ticket === operationRef.current) setBusy(false); }
  }

  function cut(points: Point[], shape: CutShape) {
    if (isReadOnly) return;
    const source = documentRef.current;
    if (!replacing && source.cursor >= MAX_CUTS) { notify(`每张设计最多 ${MAX_CUTS} 刀，请新建另一张作品。`); return; }
    const nextCut: Cut = { id: replacing ?? uid(), shape, points, label: `${SHAPES.find(s => s.key === shape)!.label} ${replacing ? '· 修改' : source.cursor + 1}` };
    const cuts = replacing ? source.cuts.map(item => item.id === replacing ? nextCut : item) : [...source.cuts.slice(0, source.cursor), nextCut];
    acceptEdit({ ...source, cuts, cursor: replacing ? source.cursor : cuts.length }, replacing ? '已修改这一步，并重新检查后续每一刀。' : '剪口已完成，展开结果已更新。', replacing ? 'modify_cut' : 'add_cut');
  }

  function navigateHistory(direction: -1 | 1) {
    if (!revealed || busy) return;
    const source = documentRef.current;
    const cursor = Math.min(source.cuts.length, Math.max(0, source.cursor + direction));
    setPreviewStep(null); setSelectedCut(undefined); setReplacing(undefined); setStage(undefined);
    updateDocument({ ...source, cursor }, { type: direction === -1 ? 'undo' : 'redo', value: String(cursor) });
  }

  async function openWorks() {
    if (tourOriginal.current) return;
    setModal('works'); setArchiveLoading(true);
    try { await saveForTransition(documentRef.current); setArchive(await listProjects()); }
    catch (error) { notify(`作品列表读取失败：${errorText(error)}`); }
    finally { setArchiveLoading(false); }
  }

  function newProject() {
    const fresh = createProject();
    switchProject({ ...fresh, title: newTitle.trim() || '我的剪纸实验', paperSizeMm: newSize, foldMode: newFold, cuts: [], cursor: 0, participantId: project.participantId, feedbackMode: project.feedbackMode });
    setBackupReminder(true);
  }

  function startLesson() {
    if (!pendingLesson) return;
    const fresh = createProject(pendingLesson.id);
    switchProject(beginAttempt({ ...fresh, mode: 'learn', progress: project.progress.filter(p => p.lessonId !== pendingLesson.id), events: project.events, participantId: project.participantId, feedbackMode: project.feedbackMode }, 'practice'), true);
  }

  async function newParticipant() {
    const now = new Date().toISOString();
    const next = { ...project, id: uid(), title: `${project.title.slice(0, 105)} · 新观察`, createdAt: now, updatedAt: now, participantId: `anon-${uid()}`, progress: [], events: [] };
    await switchProject(next);
    if (documentRef.current.id === next.id) notify('已开始新的匿名参与记录。旧作品和记录仍保存在“我的作品”。');
  }

  function submitPrediction() {
    if (!prediction || revealed) return;
    const progress = [...project.progress.filter(p => p.lessonId !== lesson.id), { lessonId: lesson.id, prediction }];
    updateDocument({ ...project, progress, events: withEvent(project, 'prediction_submitted', { option: prediction, alreadySeenResult: false, questionVersion: 'v2', geometryRevision: project.revision }) });
    if (apprentice.complete('first-prediction')) playSfx('success');
  }

  function completeLesson() {
    if (!analysis?.goalPassed || analysis.revision !== project.revision || busy || !progress?.prediction) return;
    const now = new Date().toISOString();
    updateDocument(endAttempt({ ...project, progress: project.progress.map(p => p.lessonId === lesson.id ? { ...p, completedAt: now } : p) }, 'completed', analysis.goalPassed), { type: lesson.transfer ? 'transfer_complete' : 'lesson_complete', value: `${Date.now() - Date.parse(project.createdAt)} ms` });
    notify('屏幕实验已记录。实剪仍需用纸验证。');
    playSfx('success');
  }

  function findRepairs() {
    if (!revealed || busy) return;
    if (!hinted) updateDocument({ ...project, events: withEvent(project, 'hint_opened', { hintType: 'repair_candidates' }) });
    setRepairsRequested(true);
    const repairSource = documentRef.current;
    const id = repairSource.id, revision = repairSource.revision;
    repairSearch.start(repairSource, repairSource.mode === 'learn' ? lesson.goal : undefined, result => {
      if (documentRef.current.id === id && documentRef.current.revision === revision) {
        updateDocument(documentRef.current, { type: 'repair_suggestions', value: `${result.length} 个可用建议` });
        setRepairs(result); setRepairsRequested(true);
      }
    }, error => notify(`未能生成建议：${errorText(error)}`), selectedCut ?? repairSource.cuts[(analysis?.firstSeparationStep ?? repairSource.cursor) - 1]?.id);
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    if (tourOriginal.current) return;
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('文件超过 1 MB，请选择本工坊导出的项目 JSON。');
      const next = parseProject(await file.text());
      if (next.cursor < next.cuts.length) {
        const fullSequence = await analyzeAsync({ ...next, cursor: next.cuts.length });
        if (!fullSequence.validSequence) throw new Error('撤销历史中包含无法执行的剪切步骤，原作品未替换。');
      }
      const result = await analyzeAsync(next, next.mode === 'learn' ? getLesson(next.lessonId).goal : undefined);
      if (!result.validSequence) throw new Error('项目含无法执行的剪切步骤，原作品未替换。');
      await switchProject({ ...next, id: uid(), title: `${next.title.slice(0, 110)} · 导入` });
    } catch (error) { notify(`导入失败：${errorText(error)}`); }
  }

  function openEdit(cut: Cut) {
    if (!revealed || busy) return;
    setFixedRight(false); setRejectedDraft(undefined);
    const xs = cut.points.map(p => p.x), ys = cut.points.map(p => p.y);
    setSelectedCut(cut.id); setEditX(Math.min(...xs)); setEditY(Math.min(...ys));
    setEditWidth(Math.max(...xs) - Math.min(...xs)); setEditHeight(Math.max(...ys) - Math.min(...ys));
    setModal('edit');
  }

  function applyParameterEdit() {
    if (!selected || !revealed) return;
    if (![editX, editY, editWidth, editHeight].every(Number.isFinite) || editWidth < 0.1 || editHeight < 0.1 || editWidth > project.paperSizeMm * 2 || editHeight > project.paperSizeMm * 2) { notify('请输入有效尺寸，宽高须在 0.1 mm 到纸张边长的两倍之间。'); return; }
    const xs = selected.points.map(p => p.x), ys = selected.points.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
    const points = selected.points.map(p => ({ x: Math.round((editX + (p.x - minX) / width * editWidth) * 100) / 100, y: Math.round((editY + (p.y - minY) / height * editHeight) * 100) / 100 }));
    acceptEdit({ ...project, cuts: project.cuts.map(c => c.id === selected.id ? { ...c, points } : c) }, '剪口参数已更新，后续步骤已经重新检查。', 'modify_cut');
  }

  function runExport(kind: 'project' | 'svg' | 'print' | 'print-file' | 'records') {
    try {
      if ((kind === 'svg' || kind === 'print' || kind === 'print-file') && !canExportResult) { notify('先留下预测，并等待本次计算完成，再查看完整结果。'); return; }
      if (kind === 'project') { downloadProject(project); setBackupReminder(false); }
      if (kind === 'records') downloadLearningRecords(project);
      if (kind === 'svg' && analysis) downloadSvg(project, analysis);
      if ((kind === 'print' || kind === 'print-file') && analysis) {
        const printable = canExplain ? analysis : { ...analysis, firstSeparationStep: undefined, issues: analysis.issues.filter(i => i.code !== 'separated') };
        if (kind === 'print') openPrint(project, printable); else downloadPrintHtml(project, printable);
        setPrintBlocked(false); setTourActions(old => ({ ...old, print: true }));
        if (apprentice.complete('print-template')) playSfx('success');
      }
    } catch (error) { if (kind === 'print') setPrintBlocked(true); notify(errorText(error)); }
  }

  function locateTarget(group: 'retained' | 'removed') {
    setShowTargets(true); setTargetFocus(group); setCanvasTab('folded');
    requestAnimationFrame(() => document.querySelector('[data-tour="folded-canvas"]')?.scrollIntoView({ block: 'center' }));
  }
  function parameterPoints(): Point[] {
    if (!selected) return [];
    const xs = selected.points.map(p => p.x), ys = selected.points.map(p => p.y);
    const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
    return selected.points.map(p => ({ x: editX + (p.x - x) / w * editWidth, y: editY + (p.y - y) / h * editHeight }));
  }
  function prepareTourScene(step: number, extended: boolean) {
    const lessonId = extended && (step === 5 || step === 6) ? 'bridge' : extended && step === 7 ? 'transfer-symmetry' : 'half';
    const fresh = createProject(lessonId);
    const demo = step > 1 && !(extended && step === 7);
    const next = beginAttempt({ ...fresh, title: `${getLesson(lessonId).title} · 引导练习`, mode: 'learn', events: [], progress: demo ? [{ lessonId, prediction: '引导示范（不是独立预测）' }] : [] }, 'onboarding');
    updateDocument(demo ? { ...next, events: withEvent(next, 'tour_demo', { independent: false }) } : next);
    setPrediction(''); setSelectedCut(undefined); setPreviewStep(null); setRejectedDraft(undefined); setStage(step === 3 ? 0 : undefined);
    setCanvasTab(step === 3 ? 'result' : 'folded');
  }
  async function startTour(step = 0, extended = false) {
    if (tourOriginal.current || !hydrated) return;
    const original = documentRef.current;
    await saveForTransition(original);
    if (documentRef.current.revision !== original.revision) { notify('作品刚有修改，请再打开引导。'); return; }
    tourOriginal.current = original;
    rememberWelcomeChoice('tour');
    setWelcome(false); setIntroduction(false); setInspiration(false); setModal(null); setPendingLesson(undefined);
    prepareTourScene(step, extended);
    setExtendedTour(extended); setTourActions({ cut: false, edit: false, unfold: false, problem: false, repair: false, print: false }); setTourStep(step); setSaveState('saved');
  }
  function endTour(completed = false) {
    rememberWelcomeChoice('skip');
    rememberOnboarding(completed ? 'completed' : 'skipped'); setWelcome(false);
    if (!tourOriginal.current && !completed) apprentice.dismiss();
    const original = tourOriginal.current;
    if (original) {
      // A detached record can be explicitly downloaded during the tour. Never overwrite the original or latest archive with the rehearsal.
      tourOriginal.current = null;
      updateDocument(original); setPrediction(''); setSelectedCut(undefined); setPreviewStep(null);
      setRejectedDraft(undefined); setStage(undefined); setCompareLast(false); setModal(null);
    }
    setTourStep(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-tour-entry]')?.focus());
  }
  function moveTour(step: number, explanationOnly = false) {
    if (explanationOnly) updateDocument({ ...project, events: withEvent(project, 'tour_explanation_only', { step: (tourStep ?? 0) + 1 }) });
    // Passing prediction in explanation-only mode does not reveal or submit an answer.
    if (step === 2 && !revealed) {
      updateDocument({ ...documentRef.current, mode: 'create', events: withEvent(documentRef.current, 'tour_demo', { independent: false }) });
    }
    setTourStep(step); setModal(null); setPreviewStep(null);
    if (extendedTour && (step === 5 || step === 7 || (step === 6 && project.lessonId !== 'bridge'))) prepareTourScene(step, true);
    if (step === 2 || step === 4) setCanvasTab('folded');
    if (step === 3) { setCanvasTab('result'); setStage(0); }
  }
  function openApprentice(taskId: ApprenticeTaskId) {
    rememberWelcomeChoice('apprentice');
    apprentice.resume(); setWelcome(false); setInspiration(false);
    if (taskId === 'tour-interface') { setIntroduction(true); return; }
    startTour(TASKS.find(task => task.id === taskId)!.step, true);
  }
  function openGuide(section: GuideSection = 'about', playFilm = false) {
    setGuideSection(section); setPlayGuideFilm(playFilm); setModal('manual');
  }
  function locateSeparation() {
    if (!canExplain || !analysis?.firstSeparationStep) return;
    const step = analysis.firstSeparationStep;
    setSelectedCut(project.cuts[step - 1]?.id); setPreviewStep(step === project.cursor ? null : step);
    setTourActions(old => ({ ...old, problem: true }));
    if (apprentice.complete('find-problem')) playSfx('success');
    if (tourStep === null) document.querySelector('[data-tour="history"]')?.scrollIntoView({ block: 'center' });
  }
  function advanceUnfold() {
    if (stage === undefined) return;
    const next = Math.min(totalStages, stage + 1); setStage(next); playSfx('unfold');
    setTourActions(old => ({ ...old, unfold: next === totalStages }));
    if (next === totalStages && apprentice.complete('first-unfold')) playSfx('success');
  }

  const statusLabel = busy ? '正在计算' : !shown ? '等待计算' : ({ connected: '纸张连成一片', separated: `${shown.componentCount} 片独立纸张`, uncertain: '边界需要检查', empty: '没有保留的纸', invalid: '剪切过程需检查' })[shown.status];
  const paperPercent = shown ? Math.round(shown.areaMm2 / project.paperSizeMm ** 2 * 100) : 0;
  const conflict = project.mode === 'learn' && lesson.goal.requireConnected && analysis && analysis.componentCount > 1;

  return <div className="app-shell" data-mode={project.mode} data-canvas-tab={canvasTab} data-prediction-pending={!revealed}>
    <header className="site-header">
      <a className="brand" href="#workshop" aria-label="纸上有数首页" onClick={event => { event.preventDefault(); setInspiration(false); setModal(null); window.scrollTo({top:0}); }}><span className="brand-mark" aria-hidden="true"><Scissors size={23}/></span><span className="brand-name">纸上有数<span>PAPER · PATTERN · POSSIBILITY</span></span></a>
      <WorkshopNavigation inspiration={inspiration} modal={modal} introduction={introduction || (tourStep !== null && extendedTour)} tour={tourStep !== null && !extendedTour} hydrated={hydrated} onWorkshop={() => { setInspiration(false); setModal(null); document.getElementById('workshop')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }} onInspiration={() => { setInspiration(true); setModal(null); }} onManual={() => openGuide('about')} onWorks={openWorks} onApprentice={() => openApprentice(apprentice.next ?? 'tour-interface')} onTour={() => startTour()}/>
      <WorkshopSettings/>
    </header>

    <StorageNotice onBackup={() => runExport('project')}/><main id="workshop" hidden={inspiration}>
      <section className="workshop-intro">
        <div><div className="eyebrow intro-eyebrow"><span className="little-line"/> 交互式剪纸与几何实验室 <span className="edition">VOL. 04</span></div><h1>一纸之间，<span>万象可见。</span></h1><p>折叠，对称，连通。让每一次剪切，都成为一次发现。</p></div>
        <Hero compact={project.mode === 'learn'}/>
      </section>

      <section className="workbench" aria-label="剪纸实验工作台">
        <div className="workbench-bar"><div className="work-title"><span className="red-dot"/><span>{project.title}</span><span className="version-label">{project.mode === 'learn' ? '学习实验' : '自由创作'}</span></div><div className="work-actions" data-tour="export">
          <span className={`save-label ${saveState === 'error' ? 'save-error' : ''}`} role="status">{saveState === 'saved' ? <CheckCheck size={13}/> : saveState === 'error' ? <CircleHelp size={13}/> : <Clock3 size={13}/>}<span>{tourStep !== null ? '引导练习 · 不自动存档' : saveState === 'saved' ? '已自动保存' : saveState === 'error' ? '保存失败' : '正在保存'}</span></span>
          <button className="bar-button" onClick={() => setModal('new')} disabled={!hydrated}><FilePlus2 size={15}/><span>新建</span></button><button className="bar-button" onClick={saveNow} disabled={!hydrated}><Save size={15}/><span>保存</span></button><button className="bar-button" onClick={() => importInput.current?.click()} disabled={!hydrated}><Upload size={15}/><span>导入</span></button><button className="bar-button" onClick={() => setModal('export')}><Download size={15}/><span>导出</span></button><button className="print-button" onClick={() => runExport('print')} disabled={!canExportResult}><Printer size={15}/>打印纸样</button>
          <input ref={importInput} type="file" accept=".json,application/json" className="sr-only" data-testid="project-import" aria-label="导入项目文件" onChange={importProject}/>
        </div></div>

        {printBlocked && <div className="print-fallback" role="status"><span>打印窗口被拦截。下载文件后，在浏览器中打开即可打印。</span><button className="small-button" disabled={!canExportResult} onClick={() => runExport('print-file')}>导出打印文件</button></div>}{backupReminder && <div className="backup-reminder"><span>为这张纸留一份备份，换设备也能继续。</span><button className="small-button" onClick={() => runExport('project')}>导出项目备份</button><button aria-label="稍后备份" onClick={() => setBackupReminder(false)}><X size={15}/></button></div>}<>{!revealed && <p className="prediction-gate-note">先留下预测，再查看完整结果；题目剪口暂时锁定，项目备份仍可用。</p>}</><div className="workbench-body">
          <aside className="left-rail" aria-label="实验与剪切工具"><WorkshopFilmDock onOpen={() => openGuide('about', true)}/><ApprenticeTasks state={apprentice.state} onTask={openApprentice} onDismiss={() => { apprentice.dismiss(); rememberOnboarding('skipped'); }} collapsedInitially={returningDevice}/>
            <div className="mode-switch"><button className={project.mode === 'create' ? 'active' : ''} onClick={() => { if (project.mode !== 'create') updateDocument({ ...endAttempt(project, 'left'), mode: 'create' }); }}>自由创作</button><button className={project.mode === 'learn' ? 'active' : ''} onClick={() => { if (project.mode !== 'learn') setPendingLesson(lesson); }}>循序学习</button></div>
            <details className="rail-section lessons-section" data-tour="lesson-entry" open={!narrow}><summary className="mobile-lessons-summary">当前实验 · {lesson.title}<span>换一课</span></summary><div className="section-label"><span>实验章节</span><BookOpen size={14}/></div>
              {UNITS.map((unit, i) => <div className="lesson-group" key={unit}><div className="unit-title"><UnitMotif index={i}/><span className="unit-number">0{i + 1}</span>{unit}</div>{LESSONS.filter(l => !l.transfer && l.unit.includes(unit)).map(item => <button key={item.id} className={`lesson-link ${project.lessonId === item.id ? 'selected' : ''}`} onClick={() => setPendingLesson(item)}><span>{item.title}</span>{project.progress.some(p => p.lessonId === item.id && p.completedAt) ? <Check size={13}/> : <ChevronRight size={13}/>}</button>)}</div>)}
              <details className="transfer-list"><summary>试试新题 <span>{LESSONS.filter(item => item.transfer).length}</span><ChevronDown size={13}/></summary>{LESSONS.filter(l => l.transfer).map(item => <button className="lesson-link" key={item.id} onClick={() => setPendingLesson(item)}>{item.title.replace('新题：', '')}<ArrowRight size={12}/></button>)}</details>
            </details>
            <div className="rail-section"><div className="section-label"><span>折叠方式</span><Layers3 size={14}/></div><div className="fold-options">{([2, 4, 8] as FoldMode[]).map(fold => <button key={fold} aria-label={`${fold} 层折叠`} disabled={project.cuts.length > 0 || busy || project.mode === 'learn'} className={project.foldMode === fold ? 'active' : ''} onClick={() => updateDocument({ ...project, foldMode: fold })}><span className={`fold-symbol fold-${fold}`}/><strong>{fold} 层</strong></button>)}</div><p className="microcopy">{project.cuts.length ? '首刀后折法固定；新建可更换。' : '选择折法后，从纸边开始剪切。'}</p></div>
            <div className="rail-section tools-section"><div className="section-label"><span>剪切工具</span><Scissors size={14}/></div><div className="tool-options">{SHAPES.map(item => <button key={item.key} className={tool === item.key ? 'active' : ''} onClick={() => { setTool(item.key); setReplacing(undefined); }} aria-pressed={tool === item.key}><item.icon size={17}/><span>{item.label}</span>{tool === item.key && <span className="tool-key">已选</span>}</button>)}</div><p className="tool-help"><MousePointer2 size={13}/><span>{tool === 'polygon' ? '依次点击顶点，再点“闭合并剪切”。Esc 取消。' : '在折叠纸边缘拖拽，松开完成一刀。须从当前纸边进入。'}</span></p></div>
            <button className="rail-help" onClick={() => openGuide('practice')}><CircleHelp size={15}/>第一次来到工坊？<ArrowUpRightSmall/></button>
          </aside>

          <div className="canvas-workspace">
            <div className="workspace-top"><span className="workspace-meta"><span className="numeric">{String(project.cursor).padStart(2, '0')}</span> 道剪口 <span className="dot-divider">·</span> {project.paperSizeMm} × {project.paperSizeMm} mm</span><div className="workspace-tools"><button className={guides ? 'icon-button active' : 'icon-button'} onClick={() => setGuides(!guides)} aria-label="显示或隐藏折线" aria-pressed={guides}><Grid2X2 size={16}/></button><span className="control-divider"/><button className="icon-button" onClick={() => navigateHistory(-1)} disabled={!project.cursor || busy || !revealed} aria-label="撤销"><Undo2 size={17}/></button><button className="icon-button" onClick={() => navigateHistory(1)} disabled={project.cursor >= project.cuts.length || busy || !revealed} aria-label="重做"><Redo2 size={17}/></button></div></div>
            {previewStep !== null && <div className="preview-banner"><Eye size={14}/>正在回看第 {previewStep} 步，作品未被修改。<button onClick={() => { setPreviewStep(null); setSelectedCut(undefined); }}>返回当前设计 <X size={13}/></button></div>}
            {replacing && <div className="preview-banner"><Pencil size={14}/>在左侧重新绘制第 {project.cuts.findIndex(c => c.id === replacing) + 1} 刀，将重新检查后续步骤。<button onClick={cancelReplace}>取消 <X size={13}/></button></div>}

            <div className="mobile-canvas-tabs" role="group" aria-label="画布视图"><button aria-pressed={canvasTab === 'folded'} onClick={() => setCanvasTab('folded')}>绘制 · 折叠纸</button><button aria-pressed={canvasTab === 'result'} onClick={() => setCanvasTab('result')}>观察 · 展开纸</button></div><div className="dual-canvas">
              <section className="folded-pane" data-mobile-panel="folded" data-tour="folded-canvas"><div className="pane-label"><span className="label-index">A</span><div><h2>在折叠中，落下一剪</h2><span>FOLD & CUT</span></div></div><div className="folded-canvas-wrap"><FoldedCanvas size={project.paperSizeMm} fold={project.foldMode} regions={shown?.folded ?? EMPTY_REGIONS} tool={tool} onCut={cut} disabled={isReadOnly} selected={selected} guides={guides} replacing={!!replacing} onCancelReplace={cancelReplace} goal={goalMarkers} targetFocus={targetFocus} rejectedDraft={rejectedDraft} onClearRejected={() => setRejectedDraft(undefined)}/></div><div className="fold-card-note"><span className="small-rule"/><span>{FOLD_NAMES[project.foldMode]}<br/><strong>{project.foldMode} 层叠合 · 每一层同时裁切</strong></span></div><button className="text-action" onClick={() => { setStage(stage === undefined ? 0 : undefined); setCompareLast(false); setCanvasTab('result'); }} disabled={!analysis || !revealed}>{stage === undefined ? <><Layers3 size={14}/>看纸是怎样展开的 <ArrowRight size={14}/></> : <><RotateCcw size={14}/>返回完整展开图</>}</button></section>

              <section className="unfolded-pane" data-mobile-panel="result" data-tour="unfold-controls"><div className="pane-label"><span className="label-index">B</span><div><h2>{stage !== undefined ? '一层一层，看见对称' : compareLast ? '一刀前后，发生了什么' : '在展开时，看见万象'}</h2><span>{stage !== undefined ? 'UNFOLD STEP BY STEP' : compareLast ? 'BEFORE & AFTER' : 'UNFOLD & DISCOVER'}</span></div><span className="live-label"><span/>{busy ? '计算中' : '实时展开'}</span></div>
                <div className={`artboard ${!revealed ? 'artboard-hidden' : ''}`}>
                  <span className="corner-mark top-left"/><span className="corner-mark top-right"/><span className="corner-mark bottom-left"/><span className="corner-mark bottom-right"/>
                  {revealed && shown ? (compareLast && previousAnalysis ? <div className="inline-comparison"><div><span>上一刀之前</span><ResultCanvas analysis={previousAnalysis} size={project.paperSizeMm} fold={project.foldMode} small/></div><div><span>当前设计</span><ResultCanvas analysis={shown} size={project.paperSizeMm} fold={project.foldMode} small/></div></div> : <ResultCanvas analysis={shown} size={project.paperSizeMm} fold={project.foldMode} guides={guides} zoom={zoom} stage={stage} highlight={highlight} goal={goalMarkers} targetFocus={targetFocus}/>) : revealed ? <div className="canvas-loading"><LoaderCircle size={25} className="spinning"/><span>正在展开这张纸</span></div> : null}
                  {!revealed && <div className="prediction-cover"><span className="prediction-cover-mark">想 · 一 · 想</span><h3>先留下你的预测</h3><p>先完成本页的预测，再展开观察。</p><button className="primary-button" onClick={() => document.querySelector('[data-tour="prediction"]')?.scrollIntoView({ block: 'center' })}>去预测 <ArrowRight size={16}/></button></div>}
                  <div className="artboard-bottom"><span className="scale-indicator"><span/>{project.paperSizeMm} mm</span><div className="zoom-control"><button className="icon-button" onClick={() => setZoom(Math.max(.65, zoom - .15))} disabled={zoom <= .65 || compareLast} aria-label="缩小作品"><Minus size={13}/></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" onClick={() => setZoom(Math.min(2, zoom + .15))} disabled={zoom >= 2 || compareLast} aria-label="放大作品"><Plus size={13}/></button><button className="icon-button" onClick={() => setZoom(1)} aria-label="恢复画布尺寸"><Maximize2 size={13}/></button></div></div>
                </div>
                {stage !== undefined ? <div className="unfold-controls"><button className="icon-button" disabled={stage === 0} onClick={() => setStage(Math.max(0, stage - 1))} aria-label="上一步展开"><ArrowLeft size={16}/></button><span>{stage === 0 ? '折叠状态' : `第 ${stage} 次展开`}<small> / {totalStages}</small></span><button className="icon-button" disabled={stage === totalStages} onClick={advanceUnfold} aria-label="下一步展开"><ArrowRight size={16}/></button></div> : <div className="result-legend"><span><i className="legend-paper"/>保留的纸</span><span><i className="legend-cut"/>裁去的部分</span>{revealed && !!shown && shown.componentCount > 1 && <span><i className="legend-fragment"/>独立纸片</span>}<button onClick={() => setCompareLast(!compareLast)} disabled={!project.cursor || !revealed || busy}>{compareLast ? '返回全图' : '对比上一刀'}<ArrowRight size={12}/></button></div>}
              </section>
            </div>

            <div className="workspace-filler" aria-hidden="true"/><section data-tour="history" className="history-section" aria-label="剪切历史"><div className="history-heading"><div><Clock3 size={14}/><h2>每一步，都有迹可循</h2><span>点击回看 · 双击修改</span></div><span className="numeric">{project.cursor} / {project.cuts.length}</span></div><div className="history-track"><button disabled={!revealed} className={`history-step history-origin ${previewStep === 0 ? 'selected' : ''}`} onClick={() => { setPreviewStep(0); setSelectedCut(undefined); }}><span className="history-thumbnail"><Square size={22}/></span><span>一张白纸</span><small>起点</small></button>{project.cuts.map((item, i) => { const Icon = SHAPES.find(s => s.key === item.shape)!.icon; const stepInfo = analysis?.steps.find(s => s.cutId === item.id); return <button key={item.id} disabled={!revealed} className={`history-step ${i >= project.cursor ? 'history-undone' : ''} ${selectedCut === item.id ? 'selected' : ''}`} onClick={() => { setSelectedCut(item.id); setPreviewStep(i + 1 === project.cursor ? null : i + 1); }} onDoubleClick={() => { if (i < project.cursor) { setPreviewStep(null); openEdit(item); } }} aria-label={`回看第 ${i + 1} 刀 ${(!revealed || lesson.transfer) && project.mode === 'learn' ? `第${i + 1}刀` : item.label}`}><span className="history-thumbnail"><Icon size={24}/><span className="history-number">{String(i + 1).padStart(2, '0')}</span>{canExplain && stepInfo?.newlySeparated && <span className="history-warning" title="这一步新增了分离区域"/>}</span><span>{(!revealed || lesson.transfer) && project.mode === 'learn' ? `第${i + 1}刀` : item.label}</span><small>{i >= project.cursor ? '已撤销' : canExplain && stepInfo?.newlySeparated ? '出现分离' : '剪切完成'}</small></button>; })}<div className="history-next"><Plus size={20}/><span>下一刀，<br/>由你决定。</span></div></div>{selected && <div className="history-selection"><span>已选择：{selected.label}</span><button disabled={project.cuts.indexOf(selected) >= project.cursor || busy} onClick={() => { setPreviewStep(null); openEdit(selected); }}><SlidersHorizontal size={13}/>调整参数</button><button disabled={project.cuts.indexOf(selected) >= project.cursor || busy} onClick={() => { setPreviewStep(null); setReplacing(selected.id); setTool(selected.shape); }}><Pencil size={13}/>重新绘制</button><button onClick={() => { setSelectedCut(undefined); setPreviewStep(null); }} aria-label="取消历史选择"><X size={13}/></button></div>}</section>
          </div>

          <aside className="right-rail" aria-label="结构观察与学习反馈">
            <div className="right-heading"><span className="section-label">观察与发现</span><span className="observation-mark">观</span></div>
            {project.mode === 'learn' && !revealed ? <section className="prediction-panel" data-tour="prediction"><span className="eyebrow">{lesson.transfer ? '迁移练习 · 独立作答' : '先预测，再观察'}</span><h3>{lesson.prompt}</h3><div className="prediction-options">{lesson.predictionOptions.map((option, i) => <label className={prediction === option ? 'selected' : ''} key={option}><input type="radio" name="prediction" value={option} checked={prediction === option} onChange={() => setPrediction(option)}/><span className="option-letter">{String.fromCharCode(65 + i)}</span>{option}</label>)}</div><button className="primary-button full-width" onClick={submitPrediction} disabled={!prediction}>记录预测，展开观察 <ArrowRight size={15}/></button><p className="microcopy">答案不影响探索。预测会留在本机学习记录里。</p></section> : <>
              <section data-tour="diagnosis" className={`diagnosis-panel ${conflict ? 'diagnosis-warning' : ''}`}><div className="diagnosis-icon">{busy ? <LoaderCircle size={20} className="spinning"/> : shown?.status === 'connected' ? <Check size={20}/> : <Layers3 size={20}/>}</div><span className="diagnosis-overline">结构观察</span><h3 data-testid="geometry-status">{statusLabel}</h3><p>{!canExplain ? '观察纸片、孔洞和保留面积，检查当前实验目标。' : shown?.status === 'connected' ? '所有保留区域仍然相连。试着留意空白如何勾勒出图案。' : shown?.status === 'separated' ? conflict ? `本题希望保留一张完整的纸。第 ${shown.firstSeparationStep ?? '?'} 步出现分离，试着修改那一刀。` : '这些区域已经彼此分开。自由创作允许多片设计，它们可以成为你的构图。' : shown?.status === 'uncertain' ? '存在点接触或很细的边界，先检查局部，再用实物验证。' : shown?.status === 'empty' ? '纸已经被全部裁去。可以撤销一刀，留住一部分纸。' : '根据每一步的实际纸边检查剪切。'}</p>{canExplain && analysis?.firstSeparationStep && <button className="separation-location" onClick={locateSeparation}>第 {analysis.firstSeparationStep} 步出现分离 · 定位这一刀 <ArrowRight size={14}/></button>}<div className="paper-stats"><div><strong>{shown?.componentCount ?? '—'}</strong><span>片纸</span></div><div><strong>{shown?.holeCount ?? '—'}</strong><span>个孔洞</span></div><div><strong>{shown ? paperPercent : '—'}<small>%</small></strong><span>纸张保留</span></div></div></section>
              {project.mode === 'learn' && progress?.prediction && <div className="prediction-feedback"><span>{progress.prediction === lesson.expectedPrediction ? <Check size={14}/> : <Eye size={14}/>}你的预测：{progress.prediction}</span><p>{!canExplain ? '预测已记录，请根据展开结果观察。' : progress.prediction === lesson.expectedPrediction ? '预测与这个案例的结构相符。' : `这个案例的答案是「${lesson.expectedPrediction}」。结合展开图，再想一想。`}</p></div>}
              {project.mode === 'learn' && <section className="goal-panel"><div className="section-label">本次实验目标</div><label className="target-toggle"><input type="checkbox" checked={showTargets} onChange={e => setShowTargets(e.target.checked)}/>显示留 / 剪位置</label><ul>{(analysis?.goals.slice(3) ?? []).map((goal, i) => <li key={i} className={goal.passed ? 'passed' : ''}>{goal.passed ? <Check size={14}/> : <span className="goal-circle"/>}{goal.label.includes('指定') ? <button onClick={() => locateTarget(goal.label.includes('保留') ? 'retained' : 'removed')}>{goal.label.includes('保留') ? '留：标记处需要保留纸' : goal.passed ? '剪：标记处已剪去' : '剪：标记处还没有剪到'} · 定位</button> : goal.label}</li>)}</ul><details className="structure-details"><summary>结构检查详情</summary><ul>{(analysis?.goals.slice(0, 3) ?? []).map(goal => <li key={goal.label} className={goal.passed ? 'passed' : ''}>{goal.passed ? <Check size={14}/> : <span className="goal-circle"/>}{goal.label}</li>)}</ul></details><button className="small-button full-width" onClick={completeLesson} disabled={!analysis?.goalPassed || !!progress?.completedAt || busy}>{progress?.completedAt ? <><CheckCheck size={14}/>屏幕实验已记录</> : <>记录本次学习 <ArrowRight size={14}/></>}</button></section>}
              {project.mode === 'learn' && lesson.transfer && !hinted && <button className="small-button full-width" onClick={() => updateDocument({ ...project, events: withEvent(project, 'hint_opened', { hintType: 'explanation' }) })}>需要一点提示（记为有辅助）</button>}{hinted && lesson.transfer && <p className="hint-note">有辅助探索 · {project.feedbackMode === 'explained' ? lessonHint(lesson) : '基础反馈保持结构结果，可主动比较修改建议。'}</p>}{canExplain && <section className="insight-panel"><div className="section-label"><span><Sparkles size={14}/>这一剪，为什么</span></div><p>{project.mode === 'learn' ? lesson.knowledge : '折叠让多层纸重合，同一刀会出现在每个对应位置。落在折线上的剪口，展开后可能接成同一个孔。'}</p><button className="text-action" onClick={() => openGuide('practice')}>认识折叠与对称 <ArrowRight size={13}/></button></section>}
              {canExplain && !!analysis?.issues.length && <div className="issues-panel">{analysis.issues.slice(0, 3).map((issue, i) => <p key={i}><CircleHelp size={13}/><span>{issue.message}</span></p>)}</div>}
              {!!analysis && analysis.componentCount > 1 && <section className="repair-panel" data-tour="repair"><div className="section-label">试着留住连接</div><p>修改原剪口，并用新纸重新制作。</p><button className="small-button full-width" onClick={findRepairs} disabled={repairsBusy || busy}>{repairsBusy ? <LoaderCircle size={14} className="spinning"/> : <SlidersHorizontal size={14}/>}比较修改建议</button><RepairWait search={repairSearch}/>{repairsRequested && !repairsBusy && repairs.length === 0 && <p className="microcopy">当前没有满足目标的自动建议。可以撤销或手动修改原剪口。</p>}{repairs.map(repair => <button key={repair.id} className="repair-link" onClick={() => setCandidate(repair)}><span>{repair.title}<small>查看原方案与修改方案</small></span><ArrowRight size={14}/></button>)}</section>}
            </>}
            {revealed && (!lesson.transfer || hinted || project.mode === 'create') && <RealCutVideo lessonId={lesson.id} compact/>}<div className="paper-note"><span className="paper-note-number">记 / 01</span><p>纸张连通，<br/>不等于纸张牢固。</p><span>屏幕上的发现，<br/>值得在一张真纸上再试一次。</span><button onClick={() => runExport('print')} disabled={!canExportResult}><Printer size={13}/>把实验带到纸上 <ArrowRight size={13}/></button></div>
          </aside>
        </div>
        <div className="workbench-footer"><span><span className="online-dot"/>毫米坐标设计 · 本地几何计算</span><span>红色是纸，空白也是作品的一部分。</span><button onClick={() => openGuide('practice')}>快捷操作与说明 <CircleHelp size={13}/></button></div>
      </section>

      <footer className="site-footer"><span>纸上有数 <span className="footer-separator">/</span> 让几何在指尖发生</span><span>互动学习实验作品 <span className="footer-separator">·</span> v{APP_VERSION}</span></footer>
    </main>

    {inspiration && <InspirationLibrary onClose={() => setInspiration(false)} onTryLesson={id => { setInspiration(false); setPendingLesson(getLesson(id)); }}/>}
    {introduction && <ApprenticeIntroduction onClose={() => setIntroduction(false)} onComplete={() => { if (apprentice.complete('tour-interface')) playSfx('success'); startTour(1, true); }}/>}
    {welcome && <WelcomeExperience onTour={() => startTour()} onSkip={() => endTour(false)} onApprentice={() => openApprentice('tour-interface')}/>}
    {tourStep !== null && <OnboardingTour step={tourStep} extended={extendedTour} busy={busy} ready={tourStep === 1 || (extendedTour && tourStep === 7) ? revealed : tourStep === 2 ? tourActions.cut : tourStep === 3 ? tourActions.unfold : tourStep === 4 ? tourActions.edit : extendedTour && tourStep === 5 ? tourActions.problem : extendedTour && tourStep === 6 ? tourActions.repair : extendedTour && tourStep === 8 ? tourActions.print : true} onMove={moveTour} onExit={endTour}/>}
    {toast && <div className="toast" role="status"><span>{toast}</span><button className="icon-button" onClick={() => setToast('')} aria-label="关闭提示"><X size={15}/></button></div>}

    {modal === 'new' && <Dialog title="从一张纸，重新开始" eyebrow="A NEW POSSIBILITY" onClose={closeModal}><p className="dialog-lead">当前作品会先保存到「我的作品」，然后打开一张空白纸。</p><label className="form-field">作品名称<input value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={80}/></label><div className="form-row"><label className="form-field">纸张边长（mm）<input type="number" min={80} max={180} value={newSize} onChange={e => setNewSize(Number(e.target.value))}/></label><label className="form-field">折叠方式<select value={newFold} onChange={e => setNewFold(Number(e.target.value) as FoldMode)}><option value={2}>2 层 · 对折</option><option value={4}>4 层 · 十字双折</option><option value={8}>8 层 · 八层团花</option></select></label></div><p className="microcopy">支持 80–180 mm 的正方形纸。更换尺寸使用新作品，避免改变原有模板。</p><div className="dialog-actions"><button className="secondary-button" onClick={closeModal}>留在当前作品</button><button className="primary-button" onClick={newProject} disabled={!Number.isFinite(newSize) || newSize < 80 || newSize > 180}><Plus size={16}/>保存当前并新建</button></div></Dialog>}

    {pendingLesson && <Dialog title={pendingLesson.title} eyebrow={`${pendingLesson.unit} / ${pendingLesson.transfer ? '迁移练习' : '学习实验'}`} onClose={closeLesson}><p className="dialog-lead">{pendingLesson.description}</p><ol className="lesson-guide">{lessonGuide(pendingLesson, false).map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol>{!pendingLesson.transfer && <RealCutVideo lessonId={pendingLesson.id}/>}<div className="lesson-start-note"><Save size={16}/><span>当前作品会保存到「我的作品」。实验从预设剪口开始，先预测，再展开。</span></div><div className="dialog-actions"><button className="secondary-button" onClick={closeLesson}>暂不切换</button><button className="primary-button" onClick={startLesson}>保存当前并开始 <ArrowRight size={16}/></button></div></Dialog>}

    {modal === 'works' && <Dialog title="我的纸上实验" eyebrow="SAVED ON THIS DEVICE" onClose={closeModal} wide><p className="dialog-lead">作品保存在当前浏览器。导出项目文件，可备份或带到另一台设备继续创作。</p>{!archiveLoading && <ProgressOverview projects={archive}/>} {archiveLoading ? <div className="empty-state"><LoaderCircle className="spinning"/>正在读取作品</div> : <div className="works-list">{archive.map(item => <button key={item.id} className={`work-list-item ${item.id === project.id ? 'current' : ''}`} onClick={() => { if (item.id === project.id) closeModal(); else switchProject(item); }}><div className="work-list-icon"><Scissors size={24}/></div><div><h3>{item.title}</h3><p>{item.foldMode} 层 · {item.paperSizeMm} mm · {item.cursor} 道剪口</p><small>{new Date(item.updatedAt).toLocaleString('zh-CN')}{item.id === project.id ? ' · 正在编辑' : ''}</small></div><ArrowRight size={17}/></button>)}{!archive.length && <p>本机还没有存档。关闭此窗口后，可以保存当前作品。</p>}</div>}<div className="dialog-actions"><button className="secondary-button" onClick={() => runExport('project')}><Download size={16}/>备份当前作品</button><button className="primary-button" onClick={() => setModal('new')}><Plus size={16}/>新建实验</button></div></Dialog>}

    {modal === 'export' && <Dialog title="把这一纸，带走" eyebrow="KEEP YOUR DISCOVERY" onClose={closeModal}><div className="export-options">{analysis && <ShareCardButton project={project} analysis={analysis} onError={notify} disabled={!canExportResult}/>}<button onClick={() => runExport('project')}><FolderOpen size={25}/><span><strong>项目文件</strong><small>JSON · 包含每一刀、历史和学习记录，可再次导入编辑</small></span><ArrowDownToLine size={17}/></button><button onClick={() => runExport('svg')} disabled={!canExportResult}><Shapes size={25}/><span><strong>矢量图案</strong><small>SVG · 按毫米输出展开作品，用于展示或排版</small></span><ArrowDownToLine size={17}/></button><button onClick={() => runExport('print')} disabled={!canExportResult}><Printer size={25}/><span><strong>A4 实剪模板</strong><small>包含折叠步骤、刀线和 100 mm 标尺，也可另存 PDF</small></span><ArrowRight size={17}/></button><button onClick={() => runExport('print-file')} disabled={!canExportResult}><Printer size={25}/><span><strong>导出打印文件</strong><small>HTML · 弹窗被拦截时，下载后用浏览器打开打印</small></span><ArrowDownToLine size={17}/></button><button onClick={() => runExport('records')}><BookOpen size={25}/><span><strong>匿名学习记录</strong><small>导出预测、操作和学习完成情况，仅处理本机数据</small></span><ArrowDownToLine size={17}/></button></div><p className="microcopy">{!revealed && '先留下预测，再查看完整结果。项目备份仍可下载。'}</p><p className="microcopy">打印时选「实际大小 / 100%」，先测量标尺再剪。几何结果不能代替实物检验。</p></Dialog>}

    {modal === 'edit' && selected && <Dialog title="重新考虑这一刀" eyebrow={selected.label} onClose={closeModal}><p className="dialog-lead">调整剪口的包围框。修改后将从第一刀重新计算，确认每一步都能从当时的纸边进入。</p><EditPreview size={project.paperSizeMm} fold={project.foldMode} points={parameterPoints()} regions={editBase?.folded ?? EMPTY_REGIONS}/>{!editBase && <p className="microcopy">正在读取这一刀之前的纸边…</p>}{rejectedDraft && <p className="edit-error" role="alert">此剪口尚未应用：{rejectedDraft.message}</p>}<label className="anchor-choice"><input type="checkbox" checked={fixedRight} onChange={e => setFixedRight(e.target.checked)}/>固定右侧纸边，把剪口向内收短</label><div className="form-row"><label className="form-field">左侧位置 X（mm）<input type="number" value={editX} onChange={e => setEditX(Number(e.target.value))} step="0.5"/></label><label className="form-field">顶部位置 Y（mm）<input type="number" value={editY} onChange={e => setEditY(Number(e.target.value))} step="0.5"/></label></div><div className="form-row"><label className="form-field">宽度（mm）<input type="number" value={editWidth} onChange={e => { const w = Number(e.target.value); if (fixedRight) setEditX(editX + editWidth - w); setEditWidth(w); }} min="0.1" step="0.5"/></label><label className="form-field">高度（mm）<input type="number" value={editHeight} onChange={e => setEditHeight(Number(e.target.value))} min="0.1" step="0.5"/></label></div><div className="dialog-actions"><button className="secondary-button" onClick={() => { setReplacing(selected.id); setTool(selected.shape); setPreviewStep(null); setModal(null); }}><Pencil size={15}/>在画布重画</button><button className="primary-button" disabled={busy} onClick={applyParameterEdit}>{busy && <LoaderCircle size={15} className="spinning"/>}检查并应用修改</button></div><p className="microcopy">这会修改设计模板。已经剪开的实物，需要换一张纸重新制作。</p></Dialog>}

    {candidate && analysis && <Dialog title={candidate.title} eyebrow="COMPARE BEFORE YOU CHANGE" onClose={closeCandidate} wide><p className="dialog-lead">{candidate.description.replace('保留最大横坐标位置', '固定右侧纸边，把剪口向内收短').replace('保留 最大横坐标位置', '固定右侧纸边，把剪口向内收短')}</p><div className="repair-comparison"><div><span className="comparison-label">原方案 · {analysis.componentCount} 片</span><ResultCanvas analysis={analysis} size={project.paperSizeMm} fold={project.foldMode} small/></div><ArrowRight size={22}/><div><span className="comparison-label">修改后 · {candidate.analysis.componentCount} 片</span><ResultCanvas analysis={candidate.analysis} size={project.paperSizeMm} fold={project.foldMode} small/></div></div><div className="repair-summary"><span>图案面积改变 {candidate.changedAreaMm2.toFixed(1)} mm²</span><span>孔洞 {candidate.analysis.holeCount} 个</span></div><p className="microcopy">建议已检查完整剪切序列和当前目标。这是回到原步骤修改模板，需要用新纸制作；不是给实物补纸。</p><div className="dialog-actions"><button className="secondary-button" onClick={closeCandidate}>保留原方案</button><button className="primary-button" disabled={busy} onClick={() => acceptEdit({ ...project, cuts: candidate.cuts, cursor: project.cursor }, `已应用「${candidate.title}」，请使用新纸制作。`, 'apply_repair')}><Check size={16}/>应用到设计</button></div></Dialog>}

    {modal === 'manual' && <WorkshopGuide initialSection={guideSection} playOnOpen={playGuideFilm} onClose={closeModal} onTour={() => { closeModal(); void startTour(); }}><div className="manual-grid"><section><h3><span>01</span>一张纸的实验顺序</h3><ol className="manual-steps"><li><strong>先预测。</strong>从实验章节开始，留下你的答案。</li><li><strong>再折剪。</strong>在左画布从纸边拖动剪口，多边形用点击顶点绘制。</li><li><strong>看展开。</strong>区分纸片与孔洞，逐层观察对称关系。</li><li><strong>改一刀。</strong>点击历史步骤回看，调整参数或重画，再比较结果。</li><li><strong>动手验证。</strong>打印实际大小纸样，测量标尺并做实物对照。</li></ol><h3><span>02</span>画布与快捷操作</h3><dl className="shortcut-list"><div><dt>矩形 / 三角形</dt><dd>拖拽绘制，松开剪切</dd></div><div><dt>多边形</dt><dd>点选顶点，再闭合剪切</dd></div><div><dt>Esc</dt><dd>取消当前绘制或关闭窗口</dd></div><div><dt>历史步骤</dt><dd>单击回看，双击修改</dd></div><div><dt>打印</dt><dd>实际大小 / 100%，不适应页面</dd></div></dl></section><section><h3><span>03</span>折法与结果的边界</h3><p>2 层：沿竖直中线把左半向右折。4 层：再把上半向下折。8 层：沿右下正方形的对角线，把下侧半边折向上侧，形成三角形。</p><p>首刀之后固定折法。所有叠层会一起被剪开。红色是留下的纸，空白是剪掉的部分；多片作品也可以是自由创作的选择。</p><p>软件使用 0.01 mm 计算网格，不能保证打印精度或纸张牢固。对点接触和细小连接，请检查后再实际制作。</p><h3><span>04</span>本机学习观察记录</h3><p>记录预测、修改次数和操作时间，不收集姓名，不自动上传。小规模试用只能支持初步观察。</p><label className="form-field">反馈展示方式<select value={project.feedbackMode} onChange={e => updateDocument({ ...project, feedbackMode: e.target.value as ProjectDocument['feedbackMode'] }, { type: 'feedback_mode', value: e.target.value })}><option value="explained">解释反馈：结构结果＋原因说明</option><option value="basic">基础反馈：结构结果</option></select></label><p className="microcopy">参与编号：{project.participantId}<br/>本作品记录 {project.events.length} 次操作。变更展示方式会记录，便于匹配任务试用。</p><button className="small-button" onClick={() => runExport('records')}><Download size={14}/>导出匿名记录</button><button className="small-button participant-button" onClick={newParticipant}><Plus size={14}/>开始新的匿名参与记录</button><p className="microcopy">先保存当前作品，再复制设计并生成新编号；旧记录会保留。</p></section></div></WorkshopGuide>}
  </div>;
}

function ArrowUpRightSmall() { return <MoveUpRight size={13}/>; }

function eventData(value: string) { const decoded = decodeLearningEvent({ value, type: 'inspect', at: new Date().toISOString() }); return decoded.legacy ? undefined : decoded; }
function readAttempt(project: ProjectDocument) {
  const start = [...project.events].reverse().find(e => e.type === 'attempt_start' && e.lessonId === project.lessonId);
  const data = start ? eventData(start.value) : undefined;
  return { id: data?.attemptId ?? `legacy-${project.id.slice(0, 100)}-${Array.from(project.id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0).toString(16)}`, origin: (data?.origin ?? 'practice') as 'practice' | 'onboarding' | 'study', startedAt: data ? start?.at : undefined };
}
function withEvent(project: ProjectDocument, type: string, metadata: Record<string, string | number | boolean | null>) {
  const attempt = readAttempt(project);
  return appendLearningEvent(project.events, makeLearningEvent({ type, lessonId: project.mode === 'learn' || attempt.origin === 'onboarding' ? project.lessonId : undefined, attemptId: attempt.id, origin: attempt.origin, feedbackMode: project.feedbackMode, metadata }));
}
function beginAttempt(project: ProjectDocument, origin: 'practice' | 'onboarding'): ProjectDocument {
  return { ...project, events: appendLearningEvent(project.events, makeLearningEvent({ type: 'attempt_start', lessonId: project.lessonId, attemptId: uid(), origin, feedbackMode: project.feedbackMode, metadata: { questionVersion: 'v2', alreadySeenResult: !!project.progress.find(p => p.lessonId === project.lessonId)?.prediction } })) };
}
function endAttempt(project: ProjectDocument, outcome: 'completed' | 'left', goalPassed = false): ProjectDocument {
  if (project.mode !== 'learn') return project;
  const attempt = readAttempt(project);
  if (project.events.some(e => e.type === 'attempt_end' && eventData(e.value)?.attemptId === attempt.id)) return project;
  const assisted = project.events.some(e => e.type === 'hint_opened' && eventData(e.value)?.attemptId === attempt.id);
  return { ...project, events: withEvent(project, 'attempt_end', { outcome, goalPassed, assisted, independent: !project.events.some(e => e.type === 'attempt_resumed' && eventData(e.value)?.attemptId === attempt.id), elapsedMs: attempt.startedAt ? Date.now() - Date.parse(attempt.startedAt) : null }) };
}
function mergeEvents(a: ProjectDocument['events'], b: ProjectDocument['events']) {
  const map = new Map([...a, ...b].map(e => [eventData(e.value)?.eventId ?? e, e]));
  return [...map.values()].sort((a,b) => a.at.localeCompare(b.at)).reduce((all, e) => appendLearningEvent(all, e), [] as ProjectDocument['events']);
}

function resumeAttempt(project: ProjectDocument): ProjectDocument {
  if (project.mode !== 'learn') return project;
  const attempt = readAttempt(project);
  if (!attempt.startedAt || project.events.some(e => e.type === 'attempt_end' && eventData(e.value)?.attemptId === attempt.id)) {
    const next = beginAttempt(project, 'practice');
    return { ...next, events: withEvent(next, 'attempt_resumed', { previousAttemptId: attempt.id, alreadySeenResult: !!project.progress.find(p => p.lessonId === project.lessonId)?.prediction, independent: false }) };
  }
  return project;
}
