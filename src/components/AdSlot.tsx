/**
 * AdSlot — placeholder component for future ad monetization.
 *
 * This component provides ad slot abstraction so ads can be integrated
 * later without redesigning the layout. No ad network is integrated.
 *
 * AD POLICY:
 * - Ads will be clearly labeled as advertisements
 * - Ads will be disclosed in site policy
 * - No ads will be shown that are misleading or harmful to users
 */

import React from 'react';

export type AdSlotPosition = 'header' | 'sidebar-top' | 'sidebar-bottom' | 'footer' | 'in-content';
export type AdSlotSize = 'banner' | 'rectangle' | 'leaderboard' | 'skyscraper';

export interface AdSlotProps {
  position: AdSlotPosition;
  size?: AdSlotSize;
  className?: string;
  /** Show placeholder UI in development/preview mode */
  showPlaceholder?: boolean;
}

const SIZE_DIMENSIONS: Record<AdSlotSize, { width: number; height: number; label: string }> = {
  banner: { width: 468, height: 60, label: '468×60' },
  rectangle: { width: 300, height: 250, label: '300×250' },
  leaderboard: { width: 728, height: 90, label: '728×90' },
  skyscraper: { width: 120, height: 600, label: '120×600' },
};

/**
 * Renders an ad slot placeholder. Replace the inner content with actual ad
 * network code when integrating ads.
 */
export function AdSlot({
  position,
  size = 'rectangle',
  className = '',
  showPlaceholder = true,
}: AdSlotProps) {
  // Future: replace this block with actual ad network integration
  // e.g.: <ins className="adsbygoogle" ... /> for Google AdSense
  const isAdEnabled = false; // Set to true when integrating an ad network

  if (!isAdEnabled && !showPlaceholder) {
    return null;
  }

  const dims = SIZE_DIMENSIONS[size];

  return (
    <div
      className={`ad-slot ad-slot--${position} ad-slot--${size} ${className}`}
      data-ad-position={position}
      data-ad-size={size}
      aria-label="広告スペース（将来の広告表示エリア）"
    >
      {showPlaceholder && !isAdEnabled && (
        <div
          className="flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs"
          style={{ width: '100%', minHeight: `${dims.height}px`, maxWidth: `${dims.width}px` }}
        >
          <div className="text-center p-2">
            <div className="font-mono">[広告] {dims.label}</div>
            <div className="text-gray-300">{position}</div>
          </div>
        </div>
      )}
      {/* Ad network code goes here when isAdEnabled = true */}
    </div>
  );
}

export default AdSlot;
