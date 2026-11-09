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
}

export function Header({ onRecord, onImport, isRecording }: HeaderProps) {
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
      setUser(session?.user || null);
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        if (isVerificationRedirect || event === 'USER_UPDATED') {
          setToastMessage('✓ Email verified successfully! Welcome to Saamba.');
          setAuthModalOpen(false);
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
          playAlert('detected');
        }
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
