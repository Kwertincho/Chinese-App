import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  RefreshCw,
  PenTool,
  ChevronRight,
  CheckCircle2,
  Lock,
  Check,
  Eye,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Headphones,
  Keyboard,
  Mic,
  SkipForward,
  Shield,
  Heart,
  Clock,
  X,
  ShieldAlert,
  Trophy
} from 'lucide-react';
import { soundFX } from '../audio/soundEngine.js';
import {
  UNIT_1_WORDS,
  KNOWN_CHARACTER_INFO,
  WRITING_MASTERY_STAGES
} from '../data/curriculumData.js';
import {
  validateDictationInput,
  computeSpeechSimilarity,
  getWordMasteryLevel,
  getMasteryTierMeta,
  getAdaptiveWritingConfig,
  useSessionTimer,
  buildBossQuestionsForWords,
  canExposeAudioBeforeAnswer,
  highlightRadicalOutlineStrokes,
  getWritingStageMeta,
  loadHanziWriterScript
} from '../utils/mandarinHelpers.js';
import {
  ChaoToneVisualizer,
  MandarinAudioControls,
  SessionGameTopHud,
  PixelHeartSprite,
  PixelJadeDragonSprite,
  PixelBlockGauge,
  InteractiveExampleText
} from './SharedHudAndAudio.jsx';

// Shared subtle Framer Motion modal backdrop & sheet entry animation
function StageModalMotionShell({ children }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex justify-center"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0.14, ease: 'easeOut' }
            : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
        }
        className="w-full max-w-md bg-slate-900 min-h-dvh flex flex-col justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] overflow-y-auto"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// STAGE 1 MODAL: 3D FLIPPABLE FLASHCARDS WITH CHAO TONE VISUALIZER, COMBO & FLOATING XP
