import React from 'react';
import { DataSource } from '@/types';

interface SourceCardProps {
  source: DataSource;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  official: { label: '公式', className: 'bg-green-100 text-green-700' },
  community: { label: 'コミュニティ', className: 'bg-blue-100 text-blue-700' },
  unclear: { label: '不明', className: 'bg-gray-100 text-gray-600' },
};

const REUSE_BADGE: Record<string, { label: string; className: string }> = {
  'fact-only': { label: '数値のみ抽出', className: 'bg-yellow-100 text-yellow-700' },
  'not-used-directly': { label: '直接不使用', className: 'bg-orange-100 text-orange-700' },
  unsupported: { label: '非サポート', className: 'bg-red-100 text-red-700' },
};

export function SourceCard({ source }: SourceCardProps) {
  const statusBadge = STATUS_BADGE[source.sourceStatus] ?? STATUS_BADGE['unclear'];
  const reuseBadge = REUSE_BADGE[source.reuseMode] ?? REUSE_BADGE['fact-only'];

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-800 text-sm">{source.name}</h3>
        <div className="flex gap-1 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${reuseBadge.className}`}>
            {reuseBadge.label}
          </span>
        </div>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block truncate font-mono text-xs text-ocean-600 hover:text-ocean-700 hover:underline"
        >
          {source.url}
        </a>
      )}
      <p className="text-xs text-gray-500 mb-2 leading-relaxed">{source.notes}</p>
      <div className="text-xs">
        <span className="text-gray-400">ライセンス: </span>
        <span className="text-gray-600">{source.licenseStatus}</span>
      </div>
    </div>
  );
}

export default SourceCard;
