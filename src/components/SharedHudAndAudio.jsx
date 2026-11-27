import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Turtle,
  ArrowLeft,
  Play,
  X,
  Clock
} from 'lucide-react';
import {
  NORMAL_SPEECH_RATE,
  SLOW_SPEECH_RATE,
  getGlobalIsSlowMode,
  setGlobalIsSlowMode,
  soundFX
} from '../audio/soundEngine.js';
import { KNOWN_CHARACTER_INFO } from '../data/curriculumData.js';
import {
  stripToneMarks,
  parsePinyinSyllablesWithTones,
  loadHanziWriterScript,
  getMasteryTierMeta,
  formatSessionClock,
  resolveCharacterInspectorInfo
} from '../utils/mandarinHelpers.js';

// ============================================================================
// CUSTOM INLINE 16-BIT PIXEL-ART SVG SPRITES (shape-rendering="crispEdges")
// ============================================================================

/**
 * Pixel Heart Sprite (Full & Empty states for Boss Battles)
 */
export function PixelHeartSprite({ filled = true, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 12 11"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Outer dark pixel outline */}
      <path
        d="M2,0 h3 v1 h2 v-1 h3 v1 h1 v1 h1 v4 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-2 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-4 h1 v-1 h1 z"
        fill={filled ? '#4c0519' : '#0f172a'}
      />
      {/* Inner heart fill */}
      <path
        d="M2,1 h3 v1 h2 v-1 h3 v1 h1 v4 h-1 v1 h-1 v1 h-1 v1 h-1 v1 h-2 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-4 h1 z"
        fill={filled ? '#f43f5e' : '#1e293b'}
      />
      {/* Top-left 16-bit specular pixel shine & bottom shading */}
      {filled ? (
        <>
          <rect x="2" y="2" width="2" height="1" fill="#ffe4e6" />
          <rect x="2" y="3" width="1" height="1" fill="#ffe4e6" />
          <rect x="7" y="6" width="2" height="1" fill="#be123c" />
          <rect x="6" y="7" width="2" height="1" fill="#be123c" />
        </>
      ) : (
        <rect x="2" y="2" width="2" height="1" fill="#334155" />
      )}
    </svg>
  );
}

/**
 * Pixel Flame Sprite (Daily Streak badge & Combo counter)
 */
export function PixelFlameSprite({ active = true, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 12 14"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Outer flame silhouette */}
      <path
        d="M6,0 h2 v2 h1 v2 h1 v2 h1 v4 h-1 v2 h-2 v1 h-4 v-1 h-2 v-2 h-1 v-4 h1 v-2 h2 v-2 h2 z"
        fill={active ? '#ea580c' : '#334155'}
      />
      {/* Mid flame */}
      <path
        d="M6,2 h1 v2 h1 v2 h1 v4 h-1 v1 h-4 v-1 h-1 v-3 h1 v-2 h2 z"
        fill={active ? '#f59e0b' : '#475569'}
      />
      {/* Hot inner core */}
      <path
        d="M5,6 h2 v2 h1 v3 h-4 v-3 h1 z"
        fill={active ? '#fef08a' : '#94a3b8'}
      />
    </svg>
  );
}

/**
 * Pixel Gold Coin / Gem Sprite (XP counter & Rewards)
 */
export function PixelCoinSprite({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Border */}
      <path
        d="M3,0 h6 v1 h2 v2 h1 v6 h-1 v2 h-2 v1 h-6 v-1 h-2 v-2 h-1 v-6 h1 v-2 h2 z"
        fill="#78350f"
      />
      {/* Gold Body */}
      <path
        d="M3,1 h6 v1 h1 v1 h1 v6 h-1 v1 h-1 v1 h-6 v-1 h-1 v-1 h-1 v-6 h1 v-1 h1 z"
        fill="#f59e0b"
      />
      {/* Rim Highlight */}
      <path d="M3,1 h5 v1 h-5 z M2,2 h1 v5 h-1 z" fill="#fef08a" />
      {/* Center Square Cutout (Chinese Ancient Coin / RPG Gold Coin) */}
      <rect x="5" y="3" width="2" height="6" fill="#fef08a" />
      <rect x="6" y="4" width="1" height="5" fill="#b45309" />
    </svg>
  );
}

