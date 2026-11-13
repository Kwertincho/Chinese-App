import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Map,
  Dumbbell,
  BookOpen,
  User,
  Sparkles,
  Turtle
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
  speakMandarinGlobal,
  soundFX
} from './audio/soundEngine.js';
import {
  UNIT_1_WORDS,
  DEFAULT_COURSES,
  DEFAULT_CUSTOM_DECKS,
  HETEROGENEOUS_PATTERNS,
  STORAGE_KEY_PROGRESS,
  STORAGE_KEY_COURSES,
  STORAGE_KEY_DECKS,
  INITIAL_PROGRESS_STATE,
  getPlayerTitle
} from './data/curriculumData.js';
import {
  normalizeWordEntry,
  computeUnlockedWordsPool,
  generateDeterministicDailyQuests,
  buildDynamicModalityQueue,
  getWordMasteryLevel
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
  BlitzMatchModal
} from './components/PracticeAndExamModals.jsx';
import {
  ProgressionMapView,
  SmartReviewArenaView,
  LibraryView,
  ProfileView
} from './components/TabViews.jsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallPrompt.jsx';

export { speakMandarinGlobal };

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'practice' | 'library' | 'profile'

  // Persistent Progress State
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const slow = Boolean(parsed.isSlowMode || parsed.preferredSpeed === SLOW_SPEECH_RATE);
        setGlobalIsSlowMode(slow);
        soundFX.setMuted(Boolean(parsed.soundMuted));
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
          wordNotes: { ...(parsed.wordNotes || {}) },
          mastery: { ...INITIAL_PROGRESS_STATE.mastery, ...(parsed.mastery || {}) },
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

  const [activeCourseId, setActiveCourseId] = useState(DEFAULT_COURSES[0].id);
  const [activeLessonId, setActiveLessonId] = useState(DEFAULT_COURSES[0].lessons[0].id);
  const [patternPreviewOverride, setPatternPreviewOverride] = useState<string | null>(null);

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
        nextSlow ? '0.5x Slow Audio Enabled' : '1.0x Normal Audio Enabled',
        nextSlow
          ? 'Playing Mandarin speech at 0.5x slow speed'
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

  // Resolve Active Course, Active Lesson, and Active Pattern Blueprint
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

  const activeWords = useMemo(() => {
    const raw = activeLesson?.words || UNIT_1_WORDS;
    return raw.map((w: any, idx: number) => normalizeWordEntry(w, idx));
  }, [activeLesson]);

  const activePattern = useMemo(() => {
    if (patternPreviewOverride) {
      const found = HETEROGENEOUS_PATTERNS.find((p) => p.id === patternPreviewOverride);
      if (found) return found;
    }
    return HETEROGENEOUS_PATTERNS[activeLessonIndex % HETEROGENEOUS_PATTERNS.length];
  }, [activeLessonIndex, patternPreviewOverride]);

  const { unlockedWords, unlockedWordsCount } = useMemo(
    () => computeUnlockedWordsPool(courses, activeCourse, activeLesson, progress),
    [courses, activeCourse, activeLesson, progress]
  );

  const todayCalendarDate = new Date().toISOString().slice(0, 10);
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
        claimedIds: Array.isArray(saved.claimedIds) ? saved.claimedIds : []
      };
    }
    return {
      date: todayCalendarDate,
      completedIds: [],
      claimedIds: []
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
                claimedIds: []
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
    const today = new Date().toISOString().slice(0, 10);
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
      const today = new Date().toISOString().slice(0, 10);

      setProgress((prev: any) => {
        const dq =
          prev.dailyQuests?.date === today
            ? prev.dailyQuests
            : { date: today, completedIds: [], claimedIds: [] };

        if ((dq.claimedIds || []).includes(quest.id)) return prev;

        const nextClaimed = [...(dq.claimedIds || []), quest.id];
        const xpGain = Number(quest.xpReward) || 30;
        const nextTotalXp = (prev.xp || 0) + xpGain;
        const prevTodayXp =
          prev.dailyXpDate === today
            ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
            : 0;

        return {
          ...prev,
          xp: nextTotalXp,
          playerLevel: Math.floor(nextTotalXp / 100) + 1,
          dailyXpDate: today,
          dailyXp: prevTodayXp + xpGain,
          dailyXpEarned: prevTodayXp + xpGain,
          dailyQuests: {
            date: today,
            completedIds: dq.completedIds || [],
            claimedIds: nextClaimed
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
            activeLessonIndex
          );
          setActiveModal({
            type: 'mixed_session',
            stageId: null,
            questModeKey: 'smart_review',
            sessionConfig: {
              title: 'Daily Quest • Smart Review',
              badgeText: 'Daily Quest',
              xpReward: 75,
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
              xpReward: 65,
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
              xpReward: 70,
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

        return {
          ...prev,
          mastery: nextMastery,
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
      const today = new Date().toISOString().slice(0, 10);
      const lessonKey = `${activeCourse.id}__${activeLesson.id}`;
      const isDefaultUnit1 =
        activeCourse.id === 'course_default_unit1' && activeLesson.id === 'lesson_unit_1';

      setProgress((prev: any) => {
        const nextMastery = { ...(prev.mastery || {}) };
        const masteryStep = isBossWin ? 2 : 1;
        wordsPracticed.forEach((w: any) => {
          const curLv = getWordMasteryLevel(nextMastery, w);
          const nextLv = Math.max(0, Math.min(10, curLv + masteryStep));
          if (w.id) nextMastery[w.id] = nextLv;
          if (w.hanzi) nextMastery[w.hanzi] = nextLv;
        });

        const prevLessonProg = prev.lessonProgress?.[lessonKey] || {
          unlockedStage: isDefaultUnit1 ? prev.unlockedStage : 1,
          completedStages: isDefaultUnit1 ? prev.completedStages : []
        };

        let nextUnlocked = prevLessonProg.unlockedStage;
        const nextCompleted = [...(prevLessonProg.completedStages || [])];

        if (stageId) {
          if (!nextCompleted.includes(stageId)) {
            nextCompleted.push(stageId);
          }
          if (stageId >= nextUnlocked && stageId < 4) {
            nextUnlocked = stageId + 1;
          }
        }

        const isNewDay = prev.lastStudyDate !== today;
        const nextStreak = isNewDay ? (prev.streak || 0) + 1 : Math.max(1, prev.streak || 0);
        const prevTodayXp =
          prev.dailyXpDate === today
            ? Number(prev.dailyXpEarned ?? prev.dailyXp ?? 0)
            : 0;
        const nextTotalXp = (prev.xp || 0) + xpEarned;

        const prevDq =
          prev.dailyQuests?.date === today
            ? prev.dailyQuests
            : { date: today, completedIds: [], claimedIds: [] };
        const nextCompletedQuestIds = [...(prevDq.completedIds || [])];

        dailyQuests.forEach((q: any) => {
          if (
            completedModeKeys.includes(q.modeKey) &&
            !nextCompletedQuestIds.includes(q.id)
          ) {
            nextCompletedQuestIds.push(q.id);
          }
        });

        return {
          ...prev,
          xp: nextTotalXp,
          playerLevel: Math.floor(nextTotalXp / 100) + 1,
          dailyXpDate: today,
          dailyXp: prevTodayXp + xpEarned,
          dailyXpEarned: prevTodayXp + xpEarned,
          streak: nextStreak,
          lastStudyDate: today,
          dailyQuests: {
            date: today,
            completedIds: nextCompletedQuestIds,
            claimedIds: prevDq.claimedIds || []
          },
          unlockedStage: isDefaultUnit1 ? nextUnlocked : prev.unlockedStage,
          completedStages: isDefaultUnit1 ? nextCompleted : prev.completedStages,
          lessonProgress: {
            ...(prev.lessonProgress || {}),
            [lessonKey]: {
              unlockedStage: nextUnlocked,
              completedStages: nextCompleted
            }
          },
          mastery: nextMastery,
          stats: {
            ...(prev.stats || {}),
            writingStagesCompleted:
              (prev.stats?.writingStagesCompleted || 0) + (stageId === 2 ? 1 : 0),
            perfectBossWins:
              (prev.stats?.perfectBossWins || 0) + (isBossWin && heartsRemaining === 3 ? 1 : 0),
            highestCombo: Math.max(prev.stats?.highestCombo || 0, maxCombo)
          }
        };
      });

      setActiveModal(null);
      triggerToast(`Stage Complete! +${xpEarned} XP`, 'Character mastery levels updated!');
    },
    [activeCourse.id, activeLesson.id, activeWords, dailyQuests, triggerToast]
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
    if (stage.launchType === 'flashcards') {
      setActiveModal({
        type: 'flashcards',
        stageId: stage.id,
        words: activeWords
      });
    } else if (stage.launchType === 'writing') {
      setActiveModal({
        type: 'writing',
        stageId: stage.id,
        words: activeWords
      });
    } else if (stage.launchType === 'dictation_only') {
      setActiveModal({
        type: 'audio_speech',
        stageId: stage.id,
        words: activeWords,
        focusMode: 'dictation'
      });
    } else if (stage.launchType === 'speaking_only') {
      setActiveModal({
        type: 'audio_speech',
        stageId: stage.id,
        words: activeWords,
        focusMode: 'speaking'
      });
    } else if (stage.launchType === 'boss') {
      setActiveModal({
        type: 'boss',
        stageId: stage.id,
        words: activeWords,
        isPractice: false
      });
    } else {
      const queue = buildDynamicModalityQueue(
        activeWords,
        stage.allowedModalities,
        stage.badgeText,
        activeLessonIndex
      );
      setActiveModal({
        type: 'mixed_session',
        stageId: stage.id,
        sessionConfig: {
          title: stage.title,
          badgeText: stage.badgeText,
          xpReward: stage.xpReward || 70,
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

  const currentLevel = Math.floor(progress.xp / 100) + 1;
  const xpIntoLevel = progress.xp % 100;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyGoalXp = Number(progress.dailyGoalXp) > 0 ? Number(progress.dailyGoalXp) : 30;
  const todayXpEarned = progress.dailyXpDate === todayIso ? Number(progress.dailyXpEarned || 0) : 0;
  const dailyGoalPercent = Math.min(100, Math.round((todayXpEarned / dailyGoalXp) * 100));
  const isDailyGoalMet = todayXpEarned >= dailyGoalXp;

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100 flex justify-center font-sans select-none">
      <div className="w-full max-w-md min-h-dvh bg-slate-900 border-x border-slate-800/80 flex flex-col justify-between pb-24 relative">
        <OfflineIndicator />

        {/* STICKY GAMIFIED 16-BIT PIXEL RPG TOP BAR */}
        <header className="sticky top-0 z-30 bg-slate-900 border-b-2 border-slate-700 px-3.5 py-2.5 space-y-2 shadow-[0_4px_0_#020617]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[2px] bg-amber-400 border-2 border-amber-200 flex items-center justify-center font-pixel-header text-xs text-slate-950 shadow-[0_2px_0_#020617] shrink-0">
                {currentLevel}
              </div>
              <div className="min-w-0">
                <div className="font-pixel-header text-[9px] text-white truncate">
                  Lv.{currentLevel} {getPlayerTitle(currentLevel)}
                </div>
                <div className="w-28 mt-1">
                  <PixelBlockGauge
                    value={xpIntoLevel}
                    max={100}
                    blocks={10}
                    filledClass="bg-amber-400"
                    emptyClass="bg-slate-900"
                    heightClass="h-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <PWAInstallButton />

              {/* Speed Toggle Button (1.0x vs 0.5x) */}
              <button
                type="button"
                onClick={() => handleToggleSpeed(activeWords[0]?.hanzi || '你好')}
                title="Toggle Mandarin Speech Speed (1.0x Normal / 0.5x Slow)"
                className={`game-btn-3d px-2 py-1 rounded-[2px] border-2 text-[10px] font-black flex items-center gap-1 transition-all ${
                  progress.isSlowMode
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                    : 'bg-slate-800 border-slate-600 text-slate-200'
                }`}
              >
                <Turtle className="w-3 h-3" />
                <span>{progress.isSlowMode ? '0.5x' : '1.0x'}</span>
              </button>

              {/* Daily Streak Counter with Pixel Flame Sprite */}
              <div
                title="Daily Streak"
                className="px-2 py-1 rounded-[2px] bg-slate-950 border-2 border-amber-500 text-amber-300 text-xs font-black flex items-center gap-1"
              >
                <PixelFlameSprite active={progress.streak > 0} className="w-3.5 h-3.5" />
                <span className="font-pixel-header text-[10px]">{progress.streak}</span>
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

          {/* Daily XP Goal 12-Block Pixel Gauge Bar */}
          <div
            onClick={() => setActiveTab('profile')}
            className={`cursor-pointer rounded-[2px] px-2.5 py-1.5 border-2 flex items-center justify-between gap-2.5 transition-all ${
              isDailyGoalMet
                ? 'bg-emerald-950/60 border-emerald-400'
                : 'bg-slate-950 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <PixelCoinSprite className="w-3.5 h-3.5" />
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isDailyGoalMet ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {isDailyGoalMet ? 'Daily Goal Met ★' : 'Daily XP Goal'}
              </span>
            </div>

            <div className="flex-1 max-w-[160px]">
              <PixelBlockGauge
                value={todayXpEarned}
                max={dailyGoalXp}
                blocks={12}
                filledClass={isDailyGoalMet ? 'bg-emerald-400' : 'bg-rose-500'}
                emptyClass="bg-slate-900"
                heightClass="h-2"
              />
            </div>

            <span
              className={`font-pixel-header text-[9px] shrink-0 ${
                isDailyGoalMet ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {todayXpEarned}/{dailyGoalXp} XP
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
              activeLessonIndex={activeLessonIndex}
              activePattern={activePattern}
              patternPreviewOverride={patternPreviewOverride}
              onChangePatternOverride={setPatternPreviewOverride}
              activeWords={activeWords}
              dailyQuests={dailyQuests}
              dailyQuestState={dailyQuestState}
              onJumpToQuest={handleJumpToQuest}
              onClaimQuestReward={handleClaimQuestReward}
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
                    xpReward: 75,
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
                    xpReward: 65,
                    queue
                  }
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
                    xpReward: 70,
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
                  progress,
                  courses,
                  customDecks
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `macalaoshi-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
                const today = new Date().toISOString().slice(0, 10);
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
                    playerLevel: Math.floor(nextXp / 100) + 1,
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
              dailyGoalXp={dailyGoalXp}
              todayXpEarned={todayXpEarned}
              onSetDailyGoalXp={handleSetDailyGoalXp}
              onToggleSpeed={handleToggleSpeed}
              onExportAllData={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  progress,
                  courses,
                  customDecks
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `macalaoshi-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                triggerToast('Backup Exported!', 'Downloaded full study backup JSON.');
              }}
              onImportBackupData={(parsedBackup: any) => {
                if (parsedBackup?.progress) {
                  setProgress((prev: any) => ({
                    ...prev,
                    ...parsedBackup.progress,
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
                const todayDate = new Date().toISOString().slice(0, 10);
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
                const queue = buildDynamicModalityQueue(
                  wordsToUse,
                  ['recognition', 'writing', 'listening', 'sentence_builder'],
                  'Weakest Words Booster'
                );
                setActiveModal({
                  type: 'mixed_session',
                  stageId: null,
                  sessionConfig: {
                    title: 'Weakest Words Booster',
                    badgeText: 'Mastery Lv 0–4 Review',
                    xpReward: 70,
                    queue
                  }
                });
              }}
            />
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR (4 TABS: MAP, SMART REVIEW, LIBRARY, PROFILE) WITH ANDROID SAFE-AREA PADDING */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-slate-900 border-t-2 border-slate-700 px-3 pt-2 pb-safe">
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
                xpEarned: 45 + bonusXp,
                maxCombo,
                completedModeKeys: ['flashcards', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'writing' && (
          <WritingStageModal
            words={activeModal.words || activeWords}
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
                xpEarned: 60 + bonusXp,
                maxCombo,
                completedModeKeys: ['writing', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'audio_speech' && (
          <AudioSpeechStageModal
            words={activeModal.words || activeWords}
            progress={progress}
            initialFocusMode={activeModal.focusMode || 'combined'}
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
                xpEarned: 75 + bonusXp,
                maxCombo,
                completedModeKeys: [
                  'dictation',
                  activeModal.focusMode === 'dictation' ? 'dictation' : 'speaking',
                  activeModal.questModeKey
                ].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'boss' && (
          <BossChallengeModal
            words={activeModal.words || activeWords}
            isPracticeMode={Boolean(activeModal.isPractice)}
            isSlowMode={progress.isSlowMode}
            onSetSlowMode={handleSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onRecordSkillEvent={handleRecordSkillEvent}
            onRecordStudySeconds={handleRecordStudySeconds}
            onClose={() => setActiveModal(null)}
            onComplete={(correctWordIds: any, heartsRemaining: number, bonusXp = 0, maxCombo = 1) =>
              handleCompleteStageSession({
                stageId: activeModal.stageId || 4,
                wordsPracticed: activeModal.words || activeWords,
                xpEarned: 100 + bonusXp,
                maxCombo,
                isBossWin: true,
                heartsRemaining,
                completedModeKeys: ['boss', activeModal.questModeKey].filter(Boolean)
              })
            }
          />
        )}

        {activeModal?.type === 'mixed_session' && (
          <AdaptiveMixedSessionModal
            sessionConfig={activeModal.sessionConfig}
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
                xpEarned: (activeModal.sessionConfig?.xpReward || 65) + bonusXp,
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
            onComplete={(matchedWords: any[], scoreXp = 45, maxCombo = 1) =>
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
            onComplete={(practicedWords: any[], totalXp = 60, maxCombo = 1) =>
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
            onComplete={(practicedWords: any[], totalXp = 80, totalCorrect = 12) =>
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
      </div>
    </div>
  );
}
