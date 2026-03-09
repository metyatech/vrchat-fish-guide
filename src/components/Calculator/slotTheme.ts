import { RankSlot } from '@/lib/ranking';

export type CompareTarget = RankSlot | 'full-build';

export interface SlotTheme {
  chipClassName: string;
  panelClassName: string;
  /** Border-only variant of panelClassName; use where the background should remain white. */
  panelBorderClassName: string;
  buttonActiveClassName: string;
  buttonIdleClassName: string;
  dotClassName: string;
}

export const SLOT_THEME: Record<CompareTarget, SlotTheme> = {
  rod: {
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-900',
    panelClassName: 'border-amber-200 bg-amber-50',
    panelBorderClassName: 'border-amber-200',
    buttonActiveClassName: 'border-amber-600 bg-amber-600 text-white',
    buttonIdleClassName:
      'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100',
    dotClassName: 'bg-amber-500',
  },
  line: {
    chipClassName: 'border-sky-200 bg-sky-50 text-sky-900',
    panelClassName: 'border-sky-200 bg-sky-50',
    panelBorderClassName: 'border-sky-200',
    buttonActiveClassName: 'border-sky-600 bg-sky-600 text-white',
    buttonIdleClassName:
      'border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-300 hover:bg-sky-100',
    dotClassName: 'bg-sky-500',
  },
  bobber: {
    chipClassName: 'border-rose-200 bg-rose-50 text-rose-900',
    panelClassName: 'border-rose-200 bg-rose-50',
    panelBorderClassName: 'border-rose-200',
    buttonActiveClassName: 'border-rose-600 bg-rose-600 text-white',
    buttonIdleClassName:
      'border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-rose-100',
    dotClassName: 'bg-rose-500',
  },
  enchant: {
    chipClassName: 'border-violet-200 bg-violet-50 text-violet-900',
    panelClassName: 'border-violet-200 bg-violet-50',
    panelBorderClassName: 'border-violet-200',
    buttonActiveClassName: 'border-violet-600 bg-violet-600 text-white',
    buttonIdleClassName:
      'border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300 hover:bg-violet-100',
    dotClassName: 'bg-violet-500',
  },
  'full-build': {
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    panelClassName: 'border-emerald-200 bg-emerald-50',
    panelBorderClassName: 'border-emerald-200',
    buttonActiveClassName: 'border-emerald-600 bg-emerald-600 text-white',
    buttonIdleClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100',
    dotClassName: 'bg-emerald-500',
  },
};
