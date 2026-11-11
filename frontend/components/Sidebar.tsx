// frontend/components/Sidebar.tsx - Redesigned sidebar matching Saamba design system, rearranged hierarchy, and strict scroll isolation

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { WORKSPACE_ICONS } from './Icons';
import { date } from '../lib/markdown';
import { supabase } from '../lib/supabaseClient';
import { isSoundAlertsEnabled, setSoundAlertsEnabled, unlockAlertAudio, playAlert } from '../lib/sound';

interface SidebarProps {
  onCreateWorkspace: () => void;
  onRecord?: () => void;
  onImport?: () => void;
  isRecording?: boolean;
}

export function Sidebar({ onCreateWorkspace, onRecord, onImport, isRecording }: SidebarProps) {
  const {
    workspaces,
    activeWorkspaceId,
    workspaceMeetings,
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    libraryExpanded,
    toggleLibrary,
    setActiveWorkspaceId,
    meetings,
    setMeetings,
    selectedMeetingId,
    setSelectedMeetingId,
    setCurrentMeeting,
    setChatMessages,
    setActiveTranslation,
    setWorkspaces,
    setWorkspaceMeetings,
    user,
    setUser,
    setAuthModalOpen,
    setSettingsModalOpen,
    askPanelOpen,
    toggleAskPanel,
  } = useAppStore();

  const [soundAlerts, setSoundAlerts] = useState(true);

  useEffect(() => {
    setSoundAlerts(isSoundAlertsEnabled());
  }, []);

  const handleToggleSoundAlerts = () => {
    const next = !soundAlerts;
    setSoundAlerts(next);
    setSoundAlertsEnabled(next);
    if (next) {
      unlockAlertAudio();
      playAlert('detected');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMeetings([]);
    setSelectedMeetingId(null);
    setCurrentMeeting(null);
    setChatMessages([]);
    setActiveTranslation(null);
    setWorkspaces([{ id: 'default', name: 'My meetings', icon: 'users', isDefault: true }]);
    setWorkspaceMeetings({ default: [] });
    setActiveWorkspaceId('default');
  };

  const userInitial = user?.email ? user.email.slice(0, 1).toUpperCase() : 'U';
  const userHandle = user?.email ? user.email.split('@')[0] : 'User';
  const userDomain = user?.email && user.email.includes('@') ? '@' + user.email.split('@')[1] : '';

  return (
    <aside
      className={`workspace-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Top Header: Brand & Original Collapse Toggle (Fixed) */}
      <div className="sidebar-top">
        <button
          className="brand"
          id="workspace-toggle"
          type="button"
          aria-label="Toggle workspace menu"
          onClick={() => {
            if (sidebarCollapsed) setSidebarCollapsed(false);
          }}
        >
          <span className="mark">S</span>
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
            style={{ display: sidebarCollapsed ? 'block' : 'none' }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Inner Scrollable Region (CRITICAL: Only this inner element scrolls!) */}
      <div className="sidebar-scrollable-content">
        {/* QUICK ACTIONS (Top Placement) */}
        <div className="sidebar-section-quick-actions" role="region" aria-label="Quick Actions">
          <div className="quick-actions-section-header">
            <div className="side-label">Quick Actions</div>
          </div>
          <div className="sidebar-nav-actions">
            <button
              type="button"
              className={`sidebar-action-item ${isRecording ? 'is-recording-action' : ''}`}
              onClick={onRecord}
              title={isRecording ? 'Stop recording' : 'Record a meeting'}
            >
              <span className="sidebar-action-icon">
                {isRecording ? (
                  <span className="recording-dot-pulse" />
                ) : (
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
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </span>
              <span className="sidebar-action-label">
                {isRecording ? 'Stop recording' : 'Record a meeting'}
              </span>
            </button>

            <button
              type="button"
              className="sidebar-action-item"
              onClick={onImport}
              title="Import meeting"
            >
              <span className="sidebar-action-icon">
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span className="sidebar-action-label">Import meeting</span>
            </button>

            <button
              type="button"
              className="sidebar-action-item is-disabled"
              disabled
              title="Create a note"
              aria-disabled="true"
            >
              <span className="sidebar-action-icon">
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
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              <span className="sidebar-action-label">Create a note</span>
            </button>
          </div>
        </div>

        {/* WORKSPACES (Exact layout & behavior matching original HTML site) */}
        <div className="sidebar-section-workspaces" role="region" aria-label="Workspaces">
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="workspace-list" id="workspace-list" role="navigation" aria-label="Workspaces">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            const isDefault = ws.id === 'default' || ws.isDefault;
            const count = isDefault
              ? meetings.length
              : (workspaceMeetings[ws.id] || []).length;
            const wsIcon = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;
            const visibleMeetings = isDefault
              ? meetings
              : meetings.filter((m) => (workspaceMeetings[ws.id] || []).includes(m.id));

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
                      return;
                    }
                    if (isActive) {
                      toggleLibrary();
                    } else {
                      setActiveWorkspaceId(ws.id);
                    }
                  }}
                >
                  <span
                    className="nav-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: wsIcon }}
                  />
                  <span className="workspace-title">{ws.name}</span>
                  {count > 0 && (
                    <span className="workspace-count" title={`${count} meetings`}>
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <svg
                      className="nav-chevron"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      style={{
                        transform: libraryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  )}
                </button>

                {/* Direct Meetings Listing under Active Workspace */}
                {isActive && libraryExpanded && (
                  <section className="library" id="meeting-library">
                    <div id="meetings" className="meeting-list" role="region" aria-label={`${ws.name} meetings`}>
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
      </div>
    </div>

      {/* Fixed Bottom Section: Utility Bar + User Account Card (Fixed) */}
      <div className="sidebar-footer">
        {/* Row of 4 utility icon buttons: Settings, Drive, API Key, Signout (Hidden on collapse) */}
        <div className="sidebar-utility-bar">
          {/* 1: Settings */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Settings & Preferences"
            aria-label="Settings & Preferences"
            onClick={() => setSettingsModalOpen(true, 'general')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* 2: Drive / Storage Destination */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Storage & Cloud Destination"
            aria-label="Storage & Cloud Destination"
            onClick={() => setSettingsModalOpen(true, 'storage')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M7.71 3.5 1.15 15l3.43 6 6.55-11.5L7.71 3.5zm3.43 0 6.56 11.5h6.86l-6.56-11.5h-6.86zm-5.71 12 3.43 6h13.72l-3.43-6H5.43z" />
            </svg>
          </button>

          {/* 3: API Key */}
          <button
            type="button"
            className="utility-icon-btn"
            title="AI & API Credentials"
            aria-label="AI & API Credentials"
            onClick={() => setSettingsModalOpen(true, 'ai')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6" />
              <path d="m15.5 7.5 3 3L22 7l-3-3" />
            </svg>
          </button>

          {/* 4: Sign Out / Sign In */}
          <button
            type="button"
            className="utility-icon-btn"
            title={user ? 'Sign Out' : 'Sign In'}
            aria-label={user ? 'Sign Out' : 'Sign In'}
            onClick={user ? handleSignOut : () => setAuthModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* User Account Card (Shows avatar centered on collapse) */}
        {user ? (
          <details className="sidebar-user-details">
            <summary className="sidebar-user-card" title={user.email}>
              <div className="sidebar-avatar-ring">
                <div className="sidebar-user-avatar">
                  {userInitial}
                </div>
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={user.email}>
                  {userHandle}
                </span>
                <span className="sidebar-user-domain">{userDomain}</span>
              </div>
              <span className="sidebar-plan-badge">PRO</span>
            </summary>
            <div className="sidebar-user-dropdown">
              <div className="sidebar-user-dropdown-header">
                Signed in as<br />
                <strong>{user.email}</strong>
                <div className="dropdown-cloud-sync">
                  <span className="cloud-dot-small" /> Synced to Supabase Cloud
                </div>
              </div>
              <button
                type="button"
                className="sidebar-user-dropdown-item signout-btn"
                onClick={handleSignOut}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </details>
        ) : (
          <button
            type="button"
            className="sidebar-user-card sidebar-signin-card"
            id="sidebar-signin-btn"
            onClick={() => setAuthModalOpen(true)}
          >
            <div className="sidebar-avatar-ring guest-ring">
              <div className="sidebar-user-avatar guest-avatar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Sign In / Register</span>
              <span className="sidebar-user-domain">Cloud sync your meetings</span>
            </div>
            <span className="sidebar-plan-badge guest-badge">FREE</span>
          </button>
        )}
      </div>
    </aside>
  );
}
