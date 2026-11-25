import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Map,
  Dumbbell,
  BookOpen,
  User,
  Sparkles,
  Turtle,
  Swords,
  ChevronRight
} from 'lucide-react';
import {
  PixelFlameSprite,
  PixelCoinSprite,
  PixelCrownSprite,
  PixelGemSprite,
  PixelBlockGauge
} from './components/SharedHudAndAudio.jsx';
import {
  NORMAL_SPEECH_RATE,
  SLOW_SPEECH_RATE,
  getGlobalIsSlowMode,
  setGlobalIsSlowMode,
  speakMandarinGlobal,
  soundFX
} from './audio/soundEngine.js';
import {
  UNIT_1_WORDS,
  DEFAULT_COURSES,
  DEFAULT_CUSTOM_DECKS,
  STORAGE_KEY_PROGRESS,
  STORAGE_KEY_COURSES,
  STORAGE_KEY_DECKS,
  INITIAL_PROGRESS_STATE,
  getPlayerTitle,
  computePlayerLevelProgress
} from './data/curriculumData.js';
import {
  normalizeWordEntry,
  computeUnlockedWordsPool,
  generateDeterministicDailyQuests,
  buildDynamicModalityQueue,
  buildProportionalUnitNodes,
  collectPastLessonWords,
  getWordMasteryLevel,
  getNodeCompletionLevel,
  migrateLessonProgressNodeLevels,
  computeNodeLevelXpMultiplier,
  writeWordSrsEntry
} from './utils/mandarinHelpers.js';
import {
  FlashcardStageModal,
  WritingStageModal,
  AudioSpeechStageModal,
  BossChallengeModal
} from './components/StageModals.jsx';
import {
  ToneSandhiDrillModal,
  HskMockExamModal,
  AdaptiveMixedSessionModal,
  BlitzMatchModal,
  NumbersTimeLabModal
} from './components/PracticeAndExamModals.jsx';
import {
  ProgressionMapView,
  SmartReviewArenaView,
  LibraryView,
  ProfileView
} from './components/TabViews.jsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallPrompt.jsx';

export { speakMandarinGlobal };

