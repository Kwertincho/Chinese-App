import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  Repeat,
  MessageSquare,
  Volume2,
  Sun,
  EyeOff,
  Eye
} from 'lucide-react';
import {
  soundFX,
  resolveMandarinVoice,
  getGlobalPreferredVoiceURI
} from '../audio/soundEngine.js';
import {
  normalizeWordEntry,
  useSessionTimer,
  isWordSrsDue,
  isWordDiscovered,
  getWordMasteryLevel
} from '../utils/mandarinHelpers.js';

const DECK_FILTERS = [
  { id: 'core', label: 'Core Priority' },
  { id: 'srs_due', label: 'SRS Due' },
  { id: 'lesson', label: 'Current Lesson' },
  { id: 'all', label: 'All Unlocked' }
];

const PAUSE_OPTIONS = [
  { ms: 1500, label: '1.5s' },
  { ms: 2500, label: '2.5s' },
  { ms: 4000, label: '4.0s' }
];

const PHASES = [
  { id: 'english_cue', label: 'English Cue' },
  { id: 'recall_pause', label: 'Recall Pause' },
  { id: 'mandarin_normal', label: 'Mandarin 1.0x' },
  { id: 'mandarin_slow', label: 'Slow 0.65x' }
];

export function extractCleanChineseExample(word) {
  if (!word) return '';
  const targetHanzi = String(word.hanzi || '').trim();
  const direct = String(word.exampleHanzi || '').trim();
  if (direct && /[\u4e00-\u9fff]/.test(direct)) {
    const cleanedDirect = direct.replace(/\s+/g, '');
    if (cleanedDirect !== targetHanzi) {
      return cleanedDirect;
    }
  }
  const raw = String(word.example || '').trim();
  if (!raw) return '';
  // Strip trailing English translation after em-dash, hyphen, pipe, or parens
  const beforeDash = raw.split(/\s*[—–|]\s*|\s+-\s+/)[0] || '';
  const cleaned = beforeDash
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\u4e00-\u9fff0-9，。？！、；：“”‘’《》]/g, '')
    .trim();
  const cjkCount = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjkCount < 2) return '';
  if (cleaned === String(word.hanzi || '').trim()) return '';
  return cleaned;
}

function buildSpokenEnglishCue(word) {
  const raw = String(word?.meaning || word?.english || '').trim();
  if (!raw) return '';
  // Take up to first 2 concise glosses separated by / or ;
  const parts = raw
    .split(/[;/]/)
    .map((s) => s.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(', ') || raw;
}

function pickEnglishVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (voices.length === 0) return null;
  const enUs = voices.filter((v) => {
    const lang = String(v?.lang || '').toLowerCase().replace('_', '-');
    return lang === 'en-us' || lang.startsWith('en-us');
  });
  const pool = enUs.length > 0 ? enUs : voices.filter((v) => String(v?.lang || '').toLowerCase().startsWith('en'));
  if (pool.length === 0) return null;
  const preferred = pool.find((v) => {
    const n = String(v?.name || '').toLowerCase();
    return n.includes('google') || n.includes('natural') || n.includes('samantha') || n.includes('neural');
  });
  return preferred || pool[0];
}

function isStrictMandarinVoice(voice) {
  if (!voice) return false;
  const lang = String(voice.lang || '').toLowerCase().replace('_', '-');
  const name = String(voice.name || '').toLowerCase();
  if (
    lang.startsWith('zh-hk') ||
    lang.startsWith('yue') ||
    lang.includes('-hk') ||
    name.includes('cantonese') ||
    name.includes('粵語') ||
    name.includes('粤语') ||
    name.includes('香港') ||
    name.includes('hong kong')
  ) {
    return false;
  }
  return lang.startsWith('zh-cn') || lang.startsWith('zh-tw') || lang.startsWith('cmn') || lang === 'zh';
}

function resolveStrictMandarinLang(voice) {
  const lang = String(voice?.lang || '').toLowerCase().replace('_', '-');
  if (lang.startsWith('zh-tw')) return 'zh-TW';
  return 'zh-CN';
}

