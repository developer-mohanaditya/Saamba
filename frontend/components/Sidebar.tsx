// frontend/components/Sidebar.tsx - Exact Sidebar component matching v1 styling and structure

'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { WORKSPACE_ICONS } from './Icons';
import { date } from '../lib/markdown';

export function Sidebar({ onCreateWorkspace }: { onCreateWorkspace: () => void }) {
  const {
    workspaces,
    activeWorkspaceId,
    workspaceMeetings,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    libraryExpanded,
    toggleLibrary,
    setLibraryExpanded,
    setActiveWorkspaceId,
    meetings,
    selectedMeetingId,
    setSelectedMeetingId,
  } = useAppStore();

  return (
    <aside className="workspace-sidebar">
      {/* Sidebar Top: Brand and Collapse Toggle */}
      <div className="sidebar-top">
        <button
          className="brand"
          id="workspace-toggle"
          type="button"
          aria-label="Toggle workspace menu"
          aria-expanded="false"
          onClick={() => {
            if (sidebarCollapsed) setSidebarCollapsed(false);
          }}
        >
          <span className="mark">S</span>{' '}
          <span className="brand-text">
            saamba<span className="brand-period">.</span>
          </span>
        </button>

        <button
          className="sidebar-collapse-btn"
          id="sidebar-collapse-btn"
          type="button"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebar}
        >
          <svg
            className="icon-collapse"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: sidebarCollapsed ? 'none' : 'block' }}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <svg
            className="icon-expand"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: sidebarCollapsed ? 'block' : 'none' }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Workspaces Section Header */}
      <div className="workspace-section-header">
        <div className="side-label">Workspaces</div>
        <button
          type="button"
          className="create-workspace-btn"
          id="create-workspace-btn"
          aria-label="Create workspace"
          title="Create workspace"
          onClick={onCreateWorkspace}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Workspaces List */}
      <div className="workspace-list" id="workspace-list">
        {workspaces.map((ws) => {
          const iconSvg = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;
          const count =
            ws.id === 'default'
              ? meetings.length
              : (workspaceMeetings[ws.id] || []).length;
          const isActive = ws.id === activeWorkspaceId;
          const visibleMeetings =
            ws.id === 'default'
              ? meetings
              : meetings.filter((m) =>
                  (workspaceMeetings[ws.id] || []).includes(m.id)
                );

          return (
            <div
              key={ws.id}
              className={`workspace-block ${isActive ? 'is-active' : ''}`}
              data-workspace-id={ws.id}
            >
              <button
                type="button"
                className={`workspace-nav-item ${isActive ? 'active' : ''}`}
                data-workspace-id={ws.id}
                aria-label={ws.name}
                aria-expanded={isActive ? libraryExpanded : false}
                onClick={(e) => {
                  e.stopPropagation();
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false);
                    setActiveWorkspaceId(ws.id);
                    setLibraryExpanded(true);
                    return;
                  }
                  if (isActive) {
                    toggleLibrary();
                  } else {
                    setActiveWorkspaceId(ws.id);
                    setLibraryExpanded(true);
                  }
                }}
              >
                <span
                  className="nav-icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: iconSvg }}
                />
                <span className="workspace-title">{ws.name}</span>
                {count > 0 && <span className="workspace-count">{count}</span>}
                {isActive && (
                  <svg className="nav-chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                )}
              </button>

              {/* Active Workspace Library List */}
              {isActive && (
                <section
                  className={`library ${!libraryExpanded ? 'is-collapsed' : ''} ${
                    visibleMeetings.length === 0 ? 'is-empty' : ''
                  }`}
                  id="meeting-library"
                >
                  <div
                    id="meetings"
                    className={`meeting-list ${
                      visibleMeetings.length === 0 ? 'is-empty' : ''
                    }`}
                  >
                    {visibleMeetings.length > 0 ? (
                      visibleMeetings.map((m) => {
                        const isVideo = m.mime && m.mime.startsWith('video/');
                        return (
                          <button
                            key={m.id}
                            type="button"
                            className={`meeting ${
                              selectedMeetingId === m.id ? 'selected' : ''
                            }`}
                            data-id={m.id}
                            title={m.title}
                            onClick={() => setSelectedMeetingId(m.id)}
                          >
                            <span className="meeting-icon">
                              {isVideo ? (
                                <svg
                                  className="meeting-media-icon video-icon"
                                  viewBox="0 0 24 24"
                                  width="16"
                                  height="16"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="m22 8-6 4 6 4V8Z" />
                                  <rect x="2" y="6" width="14" height="12" rx="2" />
                                </svg>
                              ) : (
                                <span className="meeting-audio-symbol">♫</span>
                              )}
                            </span>
                            <span className="meeting-copy">
                              <strong>{m.title}</strong>
                              <small>{date(m.created_at)}</small>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="list-empty">
                        Nothing in this workspace.
                        <br />
                        Start with something.
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="side-bottom">
        <div className="side-title">A little more present.</div>
        <p>Your conversations, ready to return to.</p>
      </div>
    </aside>
  );
}
