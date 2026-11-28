import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Keyboard,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Wrench,
  BookOpen,
  Languages
} from 'lucide-react';
import { soundFX } from '../audio/soundEngine.js';
import {
  MandarinAudioControls,
  InteractiveExampleText
} from './SharedHudAndAudio.jsx';
import {
  gradeMandarinProduction,
  gradeOpenClozeAnswer
} from '../engine/translationGrader.js';

// ============================================================================
// SHARED ANTI-SPOILER HELPERS & TILE BUILDERS
// ============================================================================

const FALLBACK_GRAMMAR_DISTRACTORS = ['不', '没', '了', '吗', '的', '很', '有', '在'];

const OPEN_CLOZE_EQUIVALENTS = {
  哪儿: [{ hanzi: '哪里', pinyin: 'nǎlǐ' }],
  哪里: [{ hanzi: '哪儿', pinyin: 'nǎr' }],
  这儿: [{ hanzi: '这里', pinyin: 'zhèlǐ' }],
  这里: [{ hanzi: '这儿', pinyin: 'zhèr' }],
  那儿: [{ hanzi: '那里', pinyin: 'nàlǐ' }],
  那里: [{ hanzi: '那儿', pinyin: 'nàr' }],
  一点儿: [{ hanzi: '一点', pinyin: 'yīdiǎn' }],
  一点: [{ hanzi: '一点儿', pinyin: 'yīdiǎnr' }],
  点: [{ hanzi: '点钟', pinyin: 'diǎn zhōng' }],
  点钟: [{ hanzi: '点', pinyin: 'diǎn' }]
};

const PRIORITY_CLOZE_PARTICLES = new Set([
  '了',
  '的',
  '在',
  '没',
  '没有',
  '不',
  '都',
  '也',
  '吗',
  '呢',
  '吧',
  '过',
  '比',
  '很',
  '正在'
]);

const ROLE_HINT_LABELS = {
  particle: 'Particle',
  classifier: 'Measure Word',
  modal: 'Modal Verb',
  verb: 'Verb',
  adj: 'Adjective',
  adv: 'Adverb',
  prep: 'Preposition',
  time: 'Time Word',
  place: 'Location',
  num: 'Number',
  pron: 'Pronoun',
  noun: 'Noun',
  conj: 'Conjunction'
};

function hashStringSeed(str = '') {
  const s = String(str || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function shuffleWithVariation(list = [], ensureDifferentOrder = false) {
  const arr = Array.isArray(list) ? [...list] : [];
  if (arr.length <= 1) return arr;

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  if (ensureDifferentOrder && arr.length > 1) {
    const sameAsOriginal = arr.every((entry, idx) => entry === list[idx]);
    if (sameAsOriginal) {
      const first = arr.shift();
      arr.push(first);
    }
  }

  return arr;
}

function buildShuffledBlockBank(tokens = [], distractorTokens = [], itemKey = 'item') {
  const safeTokens = Array.isArray(tokens)
    ? tokens.filter((t) => t && typeof t.hanzi === 'string' && t.hanzi.trim())
    : [];
  const usedHanziSet = new Set(safeTokens.map((t) => t.hanzi.trim()));

  const realTiles = safeTokens.map((tok, idx) => ({
    uid: `${itemKey}_tok_${idx}_${tok.hanzi}`,
    hanzi: tok.hanzi.trim(),
    isDistractor: false
  }));

  const rawDistractors = Array.isArray(distractorTokens) ? distractorTokens : [];
  const distractorCandidates = [];
  const seenDistractorHanzi = new Set();

  for (let i = 0; i < rawDistractors.length; i++) {
    const entry = rawDistractors[i];
    const h = typeof entry === 'string' ? entry.trim() : String(entry?.hanzi || '').trim();
    if (!h || usedHanziSet.has(h) || seenDistractorHanzi.has(h)) continue;
    seenDistractorHanzi.add(h);
    distractorCandidates.push(h);
    if (distractorCandidates.length >= 3) break;
  }

  // Ensure at least 2 grammatical distractors when available
  if (distractorCandidates.length < 2) {
    for (let i = 0; i < FALLBACK_GRAMMAR_DISTRACTORS.length; i++) {
      const candidate = FALLBACK_GRAMMAR_DISTRACTORS[i];
      if (!usedHanziSet.has(candidate) && !seenDistractorHanzi.has(candidate)) {
        seenDistractorHanzi.add(candidate);
        distractorCandidates.push(candidate);
        if (distractorCandidates.length >= 2) break;
      }
    }
  }

  const distractorTiles = distractorCandidates.slice(0, 3).map((h, idx) => ({
    uid: `${itemKey}_dist_${idx}_${h}`,
    hanzi: h,
    isDistractor: true
  }));

  return shuffleWithVariation([...realTiles, ...distractorTiles], true);
}

function selectOpenClozeBlankIndex(item) {
  const tokens = Array.isArray(item?.tokens) ? item.tokens : [];
  if (tokens.length === 0) return -1;

  if (typeof item?.blankTokenIndex === 'number' && tokens[item.blankTokenIndex]) {
    return item.blankTokenIndex;
  }

  const candidateIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t && typeof t.hanzi === 'string' && t.hanzi.trim() && t.isBlankCandidate !== false) {
      candidateIndices.push(i);
    }
  }

  const poolIndices =
    candidateIndices.length > 0
      ? candidateIndices
      : tokens
          .map((t, i) => (t && typeof t.hanzi === 'string' && t.hanzi.trim() ? i : -1))
          .filter((i) => i >= 0);

  if (poolIndices.length === 0) return -1;

  const seed = hashStringSeed(item?.id || item?.hanzi || 'cloze');

  const grammarFocused = poolIndices.filter((i) => {
    const t = tokens[i];
    return (
      PRIORITY_CLOZE_PARTICLES.has(t.hanzi) ||
      ['particle', 'classifier', 'modal', 'adv', 'prep'].includes(t.pos)
    );
  });

  const targetFocused = poolIndices.filter((i) => Boolean(tokens[i]?.isTarget));

  const contentFocused = poolIndices.filter((i) =>
    ['verb', 'adj', 'time', 'num', 'noun'].includes(tokens[i]?.pos)
  );

  // Alternate cleanly between target vocabulary and core grammar markers
  if (targetFocused.length > 0 && (grammarFocused.length === 0 || seed % 2 === 0)) {
    return targetFocused[seed % targetFocused.length];
  }
  if (grammarFocused.length > 0) {
    return grammarFocused[seed % grammarFocused.length];
  }
  if (contentFocused.length > 0) {
    return contentFocused[seed % contentFocused.length];
  }
  return poolIndices[seed % poolIndices.length];
}

