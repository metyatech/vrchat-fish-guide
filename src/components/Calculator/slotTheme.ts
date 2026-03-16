import { RankDimension } from '@/lib/ranking';

export type CompareTarget = RankDimension | 'full-build';

export interface SlotTheme {
  chipClassName: string;
  panelClassName: string;
  /** Border-only variant of panelClassName; use where the background should remain white. */
  panelBorderClassName: string;
  /** Border-only variant for dark loadout-board surfaces. */
  boardBorderClassName: string;
  buttonActiveClassName: string;
  buttonIdleClassName: string;
  dotClassName: string;
  /** Chip variant for use on dark (slate-900) loadout board backgrounds. */
  boardChipClassName: string;
}

export const SLOT_THEME: Record<CompareTarget, SlotTheme> = {
  rod: {
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-900',
    panelClassName: 'border-amber-200 bg-amber-50',
    panelBorderClassName: 'border-amber-200',
    boardBorderClassName: 'border-amber-500/30',
    buttonActiveClassName: 'border-amber-600 bg-amber-600 text-white',
    buttonIdleClassName:
      'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100',
    dotClassName: 'bg-amber-500',
    boardChipClassName: 'border-amber-500/50 bg-amber-500/20 text-amber-300',
  },
  line: {
    chipClassName: 'border-sky-200 bg-sky-50 text-sky-900',
    panelClassName: 'border-sky-200 bg-sky-50',
    panelBorderClassName: 'border-sky-200',
    boardBorderClassName: 'border-sky-500/30',
    buttonActiveClassName: 'border-sky-600 bg-sky-600 text-white',
    buttonIdleClassName:
      'border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100',
    dotClassName: 'bg-sky-500',
    boardChipClassName: 'border-sky-500/50 bg-sky-500/20 text-sky-300',
  },
  bobber: {
    chipClassName: 'border-rose-200 bg-rose-50 text-rose-900',
    panelClassName: 'border-rose-200 bg-rose-50',
    panelBorderClassName: 'border-rose-200',
    boardBorderClassName: 'border-rose-500/30',
    buttonActiveClassName: 'border-rose-600 bg-rose-600 text-white',
    buttonIdleClassName:
      'border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100',
    dotClassName: 'bg-rose-500',
    boardChipClassName: 'border-rose-500/50 bg-rose-500/20 text-rose-300',
  },
  enchant: {
    chipClassName: 'border-violet-200 bg-violet-50 text-violet-900',
    panelClassName: 'border-violet-200 bg-violet-50',
    panelBorderClassName: 'border-violet-200',
    boardBorderClassName: 'border-violet-500/30',
    buttonActiveClassName: 'border-violet-600 bg-violet-600 text-white',
    buttonIdleClassName:
      'border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100',
    dotClassName: 'bg-violet-500',
    boardChipClassName: 'border-violet-500/50 bg-violet-500/20 text-violet-300',
  },
  area: {
    chipClassName: 'border-teal-200 bg-teal-50 text-teal-900',
    panelClassName: 'border-teal-200 bg-teal-50',
    panelBorderClassName: 'border-teal-200',
    boardBorderClassName: 'border-teal-500/30',
    buttonActiveClassName: 'border-teal-600 bg-teal-600 text-white',
    buttonIdleClassName:
      'border-teal-200 bg-teal-50 text-teal-900 hover:border-teal-300 hover:bg-teal-100',
    dotClassName: 'bg-teal-500',
    boardChipClassName: 'border-teal-500/50 bg-teal-500/20 text-teal-300',
  },
  'full-build': {
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    panelClassName: 'border-emerald-200 bg-emerald-50',
    panelBorderClassName: 'border-emerald-200',
    boardBorderClassName: 'border-emerald-500/30',
    buttonActiveClassName: 'border-emerald-600 bg-emerald-600 text-white',
    buttonIdleClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100',
    dotClassName: 'bg-emerald-500',
    boardChipClassName: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300',
  },
};
