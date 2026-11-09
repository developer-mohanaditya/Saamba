// frontend/components/Sidebar.tsx - Modern Workspace Navigator

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { WorkspaceIcon, ChevronLeft, ChevronRight, ChevronDown, Plus, Music, Video, X } from './Icons';
import { createWorkspace } from '../lib/api';

const AVAILABLE_ICONS = [
  'users', 'briefcase', 'folder', 'sparkles', 'code', 'rocket',
  'palette', 'globe', 'lightning', 'star', 'book', 'building',
  'flame', 'heart', 'compass', 'checkCircle', 'tag', 'trophy'
];

export function Sidebar() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    setWorkspaces,
    meetings,
    selectedMeetingId,
    setSelectedMeetingId,
    workspaceMeetings,
    sidebarCollapsed,
    toggleSidebar,
    libraryExpanded,
    toggleLibrary,
  } = useAppStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsIcon, setNewWsIcon] = useState('briefcase');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  // Filter meetings for the active workspace
  const visibleMeetings = React.useMemo(() => {
    if (!activeWorkspaceId || activeWorkspaceId === 'default') {
      return meetings;
    }
    const ids = workspaceMeetings[activeWorkspaceId] || [];
    return meetings.filter((m) => ids.includes(m.id));
  }, [meetings, activeWorkspaceId, workspaceMeetings]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createWorkspace({
        name: newWsName.trim(),
        icon: newWsIcon,
      });
      setWorkspaces([...workspaces, created]);
      setActiveWorkspaceId(created.id);
      setDialogOpen(false);
      setNewWsName('');
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <aside
        className={`bg-[#1A382B] text-white flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        } min-h-screen border-r border-[#132A20]`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#234838]">
          <button
            type="button"
            onClick={() => {
              if (sidebarCollapsed) toggleSidebar();
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
            title="Saamba Workspace"
          >
            <div className="w-8 h-8 rounded-lg bg-[#DEB569] text-[#1A382B] font-serif font-bold text-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              S
            </div>
            {!sidebarCollapsed && (
              <span className="font-serif font-semibold text-lg tracking-wide text-[#FBF9F5]">
                saamba<span className="text-[#DEB569]">.</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-[#234838] text-white/70 hover:text-white transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Workspaces Section */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="flex items-center justify-between px-3 mb-2">
            {!sidebarCollapsed && (
              <span className="text-xs uppercase tracking-wider font-medium text-white/50">
                Workspaces
              </span>
            )}
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="p-1 rounded hover:bg-[#234838] text-white/70 hover:text-[#DEB569] transition-colors ml-auto"
              title="Create workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Workspaces List */}
          <div className="space-y-1">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const count =
                ws.id === 'default'
                  ? meetings.length
                  : (workspaceMeetings[ws.id] || []).length;

              return (
                <div key={ws.id} className="group">
                  <button
                    type="button"
                    onClick={() => {
                      if (sidebarCollapsed) toggleSidebar();
                      if (isActive) {
                        toggleLibrary();
                      } else {
                        setActiveWorkspaceId(ws.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#234838] text-[#DEB569] shadow-sm'
                        : 'text-white/80 hover:bg-[#204233] hover:text-white'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-[#DEB569]' : 'text-white/70'}`}>
                      <WorkspaceIcon name={ws.icon} className="w-4 h-4" />
                    </span>

                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{ws.name}</span>
                        {count > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#132A20] text-white/80">
                            {count}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform text-white/50 ${
                            isActive && libraryExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {/* Nested Meeting List if Active */}
                  {isActive && !sidebarCollapsed && libraryExpanded && (
                    <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                      {visibleMeetings.length === 0 ? (
                        <div className="py-2 px-2 text-xs text-white/40 italic">
                          No meetings in this space
                        </div>
                      ) : (
                        visibleMeetings.map((m) => {
                          const isSelected = m.id === selectedMeetingId;
                          const isVideo = m.mime?.startsWith('video/');
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedMeetingId(m.id)}
                              className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                                isSelected
                                  ? 'bg-[#DEB569]/15 text-[#DEB569] font-medium'
                                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="mt-0.5 shrink-0 opacity-70">
                                {isVideo ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                              </span>
                              <div className="truncate flex-1">
                                <div className="truncate">{m.title}</div>
                                <div className="text-[10px] text-white/40 mt-0.5">
                                  {new Date(m.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-[#234838] bg-[#162F24] text-white/60 text-xs">
            <p className="font-serif italic text-white/80">A little more present.</p>
            <p className="text-[11px] text-white/50 mt-0.5">Your conversations, ready to return to.</p>
          </div>
        )}
      </aside>

      {/* Create Workspace Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#FBF9F5] text-[#1A1A1A] w-full max-w-md rounded-2xl shadow-2xl border border-[#E8E4DC] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[#E8E4DC]">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#1A382B]">Create workspace</h2>
                <p className="text-xs text-[#767676] mt-0.5">Organize conversations in a dedicated space.</p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="p-1 rounded-full text-[#767676] hover:bg-[#EFECE4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#767676] mb-1.5">
                  Workspace name
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Design Team, Executive Syncs"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D5D0C6] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A382B] text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#767676] mb-2">
                  Choose an icon
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-[#E8E4DC] rounded-xl bg-white">
                  {AVAILABLE_ICONS.map((iconKey) => {
                    const isSelected = newWsIcon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setNewWsIcon(iconKey)}
                        className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#1A382B] text-[#DEB569] shadow-sm ring-2 ring-[#DEB569]'
                            : 'text-[#767676] hover:bg-[#F5F2EB] hover:text-[#1A1A1A]'
                        }`}
                      >
                        <WorkspaceIcon name={iconKey} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#767676] hover:bg-[#EFECE4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newWsName.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1A382B] text-white hover:bg-[#132A20] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Creating…' : 'Create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