const STORAGE_KEY_ACTIVE_SELECTION = 'hanziapp_active_selection';

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalYesterdayIsoDate(now = new Date()) {
  return getLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

export default function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'practice' | 'library' | 'profile'

  // Persistent Progress State
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const slow = Boolean(
          parsed.isSlowMode ||
            parsed.preferredSpeed === SLOW_SPEECH_RATE ||
            parsed.preferredSpeed === 0.5
        );
        setGlobalIsSlowMode(slow);
        soundFX.setMuted(Boolean(parsed.soundMuted));
        const migratedLessonProgress = migrateLessonProgressNodeLevels(
          parsed.lessonProgress || {},
          parsed.completedStages || []
        );
        return {
          ...INITIAL_PROGRESS_STATE,
          ...parsed,
          isSlowMode: slow,
          preferredSpeed: slow ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE,
          dailyGoalXp: Number(parsed.dailyGoalXp) > 0 ? Number(parsed.dailyGoalXp) : 30,
          totalStudySeconds: Math.max(0, Number(parsed.totalStudySeconds) || 0),
          dailyStudySeconds:
            parsed.dailyStudySeconds && typeof parsed.dailyStudySeconds === 'object'
              ? {
                  date: parsed.dailyStudySeconds.date || null,
                  seconds: Math.max(0, Number(parsed.dailyStudySeconds.seconds) || 0)
                }
              : { date: null, seconds: 0 },
          lessonProgress: migratedLessonProgress,
          wordNotes: { ...(parsed.wordNotes || {}) },
          mastery: { ...INITIAL_PROGRESS_STATE.mastery, ...(parsed.mastery || {}) },
          srsData:
            parsed.srsData && typeof parsed.srsData === 'object'
              ? { ...parsed.srsData }
              : {},
          skillTelemetry: { ...(parsed.skillTelemetry || {}) },
          stats: { ...INITIAL_PROGRESS_STATE.stats, ...(parsed.stats || {}) }
        };
      }
    } catch (e) {
      // Ignore storage errors
    }
    return INITIAL_PROGRESS_STATE;
  });

  // Courses State
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Ignore
    }
    return DEFAULT_COURSES;
  });

  // Custom Decks State
  const [customDecks, setCustomDecks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DECKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Ignore
    }
    return DEFAULT_CUSTOM_DECKS;
  });

  const [activeCourseId, setActiveCourseId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SELECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.courseId && courses.some((c: any) => c.id === parsed.courseId)) {
          return parsed.courseId;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    return courses[0]?.id || DEFAULT_COURSES[0].id;
  });

  const [activeLessonId, setActiveLessonId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SELECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        const matchedCourse =
          courses.find((c: any) => c.id === parsed?.courseId) || courses[0] || DEFAULT_COURSES[0];
        if (
          parsed?.lessonId &&
          (matchedCourse.lessons || []).some((l: any) => l.id === parsed.lessonId)
        ) {
          return parsed.lessonId;
        }
        return matchedCourse.lessons?.[0]?.id || DEFAULT_COURSES[0].lessons[0].id;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return courses[0]?.lessons?.[0]?.id || DEFAULT_COURSES[0].lessons[0].id;
  });

  // Active Study / Game Modal State
  const [activeModal, setActiveModal] = useState<any>(null);

  const [speakingState, setSpeakingState] = useState({
    active: false,
    text: '',
    rate: NORMAL_SPEECH_RATE
  });
  const [toastBanner, setToastBanner] = useState<{ id: number; title: string; subtitle: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync progress, courses, and decks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
    } catch (e) {
      // Ignore
    }
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
    } catch (e) {
      // Ignore
    }
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(customDecks));
    } catch (e) {
      // Ignore
    }
  }, [customDecks]);

  const triggerToast = useCallback((title: string, subtitle = '') => {
    setToastBanner({ id: Date.now(), title, subtitle });
    setTimeout(() => {
      setToastBanner((prev) => (prev && Date.now() - prev.id >= 2900 ? null : prev));
    }, 3100);
  }, []);

  // Centralized Mandarin Speech wrapper
  const speakMandarin = useCallback((text: string, overrideRate: any = undefined) => {
    speakMandarinGlobal(text, overrideRate, {
      onStart: (cleanText: string, resolvedRate: number) => {
        setSpeakingState({ active: true, text: cleanText, rate: resolvedRate });
      },
      onEnd: () => {
        setSpeakingState({ active: false, text: '', rate: NORMAL_SPEECH_RATE });
      },
      onError: () => {
        setSpeakingState({ active: false, text: '', rate: NORMAL_SPEECH_RATE });
      }
    });
  }, []);

  const handleSetSlowMode = useCallback(
    (nextSlowBoolean: boolean, sampleText = '你好') => {
      const isSlow = Boolean(nextSlowBoolean);
      setGlobalIsSlowMode(isSlow);
      const numericRate = isSlow ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;

      setProgress((prev: any) => ({
        ...prev,
        isSlowMode: isSlow,
        preferredSpeed: numericRate
      }));

      if (sampleText) {
        speakMandarin(sampleText, numericRate);
      }
    },
    [speakMandarin]
  );

  const handleToggleSpeed = useCallback(
    (sampleText = '你好') => {
      const nextSlow = !getGlobalIsSlowMode();
      handleSetSlowMode(nextSlow, sampleText);
      triggerToast(
        nextSlow ? '0.65x Slow Audio Enabled' : '1.0x Normal Audio Enabled',
        nextSlow
          ? 'Playing Mandarin speech at 0.65x natural slow speed'
          : 'Playing Mandarin speech at 1.0x normal speed'
      );
    },
    [handleSetSlowMode, triggerToast]
  );

  const handleToggleMuteSfx = () => {
    setProgress((prev: any) => {
      const nextMuted = !prev.soundMuted;
      soundFX.setMuted(nextMuted);
      if (!nextMuted) soundFX.playPop();
      return { ...prev, soundMuted: nextMuted };
    });
  };

  // Resolve Active Course and Active Lesson
  const activeCourse = useMemo(() => {
    return courses.find((c: any) => c.id === activeCourseId) || courses[0] || DEFAULT_COURSES[0];
  }, [courses, activeCourseId]);

  const activeLessonIndex = useMemo(() => {
    const idx = (activeCourse.lessons || []).findIndex((l: any) => l.id === activeLessonId);
    return idx >= 0 ? idx : 0;
  }, [activeCourse, activeLessonId]);

  const activeLesson = useMemo(() => {
    return (
      activeCourse.lessons?.[activeLessonIndex] ||
      activeCourse.lessons?.[0] ||
      DEFAULT_COURSES[0].lessons[0]
    );
  }, [activeCourse, activeLessonIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_ACTIVE_SELECTION,
        JSON.stringify({
          courseId: activeCourse.id,
          lessonId: activeLesson.id
        })
      );
    } catch (e) {
      // Ignore storage errors
    }
  }, [activeCourse.id, activeLesson.id]);

  const activeWords = useMemo(() => {
    const raw = activeLesson?.words || UNIT_1_WORDS;
    return raw.map((w: any, idx: number) => normalizeWordEntry(w, idx));
  }, [activeLesson]);

  const { unlockedWords, unlockedWordsCount } = useMemo(
    () => computeUnlockedWordsPool(courses, activeCourse, activeLesson, progress),
    [courses, activeCourse, activeLesson, progress]
  );

  const todayCalendarDate = getLocalIsoDate();
  const dailyQuests = useMemo(
    () => generateDeterministicDailyQuests(todayCalendarDate, unlockedWordsCount),
    [todayCalendarDate, unlockedWordsCount]
  );

  const dailyQuestState = useMemo(() => {
    const saved = progress.dailyQuests || {};
    if (saved.date === todayCalendarDate) {
      return {
        date: todayCalendarDate,
        completedIds: Array.isArray(saved.completedIds) ? saved.completedIds : [],
        claimedIds: Array.isArray(saved.claimedIds) ? saved.claimedIds : [],
        bonusChestClaimed: Boolean(saved.bonusChestClaimed)
      };
    }
    return {
      date: todayCalendarDate,
      completedIds: [],
      claimedIds: [],
      bonusChestClaimed: false
    };
  }, [progress.dailyQuests, todayCalendarDate]);

  useEffect(() => {
    const needsQuestReset = progress.dailyQuests?.date !== todayCalendarDate;
    const needsStudyTimerReset = progress.dailyStudySeconds?.date !== todayCalendarDate;
    if (needsQuestReset || needsStudyTimerReset) {
      setProgress((prev: any) => ({
        ...prev,
        dailyQuests:
          prev.dailyQuests?.date === todayCalendarDate
            ? prev.dailyQuests
            : {
                date: todayCalendarDate,
                completedIds: [],
                claimedIds: [],
                bonusChestClaimed: false
              },
        dailyStudySeconds:
          prev.dailyStudySeconds?.date === todayCalendarDate
            ? prev.dailyStudySeconds
            : {
                date: todayCalendarDate,
                seconds: 0
              }
      }));
    }
  }, [progress.dailyQuests?.date, progress.dailyStudySeconds?.date, todayCalendarDate]);

  const handleRecordStudySeconds = useCallback((secondsDelta: number) => {
    const cleanDelta = Math.max(0, Math.round(Number(secondsDelta) || 0));
    if (cleanDelta <= 0) return;
    const today = getLocalIsoDate();
    setProgress((prev: any) => {
      const prevTotal = Math.max(0, Number(prev.totalStudySeconds) || 0);
      const prevDailySecs =
        prev.dailyStudySeconds?.date === today
          ? Math.max(0, Number(prev.dailyStudySeconds?.seconds) || 0)
          : 0;
      return {
        ...prev,
        totalStudySeconds: prevTotal + cleanDelta,
        dailyStudySeconds: {
          date: today,
          seconds: prevDailySecs + cleanDelta
        }
      };
    });
  }, []);

  const handleClaimQuestReward = useCallback(
    (quest: any) => {
      if (!quest) return;
      soundFX.playVictory();
      const today = getLocalIsoDate();

      setProgress((prev: any) => {
        const dq =
          prev.dailyQuests?.date === today
            ? prev.dailyQuests
            : { date: today, completedIds: [], claimedIds: [], bonusChestClaimed: false };

        if ((dq.claimedIds || []).includes(quest.id)) return prev;

        const nextClaimed = [...(dq.claimedIds || []), quest.id];
        const xpGain = Number(quest.xpReward) || 25;
        const nextTotalXp = (prev.xp || 0) + xpGain;
        const prevTodayXp =
          prev.dailyXpDate === today
            ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
            : 0;

        return {
          ...prev,
          xp: nextTotalXp,
          playerLevel: computePlayerLevelProgress(nextTotalXp).level,
          dailyXpDate: today,
          dailyXp: prevTodayXp + xpGain,
          dailyXpEarned: prevTodayXp + xpGain,
          dailyQuests: {
            date: today,
            completedIds: dq.completedIds || [],
            claimedIds: nextClaimed,
            bonusChestClaimed: Boolean(dq.bonusChestClaimed)
          }
        };
      });

      triggerToast(
        `Quest Reward Claimed! +${quest.xpReward} XP`,
        `Completed: "${quest.title}"`
      );
    },
    [triggerToast]
  );

  const handleClaimDailyChest = useCallback(() => {
    soundFX.playVictory();
    const today = getLocalIsoDate();
    setProgress((prev: any) => {
      const dq =
        prev.dailyQuests?.date === today
          ? prev.dailyQuests
          : { date: today, completedIds: [], claimedIds: [], bonusChestClaimed: false };
      if ((dq.completedIds || []).length < 3 || dq.bonusChestClaimed) return prev;
      const xpGain = 25;
      const nextTotalXp = (prev.xp || 0) + xpGain;
      const prevTodayXp =
        prev.dailyXpDate === today
          ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
          : 0;
      return {
        ...prev,
        xp: nextTotalXp,
        playerLevel: computePlayerLevelProgress(nextTotalXp).level,
        dailyXpDate: today,
        dailyXp: prevTodayXp + xpGain,
        dailyXpEarned: prevTodayXp + xpGain,
        dailyQuests: {
          ...dq,
          date: today,
          bonusChestClaimed: true
        }
      };
    });
    triggerToast(
      'Daily Completion Chest Opened! +25 XP',
      'All 3 Daily Quests completed today!'
    );
  }, [triggerToast]);

  const handleJumpToQuest = useCallback(
    (quest: any) => {
      if (!quest) return;
      soundFX.playPop();
      const pool = unlockedWords.length > 0 ? unlockedWords : activeWords;

      switch (quest.modeKey) {
        case 'smart_review': {
          const queue = buildDynamicModalityQueue(
            pool,
            ['recognition', 'writing', 'listening', 'speaking'],
            'Daily Quest • Smart Review',
            activeLessonIndex,
            [],
            0,
            unlockedWords
          );
          setActiveModal({
            type: 'mixed_session',
            stageId: null,
            questModeKey: 'smart_review',
            sessionConfig: {
              title: 'Daily Quest • Smart Review',
              badgeText: 'Daily Quest',
              xpReward: 25,
              queue
            }
          });
          break;
        }
        case 'flashcards':
          setActiveModal({
            type: 'flashcards',
            stageId: null,
            questModeKey: 'flashcards',
            words: activeWords
          });
          break;
        case 'writing':
          setActiveModal({
            type: 'writing',
            stageId: null,
            questModeKey: 'writing',
            words: activeWords
          });
          break;
        case 'dictation':
          setActiveModal({
            type: 'audio_speech',
            stageId: null,
            questModeKey: 'dictation',
            words: activeWords,
            focusMode: 'dictation'
          });
          break;
        case 'sentence_builder': {
          const queue = activeWords.map((w: any, idx: number) => ({
            stepId: `quest_sb_${w.id}_${idx}`,
            word: w,
            modality: 'sentence_builder',
            reason: 'Daily Quest • Sentence Builder'
          }));
          setActiveModal({
            type: 'mixed_session',
            stageId: null,
            questModeKey: 'sentence_builder',
            sessionConfig: {
              title: 'Sentence Builder Puzzle',
              badgeText: 'Daily Quest',
              xpReward: 25,
              queue
            }
          });
          break;
        }
        case 'tone_sandhi_drill':
          setActiveModal({
            type: 'tone_sandhi_drill',
            questModeKey: 'tone_sandhi_drill',
            words: pool
          });
          break;
        case 'cloze': {
          const queue = pool.slice(0, 6).map((w: any, idx: number) => ({
            stepId: `quest_cloze_${w.id}_${idx}`,
            word: w,
            modality: 'cloze',
            reason: 'Daily Quest • Fill-in-the-Blank'
          }));
          setActiveModal({
            type: 'mixed_session',
            stageId: null,
            questModeKey: 'cloze',
            sessionConfig: {
              title: 'Fill-in-the-Blank (选词填空)',
              badgeText: 'Daily Quest',
              xpReward: 25,
              queue
            }
          });
          break;
        }
        case 'blitz_match':
          setActiveModal({
            type: 'blitz_match',
            questModeKey: 'blitz_match',
            words: pool
          });
          break;
        case 'hsk_mock_exam':
          setActiveModal({
            type: 'hsk_mock_exam',
            questModeKey: 'hsk_mock_exam',
            words: pool
          });
          break;
        default:
          setActiveTab('practice');
      }
    },
    [activeLessonIndex, activeWords, unlockedWords]
  );

  const handleRecordSkillEvent = useCallback(
    (word: any, modalityKey: string, { mistakesDelta = 0, completionsDelta = 0 } = {}) => {
      if (!word) return;
      const key = word.hanzi || word.id;
      if (!key) return;

      setProgress((prev: any) => {
        const prevTelemetry = prev.skillTelemetry || {};
        const prevWordEntry = prevTelemetry[key] || {};
        const prevModality = prevWordEntry[modalityKey] || {
          mistakes: 0,
          completions: 0
        };

        const nextMastery = { ...(prev.mastery || {}) };
        if (mistakesDelta > 0 && completionsDelta === 0) {
          const curLv = getWordMasteryLevel(nextMastery, word);
          const nextLv = Math.max(0, Math.min(10, curLv - 1));
          if (word.id) nextMastery[word.id] = nextLv;
          if (word.hanzi) nextMastery[word.hanzi] = nextLv;
        }

        const nextSrsData = { ...(prev.srsData || {}) };
        if (mistakesDelta > 0 || completionsDelta > 0) {
          const updatedLv = getWordMasteryLevel(nextMastery, word);
          writeWordSrsEntry(nextSrsData, word, updatedLv, Date.now());
        }

        return {
          ...prev,
          mastery: nextMastery,
          srsData: nextSrsData,
          skillTelemetry: {
            ...prevTelemetry,
            [key]: {
              ...prevWordEntry,
              [modalityKey]: {
                mistakes: Math.max(0, (prevModality.mistakes || 0) + mistakesDelta),
                completions: Math.max(
                  0,
                  (prevModality.completions || 0) + completionsDelta
                )
              }
            }
          }
        };
      });
    },
    []
  );

  const handleCompleteStageSession = useCallback(
    ({
      stageId = null,
      wordsPracticed = activeWords,
      xpEarned = 50,
      maxCombo = 1,
      isBossWin = false,
      heartsRemaining = 3,
      completedModeKeys = []
    }: any) => {
      soundFX.playVictory();
      const now = new Date();
      const today = getLocalIsoDate(now);
      const yesterday = getLocalYesterdayIsoDate(now);
      const lessonKey = `${activeCourse.id}__${activeLesson.id}`;
      const isDefaultUnit1 =
        activeCourse.id === 'course_default_unit1' && activeLesson.id === 'lesson_unit_1';

      const currentLessonSnapshot = progress.lessonProgress?.[lessonKey] || {
        unlockedStage: isDefaultUnit1 ? progress.unlockedStage : 1,
        completedStages: isDefaultUnit1 ? progress.completedStages : [],
        nodeLevels: {}
      };
      const prevNodeLvForToast = stageId
        ? getNodeCompletionLevel(currentLessonSnapshot, stageId)
        : 0;
      const xpMultiplierForToast = stageId
        ? computeNodeLevelXpMultiplier(prevNodeLvForToast)
        : 1.0;
      const finalStageXpForToast = Math.round(xpEarned * xpMultiplierForToast);
      const nextNodeLvForToast = stageId ? Math.min(3, prevNodeLvForToast + 1) : 0;

      setProgress((prev: any) => {
        const nextMastery = { ...(prev.mastery || {}) };
        const nextSrsData = { ...(prev.srsData || {}) };
        const masteryStep = isBossWin ? 2 : 1;
        const reviewTimestamp = Date.now();
        const seenWordKeys = new Set<string>();
        (Array.isArray(wordsPracticed) ? wordsPracticed : []).forEach((w: any) => {
          if (!w) return;
          const dedupeKey = String(w.hanzi || w.id || '').trim();
          if (!dedupeKey || seenWordKeys.has(dedupeKey)) return;
          seenWordKeys.add(dedupeKey);
          const curLv = getWordMasteryLevel(nextMastery, w);
          const nextLv = Math.max(0, Math.min(10, curLv + masteryStep));
          if (w.id) nextMastery[w.id] = nextLv;
          if (w.hanzi) nextMastery[w.hanzi] = nextLv;
          writeWordSrsEntry(nextSrsData, w, nextLv, reviewTimestamp);
        });

        const prevLessonProg = prev.lessonProgress?.[lessonKey] || {
          unlockedStage: isDefaultUnit1 ? prev.unlockedStage : 1,
          completedStages: isDefaultUnit1 ? prev.completedStages : [],
          nodeLevels: {}
        };

        const totalLessonNodes = buildProportionalUnitNodes(activeWords).length;
        let nextUnlocked = prevLessonProg.unlockedStage || 1;
        const nextCompleted = [...(prevLessonProg.completedStages || [])];
        const nextNodeLevels: Record<string, number> = {
          ...(prevLessonProg.nodeLevels || {})
        };
        // Preserve any legacy completed stages as Level 3
        nextCompleted.forEach((sid: any) => {
          const sidKey = String(sid);
          if (typeof nextNodeLevels[sidKey] !== 'number') {
            nextNodeLevels[sidKey] = 3;
          }
        });

        let appliedXpEarned = xpEarned;

        if (stageId) {
          const prevNodeLv = getNodeCompletionLevel(
            { ...prevLessonProg, nodeLevels: nextNodeLevels },
            stageId
          );
          const xpMultiplier = computeNodeLevelXpMultiplier(prevNodeLv);
          appliedXpEarned = Math.round(xpEarned * xpMultiplier);

          const nextNodeLv = Math.min(3, prevNodeLv + 1);
          nextNodeLevels[String(stageId)] = nextNodeLv;

          if (nextNodeLv >= 1) {
            if (!nextCompleted.includes(stageId)) {
              nextCompleted.push(stageId);
            }
            if (stageId >= nextUnlocked && stageId < totalLessonNodes) {
              nextUnlocked = stageId + 1;
            }
          }
        }

        const nextStreak =
          prev.lastStudyDate === today
            ? Math.max(1, prev.streak || 0)
            : prev.lastStudyDate === yesterday
            ? (prev.streak || 0) + 1
            : 1;
        const prevTodayXp =
          prev.dailyXpDate === today
            ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
            : 0;

        const prevDq =
          prev.dailyQuests?.date === today
            ? prev.dailyQuests
            : { date: today, completedIds: [], claimedIds: [], bonusChestClaimed: false };
        const nextCompletedQuestIds = [...(prevDq.completedIds || [])];

        dailyQuests.forEach((q: any) => {
          if (
            completedModeKeys.includes(q.modeKey) &&
            !nextCompletedQuestIds.includes(q.id)
          ) {
            nextCompletedQuestIds.push(q.id);
          }
        });

        const nextTotalXp = (prev.xp || 0) + appliedXpEarned;
        const completedWriting =
          Array.isArray(completedModeKeys) && completedModeKeys.includes('writing');

        return {
          ...prev,
          xp: nextTotalXp,
          playerLevel: computePlayerLevelProgress(nextTotalXp).level,
          dailyXpDate: today,
          dailyXp: prevTodayXp + appliedXpEarned,
          dailyXpEarned: prevTodayXp + appliedXpEarned,
          streak: nextStreak,
          lastStudyDate: today,
          dailyQuests: {
            date: today,
            completedIds: nextCompletedQuestIds,
            claimedIds: prevDq.claimedIds || [],
            bonusChestClaimed: Boolean(prevDq.bonusChestClaimed)
          },
          unlockedStage: isDefaultUnit1 ? nextUnlocked : prev.unlockedStage,
          completedStages: isDefaultUnit1 ? nextCompleted : prev.completedStages,
          lessonProgress: {
            ...(prev.lessonProgress || {}),
            [lessonKey]: {
              unlockedStage: nextUnlocked,
              completedStages: nextCompleted,
              nodeLevels: nextNodeLevels
            }
          },
          mastery: nextMastery,
          srsData: nextSrsData,
          stats: {
            ...(prev.stats || {}),
            writingStagesCompleted:
              (prev.stats?.writingStagesCompleted || 0) + (completedWriting ? 1 : 0),
            perfectBossWins:
              (prev.stats?.perfectBossWins || 0) + (isBossWin && heartsRemaining === 3 ? 1 : 0),
            highestCombo: Math.max(prev.stats?.highestCombo || 0, maxCombo)
          }
        };
      });

      setActiveModal(null);
      if (stageId) {
        const bonusTag =
          xpMultiplierForToast >= 1.5
            ? ' (+50%)'
            : xpMultiplierForToast >= 1.25
            ? ' (+25%)'
            : '';
        const toastTitle =
          nextNodeLvForToast >= 3
            ? prevNodeLvForToast < 3
              ? `Node MAXED (3/3)! +${finalStageXpForToast} XP${bonusTag}`
              : `MAX Mastery Replay! +${finalStageXpForToast} XP${bonusTag}`
            : `Node Level ${nextNodeLvForToast}/3! +${finalStageXpForToast} XP${bonusTag}`;
        const toastSub =
          nextNodeLvForToast === 1
            ? 'Next map node unlocked! Replay for Lv.2/3 (+25% XP).'
            : nextNodeLvForToast === 2
            ? 'Replay for Mastery Trial 3/3 (+50% XP & Golden Crown)!'
            : 'Golden Crown mastered! Character mastery levels updated.';
        triggerToast(toastTitle, toastSub);
      } else {
        triggerToast(`Stage Complete! +${xpEarned} XP`, 'Character mastery levels updated!');
      }
    },
    [
      activeCourse.id,
      activeLesson.id,
      activeWords,
      dailyQuests,
      progress.completedStages,
      progress.lessonProgress,
      progress.unlockedStage,
      triggerToast
    ]
  );

  const handleSaveWordNote = useCallback((word: any, noteText: string) => {
    if (!word) return;
    setProgress((prev: any) => {
      const nextNotes = { ...(prev.wordNotes || {}) };
      if (word.hanzi) nextNotes[word.hanzi] = noteText;
      if (word.id) nextNotes[word.id] = noteText;
      return {
        ...prev,
        wordNotes: nextNotes
      };
    });
  }, []);

  const handleSetDailyGoalXp = useCallback(
    (newTarget: number) => {
      const cleanTarget = Math.max(10, Number(newTarget) || 30);
      setProgress((prev: any) => ({
        ...prev,
        dailyGoalXp: cleanTarget
      }));
      triggerToast(`Daily XP Goal: ${cleanTarget} XP`, 'Saved your new daily study target.');
    },
    [triggerToast]
  );

  const handleSelectStageNode = (stage: any) => {
    soundFX.playPop();
    const targetWords =
      Array.isArray(stage.words) && stage.words.length > 0 ? stage.words : activeWords;
    const pastLessonWords = collectPastLessonWords(
      activeCourse,
      activeLessonIndex,
      targetWords
    );
    const lessonKey = `${activeCourse.id}__${activeLesson.id}`;
    const isDefaultUnit1 =
      activeCourse.id === 'course_default_unit1' && activeLesson.id === 'lesson_unit_1';
    const currentLessonProg = progress.lessonProgress?.[lessonKey] || {
      unlockedStage: isDefaultUnit1 ? progress.unlockedStage : 1,
      completedStages: isDefaultUnit1 ? progress.completedStages : [],
      nodeLevels: {}
    };
    const currentNodeLevel = getNodeCompletionLevel(currentLessonProg, stage.id);

    // Run 2+ adds +1 past-lesson review item to non-writing nodes (strictly excluding writing)
    const wordsWithRun2Review =
      currentNodeLevel >= 1 && pastLessonWords.length > 0
        ? [
            ...targetWords,
            pastLessonWords[Math.floor(Math.random() * pastLessonWords.length)]
          ]
        : targetWords;

    if (stage.launchType === 'flashcards') {
      if (currentNodeLevel === 0) {
        setActiveModal({
          type: 'flashcards',
          stageId: stage.id,
          nodeLevel: currentNodeLevel,
          words: targetWords
        });
      } else {
        const discoveryModalities =
          currentNodeLevel === 1
            ? ['listening', 'reverse_meaning_mc', 'meaning_mc']
            : ['sentence_builder', 'cloze', 'listening'];
        const queue = buildDynamicModalityQueue(
          targetWords,
          discoveryModalities,
          currentNodeLevel === 1
            ? `${stage.badgeText} • Active Recall`
            : `${stage.badgeText} • Context Mastery`,
          activeLessonIndex,
          pastLessonWords,
          currentNodeLevel,
          unlockedWords
        );
        setActiveModal({
          type: 'mixed_session',
          stageId: stage.id,
          nodeLevel: currentNodeLevel,
          questModeKey: 'flashcards',
          sessionConfig: {
            title: stage.title,
            badgeText: stage.badgeText,
            xpReward: stage.xpReward || 15,
            nodeLevel: currentNodeLevel,
            queue
          }
        });
      }
    } else if (stage.launchType === 'writing') {
      let writingWords = [...targetWords];
      if (currentNodeLevel >= 1 && writingWords.length > 1) {
        const shuffled = [...writingWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = shuffled[i];
          shuffled[i] = shuffled[j];
          shuffled[j] = tmp;
        }
        const isSameOrder = shuffled.every((w, idx) => w?.hanzi === writingWords[idx]?.hanzi);
        writingWords = isSameOrder
          ? writingWords.map(
              (_, idx) =>
                writingWords[(idx + (currentNodeLevel === 1 ? 1 : 2)) % writingWords.length]
            )
          : shuffled;
      }
      setActiveModal({
        type: 'writing',
        stageId: stage.id,
        nodeLevel: currentNodeLevel,
        words: writingWords
      });
    } else if (stage.launchType === 'dictation_only') {
      setActiveModal({
        type: 'audio_speech',
        stageId: stage.id,
        nodeLevel: currentNodeLevel,
        words: wordsWithRun2Review,
        focusMode: 'dictation'
      });
    } else if (stage.launchType === 'speaking_only') {
      setActiveModal({
        type: 'audio_speech',
        stageId: stage.id,
        nodeLevel: currentNodeLevel,
        words: wordsWithRun2Review,
        focusMode: 'speaking'
      });
    } else if (stage.launchType === 'boss') {
      setActiveModal({
        type: 'boss',
        stageId: stage.id,
        nodeLevel: currentNodeLevel,
        words: targetWords,
        pastLessonWords,
        isPractice: false
      });
    } else {
      const modalitiesForNode =
        stage.launchType === 'meaning_mc'
          ? currentNodeLevel === 0
            ? ['meaning_mc']
            : currentNodeLevel === 1
            ? ['reverse_meaning_mc', 'meaning_mc']
            : ['reverse_meaning_mc', 'cloze', 'meaning_mc']
          : stage.allowedModalities;
      const queue = buildDynamicModalityQueue(
        targetWords,
        modalitiesForNode,
        stage.badgeText,
        activeLessonIndex,
        pastLessonWords,
        currentNodeLevel,
        unlockedWords
      );
      setActiveModal({
        type: 'mixed_session',
        stageId: stage.id,
        nodeLevel: currentNodeLevel,
        sessionConfig: {
          title: stage.title,
          badgeText: stage.badgeText,
          xpReward: stage.xpReward || 25,
          nodeLevel: currentNodeLevel,
          queue
        }
      });
    }
  };

  const allUniqueWordsMap = useMemo(() => {
    const map = new window.Map();
    courses.forEach((c: any) => {
      (c.lessons || []).forEach((l: any) => {
        (l.words || []).forEach((w: any, idx: number) => {
          const norm = normalizeWordEntry(w, idx);
          if (norm.hanzi && !map.has(norm.hanzi)) {
            map.set(norm.hanzi, norm);
          }
        });
      });
    });
    customDecks.forEach((d: any) => {
      (d.words || []).forEach((w: any, idx: number) => {
        const norm = normalizeWordEntry(w, idx);
        if (norm.hanzi && !map.has(norm.hanzi)) {
          map.set(norm.hanzi, norm);
        }
      });
    });
    return map;
  }, [courses, customDecks]);

  const allUniqueWordsArray = useMemo(
    () => Array.from(allUniqueWordsMap.values()),
    [allUniqueWordsMap]
  );

  const globalStats = useMemo(() => {
    let masteredWordsCount = 0; // Lv. 8–10
    let grandmasterWordsCount = 0; // Lv. 9–10
    let level10WordsCount = 0; // Lv. 10
    let learningWordsCount = 0; // Lv. 1–7
    let totalStarsEarned = 0;
    const totalTrackedWords = allUniqueWordsMap.size;

    allUniqueWordsMap.forEach((word: any) => {
      const lv = getWordMasteryLevel(progress.mastery, word);
      totalStarsEarned += lv;
      if (lv >= 8) {
        masteredWordsCount += 1;
        if (lv >= 9) grandmasterWordsCount += 1;
        if (lv >= 10) level10WordsCount += 1;
      } else if (lv >= 1) {
        learningWordsCount += 1;
      }
    });

    return {
      totalTrackedWords,
      masteredWordsCount,
      grandmasterWordsCount,
      level10WordsCount,
      learningWordsCount,
      totalStarsEarned,
      maxStarsPossible: totalTrackedWords * 10
    };
  }, [allUniqueWordsMap, progress.mastery]);

  const {
    level: currentLevel,
    xpIntoLevel,
    xpForNextLevel
  } = computePlayerLevelProgress(progress.xp);
  const nowForDates = new Date();
  const todayIso = getLocalIsoDate(nowForDates);
  const yesterdayIso = getLocalYesterdayIsoDate(nowForDates);
  const rawStreak = Math.max(0, Number(progress.streak) || 0);
  const studiedToday = progress.lastStudyDate === todayIso && rawStreak > 0;
  const streakAtRisk = progress.lastStudyDate === yesterdayIso && rawStreak > 0;
  const effectiveStreak = studiedToday || streakAtRisk ? rawStreak : 0;
  const dailyGoalXp = Number(progress.dailyGoalXp) > 0 ? Number(progress.dailyGoalXp) : 30;
  const todayXpEarned = progress.dailyXpDate === todayIso ? Number(progress.dailyXpEarned || 0) : 0;
  const completedDailyQuestsCount = dailyQuests.filter((q: any) =>
    dailyQuestState.completedIds?.includes(q.id)
  ).length;
  const isAllDailyQuestsDone = completedDailyQuestsCount >= 3;

  if (showTitleScreen) {
    return (
      <div className="min-h-dvh bg-slate-900 text-slate-100 flex justify-center font-sans select-none">
        <div className="w-full max-w-md min-h-dvh bg-slate-900 border-x border-slate-800/80 flex flex-col justify-between px-5 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] relative overflow-hidden">
          <OfflineIndicator />

          {/* Ambient Pixel Dojo Glow */}
          <div className="w-56 h-56 rounded-full bg-red-600/10 blur-3xl absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="w-56 h-56 rounded-full bg-amber-500/10 blur-3xl absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Top RPG Edition Banner */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="px-2.5 py-1 rounded-[2px] bg-slate-950 border-2 border-slate-700 font-pixel-header text-[8px] text-amber-300 uppercase tracking-wider">
              16-Bit Edition
            </span>
            <div className="flex items-center gap-1.5">
              <PWAInstallButton />
              <button
                type="button"
                onClick={handleToggleMuteSfx}
                title={progress.soundMuted ? 'Unmute UI Sound FX' : 'Mute UI Sound FX'}
                className="game-btn-3d p-1.5 rounded-[2px] bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-slate-300"
              >
                {progress.soundMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Center Hero: 汉 App Icon + HanziApp Title + HSK 1 Mandarin RPG Subtitle */}
          <div className="my-auto py-4 flex flex-col items-center text-center space-y-5 relative z-10">
            {/* Crimson-Red (#dc2626) Square 汉 App Icon with Gold Pixel Border */}
            <div className="relative">
              <div className="w-24 h-24 rounded-[2px] bg-[#dc2626] border-4 border-amber-400 shadow-[0_6px_0_#020617] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-1.5 border border-amber-200/40 pointer-events-none" />
                <span className="font-hanzi text-6xl font-black text-white drop-shadow-[0_3px_0_#7f1d1d] select-none">
                  汉
                </span>
              </div>
              <div className=" -bottom-2.5 left-1/2 -translate-x-1/2 absolute px-2 py-0.5 rounded-[2px] bg-slate-950 border-2 border-amber-400 font-pixel-header text-[8px] text-amber-300 whitespace-nowrap shadow">
                Lv.{currentLevel}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h1 className="font-pixel-header text-2xl text-white tracking-wider drop-shadow-[0_3px_0_#020617]">
                HanziApp
              </h1>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-slate-950 border-2 border-amber-500/70">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-pixel-ui text-xs font-bold uppercase tracking-widest text-amber-300">
                  HSK 1 Mandarin RPG
                </span>
              </div>
              <p className="font-clarity text-sm text-slate-300 max-w-xs mx-auto pt-0.5">
                Master Chinese characters, stroke calligraphy, tone sandhi, and active recall.
              </p>
            </div>

            {/* Compact Pixel Stats Card: Daily Streak, Player Level & Total XP, Mastered Words */}
            <div className="w-full rounded-[2px] bg-slate-950 border-2 border-slate-700 p-4 space-y-3.5 shadow-[0_4px_0_#020617] text-left">
              {/* Row 1: Daily Streak + Status Badge */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-[2px] bg-slate-900 border-2 border-amber-500/80 flex items-center justify-center shrink-0">
                    <PixelFlameSprite active={effectiveStreak > 0} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Daily Streak
                    </span>
                    <div className="font-pixel-header text-sm text-white mt-0.5">
                      {effectiveStreak} {effectiveStreak === 1 ? 'Day' : 'Days'}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-[2px] border-2 text-[10px] font-black uppercase tracking-wide shrink-0 ${
                    studiedToday
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                      : streakAtRisk
                      ? 'bg-amber-950/80 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-600 text-slate-300'
                  }`}
                >
                  {studiedToday
                    ? 'Studied Today ✓'
                    : streakAtRisk
                    ? 'Study Today to Keep Streak'
                    : '0 Days — Start Today'}
                </span>
              </div>

              {/* Row 2: Player Level & Total XP + Mastered Words (Lv. 8-10) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[2px] bg-slate-900 border-2 border-slate-800 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-amber-300">
                      Level & Total XP
                    </span>
                    <PixelCoinSprite className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-pixel-header text-xs text-white">
                    Lv.{currentLevel} • {progress.xp} XP
                  </div>
                  <div className="font-clarity text-[11px] font-semibold text-slate-400 truncate">
                    {getPlayerTitle(currentLevel)}
                  </div>
                </div>

                <div className="rounded-[2px] bg-slate-900 border-2 border-slate-800 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-emerald-300">
                      Mastered (Lv.8–10)
                    </span>
                    <PixelCrownSprite className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-pixel-header text-xs text-white">
                    {globalStats.masteredWordsCount} / {globalStats.totalTrackedWords}
                  </div>
                  <div className="font-clarity text-[11px] font-semibold text-slate-400 truncate">
                    {globalStats.learningWordsCount} Consolidating
                  </div>
                </div>
              </div>

              {/* XP Progress Bar to Next Level */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Next Level Progress</span>
                  <span className="font-pixel-header text-[9px] text-amber-300">
                    {xpIntoLevel}/{xpForNextLevel} XP
                  </span>
                </div>
                <PixelBlockGauge
                  value={xpIntoLevel}
                  max={xpForNextLevel}
                  blocks={12}
                  filledClass="bg-amber-400"
                  emptyClass="bg-slate-900"
                  heightClass="h-2"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action CTA: Start Studying (Enter Dojo) */}
          <div className="space-y-2.5 relative z-10">
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setActiveTab('map');
                setShowTitleScreen(false);
              }}
              className="game-btn-3d w-full py-4 px-5 rounded-[2px] bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 border-2 border-amber-200 text-white shadow-[0_5px_0_#020617] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Swords className="w-5 h-5 text-amber-200 shrink-0" />
                <span className="font-pixel-header text-xs uppercase tracking-wider text-white">
                  Start Studying
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-[2px] bg-slate-950/70 border border-amber-300/60 text-[10px] font-black text-amber-300">
                <span>Enter Dojo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <p className="font-clarity text-center text-xs text-slate-400">
              100% Offline-Ready PWA • Progress auto-saved on device
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100 flex justify-center font-sans select-none">
      <div className="w-full max-w-md min-h-dvh bg-slate-900 border-x border-slate-800/80 flex flex-col justify-between pb-28 relative">
        <OfflineIndicator />

        {/* STICKY GAMIFIED 16-BIT PIXEL RPG TOP BAR */}
        <header className="sticky top-0 z-30 bg-slate-900 border-b-2 border-slate-700 px-3.5 pt-[max(16px,env(safe-area-inset-top))] pb-2.5 space-y-2 shadow-[0_4px_0_#020617]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setShowTitleScreen(true);
              }}
              title="Open HanziApp Title Screen"
              className="flex items-center gap-2 min-w-0 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-[2px] bg-[#dc2626] border-2 border-amber-400 group-hover:border-amber-200 flex items-center justify-center font-hanzi font-black text-base text-white shadow-[0_2px_0_#020617] shrink-0 relative">
                <span>汉</span>
                <span className="absolute -bottom-1 -right-1 px-1 rounded-[1px] bg-amber-400 text-slate-950 font-pixel-header text-[7px] leading-tight border border-slate-950">
                  {currentLevel}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-pixel-header text-[9px] text-white group-hover:text-amber-300 truncate transition-colors">
                  HanziApp • Lv.{currentLevel}
                </div>
                <div className="w-24 mt-1">
                  <PixelBlockGauge
                    value={xpIntoLevel}
                    max={xpForNextLevel}
                    blocks={10}
                    filledClass="bg-amber-400"
                    emptyClass="bg-slate-900"
                    heightClass="h-1.5"
                  />
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <PWAInstallButton />

              {/* Speed Toggle Button (1.0x vs 0.65x) */}
              <button
                type="button"
                onClick={() => handleToggleSpeed(activeWords[0]?.hanzi || '你好')}
                title="Toggle Mandarin Speech Speed (1.0x Normal / 0.65x Slow)"
                className={`game-btn-3d px-2 py-1 rounded-[2px] border-2 text-[10px] font-black flex items-center gap-1 transition-all ${
                  progress.isSlowMode
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                    : 'bg-slate-800 border-slate-600 text-slate-200'
                }`}
              >
                <Turtle className="w-3 h-3" />
                <span>{progress.isSlowMode ? '0.65x' : '1.0x'}</span>
              </button>

              {/* Daily Streak Counter with Pixel Flame Sprite */}
              <div
                title={
                  studiedToday
                    ? 'Daily Streak (Studied Today)'
                    : streakAtRisk
                    ? 'Daily Streak (Study Today to Keep Streak)'
                    : 'Daily Streak'
                }
                className="px-2 py-1 rounded-[2px] bg-slate-950 border-2 border-amber-500 text-amber-300 text-xs font-black flex items-center gap-1"
              >
                <PixelFlameSprite active={effectiveStreak > 0} className="w-3.5 h-3.5" />
                <span className="font-pixel-header text-[10px]">{effectiveStreak}</span>
              </div>

              {/* Total XP Counter with Pixel Gold Coin Sprite */}
              <div
                title="Total XP"
                className="px-2 py-1 rounded-[2px] bg-slate-950 border-2 border-amber-400 text-amber-300 text-xs font-black flex items-center gap-1"
              >
                <PixelCoinSprite className="w-3.5 h-3.5" />
                <span className="font-pixel-header text-[10px]">{progress.xp}</span>
              </div>

              {/* Mastered Characters Counter with Pixel Crown Sprite */}
              <div
                title="Mastered Words (Lv. 8-10)"
                className="px-2 py-1 rounded-[2px] bg-slate-950 border-2 border-emerald-500 text-emerald-300 text-xs font-black flex items-center gap-1"
              >
                <PixelCrownSprite className="w-3.5 h-3.5" />
                <span className="font-pixel-header text-[10px]">{globalStats.masteredWordsCount}</span>
              </div>

              {/* Sound FX Mute / Unmute Toggle */}
              <button
                type="button"
                onClick={handleToggleMuteSfx}
                title={progress.soundMuted ? 'Unmute UI Sound FX' : 'Mute UI Sound FX'}
                className="game-btn-3d p-1.5 rounded-[2px] bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-slate-300"
              >
                {progress.soundMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Unified Daily Quests Progress Bar (0/3 -> 3/3 Gold + +25 XP Chest) */}
          <div
            onClick={() => {
              soundFX.playPop();
              setActiveTab('map');
            }}
            className={`cursor-pointer rounded-[2px] px-2.5 py-1.5 border-2 flex items-center justify-between gap-2.5 transition-all ${
              isAllDailyQuestsDone
                ? 'bg-amber-950/75 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                : 'bg-slate-950 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <PixelGemSprite className="w-3.5 h-3.5" />
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isAllDailyQuestsDone ? 'text-amber-300' : 'text-slate-200'
                }`}
              >
                {isAllDailyQuestsDone ? 'Daily Quests: 3/3 ★ Chest +25 XP' : `Daily Quests: ${completedDailyQuestsCount}/3`}
              </span>
            </div>

            <div className="flex-1 max-w-[140px]">
              <PixelBlockGauge
                value={completedDailyQuestsCount}
                max={3}
                blocks={3}
                filledClass={isAllDailyQuestsDone ? 'bg-amber-400' : 'bg-emerald-400'}
                emptyClass="bg-slate-900"
                heightClass="h-2"
              />
            </div>

            <span
              className={`font-pixel-header text-[9px] shrink-0 ${
                isAllDailyQuestsDone ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {completedDailyQuestsCount}/3
            </span>
          </div>
        </header>

        {/* TOAST NOTIFICATION BANNER (16-BIT RPG DIALOGUE BOX) */}
        {toastBanner && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-[2px] bg-slate-950 border-2 border-amber-400 px-4 py-3 shadow-[0_4px_0_#020617] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-pixel-header text-[10px] text-amber-300 truncate">{toastBanner.title}</p>
              {toastBanner.subtitle && (
                <p className="text-[11px] text-slate-200 truncate font-hanzi mt-0.5">{toastBanner.subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* MAIN TAB CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'map' && (
            <ProgressionMapView
              progress={progress}
              courses={courses}
              activeCourse={activeCourse}
              activeLesson={activeLesson}
              activeWords={activeWords}
              dailyQuests={dailyQuests}
              dailyQuestState={dailyQuestState}
              onJumpToQuest={handleJumpToQuest}
              onClaimQuestReward={handleClaimQuestReward}
              onClaimDailyChest={handleClaimDailyChest}
              onSelectCourseAndLesson={(courseId: string, lessonId: string | null) => {
                setActiveCourseId(courseId);
                const foundCourse = courses.find((c: any) => c.id === courseId);
                const targetLessonId =
                  lessonId || foundCourse?.lessons?.[0]?.id || activeLessonId;
                setActiveLessonId(targetLessonId);
              }}
              speakMandarin={speakMandarin}
              onSelectStageNode={handleSelectStageNode}
              onOpenLibraryImporter={() => setActiveTab('library')}
            />
          )}

          {activeTab === 'practice' && (
            <SmartReviewArenaView
              progress={progress}
              courses={courses}
              activeCourse={activeCourse}
              activeLesson={activeLesson}
              activeWords={activeWords}
              customDecks={customDecks}
              allUniqueWordsArray={allUniqueWordsArray}
              unlockedWords={unlockedWords}
              unlockedWordsCount={unlockedWordsCount}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              onLaunchSmartReviewSession={(queue: any, filterLabel: string) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  questModeKey: 'smart_review',
                  sessionConfig: {
                    title: 'Smart Review Arena',
                    badgeText: filterLabel,
                    xpReward: 25,
                    queue
                  }
                });
              }}
              onLaunchSentenceBuilderDrill={() => {
                soundFX.playPop();
                const queue = activeWords.map((w: any, idx: number) => ({
                  stepId: `sb_${w.id}_${idx}`,
                  word: w,
                  modality: 'sentence_builder',
                  reason: 'Sentence Builder • Word Order Puzzle'
                }));
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  questModeKey: 'sentence_builder',
                  sessionConfig: {
                    title: 'Sentence Builder Puzzle',
                    badgeText: 'Word Order',
                    xpReward: 25,
                    queue
                  }
                });
              }}
              onLaunchClassifierDrill={(items: any) => {
                soundFX.playPop();
                const safeItems = Array.isArray(items) ? items : [];
                if (safeItems.length === 0) return;
                const shuffled = [...safeItems].sort(() => Math.random() - 0.5).slice(0, 8);
                const queue = shuffled.map((item: any, idx: number) => ({
                  stepId: `clf_${item.id}_${idx}`,
                  word: item.sourceWord || activeWords[idx % activeWords.length],
                  modality: 'classifier_drill',
                  classifierItem: item,
                  reason: 'Measure Words • 量词 Trainer'
                }));
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  questModeKey: 'classifier_drill',
                  sessionConfig: {
                    title: 'Measure Words Trainer (量词)',
                    badgeText: 'HSK 1 Classifiers',
                    xpReward: 25,
                    queue
                  }
                });
              }}
              onLaunchDialogueQaDrill={(pairs: any) => {
                soundFX.playPop();
                const safePairs = Array.isArray(pairs) ? pairs : [];
                if (safePairs.length === 0) return;
                const shuffled = [...safePairs].sort(() => Math.random() - 0.5).slice(0, 8);
                const queue = shuffled.map((pair: any, idx: number) => ({
                  stepId: `qa_${pair.id}_${idx}`,
                  word: pair.sourceWord || activeWords[idx % activeWords.length],
                  modality: 'dialogue_qa',
                  dialoguePair: pair,
                  reason: `Conversational Q&A • ${pair.grammarTag || '问答'}`
                }));
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  questModeKey: 'dialogue_qa',
                  sessionConfig: {
                    title: 'Conversational Q&A (问答)',
                    badgeText: 'Mini-Dialogues',
                    xpReward: 25,
                    queue
                  }
                });
              }}
              onLaunchNumbersTimeLab={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'numbers_time_lab',
                  questModeKey: 'numbers_time_lab',
                  words: Array.isArray(pool) && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchClozeDrill={(pool: any) => {
                soundFX.playPop();
                const sourceWords =
                  Array.isArray(pool) && pool.length > 0 ? pool : activeWords;
                const queue = sourceWords.slice(0, 8).map((w: any, idx: number) => ({
                  stepId: `cloze_${w.id}_${idx}`,
                  word: w,
                  modality: 'cloze',
                  reason: 'Fill-in-the-Blank • 选词填空'
                }));
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  questModeKey: 'cloze',
                  sessionConfig: {
                    title: 'Fill-in-the-Blank (选词填空)',
                    badgeText: 'Cloze Context Drill',
                    xpReward: 25,
                    queue
                  }
                });
              }}
              onLaunchToneSandhiDrill={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'tone_sandhi_drill',
                  questModeKey: 'tone_sandhi_drill',
                  words: Array.isArray(pool) && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchHskMockExam={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'hsk_mock_exam',
                  questModeKey: 'hsk_mock_exam',
                  words: Array.isArray(pool) && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchBlitzMatch={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'blitz_match',
                  questModeKey: 'blitz_match',
                  words: pool && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchActivity={(activityType: string) => {
                soundFX.playPop();
                if (activityType === 'writing') {
                  setActiveModal({
                    type: 'writing',
                    stageId: null,
                    questModeKey: 'writing',
                    words: activeWords
                  });
                } else if (activityType === 'dictation_only') {
                  setActiveModal({
                    type: 'audio_speech',
                    stageId: null,
                    questModeKey: 'dictation',
                    words: activeWords,
                    focusMode: 'dictation'
                  });
                } else if (activityType === 'speaking_only') {
                  setActiveModal({
                    type: 'audio_speech',
                    stageId: null,
                    questModeKey: 'speaking',
                    words: activeWords,
                    focusMode: 'speaking'
                  });
                } else {
                  setActiveModal({
                    type: 'flashcards',
                    stageId: null,
                    questModeKey: 'flashcards',
                    words: activeWords
                  });
                }
              }}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              progress={progress}
              courses={courses}
              activeCourse={activeCourse}
              customDecks={customDecks}
              isSlowMode={progress.isSlowMode}
              onSetSlowMode={handleSetSlowMode}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              onAddWordsToDeck={(deckName: string, newRawWords: any[]) => {
                setCustomDecks((prev: any[]) => {
                  const normalizedNew = newRawWords.map((w, idx) =>
                    normalizeWordEntry(w, Date.now() + idx)
                  );
                  const existingIdx = prev.findIndex(
                    (d) => d.name.toLowerCase() === deckName.toLowerCase()
                  );
                  if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                      ...updated[existingIdx],
                      words: [...(updated[existingIdx].words || []), ...normalizedNew]
                    };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: `deck_${Date.now()}`,
                      name: deckName,
                      description: 'Custom user vocabulary deck',
                      words: normalizedNew
                    }
                  ];
                });
              }}
              onAddImportedCourse={(newCourse: any, switchToMap = false) => {
                setCourses((prev: any[]) => [...prev, newCourse]);
                setActiveCourseId(newCourse.id);
                if (newCourse.lessons?.[0]?.id) {
                  setActiveLessonId(newCourse.lessons[0].id);
                }
                if (switchToMap) {
                  setActiveTab('map');
                }
              }}
              onDeleteCourse={(courseIdToDelete: string, courseNameLabel = 'Course') => {
                setCourses((prev: any[]) => {
                  const remaining = prev.filter((c: any) => c.id !== courseIdToDelete);
                  const nextCourses = remaining.length > 0 ? remaining : DEFAULT_COURSES;
                  if (activeCourseId === courseIdToDelete) {
                    const fallbackCourse = nextCourses[0];
                    setActiveCourseId(fallbackCourse.id);
                    if (fallbackCourse.lessons?.[0]?.id) {
                      setActiveLessonId(fallbackCourse.lessons[0].id);
                    }
                  }
                  return nextCourses;
                });
                triggerToast(
                  'Course Deleted',
                  `Removed "${courseNameLabel}" from your Library.`
                );
              }}
              onSelectCourseOnMap={(courseId: string, lessonId: string) => {
                setActiveCourseId(courseId);
                if (lessonId) setActiveLessonId(lessonId);
                setActiveTab('map');
              }}
              onPracticeDeck={(deckWords: any[], mode: string) => {
                const targetPool =
                  Array.isArray(deckWords) && deckWords.length > 0
                    ? deckWords.map((w, i) => normalizeWordEntry(w, i))
                    : activeWords;
                setActiveModal({
                  type: mode === 'writing' ? 'writing' : 'flashcards',
                  stageId: null,
                  words: targetPool
                });
              }}
              onExportAllData={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  progress: {
                    ...progress,
                    srsData: progress.srsData || {}
                  },
                  courses,
                  customDecks
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hanziapp-backup-${getLocalIsoDate()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                triggerToast('Backup Exported!', 'Saved JSON snapshot of courses, decks & mastery.');
              }}
              onImportBackupData={(parsedBackup: any) => {
                if (!parsedBackup || typeof parsedBackup !== 'object') {
                  triggerToast('Invalid Backup', 'Backup file structure was not recognized.');
                  return;
                }
                if (parsedBackup.progress) {
                  setProgress((prev: any) => ({
                    ...prev,
                    ...parsedBackup.progress,
                    srsData:
                      parsedBackup.progress.srsData &&
                      typeof parsedBackup.progress.srsData === 'object'
                        ? { ...parsedBackup.progress.srsData }
                        : prev.srsData || {},
                    totalStudySeconds: Math.max(
                      0,
                      Number(parsedBackup.progress.totalStudySeconds ?? prev.totalStudySeconds) || 0
                    ),
                    dailyStudySeconds:
                      parsedBackup.progress.dailyStudySeconds &&
                      typeof parsedBackup.progress.dailyStudySeconds === 'object'
                        ? {
                            date: parsedBackup.progress.dailyStudySeconds.date || null,
                            seconds: Math.max(
                              0,
                              Number(parsedBackup.progress.dailyStudySeconds.seconds) || 0
                            )
                          }
                        : prev.dailyStudySeconds || { date: null, seconds: 0 }
                  }));
                }
                if (Array.isArray(parsedBackup.courses) && parsedBackup.courses.length > 0) {
                  setCourses(parsedBackup.courses);
                }
                if (Array.isArray(parsedBackup.customDecks)) {
                  setCustomDecks(parsedBackup.customDecks);
                }
                triggerToast('Backup Restored!', 'Courses, custom decks, and mastery levels loaded.');
              }}
              onCompleteStrokeRuleDojo={(completedRule: any) => {
                const today = getLocalIsoDate();
                setProgress((prev: any) => {
                  const prevRules = Array.isArray(prev.completedStrokeRules)
                    ? prev.completedStrokeRules
                    : [];
                  const nextRules = prevRules.includes(completedRule.id)
                    ? prevRules
                    : [...prevRules, completedRule.id];
                  const nextMastery = { ...(prev.mastery || {}) };
                  (completedRule.unseenChars || []).forEach((u: any) => {
                    const cur = Number(nextMastery[u.char] || 0);
                    nextMastery[u.char] = Math.max(0, Math.min(10, cur + 1));
                  });
                  const prevTodayXp =
                    prev.dailyXpDate === today
                      ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
                      : 0;
                  const nextXp = (prev.xp || 0) + 25;
                  return {
                    ...prev,
                    xp: nextXp,
                    playerLevel: computePlayerLevelProgress(nextXp).level,
                    dailyXpDate: today,
                    dailyXp: prevTodayXp + 25,
                    dailyXpEarned: prevTodayXp + 25,
                    completedStrokeRules: nextRules,
                    mastery: nextMastery
                  };
                });
                triggerToast(
                  `Rule ${completedRule.number} Mastered! +25 XP`,
                  `Completed Unseen Intuition Challenge (${completedRule.unseenChars
                    .map((u: any) => u.char)
                    .join(', ')})`
                );
              }}
              onRecordStudySeconds={handleRecordStudySeconds}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              progress={progress}
              globalStats={globalStats}
              allUniqueWordsMap={allUniqueWordsMap}
              courses={courses}
              customDecks={customDecks}
              currentLevel={currentLevel}
              onToggleSpeed={handleToggleSpeed}
              speakMandarin={speakMandarin}
              onExportAllData={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  progress: {
                    ...progress,
                    srsData: progress.srsData || {}
                  },
                  courses,
                  customDecks
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hanziapp-backup-${getLocalIsoDate()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                triggerToast('Backup Exported!', 'Downloaded full study backup JSON.');
              }}
              onImportBackupData={(parsedBackup: any) => {
                if (parsedBackup?.progress) {
                  setProgress((prev: any) => ({
                    ...prev,
                    ...parsedBackup.progress,
                    srsData:
                      parsedBackup.progress.srsData &&
                      typeof parsedBackup.progress.srsData === 'object'
                        ? { ...parsedBackup.progress.srsData }
                        : prev.srsData || {},
                    totalStudySeconds: Math.max(
                      0,
                      Number(parsedBackup.progress.totalStudySeconds ?? prev.totalStudySeconds) || 0
                    ),
                    dailyStudySeconds:
                      parsedBackup.progress.dailyStudySeconds &&
                      typeof parsedBackup.progress.dailyStudySeconds === 'object'
                        ? {
                            date: parsedBackup.progress.dailyStudySeconds.date || null,
                            seconds: Math.max(
                              0,
                              Number(parsedBackup.progress.dailyStudySeconds.seconds) || 0
                            )
                          }
                        : prev.dailyStudySeconds || { date: null, seconds: 0 }
                  }));
                }
                if (Array.isArray(parsedBackup?.courses) && parsedBackup.courses.length > 0) {
                  setCourses(parsedBackup.courses);
                }
                if (Array.isArray(parsedBackup?.customDecks)) {
                  setCustomDecks(parsedBackup.customDecks);
                }
                triggerToast('Backup Restored!', 'All progress and courses restored.');
              }}
              confirmResetOpen={confirmResetOpen}
              setConfirmResetOpen={setConfirmResetOpen}
              onConfirmReset={() => {
                const todayDate = getLocalIsoDate();
                const freshZeroState = {
                  ...INITIAL_PROGRESS_STATE,
                  totalStudySeconds: 0,
                  dailyStudySeconds: {
                    date: todayDate,
                    seconds: 0
                  },
                  dailyQuests: {
                    date: todayDate,
                    completedIds: [],
                    claimedIds: []
                  },
                  wordNotes: {},
                  completedStrokeRules: [],
                  lessonProgress: {},
                  mastery: {
                    nihao: 0,
                    你好: 0,
                    xiexie: 0,
                    谢谢: 0,
                    zaijian: 0,
                    再见: 0
                  },
                  srsData: {},
                  skillTelemetry: {},
                  stats: {
                    writingStagesCompleted: 0,
                    perfectBossWins: 0,
                    highestCombo: 0
                  }
                };
                try {
                  localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(freshZeroState));
                } catch (e) {
                  // Ignore storage errors
                }
                setProgress(freshZeroState);
                setConfirmResetOpen(false);
                triggerToast(
                  'Study Progress Reset to 0',
                  'XP, streak, study time, mastery & nodes reset. Courses and custom decks kept intact.'
                );
              }}
              onLaunchWeakWordsReview={(weakPool: any[]) => {
                const wordsToUse =
                  Array.isArray(weakPool) && weakPool.length > 0 ? weakPool : activeWords;
                const weakModalities =
                  unlockedWordsCount >= 12
                    ? ['recognition', 'writing', 'listening', 'sentence_builder']
                    : ['recognition', 'writing', 'listening'];
                const queue = buildDynamicModalityQueue(
                  wordsToUse,
                  weakModalities,
                  'Weakest Words Booster',
                  activeLessonIndex,
                  [],
                  0,
                  unlockedWords
                );
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  sessionConfig: {
                    title: 'Weakest Words Booster',
                    badgeText: 'Mastery Lv 0–4 Review',
                    xpReward: 25,
                    queue
                  }
                });
              }}
            />
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR (4 TABS: MAP, SMART REVIEW, LIBRARY, PROFILE) WITH ANDROID SAFE-AREA PADDING */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-slate-900 border-t-2 border-slate-700 px-3 pt-2.5 pb-[max(18px,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-4 gap-1.5 pb-1.5">
            {[
              { id: 'map', label: 'Map', icon: Map },
              { id: 'practice', label: 'Review', icon: Dumbbell },
              { id: 'library', label: 'Library', icon: BookOpen },
              { id: 'profile', label: 'Profile', icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop();
                    setActiveTab(tab.id);
                  }}
                  className={`game-btn-3d py-2 px-1 rounded-[2px] border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    isActive
                      ? 'bg-rose-600/30 border-rose-400 text-amber-300 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 font-bold'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ACTIVE STUDY / STAGE MODALS */}
        {activeModal?.type === 'flashcards' && (
          <FlashcardStageModal
            words={activeModal.words || activeWords}
            courseWords={allUniqueWordsArray}
            nodeLevel={activeModal.nodeLevel || 0}
            progress={progress}
            wordNotes={progress.wordNotes}
            onSaveWordNote={handleSaveWordNote}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(bonusXp = 0, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: activeModal.stageId,
                wordsPracticed: activeModal.words || activeWords,
                xpEarned: 15 + bonusXp,
                maxCombo,
                completedModeKeys: ['flashcards', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'writing' && (
          <WritingStageModal
            words={activeModal.words || activeWords}
            nodeLevel={activeModal.nodeLevel || 0}
            progress={progress}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(bonusXp = 0, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: activeModal.stageId,
                wordsPracticed: activeModal.words || activeWords,
                xpEarned: 25 + bonusXp,
                maxCombo,
                completedModeKeys: ['writing', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'audio_speech' && (
          <AudioSpeechStageModal
            words={activeModal.words || activeWords}
            courseWords={allUniqueWordsArray}
            nodeLevel={activeModal.nodeLevel || 0}
            progress={progress}
            initialFocusMode={activeModal.focusMode || 'combined'}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(bonusXp = 0, maxCombo = 1) => {
              const focusMode = activeModal.focusMode || 'combined';
              const audioModeKeys = [
                focusMode === 'dictation' || focusMode === 'combined' ? 'dictation' : null,
                focusMode === 'speaking' || focusMode === 'combined' ? 'speaking' : null,
                activeModal.questModeKey
              ].filter(Boolean);
              handleCompleteStageSession({
                stageId: activeModal.stageId,
                wordsPracticed: activeModal.words || activeWords,
                xpEarned: 25 + bonusXp,
                maxCombo,
                completedModeKeys: audioModeKeys
              });
            }}
          />
        )}

        {activeModal?.type === 'boss' && (
          <BossChallengeModal
            words={activeModal.words || activeWords}
            courseWords={allUniqueWordsArray}
            progress={progress}
            pastLessonWords={activeModal.pastLessonWords || []}
            nodeLevel={activeModal.nodeLevel || 0}
            isPracticeMode={Boolean(activeModal.isPractice)}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(correctWordIds: any, heartsRemaining: number, bonusXp = 0, maxCombo = 1) => {
              const correctIdSet = new Set(Array.isArray(correctWordIds) ? correctWordIds : []);
              const bossCandidateWords = [
                ...(activeModal.words || activeWords),
                ...(activeModal.pastLessonWords || [])
              ];
              const correctlyAnsweredWords = bossCandidateWords.filter(
                (w: any) => correctIdSet.has(w.id) || correctIdSet.has(w.hanzi)
              );
              handleCompleteStageSession({
                stageId: activeModal.stageId,
                wordsPracticed: correctlyAnsweredWords,
                xpEarned: 45 + bonusXp,
                maxCombo,
                isBossWin: true,
                heartsRemaining,
                completedModeKeys: ['boss', activeModal.questModeKey].filter(Boolean)
              });
            }}
          />
        )}

        {activeModal?.type === 'mixed_session' && (
          <AdaptiveMixedSessionModal
            sessionConfig={activeModal.sessionConfig}
            courseWords={allUniqueWordsArray}
            progress={progress}
            wordNotes={progress.wordNotes}
            onSaveWordNote={handleSaveWordNote}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(wordsPracticed: any[], bonusXp = 0, maxCombo = 1) => {
              const modalitiesInQueue = Array.from(
                new Set((activeModal.sessionConfig?.queue || []).map((q: any) => q.modality))
              );
              handleCompleteStageSession({
                stageId: activeModal.stageId,
                wordsPracticed: wordsPracticed || activeWords,
                xpEarned: (activeModal.sessionConfig?.xpReward || 25) + bonusXp,
                maxCombo,
                completedModeKeys: [
                  activeModal.questModeKey,
                  ...modalitiesInQueue
                ].filter(Boolean)
              });
            }}
          />
        )}

        {activeModal?.type === 'blitz_match' && (
          <BlitzMatchModal
            words={activeModal.words || activeWords}
            speakMandarin={speakMandarin}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(matchedWords: any[], scoreXp = 25, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: null,
                wordsPracticed:
                  matchedWords && matchedWords.length > 0 ? matchedWords : activeWords,
                xpEarned: scoreXp,
                maxCombo,
                completedModeKeys: ['blitz_match', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'tone_sandhi_drill' && (
          <ToneSandhiDrillModal
            words={activeModal.words || activeWords}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(practicedWords: any[], totalXp = 25, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: null,
                wordsPracticed:
                  practicedWords && practicedWords.length > 0 ? practicedWords : activeWords,
                xpEarned: totalXp,
                maxCombo,
                completedModeKeys: ['tone_sandhi_drill', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'hsk_mock_exam' && (
          <HskMockExamModal
            words={activeModal.words || activeWords}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(practicedWords: any[], totalXp = 40, totalCorrect = 12) =>
              handleCompleteStageSession({
                stageId: null,
                wordsPracticed:
                  practicedWords && practicedWords.length > 0 ? practicedWords : activeWords,
                xpEarned: totalXp,
                maxCombo: totalCorrect,
                completedModeKeys: ['hsk_mock_exam', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'numbers_time_lab' && (
          <NumbersTimeLabModal
            words={activeModal.words || activeWords}
            courseWords={allUniqueWordsArray}
            progress={progress}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(practicedWords: any[], totalXp = 25, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: null,
                wordsPracticed: Array.isArray(practicedWords) ? practicedWords : [],
                xpEarned: totalXp,
                maxCombo,
                completedModeKeys: ['numbers_time_lab', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}
      </div>
    </div>
  );
}
