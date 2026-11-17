import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  CheckCircle2,
  Check,
  X,
  RotateCcw,
  Trophy,
  Eye,
  Play,
  ArrowLeft,
  ChevronRight,
  Flame,
  Clock,
  Headphones,
  Mic,
  SkipForward,
  Sparkles,
  Lock
} from 'lucide-react';
import { soundFX } from '../audio/soundEngine.js';
import {
  UNIT_1_WORDS,
  KNOWN_CHARACTER_INFO,
  WRITING_MASTERY_STAGES,
  MODALITY_META
} from '../data/curriculumData.js';
import {
  normalizeWordEntry,
  validateDictationInput,
  computeSpeechSimilarity,
  buildSentenceBuilderPuzzle,
  buildClozeExerciseData,
  buildToneSandhiOptions,
  buildHskMockExamQuestions,
  getWordMasteryLevel,
  getMasteryTierMeta,
  getAdaptiveWritingConfig,
  useSessionTimer,
  highlightRadicalOutlineStrokes,
  getWritingStageMeta,
  loadHanziWriterScript
} from '../utils/mandarinHelpers.js';
import {
  ChaoToneVisualizer,
  MandarinAudioControls,
  SessionGameTopHud,
  SessionTimerBadge
} from './SharedHudAndAudio.jsx';

