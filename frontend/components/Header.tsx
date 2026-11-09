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
  const { workspaces, activeWorkspaceId, setUser, soundAlerts, setSoundAlerts } = useAppStore();

  useEffect(() => {
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

  const currentWs =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const eyebrowText =
    currentWs.id === 'default'
      ? 'Your workspace'
      : `Workspace · ${currentWs.name}`;

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
