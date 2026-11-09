// frontend/components/Sidebar.tsx - Exact Sidebar component matching v1 styling and structure

'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { WORKSPACE_ICONS } from './Icons';
import { date } from '../lib/markdown';
import { supabase } from '../lib/supabaseClient';

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
    user,
    setUser,
    setAuthModalOpen,
  } = useAppStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

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
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Workspaces & Meetings Navigation */}
      <div className="workspace-nav-list" role="navigation" aria-label="Workspaces">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const count = workspaceMeetings[ws.id]?.length ?? 0;
          const wsIcon = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;

          return (
            <div
              key={ws.id}
              className={`workspace-group ${isActive ? 'active' : ''}`}
              data-id={ws.id}
            >
              <div className="workspace-row">
                <button
                  type="button"
                  className="nav"
                  data-id={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    if (sidebarCollapsed) setSidebarCollapsed(false);
                  }}
                >
                  <span
                    className="workspace-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: wsIcon }}
                  />
                  <span className="workspace-title">{ws.name}</span>
                  <span className="workspace-count" title={`${count} meetings`}>
                    {count}
                  </span>
                </button>

                {isActive && (
                  <button
                    type="button"
                    className="nav-chevron"
                    aria-label={libraryExpanded ? 'Collapse library' : 'Expand library'}
                    title={libraryExpanded ? 'Collapse library' : 'Expand library'}
                    aria-expanded={libraryExpanded}
                    onClick={toggleLibrary}
                  >
                    <svg
                      className="chevron-icon"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{
                        transform: libraryExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
              </div>

              {isActive && libraryExpanded && (
                <section
                  className="library active"
                  aria-label={`${ws.name} library`}
                >
                  <div className="library-header">
                    <h3>Meetings</h3>
                    <span>{meetings.length}</span>
                  </div>

                  <div className="meeting-list">
                    {meetings.length > 0 ? (
                      meetings.map((m) => {
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

      {/* Sidebar Footer: User Account / Sign In */}
      <div className="side-bottom">
        {user ? (
          <details className="sidebar-user-details">
            <summary className="sidebar-user-summary" title={user.email}>
              <div className="sidebar-user-avatar">
                {user.email ? user.email.slice(0, 1).toUpperCase() : '?'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {user.email ? user.email.split('@')[0] : 'User'}
                </span>
                <span className="sidebar-user-meta">
                  {user.email ? '@' + user.email.split('@')[1] : 'Account'}
                </span>
              </div>
              <span className="sidebar-user-dots">⋮</span>
            </summary>
            <div className="sidebar-user-dropdown">
              <div className="sidebar-user-dropdown-header">
                Signed in as<br />
                <strong>{user.email}</strong>
              </div>
              <button
                type="button"
                className="sidebar-user-dropdown-item signout-btn"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </details>
        ) : (
          <button
            type="button"
            className="sidebar-signin-btn"
            id="sidebar-signin-btn"
            onClick={() => setAuthModalOpen(true)}
          >
            <div className="sidebar-user-avatar guest-avatar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Sign In / Register</span>
              <span className="sidebar-user-meta">Cloud sync your meetings</span>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
