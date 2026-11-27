import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  PenTool,
  RotateCcw,
  Sparkles,
  BookOpen,
  ScrollText,
  FlaskConical,
  AlertTriangle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { soundFX } from '../audio/soundEngine.js';
import { KNOWN_CHARACTER_INFO } from '../data/curriculumData.js';
import {
  loadHanziWriterScript,
  highlightRadicalOutlineStrokes,
  CJK_SINGLE_CHAR_REGEX,
  extractWritableCjkChars
} from '../utils/mandarinHelpers.js';
import {
  MandarinAudioControls,
  InteractiveExampleText
} from './SharedHudAndAudio.jsx';

// ============================================================================
// SHARED PHASE 4 HELPERS & DEFENSIVE FALLBACKS
// ============================================================================

function EmptyPhase4Fallback({ label = 'Exercise' }) {
  return (
    <div className="my-auto rounded-3xl bg-slate-800/90 border-2 border-slate-700 p-5 text-center space-y-2 shadow-xl">
      <div className="font-pixel-header text-[10px] uppercase text-amber-400">
        {label} Unavailable
      </div>
      <p className="font-clarity text-sm text-slate-300">
        Unlock a few more vocabulary words to generate this exercise.
      </p>
    </div>
  );
}

function getCardFrameClass(cardAnim, accentBorderClass) {
  if (cardAnim === 'wrong') return 'border-rose-500 animate-game-shake';
  if (cardAnim === 'correct') return 'border-emerald-400 animate-game-green-pulse';
  return accentBorderClass;
}

function extractHanziChars(targetWord) {
  return extractWritableCjkChars(targetWord);
}

function splitSentenceAroundTarget(sentence = '', targetHanzi = '') {
  const safeSentence = String(sentence || '').trim();
  const safeTarget = String(targetHanzi || '').trim();
  if (!safeSentence) return [{ type: 'text', value: '' }];
  if (!safeTarget || !safeSentence.includes(safeTarget)) {
    return [
      { type: 'text', value: safeSentence },
      { type: 'blank', value: safeTarget }
    ];
  }

  const parts = safeSentence.split(safeTarget);
  const segments = [];
  parts.forEach((part, idx) => {
    if (part) {
      segments.push({ type: 'text', value: part });
    }
    if (idx < parts.length - 1) {
      segments.push({ type: 'blank', value: safeTarget });
    }
  });
  return segments;
}

