import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronRight,
  Compass
} from 'lucide-react';
import {
  PixelFlameSprite,
  PixelCoinSprite,
  PixelCrownSprite,
  PixelBlockGauge
} from './components/SharedHudAndAudio.jsx';
import {
  NORMAL_SPEECH_RATE,
  SLOW_SPEECH_RATE,
  getGlobalIsSlowMode,
  setGlobalIsSlowMode,
  getGlobalPreferredVoiceURI,
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
  MODALITY_META,
  getPlayerTitle,
  computePlayerLevelProgress
} from './data/curriculumData.js';
import {
  normalizeWordEntry,
  computeUnlockedWordsPool,
  buildDynamicModalityQueue,
  buildProportionalUnitNodes,
  collectPastLessonWords,
  getWordMasteryLevel,
  getNodeCompletionLevel,
  migrateLessonProgressNodeLevels,
  computeNodeLevelXpMultiplier,
  writeWordSrsEntry,
  sampleWeightedWordsWithoutReplacement,
  SRS_ACTIVATION_MIN_WORDS,
  isWordSrsDue,
  getLeechWords,
  countWordsAtLeastLevel,
  buildConfusableDrillItems,
  getCourseHskBandNumber,
  sortCourseLessonsNumerically,
  sortCoursesCanonically,
  isWordDiscovered,
  rankWeakestDiscoveredWords
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
import { ShadowingAudioModal } from './components/ShadowingAudioModal.jsx';
import { StudyModesHub } from './components/StudyModesHub.jsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallPrompt.jsx';
import {
  loadStaticLinguisticData,
  getPreloadedCurriculum,
  getMasterLexiconMap,
  getLinguisticDataStatus,
  getDataBaseUrl,
  setDataBaseUrl,
  DEFAULT_REMOTE_DATA_BASE_URL
} from './engine/linguisticDataLoader.js';
import { enrichWordEntry, enrichWordsCollection } from './engine/lexiconEnricher.js';
import {
  generateGenerativeBatch,
  generateSentenceForWord,
  generateSyntaxTransformItem,
  generateErrorSpotterItem,
  generateSeparableVerbLabItem,
  generateMicroReadingPassage
} from './engine/grammarEngine.js';
import {
  adaptContextualWritingItem,
  normalizeGrammarLabItem,
  buildParticleContrastLabItem
} from './components/Phase4GenerativeCards.jsx';
import {
  getGenerativeEngineReadiness,
  createLockedGenerativeReadiness
} from './engine/translationGrader.js';
import {
  getCorpusReadinessStats,
  mineCorpusSentences,
  minedSentenceToOpenClozeItem,
  minedSentenceToTranslationItem
} from './engine/corpusMiner.js';

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
        const {
          dailyQuests: _legacyDailyQuests,
          achievements: _legacyAchievements,
          unlockedAchievements: _legacyUnlockedAchievements,
          ...cleanParsed
        } = parsed && typeof parsed === 'object' ? parsed : {};
        return {
          ...INITIAL_PROGRESS_STATE,
          ...cleanParsed,
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
          wordLinguisticOverrides:
            parsed.wordLinguisticOverrides && typeof parsed.wordLinguisticOverrides === 'object'
              ? { ...parsed.wordLinguisticOverrides }
              : {},
          wordPriorityOverrides:
            parsed.wordPriorityOverrides && typeof parsed.wordPriorityOverrides === 'object'
              ? { ...parsed.wordPriorityOverrides }
              : {},
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

  // Courses State (always canonically ordered with strictly numeric lesson order)
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortCoursesCanonically(parsed.map((c: any) => sortCourseLessonsNumerically(c)));
        }
      }
    } catch (e) {
      // Ignore
    }
    return sortCoursesCanonically(DEFAULT_COURSES.map((c: any) => sortCourseLessonsNumerically(c)));
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
        const rawMatchedCourse =
          courses.find((c: any) => c.id === parsed?.courseId) || courses[0] || DEFAULT_COURSES[0];
        const matchedCourse = sortCourseLessonsNumerically(rawMatchedCourse);
        const sortedLessons = matchedCourse?.lessons || [];
        const firstLessonId = sortedLessons[0]?.id || DEFAULT_COURSES[0].lessons[0].id;

        if (parsed?.lessonId && sortedLessons.some((l: any) => l.id === parsed.lessonId)) {
          // If the course has zero recorded progress yet, always land on the numerically first lesson
          // (heals any legacy selection saved when lessons were lexicographically ordered, e.g. nhsk1-l11).
          const courseHasProgress = Object.entries(progress.lessonProgress || {}).some(
            ([k, lp]: [string, any]) =>
              k.startsWith(`${matchedCourse.id}__`) &&
              lp &&
              ((lp.unlockedStage || 1) > 1 ||
                (Array.isArray(lp.completedStages) && lp.completedStages.length > 0) ||
                Object.values(lp.nodeLevels || {}).some((lv: any) => Number(lv) >= 1))
          );
          if (!courseHasProgress && parsed.lessonId !== firstLessonId) {
            return firstLessonId;
          }
          return parsed.lessonId;
        }
        return firstLessonId;
      }
    } catch (e) {
      // Ignore storage errors
    }
    const firstCourse = sortCourseLessonsNumerically(courses[0] || DEFAULT_COURSES[0]);
    return firstCourse?.lessons?.[0]?.id || DEFAULT_COURSES[0].lessons[0].id;
  });

  // Active Study / Game Modal State
  const [activeModal, setActiveModal] = useState<any>(null);
  const [isShadowingOpen, setIsShadowingOpen] = useState(false);
  const [isModesGuideOpen, setIsModesGuideOpen] = useState(false);
  const [libraryNavTarget, setLibraryNavTarget] = useState<any>(null);

  const [speakingState, setSpeakingState] = useState({
    active: false,
    text: '',
    rate: NORMAL_SPEECH_RATE
  });
  const [toastBanner, setToastBanner] = useState<{ id: number; title: string; subtitle: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [linguisticDataStatus, setLinguisticDataStatus] = useState(() =>
    getLinguisticDataStatus()
  );
  const [isSyncingData, setIsSyncingData] = useState(false);

  const prunedCourseBandByIdRef = useRef<Record<string, number | null>>({});

  const mergePreloadedCourses = useCallback((preloaded: any, forceRefresh = false) => {
    if (!preloaded || !Array.isArray(preloaded.courses) || preloaded.courses.length === 0) {
      return;
    }
    const incomingVersion = preloaded.version || null;
    const incomingIds = new Set<string>(
      preloaded.courses.map((c: any) => c?.id).filter(Boolean)
    );

    const isUserPreservedCourse = (c: any) =>
      Boolean(c) &&
      c.sourceType !== 'preloaded-hsk' &&
      !String(c.id || '').startsWith('preloaded_') &&
      !String(c.courseName || '').endsWith('• Gradual Path');

    setCourses((prevCourses: any[]) => {
      const userCourses: any[] = [];
      const userCourseIds = new Set<string>();
      const existingPreloadedById: Record<string, any> = {};

      prevCourses.forEach((existingCourse: any) => {
        if (!existingCourse?.id) return;
        if (isUserPreservedCourse(existingCourse)) {
          userCourses.push(existingCourse);
          userCourseIds.add(existingCourse.id);
          return;
        }
        existingPreloadedById[existingCourse.id] = existingCourse;
        if (!incomingIds.has(existingCourse.id)) {
          prunedCourseBandByIdRef.current[existingCourse.id] =
            getCourseHskBandNumber(existingCourse);
        }
      });

      // Rebuild preloaded courses in the exact canonical array order returned by hsk_curriculum.json
      const canonicalPreloadedCourses: any[] = [];
      preloaded.courses.forEach((preCourse: any) => {
        if (!preCourse?.id || userCourseIds.has(preCourse.id)) return;
        const stampedCourse = {
          ...preCourse,
          sourceType: 'preloaded-hsk',
          curriculumVersion: incomingVersion || preCourse.curriculumVersion || null
        };
        const existingPre = existingPreloadedById[preCourse.id];
        const shouldKeepExisting =
          existingPre &&
          existingPre.sourceType === 'preloaded-hsk' &&
          !forceRefresh &&
          (!incomingVersion || existingPre.curriculumVersion === incomingVersion) &&
          existingPre.hskBand === stampedCourse.hskBand;

        canonicalPreloadedCourses.push(
          sortCourseLessonsNumerically(shouldKeepExisting ? existingPre : stampedCourse)
        );
      });

      const nextCourses = sortCoursesCanonically([
        ...userCourses.map((c: any) => sortCourseLessonsNumerically(c)),
        ...canonicalPreloadedCourses
      ]);
      const didChange =
        nextCourses.length !== prevCourses.length ||
        nextCourses.some((course, idx) => {
          const prev = prevCourses[idx];
          if (!prev || course.id !== prev.id || course.curriculumVersion !== prev.curriculumVersion) {
            return true;
          }
          const nextLessons = course.lessons || [];
          const prevLessons = prev.lessons || [];
          if (nextLessons.length !== prevLessons.length) return true;
          return nextLessons.some((l: any, lIdx: number) => l?.id !== prevLessons[lIdx]?.id);
        });

      return didChange ? nextCourses : prevCourses;
    });
  }, []);

  // Smoothly switch activeCourseId if a superseded preloaded course was pruned on sync
  useEffect(() => {
    if (!Array.isArray(courses) || courses.length === 0) return;
    if (courses.some((c: any) => c.id === activeCourseId)) return;

    const prunedBand = prunedCourseBandByIdRef.current[activeCourseId];
    const bandReplacement =
      prunedBand != null
        ? courses.find((c: any) => getCourseHskBandNumber(c) === prunedBand)
        : null;
    const replacement = bandReplacement || courses[0] || DEFAULT_COURSES[0];

    if (replacement?.id) {
      setActiveCourseId(replacement.id);
      if (replacement.lessons?.[0]?.id) {
        setActiveLessonId(replacement.lessons[0].id);
      }
    }
  }, [courses, activeCourseId]);

  // Lazy non-blocking load of optional offline static linguistic data (remote GitHub CDN -> /data/*.json)
  useEffect(() => {
    let cancelled = false;
    loadStaticLinguisticData().then((status) => {
      if (cancelled) return;
      setLinguisticDataStatus(status);
      mergePreloadedCourses(getPreloadedCurriculum(), false);
    });
    return () => {
      cancelled = true;
    };
  }, [mergePreloadedCourses]);

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

  const handleSyncLinguisticData = useCallback(
    async (customUrl?: string) => {
      if (typeof customUrl === 'string') {
        setDataBaseUrl(customUrl);
      }
      setIsSyncingData(true);
      try {
        const status = await loadStaticLinguisticData({ forceRefresh: true });
        setLinguisticDataStatus(status);
        mergePreloadedCourses(getPreloadedCurriculum(), true);
        const sourceLabel =
          status.source === 'remote'
            ? 'Remote CDN'
            : status.source === 'local'
            ? 'Local /data/'
            : 'Built-in Fallback';
        const versionLabel = status.curriculumVersion
          ? `v${String(status.curriculumVersion).replace(/^v/i, '')}`
          : 'built-in';
        triggerToast(
          `Data Synced • ${versionLabel} (${status.source})`,
          `${sourceLabel} • ${status.lexiconCount.toLocaleString()} lexicon • ${status.preloadedCoursesCount} HSK course(s) • ${status.corpusCount} corpus`
        );
        return status;
      } catch {
        const fallbackStatus = getLinguisticDataStatus();
        setLinguisticDataStatus(fallbackStatus);
        triggerToast(
          'Offline Fallback Active',
          `Using cached/built-in datasets (${fallbackStatus.corpusCount} corpus sentences)`
        );
        return fallbackStatus;
      } finally {
        setIsSyncingData(false);
      }
    },
    [mergePreloadedCourses, triggerToast]
  );

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

  // Resolve Active Course and Active Lesson (always numerically sorted)
  const activeCourse = useMemo(() => {
    const found =
      courses.find((c: any) => c.id === activeCourseId) || courses[0] || DEFAULT_COURSES[0];
    return sortCourseLessonsNumerically(found);
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

  // Enrich ONLY unlocked words (strictly isolating the silent master lexicon from exercise pools)
  const enrichedUnlockedWords = useMemo(() => {
    try {
      return enrichWordsCollection(
        unlockedWords,
        progress.wordLinguisticOverrides,
        progress.wordPriorityOverrides
      );
    } catch (err) {
      console.warn('[App] enrichWordsCollection failed, falling back to raw unlocked words:', err);
      return Array.isArray(unlockedWords) ? unlockedWords : [];
    }
  }, [
    unlockedWords,
    progress.wordLinguisticOverrides,
    progress.wordPriorityOverrides,
    linguisticDataStatus.loaded,
    linguisticDataStatus.lexiconCount,
    linguisticDataStatus.lastSyncedAt
  ]);

  // Memoized readiness metadata for Phase 3 & Phase 4 generative exercise modes
  const generativeReadiness = useMemo(() => {
    try {
      return getGenerativeEngineReadiness(enrichedUnlockedWords);
    } catch (err) {
      console.warn('[App] getGenerativeEngineReadiness failed, using locked fallback:', err);
      return createLockedGenerativeReadiness(unlockedWordsCount);
    }
  }, [enrichedUnlockedWords, unlockedWordsCount]);

  // Memoized bilingual corpus i+0 / i+1 readiness statistics
  const corpusStats = useMemo(() => {
    try {
      return getCorpusReadinessStats(enrichedUnlockedWords);
    } catch (err) {
      console.warn('[App] getCorpusReadinessStats failed:', err);
      return { totalCorpusSentences: 0, i0Count: 0, i1Count: 0 };
    }
  }, [enrichedUnlockedWords, linguisticDataStatus.corpusCount]);

  const todayCalendarDate = getLocalIsoDate();

  useEffect(() => {
    const needsStudyTimerReset = progress.dailyStudySeconds?.date !== todayCalendarDate;
    if (needsStudyTimerReset) {
      setProgress((prev: any) => ({
        ...prev,
        dailyStudySeconds:
          prev.dailyStudySeconds?.date === todayCalendarDate
            ? prev.dailyStudySeconds
            : {
                date: todayCalendarDate,
                seconds: 0
              }
      }));
    }
  }, [progress.dailyStudySeconds?.date, todayCalendarDate]);

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

        const prevLv = getWordMasteryLevel(prev.mastery, word);
        const nextMastery = { ...(prev.mastery || {}) };
        if (mistakesDelta > 0 && completionsDelta === 0) {
          const nextLv = Math.max(0, Math.min(10, prevLv - 1));
          if (word.id) nextMastery[word.id] = nextLv;
          if (word.hanzi) nextMastery[word.hanzi] = nextLv;
        }

        const nextSrsData = { ...(prev.srsData || {}) };
        if (mistakesDelta > 0 || completionsDelta > 0) {
          const updatedLv = getWordMasteryLevel(nextMastery, word);
          const outcome = mistakesDelta > 0 ? 'fail' : 'pass';
          const srsMasteryLv = outcome === 'fail' ? Math.max(prevLv, updatedLv) : updatedLv;
          const enrichedForSrs =
            typeof word.srsMultiplier === 'number'
              ? word
              : enrichWordEntry(
                  word,
                  prev.wordLinguisticOverrides,
                  prev.wordPriorityOverrides
                );
          writeWordSrsEntry(
            nextSrsData,
            enrichedForSrs,
            srsMasteryLv,
            Date.now(),
            enrichedForSrs.srsMultiplier,
            outcome
          );
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
          const enrichedForSrs =
            typeof w.srsMultiplier === 'number'
              ? w
              : enrichWordEntry(w, prev.wordLinguisticOverrides, prev.wordPriorityOverrides);
          writeWordSrsEntry(
            nextSrsData,
            enrichedForSrs,
            nextLv,
            reviewTimestamp,
            enrichedForSrs.srsMultiplier,
            'pass'
          );
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

  const handleSaveWordLinguisticOverride = useCallback((word: any, overrideObj: any) => {
    const hanziKey = String(typeof word === 'string' ? word : word?.hanzi || '').trim();
    if (!hanziKey) return;
    setProgress((prev: any) => {
      const nextOverrides = { ...(prev.wordLinguisticOverrides || {}) };
      if (!overrideObj || typeof overrideObj !== 'object') {
        delete nextOverrides[hanziKey];
      } else {
        nextOverrides[hanziKey] = {
          ...(nextOverrides[hanziKey] || {}),
          ...overrideObj
        };
      }
      return {
        ...prev,
        wordLinguisticOverrides: nextOverrides
      };
    });
  }, []);

  const handleCycleWordPriority = useCallback((word: any) => {
    const hanziKey = String(typeof word === 'string' ? word : word?.hanzi || word?.id || '').trim();
    if (!hanziKey) return;
    soundFX.playPop();
    setProgress((prev: any) => {
      const nextPriorityOverrides = { ...(prev.wordPriorityOverrides || {}) };
      const currentOverride = nextPriorityOverrides[hanziKey] || null;
      // Cycle: auto (null) -> core -> niche -> standard -> auto (null)
      const nextState =
        currentOverride === null
          ? 'core'
          : currentOverride === 'core'
          ? 'niche'
          : currentOverride === 'niche'
          ? 'standard'
          : null;

      if (nextState === null) {
        delete nextPriorityOverrides[hanziKey];
      } else {
        nextPriorityOverrides[hanziKey] = nextState;
      }

      return {
        ...prev,
        wordPriorityOverrides: nextPriorityOverrides
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
    const enrichedPastLessonWords = pastLessonWords.map((pw: any) =>
      enrichWordEntry(pw, progress.wordLinguisticOverrides, progress.wordPriorityOverrides)
    );
    const wordsWithRun2Review =
      currentNodeLevel >= 1 && enrichedPastLessonWords.length > 0
        ? [
            ...targetWords,
            ...sampleWeightedWordsWithoutReplacement(enrichedPastLessonWords, 1)
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
          enrichedPastLessonWords,
          currentNodeLevel,
          enrichedUnlockedWords,
          generativeReadiness
        );
        setActiveModal({
          type: 'mixed_session',
          stageId: stage.id,
          nodeLevel: currentNodeLevel,
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
        enrichedPastLessonWords,
        currentNodeLevel,
        enrichedUnlockedWords,
        generativeReadiness
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

  const srsDueCount = useMemo(() => {
    const nowMs = Date.now();
    return unlockedWords.filter(
      (w: any) =>
        isWordDiscovered(w, progress) &&
        isWordSrsDue(progress.srsData, w, getWordMasteryLevel(progress.mastery, w), nowMs)
    ).length;
  }, [unlockedWords, progress]);

  const leechWordsList = useMemo(
    () => getLeechWords(unlockedWords, progress.srsData),
    [unlockedWords, progress.srsData]
  );

  const confusableReadyCount = useMemo(
    () => buildConfusableDrillItems(unlockedWords, getMasterLexiconMap(), 8).length,
    [unlockedWords, linguisticDataStatus.lexiconCount]
  );

  const handleLaunchGenerativeDrill = useCallback(
    (modeKey: string) => {
      if (modeKey === 'corpus_immersion') {
        if ((corpusStats?.i0Count || 0) < 6) {
          soundFX.playMistake();
          triggerToast(
            'Corpus Immersion Locked',
            `Unlocks at 6 i+0 sentences (${corpusStats?.i0Count || 0}/6 ready).`
          );
          return;
        }
      } else if (modeKey === 'confusable_chars') {
        const previewConfusable = buildConfusableDrillItems(
          unlockedWords,
          getMasterLexiconMap(),
          8
        );
        if (previewConfusable.length < 3) {
          soundFX.playMistake();
          triggerToast(
            'Confusable Twins Locked',
            `Unlocks at 3 confusable sets (${previewConfusable.length}/3 ready).`
          );
          return;
        }
      } else {
        const modeStatus = (generativeReadiness as any)?.[modeKey];
        if (!modeStatus?.unlocked) {
          soundFX.playMistake();
          triggerToast(
            'Generative Mode Locked',
            modeStatus?.detailProgressText || 'Unlock more vocabulary words to activate this lab.'
          );
          return;
        }
      }

      const pool = Array.isArray(enrichedUnlockedWords) ? enrichedUnlockedWords : [];
      if (pool.length === 0) return;

      const nowMs = Date.now();
      const learnedCount = countWordsAtLeastLevel(progress?.mastery, allUniqueWordsArray, 1);
      const srsActive = learnedCount >= SRS_ACTIVATION_MIN_WORDS;
      const srsDueHanziSet = new Set<string>();
      const srsDueWords: any[] = [];

      if (srsActive) {
        pool.forEach((w: any) => {
          const lv = getWordMasteryLevel(progress?.mastery, w);
          if (isWordSrsDue(progress?.srsData, w, lv, nowMs)) {
            if (w?.hanzi) srsDueHanziSet.add(w.hanzi);
            srsDueWords.push(w);
          }
        });
      }

      const focusWords = [...srsDueWords, ...activeWords];
      const modeMeta =
        modeKey === 'corpus_immersion'
          ? {
              label: 'Corpus Immersion (i+0)',
              shortLabel: 'Corpus i+0'
            }
          : (MODALITY_META as any)[modeKey] || {
              label: 'Generative Grammar Drill',
              shortLabel: 'Grammar'
            };
      const queue: any[] = [];

      try {
        if (modeKey === 'corpus_immersion') {
          const minedList = mineCorpusSentences(pool, {
            mode: 'i0_only',
            srsDueHanziSet,
            limit: 6
          });
          minedList.forEach((mined: any, idx: number) => {
            const preferOpenCloze = idx % 2 === 0;
            let chosenModality = preferOpenCloze ? 'open_cloze' : 'translation_prod';
            let genItem = preferOpenCloze
              ? minedSentenceToOpenClozeItem(mined, pool)
              : minedSentenceToTranslationItem(mined, pool);
            if (!genItem) {
              chosenModality = preferOpenCloze ? 'translation_prod' : 'open_cloze';
              genItem = preferOpenCloze
                ? minedSentenceToTranslationItem(mined, pool)
                : minedSentenceToOpenClozeItem(mined, pool);
            }
            if (genItem) {
              queue.push({
                stepId: `corp_imm_${mined.id}_${idx}`,
                word: genItem.targetWord || pool[idx % pool.length] || activeWords[0],
                modality: chosenModality,
                generativeItem: genItem,
                reason: `Corpus Immersion (i+0) • ${
                  chosenModality === 'open_cloze' ? 'Open Cloze' : 'EN → ZH'
                }`
              });
            }
          });
        } else if (modeKey === 'translation_prod' || modeKey === 'open_cloze') {
          const batch = generateGenerativeBatch(pool, {
            count: 6,
            focusWords,
            srsDueHanziSet,
            mode: modeKey
          });
          batch.forEach((genItem: any, idx: number) => {
            queue.push({
              stepId: `${modeKey}_${genItem.id}_${idx}`,
              word: genItem.targetWord || pool[idx % pool.length] || activeWords[0],
              modality: modeKey,
              generativeItem: genItem,
              reason: `${modeMeta.shortLabel} • ${genItem.grammarPoint?.title || 'Grammar Pattern'}`
            });
          });
        } else if (modeKey === 'syntax_transform') {
          const seenTargets = new Set<string>();
          const anchorPool = [...srsDueWords, ...pool];
          for (let attempt = 0; attempt < 24 && queue.length < 6; attempt++) {
            const focusWord = anchorPool.length > 0 ? anchorPool[attempt % anchorPool.length] : null;
            const xform =
              generateSyntaxTransformItem(pool, focusWord) ||
              generateSyntaxTransformItem(pool, null);
            const keyHanzi = xform?.expectedSentence?.hanzi || '';
            if (xform && keyHanzi && !seenTargets.has(keyHanzi)) {
              seenTargets.add(keyHanzi);
              queue.push({
                stepId: `xform_${xform.id}_${queue.length}`,
                word:
                  xform.expectedSentence?.targetWord ||
                  focusWord ||
                  pool[queue.length % pool.length] ||
                  activeWords[0],
                modality: 'syntax_transform',
                generativeItem: xform,
                reason: `Transform • ${xform.targetGrammarPoint?.title || 'Sentence Syntax'}`
              });
            }
          }
        } else if (modeKey === 'error_spotter') {
          const seenBroken = new Set<string>();
          const anchorPool = [...srsDueWords, ...pool];
          for (let attempt = 0; attempt < 24 && queue.length < 6; attempt++) {
            const focusWord = anchorPool.length > 0 ? anchorPool[attempt % anchorPool.length] : null;
            const errItem =
              generateErrorSpotterItem(pool, focusWord) ||
              generateErrorSpotterItem(pool, null);
            const keyBroken = errItem?.brokenHanzi || '';
            if (errItem && keyBroken && !seenBroken.has(keyBroken)) {
              seenBroken.add(keyBroken);
              const tokenWord =
                errItem.correctedTokens?.find((t: any) => t?.isTarget)?.sourceWord ||
                focusWord ||
                pool[queue.length % pool.length] ||
                activeWords[0];
              queue.push({
                stepId: `err_${errItem.id}_${queue.length}`,
                word: tokenWord,
                modality: 'error_spotter',
                generativeItem: errItem,
                reason: 'Error Spotter • 病句修改'
              });
            }
          }
        } else if (modeKey === 'contextual_writing') {
          const seenTargets = new Set<string>();
          const batch = generateGenerativeBatch(pool, {
            count: 10,
            focusWords,
            srsDueHanziSet
          });
          for (let i = 0; i < batch.length && queue.length < 5; i++) {
            const adapted = adaptContextualWritingItem(batch[i]);
            const targetKey = `${adapted?.targetWord?.hanzi || ''}__${adapted?.hanzi || ''}`;
            if (adapted && adapted.targetWord?.hanzi && !seenTargets.has(targetKey)) {
              seenTargets.add(targetKey);
              queue.push({
                stepId: `ctxw_${adapted.id || i}_${queue.length}`,
                word: adapted.targetWord,
                modality: 'contextual_writing',
                generativeItem: adapted,
                reason: `Context Write • ${adapted.grammarPoint?.title || 'Hanzi in Context'}`
              });
            }
          }
          // Top up to 4-5 items if batch had fewer contiguous targets
          const anchorPool = [...srsDueWords, ...pool];
          for (let attempt = 0; attempt < 16 && queue.length < 4; attempt++) {
            const focusWord = anchorPool.length > 0 ? anchorPool[attempt % anchorPool.length] : null;
            const sent = generateSentenceForWord(focusWord, pool) || generateSentenceForWord(null, pool);
            const adapted = adaptContextualWritingItem(sent);
            const targetKey = `${adapted?.targetWord?.hanzi || ''}__${adapted?.hanzi || ''}`;
            if (adapted && adapted.targetWord?.hanzi && !seenTargets.has(targetKey)) {
              seenTargets.add(targetKey);
              queue.push({
                stepId: `ctxw_top_${queue.length}_${attempt}`,
                word: adapted.targetWord,
                modality: 'contextual_writing',
                generativeItem: adapted,
                reason: `Context Write • ${adapted.grammarPoint?.title || 'Hanzi in Context'}`
              });
            }
          }
        } else if (modeKey === 'grammar_lab') {
          const seenCompleted = new Set<string>();
          // First pull separable verb (离合词) drills when unlocked
          for (let attempt = 0; attempt < 16 && queue.length < 6; attempt++) {
            const rawSep = generateSeparableVerbLabItem(pool);
            const normSep = normalizeGrammarLabItem(rawSep);
            const key = normSep?.completedHanzi || '';
            if (normSep && key && !seenCompleted.has(key)) {
              seenCompleted.add(key);
              queue.push({
                stepId: `glab_sep_${queue.length}_${attempt}`,
                word: normSep.targetWord || pool[queue.length % pool.length] || activeWords[0],
                modality: 'grammar_lab',
                generativeItem: normSep,
                reason: `Grammar Lab • ${normSep.ruleTitle || '离合词'}`
              });
            }
          }
          // Fill remaining slots (up to 6) with aspect & negation particle contrast drills
          const anchorPool = [...srsDueWords, ...pool];
          for (let attempt = 0; attempt < 24 && queue.length < 6; attempt++) {
            const focusWord = anchorPool.length > 0 ? anchorPool[attempt % anchorPool.length] : null;
            const sent = generateSentenceForWord(focusWord, pool) || generateSentenceForWord(null, pool);
            const particleLab = buildParticleContrastLabItem(sent, pool);
            const key = particleLab?.completedHanzi || '';
            if (particleLab && key && !seenCompleted.has(key)) {
              seenCompleted.add(key);
              queue.push({
                stepId: `glab_part_${queue.length}_${attempt}`,
                word: particleLab.targetWord || focusWord || pool[queue.length % pool.length] || activeWords[0],
                modality: 'grammar_lab',
                generativeItem: particleLab,
                reason: `Grammar Lab • ${particleLab.ruleTitle || 'Aspect & Particles'}`
              });
            }
          }
        } else if (modeKey === 'micro_reading') {
          const seenPassages = new Set<string>();
          for (let attempt = 0; attempt < 12 && queue.length < 3; attempt++) {
            const passage = generateMicroReadingPassage(pool);
            const key = passage?.fullHanzi || '';
            if (passage && key && !seenPassages.has(key)) {
              seenPassages.add(key);
              queue.push({
                stepId: `mread_${passage.id || queue.length}_${attempt}`,
                word: passage.protagonist || pool[queue.length % pool.length] || activeWords[0],
                modality: 'micro_reading',
                generativeItem: passage,
                reason: `Micro-Reading • ${passage.title || 'Short Story'}`
              });
            }
          }
        } else if (modeKey === 'confusable_chars') {
          const confusableItems = buildConfusableDrillItems(
            unlockedWords,
            getMasterLexiconMap(),
            8
          );
          confusableItems.slice(0, 8).forEach((item: any, idx: number) => {
            queue.push({
              stepId: `conf_${item.id || idx}_${idx}`,
              word: item.targetWord || pool[idx % pool.length] || activeWords[0],
              modality: 'confusable_chars',
              confusableItem: item,
              reason:
                item.contrastType === 'homophone'
                  ? '同音字 • Homophones'
                  : '形近字 • Visual Twins'
            });
          });
        }
      } catch (err) {
        console.warn('[App] handleLaunchGenerativeDrill failed:', modeKey, err);
      }

      if (queue.length === 0) {
        soundFX.playMistake();
        triggerToast(
          'Not Enough Grammar Variety Yet',
          'Unlock a few more words to build a full generative drill session.'
        );
        return;
      }

      soundFX.playPop();
      setActiveModal({
        type: 'mixed_session',
        stageId: null,
        sessionConfig: {
          title: modeMeta.label,
          badgeText:
            modeKey === 'confusable_chars'
              ? 'Visual & Homophone Contrast'
              : srsDueWords.length > 0
              ? 'SRS-Weighted Lab'
              : 'Generative Grammar Lab',
          xpReward: 30,
          queue
        }
      });
    },
    [
      generativeReadiness,
      corpusStats,
      unlockedWords,
      enrichedUnlockedWords,
      progress?.mastery,
      progress?.srsData,
      allUniqueWordsArray,
      activeWords,
      triggerToast
    ]
  );

  const handleLaunchLeechRemediationSession = useCallback(
    (leechPool: any[]) => {
      const safeLeeches = Array.isArray(leechPool) ? leechPool.filter(Boolean) : [];
      if (safeLeeches.length === 0) {
        triggerToast('Memory Stable!', 'No leech words currently need remediation.');
        return;
      }
      soundFX.playPop();
      const openClozeUnlocked = Boolean(generativeReadiness?.open_cloze?.unlocked);
      const activeModes = [
        'listening',
        'reverse_meaning_mc',
        'cloze',
        'writing',
        ...(openClozeUnlocked ? ['open_cloze'] : [])
      ];

      const openClozeByHanzi: Record<string, any> = {};
      if (openClozeUnlocked && enrichedUnlockedWords.length > 0) {
        try {
          const enrichedLeeches = safeLeeches.map((w: any) =>
            enrichWordEntry(
              w,
              progress.wordLinguisticOverrides,
              progress.wordPriorityOverrides
            )
          );
          const batch = generateGenerativeBatch(enrichedUnlockedWords, {
            count: Math.min(8, Math.max(4, safeLeeches.length * 2)),
            focusWords: enrichedLeeches,
            mode: 'open_cloze'
          });
          (Array.isArray(batch) ? batch : []).forEach((item: any) => {
            const targetH = item?.targetWord?.hanzi;
            if (targetH && !openClozeByHanzi[targetH]) {
              openClozeByHanzi[targetH] = item;
            }
          });
          enrichedLeeches.forEach((lw: any) => {
            if (lw?.hanzi && !openClozeByHanzi[lw.hanzi]) {
              const single = generateSentenceForWord(enrichedUnlockedWords, lw);
              if (single && single.targetWord?.hanzi) {
                openClozeByHanzi[lw.hanzi] = single;
              }
            }
          });
        } catch {
          // Gracefully fall back to standard high-retention modalities
        }
      }

      const targetSteps = Math.min(10, Math.max(safeLeeches.length * 2, 4));
      const queue: any[] = [];
      for (let i = 0; i < targetSteps; i++) {
        const targetWord = safeLeeches[i % safeLeeches.length];
        const preferredMode = activeModes[i % activeModes.length];
        const genItem =
          preferredMode === 'open_cloze' ? openClozeByHanzi[targetWord.hanzi] || null : null;
        const finalModality =
          preferredMode === 'open_cloze' && !genItem ? 'cloze' : preferredMode;
        const meta = (MODALITY_META as any)[finalModality] || {
          shortLabel: finalModality
        };
        queue.push({
          stepId: `leech_${targetWord.hanzi || targetWord.id}_${finalModality}_${i}`,
          word: targetWord,
          modality: finalModality,
          ...(genItem ? { generativeItem: genItem } : {}),
          reason: `Leech Attack • ${meta.shortLabel}`
        });
      }

      setActiveModal({
        type: 'mixed_session',
        stageId: null,
        sessionConfig: {
          title: 'Leech Remediation • 难点攻坚',
          badgeText: `${safeLeeches.length} Stubborn Word${
            safeLeeches.length === 1 ? '' : 's'
          }`,
          xpReward: 35,
          queue
        }
      });
    },
    [
      generativeReadiness,
      enrichedUnlockedWords,
      progress.wordLinguisticOverrides,
      progress.wordPriorityOverrides,
      triggerToast
    ]
  );

  const studyModesHubProps = useMemo(
    () => ({
      unlockedWordsCount,
      srsDueCount,
      leechCount: leechWordsList.length,
      generativeReadiness,
      corpusStats,
      confusableCount: confusableReadyCount,
      onNavigateTab: (tabId: string) => setActiveTab(tabId),
      onLaunchSmartReview: () => {
        const discoveredPool = rankWeakestDiscoveredWords(enrichedUnlockedWords, progress);
        if (discoveredPool.length < 1) {
          soundFX.playMistake();
          triggerToast(
            'Weakest Word Review Locked',
            'Complete a lesson on the Map to unlock Weakest Word Review'
          );
          setActiveTab('practice');
          return;
        }
        const queue = buildDynamicModalityQueue(
          discoveredPool.slice(0, 8),
          ['recognition', 'writing', 'listening', 'speaking'],
          'Weakest Word Review',
          activeLessonIndex,
          [],
          0,
          enrichedUnlockedWords,
          generativeReadiness
        );
        setActiveModal({
          type: 'mixed_session',
          stageId: null,
          sessionConfig: {
            title: 'Weakest Word Review',
            badgeText: srsDueCount > 0 ? `${srsDueCount} SRS Due` : 'Discovered Weakest',
            xpReward: 25,
            queue
          }
        });
      },
      onLaunchLeechRemediation: () => handleLaunchLeechRemediationSession(leechWordsList),
      onOpenShadowing: () => setIsShadowingOpen(true),
      onLaunchBlitz: () => {
        const pool = unlockedWords.length > 0 ? unlockedWords : activeWords;
        setActiveModal({
          type: 'blitz_match',
          words: pool
        });
      },
      onLaunchGenerativeMode: (modeKey: string) => handleLaunchGenerativeDrill(modeKey),
      onLaunchConfusable: () => handleLaunchGenerativeDrill('confusable_chars'),
      onOpenLibrarySection: (targetKey: string) => {
        if (targetKey === 'corpus') {
          setLibraryNavTarget({ section: 'decks', studioToolMode: 'none', referenceTab: 'corpus' });
        } else {
          setLibraryNavTarget({ section: targetKey });
        }
        setActiveTab('library');
      }
    }),
    [
      unlockedWordsCount,
      srsDueCount,
      leechWordsList,
      generativeReadiness,
      corpusStats,
      confusableReadyCount,
      unlockedWords,
      activeWords,
      activeLessonIndex,
      enrichedUnlockedWords,
      progress,
      triggerToast,
      handleLaunchLeechRemediationSession,
      handleLaunchGenerativeDrill
    ]
  );

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

          {/* Study Modes Directory Quick Launcher Bar */}
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              setIsModesGuideOpen(true);
            }}
            className="w-full cursor-pointer rounded-[2px] px-2.5 py-1.5 border-2 bg-slate-950 hover:bg-slate-900 border-slate-700 hover:border-amber-400/70 flex items-center justify-between gap-2.5 transition-all"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 truncate">
                Modes Guide
              </span>
              <span className="text-[10px] font-bold text-slate-400 truncate hidden sm:inline">
                • All Study Tools
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {srsDueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 border border-amber-400/50 text-[9px] font-black text-amber-300">
                  {srsDueCount} Due
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-900 border border-slate-700 text-[9px] font-bold text-slate-300">
                {unlockedWordsCount} Words
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-300" />
            </div>
          </button>
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
              onSelectCourseAndLesson={(courseId: string, lessonId: string | null) => {
                setActiveCourseId(courseId);
                const foundCourse = sortCourseLessonsNumerically(
                  courses.find((c: any) => c.id === courseId)
                );
                const targetLessonId =
                  lessonId || foundCourse?.lessons?.[0]?.id || activeLessonId;
                setActiveLessonId(targetLessonId);
              }}
              speakMandarin={speakMandarin}
              onSelectStageNode={handleSelectStageNode}
              onOpenLibraryImporter={() => setActiveTab('library')}
              onOpenModesGuide={() => setIsModesGuideOpen(true)}
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
              enrichedUnlockedWords={enrichedUnlockedWords}
              generativeReadiness={generativeReadiness}
              corpusStats={corpusStats}
              linguisticDataStatus={linguisticDataStatus}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              onOpenShadowing={() => {
                soundFX.playPop();
                setIsShadowingOpen(true);
              }}
              onLaunchGenerativeDrill={handleLaunchGenerativeDrill}
              onLaunchSmartReviewSession={(queue: any, filterLabel: string) => {
                const safeQueue = Array.isArray(queue)
                  ? queue.filter((step: any) => step?.word && isWordDiscovered(step.word, progress))
                  : [];
                if (safeQueue.length < 1) {
                  soundFX.playMistake();
                  triggerToast(
                    'Weakest Word Review Locked',
                    'Complete a lesson on the Map to unlock Weakest Word Review'
                  );
                  return;
                }
                soundFX.playPop();
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  sessionConfig: {
                    title: 'Smart Review Arena',
                    badgeText: filterLabel,
                    xpReward: 25,
                    queue: safeQueue
                  }
                });
              }}
              onLaunchLeechRemediation={handleLaunchLeechRemediationSession}
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
                  words: Array.isArray(pool) && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchHskMockExam={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'hsk_mock_exam',
                  words: Array.isArray(pool) && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchBlitzMatch={(pool: any) => {
                soundFX.playPop();
                setActiveModal({
                  type: 'blitz_match',
                  words: pool && pool.length > 0 ? pool : activeWords
                });
              }}
              onLaunchActivity={(activityType: string) => {
                soundFX.playPop();
                if (activityType === 'writing') {
                  setActiveModal({
                    type: 'writing',
                    stageId: null,
                    words: activeWords
                  });
                } else if (activityType === 'dictation_only') {
                  setActiveModal({
                    type: 'audio_speech',
                    stageId: null,
                    words: activeWords,
                    focusMode: 'dictation'
                  });
                } else if (activityType === 'speaking_only') {
                  setActiveModal({
                    type: 'audio_speech',
                    stageId: null,
                    words: activeWords,
                    focusMode: 'speaking'
                  });
                } else {
                  setActiveModal({
                    type: 'flashcards',
                    stageId: null,
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
              unlockedWords={unlockedWords}
              allUniqueWordsArray={allUniqueWordsArray}
              initialLibraryTarget={libraryNavTarget}
              onConsumeLibraryTarget={() => setLibraryNavTarget(null)}
              linguisticDataStatus={linguisticDataStatus}
              isSyncingData={isSyncingData}
              onSyncLinguisticData={handleSyncLinguisticData}
              onSaveWordLinguisticOverride={handleSaveWordLinguisticOverride}
              onCycleWordPriority={handleCycleWordPriority}
              isSlowMode={progress.isSlowMode}
              onSetSlowMode={handleSetSlowMode}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              onOpenShadowing={() => {
                soundFX.playPop();
                setIsShadowingOpen(true);
              }}
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
                setCourses((prev: any[]) => sortCoursesCanonically([...prev, newCourse]));
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
                    srsData: progress.srsData || {},
                    wordLinguisticOverrides: progress.wordLinguisticOverrides || {},
                    wordPriorityOverrides: progress.wordPriorityOverrides || {}
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
                if (parsedBackup.progress && typeof parsedBackup.progress === 'object') {
                  const {
                    dailyQuests: _legacyDq,
                    achievements: _legacyAch,
                    unlockedAchievements: _legacyUnlockedAch,
                    ...cleanBackupProgress
                  } = parsedBackup.progress;
                  setProgress((prev: any) => ({
                    ...prev,
                    ...cleanBackupProgress,
                    wordLinguisticOverrides:
                      parsedBackup.progress.wordLinguisticOverrides &&
                      typeof parsedBackup.progress.wordLinguisticOverrides === 'object'
                        ? { ...parsedBackup.progress.wordLinguisticOverrides }
                        : prev.wordLinguisticOverrides || {},
                    wordPriorityOverrides:
                      parsedBackup.progress.wordPriorityOverrides &&
                      typeof parsedBackup.progress.wordPriorityOverrides === 'object'
                        ? { ...parsedBackup.progress.wordPriorityOverrides }
                        : prev.wordPriorityOverrides || {},
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
                  setCourses(sortCoursesCanonically(parsedBackup.courses));
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
              studyModesHubProps={studyModesHubProps}
              linguisticDataStatus={linguisticDataStatus}
              isSyncingData={isSyncingData}
              onSyncLinguisticData={handleSyncLinguisticData}
              defaultDataBaseUrl={DEFAULT_REMOTE_DATA_BASE_URL}
              getDataBaseUrl={getDataBaseUrl}
              onToggleSpeed={handleToggleSpeed}
              speakMandarin={speakMandarin}
              onExportAllData={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  progress: {
                    ...progress,
                    srsData: progress.srsData || {},
                    wordLinguisticOverrides: progress.wordLinguisticOverrides || {},
                    wordPriorityOverrides: progress.wordPriorityOverrides || {}
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
                if (parsedBackup?.progress && typeof parsedBackup.progress === 'object') {
                  const {
                    dailyQuests: _legacyDq,
                    achievements: _legacyAch,
                    unlockedAchievements: _legacyUnlockedAch,
                    ...cleanBackupProgress
                  } = parsedBackup.progress;
                  setProgress((prev: any) => ({
                    ...prev,
                    ...cleanBackupProgress,
                    wordLinguisticOverrides:
                      parsedBackup.progress.wordLinguisticOverrides &&
                      typeof parsedBackup.progress.wordLinguisticOverrides === 'object'
                        ? { ...parsedBackup.progress.wordLinguisticOverrides }
                        : prev.wordLinguisticOverrides || {},
                    wordPriorityOverrides:
                      parsedBackup.progress.wordPriorityOverrides &&
                      typeof parsedBackup.progress.wordPriorityOverrides === 'object'
                        ? { ...parsedBackup.progress.wordPriorityOverrides }
                        : prev.wordPriorityOverrides || {},
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
                  setCourses(sortCoursesCanonically(parsedBackup.courses));
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
                  wordNotes: {},
                  wordLinguisticOverrides: {},
                  wordPriorityOverrides: {},
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
                const rawCandidates = Array.isArray(weakPool) ? weakPool : [];
                const enrichedCandidates = rawCandidates.map((w: any) =>
                  enrichWordEntry(
                    w,
                    progress.wordLinguisticOverrides,
                    progress.wordPriorityOverrides
                  )
                );
                const discoveredWeakWords = rankWeakestDiscoveredWords(
                  enrichedCandidates,
                  progress
                );
                if (discoveredWeakWords.length < 1) {
                  soundFX.playMistake();
                  triggerToast(
                    'Weakest Word Review Locked',
                    'Complete a lesson on the Map to unlock Weakest Word Review'
                  );
                  return;
                }
                const weakModalities =
                  unlockedWordsCount >= 12
                    ? ['recognition', 'writing', 'listening', 'sentence_builder']
                    : ['recognition', 'writing', 'listening'];
                const queue = buildDynamicModalityQueue(
                  discoveredWeakWords.slice(0, 10),
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
                    badgeText: `Discovered Weakest (${discoveredWeakWords.length})`,
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
                completedModeKeys: ['flashcards']
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
                completedModeKeys: ['writing']
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
                focusMode === 'speaking' || focusMode === 'combined' ? 'speaking' : null
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
                completedModeKeys: ['boss']
              });
            }}
          />
        )}

        {activeModal?.type === 'mixed_session' && (
          <AdaptiveMixedSessionModal
            sessionConfig={activeModal.sessionConfig}
            courseWords={allUniqueWordsArray}
            enrichedUnlockedWords={enrichedUnlockedWords}
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
                completedModeKeys: modalitiesInQueue.filter(Boolean)
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
                completedModeKeys: ['blitz_match']
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
                completedModeKeys: ['tone_sandhi_drill']
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
                completedModeKeys: ['hsk_mock_exam']
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
                completedModeKeys: ['numbers_time_lab']
              })
            }
          />
        )}

        {isModesGuideOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
            onClick={() => setIsModesGuideOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[86vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-amber-500/70 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <StudyModesHub
                {...studyModesHubProps}
                isModal={true}
                onClose={() => setIsModesGuideOpen(false)}
              />
            </div>
          </div>
        )}

        <ShadowingAudioModal
          isOpen={isShadowingOpen}
          onClose={() => setIsShadowingOpen(false)}
          enrichedUnlockedWords={enrichedUnlockedWords}
          activeLessonWords={activeWords}
          srsSchedule={progress.srsData || (progress as any).srsSchedule || {}}
          speechRate={NORMAL_SPEECH_RATE}
          selectedVoiceURI={getGlobalPreferredVoiceURI()}
        />
      </div>
    </div>
  );
}