function getRoleHintLabel(token) {
  if (!token || typeof token !== 'object') return 'Word';
  if (token.role === 'classifier' || token.pos === 'classifier') return 'Measure Word';
  if (token.role === 'aspect' || token.role === 'particle' || token.pos === 'particle') {
    return 'Particle';
  }
  if (token.role === 'negation') return 'Negation';
  if (token.role === 'modal' || token.pos === 'modal') return 'Modal Verb';
  if (token.role === 'time' || token.pos === 'time') return 'Time';
  if (token.role === 'place' || token.pos === 'place') return 'Location';
  if (token.role === 'sep_v1' || token.role === 'sep_v2') return 'Separable Verb';
  return ROLE_HINT_LABELS[token.pos] || 'Word';
}

function extractTrailingPunctuation(hanzi = '') {
  const trimmed = String(hanzi || '').trim();
  if (!trimmed) return '';
  const last = trimmed.slice(-1);
  return /[。！？?!.]/.test(last) ? last : '';
}

function buildOpenClozeDisplayParts(sentenceHanzi = '', tokens = []) {
  const raw = String(sentenceHanzi || '').trim();
  const parts = [];
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tokHanzi = String(tokens[i]?.hanzi || '').trim();
    if (tokHanzi && raw) {
      const foundIdx = raw.indexOf(tokHanzi, cursor);
      if (foundIdx > cursor) {
        const between = raw.slice(cursor, foundIdx).trim();
        if (between) {
          parts.push({ type: 'punct', text: between, key: `punct_pre_${i}` });
        }
      }
      if (foundIdx >= cursor) {
        cursor = foundIdx + tokHanzi.length;
      }
    }
    parts.push({ type: 'token', token: tokens[i], tokenIndex: i, key: `cloze_tok_${i}` });
  }

  if (raw && cursor < raw.length) {
    const trailing = raw.slice(cursor).trim();
    if (trailing) {
      parts.push({ type: 'punct', text: trailing, key: 'punct_tail' });
    }
  } else if (!raw) {
    const fallbackPunct = extractTrailingPunctuation(sentenceHanzi);
    if (fallbackPunct) {
      parts.push({ type: 'punct', text: fallbackPunct, key: 'punct_tail' });
    }
  }

  return parts;
}

