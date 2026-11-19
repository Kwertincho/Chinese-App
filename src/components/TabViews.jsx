import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BookOpen,
  User,
  Flame,
  Star,
  Lock,
  CheckCircle2,
  Check,
  X,
  RotateCcw,
  Trophy,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Eye,
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
  Crown,
  Award,
  Target,
  Swords,
  Clock,
  Trash2,
  MessageSquare
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
  HETEROGENEOUS_PATTERNS,
  MODALITY_META,
  ADVANCED_MODE_UNLOCK_THRESHOLDS,
  getPlayerTitle
} from '../data/curriculumData.js';
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
  countWordsAtLeastLevel,
  getClassifierDrillUnlockStatus,
  getDialogueQaUnlockStatus,
  getNumbersTimeLabUnlockStatus
} from '../utils/mandarinHelpers.js';
import {
  MandarinAudioControls,
  CharacterInspectModal,
  MasterySegmentedBar,
  PixelFlameSprite,
  PixelCoinSprite,
  PixelGemSprite,
  PixelCrownSprite,
  PixelPadlockSprite,
  PixelBlockGauge,
  ScrollingText
} from './SharedHudAndAudio.jsx';
import {
  RuleExampleMiniPlayer,
  StrokeRuleIntuitionModal
} from './PracticeAndExamModals.jsx';
import { PhoneticsStudioView } from './PhoneticsStudioView.jsx';

