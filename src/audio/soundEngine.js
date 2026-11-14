// ============================================================================
// CENTRALIZED WEB SPEECH API MANDARIN TTS ENGINE ('zh-CN', 1.0x NORMAL & 0.65x SLOW)
// ============================================================================
export const NORMAL_SPEECH_RATE = 1.0;
export const SLOW_SPEECH_RATE = 0.65;
export const STORAGE_KEY_PREFERRED_VOICE = 'macalaoshi_preferred_zh_voice';

// Module-level refs track current slow-mode and voice preferences so event handlers never read stale closures
let globalIsSlowMode = false;
let globalPreferredVoiceURI = '';
let activeUtteranceRef = null;
let cachedVoicesList = [];

if (typeof window !== 'undefined') {
  try {
    const savedVoice = window.localStorage.getItem(STORAGE_KEY_PREFERRED_VOICE);
    if (savedVoice) {
      globalPreferredVoiceURI = savedVoice;
    }
  } catch (e) {
    // Ignore storage read errors
  }
}

export function getGlobalIsSlowMode() {
  return globalIsSlowMode;
}

export function setGlobalIsSlowMode(val) {
  globalIsSlowMode = Boolean(val);
}

export function getGlobalPreferredVoiceURI() {
  return globalPreferredVoiceURI;
}

export function setGlobalPreferredVoiceURI(voiceURI) {
  globalPreferredVoiceURI = String(voiceURI || '').trim();
  if (typeof window !== 'undefined') {
    try {
      if (globalPreferredVoiceURI) {
        window.localStorage.setItem(STORAGE_KEY_PREFERRED_VOICE, globalPreferredVoiceURI);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_PREFERRED_VOICE);
      }
    } catch (e) {
      // Ignore storage write errors
    }
  }
}

function scoreMandarinVoiceQuality(voice) {
  const name = String(voice?.name || '');
  const lowerName = name.toLowerCase();
  const lang = String(voice?.lang || '').toLowerCase().replace('_', '-');

  let score = 0;

  // Prefer Mainland Standard Mandarin (zh-CN) first, then other zh locales
  if (lang === 'zh-cn' || lang.startsWith('zh-cn') || lang.startsWith('cmn-hans')) {
    score += 40;
  } else if (lang === 'zh' || lang.startsWith('zh') || lang.startsWith('cmn')) {
    score += 20;
  }

  // Prioritize natural / neural / cloud high-clarity voices before robotic local fallback voices
  if (
    name.includes('Google 普通话') ||
    name.includes('普通话') ||
    lowerName.includes('google')
  ) {
    score += 55;
  }
  if (
    lowerName.includes('natural') ||
    lowerName.includes('neural') ||
    lowerName.includes('premium') ||
    lowerName.includes('online') ||
    lowerName.includes('enhanced')
  ) {
    score += 50;
  }
  if (
    lowerName.includes('xiaoxiao') ||
    lowerName.includes('yunxi') ||
    lowerName.includes('tingting') ||
    lowerName.includes('siri') ||
    lowerName.includes('meijia')
  ) {
    score += 35;
  }
  if (voice?.localService === false) {
    score += 15;
  }

  return score;
}

export function getAvailableMandarinVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const rawVoices = window.speechSynthesis.getVoices?.() || [];
  if (rawVoices.length > 0) {
    cachedVoicesList = rawVoices;
  }
  const source = rawVoices.length > 0 ? rawVoices : cachedVoicesList;
  const zhVoices = source.filter((v) => {
    const lang = String(v?.lang || '').toLowerCase().replace('_', '-');
    const name = String(v?.name || '').toLowerCase();
    return (
      lang.startsWith('zh') ||
      lang.startsWith('cmn') ||
      name.includes('chinese') ||
      name.includes('mandarin') ||
      name.includes('普通话') ||
      name.includes('中文')
    );
  });

  return [...zhVoices].sort(
    (a, b) => scoreMandarinVoiceQuality(b) - scoreMandarinVoiceQuality(a)
  );
}

