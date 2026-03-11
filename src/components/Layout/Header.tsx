import React from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';
import { SITE_VERSION } from '@/lib/site';

export function Header() {
  return (
    <header className="bg-ocean-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎣</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              <Link href="/" className="hover:text-ocean-200 transition-colors">
                VRChat Fish! ガイド
              </Link>
            </h1>
            <p className="mt-1 text-ocean-300 text-xs">コミュニティ非公式攻略情報</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            data-testid="site-version-badge"
            className="rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-white shadow-[0_6px_18px_rgba(4,26,74,0.18)]"
          >
            {SITE_VERSION}
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-ocean-200 transition-colors">
              ホーム
            </Link>
            <Link href="/calculator/" className="hover:text-ocean-200 transition-colors">
              確率計算機
            </Link>
            <Link href="/sources/" className="hover:text-ocean-200 transition-colors">
              出典・免責
            </Link>
          </nav>
        </div>
      </div>
      {/* Header ad slot (leaderboard) — future monetization */}
      <div className="bg-ocean-800 flex justify-center py-1">
        <AdSlot position="header" size="leaderboard" showPlaceholder={false} />
      </div>
    </header>
  );
}

export default Header;