export function ShadowingAudioModal({
  isOpen,
  onClose,
  enrichedUnlockedWords,
  activeLessonWords,
  srsSchedule,
  progress = null,
  speechRate = 1.0,
  selectedVoiceURI = '',
  onRecordStudySeconds
}) {
  const safeUnlockedWords = Array.isArray(enrichedUnlockedWords) ? enrichedUnlockedWords : [];
  const safeLessonWords = Array.isArray(activeLessonWords) ? activeLessonWords : [];
  const safeSrsSchedule = srsSchedule && typeof srsSchedule === 'object' ? srsSchedule : {};
  const [deckFilter, setDeckFilter] = useState('core');
  const [recallPauseMs, setRecallPauseMs] = useState(2500);
  const [includeExample, setIncludeExample] = useState(true);
  const [loopPlaylist, setLoopPlaylist] = useState(true);
  const [blindRecall, setBlindRecall] = useState(true);
  const [openedAtMs, setOpenedAtMs] = useState(() => Date.now());

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePhase, setActivePhase] = useState('idle');
  const [pauseProgress, setPauseProgress] = useState(0);
  const [pauseRemainingSec, setPauseRemainingSec] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [ttsWarning, setTtsWarning] = useState('');

  useSessionTimer(Boolean(isOpen && isPlaying), onRecordStudySeconds);

  const cycleRunIdRef = useRef(0);
  const activeTimersRef = useRef([]);
  const activeIntervalRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Live setting refs so toggling recall pause, example sentence, or loop mid-card never cuts off active TTS
  const recallPauseMsRef = useRef(recallPauseMs);
  recallPauseMsRef.current = recallPauseMs;
  const includeExampleRef = useRef(includeExample);
  includeExampleRef.current = includeExample;
  const loopPlaylistRef = useRef(loopPlaylist);
  loopPlaylistRef.current = loopPlaylist;

  const clearTimersAndSpeech = useCallback(() => {
    cycleRunIdRef.current += 1;
    activeTimersRef.current.forEach((id) => clearTimeout(id));
    activeTimersRef.current = [];
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }
    activeUtteranceRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    setPauseProgress(0);
    setPauseRemainingSec(0);
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors
      }
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) return;
    try {
      if (wakeLockRef.current) return;
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        }
      });
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  // Build lookup map of enriched words by Hanzi so lesson words also inherit priorityWeight
  const enrichedByHanzi = useMemo(() => {
    const map = new Map();
    safeUnlockedWords.forEach((w, idx) => {
      if (!w?.hanzi) return;
      const norm = normalizeWordEntry(w, idx);
      map.set(norm.hanzi, {
        ...norm,
        priorityTier: w.priorityTier || 'standard',
        priorityWeight: typeof w.priorityWeight === 'number' ? w.priorityWeight : 1.0
      });
    });
    return map;
  }, [safeUnlockedWords]);

  const deckLists = useMemo(() => {
    const allList = Array.from(enrichedByHanzi.values());
    const effectiveProgress =
      progress && typeof progress === 'object'
        ? progress
        : { srsData: safeSrsSchedule, mastery: {} };
    const masteryMap = effectiveProgress.mastery || {};

    const sortByPriorityDesc = (arr) =>
      [...arr].sort((a, b) => {
        const weightDiff = (b.priorityWeight ?? 1.0) - (a.priorityWeight ?? 1.0);
        if (Math.abs(weightDiff) > 0.001) return weightDiff;
        return 0;
      });

    const coreList = sortByPriorityDesc(
      allList.filter((w) => w.priorityTier === 'core' || (w.priorityWeight ?? 1.0) >= 1.2)
    );

    const srsDueList = sortByPriorityDesc(
      allList.filter((w) => {
        if (!isWordDiscovered(w, effectiveProgress)) return false;
        const lv = getWordMasteryLevel(masteryMap, w);
        return isWordSrsDue(safeSrsSchedule, w, lv, openedAtMs);
      })
    );

    const lessonList = sortByPriorityDesc(
      safeLessonWords
        .filter((w) => w && w.hanzi)
        .map((w, idx) => {
          const matched = enrichedByHanzi.get(String(w.hanzi).trim());
          if (matched) return matched;
          const norm = normalizeWordEntry(w, idx);
          return {
            ...norm,
            priorityTier: w.priorityTier || 'standard',
            priorityWeight: typeof w.priorityWeight === 'number' ? w.priorityWeight : 1.0
          };
        })
    );

    return {
      core: coreList,
      srs_due: srsDueList,
      lesson: lessonList,
      all: sortByPriorityDesc(allList)
    };
  }, [enrichedByHanzi, safeLessonWords, safeSrsSchedule, progress, openedAtMs]);

  const playlist = deckLists[deckFilter] || [];

  // Refresh SRS timestamp and default to a non-empty deck filter when opening the modal
  useEffect(() => {
    if (!isOpen) return;
    setOpenedAtMs(Date.now());
    setIsPlaying(false);
    setActivePhase('idle');
    setCurrentIndex(0);
    setTtsWarning('');
    if (deckLists.core.length > 0) {
      setDeckFilter('core');
    } else if (deckLists.lesson.length > 0) {
      setDeckFilter('lesson');
    } else {
      setDeckFilter('all');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp index if deck filter changes
  useEffect(() => {
    if (currentIndex >= playlist.length && playlist.length > 0) {
      setCurrentIndex(0);
    }
  }, [playlist.length, currentIndex]);

  // Manage Screen Wake Lock strictly tied to isOpen && isPlaying
  useEffect(() => {
    if (isOpen && isPlaying) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOpen && isPlaying) {
        acquireWakeLock();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isOpen, isPlaying, acquireWakeLock, releaseWakeLock]);

  // Cleanup on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      clearTimersAndSpeech();
      releaseWakeLock();
      setIsPlaying(false);
      setActivePhase('idle');
    }
    return () => {
      clearTimersAndSpeech();
      releaseWakeLock();
    };
  }, [isOpen, clearTimersAndSpeech, releaseWakeLock]);

  const waitCancelable = useCallback((ms, runId) => {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        activeTimersRef.current = activeTimersRef.current.filter((t) => t !== id);
        resolve(cycleRunIdRef.current === runId);
      }, ms);
      activeTimersRef.current.push(id);
    });
  }, []);

  const speakUtteranceCancelable = useCallback(
    ({ text, lang, rate, voice, runId }) => {
      return new Promise((resolve) => {
        if (cycleRunIdRef.current !== runId) {
          resolve(false);
          return;
        }
        const cleanText = String(text || '').trim();
        if (!cleanText || typeof window === 'undefined' || !('speechSynthesis' in window)) {
          if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setTtsWarning('Web Speech API is not supported in this browser.');
          }
          resolve(cycleRunIdRef.current === runId);
          return;
        }

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve(cycleRunIdRef.current === runId);
        };

        try {
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
          }
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(cleanText);
          activeUtteranceRef.current = utterance;
          utterance.lang = lang;
          utterance.rate = rate;
          utterance.pitch = lang.startsWith('zh') ? 1.02 : 1.0;
          if (voice) {
            utterance.voice = voice;
          }

          // Safety watchdog in case a mobile WebView fails to emit onend
          const maxWaitMs = Math.max(4500, Math.min(18000, cleanText.length * 360 + 2500));
          const watchdogId = setTimeout(() => {
            activeTimersRef.current = activeTimersRef.current.filter((t) => t !== watchdogId);
            if (activeUtteranceRef.current === utterance) {
              activeUtteranceRef.current = null;
            }
            finish();
          }, maxWaitMs);
          activeTimersRef.current.push(watchdogId);

          const clearWatchdog = () => {
            clearTimeout(watchdogId);
            activeTimersRef.current = activeTimersRef.current.filter((t) => t !== watchdogId);
          };

          utterance.onend = () => {
            clearWatchdog();
            if (activeUtteranceRef.current === utterance) {
              activeUtteranceRef.current = null;
            }
            finish();
          };
          utterance.onerror = () => {
            clearWatchdog();
            if (activeUtteranceRef.current === utterance) {
              activeUtteranceRef.current = null;
            }
            finish();
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          finish();
        }
      });
    },
    []
  );

  const runRecallCountdown = useCallback((durationMs, runId) => {
    return new Promise((resolve) => {
      if (cycleRunIdRef.current !== runId) {
        resolve(false);
        return;
      }
      const startedAt = Date.now();
      setPauseProgress(0);
      setPauseRemainingSec(durationMs / 1000);

      if (activeIntervalRef.current) {
        clearInterval(activeIntervalRef.current);
      }
      activeIntervalRef.current = setInterval(() => {
        if (cycleRunIdRef.current !== runId) {
          clearInterval(activeIntervalRef.current);
          activeIntervalRef.current = null;
          resolve(false);
          return;
        }
        const elapsed = Date.now() - startedAt;
        const pct = Math.min(100, (elapsed / durationMs) * 100);
        const remaining = Math.max(0, (durationMs - elapsed) / 1000);
        setPauseProgress(pct);
        setPauseRemainingSec(remaining);
        if (elapsed >= durationMs) {
          clearInterval(activeIntervalRef.current);
          activeIntervalRef.current = null;
          setPauseProgress(100);
          setPauseRemainingSec(0);
          resolve(true);
        }
      }, 45);
    });
  }, []);

  // Core Hands-Free Playback Cycle Effect
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    if (playlist.length === 0) {
      setIsPlaying(false);
      setActivePhase('idle');
      return;
    }

    const safeIdx = currentIndex % playlist.length;
    const card = playlist[safeIdx];
    if (!card) return;

    clearTimersAndSpeech();
    const runId = cycleRunIdRef.current;

    const executeCardCycle = async () => {
      const effectiveVoiceURI = selectedVoiceURI || getGlobalPreferredVoiceURI();
      const rawMandarinVoice = resolveMandarinVoice(effectiveVoiceURI);
      const mandarinVoice = isStrictMandarinVoice(rawMandarinVoice) ? rawMandarinVoice : null;
      const mandarinLang = resolveStrictMandarinLang(mandarinVoice);
      const englishVoice = pickEnglishVoice();
      const normalRate =
        typeof speechRate === 'number' && !Number.isNaN(speechRate) && speechRate > 0.7
          ? speechRate
          : 1.0;

      // 1. Speak English Meaning (en-US, rate = 1.0)
      setActivePhase('english_cue');
      const englishCue = buildSpokenEnglishCue(card);
      if (englishCue) {
        const ok1 = await speakUtteranceCancelable({
          text: englishCue,
          lang: 'en-US',
          rate: 1.0,
          voice: englishVoice,
          runId
        });
        if (!ok1 || cycleRunIdRef.current !== runId) return;
      }

      // 2. Silent Recall Countdown (1.5s / 2.5s / 4.0s)
      setActivePhase('recall_pause');
      const ok2 = await runRecallCountdown(recallPauseMsRef.current, runId);
      if (!ok2 || cycleRunIdRef.current !== runId) return;

      // 3. Speak Mandarin Target Word at Normal Speed (speechRate || 1.0)
      setActivePhase('mandarin_normal');
      const ok3 = await speakUtteranceCancelable({
        text: card.hanzi,
        lang: mandarinLang,
        rate: normalRate,
        voice: mandarinVoice,
        runId
      });
      if (!ok3 || cycleRunIdRef.current !== runId) return;

      // 4. Short 700ms gap, then Speak Mandarin Target Word (+ Example if enabled) at Slow Speed (0.65x)
      setActivePhase('mandarin_slow');
      const okGap = await waitCancelable(700, runId);
      if (!okGap || cycleRunIdRef.current !== runId) return;

      const ok4 = await speakUtteranceCancelable({
        text: card.hanzi,
        lang: mandarinLang,
        rate: 0.65,
        voice: mandarinVoice,
        runId
      });
      if (!ok4 || cycleRunIdRef.current !== runId) return;

      const exampleHanzi = includeExampleRef.current ? extractCleanChineseExample(card) : '';
      if (exampleHanzi) {
        const okExGap = await waitCancelable(450, runId);
        if (!okExGap || cycleRunIdRef.current !== runId) return;

        const okEx = await speakUtteranceCancelable({
          text: exampleHanzi,
          lang: mandarinLang,
          rate: 0.65,
          voice: mandarinVoice,
          runId
        });
        if (!okEx || cycleRunIdRef.current !== runId) return;
      }

      // Brief breathing pause before automatically advancing
      const okEndGap = await waitCancelable(650, runId);
      if (!okEndGap || cycleRunIdRef.current !== runId) return;

      if (safeIdx + 1 < playlist.length) {
        setCurrentIndex(safeIdx + 1);
      } else if (loopPlaylistRef.current) {
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
        setActivePhase('idle');
      }
    };

    executeCardCycle();

    return () => {
      clearTimersAndSpeech();
    };
  }, [
    isOpen,
    isPlaying,
    currentIndex,
    playlist,
    speechRate,
    selectedVoiceURI,
    clearTimersAndSpeech,
    speakUtteranceCancelable,
    runRecallCountdown,
    waitCancelable
  ]);

  if (!isOpen) return null;

  const currentCard = playlist[currentIndex] || null;
  const cleanExample = currentCard ? extractCleanChineseExample(currentCard) : '';
  const normalRateLabel =
    typeof speechRate === 'number' && !Number.isNaN(speechRate) && speechRate > 0.7
      ? `${speechRate.toFixed(1)}x`
      : '1.0x';

  const handleTogglePlay = () => {
    if (playlist.length === 0) return;
    if (isPlaying) {
      soundFX.playPop();
      clearTimersAndSpeech();
      setIsPlaying(false);
      setActivePhase('idle');
    } else {
      soundFX.playPop();
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    soundFX.playPop();
    clearTimersAndSpeech();
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    soundFX.playPop();
    clearTimersAndSpeech();
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const handleChangeFilter = (nextFilter) => {
    soundFX.playPop();
    clearTimersAndSpeech();
    setIsPlaying(false);
    setActivePhase('idle');
    setDeckFilter(nextFilter);
    setCurrentIndex(0);
  };

  const handleClose = () => {
    clearTimersAndSpeech();
    releaseWakeLock();
    setIsPlaying(false);
    setActivePhase('idle');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center overflow-y-auto">
      <div className="w-full max-w-md min-h-full flex flex-col justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] gap-3.5">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white leading-tight truncate">
                Hands-Free Audio Shadowing
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-clarity text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  {playlist.length > 0
                    ? `Card ${Math.min(currentIndex + 1, playlist.length)} / ${playlist.length}`
                    : '0 Cards Ready'}
                </span>
                {wakeLockActive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black text-emerald-300 uppercase">
                    <Sun className="w-2.5 h-2.5" />
                    Screen Awake
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Audio Shadowing Mode"
            className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pre-Session & Live Settings Panel */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-3 space-y-3">
          {/* Deck Filter Pills */}
          <div className="space-y-1.5">
            <span className="font-clarity text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Deck Filter (Priority Weighted)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DECK_FILTERS.map((f) => {
                const count = (deckLists[f.id] || []).length;
                const active = deckFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleChangeFilter(f.id)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-black border transition-all flex items-center justify-between gap-1 ${
                      active
                        ? 'bg-indigo-500/25 border-indigo-400 text-white shadow'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        active ? 'bg-indigo-500/40 text-indigo-100' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recall Pause Selector + Toggle Switches */}
          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between gap-2">
              <span className="font-clarity text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Recall Pause
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {PAUSE_OPTIONS.map((opt) => {
                  const active = recallPauseMs === opt.ms;
                  return (
                    <button
                      key={opt.ms}
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setRecallPauseMs(opt.ms);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={blindRecall}
                onClick={() => {
                  soundFX.playPop();
                  setBlindRecall((v) => !v);
                }}
                className={`px-2 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-between gap-1 transition-all ${
                  blindRecall
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  {blindRecall ? (
                    <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">Blind Recall</span>
                </span>
                <span className="text-[9px] font-black uppercase shrink-0">
                  {blindRecall ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={includeExample}
                onClick={() => {
                  soundFX.playPop();
                  setIncludeExample((v) => !v);
                }}
                className={`px-2 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-between gap-1 transition-all ${
                  includeExample
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Example</span>
                </span>
                <span className="text-[9px] font-black uppercase shrink-0">
                  {includeExample ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={loopPlaylist}
                onClick={() => {
                  soundFX.playPop();
                  setLoopPlaylist((v) => !v);
                }}
                className={`px-2 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-between gap-1 transition-all ${
                  loopPlaylist
                    ? 'bg-sky-500/15 border-sky-400/50 text-sky-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  <Repeat className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Loop</span>
                </span>
                <span className="text-[9px] font-black uppercase shrink-0">
                  {loopPlaylist ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Current Card Display + Phase Indicator */}
        <div className="flex-1 flex flex-col justify-center rounded-3xl bg-slate-900/95 border border-slate-700/80 p-5 space-y-4 shadow-2xl">
          {ttsWarning && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-400/50 px-3 py-2 text-xs font-bold text-rose-200 text-center">
              {ttsWarning}
            </div>
          )}

          {currentCard ? (
            <>
              {/* 4-Step Phase Indicator */}
              <div className="grid grid-cols-4 gap-1">
                {PHASES.map((phase) => {
                  const isCurrent = activePhase === phase.id;
                  const labelText =
                    phase.id === 'mandarin_normal' ? `Mandarin ${normalRateLabel}` : phase.label;
                  return (
                    <div
                      key={phase.id}
                      className={`px-1.5 py-1.5 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'bg-indigo-500/25 border-indigo-400 text-white shadow'
                          : 'bg-slate-950/70 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-clarity text-[9px] font-black uppercase leading-tight block">
                        {labelText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recall Pause Countdown Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-indigo-400" />
                    {activePhase === 'english_cue' && 'Listening to English Cue…'}
                    {activePhase === 'recall_pause' && 'Say the Mandarin aloud now!'}
                    {activePhase === 'mandarin_normal' && `Shadowing at ${normalRateLabel}…`}
                    {activePhase === 'mandarin_slow' && 'Shadowing slow at 0.65x…'}
                    {activePhase === 'idle' && 'Paused — Press Play to begin hands-free cycle'}
                  </span>
                  {activePhase === 'recall_pause' && (
                    <span className="text-amber-300 font-black tabular-nums">
                      {pauseRemainingSec.toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      activePhase === 'recall_pause'
                        ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                        : activePhase === 'english_cue'
                        ? 'bg-sky-400 w-1/4'
                        : activePhase === 'mandarin_normal'
                        ? 'bg-emerald-400 w-3/4'
                        : activePhase === 'mandarin_slow'
                        ? 'bg-indigo-400 w-full'
                        : 'bg-slate-700 w-0'
                    }`}
                    style={
                      activePhase === 'recall_pause'
                        ? { width: `${Math.max(4, pauseProgress)}%` }
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Word Showcase (Active-Recall Blind Mode hides Hanzi & Pinyin during English Cue + Recall Pause) */}
              {blindRecall &&
              (activePhase === 'english_cue' || activePhase === 'recall_pause') ? (
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-clarity text-[11px] font-black uppercase tracking-wider">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Blind Recall Active</span>
                  </div>
                  <div className="font-clarity text-xl font-black text-white leading-snug px-2">
                    {currentCard.meaning || currentCard.english}
                  </div>
                  <p className="font-clarity text-sm font-extrabold text-amber-300 animate-pulse">
                    Think &amp; Say in Mandarin...
                  </p>
                </div>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <div className="font-hanzi text-5xl font-black text-white tracking-wide leading-tight">
                    {currentCard.hanzi}
                  </div>
                  <div className="font-pinyin text-lg font-bold text-rose-300">
                    {currentCard.pinyin}
                  </div>
                  <div className="font-clarity text-base font-bold text-slate-200 leading-snug px-2">
                    {currentCard.meaning || currentCard.english}
                  </div>
                  {includeExample && cleanExample && (
                    <div className="mt-2 pt-2.5 border-t border-slate-800/80 space-y-0.5">
                      <span className="font-clarity text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block">
                        Example Sentence (0.65x)
                      </span>
                      <div className="font-hanzi text-base font-bold text-slate-100">
                        {cleanExample}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="font-clarity text-sm font-black text-white">
                No cards in &ldquo;{DECK_FILTERS.find((d) => d.id === deckFilter)?.label}&rdquo; yet
              </p>
              <p className="font-clarity text-xs text-slate-400">
                Switch to &ldquo;Current Lesson&rdquo; or &ldquo;All Unlocked&rdquo; above to start hands-free audio shadowing.
              </p>
            </div>
          )}
        </div>

        {/* Large High-Contrast Hands-Free Transport Controls */}
        <div className="grid grid-cols-3 gap-3 items-stretch">
          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={handlePrev}
            aria-label="Previous word"
            className="game-btn-3d min-h-[72px] rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border-2 border-slate-600 text-white flex flex-col items-center justify-center gap-1 transition-all"
          >
            <SkipBack className="w-6 h-6" />
            <span className="font-clarity text-[11px] font-black uppercase">Previous</span>
          </button>

          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause shadowing' : 'Play shadowing'}
            className={`game-btn-3d min-h-[72px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 shadow-xl ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-7 h-7 fill-current" />
                <span className="font-clarity text-xs font-black uppercase">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-7 h-7 fill-current" />
                <span className="font-clarity text-xs font-black uppercase">Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={playlist.length === 0}
            onClick={handleNext}
            aria-label="Next word"
            className="game-btn-3d min-h-[72px] rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border-2 border-slate-600 text-white flex flex-col items-center justify-center gap-1 transition-all"
          >
            <SkipForward className="w-6 h-6" />
            <span className="font-clarity text-[11px] font-black uppercase">Next</span>
          </button>
        </div>
      </div>
    </div>
  );
}
