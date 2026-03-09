'use client';

import React, { useState } from 'react';
import { BuildConfig } from '@/types';

interface BuildTabsProps {
  builds: BuildConfig[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function BuildTabs({
  builds,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
}: BuildTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function startEdit(build: BuildConfig) {
    setEditingId(build.id);
    setEditingName(build.name);
  }

  function commitEdit(id: string) {
    const trimmed = editingName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {builds.map((build) => {
        const isActive = build.id === activeId;
        const isEditing = editingId === build.id;

        return (
          <div
            key={build.id}
            className={`animate-pop-in group flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm transition-all duration-200 ${
              isActive
                ? 'border-ocean-500 bg-[linear-gradient(145deg,rgba(59,150,243,1),rgba(29,99,213,1))] text-white shadow-[0_16px_40px_rgba(37,120,232,0.24)]'
                : 'border-white/80 bg-white/90 text-gray-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:border-ocean-300 hover:bg-ocean-50 hover:shadow-[0_16px_36px_rgba(37,120,232,0.10)]'
            }`}
          >
            {isEditing ? (
              <input
                autoFocus
                className="w-28 rounded border border-ocean-300 bg-white px-1 py-0 text-sm text-gray-800 outline-none"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitEdit(build.id)}
                onKeyDown={(e) => handleKeyDown(e, build.id)}
              />
            ) : (
              <button
                className="max-w-[120px] truncate text-left"
                onClick={() => onSelect(build.id)}
                onDoubleClick={() => startEdit(build)}
                title={`${build.name}（ダブルクリックで名前変更）`}
              >
                {build.name}
              </button>
            )}

            <div className="flex items-center gap-0.5 opacity-50 transition-opacity group-hover:opacity-100">
              {!isEditing && (
                <button
                  onClick={() => startEdit(build)}
                  title="名前変更"
                  className={`rounded px-1 text-xs ${isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  ✏
                </button>
              )}
              <button
                onClick={() => onDuplicate(build.id)}
                title="複製"
                className={`rounded px-1 text-xs ${isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
              >
                ⧉
              </button>
              {builds.length > 1 && (
                <button
                  onClick={() => onRemove(build.id)}
                  title="削除"
                  className={`rounded px-1 text-xs ${isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={onAdd}
        title="比べる候補を追加"
        className="flex items-center gap-1 rounded-2xl border border-dashed border-gray-300 bg-white/90 px-3 py-2 text-sm text-gray-500 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-150 hover:border-ocean-400 hover:shadow-[0_16px_36px_rgba(37,120,232,0.10)] hover:text-ocean-600"
      >
        <span className="text-base leading-none">+</span>
        <span>比べる候補を追加</span>
      </button>

      <div className="ml-auto text-xs text-gray-400">いま比べている候補 {builds.length} 件</div>
    </div>
  );
}

export default BuildTabs;
