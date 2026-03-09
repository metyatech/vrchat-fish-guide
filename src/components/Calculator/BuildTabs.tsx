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
    <div className="flex flex-wrap items-center gap-2">
      {builds.map((build) => {
        const isActive = build.id === activeId;
        const isEditing = editingId === build.id;

        return (
          <div
            key={build.id}
            className={`group flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'border-ocean-500 bg-ocean-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-ocean-300 hover:bg-ocean-50'
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

            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
        title="新しいビルドを追加"
        className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 transition-colors hover:border-ocean-400 hover:text-ocean-600"
      >
        <span className="text-base leading-none">+</span>
        <span>追加</span>
      </button>

      <div className="ml-auto text-xs text-gray-400">{builds.length} ビルド</div>
    </div>
  );
}

export default BuildTabs;
