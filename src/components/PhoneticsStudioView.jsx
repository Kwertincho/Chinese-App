import React, { useState, useMemo, useCallback } from 'react';
import {
  Volume2,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  Headphones,
  Layers,
  Info,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  MANDARIN_INITIAL_GROUPS,
  MANDARIN_ALLOPHONE_SPOTLIGHTS,
  MANDARIN_FINAL_GROUPS,
  SANDBOX_INITIALS,
  SANDBOX_FINALS,
  SYLLABLE_4_TONE_BANK,
  combineInitialAndFinal
} from '../data/phoneticsData.js';
import {
  NORMAL_SPEECH_RATE,
  SLOW_SPEECH_RATE,
  soundFX
} from '../audio/soundEngine.js';
import {
  MandarinAudioControls
} from './SharedHudAndAudio.jsx';

function MiniChaoCurveSvg({ tone = 1 }) {
  const meta =
    tone === 1
      ? { d: 'M 6 6 L 44 6', color: '#38bdf8' }
      : tone === 2
      ? { d: 'M 6 21 Q 24 14 44 5', color: '#34d399' }
      : tone === 3
      ? { d: 'M 6 14 L 21 23 L 44 7', color: '#fbbf24' }
      : { d: 'M 6 5 L 44 23', color: '#f43f5e' };

  return (
    <svg width="50" height="26" viewBox="0 0 50 28" className="overflow-visible shrink-0">
      <line x1="4" y1="6" x2="46" y2="6" stroke="#1e293b" strokeWidth="1" />
      <line x1="4" y1="15" x2="46" y2="15" stroke="#1e293b" strokeWidth="1" />
      <line x1="4" y1="23" x2="46" y2="23" stroke="#1e293b" strokeWidth="1" />
      <path
        d={meta.d}
        fill="none"
        stroke={meta.color}
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function PhoneticsStudioView({
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState
}) {
  const [activeViewMode, setActiveViewMode] = useState('all'); // 'all' | 'initials' | 'finals' | 'sandbox' | 'tone_quiz'
  const [selectedInitial, setSelectedInitial] = useState('x');
  const [selectedFinal, setSelectedFinal] = useState('üe');
  const [activeAllophoneId, setActiveAllophoneId] = useState('allophone_e');

  // 4-Tone Ear Drill State
  const quizSyllableKeys = useMemo(() => Object.keys(SYLLABLE_4_TONE_BANK), []);

  const createNextToneQuestion = useCallback(
    (prevKey = '') => {
      const pool = quizSyllableKeys.filter((k) => k !== prevKey);
      const chosenKey =
        pool[Math.floor(Math.random() * pool.length)] || quizSyllableKeys[0] || 'ma';
      const entry = SYLLABLE_4_TONE_BANK[chosenKey];
      const randomIdx = Math.floor(Math.random() * 4);
      const targetToneObj = entry.tones[randomIdx];
      return {
        syllableBase: chosenKey,
        targetTone: targetToneObj.tone,
        targetPinyin: targetToneObj.pinyin,
        targetHanzi: targetToneObj.hanzi,
        targetMeaning: targetToneObj.meaning,
        allFourTones: entry.tones
      };
    },
    [quizSyllableKeys]
  );

  const [toneQuestion, setToneQuestion] = useState(() => createNextToneQuestion(''));
  const [selectedToneAnswer, setSelectedToneAnswer] = useState(null);
  const [toneQuizStats, setToneQuizStats] = useState({
    correct: 0,
    total: 0,
    streak: 0
  });

  const combinedResult = useMemo(
    () => combineInitialAndFinal(selectedInitial, selectedFinal),
    [selectedInitial, selectedFinal]
  );

  const playRate = isSlowMode ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;

  const handleSelectInitialFromTable = (pinyinInit) => {
    soundFX.playPop();
    setSelectedInitial(pinyinInit);
  };

  const handleSelectFinalFromTable = (rawPinyinFinal) => {
    soundFX.playPop();
    const cleaned = rawPinyinFinal.replace(/\s*\(.*\)/, '').trim();
    if (SANDBOX_FINALS.includes(cleaned)) {
      setSelectedFinal(cleaned);
    }
  };

  const handlePlayToneQuizPrompt = useCallback(
    (q = toneQuestion) => {
      if (!q) return;
      speakMandarin(q.targetHanzi, playRate);
    },
    [toneQuestion, speakMandarin, playRate]
  );

  const handleSubmitToneAnswer = (chosenToneNum) => {
    if (selectedToneAnswer !== null) return;
    setSelectedToneAnswer(chosenToneNum);

    const isRight = chosenToneNum === toneQuestion.targetTone;
    if (isRight) {
      soundFX.playCorrect();
      setToneQuizStats((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
        streak: prev.streak + 1
      }));
    } else {
      soundFX.playMistake();
      setToneQuizStats((prev) => ({
        correct: prev.correct,
        total: prev.total + 1,
        streak: 0
      }));
    }
    speakMandarin(toneQuestion.targetHanzi, playRate);
  };

  const handleNextToneQuestion = () => {
    soundFX.playPop();
    const nextQ = createNextToneQuestion(toneQuestion.syllableBase);
    setToneQuestion(nextQ);
    setSelectedToneAnswer(null);
    setTimeout(() => {
      speakMandarin(nextQ.targetHanzi, playRate);
    }, 100);
  };

  const activeAllophoneObj =
    MANDARIN_ALLOPHONE_SPOTLIGHTS.find((a) => a.id === activeAllophoneId) ||
    MANDARIN_ALLOPHONE_SPOTLIGHTS[0];

  return (
    <div className="space-y-4">
      {/* PHONETICS STUDIO HEADER & QUICK SECTION FILTER + SPEED TOGGLE */}
      <div className="rounded-[2px] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-sky-500/60 p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-[2px] bg-sky-500/20 text-sky-300 border border-sky-400/50">
            Mandarin Phonetics & IPA Lab
          </span>
          <MandarinAudioControls
            text={combinedResult.isValid ? combinedResult.tones[0].hanzi : '妈'}
            isSlowMode={isSlowMode}
            onSetSlowMode={onSetSlowMode}
            speakMandarin={speakMandarin}
            speakingState={speakingState}
            size="sm"
          />
        </div>

        <div>
          <h2 className="text-base font-black text-white">
            21 Initials (<span className="font-hanzi">声母</span>) • 36 Finals (<span className="font-hanzi">韵母</span>) • 4 Tones (<span className="font-hanzi">声调</span>)
          </h2>
          <p className="font-clarity text-xs text-slate-300 mt-0.5 leading-relaxed">
            Tap any consonant or vowel card to hear native Mandarin pronunciation, inspect exact IPA symbols & vowel allophones, or test combinations in the 4-Tone Sandbox.
          </p>
        </div>

        {/* Sub-view filter bar */}
        <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-[2px] border border-slate-800">
          {[
            { id: 'all', label: 'All Charts' },
            { id: 'initials', label: '21 Initials' },
            { id: 'finals', label: 'Finals & IPA' },
            { id: 'sandbox', label: 'Combo Lab' },
            { id: 'tone_quiz', label: 'Tone Drill' }
          ].map((tab) => {
            const active = activeViewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundFX.playPop();
                  setActiveViewMode(tab.id);
                  if (tab.id === 'tone_quiz') {
                    setTimeout(() => handlePlayToneQuizPrompt(), 120);
                  }
                }}
                className={`py-1.5 px-1 rounded-[2px] text-[10px] font-black transition-all truncate ${
                  active
                    ? 'bg-sky-600 text-white border border-sky-300 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          SECTION 1: INTERACTIVE INITIALS TABLE (声母 Shēngmǔ — All 21 Consonants)
      ==================================================================== */}
      {(activeViewMode === 'all' || activeViewMode === 'initials') && (
        <div className="rounded-[2px] bg-slate-800/90 border-2 border-slate-700 p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-700/80 pb-2.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                1. Interactive Initials Table (<span className="font-hanzi">声母</span> Shēngmǔ)
              </span>
              <h3 className="text-sm font-black text-white mt-0.5">
                All 21 Mandarin Consonants by Place & Manner of Articulation
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-[2px] bg-slate-950 border border-slate-700 text-sky-300">
              Tap Card to Hear & Load in Sandbox
            </span>
          </div>

          <div className="space-y-3.5">
            {MANDARIN_INITIAL_GROUPS.map((group) => (
              <div
                key={group.id}
                className="rounded-[2px] bg-slate-900/90 border border-slate-700/90 p-3 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-black text-amber-300 font-clarity">
                      {group.groupTitle}
                    </h4>
                    <p className="font-clarity text-[11px] text-slate-400">
                      {group.placeDescription}
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-slate-950 border border-slate-800 text-slate-400">
                    {group.initials.length} Initial{group.initials.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {group.initials.map((item) => {
                    const isSelectedInSandbox = selectedInitial === item.pinyin;
                    const isSpeaking =
                      speakingState?.active && speakingState?.text === item.repHanzi;

                    return (
                      <div
                        key={item.pinyin}
                        onClick={() => {
                          handleSelectInitialFromTable(item.pinyin);
                          speakMandarin(item.repHanzi, playRate);
                        }}
                        className={`game-btn-3d cursor-pointer rounded-[2px] p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 ${
                          isSelectedInSandbox
                            ? 'bg-sky-950/70 border-sky-400 shadow-md'
                            : 'bg-slate-950/90 hover:bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-clarity text-lg font-black text-white">
                              {item.pinyin}
                            </span>
                            <span className="font-clarity text-xs font-extrabold px-1.5 py-0.5 rounded-[2px] bg-sky-500/20 border border-sky-400/40 text-sky-300">
                              {item.ipa}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="font-hanzi text-sm font-black text-amber-300">
                              {item.repHanzi}
                            </span>
                            <span className="font-clarity text-xs font-bold text-rose-300">
                              ({item.repPinyin})
                            </span>
                            <Volume2
                              className={`w-3.5 h-3.5 ${
                                isSpeaking ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-extrabold px-1.5 py-0.2 rounded-[2px] ${
                                item.aspiration.includes('Strongly')
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : item.aspiration.includes('Unaspirated')
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {item.aspiration}
                            </span>
                            <span className="font-clarity text-[10px] text-slate-400">
                              {item.repIpa} "{item.repMeaning}"
                            </span>
                          </div>
                          <p className="font-clarity text-[11px] text-slate-300 leading-snug pt-0.5">
                            {item.callOut}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 2: INTERACTIVE FINALS TABLE & CONTEXTUAL VOWEL ALLOPHONES
      ==================================================================== */}
      {(activeViewMode === 'all' || activeViewMode === 'finals') && (
        <div className="space-y-4">
          {/* 2A: Contextual Vowel Allophones Spotlight (e, a, i, u/ü) */}
          <div className="rounded-[2px] bg-slate-800/95 border-2 border-amber-500/50 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Key Vowel Allophones & Contextual Shifts
                </span>
                <h3 className="text-sm font-black text-white mt-0.5">
                  Why One Pinyin Vowel Letter Has Multiple IPA Sounds
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-[2px] border border-amber-400/40">
                Tap Examples for Audio
              </span>
            </div>

            {/* Selector Tabs for e, a, i, u/ü */}
            <div className="grid grid-cols-4 gap-1.5">
              {MANDARIN_ALLOPHONE_SPOTLIGHTS.map((spot) => {
                const isSelected = activeAllophoneObj.id === spot.id;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setActiveAllophoneId(spot.id);
                    }}
                    className={`game-btn-3d py-2 px-2 rounded-[2px] border-2 text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-clarity text-sm font-black text-white">
                      "{spot.letter}"
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider truncate">
                      {spot.letter === 'e'
                        ? '[ɤ] [ə] [ɛ]'
                        : spot.letter === 'a'
                        ? '[ä] [a] [ɛ] [ɑ]'
                        : spot.letter === 'i'
                        ? '[i] [z̩] [ʐ̩]'
                        : '[u] vs. [y]'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Allophone Detail Card */}
            <div className="rounded-[2px] bg-slate-950 border border-slate-800 p-3.5 space-y-3">
              <div>
                <h4 className="font-clarity text-sm font-black text-amber-300">
                  {activeAllophoneObj.title}
                </h4>
                <p className="font-clarity text-xs text-slate-300 mt-0.5">
                  {activeAllophoneObj.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAllophoneObj.variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="rounded-[2px] bg-slate-900 border border-slate-800 p-2.5 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-clarity text-xs font-extrabold text-white">
                          {v.context}
                        </span>
                        <span className="font-clarity text-xs font-black px-2 py-0.5 rounded-[2px] bg-amber-500/20 border border-amber-400/50 text-amber-300 shrink-0">
                          {v.ipa}
                        </span>
                      </div>
                      <p className="font-clarity text-[11px] text-slate-300 leading-snug">
                        {v.desc}
                      </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                      {v.examples.map((ex) => (
                        <button
                          key={`${ex.hanzi}_${ex.pinyin}`}
                          type="button"
                          onClick={() => {
                            soundFX.playPop();
                            speakMandarin(ex.hanzi, playRate);
                          }}
                          className="game-btn-3d px-2 py-1 rounded-[2px] bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-xs flex items-center gap-1.5"
                        >
                          <span className="font-hanzi font-black text-white">{ex.hanzi}</span>
                          <span className="font-clarity font-bold text-rose-300">{ex.pinyin}</span>
                          <span className="font-clarity text-[10px] text-sky-300">{ex.ipa}</span>
                          <Volume2 className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2B: Complete Finals Reference Table (韵母 Yùnmǔ) */}
          <div className="rounded-[2px] bg-slate-800/90 border-2 border-slate-700 p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-700/80 pb-2.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  2. Interactive Finals Table (<span className="font-hanzi">韵母</span> Yùnmǔ)
                </span>
                <h3 className="text-sm font-black text-white mt-0.5">
                  Simple, Compound, Nasal (-n / -ng) & Medial (i- / u- / ü-) Finals
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-[2px] bg-slate-950 border border-slate-700 text-rose-300">
                Tap Any Final for Audio & Sandbox
              </span>
            </div>

            <div className="space-y-3.5">
              {MANDARIN_FINAL_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className="rounded-[2px] bg-slate-900/90 border border-slate-700/90 p-3 space-y-2.5"
                >
                  <div>
                    <h4 className="font-clarity text-xs font-black text-rose-300">
                      {group.groupTitle}
                    </h4>
                    <p className="font-clarity text-[11px] text-slate-400">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.finals.map((fin) => {
                      const cleanKey = fin.pinyin.replace(/\s*\(.*\)/, '').trim();
                      const isSelected = selectedFinal === cleanKey;

                      return (
                        <div
                          key={fin.pinyin}
                          onClick={() => {
                            handleSelectFinalFromTable(fin.pinyin);
                            speakMandarin(fin.repHanzi, playRate);
                          }}
                          className={`game-btn-3d cursor-pointer rounded-[2px] p-2.5 border-2 transition-all flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-rose-950/60 border-rose-400 shadow-md'
                              : 'bg-slate-950/90 hover:bg-slate-950 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-clarity text-base font-black text-white">
                                -{fin.pinyin}
                              </span>
                              <span className="font-clarity text-xs font-extrabold px-1.5 py-0.5 rounded-[2px] bg-rose-500/20 border border-rose-400/40 text-rose-200">
                                {fin.ipa}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="font-hanzi text-sm font-black text-amber-300">
                                {fin.repHanzi}
                              </span>
                              <span className="font-clarity text-xs font-bold text-sky-300">
                                ({fin.repPinyin})
                              </span>
                              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>

                          <p className="font-clarity text-[11px] text-slate-300 leading-snug">
                            {fin.note}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 3A: INTERACTIVE INITIAL + FINAL COMBINATION SANDBOX
      ==================================================================== */}
      {(activeViewMode === 'all' || activeViewMode === 'sandbox') && (
        <div className="rounded-[2px] bg-slate-800/95 border-2 border-emerald-500/60 p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-700/80 pb-2.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                3. Interactive Initial + Final Combination Sandbox
              </span>
              <h3 className="text-sm font-black text-white mt-0.5">
                Build Any Mandarin Syllable & Hear All 4 Tones (55, 35, 214, 51)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-[2px] bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
              Phonotactic Rule Checker Active
            </span>
          </div>

          {/* Step 1: Pick an Initial */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300">
                Step 1: Select Initial Consonant (<span className="font-hanzi">声母</span>)
              </span>
              <span className="font-clarity text-xs font-bold text-slate-400">
                Selected: <strong className="text-white">{selectedInitial}</strong>
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {SANDBOX_INITIALS.map((initObj) => {
                const active = selectedInitial === initObj.id;
                return (
                  <button
                    key={initObj.id}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setSelectedInitial(initObj.id);
                    }}
                    className={`game-btn-3d px-2.5 py-1.5 rounded-[2px] border text-xs font-clarity font-black transition-all ${
                      active
                        ? 'bg-sky-500 text-slate-950 border-sky-200 shadow'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{initObj.label}</span>
                    {initObj.ipa && (
                      <span className="ml-1 text-[10px] opacity-80">[{initObj.ipa}]</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Pick a Final */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-300">
                Step 2: Select Final (<span className="font-hanzi">韵母</span>)
              </span>
              <span className="font-clarity text-xs font-bold text-slate-400">
                Selected: <strong className="text-white">-{selectedFinal}</strong>
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {SANDBOX_FINALS.map((finKey) => {
                const active = selectedFinal === finKey;
                const testCombo = combineInitialAndFinal(selectedInitial, finKey);
                return (
                  <button
                    key={finKey}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      setSelectedFinal(finKey);
                    }}
                    className={`game-btn-3d px-2.5 py-1.5 rounded-[2px] border text-xs font-clarity font-black transition-all ${
                      active
                        ? 'bg-rose-500 text-white border-rose-200 shadow'
                        : testCombo.isValid
                        ? 'bg-slate-950 text-emerald-300 border-slate-800 hover:border-emerald-500/60'
                        : 'bg-slate-950/50 text-slate-600 border-slate-900'
                    }`}
                  >
                    -{finKey}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Combination Result & 4-Tone Player */}
          {combinedResult.isValid ? (
            <div className="rounded-[2px] bg-slate-950 border-2 border-emerald-500/60 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400">
                    Valid Mandarin Syllable Combination
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span className="font-clarity text-2xl font-black text-white">
                      {combinedResult.orthographicBase}
                    </span>
                    <span className="font-clarity text-base font-extrabold text-sky-300 px-2 py-0.5 rounded-[2px] bg-sky-500/15 border border-sky-400/40">
                      IPA {combinedResult.ipaBase}
                    </span>
                  </div>
                </div>

                {/* Quick presets for famous tricky syllables */}
                <div className="flex items-center flex-wrap gap-1">
                  {[
                    { label: 'x + üe → xué', i: 'x', f: 'üe' },
                    { label: 'q + ü → qù', i: 'q', f: 'ü' },
                    { label: 't + ian → tiān', i: 't', f: 'ian' },
                    { label: 'zh + i → zhī', i: 'zh', f: 'i' },
                    { label: 'g + uo → guó', i: 'g', f: 'uo' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        soundFX.playPop();
                        setSelectedInitial(preset.i);
                        setSelectedFinal(preset.f);
                      }}
                      className="px-2 py-1 rounded-[2px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-clarity font-bold text-amber-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2px] bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-clarity text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{combinedResult.phonotacticRule}</span>
              </div>

              {/* 4-Tone Interactive Pitch Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {combinedResult.tones.map((tObj) => (
                  <button
                    key={tObj.tone}
                    type="button"
                    onClick={() => {
                      soundFX.playPop();
                      speakMandarin(tObj.hanzi, playRate);
                    }}
                    className="game-btn-3d rounded-[2px] bg-slate-900 hover:bg-slate-800/90 border-2 border-slate-700 hover:border-amber-400 p-3 flex flex-col items-center justify-between gap-2 text-center transition-all"
                  >
                    <div className="w-full flex items-center justify-between text-[10px] font-black text-slate-400">
                      <span>Tone {tObj.tone}</span>
                      <span className="text-amber-300">[{tObj.chaoNumber}]</span>
                    </div>

                    <MiniChaoCurveSvg tone={tObj.tone} />

                    <div>
                      <div className="font-clarity text-lg font-black text-white">
                        {tObj.pinyin}
                      </div>
                      <div className="font-clarity text-xs font-bold text-sky-300 mt-0.5">
                        {tObj.ipa}
                      </div>
                    </div>

                    <div className="w-full pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
                      <span className="font-hanzi text-base font-black text-amber-300">
                        {tObj.hanzi}
                      </span>
                      <span className="font-clarity text-[11px] text-slate-300 truncate">
                        {tObj.meaning}
                      </span>
                      <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[2px] bg-rose-950/40 border-2 border-rose-500/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-black text-xs uppercase">
                <X className="w-4 h-4 shrink-0" />
                <span>Invalid Mandarin Syllable Combination ({combinedResult.orthographicBase})</span>
              </div>
              <p className="font-clarity text-xs text-rose-100 leading-relaxed">
                {combinedResult.phonotacticRule}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SECTION 3B: "PRACTICE SYLLABLE TONES" 4-TONE EAR DRILL QUIZ
      ==================================================================== */}
      {(activeViewMode === 'all' || activeViewMode === 'tone_quiz') && (
        <div className="rounded-[2px] bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 border-2 border-amber-400/70 p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                4-Tone Ear Training Mini-Dojo
              </span>
              <h3 className="text-sm font-black text-white mt-0.5">
                Practice Syllable Tones (Identify 1st, 2nd, 3rd, or 4th Tone)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-black">
              <span className="px-2.5 py-1 rounded-[2px] bg-slate-950 border border-slate-700 text-emerald-300">
                Score: {toneQuizStats.correct}/{toneQuizStats.total}
              </span>
              <span className="px-2.5 py-1 rounded-[2px] bg-amber-500/20 border border-amber-400/50 text-amber-300">
                Streak: {toneQuizStats.streak}🔥
              </span>
            </div>
          </div>

          <div className="rounded-[2px] bg-slate-950/90 border border-slate-800 p-4 flex flex-col items-center text-center space-y-3">
            <p className="font-clarity text-xs text-slate-300">
              Listen to the spoken syllable for base <strong className="text-amber-300">"{toneQuestion.syllableBase}"</strong> and select which of the 4 Mandarin tones was spoken:
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePlayToneQuizPrompt()}
                className="game-btn-3d px-5 py-3 rounded-[2px] bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs border-2 border-amber-200 flex items-center gap-2 shadow-lg"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Mystery Tone ({isSlowMode ? '0.65x' : '1.0x'})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextSlow = !isSlowMode;
                  onSetSlowMode?.(nextSlow, toneQuestion.targetHanzi);
                }}
                className="game-btn-3d px-3 py-3 rounded-[2px] bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-sky-300 font-black text-xs"
              >
                {isSlowMode ? '0.65x Slow' : '1.0x Normal'}
              </button>
            </div>

            {/* 4 Tone Choices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full pt-1">
              {toneQuestion.allFourTones.map((option) => {
                const isRevealed = selectedToneAnswer !== null;
                const isTarget = option.tone === toneQuestion.targetTone;
                const isChosen = option.tone === selectedToneAnswer;

                const btnStyle = !isRevealed
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white'
                  : isTarget
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : isChosen
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-500 opacity-65';

                const contourLabels = ['55 High Flat', '35 Rising', '214 Dipping', '51 Falling'];

                return (
                  <button
                    key={option.tone}
                    type="button"
                    disabled={isRevealed}
                    onClick={() => handleSubmitToneAnswer(option.tone)}
                    className={`game-btn-3d p-3 rounded-[2px] border-2 flex flex-col items-center gap-1.5 transition-all ${btnStyle}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Tone {option.tone} ({contourLabels[option.tone - 1]})
                    </span>
                    <MiniChaoCurveSvg tone={option.tone} />
                    <span className="font-clarity text-base font-black">
                      {option.pinyin}
                    </span>
                    <span className="font-hanzi text-sm font-bold text-slate-300">
                      {option.hanzi} • {option.meaning}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedToneAnswer !== null && (
              <div className="w-full pt-2 flex items-center justify-between gap-3 flex-wrap border-t border-slate-800">
                <div className="text-left">
                  <span
                    className={`text-xs font-black ${
                      selectedToneAnswer === toneQuestion.targetTone
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedToneAnswer === toneQuestion.targetTone
                      ? '✓ Correct Tone Identified!'
                      : `✗ That was Tone ${toneQuestion.targetTone}: ${toneQuestion.targetPinyin}`}
                  </span>
                  <p className="font-clarity text-xs text-slate-300">
                    Spoken character: <span className="font-hanzi font-black text-white">{toneQuestion.targetHanzi}</span> ({toneQuestion.targetPinyin} — "{toneQuestion.targetMeaning}")
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextToneQuestion}
                  className="game-btn-3d px-4 py-2 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs border-2 border-amber-100"
                >
                  Next Tone Question →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