export function PixelGemSprite({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path
        d="M3,1 h6 v2 h2 v3 h-1 v2 h-2 v2 h-1 v1 h-2 v-1 h-1 v-2 h-2 v-2 h-1 v-3 h2 z"
        fill="#065f46"
      />
      <path
        d="M3,2 h6 v1 h1 v3 h-1 v1 h-2 v2 h-2 v-2 h-2 v-1 h-1 v-3 h1 z"
        fill="#10b981"
      />
      <path d="M4,2 h4 v1 h-4 z M3,3 h2 v2 h-2 z" fill="#a7f3d0" />
      <rect x="5" y="5" width="3" height="2" fill="#047857" />
    </svg>
  );
}

/**
 * Pixel Crown Sprite (Adventure Map nodes & Mastered counts)
 */
export function PixelCrownSprite({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 14 12"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Dark outline */}
      <path
        d="M0,2 h2 v2 h2 v-2 h2 v-2 h2 v2 h2 v2 h2 v-2 h2 v9 h-14 z"
        fill="#451a03"
      />
      {/* Gold crown body */}
      <path
        d="M1,3 h1 v2 h2 v-1 h2 v-2 h2 v2 h2 v1 h2 v-2 h1 v6 h-12 z"
        fill="#fbbf24"
      />
      {/* Top shine & jewels */}
      <rect x="6" y="2" width="1" height="2" fill="#fef08a" />
      <rect x="2" y="6" width="2" height="2" fill="#f43f5e" />
      <rect x="6" y="5" width="2" height="2" fill="#10b981" />
      <rect x="10" y="6" width="2" height="2" fill="#38bdf8" />
      <rect x="1" y="9" width="12" height="1" fill="#d97706" />
    </svg>
  );
}

/**
 * Pixel Padlock Sprite (Adventure Map locked nodes)
 */
export function PixelPadlockSprite({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 12 14"
      shapeRendering="crispEdges"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Shackle */}
      <path
        d="M3,1 h6 v1 h1 v4 h-2 v-3 h-4 v3 h-2 v-4 h1 z"
        fill="#94a3b8"
      />
      <rect x="4" y="1" width="4" height="1" fill="#e2e8f0" />
      {/* Lock body outline */}
      <rect x="1" y="6" width="10" height="8" fill="#0f172a" />
      {/* Lock body */}
      <rect x="2" y="7" width="8" height="6" fill="#475569" />
      <rect x="2" y="7" width="8" height="1" fill="#64748b" />
      {/* Keyhole */}
      <rect x="5" y="9" width="2" height="2" fill="#0f172a" />
      <rect x="5" y="11" width="2" height="1" fill="#0f172a" />
    </svg>
  );
}

/**
 * Pixel Jade Dragon Boss Sprite (16x16 pixel-grid SVG avatar in BossChallengeModal that flashes red on taking damage)
 */
