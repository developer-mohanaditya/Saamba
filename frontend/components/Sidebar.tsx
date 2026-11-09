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
    askPanelOpen,
    toggleAskPanel,
  } = useAppStore();

  const [soundAlerts, setSoundAlerts] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSoundAlerts(isSoundAlertsEnabled());
  }, []);

  // Close settings popover when clicking outside
  useEffect(() => {
    if (!settingsOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [settingsOpen]);

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
        {/* SECTION 1: QUICK ACTIONS (Rearranged to Top) */}
        <div className="sidebar-section sidebar-section-quick-actions">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Quick Actions</span>
          </div>
          <div className="sidebar-nav-actions">
            {onRecord && (
              <button
                type="button"
                className={`sidebar-action-item ${isRecording ? 'is-recording-action' : ''}`}
                onClick={onRecord}
                title={isRecording ? 'Stop recording' : 'Record meeting'}
              >
                <span className="sidebar-action-icon">
                  {isRecording ? (
                    <span className="recording-dot-pulse" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  )}
                </span>
                <span className="sidebar-action-label">
                  {isRecording ? 'Stop Recording…' : 'Record meeting'}
                </span>
              </button>
            )}

            {onImport && (
              <button
                type="button"
                className="sidebar-action-item"
                onClick={onImport}
                title="Import audio/video file"
              >
                <span className="sidebar-action-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="sidebar-action-label">Import file</span>
              </button>
            )}

            <button
              type="button"
              className="sidebar-action-item"
              onClick={() => {
                if (!askPanelOpen) toggleAskPanel();
              }}
              title="Open Saamba AI Assistant"
            >
              <span className="sidebar-action-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </span>
              <span className="sidebar-action-label">Ask Saamba AI</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: WORKSPACES (Without sub-meetings header chip, direct listing) */}
        <div className="sidebar-section sidebar-section-workspaces">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Workspaces</span>
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

          <div className="workspace-nav-list" role="navigation" aria-label="Workspaces">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const count = (workspaceMeetings[ws.id]?.length) || (isActive ? meetings.length : 0);
              const wsIcon = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;

              return (
                <div
                  key={ws.id}
                  className={`workspace-group ${isActive ? 'active' : ''}`}
                  data-id={ws.id}
                >
                  <div className={`workspace-row ${isActive ? 'is-active' : ''}`}>
                    <button
                      type="button"
                      className="nav workspace-item-btn"
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
                        aria-label={libraryExpanded ? 'Collapse meetings' : 'Expand meetings'}
                        title={libraryExpanded ? 'Collapse meetings' : 'Expand meetings'}
                        aria-expanded={libraryExpanded}
                        onClick={toggleLibrary}
                      >
                        <svg
                          className="chevron-icon"
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: libraryExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Direct Meetings Listing without nested header layout */}
                  {isActive && libraryExpanded && (
                    <div className="meeting-list" role="region" aria-label={`${ws.name} meetings`}>
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
                                    width="14"
                                    height="14"
                                    fill="currentColor"
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Section: Utility Bar + User Account Card (Fixed) */}
      <div className="sidebar-footer">
        {/* Row of 4 utility icon buttons (Hidden on collapse) */}
        <div className="sidebar-utility-bar" ref={settingsRef}>
          {/* Settings Popover (Manage relocated inside settings) */}
          {settingsOpen && (
            <div className="sidebar-settings-popover" role="dialog" aria-label="Settings and Preferences">
              <div className="settings-popover-header">
                <span>Preferences & Cloud</span>
                <button
                  type="button"
                  className="settings-popover-close"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close settings"
                >
                  ×
                </button>
              </div>

              <div className="settings-popover-body">
                <label className="settings-row" htmlFor="settings-sound-toggle">
                  <div className="settings-row-text">
                    <strong>Sound alerts</strong>
                    <small>Audio chime on meeting detections</small>
                  </div>
                  <input
                    type="checkbox"
                    id="settings-sound-toggle"
                    checked={soundAlerts}
                    onChange={handleToggleSoundAlerts}
                  />
                </label>

                <div className="settings-row-cloud">
                  <div className="settings-row-text">
                    <strong>Supabase Cloud</strong>
                    <small>swapfqsivtuqbrczrmns · Online</small>
                  </div>
                  <span className="cloud-status-dot" title="Active & Connected" />
                </div>

                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={() => {
                    setSettingsOpen(false);
                    onCreateWorkspace();
                  }}
                >
                  + Create new workspace
                </button>
              </div>
            </div>
          )}

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

          {/* 2: Settings / Options (Opens Manage / Preferences popover) */}
          <button
            type="button"
            className={`utility-icon-btn ${settingsOpen ? 'is-active' : ''}`}
            title="Workspace Options & Preferences"
            aria-label="Workspace Options & Preferences"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* 3: Search */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Search Meetings"
            aria-label="Search Meetings"
            onClick={() => {
              const searchInput = document.getElementById('search-input') as HTMLInputElement;
              if (searchInput) {
                searchInput.focus();
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* 4: Cloud API / Key */}
          <button
            type="button"
            className="utility-icon-btn"
            title="Supabase Cloud Credentials & Status"
            aria-label="Supabase Cloud API"
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6" />
              <path d="m15.5 7.5 3 3L22 7l-3-3" />
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
