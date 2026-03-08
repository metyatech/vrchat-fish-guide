import React from 'react';

interface WarningBannerProps {
  warnings: string[];
}

export function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-2">計算上の注意事項</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default WarningBanner;