export function PixelJadeDragonSprite({ damaged = false, className = 'w-12 h-12' }) {
  const cBg = damaged ? '#4c0519' : '#022c22';
  const cHorn = damaged ? '#fda4af' : '#fbbf24';
  const cScaleLight = damaged ? '#fb7185' : '#34d399';
  const cScaleMid = damaged ? '#e11d48' : '#10b981';
  const cScaleDark = damaged ? '#9f1239' : '#047857';
  const cEye = damaged ? '#ffffff' : '#fef08a';
  const cPupil = damaged ? '#881337' : '#dc2626';
  const cWhisker = damaged ? '#fecdd3' : '#f59e0b';

  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`${className} shrink-0 transition-transform ${
        damaged ? 'animate-game-shake scale-110' : ''
      }`}
      aria-label="Jade Dragon Boss Pixel Sprite"
    >
      {/* 16x16 Pixel Grid Background Plate */}
      <rect x="0" y="0" width="16" height="16" fill={cBg} />
      {/* Golden / Crimson Horns & Crown */}
      <path
        d="M2,1 h2 v2 h1 v1 h-2 v-2 h-1 z M12,1 h2 v1 h-1 v2 h-2 v-1 h1 z M6,2 h4 v1 h-4 z"
        fill={cHorn}
      />
      {/* Dragon Head Outer Silhouette & Scales */}
      <path
        d="M4,3 h8 v2 h2 v5 h-1 v2 h-2 v2 h-6 v-2 h-2 v-2 h-1 v-5 h2 z"
        fill={cScaleDark}
      />
      {/* Mid Jade / Damaged Armor Scales */}
      <path
        d="M4,4 h8 v1 h1 v4 h-1 v2 h-8 v-2 h-1 v-4 h1 z"
        fill={cScaleMid}
      />
      {/* Forehead & Brow Ridge Highlight */}
      <path
        d="M5,4 h6 v1 h-6 z M4,6 h3 v1 h-3 z M9,6 h3 v1 h-3 z M7,5 h2 v3 h-2 z"
        fill={cScaleLight}
      />
      {/* Glowing Eyes */}
      <rect x="4" y="7" width="3" height="2" fill={cEye} />
      <rect x="9" y="7" width="3" height="2" fill={cEye} />
      <rect x="5" y="7" width="1" height="2" fill={cPupil} />
      <rect x="10" y="7" width="1" height="2" fill={cPupil} />
      {/* Dragon Snout, Whiskers & Fangs */}
      <path
        d="M1,9 h2 v1 h-2 z M13,9 h2 v1 h-2 z M0,10 h2 v1 h-2 z M14,10 h2 v1 h-2 z"
        fill={cWhisker}
      />
      <rect x="5" y="10" width="6" height="2" fill={cScaleLight} />
      <rect x="6" y="10" width="1" height="1" fill={cBg} />
      <rect x="9" y="10" width="1" height="1" fill={cBg} />
      {/* Fangs */}
      <rect x="5" y="12" width="1" height="2" fill="#ffffff" />
      <rect x="10" y="12" width="1" height="2" fill="#ffffff" />
      <rect x="7" y="12" width="2" height="1" fill="#f43f5e" />
    </svg>
  );
}

/**
 * Reusable Segmented Pixel-Block Gauge (10 or 12 crisp rectangular blocks)
 */