export function ClozeExerciseCard({
  word,
  masteryLv = 0,
  lessonPool = UNIT_1_WORDS,
  seed = 0,
  selectedOptionId,
  isCompleted,
  cardAnim = 'idle',
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onSelectOption
}) {
  const [showPinyinHint, setShowPinyinHint] = useState(false);

  useEffect(() => {
    setShowPinyinHint(false);
  }, [word?.hanzi, seed]);

  const clozeData = useMemo(
    () => buildClozeExerciseData(word, lessonPool, seed),
    [word, lessonPool, seed]
  );

  const shouldShowPinyin = masteryLv <= 3 || showPinyinHint || isCompleted;

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border p-4 space-y-3.5 shadow-xl transition-all ${
        cardAnim === 'wrong'
          ? 'border-rose-500 animate-game-shake'
          : cardAnim === 'correct'
          ? 'border-emerald-400 animate-game-green-pulse'
          : 'border-cyan-500/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          Fill-in-the-Blank • <span className="font-hanzi">选词填空</span>
        </span>
        <div className="flex items-center gap-1.5">
          {masteryLv >= 4 && !isCompleted && (
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setShowPinyinHint((prev) => !prev);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-amber-500/40 text-[10px] font-bold text-amber-300 hover:border-amber-400"
            >
              {showPinyinHint ? 'Hide Pinyin' : 'Show Pinyin Hint'}
            </button>
          )}
          <MandarinAudioControls
            text={clozeData.mandarinSentence}
            isSlowMode={isSlowMode}
            onSetSlowMode={onSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            size="sm"
          />
        </div>
      </div>

      {/* Sentence Prompt Card with [ ___ ] Blank */}
      <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-2 text-center">
        <span className="font-clarity text-sm font-bold text-amber-400 block">
          Select the missing Mandarin word for [ ___ ]:
        </span>
        <div className="font-hanzi text-xl font-black text-white tracking-wide leading-relaxed">
          {isCompleted ? clozeData.mandarinSentence : clozeData.blankSentence}
        </div>
        {shouldShowPinyin && (
          <div className="font-pinyin text-rose-300">{clozeData.pinyinSentence}</div>
        )}
        <div className="font-clarity text-[15px] text-slate-200 italic pt-1 border-t border-slate-800/80">
          "{clozeData.englishSentence}"
        </div>
      </div>

      {/* 4 Multiple-Choice Hanzi Options from the Same Lesson */}
      <div className="grid grid-cols-2 gap-2.5">
        {clozeData.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let btnClass =
            'bg-slate-900/90 hover:bg-slate-850 border-slate-700 text-white';

          if (isCompleted && opt.isCorrect) {
            btnClass =
              'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-950/50';
          } else if (isSelected && !opt.isCorrect) {
            btnClass = 'bg-rose-500/25 border-rose-500 text-rose-200';
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isCompleted}
              onClick={() => onSelectOption(opt, clozeData)}
              className={`game-btn-3d font-clarity p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${btnClass}`}
            >
              <span className="font-hanzi text-xl font-black">{opt.hanzi}</span>
              {shouldShowPinyin && (
                <span className="font-clarity text-[16px] font-extrabold text-rose-300 mt-0.5">
                  {opt.pinyin}
                </span>
              )}
              {isCompleted && (
                <span className="font-clarity text-xs text-slate-200 mt-0.5 truncate max-w-full">
                  {opt.meaning}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isCompleted && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center justify-between gap-2 border ${
            clozeData.options.find((o) => o.id === selectedOptionId)?.isCorrect
              ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
              : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
          }`}
        >
          <div>
            <p className="font-black">
              {clozeData.options.find((o) => o.id === selectedOptionId)?.isCorrect
                ? `✓ Correct! ${clozeData.targetWord.hanzi} (${clozeData.targetWord.pinyin})`
                : `✗ Incorrect — Correct answer: ${clozeData.targetWord.hanzi} (${clozeData.targetWord.pinyin})`}
            </p>
            <p className="font-hanzi text-[11px] opacity-90 mt-0.5">
              {clozeData.mandarinSentence} — "{clozeData.englishSentence}"
            </p>
          </div>
          {clozeData.options.find((o) => o.id === selectedOptionId)?.isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-5 h-5 text-rose-400 shrink-0" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TONE & SANDHI EAR DRILL MODAL (声调辨析)
// ============================================================================
export function ToneSandhiDrillModal({
  words = UNIT_1_WORDS,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onRecordSkillEvent,
  onRecordStudySeconds,
  onClose,
  onComplete
}) {
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(true, onRecordStudySeconds);
  const drillQueue = useMemo(() => {
    const base = Array.isArray(words) && words.length > 0 ? words : UNIT_1_WORDS;
    const expanded = [];
    const targetLen = Math.max(base.length, 6);
    for (let i = 0; i < targetLen; i++) {
      expanded.push(normalizeWordEntry(base[i % base.length], i));
    }
    return expanded;
  }, [words]);

  const [stepIdx, setStepIdx] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [cardAnim, setCardAnim] = useState('idle');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [xpPopupAmount, setXpPopupAmount] = useState(5);

  const feedbackTimerRef = useRef(null);
  const currentWord = drillQueue[stepIdx] || drillQueue[0];
  const drillData = useMemo(
    () => buildToneSandhiOptions(currentWord, stepIdx),
    [currentWord, stepIdx]
  );

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearFeedbackTimer();
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setWasCorrect(false);
    setCardAnim('idle');
    speakMandarin(currentWord.hanzi);
    return () => clearFeedbackTimer();
  }, [stepIdx, currentWord.hanzi, speakMandarin, clearFeedbackTimer]);

  const handleCloseModal = () => {
    clearFeedbackTimer();
    flushSessionTime();
    onClose();
  };

  const handleSelectToneChoice = (choice) => {
    if (isAnswered) return;
    clearFeedbackTimer();
    setSelectedChoiceId(choice.id);
    setIsAnswered(true);

    let nextBonusXp = bonusXp;
    let nextMaxCombo = maxCombo;

    if (choice.isCorrect) {
      setWasCorrect(true);
      setCardAnim('correct');
      setTimeout(() => setCardAnim('idle'), 500);
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 0, completionsDelta: 1 });

      const nextCombo = combo + 1;
      nextMaxCombo = Math.max(maxCombo, nextCombo);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      soundFX.playCorrect(nextCombo);
      const comboBonus = nextCombo >= 2 ? Math.min(3, nextCombo - 1) : 0;
      const earned = 5 + comboBonus;
      nextBonusXp = bonusXp + earned;
      setBonusXp(nextBonusXp);
      setXpPopupAmount(earned);
      setXpPopupKey((k) => k + 1);
      speakMandarin(currentWord.hanzi);
    } else {
      setWasCorrect(false);
      soundFX.playMistake();
      setCombo(0);
      setCardAnim('wrong');
      setTimeout(() => setCardAnim('idle'), 450);
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 1, completionsDelta: 0 });
    }

    const delayMs = choice.isCorrect ? 1400 : 1800;
    feedbackTimerRef.current = setTimeout(() => {
      if (stepIdx < drillQueue.length - 1) {
        setStepIdx((prev) => prev + 1);
      } else {
        flushSessionTime();
        onComplete(drillQueue, 25 + nextBonusXp, nextMaxCombo);
      }
    }, delayMs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center">
      <div className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto">
        <SessionGameTopHud
          title="Tone & Sandhi Ear Drill • 声调辨析"
          subtitle={`Item ${stepIdx + 1} of ${drillQueue.length} • Listen & Identify Tones`}
          totalSegments={drillQueue.length}
          completedSegments={stepIdx + (isAnswered ? 1 : 0)}
          combo={combo}
          sessionSeconds={elapsedSeconds}
          xpPopupKey={xpPopupKey}
          xpPopupAmount={xpPopupAmount}
          onClose={handleCloseModal}
        />

        <div className="my-auto space-y-4 py-3">
          <div
            className={`rounded-3xl bg-slate-800/90 border p-5 text-center space-y-3 shadow-xl transition-all ${
              cardAnim === 'wrong'
                ? 'border-rose-500 animate-game-shake'
                : cardAnim === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : 'border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                <span>Pinyin Hidden • Ear Check</span>
              </span>
              <MandarinAudioControls
                text={currentWord.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
              />
            </div>

            <div className="py-2 space-y-1.5">
              <div className="font-hanzi text-5xl font-black text-white tracking-wider">
                {currentWord.hanzi}
              </div>
              <div className="font-clarity text-[15px] font-bold text-slate-300">
                Meaning: <span className="text-emerald-300">{currentWord.meaning || currentWord.english}</span>
              </div>

              {isAnswered ? (
                <div className="pt-2 space-y-1.5">
                  <div className="font-pinyin text-rose-400">
                    {currentWord.pinyin}{' '}
                    <span className="text-sm text-slate-400">({currentWord.pinyinNum})</span>
                  </div>
                  <ChaoToneVisualizer
                    pinyin={currentWord.pinyin}
                    hanzi={currentWord.hanzi}
                    compact
                  />
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-clarity text-sm font-bold text-amber-300 mt-1">
                  <span>🔊 Listen carefully and choose the spoken tone pattern</span>
                </div>
              )}
            </div>
          </div>

          {/* 4 Tone Pattern Choices derived from pinyinNum & Sandhi Rules */}
          <div className="space-y-2">
            <span className="font-clarity text-sm font-bold text-slate-300 block">
              Select the correct Tone & Sandhi pattern:
            </span>
            {drillData.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;
              let btnStyle =
                'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100';
              if (isAnswered && choice.isCorrect) {
                btnStyle =
                  'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black';
              } else if (isAnswered && isSelected && !choice.isCorrect) {
                btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
              }

              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectToneChoice(choice)}
                  className={`game-btn-3d font-clarity w-full p-3.5 rounded-2xl border text-left text-[15px] font-bold flex items-center justify-between transition-all ${btnStyle}`}
                >
                  <span className="font-clarity">{choice.label}</span>
                  {isAnswered && choice.isCorrect && (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !choice.isCorrect && (
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              className={`rounded-2xl p-3 text-xs space-y-1 border ${
                wasCorrect
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black">
                  {wasCorrect
                    ? `✓ Correct! ${drillData.correctPattern.label}`
                    : `✗ Incorrect — Correct answer: ${drillData.correctPattern.label}`}
                </span>
                {drillData.correctPattern.isSandhi && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    ⚡ Sandhi Active
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90">{drillData.correctPattern.detailNote}</p>
            </div>
          )}
        </div>

        <div className="pt-1 text-center text-[11px] font-bold text-slate-400">
          {isAnswered
            ? 'Auto-advancing to next item...'
            : 'Tap a tone pattern above to answer'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HSK MOCK EXAM MODAL (模拟测试 • 20 QUESTIONS • 15-MIN TIMER)
// ============================================================================
export function HskMockExamModal({
  words = UNIT_1_WORDS,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onRecordSkillEvent,
  onRecordStudySeconds,
  onClose,
  onComplete
}) {
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(true, onRecordStudySeconds);
  const questions = useMemo(() => buildHskMockExamQuestions(words), [words]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [timeLeftSec, setTimeLeftSec] = useState(15 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [confirmEarlySubmit, setConfirmEarlySubmit] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  const feedbackTimerRef = useRef(null);
  const currentQ = questions[currentIdx] || questions[0];
  const answeredCount = Object.keys(answersMap).length;

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIsAutoAdvancing(false);
    return () => clearFeedbackTimer();
  }, [currentIdx, clearFeedbackTimer]);

  // Auto-play audio when entering a Listening question (1–10)
  useEffect(() => {
    if (!submitted && currentQ?.section === 'Listening' && currentQ?.audioText) {
      speakMandarin(currentQ.audioText);
    }
  }, [currentIdx, submitted, currentQ, speakMandarin]);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (submitted) return;
    if (timeLeftSec <= 0) {
      handleFinalizeExam();
      return;
    }
    const timerId = setTimeout(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timerId);
  }, [timeLeftSec, submitted]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelectAnswer = (optionId) => {
    if (submitted || isAutoAdvancing) return;
    clearFeedbackTimer();
    soundFX.playPop();
    setIsAutoAdvancing(true);
    setAnswersMap((prev) => ({
      ...prev,
      [currentQ.qNumber]: optionId
    }));

    feedbackTimerRef.current = setTimeout(() => {
      setIsAutoAdvancing(false);
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((idx) => Math.min(questions.length - 1, idx + 1));
      }
    }, 500);
  };

  const handleFinalizeExam = () => {
    if (submitted) return;
    clearFeedbackTimer();
    setSubmitted(true);
    setConfirmEarlySubmit(false);
    soundFX.playVictory();

    questions.forEach((q) => {
      const picked = answersMap[q.qNumber];
      const isRight = picked === q.correctOptionId;
      const skillKey = q.section === 'Listening' ? 'listening' : 'recognition';
      onRecordSkillEvent?.(q.word, skillKey, {
        mistakesDelta: isRight ? 0 : 1,
        completionsDelta: isRight ? 1 : 0
      });
    });
  };

  const examReport = useMemo(() => {
    let listeningCorrect = 0;
    let readingCorrect = 0;
    const missedItems = [];

    questions.forEach((q) => {
      const chosenId = answersMap[q.qNumber];
      const chosenOption = q.options.find((o) => o.id === chosenId);
      const isCorrect = chosenId === q.correctOptionId;

      if (isCorrect) {
        if (q.section === 'Listening') listeningCorrect += 1;
        else readingCorrect += 1;
      } else {
        missedItems.push({
          ...q,
          userAnswerLabel: chosenOption ? chosenOption.label : 'No Answer Selected'
        });
      }
    });

    const totalCorrect = listeningCorrect + readingCorrect;
    const percentage = Math.round((totalCorrect / questions.length) * 100);
    const passed = totalCorrect >= 12;
    const xpReward = 40 + (passed ? 25 : 0);

    return {
      listeningCorrect,
      readingCorrect,
      totalCorrect,
      percentage,
      passed,
      missedItems,
      xpReward
    };
  }, [questions, answersMap]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center">
      <div className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto">
        {/* Top Exam Header */}
        <div className="space-y-2.5 border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                clearFeedbackTimer();
                flushSessionTime();
                onClose();
              }}
              className="game-btn-3d p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block truncate">
                HSK Mock Exam • <span className="font-hanzi">模拟测试</span>
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {submitted
                  ? 'Official Score Report'
                  : `Answered ${answeredCount} / 20 • No Instant Feedback`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <SessionTimerBadge seconds={elapsedSeconds} />
              <div
                title="Exam Countdown Timer"
                className={`px-2 py-1 rounded-xl border text-[10px] font-black font-mono flex items-center gap-1 ${
                  !submitted && timeLeftSec <= 120
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-amber-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{formatTimer(timeLeftSec)}</span>
              </div>
            </div>
          </div>

          {/* 20-Question Navigator Strip */}
          {!submitted && (
            <div className="grid grid-cols-10 gap-1 pt-0.5">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answersMap[q.qNumber]);
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.qNumber}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setCurrentIdx(idx);
                    }}
                    className={`h-6 rounded-lg text-[10px] font-black border transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 border-amber-200 scale-105 shadow'
                        : isAnswered
                        ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {q.qNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* EXAM IN-PROGRESS VIEW */}
        {!submitted ? (
          <div className="my-auto space-y-4 py-3">
            <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    currentQ.section === 'Listening'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  }`}
                >
                  Part {currentQ.section === 'Listening' ? 'I • Listening (1–10)' : 'II • Reading (11–20)'}
                </span>
                <span className="text-xs font-black text-slate-300">
                  Question {currentQ.qNumber} / 20
                </span>
              </div>

              <p className="font-clarity text-[15px] font-bold text-slate-200">{currentQ.prompt}</p>

              {/* Question Prompt Box */}
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 text-center space-y-2.5">
                {currentQ.section === 'Listening' ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <Headphones className="w-6 h-6" />
                    </div>
                    <p className="font-clarity text-[15px] font-bold text-slate-200">
                      {currentQ.displayPromptSub}
                    </p>
                    <MandarinAudioControls
                      text={currentQ.audioText}
                      isSlowMode={isSlowMode}
                      onSetSlowMode={onSetSlowMode}
                      speakMandarin={speakMandarin}
                      speakingState={speakingState}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    <div className="font-hanzi text-2xl font-black text-white tracking-wide">
                      {currentQ.displayPromptHanzi}
                    </div>
                    <div className="font-clarity text-[16px] font-semibold text-rose-300">
                      {currentQ.displayPromptSub}
                    </div>
                  </div>
                )}
              </div>

              {/* 4 Multiple-Choice Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, oIdx) => {
                  const isPicked = answersMap[currentQ.qNumber] === opt.id;
                  const letter = ['A', 'B', 'C', 'D'][oIdx] || '•';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAnswer(opt.id)}
                      className={`game-btn-3d font-clarity w-full p-3.5 rounded-2xl border text-left text-[15px] font-bold flex items-center justify-between gap-2 transition-all ${
                        isPicked
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-extrabold shadow-md'
                          : 'bg-slate-900/90 hover:bg-slate-850 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                            isPicked
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="truncate font-clarity font-hanzi">{opt.label}</span>
                      </div>
                      {isPicked && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 shrink-0">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {confirmEarlySubmit && (
              <div className="rounded-2xl bg-amber-500/15 border border-amber-400/50 p-3.5 space-y-2.5 text-xs">
                <p className="font-bold text-amber-200">
                  You have answered {answeredCount} of 20 questions. Submit your HSK Mock Exam now?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmEarlySubmit(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 text-slate-300 font-bold"
                  >
                    Keep Working
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizeExam}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black"
                  >
                    Submit & Grade Exam
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FINAL HSK SCORE REPORT VIEW */
          <div className="my-auto space-y-4 py-3">
            <div
              className={`rounded-3xl border p-5 text-center space-y-3 shadow-2xl ${
                examReport.passed
                  ? 'bg-gradient-to-b from-emerald-950/70 to-slate-900 border-emerald-400/50'
                  : 'bg-gradient-to-b from-rose-950/60 to-slate-900 border-rose-500/50'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border bg-slate-950/80 border-slate-700">
                {examReport.passed ? (
                  <span className="text-emerald-400">★ HSK Mock Exam Passed (<span className="font-hanzi">合格</span>)</span>
                ) : (
                  <span className="text-rose-400">Needs Review • Pass Mark: 12/20 (60%)</span>
                )}
              </div>

              <div className="text-4xl font-black text-white">
                {examReport.totalCorrect} / 20{' '}
                <span className="text-lg text-amber-300">({examReport.percentage}%)</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-400">
                    Listening (<span className="font-hanzi">听力</span>)
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {examReport.listeningCorrect} / 10
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-extrabold uppercase text-sky-400">
                    Reading (<span className="font-hanzi">阅读</span>)
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {examReport.readingCorrect} / 10
                  </div>
                </div>
              </div>
            </div>

            {/* Missed Questions Review List */}
            <div className="rounded-2xl bg-slate-800/85 border border-slate-700 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Missed Items Review ({examReport.missedItems.length})
                </h3>
                <span className="text-[10px] font-bold text-amber-300">
                  Tap Speaker to Listen
                </span>
              </div>

              {examReport.missedItems.length === 0 ? (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 p-3 text-center text-xs font-bold text-emerald-200">
                  Perfect 20/20 Score! Zero missed questions!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {examReport.missedItems.map((item) => (
                    <div
                      key={item.qNumber}
                      className="rounded-xl bg-slate-950/90 border border-rose-500/30 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-rose-300">
                          Q{item.qNumber} ({item.section} • {item.subType})
                        </span>
                        <button
                          type="button"
                          onClick={() => speakMandarin(item.audioText || item.word.hanzi)}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="font-hanzi">{item.word.hanzi}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Your Answer:{' '}
                        <span className="text-rose-300 font-semibold font-hanzi">
                          {item.userAnswerLabel}
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-300 font-bold font-hanzi">
                        ✓ Correct: {item.correctAnswerText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation / Submit Controls */}
        {!submitted ? (
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => {
                clearFeedbackTimer();
                soundFX.playPop();
                setCurrentIdx((i) => Math.max(0, i - 1));
              }}
              className="game-btn-3d px-3.5 py-3.5 rounded-xl bg-slate-800 disabled:opacity-40 text-xs font-bold text-slate-200 border-b-4 border-slate-950"
            >
              Prev
            </button>

            <button
              type="button"
              onClick={() => {
                clearFeedbackTimer();
                if (answeredCount < 20 && !confirmEarlySubmit) {
                  setConfirmEarlySubmit(true);
                } else {
                  handleFinalizeExam();
                }
              }}
              className="game-btn-3d flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs shadow-lg border-b-4 border-emerald-700"
            >
              Submit Exam ({answeredCount}/20 Answered)
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const uniqueWords = [];
              questions.forEach((q) => {
                if (!uniqueWords.some((w) => w.hanzi === q.word.hanzi)) {
                  uniqueWords.push(q.word);
                }
              });
              flushSessionTime();
              onComplete(uniqueWords, examReport.xpReward, examReport.totalCorrect);
            }}
            className="game-btn-3d w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 text-slate-950 font-black text-xs shadow-lg border-b-4 border-emerald-700 flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Claim HSK Exam Reward (+{examReport.xpReward} XP)</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DYNAMIC MULTI-MODALITY SESSION MODAL
// ============================================================================
export function AdaptiveMixedSessionModal({
  sessionConfig,
  progress,
  wordNotes = {},
  onSaveWordNote,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onRecordSkillEvent,
  onRecordStudySeconds,
  onClose,
  onComplete
}) {
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(true, onRecordStudySeconds);
  const queue = sessionConfig?.queue || [];
  const [stepIdx, setStepIdx] = useState(0);

  // Gamified Combo & Floating XP states
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [xpPopupAmount, setXpPopupAmount] = useState(5);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [cardAnim, setCardAnim] = useState('idle');

  // Sub-state for 'recognition' modality
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [recogAnswered, setRecogAnswered] = useState(false);
  const [recogSelectedOption, setRecogSelectedOption] = useState(null);

  // Sub-state for 'writing' modality
  const [charIndex, setCharIndex] = useState(0);
  const [charStage, setCharStage] = useState(1);
  const [scriptStatus, setScriptStatus] = useState('loading');
  const [writerModeStatus, setWriterModeStatus] = useState('quiz');
  const [strokeStats, setStrokeStats] = useState({
    completedStrokes: 0,
    totalStrokes: 0,
    mistakesOnCurrent: 0,
    totalMistakes: 0,
    hintTriggered: false
  });
  const [mixedCharStrokeMeta, setMixedCharStrokeMeta] = useState({
    strokeCount: null,
    radStrokes: []
  });
  const [completedCharsInWord, setCompletedCharsInWord] = useState([]);
  const [wordWritingXpAwarded, setWordWritingXpAwarded] = useState(false);
  const writerTargetRef = useRef(null);
  const writerInstanceRef = useRef(null);
  const writerStageTransitionTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  // Sub-state for 'listening' modality
  const [dictationSubMode, setDictationSubMode] = useState('pinyin');
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState(null);

  // Sub-state for 'speaking' modality
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [similarityData, setSimilarityData] = useState(null);
  const [speakingSkipped, setSpeakingSkipped] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState('');
  const recognitionRef = useRef(null);

  // Sub-state for 'sentence_builder' modality
  const [selectedSentenceTiles, setSelectedSentenceTiles] = useState([]);
  const [sentenceCheckStatus, setSentenceCheckStatus] = useState(null);

  // Sub-state for 'cloze' modality
  const [clozeSelectedId, setClozeSelectedId] = useState(null);
  const [showPinyinHint, setShowPinyinHint] = useState(false);

  const currentItem = queue[stepIdx] || queue[0];
  const currentWord = currentItem?.word || UNIT_1_WORDS[0];
  const currentModality = currentItem?.modality || 'recognition';
  const currentChar = currentWord.chars?.[charIndex] || currentWord.chars?.[0] || currentWord.hanzi[0];
  const masteryLv = getWordMasteryLevel(progress?.mastery, currentWord);
  const masteryTierMeta = getMasteryTierMeta(masteryLv);
  const writingConfig = getAdaptiveWritingConfig(masteryLv);

  const autoAdvanceDelayRef = useRef(1400);

  const clearWriterTransitionTimer = useCallback(() => {
    if (writerStageTransitionTimerRef.current) {
      clearTimeout(writerStageTransitionTimerRef.current);
      writerStageTransitionTimerRef.current = null;
    }
  }, []);

  const clearAllSessionTimers = useCallback(() => {
    if (writerStageTransitionTimerRef.current) {
      clearTimeout(writerStageTransitionTimerRef.current);
      writerStageTransitionTimerRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const sentencePuzzle = useMemo(
    () => buildSentenceBuilderPuzzle(currentWord),
    [currentWord]
  );

  const lessonWordPool = useMemo(() => {
    const map = new window.Map();
    queue.forEach((q) => {
      if (q.word?.hanzi) map.set(q.word.hanzi, q.word);
    });
    UNIT_1_WORDS.forEach((w) => {
      if (!map.has(w.hanzi)) map.set(w.hanzi, w);
    });
    return Array.from(map.values());
  }, [queue]);

  const liveSessionRef = useRef({
    queue,
    onComplete,
    onRecordSkillEvent,
    flushSessionTime,
    speakMandarin,
    bonusXp,
    maxCombo,
    combo,
    wordWritingXpAwarded,
    currentWord,
    currentModality,
    charIndex,
    writingConfig,
    sentencePuzzle
  });
  liveSessionRef.current = {
    queue,
    onComplete,
    onRecordSkillEvent,
    flushSessionTime,
    speakMandarin,
    bonusXp,
    maxCombo,
    combo,
    wordWritingXpAwarded,
    currentWord,
    currentModality,
    charIndex,
    writingConfig,
    sentencePuzzle
  };

  const finishMixedSession = useCallback(
    (finalBonusXp = liveSessionRef.current.bonusXp, finalMaxCombo = liveSessionRef.current.maxCombo) => {
      const {
        queue: liveQueue,
        flushSessionTime: flushTime,
        onComplete: completeCb
      } = liveSessionRef.current;
      const uniqueWords = [];
      liveQueue.forEach((item) => {
        if (item?.word && !uniqueWords.some((w) => w.hanzi === item.word.hanzi)) {
          uniqueWords.push(item.word);
        }
      });
      flushTime();
      completeCb(uniqueWords, finalBonusXp, finalMaxCombo);
    },
    []
  );

  const scheduleNextQueueItem = useCallback(
    (delayMs = 1400, nextBonusXp = liveSessionRef.current.bonusXp, nextMaxCombo = liveSessionRef.current.maxCombo) => {
      autoAdvanceDelayRef.current = delayMs;
      liveSessionRef.current.bonusXp = nextBonusXp;
      liveSessionRef.current.maxCombo = nextMaxCombo;
      setStepCompleted(true);
    },
    []
  );

  // Dedicated auto-advance effect strictly tied to [stepCompleted, stepIdx] so parent re-renders never cancel it
  useEffect(() => {
    if (!stepCompleted) return;
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    const delayMs = autoAdvanceDelayRef.current || 1400;
    feedbackTimerRef.current = setTimeout(() => {
      const {
        queue: liveQueue,
        bonusXp: liveBonus,
        maxCombo: liveMax
      } = liveSessionRef.current;
      if (stepIdx < liveQueue.length - 1) {
        setStepIdx((s) => s + 1);
      } else {
        finishMixedSession(liveBonus, liveMax);
      }
    }, delayMs);

    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [stepCompleted, stepIdx, finishMixedSession]);

  const awardComboXp = useCallback((base = 5) => {
    const next = (liveSessionRef.current.combo || 0) + 1;
    const nextMax = Math.max(liveSessionRef.current.maxCombo || 0, next);
    const comboBonus = next >= 2 ? Math.min(3, next - 1) : 0;
    const gain = base + comboBonus;
    const nextBonus = (liveSessionRef.current.bonusXp || 0) + gain;
    liveSessionRef.current.combo = next;
    liveSessionRef.current.maxCombo = nextMax;
    liveSessionRef.current.bonusXp = nextBonus;
    setCombo(next);
    setMaxCombo(nextMax);
    soundFX.playCorrect(next);
    setBonusXp(nextBonus);
    setXpPopupAmount(gain);
    setXpPopupKey((k) => k + 1);
    return { nextBonus, nextMax };
  }, []);

  const registerMistakeFeedback = useCallback(() => {
    soundFX.playMistake();
    liveSessionRef.current.combo = 0;
    setCombo(0);
    setCardAnim('wrong');
    setTimeout(() => setCardAnim('idle'), 460);
  }, []);

  const isPinyinMeaningComboStep =
    currentModality === 'meaning_mc' && stepIdx % 2 === 1;

  const recognitionOptions = useMemo(() => {
    const pool = [...queue.map((q) => q.word), ...UNIT_1_WORDS];
    const uniqueDistractors = [];
    pool.forEach((w) => {
      if (
        w &&
        w.hanzi !== currentWord.hanzi &&
        !uniqueDistractors.some((d) => d.hanzi === w.hanzi)
      ) {
        uniqueDistractors.push(w);
      }
    });
    while (uniqueDistractors.length < 3) {
      uniqueDistractors.push(UNIT_1_WORDS[uniqueDistractors.length % UNIT_1_WORDS.length]);
    }
    const formatOptionLabel = (w) => {
      const meaningStr = w.meaning || w.english;
      if (isPinyinMeaningComboStep) {
        return `${w.pinyin} • ${meaningStr}`;
      }
      return meaningStr;
    };
    const rawOpts = [
      { id: 'correct', text: formatOptionLabel(currentWord), isCorrect: true },
      {
        id: 'd1',
        text: formatOptionLabel(uniqueDistractors[0]),
        isCorrect: false
      },
      {
        id: 'd2',
        text: formatOptionLabel(uniqueDistractors[1]),
        isCorrect: false
      },
      {
        id: 'd3',
        text: formatOptionLabel(uniqueDistractors[2]),
        isCorrect: false
      }
    ];
    const shift = stepIdx % rawOpts.length;
    return rawOpts.map((_, idx) => rawOpts[(idx + shift) % rawOpts.length]);
  }, [currentWord, isPinyinMeaningComboStep, queue, stepIdx]);

  // Reset step state ONLY when advancing to a new stepIdx
  useEffect(() => {
    clearAllSessionTimers();
    const {
      writingConfig: liveWritingCfg,
      currentModality: liveModality,
      sentencePuzzle: livePuzzle,
      currentWord: liveWord,
      speakMandarin: speakFn
    } = liveSessionRef.current;

    setStepCompleted(false);
    setCardAnim('idle');
    setIsCardFlipped(false);
    setRecogAnswered(false);
    setRecogSelectedOption(null);
    setShowPinyinHint(false);

    setCharIndex(0);
    setCharStage(liveWritingCfg.initialStage);
    setCompletedCharsInWord([]);
    setWordWritingXpAwarded(false);
    liveSessionRef.current.wordWritingXpAwarded = false;
    setStrokeStats({
      completedStrokes: 0,
      totalStrokes: 0,
      mistakesOnCurrent: 0,
      totalMistakes: 0,
      hintTriggered: false
    });

    setDictationInput('');
    setDictationResult(null);

    setIsRecording(false);
    setRecognizedText('');
    setSimilarityData(null);
    setSpeakingSkipped(false);
    setMicErrorMsg('');

    setSelectedSentenceTiles([]);
    setSentenceCheckStatus(null);
    setClozeSelectedId(null);

    speakFn(
      liveModality === 'sentence_builder'
        ? livePuzzle.cleanSentence
        : liveWord.hanzi
    );

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [stepIdx, clearAllSessionTimers]);

  useEffect(() => {
    let mounted = true;
    loadHanziWriterScript()
      .then(() => {
        if (mounted) setScriptStatus('ready');
      })
      .catch(() => {
        if (mounted) setScriptStatus('error');
      });
    return () => {
      mounted = false;
      clearAllSessionTimers();
    };
  }, [clearAllSessionTimers]);

  useEffect(() => {
    if (
      currentModality !== 'writing' ||
      scriptStatus !== 'ready' ||
      !window.HanziWriter?.loadCharacterData ||
      !currentChar
    ) {
      return;
    }
    let active = true;
    window.HanziWriter.loadCharacterData(currentChar)
      .then((charData) => {
        if (!active || !charData) return;
        const radStrokes = Array.isArray(charData.radStrokes) ? charData.radStrokes : [];
        setMixedCharStrokeMeta({
          strokeCount: Array.isArray(charData.strokes) ? charData.strokes.length : null,
          radStrokes
        });
        if (writerTargetRef.current && (charStage === 1 || charStage === 2)) {
          highlightRadicalOutlineStrokes(writerTargetRef.current, radStrokes, true);
        }
      })
      .catch(() => {
        if (active) setMixedCharStrokeMeta({ strokeCount: null, radStrokes: [] });
      });
    return () => {
      active = false;
    };
  }, [currentModality, scriptStatus, currentChar, charStage]);

  const startWriterQuiz = useCallback(
    (writer, targetStage) => {
      const activeWriter = writer || writerInstanceRef.current;
      if (!activeWriter) return;

      clearWriterTransitionTimer();

      const activeStageMeta = getWritingStageMeta(targetStage);
      setWriterModeStatus('quiz');
      setStrokeStats((prev) => ({
        ...prev,
        completedStrokes: 0,
        mistakesOnCurrent: 0,
        totalMistakes: 0,
        hintTriggered: false
      }));

      activeWriter.hideCharacter();
      if (activeStageMeta.showOutline) {
        activeWriter.showOutline();
      } else {
        activeWriter.hideOutline();
      }

      activeWriter.quiz({
        showHintAfterMisses: activeStageMeta.showHintAfterMisses,
        highlightOnComplete: true,
        onMistake: (strokeData) => {
          registerMistakeFeedback();
          const { currentWord: liveWord, onRecordSkillEvent: recordEvt } = liveSessionRef.current;
          recordEvt?.(liveWord, 'writing', { mistakesDelta: 1, completionsDelta: 0 });
          setStrokeStats((prev) => ({
            ...prev,
            mistakesOnCurrent: strokeData.mistakesOnStroke,
            totalMistakes: strokeData.totalMistakes,
            hintTriggered: strokeData.mistakesOnStroke >= activeStageMeta.showHintAfterMisses
          }));
        },
        onCorrectStroke: (strokeData) => {
          const doneCount = strokeData.strokeNum + 1;
          const total = doneCount + strokeData.strokesRemaining;
          const nextCombo = (liveSessionRef.current.combo || 0) + 1;
          const nextMaxCombo = Math.max(liveSessionRef.current.maxCombo || 0, nextCombo);
          liveSessionRef.current.combo = nextCombo;
          liveSessionRef.current.maxCombo = nextMaxCombo;
          setCombo(nextCombo);
          setMaxCombo(nextMaxCombo);
          soundFX.playCorrect(nextCombo);

          setStrokeStats({
            completedStrokes: doneCount,
            totalStrokes: total,
            mistakesOnCurrent: 0,
            totalMistakes: strokeData.totalMistakes,
            hintTriggered: false
          });

          if (activeStageMeta.autoHighlightNextStroke && strokeData.strokesRemaining > 0) {
            const nextStrokeIdx = strokeData.strokeNum + 1;
            setTimeout(() => {
              if (writerInstanceRef.current === activeWriter) {
                try {
                  activeWriter.highlightStroke(nextStrokeIdx);
                } catch (e) {
                  // Ignore
                }
              }
            }, 180);
          }
        },
        onComplete: (summaryData) => {
          setCardAnim('correct');
          setTimeout(() => setCardAnim('idle'), 500);
          setStrokeStats((prev) => ({
            ...prev,
            completedStrokes: prev.totalStrokes || prev.completedStrokes,
            mistakesOnCurrent: 0,
            totalMistakes: summaryData.totalMistakes,
            hintTriggered: false
          }));

          const {
            combo: liveCombo,
            bonusXp: liveBonus,
            maxCombo: liveMax,
            charIndex: liveCharIdx,
            currentWord: liveWord,
            writingConfig: liveWritingCfg,
            onRecordSkillEvent: recordEvt
          } = liveSessionRef.current;

          if (targetStage < 3) {
            soundFX.playCorrect(liveCombo + 1);
            setWriterModeStatus('stage_transition');
            writerStageTransitionTimerRef.current = setTimeout(() => {
              setCharStage(targetStage + 1);
            }, 600);
          } else {
            setWriterModeStatus('completed');
            const isFinalChar = liveCharIdx >= (liveWord.chars?.length || 1) - 1;

            setCompletedCharsInWord((prev) => {
              const next = prev.includes(liveCharIdx) ? prev : [...prev, liveCharIdx];
              return next;
            });

            if (!isFinalChar) {
              soundFX.playCorrect(liveCombo + 1);
              writerStageTransitionTimerRef.current = setTimeout(() => {
                setCharStage(liveWritingCfg.initialStage);
                setCharIndex((c) => c + 1);
              }, 850);
            } else {
              let updatedBonus = liveBonus;
              let updatedMax = liveMax;
              if (!liveSessionRef.current.wordWritingXpAwarded) {
                liveSessionRef.current.wordWritingXpAwarded = true;
                setWordWritingXpAwarded(true);
                recordEvt?.(liveWord, 'writing', {
                  mistakesDelta: 0,
                  completionsDelta: 1
                });
                const res = awardComboXp(5);
                updatedBonus = res.nextBonus;
                updatedMax = res.nextMax;
              }
              scheduleNextQueueItem(1200, updatedBonus, updatedMax);
            }
          }
        }
      });

      if (activeStageMeta.autoHighlightNextStroke) {
        setTimeout(() => {
          if (writerInstanceRef.current === activeWriter) {
            try {
              activeWriter.highlightStroke(0);
            } catch (e) {
              // Ignore
            }
          }
        }, 60);
      }
    },
    [awardComboXp, clearWriterTransitionTimer, registerMistakeFeedback, scheduleNextQueueItem]
  );

  useEffect(() => {
    if (
      currentModality !== 'writing' ||
      scriptStatus !== 'ready' ||
      !writerTargetRef.current ||
      !window.HanziWriter
    ) {
      return;
    }

    const containerEl = writerTargetRef.current;
    if (writerInstanceRef.current?.cancelQuiz) {
      try {
        writerInstanceRef.current.cancelQuiz();
      } catch (e) {
        // Ignore
      }
    }
    containerEl.innerHTML = '';
    writerInstanceRef.current = null;

    const currentStageConfig = getWritingStageMeta(charStage);

    const writer = window.HanziWriter.create(containerEl, currentChar, {
      width: 240,
      height: 240,
      padding: 18,
      showOutline: currentStageConfig.showOutline,
      showCharacter: false,
      strokeAnimationSpeed: 1.1,
      delayBetweenStrokes: 150,
      strokeColor: '#f8fafc',
      radicalColor: '#dc2626',
      outlineColor: '#334155',
      drawingColor: '#f43f5e',
      drawingWidth: 24,
      leniency: 1.55,
      highlightColor: '#38bdf8',
      showHintAfterMisses: currentStageConfig.showHintAfterMisses,
      highlightOnComplete: true,
      onLoadCharDataSuccess: (charData) => {
        const radStrokes = Array.isArray(charData.radStrokes) ? charData.radStrokes : [];
        setMixedCharStrokeMeta({
          strokeCount: charData.strokes.length,
          radStrokes
        });
        setStrokeStats({
          completedStrokes: 0,
          totalStrokes: charData.strokes.length,
          mistakesOnCurrent: 0,
          totalMistakes: 0,
          hintTriggered: false
        });
        if (writerInstanceRef.current === writer) {
          startWriterQuiz(writer, charStage);
          if (charStage === 1 || charStage === 2) {
            setTimeout(() => {
              highlightRadicalOutlineStrokes(containerEl, radStrokes, true);
            }, 40);
          }
        }
      }
    });

    writerInstanceRef.current = writer;

    return () => {
      if (writerStageTransitionTimerRef.current) {
        clearTimeout(writerStageTransitionTimerRef.current);
      }
      if (writerInstanceRef.current?.cancelQuiz) {
        try {
          writerInstanceRef.current.cancelQuiz();
        } catch (e) {
          // Ignore
        }
      }
      if (containerEl) containerEl.innerHTML = '';
      if (writerTargetRef.current) writerTargetRef.current.innerHTML = '';
      writerInstanceRef.current = null;
    };
  }, [currentModality, scriptStatus, stepIdx, charIndex, charStage, currentChar, startWriterQuiz]);

  const handleWatchWriterAnimation = () => {
    const writer = writerInstanceRef.current;
    if (!writer) return;
    soundFX.playPop();
    if (writerStageTransitionTimerRef.current) {
      clearTimeout(writerStageTransitionTimerRef.current);
      writerStageTransitionTimerRef.current = null;
    }
    setWriterModeStatus('animating');
    writer.cancelQuiz();
    writer.showOutline();
    writer.showCharacter();
    writer.animateCharacter({
      onComplete: () => {
        setTimeout(() => {
          if (writerInstanceRef.current === writer) {
            writer.hideCharacter();
            startWriterQuiz(writer, charStage);
          }
        }, 400);
      }
    });
  };

  const handleSelectRecognitionOption = (opt) => {
    if (recogAnswered || stepCompleted) return;
    setRecogSelectedOption(opt.id);
    setRecogAnswered(true);
    setStepCompleted(true);

    if (opt.isCorrect) {
      setCardAnim('correct');
      setTimeout(() => setCardAnim('idle'), 500);
      onRecordSkillEvent?.(currentWord, 'recognition', { mistakesDelta: 0, completionsDelta: 1 });
      const { nextBonus, nextMax } = awardComboXp(5);
      speakMandarin(currentWord.hanzi);
      scheduleNextQueueItem(1400, nextBonus, nextMax);
    } else {
      registerMistakeFeedback();
      onRecordSkillEvent?.(currentWord, 'recognition', { mistakesDelta: 1, completionsDelta: 0 });
      scheduleNextQueueItem(1800, bonusXp, maxCombo);
    }
  };

  const handleCheckListeningDictation = (e) => {
    if (e) e.preventDefault();
    if (stepCompleted || !dictationInput.trim()) return;
    const res = validateDictationInput(dictationInput, currentWord, dictationSubMode, masteryLv);
    setDictationResult(res);
    setStepCompleted(true);

    if (res.isValid) {
      setCardAnim('correct');
      setTimeout(() => setCardAnim('idle'), 500);
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 0, completionsDelta: 1 });
      const { nextBonus, nextMax } = awardComboXp(5);
      speakMandarin(currentWord.hanzi);
      scheduleNextQueueItem(1400, nextBonus, nextMax);
    } else {
      registerMistakeFeedback();
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 1, completionsDelta: 0 });
      scheduleNextQueueItem(1800, bonusXp, maxCombo);
    }
  };

  const validateSentenceOrder = useCallback(
    (candidateTiles) => {
      if (stepCompleted) return;
      const builtString = candidateTiles.map((t) => t.text).join('');
      setStepCompleted(true);

      if (builtString === sentencePuzzle.cleanSentence) {
        setSentenceCheckStatus('correct');
        setCardAnim('correct');
        setTimeout(() => setCardAnim('idle'), 550);
        onRecordSkillEvent?.(currentWord, 'sentence_builder', {
          mistakesDelta: 0,
          completionsDelta: 1
        });
        const { nextBonus, nextMax } = awardComboXp(5);
        speakMandarin(sentencePuzzle.cleanSentence);
        scheduleNextQueueItem(1400, nextBonus, nextMax);
      } else {
        setSentenceCheckStatus('wrong');
        registerMistakeFeedback();
        onRecordSkillEvent?.(currentWord, 'sentence_builder', {
          mistakesDelta: 1,
          completionsDelta: 0
        });
        scheduleNextQueueItem(1800, bonusXp, maxCombo);
      }
    },
    [
      awardComboXp,
      bonusXp,
      currentWord,
      maxCombo,
      onRecordSkillEvent,
      registerMistakeFeedback,
      scheduleNextQueueItem,
      sentencePuzzle.cleanSentence,
      speakMandarin,
      stepCompleted
    ]
  );

  const handleTapAvailableTile = (tile) => {
    if (stepCompleted) return;
    soundFX.playPop();
    speakMandarin(tile.text);
    const nextSelected = [...selectedSentenceTiles, tile];
    setSelectedSentenceTiles(nextSelected);
    setSentenceCheckStatus(null);

    if (nextSelected.length === sentencePuzzle.shuffledTiles.length) {
      validateSentenceOrder(nextSelected);
    }
  };

  const handleRemovePlacedTile = (tileToRemove) => {
    if (stepCompleted) return;
    soundFX.playPop();
    setSelectedSentenceTiles((prev) =>
      prev.filter((t) => t.tileId !== tileToRemove.tileId)
    );
    setSentenceCheckStatus(null);
  };

  const handleStartSpeakingCheck = () => {
    if (stepCompleted) return;
    setMicErrorMsg('');
    const SpeechRec =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRec) {
      setMicErrorMsg(
        'SpeechRecognition API is not supported in this browser. Tap "Skip / Can\'t speak right now" below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsRecording(true);
      recognition.onresult = (event) => {
        setIsRecording(false);
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setRecognizedText(transcript);
        const computed = computeSpeechSimilarity(transcript, currentWord);
        setSimilarityData(computed);
        setStepCompleted(true);

        if (computed.score >= 50) {
          setCardAnim('correct');
          setTimeout(() => setCardAnim('idle'), 500);
          onRecordSkillEvent?.(currentWord, 'speaking', { mistakesDelta: 0, completionsDelta: 1 });
          const { nextBonus, nextMax } = awardComboXp(5);
          scheduleNextQueueItem(1400, nextBonus, nextMax);
        } else {
          registerMistakeFeedback();
          onRecordSkillEvent?.(currentWord, 'speaking', { mistakesDelta: 1, completionsDelta: 0 });
          scheduleNextQueueItem(1800, bonusXp, maxCombo);
        }
      };
      recognition.onerror = (event) => {
        setIsRecording(false);
        setMicErrorMsg(
          `Microphone unavailable (${event?.error || 'blocked'}). Tap "Skip / Can't speak right now" below.`
        );
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (e) {
      setIsRecording(false);
      setMicErrorMsg('Microphone blocked in iframe. Tap "Skip / Can\'t speak right now" below.');
    }
  };

  const modalityInfo = MODALITY_META[currentModality] || MODALITY_META.recognition;
  const currentWritingStageMeta = getWritingStageMeta(charStage);
  const isCurrentWritingCharDone =
    (charStage === 3 && writerModeStatus === 'completed') ||
    completedCharsInWord.includes(charIndex);
  const hideRecogPinyin =
    (masteryLv >= 4 || isPinyinMeaningComboStep) &&
    !recogAnswered &&
    !isCardFlipped &&
    !showPinyinHint;
  const hideWritingPinyin = writingConfig.hidePinyin && !isCurrentWritingCharDone && !showPinyinHint;
  const hideWritingHanzi = writingConfig.hideHanzi && !isCurrentWritingCharDone && !showPinyinHint;
  const hideSpeakingPinyin = masteryLv >= 4 && !stepCompleted && !showPinyinHint;
  const hideSpeakingHanzi = masteryLv >= 7 && !stepCompleted && !showPinyinHint;
  const showSentenceBuilderPinyin = masteryLv <= 3 || showPinyinHint || stepCompleted;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center">
      <div className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto">
        <div>
          <SessionGameTopHud
            title={sessionConfig.title}
            subtitle={`Step ${stepIdx + 1}/${queue.length} • ${modalityInfo.label} Mode`}
            totalSegments={queue.length}
            completedSegments={stepIdx + (stepCompleted ? 1 : 0)}
            combo={combo}
            sessionSeconds={elapsedSeconds}
            xpPopupKey={xpPopupKey}
            xpPopupAmount={xpPopupAmount}
            onClose={() => {
              clearAllSessionTimers();
              flushSessionTime();
              onClose();
            }}
          />

          {/* Dynamic Modality Pill Strip */}
          <div className="mt-2.5 flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${modalityInfo.badgeClass}`}
              >
                {modalityInfo.label}
              </span>
              {currentItem?.isPastLessonReview && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
                  Past Lesson Review
                </span>
              )}
              <span className="text-[11px] text-slate-400 truncate">
                {currentItem?.reason || sessionConfig.badgeText}
              </span>
            </div>
            <span className={`inline-flex flex-col items-center justify-center leading-tight px-2 py-1 shrink-0 rounded-lg border ${masteryTierMeta.badgeClass}`}>
              <span className="text-[11px] font-black leading-tight">Lv.{masteryLv}/10</span>
              <span className="text-[10px] font-bold leading-tight">{masteryTierMeta.tier}</span>
            </span>
          </div>
        </div>

        {/* MODALITY 1: RECOGNITION & MEANING MULTIPLE-CHOICE QUIZ (4 OPTIONS) */}
        {(currentModality === 'recognition' || currentModality === 'meaning_mc') && (
          <div className="my-auto space-y-3.5 py-3">
            <div
              onClick={() => {
                soundFX.playPop();
                setIsCardFlipped((f) => !f);
                speakMandarin(
                  !isCardFlipped
                    ? currentWord.exampleHanzi || currentWord.hanzi
                    : currentWord.hanzi
                );
              }}
              className={`cursor-pointer rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 p-5 text-center space-y-2.5 shadow-xl transition-all ${
                cardAnim === 'wrong'
                  ? 'border-rose-500 animate-game-shake'
                  : cardAnim === 'correct'
                  ? 'border-emerald-400 animate-game-green-pulse'
                  : isCardFlipped
                  ? 'border-emerald-500/50'
                  : 'border-slate-700 hover:border-rose-400/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {isCardFlipped
                    ? 'Context & Example'
                    : masteryLv >= 4
                    ? `Lv.${masteryLv} Active Recall`
                    : 'Tap Card to Flip'}
                </span>
                <MandarinAudioControls
                  text={currentWord.hanzi}
                  isSlowMode={isSlowMode}
                  onSetSlowMode={onSetSlowMode}
                  speakMandarin={speakMandarin}
                  speakingState={speakingState}
                  size="sm"
                />
              </div>

              <div className="font-hanzi text-5xl font-black text-white tracking-wider pt-1">
                {currentWord.hanzi}
              </div>

              {hideRecogPinyin ? (
                <div className="py-1.5 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400">
                    Lv.{masteryLv} Recall • Pinyin hidden until answered
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFX.playPop();
                      setShowPinyinHint(true);
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Pinyin Hint</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="font-pinyin text-rose-400">{currentWord.pinyin}</div>

                  <ChaoToneVisualizer
                    pinyin={currentWord.pinyin}
                    hanzi={currentWord.hanzi}
                    compact
                  />
                </>
              )}

              {isCardFlipped && (
                <div
                  className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 text-left space-y-1.5 mt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="font-hanzi text-base font-bold text-white">{currentWord.exampleHanzi}</p>
                  <p className="font-clarity text-[15px] font-semibold text-rose-300">{currentWord.examplePinyin}</p>
                  <p className="font-clarity text-sm text-slate-300 italic">
                    "{currentWord.exampleEnglish}"
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="font-clarity text-sm font-bold text-slate-300 block">
                {isPinyinMeaningComboStep
                  ? 'Select the matching Pinyin & English meaning (4 options):'
                  : 'Select the matching English meaning (4 options):'}
              </span>
              {recognitionOptions.map((opt) => {
                const isSelected = recogSelectedOption === opt.id;
                let styleClass =
                  'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100';
                if (recogAnswered && opt.isCorrect) {
                  styleClass =
                    'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-extrabold';
                } else if (recogAnswered && isSelected && !opt.isCorrect) {
                  styleClass = 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold';
                } else if (recogAnswered) {
                  styleClass = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={recogAnswered}
                    onClick={() => handleSelectRecognitionOption(opt)}
                    className={`game-btn-3d font-clarity w-full p-3.5 rounded-2xl border text-left text-[15px] font-bold flex items-center justify-between transition-all ${styleClass}`}
                  >
                    <span className="font-clarity">{opt.text}</span>
                    {recogAnswered && opt.isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {recogAnswered && isSelected && !opt.isCorrect && (
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {recogAnswered && (
                <div
                  className={`font-clarity rounded-xl p-3 text-sm font-bold border ${
                    recognitionOptions.find((o) => o.id === recogSelectedOption)?.isCorrect
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                  }`}
                >
                  {recognitionOptions.find((o) => o.id === recogSelectedOption)?.isCorrect
                    ? `✓ Correct! ${currentWord.hanzi} (${currentWord.pinyin}) — ${
                        currentWord.meaning || currentWord.english
                      }`
                    : `✗ Incorrect — Correct answer: ${currentWord.meaning || currentWord.english}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODALITY 2: WRITING */}
        {currentModality === 'writing' && (
          <div className="my-auto flex flex-col items-center space-y-2.5 py-2">
            <div className="w-full rounded-2xl bg-slate-800/80 border border-slate-700 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-clarity text-[15px] font-bold text-amber-400 block truncate">
                  {currentWord.meaning || currentWord.english}
                </span>
                <div className="flex items-center flex-wrap gap-2 mt-0.5">
                  <span className="font-hanzi text-xl font-black text-white">
                    {hideWritingHanzi ? '？'.repeat(currentWord.chars?.length || 1) : currentWord.hanzi}
                  </span>
                  {hideWritingPinyin ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setShowPinyinHint(true);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Show Pinyin Hint</span>
                    </button>
                  ) : (
                    <span className="font-pinyin text-rose-400">{currentWord.pinyin}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(currentWord.chars || [currentWord.hanzi]).map((ch, idx) => {
                  const isDone = completedCharsInWord.includes(idx);
                  const isActive = idx === charIndex;
                  const isLocked =
                    idx > 0 && !completedCharsInWord.includes(idx - 1) && !isDone && !isActive;
                  const maskChar =
                    writingConfig.hideHanzi &&
                    !isDone &&
                    !showPinyinHint &&
                    !(isActive && isCurrentWritingCharDone);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          soundFX.playMistake();
                          return;
                        }
                        soundFX.playPop();
                        setCharStage(isDone ? 3 : writingConfig.initialStage);
                        setCharIndex(idx);
                      }}
                      className={`font-hanzi w-9 h-9 rounded-xl font-black text-sm border flex items-center justify-center relative ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : isDone
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : isLocked
                          ? 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>{maskChar ? '?' : ch}</span>
                      {isDone && (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 absolute -top-1 -right-1 bg-slate-900 rounded-full" />
                      )}
                      {isLocked && (
                        <Lock className="w-2 h-2 text-slate-500 absolute -top-1 -right-1 bg-slate-900 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adaptive Mastery Badge Above Grid (Lv.7+ Blind Recall / Lv.4-6 Skip Guided) */}
            {writingConfig.badgeLabel && (
              <div className="w-full max-w-[244px] flex items-center justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${
                    writingConfig.isBlindRecall
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60'
                      : 'bg-sky-500/20 text-sky-300 border-sky-400/60'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{writingConfig.badgeLabel}</span>
                </span>
              </div>
            )}

            {/* 3-Step Progressive Mastery Indicator Pill */}
            <div className="w-full max-w-[244px]">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                {WRITING_MASTERY_STAGES.map((st) => {
                  const isSkippedStage = st.stage < writingConfig.minStage;
                  const isCompletedStage =
                    isCurrentWritingCharDone || charStage > st.stage || isSkippedStage;
                  const isCurrentStage = charStage === st.stage && !isCurrentWritingCharDone;
                  return (
                    <button
                      key={st.stage}
                      type="button"
                      onClick={() => {
                        if (st.stage <= charStage || isCurrentWritingCharDone) {
                          soundFX.playPop();
                          setCharStage(st.stage);
                        }
                      }}
                      className={`py-1.5 px-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all border ${
                        isCurrentStage
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 border-amber-300 shadow'
                          : isCompletedStage
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/70 border-transparent text-slate-500'
                      }`}
                    >
                      {isCompletedStage && <Check className="w-2.5 h-2.5 stroke-[3px] shrink-0" />}
                      <span className="truncate">{st.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full max-w-[244px] flex items-center justify-between">
              <button
                type="button"
                onClick={handleWatchWriterAnimation}
                disabled={scriptStatus !== 'ready'}
                className="game-btn-3d px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Replay Animation</span>
              </button>
              <MandarinAudioControls
                text={currentWord.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            </div>

            {/* Stroke Count & Radical Info Strip */}
            <div className="w-full max-w-[244px] px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-extrabold text-slate-200">
                "<span className="font-hanzi">{hideWritingHanzi ? '?' : currentChar}</span>" •{' '}
                {mixedCharStrokeMeta.strokeCount || strokeStats.totalStrokes || '?'}{' '}
                strokes
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: '#dc2626' }}
                />
                <span>
                  {KNOWN_CHARACTER_INFO[currentChar]?.radical ||
                    (mixedCharStrokeMeta.radStrokes?.length > 0
                      ? `Radical (${mixedCharStrokeMeta.radStrokes.length} str)`
                      : 'Radical #dc2626')}
                </span>
              </span>
            </div>

            <div
              style={{ touchAction: 'none' }}
              className={`relative w-[244px] h-[244px] rounded-2xl bg-slate-950 border-2 shadow-2xl overflow-hidden select-none touch-none flex items-center justify-center ${
                cardAnim === 'wrong'
                  ? 'border-rose-500 animate-game-shake'
                  : cardAnim === 'correct'
                  ? 'border-emerald-400 animate-game-green-pulse'
                  : charStage === 3
                  ? 'border-emerald-500/50'
                  : charStage === 2
                  ? 'border-amber-500/50'
                  : 'border-sky-500/50'
              }`}
            >
              <svg
                viewBox="0 0 240 240"
                className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
              >
                <rect x="6" y="6" width="228" height="228" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="6" y1="120" x2="234" y2="120" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 5" />
                <line x1="120" y1="6" x2="120" y2="234" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 5" />
                <line x1="6" y1="6" x2="234" y2="234" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" />
                <line x1="6" y1="234" x2="234" y2="6" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" />
              </svg>

              {scriptStatus === 'error' && (
                <button
                  type="button"
                  onClick={() => {
                    if (charStage < 3) {
                      setCharStage((s) => s + 1);
                    } else {
                      const next = [...completedCharsInWord, charIndex];
                      setCompletedCharsInWord(next);
                      if (next.length >= (currentWord.chars?.length || 1)) {
                        setStepCompleted(true);
                        scheduleNextQueueItem(1200, bonusXp, maxCombo);
                      } else {
                        setCharStage(writingConfig.initialStage);
                        setCharIndex((c) => c + 1);
                      }
                    }
                  }}
                  className="z-20 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Mark "{currentChar}" Stage {charStage} Complete
                </button>
              )}

              {stepCompleted && (
                <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 animate-game-green-pulse pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/25 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <span className="text-sm font-black text-emerald-300">Completed! ✓</span>
                </div>
              )}

              <div
                ref={writerTargetRef}
                style={{ touchAction: 'none' }}
                className="relative z-10 w-[240px] h-[240px] touch-none select-none cursor-crosshair"
              />
            </div>

            <div className="w-full max-w-[244px] rounded-xl bg-slate-800/80 border border-slate-700/70 px-3 py-2 text-center">
              <p className="text-[11px] font-bold text-slate-200">
                {writerModeStatus === 'stage_transition'
                  ? `✓ ${currentWritingStageMeta.shortLabel} complete! Starting Stage ${charStage + 1}...`
                  : isCurrentWritingCharDone
                  ? `✓ Completed! Auto-advancing...`
                  : `${currentWritingStageMeta.shortLabel}: Strokes ${strokeStats.completedStrokes}/${
                      strokeStats.totalStrokes || '?'
                    }`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {currentWritingStageMeta.instruction}
              </p>
            </div>
          </div>
        )}

        {/* MODALITY 3: LISTENING (DICTATION) */}
        {currentModality === 'listening' && (
          <div
            className={`my-auto rounded-3xl bg-slate-800/90 border p-4 space-y-3.5 shadow-xl ${
              cardAnim === 'wrong'
                ? 'border-rose-500 animate-game-shake'
                : cardAnim === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : 'border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-emerald-300">
                {masteryLv >= 7 ? 'Lv.7+ Strict Audio Dictation' : 'Audio Dictation Challenge'}
              </span>
              <span className="text-xs font-bold text-slate-300">
                Meaning: <strong className="text-white">{(currentWord.meaning || currentWord.english).split(' / ')[0]}</strong>
              </span>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 flex items-center justify-between gap-2">
              <div>
                <p className="font-clarity text-[15px] font-bold text-white">Listen & Transcribe</p>
                <p className="font-clarity text-sm text-slate-300">
                  {stepCompleted
                    ? `${currentWord.hanzi} (${currentWord.pinyin})`
                    : 'Play native 1.0x Normal or 0.65x Slow audio'}
                </p>
              </div>
              <MandarinAudioControls
                text={currentWord.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                disabled={stepCompleted}
                onClick={() => {
                  setDictationSubMode('pinyin');
                  setDictationResult(null);
                }}
                className={`py-2 rounded-lg text-xs font-extrabold ${
                  dictationSubMode === 'pinyin'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400'
                }`}
              >
                Type Pinyin
              </button>
              <button
                type="button"
                disabled={stepCompleted}
                onClick={() => {
                  setDictationSubMode('hanzi');
                  setDictationResult(null);
                }}
                className={`py-2 rounded-lg text-xs font-extrabold ${
                  dictationSubMode === 'hanzi'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400'
                }`}
              >
                Type Hanzi
              </button>
            </div>

            <form onSubmit={handleCheckListeningDictation} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={stepCompleted}
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  placeholder={
                    dictationSubMode === 'pinyin'
                      ? 'e.g. nǐ hǎo or ni3 hao3 (tones required)'
                      : 'Type Hanzi (e.g. 你好)'
                  }
                  className={`flex-1 bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none ${
                    stepCompleted
                      ? dictationResult?.isValid
                        ? 'border-emerald-400 bg-emerald-950/30 text-emerald-200'
                        : 'border-rose-500 bg-rose-950/30 text-rose-200'
                      : 'border-slate-700 focus:border-emerald-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={stepCompleted || !dictationInput.trim()}
                  className="game-btn-3d px-4 py-2.5 rounded-xl bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs"
                >
                  Submit
                </button>
              </div>
              {dictationSubMode === 'pinyin' && (
                <p className="text-[11px] text-slate-400 font-semibold">
                  Tones required: include tone marks (nǐ hǎo) or tone numbers (ni3 hao3). Sandhi & neutral tones accepted.
                </p>
              )}
            </form>

            {dictationResult && (
              <div
                className={`rounded-xl p-3 border text-xs space-y-2 ${
                  dictationResult.isValid
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                }`}
              >
                <div>
                  <p className="font-black">
                    {dictationResult.isValid
                      ? `✓ Correct! (${dictationResult.matchType})`
                      : `✗ Incorrect — Correct answer: ${currentWord.hanzi} (${currentWord.pinyin})`}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">{dictationResult.feedback}</p>
                </div>
                <div className="pt-1 border-t border-white/10">
                  <ChaoToneVisualizer
                    pinyin={currentWord.pinyin}
                    hanzi={currentWord.hanzi}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODALITY 4: SPEAKING (PRONUNCIATION) */}
        {currentModality === 'speaking' && (
          <div className="my-auto rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase text-sky-300">
                Oral Pronunciation Check
              </span>
              <div className="flex items-center gap-1.5">
                {hideSpeakingPinyin && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setShowPinyinHint(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-[10px] font-bold text-amber-300"
                  >
                    Show Pinyin Hint
                  </button>
                )}
                <MandarinAudioControls
                  text={currentWord.hanzi}
                  isSlowMode={isSlowMode}
                  onSetSlowMode={onSetSlowMode}
                  speakMandarin={speakMandarin}
                  speakingState={speakingState}
                  size="sm"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-center space-y-2">
              <div className="font-hanzi text-4xl font-black text-white">
                {hideSpeakingHanzi ? '？'.repeat(currentWord.chars?.length || 1) : currentWord.hanzi}
              </div>
              {!hideSpeakingPinyin && (
                <>
                  <div className="font-pinyin text-rose-400">{currentWord.pinyin}</div>
                  <ChaoToneVisualizer
                    pinyin={currentWord.pinyin}
                    hanzi={currentWord.hanzi}
                    compact
                  />
                </>
              )}
              <p className="font-clarity text-[15px] text-slate-300">{currentWord.meaning || currentWord.english}</p>
            </div>

            <button
              type="button"
              onClick={handleStartSpeakingCheck}
              disabled={isRecording || stepCompleted}
              className={`game-btn-3d w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : similarityData && similarityData.score >= 50
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : similarityData
                  ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>
                {isRecording
                  ? 'Listening (zh-CN)... Speak now!'
                  : stepCompleted
                  ? similarityData?.score >= 50 || speakingSkipped
                    ? '✓ Completed!'
                    : `✗ Evaluated — Target: ${currentWord.hanzi} (${currentWord.pinyin})`
                  : hideSpeakingHanzi
                  ? 'Tap & Speak the Mandarin word'
                  : `Tap & Speak "${currentWord.hanzi}"`}
              </span>
            </button>

            {similarityData && (
              <div
                className={`rounded-xl p-3 text-xs space-y-1 border ${
                  similarityData.score >= 50
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    Heard: <strong className="text-white font-hanzi">"{recognizedText || similarityData.matchedText}"</strong>
                  </span>
                  <span className="font-black">{similarityData.score}% Match</span>
                </div>
                <p className="text-[11px] font-bold">
                  {similarityData.score >= 50
                    ? `✓ Correct! ${similarityData.feedback}`
                    : `✗ Incorrect — Correct answer: ${currentWord.hanzi} (${currentWord.pinyin})`}
                </p>
              </div>
            )}

            {micErrorMsg && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-[11px] text-amber-200">
                {micErrorMsg}
              </div>
            )}

            {!speakingSkipped && !stepCompleted && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setSpeakingSkipped(true);
                  setStepCompleted(true);
                  scheduleNextQueueItem(1400, bonusXp, maxCombo);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Skip / Can't speak right now</span>
              </button>
            )}
          </div>
        )}

        {/* MODALITY 5: SENTENCE BUILDER (WORD ORDER PUZZLE) */}
        {currentModality === 'sentence_builder' && (
          <div
            className={`my-auto rounded-3xl bg-slate-800/90 border p-4 space-y-3.5 shadow-xl transition-all ${
              cardAnim === 'wrong'
                ? 'border-rose-500 animate-game-shake'
                : cardAnim === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : 'border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Sentence Builder • Word Order
              </span>
              <div className="flex items-center gap-1.5">
                {masteryLv >= 4 && !stepCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setShowPinyinHint((prev) => !prev);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 border border-amber-500/40 text-[10px] font-bold text-amber-300"
                  >
                    {showPinyinHint ? 'Hide Pinyin' : 'Show Pinyin Hint'}
                  </button>
                )}
                <MandarinAudioControls
                  text={sentencePuzzle.cleanSentence}
                  isSlowMode={isSlowMode}
                  onSetSlowMode={onSetSlowMode}
                  speakMandarin={speakMandarin}
                  speakingState={speakingState}
                  size="sm"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950/85 border border-slate-800 p-3.5 space-y-1">
              <span className="font-clarity text-xs font-bold uppercase text-amber-400 block">
                Build this Mandarin sentence (Focus:{' '}
                <span className="font-hanzi">{currentWord.hanzi}</span>
                {showSentenceBuilderPinyin ? ` • ${currentWord.pinyin}` : ''}):
              </span>
              <p className="font-clarity text-[16px] font-black text-white">
                "{sentencePuzzle.englishTranslation}"
              </p>
              {showSentenceBuilderPinyin && (
                <p className="font-pinyin text-rose-300 pt-0.5">
                  {sentencePuzzle.pinyinHint}
                </p>
              )}
            </div>

            <div className="min-h-[68px] rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 p-3 flex items-center flex-wrap gap-2">
              {selectedSentenceTiles.length === 0 ? (
                <span className="text-xs text-slate-500 font-semibold mx-auto">
                  Tap the shuffled Chinese word tiles below in the correct order...
                </span>
              ) : (
                selectedSentenceTiles.map((tile) => (
                  <button
                    key={tile.tileId}
                    type="button"
                    disabled={stepCompleted}
                    onClick={() => handleRemovePlacedTile(tile)}
                    className={`game-btn-3d px-3.5 py-2 rounded-xl font-black text-base border shadow transition-all flex flex-col items-center ${
                      sentenceCheckStatus === 'correct'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                        : sentenceCheckStatus === 'wrong'
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                        : 'bg-purple-600 text-white border-purple-400'
                    }`}
                  >
                    <span className="font-hanzi">{tile.text}</span>
                    {showSentenceBuilderPinyin && tile.pinyin && (
                      <span className="font-clarity text-xs font-bold text-purple-200 leading-tight">
                        {tile.pinyin}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">
                  Available Word Tiles
                </span>
                {selectedSentenceTiles.length > 0 && !stepCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setSelectedSentenceTiles([]);
                      setSentenceCheckStatus(null);
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Tray</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center flex-wrap gap-2 py-1">
                {sentencePuzzle.shuffledTiles.map((tile) => {
                  const isPlaced = selectedSentenceTiles.some(
                    (t) => t.tileId === tile.tileId
                  );
                  return (
                    <button
                      key={tile.tileId}
                      type="button"
                      disabled={isPlaced || stepCompleted}
                      onClick={() => handleTapAvailableTile(tile)}
                      className={`game-btn-3d px-4 py-2.5 rounded-2xl font-black text-lg border-b-4 transition-all flex flex-col items-center ${
                        isPlaced
                          ? 'bg-slate-900 border-slate-950 text-slate-700 opacity-35 scale-95'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-950 text-white border border-slate-700 shadow-md'
                      }`}
                    >
                      <span className="font-hanzi">{tile.text}</span>
                      {showSentenceBuilderPinyin && tile.pinyin && (
                        <span className="font-clarity text-xs font-bold text-rose-300 leading-tight mt-0.5">
                          {tile.pinyin}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {sentenceCheckStatus === 'correct' && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/50 p-3 text-xs text-emerald-200 flex items-center justify-between">
                <div>
                  <p className="font-black">✓ Correct! Perfect Mandarin Word Order</p>
                  <p className="font-hanzi text-[11px] text-emerald-100 mt-0.5">
                    {sentencePuzzle.targetHanziSentence}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
            )}

            {sentenceCheckStatus === 'wrong' && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-400/50 p-3 text-xs text-rose-200 flex items-center justify-between gap-2">
                <div>
                  <p className="font-black">
                    ✗ Incorrect — Correct answer: <span className="font-hanzi">{sentencePuzzle.targetHanziSentence}</span>
                  </p>
                  <p className="text-[11px] text-emerald-300 font-bold mt-0.5">
                    {sentencePuzzle.pinyinHint}
                  </p>
                </div>
                <X className="w-5 h-5 text-rose-400 shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* MODALITY 6: FILL-IN-THE-BLANK (选词填空 CLOZE EXERCISE) */}
        {currentModality === 'cloze' && (
          <ClozeExerciseCard
            word={currentWord}
            masteryLv={masteryLv}
            lessonPool={lessonWordPool}
            seed={stepIdx}
            selectedOptionId={clozeSelectedId}
            isCompleted={stepCompleted}
            cardAnim={cardAnim}
            isSlowMode={isSlowMode}
            onSetSlowMode={onSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            onSelectOption={(opt, clozeData) => {
              if (stepCompleted) return;
              setClozeSelectedId(opt.id);
              setStepCompleted(true);
              if (opt.isCorrect) {
                setCardAnim('correct');
                setTimeout(() => setCardAnim('idle'), 500);
                onRecordSkillEvent?.(currentWord, 'cloze', {
                  mistakesDelta: 0,
                  completionsDelta: 1
                });
                const { nextBonus, nextMax } = awardComboXp(5);
                speakMandarin(clozeData.mandarinSentence);
                scheduleNextQueueItem(1400, nextBonus, nextMax);
              } else {
                registerMistakeFeedback();
                onRecordSkillEvent?.(currentWord, 'cloze', {
                  mistakesDelta: 1,
                  completionsDelta: 0
                });
                scheduleNextQueueItem(1800, bonusXp, maxCombo);
              }
            }}
          />
        )}

        <div className="pt-1 text-center text-[11px] font-bold text-slate-400">
          {stepCompleted
            ? 'Auto-advancing to next item...'
            : `Complete the ${modalityInfo.shortLabel} prompt above`}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 60-SECOND BLITZ MATCH MINI-GAME MODAL (4x4 PAIRS + +2s / -2s)
// ============================================================================
const SUPPLEMENTAL_BLITZ_WORDS = [
  ...UNIT_1_WORDS,
  normalizeWordEntry({
    id: 'blitz_pengyou',
    hanzi: '朋友',
    pinyin: 'péngyou',
    meaning: 'Friend / Companion'
  })
];

export function BlitzMatchModal({
  words = UNIT_1_WORDS,
  speakMandarin,
  onRecordStudySeconds,
  onClose,
  onComplete
}) {
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(true, onRecordStudySeconds);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timeDeltaBanner, setTimeDeltaBanner] = useState(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [scoreXp, setScoreXp] = useState(0);
  const [totalPairsMatched, setTotalPairsMatched] = useState(0);
  const [matchedWordsHistory, setMatchedWordsHistory] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);

  const [leftCards, setLeftCards] = useState([]);
  const [rightCards, setRightCards] = useState([]);
  const [clearedPairIds, setClearedPairIds] = useState([]);
  const [selectedLeftId, setSelectedLeftId] = useState(null);
  const [selectedRightId, setSelectedRightId] = useState(null);
  const [mismatchPair, setMismatchPair] = useState(null);

  const fullPool = useMemo(() => {
    const map = new window.Map();
    words.forEach((w) => {
      if (w?.hanzi) map.set(w.hanzi, w);
    });
    SUPPLEMENTAL_BLITZ_WORDS.forEach((w) => {
      if (w?.hanzi && !map.has(w.hanzi)) map.set(w.hanzi, w);
    });
    return Array.from(map.values());
  }, [words]);

  const dealFourPairsBoard = useCallback(() => {
    const shuffledPool = [...fullPool].sort(() => Math.random() - 0.5);
    const chosenFour = shuffledPool.slice(0, 4);

    const left = chosenFour
      .map((w, idx) => ({
        pairId: `pair_${w.hanzi}_${idx}`,
        word: w,
        hanzi: w.hanzi
      }))
      .sort(() => Math.random() - 0.5);

    const right = left
      .map((item) => ({
        pairId: item.pairId,
        word: item.word,
        pinyin: item.word.pinyin,
        meaningShort: (item.word.meaning || item.word.english || '').split(/[;/]/)[0].trim()
      }))
      .sort(() => Math.random() - 0.5);

    setLeftCards(left);
    setRightCards(right);
    setClearedPairIds([]);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMismatchPair(null);
  }, [fullPool]);

  useEffect(() => {
    dealFourPairsBoard();
  }, [dealFourPairsBoard]);

  useEffect(() => {
    if (gameEnded) return;
    if (timeLeft <= 0) {
      setGameEnded(true);
      soundFX.playVictory();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameEnded]);

  const evaluateSelection = useCallback(
    (leftId, rightId) => {
      if (!leftId || !rightId) return;

      if (leftId === rightId) {
        const matchedItem = leftCards.find((c) => c.pairId === leftId);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        soundFX.playCorrect(nextCombo);

        if (matchedItem?.word) {
          speakMandarin(matchedItem.word.hanzi);
          setMatchedWordsHistory((prev) =>
            prev.some((w) => w.hanzi === matchedItem.word.hanzi)
              ? prev
              : [...prev, matchedItem.word]
          );
        }

        const comboBonus = nextCombo >= 2 ? Math.min(3, nextCombo - 1) : 0;
        const earnedXp = 5 + comboBonus;
        setScoreXp((x) => x + earnedXp);
        setTotalPairsMatched((c) => c + 1);
        setTimeLeft((t) => t + 2);
        setTimeDeltaBanner({ id: Date.now(), text: '+2s', positive: true });

        const nextCleared = [...clearedPairIds, leftId];
        setClearedPairIds(nextCleared);
        setSelectedLeftId(null);
        setSelectedRightId(null);

        if (nextCleared.length >= leftCards.length) {
          setTimeout(() => {
            dealFourPairsBoard();
          }, 320);
        }
      } else {
        soundFX.playMistake();
        setCombo(0);
        setTimeLeft((t) => Math.max(0, t - 2));
        setTimeDeltaBanner({ id: Date.now(), text: '-2s', positive: false });
        setMismatchPair({ leftId, rightId });

        setTimeout(() => {
          setMismatchPair(null);
          setSelectedLeftId(null);
          setSelectedRightId(null);
        }, 460);
      }
    },
    [clearedPairIds, combo, dealFourPairsBoard, leftCards, speakMandarin]
  );

  const handleSelectLeft = (pairId) => {
    if (gameEnded || clearedPairIds.includes(pairId) || mismatchPair) return;
    soundFX.playPop();
    const card = leftCards.find((c) => c.pairId === pairId);
    if (card) speakMandarin(card.hanzi);
    setSelectedLeftId(pairId);
    if (selectedRightId) {
      evaluateSelection(pairId, selectedRightId);
    }
  };

  const handleSelectRight = (pairId) => {
    if (gameEnded || clearedPairIds.includes(pairId) || mismatchPair) return;
    soundFX.playPop();
    setSelectedRightId(pairId);
    if (selectedLeftId) {
      evaluateSelection(selectedLeftId, pairId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center">
      <div className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto">
        <div className="space-y-3 border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                flushSessionTime();
                onClose();
              }}
              className="game-btn-3d p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block truncate">
                60s Blitz Match
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Match Pair = +2s • Miss = -2s
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <SessionTimerBadge seconds={elapsedSeconds} />
              <div className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{combo}x</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-xl font-black text-sm flex items-center gap-1.5 border ${
                  timeLeft <= 10
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 animate-pulse'
                    : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>

              {timeDeltaBanner && (
                <span
                  key={timeDeltaBanner.id}
                  className={`text-xs font-black px-2 py-0.5 rounded-full animate-bounce ${
                    timeDeltaBanner.positive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                  }`}
                >
                  {timeDeltaBanner.text}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs font-black">
              <span className="text-slate-300">
                Pairs: <strong className="text-white">{totalPairsMatched}</strong>
              </span>
              <span className="text-amber-300">+{scoreXp} XP</span>
            </div>
          </div>
        </div>

        {!gameEnded ? (
          <div className="my-auto py-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: 4 Hanzi Cards */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block text-center">
                  Hanzi
                </span>
                {leftCards.map((card) => {
                  const isCleared = clearedPairIds.includes(card.pairId);
                  const isSelected = selectedLeftId === card.pairId;
                  const isWrong = mismatchPair?.leftId === card.pairId;

                  return (
                    <button
                      key={`left_${card.pairId}`}
                      type="button"
                      disabled={isCleared}
                      onClick={() => handleSelectLeft(card.pairId)}
                      className={`game-btn-3d font-hanzi w-full h-24 rounded-2xl border-2 font-black text-2xl flex items-center justify-center transition-all ${
                        isCleared
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/30 opacity-30 scale-95'
                          : isWrong
                          ? 'bg-rose-600/30 border-rose-500 text-rose-200 animate-game-shake'
                          : isSelected
                          ? 'bg-rose-500/25 border-rose-400 text-white scale-[1.03] shadow-lg shadow-rose-950/60'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-white'
                      }`}
                    >
                      {isCleared ? <Check className="w-6 h-6 text-emerald-400" /> : card.hanzi}
                    </button>
                  );
                })}
              </div>

              {/* Right Column: 4 Shuffled Meaning / Pinyin Cards */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block text-center">
                  Meaning & Pinyin
                </span>
                {rightCards.map((card) => {
                  const isCleared = clearedPairIds.includes(card.pairId);
                  const isSelected = selectedRightId === card.pairId;
                  const isWrong = mismatchPair?.rightId === card.pairId;

                  return (
                    <button
                      key={`right_${card.pairId}`}
                      type="button"
                      disabled={isCleared}
                      onClick={() => handleSelectRight(card.pairId)}
                      className={`game-btn-3d w-full h-24 rounded-2xl border-2 p-2.5 flex flex-col items-center justify-center text-center transition-all ${
                        isCleared
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/30 opacity-30 scale-95'
                          : isWrong
                          ? 'bg-rose-600/30 border-rose-500 text-rose-200 animate-game-shake'
                          : isSelected
                          ? 'bg-sky-500/25 border-sky-400 text-white scale-[1.03] shadow-lg shadow-sky-950/60'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100'
                      }`}
                    >
                      {isCleared ? (
                        <Check className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <>
                          <span className="font-clarity text-[16px] font-extrabold text-rose-300">
                            {card.pinyin}
                          </span>
                          <span className="font-clarity text-sm font-bold text-white line-clamp-2 mt-0.5">
                            {card.meaningShort}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="my-auto rounded-3xl bg-gradient-to-b from-amber-900/40 to-slate-800 border border-amber-400/50 p-6 text-center space-y-4 animate-game-green-pulse">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-black text-white">60s Blitz Complete!</h2>
            <p className="text-xs text-slate-300">
              You matched <strong className="text-emerald-400">{totalPairsMatched} pairs</strong> with a{' '}
              <strong className="text-amber-300">{maxCombo}x max combo</strong>!
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(60);
                  setCombo(0);
                  setScoreXp(0);
                  setTotalPairsMatched(0);
                  setGameEnded(false);
                  dealFourPairsBoard();
                }}
                className="game-btn-3d flex-1 py-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => {
                  flushSessionTime();
                  onComplete(matchedWordsHistory, Math.max(25, scoreXp), maxCombo);
                }}
                className="game-btn-3d flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs border-b-4 border-rose-800"
              >
                Claim +{Math.max(25, scoreXp)} XP
              </button>
            </div>
          </div>
        )}

        {!gameEnded && (
          <button
            type="button"
            onClick={() => setGameEnded(true)}
            className="game-btn-3d w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300"
          >
            Finish Blitz & Claim XP ({scoreXp} XP)
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STROKE ORDER RULES DOJO: INLINE EXAMPLE ANIMATION PLAYER & 2-STEP UNSEEN QUIZ MODAL
// ============================================================================
export function RuleExampleMiniPlayer({ rule, speakMandarin }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [scriptStatus, setScriptStatus] = useState('loading');
  const [strokeCount, setStrokeCount] = useState(null);
  const containerRef = useRef(null);
  const writerRef = useRef(null);

  const currentExample = rule.learnedChars[selectedIdx] || rule.learnedChars[0];

  useEffect(() => {
    let mounted = true;
    loadHanziWriterScript()
      .then(() => {
        if (mounted) setScriptStatus('ready');
      })
      .catch(() => {
        if (mounted) setScriptStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (scriptStatus !== 'ready' || !containerRef.current || !window.HanziWriter) return;
    const containerEl = containerRef.current;
    containerEl.innerHTML = '';
    writerRef.current = null;

    speakMandarin(currentExample.char);

    const writer = window.HanziWriter.create(containerEl, currentExample.char, {
      width: 164,
      height: 164,
      padding: 14,
      showOutline: true,
      showCharacter: true,
      strokeAnimationSpeed: 1.05,
      delayBetweenStrokes: 200,
      strokeColor: '#f8fafc',
      radicalColor: '#dc2626',
      outlineColor: '#334155',
      onLoadCharDataSuccess: (data) => {
        setStrokeCount(Array.isArray(data.strokes) ? data.strokes.length : null);
        setTimeout(() => {
          if (writerRef.current === writer) {
            writer.animateCharacter();
          }
        }, 140);
      }
    });

    writerRef.current = writer;

    return () => {
      if (containerEl) containerEl.innerHTML = '';
      writerRef.current = null;
    };
  }, [scriptStatus, currentExample.char, speakMandarin]);

  return (
    <div className="rounded-2xl bg-slate-950/90 border border-amber-500/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {rule.learnedChars.map((item, idx) => (
            <button
              key={item.char}
              type="button"
              onClick={() => {
                soundFX.playPop();
                setSelectedIdx(idx);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                selectedIdx === idx
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <span className="font-hanzi">{item.char}</span> ({item.pinyin})
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            soundFX.playPop();
            writerRef.current?.animateCharacter();
          }}
          className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Replay</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-[168px] h-[168px] rounded-2xl bg-slate-900 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden">
          <svg
            viewBox="0 0 168 168"
            className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          >
            <rect x="4" y="4" width="160" height="160" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="4" y1="84" x2="164" y2="84" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="84" y1="4" x2="84" y2="164" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="4" y1="4" x2="164" y2="164" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="4" y1="164" x2="164" y2="4" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
          <div ref={containerRef} className="relative z-10 w-[164px] h-[164px]" />
        </div>

        <div className="space-y-1.5 text-xs min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-hanzi text-2xl font-black text-white">{currentExample.char}</span>
            <span className="font-bold text-rose-400">{currentExample.pinyin}</span>
          </div>
          <p className="text-emerald-300 font-bold">{currentExample.meaning}</p>
          <p className="text-[11px] text-slate-400">
            {strokeCount ? `${strokeCount} strokes total` : 'Loading strokes...'}
          </p>
          <p className="text-[10px] text-amber-300/90 leading-snug">
            Notice how <strong className="font-hanzi">{rule.chineseRule}</strong> guides the stroke sequence.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StrokeRuleIntuitionModal({
  rule,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onRecordStudySeconds,
  onClose,
  onCompleteRule
}) {
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(true, onRecordStudySeconds);
  const unseenList = rule?.unseenChars || [];
  const [charIdx, setCharIdx] = useState(0);
  const [quizStep, setQuizStep] = useState(1);
  const [scriptStatus, setScriptStatus] = useState('loading');
  const [modeStatus, setModeStatus] = useState('quiz');
  const [strokeStats, setStrokeStats] = useState({
    completedStrokes: 0,
    totalStrokes: 0,
    mistakesOnCurrent: 0,
    totalMistakes: 0,
    hintTriggered: false
  });
  const [completedCharIndices, setCompletedCharIndices] = useState([]);
  const [boardFeedback, setBoardFeedback] = useState('idle');

  const writerTargetRef = useRef(null);
  const writerInstanceRef = useRef(null);
  const transitionTimerRef = useRef(null);

  const currentChallenge = unseenList[charIdx] || unseenList[0];
  const currentChar = currentChallenge?.char || '干';
  const showOutlineForStep = quizStep === 1;
  const hintMissThreshold = quizStep === 1 ? 2 : 3;

  useEffect(() => {
    let mounted = true;
    loadHanziWriterScript()
      .then(() => {
        if (mounted) setScriptStatus('ready');
      })
      .catch(() => {
        if (mounted) setScriptStatus('error');
      });
    return () => {
      mounted = false;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    speakMandarin(currentChar);
  }, [charIdx, currentChar, speakMandarin]);

  const startTwoStepQuiz = useCallback(
    (writer, targetStep = quizStep) => {
      const activeWriter = writer || writerInstanceRef.current;
      if (!activeWriter) return;

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }

      const isStep1Trace = targetStep === 1;
      const missesAllowed = isStep1Trace ? 2 : 3;

      setModeStatus('quiz');
      setStrokeStats((prev) => ({
        ...prev,
        completedStrokes: 0,
        mistakesOnCurrent: 0,
        totalMistakes: 0,
        hintTriggered: false
      }));

      activeWriter.hideCharacter();
      if (isStep1Trace) {
        activeWriter.showOutline();
      } else {
        activeWriter.hideOutline();
      }

      activeWriter.quiz({
        showHintAfterMisses: missesAllowed,
        highlightOnComplete: true,
        onMistake: (strokeData) => {
          soundFX.playMistake();
          setBoardFeedback('wrong');
          setTimeout(() => setBoardFeedback('idle'), 450);
          setStrokeStats((prev) => ({
            ...prev,
            mistakesOnCurrent: strokeData.mistakesOnStroke,
            totalMistakes: strokeData.totalMistakes,
            hintTriggered: strokeData.mistakesOnStroke >= missesAllowed
          }));
        },
        onCorrectStroke: (strokeData) => {
          const done = strokeData.strokeNum + 1;
          const total = done + strokeData.strokesRemaining;
          soundFX.playCorrect(done);
          setStrokeStats({
            completedStrokes: done,
            totalStrokes: total,
            mistakesOnCurrent: 0,
            totalMistakes: strokeData.totalMistakes,
            hintTriggered: false
          });
        },
        onComplete: (summaryData) => {
          setBoardFeedback('correct');
          setTimeout(() => setBoardFeedback('idle'), 500);
          setStrokeStats((prev) => ({
            ...prev,
            completedStrokes: prev.totalStrokes || prev.completedStrokes,
            mistakesOnCurrent: 0,
            totalMistakes: summaryData.totalMistakes,
            hintTriggered: false
          }));

          if (targetStep === 1) {
            soundFX.playCorrect(3);
            setModeStatus('step_transition');
            transitionTimerRef.current = setTimeout(() => {
              setQuizStep(2);
            }, 620);
          } else {
            soundFX.playVictory();
            setModeStatus('char_done');
            setCompletedCharIndices((prev) =>
              prev.includes(charIdx) ? prev : [...prev, charIdx]
            );
          }
        }
      });
    },
    [charIdx, quizStep]
  );

  useEffect(() => {
    if (scriptStatus !== 'ready' || !writerTargetRef.current || !window.HanziWriter) return;
    const containerEl = writerTargetRef.current;

    if (writerInstanceRef.current?.cancelQuiz) {
      try {
        writerInstanceRef.current.cancelQuiz();
      } catch (e) {
        // Ignore
      }
    }
    containerEl.innerHTML = '';
    writerInstanceRef.current = null;

    const writer = window.HanziWriter.create(containerEl, currentChar, {
      width: 240,
      height: 240,
      padding: 18,
      showOutline: showOutlineForStep,
      showCharacter: false,
      strokeAnimationSpeed: 1.1,
      delayBetweenStrokes: 160,
      strokeColor: '#f8fafc',
      radicalColor: '#dc2626',
      outlineColor: '#334155',
      drawingColor: '#f43f5e',
      drawingWidth: 24,
      leniency: 1.55,
      highlightColor: '#38bdf8',
      showHintAfterMisses: hintMissThreshold,
      highlightOnComplete: true,
      onLoadCharDataSuccess: (charData) => {
        const radStrokes = Array.isArray(charData.radStrokes) ? charData.radStrokes : [];
        setStrokeStats({
          completedStrokes: 0,
          totalStrokes: charData.strokes.length,
          mistakesOnCurrent: 0,
          totalMistakes: 0,
          hintTriggered: false
        });
        if (writerInstanceRef.current === writer) {
          startTwoStepQuiz(writer, quizStep);
          if (quizStep === 1 && radStrokes.length > 0) {
            setTimeout(() => {
              highlightRadicalOutlineStrokes(containerEl, radStrokes, true);
            }, 40);
          }
        }
      }
    });

    writerInstanceRef.current = writer;

    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (writerInstanceRef.current?.cancelQuiz) {
        try {
          writerInstanceRef.current.cancelQuiz();
        } catch (e) {
          // Ignore
        }
      }
      if (containerEl) containerEl.innerHTML = '';
      if (writerTargetRef.current) writerTargetRef.current.innerHTML = '';
      writerInstanceRef.current = null;
    };
  }, [scriptStatus, charIdx, quizStep, currentChar, showOutlineForStep, hintMissThreshold, startTwoStepQuiz]);

  const handleWatchHintAnimation = () => {
    const writer = writerInstanceRef.current;
    if (!writer) return;
    soundFX.playPop();
    setModeStatus('animating');
    writer.cancelQuiz();
    writer.showOutline();
    writer.showCharacter();
    writer.animateCharacter({
      onComplete: () => {
        setTimeout(() => {
          if (writerInstanceRef.current === writer) {
            writer.hideCharacter();
            startTwoStepQuiz(writer, quizStep);
          }
        }, 420);
      }
    });
  };

  const isCurrentCharFinished =
    (quizStep === 2 && modeStatus === 'char_done') ||
    completedCharIndices.includes(charIdx);

  const handleNextOrFinish = () => {
    soundFX.playPop();
    if (charIdx < unseenList.length - 1) {
      setQuizStep(1);
      setCharIdx((prev) => prev + 1);
    } else {
      flushSessionTime();
      onCompleteRule(rule);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center">
      <div className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto">
        <div className="space-y-2.5 border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                flushSessionTime();
                onClose();
              }}
              className="game-btn-3d p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Rules</span>
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block truncate">
                Rule {rule.number} • <span className="font-hanzi">{rule.chineseRule}</span>
              </span>
              <span className="text-xs font-extrabold text-white block truncate">
                {rule.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <SessionTimerBadge seconds={elapsedSeconds} />
              <MandarinAudioControls
                text={currentChar}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/85 border border-slate-700 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase text-rose-400 block">
                Unseen Intuition Challenge ({charIdx + 1}/{unseenList.length})
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-hanzi text-2xl font-black text-white">{currentChallenge.char}</span>
                <span className="font-pinyin text-rose-300">{currentChallenge.pinyin}</span>
                <span className="font-clarity text-sm font-semibold text-emerald-300 truncate">
                  — {currentChallenge.meaning}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {unseenList.map((item, idx) => {
                const isDone = completedCharIndices.includes(idx);
                const isActive = idx === charIdx;
                return (
                  <button
                    key={item.char}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setQuizStep(isDone ? 2 : 1);
                      setCharIdx(idx);
                    }}
                    className={`font-hanzi w-10 h-10 rounded-xl font-black text-base border flex items-center justify-center relative ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : isDone
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{item.char}</span>
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 absolute -top-1 -right-1 bg-slate-900 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="my-auto flex flex-col items-center space-y-2.5 py-2">
          <div className="w-full max-w-[244px]">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setQuizStep(1);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  quizStep === 1 && !isCurrentCharFinished
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                    : quizStep > 1 || isCurrentCharFinished
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'text-slate-400 border-transparent'
                }`}
              >
                {(quizStep > 1 || isCurrentCharFinished) && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                <span>1. Ghost Trace</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quizStep === 2 || isCurrentCharFinished) {
                    soundFX.playPop();
                    setQuizStep(2);
                  }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  quizStep === 2 && !isCurrentCharFinished
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                    : isCurrentCharFinished
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                {isCurrentCharFinished && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                <span>2. Blind Memory</span>
              </button>
            </div>
          </div>

          <div className="w-full max-w-[244px] flex items-center justify-between">
            <button
              type="button"
              onClick={handleWatchHintAnimation}
              disabled={scriptStatus !== 'ready'}
              className="game-btn-3d px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Peek Animation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                startTwoStepQuiz(writerInstanceRef.current, quizStep);
              }}
              className="game-btn-3d px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div
            style={{ touchAction: 'none' }}
            className={`relative w-[244px] h-[244px] rounded-2xl bg-slate-950 border-2 shadow-2xl overflow-hidden select-none touch-none flex items-center justify-center transition-colors ${
              boardFeedback === 'wrong'
                ? 'border-rose-500 animate-game-shake'
                : boardFeedback === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : quizStep === 2
                ? 'border-emerald-500/50'
                : 'border-amber-500/50'
            }`}
          >
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
            >
              <rect x="6" y="6" width="228" height="228" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="6" y1="120" x2="234" y2="120" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 5" />
              <line x1="120" y1="6" x2="120" y2="234" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 5" />
              <line x1="6" y1="6" x2="234" y2="234" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" />
              <line x1="6" y1="234" x2="234" y2="6" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" />
            </svg>
            <div
              ref={writerTargetRef}
              style={{ touchAction: 'none' }}
              className="relative z-10 w-[240px] h-[240px] touch-none select-none cursor-crosshair"
            />
          </div>

          <div className="w-full max-w-[244px] rounded-2xl bg-slate-800/85 border border-slate-700 p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white">
                {quizStep === 1 ? 'Step 1: Ghost Trace' : 'Step 2: Blind Memory'}
              </span>
              <span className="font-black text-amber-400">
                {strokeStats.completedStrokes} / {strokeStats.totalStrokes || '?'} strokes
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {modeStatus === 'step_transition'
                ? '✓ Ghost Trace complete! Switching to Step 2: Blind Memory...'
                : isCurrentCharFinished
                ? `✓ Deduce & Write mastered for unseen character "${currentChar}"!`
                : `Apply "${rule.title}" (${rule.chineseRule}) to deduce the stroke order!`}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!isCurrentCharFinished}
          onClick={handleNextOrFinish}
          className="game-btn-3d w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs shadow-lg border-b-4 border-emerald-700 disabled:border-slate-900 flex items-center justify-center gap-2"
        >
          <span>
            {charIdx < unseenList.length - 1
              ? `Next Unseen Character: "${unseenList[charIdx + 1].char}"`
              : `Complete Rule ${rule.number} Dojo (+25 XP)`}
          </span>
          <ChevronRight className="w-4 h-4 stroke-[2.5px]" />
        </button>
      </div>
    </div>
  );
}