// ============================================================================
// TAB 1: GAMIFIED WINDING PROGRESSION MAP VIEW (UNIFIED PROPORTIONAL PATH)
// ============================================================================
export function ProgressionMapView({
  progress,
  courses,
  activeCourse,
  activeLesson,
  activeWords,
  dailyQuests,
  dailyQuestState = {},
  onJumpToQuest,
  onClaimQuestReward,
  onClaimDailyChest,
  onSelectCourseAndLesson,
  speakMandarin,
  onSelectStageNode,
  onOpenLibraryImporter
}) {
  const safeDailyQuests = Array.isArray(dailyQuests) ? dailyQuests : [];
  const [selectedStagePreview, setSelectedStagePreview] = useState(null);
  const [questsExpanded, setQuestsExpanded] = useState(true);

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

  const completedQuestsCount = safeDailyQuests.filter(
    (q) => dailyQuestState.completedIds?.includes(q.id)
  ).length;
  const allThreeQuestsDone = completedQuestsCount >= 3;
  const chestClaimed = Boolean(dailyQuestState.bonusChestClaimed);
  const unclaimedReadyCount =
    safeDailyQuests.filter(
      (q) =>
        dailyQuestState.completedIds?.includes(q.id) &&
        !dailyQuestState.claimedIds?.includes(q.id)
    ).length + (allThreeQuestsDone && !chestClaimed ? 1 : 0);

  const mapHeightPx = Math.max(630, (stagesList.length - 1) * 152 + 175);

  return (
    <div className="p-4 space-y-4">
      {/* COMPACT COLLAPSIBLE DAILY QUESTS WIDGET (WITH +25 XP COMPLETION CHEST) */}
      <div
        className={`rounded-[2px] bg-slate-900 border-2 p-3.5 space-y-2.5 transition-all ${
          allThreeQuestsDone
            ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.18)]'
            : 'border-amber-500'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            soundFX.playPop();
            setQuestsExpanded((prev) => !prev);
          }}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-[2px] border-2 flex items-center justify-center shrink-0 ${
                allThreeQuestsDone
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-amber-500/20 border-amber-400 text-amber-300'
              }`}
            >
              <PixelGemSprite className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-pixel-header text-[10px] uppercase text-amber-300">
                  Daily Quests
                </span>
                {allThreeQuestsDone && (
                  <span className="px-2 py-0.5 rounded-[2px] bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                    ★ All 3 Complete!
                  </span>
                )}
                {unclaimedReadyCount > 0 && (
                  <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500 text-slate-950 font-black text-[9px] uppercase animate-bounce">
                    {unclaimedReadyCount} Claim Ready!
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {completedQuestsCount}/3 Completed • Complete all 3 for +25 XP Chest
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`font-pixel-header text-[9px] px-2 py-1 rounded-[2px] border-2 ${
                allThreeQuestsDone
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : 'bg-slate-950 border-slate-700 text-amber-300'
              }`}
            >
              {completedQuestsCount}/3
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                questsExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {questsExpanded && (
          <div className="space-y-2 pt-1 border-t-2 border-slate-800">
            {safeDailyQuests.map((quest) => {
              const isDone = dailyQuestState.completedIds?.includes(quest.id);
              const isClaimed = dailyQuestState.claimedIds?.includes(quest.id);

              return (
                <div
                  key={quest.id}
                  onClick={() => {
                    if (!isDone && !isClaimed) {
                      onJumpToQuest?.(quest);
                    }
                  }}
                  className={`rounded-[2px] p-2.5 border-2 flex items-center justify-between gap-2.5 transition-all ${
                    isClaimed
                      ? 'bg-slate-950/60 border-slate-800 opacity-65'
                      : isDone
                      ? 'bg-emerald-950/50 border-emerald-400'
                      : 'cursor-pointer bg-slate-950 hover:bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-[2px] border flex items-center justify-center text-xs font-black shrink-0 ${
                        isClaimed
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : isDone
                          ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isDone || isClaimed ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : '•'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-white truncate">
                          {quest.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-[2px] bg-slate-800 border border-slate-700 text-slate-300">
                          {quest.badge}
                        </span>
                        <span className="text-[10px] font-black text-amber-300 inline-flex items-center gap-1">
                          <PixelCoinSprite className="w-3 h-3" />
                          <span>+{quest.xpReward} XP</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isClaimed ? (
                    <span className="px-2.5 py-1 rounded-[2px] bg-slate-900 border-2 border-slate-700 text-[10px] font-black text-emerald-400 shrink-0">
                      Claimed ✓
                    </span>
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaimQuestReward?.(quest);
                      }}
                      className="game-btn-3d px-3 py-1.5 rounded-[2px] bg-emerald-500 text-slate-950 font-black text-[10px] border-2 border-emerald-200 animate-pulse shrink-0 flex items-center gap-1"
                    >
                      <PixelCoinSprite className="w-3.5 h-3.5" />
                      <span>Claim +{quest.xpReward} XP</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToQuest?.(quest);
                      }}
                      className="game-btn-3d px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0"
                    >
                      <span>Go</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* DAILY COMPLETION CHEST (+25 XP BONUS FOR 3/3 QUESTS) */}
            <div
              className={`rounded-[2px] p-2.5 border-2 flex items-center justify-between gap-2.5 ${
                allThreeQuestsDone
                  ? 'bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-amber-950/80 border-amber-400'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-[2px] border flex items-center justify-center shrink-0 ${
                    allThreeQuestsDone
                      ? 'bg-amber-400 border-amber-200 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-xs font-extrabold block truncate ${
                      allThreeQuestsDone ? 'text-amber-200' : 'text-slate-400'
                    }`}
                  >
                    Daily Completion Chest (3/3 Quests)
                  </span>
                  <span className="text-[10px] font-black text-amber-400 inline-flex items-center gap-1">
                    <PixelCoinSprite className="w-3 h-3" />
                    <span>+25 XP Bonus Reward</span>
                  </span>
                </div>
              </div>

              {chestClaimed ? (
                <span className="px-2.5 py-1 rounded-[2px] bg-amber-500/20 border-2 border-amber-400 text-[10px] font-black text-amber-300 shrink-0">
                  Chest Claimed ★
                </span>
              ) : allThreeQuestsDone ? (
                <button
                  type="button"
                  onClick={() => onClaimDailyChest?.()}
                  className="game-btn-3d px-3 py-1.5 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] border-2 border-amber-100 animate-bounce shrink-0 flex items-center gap-1"
                >
                  <PixelCoinSprite className="w-3.5 h-3.5" />
                  <span>Open +25 XP</span>
                </button>
              ) : (
                <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-500 shrink-0">
                  {completedQuestsCount}/3
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course & Lesson Selector Card */}
      <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
            Adventure World & Unit Selector
          </span>
          <button
            type="button"
            onClick={onOpenLibraryImporter}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            <span>+ Import HSK / JSON</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="relative">
            <select
              value={activeCourse.id}
              onChange={(e) => onSelectCourseAndLesson(e.target.value, null)}
              className="w-full appearance-none bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-extrabold text-white outline-none"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName} ({course.lessons?.length || 1} Unit
                  {(course.lessons?.length || 1) > 1 ? 's' : ''})
                </option>
              ))}
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

          {activeCourse.lessons && activeCourse.lessons.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
              {activeCourse.lessons.map((lesson) => {
                const isSelected = lesson.id === activeLesson.id;
                const wordCount = lesson.words?.length || 0;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onSelectCourseAndLesson(activeCourse.id, lesson.id)}
                    className={`game-btn-3d px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 max-w-[210px] border transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-400 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <ScrollingText text={`${lesson.title} (${wordCount}w)`} />
                  </button>
                );
              })}
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
            text={`Discovery → Calligraphy → Audio & Oral Mix${
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
              ? 'Run 2 (1/3 → 2/3): Hidden Pinyin + Past Review (+25% XP)'
              : activeNodeLv === 2
              ? `Mastery Trial (2/3 → 3/3 MAX): No Pinyin Hints${
                  activeStageObj.launchType === 'boss' ? ' • 12s Clock' : ''
                } (+50% XP)`
              : `MAX Crown Trial: Strict No-Pinyin${
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
  speakMandarin,
  speakingState,
  onLaunchSmartReviewSession,
  onLaunchSentenceBuilderDrill,
  onLaunchClassifierDrill,
  onLaunchDialogueQaDrill,
  onLaunchNumbersTimeLab,
  onLaunchClozeDrill,
  onLaunchToneSandhiDrill,
  onLaunchHskMockExam,
  onLaunchBlitzMatch,
  onLaunchActivity,
  triggerToast
}) {
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

    const enrichedWords = scannedPool.map((word) => {
      const mastery = getWordMasteryLevel(progress.mastery, word);
      const telemetry = getWordSkillTelemetry(progress.skillTelemetry, word);
      const srsEntry = getWordSrsEntry(progress.srsData, word);
      const isDue = isSrsActive
        ? isWordSrsDue(progress.srsData, word, mastery, nowMs)
        : false;
      const overdueMs = isSrsActive
        ? getSrsOverdueMs(progress.srsData, word, nowMs)
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

      const enriched = {
        word,
        mastery,
        telemetry,
        totalMistakes,
        srsEntry,
        isDue,
        overdueMs,
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
      wordsToReview,
      consolidatingWords,
      masteredWords,
      dueWordsCount,
      modalitySummary,
      sortedModalities,
      weakestGlobalModality
    };
  }, [
    scannedPool,
    progress.mastery,
    progress.skillTelemetry,
    progress.srsData,
    isSrsActive,
    isClozeUnlocked,
    isSentenceBuilderUnlocked,
    isClassifierUnlocked,
    isDialogueQaUnlocked
  ]);

  const adaptiveSmartQueue = useMemo(() => {
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

    const sortedCandidates = [...reviewAnalytics.enrichedWords].sort((a, b) => {
      if (isSrsActive) {
        if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
        if (a.isDue && b.isDue && a.overdueMs !== b.overdueMs) {
          return b.overdueMs - a.overdueMs;
        }
      }
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      const aMistakes = allowedModes.reduce((sum, k) => sum + (a.telemetry[k]?.mistakes || 0), 0);
      const bMistakes = allowedModes.reduce((sum, k) => sum + (b.telemetry[k]?.mistakes || 0), 0);
      return bMistakes - aMistakes;
    });

    const targetCount = Math.min(10, Math.max(sortedCandidates.length * 2, 6));
    const queue = [];
    let classifierCursor = 0;
    let dialogueCursor = 0;

    for (let i = 0; i < targetCount; i++) {
      const candidate = sortedCandidates[i % sortedCandidates.length];
      if (!candidate) break;

      const preferredModes = getPreferredModalitiesForMastery(candidate.mastery);
      const candidateModes = Array.from(
        new Set([
          ...allowedModes,
          ...(candidate.mastery >= 7 && reviewFilter !== 'writing_audio'
            ? ['sentence_builder', 'cloze', 'writing']
            : candidate.mastery >= 7
            ? ['writing', 'cloze', 'sentence_builder']
            : [])
        ])
      );

      const getModeWeightScore = (mode) => {
        const telemetry = candidate.telemetry[mode] || { mistakes: 0, completions: 0 };
        const prefIdx = preferredModes.indexOf(mode);
        const tierPreferenceBonus = prefIdx !== -1 ? (preferredModes.length - prefIdx) * 4 + 6 : 0;
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
    reviewAnalytics.enrichedWords,
    reviewFilter,
    isSrsActive,
    isClozeUnlocked,
    isSentenceBuilderUnlocked,
    isClassifierUnlocked,
    isDialogueQaUnlocked,
    classifierStatus.items,
    dialogueStatus.pairs
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
            <div className="text-[9px] text-rose-300/80">Mastery Lv. 0–4</div>
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
          <span>Start Smart Review ({adaptiveSmartQueue.length} Words)</span>
        </button>

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
export function LibraryView({
  progress,
  courses,
  activeCourse,
  customDecks,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
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
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState(null);
  const [studioToolMode, setStudioToolMode] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharEntry, setSelectedCharEntry] = useState(null);

  const [radicalFilterMode, setRadicalFilterMode] = useState('all');
  const [radicalSearch, setRadicalSearch] = useState('');

  const [expandedRuleId, setExpandedRuleId] = useState('rule_1');
  const [activeRuleChallenge, setActiveRuleChallenge] = useState(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [singleHanzi, setSingleHanzi] = useState('');
  const [singlePinyin, setSinglePinyin] = useState('');
  const [singleMeaning, setSingleMeaning] = useState('');
  const [singleExample, setSingleExample] = useState('');
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

    setSingleHanzi('');
    setSinglePinyin('');
    setSingleMeaning('');
    setSingleExample('');
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

    if (Array.isArray(parsedJson) && parsedJson.length > 0 && parsedJson[0]?.simplified) {
      const levelCounts = {};
      parsedJson.forEach((entry) => {
        if (Array.isArray(entry.level)) {
          entry.level.forEach((tag) => {
            levelCounts[tag] = (levelCounts[tag] || 0) + 1;
          });
        }
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

    const filteredEntries =
      selectedHskTag === 'all'
        ? rawHskDataPending
        : rawHskDataPending.filter(
            (item) => Array.isArray(item.level) && item.level.includes(selectedHskTag)
          );

    if (filteredEntries.length === 0) {
      triggerToast('No Matching Words', `No entries matched level tag "${selectedHskTag}".`);
      return;
    }

    const mappedWords = filteredEntries.map((item, idx) => {
      const firstForm = (Array.isArray(item.forms) && item.forms[0]) || {};
      const transcriptions = firstForm.transcriptions || {};
      const rawMeanings = Array.isArray(firstForm.meanings) ? firstForm.meanings : [];
      const joinedMeaning = rawMeanings.slice(0, 3).join('; ');
      const classifiers = Array.isArray(firstForm.classifiers)
        ? firstForm.classifiers.filter(Boolean)
        : [];
      const meaningWithClassifiers =
        classifiers.length > 0
          ? `${joinedMeaning} (CL: ${classifiers.join(', ')})`
          : joinedMeaning;

      return normalizeWordEntry(
        {
          hanzi: item.simplified,
          pinyin: transcriptions.pinyin || '',
          pinyinNum: transcriptions.numeric || '',
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

  const filteredWordsList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [];
    const seen = new Set();

    courses.forEach((c) => {
      (c.lessons || []).forEach((l) => {
        (l.words || []).forEach((w, idx) => {
          const norm = normalizeWordEntry(w, idx);
          const key = `${norm.hanzi}_${c.courseName}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ ...norm, sourceBadge: `${c.courseName} • ${l.title}` });
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
          list.push({ ...norm, sourceBadge: `Deck: ${d.name}` });
        }
      });
    });

    if (!q) return list;
    return list.filter(
      (item) =>
        item.hanzi.toLowerCase().includes(q) ||
        item.pinyin.toLowerCase().includes(q) ||
        item.pinyinToneless.toLowerCase().includes(q) ||
        (item.meaning || '').toLowerCase().includes(q)
    );
  }, [courses, customDecks, searchQuery]);

  const characterMatrixList = useMemo(() => {
    const charMap = new window.Map();
    const targetCourse = activeCourse || courses[0] || DEFAULT_COURSES[0];

    (targetCourse.lessons || []).forEach((lesson) => {
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
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Orthography & Vocabulary Studio
          </span>
          <span className="text-xs font-bold text-slate-400">
            {allLoadedCharactersMap.size} Active Chars • 25 Radicals
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'decks', label: 'Decks', icon: BookMarked },
            { id: 'char_grid', label: 'Hanzi Grid', icon: Layers },
            { id: 'radicals', label: 'Radicals', icon: Sparkles },
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
                className={`py-2 px-1 rounded-xl text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all leading-tight text-center ${
                  active
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate w-full">{item.label}</span>
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
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                        Unseen Challenge
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rule.unseenChars.map((item) => (
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
                        ))}
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
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
              Available Courses ({courses.length})
            </h2>
            {courses.map((course) => {
              const isDefaultStarter =
                course.id === 'course_default_unit1' && courses.length === 1;
              const isConfirmingDelete = confirmDeleteCourseId === course.id;
              const isCurrentActiveCourse = activeCourse?.id === course.id;

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
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Vocabulary Reference ({filteredWordsList.length})
            </h2>
            {filteredWordsList.slice(0, 25).map((word, idx) => {
              const masteryLv = getWordMasteryLevel(progress.mastery, word);
              const tierTitle = getMasteryTierMeta(masteryLv).tier;
              return (
                <div
                  key={`${word.id}_${idx}`}
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
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                    <ScrollingText text={word.sourceBadge} className="flex-1" />
                  </div>
                </div>
              );
            })}
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
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl">
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
// TAB 4: PROFILE VIEW (ACHIEVEMENTS / BADGES GRID + WEAKEST WORDS REVIEW + STATS + DAILY GOAL)
// ============================================================================
export function ProfileView({
  progress,
  globalStats,
  allUniqueWordsMap,
  courses,
  customDecks,
  currentLevel,
  dailyGoalXp = 30,
  todayXpEarned = 0,
  onSetDailyGoalXp,
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
  const [availableVoices, setAvailableVoices] = useState(() => getAvailableMandarinVoices());
  const [preferredVoiceURI, setPreferredVoiceURIState] = useState(() =>
    getGlobalPreferredVoiceURI()
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refreshVoices = () => {
      setAvailableVoices(getAvailableMandarinVoices());
    };
    refreshVoices();
    const synth = window.speechSynthesis;
    if (synth) {
      synth.onvoiceschanged = refreshVoices;
    }
    return () => {
      if (synth && synth.onvoiceschanged === refreshVoices) {
        synth.onvoiceschanged = null;
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

  const weakWordsList = useMemo(() => {
    const list = trackedWordsArray.filter(
      (word) => getWordMasteryLevel(progress.mastery, word) <= 4
    );
    return list;
  }, [trackedWordsArray, progress.mastery]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayStudySeconds =
    progress.dailyStudySeconds?.date === todayIso
      ? Math.max(0, Number(progress.dailyStudySeconds?.seconds) || 0)
      : 0;
  const totalStudySeconds = Math.max(0, Number(progress.totalStudySeconds) || 0);

  const achievements = useMemo(() => {
    const completedStagesTotal =
      (progress.completedStages?.length || 0) +
      Object.values(progress.lessonProgress || {}).reduce(
        (acc, lp) => acc + (lp.completedStages?.length || 0),
        0
      );

    const hasWrittenStage =
      (progress.stats?.writingStagesCompleted || 0) > 0 ||
      (progress.completedStages || []).includes(2);

    const hasPerfectBoss =
      (progress.stats?.perfectBossWins || 0) > 0 ||
      (progress.completedStages || []).includes(4);

    const grandmasterCount = globalStats.grandmasterWordsCount || 0;
    const lv10Count = globalStats.level10WordsCount || 0;

    return [
      {
        id: 'first_steps',
        title: 'First Steps',
        desc: 'Complete your first study stage or earn 50+ XP',
        icon: Sparkles,
        unlocked: completedStagesTotal >= 1 || progress.xp >= 50,
        progressText: completedStagesTotal >= 1 || progress.xp >= 50 ? 'Unlocked!' : `${progress.xp}/50 XP`
      },
      {
        id: 'stroke_master',
        title: 'Stroke Master',
        desc: 'Complete a Hanzi Stroke Order Writing stage',
        icon: PenTool,
        unlocked: hasWrittenStage,
        progressText: hasWrittenStage ? 'Unlocked!' : '0/1 Stage'
      },
      {
        id: 'perfect_boss',
        title: 'Perfect Boss',
        desc: 'Defeat the Unit Boss Challenge',
        icon: Swords,
        unlocked: hasPerfectBoss,
        progressText: hasPerfectBoss ? 'Unlocked!' : 'Defeat Boss'
      },
      {
        id: 'fifty_words_club',
        title: 'Mastery Club (Lv. 8–10)',
        desc: 'Build a library of 50+ words or master 3+ words (Lv. 8–10)',
        icon: BookOpen,
        unlocked:
          globalStats.totalTrackedWords >= 50 || globalStats.masteredWordsCount >= 3,
        progressText:
          globalStats.totalTrackedWords >= 50
            ? `${globalStats.totalTrackedWords}/50 Words`
            : `${globalStats.masteredWordsCount}/3 Mastered`
      },
      {
        id: 'grandmaster_sage',
        title: 'Grandmaster (Lv. 10)',
        desc: 'Reach Lv. 9–10 Grandmaster tier on any character',
        icon: Trophy,
        unlocked: grandmasterCount >= 1 || lv10Count >= 1,
        progressText:
          lv10Count >= 1
            ? `${lv10Count} Lv.10 Max!`
            : `${grandmasterCount}/1 Grandmaster`
      },
      {
        id: 'jade_scholar',
        title: 'Jade Scholar',
        desc: 'Reach Player Level 3 (250+ XP) or 3x Combo streak',
        icon: Crown,
        unlocked: currentLevel >= 3 || (progress.stats?.highestCombo || 0) >= 3,
        progressText: `Lv.${currentLevel}/3`
      }
    ];
  }, [progress, globalStats, currentLevel]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

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
            <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border-2 border-amber-400/60">
              {unlockedCount}/{achievements.length} Badges
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
            Today's Study Time
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
              Weakest Words Review (Level 0–4)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {weakWordsList.length > 0
                ? `You have ${weakWordsList.length} character(s) at Mastery Level 0–4 (${weakWordsList
                    .slice(0, 4)
                    .map((w) => w.hanzi)
                    .join(', ')}${weakWordsList.length > 4 ? '...' : ''}). Re-train them now!`
                : 'All tracked characters are above Level 4! Click below for a quick refresher.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onLaunchWeakWordsReview(
              weakWordsList.length > 0 ? weakWordsList : trackedWordsArray.slice(0, 5)
            )
          }
          className="game-btn-3d w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-lg border-b-4 border-rose-800 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5px]" />
          <span>
            Review {weakWordsList.length > 0 ? `${weakWordsList.length} Weakest Words` : 'Core Words'} Now
          </span>
        </button>
      </div>

      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>Achievements & Badges</span>
          </h2>
          <span className="text-xs font-black text-slate-300">
            {unlockedCount} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {achievements.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`rounded-2xl p-3 border transition-all flex flex-col justify-between ${
                  badge.unlocked
                    ? 'bg-gradient-to-b from-amber-500/15 to-slate-900 border-amber-400/50 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      badge.unlocked
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <BadgeIcon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      badge.unlocked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {badge.progressText}
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-xs font-black text-white">{badge.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

        <div className="space-y-2.5 pt-2 max-h-56 overflow-y-auto pr-1">
          {trackedWordsArray.slice(0, 20).map((word) => {
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
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Daily Quests, Backup & Study Settings
        </h2>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-white">Daily Quests & Completion Chest</p>
            <p className="text-[11px] text-slate-400">
              Today's Quests:{' '}
              <strong className="text-amber-300">
                {(progress.dailyQuests?.date === todayIso
                  ? progress.dailyQuests?.completedIds?.length
                  : 0) || 0}{' '}
                / 3 Completed
              </strong>{' '}
              • Complete all 3 for +25 XP Chest
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black border-2 shrink-0 ${
              ((progress.dailyQuests?.date === todayIso
                ? progress.dailyQuests?.completedIds?.length
                : 0) || 0) >= 3
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-slate-950 border-amber-500/50 text-amber-300'
            }`}
          >
            {((progress.dailyQuests?.date === todayIso
              ? progress.dailyQuests?.completedIds?.length
              : 0) || 0) >= 3
              ? '★ 3/3 Gold Chest!'
              : `${
                  (progress.dailyQuests?.date === todayIso
                    ? progress.dailyQuests?.completedIds?.length
                    : 0) || 0
                }/3 Quests`}
          </span>
        </div>

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
