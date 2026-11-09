// frontend/components/Header.tsx - Workspace Top Bar

'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { MoreVertical, Sparkles } from './Icons';

export function Header({
  onRecordClick,
  onImportClick,
}: {
  onRecordClick?: () => void;
  onImportClick?: () => void;
}) {
  const { workspaces, activeWorkspaceId, toggleAskPanel, askPanelOpen } = useAppStore();
  const currentWs = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const eyebrow =
    currentWs?.id === 'default'
      ? 'Your workspace'
      : `Workspace · ${currentWs?.name}`;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:px-8 border-b border-[#E8E4DC] bg-[#FBF9F5]">
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold text-[#767676] mb-1">
          {eyebrow}
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#1A1A1A] tracking-tight">
          {currentWs?.name || 'My meetings'}
          <span className="text-[#DEB569]">.</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleAskPanel}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
            askPanelOpen
              ? 'bg-[#DEB569] text-[#1A382B] border-[#DEB569] shadow-sm'
              : 'bg-white text-[#1A382B] border-[#D5D0C6] hover:bg-[#F5F2EB]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#DEB569]" />
          <span>Ask Saamba</span>
        </button>

        <button
          type="button"
          onClick={onRecordClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A382B] text-white hover:bg-[#132A20] shadow-sm transition-all active:scale-98"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span>Record a meeting</span>
        </button>

        <button
          type="button"
          onClick={onImportClick}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-[#1A1A1A] border border-[#D5D0C6] hover:bg-[#F5F2EB] transition-all"
        >
          Import meeting
        </button>

        <button
          type="button"
          className="p-2 rounded-xl text-[#767676] hover:bg-[#F5F2EB] transition-colors"
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
