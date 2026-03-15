import React from 'react';

export type CalculatorGoal = 'upgrade' | 'compare' | 'summary' | 'fish';

type GoalModeCopy = {
  badge: string;
  title: string;
  description: string;
  accentClassName: string;
  ringClassName: string;
  glowClassName: string;
};

export const CALCULATOR_GOAL_COPY: Record<CalculatorGoal, GoalModeCopy> = {
  upgrade: {
    badge: '候補探し',
    title: '次に買い替える候補を見る',
    description: '変えたいスロットだけに絞って、伸びる候補を先に見ます。',
    accentClassName:
      'border-cyan-300 bg-[linear-gradient(145deg,rgba(236,254,255,0.98),rgba(224,242,254,0.94))] text-cyan-950',
    ringClassName: 'ring-cyan-200',
    glowClassName: 'shadow-[0_16px_36px_rgba(14,165,233,0.18)]',
  },
  compare: {
    badge: '比較',
    title: '保存した候補を並べて比べる',
    description: '追加した候補だけを並べて、一番伸びる組み合わせを選びます。',
    accentClassName:
      'border-emerald-300 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(220,252,231,0.94))] text-emerald-950',
    ringClassName: 'ring-emerald-200',
    glowClassName: 'shadow-[0_16px_36px_rgba(16,185,129,0.18)]',
  },
  summary: {
    badge: '時給',
    title: '今の装備の時給を見る',
    description: '期待値/時間を中心に、いまの条件でどれだけ稼げるかを確認します。',
    accentClassName:
      'border-sky-300 bg-[linear-gradient(145deg,rgba(239,246,255,0.98),rgba(224,242,254,0.94))] text-sky-950',
    ringClassName: 'ring-sky-200',
    glowClassName: 'shadow-[0_16px_36px_rgba(59,130,246,0.18)]',
  },
  fish: {
    badge: '魚詳細',
    title: 'どの魚が当たりか見る',
    description: '魚ごとの確率、売値レンジ、期待値寄与をじっくり確認します。',
    accentClassName:
      'border-violet-300 bg-[linear-gradient(145deg,rgba(245,243,255,0.98),rgba(237,233,254,0.94))] text-violet-950',
    ringClassName: 'ring-violet-200',
    glowClassName: 'shadow-[0_16px_36px_rgba(139,92,246,0.18)]',
  },
};

type GoalModePickerProps = {
  value: CalculatorGoal;
  onChange: (goal: CalculatorGoal) => void;
};

const GOAL_ORDER: CalculatorGoal[] = ['upgrade', 'compare', 'summary', 'fish'];

export function GoalModePicker({ value, onChange }: GoalModePickerProps) {
  return (
    <section
      className="rounded-[30px] border border-white/80 bg-white/84 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-sm"
      data-testid="calculator-goal-picker"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">何を見たい？</h2>
        <p className="mt-1 text-sm text-gray-500">
          1つ選ぶと、その目的に必要な情報だけを下に出します。
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {GOAL_ORDER.map((goal) => {
          const copy = CALCULATOR_GOAL_COPY[goal];
          const isSelected = goal === value;

          return (
            <button
              key={goal}
              type="button"
              onClick={() => onChange(goal)}
              aria-pressed={isSelected}
              data-goal={goal}
              data-state={isSelected ? 'selected' : 'idle'}
              className={`group relative overflow-hidden rounded-3xl border px-5 py-4 text-left transition-all duration-150 ${
                isSelected
                  ? `${copy.accentClassName} ${copy.glowClassName} ring-2 ${copy.ringClassName} ring-offset-2 ring-offset-white`
                  : 'border-slate-200 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      isSelected
                        ? 'border-white/60 bg-white/65 text-current'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {copy.badge}
                  </div>
                  <div className="mt-3 text-base font-semibold">{copy.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 group-data-[state=selected]:text-current/80">
                    {copy.description}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors ${
                    isSelected
                      ? 'border-white/60 bg-white/70 text-current shadow-inner'
                      : 'border-slate-300 bg-slate-50 text-slate-300'
                  }`}
                >
                  {isSelected ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 10.5 8.2 14 15.5 6.5" />
                    </svg>
                  ) : (
                    <span className="h-3 w-3 rounded-full border-2 border-current" />
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default GoalModePicker;
