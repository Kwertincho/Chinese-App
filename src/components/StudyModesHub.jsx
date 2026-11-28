import React from 'react';
import {
  Map,
  Dumbbell,
  Flame,
  Headphones,
  Zap,
  Sparkles,
  BookOpen,
  Languages,
  Target,
  Volume2,
  ChevronRight,
  Compass,
  X
} from 'lucide-react';
import { soundFX } from '../audio/soundEngine.js';
import { ADVANCED_MODE_UNLOCK_THRESHOLDS } from '../data/curriculumData.js';

const GENERATIVE_DRILL_KEYS = [
  'translation_prod',
  'open_cloze',
  'syntax_transform',
  'error_spotter',
  'contextual_writing',
  'grammar_lab',
  'micro_reading'
];

/** @param {any} props */
export function StudyModesHub({
  unlockedWordsCount = 0,
  discoveredWordsCount = 0,
  srsDueCount = 0,
  leechCount = 0,
  generativeReadiness = {},
  corpusStats = { totalCorpusSentences: 0, i0Count: 0, i1Count: 0 },
  confusableCount = 0,
  isModal = false,
  onClose = null,
  onNavigateTab,
  onLaunchSmartReview,
  onLaunchLeechRemediation,
  onOpenShadowing,
  onLaunchBlitz,
  onLaunchGenerativeMode,
  onLaunchConfusable,
  onOpenLibrarySection
}) {
  const unlockedGenCount = GENERATIVE_DRILL_KEYS.filter(
    (key) => Boolean(generativeReadiness?.[key]?.unlocked)
  ).length;
  const i0ReadyCount = Number(corpusStats?.i0Count || 0);
  const blitzThreshold = ADVANCED_MODE_UNLOCK_THRESHOLDS.blitz_match;
  const workbookThreshold = ADVANCED_MODE_UNLOCK_THRESHOLDS.sentence_builder;
  const isBlitzUnlocked = unlockedWordsCount >= blitzThreshold;
  const isWorkbookReady = unlockedWordsCount >= workbookThreshold;
  const isCorpusDrillReady = i0ReadyCount >= 6;
  const isConfusableReady = confusableCount >= 3;

  const runAction = (fn) => {
    soundFX.playPop();
    if (typeof onClose === 'function') {
      onClose();
    }
    if (typeof fn === 'function') {
      fn();
    }
  };

  const sections = [
    {
      id: 'progression',
      title: '1. Structured Progression',
      accentClass: 'text-rose-400',
      borderClass: 'border-rose-500/35',
      items: [
        {
          id: 'map',
          title: 'Adventure World (Map)',
          desc: 'Lesson-by-lesson progression (Run 1 → Run 3 MAX) for official HSK 1–4B and gradual HSK 5–9 courses.',
          icon: Map,
          iconBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
          statusLabel: 'Active',
          statusClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          actionLabel: 'Open Map',
          onLaunch: () => onNavigateTab?.('map')
        }
      ]
    },
    {
      id: 'recall',
      title: '2. Active Recall & Memory',
      accentClass: 'text-amber-400',
      borderClass: 'border-amber-500/35',
      items: [
        {
          id: 'smart_review',
          title: 'Smart Review Arena',
          desc: 'Adaptive SRS queue prioritizing core words and due reviews.',
          icon: Dumbbell,
          iconBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
          statusLabel:
            Number(discoveredWordsCount || 0) <= 0
              ? 'Complete 1 Lesson'
              : srsDueCount > 0
              ? `${srsDueCount} Due`
              : `${discoveredWordsCount} Ready`,
          statusClass:
            Number(discoveredWordsCount || 0) <= 0
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : srsDueCount > 0
              ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
          actionLabel: 'Launch',
          onLaunch: () => (onLaunchSmartReview ? onLaunchSmartReview() : onNavigateTab?.('practice'))
        },
        {
          id: 'leech_remediation',
          title: 'Leech Remediation',
          desc: 'Targeted multi-modal drill for stubborn words (4+ lapses).',
          icon: Flame,
          iconBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
          statusLabel: leechCount > 0 ? `${leechCount} Leech${leechCount === 1 ? '' : 'es'}` : '0 Leeches',
          statusClass:
            leechCount > 0
              ? 'bg-rose-500/20 text-rose-200 border-rose-400/50'
              : 'bg-slate-800 text-slate-400 border-slate-700',
          actionLabel: leechCount > 0 ? 'Drill Now' : 'Review',
          onLaunch: () =>
            leechCount > 0 && onLaunchLeechRemediation
              ? onLaunchLeechRemediation()
              : onNavigateTab?.('practice')
        },
        {
          id: 'shadowing',
          title: 'Hands-Free Shadowing',
          desc: 'Audio-only recall & listening loop with screen wake lock.',
          icon: Headphones,
          iconBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
          statusLabel: 'Audio Loop',
          statusClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
          actionLabel: 'Listen',
          onLaunch: () => onOpenShadowing?.()
        },
        {
          id: 'blitz',
          title: '60s Blitz',
          desc: 'Timed rapid-recognition speed sprint for reflex reading.',
          icon: Zap,
          iconBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
          statusLabel: isBlitzUnlocked ? 'Ready' : `${unlockedWordsCount}/${blitzThreshold} Words`,
          statusClass: isBlitzUnlocked
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
            : 'bg-slate-800 text-slate-400 border-slate-700',
          actionLabel: isBlitzUnlocked ? 'Play 60s' : 'View',
          onLaunch: () =>
            isBlitzUnlocked && onLaunchBlitz ? onLaunchBlitz() : onNavigateTab?.('practice')
        }
      ]
    },
    {
      id: 'grammar',
      title: '3. Grammar, Production & Context',
      accentClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/35',
      items: [
        {
          id: 'generative_lab',
          title: 'Generative Production Lab',
          desc: 'EN → ZH Translation, Open Cloze, Syntax Transform, Error Spotter, Contextual Writing, Separables & Micro-Reading.',
          icon: Sparkles,
          iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          statusLabel: `${unlockedGenCount}/7 Unlocked`,
          statusClass:
            unlockedGenCount > 0
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              : 'bg-slate-800 text-slate-400 border-slate-700',
          actionLabel: 'Open Lab',
          onLaunch: () => onNavigateTab?.('practice')
        },
        {
          id: 'corpus_immersion',
          title: 'Corpus Immersion (i+0 / i+1)',
          desc: 'Real sentences mined from textbooks and the offline bilingual corpus.',
          icon: BookOpen,
          iconBg: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
          statusLabel: `${i0ReadyCount} i+0 Ready`,
          statusClass: isCorpusDrillReady
            ? 'bg-teal-500/20 text-teal-200 border-teal-400/40'
            : 'bg-slate-800 text-slate-300 border-slate-700',
          actionLabel: isCorpusDrillReady ? 'Launch' : 'Browse',
          onLaunch: () =>
            isCorpusDrillReady && onLaunchGenerativeMode
              ? onLaunchGenerativeMode('corpus_immersion')
              : onOpenLibrarySection?.('corpus')
        },
        {
          id: 'confusable_twins',
          title: 'Confusable Twins (形近字 / 同音字)',
          desc: 'Visual look-alike and homophone discrimination drills.',
          icon: Languages,
          iconBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40',
          statusLabel: isConfusableReady ? `${confusableCount} Pairs` : `${confusableCount}/3 Pairs`,
          statusClass: isConfusableReady
            ? 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40'
            : 'bg-slate-800 text-slate-400 border-slate-700',
          actionLabel: isConfusableReady ? 'Train' : 'View',
          onLaunch: () =>
            isConfusableReady && onLaunchConfusable
              ? onLaunchConfusable()
              : onNavigateTab?.('practice')
        }
      ]
    },
    {
      id: 'foundations',
      title: '4. Foundations & Exams',
      accentClass: 'text-sky-400',
      borderClass: 'border-sky-500/35',
      items: [
        {
          id: 'workbook_exams',
          title: 'Workbook & Exams',
          desc: 'Cloze, Tone & Sandhi Drill, Numbers & Time Lab, and HSK Mock Exam.',
          icon: Target,
          iconBg: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
          statusLabel: isWorkbookReady ? 'Ready' : `${unlockedWordsCount}/${workbookThreshold} Words`,
          statusClass: isWorkbookReady
            ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
            : 'bg-slate-800 text-slate-400 border-slate-700',
          actionLabel: 'Open Arena',
          onLaunch: () => onNavigateTab?.('practice')
        },
        {
          id: 'phonetics_orthography',
          title: 'Phonetics Studio & Orthography',
          desc: 'Pinyin/IPA matrix, Basic Strokes (笔画), Character Structures (合体字), Radicals & Stroke Rules.',
          icon: Volume2,
          iconBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
          statusLabel: 'Always Ready',
          statusClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
          actionLabel: 'Open Studio',
          onLaunch: () => onOpenLibrarySection?.('phonetics')
        }
      ]
    }
  ];

  return (
    <div
      className={
        isModal
          ? 'space-y-4'
          : 'rounded-2xl bg-slate-800/75 border border-slate-700/80 p-4 space-y-4'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Study Modes &amp; Tools</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Complete directory of every offline practice mode and foundation tool.
          </p>
        </div>
        {isModal && typeof onClose === 'function' && (
          <button
            type="button"
            onClick={() => {
              soundFX.playPop();
              onClose();
            }}
            aria-label="Close Study Modes Guide"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3.5">
        {sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <h3 className={`text-[10px] font-black uppercase tracking-wider ${section.accentClass}`}>
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-slate-900/90 border ${section.borderClass} p-3 flex items-center justify-between gap-2.5`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white leading-tight">
                            {item.title}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-[2px] border shrink-0 ${item.statusClass}`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>
                        <p className="font-clarity text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => runAction(item.onLaunch)}
                      className="game-btn-3d px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-extrabold text-amber-300 flex items-center gap-0.5 shrink-0"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
