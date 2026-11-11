// frontend/components/Header.tsx - Exact Header component matching v1 markup & CSS

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { isSoundAlertsEnabled, setSoundAlertsEnabled, unlockAlertAudio, playAlert } from '../lib/sound';
import { supabase } from '../lib/supabaseClient';

interface HeaderProps {
  onRecord: () => void;
  onImport: () => void;
  isRecording?: boolean;
  detectedMeetTab?: number | null;
  detectedPlatform?: 'google-meet' | 'zoom' | 'teams' | 'meeting';
  onCaptureDetectedMeeting?: (tabId: number) => void;
  onDismissDetectedMeeting?: () => void;
}

export function Header({
  onRecord,
  onImport,
  isRecording,
  detectedMeetTab,
  detectedPlatform = 'google-meet',
  onCaptureDetectedMeeting,
  onDismissDetectedMeeting,
}: HeaderProps) {
  const {
    workspaces,
    activeWorkspaceId,
    setUser,
    soundAlerts,
    setSoundAlerts,
    setToastMessage,
    setAuthModalOpen,
  } = useAppStore();

  const menuRef = useRef<HTMLDetailsElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.hasAttribute('open')) {
        if (!menuRef.current.contains(e.target as Node)) {
          menuRef.current.removeAttribute('open');
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    // Check if the current URL contains a verification or auth token hash
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const isVerificationRedirect =
      hash.includes('access_token') ||
      hash.includes('type=signup') ||
      hash.includes('type=recovery') ||
      search.includes('code=');

    // Listen to Supabase Auth state changes
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        if (isVerificationRedirect) {
          setToastMessage('✓ Email verified successfully! Welcome to Saamba.');
          setAuthModalOpen(false);
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
          playAlert('detected');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        if (isVerificationRedirect || event === 'USER_UPDATED') {
          setToastMessage('✓ Email verified successfully! Welcome to Saamba.');
          setAuthModalOpen(false);
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
          playAlert('detected');
        }
      } else if (event === 'SIGNED_OUT' || !currentUser) {
        setUser(null);
        useAppStore.getState().setMeetings([]);
        useAppStore.getState().setSelectedMeetingId(null);
        useAppStore.getState().setCurrentMeeting(null);
        useAppStore.getState().setChatMessages([]);
        useAppStore.getState().setActiveTranslation(null);
        useAppStore.getState().setWorkspaces([{ id: 'default', name: 'My meetings', icon: 'users', isDefault: true }]);
        useAppStore.getState().setWorkspaceMeetings({ default: [] });
        useAppStore.getState().setActiveWorkspaceId('default');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setToastMessage, setAuthModalOpen]);

  const currentWs =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const eyebrowText =
    currentWs && (currentWs.id === 'default' || currentWs.isDefault)
      ? 'Your workspace'
      : `Workspace · ${currentWs?.name || ''}`;

  return (
    <header>
      <div>
        <div className="eyebrow">{eyebrowText}</div>
        <h1>
          {currentWs.name}
          <span>.</span>
        </h1>
      </div>

      <div className="header-actions">
        {detectedMeetTab && !isRecording ? (
          <div id="meeting-prompt" className="meeting-prompt">
            <span className="meet-icon" aria-hidden="true">
              {detectedPlatform === 'zoom' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#2D8CFF">
                  <path d="M4.5 5A2.5 2.5 0 0 0 2 7.5v9A2.5 2.5 0 0 0 4.5 19h10a2.5 2.5 0 0 0 2.5-2.5v-1.88l3.6 2.4A1 1 0 0 0 22 16.19V7.81a1 1 0 0 0-1.4-.83L17 9.38V7.5A2.5 2.5 0 0 0 14.5 5h-10z" />
                </svg>
              ) : detectedPlatform === 'teams' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#5059C9">
                  <path d="M19.5 7h-3a1 1 0 0 0-1 1v1h-3V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h6.5a1 1 0 0 0 1-1v-1h3v1a1 1 0 0 0 1 1h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 14H6.5v-4H9v4zm11 1h-3v-5h3v5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 87.5 70" width="18" height="18" style={{ display: 'block' }}>
                  <path fill="#00832d" d="M48.5 35 30 19v32z" />
                  <path fill="#0066da" d="m67.5 21-19 14v-16c0-4.4-3.6-8-8-8h-24c-4.4 0-8 3.6-8 8v32c0 4.4 3.6 8 8 8h24c4.4 0 8-3.6 8-8v-16l19 14c2.8 2 6.5 0 6.5-3.5v-21c0-3.5-3.7-5.5-6.5-3.5z" />
                  <path fill="#e94235" d="m8.5 49c0 4.4 3.6 8 8 8h24v-22h-32z" />
                  <path fill="#2684fc" d="m40.5 11h-24c-4.4 0-8 3.6-8 8v16h32z" />
                  <path fill="#00ac47" d="m8.5 35h32v22h-24c-4.4 0-8-3.6-8-8z" />
                  <path fill="#ffba00" d="m40.5 57v-22l-10.5-8.5-21.5 8.5v14c0 4.4 3.6 8 8 8z" />
                </svg>
              )}
            </span>
            <span className="meeting-prompt-text">
              {detectedPlatform === 'zoom'
                ? 'Zoom meeting detected'
                : detectedPlatform === 'teams'
                ? 'Teams meeting detected'
                : 'Google Meet detected'}
            </span>
            <button
              type="button"
              className="primary"
              onClick={() => onCaptureDetectedMeeting?.(detectedMeetTab)}
            >
              Capture this meeting
            </button>
            <button
              type="button"
              className="subtle-button"
              onClick={onDismissDetectedMeeting}
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div id="meeting-prompt" className="meeting-prompt" hidden />
        )}
        <button
          className={`primary ${isRecording ? 'is-recording' : ''}`}
          id="record-button"
          type="button"
          onClick={onRecord}
        >
          {isRecording ? 'Stop recording' : 'Record a meeting'}
        </button>
        <button
          className="secondary"
          id="import-button"
          type="button"
          onClick={onImport}
        >
          Import meeting
        </button>

        <details ref={menuRef} className="test-menu" id="test-menu">
          <summary aria-label="Workspace options" title="Workspace options">
            ⋮
          </summary>
          <div className="test-menu-content">
            <label className="sound-toggle-row" htmlFor="sound-alerts">
              <span className="sound-toggle-label">Sound alerts</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="sound-alerts"
                  className="toggle-checkbox"
                  checked={soundAlerts}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSoundAlerts(checked);
                    setSoundAlertsEnabled(checked);
                    if (checked) {
                      unlockAlertAudio();
                      playAlert('detected');
                    }
                  }}
                />
                <span className="toggle-slider" />
              </div>
            </label>
          </div>
        </details>
      </div>
    </header>
  );
}