// ============================================================================
export function FlashcardStageModal({
  words = UNIT_1_WORDS,
  courseWords,
  nodeLevel = 0,
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
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPinyinHint, setShowPinyinHint] = useState(false);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [flippedCardsSet, setFlippedCardsSet] = useState(new Set());

  const currentWord = words[cardIndex] || words[0];
  const masteryLevel = getWordMasteryLevel(progress?.mastery, currentWord);
  const tierMeta = getMasteryTierMeta(masteryLevel);
  const isRun2OrHigher = nodeLevel >= 1;
  const isMasteryTrial = nodeLevel >= 2;
  const hideFrontPinyin =
    !isFlipped &&
    (isMasteryTrial || ((masteryLevel >= 4 || isRun2OrHigher) && !showPinyinHint));

  useEffect(() => {
    setShowPinyinHint(false);
    speakMandarin(currentWord.hanzi);
  }, [cardIndex, currentWord.hanzi, speakMandarin]);

  const handleNextCard = () => {
    let updatedBonusXp = bonusXp;
    if (!flippedCardsSet.has(cardIndex)) {
      const nextSet = new Set(flippedCardsSet);
      nextSet.add(cardIndex);
      setFlippedCardsSet(nextSet);
      soundFX.playCorrect(combo);
      updatedBonusXp = bonusXp + 2;
      setBonusXp(updatedBonusXp);
      setXpPopupKey((prev) => prev + 1);
    } else {
      soundFX.playPop();
    }

    if (cardIndex < words.length - 1) {
      setCardIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowPinyinHint(false);
    } else {
      flushSessionTime();
      onComplete(updatedBonusXp, maxCombo);
    }
  };

  const handleCardTap = () => {
    // 2nd tap (Back -> Next Card): immediately advance to next card or finish stage
    if (isFlipped) {
      handleNextCard();
      return;
    }

    // 1st tap (Front -> Back): flip card, award +2 XP once per card, and play example sentence
    setIsFlipped(true);
    soundFX.playPop();

    if (!flippedCardsSet.has(cardIndex)) {
      const nextSet = new Set(flippedCardsSet);
      nextSet.add(cardIndex);
      setFlippedCardsSet(nextSet);

      onRecordSkillEvent?.(currentWord, 'recognition', { mistakesDelta: 0, completionsDelta: 1 });
      setCombo((prev) => {
        const nextCombo = prev + 1;
        setMaxCombo((m) => Math.max(m, nextCombo));
        soundFX.playCorrect(nextCombo);
        return nextCombo;
      });
      setBonusXp((prev) => prev + 2);
      setXpPopupKey((prev) => prev + 1);
    }

    speakMandarin(currentWord.exampleHanzi || currentWord.hanzi);
  };

  const handleFlipBackToFront = (e) => {
    if (e) e.stopPropagation();
    soundFX.playPop();
    setIsFlipped(false);
    speakMandarin(currentWord.hanzi);
  };

  const handlePrevCard = () => {
    if (cardIndex > 0) {
      soundFX.playPop();
      setCardIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowPinyinHint(false);
    }
  };

  return (
    <StageModalMotionShell>
        <SessionGameTopHud
          title={
            isMasteryTrial
              ? 'Flashcards • Trial 3/3'
              : isRun2OrHigher
              ? 'Flashcards • Run 2/3'
              : 'Stage 1 • Flashcards'
          }
          subtitle={`Card ${cardIndex + 1} of ${words.length} • Mastery Lv.${masteryLevel}/10 (${tierMeta.tier})`}
          totalSegments={words.length}
          completedSegments={cardIndex + (isFlipped ? 1 : 0)}
          combo={combo}
          sessionSeconds={elapsedSeconds}
          xpPopupKey={xpPopupKey}
          xpPopupAmount={2}
          onClose={() => {
            flushSessionTime();
            onClose();
          }}
        />

        {/* Smooth 3D Perspective Card Flip Container (1st Tap Flips, 2nd Tap Advances) */}
        <motion.div
          key={`flashcard-${cardIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col justify-center my-2"
          style={{ perspective: '1200px' }}
        >
          <div
            onClick={handleCardTap}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
            className={`cursor-pointer relative w-full flex-1 min-h-[430px] transition-transform duration-500 select-none ${
              isFlipped ? 'animate-game-green-pulse' : ''
            }`}
          >
            {/* FRONT FACE */}
            <div
              style={{ backfaceVisibility: 'hidden' }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 hover:border-rose-500/60 p-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {isMasteryTrial
                    ? 'Mastery Trial • Strict Recall'
                    : isRun2OrHigher
                    ? 'Run 2/3 • Active Recall'
                    : masteryLevel >= 4
                    ? `Front • Lv.${masteryLevel} Recall`
                    : 'Front • Hanzi & Pinyin'}
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

              <div className="my-auto text-center space-y-4 py-4">
                <div className="text-7xl font-black text-white tracking-widest font-hanzi">
                  {currentWord.hanzi}
                </div>
                {hideFrontPinyin ? (
                  <div className="py-3 space-y-2.5">
                    <p className="font-clarity text-xs font-bold text-slate-400">
                      {isMasteryTrial
                        ? 'Mastery Trial 3/3 • Pinyin hidden until card flip'
                        : isRun2OrHigher
                        ? 'Run 2/3 • Pinyin hidden by default'
                        : `Lv.${masteryLevel} Active Recall • Pinyin scaffolding hidden`}
                    </p>
                    {!isMasteryTrial && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundFX.playPop();
                          setShowPinyinHint(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Pinyin Hint</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="font-pinyin text-rose-400">{currentWord.pinyin}</div>

                    {/* Chao Tone Contour Visualizer & Tone Sandhi Detector */}
                    <ChaoToneVisualizer
                      pinyin={currentWord.pinyin}
                      hanzi={currentWord.hanzi}
                    />

                    <p className="font-clarity text-[15px] text-slate-300 pt-1">{currentWord.toneNote}</p>
                  </>
                )}
              </div>

              <div className="text-center pt-3 border-t border-slate-800/80">
                <span className="text-xs font-bold text-amber-300 inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tap card to 3D flip (+2 XP)</span>
                </span>
              </div>
            </div>

            {/* BACK FACE (Rotated 180deg) */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
              className="absolute inset-0 rounded-3xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-2 border-emerald-500/50 p-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Back • Meaning
                  </span>
                  <button
                    type="button"
                    onClick={handleFlipBackToFront}
                    className="game-btn-3d px-2 py-1 rounded-[2px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1"
                    title="Flip back to Front face"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span>Flip Front</span>
                  </button>
                </div>
                <MandarinAudioControls
                  text={currentWord.hanzi}
                  isSlowMode={isSlowMode}
                  onSetSlowMode={onSetSlowMode}
                  speakMandarin={speakMandarin}
                  speakingState={speakingState}
                  size="sm"
                />
              </div>

              <div className="my-auto space-y-3.5 py-2 overflow-y-auto">
                <div className="text-center border-b border-slate-800 pb-3 space-y-1">
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="text-4xl font-black text-white font-hanzi">{currentWord.hanzi}</span>
                    <span className="font-pinyin text-rose-400">({currentWord.pinyin})</span>
                  </div>
                  <div className="font-clarity text-lg font-extrabold text-emerald-400 pt-0.5">
                    {currentWord.meaning || currentWord.english}
                  </div>
                  <p className="font-clarity text-sm text-slate-300">{currentWord.literal}</p>
                </div>

                <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400">
                      Example Sentence
                    </span>
                    <MandarinAudioControls
                      text={currentWord.exampleHanzi || currentWord.hanzi}
                      isSlowMode={isSlowMode}
                      onSetSlowMode={onSetSlowMode}
                      speakMandarin={speakMandarin}
                      speakingState={speakingState}
                      size="sm"
                    />
                  </div>
                  <InteractiveExampleText
                    sentence={currentWord.exampleHanzi}
                    speakMandarin={speakMandarin}
                    masteryMap={progress?.mastery}
                    courseWords={Array.isArray(courseWords) && courseWords.length > 0 ? courseWords : words}
                    charClassName="text-lg font-bold text-white"
                    stopPropagation={true}
                  />
                  <p className="font-clarity text-[16px] font-bold text-rose-300">
                    {currentWord.examplePinyin}
                  </p>
                  <p className="font-clarity text-[15px] text-slate-200 italic">"{currentWord.exampleEnglish}"</p>
                </div>

                {currentWord.usageTip && (
                  <p className="font-clarity text-xs text-slate-300 text-center leading-relaxed px-2">
                    {currentWord.usageTip}
                  </p>
                )}

                {onSaveWordNote && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-xl bg-slate-950/85 border border-slate-700/90 px-3 py-2 space-y-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                        Personal Note / Mnemonic
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">Auto-saved</span>
                    </div>
                    <input
                      type="text"
                      value={wordNotes[currentWord.hanzi] ?? wordNotes[currentWord.id] ?? ''}
                      onChange={(e) => onSaveWordNote(currentWord, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add a personal memory hook or mnemonic..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs font-clarity font-medium text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-slate-800/80">
                <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
                  <span>
                    {cardIndex === words.length - 1
                      ? `Tap card again to Finish Stage (+${15 + bonusXp} XP)`
                      : 'Tap card again for Next Flashcard'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            disabled={cardIndex === 0}
            onClick={handlePrevCard}
            className="game-btn-3d px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 border-b-4 border-slate-950 shrink-0"
          >
            Previous
          </button>

          <div className="flex-1 text-right font-clarity text-[11px] font-semibold text-slate-400 leading-snug">
            {isFlipped
              ? cardIndex === words.length - 1
                ? 'Tap back face to finish stage'
                : 'Tap back face to advance to next card'
              : '2-Tap Flow: Tap card to flip, tap back to advance'}
          </div>
        </div>
    </StageModalMotionShell>
  );
}

// ============================================================================
// STAGE 2 MODAL: STROKE ORDER WRITING (HANZI-WRITER v3.5, MI ZI GE, ADAPTIVE MASTERY STAGES)
// ============================================================================
export function WritingStageModal({
  words = UNIT_1_WORDS,
  nodeLevel = 0,
  progress,
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
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [charStage, setCharStage] = useState(() =>
    getAdaptiveWritingConfig(
      getWordMasteryLevel(progress?.mastery, words[0]),
      nodeLevel
    ).initialStage
  ); // 1: Guided, 2: Trace, 3: Memory
  const [showPinyinHint, setShowPinyinHint] = useState(false);
  const [scriptStatus, setScriptStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [modeStatus, setModeStatus] = useState('quiz'); // 'animating' | 'quiz' | 'stage_transition' | 'completed'
  const [strokeStats, setStrokeStats] = useState({
    completedStrokes: 0,
    totalStrokes: 0,
    mistakesOnCurrent: 0,
    totalMistakes: 0,
    hintTriggered: false
  });
  const [completedCharsInWord, setCompletedCharsInWord] = useState([]);
  const [wordXpAwarded, setWordXpAwarded] = useState(false);

  // Gamified Combo & Feedback states
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [xpPopupAmount, setXpPopupAmount] = useState(5);
  const [boardFeedback, setBoardFeedback] = useState('idle'); // 'idle' | 'correct' | 'wrong'
  const [charMissCount, setCharMissCount] = useState(0);
  const [touchNudgeMessage, setTouchNudgeMessage] = useState('');
  const [charStrokeMeta, setCharStrokeMeta] = useState({
    strokeCount: null,
    radStrokes: [],
    loading: false
  });

  const writerTargetRef = useRef(null);
  const writerInstanceRef = useRef(null);
  const stageTransitionTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const charMissCountRef = useRef(0);

  const currentWord = words[wordIndex] || words[0];
  const currentChar = currentWord.chars[charIndex] || currentWord.chars[0];
  const masteryLevel = getWordMasteryLevel(progress?.mastery, currentWord);
  const tierMeta = getMasteryTierMeta(masteryLevel);
  const writingConfig = getAdaptiveWritingConfig(masteryLevel, nodeLevel);
  const stageMeta = getWritingStageMeta(charStage);
  const knownCharMeta = KNOWN_CHARACTER_INFO[currentChar] || null;

  const clearAllWritingTimers = useCallback(() => {
    if (stageTransitionTimerRef.current) {
      clearTimeout(stageTransitionTimerRef.current);
      stageTransitionTimerRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Total adaptive stage character steps across all words in the session for segmented bar
  const totalStageSteps = useMemo(() => {
    return words.reduce((acc, w) => {
      const wLv = getWordMasteryLevel(progress?.mastery, w);
      const wCfg = getAdaptiveWritingConfig(wLv, nodeLevel);
      return acc + (w.chars?.length || 1) * wCfg.stagesCount;
    }, 0);
  }, [words, progress?.mastery, nodeLevel]);

  const completedStageSteps = useMemo(() => {
    let count = 0;
    for (let i = 0; i < wordIndex; i++) {
      const wLv = getWordMasteryLevel(progress?.mastery, words[i]);
      const wCfg = getAdaptiveWritingConfig(wLv, nodeLevel);
      count += (words[i]?.chars?.length || 1) * wCfg.stagesCount;
    }
    count += completedCharsInWord.length * writingConfig.stagesCount;
    if (!completedCharsInWord.includes(charIndex)) {
      count += Math.max(0, charStage - writingConfig.minStage);
    }
    return count;
  }, [
    words,
    wordIndex,
    completedCharsInWord,
    charIndex,
    charStage,
    progress?.mastery,
    nodeLevel,
    writingConfig.stagesCount,
    writingConfig.minStage
  ]);

  useEffect(() => {
    let isMounted = true;
    loadHanziWriterScript()
      .then(() => {
        if (isMounted) setScriptStatus('ready');
      })
      .catch(() => {
        if (isMounted) setScriptStatus('error');
      });
    return () => {
      isMounted = false;
      clearAllWritingTimers();
    };
  }, [clearAllWritingTimers]);

  useEffect(() => {
    setShowPinyinHint(false);
    charMissCountRef.current = 0;
    setCharMissCount(0);
    setTouchNudgeMessage('');
    speakMandarin(currentWord.hanzi);
  }, [wordIndex, currentWord.hanzi, speakMandarin]);

  useEffect(() => {
    setShowPinyinHint(false);
    charMissCountRef.current = 0;
    setCharMissCount(0);
    setTouchNudgeMessage('');
  }, [charIndex]);

  const triggerBoardFeedback = useCallback((type) => {
    setBoardFeedback(type);
    setTimeout(() => setBoardFeedback('idle'), 500);
  }, []);

  const liveStateRef = useRef({
    combo,
    maxCombo,
    bonusXp,
    wordXpAwarded,
    currentWord,
    wordIndex,
    charIndex,
    words,
    progress,
    nodeLevel,
    writingConfig,
    onComplete,
    onRecordSkillEvent,
    flushSessionTime
  });
  liveStateRef.current = {
    combo,
    maxCombo,
    bonusXp,
    wordXpAwarded,
    currentWord,
    wordIndex,
    charIndex,
    words,
    progress,
    nodeLevel,
    writingConfig,
    onComplete,
    onRecordSkillEvent,
    flushSessionTime
  };

  const startInteractiveQuiz = useCallback(
    (writer, targetStage) => {
      const activeWriter = writer || writerInstanceRef.current;
      if (!activeWriter) return;

      clearAllWritingTimers();

      const activeStageMeta = getWritingStageMeta(targetStage);
      setModeStatus('quiz');
      charMissCountRef.current = 0;
      setCharMissCount(0);
      setTouchNudgeMessage('');
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
          const nextCharMiss = charMissCountRef.current + 1;
          charMissCountRef.current = nextCharMiss;
          setCharMissCount(nextCharMiss);

          // 3-strike touchscreen mistake buffer per character:
          // 1st & 2nd off-path touches trigger only a subtle amber nudge (no mistake SFX, no combo reset, no red shake, no telemetry mistake)
          if (nextCharMiss < 3) {
            setTouchNudgeMessage(`Touch off-path (${nextCharMiss}/3) — try stroke again`);
            setStrokeStats((prev) => ({
              ...prev,
              mistakesOnCurrent: strokeData.mistakesOnStroke,
              totalMistakes: strokeData.totalMistakes,
              hintTriggered: false
            }));
            return;
          }

          // 3rd miss on this character registers the telemetry/mastery penalty ONCE per character;
          // subsequent misses still flash the stroke hint without repeatedly decrementing mastery.
          setTouchNudgeMessage('');
          soundFX.playMistake();
          liveStateRef.current.combo = 0;
          setCombo(0);
          triggerBoardFeedback('wrong');
          if (nextCharMiss === 3) {
            const { currentWord: liveWord, onRecordSkillEvent: recordEvt } = liveStateRef.current;
            recordEvt?.(liveWord, 'writing', { mistakesDelta: 1, completionsDelta: 0 });
          }
          setStrokeStats((prev) => ({
            ...prev,
            mistakesOnCurrent: strokeData.mistakesOnStroke,
            totalMistakes: strokeData.totalMistakes,
            hintTriggered: true
          }));

          if (writerInstanceRef.current === activeWriter && typeof strokeData?.strokeNum === 'number') {
            try {
              activeWriter.highlightStroke(strokeData.strokeNum);
            } catch (e) {
              // Ignore if writer was unmounted
            }
          }
        },
        onCorrectStroke: (strokeData) => {
          setTouchNudgeMessage('');
          const doneCount = strokeData.strokeNum + 1;
          const total = doneCount + strokeData.strokesRemaining;
          const nextCombo = (liveStateRef.current.combo || 0) + 1;
          const nextMaxCombo = Math.max(liveStateRef.current.maxCombo || 0, nextCombo);
          liveStateRef.current.combo = nextCombo;
          liveStateRef.current.maxCombo = nextMaxCombo;
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

          // Stage 1 (Guided): Schedule upcoming stroke highlight after 180ms so it doesn't collide with stroke completion animation
          if (activeStageMeta.autoHighlightNextStroke && strokeData.strokesRemaining > 0) {
            const nextStrokeIdx = strokeData.strokeNum + 1;
            setTimeout(() => {
              if (writerInstanceRef.current === activeWriter) {
                try {
                  activeWriter.highlightStroke(nextStrokeIdx);
                } catch (e) {
                  // Ignore if writer was unmounted
                }
              }
            }, 180);
          }
        },
        onComplete: (summaryData) => {
          setTouchNudgeMessage('');
          triggerBoardFeedback('correct');
          setStrokeStats((prev) => ({
            ...prev,
            completedStrokes: prev.totalStrokes || prev.completedStrokes,
            mistakesOnCurrent: 0,
            totalMistakes: summaryData.totalMistakes,
            hintTriggered: false
          }));

          const {
            combo: liveCombo,
            maxCombo: liveMaxCombo,
            bonusXp: liveBonusXp,
            wordXpAwarded: liveWordXpAwarded,
            currentWord: liveWord,
            wordIndex: liveWordIdx,
            charIndex: liveCharIdx,
            words: liveWords,
            progress: liveProgress,
            nodeLevel: liveNodeLevel,
            writingConfig: liveWritingCfg,
            onComplete: completeCb,
            onRecordSkillEvent: recordEvt,
            flushSessionTime: flushTime
          } = liveStateRef.current;

          // Sequential Adaptive Stage Progression per Character
          if (targetStage < 3) {
            soundFX.playCorrect(liveCombo + 1);
            setModeStatus('stage_transition');
            stageTransitionTimerRef.current = setTimeout(() => {
              setCharStage(targetStage + 1);
            }, 620);
          } else {
            // Completed Stage 3 (Memory Freehand) for this character!
            setModeStatus('completed');
            soundFX.playCorrect(liveCombo + 2);

            const comboBonus = liveCombo >= 1 ? Math.min(3, liveCombo) : 0;
            const earned = 5 + comboBonus;
            const isFinalCharInWord = liveCharIdx >= (liveWord.chars?.length || 1) - 1;

            setCompletedCharsInWord((prev) => {
              const nextCompleted = prev.includes(liveCharIdx) ? prev : [...prev, liveCharIdx];
              const allCharsDone = nextCompleted.length >= (liveWord.chars?.length || 1);

              // Award Mastery XP only after completing Stage 3 for all characters in the word
              if (allCharsDone && !liveStateRef.current.wordXpAwarded) {
                liveStateRef.current.wordXpAwarded = true;
                setWordXpAwarded(true);
                recordEvt?.(liveWord, 'writing', {
                  mistakesDelta: 0,
                  completionsDelta: 1
                });
                setBonusXp((prevXp) => prevXp + earned);
                setXpPopupAmount(earned);
                setXpPopupKey((prevKey) => prevKey + 1);
              }
              return nextCompleted;
            });

            // Auto-transition after Stage 3 completion (850ms to next char in word, 1200ms to next word)
            if (!isFinalCharInWord) {
              feedbackTimerRef.current = setTimeout(() => {
                setCharStage(liveWritingCfg.initialStage);
                setCharIndex((prev) => prev + 1);
              }, 850);
            } else {
              const nextTotalXp = liveBonusXp + (liveWordXpAwarded ? 0 : earned);
              feedbackTimerRef.current = setTimeout(() => {
                if (liveWordIdx < liveWords.length - 1) {
                  const nextWord = liveWords[liveWordIdx + 1];
                  const nextWordConfig = getAdaptiveWritingConfig(
                    getWordMasteryLevel(liveProgress?.mastery, nextWord),
                    liveNodeLevel
                  );
                  setCompletedCharsInWord([]);
                  setWordXpAwarded(false);
                  setCharStage(nextWordConfig.initialStage);
                  setCharIndex(0);
                  setWordIndex((prev) => prev + 1);
                } else {
                  flushTime();
                  completeCb(nextTotalXp, liveMaxCombo);
                }
              }, 1200);
            }
          }
        }
      });

      // Stage 1 (Guided): Trigger highlightStroke(0) at the start of the quiz
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
    [clearAllWritingTimers, triggerBoardFeedback]
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
    // Explicitly clear container before every HanziWriter.create() call so SVG grids never duplicate
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
      delayBetweenStrokes: 160,
      strokeColor: '#f8fafc',
      radicalColor: '#dc2626',
      outlineColor: '#334155',
      drawingColor: '#f43f5e',
      drawingWidth: 26,
      leniency: 1.85,
      highlightColor: '#38bdf8',
      showHintAfterMisses: currentStageConfig.showHintAfterMisses,
      highlightOnComplete: true,
      onLoadCharDataSuccess: (charData) => {
        const radStrokes = Array.isArray(charData.radStrokes) ? charData.radStrokes : [];
        setCharStrokeMeta({
          strokeCount: charData.strokes.length,
          radStrokes,
          loading: false
        });
        setStrokeStats({
          completedStrokes: 0,
          totalStrokes: charData.strokes.length,
          mistakesOnCurrent: 0,
          totalMistakes: 0,
          hintTriggered: false
        });
        if (writerInstanceRef.current === writer) {
          startInteractiveQuiz(writer, charStage);
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
      if (stageTransitionTimerRef.current) {
        clearTimeout(stageTransitionTimerRef.current);
      }
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
      if (writerTargetRef.current) {
        writerTargetRef.current.innerHTML = '';
      }
      writerInstanceRef.current = null;
    };
  }, [scriptStatus, wordIndex, charIndex, charStage, currentChar, startInteractiveQuiz]);

  const handleReplayAnimation = () => {
    const writer = writerInstanceRef.current;
    if (!writer) return;
    soundFX.playPop();

    if (stageTransitionTimerRef.current) {
      clearTimeout(stageTransitionTimerRef.current);
      stageTransitionTimerRef.current = null;
    }

    setModeStatus('animating');
    writer.cancelQuiz();
    writer.showOutline();
    writer.showCharacter();
    writer.animateCharacter({
      onComplete: () => {
        setTimeout(() => {
          if (writerInstanceRef.current === writer) {
            writer.hideCharacter();
            startInteractiveQuiz(writer, charStage);
          }
        }, 450);
      }
    });
  };

  const handleSelectCharTab = (idx) => {
    if (idx === charIndex) return;
    // Enforce completing all required stages on earlier characters before jumping ahead
    const isUnlockedChar = idx === 0 || completedCharsInWord.includes(idx - 1) || completedCharsInWord.includes(idx);
    if (!isUnlockedChar) {
      soundFX.playMistake();
      return;
    }
    soundFX.playPop();
    setCharStage(completedCharsInWord.includes(idx) ? 3 : writingConfig.initialStage);
    setCharIndex(idx);
  };

  const isCharComplete =
    (charStage === 3 && modeStatus === 'completed') ||
    completedCharsInWord.includes(charIndex);
  const isLastCharOfWord = charIndex === currentWord.chars.length - 1;
  const isLastWord = wordIndex === words.length - 1;
  const isRun2OrHigher = nodeLevel >= 1;
  const isMasteryTrial = nodeLevel >= 2;
  const hidePinyinScaffolding =
    !isCharComplete &&
    (isMasteryTrial || ((writingConfig.hidePinyin || isRun2OrHigher) && !showPinyinHint));
  const hideHanziScaffolding = writingConfig.hideHanzi && !isCharComplete && !showPinyinHint;

  return (
    <StageModalMotionShell>
        <div>
          <SessionGameTopHud
            title={
              isMasteryTrial
                ? 'Calligraphy • Trial 3/3'
                : isRun2OrHigher
                ? 'Calligraphy • Run 2/3'
                : 'Stage 2 • Progressive Calligraphy'
            }
            subtitle={`Word ${wordIndex + 1}/${words.length} • Lv.${masteryLevel}/10 (${tierMeta.tier}) • ${stageMeta.shortLabel}`}
            totalSegments={totalStageSteps}
            completedSegments={completedStageSteps}
            combo={combo}
            sessionSeconds={elapsedSeconds}
            xpPopupKey={xpPopupKey}
            xpPopupAmount={xpPopupAmount}
            onClose={() => {
              clearAllWritingTimers();
              flushSessionTime();
              onClose();
            }}
            rightElement={
              <MandarinAudioControls
                text={currentWord.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            }
          />

          <div className="mt-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-clarity text-[15px] font-extrabold text-amber-400 block truncate">
                {currentWord.meaning || currentWord.english}
              </span>
              <div className="flex items-center flex-wrap gap-2 mt-0.5">
                <h3 className="text-xl font-black text-white font-hanzi">
                  {hideHanziScaffolding ? '？'.repeat(currentWord.chars?.length || 1) : currentWord.hanzi}
                </h3>
                {hidePinyinScaffolding ? (
                  isMasteryTrial ? (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10px] font-extrabold text-amber-300">
                      Trial 3/3 • No Pinyin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setShowPinyinHint(true);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Show Pinyin Hint</span>
                    </button>
                  )
                ) : (
                  <span className="font-pinyin text-rose-400">{currentWord.pinyin}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {masteryLevel >= 7 || isMasteryTrial
                  ? isMasteryTrial && masteryLevel < 7
                    ? 'Trial 3/3 Blind Memory: Write directly in Stage 3 (No Outline or Pinyin)'
                    : 'Lv.7+ Blind Recall: Write directly from memory (Stage 3)'
                  : masteryLevel >= 4 || isRun2OrHigher
                  ? isRun2OrHigher && masteryLevel < 4
                    ? 'Run 2/3 Adaptive: Starts at Stage 2 Ghost Trace → Stage 3 Memory'
                    : 'Lv.4–6 Adaptive: Starts at Stage 2 Trace → Stage 3 Memory'
                  : 'Complete all 3 stages per character to earn word mastery XP'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {currentWord.chars.map((ch, idx) => {
                const isDone = completedCharsInWord.includes(idx);
                const isActive = idx === charIndex;
                const isLocked = idx > 0 && !completedCharsInWord.includes(idx - 1) && !isDone && !isActive;
                const maskChar = writingConfig.hideHanzi && !isDone && !showPinyinHint && !(isActive && isCharComplete);
                return (
                  <button
                    key={`${currentWord.id}-char-${idx}`}
                    type="button"
                    onClick={() => handleSelectCharTab(idx)}
                    className={`game-btn-3d w-11 h-11 rounded-xl font-black text-lg font-hanzi flex flex-col items-center justify-center border transition-all relative ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-950/50'
                        : isDone
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : isLocked
                        ? 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span>{maskChar ? '?' : ch}</span>
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 absolute -top-1 -right-1 bg-slate-900 rounded-full" />
                    )}
                    {isLocked && (
                      <Lock className="w-2.5 h-2.5 text-slate-500 absolute -top-1 -right-1 bg-slate-900 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="my-2.5 flex flex-col items-center">
          {/* Adaptive Mastery Badge Above Grid (Lv.7+ Blind Recall / Lv.4-6 Skip Guided) */}
          {writingConfig.badgeLabel && (
            <div className="w-full max-w-[244px] mb-2 flex items-center justify-center">
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

          {/* 3-Step Progressive Mastery Indicator Pill: 1. Guided -> 2. Trace -> 3. Memory */}
          <div className="w-full max-w-[244px] mb-2.5">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              {WRITING_MASTERY_STAGES.map((st) => {
                  const isSkippedStage = st.stage < writingConfig.minStage;
                  const isCompletedStage =
                    isCharComplete || charStage > st.stage || isSkippedStage;
                  const isCurrentStage = charStage === st.stage && !isCharComplete;
                  const canSelectStage =
                    st.stage >= writingConfig.minStage && st.stage <= charStage;
                  return (
                    <button
                      key={st.stage}
                      type="button"
                      disabled={!canSelectStage}
                      onClick={() => {
                        if (canSelectStage) {
                          soundFX.playPop();
                          setCharStage(st.stage);
                        }
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all border ${
                        isCurrentStage
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 border-amber-300 shadow'
                          : isCompletedStage
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/70 border-transparent text-slate-500'
                      } ${!canSelectStage ? 'cursor-not-allowed' : ''}`}
                    >
                      {isCompletedStage && <Check className="w-3 h-3 stroke-[3px] shrink-0" />}
                      <span className="truncate">{st.shortLabel}</span>
                    </button>
                  );
              })}
            </div>
          </div>

          {/* Action Controls Row: Replay Animation & Reset Stage */}
          <div className="w-full max-w-[244px] flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handleReplayAnimation}
              disabled={scriptStatus !== 'ready'}
              className="game-btn-3d px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Replay Animation</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playPop();
                startInteractiveQuiz(writerInstanceRef.current, charStage);
              }}
              disabled={scriptStatus !== 'ready'}
              className="game-btn-3d px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stage {charStage}</span>
            </button>
          </div>

          {/* Stroke Count & Radical Info Strip (via HanziWriter.loadCharacterData) */}
          <div className="w-full max-w-[244px] mb-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-200">
              <PenTool className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                "<span className="font-hanzi">{hideHanziScaffolding ? '?' : currentChar}</span>" •{' '}
                {charStrokeMeta.strokeCount || strokeStats.totalStrokes || '?'}{' '}
                strokes
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-red-300/60"
                style={{ backgroundColor: '#dc2626' }}
              />
              <span className="text-[10px] font-bold text-red-300 truncate font-hanzi">
                {knownCharMeta?.radical
                  ? `Radical: ${knownCharMeta.radical}`
                  : charStrokeMeta.radStrokes?.length > 0
                  ? `Radical (${charStrokeMeta.radStrokes.length} strokes)`
                  : 'Radical in Red (#dc2626)'}
              </span>
            </div>
          </div>

          <div
            style={{ touchAction: 'none' }}
            className={`relative w-[244px] h-[244px] rounded-2xl bg-slate-950 border-2 shadow-2xl overflow-hidden select-none touch-none flex items-center justify-center transition-colors ${
              boardFeedback === 'wrong'
                ? 'border-rose-500 bg-rose-950/20 animate-game-shake'
                : boardFeedback === 'correct'
                ? 'border-emerald-400 animate-game-green-pulse'
                : touchNudgeMessage
                ? 'border-amber-400/80'
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
                x1="6"
                y1="234"
                x2="234"
                y2="6"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="6 6"
              />
            </svg>

            {scriptStatus === 'loading' && (
              <div className="z-20 text-center p-4 space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-300">Loading Hanzi Writer 3.5...</p>
              </div>
            )}

            {scriptStatus === 'error' && (
              <div className="z-20 text-center p-4 space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs font-bold text-rose-300">
                  Could not reach Hanzi Writer CDN.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (charStage < 3) {
                      setCharStage((s) => s + 1);
                    } else {
                      setModeStatus('completed');
                      setCompletedCharsInWord((prev) =>
                        prev.includes(charIndex) ? prev : [...prev, charIndex]
                      );
                      feedbackTimerRef.current = setTimeout(() => {
                        if (charIndex < currentWord.chars.length - 1) {
                          setCharStage(writingConfig.initialStage);
                          setCharIndex((prev) => prev + 1);
                        } else if (wordIndex < words.length - 1) {
                          const nextWord = words[wordIndex + 1];
                          const nextWordConfig = getAdaptiveWritingConfig(
                            getWordMasteryLevel(progress?.mastery, nextWord),
                            nodeLevel
                          );
                          setCompletedCharsInWord([]);
                          setWordXpAwarded(false);
                          setCharStage(nextWordConfig.initialStage);
                          setCharIndex(0);
                          setWordIndex((prev) => prev + 1);
                        } else {
                          onComplete(bonusXp, maxCombo);
                        }
                      }, 1200);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Mark "{currentChar}" Stage {charStage} Complete
                </button>
              </div>
            )}

            {/* Completed! Checkmark Overlay during 1200ms Auto-Transition */}
            {isCharComplete && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 animate-game-green-pulse pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-emerald-500/25 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-sm font-black text-emerald-300 tracking-wide">
                  Completed! ✓
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  {!isLastCharOfWord
                    ? `Advancing to next character...`
                    : !isLastWord
                    ? `Advancing to ${words[wordIndex + 1].hanzi}...`
                    : 'Finishing Stage...'}
                </span>
              </div>
            )}

            <div
              ref={writerTargetRef}
              style={{ touchAction: 'none' }}
              className="relative z-10 w-[240px] h-[240px] touch-none select-none cursor-crosshair"
            />
          </div>

          <div className="w-full max-w-[244px] mt-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 truncate">
                {stageMeta.title}
              </span>
              <span className="font-extrabold text-amber-400 shrink-0">
                {strokeStats.completedStrokes} / {strokeStats.totalStrokes || '?'}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-amber-500 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${
                    strokeStats.totalStrokes > 0
                      ? Math.round((strokeStats.completedStrokes / strokeStats.totalStrokes) * 100)
                      : 0
                  }%`
                }}
              />
            </div>

            <div className="text-[11px] pt-0.5">
              {modeStatus === 'animating' ? (
                <span className="text-amber-300 font-bold">
                  Replaying stroke order animation for "{currentChar}"...
                </span>
              ) : modeStatus === 'stage_transition' ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {stageMeta.shortLabel} cleared! Advancing to Stage {charStage + 1}...
                  </span>
                </span>
              ) : isCharComplete ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Completed! Auto-advancing...
                  </span>
                </span>
              ) : touchNudgeMessage ? (
                <span className="text-amber-300 font-bold">
                  {touchNudgeMessage}
                </span>
              ) : strokeStats.hintTriggered || charMissCount >= 3 ? (
                <span className="text-rose-300 font-bold">
                  {charMissCount >= 3 ? '3+ misses on character' : `${stageMeta.showHintAfterMisses} miss${stageMeta.showHintAfterMisses > 1 ? 'es' : ''}`} — follow the flashing stroke hint!
                </span>
              ) : (
                <span className="text-slate-400">{stageMeta.instruction}</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 text-center text-[11px] font-bold text-slate-400">
          {isCharComplete
            ? 'Completed! Advancing automatically...'
            : `Draw strokes in order to complete ${stageMeta.shortLabel}`}
        </div>
    </StageModalMotionShell>
  );
}

// ============================================================================
// STAGE 3 MODAL: LISTENING (DICTATION) & SPEAKING (PRONUNCIATION) WITH COMBO & SFX
// ============================================================================
export function AudioSpeechStageModal({
  words = UNIT_1_WORDS,
  courseWords,
  nodeLevel = 0,
  progress,
  initialFocusMode = 'combined',
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
  const [stepIndex, setStepIndex] = useState(0);
  const [dictationSubMode, setDictationSubMode] = useState('pinyin'); // 'pinyin' | 'hanzi'
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState(null);
  const [dictationSubmitted, setDictationSubmitted] = useState(false);
  const [dictationAnim, setDictationAnim] = useState('idle'); // 'idle' | 'correct' | 'wrong'
  const [showPinyinHint, setShowPinyinHint] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [similarityData, setSimilarityData] = useState(null);
  const [speakingEvaluated, setSpeakingEvaluated] = useState(false);
  const [speakingSkipped, setSpeakingSkipped] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState('');

  // Gamified Combo & Floating XP states
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [xpPopupAmount, setXpPopupAmount] = useState(5);

  const [isInspectingExample, setIsInspectingExample] = useState(false);
  const recognitionRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const pendingAdvancePayloadRef = useRef(null);
  const currentWord = words[stepIndex] || words[0];
  const masteryLevel = getWordMasteryLevel(progress?.mastery, currentWord);
  const tierMeta = getMasteryTierMeta(masteryLevel);

  const showDictation = initialFocusMode === 'combined' || initialFocusMode === 'dictation';
  const showSpeaking = initialFocusMode === 'combined' || initialFocusMode === 'speaking';

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const advanceAudioSpeechNow = useCallback(
    (updatedBonusXp = bonusXp, updatedMaxCombo = maxCombo) => {
      clearFeedbackTimer();
      pendingAdvancePayloadRef.current = null;
      setIsInspectingExample(false);
      if (stepIndex < words.length - 1) {
        setStepIndex((prev) => prev + 1);
      } else {
        flushSessionTime();
        onComplete(updatedBonusXp, updatedMaxCombo);
      }
    },
    [bonusXp, maxCombo, clearFeedbackTimer, flushSessionTime, onComplete, stepIndex, words.length]
  );

  useEffect(() => {
    clearFeedbackTimer();
    pendingAdvancePayloadRef.current = null;
    setIsInspectingExample(false);
    setDictationInput('');
    setDictationResult(null);
    setDictationSubmitted(false);
    setDictationAnim('idle');
    setShowPinyinHint(false);
    setIsRecording(false);
    setRecognizedText('');
    setSimilarityData(null);
    setSpeakingEvaluated(false);
    setSpeakingSkipped(false);
    setMicErrorMsg('');
    speakMandarin(currentWord.hanzi);

    return () => {
      clearFeedbackTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Ignore
        }
      }
    };
  }, [stepIndex, currentWord.hanzi, speakMandarin, clearFeedbackTimer]);

  const scheduleAutoAdvanceIfReady = useCallback(
    (wasCorrectAnswer, nextDictationDone, nextSpeakingDone, updatedBonusXp, updatedMaxCombo) => {
      if (!nextDictationDone || !nextSpeakingDone) return;
      clearFeedbackTimer();
      const delayMs = wasCorrectAnswer ? 1400 : 1800;
      pendingAdvancePayloadRef.current = { updatedBonusXp, updatedMaxCombo, delayMs };
      feedbackTimerRef.current = setTimeout(() => {
        advanceAudioSpeechNow(updatedBonusXp, updatedMaxCombo);
      }, delayMs);
    },
    [clearFeedbackTimer, advanceAudioSpeechNow]
  );

  useEffect(() => {
    if (isInspectingExample) {
      clearFeedbackTimer();
      return;
    }
    if (pendingAdvancePayloadRef.current && !feedbackTimerRef.current) {
      const { updatedBonusXp, updatedMaxCombo, delayMs } = pendingAdvancePayloadRef.current;
      feedbackTimerRef.current = setTimeout(() => {
        advanceAudioSpeechNow(updatedBonusXp, updatedMaxCombo);
      }, delayMs || 1400);
    }
  }, [isInspectingExample, clearFeedbackTimer, advanceAudioSpeechNow]);

  const handleCheckDictation = (e) => {
    if (e) e.preventDefault();
    if (dictationSubmitted || !dictationInput.trim()) return;

    const res = validateDictationInput(
      dictationInput,
      currentWord,
      dictationSubMode,
      masteryLevel
    );
    setDictationResult(res);
    setDictationSubmitted(true);

    let nextBonus = bonusXp;
    let nextMax = maxCombo;

    if (res.isValid) {
      setDictationAnim('correct');
      setTimeout(() => setDictationAnim('idle'), 550);
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 0, completionsDelta: 1 });
      const nextCombo = combo + 1;
      nextMax = Math.max(maxCombo, nextCombo);
      setCombo(nextCombo);
      setMaxCombo(nextMax);
      soundFX.playCorrect(nextCombo);
      const comboBonus = nextCombo >= 2 ? Math.min(3, nextCombo - 1) : 0;
      const gain = 5 + comboBonus;
      nextBonus = bonusXp + gain;
      setBonusXp(nextBonus);
      setXpPopupAmount(gain);
      setXpPopupKey((k) => k + 1);
      speakMandarin(currentWord.hanzi);
    } else {
      soundFX.playMistake();
      setCombo(0);
      onRecordSkillEvent?.(currentWord, 'listening', { mistakesDelta: 1, completionsDelta: 0 });
      setDictationAnim('wrong');
      setTimeout(() => setDictationAnim('idle'), 450);
    }

    const speakingAlreadyDone = !showSpeaking || speakingSkipped || speakingEvaluated;
    scheduleAutoAdvanceIfReady(res.isValid, true, speakingAlreadyDone, nextBonus, nextMax);
  };

  const handleStartSpeechRecognition = () => {
    if (speakingEvaluated || speakingSkipped) return;
    setMicErrorMsg('');
    const SpeechRec =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRec) {
      setMicErrorMsg(
        'SpeechRecognition API is not supported in this browser. Click "Skip / Can\'t speak right now" below to continue.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setIsRecording(true);

      recognition.onresult = (event) => {
        setIsRecording(false);
        const bestTranscript = event.results?.[0]?.[0]?.transcript || '';
        setRecognizedText(bestTranscript);
        const computed = computeSpeechSimilarity(bestTranscript, currentWord);
        setSimilarityData(computed);
        setSpeakingEvaluated(true);

        const isPass = computed.score >= 50;
        let nextBonus = bonusXp;
        let nextMax = maxCombo;

        if (isPass) {
          onRecordSkillEvent?.(currentWord, 'speaking', { mistakesDelta: 0, completionsDelta: 1 });
          const nextCombo = combo + 1;
          nextMax = Math.max(maxCombo, nextCombo);
          setCombo(nextCombo);
          setMaxCombo(nextMax);
          soundFX.playCorrect(nextCombo);
          const comboBonus = nextCombo >= 2 ? Math.min(3, nextCombo - 1) : 0;
          const gain = 5 + comboBonus;
          nextBonus = bonusXp + gain;
          setBonusXp(nextBonus);
          setXpPopupAmount(gain);
          setXpPopupKey((k) => k + 1);
        } else {
          soundFX.playMistake();
          setCombo(0);
          onRecordSkillEvent?.(currentWord, 'speaking', { mistakesDelta: 1, completionsDelta: 0 });
        }

        const dictationAlreadyDone = !showDictation || dictationSubmitted;
        scheduleAutoAdvanceIfReady(isPass, dictationAlreadyDone, true, nextBonus, nextMax);
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        const errCode = event?.error || 'unknown';
        setMicErrorMsg(
          `Microphone access unavailable (${errCode}). Use "Skip / Can't speak right now" below to continue.`
        );
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      setIsRecording(false);
      setMicErrorMsg(
        'Microphone blocked by browser/iframe permissions. Use "Skip / Can\'t speak right now" to proceed.'
      );
    }
  };

  const handleSkipSpeaking = () => {
    if (speakingEvaluated || speakingSkipped) return;
    soundFX.playPop();
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore
      }
    }
    setIsRecording(false);
    setSpeakingSkipped(true);
    setSpeakingEvaluated(true);

    const dictationAlreadyDone = !showDictation || dictationSubmitted;
    scheduleAutoAdvanceIfReady(true, dictationAlreadyDone, true, bonusXp, maxCombo);
  };

  const isDictationDone = !showDictation || dictationSubmitted;
  const isSpeakingDone = !showSpeaking || speakingSkipped || speakingEvaluated;
  const canAdvance = isDictationDone && isSpeakingDone;
  const isRun2OrHigher = nodeLevel >= 1;
  const isMasteryTrial = nodeLevel >= 2;
  const hideSpeakingPinyin =
    !speakingEvaluated &&
    (isMasteryTrial || ((masteryLevel >= 4 || isRun2OrHigher) && !showPinyinHint));
  const hideSpeakingHanzi = masteryLevel >= 7 && !speakingEvaluated && !showPinyinHint;

  return (
    <StageModalMotionShell>
        <SessionGameTopHud
          title={
            initialFocusMode === 'dictation'
              ? isMasteryTrial
                ? 'Listening • Trial 3/3'
                : isRun2OrHigher
                ? 'Listening • Run 2/3'
                : 'Listening (Dictation)'
              : initialFocusMode === 'speaking'
              ? isMasteryTrial
                ? 'Speaking • Trial 3/3'
                : isRun2OrHigher
                ? 'Speaking • Run 2/3'
                : 'Speaking (Pronunciation)'
              : 'Stage 3 • Listening & Speaking'
          }
          subtitle={`Word ${stepIndex + 1} of ${words.length} • Lv.${masteryLevel}/10 (${tierMeta.tier})`}
          totalSegments={words.length}
          completedSegments={stepIndex + (canAdvance ? 1 : 0)}
          combo={combo}
          sessionSeconds={elapsedSeconds}
          xpPopupKey={xpPopupKey}
          xpPopupAmount={xpPopupAmount}
          onClose={() => {
            clearFeedbackTimer();
            flushSessionTime();
            onClose();
          }}
        />

        <motion.div
          key={`audio-step-${stepIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="my-auto space-y-4 py-3"
        >
          {showDictation && (
            <div
              className={`rounded-3xl bg-slate-800/90 border p-4 space-y-3.5 shadow-xl transition-all ${
                dictationAnim === 'wrong'
                  ? 'border-rose-500 bg-rose-950/20 animate-game-shake'
                  : dictationAnim === 'correct'
                  ? 'border-emerald-400 animate-game-green-pulse'
                  : 'border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <Headphones className="w-3 h-3" />
                  <span>
                    {masteryLevel >= 7 ? 'Lv.7+ Strict Dictation' : 'Listening (Dictation)'}
                  </span>
                </span>
                <span className="font-clarity text-[15px] font-semibold text-slate-300 truncate">
                  Meaning:{' '}
                  <strong className="text-white">
                    {(currentWord.meaning || currentWord.english).split(' / ')[0]}
                  </strong>
                </span>
              </div>

              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-clarity text-[15px] font-bold text-white">Listen to the Mandarin word</p>
                  <p className="font-clarity text-sm text-slate-300 mt-0.5">
                    {dictationSubmitted
                      ? `${currentWord.hanzi} (${currentWord.pinyin})`
                      : 'Tap 1.0x Normal or 0.65x Slow to hear pronunciation'}
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
                  disabled={dictationSubmitted}
                  onClick={() => {
                    soundFX.playPop();
                    setDictationSubMode('pinyin');
                    setDictationResult(null);
                  }}
                  className={`game-btn-3d py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    dictationSubMode === 'pinyin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Type Pinyin</span>
                </button>
                <button
                  type="button"
                  disabled={dictationSubmitted}
                  onClick={() => {
                    soundFX.playPop();
                    setDictationSubMode('hanzi');
                    setDictationResult(null);
                  }}
                  className={`game-btn-3d py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    dictationSubMode === 'hanzi'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-hanzi">字</span>
                  <span>Type Hanzi</span>
                </button>
              </div>

              <form onSubmit={handleCheckDictation} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={dictationSubmitted}
                    value={dictationInput}
                    onChange={(e) => setDictationInput(e.target.value)}
                    placeholder={
                      dictationSubMode === 'pinyin'
                        ? 'e.g. nǐ hǎo or ni3 hao3 (tones required)'
                        : 'Type Chinese characters (e.g. 你好)'
                    }
                    className={`flex-1 bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none ${
                      dictationSubmitted
                        ? dictationResult?.isValid
                          ? 'border-emerald-400 bg-emerald-950/30 text-emerald-200'
                          : 'border-rose-500 bg-rose-950/30 text-rose-200'
                        : 'border-slate-700 focus:border-emerald-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={dictationSubmitted || !dictationInput.trim()}
                    className="game-btn-3d px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shrink-0 border-b-2 border-emerald-800 disabled:border-slate-900"
                  >
                    Submit
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  {dictationSubMode === 'pinyin'
                    ? 'Tones required: use tone marks (nǐ hǎo) or tone numbers (ni3 hao3). Sandhi & neutral tones accepted.'
                    : `Hint: ${currentWord.literal}`}
                </p>
              </form>

              {dictationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`rounded-xl p-3 border text-xs space-y-2.5 ${
                    dictationResult.isValid
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                  }`}
                >
                  <div>
                    <p className="font-extrabold">
                      {dictationResult.isValid
                        ? `✓ Correct! (${dictationResult.matchType})`
                        : `✗ Incorrect — Correct answer: ${currentWord.hanzi} (${currentWord.pinyin})`}
                    </p>
                    <p className="text-[11px] mt-0.5 opacity-90">{dictationResult.feedback}</p>
                  </div>

                  {/* Chao Tone Contour Visualizer & Sandhi Hint on Listening Feedback */}
                  <div className="pt-1 border-t border-white/10">
                    <ChaoToneVisualizer
                      pinyin={currentWord.pinyin}
                      hanzi={currentWord.hanzi}
                      compact
                    />
                  </div>

                  {currentWord.exampleHanzi && (
                    <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                      <InteractiveExampleText
                        sentence={currentWord.exampleHanzi}
                        speakMandarin={speakMandarin}
                        masteryMap={progress?.mastery}
                        courseWords={Array.isArray(courseWords) && courseWords.length > 0 ? courseWords : words}
                        charClassName="text-sm font-bold text-white"
                        onInspectOpenChange={setIsInspectingExample}
                      />
                      {currentWord.exampleEnglish && (
                        <p className="font-clarity text-[11px] opacity-85 italic">
                          "{currentWord.exampleEnglish}"
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {showSpeaking && (
            <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>Speaking (Pronunciation)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {hideSpeakingPinyin && !isMasteryTrial && (
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

              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 text-center space-y-2">
                <div className="text-3xl font-black text-white tracking-wider font-hanzi">
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
                <p className="font-clarity text-[15px] font-medium text-slate-300">
                  {currentWord.meaning || currentWord.english}
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartSpeechRecognition}
                disabled={isRecording || speakingEvaluated || speakingSkipped}
                className={`game-btn-3d w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all border ${
                  isRecording
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-950/50'
                    : similarityData && similarityData.score >= 50
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : similarityData
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-md'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {isRecording
                    ? 'Listening in Mandarin (zh-CN)... Speak now!'
                    : speakingEvaluated
                    ? similarityData?.score >= 50
                      ? '✓ Correct Pronunciation!'
                      : `✗ Evaluated — Target: ${currentWord.hanzi} (${currentWord.pinyin})`
                    : hideSpeakingHanzi
                    ? 'Tap & Speak the Mandarin word'
                    : hideSpeakingPinyin
                    ? `Tap & Say "${currentWord.hanzi}"`
                    : `Tap & Say "${currentWord.hanzi}" (${currentWord.pinyin})`}
                </span>
              </button>

              {similarityData && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`rounded-2xl p-3.5 space-y-2 border ${
                    similarityData.score >= 50
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold opacity-80">Recognized Speech: </span>
                      <span className="text-white font-black text-sm font-hanzi">
                        "{recognizedText || similarityData.matchedText}"
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-black/30">
                      {similarityData.score}% Match
                    </span>
                  </div>
                  <p className="text-[11px] font-bold">
                    {similarityData.score >= 50
                      ? `✓ Correct! ${similarityData.feedback}`
                      : `✗ Incorrect — Correct answer: ${currentWord.hanzi} (${currentWord.pinyin})`}
                  </p>
                  {currentWord.exampleHanzi && (
                    <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                      <InteractiveExampleText
                        sentence={currentWord.exampleHanzi}
                        speakMandarin={speakMandarin}
                        masteryMap={progress?.mastery}
                        courseWords={Array.isArray(courseWords) && courseWords.length > 0 ? courseWords : words}
                        charClassName="text-sm font-bold text-white"
                        onInspectOpenChange={setIsInspectingExample}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {micErrorMsg && (
                <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-[11px] text-amber-200">
                  {micErrorMsg}
                </div>
              )}

              {!speakingEvaluated && !speakingSkipped && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSkipSpeaking}
                    className="game-btn-3d w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                    <span>Skip / Can't speak right now</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="pt-1 text-center text-[11px] font-bold text-slate-400">
          {canAdvance && isInspectingExample ? (
            <button
              type="button"
              onClick={() => {
                const payload = pendingAdvancePayloadRef.current;
                advanceAudioSpeechNow(
                  payload?.updatedBonusXp ?? bonusXp,
                  payload?.updatedMaxCombo ?? maxCombo
                );
              }}
              className="game-btn-3d w-full py-2.5 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-300 text-white font-pixel-header text-[9px] uppercase tracking-wider"
            >
              Continue →
            </button>
          ) : canAdvance ? (
            'Auto-advancing to next word...'
          ) : (
            'Complete the activity above to auto-advance'
          )}
        </div>
    </StageModalMotionShell>
  );
}

// ============================================================================
// STAGE 4 MODAL: UNIT BOSS BATTLE (BOSS AVATAR + HP BAR + 3 HEARTS + 15s TIMER + COMBO/SFX)
// ============================================================================
export function BossChallengeModal({
  words = UNIT_1_WORDS,
  courseWords,
  progress,
  pastLessonWords = [],
  nodeLevel = 0,
  isPracticeMode = false,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onRecordSkillEvent,
  onRecordStudySeconds,
  onClose,
  onComplete
}) {
  const [status, setStatus] = useState('playing'); // 'playing' | 'lost' | 'won'
  const { elapsedSeconds, flushSessionTime } = useSessionTimer(
    status === 'playing',
    onRecordStudySeconds
  );
  const isRun2OrHigher = nodeLevel >= 1;
  const isMasteryTrial = nodeLevel >= 2;
  const turnDurationSeconds = isMasteryTrial ? 12 : 15;

  const questions = useMemo(
    () => buildBossQuestionsForWords(words, pastLessonWords, nodeLevel),
    [words, pastLessonWords, nodeLevel]
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [bossHp, setBossHp] = useState(questions.length);
  const [timeLeft, setTimeLeft] = useState(turnDurationSeconds);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showPinyinHint, setShowPinyinHint] = useState(false);
  const [correctWordIds, setCorrectWordIds] = useState([]);

  // Gamified Combo, Boss Hit Animation & Floating XP
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [xpPopupKey, setXpPopupKey] = useState(0);
  const [xpPopupAmount, setXpPopupAmount] = useState(5);
  const [bossDamageAnim, setBossDamageAnim] = useState(false);
  const [playerDamageAnim, setPlayerDamageAnim] = useState(false);
  const [isInspectingExample, setIsInspectingExample] = useState(false);

  const feedbackTimerRef = useRef(null);
  const pendingNextHeartsRef = useRef(null);
  const currentQuestion = questions[questionIndex] || questions[0];
  const currentQuestionWord = useMemo(() => {
    const allBossPool = [
      ...words,
      ...pastLessonWords,
      ...(Array.isArray(courseWords) ? courseWords : [])
    ];
    return (
      allBossPool.find(
        (w) =>
          w &&
          (w.id === currentQuestion?.wordId || w.hanzi === currentQuestion?.focusHanzi)
      ) || null
    );
  }, [words, pastLessonWords, courseWords, currentQuestion]);
  const bossPostAnswerExample =
    currentQuestionWord?.exampleHanzi || currentQuestion?.speechText || '';
  const maxBossHp = questions.length;
  const bossHpPercent = Math.max(0, Math.round((bossHp / Math.max(1, maxBossHp)) * 100));

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearFeedbackTimer();
  }, [clearFeedbackTimer]);

  const allowBossAudioBeforeAnswer = canExposeAudioBeforeAnswer(
    'boss',
    Boolean(currentQuestion?.optionsHavePinyin)
  );

  useEffect(() => {
    if (status === 'playing' && currentQuestion && allowBossAudioBeforeAnswer) {
      speakMandarin(currentQuestion.speechText);
    }
  }, [questionIndex, status, currentQuestion, allowBossAudioBeforeAnswer, speakMandarin]);

  const advanceBossTurnNow = useCallback(
    (nextHeartsValue) => {
      clearFeedbackTimer();
      pendingNextHeartsRef.current = null;
      setIsInspectingExample(false);
      if (nextHeartsValue <= 0) {
        setStatus('lost');
        return;
      }
      if (questionIndex < questions.length - 1) {
        setQuestionIndex((prev) => prev + 1);
        setSelectedOptionId(null);
        setIsAnswered(false);
        setShowPinyinHint(false);
        setTimeLeft(turnDurationSeconds);
      } else {
        setStatus('won');
      }
    },
    [clearFeedbackTimer, questionIndex, questions.length, turnDurationSeconds]
  );

  const scheduleBossTurnAdvance = useCallback(
    (delayMs, nextHeartsValue) => {
      clearFeedbackTimer();
      pendingNextHeartsRef.current = nextHeartsValue;
      feedbackTimerRef.current = setTimeout(() => {
        advanceBossTurnNow(nextHeartsValue);
      }, delayMs);
    },
    [clearFeedbackTimer, advanceBossTurnNow]
  );

  useEffect(() => {
    if (isInspectingExample) {
      clearFeedbackTimer();
      return;
    }
    if (
      status === 'playing' &&
      isAnswered &&
      pendingNextHeartsRef.current !== null &&
      !feedbackTimerRef.current
    ) {
      const nextHeartsVal = pendingNextHeartsRef.current;
      feedbackTimerRef.current = setTimeout(() => {
        advanceBossTurnNow(nextHeartsVal);
      }, 1400);
    }
  }, [isInspectingExample, status, isAnswered, clearFeedbackTimer, advanceBossTurnNow]);

  useEffect(() => {
    if (status !== 'playing' || isAnswered) return;

    if (timeLeft <= 0) {
      soundFX.playMistake();
      setCombo(0);
      setPlayerDamageAnim(true);
      setTimeout(() => setPlayerDamageAnim(false), 500);
      if (currentQuestion) {
        onRecordSkillEvent?.(
          { id: currentQuestion.wordId, hanzi: currentQuestion.focusHanzi },
          'recognition',
          { mistakesDelta: 1, completionsDelta: 0 }
        );
      }
      setIsAnswered(true);
      setSelectedOptionId('timeout');
      const nextHearts = hearts - 1;
      setHearts(nextHearts);
      scheduleBossTurnAdvance(1800, nextHearts);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [
    timeLeft,
    status,
    isAnswered,
    hearts,
    currentQuestion,
    onRecordSkillEvent,
    scheduleBossTurnAdvance
  ]);

  const handleSelectOption = (option) => {
    if (isAnswered || status !== 'playing') return;

    setSelectedOptionId(option.id);
    setIsAnswered(true);

    if (option.isCorrect) {
      speakMandarin(currentQuestion.speechText, 1.0);
      setBossHp((prev) => Math.max(0, prev - 1));
      setBossDamageAnim(true);
      setTimeout(() => setBossDamageAnim(false), 550);
      onRecordSkillEvent?.(
        { id: currentQuestion.wordId, hanzi: currentQuestion.focusHanzi },
        'recognition',
        { mistakesDelta: 0, completionsDelta: 1 }
      );

      setCombo((prev) => {
        const nextCombo = prev + 1;
        setMaxCombo((m) => Math.max(m, nextCombo));
        soundFX.playCorrect(nextCombo);
        const comboBonus = nextCombo >= 2 ? Math.min(3, nextCombo - 1) : 0;
        const earned = 5 + comboBonus;
        setBonusXp((b) => b + earned);
        setXpPopupAmount(earned);
        setXpPopupKey((k) => k + 1);
        return nextCombo;
      });

      setCorrectWordIds((prev) =>
        prev.includes(currentQuestion.wordId) ? prev : [...prev, currentQuestion.wordId]
      );
      scheduleBossTurnAdvance(1400, hearts);
    } else {
      soundFX.playMistake();
      setCombo(0);
      setPlayerDamageAnim(true);
      setTimeout(() => setPlayerDamageAnim(false), 500);
      onRecordSkillEvent?.(
        { id: currentQuestion.wordId, hanzi: currentQuestion.focusHanzi },
        'recognition',
        { mistakesDelta: 1, completionsDelta: 0 }
      );

      const nextHearts = hearts - 1;
      setHearts(nextHearts);
      scheduleBossTurnAdvance(1800, nextHearts);
    }
  };

  const handleRetryBoss = () => {
    clearFeedbackTimer();
    pendingNextHeartsRef.current = null;
    setIsInspectingExample(false);
    soundFX.playPop();
    setQuestionIndex(0);
    setHearts(3);
    setBossHp(questions.length);
    setCombo(0);
    setBonusXp(0);
    setTimeLeft(turnDurationSeconds);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setShowPinyinHint(false);
    setCorrectWordIds([]);
    setStatus('playing');
  };

  const correctOptionObj = currentQuestion?.options?.find((o) => o.isCorrect);
  const selectedWasCorrect = currentQuestion?.options?.find(
    (o) => o.id === selectedOptionId
  )?.isCorrect;
  const currentQuestionMasteryLv = currentQuestionWord
    ? getWordMasteryLevel(progress?.mastery, currentQuestionWord)
    : 0;
  const hideBossFocusPinyin =
    !isAnswered &&
    !currentQuestion?.optionsHavePinyin &&
    (isMasteryTrial || ((currentQuestionMasteryLv >= 4 || isRun2OrHigher) && !showPinyinHint));

  return (
    <StageModalMotionShell>
        <div>
          <SessionGameTopHud
            title={
              isPracticeMode
                ? 'Practice Arena Quiz'
                : isMasteryTrial
                ? 'Boss Battle • Trial 3/3'
                : isRun2OrHigher
                ? 'Boss Battle • Run 2/3'
                : 'Stage 4 • Boss Battle'
            }
            subtitle={`Turn ${questionIndex + 1} of ${questions.length} • ${turnDurationSeconds}s Clock`}
            totalSegments={questions.length}
            completedSegments={questionIndex + (isAnswered ? 1 : 0)}
            combo={combo}
            sessionSeconds={elapsedSeconds}
            xpPopupKey={xpPopupKey}
            xpPopupAmount={xpPopupAmount}
            onClose={() => {
              clearFeedbackTimer();
              flushSessionTime();
              onClose();
            }}
          />

          {/* BOSS AVATAR (16x16 PIXEL JADE DRAGON SPRITE) & 12-BLOCK HP BAR VS PLAYER PIXEL HEARTS & 15s TIMER */}
          <div className="mt-3 rounded-[2px] bg-slate-950 border-2 border-amber-500 p-3 space-y-2.5">
            {/* Boss Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-[2px] flex items-center justify-center border-2 shrink-0 overflow-hidden transition-transform ${
                    bossDamageAnim
                      ? 'border-rose-400 bg-rose-950'
                      : 'border-emerald-400 bg-emerald-950'
                  }`}
                >
                  <PixelJadeDragonSprite damaged={bossDamageAnim} className="w-11 h-11" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-pixel-header text-[9px] text-amber-300 truncate">
                      Jade Dragon Boss
                    </span>
                    {bossDamageAnim && (
                      <span className="font-pixel-header text-[9px] text-rose-400 animate-bounce">
                        -1 HP!
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 max-w-[165px]">
                    <PixelBlockGauge
                      value={bossHp}
                      max={maxBossHp}
                      blocks={12}
                      filledClass={bossDamageAnim ? 'bg-rose-500' : 'bg-emerald-400'}
                      emptyClass="bg-slate-900"
                      heightClass="h-2"
                    />
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-pixel-header text-[8px] uppercase text-emerald-300 block">
                  Boss HP
                </span>
                <span className="font-pixel-header text-[11px] text-white">
                  {bossHp}/{maxBossHp}
                </span>
              </div>
            </div>

            {/* Player Pixel Hearts & 15s Turn Timer Bar */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-slate-800">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-slate-900 border-2 border-rose-500/70 ${
                  playerDamageAnim ? 'animate-game-shake bg-rose-950 border-rose-400' : ''
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-rose-400 mr-0.5" />
                {[1, 2, 3].map((heartIdx) => (
                  <PixelHeartSprite
                    key={heartIdx}
                    filled={heartIdx <= hearts}
                    className="w-4 h-4"
                  />
                ))}
              </div>

              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-[2px] font-pixel-header text-[10px] border-2 ${
                  timeLeft <= 5
                    ? 'bg-rose-950 border-rose-400 text-rose-200 animate-pulse'
                    : 'bg-slate-900 border-amber-500/70 text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>
          </div>
        </div>

        {status === 'playing' && (
          <motion.div
            key={`boss-turn-${questionIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="my-auto space-y-4 py-3"
          >
            <div
              className={`rounded-3xl bg-gradient-to-b from-purple-950/60 to-slate-800/90 border border-purple-500/40 p-5 text-center space-y-2 shadow-xl ${
                playerDamageAnim ? 'animate-game-shake border-rose-500' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    Attack Turn {questionIndex + 1}/{questions.length}
                  </span>
                  {currentQuestion?.isPastLessonReview && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      Past Lesson Review
                    </span>
                  )}
                </div>
                {allowBossAudioBeforeAnswer && (
                  <MandarinAudioControls
                    text={currentQuestion.speechText}
                    isSlowMode={isSlowMode}
                    onSetSlowMode={onSetSlowMode}
                    speakMandarin={speakMandarin}
                    speakingState={speakingState}
                    size="sm"
                  />
                )}
              </div>

              <p className="font-clarity text-[15px] font-bold text-slate-200 pt-1">{currentQuestion.prompt}</p>
              <div
                className={
                  currentQuestion.questionType === 'reverse_meaning'
                    ? 'font-clarity text-2xl font-black text-amber-300 py-1.5'
                    : currentQuestion.questionType === 'cloze'
                    ? 'font-hanzi text-2xl font-black text-white py-1.5'
                    : 'text-3xl font-black text-white py-1 font-hanzi'
                }
              >
                {isAnswered && currentQuestion.questionType === 'reverse_meaning'
                  ? `${currentQuestion.focusHanzi} (${currentQuestionWord?.pinyin || ''}) — ${
                      currentQuestion.displayFocusText || currentQuestion.focusHanzi
                    }`
                  : isAnswered && currentQuestion.questionType === 'cloze'
                  ? currentQuestion.speechText || currentQuestion.displayFocusText
                  : currentQuestion.displayFocusText || currentQuestion.focusHanzi}
              </div>
              {hideBossFocusPinyin ? (
                <div className="py-1 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isMasteryTrial
                      ? 'Mastery Trial 3/3 • Pinyin hidden before answering'
                      : isRun2OrHigher
                      ? 'Run 2/3 • Pinyin hidden by default'
                      : `Lv.${currentQuestionMasteryLv} Recall • Pinyin hidden by default`}
                  </p>
                  {!isMasteryTrial && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setShowPinyinHint(true);
                      }}
                      className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Pinyin Hint</span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={
                    currentQuestion.questionType === 'cloze'
                      ? 'font-clarity text-sm font-bold text-slate-300 italic'
                      : 'font-pinyin text-rose-300'
                  }
                >
                  {isAnswered &&
                  currentQuestion.questionType === 'cloze' &&
                  (currentQuestion.clozePinyin || currentQuestionWord?.examplePinyin)
                    ? `${currentQuestion.clozePinyin || currentQuestionWord.examplePinyin} • ${
                        currentQuestion.focusPinyin
                      }`
                    : currentQuestion.focusPinyin}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                let btnStyle =
                  'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100';

                if (isAnswered) {
                  if (opt.isCorrect) {
                    btnStyle =
                      'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-extrabold animate-game-green-pulse';
                  } else if (isSelected && !opt.isCorrect) {
                    btnStyle =
                      'bg-rose-500/20 border-rose-500 text-rose-200 animate-game-shake';
                  } else {
                    btnStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt)}
                    className={`game-btn-3d font-clarity w-full p-3.5 rounded-2xl border text-left text-[15px] font-bold flex items-center justify-between transition-all ${btnStyle}`}
                  >
                    <span
                      className={
                        currentQuestion.optionsAreHanzi
                          ? 'font-hanzi text-2xl font-black tracking-wider'
                          : 'font-clarity'
                      }
                    >
                      {opt.text}
                    </span>
                    {isAnswered && opt.isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !opt.isCorrect && (
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`rounded-2xl p-3 text-xs border space-y-2 ${
                  selectedWasCorrect
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {selectedOptionId === 'timeout'
                        ? `⏰ Time ran out! — Correct answer: ${correctOptionObj?.text}`
                        : selectedWasCorrect
                        ? '✓ Correct! Direct hit on the Boss (-1 HP)'
                        : `✗ Incorrect — Correct answer: ${correctOptionObj?.text}`}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">{currentQuestion.explanation}</p>
                  </div>
                  <MandarinAudioControls
                    text={currentQuestion.speechText}
                    isSlowMode={isSlowMode}
                    onSetSlowMode={onSetSlowMode}
                    speakMandarin={speakMandarin}
                    speakingState={speakingState}
                    size="sm"
                  />
                </div>
                {bossPostAnswerExample && (
                  <div className="pt-1.5 border-t border-white/10">
                    <InteractiveExampleText
                      sentence={bossPostAnswerExample}
                      speakMandarin={speakMandarin}
                      masteryMap={progress?.mastery}
                      courseWords={Array.isArray(courseWords) && courseWords.length > 0 ? courseWords : words}
                      charClassName="text-sm font-bold text-white"
                      onInspectOpenChange={setIsInspectingExample}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {status === 'lost' && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="my-auto"
          >
            <div className="rounded-[2px] bg-slate-900 border-2 border-rose-500 p-6 text-center space-y-4 animate-game-shake">
            <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="font-pixel-header text-sm text-rose-400">Out of Hearts!</h2>
            <p className="text-xs text-slate-300">
              The Jade Dragon Guardian held strong with {bossHp} HP left. Regroup and challenge the boss again!
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  clearFeedbackTimer();
                  flushSessionTime();
                  onClose();
                }}
                className="game-btn-3d flex-1 py-3 rounded-[2px] bg-slate-950 border-2 border-slate-700 text-xs font-bold text-slate-300"
              >
                Return to Map
              </button>
              <button
                type="button"
                onClick={handleRetryBoss}
                className="game-btn-3d flex-1 py-3 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white border-2 border-rose-300"
              >
                Try Again (3 Hearts)
              </button>
            </div>
            </div>
          </motion.div>
        )}

        {status === 'won' && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="my-auto"
          >
            <div className="rounded-[2px] bg-slate-900 border-2 border-amber-400 p-6 text-center space-y-4 animate-game-green-pulse">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="font-pixel-header text-sm text-amber-300">Guardian Boss Defeated!</h2>
            <p className="text-xs text-slate-300">
              You depleted the Boss HP to 0 with{' '}
              <span className="text-rose-400 font-bold">{hearts} heart(s)</span> remaining and a{' '}
              <span className="text-amber-300 font-bold">{maxCombo}x max combo</span>!
            </p>
            <button
              type="button"
              onClick={() => {
                flushSessionTime();
                onComplete(correctWordIds, hearts, bonusXp, maxCombo);
              }}
              className="game-btn-3d w-full py-3.5 rounded-[2px] bg-gradient-to-r from-amber-500 to-rose-600 text-white font-extrabold text-xs border-2 border-amber-200"
            >
              Claim Victory Rewards & Bonus XP
            </button>
            </div>
          </motion.div>
        )}

        {status === 'playing' && (
          <div className="pt-1 text-center text-[11px] font-bold text-slate-400">
            {isAnswered && isInspectingExample ? (
              <button
                type="button"
                onClick={() =>
                  advanceBossTurnNow(
                    pendingNextHeartsRef.current !== null ? pendingNextHeartsRef.current : hearts
                  )
                }
                className="game-btn-3d w-full py-2.5 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-300 text-white font-pixel-header text-[9px] uppercase tracking-wider"
              >
                Next Turn →
              </button>
            ) : isAnswered ? (
              'Auto-advancing to next turn...'
            ) : (
              `Select an answer before the ${turnDurationSeconds}s timer expires!`
            )}
          </div>
        )}
    </StageModalMotionShell>
  );
}
