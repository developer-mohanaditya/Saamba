// frontend/components/Header.tsx - Exact Header component matching v1 markup & CSS

'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { isSoundAlertsEnabled, setSoundAlertsEnabled, unlockAlertAudio, playAlert } from '../lib/sound';
import { supabase } from '../lib/supabaseClient';

interface HeaderProps {
  onRecord: () => void;
  onImport: () => void;
  isRecording?: boolean;
}

export function Header({ onRecord, onImport, isRecording }: HeaderProps) {
  const { workspaces, activeWorkspaceId, user, setUser, setAuthModalOpen } = useAppStore();
  const [soundAlerts, setSoundAlerts] = useState(true);

  useEffect(() => {
    setSoundAlerts(isSoundAlertsEnabled());

    // Listen to Supabase Auth state changes
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const currentWs =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const eyebrowText =
    currentWs.id === 'default'
      ? 'Your workspace'
      : `Workspace · ${currentWs.name}`;

  const userInitial = user?.email ? user.email.slice(0, 1).toUpperCase() : '?';

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
        <div id="meeting-prompt" className="meeting-prompt" hidden />
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

        {/* User Account / Sign In Pill */}
        {user ? (
          <details className="user-menu-details">
            <summary className="user-avatar-btn" title="Account settings">
              <span className="user-initials-badge">{userInitial}</span>
              <span className="user-email-text">{user.email}</span>
            </summary>
            <div className="user-menu-dropdown">
              <div className="user-menu-email-header">
                Signed in as <strong>{user.email}</strong>
              </div>
              <button
                type="button"
                className="user-menu-item"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </details>
        ) : (
          <button
            type="button"
            className="secondary"
            id="signin-button"
            onClick={() => setAuthModalOpen(true)}
          >
            Sign in
          </button>
        )}

        <details className="test-menu" id="test-menu">
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