// ============================================================================
// 1. CONTEXTUAL WRITING CARD (CONTEXT DEDUCTION + HANZIWRITER — `contextual_writing`)
// ============================================================================
export function ContextualWritingCard({
  item,
  masteryLv = 0,
  masteryMap = {},
  courseWords = [],
  nodeLevel = 0,
  isCompleted = false,
  cardAnim = 'idle',
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onResult,
  onInspectOpenChange = null
}) {
  const targetWord = item?.targetWord || null;
  const targetHanzi = String(targetWord?.hanzi || '').trim();
  const targetChars = useMemo(() => extractHanziChars(targetWord), [targetWord]);
  const itemKey = `${item?.id || item?.hanzi || 'ctx_write'}_${targetHanzi}`;
  const showOutline = masteryLv <= 3 && nodeLevel === 0;

  const [scriptStatus, setScriptStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [charIndex, setCharIndex] = useState(0);
  const [completedCharIndices, setCompletedCharIndices] = useState([]);
  const [isWordFinished, setIsWordFinished] = useState(false);
  const [boardFeedback, setBoardFeedback] = useState('idle'); // 'idle' | 'correct' | 'wrong'
  const [touchNudgeMessage, setTouchNudgeMessage] = useState('');
  const [charMissCount, setCharMissCount] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [strokeStats, setStrokeStats] = useState({
    completedStrokes: 0,
    totalStrokes: 0,
    hintTriggered: false
  });
  const [charStrokeMeta, setCharStrokeMeta] = useState({
    strokeCount: null,
    radStrokes: []
  });
  const [quizResetKey, setQuizResetKey] = useState(0);

  const writerTargetRef = useRef(null);
  const writerInstanceRef = useRef(null);
  const charMissCountRef = useRef(0);
  const totalMistakesRef = useRef(0);
  const resultEmittedRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const liveCallbacksRef = useRef({ onResult, item });
  liveCallbacksRef.current = { onResult, item };

  const clearTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const triggerBoardFeedback = useCallback((type) => {
    setBoardFeedback(type);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setBoardFeedback('idle');
    }, 480);
  }, []);

  // Load HanziWriter v3.5 script once on mount
  const loadWriter = useCallback(() => {
    setScriptStatus('loading');
    return loadHanziWriterScript()
      .then(() => setScriptStatus('ready'))
      .catch(() => setScriptStatus('error'));
  }, []);

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
      clearTimers();
    };
  }, [clearTimers]);

  // Reset per-item state when item changes
  useEffect(() => {
    clearTimers();
    setCharIndex(0);
    setCompletedCharIndices([]);
    setIsWordFinished(false);
    setBoardFeedback('idle');
    setTouchNudgeMessage('');
    setCharMissCount(0);
    setTotalMistakes(0);
    setStrokeStats({ completedStrokes: 0, totalStrokes: 0, hintTriggered: false });
    setCharStrokeMeta({ strokeCount: null, radStrokes: [] });
    charMissCountRef.current = 0;
    totalMistakesRef.current = 0;
    resultEmittedRef.current = false;
    if (typeof onInspectOpenChange === 'function') {
      onInspectOpenChange(false);
    }
  }, [itemKey, clearTimers, onInspectOpenChange]);

  const currentChar = targetChars[charIndex] || '';
  const isLocked = Boolean(isCompleted || isWordFinished);
  const sentenceSegments = useMemo(
    () => splitSentenceAroundTarget(item?.hanzi, targetHanzi),
    [item?.hanzi, targetHanzi]
  );

  // Mount & start HanziWriter quiz for currentChar
  useEffect(() => {
    if (
      scriptStatus !== 'ready' ||
      !writerTargetRef.current ||
      !window.HanziWriter ||
      !currentChar ||
      !CJK_SINGLE_CHAR_REGEX.test(currentChar) ||
      isLocked
    ) {
      return;
    }

    const containerEl = writerTargetRef.current;

    if (writerInstanceRef.current?.cancelQuiz) {
      try {
        writerInstanceRef.current.cancelQuiz();
      } catch (e) {
        // Ignore stale quiz cancellation
      }
    }

    // Explicit cleanup before every HanziWriter.create() call to prevent duplicate SVGs
    containerEl.innerHTML = '';
    writerInstanceRef.current = null;
    charMissCountRef.current = 0;
    setCharMissCount(0);
    setTouchNudgeMessage('');

    let writer = null;
    try {
      writer = window.HanziWriter.create(containerEl, currentChar, {
        width: 240,
        height: 240,
        padding: 18,
        showOutline,
        showCharacter: false,
        strokeAnimationSpeed: 1.1,
        delayBetweenStrokes: 160,
        strokeColor: '#f8fafc',
        radicalColor: '#dc2626',
        outlineColor: '#334155',
        drawingColor: '#f43f5e',
        drawingWidth: 26,
        leniency: 1.85,
        highlightColor: '#38bdf8',
        showHintAfterMisses: false,
        highlightOnComplete: true,
        onLoadCharDataSuccess: (charData) => {
          const radStrokes = Array.isArray(charData?.radStrokes) ? charData.radStrokes : [];
          const totalCount = Array.isArray(charData?.strokes) ? charData.strokes.length : 0;
          setCharStrokeMeta({ strokeCount: totalCount, radStrokes });
          setStrokeStats({
            completedStrokes: 0,
            totalStrokes: totalCount,
            hintTriggered: false
          });

          if (writerInstanceRef.current !== writer) return;

          if (showOutline) {
            writer.showOutline();
            setTimeout(() => {
              highlightRadicalOutlineStrokes(containerEl, radStrokes, true);
            }, 40);
          } else {
            writer.hideOutline();
          }
          writer.hideCharacter();

          writer.quiz({
            showHintAfterMisses: false,
            highlightOnComplete: true,
            onMistake: (strokeData) => {
              const nextCharMiss = charMissCountRef.current + 1;
              charMissCountRef.current = nextCharMiss;
              setCharMissCount(nextCharMiss);

              // 3-strike touchscreen mistake buffer per character:
              // 1st & 2nd off-path touches show a subtle amber nudge without resetting combo or penalizing telemetry
              if (nextCharMiss < 3) {
                setTouchNudgeMessage(`Touch off-path (${nextCharMiss}/3) — try stroke again`);
                return;
              }

              // 3rd miss triggers stroke hint highlight & records 1 mistake once for this character
              setTouchNudgeMessage('');
              soundFX.playMistake();
              triggerBoardFeedback('wrong');

              if (nextCharMiss === 3) {
                totalMistakesRef.current += 1;
                setTotalMistakes(totalMistakesRef.current);
              }

              setStrokeStats((prev) => ({
                ...prev,
                hintTriggered: true
              }));

              if (
                writerInstanceRef.current === writer &&
                typeof strokeData?.strokeNum === 'number'
              ) {
                try {
                  writer.highlightStroke(strokeData.strokeNum);
                } catch (e) {
                  // Ignore if unmounted
                }
              }
            },
            onCorrectStroke: (strokeData) => {
              setTouchNudgeMessage('');
              const doneCount = (strokeData?.strokeNum ?? 0) + 1;
              const total = doneCount + (strokeData?.strokesRemaining ?? 0);
              soundFX.playCorrect(Math.min(doneCount, 5));
              setStrokeStats({
                completedStrokes: doneCount,
                totalStrokes: total,
                hintTriggered: false
              });
            },
            onComplete: () => {
              setTouchNudgeMessage('');
              triggerBoardFeedback('correct');
              soundFX.playCorrect(3);

              setCompletedCharIndices((prev) =>
                prev.includes(charIndex) ? prev : [...prev, charIndex]
              );

              const isFinalChar = charIndex >= targetChars.length - 1;
              if (!isFinalChar) {
                transitionTimerRef.current = setTimeout(() => {
                  setCharIndex((prev) => prev + 1);
                }, 520);
              } else {
                setIsWordFinished(true);
                if (!resultEmittedRef.current) {
                  resultEmittedRef.current = true;
                  const finalMistakes = totalMistakesRef.current;
                  const isCorrect = finalMistakes <= 1;
                  if (typeof liveCallbacksRef.current.onResult === 'function') {
                    liveCallbacksRef.current.onResult({
                      isCorrect,
                      totalMistakes: finalMistakes,
                      item: liveCallbacksRef.current.item
                    });
                  }
                }
              }
            }
          });
        }
      });
    } catch (e) {
      setScriptStatus('error');
      return;
    }

    writerInstanceRef.current = writer;

    return () => {
      clearTimers();
      if (writerInstanceRef.current?.cancelQuiz) {
        try {
          writerInstanceRef.current.cancelQuiz();
        } catch (e) {
          // Ignore
        }
      }
      if (containerEl) {
        containerEl.innerHTML = '';
      }
      writerInstanceRef.current = null;
    };
  }, [
    scriptStatus,
    currentChar,
    charIndex,
    targetChars.length,
    showOutline,
    isLocked,
    quizResetKey,
    clearTimers,
    triggerBoardFeedback
  ]);

  if (!item || typeof item !== 'object' || !item.hanzi || !targetWord || targetChars.length === 0) {
    return <EmptyPhase4Fallback label="Contextual Writing" />;
  }

  const missingGloss = targetWord.meaning || targetWord.english || '';
  const knownCharMeta = KNOWN_CHARACTER_INFO[currentChar] || null;
  const grammarTitle = item.grammarPoint?.title || item.title || '';
  const passedCleanly = totalMistakes <= 1;

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        'border-rose-500/50'
      )}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-rose-500/20 text-rose-300 border border-rose-400/50 font-pixel-header text-[9px] uppercase">
          <PenTool className="w-3.5 h-3.5 shrink-0" />
          <span>Context Write</span>
        </span>
        <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-amber-300 font-clarity text-[11px] font-bold">
          {showOutline ? 'Outline Guide' : 'Memory Recall'}
          {grammarTitle ? ` • ${grammarTitle}` : ''}
        </span>
      </div>

      {/* Strict Anti-Spoiler Context Prompt (NO target Hanzi, NO Pinyin, NO Audio before completion) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 text-center space-y-2">
        <span className="font-clarity text-xs font-bold uppercase tracking-wider text-rose-300 block">
          Write the missing word for [ ___ ]
        </span>

        <div className="font-hanzi text-xl font-black text-white leading-relaxed tracking-wide flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
          {sentenceSegments.map((seg, idx) => {
            if (seg.type === 'blank') {
              return isLocked ? (
                <span
                  key={`cw_seg_${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 font-hanzi"
                >
                  {targetHanzi}
                </span>
              ) : (
                <span
                  key={`cw_seg_${idx}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] bg-rose-500/15 border-2 border-dashed border-rose-400 text-rose-300 font-clarity text-sm font-black"
                >
                  [ ___ ]
                </span>
              );
            }
            return (
              <span key={`cw_seg_${idx}`} className="font-hanzi">
                {seg.value}
              </span>
            );
          })}
        </div>

        {item.english ? (
          <p className="font-clarity text-sm font-semibold text-slate-300 leading-snug pt-1 border-t border-slate-800/80">
            “{item.english}”
          </p>
        ) : null}

        {missingGloss ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-500/15 border border-amber-400/40 text-amber-200 font-clarity text-xs font-bold">
            <span className="text-amber-400 uppercase text-[10px]">Missing Word:</span>
            <span>{missingGloss}</span>
          </div>
        ) : null}
      </div>

      {/* Active Drawing Section (Hidden after completion) */}
      {!isLocked && (
        <div className="flex flex-col items-center space-y-2.5">
          {/* Character Progress Slots (Masks uncompleted characters to prevent spoiler) */}
          <div className="w-full max-w-[244px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {targetChars.map((ch, idx) => {
                const isDone = completedCharIndices.includes(idx);
                const isActive = idx === charIndex;
                const isLockedSlot = idx > charIndex && !isDone;
                return (
                  <div
                    key={`cw_slot_${idx}`}
                    className={`w-9 h-9 rounded-[2px] border-2 flex items-center justify-center relative font-hanzi text-base font-black ${
                      isDone
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : isActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}
                  >
                    <span>{isDone ? ch : '?'}</span>
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 absolute -top-1.5 -right-1.5 bg-slate-950 rounded-full" />
                    )}
                    {isLockedSlot && (
                      <Lock className="w-2.5 h-2.5 text-slate-500 absolute -top-1 -right-1 bg-slate-950 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                setQuizResetKey((k) => k + 1);
              }}
              disabled={scriptStatus !== 'ready'}
              className="game-btn-3d px-2.5 py-1.5 rounded-[2px] bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 font-pixel-ui text-[9px] uppercase flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>

          {/* Stroke Progress & Radical Strip */}
          <div className="w-full max-w-[244px] px-2.5 py-1.5 rounded-[2px] bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-[11px] font-clarity">
            <span className="font-bold text-slate-200">
              Char {charIndex + 1}/{targetChars.length} • Stroke{' '}
              {strokeStats.completedStrokes}/{charStrokeMeta.strokeCount || strokeStats.totalStrokes || '?'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-300 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: '#dc2626' }}
              />
              <span className="font-hanzi truncate">
                {knownCharMeta?.radical ? `Rad: ${knownCharMeta.radical}` : 'Radical'}
              </span>
            </span>
          </div>

          {/* 240x240 Mi Zi Ge HanziWriter Canvas */}
          <div
            style={{ touchAction: 'none' }}
            className={`relative w-[244px] h-[244px] rounded-2xl bg-slate-950 border-2 shadow-2xl overflow-hidden select-none touch-none flex items-center justify-center transition-colors ${
              boardFeedback === 'wrong'
                ? 'border-rose-500 bg-rose-950/20 animate-game-shake'
                : boardFeedback === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : touchNudgeMessage
                ? 'border-amber-400/80'
                : showOutline
                ? 'border-sky-500/60'
                : 'border-rose-500/50'
            }`}
          >
            {/* 米字格 Guide Grid */}
            <svg
              viewBox="0 0 240 240"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
            >
              <rect
                x="6"
                y="6"
                width="228"
                height="228"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <line
                x1="6"
                y1="120"
                x2="234"
                y2="120"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="6 5"
              />
              <line
                x1="120"
                y1="6"
                x2="120"
                y2="234"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="6 5"
              />
              <line
                x1="6"
                y1="6"
                x2="234"
                y2="234"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="6 6"
              />
              <line
                x1="234"
                y1="6"
                x2="6"
                y2="234"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="6 6"
              />
            </svg>

            {scriptStatus === 'loading' && (
              <div className="z-10 text-center space-y-1.5 px-4">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                <p className="font-clarity text-xs font-bold text-slate-400">
                  Loading stroke engine...
                </p>
              </div>
            )}

            {scriptStatus === 'error' && (
              <div className="z-10 text-center space-y-2 px-4">
                <p className="font-clarity text-xs font-bold text-rose-300">
                  Stroke data unavailable offline for this character.
                </p>
                <button
                  type="button"
                  onClick={loadWriter}
                  className="game-btn-3d px-3 py-1.5 rounded-[2px] bg-amber-500/20 border-amber-400 text-amber-200 font-pixel-ui text-[9px] uppercase cursor-pointer"
                >
                  Retry Load
                </button>
              </div>
            )}

            <div
              ref={writerTargetRef}
              className="w-[240px] h-[240px] relative z-10 touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* 3-Strike Touch Nudge / Mistake Counter Strip */}
          <div className="w-full max-w-[244px] min-h-[26px] flex items-center justify-center text-center">
            {touchNudgeMessage ? (
              <span className="px-2.5 py-1 rounded-[2px] bg-amber-500/15 border border-amber-400/50 text-amber-200 font-clarity text-[11px] font-bold">
                {touchNudgeMessage}
              </span>
            ) : strokeStats.hintTriggered ? (
              <span className="px-2.5 py-1 rounded-[2px] bg-sky-500/15 border border-sky-400/50 text-sky-200 font-clarity text-[11px] font-bold">
                Follow the blue highlighted stroke
              </span>
            ) : (
              <span className="font-clarity text-[11px] font-semibold text-slate-400">
                Draw character {charIndex + 1} of {targetChars.length} inside the grid
                {charMissCount > 0 ? ` • Buffer ${Math.min(charMissCount, 3)}/3` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Post-Answer Reveal: Full Sentence, Full Pinyin, Audio Controls & Character Inspector */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 flex items-center justify-between gap-2 ${
              passedCleanly
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-amber-950/60 border-amber-500/70 text-amber-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {passedCleanly ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span className="font-pixel-header text-[10px] uppercase">
                {passedCleanly ? 'Mastered' : 'Completed'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-emerald-300">
              <span className="font-hanzi text-white">{targetHanzi}</span>
              {targetWord.pinyin ? ` (${targetWord.pinyin})` : ''}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-700 p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1 flex-1">
                <div className="font-pinyin text-rose-300 leading-snug break-words">
                  {item.pinyin || ''}
                </div>
                <InteractiveExampleText
                  sentence={item.hanzi}
                  speakMandarin={speakMandarin}
                  masteryMap={masteryMap}
                  courseWords={courseWords}
                  charClassName="text-xl font-black text-white"
                  onInspectOpenChange={onInspectOpenChange}
                />
              </div>
              <MandarinAudioControls
                text={item.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            </div>

            {item.english ? (
              <p className="font-clarity text-xs font-semibold text-slate-300 leading-snug">
                “{item.english}”
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PHASE 4 PAYLOAD ADAPTERS (CONTEXTUAL WRITING & GRAMMAR LAB NORMALIZERS)
// ============================================================================

const PARTICLE_CONTRAST_INFO = {
  了: {
    pinyin: 'le',
    ruleTitle: 'Completed Aspect (了)',
    ruleExplanation: 'Use 了 after the verb to mark a completed action or change of state.',
    distractors: ['不', '吗', '正在', '在', '没']
  },
  过: {
    pinyin: 'guò',
    ruleTitle: 'Experiential Aspect (过)',
    ruleExplanation: 'Use 过 directly after a verb to express past life experience ("have ever done").',
    distractors: ['了', '正在', '不', '吗', '吧']
  },
  正在: {
    pinyin: 'zhèngzài',
    ruleTitle: 'Progressive Aspect (正在)',
    ruleExplanation: 'Use 正在 before the verb to show an action currently in progress.',
    distractors: ['了', '过', '没', '不', '吗']
  },
  没: {
    pinyin: 'méi',
    ruleTitle: 'Past / 有 Negation (没 vs 不)',
    ruleExplanation: 'Use 没 (not 不) to negate past actions and the verb 有.',
    distractors: ['不', '了', '吗', '在', '过']
  },
  没有: {
    pinyin: 'méiyǒu',
    ruleTitle: 'Past / Possession Negation (没有)',
    ruleExplanation: 'Use 没有 (never 不有) to negate possession or completed past events.',
    distractors: ['不', '了', '正在', '过', '吗']
  },
  不: {
    pinyin: 'bù',
    ruleTitle: 'Present / Habitual Negation (不 vs 没)',
    ruleExplanation: 'Use 不 to negate present/future intentions, habits, adjectives, and 是.',
    distractors: ['没', '了', '过', '吗', '吧']
  },
  吗: {
    pinyin: 'ma',
    ruleTitle: 'Yes/No Question Particle (吗)',
    ruleExplanation: 'Place 吗 at the end of a statement to form a neutral yes/no question.',
    distractors: ['吧', '呢', '了', '不', '的']
  },
  吧: {
    pinyin: 'ba',
    ruleTitle: 'Suggestion Particle (吧)',
    ruleExplanation: 'Place 吧 at the end of a clause to soften a suggestion or proposal.',
    distractors: ['吗', '呢', '了', '不', '过']
  },
  呢: {
    pinyin: 'ne',
    ruleTitle: 'Follow-Up Question Particle (呢)',
    ruleExplanation: 'Use 呢 at the end of a phrase to ask "what about...?" or check ongoing status.',
    distractors: ['吗', '吧', '了', '的', '不']
  },
  在: {
    pinyin: 'zài',
    ruleTitle: 'Location / Progressive Marker (在)',
    ruleExplanation: 'Use 在 before a place or verb to anchor where or when an action happens.',
    distractors: ['了', '过', '不', '没', '吗']
  }
};

export function adaptContextualWritingItem(sentenceItem) {
  if (!sentenceItem || typeof sentenceItem !== 'object' || !sentenceItem.hanzi) {
    return null;
  }
  const sentenceHanzi = String(sentenceItem.hanzi || '').trim();
  const candidateTarget = sentenceItem.targetWord || null;
  const candidateChars = extractHanziChars(candidateTarget);

  if (
    candidateTarget &&
    candidateTarget.hanzi &&
    candidateChars.length > 0 &&
    sentenceHanzi.includes(candidateTarget.hanzi)
  ) {
    return {
      ...sentenceItem,
      targetWord: {
        ...candidateTarget,
        chars: candidateChars
      }
    };
  }

  // Fallback: pick an eligible content token from sentenceItem.tokens that appears contiguously in hanzi
  const tokens = Array.isArray(sentenceItem.tokens) ? sentenceItem.tokens : [];
  const eligible = tokens.find((tok) => {
    const src = tok?.sourceWord || tok;
    const h = String(src?.hanzi || tok?.hanzi || '').trim();
    const chars = extractHanziChars({ hanzi: h, chars: src?.chars });
    return (
      h.length >= 1 &&
      h.length <= 3 &&
      chars.length > 0 &&
      ['noun', 'verb', 'adj', 'time', 'place'].includes(tok?.pos) &&
      sentenceHanzi.includes(h)
    );
  });

  if (!eligible) return null;
  const resolvedWord = eligible.sourceWord || {
    id: eligible.id || `cw_${eligible.hanzi}`,
    hanzi: eligible.hanzi,
    pinyin: eligible.pinyin || '',
    meaning: eligible.meaning || eligible.enGloss || ''
  };
  const resolvedChars = extractHanziChars(resolvedWord);
  if (resolvedChars.length === 0) return null;

  return {
    ...sentenceItem,
    targetWord: {
      ...resolvedWord,
      chars: resolvedChars
    }
  };
}

export function normalizeGrammarLabItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') return null;

  // Already normalized shape
  if (Array.isArray(rawItem.templateTokens) && Array.isArray(rawItem.options)) {
    return {
      ...rawItem,
      modeType: rawItem.modeType || 'separable',
      completedHanzi: rawItem.completedHanzi || rawItem.targetHanzi || '',
      completedPinyin: rawItem.completedPinyin || rawItem.targetPinyin || '',
      ruleExplanation: rawItem.ruleExplanation || rawItem.explanation || ''
    };
  }

  // Adapt raw `generateSeparableVerbLabItem` output from grammarEngine.js
  if (rawItem.separableWord && Array.isArray(rawItem.options) && rawItem.options.length >= 2) {
    const sepWord = rawItem.separableWord;
    const rawTokens = Array.isArray(rawItem.targetTokens) ? rawItem.targetTokens : [];
    const templateTokens = [];
    let blankIndex = -1;
    let inSeparableSpan = false;

    for (let i = 0; i < rawTokens.length; i++) {
      const tok = rawTokens[i];
      const role = tok?.role || '';
      if (role === 'sep_v1') {
        if (blankIndex === -1) {
          blankIndex = templateTokens.length;
          templateTokens.push('___');
        }
        inSeparableSpan = true;
        continue;
      }
      if (inSeparableSpan) {
        if (role === 'sep_v2') {
          inSeparableSpan = false;
        }
        continue;
      }
      if (tok?.hanzi) {
        templateTokens.push(tok.hanzi);
      }
    }

    const trailingPunct = /[。！？?!.]$/.test(String(rawItem.targetHanzi || '').trim())
      ? String(rawItem.targetHanzi).trim().slice(-1)
      : '';
    if (trailingPunct && templateTokens[templateTokens.length - 1] !== trailingPunct) {
      templateTokens.push(trailingPunct);
    }

    if (blankIndex === -1) {
      templateTokens.push('___');
      blankIndex = templateTokens.length - 1;
    }

    return {
      id: rawItem.id || `seplab_${sepWord.hanzi}`,
      modeType: 'separable',
      baseForm: sepWord.hanzi || '',
      baseMeaning: sepWord.meaning || sepWord.english || sepWord.enGloss || '',
      promptEnglish: rawItem.promptEnglish || rawItem.english || '',
      ruleTitle:
        rawItem.labType === 'insert_modifier'
          ? 'Separable Verb + Modifier (离合词)'
          : 'Separable Verb + 了 (离合词)',
      ruleExplanation:
        rawItem.explanation ||
        `${sepWord.hanzi} is a separable verb (离合词): insert aspect particles or modifiers between ${
          rawItem.sepParts?.[0] || 'V1'
        } and ${rawItem.sepParts?.[1] || 'V2'}.`,
      templateTokens,
      blankIndex,
      options: rawItem.options,
      completedHanzi: rawItem.targetHanzi || '',
      completedPinyin: rawItem.targetPinyin || '',
      targetWord: sepWord
    };
  }

  return null;
}

export function buildParticleContrastLabItem(sentenceItem, enrichedPool = []) {
  if (!sentenceItem || !Array.isArray(sentenceItem.tokens) || sentenceItem.tokens.length === 0) {
    return null;
  }

  const unlockedHanziSet = new Set(
    (Array.isArray(enrichedPool) ? enrichedPool : [])
      .map((w) => String(w?.hanzi || '').trim())
      .filter(Boolean)
  );
  const unlockedByHanzi = new Map(
    (Array.isArray(enrichedPool) ? enrichedPool : [])
      .filter((w) => w && w.hanzi)
      .map((w) => [String(w.hanzi).trim(), w])
  );

  const tokens = sentenceItem.tokens;
  const blankIdx = tokens.findIndex(
    (tok) => tok?.hanzi && Boolean(PARTICLE_CONTRAST_INFO[tok.hanzi])
  );
  if (blankIdx === -1) return null;

  const targetTok = tokens[blankIdx];
  const info = PARTICLE_CONTRAST_INFO[targetTok.hanzi];
  if (!info) return null;

  const unlockedDistractors = info.distractors.filter(
    (d) => d !== targetTok.hanzi && unlockedHanziSet.has(d)
  );
  const fallbackDistractors = info.distractors.filter(
    (d) => d !== targetTok.hanzi && !unlockedDistractors.includes(d)
  );
  const chosenDistractors = [...unlockedDistractors, ...fallbackDistractors].slice(0, 3);
  if (chosenDistractors.length < 2) return null;

  const rawOptions = [
    {
      id: `pc_ok_${targetTok.hanzi}`,
      hanzi: targetTok.hanzi,
      pinyin: targetTok.pinyin || info.pinyin || '',
      isCorrect: true
    },
    ...chosenDistractors.map((d, idx) => ({
      id: `pc_d_${idx}_${d}`,
      hanzi: d,
      pinyin: unlockedByHanzi.get(d)?.pinyin || PARTICLE_CONTRAST_INFO[d]?.pinyin || '',
      isCorrect: false
    }))
  ];

  // Fisher-Yates shuffle options
  for (let i = rawOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = rawOptions[i];
    rawOptions[i] = rawOptions[j];
    rawOptions[j] = tmp;
  }

  const templateTokens = tokens.map((tok, idx) => (idx === blankIdx ? '___' : tok.hanzi));
  const trailingPunct = /[。！？?!.]$/.test(String(sentenceItem.hanzi || '').trim())
    ? String(sentenceItem.hanzi).trim().slice(-1)
    : '';
  if (trailingPunct) {
    templateTokens.push(trailingPunct);
  }

  return {
    id: `plab_${sentenceItem.id || targetTok.hanzi}_${Date.now()}`,
    modeType: 'particle_contrast',
    baseForm: targetTok.hanzi,
    baseMeaning: info.ruleTitle,
    promptEnglish: sentenceItem.english || '',
    ruleTitle: info.ruleTitle,
    ruleExplanation: info.ruleExplanation,
    templateTokens,
    blankIndex: blankIdx,
    options: rawOptions,
    completedHanzi: sentenceItem.hanzi || '',
    completedPinyin: sentenceItem.pinyin || '',
    targetWord: targetTok.sourceWord || sentenceItem.targetWord || null
  };
}

// ============================================================================
// 2. GRAMMAR LAB CARD (SEPARABLE VERBS 离合词 & ASPECT/PARTICLE LAB — `grammar_lab`)
// ============================================================================
export function GrammarLabCard({
  item,
  masteryMap = {},
  courseWords = [],
  isCompleted = false,
  cardAnim = 'idle',
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onResult,
  onInspectOpenChange = null
}) {
  const normalizedItem = useMemo(() => normalizeGrammarLabItem(item), [item]);
  const itemKey = `${normalizedItem?.id || normalizedItem?.completedHanzi || 'glab'}_${normalizedItem?.blankIndex ?? 0}`;
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  useEffect(() => {
    setSelectedOptionId(null);
    if (typeof onInspectOpenChange === 'function') {
      onInspectOpenChange(false);
    }
  }, [itemKey, onInspectOpenChange]);

  const options = useMemo(
    () =>
      Array.isArray(normalizedItem?.options)
        ? normalizedItem.options.filter((o) => o && o.hanzi)
        : [],
    [normalizedItem]
  );

  const templateTokens = useMemo(
    () => (Array.isArray(normalizedItem?.templateTokens) ? normalizedItem.templateTokens : []),
    [normalizedItem]
  );

  if (!normalizedItem || typeof normalizedItem !== 'object' || options.length < 2) {
    return <EmptyPhase4Fallback label="Grammar Lab" />;
  }

  const isLocked = Boolean(isCompleted || selectedOptionId !== null);
  const selectedOption = options.find((o) => o.id === selectedOptionId) || null;
  const correctOption = options.find((o) => Boolean(o.isCorrect)) || options[0];
  const isCorrect = Boolean(selectedOption?.isCorrect);
  const isSeparable = normalizedItem.modeType === 'separable';
  const blankIndex =
    typeof normalizedItem.blankIndex === 'number'
      ? normalizedItem.blankIndex
      : templateTokens.findIndex(
          (tok) => tok === '___' || tok === '[ ___ ]' || tok?.isBlank === true
        );

  const completedHanzi =
    normalizedItem.completedHanzi ||
    templateTokens
      .map((tok, idx) => {
        if (idx === blankIndex) return correctOption?.hanzi || '';
        return typeof tok === 'string' ? tok : tok?.hanzi || '';
      })
      .join('');

  const handleSelectOption = (opt) => {
    if (isLocked || !opt) return;
    setSelectedOptionId(opt.id);

    if (opt.isCorrect) {
      soundFX.playCorrect(2);
    } else {
      soundFX.playMistake();
    }

    if (typeof onResult === 'function') {
      onResult({
        isCorrect: Boolean(opt.isCorrect),
        selectedOption: opt,
        item: normalizedItem
      });
    }
  };

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        isSeparable ? 'border-fuchsia-500/50' : 'border-teal-500/50'
      )}`}
    >
      {/* Header Row: Mode Focus Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border font-pixel-header text-[9px] uppercase ${
            isSeparable
              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50'
              : 'bg-teal-500/20 text-teal-300 border-teal-400/50'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span>{isSeparable ? '离合词 • Separable Verb' : 'Aspect & Particles'}</span>
        </span>

        {normalizedItem.ruleTitle ? (
          <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-amber-300 font-clarity text-[11px] font-bold truncate max-w-[55%]">
            {normalizedItem.ruleTitle}
          </span>
        ) : null}
      </div>

      {/* Strict Anti-Spoiler Prompt (NO Pinyin and NO audio before answering) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 text-center space-y-2.5">
        {isSeparable && normalizedItem.baseForm ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-200 font-clarity text-xs font-bold">
            <span>Verb:</span>
            <span className="font-hanzi text-sm text-white">{normalizedItem.baseForm}</span>
            {normalizedItem.baseMeaning ? (
              <span className="text-slate-300">({normalizedItem.baseMeaning})</span>
            ) : null}
          </div>
        ) : (
          <span className="font-clarity text-xs font-bold uppercase tracking-wider text-teal-300 block">
            Choose the grammatically correct insertion
          </span>
        )}

        {/* Mandarin Structure with [ ___ ] Blank */}
        <div className="font-hanzi text-2xl font-black text-white tracking-wide leading-relaxed flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
          {templateTokens.length > 0 ? (
            templateTokens.map((tok, idx) => {
              const tokText = typeof tok === 'string' ? tok : tok?.hanzi || '';
              if (idx === blankIndex) {
                return isLocked ? (
                  <span
                    key={`gl_tok_${idx}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 font-hanzi"
                  >
                    {correctOption?.hanzi || ''}
                  </span>
                ) : (
                  <span
                    key={`gl_tok_${idx}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] bg-amber-500/15 border-2 border-dashed border-amber-400 text-amber-300 font-clarity text-base font-black"
                  >
                    [ ___ ]
                  </span>
                );
              }
              return (
                <span key={`gl_tok_${idx}`} className="font-hanzi">
                  {tokText}
                </span>
              );
            })
          ) : (
            <span className="font-hanzi">{isLocked ? completedHanzi : '[ ___ ]'}</span>
          )}
        </div>

        {normalizedItem.promptEnglish ? (
          <p className="font-clarity text-sm font-semibold text-slate-300 leading-snug pt-1 border-t border-slate-800/80">
            “{normalizedItem.promptEnglish}”
          </p>
        ) : null}
      </div>

      {/* 3-4 Hanzi-Only Option Chips (Pinyin revealed ONLY after answering) */}
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const isPicked = selectedOptionId === opt.id;
          const isRightOpt = Boolean(opt.isCorrect);

          let chipStyle =
            'bg-slate-900 hover:bg-slate-800 border-slate-600 hover:border-amber-400 text-white cursor-pointer';
          if (isLocked) {
            if (isRightOpt) {
              chipStyle = 'bg-emerald-600/25 border-emerald-400 text-emerald-100';
            } else if (isPicked && !isRightOpt) {
              chipStyle = 'bg-rose-600/25 border-rose-500 text-rose-100';
            } else {
              chipStyle = 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-50';
            }
          }

          return (
            <button
              key={opt.id || opt.hanzi}
              type="button"
              disabled={isLocked}
              onClick={() => handleSelectOption(opt)}
              className={`game-btn-3d py-3 px-3 rounded-[2px] border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${chipStyle}`}
            >
              <span className="font-hanzi text-lg font-black leading-snug">{opt.hanzi}</span>
              {isLocked && opt.pinyin ? (
                <span className="font-pinyin-inline text-[11px] text-amber-200/90">
                  {opt.pinyin}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Post-Answer Grammar Explanation, Audio & Character Inspector */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
              isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-pixel-header text-[10px] uppercase">
                  {isCorrect ? 'Correct' : 'Grammar Rule'}
                </span>
              </div>
              {correctOption?.hanzi ? (
                <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-emerald-300">
                  <span className="font-hanzi text-white">{correctOption.hanzi}</span>
                  {correctOption.pinyin ? ` (${correctOption.pinyin})` : ''}
                </span>
              ) : null}
            </div>

            {normalizedItem.ruleExplanation ? (
              <div className="flex items-start gap-2 pt-1">
                <BookOpen className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="font-clarity text-xs sm:text-sm font-semibold text-amber-100 leading-snug">
                  {normalizedItem.ruleExplanation}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-700 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1 flex-1">
                {normalizedItem.completedPinyin ? (
                  <div className="font-pinyin text-rose-300 leading-snug break-words">
                    {normalizedItem.completedPinyin}
                  </div>
                ) : null}
                <InteractiveExampleText
                  sentence={completedHanzi}
                  speakMandarin={speakMandarin}
                  masteryMap={masteryMap}
                  courseWords={courseWords}
                  charClassName="text-xl font-black text-white"
                  onInspectOpenChange={onInspectOpenChange}
                />
              </div>
              <MandarinAudioControls
                text={completedHanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. MICRO READING CARD (MINI-PASSAGE COMPREHENSION — `micro_reading`)
// ============================================================================
export function MicroReadingCard({
  item,
  masteryMap = {},
  courseWords = [],
  isCompleted = false,
  cardAnim = 'idle',
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onResult,
  onInspectOpenChange = null
}) {
  const sentences = useMemo(
    () =>
      Array.isArray(item?.sentences)
        ? item.sentences.filter((s) => s && typeof s.hanzi === 'string' && s.hanzi.trim())
        : [],
    [item]
  );

  const questions = useMemo(
    () =>
      Array.isArray(item?.questions)
        ? item.questions.filter(
            (q) => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2
          )
        : [],
    [item]
  );

  const fullPassageHanzi = useMemo(
    () => sentences.map((s) => s.hanzi.trim()).join(''),
    [sentences]
  );

  const itemKey = `${item?.id || item?.title || 'micro_read'}_${fullPassageHanzi.slice(0, 16)}`;

  const [answersByQuestionId, setAnswersByQuestionId] = useState({});
  const resultEmittedRef = useRef(false);

  useEffect(() => {
    setAnswersByQuestionId({});
    resultEmittedRef.current = false;
    if (typeof onInspectOpenChange === 'function') {
      onInspectOpenChange(false);
    }
  }, [itemKey, onInspectOpenChange]);

  if (!item || typeof item !== 'object' || sentences.length === 0 || questions.length === 0) {
    return <EmptyPhase4Fallback label="Micro Reading" />;
  }

  const answeredCount = questions.reduce((acc, q, idx) => {
    const qKey = q.id || `q_${idx}`;
    return acc + (answersByQuestionId[qKey] ? 1 : 0);
  }, 0);

  const allQuestionsAnswered = Boolean(isCompleted || answeredCount >= questions.length);

  const correctCount = questions.reduce((acc, q, idx) => {
    const qKey = q.id || `q_${idx}`;
    const chosenId = answersByQuestionId[qKey];
    const chosenOpt = q.options.find((o) => (o.id || o.text) === chosenId);
    return acc + (chosenOpt?.isCorrect ? 1 : 0);
  }, 0);

  const allQuestionsCorrect = correctCount === questions.length;

  const handleSelectQuestionOption = (question, qIdx, opt) => {
    const qKey = question.id || `q_${qIdx}`;
    if (allQuestionsAnswered || answersByQuestionId[qKey]) return;

    const optKey = opt.id || opt.text;
    const nextAnswers = { ...answersByQuestionId, [qKey]: optKey };
    setAnswersByQuestionId(nextAnswers);

    const nextAnsweredCount = questions.reduce((acc, q, idx) => {
      const k = q.id || `q_${idx}`;
      return acc + (nextAnswers[k] ? 1 : 0);
    }, 0);

    if (nextAnsweredCount < questions.length) {
      // Intermediate selection: crisp tactile pop without spoiling passage translations/audio
      soundFX.playPop();
      return;
    }

    // All questions answered -> evaluate full comprehension & reveal passage Pinyin, English & audio
    const finalAllCorrect = questions.every((q, idx) => {
      const k = q.id || `q_${idx}`;
      const picked = nextAnswers[k];
      const matchedOpt = q.options.find((o) => (o.id || o.text) === picked);
      return Boolean(matchedOpt?.isCorrect);
    });

    if (finalAllCorrect) {
      soundFX.playCorrect(3);
    } else {
      soundFX.playMistake();
    }

    if (!resultEmittedRef.current) {
      resultEmittedRef.current = true;
      if (typeof onResult === 'function') {
        onResult({
          isCorrect: finalAllCorrect,
          correctCount: questions.reduce((acc, q, idx) => {
            const k = q.id || `q_${idx}`;
            const picked = nextAnswers[k];
            const matchedOpt = q.options.find((o) => (o.id || o.text) === picked);
            return acc + (matchedOpt?.isCorrect ? 1 : 0);
          }, 0),
          totalQuestions: questions.length,
          item
        });
      }
    }
  };

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        'border-amber-500/60'
      )}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-400/50 font-pixel-header text-[9px] uppercase">
          <ScrollText className="w-3.5 h-3.5 shrink-0" />
          <span>Micro Reading</span>
        </span>
        <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-amber-200 font-clarity text-[11px] font-bold">
          {item.title || 'Short Story'} • {answeredCount}/{questions.length}
        </span>
      </div>

      {/* Dark Parchment / Pixel Dialogue Box for the 2-4 Sentence Passage */}
      <div className="rounded-2xl bg-gradient-to-b from-[#1e1b18] to-[#131110] border-2 border-amber-600/50 p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
          <span className="font-pixel-ui text-[9px] uppercase text-amber-400 tracking-wider">
            {allQuestionsAnswered ? 'Story Unlocked • Tap Any Character' : 'Read the Passage'}
          </span>
          {/* STRICT ANTI-SPOILER: Audio Controls rendered ONLY after all questions are answered */}
          {allQuestionsAnswered && fullPassageHanzi ? (
            <MandarinAudioControls
              text={fullPassageHanzi}
              isSlowMode={isSlowMode}
              onSetSlowMode={onSetSlowMode}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              size="sm"
            />
          ) : (
            <span className="font-clarity text-[10px] font-bold text-slate-400">
              No hints until answered
            </span>
          )}
        </div>

        {/* Passage Body: Hanzi ONLY before answering; per-sentence InteractiveExampleText + Pinyin + English AFTER */}
        {!allQuestionsAnswered ? (
          <div className="space-y-2 text-left">
            {sentences.map((sent, sIdx) => (
              <p
                key={`mr_sent_blind_${sIdx}`}
                className="font-hanzi text-lg leading-relaxed tracking-wide text-amber-50 font-semibold"
              >
                {sent.hanzi}
              </p>
            ))}
          </div>
        ) : (
          <div className="space-y-3 text-left">
            {item.sourceType === 'corpus' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-pixel-ui text-[9px] uppercase">
                  Corpus • {sentences.some((s) => s?.inputLevel === 'i+1') ? 'i+1' : 'i+0'}
                </span>
              </div>
            )}
            {sentences.map((sent, sIdx) => (
              <div
                key={`mr_sent_rev_${sIdx}`}
                className="rounded-xl bg-slate-950/75 border border-amber-500/25 p-2.5 space-y-1"
              >
                <InteractiveExampleText
                  sentence={sent.hanzi}
                  speakMandarin={speakMandarin}
                  masteryMap={masteryMap}
                  courseWords={courseWords}
                  charClassName="text-lg font-black text-amber-50"
                  onInspectOpenChange={onInspectOpenChange}
                />
                {sent.pinyin ? (
                  <div className="font-pinyin text-rose-300 text-xs leading-snug">
                    {sent.pinyin}
                  </div>
                ) : null}
                {sent.english ? (
                  <p className="font-clarity text-xs font-semibold text-slate-300 leading-snug">
                    {sent.english}
                  </p>
                ) : null}
                {sent.inputLevel === 'i+1' && sent.unknownToken ? (
                  <div className="pt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-400/50 text-amber-200 font-clarity text-[11px] font-bold">
                      New Vocabulary in Context (+1):{' '}
                      <span className="font-hanzi text-white ml-1">{sent.unknownToken}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comprehension Questions (Question 1/2, Question 2/2) */}
      <div className="space-y-3">
        {questions.map((q, qIdx) => {
          const qKey = q.id || `q_${qIdx}`;
          const pickedId = answersByQuestionId[qKey] || null;
          const isQuestionAnswered = Boolean(pickedId);

          return (
            <div
              key={qKey}
              className="rounded-2xl bg-slate-950/85 border-2 border-slate-800 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-pixel-ui text-[9px] uppercase text-sky-400">
                  Question {qIdx + 1}/{questions.length}
                </span>
                {isQuestionAnswered && !allQuestionsAnswered ? (
                  <span className="font-clarity text-[10px] font-bold text-amber-300">
                    Answer locked
                  </span>
                ) : null}
              </div>

              <p className="font-clarity text-sm font-extrabold text-white leading-snug">
                {q.prompt}
              </p>

              <div className="grid grid-cols-1 gap-1.5">
                {q.options.map((opt, oIdx) => {
                  const optKey = opt.id || opt.text || `opt_${oIdx}`;
                  const isPicked = pickedId === optKey;
                  const isRight = Boolean(opt.isCorrect);

                  let btnClass =
                    'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-slate-100 cursor-pointer';
                  if (allQuestionsAnswered) {
                    if (isRight) {
                      btnClass = 'bg-emerald-600/25 border-emerald-400 text-emerald-100';
                    } else if (isPicked && !isRight) {
                      btnClass = 'bg-rose-600/25 border-rose-500 text-rose-100';
                    } else {
                      btnClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-55';
                    }
                  } else if (isPicked) {
                    btnClass = 'bg-sky-500/25 border-sky-400 text-sky-100';
                  } else if (isQuestionAnswered) {
                    btnClass = 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60';
                  }

                  return (
                    <button
                      key={optKey}
                      type="button"
                      disabled={isQuestionAnswered || allQuestionsAnswered}
                      onClick={() => handleSelectQuestionOption(q, qIdx, opt)}
                      className={`game-btn-3d w-full text-left px-3 py-2 rounded-[2px] border-2 font-clarity text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-2 ${btnClass}`}
                    >
                      <span className="leading-snug">{opt.text}</span>
                      {allQuestionsAnswered && isRight && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {allQuestionsAnswered && isPicked && !isRight && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {allQuestionsAnswered && q.explanation ? (
                <div className="rounded-[2px] bg-slate-900 border border-slate-800 px-2.5 py-1.5 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="font-clarity text-xs text-slate-300 leading-snug">
                    {q.explanation}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Post-Answer Comprehension Summary Banner */}
      {allQuestionsAnswered && (
        <div
          className={`rounded-2xl border-2 p-3 flex items-center justify-between gap-2 ${
            allQuestionsCorrect
              ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
              : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {allQuestionsCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="font-pixel-header text-[10px] uppercase">
              {allQuestionsCorrect ? 'Full Comprehension' : 'Review Story Notes'}
            </span>
          </div>
          <span className="font-clarity text-xs font-extrabold text-amber-300">
            {correctCount}/{questions.length} Correct
          </span>
        </div>
      )}
    </div>
  );
}
