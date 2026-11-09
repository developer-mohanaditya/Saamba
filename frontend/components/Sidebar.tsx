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
    selectedMeetingId,
    setSelectedMeetingId,
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
        {/* WORKSPACES (Exact layout & behavior matching original HTML site) */}
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
            const count = ws.id === 'default'
              ? meetings.length
              : (workspaceMeetings[ws.id] || []).length;
            const wsIcon = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;
            const visibleMeetings = ws.id === 'default'
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

      {/* Fixed Bottom Section: Utility Bar + User Account Card (Fixed) */}
      <div className="sidebar-footer">
        {/* Row of 4 utility icon buttons (Hidden on collapse) */}
        <div className="sidebar-utility-bar">
          {/* 1: Alerts / Bell */}
          <button
            type="button"
            className={`utility-icon-btn ${soundAlerts ? 'is-active' : ''}`}
            title={soundAlerts ? 'Sound alerts: Enabled' : 'Sound alerts: Muted'}
            aria-label="Toggle sound alerts"
            onClick={handleToggleSoundAlerts}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* 2: Settings / Options (Opens Centered Settings Modal) */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Settings & Preferences"
            aria-label="Settings & Preferences"
            onClick={() => setSettingsModalOpen(true, 'general')}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* 3: Storage & Cloud Destination (Drive Symbol) */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Active Storage & Cloud Destination"
            aria-label="Active Storage & Cloud Destination"
            onClick={() => setSettingsModalOpen(true, 'storage')}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M7.71 3.5 1.15 15l3.43 6 6.55-11.5L7.71 3.5zm3.43 0 6.56 11.5h6.86l-6.56-11.5h-6.86zm-5.71 12 3.43 6h13.72l-3.43-6H5.43z" />
            </svg>
          </button>

          {/* 4: Keyboard Shortcuts */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
            onClick={() => setSettingsModalOpen(true, 'shortcuts')}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
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
