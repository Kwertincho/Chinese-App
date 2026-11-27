import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BookOpen,
  User,
  Flame,
  Star,
  Lock,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Play,
  Layers,
  PenTool,
  Headphones,
  Mic,
  Volume2,
  Upload,
  Download,
  Plus,
  Search,
  FileSpreadsheet,
  FileJson,
  BookMarked,
  Info,
  Zap,
  Target,
  Swords,
  Clock,
  Trash2,
  MessageSquare,
  Languages,
  ArrowRight,
  AlertTriangle,
  FlaskConical,
  ScrollText,
  Pencil,
  Tag,
  LayoutGrid,
  Compass
} from 'lucide-react';
import {
  soundFX,
  SLOW_SPEECH_RATE,
  getAvailableMandarinVoices,
  getGlobalPreferredVoiceURI,
  setGlobalPreferredVoiceURI,
  resolveMandarinVoice
} from '../audio/soundEngine.js';
import {
  DEFAULT_COURSES,
  KNOWN_CHARACTER_INFO,
  SEMANTIC_RADICALS_25,
  STROKE_ORDER_RULES_7,
  SAMPLE_RAW_HSK_JSON,
  MODALITY_META,
  ADVANCED_MODE_UNLOCK_THRESHOLDS,
  getPlayerTitle
} from '../data/curriculumData.js';
import {
  enrichWordEntry,
  getLinguisticBadgeSummary
} from '../engine/lexiconEnricher.js';
import { annotateCorpusReadiness } from '../engine/corpusMiner.js';
import {
  stripToneMarks,
  parsePinyinSyllablesWithTones,
  normalizeWordEntry,
  getWordMasteryLevel,
  getMasteryTierMeta,
  getPreferredModalitiesForMastery,
  formatTotalStudyTime,
  formatTodayStudyTime,
  getWordSkillTelemetry,
  partitionLessonWordsIntoChunks,
  buildProportionalUnitNodes,
  getNodeCompletionLevel,
  computeNodeLevelXpMultiplier,
  SRS_ACTIVATION_MIN_WORDS,
  getWordSrsEntry,
  isWordSrsDue,
  getSrsOverdueMs,
  getLeechWords,
  countWordsAtLeastLevel,
  getClassifierDrillUnlockStatus,
  getDialogueQaUnlockStatus,
  getNumbersTimeLabUnlockStatus,
  buildConfusableDrillItems,
  COURSE_HSK_FILTER_PILLS,
  matchesCourseHskFilter,
  getCourseHskBandNumber,
  sortCourseLessonsNumerically,
  sortCoursesCanonically,
  isWordDiscovered,
  rankWeakestDiscoveredWords
} from '../utils/mandarinHelpers.js';
import { getMasterLexiconMap } from '../engine/linguisticDataLoader.js';
import {
  MandarinAudioControls,
  CharacterInspectModal,
  MasterySegmentedBar,
  PixelFlameSprite,
  PixelCoinSprite,
  PixelCrownSprite,
  PixelPadlockSprite,
  PixelBlockGauge,
  ScrollingText,
  InteractiveExampleText
} from './SharedHudAndAudio.jsx';
import {
  RuleExampleMiniPlayer,
  StrokeRuleIntuitionModal
} from './PracticeAndExamModals.jsx';
import { PhoneticsStudioView } from './PhoneticsStudioView.jsx';
import { StudyModesHub } from './StudyModesHub.jsx';

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// TAB 1: GAMIFIED WINDING PROGRESSION MAP VIEW (UNIFIED PROPORTIONAL PATH)
// ============================================================================
export function ProgressionMapView({
  progress,
  courses,
  activeCourse,
  activeLesson,
  activeWords,
  onSelectCourseAndLesson,
  speakMandarin,
  onSelectStageNode,
  onOpenLibraryImporter,
  onOpenModesGuide
}) {
  const [selectedStagePreview, setSelectedStagePreview] = useState(null);
  const [courseBandFilter, setCourseBandFilter] = useState('all');
  const [lessonPage, setLessonPage] = useState(0);

  const filteredMapCourses = useMemo(
    () =>
      sortCoursesCanonically(
        (Array.isArray(courses) ? courses : []).filter((c) =>
          matchesCourseHskFilter(c, courseBandFilter)
        )
      ),
    [courses, courseBandFilter]
  );

  const MAP_UNITS_PER_PAGE = 15;
  const activeCourseLessons = useMemo(
    () => sortCourseLessonsNumerically(activeCourse)?.lessons || [],
    [activeCourse]
  );
  const shouldPaginateLessons = activeCourseLessons.length > 20;
  const totalLessonPages = shouldPaginateLessons
    ? Math.max(1, Math.ceil(activeCourseLessons.length / MAP_UNITS_PER_PAGE))
    : 1;

  const isCourseLessonCompleted = useCallback(
    (lessonObj) => {
      if (!lessonObj || !activeCourse?.id) return false;
      const lKey = `${activeCourse.id}__${lessonObj.id}`;
      const lp = progress.lessonProgress?.[lKey];
      const bossStageId = buildProportionalUnitNodes(lessonObj.words || []).length;
      if (lp) {
        const bossLv = Number(lp.nodeLevels?.[String(bossStageId)] || 0);
        if (
          bossLv >= 1 ||
          (Array.isArray(lp.completedStages) && lp.completedStages.includes(bossStageId))
        ) {
          return true;
        }
      }
      if (
        activeCourse.id === 'course_default_unit1' &&
        lessonObj.id === 'lesson_unit_1' &&
        Array.isArray(progress.completedStages) &&
        progress.completedStages.includes(bossStageId)
      ) {
        return true;
      }
      return false;
    },
    [activeCourse?.id, progress.lessonProgress, progress.completedStages]
  );

  const firstIncompleteLessonIndex = useMemo(() => {
    if (activeCourseLessons.length === 0) return 0;
    const idx = activeCourseLessons.findIndex((lesson) => !isCourseLessonCompleted(lesson));
    return idx >= 0 ? idx : 0;
  }, [activeCourseLessons, isCourseLessonCompleted]);

  const safeLessonPage = Math.min(lessonPage, Math.max(0, totalLessonPages - 1));
  const pageStartIndex = shouldPaginateLessons ? safeLessonPage * MAP_UNITS_PER_PAGE : 0;
  const visibleMapLessons = shouldPaginateLessons
    ? activeCourseLessons.slice(pageStartIndex, pageStartIndex + MAP_UNITS_PER_PAGE)
    : activeCourseLessons;

  useEffect(() => {
    setSelectedStagePreview(null);
  }, [activeCourse.id, activeLesson.id]);

  useEffect(() => {
    if (!shouldPaginateLessons) {
      setLessonPage(0);
      return;
    }
    const activeIdx = activeCourseLessons.findIndex((l) => l.id === activeLesson.id);
    if (activeIdx >= 0) {
      setLessonPage(Math.floor(activeIdx / MAP_UNITS_PER_PAGE));
    } else {
      setLessonPage(0);
    }
  }, [activeCourse.id, activeLesson.id, shouldPaginateLessons]);

  const lessonKey = `${activeCourse.id}__${activeLesson.id}`;
  const isDefaultUnit1 =
    activeCourse.id === 'course_default_unit1' && activeLesson.id === 'lesson_unit_1';

  const currentLessonProg = progress.lessonProgress?.[lessonKey] || {
    unlockedStage: isDefaultUnit1 ? progress.unlockedStage : 1,
    completedStages: isDefaultUnit1 ? progress.completedStages : [],
    nodeLevels: {}
  };

  const getStageIcon = (iconName) => {
    switch (iconName) {
      case 'Layers':
        return Layers;
      case 'Target':
        return Target;
      case 'PenTool':
        return PenTool;
      case 'Headphones':
        return Headphones;
      case 'Mic':
        return Mic;
      case 'Sparkles':
        return Sparkles;
      case 'Flame':
        return Flame;
      case 'Trophy':
        return Swords;
      default:
        return Star;
    }
  };

  const stagesList = useMemo(
    () => buildProportionalUnitNodes(activeWords),
    [activeWords]
  );
  const totalChunksCount = useMemo(
    () => partitionLessonWordsIntoChunks(activeWords).length,
    [activeWords]
  );

  const getNodeHorizontalPercent = (idx, total) => {
    if (idx === total - 1) return 50;
    const cycle = [50, 24, 76, 50, 26, 74];
    return cycle[idx % cycle.length];
  };

  const activeStageObj =
    stagesList.find((s) => s.id === (selectedStagePreview || currentLessonProg.unlockedStage)) ||
    stagesList[0];

  const mapHeightPx = Math.max(630, (stagesList.length - 1) * 152 + 175);

  return (
    <div className="p-4 space-y-4">
      {/* Course & Lesson Selector Card */}
      <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
            Adventure World &amp; Unit Selector
          </span>
          <div className="flex items-center gap-2">
            {onOpenModesGuide && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  onOpenModesGuide();
                }}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1"
              >
                <Compass className="w-3 h-3" />
                <span>Modes Guide</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenLibraryImporter}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>+ Import HSK / JSON</span>
            </button>
          </div>
        </div>

        {/* Refined HSK Band Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {COURSE_HSK_FILTER_PILLS.map((pill) => {
            const count = (Array.isArray(courses) ? courses : []).filter((c) =>
              matchesCourseHskFilter(c, pill.id)
            ).length;
            const isSelected = courseBandFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setCourseBandFilter(pill.id);
                  const matching = sortCoursesCanonically(
                    (Array.isArray(courses) ? courses : []).filter((c) =>
                      matchesCourseHskFilter(c, pill.id)
                    )
                  );
                  if (matching.length > 0 && !matching.some((c) => c.id === activeCourse.id)) {
                    onSelectCourseAndLesson(matching[0].id, null);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 border transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-400 shadow'
                    : count === 0
                    ? 'bg-slate-950/60 text-slate-600 border-slate-800/80'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[9px] px-1 rounded ${
                    isSelected ? 'bg-rose-800/70 text-rose-100' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="relative">
            <select
              value={
                filteredMapCourses.some((c) => c.id === activeCourse.id)
                  ? activeCourse.id
                  : filteredMapCourses[0]?.id || ''
              }
              disabled={filteredMapCourses.length === 0}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectCourseAndLesson(e.target.value, null);
                }
              }}
              className="w-full appearance-none bg-slate-950 border border-slate-700 focus:border-rose-500 disabled:opacity-60 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-extrabold text-white outline-none"
            >
              {filteredMapCourses.length > 0 ? (
                filteredMapCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseName} ({course.lessons?.length || 1} Unit
                    {(course.lessons?.length || 1) > 1 ? 's' : ''})
                  </option>
                ))
              ) : (
                <option value="">No courses in this HSK band yet</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="rounded-[2px] bg-slate-950/90 border border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase text-amber-400 shrink-0">
              Active Course:
            </span>
            <ScrollingText
              text={`${activeCourse.courseName} — ${activeLesson.title} (${activeWords.length} Words)`}
              className="text-xs font-extrabold text-slate-200 flex-1"
            />
          </div>

          {activeCourseLessons.length > 1 && (
            <div className="space-y-2 pt-0.5">
              {shouldPaginateLessons && (
                <div className="flex items-center justify-between gap-1.5 flex-wrap rounded-xl bg-slate-950/90 border border-slate-800 px-2.5 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeLessonPage <= 0}
                      onClick={() => {
                        soundFX.playPop();
                        setLessonPage((p) => Math.max(0, p - 1));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[10px] font-black text-slate-200 inline-flex items-center gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Prev</span>
                    </button>
                    <span className="text-[10px] font-extrabold text-slate-300 px-1.5 tabular-nums">
                      Units {pageStartIndex + 1}–
                      {Math.min(pageStartIndex + MAP_UNITS_PER_PAGE, activeCourseLessons.length)}{' '}
                      of {activeCourseLessons.length}
                    </span>
                    <button
                      type="button"
                      disabled={safeLessonPage >= totalLessonPages - 1}
                      onClick={() => {
                        soundFX.playPop();
                        setLessonPage((p) => Math.min(totalLessonPages - 1, p + 1));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[10px] font-black text-slate-200 inline-flex items-center gap-0.5"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      const targetLesson = activeCourseLessons[firstIncompleteLessonIndex];
                      setLessonPage(Math.floor(firstIncompleteLessonIndex / MAP_UNITS_PER_PAGE));
                      if (targetLesson?.id && targetLesson.id !== activeLesson.id) {
                        onSelectCourseAndLesson(activeCourse.id, targetLesson.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-black text-amber-200"
                  >
                    Jump to Current
                  </button>
                </div>
              )}

              <div
                className={
                  shouldPaginateLessons
                    ? 'grid grid-cols-2 sm:grid-cols-3 gap-1.5'
                    : 'flex items-center gap-1.5 overflow-x-auto pb-1'
                }
              >
                {visibleMapLessons.map((lesson) => {
                  const isSelected = lesson.id === activeLesson.id;
                  const isCompleted = isCourseLessonCompleted(lesson);
                  const wordCount = lesson.words?.length || 0;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => onSelectCourseAndLesson(activeCourse.id, lesson.id)}
                      className={`game-btn-3d px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        shouldPaginateLessons ? 'w-full min-w-0' : 'shrink-0 max-w-[210px]'
                      } ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-400 shadow'
                          : isCompleted
                          ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {isCompleted && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                      <ScrollingText text={`${lesson.title} (${wordCount}w)`} className="flex-1" />
                    </button>
                  );
                })}
              </div>

              {shouldPaginateLessons && (
                <div className="flex items-center justify-between gap-1.5 flex-wrap rounded-xl bg-slate-950/90 border border-slate-800 px-2.5 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeLessonPage <= 0}
                      onClick={() => {
                        soundFX.playPop();
                        setLessonPage((p) => Math.max(0, p - 1));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[10px] font-black text-slate-200 inline-flex items-center gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Prev</span>
                    </button>
                    <span className="text-[10px] font-extrabold text-slate-300 px-1.5 tabular-nums">
                      Units {pageStartIndex + 1}–
                      {Math.min(pageStartIndex + MAP_UNITS_PER_PAGE, activeCourseLessons.length)}{' '}
                      of {activeCourseLessons.length}
                    </span>
                    <button
                      type="button"
                      disabled={safeLessonPage >= totalLessonPages - 1}
                      onClick={() => {
                        soundFX.playPop();
                        setLessonPage((p) => Math.min(totalLessonPages - 1, p + 1));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-[10px] font-black text-slate-200 inline-flex items-center gap-0.5"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      const targetLesson = activeCourseLessons[firstIncompleteLessonIndex];
                      setLessonPage(Math.floor(firstIncompleteLessonIndex / MAP_UNITS_PER_PAGE));
                      if (targetLesson?.id && targetLesson.id !== activeLesson.id) {
                        onSelectCourseAndLesson(activeCourse.id, targetLesson.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-black text-amber-200"
                  >
                    Jump to Current
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Unit Adventure World Banner */}
      <div className="rounded-[2px] bg-gradient-to-br from-rose-700 via-red-800 to-amber-800 border-2 border-amber-400 p-4 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 relative z-10 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-[2px] bg-slate-950/80 text-amber-300 border-2 border-amber-400/50">
            Proportional Path • {totalChunksCount} Chunk{totalChunksCount === 1 ? '' : 's'} ({activeWords.length} Words)
          </span>
          <span className="font-pixel-header text-[9px] text-amber-200 flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-[2px] border-2 border-amber-400/50">
            <PixelCrownSprite className="w-3.5 h-3.5" />
            <span>
              {currentLessonProg.completedStages.filter((id) => id <= stagesList.length).length}/
              {stagesList.length} Stages
            </span>
          </span>
        </div>
        <div className="mt-2 relative z-10">
          <ScrollingText
            text={activeLesson.title}
            className="font-hanzi text-lg font-black text-white"
          />
        </div>
        <div className="mt-0.5 relative z-10">
          <ScrollingText
            text={`Discovery → Meaning Quiz → Calligraphy → Skill Mix${
              activeWords.length >= 6 ? ' → Context Gauntlet' : ''
            } → Unit Boss Battle`}
            className="text-[11px] text-rose-100/95 font-semibold"
          />
        </div>
      </div>

      {/* WINDING VERTICAL ADVENTURE PATH OF SQUARE PIXEL GAME NODES */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-5 relative overflow-hidden shadow-2xl">
        <div className="w-40 h-40 rounded-full bg-rose-500/5 blur-3xl absolute top-6 left-4 pointer-events-none" />
        <div className="w-44 h-44 rounded-full bg-amber-500/5 blur-3xl absolute bottom-10 right-4 pointer-events-none" />

        <div className="relative w-full" style={{ height: `${mapHeightPx}px` }}>
          {/* SVG Winding Connecting Path */}
          <svg
            viewBox={`0 0 100 ${mapHeightPx}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {stagesList.slice(0, -1).map((stage, idx) => {
              const x1 = getNodeHorizontalPercent(idx, stagesList.length);
              const y1 = 70 + idx * 152;
              const x2 = getNodeHorizontalPercent(idx + 1, stagesList.length);
              const y2 = 70 + (idx + 1) * 152;
              const midY = (y1 + y2) / 2;
              const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

              const segNodeLevel = getNodeCompletionLevel(currentLessonProg, stage.id);
              const isSegCleared = segNodeLevel >= 1;
              const segStrokeColor =
                segNodeLevel >= 3
                  ? '#fbbf24'
                  : segNodeLevel === 2
                  ? '#10b981'
                  : segNodeLevel === 1
                  ? '#38bdf8'
                  : '#334155';

              return (
                <g key={`path-seg-${stage.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="4.5"
                    strokeLinecap="square"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={segStrokeColor}
                    strokeWidth="2.8"
                    strokeDasharray={isSegCleared ? 'none' : '4 4'}
                    strokeLinecap="square"
                  />
                </g>
              );
            })}
          </svg>

          {/* Render the Proportional Square Pixel Game Nodes along the winding path */}
          {stagesList.map((stage, idx) => {
            const StageIcon = getStageIcon(stage.iconName);
            const nodeLevel = getNodeCompletionLevel(currentLessonProg, stage.id);
            const isMaxed = nodeLevel >= 3;
            const isUnlocked = stage.id <= currentLessonProg.unlockedStage || nodeLevel >= 1;
            const isCurrent = stage.id === currentLessonProg.unlockedStage && nodeLevel === 0;

            const leftPercent = getNodeHorizontalPercent(idx, stagesList.length);
            const topPx = 22 + idx * 152;

            // 3-Level Progressive Square Perimeter Contour Fill (0% -> 33% -> 67% -> 100%)
            const squareSide = 88;
            const squarePerimeter = squareSide * 4;
            const ringProgress =
              nodeLevel >= 3 ? 1 : nodeLevel === 2 ? 2 / 3 : nodeLevel === 1 ? 1 / 3 : 0;
            const dashOffset = squarePerimeter * (1 - ringProgress);
            const contourTrackStroke =
              nodeLevel >= 3
                ? '#78350f'
                : nodeLevel === 2
                ? '#064e3b'
                : nodeLevel === 1
                ? '#0c4a6e'
                : isCurrent
                ? '#334155'
                : '#1e293b';
            const contourFillStroke =
              nodeLevel >= 3
                ? '#fbbf24'
                : nodeLevel === 2
                ? '#10b981'
                : nodeLevel === 1
                ? '#38bdf8'
                : '#334155';

            const levelSubBadgeText =
              nodeLevel >= 3 ? 'MAX 3/3' : `Lv.${nodeLevel}/3`;
            const levelSubBadgeClass =
              nodeLevel >= 3
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : nodeLevel === 2
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/70'
                : nodeLevel === 1
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/70'
                : 'bg-slate-950 text-slate-300 border-slate-600';

            const categoryBadgeStyle =
              stage.nodeCategory === 'gauntlet'
                ? 'bg-fuchsia-500/25 border-fuchsia-400/60 text-fuchsia-200'
                : stage.nodeCategory === 'mix'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                : stage.nodeCategory === 'boss'
                ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                : 'bg-sky-500/20 border-sky-400/40 text-sky-200';

            return (
              <div
                key={stage.id}
                style={{ left: `${leftPercent}%`, top: `${topPx}px` }}
                className="absolute -translate-x-1/2 flex flex-col items-center z-10"
              >
                {isCurrent && (
                  <div className="animate-float-bob -top-7 absolute whitespace-nowrap px-2.5 py-0.5 rounded-[2px] bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg border-2 border-amber-200 z-20">
                    ★ Start Here
                  </div>
                )}

                <div className="relative flex items-center justify-center w-24 h-24">
                  {/* Square Perimeter SVG Progress Border (<rect>): 0% | 33% Sky | 67% Emerald | 100% Gold */}
                  <svg className="w-24 h-24 pointer-events-none" viewBox="0 0 96 96">
                    <rect
                      x="4"
                      y="4"
                      width={squareSide}
                      height={squareSide}
                      fill="none"
                      stroke={contourTrackStroke}
                      strokeWidth="4"
                    />
                    {ringProgress > 0 && (
                      <rect
                        x="4"
                        y="4"
                        width={squareSide}
                        height={squareSide}
                        fill="none"
                        stroke={contourFillStroke}
                        strokeWidth="4.5"
                        strokeLinecap="square"
                        strokeDasharray={squarePerimeter}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-700"
                      />
                    )}
                  </svg>

                  {/* 80px x 80px Square Pixel Tile Node */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStagePreview(stage.id);
                      if (isUnlocked) {
                        onSelectStageNode(stage);
                      } else {
                        soundFX.playMistake();
                      }
                    }}
                    className={`game-btn-3d absolute w-20 h-20 rounded-[2px] flex items-center justify-center border-2 transition-all ${
                      isMaxed
                        ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 border-amber-200 text-slate-950'
                        : nodeLevel === 2
                        ? `bg-gradient-to-b ${stage.accentColor} border-emerald-300 text-white`
                        : nodeLevel === 1
                        ? `bg-gradient-to-b ${stage.accentColor} border-sky-300 text-white`
                        : isCurrent
                        ? `bg-gradient-to-b ${stage.accentColor} border-amber-300 text-white`
                        : isUnlocked
                        ? `bg-gradient-to-b ${stage.accentColor} border-slate-500 text-white`
                        : 'bg-slate-900 border-slate-700 text-slate-500 opacity-75'
                    }`}
                  >
                    {!isUnlocked ? (
                      <PixelPadlockSprite className="w-7 h-7" />
                    ) : (
                      <StageIcon className="w-8 h-8 stroke-[2.4px]" />
                    )}
                  </button>

                  {isMaxed && (
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-[2px] bg-slate-950 border-2 border-amber-400 flex items-center justify-center shadow-md z-10">
                      <PixelCrownSprite className="w-4 h-4" />
                    </div>
                  )}

                  {!isUnlocked && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-[2px] bg-slate-950 border-2 border-slate-600 flex items-center justify-center z-10">
                      <PixelPadlockSprite className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Node Title, 3-Level Pixel Sub-Badge & Category Badge */}
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-[2px] border whitespace-nowrap ${
                        isMaxed
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                          : nodeLevel === 2
                          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                          : nodeLevel === 1
                          ? 'bg-sky-500/15 border-sky-400/40 text-sky-200'
                          : isCurrent
                          ? 'bg-rose-500/20 border-rose-400/50 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-400'
                      }`}
                    >
                      {stage.shortTitle}
                    </span>
                    {isUnlocked && (
                      <span
                        className={`font-pixel-header text-[8px] px-1.5 py-0.5 rounded-[2px] border whitespace-nowrap ${levelSubBadgeClass}`}
                      >
                        {levelSubBadgeText}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.2 rounded-[2px] border whitespace-nowrap ${categoryBadgeStyle}`}
                  >
                    {stage.badgeText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected / Current Stage Quick Launch Footer Card */}
        {activeStageObj && (() => {
          const activeNodeLv = getNodeCompletionLevel(currentLessonProg, activeStageObj.id);
          const activeXpMult = computeNodeLevelXpMultiplier(activeNodeLv);
          const activeScaledXp = Math.round((activeStageObj.xpReward || 25) * activeXpMult);
          const activeIsUnlocked =
            activeStageObj.id <= currentLessonProg.unlockedStage || activeNodeLv >= 1;
          const activeLvBadgeLabel =
            activeNodeLv >= 3 ? 'MAX 3/3' : `Lv.${activeNodeLv}/3`;
          const activeLvBadgeStyle =
            activeNodeLv >= 3
              ? 'bg-amber-400 text-slate-950 border-amber-200'
              : activeNodeLv === 2
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
              : activeNodeLv === 1
              ? 'bg-sky-500/20 text-sky-300 border-sky-400/60'
              : 'bg-slate-950 text-slate-300 border-slate-700';
          const nextTrialNote =
            activeNodeLv === 0
              ? 'Run 1 (0/3 → 1/3): Standard scaffolding • Unlocks next node'
              : activeNodeLv === 1
              ? activeStageObj.launchType === 'flashcards'
                ? 'Run 2 (1/3 → 2/3): Listening, Meaning & Reverse Hanzi Recall (+25% XP)'
                : activeStageObj.launchType === 'meaning_mc'
                ? 'Run 2 (1/3 → 2/3): Reverse Meaning → Hanzi + Hidden Pinyin (+25% XP)'
                : activeStageObj.launchType === 'writing'
                ? 'Run 2 (1/3 → 2/3): Shuffled Word Order + Hidden Pinyin (+25% XP)'
                : activeStageObj.launchType === 'boss'
                ? 'Run 2 (1/3 → 2/3): Reverse Hanzi & Cloze Attacks + Past Review (+25% XP)'
                : 'Run 2 (1/3 → 2/3): Permuted Skills + Hidden Pinyin + Past Review (+25% XP)'
              : activeNodeLv === 2
              ? activeStageObj.launchType === 'flashcards'
                ? 'Mastery Trial (2/3 → 3/3 MAX): Sentence Builder, Cloze & Listening (+50% XP)'
                : activeStageObj.launchType === 'meaning_mc'
                ? 'Mastery Trial (2/3 → 3/3 MAX): Reverse Hanzi + Cloze Context (+50% XP)'
                : `Mastery Trial (2/3 → 3/3 MAX): Shuffled Production • No Pinyin Hints${
                    activeStageObj.launchType === 'boss' ? ' • 12s Clock' : ''
                  } (+50% XP)`
              : `MAX Crown Trial: Shuffled Mastery Mix • Strict No-Pinyin${
                  activeStageObj.launchType === 'boss' ? ' • 12s Clock' : ''
                } (+50% XP)`;

          return (
            <div className="mt-2 rounded-2xl bg-slate-800/95 border border-slate-700 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase text-rose-400">
                    {activeStageObj.title}
                  </span>
                  <span
                    className={`font-pixel-header text-[8px] px-1.5 py-0.5 rounded-[2px] border ${activeLvBadgeStyle}`}
                  >
                    {activeLvBadgeLabel}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    +{activeScaledXp} XP
                    {activeXpMult >= 1.5
                      ? ' (+50%)'
                      : activeXpMult >= 1.25
                      ? ' (+25%)'
                      : ''}
                  </span>
                </div>
                <ScrollingText
                  text={activeStageObj.subtitle}
                  className="text-xs font-bold text-white mt-0.5"
                />
                <ScrollingText
                  text={nextTrialNote}
                  className="text-[11px] text-amber-300/90 font-semibold"
                />
              </div>

              <button
                type="button"
                disabled={!activeIsUnlocked}
                onClick={() => onSelectStageNode(activeStageObj)}
                className="game-btn-3d px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black text-xs shrink-0 border-b-4 border-rose-800 disabled:border-slate-900 flex items-center gap-1.5 shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {activeNodeLv >= 3
                    ? 'MAX Replay'
                    : activeNodeLv === 2
                    ? 'Trial 3/3'
                    : activeNodeLv === 1
                    ? 'Lv.2/3'
                    : 'Play'}
                </span>
              </button>
            </div>
          );
        })()}
      </div>

      {/* Character Mastery Strip */}
      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
            Unit Vocabulary Mastery (Lv 0–10)
          </span>
          <span className="text-[11px] font-bold text-emerald-400">Tap Card for Audio</span>
        </div>
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-0.5">
          {activeWords.map((word) => {
            const level = getWordMasteryLevel(progress.mastery, word);
            return (
              <div
                key={word.id}
                onClick={() => {
                  soundFX.playPop();
                  speakMandarin(word.hanzi, progress.preferredSpeed);
                }}
                className="game-btn-3d cursor-pointer rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 p-2.5 text-center transition-all flex flex-col justify-between"
              >
                <div className="font-clarity min-w-0">
                  <div className="font-hanzi text-lg font-black text-white truncate">{word.hanzi}</div>
                  <div className="font-clarity text-sm font-extrabold text-rose-400 truncate">{word.pinyin}</div>
                  <ScrollingText
                    text={(word.meaning || word.english).split(/[/;]/)[0]}
                    className="font-clarity text-xs text-slate-300 mt-0.5"
                  />
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800/80">
                  <MasterySegmentedBar level={level} compact={true} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: SMART REVIEW ARENA (ADAPTIVE SPACED-REPETITION & WEAKEST MODALITY HUB)
// ============================================================================
export function SmartReviewArenaView({
  progress,
  courses,
  activeCourse,
  activeLesson,
  activeWords,
  customDecks,
  allUniqueWordsArray,
  unlockedWords,
  unlockedWordsCount = 3,
  enrichedUnlockedWords,
  generativeReadiness,
  corpusStats,
  linguisticDataStatus,
  speakMandarin,
  speakingState,
  onLaunchSmartReviewSession,
  onLaunchLeechRemediation,
  onLaunchSentenceBuilderDrill,
  onLaunchClassifierDrill,
  onLaunchDialogueQaDrill,
  onLaunchNumbersTimeLab,
  onLaunchClozeDrill,
  onLaunchToneSandhiDrill,
  onLaunchHskMockExam,
  onLaunchBlitzMatch,
  onLaunchGenerativeDrill,
  onOpenShadowing,
  onLaunchActivity,
  triggerToast
}) {
  const safeCorpusStats = corpusStats || { totalCorpusSentences: 0, i0Count: 0, i1Count: 0 };
  const [reviewFilter, setReviewFilter] = useState('all_weak');

  const isSentenceBuilderUnlocked =
    unlockedWordsCount >= ADVANCED_MODE_UNLOCK_THRESHOLDS.sentence_builder;
  const isToneDrillUnlocked =
    unlockedWordsCount >= ADVANCED_MODE_UNLOCK_THRESHOLDS.tone_sandhi_drill;
  const isClozeUnlocked =
    unlockedWordsCount >= ADVANCED_MODE_UNLOCK_THRESHOLDS.cloze;
  const isBlitzUnlocked =
    unlockedWordsCount >= ADVANCED_MODE_UNLOCK_THRESHOLDS.blitz_match;
  const isHskMockUnlocked =
    unlockedWordsCount >= ADVANCED_MODE_UNLOCK_THRESHOLDS.hsk_mock_exam;

  const scannedPool = useMemo(() => {
    const wordMap = new window.Map();

    activeWords.forEach((w, i) => {
      const norm = normalizeWordEntry(w, i);
      if (norm.hanzi) wordMap.set(norm.hanzi, norm);
    });

    (activeCourse?.lessons || []).forEach((lesson, lIdx) => {
      const lessonKey = `${activeCourse.id}__${lesson.id}`;
      const lp = progress.lessonProgress?.[lessonKey];
      const isStartedOrUnlocked =
        lIdx === 0 ||
        lesson.id === activeLesson?.id ||
        (lp && (lp.unlockedStage > 1 || (lp.completedStages && lp.completedStages.length > 0)));

      if (isStartedOrUnlocked) {
        (lesson.words || []).forEach((w, wIdx) => {
          const norm = normalizeWordEntry(w, wIdx);
          if (norm.hanzi && !wordMap.has(norm.hanzi)) {
            wordMap.set(norm.hanzi, norm);
          }
        });
      }
    });

    customDecks.forEach((deck) => {
      (deck.words || []).forEach((w, wIdx) => {
        const norm = normalizeWordEntry(w, wIdx);
        if (norm.hanzi && !wordMap.has(norm.hanzi)) {
          wordMap.set(norm.hanzi, norm);
        }
      });
    });

    return Array.from(wordMap.values());
  }, [activeCourse, activeLesson, activeWords, customDecks, progress.lessonProgress]);

  const effectiveUnlockedPool = useMemo(() => {
    return Array.isArray(unlockedWords) && unlockedWords.length > 0
      ? unlockedWords
      : scannedPool;
  }, [unlockedWords, scannedPool]);

  const classifierStatus = useMemo(
    () => getClassifierDrillUnlockStatus(effectiveUnlockedPool),
    [effectiveUnlockedPool]
  );
  const dialogueStatus = useMemo(
    () => getDialogueQaUnlockStatus(effectiveUnlockedPool),
    [effectiveUnlockedPool]
  );
  const numbersTimeStatus = useMemo(
    () => getNumbersTimeLabUnlockStatus(effectiveUnlockedPool),
    [effectiveUnlockedPool]
  );
  const confusableItemsPreview = useMemo(
    () => buildConfusableDrillItems(effectiveUnlockedPool, getMasterLexiconMap(), 8),
    [effectiveUnlockedPool, linguisticDataStatus?.lexiconCount]
  );

  const isClassifierUnlocked = classifierStatus.unlocked;
  const isDialogueQaUnlocked = dialogueStatus.unlocked;
  const isNumbersTimeUnlocked = numbersTimeStatus.unlocked;

  const learnedLv1PlusCount = useMemo(() => {
    const referencePool =
      Array.isArray(allUniqueWordsArray) && allUniqueWordsArray.length > 0
        ? allUniqueWordsArray
        : scannedPool;
    return countWordsAtLeastLevel(progress?.mastery, referencePool, 1);
  }, [allUniqueWordsArray, scannedPool, progress?.mastery]);

  const isSrsActive = learnedLv1PlusCount >= SRS_ACTIVATION_MIN_WORDS;

  const activeSrsMap = progress.srsData || progress.srsSchedule || {};
  const leechWords = useMemo(
    () => getLeechWords(effectiveUnlockedPool, activeSrsMap),
    [effectiveUnlockedPool, activeSrsMap]
  );

  const reviewAnalytics = useMemo(() => {
    const nowMs = Date.now();
    const wordsToReview = [];
    const consolidatingWords = [];
    const masteredWords = [];
    let dueWordsCount = 0;

    const modalitySummary = {
      recognition: { key: 'recognition', label: 'Recognition', mistakes: 0, completions: 0 },
      writing: { key: 'writing', label: 'Writing (Strokes)', mistakes: 0, completions: 0 },
      listening: { key: 'listening', label: 'Listening (Dictation)', mistakes: 0, completions: 0 },
      speaking: { key: 'speaking', label: 'Speaking (Tones)', mistakes: 0, completions: 0 },
      sentence_builder: {
        key: 'sentence_builder',
        label: 'Sentence Builder',
        mistakes: 0,
        completions: 0
      },
      cloze: {
        key: 'cloze',
        label: 'Fill-in-the-Blank (Cloze)',
        mistakes: 0,
        completions: 0
      },
      ...(isClassifierUnlocked
        ? {
            classifier_drill: {
              key: 'classifier_drill',
              label: 'Measure Words (量词)',
              mistakes: 0,
              completions: 0
            }
          }
        : {}),
      ...(isDialogueQaUnlocked
        ? {
            dialogue_qa: {
              key: 'dialogue_qa',
              label: 'Conversational Q&A (问答)',
              mistakes: 0,
              completions: 0
            }
          }
        : {})
    };

    const activeSummaryKeys = Object.keys(modalitySummary);
    const activeTelemetryMap = progress.wordSkillTelemetry || progress.skillTelemetry || {};

    // Deduplicate candidate pool across unlocked, active-course scanned, and tracked words,
    // then strictly retain ONLY words with actual study history (`isWordDiscovered`).
    const uniqueCandidateMap = new window.Map();
    const registerRawCandidate = (rawWord, idx) => {
      if (!rawWord) return;
      const norm = normalizeWordEntry(rawWord, idx);
      if (norm.hanzi && !uniqueCandidateMap.has(norm.hanzi)) {
        uniqueCandidateMap.set(norm.hanzi, norm);
      }
    };
    effectiveUnlockedPool.forEach(registerRawCandidate);
    scannedPool.forEach(registerRawCandidate);
    if (Array.isArray(allUniqueWordsArray)) {
      allUniqueWordsArray.forEach(registerRawCandidate);
    }

    const discoveredRawWords = Array.from(uniqueCandidateMap.values()).filter((w) =>
      isWordDiscovered(w, progress)
    );

    const enrichedWords = discoveredRawWords.map((rawWord) => {
      const word = enrichWordEntry(
        rawWord,
        progress.wordLinguisticOverrides,
        progress.wordPriorityOverrides
      );
      const priorityTier = word.priorityTier || 'standard';
      const priorityWeight =
        typeof word.priorityWeight === 'number' ? word.priorityWeight : 1.0;
      const mastery = getWordMasteryLevel(progress.mastery, word);
      const telemetry = getWordSkillTelemetry(activeTelemetryMap, word);
      const srsEntry = getWordSrsEntry(activeSrsMap, word);
      const isDue = isSrsActive
        ? isWordSrsDue(activeSrsMap, word, mastery, nowMs)
        : false;
      const overdueMs = isSrsActive
        ? getSrsOverdueMs(activeSrsMap, word, nowMs)
        : 0;
      if (isDue) dueWordsCount += 1;

      activeSummaryKeys.forEach((mKey) => {
        modalitySummary[mKey].mistakes += telemetry[mKey]?.mistakes || 0;
        modalitySummary[mKey].completions += telemetry[mKey]?.completions || 0;
      });

      const rankModalities = (allowedKeys) => {
        return [...allowedKeys].sort((a, b) => {
          const mDiff = (telemetry[b]?.mistakes || 0) - (telemetry[a]?.mistakes || 0);
          if (mDiff !== 0) return mDiff;
          return (telemetry[a]?.completions || 0) - (telemetry[b]?.completions || 0);
        });
      };

      const unlockedDynamicModalities = [
        'writing',
        'listening',
        ...(isClozeUnlocked ? ['cloze'] : []),
        ...(isSentenceBuilderUnlocked ? ['sentence_builder'] : []),
        ...(isClassifierUnlocked ? ['classifier_drill'] : []),
        ...(isDialogueQaUnlocked ? ['dialogue_qa'] : []),
        'speaking',
        'recognition'
      ];

      const weakestAllModality = rankModalities(unlockedDynamicModalities)[0];
      const weakestWritingAudioModality = rankModalities([
        'writing',
        'listening',
        'speaking',
        ...(isClozeUnlocked ? ['cloze'] : []),
        ...(isSentenceBuilderUnlocked ? ['sentence_builder'] : [])
      ])[0];

      const totalMistakes =
        telemetry.recognition.mistakes +
        telemetry.writing.mistakes +
        telemetry.listening.mistakes +
        telemetry.speaking.mistakes +
        telemetry.sentence_builder.mistakes +
        telemetry.cloze.mistakes +
        (telemetry.classifier_drill?.mistakes || 0) +
        (telemetry.dialogue_qa?.mistakes || 0);

      const totalCompletions =
        telemetry.recognition.completions +
        telemetry.writing.completions +
        telemetry.listening.completions +
        telemetry.speaking.completions +
        telemetry.sentence_builder.completions +
        telemetry.cloze.completions +
        (telemetry.classifier_drill?.completions || 0) +
        (telemetry.dialogue_qa?.completions || 0);

      const mistakeRate =
        totalMistakes + totalCompletions > 0
          ? totalMistakes / (totalMistakes + totalCompletions)
          : 0;

      const isLeech = Boolean(srsEntry?.isLeech);
      const lapseCount = Number(srsEntry?.lapseCount || 0);
      const easeFactor = typeof srsEntry?.easeFactor === 'number' ? srsEntry.easeFactor : 2.0;

      const enriched = {
        word,
        priorityTier,
        priorityWeight,
        mastery,
        telemetry,
        totalMistakes,
        totalCompletions,
        mistakeRate,
        srsEntry,
        isDue,
        overdueMs,
        isLeech,
        lapseCount,
        easeFactor,
        weakestAllModality,
        weakestWritingAudioModality
      };

      if (mastery <= 4) wordsToReview.push(enriched);
      else if (mastery <= 7) consolidatingWords.push(enriched);
      else masteredWords.push(enriched);

      return enriched;
    });

    const sortedModalities = Object.values(modalitySummary).sort((a, b) => {
      if (b.mistakes !== a.mistakes) return b.mistakes - a.mistakes;
      return a.completions - b.completions;
    });

    const weakestGlobalModality = sortedModalities[0];

    return {
      enrichedWords,
      discoveredWords: enrichedWords,
      wordsToReview,
      consolidatingWords,
      masteredWords,
      dueWordsCount,
      modalitySummary,
      sortedModalities,
      weakestGlobalModality
    };
  }, [
    effectiveUnlockedPool,
    scannedPool,
    allUniqueWordsArray,
    progress,
    activeSrsMap,
    isSrsActive,
    isClozeUnlocked,
    isSentenceBuilderUnlocked,
    isClassifierUnlocked,
    isDialogueQaUnlocked
  ]);

  const adaptiveSmartQueue = useMemo(() => {
    // Strictly restrict Weakest Word Review to discovered words — never pad with unstudied words
    if (!Array.isArray(reviewAnalytics.discoveredWords) || reviewAnalytics.discoveredWords.length === 0) {
      return [];
    }

    const allowedModes =
      reviewFilter === 'writing_audio'
        ? [
            'writing',
            'listening',
            'speaking',
            ...(isClozeUnlocked ? ['cloze'] : []),
            ...(isSentenceBuilderUnlocked ? ['sentence_builder'] : [])
          ]
        : [
            'recognition',
            'writing',
            'listening',
            'speaking',
            ...(isClozeUnlocked ? ['cloze'] : []),
            ...(isSentenceBuilderUnlocked ? ['sentence_builder'] : []),
            ...(isClassifierUnlocked ? ['classifier_drill'] : []),
            ...(isDialogueQaUnlocked ? ['dialogue_qa'] : [])
          ];

    const computeCandidatePriorityScore = (c) => {
      const pWeight = typeof c.priorityWeight === 'number' ? c.priorityWeight : 1.0;
      const dueBonus = isSrsActive && c.isDue ? 85 : 0;
      const overdueDays =
        isSrsActive && c.isDue && c.overdueMs > 0
          ? Math.min(14, c.overdueMs / (24 * 60 * 60 * 1000))
          : 0;
      const overdueBonus = overdueDays * 2.5;
      const lowMasteryScore = (10 - Math.min(10, c.mastery || 0)) * 10;
      const mistakesCount = allowedModes.reduce(
        (sum, k) => sum + (c.telemetry[k]?.mistakes || 0),
        0
      );
      const completionsCount = allowedModes.reduce(
        (sum, k) => sum + (c.telemetry[k]?.completions || 0),
        0
      );
      const modeMistakeRate =
        mistakesCount + completionsCount > 0
          ? mistakesCount / (mistakesCount + completionsCount)
          : c.mistakeRate || 0;
      const mistakeBonus = mistakesCount * 8 + modeMistakeRate * 45;
      const lowEaseBonus = Math.max(0, 2.5 - (typeof c.easeFactor === 'number' ? c.easeFactor : 2.0)) * 40;
      const leechBonus = c.isLeech ? 140 + Math.min(60, (c.lapseCount || 0) * 10) : 0;
      const priorityMultiplierBonus = pWeight * 22;
      return (
        (dueBonus + overdueBonus + lowMasteryScore + mistakeBonus + lowEaseBonus) * pWeight +
        priorityMultiplierBonus +
        leechBonus
      );
    };

    const sortedCandidates = [...reviewAnalytics.discoveredWords].sort((a, b) => {
      const scoreDiff = computeCandidatePriorityScore(b) - computeCandidatePriorityScore(a);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      if (isSrsActive && a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      if (b.totalMistakes !== a.totalMistakes) return b.totalMistakes - a.totalMistakes;
      if (a.easeFactor !== b.easeFactor) return a.easeFactor - b.easeFactor;
      return (b.priorityWeight || 1.0) - (a.priorityWeight || 1.0);
    });

    const targetCount = Math.min(10, sortedCandidates.length);
    const nonNicheCandidates = sortedCandidates.filter((c) => c.priorityTier !== 'niche');
    const allCandidatesAreNiche = nonNicheCandidates.length === 0;
    const maxNicheAllowed = allCandidatesAreNiche ? targetCount : 1;

    // Build capped candidate sequence strictly from discovered words:
    // at most 1 'niche' step per session (unless all discovered words are niche)
    const selectedSessionCandidates = [];
    let nicheStepsScheduled = 0;

    for (let idx = 0; idx < sortedCandidates.length && selectedSessionCandidates.length < targetCount; idx++) {
      const cand = sortedCandidates[idx];
      if (!cand) continue;
      if (cand.priorityTier === 'niche') {
        if (nicheStepsScheduled >= maxNicheAllowed) continue;
        nicheStepsScheduled += 1;
      }
      selectedSessionCandidates.push(cand);
    }

    const queue = [];
    let classifierCursor = 0;
    let dialogueCursor = 0;

    for (let i = 0; i < selectedSessionCandidates.length; i++) {
      const candidate = selectedSessionCandidates[i];
      if (!candidate) break;

      const preferredModes = getPreferredModalitiesForMastery(candidate.mastery);
      const unlockedLv7GenerativeModes =
        candidate.mastery >= 7
          ? [
              ...(generativeReadiness?.contextual_writing?.unlocked
                ? ['contextual_writing']
                : []),
              ...(generativeReadiness?.translation_prod?.unlocked
                ? ['translation_prod']
                : []),
              ...(generativeReadiness?.open_cloze?.unlocked ? ['open_cloze'] : [])
            ]
          : [];
      const candidateModes = Array.from(
        new Set([
          ...allowedModes,
          ...(candidate.mastery >= 7
            ? [
                'writing',
                ...(isClozeUnlocked ? ['cloze'] : []),
                ...(isSentenceBuilderUnlocked ? ['sentence_builder'] : []),
                ...unlockedLv7GenerativeModes
              ]
            : [])
        ])
      );

      const getModeWeightScore = (mode) => {
        const telemetry = candidate.telemetry[mode] || { mistakes: 0, completions: 0 };
        const prefIdx = preferredModes.indexOf(mode);
        const tierPreferenceBonus =
          prefIdx !== -1
            ? (preferredModes.length - prefIdx) * 4 + 6
            : candidate.mastery >= 7 && unlockedLv7GenerativeModes.includes(mode)
            ? 14
            : 0;
        const mistakeWeight = (telemetry.mistakes || 0) * 5;
        const completionPenalty = (telemetry.completions || 0) * 1.5;
        return tierPreferenceBonus + mistakeWeight - completionPenalty;
      };

      const rankedModes = [...candidateModes].sort((mA, mB) => {
        const scoreDiff = getModeWeightScore(mB) - getModeWeightScore(mA);
        if (scoreDiff !== 0) return scoreDiff;
        const diffMistakes =
          (candidate.telemetry[mB]?.mistakes || 0) - (candidate.telemetry[mA]?.mistakes || 0);
        if (diffMistakes !== 0) return diffMistakes;
        return (
          (candidate.telemetry[mA]?.completions || 0) -
          (candidate.telemetry[mB]?.completions || 0)
        );
      });

      const prev1 = queue.length >= 1 ? queue[queue.length - 1].modality : null;
      const prev2 = queue.length >= 2 ? queue[queue.length - 2].modality : null;
      const lastModeForSameWord =
        queue
          .slice()
          .reverse()
          .find((q) => q.word.hanzi === candidate.word.hanzi)?.modality || null;

      let chosenMode =
        rankedModes.find(
          (m) => !(m === prev1 && m === prev2) && m !== lastModeForSameWord
        ) ||
        rankedModes.find((m) => !(m === prev1 && m === prev2)) ||
        rankedModes[0];

      let classifierItem = null;
      let dialoguePair = null;
      let stepWord = candidate.word;

      if (chosenMode === 'classifier_drill') {
        if (isClassifierUnlocked && classifierStatus.items.length > 0) {
          classifierItem =
            classifierStatus.items.find(
              (it) => it.sourceWord?.hanzi === candidate.word.hanzi
            ) ||
            classifierStatus.items[classifierCursor % classifierStatus.items.length];
          classifierCursor += 1;
          stepWord = classifierItem.sourceWord || candidate.word;
        } else {
          chosenMode = 'recognition';
        }
      } else if (chosenMode === 'dialogue_qa') {
        if (isDialogueQaUnlocked && dialogueStatus.pairs.length > 0) {
          dialoguePair =
            dialogueStatus.pairs.find(
              (p) => p.sourceWord?.hanzi === candidate.word.hanzi
            ) ||
            dialogueStatus.pairs[dialogueCursor % dialogueStatus.pairs.length];
          dialogueCursor += 1;
          stepWord = dialoguePair.sourceWord || candidate.word;
        } else {
          chosenMode = 'recognition';
        }
      }

      const modeTelemetry = candidate.telemetry[chosenMode] || { mistakes: 0, completions: 0 };
      const tierInfo = getMasteryTierMeta(candidate.mastery);
      const modeDisplayLabel =
        chosenMode === 'writing' && candidate.mastery >= 7
          ? 'Writing (Blind Memory)'
          : MODALITY_META[chosenMode]?.label || chosenMode;
      const reasonText =
        isSrsActive && candidate.isDue
          ? `SRS Due (${modeDisplayLabel}) • Mastery Lv.${candidate.mastery}/10`
          : modeTelemetry.mistakes > 0
          ? `Targeting ${modeTelemetry.mistakes} past mistake${
              modeTelemetry.mistakes > 1 ? 's' : ''
            } in ${modeDisplayLabel}`
          : `${tierInfo.tier} Tier Focus (${modeDisplayLabel}) • Mastery Lv.${candidate.mastery}/10`;

      queue.push({
        stepId: `smart_${stepWord.id}_${chosenMode}_${i}`,
        word: stepWord,
        modality: chosenMode,
        classifierItem,
        dialoguePair,
        mastery: candidate.mastery,
        isDue: isSrsActive && candidate.isDue,
        reason: reasonText
      });
    }

    return queue;
  }, [
    reviewAnalytics.discoveredWords,
    reviewFilter,
    isSrsActive,
    isClozeUnlocked,
    isSentenceBuilderUnlocked,
    isClassifierUnlocked,
    isDialogueQaUnlocked,
    classifierStatus.items,
    dialogueStatus.pairs,
    generativeReadiness
  ]);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-rose-500/30 p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Adaptive Spaced Repetition</span>
          </span>
          <div className="flex items-center gap-1.5">
            {isSrsActive && (
              <span
                className={`px-2 py-0.5 rounded-[2px] border font-pixel-header text-[8px] uppercase tracking-wider ${
                  reviewAnalytics.dueWordsCount > 0
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200'
                    : 'bg-emerald-600/25 border-emerald-400 text-emerald-200'
                }`}
              >
                {reviewAnalytics.dueWordsCount > 0
                  ? `${reviewAnalytics.dueWordsCount} Due`
                  : 'SRS Clear'}
              </span>
            )}
            <span className="text-[11px] font-bold text-amber-300">
              {unlockedWordsCount} Unlocked Words
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-lg font-black text-white">Smart Review Arena</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {isSrsActive
              ? 'Temporal SRS active: overdue characters are prioritized first along the forgetting curve.'
              : 'Automatically prioritizes your lowest-mastery characters and unlocks advanced workbook modes as your unlocked vocabulary grows.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3 text-center">
            <div className="text-2xl font-black text-rose-300">
              {reviewAnalytics.wordsToReview.length}
            </div>
            <div className="text-[10px] font-black uppercase text-rose-200 mt-0.5">
              Words to Review
            </div>
            <div className="text-[9px] text-rose-300/80">Discovered Lv. 0–4</div>
          </div>

          <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3 text-center">
            <div className="text-2xl font-black text-amber-300">
              {reviewAnalytics.consolidatingWords.length}
            </div>
            <div className="text-[10px] font-black uppercase text-amber-200 mt-0.5">
              Consolidating
            </div>
            <div className="text-[9px] text-amber-300/80">Mastery Lv. 5–7</div>
          </div>

          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-center">
            <div className="text-2xl font-black text-emerald-300">
              {reviewAnalytics.masteredWords.length}
            </div>
            <div className="text-[10px] font-black uppercase text-emerald-200 mt-0.5">
              Mastered
            </div>
            <div className="text-[9px] text-emerald-300/80">Mastery Lv. 8–10</div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              <span>Weakest Modality Indicator</span>
            </span>
            <span className="text-[11px] font-black text-rose-300">
              Focus: {reviewAnalytics.weakestGlobalModality?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {reviewAnalytics.sortedModalities.map((mod, idx) => {
              const isWeakest = idx === 0;
              return (
                <div
                  key={mod.key}
                  className={`rounded-xl p-2.5 border ${
                    isWeakest
                      ? 'bg-rose-500/15 border-rose-500/50'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white truncate">
                      {mod.label}
                    </span>
                    {isWeakest && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white">
                        Weakest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="text-rose-300 font-bold">{mod.mistakes} mistakes</span>
                    <span className="text-emerald-300 font-bold">{mod.completions} done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Smart Review Filter Mode
          </span>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setReviewFilter('all_weak');
              }}
              className={`game-btn-3d py-2 px-2 rounded-xl text-xs font-extrabold transition-all ${
                reviewFilter === 'all_weak'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Weak Words
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setReviewFilter('writing_audio');
              }}
              className={`game-btn-3d py-2 px-2 rounded-xl text-xs font-extrabold transition-all ${
                reviewFilter === 'writing_audio'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Struggling Writing/Audio
            </button>
          </div>
        </div>

        {adaptiveSmartQueue.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              onLaunchSmartReviewSession(
                adaptiveSmartQueue,
                reviewFilter === 'writing_audio'
                  ? 'Struggling Writing/Audio'
                  : 'All Weak Words'
              )
            }
            className="game-btn-3d w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 text-slate-950 font-black text-sm shadow-xl border-b-4 border-amber-700 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>
              Start Weakest Word Review ({adaptiveSmartQueue.length} Discovered Word
              {adaptiveSmartQueue.length === 1 ? '' : 's'})
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 border-2 border-slate-700 text-slate-400 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
          >
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Complete a lesson on the Map to unlock Weakest Word Review</span>
          </button>
        )}

        {/* DEDICATED LEECH REMEDIATION CARD */}
        {leechWords.length > 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-rose-950/90 via-amber-950/45 to-slate-900 border-2 border-rose-500/70 p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-rose-500/25 text-rose-200 border border-rose-400/60 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-300" />
                    <span>Leech Remediation</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-200 border border-amber-400/50">
                    {leechWords.length} Stubborn Word{leechWords.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="font-clarity text-xs text-slate-200 mt-1.5 leading-snug">
                  High-retention attack drill (Listening, Reverse Hanzi, Cloze &amp; Writing) to clear stubborn memory lapses.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              {leechWords.slice(0, 6).map((lw, lIdx) => {
                const leechEntry = getWordSrsEntry(activeSrsMap, lw);
                return (
                  <span
                    key={`leech_chip_${lw.hanzi || lw.id}_${lIdx}`}
                    className="px-2 py-0.5 rounded-[2px] bg-slate-950/90 border border-rose-500/50 text-[11px] font-bold text-white inline-flex items-center gap-1"
                  >
                    <span className="font-hanzi text-sm text-rose-200">{lw.hanzi}</span>
                    <span className="font-clarity text-[10px] text-amber-300">
                      {leechEntry?.lapseCount || 0}×
                    </span>
                  </span>
                );
              })}
              {leechWords.length > 6 && (
                <span className="text-[10px] font-bold text-rose-300">
                  +{leechWords.length - 6} more
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onLaunchLeechRemediation?.(leechWords)}
              className="game-btn-3d w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs border-b-4 border-rose-900 flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4 text-amber-100" />
              <span>Attack {leechWords.length} Leech Word{leechWords.length === 1 ? '' : 's'} (+35 XP)</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/35 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-emerald-300">
                  Leech Remediation • 0 Leeches — Memory Stable
                </p>
                <p className="font-clarity text-[10px] text-slate-400 leading-snug">
                  Words with 4+ lapses &amp; low ease automatically surface here for targeted drills.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Progressive Practice Modes
          </span>
          <span className="text-[10px] font-bold text-amber-300">
            Milestones: 12 • 15 • 20 • 25 • 40
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* 12+ Words: Sentence Builder */}
          <button
            type="button"
            onClick={() => {
              if (!isSentenceBuilderUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (12+ Words Required)',
                  `Unlocks at 12 words — ${unlockedWordsCount}/12 unlocked. Complete Lesson 1 or import more words!`
                );
                return;
              }
              onLaunchSentenceBuilderDrill();
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isSentenceBuilderUnlocked
                ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 border-purple-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isSentenceBuilderUnlocked ? 'text-purple-300' : 'text-slate-500'
                }`}
              >
                Word Order Puzzle
              </span>
              {isSentenceBuilderUnlocked ? (
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">Sentence Builder</div>
              {isSentenceBuilderUnlocked ? (
                <div className="text-[10px] text-slate-300">Reconstruct Examples</div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Unlocks at 12 words — {unlockedWordsCount}/12
                </div>
              )}
            </div>
          </button>

          {/* 12+ Words: Tone & Sandhi Drill */}
          <button
            type="button"
            onClick={() => {
              if (!isToneDrillUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (12+ Words Required)',
                  `Unlocks at 12 words — ${unlockedWordsCount}/12 unlocked. Complete Lesson 1 or unlock more units!`
                );
                return;
              }
              onLaunchToneSandhiDrill(scannedPool);
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isToneDrillUnlocked
                ? 'bg-gradient-to-br from-emerald-500/20 to-amber-500/20 hover:from-emerald-500/30 hover:to-amber-500/30 border-emerald-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isToneDrillUnlocked ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                <span className="font-hanzi">声调辨析</span> • Ear Drill
              </span>
              {isToneDrillUnlocked ? (
                <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">Tone & Sandhi Drill</div>
              {isToneDrillUnlocked ? (
                <div className="text-[10px] text-slate-300">3+3 → 2+3 & 不/一 Sandhi</div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Unlocks at 12 words — {unlockedWordsCount}/12
                </div>
              )}
            </div>
          </button>

          {/* 15+ Words & 3+ Classifiers: Measure Words Trainer (量词) */}
          <button
            type="button"
            onClick={() => {
              if (!isClassifierUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (Measure Words • 量词)',
                  `Unlocks at 15+ words & 3 classifiers (${classifierStatus.unlockedWordsCount}/15 words • ${classifierStatus.distinctClassifiersCount}/3 classifiers).`
                );
                return;
              }
              onLaunchClassifierDrill?.(classifierStatus.items);
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isClassifierUnlocked
                ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 border-teal-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isClassifierUnlocked ? 'text-teal-300' : 'text-slate-500'
                }`}
              >
                <span className="font-hanzi">量词</span> • Classifiers
              </span>
              {isClassifierUnlocked ? (
                <Layers className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">Measure Words</div>
              {isClassifierUnlocked ? (
                <div className="text-[10px] text-slate-300">
                  {classifierStatus.distinctClassifiersCount} classifiers • {classifierStatus.items.length} phrases
                </div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5 leading-snug">
                  Unlocks at 15+ words & 3 classifiers ({classifierStatus.unlockedWordsCount}/15 • {classifierStatus.distinctClassifiersCount}/3)
                </div>
              )}
            </div>
          </button>

          {/* 20+ Words & 4+ Dialogue Patterns: Conversational Q&A (问答) */}
          <button
            type="button"
            onClick={() => {
              if (!isDialogueQaUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (Conversational Q&A • 问答)',
                  `Unlocks at 20+ words & 4 dialogue patterns (${dialogueStatus.unlockedWordsCount}/20 words • ${dialogueStatus.pairsCount}/4 patterns).`
                );
                return;
              }
              onLaunchDialogueQaDrill?.(dialogueStatus.pairs);
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isDialogueQaUnlocked
                ? 'bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20 hover:from-fuchsia-500/30 hover:to-rose-500/30 border-fuchsia-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isDialogueQaUnlocked ? 'text-fuchsia-300' : 'text-slate-500'
                }`}
              >
                <span className="font-hanzi">问答</span> • Mini-Dialogues
              </span>
              {isDialogueQaUnlocked ? (
                <MessageSquare className="w-3.5 h-3.5 text-fuchsia-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">Conversational Q&A</div>
              {isDialogueQaUnlocked ? (
                <div className="text-[10px] text-slate-300">
                  {dialogueStatus.pairsCount} Q&A patterns unlocked
                </div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5 leading-snug">
                  Unlocks at 20+ words & 4 dialogue patterns ({dialogueStatus.unlockedWordsCount}/20 • {dialogueStatus.pairsCount}/4)
                </div>
              )}
            </div>
          </button>

          {/* 25+ Words: Fill-in-the-Blank (Cloze) */}
          <button
            type="button"
            onClick={() => {
              if (!isClozeUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (25+ Words Required)',
                  `Unlocks at 25 words — ${unlockedWordsCount}/25 unlocked (Lesson 2 done).`
                );
                return;
              }
              onLaunchClozeDrill(scannedPool);
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isClozeUnlocked
                ? 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 border-cyan-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isClozeUnlocked ? 'text-cyan-300' : 'text-slate-500'
                }`}
              >
                <span className="font-hanzi">选词填空</span> • Cloze
              </span>
              {isClozeUnlocked ? (
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">Fill-in-the-Blank</div>
              {isClozeUnlocked ? (
                <div className="text-[10px] text-slate-300">[ ___ ] 4-Option Context</div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Unlocks at 25 words — {unlockedWordsCount}/25
                </div>
              )}
            </div>
          </button>

          {/* 25+ Words: 60s Blitz Match */}
          <button
            type="button"
            onClick={() => {
              if (!isBlitzUnlocked) {
                soundFX.playMistake();
                triggerToast?.(
                  'Mode Locked (25+ Words Required)',
                  `Unlocks at 25 words — ${unlockedWordsCount}/25 unlocked (Lesson 2 done).`
                );
                return;
              }
              onLaunchBlitzMatch(scannedPool);
            }}
            className={`game-btn-3d p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              isBlitzUnlocked
                ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border-amber-400/50'
                : 'bg-slate-900/75 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase ${
                  isBlitzUnlocked ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                Arcade Mini-Game
              </span>
              {isBlitzUnlocked ? (
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="mt-1">
              <div className="text-xs font-black text-white">60s Blitz Match</div>
              {isBlitzUnlocked ? (
                <div className="text-[10px] text-slate-300">4x4 Pairs • +2s / -2s</div>
              ) : (
                <div className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Unlocks at 25 words — {unlockedWordsCount}/25
                </div>
              )}
            </div>
          </button>
        </div>

        {/* 25+ Words & 4+ Core Number/Time Morphemes: Procedural Numbers, Time & Prices Lab (数字与时间) */}
        <button
          type="button"
          onClick={() => {
            if (!isNumbersTimeUnlocked) {
              soundFX.playMistake();
              triggerToast?.(
                'Mode Locked (Numbers, Time & Prices • 数字与时间)',
                `Unlocks at 25+ words & number/time basics (${numbersTimeStatus.unlockedWordsCount}/25 words • ${numbersTimeStatus.matchedCoreCharsCount}/4 number/time chars).`
              );
              return;
            }
            onLaunchNumbersTimeLab?.(effectiveUnlockedPool);
          }}
          className={`game-btn-3d w-full p-3.5 rounded-[2px] border-2 flex items-center justify-between gap-3 shadow-lg transition-all ${
            isNumbersTimeUnlocked
              ? 'bg-gradient-to-r from-sky-600/25 via-cyan-600/20 to-emerald-500/25 hover:from-sky-600/35 hover:to-emerald-500/35 border-sky-400/70'
              : 'bg-slate-900/85 border-slate-700 opacity-80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div
              className={`w-10 h-10 rounded-[2px] border-2 flex items-center justify-center shrink-0 font-hanzi font-black text-sm ${
                isNumbersTimeUnlocked
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'bg-slate-950 border-slate-700 text-slate-500'
              }`}
            >
              {isNumbersTimeUnlocked ? '数' : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white">
                  Numbers, Time & Prices Lab
                </span>
                <span className="font-hanzi text-[9px] font-black uppercase px-2 py-0.5 rounded-[2px] bg-sky-500/20 text-sky-300 border border-sky-400/40">
                  数字与时间
                </span>
              </div>
              {isNumbersTimeUnlocked ? (
                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                  Infinite Procedural Lab • 0–999, Clock/Dates & RMB Prices (Listen + Read)
                </p>
              ) : (
                <p className="text-[10px] font-bold text-amber-300 mt-0.5 leading-snug">
                  Unlocks at 25+ words & number/time basics ({numbersTimeStatus.unlockedWordsCount}/25 words • {numbersTimeStatus.matchedCoreCharsCount}/4 chars)
                </p>
              )}
            </div>
          </div>
          {isNumbersTimeUnlocked ? (
            <ChevronRight className="w-4 h-4 text-sky-300 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {/* Hands-Free Audio Shadowing Mode (Always Available — Passive Listening & Speaking) */}
        <button
          type="button"
          onClick={() => onOpenShadowing?.()}
          className="game-btn-3d w-full p-3.5 rounded-[2px] border-2 bg-gradient-to-r from-indigo-600/25 via-violet-600/20 to-emerald-500/20 hover:from-indigo-600/35 hover:to-emerald-500/30 border-indigo-400/70 flex items-center justify-between gap-3 shadow-lg transition-all"
        >
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div className="w-10 h-10 rounded-[2px] border-2 bg-indigo-500/25 border-indigo-400 text-indigo-200 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white">
                  Hands-Free Shadowing
                </span>
                <span className="font-clarity text-[9px] font-black uppercase px-2 py-0.5 rounded-[2px] bg-indigo-500/25 text-indigo-200 border border-indigo-400/40">
                  Audio Loop
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate mt-0.5">
                English Cue → Recall Pause → 1.0x &amp; 0.65x Mandarin • Screen Wake Lock
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-indigo-300 shrink-0" />
        </button>

        {/* Generative Grammar & Production Lab (Phase 3-5 Gated Launch Grid) */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Generative Grammar &amp; Production Lab</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {generativeReadiness?.activeSchemasCount ?? 0} Patterns Active
            </span>
          </div>

          {/* Bilingual Corpus (i+0 / i+1) Counter Pill */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[2px] bg-slate-950/90 border border-emerald-500/35">
            <span className="font-clarity text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Bilingual Corpus (i+0 / i+1)</span>
            </span>
            <span className="font-clarity text-[10px] font-bold text-emerald-200">
              {safeCorpusStats.i0Count} i+0 Ready • {safeCorpusStats.i1Count} i+1
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                modeKey: 'translation_prod',
                tag: 'EN → ZH',
                title: 'EN → ZH Translation',
                subtitle: 'Blocks or Pinyin/Hanzi',
                icon: Languages,
                unlockedClass:
                  'bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-400/60',
                tagClass: 'text-amber-300',
                iconClass: 'text-amber-400'
              },
              {
                modeKey: 'open_cloze',
                tag: '自由填空',
                title: 'Open Cloze',
                subtitle: 'Free-Text Grammar Fill',
                icon: Sparkles,
                unlockedClass:
                  'bg-gradient-to-br from-cyan-500/20 to-sky-500/20 hover:from-cyan-500/30 hover:to-sky-500/30 border-cyan-400/60',
                tagClass: 'text-cyan-300 font-hanzi',
                iconClass: 'text-cyan-400'
              },
              {
                modeKey: 'syntax_transform',
                tag: '句型转换',
                title: 'Syntax Transform',
                subtitle: 'Negate • Question • Past',
                icon: ArrowRight,
                unlockedClass:
                  'bg-gradient-to-br from-violet-500/20 to-indigo-500/20 hover:from-violet-500/30 hover:to-indigo-500/30 border-violet-400/60',
                tagClass: 'text-violet-300 font-hanzi',
                iconClass: 'text-violet-400'
              },
              {
                modeKey: 'error_spotter',
                tag: '病句修改',
                title: 'Error Spotter',
                subtitle: 'Spot & Fix L2 Bugs',
                icon: AlertTriangle,
                unlockedClass:
                  'bg-gradient-to-br from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30 border-rose-400/60',
                tagClass: 'text-rose-300 font-hanzi',
                iconClass: 'text-rose-400'
              },
              {
                modeKey: 'contextual_writing',
                tag: '语境书写',
                title: 'Contextual Writing',
                subtitle: 'Deduce & Draw in Context',
                icon: PenTool,
                unlockedClass:
                  'bg-gradient-to-br from-red-500/20 to-amber-500/20 hover:from-red-500/30 hover:to-amber-500/30 border-rose-400/60',
                tagClass: 'text-rose-300 font-hanzi',
                iconClass: 'text-rose-400'
              },
              {
                modeKey: 'grammar_lab',
                tag: '离合词',
                title: 'Separables & Particles',
                subtitle: '离合词 & Aspect Lab',
                icon: FlaskConical,
                unlockedClass:
                  'bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 hover:from-fuchsia-500/30 hover:to-purple-500/30 border-fuchsia-400/60',
                tagClass: 'text-fuchsia-300 font-hanzi',
                iconClass: 'text-fuchsia-400'
              },
              {
                modeKey: 'micro_reading',
                tag: '短文阅读',
                title: 'Micro-Reading',
                subtitle: '3-Sentence Story Q&A',
                icon: ScrollText,
                unlockedClass:
                  'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border-amber-400/60',
                tagClass: 'text-amber-300 font-hanzi',
                iconClass: 'text-amber-400'
              },
              {
                modeKey: 'corpus_immersion',
                tag: '语料沉浸',
                title: 'i+0 Corpus Immersion',
                subtitle: 'Natural Sentence Mix',
                icon: BookMarked,
                customStatus: {
                  unlocked: safeCorpusStats.i0Count >= 6,
                  detailProgressText: `Unlocks at 6 i+0 sentences (${safeCorpusStats.i0Count}/6 ready)`
                },
                unlockedClass:
                  'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border-emerald-400/60',
                tagClass: 'text-emerald-300 font-hanzi',
                iconClass: 'text-emerald-400'
              },
              {
                modeKey: 'confusable_chars',
                tag: '形近字/同音字',
                title: 'Confusable Twins',
                subtitle: 'Visual & Homophone Contrast',
                icon: Eye,
                customStatus: {
                  unlocked: confusableItemsPreview.length >= 3,
                  detailProgressText: `Unlocks at 3 confusable sets (${confusableItemsPreview.length}/3 ready)`
                },
                unlockedClass:
                  'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border-teal-400/60',
                tagClass: 'text-teal-300 font-hanzi',
                iconClass: 'text-teal-400'
              }
            ].map((card) => {
              const status = card.customStatus ||
                generativeReadiness?.[card.modeKey] || {
                  unlocked: false,
                  detailProgressText: `Unlock more vocabulary words (${unlockedWordsCount} unlocked).`
                };
              const isModeUnlocked = Boolean(status.unlocked);
              const IconComp = card.icon;

              return (
                <button
                  key={card.modeKey}
                  type="button"
                  onClick={() => {
                    if (!isModeUnlocked) {
                      soundFX.playMistake();
                      triggerToast?.(
                        `Mode Locked (${card.title})`,
                        status.detailProgressText || 'Unlock more vocabulary words to activate this lab.'
                      );
                      return;
                    }
                    onLaunchGenerativeDrill?.(card.modeKey);
                  }}
                  className={`game-btn-3d p-3 rounded-[2px] border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isModeUnlocked
                      ? card.unlockedClass
                      : 'bg-slate-900/80 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-black uppercase ${
                        isModeUnlocked ? card.tagClass : 'text-slate-500'
                      }`}
                    >
                      {card.tag}
                    </span>
                    {isModeUnlocked ? (
                      <IconComp className={`w-3.5 h-3.5 shrink-0 ${card.iconClass}`} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-black text-white leading-tight">
                      {card.title}
                    </div>
                    {isModeUnlocked ? (
                      <div className="font-clarity text-[10px] text-slate-300 mt-0.5 leading-snug">
                        {card.subtitle}
                      </div>
                    ) : (
                      <div className="font-clarity text-[10px] font-bold text-amber-300 mt-0.5 leading-snug">
                        {status.detailProgressText}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 40+ Words: HSK Mock Exam Mode */}
        <button
          type="button"
          onClick={() => {
            if (!isHskMockUnlocked) {
              soundFX.playMistake();
              triggerToast?.(
                'Mode Locked (40+ Words Required)',
                `Unlocks at 40 words — ${unlockedWordsCount}/40 unlocked (Lesson 3 done).`
              );
              return;
            }
            onLaunchHskMockExam(scannedPool);
          }}
          className={`game-btn-3d w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all ${
            isHskMockUnlocked
              ? 'bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-amber-500/25 hover:from-indigo-600/40 hover:to-amber-500/35 border-amber-400/50'
              : 'bg-slate-900/80 border-slate-800 opacity-75'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-black text-sm ${
                isHskMockUnlocked
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              {isHskMockUnlocked ? 'HSK' : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white">
                  HSK Mock Test (20 Questions)
                </span>
                <span className="font-hanzi text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  模拟测试
                </span>
              </div>
              {isHskMockUnlocked ? (
                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                  10 Listening + 10 Reading/Cloze • 15m Timer • Pass: 12/20 (60%)
                </p>
              ) : (
                <p className="text-[10px] font-bold text-amber-300 mt-0.5">
                  Unlocks at 40 words — {unlockedWordsCount}/40 (Complete Lesson 3 or import HSK deck)
                </p>
              )}
            </div>
          </div>
          {isHskMockUnlocked ? (
            <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>
      </div>

      {/* UPCOMING SMART REVIEW QUEUE PREVIEW */}
      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            {isSrsActive
              ? 'Adaptive Queue Preview (SRS Due First)'
              : 'Adaptive Queue Preview (Lowest Mastery First)'}
          </h2>
          <span className="text-[11px] font-bold text-amber-300">
            {adaptiveSmartQueue.length} Steps Queued
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {adaptiveSmartQueue.map((item, idx) => {
            const modMeta = MODALITY_META[item.modality] || MODALITY_META.recognition;
            return (
              <div
                key={item.stepId}
                className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-black text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-hanzi text-sm font-black text-white">{item.word.hanzi}</span>
                      <span className="font-clarity text-xs font-bold text-rose-400">{item.word.pinyin}</span>
                      {isSrsActive && item.isDue && (
                        <span className="px-1.5 py-0.5 rounded-[2px] bg-rose-600/90 border border-rose-300 text-white font-pixel-header text-[7px] uppercase tracking-wider leading-none">
                          Due
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{item.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex flex-col items-center justify-center leading-tight px-2 py-1 shrink-0 rounded-lg border ${getMasteryTierMeta(item.mastery).badgeClass}`}>
                    <span className="text-[11px] font-black leading-tight">Lv.{item.mastery}/10</span>
                    <span className="text-[10px] font-bold leading-tight">{getMasteryTierMeta(item.mastery).tier}</span>
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${modMeta.badgeClass}`}
                  >
                    {modMeta.shortLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Single-Skill Drills & Custom Decks Access */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-4 space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Focused Single-Skill Drills ({activeLesson?.title || 'Active Unit'})
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onLaunchActivity('writing')}
            className="game-btn-3d p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-left"
          >
            <span className="text-[10px] font-black uppercase text-amber-400 block">
              Calligraphy
            </span>
            <span className="text-xs font-extrabold text-white">Stroke Order (<span className="font-hanzi">米字格</span>)</span>
          </button>

          <button
            type="button"
            onClick={() => onLaunchActivity('dictation_only')}
            className="game-btn-3d p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-left"
          >
            <span className="text-[10px] font-black uppercase text-emerald-400 block">
              Ear Training
            </span>
            <span className="text-xs font-extrabold text-white">Pinyin / Hanzi Dictation</span>
          </button>

          <button
            type="button"
            onClick={() => onLaunchActivity('speaking_only')}
            className="game-btn-3d p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-left"
          >
            <span className="text-[10px] font-black uppercase text-sky-400 block">
              Oral Check
            </span>
            <span className="text-xs font-extrabold text-white">Speech Recognition</span>
          </button>

          <button
            type="button"
            onClick={() => onLaunchActivity('flashcards')}
            className="game-btn-3d p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-left"
          >
            <span className="text-[10px] font-black uppercase text-rose-400 block">
              Discovery
            </span>
            <span className="text-xs font-extrabold text-white">3D Flashcards</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: LIBRARY & ORTHOGRAPHY STUDIO VIEW
// ============================================================================
const QUICK_ADD_CATEGORY_PRESETS = {
  verb: { pos: 'verb', features: ['action'] },
  noun_person: { pos: 'noun', features: ['human'] },
  noun_place: { pos: 'place', features: ['place'] },
  noun_language: { pos: 'noun', features: ['language', 'learnable'] },
  noun_food_drink: { pos: 'noun', features: ['food', 'drink', 'buyable'] },
  noun_object: { pos: 'noun', features: ['object', 'buyable'] },
  time: { pos: 'time', features: ['time'] },
  adj: { pos: 'adj', features: ['adj', 'gradable'] },
  expression: { pos: 'expression', features: ['clause'] }
};

const QUICK_ADD_CATEGORY_OPTIONS = [
  { value: 'auto', label: 'Auto-detect (HSK Lexicon & Rules)' },
  { value: 'verb', label: 'Action / Verb' },
  { value: 'noun_person', label: 'Person / Nationality / Role' },
  { value: 'noun_place', label: 'Place / Country / Location' },
  { value: 'noun_language', label: 'Language' },
  { value: 'noun_food_drink', label: 'Food or Drink' },
  { value: 'noun_object', label: 'Object / Item' },
  { value: 'time', label: 'Time / Date' },
  { value: 'adj', label: 'Adjective / Description' },
  { value: 'expression', label: 'Full Phrase / Expression' }
];

function resolveWordCategoryPresetKey(overrideObj) {
  if (!overrideObj || typeof overrideObj !== 'object') return 'auto';
  if (overrideObj.categoryKey && QUICK_ADD_CATEGORY_PRESETS[overrideObj.categoryKey]) {
    return overrideObj.categoryKey;
  }
  const pos = overrideObj.pos || '';
  const features = Array.isArray(overrideObj.features) ? overrideObj.features : [];
  if (pos === 'verb') return 'verb';
  if (pos === 'place') return 'noun_place';
  if (pos === 'time') return 'time';
  if (pos === 'adj') return 'adj';
  if (pos === 'expression') return 'expression';
  if (pos === 'noun') {
    if (features.includes('human')) return 'noun_person';
    if (features.includes('language')) return 'noun_language';
    if (features.includes('food') || features.includes('drink')) return 'noun_food_drink';
    if (features.includes('object')) return 'noun_object';
  }
  return 'auto';
}

const BASIC_STROKES_8 = [
  {
    id: 'heng',
    hanzi: '横',
    pinyin: 'héng',
    english: 'Horizontal',
    category: 'Fundamental',
    rule: 'Write left to right with a slight upward tilt, pressing gently at both ends.',
    examples: [
      { char: '一', pinyin: 'yī', meaning: 'one' },
      { char: '三', pinyin: 'sān', meaning: 'three' },
      { char: '工', pinyin: 'gōng', meaning: 'work' }
    ]
  },
  {
    id: 'shu',
    hanzi: '竖',
    pinyin: 'shù',
    english: 'Vertical',
    category: 'Fundamental',
    rule: 'Draw straight from top to bottom; never pull a vertical stroke upward.',
    examples: [
      { char: '十', pinyin: 'shí', meaning: 'ten' },
      { char: '工', pinyin: 'gōng', meaning: 'work' },
      { char: '中', pinyin: 'zhōng', meaning: 'middle' }
    ]
  },
  {
    id: 'pie',
    hanzi: '撇',
    pinyin: 'piě',
    english: 'Left-Falling',
    category: 'Fundamental',
    rule: 'Start at the top-right and curve smoothly down to the bottom-left, tapering off.',
    examples: [
      { char: '人', pinyin: 'rén', meaning: 'person' },
      { char: '八', pinyin: 'bā', meaning: 'eight' },
      { char: '月', pinyin: 'yuè', meaning: 'moon/month' }
    ]
  },
  {
    id: 'na',
    hanzi: '捺',
    pinyin: 'nà',
    english: 'Right-Falling',
    category: 'Fundamental',
    rule: 'Sweep downward to the right, pressing firmly near the base before releasing rightward.',
    examples: [
      { char: '大', pinyin: 'dà', meaning: 'big' },
      { char: '天', pinyin: 'tiān', meaning: 'day/sky' },
      { char: '人', pinyin: 'rén', meaning: 'person' }
    ]
  },
  {
    id: 'dian',
    hanzi: '点',
    pinyin: 'diǎn',
    english: 'Dot',
    category: 'Fundamental',
    rule: 'Press briefly downward and slightly right; start light and finish fuller.',
    examples: [
      { char: '六', pinyin: 'liù', meaning: 'six' },
      { char: '太', pinyin: 'tài', meaning: 'too/very' },
      { char: '主', pinyin: 'zhǔ', meaning: 'main/host' }
    ]
  },
  {
    id: 'ti',
    hanzi: '提',
    pinyin: 'tí',
    english: 'Rising',
    category: 'Fundamental',
    rule: 'Press at the bottom-left and flick briskly upward to the top-right in one motion.',
    examples: [
      { char: '打', pinyin: 'dǎ', meaning: 'hit/play' },
      { char: '习', pinyin: 'xí', meaning: 'practice' },
      { char: '我', pinyin: 'wǒ', meaning: 'I/me' }
    ]
  },
  {
    id: 'zhe',
    hanzi: '折',
    pinyin: 'zhé',
    english: 'Turning',
    category: 'Compound • 横折 / 竖折',
    rule: 'Change direction cleanly at a sharp corner in one unbroken stroke (e.g. horizontal-then-down 横折 or down-then-right 竖折).',
    examples: [
      { char: '口', pinyin: 'kǒu', meaning: 'mouth' },
      { char: '山', pinyin: 'shān', meaning: 'mountain' },
      { char: '日', pinyin: 'rì', meaning: 'sun/day' }
    ]
  },
  {
    id: 'gou',
    hanzi: '钩',
    pinyin: 'gōu',
    english: 'Hook',
    category: 'Compound • 竖钩 / 弯钩 / 斜钩',
    rule: 'Pause briefly at the end of a vertical or curved stroke, then flick sharply into a crisp hook.',
    examples: [
      { char: '小', pinyin: 'xiǎo', meaning: 'small' },
      { char: '我', pinyin: 'wǒ', meaning: 'I/me' },
      { char: '水', pinyin: 'shuǐ', meaning: 'water' }
    ]
  }
];

function BasicStrokeSvg({ strokeId }) {
  const arrowMarkerId = `stroke-arrow-${strokeId}`;
  const pathMap = {
    heng: { d: 'M 14 43 Q 40 39 64 38', start: [14, 43] },
    shu: { d: 'M 40 14 L 40 64', start: [40, 14] },
    pie: { d: 'M 54 14 Q 46 44 19 64', start: [54, 14] },
    na: { d: 'M 19 17 Q 37 46 64 62', start: [19, 17] },
    dian: { d: 'M 29 25 Q 42 36 51 53', start: [29, 25] },
    ti: { d: 'M 18 57 L 62 27', start: [18, 57] },
    zhe: { d: 'M 18 22 L 58 22 L 58 61', start: [18, 22], corner: [58, 22] },
    gou: { d: 'M 46 14 L 46 62 L 26 51', start: [46, 14], corner: [46, 62] }
  };
  const spec = pathMap[strokeId] || pathMap.heng;

  return (
    <svg
      viewBox="0 0 80 80"
      className="w-16 h-16 shrink-0 bg-slate-950 border-2 border-slate-700 rounded-[2px]"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" />
        </marker>
      </defs>
      {/* Subtle 田 calligraphy guide grid */}
      <line x1="40" y1="4" x2="40" y2="76" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="4" y1="40" x2="76" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="4" y="4" width="72" height="72" fill="none" stroke="#1e293b" strokeWidth="1" />

      {/* Main stroke path with directional arrowhead */}
      <path
        d={spec.d}
        fill="none"
        stroke="#f8fafc"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${arrowMarkerId})`}
      />

      {/* Optional turning/pivot corner dot */}
      {spec.corner && (
        <circle cx={spec.corner[0]} cy={spec.corner[1]} r="3" fill="#38bdf8" />
      )}

      {/* Start dot (amber) */}
      <circle
        cx={spec.start[0]}
        cy={spec.start[1]}
        r="4.5"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const CHARACTER_STRUCTURES_6 = [
  {
    id: 'single',
    title: 'Single-Component',
    hanzi: '独体字',
    pinyin: 'dútǐzì',
    orderHint: 'Write as one indivisible unit following standard top-to-bottom and left-to-right stroke rules.',
    examples: [
      { char: '人', pinyin: 'rén', meaning: 'person' },
      { char: '日', pinyin: 'rì', meaning: 'sun/day' },
      { char: '月', pinyin: 'yuè', meaning: 'moon/month' },
      { char: '木', pinyin: 'mù', meaning: 'wood/tree' },
      { char: '水', pinyin: 'shuǐ', meaning: 'water' }
    ],
    extraPool: ['大', '小', '中', '山', '火', '口', '女', '子', '车', '门', '我', '书']
  },
  {
    id: 'left_right',
    title: 'Left–Right',
    hanzi: '左右结构',
    pinyin: 'zuǒyòu jiégòu',
    orderHint: 'Write the left radical completely first (1), then write the right phonetic or semantic component (2).',
    examples: [
      { char: '好', pinyin: 'hǎo', meaning: 'good' },
      { char: '你', pinyin: 'nǐ', meaning: 'you' },
      { char: '妈', pinyin: 'mā', meaning: 'mom' },
      { char: '喝', pinyin: 'hē', meaning: 'drink' },
      { char: '吃', pinyin: 'chī', meaning: 'eat' }
    ],
    extraPool: ['他', '她', '们', '很', '明', '朋', '语', '说', '请', '看', '现', '汉']
  },
  {
    id: 'top_bottom',
    title: 'Top–Bottom',
    hanzi: '上下结构',
    pinyin: 'shàngxià jiégòu',
    orderHint: 'Finish the upper radical/component first (1), then construct the lower component underneath (2).',
    examples: [
      { char: '爸', pinyin: 'bà', meaning: 'dad' },
      { char: '字', pinyin: 'zì', meaning: 'character' },
      { char: '学', pinyin: 'xué', meaning: 'study' },
      { char: '思', pinyin: 'sī', meaning: 'think' },
      { char: '早', pinyin: 'zǎo', meaning: 'early/morning' }
    ],
    extraPool: ['是', '茶', '家', '星', '名', '多', '高', '喜', '爱', '见', '点', '热']
  },
  {
    id: 'left_mid_right',
    title: 'Left–Middle–Right',
    hanzi: '左中右结构',
    pinyin: 'zuǒzhōngyòu jiégòu',
    orderHint: 'Build cleanly from left (1) to center (2) to right (3), keeping each vertical column balanced.',
    examples: [
      { char: '谢', pinyin: 'xiè', meaning: 'thank' },
      { char: '树', pinyin: 'shù', meaning: 'tree' },
      { char: '班', pinyin: 'bān', meaning: 'class/shift' },
      { char: '做', pinyin: 'zuò', meaning: 'do/make' }
    ],
    extraPool: ['哪', '街', '游', '倒', '湖', '脚']
  },
  {
    id: 'semi_enclosed',
    title: 'Semi-Enclosed',
    hanzi: '半包围结构',
    pinyin: 'bànbāowéi jiégòu',
    orderHint: 'Top/left wrappers (同, 问, 病) are written before the inside; bottom-left walkers (辶 in 这, 还) wrap LAST.',
    examples: [
      { char: '这', pinyin: 'zhè', meaning: 'this' },
      { char: '还', pinyin: 'hái', meaning: 'still/also' },
      { char: '同', pinyin: 'tóng', meaning: 'same' },
      { char: '问', pinyin: 'wèn', meaning: 'ask' },
      { char: '医', pinyin: 'yī', meaning: 'doctor/medicine' },
      { char: '病', pinyin: 'bìng', meaning: 'illness' }
    ],
    extraPool: ['进', '远', '送', '友', '风', '店', '床', '厅', '区']
  },
  {
    id: 'full_enclosed',
    title: 'Full-Enclosed',
    hanzi: '全包围结构',
    pinyin: 'quánbāowéi jiégòu',
    orderHint: 'Outside frame first (left, top, right), fill the entire inside component, then seal the bottom horizontal stroke last.',
    examples: [
      { char: '国', pinyin: 'guó', meaning: 'country' },
      { char: '回', pinyin: 'huí', meaning: 'return' },
      { char: '园', pinyin: 'yuán', meaning: 'garden/park' },
      { char: '四', pinyin: 'sì', meaning: 'four' }
    ],
    extraPool: ['因', '图', '圆', '团', '围']
  }
];

function CharacterStructureSvg({ structureId }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-16 h-16 shrink-0 bg-slate-950 border-2 border-slate-700 rounded-[2px]"
      aria-hidden="true"
    >
      {structureId === 'single' && (
        <>
          <rect x="8" y="8" width="48" height="48" fill="#e11d48" fillOpacity="0.22" stroke="#fb7185" strokeWidth="2.5" />
          <line x1="32" y1="10" x2="32" y2="54" stroke="#fb7185" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="10" y1="32" x2="54" y2="32" stroke="#fb7185" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
          <text x="32" y="37" textAnchor="middle" fill="#fecdd3" fontSize="14" fontWeight="900">1</text>
        </>
      )}

      {structureId === 'left_right' && (
        <>
          <rect x="6" y="8" width="24" height="48" fill="#e11d48" fillOpacity="0.25" stroke="#fb7185" strokeWidth="2.5" />
          <rect x="34" y="8" width="24" height="48" fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="2.5" />
          <text x="18" y="37" textAnchor="middle" fill="#fecdd3" fontSize="13" fontWeight="900">1</text>
          <text x="46" y="37" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="900">2</text>
        </>
      )}

      {structureId === 'top_bottom' && (
        <>
          <rect x="8" y="6" width="48" height="24" fill="#e11d48" fillOpacity="0.25" stroke="#fb7185" strokeWidth="2.5" />
          <rect x="8" y="34" width="48" height="24" fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="2.5" />
          <text x="32" y="23" textAnchor="middle" fill="#fecdd3" fontSize="13" fontWeight="900">1</text>
          <text x="32" y="51" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="900">2</text>
        </>
      )}

      {structureId === 'left_mid_right' && (
        <>
          <rect x="5" y="8" width="16" height="48" fill="#e11d48" fillOpacity="0.25" stroke="#fb7185" strokeWidth="2" />
          <rect x="24" y="8" width="16" height="48" fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="2" />
          <rect x="43" y="8" width="16" height="48" fill="#0ea5e9" fillOpacity="0.22" stroke="#38bdf8" strokeWidth="2" />
          <text x="13" y="37" textAnchor="middle" fill="#fecdd3" fontSize="12" fontWeight="900">1</text>
          <text x="32" y="37" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="900">2</text>
          <text x="51" y="37" textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="900">3</text>
        </>
      )}

      {structureId === 'semi_enclosed' && (
        <>
          {/* Outer top-left-right / L wrapper */}
          <path
            d="M 7 57 L 7 7 L 57 7 L 57 21 L 21 21 L 21 57 Z"
            fill="#e11d48"
            fillOpacity="0.28"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
          <rect x="26" y="26" width="31" height="31" fill="#f59e0b" fillOpacity="0.24" stroke="#fbbf24" strokeWidth="2.5" />
          <text x="14" y="18" textAnchor="middle" fill="#fecdd3" fontSize="10" fontWeight="900">1</text>
          <text x="41.5" y="46" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="900">2</text>
        </>
      )}

      {structureId === 'full_enclosed' && (
        <>
          {/* Outer 3-sided frame (1) + dashed bottom seal (3) */}
          <rect x="6" y="6" width="52" height="52" fill="#e11d48" fillOpacity="0.16" stroke="none" />
          <path d="M 7 56 L 7 7 L 57 7 L 57 56" fill="none" stroke="#fb7185" strokeWidth="3" />
          <line x1="6" y1="57" x2="58" y2="57" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 2" />
          <rect x="18" y="18" width="28" height="28" fill="#f59e0b" fillOpacity="0.26" stroke="#fbbf24" strokeWidth="2.2" />
          <text x="32" y="36" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="900">2</text>
          <text x="13" y="16" textAnchor="middle" fill="#fecdd3" fontSize="9" fontWeight="900">1</text>
          <text x="51" y="54" textAnchor="middle" fill="#7dd3fc" fontSize="9" fontWeight="900">3</text>
        </>
      )}
    </svg>
  );
}

/** @param {any} props */
export function LibraryView({
  progress,
  courses,
  activeCourse,
  customDecks,
  unlockedWords = [],
  allUniqueWordsArray = [],
  initialLibraryTarget = null,
  onConsumeLibraryTarget = null,
  linguisticDataStatus = {
    loaded: false,
    lexiconCount: 0,
    preloadedCoursesCount: 0,
    corpusCount: 0,
    corpusSource: 'starter',
    source: 'embedded'
  },
  isSyncingData = false,
  onSyncLinguisticData,
  onSaveWordLinguisticOverride,
  onCycleWordPriority,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onOpenShadowing,
  onAddWordsToDeck,
  onAddImportedCourse,
  onDeleteCourse,
  onSelectCourseOnMap,
  onPracticeDeck,
  onExportAllData,
  onImportBackupData,
  onCompleteStrokeRuleDojo,
  onRecordStudySeconds,
  triggerToast
}) {
  const [librarySection, setLibrarySection] = useState('decks');
  const [strokesSubTab, setStrokesSubTab] = useState('strokes');
  const [referenceTab, setReferenceTab] = useState('vocab'); // 'vocab' | 'corpus'
  const [editingCategoryWordKey, setEditingCategoryWordKey] = useState(null);
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState(null);
  const [studioToolMode, setStudioToolMode] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseBandFilter, setCourseBandFilter] = useState('all');
  const [vocabFilterMode, setVocabFilterMode] = useState('all');

  // Bilingual Corpus Browser state
  const [corpusSearchQuery, setCorpusSearchQuery] = useState('');
  const [corpusFilter, setCorpusFilter] = useState('all');
  const [hideCorpusTranslations, setHideCorpusTranslations] = useState(false);
  const [revealedCorpusIds, setRevealedCorpusIds] = useState({});
  const [corpusVisibleCount, setCorpusVisibleCount] = useState(50);

  useEffect(() => {
    if (!initialLibraryTarget) return;
    if (initialLibraryTarget.section) {
      setLibrarySection(initialLibraryTarget.section);
    }
    if (initialLibraryTarget.studioToolMode) {
      setStudioToolMode(initialLibraryTarget.studioToolMode);
    }
    if (initialLibraryTarget.referenceTab) {
      setLibrarySection('decks');
      setStudioToolMode('none');
      setReferenceTab(initialLibraryTarget.referenceTab);
    }
    onConsumeLibraryTarget?.();
  }, [initialLibraryTarget, onConsumeLibraryTarget]);

  const filteredLibraryCourses = useMemo(
    () =>
      sortCoursesCanonically(
        (Array.isArray(courses) ? courses : []).filter((c) =>
          matchesCourseHskFilter(c, courseBandFilter)
        )
      ),
    [courses, courseBandFilter]
  );
  const [vocabVisibleCount, setVocabVisibleCount] = useState(50);
  const [selectedCharEntry, setSelectedCharEntry] = useState(null);

  useEffect(() => {
    setVocabVisibleCount(50);
  }, [searchQuery, vocabFilterMode]);

  useEffect(() => {
    setCorpusVisibleCount(50);
  }, [corpusSearchQuery, corpusFilter]);

  const annotatedCorpusList = useMemo(
    () => annotateCorpusReadiness(unlockedWords),
    [unlockedWords, linguisticDataStatus?.corpusCount, linguisticDataStatus?.lastSyncedAt]
  );

  const corpusFilterCounts = useMemo(() => {
    let i0 = 0;
    let i1 = 0;
    let hsk1 = 0;
    let hsk2 = 0;
    let hsk3 = 0;
    let hsk4Plus = 0;
    for (let i = 0; i < annotatedCorpusList.length; i++) {
      const s = annotatedCorpusList[i];
      if (s.inputLevel === 'i+0') i0 += 1;
      else if (s.inputLevel === 'i+1') i1 += 1;
      const lv = Number(s.hskLevel || 1);
      if (lv === 1) hsk1 += 1;
      else if (lv === 2) hsk2 += 1;
      else if (lv === 3) hsk3 += 1;
      else if (lv >= 4) hsk4Plus += 1;
    }
    return {
      all: annotatedCorpusList.length,
      i0,
      i1,
      hsk_1: hsk1,
      hsk_2: hsk2,
      hsk_3: hsk3,
      hsk_4_plus: hsk4Plus
    };
  }, [annotatedCorpusList]);

  const filteredCorpusList = useMemo(() => {
    const q = corpusSearchQuery.trim().toLowerCase();
    return annotatedCorpusList.filter((sent) => {
      const lv = Number(sent.hskLevel || 1);
      if (corpusFilter === 'i0' && sent.inputLevel !== 'i+0') return false;
      if (corpusFilter === 'i1' && sent.inputLevel !== 'i+1') return false;
      if (corpusFilter === 'hsk_1' && lv !== 1) return false;
      if (corpusFilter === 'hsk_2' && lv !== 2) return false;
      if (corpusFilter === 'hsk_3' && lv !== 3) return false;
      if (corpusFilter === 'hsk_4_plus' && lv < 4) return false;

      if (!q) return true;
      const topicText = String(sent.topic || '').replace(/_/g, ' ').toLowerCase();
      const pinyinText = String(sent.pinyin || '').toLowerCase();
      const pinyinPlain = stripToneMarks(pinyinText).toLowerCase();
      return (
        String(sent.hanzi || '').toLowerCase().includes(q) ||
        pinyinText.includes(q) ||
        pinyinPlain.includes(q) ||
        String(sent.english || '').toLowerCase().includes(q) ||
        topicText.includes(q)
      );
    });
  }, [annotatedCorpusList, corpusFilter, corpusSearchQuery]);

  const [radicalFilterMode, setRadicalFilterMode] = useState('all');
  const [radicalSearch, setRadicalSearch] = useState('');

  const [expandedRuleId, setExpandedRuleId] = useState('rule_1');
  const [activeRuleChallenge, setActiveRuleChallenge] = useState(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [singleHanzi, setSingleHanzi] = useState('');
  const [singlePinyin, setSinglePinyin] = useState('');
  const [singleMeaning, setSingleMeaning] = useState('');
  const [singleExample, setSingleExample] = useState('');
  const [singleCategory, setSingleCategory] = useState('auto');
  const [singleDeckName, setSingleDeckName] = useState('Custom Vocabulary');
  const [customNewDeckName, setCustomNewDeckName] = useState('');

  const [bulkText, setBulkText] = useState('');
  const [bulkTargetDeck, setBulkTargetDeck] = useState('Custom Vocabulary');

  const [jsonTextInput, setJsonTextInput] = useState('');
  const [rawHskDataPending, setRawHskDataPending] = useState(null);
  const [availableHskLevels, setAvailableHskLevels] = useState([]);
  const [selectedHskTag, setSelectedHskTag] = useState('new-1');
  const [customHskCourseTitle, setCustomHskCourseTitle] = useState('');

  const courseFileInputRef = useRef(null);
  const backupFileInputRef = useRef(null);

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    const h = singleHanzi.trim();
    const p = singlePinyin.trim();
    const m = singleMeaning.trim();
    const ex = singleExample.trim();

    if (!h || !p || !m) {
      triggerToast('Missing Required Fields', 'Hanzi, Pinyin, and English Meaning are required.');
      return;
    }

    const finalDeck =
      singleDeckName === '__NEW__'
        ? customNewDeckName.trim() || 'Custom Vocabulary'
        : singleDeckName;

    onAddWordsToDeck(finalDeck, [
      {
        hanzi: h,
        pinyin: p,
        meaning: m,
        english: m,
        example: ex
      }
    ]);

    if (singleCategory !== 'auto' && QUICK_ADD_CATEGORY_PRESETS[singleCategory]) {
      onSaveWordLinguisticOverride?.(
        { hanzi: h },
        { ...QUICK_ADD_CATEGORY_PRESETS[singleCategory], categoryKey: singleCategory }
      );
    }

    setSingleHanzi('');
    setSinglePinyin('');
    setSingleMeaning('');
    setSingleExample('');
    setSingleCategory('auto');
    setQuickAddOpen(false);
    triggerToast(`Added "${h}" (${p})`, `Saved to deck "${finalDeck}"`);
  };

  const parsedBulkPreview = useMemo(() => {
    if (!bulkText.trim()) return [];
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedRows = [];
    lines.forEach((line) => {
      let parts = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((s) => s.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map((s) => s.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((s) => s.trim());
      } else {
        return;
      }

      const [hanzi, pinyin, meaning, example] = parts;
      if (hanzi && pinyin && meaning) {
        parsedRows.push({
          hanzi,
          pinyin,
          meaning,
          english: meaning,
          example: example || ''
        });
      }
    });
    return parsedRows;
  }, [bulkText]);

  const handleBulkImportConfirm = () => {
    if (parsedBulkPreview.length === 0) {
      triggerToast(
        'No Valid Rows Found',
        'Use format: Hanzi ; Pinyin ; English Meaning ; Example (optional)'
      );
      return;
    }
    onAddWordsToDeck(bulkTargetDeck, parsedBulkPreview);
    setBulkText('');
    setStudioToolMode('none');
    setLibrarySection('decks');
    triggerToast(
      `Imported ${parsedBulkPreview.length} Words!`,
      `Added to "${bulkTargetDeck}"`
    );
  };

  const processCourseJsonData = (parsedJson, sourceLabel = 'Uploaded JSON') => {
    if (
      parsedJson &&
      !Array.isArray(parsedJson) &&
      typeof parsedJson === 'object' &&
      Array.isArray(parsedJson.lessons)
    ) {
      const courseName = String(parsedJson.courseName || sourceLabel || 'Imported Course').trim();
      const normalizedLessons = parsedJson.lessons
        .map((lesson, lIdx) => {
          const rawWords = lesson.words || lesson.items || lesson.vocabulary || [];
          return {
            id: lesson.id || `lesson_${Date.now()}_${lIdx + 1}`,
            title: lesson.title || lesson.lessonName || lesson.name || `Unit ${lIdx + 1}`,
            words: rawWords.map((w, wIdx) =>
              normalizeWordEntry(
                {
                  hanzi: w.hanzi || w.simplified || w.character,
                  pinyin: w.pinyin || w.forms?.[0]?.transcriptions?.pinyin || '',
                  pinyinNum: w.pinyinNum || w.numeric || w.forms?.[0]?.transcriptions?.numeric || '',
                  meaning:
                    w.meaning ||
                    w.english ||
                    (Array.isArray(w.meanings) ? w.meanings.slice(0, 3).join('; ') : ''),
                  example: w.example || w.notes || w.exampleHanzi || ''
                },
                wIdx
              )
            )
          };
        })
        .filter((l) => l.words.length > 0);

      if (normalizedLessons.length === 0) {
        triggerToast('Empty Course JSON', 'No lessons with valid words were found.');
        return;
      }

      const newCourse = {
        id: `course_std_${Date.now()}`,
        courseName,
        sourceType: 'standard-json',
        lessons: normalizedLessons
      };

      onAddImportedCourse(newCourse, false);
      setJsonTextInput('');
      triggerToast(
        `Course "${courseName}" Imported!`,
        `${normalizedLessons.length} lesson(s) added to the Map selector.`
      );
      return;
    }

    const getHskSimplified = (entry) => entry?.simplified || entry?.s || '';
    const getHskLevels = (entry) =>
      Array.isArray(entry?.level) ? entry.level : Array.isArray(entry?.l) ? entry.l : [];

    if (
      Array.isArray(parsedJson) &&
      parsedJson.length > 0 &&
      Boolean(getHskSimplified(parsedJson[0]))
    ) {
      const levelCounts = {};
      parsedJson.forEach((entry) => {
        getHskLevels(entry).forEach((tag) => {
          levelCounts[tag] = (levelCounts[tag] || 0) + 1;
        });
      });

      const priorityOrder = [
        'new-1',
        'new-2',
        'new-3',
        'new-4',
        'new-5',
        'new-6',
        'new-7+',
        'old-1',
        'old-2',
        'old-3',
        'old-4',
        'old-5',
        'old-6'
      ];

      const sortedTags = Object.keys(levelCounts).sort((a, b) => {
        const idxA = priorityOrder.indexOf(a);
        const idxB = priorityOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const tagList =
        sortedTags.length > 0
          ? sortedTags.map((tag) => ({ tag, count: levelCounts[tag] }))
          : [{ tag: 'all', count: parsedJson.length }];

      const defaultTag = tagList[0].tag;
      setRawHskDataPending(parsedJson);
      setAvailableHskLevels(tagList);
      setSelectedHskTag(defaultTag);
      setCustomHskCourseTitle(`HSK (${defaultTag.toUpperCase()})`);
      return;
    }

    triggerToast(
      'Unrecognized JSON Format',
      'Upload either { "courseName", "lessons" } or a complete-hsk-vocabulary array.'
    );
  };

  const handleConfirmHskLevelExtraction = () => {
    if (!Array.isArray(rawHskDataPending) || rawHskDataPending.length === 0) return;

    const getHskLevels = (item) =>
      Array.isArray(item?.level) ? item.level : Array.isArray(item?.l) ? item.l : [];

    const filteredEntries =
      selectedHskTag === 'all'
        ? rawHskDataPending
        : rawHskDataPending.filter((item) => getHskLevels(item).includes(selectedHskTag));

    if (filteredEntries.length === 0) {
      triggerToast('No Matching Words', `No entries matched level tag "${selectedHskTag}".`);
      return;
    }

    const mappedWords = filteredEntries.map((item, idx) => {
      const formsList = Array.isArray(item.forms)
        ? item.forms
        : Array.isArray(item.f)
        ? item.f
        : [];
      const firstForm = formsList[0] || {};
      const transcriptions = firstForm.transcriptions || {};
      const minifiedTrans = firstForm.i || {};
      const rawMeanings = Array.isArray(firstForm.meanings)
        ? firstForm.meanings
        : Array.isArray(firstForm.m)
        ? firstForm.m
        : [];
      const joinedMeaning = rawMeanings.slice(0, 3).join('; ');
      const rawClassifiers = Array.isArray(firstForm.classifiers)
        ? firstForm.classifiers
        : Array.isArray(firstForm.c)
        ? firstForm.c
        : [];
      const classifiers = rawClassifiers.filter(Boolean);
      const meaningWithClassifiers =
        classifiers.length > 0
          ? `${joinedMeaning} (CL: ${classifiers.join(', ')})`
          : joinedMeaning;

      return normalizeWordEntry(
        {
          hanzi: item.simplified || item.s || '',
          pinyin: transcriptions.pinyin || minifiedTrans.y || '',
          pinyinNum: transcriptions.numeric || minifiedTrans.n || '',
          meaning: meaningWithClassifiers || 'HSK vocabulary',
          classifiers
        },
        idx
      );
    });

    const CHUNK_SIZE = 20;
    const chunkedLessons = [];
    for (let i = 0; i < mappedWords.length; i += CHUNK_SIZE) {
      const unitNumber = Math.floor(i / CHUNK_SIZE) + 1;
      const chunk = mappedWords.slice(i, i + CHUNK_SIZE);
      chunkedLessons.push({
        id: `hsk_${selectedHskTag}_unit_${unitNumber}_${Date.now()}`,
        title: `Unit ${unitNumber}`,
        words: chunk
      });
    }

    const finalCourseName =
      customHskCourseTitle.trim() || `HSK Course (${selectedHskTag.toUpperCase()})`;

    const newCourse = {
      id: `course_hsk_${selectedHskTag}_${Date.now()}`,
      courseName: finalCourseName,
      sourceType: 'complete-hsk-vocabulary',
      hskLevelTag: selectedHskTag,
      lessons: chunkedLessons
    };

    onAddImportedCourse(newCourse, true);
    setRawHskDataPending(null);
    setJsonTextInput('');
    triggerToast(
      `Extracted ${mappedWords.length} Words (${selectedHskTag})!`,
      `Chunked into ${chunkedLessons.length} sequential unit(s) of up to 20 words on the Map.`
    );
  };

  const handleCourseFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        processCourseJsonData(parsed, file.name.replace(/\.json$/i, ''));
      } catch (err) {
        triggerToast('JSON Parse Error', 'Please upload a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBackupFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        onImportBackupData(parsed);
      } catch (err) {
        triggerToast('Invalid Backup JSON', 'Could not parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const librarySrsMap = progress.srsData || progress.srsSchedule || {};

  const { filteredWordsList, libraryLeechCount } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [];
    const seen = new Set();
    let leechCount = 0;

    sortCoursesCanonically(courses).forEach((c) => {
      (c.lessons || []).forEach((l) => {
        (l.words || []).forEach((w, idx) => {
          const norm = normalizeWordEntry(w, idx);
          const key = `${norm.hanzi}_${c.courseName}`;
          if (!seen.has(key)) {
            seen.add(key);
            const srsEntry = getWordSrsEntry(librarySrsMap, norm);
            const isLeech = Boolean(srsEntry?.isLeech);
            if (isLeech) leechCount += 1;
            list.push({
              ...norm,
              sourceBadge: `${c.courseName} • ${l.title}`,
              _srsEntry: srsEntry,
              _isLeech: isLeech
            });
          }
        });
      });
    });

    customDecks.forEach((d) => {
      (d.words || []).forEach((w, idx) => {
        const norm = normalizeWordEntry(w, idx);
        const key = `${norm.hanzi}_${d.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          const srsEntry = getWordSrsEntry(librarySrsMap, norm);
          const isLeech = Boolean(srsEntry?.isLeech);
          if (isLeech) leechCount += 1;
          list.push({
            ...norm,
            sourceBadge: `Deck: ${d.name}`,
            _srsEntry: srsEntry,
            _isLeech: isLeech
          });
        }
      });
    });

    const filteredByMode =
      vocabFilterMode === 'leeches' && leechCount > 0
        ? list.filter((item) => item._isLeech)
        : list;

    const finalFiltered = !q
      ? filteredByMode
      : filteredByMode.filter(
          (item) =>
            item.hanzi.toLowerCase().includes(q) ||
            item.pinyin.toLowerCase().includes(q) ||
            item.pinyinToneless.toLowerCase().includes(q) ||
            (item.meaning || '').toLowerCase().includes(q)
        );

    return { filteredWordsList: finalFiltered, libraryLeechCount: leechCount };
  }, [courses, customDecks, searchQuery, vocabFilterMode, librarySrsMap]);

  const characterMatrixList = useMemo(() => {
    const charMap = new window.Map();
    const targetCourse = sortCourseLessonsNumerically(
      activeCourse || courses[0] || DEFAULT_COURSES[0]
    );

    (targetCourse?.lessons || []).forEach((lesson) => {
      (lesson.words || []).forEach((rawWord, wIdx) => {
        const word = normalizeWordEntry(rawWord, wIdx);
        const wordMastery = getWordMasteryLevel(progress.mastery, word);
        const parsedSyllables = parsePinyinSyllablesWithTones(word.pinyin, word.hanzi);
        const chars = Array.from(word.hanzi).filter((c) => /[\u4e00-\u9fff]/.test(c));

        chars.forEach((ch, cIdx) => {
          const syllable = parsedSyllables[cIdx]?.syllable || word.pinyin;
          if (!charMap.has(ch)) {
            charMap.set(ch, {
              char: ch,
              pinyinSyllables: [syllable],
              meanings: [(word.meaning || word.english).split(/[;/]/)[0].trim()],
              mastery: wordMastery,
              sourceWords: [word]
            });
          } else {
            const existing = charMap.get(ch);
            if (!existing.pinyinSyllables.includes(syllable)) {
              existing.pinyinSyllables.push(syllable);
            }
            const shortMeaning = (word.meaning || word.english).split(/[;/]/)[0].trim();
            if (!existing.meanings.includes(shortMeaning)) {
              existing.meanings.push(shortMeaning);
            }
            existing.mastery = Math.max(existing.mastery, wordMastery);
            if (!existing.sourceWords.some((sw) => sw.hanzi === word.hanzi)) {
              existing.sourceWords.push(word);
            }
          }
        });
      });
    });

    return Array.from(charMap.values());
  }, [activeCourse, courses, progress.mastery]);

  const allLoadedCharactersMap = useMemo(() => {
    const map = new window.Map();

    const registerWordChars = (rawWord, idx) => {
      const word = normalizeWordEntry(rawWord, idx);
      const wordMastery = getWordMasteryLevel(progress.mastery, word);
      const parsedSyllables = parsePinyinSyllablesWithTones(word.pinyin, word.hanzi);
      const chars = Array.from(word.hanzi).filter((c) => /[\u4e00-\u9fff]/.test(c));

      chars.forEach((ch, cIdx) => {
        const syllable =
          KNOWN_CHARACTER_INFO[ch]?.pinyin ||
          parsedSyllables[cIdx]?.syllable ||
          word.pinyin;
        const shortMeaning =
          KNOWN_CHARACTER_INFO[ch]?.meaning ||
          (word.meaning || word.english).split(/[;/]/)[0].trim();

        if (!map.has(ch)) {
          map.set(ch, {
            char: ch,
            pinyinSyllables: [syllable],
            meanings: [shortMeaning],
            mastery: wordMastery,
            inUserCourses: true,
            sourceWords: [word]
          });
        } else {
          const existing = map.get(ch);
          existing.mastery = Math.max(existing.mastery, wordMastery);
          if (!existing.pinyinSyllables.includes(syllable)) {
            existing.pinyinSyllables.push(syllable);
          }
          if (!existing.meanings.includes(shortMeaning)) {
            existing.meanings.push(shortMeaning);
          }
          if (!existing.sourceWords.some((sw) => sw.hanzi === word.hanzi)) {
            existing.sourceWords.push(word);
          }
        }
      });
    };

    courses.forEach((course) => {
      (course.lessons || []).forEach((lesson) => {
        (lesson.words || []).forEach((w, idx) => registerWordChars(w, idx));
      });
    });

    customDecks.forEach((deck) => {
      (deck.words || []).forEach((w, idx) => registerWordChars(w, idx));
    });

    return map;
  }, [courses, customDecks, progress.mastery]);

  const handleInspectCharacter = useCallback(
    (charObjOrString) => {
      soundFX.playPop();
      const ch = typeof charObjOrString === 'string' ? charObjOrString : charObjOrString.char;
      if (allLoadedCharactersMap.has(ch)) {
        setSelectedCharEntry(allLoadedCharactersMap.get(ch));
        return;
      }
      const known = KNOWN_CHARACTER_INFO[ch];
      const fallbackPinyin =
        typeof charObjOrString === 'object' && charObjOrString.pinyin
          ? charObjOrString.pinyin
          : known?.pinyin || ch;
      const fallbackMeaning =
        typeof charObjOrString === 'object' && charObjOrString.meaning
          ? charObjOrString.meaning
          : known?.meaning || 'Mandarin character';
      const fallbackMastery = getWordMasteryLevel(progress.mastery, {
        id: ch,
        hanzi: ch
      });

      setSelectedCharEntry({
        char: ch,
        pinyinSyllables: [fallbackPinyin],
        meanings: [fallbackMeaning],
        mastery: fallbackMastery,
        sourceWords: [
          normalizeWordEntry({
            id: `inspect_${ch}`,
            hanzi: ch,
            pinyin: fallbackPinyin,
            meaning: fallbackMeaning
          })
        ]
      });
    },
    [allLoadedCharactersMap, progress.mastery]
  );

  const groupedRadicalsCards = useMemo(() => {
    const q = radicalSearch.trim().toLowerCase();

    return SEMANTIC_RADICALS_25.map((rad) => {
      const matchedFromCourses = [];
      allLoadedCharactersMap.forEach((charEntry, ch) => {
        const knownRad = KNOWN_CHARACTER_INFO[ch]?.radical || '';
        const matchesKnownRadical = rad.variants.some((v) => knownRad.includes(v));
        const matchesCommonPool = rad.commonChars.includes(ch) || rad.variants.includes(ch);
        if (matchesKnownRadical || matchesCommonPool) {
          matchedFromCourses.push(charEntry);
        }
      });

      const displayPills = [...matchedFromCourses];
      rad.exampleChars.forEach((ex) => {
        if (!displayPills.some((p) => p.char === ex.char)) {
          displayPills.push({
            char: ex.char,
            pinyinSyllables: [ex.pinyin],
            meanings: [ex.meaning],
            mastery: getWordMasteryLevel(progress.mastery, { id: ex.char, hanzi: ex.char }),
            inUserCourses: false,
            sourceWords: [
              normalizeWordEntry({
                id: `ex_${ex.char}`,
                hanzi: ex.char,
                pinyin: ex.pinyin,
                meaning: ex.meaning
              })
            ]
          });
        }
      });

      return {
        ...rad,
        matchedCourseCount: matchedFromCourses.length,
        matchedFromCourses,
        displayPills
      };
    }).filter((radCard) => {
      if (radicalFilterMode === 'in_courses' && radCard.matchedCourseCount === 0) {
        return false;
      }
      if (!q) return true;
      return (
        radCard.radical.toLowerCase().includes(q) ||
        radCard.pinyinName.toLowerCase().includes(q) ||
        stripToneMarks(radCard.pinyinName).toLowerCase().includes(q) ||
        radCard.meaning.toLowerCase().includes(q) ||
        radCard.displayPills.some((p) => p.char.includes(q))
      );
    });
  }, [allLoadedCharactersMap, progress.mastery, radicalFilterMode, radicalSearch]);

  const getMasteryPillStyle = (lv = 0) => {
    const meta = getMasteryTierMeta(lv);
    return meta.badgeClass;
  };

  return (
    <div className="p-4 space-y-4 relative pb-28">
      <div className="rounded-3xl bg-slate-800/90 border border-slate-700/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 truncate">
            Orthography &amp; Vocabulary Studio
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              {allLoadedCharactersMap.size} Chars • 25 Radicals
            </span>
            <button
              type="button"
              onClick={() => onOpenShadowing?.()}
              title="Open Hands-Free Audio Shadowing"
              aria-label="Open Hands-Free Audio Shadowing"
              className="game-btn-3d px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-200 flex items-center gap-1.5 text-[11px] font-black transition-all"
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span>Shadow</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'decks', label: 'Decks', icon: BookMarked },
            { id: 'char_grid', label: 'Hanzi Grid', icon: Layers },
            { id: 'radicals', label: 'Radicals', icon: Sparkles },
            { id: 'strokes_structures', label: 'Strokes & Structures', icon: LayoutGrid },
            { id: 'stroke_rules', label: 'Stroke Rules', icon: PenTool },
            { id: 'phonetics', label: 'Phonetics', icon: Volume2 }
          ].map((item) => {
            const Icon = item.icon;
            const active = librarySection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setLibrarySection(item.id);
                }}
                className={`py-2 px-1.5 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all leading-tight text-center ${
                  active
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="w-full leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {librarySection === 'decks' && (
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'none', label: 'Browse Decks', icon: Search },
              { id: 'bulk', label: 'Bulk Paste', icon: FileSpreadsheet },
              { id: 'json_course', label: 'JSON / HSK', icon: FileJson },
              { id: 'backup', label: 'Backup', icon: Download }
            ].map((tool) => {
              const ToolIcon = tool.icon;
              const isSelected = studioToolMode === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setStudioToolMode(tool.id);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ToolIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{tool.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SUB-TAB 2: CHARACTER MATRIX ("HANZI GRID") */}
      {librarySection === 'char_grid' && (
        <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ScrollingText
                text={`Active Course: ${activeCourse?.courseName}`}
                className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400"
              />
              <h2 className="text-base font-black text-white mt-0.5">
                Character Matrix ("Hanzi Grid")
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap any character to inspect its stroke order animation, radical highlight, Pinyin, and stroke count.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-black text-white shrink-0">
              {characterMatrixList.length} Chars
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-extrabold text-center">
            <div className="py-1.5 px-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400">
              Lv.0 Unseen
            </div>
            <div className="py-1.5 px-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300">
              Lv.1–4 Novice
            </div>
            <div className="py-1.5 px-1.5 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-300">
              Lv.5–8 Scholar
            </div>
            <div className="py-1.5 px-1.5 rounded-xl bg-yellow-500/25 border border-yellow-300 text-yellow-200">
              Lv.9–10 Master ★
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {characterMatrixList.map((entry) => {
              const lv = entry.mastery;
              const tierMeta = getMasteryTierMeta(lv);

              return (
                <button
                  key={entry.char}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setSelectedCharEntry(entry);
                  }}
                  className={`game-btn-3d p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between transition-all relative ${tierMeta.tileClass}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-hanzi text-2xl font-black leading-none">{entry.char}</span>
                    <span className="text-[10px] font-bold opacity-90 mt-1 truncate max-w-full">
                      {KNOWN_CHARACTER_INFO[entry.char]?.pinyin || entry.pinyinSyllables[0]}
                    </span>
                  </div>
                  <div className="w-full mt-2 pt-1.5 border-t border-white/10">
                    <MasterySegmentedBar level={lv} compact={true} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: "RADICALS" (SEMANTIC RADICAL EXPLORER - 25 RADICALS) */}
      {librarySection === 'radicals' && (
        <div className="space-y-3.5">
          <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-3 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                  New HSK 1 Workbook Orthography
                </span>
                <h2 className="text-base font-black text-white mt-0.5">
                  Semantic Radical Explorer (25 Core Radicals)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically groups characters from your loaded courses & decks by their semantic radical. Tap any character pill to open the stroke inspector!
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-xs font-black text-rose-300 shrink-0">
                {groupedRadicalsCards.length} Shown
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={radicalSearch}
                  onChange={(e) => setRadicalSearch(e.target.value)}
                  placeholder="Search radical (口, kǒuzìpáng, water...)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setRadicalFilterMode('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                    radicalFilterMode === 'all'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All 25
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setRadicalFilterMode('in_courses');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                    radicalFilterMode === 'in_courses'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  In My Decks
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {groupedRadicalsCards.map((rad, idx) => (
              <div
                key={rad.id}
                className={`rounded-2xl bg-slate-800/85 border p-3.5 space-y-2.5 transition-all ${
                  rad.matchedCourseCount > 0
                    ? 'border-emerald-500/40 shadow-md'
                    : 'border-slate-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={() => speakMandarin(rad.variants[0])}
                      className="cursor-pointer w-12 h-12 rounded-2xl bg-slate-950 border-2 border-red-500/50 flex flex-col items-center justify-center shrink-0 shadow-inner"
                    >
                      <span className="font-hanzi text-xl font-black text-red-400 leading-none">
                        {rad.radical}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-amber-300">
                          {rad.pinyinName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                          {rad.meaning}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {rad.matchedCourseCount > 0 ? (
                          <span className="text-emerald-300 font-bold">
                            ★ {rad.matchedCourseCount} character
                            {rad.matchedCourseCount > 1 ? 's' : ''} matched in your courses/decks
                          </span>
                        ) : (
                          <span>0 in current deck • Showing HSK 1 examples</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${
                      rad.matchedCourseCount > 0
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {rad.matchedCourseCount} in Course
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-700/60">
                  {rad.displayPills.map((pill) => (
                    <button
                      key={`${rad.id}_${pill.char}`}
                      type="button"
                      onClick={() => handleInspectCharacter(pill)}
                      className={`game-btn-3d px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${getMasteryPillStyle(
                        pill.mastery
                      )}`}
                    >
                      <span className="font-hanzi text-sm font-black text-white">{pill.char}</span>
                      <span className="text-[10px] text-rose-300">
                        {KNOWN_CHARACTER_INFO[pill.char]?.pinyin || pill.pinyinSyllables?.[0]}
                      </span>
                      <span className="text-[9px] font-black px-1 rounded bg-black/30">
                        Lv.{pill.mastery}/10
                      </span>
                      {pill.inUserCourses && (
                        <span
                          title="Present in your loaded courses/decks"
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3B: "STROKES & STRUCTURES" (BASIC STROKES 笔画 + COMPOUND CHARACTER STRUCTURES 合体字) */}
      {librarySection === 'strokes_structures' && (
        <div className="space-y-3.5">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-sky-500/35 p-4 space-y-3 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 inline-block">
                  HSK 1 Orthography Foundation
                </span>
                <h2 className="text-base font-black text-white mt-1.5">
                  {strokesSubTab === 'strokes' ? (
                    <>
                      Basic Strokes • <span className="font-hanzi text-rose-400">笔画</span>
                    </>
                  ) : (
                    <>
                      Character Structures • <span className="font-hanzi text-amber-300">合体字</span>
                    </>
                  )}
                </h2>
                <p className="font-clarity text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {strokesSubTab === 'strokes'
                    ? 'Master the 8 fundamental and compound Chinese strokes. Tap any example character below to inspect its animated stroke order.'
                    : 'Every Chinese character fits inside a balanced square using one of 6 geometric layouts. Tap any character pill to trace its exact stroke sequence.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setStrokesSubTab('strokes');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  strokesSubTab === 'strokes'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Basic Strokes</span>
                <span className="font-hanzi text-xs opacity-90">(笔画)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setStrokesSubTab('structures');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  strokesSubTab === 'structures'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Structures</span>
                <span className="font-hanzi text-xs opacity-90">(合体字)</span>
              </button>
            </div>
          </div>

          {strokesSubTab === 'strokes' && (
            <div className="space-y-2.5">
              {BASIC_STROKES_8.map((stroke) => (
                <div
                  key={stroke.id}
                  className="rounded-2xl bg-slate-800/85 border border-slate-700/80 p-3.5 space-y-2.5 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <BasicStrokeSvg strokeId={stroke.id} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-hanzi text-2xl font-black text-white leading-none">
                          {stroke.hanzi}
                        </span>
                        <span className="font-pinyin text-rose-400 leading-none">
                          {stroke.pinyin}
                        </span>
                        <span className="font-clarity text-xs font-extrabold text-amber-300">
                          — {stroke.english}
                        </span>
                      </div>
                      <span className="inline-block font-clarity text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-slate-950 border border-slate-700 text-sky-300">
                        <span className="font-hanzi">{stroke.category}</span>
                      </span>
                      <p className="font-clarity text-xs text-slate-300 leading-relaxed pt-0.5">
                        {stroke.rule}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
                      Examples:
                    </span>
                    {stroke.examples.map((ex) => {
                      const loadedEntry = allLoadedCharactersMap.get(ex.char);
                      const lv =
                        loadedEntry?.mastery ??
                        getWordMasteryLevel(progress.mastery, { id: ex.char, hanzi: ex.char });
                      const inCourses = Boolean(loadedEntry);
                      return (
                        <button
                          key={`${stroke.id}_${ex.char}`}
                          type="button"
                          onClick={() => handleInspectCharacter(ex)}
                          className={`game-btn-3d px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${getMasteryPillStyle(
                            lv
                          )}`}
                        >
                          <span className="font-hanzi text-sm font-black text-white">
                            {ex.char}
                          </span>
                          <span className="font-clarity text-[10px] text-rose-300 font-bold">
                            {ex.pinyin}
                          </span>
                          <span className="font-clarity text-[10px] text-slate-300">
                            {ex.meaning}
                          </span>
                          {inCourses && (
                            <span
                              title="In your loaded courses/decks"
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {strokesSubTab === 'structures' && (
            <div className="space-y-2.5">
              {CHARACTER_STRUCTURES_6.map((struct) => {
                // Combine default HSK 1 examples with up to 3 extra matched characters from the learner's vocabulary
                const pillChars = [];
                const seen = new Set();

                struct.examples.forEach((ex) => {
                  const loaded = allLoadedCharactersMap.get(ex.char);
                  seen.add(ex.char);
                  pillChars.push({
                    char: ex.char,
                    pinyin: loaded?.pinyinSyllables?.[0] || ex.pinyin,
                    meaning: loaded?.meanings?.[0] || ex.meaning,
                    mastery:
                      loaded?.mastery ??
                      getWordMasteryLevel(progress.mastery, { id: ex.char, hanzi: ex.char }),
                    inUserCourses: Boolean(loaded)
                  });
                });

                let extraAdded = 0;
                (struct.extraPool || []).forEach((ch) => {
                  if (extraAdded >= 3 || seen.has(ch)) return;
                  const loaded = allLoadedCharactersMap.get(ch);
                  if (loaded) {
                    seen.add(ch);
                    extraAdded += 1;
                    pillChars.push({
                      char: ch,
                      pinyin: KNOWN_CHARACTER_INFO[ch]?.pinyin || loaded.pinyinSyllables?.[0] || ch,
                      meaning: KNOWN_CHARACTER_INFO[ch]?.meaning || loaded.meanings?.[0] || '',
                      mastery: loaded.mastery,
                      inUserCourses: true
                    });
                  }
                });

                const matchedCount = pillChars.filter((p) => p.inUserCourses).length;

                return (
                  <div
                    key={struct.id}
                    className={`rounded-2xl bg-slate-800/85 border p-3.5 space-y-2.5 shadow-md ${
                      matchedCount > 0 ? 'border-amber-400/40' : 'border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CharacterStructureSvg structureId={struct.id} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white leading-tight">
                            {struct.title}
                          </h3>
                          <span className="font-hanzi text-xs font-black px-2 py-0.5 rounded-[2px] bg-rose-500/20 text-rose-300 border border-rose-400/40">
                            {struct.hanzi}
                          </span>
                        </div>
                        <div className="font-pinyin-inline text-amber-300 leading-tight">
                          {struct.pinyin}
                        </div>
                        <p className="font-clarity text-xs text-slate-300 leading-relaxed">
                          {struct.orderHint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-700/60">
                      {pillChars.map((pill) => (
                        <button
                          key={`${struct.id}_${pill.char}`}
                          type="button"
                          onClick={() => handleInspectCharacter(pill)}
                          className={`game-btn-3d px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${getMasteryPillStyle(
                            pill.mastery
                          )}`}
                        >
                          <span className="font-hanzi text-sm font-black text-white">
                            {pill.char}
                          </span>
                          <span className="font-clarity text-[10px] text-rose-300 font-bold">
                            {pill.pinyin}
                          </span>
                          <span className="text-[9px] font-black px-1 rounded bg-black/30">
                            Lv.{pill.mastery}/10
                          </span>
                          {pill.inUserCourses && (
                            <span
                              title="Present in your loaded courses/decks"
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: "STROKE RULES" (14 FUNDAMENTAL STROKE-ORDER RULES DOJO) */}
      {librarySection === 'stroke_rules' && (
        <div className="space-y-3.5">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-amber-500/30 p-4 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                Stroke Order Rules Dojo
              </span>
              <span className="text-xs font-black text-emerald-400">
                {(progress.completedStrokeRules || []).length} / {STROKE_ORDER_RULES_7.length} Rules Mastered
              </span>
            </div>
            <h2 className="text-base font-black text-white">
              14 Fundamental Chinese Stroke-Order Rules
            </h2>
            <p className="text-xs text-slate-300">
              Study each rule with familiar characters, watch the animated stroke order, then click <strong>"Test Intuition (Unseen Characters)"</strong> to deduce the stroke order of new characters in a 2-step Trace → Memory challenge!
            </p>
          </div>

          <div className="space-y-3">
            {STROKE_ORDER_RULES_7.map((rule) => {
              const isExpanded = expandedRuleId === rule.id;
              const isMasteredRule = (progress.completedStrokeRules || []).includes(rule.id);

              return (
                <div
                  key={rule.id}
                  className={`rounded-3xl bg-slate-800/90 border p-4 space-y-3 transition-all shadow-lg ${
                    isMasteredRule
                      ? 'border-emerald-500/50'
                      : isExpanded
                      ? 'border-amber-400/50'
                      : 'border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                          Rule {rule.number}
                        </span>
                        <span className="font-hanzi text-xs font-black text-rose-400">
                          {rule.chineseRule}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          ({rule.pinyinRule})
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white pt-0.5">{rule.title}</h3>
                    </div>

                    {isMasteredRule && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mastered</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rule.explanation}</p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-sky-400 block">
                        Learned Examples
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rule.learnedChars.map((item) => (
                          <button
                            key={item.char}
                            type="button"
                            onClick={() => handleInspectCharacter(item)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-xs font-black text-white flex items-center gap-1"
                          >
                            <span className="font-hanzi">{item.char}</span>
                            <span className="text-[10px] text-sky-300 font-bold">
                              {item.pinyin}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>Unseen Challenge</span>
                        {!isMasteredRule && <Lock className="w-2.5 h-2.5 text-amber-400/80" />}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rule.unseenChars.map((item) =>
                          isMasteredRule ? (
                            <button
                              key={item.char}
                              type="button"
                              onClick={() => handleInspectCharacter(item)}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-xs font-black text-white flex items-center gap-1"
                            >
                              <span className="font-hanzi">{item.char}</span>
                              <span className="text-[10px] text-amber-300 font-bold">
                                {item.pinyin}
                              </span>
                            </button>
                          ) : (
                            <span
                              key={item.char}
                              title="Complete Test Intuition first to unlock stroke animation"
                              className="px-2.5 py-1 rounded-xl bg-slate-900/70 border border-amber-500/20 text-xs font-black text-slate-200 flex items-center gap-1 cursor-not-allowed select-none"
                            >
                              <span className="font-hanzi">{item.char}</span>
                              <span className="text-[10px] text-amber-300/80 font-bold">
                                {item.pinyin}
                              </span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <RuleExampleMiniPlayer rule={rule} speakMandarin={speakMandarin} />
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setExpandedRuleId(isExpanded ? null : rule.id);
                      }}
                      className={`game-btn-3d py-2.5 px-3 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all ${
                        isExpanded
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide Animation' : 'Watch Example'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setActiveRuleChallenge(rule);
                      }}
                      className="game-btn-3d py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-md border-b-2 border-rose-800 flex items-center justify-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Test Intuition (<span className="font-hanzi">{rule.unseenChars.map((u) => u.char).join('·')}</span>)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: "PHONETICS" (MANDARIN INITIALS, FINALS, ALLOPHONES, SANDBOX & 4-TONE EAR DRILL) */}
      {librarySection === 'phonetics' && (
        <PhoneticsStudioView
          courses={courses}
          activeCourse={activeCourse}
          customDecks={customDecks}
          isSlowMode={isSlowMode}
          onSetSlowMode={onSetSlowMode}
          speakMandarin={speakMandarin}
          speakingState={speakingState}
        />
      )}

      {/* SECTION 1: BROWSE CUSTOM DECKS, COURSES & WORDS */}
      {librarySection === 'decks' && studioToolMode === 'none' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hanzi, Pinyin, or English meaning..."
              className="w-full bg-slate-800/90 border border-slate-700 focus:border-rose-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Custom Decks
              </h2>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Add Word</span>
              </button>
            </div>

            {customDecks.map((deck) => (
              <div
                key={deck.id}
                className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <ScrollingText
                      text={deck.name}
                      className="text-sm font-black text-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      {deck.words?.length || 0} word{(deck.words?.length || 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPracticeDeck(deck.words, 'flashcards')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                    >
                      Study Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => onPracticeDeck(deck.words, 'writing')}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                    >
                      Write
                    </button>
                  </div>
                </div>

                {deck.words && deck.words.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {deck.words.slice(0, 8).map((w, idx) => (
                      <span
                        key={`${w.hanzi}_${idx}`}
                        onClick={() => speakMandarin(w.hanzi, 1.0)}
                        className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:border-rose-400"
                      >
                        <span className="font-hanzi">{w.hanzi}</span> <span className="text-rose-400 text-[10px]">{w.pinyin}</span>
                      </span>
                    ))}
                    {deck.words.length > 8 && (
                      <span className="px-2 py-1 text-[11px] text-slate-400 font-bold">
                        +{deck.words.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                Available Courses ({filteredLibraryCourses.length}
                {courseBandFilter !== 'all' ? ` / ${courses.length}` : ''})
              </h2>
            </div>

            {/* Refined HSK Band Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {COURSE_HSK_FILTER_PILLS.map((pill) => {
                const count = (Array.isArray(courses) ? courses : []).filter((c) =>
                  matchesCourseHskFilter(c, pill.id)
                ).length;
                const isSelected = courseBandFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setCourseBandFilter(pill.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-400 shadow'
                        : count === 0
                        ? 'bg-slate-950/60 text-slate-600 border-slate-800/80'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[9px] px-1 rounded ${
                        isSelected ? 'bg-sky-800/70 text-sky-100' : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredLibraryCourses.length === 0 && (
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 text-center space-y-1">
                <p className="text-xs font-bold text-slate-300">
                  No courses match &ldquo;
                  {COURSE_HSK_FILTER_PILLS.find((p) => p.id === courseBandFilter)?.label}&rdquo;
                  yet.
                </p>
                <p className="text-[11px] text-slate-500">
                  Switch filter pills above or import a JSON / HSK deck to add courses to this band.
                </p>
              </div>
            )}

            {filteredLibraryCourses.map((course) => {
              const isDefaultStarter =
                course.id === 'course_default_unit1' && courses.length === 1;
              const isConfirmingDelete = confirmDeleteCourseId === course.id;
              const isCurrentActiveCourse = activeCourse?.id === course.id;
              const courseIdLower = String(course.id || '').toLowerCase();
              const courseBandNum = getCourseHskBandNumber(course);
              const originBadge = courseIdLower.startsWith('preloaded_new_hsk_')
                ? {
                    label: 'Official',
                    className: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  }
                : courseIdLower === 'preloaded_custom_notes' ||
                  courseIdLower.includes('custom_notes')
                ? {
                    label: 'Custom',
                    className: 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  }
                : courseIdLower.startsWith('preloaded_hsk_') ||
                  String(course.courseName || '').includes('Gradual Path') ||
                  (course.sourceType === 'preloaded-hsk' &&
                    courseBandNum != null &&
                    courseBandNum >= 7)
                ? {
                    label: 'Gradual',
                    className: 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                  }
                : {
                    label: 'Custom',
                    className: 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  };

              return (
                <div
                  key={course.id}
                  className={`rounded-2xl bg-slate-800/75 border p-3.5 space-y-2.5 transition-all ${
                    isCurrentActiveCourse
                      ? 'border-sky-500/60'
                      : 'border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ScrollingText
                          text={course.courseName}
                          className="text-sm font-black text-white flex-1"
                        />
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] border text-[9px] font-black uppercase shrink-0 ${originBadge.className}`}
                        >
                          {originBadge.label}
                        </span>
                        {isCurrentActiveCourse && (
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-sky-500/20 border border-sky-400/50 text-sky-300 text-[9px] font-black uppercase shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {course.lessons?.length || 1} Unit(s) •{' '}
                        {(course.lessons || []).reduce(
                          (acc, l) => acc + (l.words?.length || 0),
                          0
                        )}{' '}
                        total words
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectCourseOnMap(course.id, course.lessons?.[0]?.id)}
                        className="game-btn-3d px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold"
                      >
                        Open on Map
                      </button>
                      {!isDefaultStarter && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            setConfirmDeleteCourseId(
                              isConfirmingDelete ? null : course.id
                            );
                          }}
                          title="Delete Course"
                          className={`game-btn-3d p-2 rounded-xl border text-xs font-bold transition-colors ${
                            isConfirmingDelete
                              ? 'bg-rose-600 text-white border-rose-300'
                              : 'bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border-slate-700 hover:border-rose-500/50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isConfirmingDelete && (
                    <div className="rounded-xl bg-rose-950/60 border border-rose-500/60 p-2.5 flex items-center justify-between gap-2">
                      <ScrollingText
                        text={`Remove "${course.courseName}" from Library?`}
                        className="font-clarity text-xs font-bold text-rose-200 flex-1"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            setConfirmDeleteCourseId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            setConfirmDeleteCourseId(null);
                            onDeleteCourse?.(course.id, course.courseName);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold border border-rose-300"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setReferenceTab('vocab');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    referenceTab === 'vocab'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Vocabulary ({filteredWordsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setReferenceTab('corpus');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    referenceTab === 'corpus'
                      ? 'bg-teal-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Corpus Sentences ({linguisticDataStatus?.corpusCount || annotatedCorpusList.length})
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {referenceTab === 'vocab' && libraryLeechCount > 0 && (
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-[2px] border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setVocabFilterMode('all');
                      }}
                      className={`px-2 py-0.5 rounded-[2px] text-[10px] font-extrabold transition-all ${
                        vocabFilterMode !== 'leeches'
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setVocabFilterMode('leeches');
                      }}
                      className={`px-2 py-0.5 rounded-[2px] text-[10px] font-extrabold transition-all ${
                        vocabFilterMode === 'leeches'
                          ? 'bg-rose-600 text-white'
                          : 'text-rose-300 hover:text-rose-200'
                      }`}
                    >
                      Leeches ({libraryLeechCount})
                    </button>
                  </div>
                )}
                <span className="font-clarity text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
                  {(linguisticDataStatus?.lexiconCount || 0).toLocaleString()} Lexicon •{' '}
                  {(linguisticDataStatus?.corpusCount || annotatedCorpusList.length).toLocaleString()}{' '}
                  Corpus (
                  {linguisticDataStatus?.corpusSource === 'remote' ||
                  linguisticDataStatus?.source === 'remote'
                    ? 'CDN'
                    : linguisticDataStatus?.corpusSource === 'local' ||
                      linguisticDataStatus?.source === 'local'
                    ? 'Local'
                    : 'Starter'}
                  )
                </span>
                {onSyncLinguisticData && (
                  <button
                    type="button"
                    disabled={isSyncingData}
                    onClick={() => {
                      soundFX.playPop();
                      onSyncLinguisticData();
                    }}
                    title="Sync Data Repo (Refresh Lexicon, Curriculum & Corpus from GitHub CDN)"
                    className={`game-btn-3d p-1.5 rounded-full border text-[10px] font-black transition-all flex items-center justify-center ${
                      isSyncingData
                        ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 opacity-75 cursor-wait'
                        : 'bg-slate-900 hover:bg-indigo-950/80 border-indigo-400/40 text-indigo-300 hover:text-white'
                    }`}
                  >
                    <RotateCcw className={`w-3 h-3 ${isSyncingData ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {referenceTab === 'corpus' && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={corpusSearchQuery}
                      onChange={(e) => setCorpusSearchQuery(e.target.value)}
                      placeholder="Search corpus Hanzi, Pinyin, English, or topic..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-teal-400 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setHideCorpusTranslations((prev) => !prev);
                      setRevealedCorpusIds({});
                    }}
                    title="Toggle Pinyin & English visibility for self-testing"
                    className={`game-btn-3d px-2.5 py-2 rounded-xl border text-[10px] font-black flex items-center gap-1 shrink-0 transition-all ${
                      hideCorpusTranslations
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {hideCorpusTranslations ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Self-Test On</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Hide Gloss</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Corpus Comprehension & HSK Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'i0', label: 'i+0 Ready' },
                    { id: 'i1', label: 'i+1' },
                    { id: 'hsk_1', label: 'HSK 1' },
                    { id: 'hsk_2', label: 'HSK 2' },
                    { id: 'hsk_3', label: 'HSK 3' },
                    { id: 'hsk_4_plus', label: 'HSK 4+' }
                  ].map((pill) => {
                    const count = corpusFilterCounts[pill.id] || 0;
                    const isSelected = corpusFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          setCorpusFilter(pill.id);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-400 shadow'
                            : count === 0
                            ? 'bg-slate-950/60 text-slate-600 border-slate-800/80'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <span>{pill.label}</span>
                        <span
                          className={`text-[9px] px-1 rounded ${
                            isSelected ? 'bg-teal-800/70 text-teal-100' : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredCorpusList.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      No corpus sentences match the current filter.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Try switching to &ldquo;All&rdquo; or clearing the search box.
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredCorpusList.slice(0, corpusVisibleCount).map((sent, sIdx) => {
                      const sentKey = sent.id || `corpus_${sIdx}`;
                      const isRevealed =
                        !hideCorpusTranslations || Boolean(revealedCorpusIds[sentKey]);
                      const inputBadgeClass =
                        sent.inputLevel === 'i+0'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                          : sent.inputLevel === 'i+1'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-700';
                      const formattedTopic = String(sent.topic || 'general')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (m) => m.toUpperCase());

                      return (
                        <div
                          key={sentKey}
                          className="rounded-2xl bg-slate-800/70 border border-slate-700/80 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-[2px] border ${inputBadgeClass}`}
                              >
                                {sent.inputLevel}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-[2px] bg-indigo-500/15 text-indigo-300 border border-indigo-400/35">
                                HSK {sent.hskLevel || 1}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-slate-900 text-slate-300 border border-slate-700">
                                {formattedTopic}
                              </span>
                            </div>
                            {sent.inputLevel === 'i+1' && sent.unknownTokens?.[0] && (
                              <span className="font-hanzi text-[10px] font-bold text-sky-300">
                                +1: {sent.unknownTokens[0]}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <InteractiveExampleText
                                sentence={sent.hanzi}
                                speakMandarin={speakMandarin}
                                masteryMap={progress.mastery}
                                courseWords={allUniqueWordsArray}
                                charClassName="text-lg font-black text-white"
                                showHint={false}
                              />

                              {isRevealed ? (
                                <div className="space-y-0.5 pt-0.5">
                                  {sent.pinyin && (
                                    <p className="font-pinyin font-clarity text-sm font-bold text-rose-400 leading-snug">
                                      {sent.pinyin}
                                    </p>
                                  )}
                                  <p className="font-clarity text-xs font-medium text-slate-200 leading-snug">
                                    {sent.english}
                                  </p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundFX.playPop();
                                    setRevealedCorpusIds((prev) => ({
                                      ...prev,
                                      [sentKey]: true
                                    }));
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-[10px] font-extrabold text-amber-300"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Tap to reveal Pinyin &amp; English</span>
                                </button>
                              )}
                            </div>

                            <div className="shrink-0">
                              <MandarinAudioControls
                                text={sent.hanzi}
                                isSlowMode={isSlowMode}
                                onSetSlowMode={onSetSlowMode}
                                speakMandarin={speakMandarin}
                                speakingState={speakingState}
                                size="sm"
                                vertical={true}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredCorpusList.length > corpusVisibleCount && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          setCorpusVisibleCount((prev) => prev + 50);
                        }}
                        className="game-btn-3d w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-xs font-extrabold text-teal-300"
                      >
                        Show 50 more ({filteredCorpusList.length - corpusVisibleCount} left)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {referenceTab === 'vocab' && filteredWordsList.slice(0, vocabVisibleCount).map((word, idx) => {
              const masteryLv = getWordMasteryLevel(progress.mastery, word);
              const tierTitle = getMasteryTierMeta(masteryLv).tier;
              const enrichedWord = enrichWordEntry(
                word,
                progress.wordLinguisticOverrides,
                progress.wordPriorityOverrides
              );
              const linguisticBadges = getLinguisticBadgeSummary(enrichedWord);
              const priorityTier = enrichedWord.priorityTier || 'standard';
              const hasManualPriority = Boolean(enrichedWord.priorityOverride);
              const priorityBadgeLabel =
                priorityTier === 'core'
                  ? 'Core ★'
                  : priorityTier === 'niche'
                  ? 'Niche ↓'
                  : 'Normal';
              const priorityBadgeClass =
                priorityTier === 'core'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30'
                  : priorityTier === 'niche'
                  ? 'bg-slate-900/90 text-slate-400 border-slate-700 hover:bg-slate-800'
                  : 'bg-indigo-500/15 text-indigo-200 border-indigo-400/35 hover:bg-indigo-500/25';
              const wordCardKey = `${word.hanzi || word.id}_${idx}`;
              const existingLingOverride =
                progress.wordLinguisticOverrides?.[word.hanzi] || null;
              const currentCategoryKey = resolveWordCategoryPresetKey(existingLingOverride);
              const isEditingCategory = editingCategoryWordKey === wordCardKey;
              return (
                <div
                  key={wordCardKey}
                  className="rounded-2xl bg-slate-800/70 border border-slate-700/80 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Left: Chinese characters */}
                    <div className="shrink-0">
                      <span className="font-hanzi text-2xl font-black text-white block leading-tight">
                        {word.hanzi}
                      </span>
                    </div>

                    {/* Center: Pinyin & English meaning */}
                    <div className="flex-1 min-w-0">
                      <div className="font-clarity text-base font-bold text-rose-400 leading-snug break-words">
                        {word.pinyin}
                      </div>
                      <div className="font-clarity text-xs font-medium text-slate-200 leading-snug line-clamp-2 mt-0.5">
                        {word.meaning || word.english}
                      </div>
                    </div>

                    {/* Right: Compact 2-line stacked mastery box + vertically stacked audio column */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col items-center justify-center px-2 py-1 border border-slate-700 bg-slate-900/90 min-w-[64px] rounded-[2px]">
                        <span className="text-[11px] font-bold text-slate-200 leading-tight">
                          Lv.{masteryLv}/10
                        </span>
                        <span className="text-[9px] text-amber-300 font-bold leading-tight">
                          {tierTitle}
                        </span>
                      </div>
                      <MandarinAudioControls
                        text={word.hanzi}
                        isSlowMode={isSlowMode}
                        onSetSlowMode={onSetSlowMode}
                        speakMandarin={speakMandarin}
                        speakingState={speakingState}
                        size="sm"
                        vertical={true}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    {word._isLeech && (
                      <span
                        title={`Flagged Leech • Ease ${(word._srsEntry?.easeFactor ?? 1.5).toFixed(2)}`}
                        className="font-clarity shrink-0 whitespace-nowrap text-[10px] font-extrabold px-2 py-0.5 rounded-[2px] border bg-rose-500/20 text-amber-200 border-rose-400/60"
                      >
                        Leech • {word._srsEntry?.lapseCount || 0} lapses
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onCycleWordPriority?.(word)}
                      title={`Priority: ${priorityBadgeLabel} (${
                        hasManualPriority ? 'Manual override' : 'Auto-classified'
                      }) — tap to cycle`}
                      className={`font-clarity shrink-0 whitespace-nowrap text-[10px] font-extrabold px-2 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${priorityBadgeClass}`}
                    >
                      {priorityBadgeLabel}
                      {hasManualPriority ? ' •' : ''}
                    </button>
                    {linguisticBadges.map((badge, bIdx) => (
                      <span
                        key={`${word.id}_lb_${bIdx}`}
                        className={`font-clarity shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-[2px] border ${
                          badge.includes('Separable')
                            ? 'bg-amber-500/15 text-amber-300 border-amber-400/35'
                            : badge.startsWith('CL:')
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                            : 'bg-slate-900/90 text-sky-300 border-slate-700'
                        }`}
                      >
                        {badge}
                      </span>
                    ))}
                    {onSaveWordLinguisticOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          setEditingCategoryWordKey((prev) =>
                            prev === wordCardKey ? null : wordCardKey
                          );
                        }}
                        title={
                          existingLingOverride
                            ? 'Edit linguistic category (Manual override active)'
                            : 'Edit grammatical category for sentence engine'
                        }
                        aria-label={`Edit linguistic category for ${word.hanzi}`}
                        className={`font-clarity shrink-0 whitespace-nowrap text-[10px] font-extrabold px-2 py-0.5 rounded-[2px] border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                          isEditingCategory
                            ? 'bg-sky-600/30 text-sky-200 border-sky-400'
                            : existingLingOverride
                            ? 'bg-sky-500/20 text-sky-200 border-sky-400/60 hover:bg-sky-500/30'
                            : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-sky-400/60 hover:text-sky-200'
                        }`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <Pencil className="w-2.5 h-2.5" />
                        {existingLingOverride ? <span>•</span> : null}
                      </button>
                    )}
                  </div>
                  {isEditingCategory && onSaveWordLinguisticOverride && (
                    <div className="pt-1.5 border-t border-slate-700/60 flex items-center gap-2">
                      <label
                        htmlFor={`cat-select-${idx}`}
                        className="font-clarity text-[10px] font-extrabold uppercase tracking-wider text-sky-300 shrink-0"
                      >
                        Grammar Tag
                      </label>
                      <select
                        id={`cat-select-${idx}`}
                        value={currentCategoryKey}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          soundFX.playPop();
                          if (nextVal === 'auto' || !QUICK_ADD_CATEGORY_PRESETS[nextVal]) {
                            onSaveWordLinguisticOverride(word, null);
                          } else {
                            onSaveWordLinguisticOverride(word, {
                              ...QUICK_ADD_CATEGORY_PRESETS[nextVal],
                              categoryKey: nextVal
                            });
                          }
                        }}
                        className="font-clarity flex-1 min-w-0 bg-slate-950 border border-sky-500/60 focus:border-sky-400 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                      >
                        {QUICK_ADD_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playPop();
                          setEditingCategoryWordKey(null);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-extrabold text-slate-300 shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                    <ScrollingText text={word.sourceBadge} className="flex-1" />
                  </div>
                </div>
              );
            })}
            {referenceTab === 'vocab' && filteredWordsList.length > vocabVisibleCount && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setVocabVisibleCount((prev) => prev + 50);
                }}
                className="game-btn-3d w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-xs font-extrabold text-amber-300"
              >
                Show 50 more ({filteredWordsList.length - vocabVisibleCount} left)
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: BULK TEXT / TABLE IMPORT */}
      {librarySection === 'decks' && studioToolMode === 'bulk' && (
        <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
              Spreadsheet & Google Docs Compatible
            </span>
            <h2 className="text-base font-black text-white mt-0.5">
              Bulk Text / Table Import
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Paste multiple lines separated by <strong>tabs</strong> (copied directly from Google Sheets/Docs), <strong>semicolons (;)</strong>, or <strong>commas (,)</strong>:
              <br />
              <code className="text-rose-300 text-[11px]">
                Hanzi ; Pinyin ; English Meaning ; Example (optional)
              </code>
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Target Deck</label>
            <select
              value={bulkTargetDeck}
              onChange={(e) => setBulkTargetDeck(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
            >
              {customDecks.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.words?.length || 0} words)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">
              Detected valid rows:{' '}
              <strong className="text-emerald-400">{parsedBulkPreview.length}</strong>
            </span>
            <button
              type="button"
              onClick={() =>
                setBulkText(
                  `朋友 ; péngyou ; friend ; 他是我的好朋友。\n水 ; shuǐ ; water ; 请给我一杯水。\n中国 ; Zhōngguó ; China ; 我想去中国旅游。\n学习 ; xuéxí ; to study / to learn ; 我每天学习中文。`
                )
              }
              className="text-[11px] font-bold text-amber-400 hover:underline"
            >
              Paste Sample Rows
            </button>
          </div>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`朋友 ; péngyou ; friend ; 他是我的好朋友。\n水\tshuǐ\twater\t请给我一杯水。\n老师, lǎoshī, teacher, 王老师好！`}
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl p-3.5 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
          />

          {parsedBulkPreview.length > 0 && (
            <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-extrabold uppercase text-emerald-400">
                Live Preview ({parsedBulkPreview.length} entries ready)
              </p>
              {parsedBulkPreview.map((item, idx) => (
                <div
                  key={idx}
                  className="text-xs flex items-center justify-between border-b border-slate-900 pb-1"
                >
                  <div>
                    <span className="font-hanzi font-black text-white">{item.hanzi}</span>{' '}
                    <span className="text-rose-400 font-bold">({item.pinyin})</span> —{' '}
                    <span className="text-emerald-300">{item.meaning}</span>
                  </div>
                  {item.example && (
                    <span className="font-hanzi text-[10px] text-slate-400 truncate max-w-[110px]">
                      {item.example}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleBulkImportConfirm}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-lg"
          >
            Import {parsedBulkPreview.length || ''} Words into "{bulkTargetDeck}"
          </button>
        </div>
      )}

      {/* SECTION 3: SMART JSON COURSE IMPORTER */}
      {librarySection === 'decks' && studioToolMode === 'json_course' && (
        <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
              Dual-Format Smart Course Importer
            </span>
            <h2 className="text-base font-black text-white mt-0.5">
              Import Course JSON or Raw HSK JSON
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports both:
              <br />
              <strong>1) Standard Course JSON:</strong>{' '}
              <code className="text-sky-300 text-[11px]">{`{ "courseName": "...", "lessons": [...] }`}</code>
              <br />
              <strong>2) Raw complete-hsk-vocabulary JSON:</strong>{' '}
              <code className="text-emerald-300 text-[11px]">{`[{ "simplified": "...", "level": ["new-1"], "forms": [...] }]`}</code>{' '}
              with interactive HSK level extraction & automatic 20-word unit chunking!
            </p>
          </div>

          <div>
            <input
              ref={courseFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleCourseFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => courseFileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload JSON File (.json)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => processCourseJsonData(SAMPLE_RAW_HSK_JSON, 'complete-hsk-vocabulary')}
              className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold text-center"
            >
              Test Raw HSK JSON (Level Picker)
            </button>
            <button
              type="button"
              onClick={() =>
                processCourseJsonData({
                  courseName: 'Travel Mandarin Crash Course',
                  lessons: [
                    {
                      title: 'Unit 1: Dining & Tea',
                      words: [
                        { hanzi: '茶', pinyin: 'chá', meaning: 'tea', example: '请喝茶！' },
                        { hanzi: '水', pinyin: 'shuǐ', meaning: 'water', example: '一杯水' },
                        { hanzi: '米饭', pinyin: 'mǐfàn', meaning: 'cooked rice', example: '我爱吃米饭。' }
                      ]
                    }
                  ]
                })
              }
              className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold text-center"
            >
              Test Standard Course JSON
            </button>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-700/80">
            <label className="text-xs font-bold text-slate-300">
              Or Paste Course / HSK JSON Directly:
            </label>
            <textarea
              rows={5}
              value={jsonTextInput}
              onChange={(e) => setJsonTextInput(e.target.value)}
              placeholder='Paste { "courseName": "...", "lessons": [...] } or [ { "simplified": "...", "level": ["new-1"], "forms": [...] } ]'
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-2xl p-3 text-xs font-mono text-white placeholder:text-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!jsonTextInput.trim()) {
                  triggerToast('Empty JSON', 'Paste JSON content or upload a file first.');
                  return;
                }
                try {
                  const parsed = JSON.parse(jsonTextInput);
                  processCourseJsonData(parsed, 'Pasted JSON Course');
                } catch (err) {
                  triggerToast('Invalid JSON Syntax', 'Please check your JSON formatting.');
                }
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-sky-300 font-extrabold text-xs"
            >
              Parse Pasted JSON
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: FULL BACKUP */}
      {librarySection === 'decks' && studioToolMode === 'backup' && (
        <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
              Full LocalStorage Snapshot
            </span>
            <h2 className="text-base font-black text-white mt-0.5">
              Backup & Restore All Study Data
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Export or restore all imported courses, custom vocabulary decks, character mastery levels (0–10), study time, XP, and daily streak.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={onExportAllData}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export All Data (JSON)</span>
            </button>

            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleBackupFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import Backup (JSON)</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING "+ ADD WORD" BUTTON */}
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-20 right-5 z-40 px-4 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-extrabold text-xs shadow-2xl shadow-rose-950 flex items-center gap-1.5 border border-rose-300/30 active:scale-95 transition-all"
      >
        <Plus className="w-4 h-4 stroke-[3px]" />
        <span>+ Add Word</span>
      </button>

      {/* MODAL 1: QUICK ADD SINGLE WORD */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-rose-400">
                  Quick Add Vocabulary
                </span>
                <h3 className="text-base font-black text-white">Add Single Word</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Hanzi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleHanzi}
                  onChange={(e) => setSingleHanzi(e.target.value)}
                  placeholder="e.g. 朋友"
                  className="font-hanzi w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Pinyin <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singlePinyin}
                  onChange={(e) => setSinglePinyin(e.target.value)}
                  placeholder="e.g. péngyou or peng2 you5"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  English Meaning <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={singleMeaning}
                  onChange={(e) => setSingleMeaning(e.target.value)}
                  placeholder="e.g. friend / companion"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Example / Notes <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={singleExample}
                  onChange={(e) => setSingleExample(e.target.value)}
                  placeholder="e.g. 他是我的好朋友。"
                  className="font-hanzi w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Category (for Sentence Engine)
                </label>
                <select
                  value={singleCategory}
                  onChange={(e) => setSingleCategory(e.target.value)}
                  className="font-clarity w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                >
                  <option value="auto">Auto-detect from HSK Lexicon &amp; Rules</option>
                  <option value="verb">Action / Verb</option>
                  <option value="noun_person">Person / Nationality / Role</option>
                  <option value="noun_place">Place / Country / Location</option>
                  <option value="noun_language">Language</option>
                  <option value="noun_food_drink">Food or Drink</option>
                  <option value="noun_object">Object / Item</option>
                  <option value="time">Time / Date</option>
                  <option value="adj">Adjective / Description</option>
                  <option value="expression">Full Phrase / Expression</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Target Deck
                </label>
                <select
                  value={singleDeckName}
                  onChange={(e) => setSingleDeckName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                >
                  {customDecks.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  <option value="__NEW__">+ Create New Deck...</option>
                </select>
              </div>

              {singleDeckName === '__NEW__' && (
                <div>
                  <input
                    type="text"
                    value={customNewDeckName}
                    onChange={(e) => setCustomNewDeckName(e.target.value)}
                    placeholder="Enter new deck name..."
                    className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-xs font-extrabold text-white shadow-lg"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RAW COMPLETE-HSK-VOCABULARY LEVEL TAG SELECTOR MODAL */}
      {rawHskDataPending && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-emerald-400">
                  complete-hsk-vocabulary Detected
                </span>
                <h3 className="text-base font-black text-white">Select HSK Level Tag</h3>
              </div>
              <button
                type="button"
                onClick={() => setRawHskDataPending(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Choose which HSK level tag to extract. Matching words will be automatically mapped and chunked into sequential lessons of <strong>20 words each</strong> (Unit 1, Unit 2...) on the Map!
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableHskLevels.map((item) => {
                const isSelected = selectedHskTag === item.tag;
                const unitCount = Math.ceil(item.count / 20);
                return (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => {
                      setSelectedHskTag(item.tag);
                      setCustomHskCourseTitle(`HSK (${item.tag.toUpperCase()})`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black uppercase text-emerald-300">
                      {item.tag}
                    </div>
                    <div className="text-[11px] font-bold text-white mt-0.5">
                      {item.count} words
                    </div>
                    <div className="text-[10px] text-slate-400">
                      → {unitCount} Unit{unitCount > 1 ? 's' : ''} (20/unit)
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Course Title for Map Selector
              </label>
              <input
                type="text"
                value={customHskCourseTitle}
                onChange={(e) => setCustomHskCourseTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRawHskDataPending(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHskLevelExtraction}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-xs font-extrabold text-white shadow-lg"
              >
                Extract & Add to Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHARACTER MATRIX QUICK-INSPECTION MODAL */}
      {selectedCharEntry && (
        <CharacterInspectModal
          charEntry={selectedCharEntry}
          isSlowMode={isSlowMode}
          onSetSlowMode={onSetSlowMode}
          speakMandarin={speakMandarin}
          speakingState={speakingState}
          onClose={() => setSelectedCharEntry(null)}
        />
      )}

      {/* MODAL 4: STROKE ORDER RULES DOJO — 2-STEP UNSEEN CHARACTER INTUITION QUIZ */}
      {activeRuleChallenge && (
        <StrokeRuleIntuitionModal
          rule={activeRuleChallenge}
          isSlowMode={isSlowMode}
          onSetSlowMode={onSetSlowMode}
          speakMandarin={speakMandarin}
          speakingState={speakingState}
          onRecordStudySeconds={onRecordStudySeconds}
          onClose={() => setActiveRuleChallenge(null)}
          onCompleteRule={(completedRule) => {
            setActiveRuleChallenge(null);
            onCompleteStrokeRuleDojo?.(completedRule);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TAB 4: PROFILE VIEW (STUDY MODES DIRECTORY + WEAKEST WORDS REVIEW + STATS + SETTINGS)
// ============================================================================
export function ProfileView({
  progress,
  globalStats,
  allUniqueWordsMap,
  courses,
  customDecks,
  currentLevel,
  studyModesHubProps = {},
  linguisticDataStatus,
  isSyncingData = false,
  onSyncLinguisticData,
  defaultDataBaseUrl = 'https://cdn.jsdelivr.net/gh/Kwertincho/hanziapp-data@main',
  getDataBaseUrl,
  onToggleSpeed,
  speakMandarin,
  onExportAllData,
  onImportBackupData,
  confirmResetOpen,
  setConfirmResetOpen,
  onConfirmReset,
  onLaunchWeakWordsReview
}) {
  const profileBackupInputRef = useRef(null);
  const [masteryVisibleCount, setMasteryVisibleCount] = useState(20);
  const [availableVoices, setAvailableVoices] = useState(() => getAvailableMandarinVoices());
  const [preferredVoiceURI, setPreferredVoiceURIState] = useState(() =>
    getGlobalPreferredVoiceURI()
  );
  const [dataRepoUrlInput, setDataRepoUrlInput] = useState(() =>
    typeof getDataBaseUrl === 'function'
      ? getDataBaseUrl()
      : linguisticDataStatus?.dataBaseUrl || defaultDataBaseUrl
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refreshVoices = () => {
      setAvailableVoices(getAvailableMandarinVoices());
    };
    refreshVoices();
    const synth = window.speechSynthesis;
    if (synth && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refreshVoices);
    }
    return () => {
      if (synth && typeof synth.removeEventListener === 'function') {
        synth.removeEventListener('voiceschanged', refreshVoices);
      }
    };
  }, []);

  const activeResolvedVoice = useMemo(
    () => resolveMandarinVoice(preferredVoiceURI),
    [availableVoices, preferredVoiceURI]
  );

  const handleProfileBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        onImportBackupData(parsed);
      } catch (err) {
        // Handled by parent toast
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const trackedWordsArray = useMemo(() => {
    return Array.from(allUniqueWordsMap.values());
  }, [allUniqueWordsMap]);

  const discoveredWeakestRanked = useMemo(() => {
    const discovered = trackedWordsArray
      .filter((word) => isWordDiscovered(word, progress))
      .map((word) =>
        enrichWordEntry(
          word,
          progress.wordLinguisticOverrides,
          progress.wordPriorityOverrides
        )
      );
    return rankWeakestDiscoveredWords(discovered, progress);
  }, [trackedWordsArray, progress]);

  const weakWordsList = useMemo(() => {
    return discoveredWeakestRanked.filter(
      (word) => getWordMasteryLevel(progress.mastery, word) <= 4
    );
  }, [discoveredWeakestRanked, progress.mastery]);

  const todayIso = getLocalIsoDate();
  const todayStudySeconds =
    progress.dailyStudySeconds?.date === todayIso
      ? Math.max(0, Number(progress.dailyStudySeconds?.seconds) || 0)
      : 0;
  const totalStudySeconds = Math.max(0, Number(progress.totalStudySeconds) || 0);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-[2px] bg-slate-900 border-2 border-amber-500 p-5 flex items-center gap-4">
        <div className="font-hanzi w-16 h-16 rounded-[2px] bg-gradient-to-br from-rose-600 via-red-700 to-amber-600 flex items-center justify-center text-2xl font-black text-white shrink-0 border-2 border-amber-300">
          学
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-pixel-header text-xs text-amber-300">
              Lv.{currentLevel} {getPlayerTitle(currentLevel)}
            </h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400/50">
              {globalStats.masteredWordsCount} Mastered
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {courses.length} Course(s) • {customDecks.length} Custom Deck(s) •{' '}
            {globalStats.totalTrackedWords} Total Words
          </p>
        </div>
      </div>

      {/* ACTIVE STUDY TIME TRACKER BANNER */}
      <div className="rounded-[2px] bg-slate-900 border-2 border-sky-500 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[2px] bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center text-sky-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
              Total Study Time
            </span>
            <div className="font-pixel-header text-sm text-white leading-tight mt-0.5">
              {formatTotalStudyTime(totalStudySeconds)}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
            Today&apos;s Study Time
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-[2px] bg-emerald-500/15 border-2 border-emerald-400 text-xs font-black text-emerald-300 mt-0.5">
            {formatTodayStudyTime(todayStudySeconds)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[2px] bg-slate-900 border-2 border-emerald-500/70 p-3.5 text-center">
          <PixelCrownSprite className="w-5 h-5 mx-auto" />
          <div className="font-pixel-header text-base text-white mt-1.5">
            {globalStats.masteredWordsCount}
          </div>
          <div className="text-[10px] font-bold uppercase text-emerald-300 mt-0.5">
            Mastered (Lv 8–10)
          </div>
        </div>
        <div className="rounded-[2px] bg-slate-900 border-2 border-amber-500/70 p-3.5 text-center">
          <PixelCoinSprite className="w-5 h-5 mx-auto" />
          <div className="font-pixel-header text-base text-white mt-1.5">{progress.xp}</div>
          <div className="text-[10px] font-bold uppercase text-amber-300 mt-0.5">Accumulated XP</div>
        </div>
        <div className="rounded-[2px] bg-slate-900 border-2 border-rose-500/70 p-3.5 text-center">
          <PixelFlameSprite active={progress.streak > 0} className="w-5 h-5 mx-auto" />
          <div className="font-pixel-header text-base text-white mt-1.5">{progress.streak}</div>
          <div className="text-[10px] font-bold uppercase text-rose-300 mt-0.5">Daily Streak</div>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-rose-950/80 via-slate-800 to-slate-900 border border-rose-500/40 p-4 space-y-3 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>Targeted Mastery Booster</span>
            </span>
            <h2 className="text-sm font-black text-white mt-1.5">
              Weakest Words Review ({discoveredWeakestRanked.length} Discovered)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {discoveredWeakestRanked.length === 0
                ? 'Complete a lesson on the Map to unlock Weakest Word Review'
                : weakWordsList.length > 0
                ? `You have ${weakWordsList.length} discovered word(s) at Mastery Level 0–4 (${weakWordsList
                    .slice(0, 4)
                    .map((w) => w.hanzi)
                    .join(', ')}${weakWordsList.length > 4 ? '...' : ''}). Re-train them now!`
                : `All ${discoveredWeakestRanked.length} discovered words are above Level 4! Click below to reinforce your weakest studied words.`}
            </p>
          </div>
        </div>

        {discoveredWeakestRanked.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              onLaunchWeakWordsReview(
                weakWordsList.length > 0 ? weakWordsList : discoveredWeakestRanked.slice(0, 10)
              )
            }
            className="game-btn-3d w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-lg border-b-4 border-rose-800 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5px]" />
            <span>
              Review{' '}
              {weakWordsList.length > 0
                ? `${weakWordsList.length} Weakest Word${weakWordsList.length === 1 ? '' : 's'}`
                : `${Math.min(10, discoveredWeakestRanked.length)} Studied Word${
                    discoveredWeakestRanked.length === 1 ? '' : 's'
                  }`}{' '}
              Now
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full py-3 px-3 rounded-xl bg-slate-900 border-2 border-slate-700 text-slate-400 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
          >
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Complete a lesson on the Map to unlock Weakest Word Review</span>
          </button>
        )}
      </div>

      {/* STUDY MODES & TOOLS DIRECTORY HUB */}
      <StudyModesHub {...studyModesHubProps} />

      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Vocabulary Mastery Distribution (Lv 0–10)
          </h2>
          <span className="text-xs font-bold text-amber-300">
            {globalStats.totalStarsEarned} / {globalStats.maxStarsPossible} Pts
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-sm font-black text-emerald-400">
              {globalStats.masteredWordsCount}
            </div>
            <div className="text-[10px] text-slate-400 font-bold">Mastered (Lv 8–10)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-sm font-black text-amber-400">
              {globalStats.learningWordsCount}
            </div>
            <div className="text-[10px] text-slate-400 font-bold">Consolidating (Lv 1–7)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-sm font-black text-slate-300">
              {Math.max(
                0,
                globalStats.totalTrackedWords -
                  globalStats.masteredWordsCount -
                  globalStats.learningWordsCount
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-bold">Unseen (Lv 0)</div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2 max-h-64 overflow-y-auto pr-1">
          {trackedWordsArray.slice(0, masteryVisibleCount).map((word) => {
            const lv = getWordMasteryLevel(progress.mastery, word);
            const tierMeta = getMasteryTierMeta(lv);
            return (
              <div key={word.id} className="space-y-1 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-clarity font-bold text-white truncate max-w-[215px] text-[14px]">
                    <span className="font-hanzi text-base">{word.hanzi}</span>{' '}
                    <span className="text-rose-300 font-extrabold">({word.pinyin})</span> — {(word.meaning || word.english).split(/[/;]/)[0]}
                  </span>
                  <span className={`text-[10px] font-extrabold ${tierMeta.textClass}`}>
                    {tierMeta.tier} {lv >= 9 ? '★' : ''}
                  </span>
                </div>
                <MasterySegmentedBar level={lv} compact={true} showTier={false} />
              </div>
            );
          })}
          {trackedWordsArray.length > masteryVisibleCount && (
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setMasteryVisibleCount((prev) => prev + 20);
              }}
              className="game-btn-3d w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-xs font-extrabold text-amber-300"
            >
              Show More (+{Math.min(20, trackedWordsArray.length - masteryVisibleCount)} of{' '}
              {trackedWordsArray.length - masteryVisibleCount} remaining)
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Backup, Data Sync &amp; Study Settings
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportAllData}
            className="game-btn-3d py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All Data</span>
          </button>

          <input
            ref={profileBackupInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleProfileBackupFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => profileBackupInputRef.current?.click()}
            className="game-btn-3d py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup</span>
          </button>
        </div>

        {/* LINGUISTIC DATA REPOSITORY (GITHUB CDN / OFFLINE CACHE SYNC) */}
        <div className="pt-2.5 border-t border-slate-700/70 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Linguistic Data Repository (GitHub CDN)</span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    linguisticDataStatus?.source === 'remote'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : linguisticDataStatus?.source === 'local'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {linguisticDataStatus?.source === 'remote'
                    ? 'Remote CDN'
                    : linguisticDataStatus?.source === 'local'
                    ? 'Local /data/'
                    : 'Built-in'}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {linguisticDataStatus?.lexiconCount?.toLocaleString?.() || 0} Lexicon •{' '}
                {linguisticDataStatus?.preloadedCoursesCount || 0} Preloaded HSK Course(s) •{' '}
                {linguisticDataStatus?.corpusCount || 60} Corpus Sentences
                {linguisticDataStatus?.lastSyncedAt
                  ? ` • Synced ${new Date(linguisticDataStatus.lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={isSyncingData}
              onClick={() => {
                soundFX.playPop();
                onSyncLinguisticData?.(dataRepoUrlInput);
              }}
              className={`game-btn-3d px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 ${
                isSyncingData
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 opacity-75 cursor-wait'
                  : 'bg-indigo-600/25 hover:bg-indigo-600/35 border-indigo-400/50 text-indigo-200'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncingData ? 'animate-spin' : ''}`} />
              <span>{isSyncingData ? 'Syncing...' : 'Sync Data Repo'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={dataRepoUrlInput}
              onChange={(e) => setDataRepoUrlInput(e.target.value)}
              placeholder={defaultDataBaseUrl}
              aria-label="Data Repository Base URL"
              className="font-clarity flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-400 px-3 py-2 text-xs font-semibold text-white placeholder:text-slate-500 outline-none"
            />
            {dataRepoUrlInput.trim() !== defaultDataBaseUrl && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setDataRepoUrlInput(defaultDataBaseUrl);
                  onSyncLinguisticData?.(defaultDataBaseUrl);
                }}
                title="Reset to Default GitHub CDN URL"
                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-extrabold text-slate-300 shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700/70">
          <div>
            <p className="text-xs font-bold text-white">Default Speech Synthesis Speed</p>
            <p className="text-[11px] text-slate-400">
              Native Mandarin (zh-CN • 1.0x Normal vs 0.65x Slow)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleSpeed('你好')}
            className={`game-btn-3d px-3 py-1.5 rounded-xl border text-xs font-black ${
              progress.isSlowMode ||
              progress.preferredSpeed === SLOW_SPEECH_RATE ||
              progress.preferredSpeed === 0.5
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-amber-300'
            }`}
          >
            {progress.isSlowMode ||
            progress.preferredSpeed === SLOW_SPEECH_RATE ||
            progress.preferredSpeed === 0.5
              ? '0.65x Slow'
              : '1.0x Normal'}
          </button>
        </div>

        {/* MANDARIN VOICE SELECTOR DROPDOWN & TEST VOICE BUTTON */}
        <div className="pt-2.5 border-t border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white">Mandarin Voice Selector</p>
              <p className="text-[11px] text-slate-400">
                Prioritizes Neural / Natural zh-CN voices (Pitch 1.03)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                speakMandarin?.('你好，欢迎学习中文！');
              }}
              className="game-btn-3d px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/50 text-emerald-300 text-xs font-black flex items-center gap-1.5 shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Voice</span>
            </button>
          </div>

          <select
            value={preferredVoiceURI}
            onChange={(e) => {
              const nextURI = e.target.value;
              setPreferredVoiceURIState(nextURI);
              setGlobalPreferredVoiceURI(nextURI);
              soundFX.playPop();
              speakMandarin?.('你好，欢迎学习中文！');
            }}
            className="font-clarity w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 px-3 py-2.5 text-sm font-semibold text-white outline-none"
          >
            <option value="">
              Auto Best Natural Voice (
              {activeResolvedVoice
                ? `${activeResolvedVoice.name} • ${activeResolvedVoice.lang}`
                : 'System Default zh-CN'}
              )
            </option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                {v.name} ({v.lang}) {v.localService ? '• Local' : '• Neural/Online'}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-700/70">
          {!confirmResetOpen ? (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="game-btn-3d w-full py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-700 text-xs font-extrabold text-slate-300 hover:text-rose-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Study Progress</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
              <p className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Reset XP, streak, mastery levels, and node completions back to 0? (Your imported courses and custom decks will be kept intact.)
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmReset}
                  className="flex-1 py-2 rounded-lg bg-rose-600 text-xs font-extrabold text-white"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