function EmptyExerciseFallback({ label = 'Exercise' }) {
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

// ============================================================================
// 1. TRANSLATION EXERCISE CARD (EN -> ZH PRODUCTION — `translation_prod`)
// ============================================================================
export function TranslationExerciseCard({
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
  const defaultInputMode = masteryLv <= 5 && nodeLevel < 2 ? 'blocks' : 'keyboard';
  const itemKey = item?.id || item?.hanzi || 'trans_empty';

  const [inputMode, setInputMode] = useState(defaultInputMode);
  const [tileBank, setTileBank] = useState([]);
  const [selectedTileUids, setSelectedTileUids] = useState([]);
  const [typedInput, setTypedInput] = useState('');
  const [submittedGrade, setSubmittedGrade] = useState(null);

  const latestInitRef = useRef({ item, masteryLv, nodeLevel, onInspectOpenChange });
  latestInitRef.current = { item, masteryLv, nodeLevel, onInspectOpenChange };

  useEffect(() => {
    const {
      item: latestItem,
      masteryLv: latestMasteryLv,
      nodeLevel: latestNodeLevel,
      onInspectOpenChange: latestOnInspect
    } = latestInitRef.current;
    const nextMode = latestMasteryLv <= 5 && latestNodeLevel < 2 ? 'blocks' : 'keyboard';
    setInputMode(nextMode);
    setSelectedTileUids([]);
    setTypedInput('');
    setSubmittedGrade(null);
    if (typeof latestOnInspect === 'function') {
      latestOnInspect(false);
    }
    if (latestItem && Array.isArray(latestItem.tokens)) {
      setTileBank(
        buildShuffledBlockBank(latestItem.tokens, latestItem.distractorTokens, itemKey)
      );
    } else {
      setTileBank([]);
    }
  }, [itemKey]);

  const tileByUid = useMemo(() => {
    const map = new Map();
    tileBank.forEach((t) => map.set(t.uid, t));
    return map;
  }, [tileBank]);

  if (!item || typeof item !== 'object' || !item.english || !item.hanzi) {
    return <EmptyExerciseFallback label="Translation" />;
  }

  const isLocked = Boolean(isCompleted || submittedGrade);
  const selectedTiles = selectedTileUids.map((uid) => tileByUid.get(uid)).filter(Boolean);
  const placedUidSet = new Set(selectedTileUids);

  const handleToggleMode = (nextMode) => {
    if (isLocked || nextMode === inputMode) return;
    soundFX.playPop();
    setInputMode(nextMode);
  };

  const handleTapBankTile = (uid) => {
    if (isLocked || placedUidSet.has(uid)) return;
    // Strictly silent on tap (no Mandarin audio spoiler)
    soundFX.playPop();
    setSelectedTileUids((prev) => [...prev, uid]);
  };

  const handleRemoveTrayTile = (uid) => {
    if (isLocked) return;
    soundFX.playPop();
    setSelectedTileUids((prev) => prev.filter((id) => id !== uid));
  };

  const handleClearTray = () => {
    if (isLocked || selectedTileUids.length === 0) return;
    soundFX.playPop();
    setSelectedTileUids([]);
  };

  const canSubmit =
    !isLocked &&
    (inputMode === 'blocks' ? selectedTiles.length > 0 : typedInput.trim().length > 0);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    const userAnswer =
      inputMode === 'blocks'
        ? selectedTiles.map((t) => t.hanzi).join('')
        : typedInput.trim();

    const gradeResult = gradeMandarinProduction(userAnswer, item, {
      inputMode: inputMode === 'blocks' ? 'hanzi' : 'auto',
      requireTones: true
    });

    setSubmittedGrade(gradeResult);
    if (typeof onResult === 'function') {
      onResult({
        isCorrect: Boolean(gradeResult.isCorrect),
        gradeResult,
        item
      });
    }
  };

  const grammarTitle = item.grammarPoint?.title || item.title || '';
  const grammarRule = item.grammarPoint?.ruleSummary || item.ruleSummary || '';

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        'border-amber-500/50'
      )}`}
    >
      {/* Header Row: Exercise Type + Compact Grammar Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-400/50 font-pixel-header text-[9px] uppercase">
          <Languages className="w-3.5 h-3.5 shrink-0" />
          <span>EN → ZH</span>
        </span>
        {grammarTitle ? (
          <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-sky-300 font-clarity text-[11px] font-bold truncate max-w-[65%]">
            {grammarTitle}
          </span>
        ) : null}
      </div>

      {/* Anti-Spoiler English Prompt Card (NO Hanzi, NO Pinyin, NO Audio before submission) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 text-center space-y-1.5">
        <span className="font-clarity text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Translate into Mandarin
        </span>
        <p className="font-clarity text-lg sm:text-xl font-extrabold text-white leading-snug">
          “{item.english}”
        </p>
      </div>

      {/* Dual Input Mode Toggle (Selectable before submitting) */}
      {!isLocked && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleToggleMode('blocks')}
            className={`game-btn-3d py-2 px-3 rounded-[2px] text-[10px] font-pixel-ui uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === 'blocks'
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Blocks</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('keyboard')}
            className={`game-btn-3d py-2 px-3 rounded-[2px] text-[10px] font-pixel-ui uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === 'keyboard'
                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span>Keyboard</span>
          </button>
        </div>
      )}

      {/* Input Area: Blocks Mode OR Keyboard Mode */}
      {!isLocked && inputMode === 'blocks' && (
        <div className="space-y-3">
          {/* Answer Tray */}
          <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-700 p-3 min-h-[68px] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-clarity text-[11px] font-bold text-slate-400">
                Your Mandarin sentence (tap tiles to place or remove):
              </span>
              {selectedTiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearTray}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-slate-800 border border-slate-600 text-slate-300 hover:text-white font-pixel-ui text-[9px] uppercase cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
              {selectedTiles.length === 0 ? (
                <span className="font-clarity text-xs italic text-slate-500">
                  Tap Hanzi blocks below in the right grammatical order...
                </span>
              ) : (
                selectedTiles.map((tile) => (
                  <button
                    key={tile.uid}
                    type="button"
                    onClick={() => handleRemoveTrayTile(tile.uid)}
                    className="game-btn-3d px-3 py-1.5 rounded-[2px] bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-white font-hanzi text-lg font-black leading-none cursor-pointer"
                  >
                    {tile.hanzi}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Shuffled Hanzi Tile Bank (+ 2-3 Grammatical Distractors) */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {tileBank.map((tile) => {
              const isPlaced = placedUidSet.has(tile.uid);
              return (
                <button
                  key={tile.uid}
                  type="button"
                  disabled={isPlaced}
                  onClick={() => handleTapBankTile(tile.uid)}
                  className={`game-btn-3d px-3.5 py-2 rounded-[2px] font-hanzi text-lg font-black leading-none transition-all ${
                    isPlaced
                      ? 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-35 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-600 hover:border-amber-400 text-slate-100 cursor-pointer'
                  }`}
                >
                  {tile.hanzi}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isLocked && inputMode === 'keyboard' && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="font-clarity text-xs font-semibold text-slate-300 block">
            Type Hanzi or Pinyin with tones (e.g. <span className="text-sky-300 font-bold">ni3 hao3</span>, use <span className="text-sky-300 font-bold">v</span> for ü):
          </label>
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type Mandarin Hanzi or Pinyin..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full px-3.5 py-3 rounded-[2px] bg-slate-950 border-2 border-slate-700 focus:border-sky-400 focus:outline-none text-white font-clarity text-base font-bold placeholder:text-slate-500"
          />
        </form>
      )}

      {/* Submit Button */}
      {!isLocked && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`game-btn-3d w-full py-3 px-4 rounded-[2px] font-pixel-header text-[11px] uppercase tracking-wider transition-all ${
            canSubmit
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white cursor-pointer'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-70'
          }`}
        >
          Check Answer
        </button>
      )}

      {/* Post-Answer Feedback, Grammar Diagnosis, Audio & Character Inspector */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
              submittedGrade?.isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {submittedGrade?.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-pixel-header text-[10px] uppercase">
                  {submittedGrade?.isCorrect ? 'Correct' : 'Needs Review'}
                </span>
              </div>
              {submittedGrade?.matchType ? (
                <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-amber-300">
                  {submittedGrade.matchType}
                </span>
              ) : null}
            </div>

            {submittedGrade?.diagnostic ? (
              <p className="font-clarity text-xs sm:text-sm font-semibold text-amber-200 leading-snug pt-0.5">
                {submittedGrade.diagnostic}
              </p>
            ) : submittedGrade?.isCorrect && submittedGrade?.matchedVariant ? (
              <p className="font-clarity text-xs font-semibold text-emerald-200 leading-snug">
                Accepted: <span className="font-hanzi text-sm text-white">{submittedGrade.matchedVariant}</span>
              </p>
            ) : null}
          </div>

          {/* Full Answer Reveal + Audio + Interactive Character Inspector */}
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

            {item.sourceType === 'corpus' && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-pixel-ui text-[9px] uppercase">
                  Corpus • {item.inputLevel === 'i+1' ? 'i+1' : 'i+0'}
                </span>
                {item.inputLevel === 'i+1' && item.unknownToken ? (
                  <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-400/50 text-amber-200 font-clarity text-[11px] font-bold">
                    New Vocabulary in Context (+1):{' '}
                    <span className="font-hanzi text-white">{item.unknownToken}</span>
                  </span>
                ) : null}
              </div>
            )}

            {grammarRule ? (
              <div className="rounded-[2px] bg-slate-900 border border-slate-800 px-2.5 py-2 flex items-start gap-2">
                <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <p className="font-clarity text-xs text-slate-300 leading-snug">
                  {grammarRule}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. OPEN CLOZE CARD (FREE-TEXT FILL-IN-THE-BLANK — `open_cloze`)
// ============================================================================
export function OpenClozeCard({
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
  const itemKey = item?.id || item?.hanzi || 'cloze_empty';
  const [typedInput, setTypedInput] = useState('');
  const [submittedGrade, setSubmittedGrade] = useState(null);

  const latestInspectRef = useRef(onInspectOpenChange);
  latestInspectRef.current = onInspectOpenChange;

  useEffect(() => {
    setTypedInput('');
    setSubmittedGrade(null);
    if (typeof latestInspectRef.current === 'function') {
      latestInspectRef.current(false);
    }
  }, [itemKey]);

  const tokens = useMemo(
    () => (Array.isArray(item?.tokens) ? item.tokens.filter(Boolean) : []),
    [item]
  );

  const blankIndex = useMemo(() => selectOpenClozeBlankIndex(item), [item]);
  const blankToken = blankIndex >= 0 ? tokens[blankIndex] : null;

  const acceptedAnswers = useMemo(() => {
    const list = [];
    if (Array.isArray(item?.acceptedBlankAnswers)) {
      list.push(...item.acceptedBlankAnswers);
    }
    if (blankToken?.hanzi && OPEN_CLOZE_EQUIVALENTS[blankToken.hanzi]) {
      list.push(...OPEN_CLOZE_EQUIVALENTS[blankToken.hanzi]);
    }
    return list;
  }, [item, blankToken]);

  if (!item || typeof item !== 'object' || !item.hanzi || !blankToken) {
    return <EmptyExerciseFallback label="Open Cloze" />;
  }

  const isLocked = Boolean(isCompleted || submittedGrade);
  const showRoleHint = masteryLv <= 3 && nodeLevel === 0;
  const displayParts = buildOpenClozeDisplayParts(item.hanzi, tokens);
  const grammarRule = item.grammarPoint?.ruleSummary || item.ruleSummary || '';
  const grammarTitle = item.grammarPoint?.title || item.title || '';

  const canSubmit = !isLocked && typedInput.trim().length > 0;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    const gradeResult = gradeOpenClozeAnswer(typedInput.trim(), blankToken, acceptedAnswers);

    setSubmittedGrade(gradeResult);
    if (typeof onResult === 'function') {
      onResult({
        isCorrect: Boolean(gradeResult.isCorrect),
        gradeResult,
        item,
        blankToken
      });
    }
  };

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        'border-cyan-500/50'
      )}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-pixel-header text-[9px] uppercase">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Open Cloze</span>
        </span>
        {showRoleHint && !isLocked ? (
          <span className="px-2 py-1 rounded-[2px] bg-amber-500/15 border border-amber-400/50 text-amber-300 font-clarity text-[11px] font-bold">
            Hint: {getRoleHintLabel(blankToken)}
          </span>
        ) : grammarTitle ? (
          <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-cyan-300 font-clarity text-[11px] font-bold truncate max-w-[60%]">
            {grammarTitle}
          </span>
        ) : null}
      </div>

      {/* Anti-Spoiler Cloze Sentence Card (NO Pinyin, NO Audio, NO MC options before submitting) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 text-center space-y-2.5">
        <span className="font-clarity text-xs font-bold uppercase tracking-wider text-amber-400 block">
          Type the missing Mandarin word for [ ___ ]
        </span>

        <div className="font-hanzi text-2xl font-black text-white tracking-wide leading-relaxed flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
          {displayParts.map((part) => {
            if (part.type === 'punct') {
              return (
                <span key={part.key} className="font-hanzi">
                  {part.text}
                </span>
              );
            }
            const { token: tok, tokenIndex: idx } = part;
            if (idx === blankIndex) {
              return isLocked ? (
                <span
                  key={part.key}
                  className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 font-hanzi"
                >
                  {tok.hanzi}
                </span>
              ) : (
                <span
                  key={part.key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] bg-cyan-500/15 border-2 border-dashed border-cyan-400 text-cyan-300 font-clarity text-base font-black"
                >
                  [ ___ ]
                </span>
              );
            }
            return (
              <span key={part.key} className="font-hanzi">
                {tok.hanzi}
              </span>
            );
          })}
        </div>

        {item.english ? (
          <p className="font-clarity text-sm font-semibold text-slate-300 leading-snug pt-1 border-t border-slate-800/80">
            “{item.english}”
          </p>
        ) : null}
      </div>

      {/* Free-Text Input Form */}
      {!isLocked && (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1.5">
            <label className="font-clarity text-xs font-semibold text-slate-300 block">
              Enter Hanzi or tone-accurate Pinyin (toneless accepted only for neutral particles):
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="e.g. 了 / le, 在 / zai4, 本 / ben3..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full px-3.5 py-3 rounded-[2px] bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 focus:outline-none text-white font-clarity text-base font-bold placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`game-btn-3d w-full py-3 px-4 rounded-[2px] font-pixel-header text-[11px] uppercase tracking-wider transition-all ${
              canSubmit
                ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white cursor-pointer'
                : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-70'
            }`}
          >
            Check Blank
          </button>
        </form>
      )}

      {/* Post-Answer Reveal */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
              submittedGrade?.isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {submittedGrade?.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-pixel-header text-[10px] uppercase">
                  {submittedGrade?.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-emerald-300">
                <span className="font-hanzi text-white">{blankToken.hanzi}</span>
                {blankToken.pinyin ? ` (${blankToken.pinyin})` : ''}
              </span>
            </div>

            {submittedGrade?.feedback ? (
              <p className="font-clarity text-xs sm:text-sm font-semibold text-amber-200 leading-snug">
                {submittedGrade.feedback}
              </p>
            ) : null}
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

            {item.sourceType === 'corpus' && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-pixel-ui text-[9px] uppercase">
                  Corpus • {item.inputLevel === 'i+1' ? 'i+1' : 'i+0'}
                </span>
                {item.inputLevel === 'i+1' && item.unknownToken ? (
                  <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-400/50 text-amber-200 font-clarity text-[11px] font-bold">
                    New Vocabulary in Context (+1):{' '}
                    <span className="font-hanzi text-white">{item.unknownToken}</span>
                  </span>
                ) : null}
              </div>
            )}

            {grammarRule ? (
              <div className="rounded-[2px] bg-slate-900 border border-slate-800 px-2.5 py-2 flex items-start gap-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <p className="font-clarity text-xs text-slate-300 leading-snug">
                  {grammarRule}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. SYNTAX TRANSFORM CARD (SYNTACTIC TRANSFORMATION — `syntax_transform`)
// ============================================================================
export function SyntaxTransformCard({
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
  const defaultInputMode = masteryLv <= 5 && nodeLevel < 2 ? 'blocks' : 'keyboard';
  const expectedSentence = item?.expectedSentence || null;
  const baseSentence = item?.baseSentence || null;
  const itemKey = item?.id || expectedSentence?.hanzi || 'xform_empty';

  const [inputMode, setInputMode] = useState(defaultInputMode);
  const [tileBank, setTileBank] = useState([]);
  const [selectedTileUids, setSelectedTileUids] = useState([]);
  const [typedInput, setTypedInput] = useState('');
  const [submittedGrade, setSubmittedGrade] = useState(null);

  const latestInitRef = useRef({
    expectedSentence,
    masteryLv,
    nodeLevel,
    onInspectOpenChange
  });
  latestInitRef.current = {
    expectedSentence,
    masteryLv,
    nodeLevel,
    onInspectOpenChange
  };

  useEffect(() => {
    const {
      expectedSentence: latestExpected,
      masteryLv: latestMasteryLv,
      nodeLevel: latestNodeLevel,
      onInspectOpenChange: latestOnInspect
    } = latestInitRef.current;
    const nextMode = latestMasteryLv <= 5 && latestNodeLevel < 2 ? 'blocks' : 'keyboard';
    setInputMode(nextMode);
    setSelectedTileUids([]);
    setTypedInput('');
    setSubmittedGrade(null);
    if (typeof latestOnInspect === 'function') {
      latestOnInspect(false);
    }
    if (latestExpected && Array.isArray(latestExpected.tokens)) {
      setTileBank(
        buildShuffledBlockBank(
          latestExpected.tokens,
          latestExpected.distractorTokens,
          itemKey
        )
      );
    } else {
      setTileBank([]);
    }
  }, [itemKey]);

  const tileByUid = useMemo(() => {
    const map = new Map();
    tileBank.forEach((t) => map.set(t.uid, t));
    return map;
  }, [tileBank]);

  if (!item || !baseSentence?.hanzi || !expectedSentence?.hanzi) {
    return <EmptyExerciseFallback label="Syntax Transform" />;
  }

  const isLocked = Boolean(isCompleted || submittedGrade);
  const showBasePinyinBeforeAnswer = masteryLv <= 3 && nodeLevel === 0;
  const selectedTiles = selectedTileUids.map((uid) => tileByUid.get(uid)).filter(Boolean);
  const placedUidSet = new Set(selectedTileUids);

  const handleToggleMode = (nextMode) => {
    if (isLocked || nextMode === inputMode) return;
    soundFX.playPop();
    setInputMode(nextMode);
  };

  const handleTapBankTile = (uid) => {
    if (isLocked || placedUidSet.has(uid)) return;
    // Strictly silent on tap (no audio spoiler)
    soundFX.playPop();
    setSelectedTileUids((prev) => [...prev, uid]);
  };

  const handleRemoveTrayTile = (uid) => {
    if (isLocked) return;
    soundFX.playPop();
    setSelectedTileUids((prev) => prev.filter((id) => id !== uid));
  };

  const handleClearTray = () => {
    if (isLocked || selectedTileUids.length === 0) return;
    soundFX.playPop();
    setSelectedTileUids([]);
  };

  const canSubmit =
    !isLocked &&
    (inputMode === 'blocks' ? selectedTiles.length > 0 : typedInput.trim().length > 0);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    const userAnswer =
      inputMode === 'blocks'
        ? selectedTiles.map((t) => t.hanzi).join('')
        : typedInput.trim();

    const gradeResult = gradeMandarinProduction(userAnswer, expectedSentence, {
      inputMode: inputMode === 'blocks' ? 'hanzi' : 'auto',
      requireTones: true
    });

    setSubmittedGrade(gradeResult);
    if (typeof onResult === 'function') {
      onResult({
        isCorrect: Boolean(gradeResult.isCorrect),
        gradeResult,
        item
      });
    }
  };

  const targetGrammarTitle =
    item.targetGrammarPoint?.title || expectedSentence.grammarPoint?.title || '';
  const targetGrammarRule =
    item.targetGrammarPoint?.ruleSummary || expectedSentence.grammarPoint?.ruleSummary || '';

  return (
    <div
      className={`my-auto rounded-3xl bg-slate-800/90 border-2 p-4 space-y-3.5 shadow-xl transition-all ${getCardFrameClass(
        cardAnim,
        'border-violet-500/50'
      )}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-violet-500/20 text-violet-300 border border-violet-400/50 font-pixel-header text-[9px] uppercase">
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          <span>Transform</span>
        </span>
        {targetGrammarTitle ? (
          <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 text-violet-300 font-clarity text-[11px] font-bold truncate max-w-[65%]">
            {targetGrammarTitle}
          </span>
        ) : null}
      </div>

      {/* Anti-Spoiler Base Sentence & Transformation Directive (NO audio before submitting) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 space-y-2.5 text-center">
        <span className="font-clarity text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Base Sentence
        </span>
        <div className="font-hanzi text-2xl font-black text-white tracking-wide">
          {baseSentence.hanzi}
        </div>
        {showBasePinyinBeforeAnswer && baseSentence.pinyin && !isLocked ? (
          <div className="font-pinyin-inline text-rose-300">
            {baseSentence.pinyin}
          </div>
        ) : null}
        {baseSentence.english ? (
          <p className="font-clarity text-xs sm:text-sm font-semibold text-slate-300">
            “{baseSentence.english}”
          </p>
        ) : null}

        {/* Highlighted Directive Banner */}
        <div className="rounded-[2px] bg-violet-500/15 border-2 border-violet-400/60 px-3 py-2 text-left">
          <div className="font-pixel-ui text-[9px] uppercase text-violet-300 mb-0.5">
            Directive
          </div>
          <p className="font-clarity text-xs sm:text-sm font-extrabold text-amber-200 leading-snug">
            {item.instruction || 'Transform the sentence according to the target pattern.'}
          </p>
        </div>
      </div>

      {/* Dual Input Mode Toggle */}
      {!isLocked && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleToggleMode('blocks')}
            className={`game-btn-3d py-2 px-3 rounded-[2px] text-[10px] font-pixel-ui uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === 'blocks'
                ? 'bg-violet-500/25 border-violet-400 text-violet-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Blocks</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('keyboard')}
            className={`game-btn-3d py-2 px-3 rounded-[2px] text-[10px] font-pixel-ui uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              inputMode === 'keyboard'
                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span>Keyboard</span>
          </button>
        </div>
      )}

      {/* Blocks Mode */}
      {!isLocked && inputMode === 'blocks' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-700 p-3 min-h-[68px] flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-clarity text-[11px] font-bold text-slate-400">
                Build the transformed sentence:
              </span>
              {selectedTiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearTray}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-slate-800 border border-slate-600 text-slate-300 hover:text-white font-pixel-ui text-[9px] uppercase cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-[38px]">
              {selectedTiles.length === 0 ? (
                <span className="font-clarity text-xs italic text-slate-500">
                  Tap Hanzi blocks below to assemble the transformed sentence...
                </span>
              ) : (
                selectedTiles.map((tile) => (
                  <button
                    key={tile.uid}
                    type="button"
                    onClick={() => handleRemoveTrayTile(tile.uid)}
                    className="game-btn-3d px-3 py-1.5 rounded-[2px] bg-violet-500/25 hover:bg-violet-500/35 border-violet-400 text-white font-hanzi text-lg font-black leading-none cursor-pointer"
                  >
                    {tile.hanzi}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {tileBank.map((tile) => {
              const isPlaced = placedUidSet.has(tile.uid);
              return (
                <button
                  key={tile.uid}
                  type="button"
                  disabled={isPlaced}
                  onClick={() => handleTapBankTile(tile.uid)}
                  className={`game-btn-3d px-3.5 py-2 rounded-[2px] font-hanzi text-lg font-black leading-none transition-all ${
                    isPlaced
                      ? 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-35 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-600 hover:border-violet-400 text-slate-100 cursor-pointer'
                  }`}
                >
                  {tile.hanzi}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard Mode */}
      {!isLocked && inputMode === 'keyboard' && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="font-clarity text-xs font-semibold text-slate-300 block">
            Type the transformed Mandarin sentence (Hanzi or Pinyin with tones):
          </label>
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type transformed Hanzi or Pinyin..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full px-3.5 py-3 rounded-[2px] bg-slate-950 border-2 border-slate-700 focus:border-violet-400 focus:outline-none text-white font-clarity text-base font-bold placeholder:text-slate-500"
          />
        </form>
      )}

      {/* Submit Button */}
      {!isLocked && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`game-btn-3d w-full py-3 px-4 rounded-[2px] font-pixel-header text-[11px] uppercase tracking-wider transition-all ${
            canSubmit
              ? 'bg-violet-600 hover:bg-violet-500 border-violet-400 text-white cursor-pointer'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-70'
          }`}
        >
          Check Transform
        </button>
      )}

      {/* Post-Answer Structural Contrast (Base -> Target), Audio & Inspector */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
              submittedGrade?.isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {submittedGrade?.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-pixel-header text-[10px] uppercase">
                  {submittedGrade?.isCorrect ? 'Transformed!' : 'Needs Review'}
                </span>
              </div>
              {submittedGrade?.matchType ? (
                <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-amber-300">
                  {submittedGrade.matchType}
                </span>
              ) : null}
            </div>

            {submittedGrade?.diagnostic ? (
              <p className="font-clarity text-xs sm:text-sm font-semibold text-amber-200 leading-snug">
                {submittedGrade.diagnostic}
              </p>
            ) : null}
          </div>

          {/* Structural Contrast Box: Base -> Target */}
          <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-700 p-3.5 space-y-3">
            <div className="rounded-[2px] bg-slate-900/90 border border-slate-800 p-2.5 space-y-0.5">
              <div className="font-pixel-ui text-[9px] uppercase text-slate-400">
                Base
              </div>
              <div className="font-hanzi text-base font-bold text-slate-300">
                {baseSentence.hanzi}
              </div>
              {baseSentence.pinyin ? (
                <div className="font-clarity text-xs font-semibold text-slate-400">
                  {baseSentence.pinyin}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-violet-300 font-pixel-ui text-[9px] uppercase">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Target Pattern</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1 flex-1">
                <div className="font-pinyin text-emerald-300 leading-snug break-words">
                  {expectedSentence.pinyin || ''}
                </div>
                <InteractiveExampleText
                  sentence={expectedSentence.hanzi}
                  speakMandarin={speakMandarin}
                  masteryMap={masteryMap}
                  courseWords={courseWords}
                  charClassName="text-xl font-black text-white"
                  onInspectOpenChange={onInspectOpenChange}
                />
                {expectedSentence.english ? (
                  <p className="font-clarity text-xs font-semibold text-slate-300 pt-0.5">
                    “{expectedSentence.english}”
                  </p>
                ) : null}
              </div>
              <MandarinAudioControls
                text={expectedSentence.hanzi}
                isSlowMode={isSlowMode}
                onSetSlowMode={onSetSlowMode}
                speakMandarin={speakMandarin}
                speakingState={speakingState}
                size="sm"
              />
            </div>

            {targetGrammarRule ? (
              <div className="rounded-[2px] bg-slate-900 border border-slate-800 px-2.5 py-2 flex items-start gap-2">
                <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                <p className="font-clarity text-xs text-slate-300 leading-snug">
                  {targetGrammarRule}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. ERROR SPOTTER CARD (SENTENCE CORRECTION / 病句修改 — `error_spotter`)
// ============================================================================
export function ErrorSpotterCard({
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
  const itemKey = item?.id || item?.correctedHanzi || 'err_empty';
  const [step, setStep] = useState(1); // 1 = spot broken token, 2 = choose repair
  const [tappedTokenIdx, setTappedTokenIdx] = useState(null);
  const [selectedFixId, setSelectedFixId] = useState(null);
  const [submittedGrade, setSubmittedGrade] = useState(null);

  const latestInspectRef = useRef(onInspectOpenChange);
  latestInspectRef.current = onInspectOpenChange;

  useEffect(() => {
    setStep(1);
    setTappedTokenIdx(null);
    setSelectedFixId(null);
    setSubmittedGrade(null);
    if (typeof latestInspectRef.current === 'function') {
      latestInspectRef.current(false);
    }
  }, [itemKey]);

  const brokenTokens = Array.isArray(item?.brokenTokens)
    ? item.brokenTokens.filter(Boolean)
    : [];
  const fixOptions = Array.isArray(item?.fixOptions) ? item.fixOptions.filter(Boolean) : [];
  const errorTokenIndex =
    typeof item?.errorTokenIndex === 'number' ? item.errorTokenIndex : -1;
  const errorTokenIndices =
    Array.isArray(item?.errorTokenIndices) && item.errorTokenIndices.length > 0
      ? item.errorTokenIndices.filter((i) => typeof i === 'number' && i >= 0 && i < brokenTokens.length)
      : errorTokenIndex >= 0
      ? [errorTokenIndex]
      : [];

  if (
    !item ||
    brokenTokens.length === 0 ||
    errorTokenIndices.length === 0 ||
    !item.correctedHanzi
  ) {
    return <EmptyExerciseFallback label="Error Spotter" />;
  }

  const isLocked = Boolean(isCompleted || submittedGrade);
  const trailingPunct = extractTrailingPunctuation(item.brokenHanzi || item.correctedHanzi);

  const handleTapBrokenToken = (idx) => {
    if (isLocked || step !== 1) return;
    setTappedTokenIdx(idx);

    if (!errorTokenIndices.includes(idx)) {
      // Immediately finalize as incorrect to prevent blind clicking
      const errorSpanText = errorTokenIndices
        .map((i) => brokenTokens[i]?.hanzi || '')
        .filter(Boolean)
        .join('');
      const gradeResult = {
        isCorrect: false,
        matchType: 'Wrong Segment',
        errorCategory: item.errorType || 'error_spotter_step1',
        diagnostic:
          item.explanation ||
          `The grammar error is on "${errorSpanText || brokenTokens[errorTokenIndex]?.hanzi || ''}".`
      };
      setSubmittedGrade(gradeResult);
      if (typeof onResult === 'function') {
        onResult({
          isCorrect: false,
          gradeResult,
          item
        });
      }
      return;
    }

    // Correct segment spotted! Advance to Step 2
    soundFX.playPop();
    setStep(2);
  };

  const handleSelectFixOption = (opt) => {
    if (isLocked || step !== 2 || !opt) return;
    setSelectedFixId(opt.id);
    const isCorrect = Boolean(opt.isCorrect);

    const gradeResult = {
      isCorrect,
      matchType: isCorrect ? 'Error Repaired' : 'Wrong Repair',
      errorCategory: isCorrect ? null : item.errorType || 'error_spotter_step2',
      diagnostic: isCorrect
        ? null
        : item.explanation || `Correct sentence: ${item.correctedHanzi}`
    };

    setSubmittedGrade(gradeResult);
    if (typeof onResult === 'function') {
      onResult({
        isCorrect,
        gradeResult,
        item
      });
    }
  };

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
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Error Spotter</span>
        </span>
        <span className="px-2 py-1 rounded-[2px] bg-slate-900 border border-slate-700 font-pixel-ui text-[10px] uppercase text-amber-300">
          {isLocked ? 'Review' : step === 1 ? 'Step 1 / 2' : 'Step 2 / 2'}
        </span>
      </div>

      {/* Intended Meaning + Tappable Broken Token Chips (NO Pinyin, NO Audio before completion) */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-slate-800 p-4 space-y-3 text-center">
        {item.english ? (
          <div className="space-y-0.5">
            <span className="font-clarity text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Intended Meaning
            </span>
            <p className="font-clarity text-sm sm:text-base font-extrabold text-white">
              “{item.english}”
            </p>
          </div>
        ) : null}

        <div className="pt-1 border-t border-slate-800/80 space-y-2">
          <span className="font-clarity text-xs font-bold text-amber-300 block">
            {!isLocked && step === 1
              ? 'Step 1: Tap the word or segment with a grammar error.'
              : !isLocked && step === 2
              ? 'Error spotted! Now choose the correct repair below.'
              : 'Grammar error highlighted below:'}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {brokenTokens.map((tok, idx) => {
              const isActualError = errorTokenIndices.includes(idx);
              const isUserWrongTap = isLocked && tappedTokenIdx === idx && !isActualError;
              const isSpottedInStep2 = !isLocked && step === 2 && isActualError;

              let chipClass =
                'bg-slate-900 hover:bg-slate-800 border-slate-600 hover:border-amber-400 text-white cursor-pointer';

              if (isSpottedInStep2) {
                chipClass =
                  'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/40 cursor-default';
              } else if (isLocked && isActualError) {
                chipClass = submittedGrade?.isCorrect
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 cursor-default'
                  : 'bg-rose-500/30 border-rose-400 text-rose-100 ring-2 ring-rose-500/40 cursor-default';
              } else if (isUserWrongTap) {
                chipClass = 'bg-slate-900 border-slate-600 text-slate-400 line-through opacity-75 cursor-default';
              } else if (isLocked || step === 2) {
                chipClass = 'bg-slate-900/70 border-slate-800 text-slate-300 cursor-default';
              }

              return (
                <button
                  key={`broken_tok_${idx}_${tok.hanzi}`}
                  type="button"
                  disabled={isLocked || step !== 1}
                  onClick={() => handleTapBrokenToken(idx)}
                  className={`game-btn-3d px-3.5 py-2 rounded-[2px] font-hanzi text-lg font-black leading-none transition-all ${chipClass}`}
                >
                  {tok.hanzi}
                </button>
              );
            })}
            {trailingPunct ? (
              <span className="font-hanzi text-lg font-black text-slate-400">
                {trailingPunct}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Step 2: Choose the Repair (3 choices, NO Pinyin before completion) */}
      {!isLocked && step === 2 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-300 font-clarity text-xs font-extrabold">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>Step 2: Select the correct repair</span>
          </div>

          <div className="space-y-2">
            {fixOptions.slice(0, 3).map((opt, idx) => (
              <button
                key={opt.id || `fix_opt_${idx}`}
                type="button"
                onClick={() => handleSelectFixOption(opt)}
                className="game-btn-3d w-full text-left px-3.5 py-3 rounded-[2px] bg-slate-900 hover:bg-slate-800 border-slate-600 hover:border-emerald-400 text-slate-100 font-clarity text-sm font-bold flex items-center gap-2.5 cursor-pointer"
              >
                <span className="w-6 h-6 rounded-[2px] bg-slate-950 border border-slate-700 text-amber-300 font-pixel-ui text-[10px] flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span
                  className={
                    opt.hanzi
                      ? 'font-hanzi text-lg font-black leading-snug'
                      : 'font-clarity text-sm font-bold leading-snug'
                  }
                >
                  {opt.hanzi || opt.text || ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post-Answer Feedback, Corrected Sentence, Explanation, Audio & Inspector */}
      {isLocked && (
        <div className="space-y-3 pt-1">
          <div
            className={`rounded-2xl border-2 p-3.5 space-y-1.5 ${
              submittedGrade?.isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-100'
                : 'bg-rose-950/60 border-rose-500/70 text-rose-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {submittedGrade?.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-pixel-header text-[10px] uppercase">
                  {submittedGrade?.isCorrect ? 'Bug Fixed!' : 'Error Explained'}
                </span>
              </div>
              {submittedGrade?.matchType ? (
                <span className="px-2 py-0.5 rounded-[2px] bg-slate-950/80 border border-slate-700 font-clarity text-[11px] font-bold text-amber-300">
                  {submittedGrade.matchType}
                </span>
              ) : null}
            </div>

            {selectedFixId && !submittedGrade?.isCorrect ? (
              <p className="font-clarity text-xs font-bold text-rose-200">
                Correct repair:{' '}
                <span className="text-emerald-300 font-hanzi">
                  {fixOptions.find((o) => o.isCorrect)?.hanzi ||
                    fixOptions.find((o) => o.isCorrect)?.text ||
                    item.correctedHanzi}
                </span>
              </p>
            ) : null}

            {item.explanation ? (
              <p className="font-clarity text-xs sm:text-sm font-semibold text-amber-200 leading-snug pt-0.5">
                {item.explanation}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-950/90 border-2 border-emerald-500/50 p-3.5 space-y-2">
            <div className="font-pixel-ui text-[9px] uppercase text-emerald-400">
              Corrected Sentence
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1 flex-1">
                <div className="font-pinyin text-rose-300 leading-snug break-words">
                  {item.correctedPinyin || ''}
                </div>
                <InteractiveExampleText
                  sentence={item.correctedHanzi}
                  speakMandarin={speakMandarin}
                  masteryMap={masteryMap}
                  courseWords={courseWords}
                  charClassName="text-xl font-black text-white"
                  onInspectOpenChange={onInspectOpenChange}
                />
              </div>
              <MandarinAudioControls
                text={item.correctedHanzi}
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