export function PixelBlockGauge({
  value = 0,
  max = 100,
  blocks = 10,
  filledClass = 'bg-amber-400',
  emptyClass = 'bg-slate-900',
  heightClass = 'h-2.5'
}) {
  const safeMax = Math.max(1, Number(max) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(value) || 0) / safeMax));
  const filledBlocks = Math.round(ratio * blocks);

  return (
    <div
      className="grid gap-0.5 w-full p-0.5 bg-slate-950 border-2 border-slate-700 rounded-[2px]"
      style={{ gridTemplateColumns: `repeat(${blocks}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: blocks }).map((_, idx) => {
        const isFilled = idx < filledBlocks;
        return (
          <div
            key={idx}
            className={`${heightClass} rounded-none transition-colors duration-200 ${
              isFilled ? filledClass : emptyClass
            }`}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// REUSABLE LIVE SESSION TIMER BADGE (MM:SS WITH CLOCK ICON)
// ============================================================================
export function SessionTimerBadge({ seconds = 0 }) {
  return (
    <div
      title="Active Study Session Timer"
      className="px-2 py-1 rounded-[2px] bg-slate-950 border-2 border-sky-500/70 text-sky-300 text-[10px] font-black font-pixel-ui flex items-center gap-1 shrink-0"
    >
      <Clock className="w-3 h-3 text-sky-400 shrink-0" />
      <span>{formatSessionClock(seconds)}</span>
    </div>
  );
}

// ============================================================================
// REUSABLE 10-SEGMENT RPG MASTERY BAR (Lv.0–10 + TIER LABEL)
// ============================================================================
export function MasterySegmentedBar({ level = 0, compact = false, showTier = true }) {
  const meta = getMasteryTierMeta(level);
  return (
    <div className="w-full space-y-1">
      <div className="grid grid-cols-10 gap-0.5 w-full p-0.5 bg-slate-950 border border-slate-700 rounded-[2px]">
        {Array.from({ length: 10 }).map((_, idx) => {
          const filled = idx < meta.level;
          return (
            <div
              key={idx}
              className={`${compact ? 'h-1.5' : 'h-2'} rounded-none transition-all duration-200 ${
                filled ? meta.segmentFilledClass : 'bg-slate-900'
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-1 text-[9px] font-black leading-none">
        <span className={meta.textClass}>Lv.{meta.level}/10</span>
        {showTier && (
          <span className={`truncate ${meta.textClass} opacity-95`}>
            {compact ? meta.shortTier : meta.tier}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CHAO TONE CONTOUR VISUALIZER & AUTOMATIC TONE SANDHI BADGE
// ============================================================================
export function ChaoToneVisualizer({ pinyin = '', hanzi = '', compact = false }) {
  const syllables = useMemo(
    () => parsePinyinSyllablesWithTones(pinyin, hanzi),
    [pinyin, hanzi]
  );

  const sandhiNote = useMemo(() => {
    const cleanHanziChars = Array.from(String(hanzi || '').replace(/[^\u4e00-\u9fff]/g, ''));
    const alignedHanzi = [];
    for (let k = 0; k < cleanHanziChars.length; k++) {
      if (cleanHanziChars[k] === '儿' && alignedHanzi.length > 0 && k > 0) {
        const prevIdx = alignedHanzi.length - 1;
        if (syllables[prevIdx] && /r$/i.test(stripToneMarks(syllables[prevIdx].syllable))) {
          alignedHanzi[prevIdx] += '儿';
          continue;
        }
      }
      alignedHanzi.push(cleanHanziChars[k]);
    }
    const hasHanzi = alignedHanzi.length > 0;

    for (let i = 0; i < syllables.length - 1; i++) {
      const ch = alignedHanzi[i] || '';
      const prevCh = i > 0 ? alignedHanzi[i - 1] || '' : '';
      const cleanBase = stripToneMarks(syllables[i].syllable);
      const nextTone = syllables[i + 1].tone;

      if (syllables[i].tone === 3 && nextTone === 3) {
        return 'Tone Sandhi: 3rd + 3rd spoken as 2nd + 3rd (2 + 3)';
      }
      const isBuChar = hasHanzi ? ch === '不' : cleanBase === 'bu';
      if (isBuChar && nextTone === 4) {
        return 'Tone Sandhi: 不 (bù) shifts to 2nd tone (bú) before 4th tone';
      }
      const isYiChar = hasHanzi ? ch === '一' && prevCh !== '第' : cleanBase === 'yi';
      if (isYiChar && nextTone === 4) {
        return 'Tone Sandhi: 一 (yī) shifts to 2nd tone (yí) before 4th tone';
      }
      if (isYiChar && (nextTone === 1 || nextTone === 2 || nextTone === 3)) {
        return 'Tone Sandhi: 一 (yī) shifts to 4th tone (yì) before 1st, 2nd, or 3rd tone';
      }
    }
    return null;
  }, [syllables, hanzi]);

  const getTonePath = (tone) => {
    switch (tone) {
      case 1: // 55 High Flat
        return { d: 'M 6 6 L 42 6', label: '55 Flat', color: '#38bdf8' };
      case 2: // 35 Rising
        return { d: 'M 6 20 Q 24 14 42 5', label: '35 Rising', color: '#34d399' };
      case 3: // 214 Dipping
        return { d: 'M 6 14 L 20 23 L 42 7', label: '214 Dip', color: '#fbbf24' };
      case 4: // 51 Falling
        return { d: 'M 6 5 L 42 23', label: '51 Fall', color: '#f43f5e' };
      default: // Neutral dot
        return { d: null, label: 'Neutral', color: '#94a3b8' };
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center flex-wrap gap-2">
        {syllables.map((item, idx) => {
          const meta = getTonePath(item.tone);
          return (
            <div
              key={`${item.syllable}_${idx}`}
              className="px-2.5 py-1 rounded-[2px] bg-slate-950 border-2 border-slate-700 flex flex-col items-center"
            >
              <svg width="48" height="26" viewBox="0 0 48 28" className="overflow-visible">
                <line x1="4" y1="6" x2="44" y2="6" stroke="#1e293b" strokeWidth="1" />
                <line x1="4" y1="15" x2="44" y2="15" stroke="#1e293b" strokeWidth="1" />
                <line x1="4" y1="23" x2="44" y2="23" stroke="#1e293b" strokeWidth="1" />
                {meta.d ? (
                  <path
                    d={meta.d}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth="3"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                ) : (
                  <rect x="21" y="12" width="6" height="6" fill={meta.color} />
                )}
              </svg>
              <div className="flex items-center gap-1 text-xs font-bold font-clarity">
                <span className="text-white text-[15px] font-extrabold">{item.syllable}</span>
                {!compact && <span className="text-slate-400 text-[11px]">({meta.label})</span>}
              </div>
            </div>
          );
        })}
      </div>

      {sandhiNote && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-amber-500/15 border-2 border-amber-400/60 text-amber-300 text-xs font-bold font-clarity">
          <span>⚡ {sandhiNote}</span>
        </span>
      )}
    </div>
  );
}

// ============================================================================
// REUSABLE MANDARIN AUDIO CONTROLS (PLAY SPEAKER + SINGLE 1.0x <-> 0.65x TOGGLE)
// ============================================================================
export function MandarinAudioControls({
  text,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  size = 'md',
  vertical = false
}) {
  const [, setLocalTick] = useState(0);
  const effectiveSlow =
    typeof isSlowMode === 'boolean' ? isSlowMode : getGlobalIsSlowMode();

  const activeRate = effectiveSlow ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;
  const isPlayingThis =
    speakingState?.active && speakingState?.text === text;

  const playBtnPadding = vertical
    ? 'px-1.5 py-1 text-[10px] w-full justify-center'
    : size === 'sm'
    ? 'px-2 py-1 text-[10px]'
    : 'px-2.5 py-1.5 text-xs';
  const toggleBtnPadding = vertical
    ? 'px-1.5 py-1 text-[10px] w-full justify-center'
    : size === 'sm'
    ? 'px-2 py-1 text-[10px]'
    : 'px-2 py-1.5 text-xs';
  const iconClass = size === 'sm' || vertical ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const handlePlayCurrentSpeed = () => {
    speakMandarin(text, activeRate);
  };

  const handleToggleSpeed = () => {
    const nextSlow = !effectiveSlow;
    const nextRate = nextSlow ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;
    if (onSetSlowMode) {
      onSetSlowMode(nextSlow, text);
    } else {
      setGlobalIsSlowMode(nextSlow);
      setLocalTick((t) => t + 1);
      speakMandarin(text, nextRate);
    }
  };

  return (
    <div
      className={
        vertical
          ? 'flex flex-col gap-1 w-[74px] shrink-0'
          : 'inline-flex items-center gap-1.5'
      }
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handlePlayCurrentSpeed}
        title={`Play Audio (${effectiveSlow ? '0.65x Slow' : '1.0x Normal'})`}
        className={`game-btn-3d rounded-[2px] font-black border-2 flex items-center gap-1 transition-all ${playBtnPadding} ${
          isPlayingThis
            ? 'bg-rose-500 text-white border-rose-300 scale-105'
            : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-400/70'
        }`}
      >
        <Volume2 className={iconClass} />
        <span>Play</span>
      </button>

      <button
        type="button"
        onClick={handleToggleSpeed}
        title="Toggle Audio Speed (1.0x Normal ↔ 0.65x Slow) & Replay"
        className={`game-btn-3d rounded-[2px] font-black border-2 flex items-center gap-1 transition-all ${toggleBtnPadding} ${
          effectiveSlow
            ? 'bg-sky-500/25 hover:bg-sky-500/35 text-sky-200 border-sky-400/80'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {effectiveSlow && <Turtle className={size === 'sm' || vertical ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
        <span>{effectiveSlow ? '0.65x' : '1.0x'}</span>
      </button>
    </div>
  );
}

// ============================================================================
// IN-SESSION GAMIFIED TOP HUD (SEGMENTED PIXEL PROGRESS BAR + LIVE COMBO + FLOATING XP)
// ============================================================================
export function SessionGameTopHud({
  title,
  subtitle,
  totalSegments = 3,
  completedSegments = 0,
  combo = 0,
  sessionSeconds = 0,
  xpPopupKey = 0,
  xpPopupAmount = 15,
  onClose,
  rightElement = null
}) {
  const segCount = Math.max(1, Math.min(12, totalSegments));
  const scaledCompleted = Math.round(
    (Math.max(0, completedSegments) / Math.max(1, totalSegments)) * segCount
  );

  return (
    <div className="space-y-2.5 border-b-2 border-slate-700 pb-3 relative">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="game-btn-3d px-2.5 py-1.5 rounded-[2px] bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-slate-200 flex items-center gap-1 text-xs font-bold shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Map</span>
        </button>

        <div className="text-center min-w-0 flex-1 px-1">
          <ScrollingText
            text={title}
            className="font-pixel-header text-[9px] uppercase text-amber-400"
          />
          <ScrollingText
            text={subtitle}
            className="font-clarity text-xs font-semibold text-slate-300 mt-0.5"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <SessionTimerBadge seconds={sessionSeconds} />
          {combo >= 2 && (
            <div className="px-2 py-1 rounded-[2px] bg-amber-500/20 border-2 border-amber-400 text-amber-300 text-[10px] font-black flex items-center gap-1 animate-bounce">
              <PixelFlameSprite active={true} className="w-3.5 h-3.5" />
              <span>{combo}x</span>
            </div>
          )}
          {rightElement}
        </div>
      </div>

      {/* Segmented Rectangular Pixel-Block Session Progress Bar */}
      <div
        className="grid gap-1 p-1 bg-slate-950 border-2 border-slate-700 rounded-[2px]"
        style={{ gridTemplateColumns: `repeat(${segCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: segCount }).map((_, idx) => {
          const filled = idx < scaledCompleted;
          return (
            <div
              key={idx}
              className={`h-2.5 rounded-none transition-all duration-200 ${
                filled
                  ? 'bg-emerald-400'
                  : 'bg-slate-900'
              }`}
            />
          );
        })}
      </div>

      {/* Floating "+XP" Pixel Popup on Correct Answers */}
      {xpPopupKey > 0 && (
        <div
          key={xpPopupKey}
          className="animate-xp-float pointer-events-none absolute right-2 top-9 z-30 px-2.5 py-1 rounded-[2px] bg-emerald-500 text-slate-950 font-pixel-header text-[10px] border-2 border-emerald-200 flex items-center gap-1"
        >
          <PixelCoinSprite className="w-3.5 h-3.5" />
          <span>+{xpPopupAmount} XP</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHARACTER INSPECTOR MODAL (FOR CHARACTER MATRIX & RADICAL EXPLORER PILLS)
// ============================================================================
export function CharacterInspectModal({
  charEntry,
  isSlowMode,
  onSetSlowMode,
  speakMandarin,
  speakingState,
  onClose
}) {
  const [scriptStatus, setScriptStatus] = useState('loading');
  const [charDetails, setCharDetails] = useState({ strokeCount: null, radStrokes: [] });
  const previewRef = useRef(null);
  const writerRef = useRef(null);

  const targetChar = charEntry?.char || '你';
  const knownInfo = KNOWN_CHARACTER_INFO[targetChar] || null;

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
    speakMandarin(targetChar);
  }, [targetChar, speakMandarin]);

  useEffect(() => {
    if (scriptStatus !== 'ready' || !previewRef.current || !window.HanziWriter) return;
    const containerEl = previewRef.current;
    containerEl.innerHTML = '';
    writerRef.current = null;

    const writer = window.HanziWriter.create(containerEl, targetChar, {
      width: 190,
      height: 190,
      padding: 14,
      showOutline: true,
      showCharacter: true,
      strokeAnimationSpeed: 1.1,
      delayBetweenStrokes: 180,
      strokeColor: '#f8fafc',
      radicalColor: '#dc2626',
      outlineColor: '#334155',
      onLoadCharDataSuccess: (data) => {
        const radStrokes = Array.isArray(data.radStrokes) ? data.radStrokes : [];
        setCharDetails({
          strokeCount: Array.isArray(data.strokes) ? data.strokes.length : null,
          radStrokes
        });
        setTimeout(() => {
          if (writerRef.current === writer) {
            writer.animateCharacter();
          }
        }, 120);
      }
    });

    writerRef.current = writer;

    return () => {
      if (containerEl) containerEl.innerHTML = '';
      writerRef.current = null;
    };
  }, [scriptStatus, targetChar]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[2px] bg-slate-900 border-2 border-amber-500 p-5 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
          <div className="flex-1 min-w-0 pr-2">
            <span className="text-[10px] font-extrabold uppercase text-amber-400">
              Hanzi Inspector • Mastery Lv.{charEntry?.mastery ?? 0}/10 ({getMasteryTierMeta(charEntry?.mastery ?? 0).tier})
            </span>
            <h3 className="text-lg font-black text-white">
              Character "<span className="font-hanzi">{targetChar}</span>" ({knownInfo?.pinyin || charEntry?.pinyinSyllables?.join(' / ')})
            </h3>
            <div className="mt-1.5 max-w-[180px]">
              <MasterySegmentedBar level={charEntry?.mastery ?? 0} compact={true} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="game-btn-3d p-1.5 rounded-[2px] bg-slate-800 border-2 border-slate-600 text-slate-300 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-2.5">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300">
              {charDetails.strokeCount ? `${charDetails.strokeCount} Total Strokes` : 'Loading Strokes...'}
            </span>
            <MandarinAudioControls
              text={targetChar}
              isSlowMode={isSlowMode}
              onSetSlowMode={onSetSlowMode}
              speakMandarin={speakMandarin}
              speakingState={speakingState}
              size="sm"
            />
          </div>

          <div className="relative w-[196px] h-[196px] rounded-[2px] bg-slate-950 border-2 border-amber-500/70 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 196 196"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
            >
              <rect x="4" y="4" width="188" height="188" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="4" y1="98" x2="192" y2="98" stroke="#f59e0b" strokeWidth="1" strokeDasharray="5 5" />
              <line x1="98" y1="4" x2="98" y2="192" stroke="#f59e0b" strokeWidth="1" strokeDasharray="5 5" />
            </svg>
            <div ref={previewRef} className="relative z-10 w-[190px] h-[190px] font-hanzi" />
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              writerRef.current?.animateCharacter();
            }}
            className="game-btn-3d px-4 py-2 rounded-[2px] bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 text-amber-300 text-xs font-extrabold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Replay Stroke Animation</span>
          </button>
        </div>

        <div className="rounded-[2px] bg-slate-950 border-2 border-slate-700 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold">Core Meaning:</span>
            <span className="text-emerald-300 font-extrabold">
              {knownInfo?.meaning || charEntry?.meanings?.join('; ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold">Semantic Radical:</span>
            <span className="text-red-400 font-extrabold font-hanzi">
              {knownInfo?.radical ||
                (charDetails.radStrokes?.length > 0
                  ? `Highlighted in Red (${charDetails.radStrokes.length} strokes)`
                  : 'Highlighted in Red (#dc2626)')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REUSABLE AUTO-SCROLLING MARQUEE FOR OVERFLOWING TEXT (<ScrollingText />)
// ============================================================================
export function ScrollingText({
  text = '',
  children = null,
  className = '',
  pauseMs = 1200,
  pixelsPerSecond = 38
}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [overflowPx, setOverflowPx] = useState(0);

  const measureOverflow = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const diff = Math.ceil(content.scrollWidth - container.clientWidth);
    const nextOverflow = diff > 3 ? diff : 0;
    setOverflowPx((prev) => (prev === nextOverflow ? prev : nextOverflow));
  }, []);

  useEffect(() => {
    measureOverflow();
    const rafId =
      typeof window !== 'undefined' && window.requestAnimationFrame
        ? window.requestAnimationFrame(measureOverflow)
        : null;
    window.addEventListener('resize', measureOverflow);
    return () => {
      if (rafId !== null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', measureOverflow);
    };
  }, [text, measureOverflow]);

  const totalDurationMs =
    overflowPx > 0
      ? Math.max(
          2600,
          Math.round((overflowPx / Math.max(10, pixelsPerSecond)) * 1000) + pauseMs * 2 + 550
        )
      : 0;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap min-w-0 max-w-full block ${className}`}
      title={typeof text === 'string' && text ? text : undefined}
    >
      <div
        ref={contentRef}
        style={
          overflowPx > 0
            ? {
                '--marquee-shift': `-${overflowPx}px`,
                '--marquee-duration': `${totalDurationMs}ms`
              }
            : undefined
        }
        className={`inline-block whitespace-nowrap ${
          overflowPx > 0 ? 'will-change-transform animate-marquee-glide' : ''
        }`}
      >
        {children !== null && children !== undefined ? children : text}
      </div>
    </div>
  );
}

// ============================================================================
// POST-ANSWER INTERACTIVE CHARACTER INSPECTOR (<InteractiveExampleText />)
// STRICT ANTI-SPOILER: Render ONLY on flashcard backs or post-answer feedback!
// ============================================================================
export function InteractiveExampleText({
  sentence = '',
  speakMandarin,
  masteryMap = {},
  courseWords = [],
  className = '',
  charClassName = '',
  stopPropagation = true,
  hintLabel = 'Tap any character to inspect',
  showHint = true,
  onInspectOpenChange = null
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const tokens = useMemo(() => {
    return Array.from(String(sentence || '')).map((ch, idx) => ({
      ch,
      idx,
      isHanzi: /^[\u4e00-\u9fff]$/.test(ch)
    }));
  }, [sentence]);

  // Reset popover whenever the sentence changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [sentence]);

  // Notify parent modal when inspector opens/closes (e.g. to pause auto-advance)
  useEffect(() => {
    if (typeof onInspectOpenChange === 'function') {
      onInspectOpenChange(selectedIndex !== null);
    }
  }, [selectedIndex, onInspectOpenChange]);

  const selectedToken =
    selectedIndex !== null && tokens[selectedIndex]?.isHanzi ? tokens[selectedIndex] : null;

  const inspectedInfo = useMemo(() => {
    if (!selectedToken) return null;
    return resolveCharacterInspectorInfo(selectedToken.ch, {
      courseWords,
      masteryMap
    });
  }, [selectedToken, courseWords, masteryMap]);

  if (!sentence) return null;

  const handleToggleChar = (e, idx) => {
    if (stopPropagation && e) e.stopPropagation();
    soundFX.playPop();
    setSelectedIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div
      className={`w-full ${className}`}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      <div className="flex flex-wrap items-baseline gap-y-1 leading-relaxed">
        {tokens.map((tok) => {
          if (!tok.isHanzi) {
            return (
              <span key={tok.idx} className="font-hanzi select-text">
                {tok.ch}
              </span>
            );
          }
          const isActive = selectedIndex === tok.idx;
          return (
            <button
              key={tok.idx}
              type="button"
              onClick={(e) => handleToggleChar(e, tok.idx)}
              title={`Inspect ${tok.ch}`}
              className={`font-hanzi inline-flex items-center justify-center px-0.5 rounded-[2px] border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-400/25 border-amber-400 text-amber-200'
                  : 'border-dotted border-amber-400/50 hover:bg-slate-800/90 hover:border-amber-300'
              } ${charClassName}`}
            >
              {tok.ch}
            </button>
          );
        })}
      </div>

      {showHint && !inspectedInfo && (
        <div className="mt-1 text-[10px] font-clarity font-semibold text-amber-300/75">
          {hintLabel}
        </div>
      )}

      {inspectedInfo && (
        <div
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
          }}
          className="mt-2 rounded-[2px] bg-slate-950 border-2 border-amber-400 p-2.5 shadow-[0_3px_0_#020617] text-left space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-[2px] bg-slate-900 border-2 border-amber-500/70 flex items-center justify-center shrink-0">
                <span className="font-hanzi text-2xl font-black text-white leading-none">
                  {inspectedInfo.char}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="font-clarity text-sm font-black text-amber-300 leading-tight">
                    {inspectedInfo.pinyin}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] border text-[9px] font-black uppercase leading-none ${inspectedInfo.badgeClass}`}
                  >
                    Lv.{inspectedInfo.masteryLevel}/10 • {inspectedInfo.tierTitle}
                  </span>
                </div>
                <p className="font-clarity text-xs font-semibold text-slate-200 leading-snug mt-0.5 break-words">
                  {inspectedInfo.meaning}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                soundFX.playPop();
                setSelectedIndex(null);
              }}
              aria-label="Close character inspector"
              className="p-1 rounded-[2px] bg-slate-900 border border-slate-700 text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {inspectedInfo.compoundHint && (
            <div className="font-clarity text-[10px] text-sky-300 bg-slate-900/90 border border-slate-800 rounded-[2px] px-2 py-1">
              In vocabulary: <span className="font-hanzi font-bold text-white">{inspectedInfo.compoundHint}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            {inspectedInfo.radical ? (
              <span className="font-clarity text-[10px] text-slate-400 truncate">
                Radical: <span className="font-hanzi font-bold text-rose-300">{inspectedInfo.radical}</span>
              </span>
            ) : (
              <span className="font-clarity text-[10px] text-slate-500">
                Character Inspector
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                if (speakMandarin) speakMandarin(inspectedInfo.char);
              }}
              className="game-btn-3d inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-pixel-header text-[8px] uppercase tracking-wider shrink-0"
            >
              <Volume2 className="w-3 h-3" />
              Listen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