export function resolveMandarinVoice(preferredOverrideURI = undefined) {
  const zhVoices = getAvailableMandarinVoices();
  if (zhVoices.length === 0) return null;

  const targetURI =
    preferredOverrideURI !== undefined
      ? String(preferredOverrideURI || '').trim()
      : globalPreferredVoiceURI;

  if (targetURI) {
    const matched = zhVoices.find(
      (v) => v.voiceURI === targetURI || v.name === targetURI
    );
    if (matched) return matched;
  }

  // Default to the highest-scored Natural / Neural / Google 普通话 voice
  return zhVoices[0] || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  resolveMandarinVoice();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      resolveMandarinVoice();
    };
  }
}

export function speakMandarinGlobal(text, overrideRate = undefined, callbacks = {}) {
  const { onStart, onEnd, onError, onUnsupported, preferredVoiceURI } = callbacks;

  // Resolve target rate: explicit numeric rate (1.0 or 0.65) -> boolean slow flag -> current global state
  let resolvedRate = globalIsSlowMode ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;
  if (typeof overrideRate === 'number' && !Number.isNaN(overrideRate)) {
    resolvedRate = overrideRate <= 0.75 ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;
  } else if (typeof overrideRate === 'boolean') {
    resolvedRate = overrideRate ? SLOW_SPEECH_RATE : NORMAL_SPEECH_RATE;
  }

  const cleanText = String(text || '').trim();
  if (!cleanText) return resolvedRate;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onUnsupported?.(cleanText, resolvedRate);
    return resolvedRate;
  }

  try {
    // 1. Always cancel any queued or cached utterances immediately before creating a new utterance
    window.speechSynthesis.cancel();

    // 2. Create a fresh SpeechSynthesisUtterance with explicit zh-CN language, 1.03 pitch, and 0.65 / 1.0 rate
    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtteranceRef = utterance;
    utterance.lang = 'zh-CN';
    utterance.rate = resolvedRate;
    utterance.pitch = 1.03;

    // 3. Bind preferred or natural/neural Chinese voice ('zh-CN' or 'zh')
    const zhVoice = resolveMandarinVoice(preferredVoiceURI);
    if (zhVoice) {
      utterance.voice = zhVoice;
      if (zhVoice.lang) {
        utterance.lang = zhVoice.lang;
      }
    }

    onStart?.(cleanText, resolvedRate);

    utterance.onend = () => {
      if (activeUtteranceRef === utterance) {
        activeUtteranceRef = null;
      }
      onEnd?.(cleanText, resolvedRate);
    };

    utterance.onerror = () => {
      if (activeUtteranceRef === utterance) {
        activeUtteranceRef = null;
      }
      onError?.(cleanText, resolvedRate);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    onError?.(cleanText, resolvedRate);
  }

  return resolvedRate;
}

// ============================================================================
// ZERO-COST SYNTHESIZED SOUND EFFECTS ENGINE (WEB AUDIO API)
// ============================================================================
export class SynthesizedSoundFX {
  ctx = null;
  muted = false;

  initContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window['webkitAudioContext'];
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(isMuted) {
    this.muted = Boolean(isMuted);
  }

  // Crisp ascending two-tone chime for correct answers
  playCorrect(combo = 1) {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const pitchBoost = Math.min(combo - 1, 6) * 22;
      const freq1 = 523.25 + pitchBoost; // C5+
      const freq2 = 659.25 + pitchBoost; // E5+
      const freq3 = 783.99 + pitchBoost; // G5+

      const playTone = (freq, startTime, duration, peakGain = 0.14) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);
      };

      playTone(freq1, now, 0.14, 0.13);
      playTone(freq3, now + 0.09, 0.26, 0.16);
      if (combo >= 3) {
        playTone(freq2 * 1.5, now + 0.17, 0.22, 0.1);
      }
    } catch (e) {
      // Ignore audio context restrictions
    }
  }

  // Low soft thud for mistakes
  playMistake() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(78, now + 0.24);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      // Ignore
    }
  }

  // Subtle tactile pop when flipping cards or pressing nodes
  playPop() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.055);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // Ignore
    }
  }

  // Celebratory arpeggio when completing a stage or defeating a Unit Boss
  playVictory() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.085;
        const dur = idx === notes.length - 1 ? 0.48 : 0.2;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.03);
      });
    } catch (e) {
      // Ignore
    }
  }
}

export const soundFX = new SynthesizedSoundFX();
