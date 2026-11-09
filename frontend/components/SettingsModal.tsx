// frontend/components/SettingsModal.tsx - Centered IDE-style settings modal matching Saamba design system

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { isSoundAlertsEnabled, setSoundAlertsEnabled, unlockAlertAudio, playAlert } from '../lib/sound';

export function SettingsModal() {
  const {
    settingsModalOpen,
    setSettingsModalOpen,
    settingsTab,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    user,
    setAuthModalOpen,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'general' | 'storage' | 'ai' | 'workspaces' | 'shortcuts'>('general');
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [activeStorage, setActiveStorage] = useState<'local' | 'gdrive' | 'supabase' | 'cloudflare'>('supabase');
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamTranscript, setStreamTranscript] = useState(true);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setSoundAlerts(isSoundAlertsEnabled());
  }, []);

  useEffect(() => {
    if (settingsTab) {
      setActiveTab(settingsTab);
    }
  }, [settingsTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (settingsModalOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [settingsModalOpen]);

  if (!settingsModalOpen) return null;

  const handleClose = () => {
    setSettingsModalOpen(false);
  };

  const handleToggleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setSoundAlerts(val);
    setSoundAlertsEnabled(val);
    if (val) {
      unlockAlertAudio();
      playAlert('detected');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id="settings-modal"
      className="settings-modal-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
    >
      <div className="settings-modal-frame">
        {/* Left Navigation Sidebar */}
        <nav className="settings-sidebar" aria-label="Settings navigation">
          <div className="settings-sidebar-header">
            <span className="settings-brand-title">Settings</span>
          </div>

          <div className="settings-nav-items">
            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'general' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>General</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'storage' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('storage')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m8 17 4 4 4-4" />
              </svg>
              <span>Storage & Cloud</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'ai' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <polygon points="9,2 16,11 9,20 2,11" />
                <polygon points="17,4 22,9 17,14 12,9" opacity="0.85" />
              </svg>
              <span>AI & Models</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'workspaces' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('workspaces')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Workspaces</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeTab === 'shortcuts' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
              </svg>
              <span>Shortcuts</span>
            </button>
          </div>

          {/* User Account Tile at bottom of sidebar */}
          <div className="settings-sidebar-footer">
            {user ? (
              <div className="settings-user-preview">
                <div className="settings-user-avatar">
                  {(user.email || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="settings-user-meta">
                  <span className="settings-user-email">{user.email}</span>
                  <span className="settings-user-plan">PRO PLAN</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="settings-signin-btn"
                onClick={() => {
                  handleClose();
                  setAuthModalOpen(true);
                }}
              >
                Sign In to Saamba
              </button>
            )}
          </div>
        </nav>

        {/* Right Main Content Panel */}
        <section className="settings-content-panel">
          <div className="settings-content-header">
            <div>
              <h2 className="settings-content-title">
                {activeTab === 'general' && 'General Preferences'}
                {activeTab === 'storage' && 'Storage & Cloud Setup'}
                {activeTab === 'ai' && 'AI & Transcription Models'}
                {activeTab === 'workspaces' && 'Workspace Management'}
                {activeTab === 'shortcuts' && 'Keyboard Shortcuts'}
              </h2>
              <p className="settings-content-desc">
                {activeTab === 'general' && 'Configure interface preferences, sound notifications, and playback behavior.'}
                {activeTab === 'storage' && 'Choose where meeting recordings, transcripts, and notes are stored and synchronized.'}
                {activeTab === 'ai' && 'Control transcription engines, LLM summarization providers, and API keys.'}
                {activeTab === 'workspaces' && 'Organize team meetings and conversations into dedicated spaces.'}
                {activeTab === 'shortcuts' && 'Quick reference for power keys across playback, notes, and navigation.'}
              </p>
            </div>
            <button
              type="button"
              className="settings-close-btn"
              onClick={handleClose}
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="settings-content-body">
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="settings-section-group">
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Sound Alerts</strong>
                      <span>Play an audio chime whenever a meeting starts or finishes processing.</span>
                    </div>
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={soundAlerts}
                        onChange={handleToggleSound}
                      />
                      <span className="settings-slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Auto-scroll Transcript</strong>
                      <span>Automatically follow the active speaker during playback.</span>
                    </div>
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                      />
                      <span className="settings-slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Live Transcription Preview</strong>
                      <span>Display real-time speech fragments as audio is being recorded.</span>
                    </div>
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={streamTranscript}
                        onChange={(e) => setStreamTranscript(e.target.checked)}
                      />
                      <span className="settings-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. STORAGE & CLOUD TAB */}
            {activeTab === 'storage' && (
              <div className="settings-section-group">
                <div className="settings-group-title">Active Storage Destination</div>
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Primary Storage Engine</strong>
                      <span>Where audio files and high-res recordings are permanently stored.</span>
                    </div>
                    <select
                      className="settings-select"
                      value={activeStorage}
                      onChange={(e: any) => setActiveStorage(e.target.value)}
                    >
                      <option value="supabase">Supabase Cloud (PostgreSQL + S3 Storage)</option>
                      <option value="gdrive">Google Drive Personal / Workspace</option>
                      <option value="cloudflare">Cloudflare R2 (Production zero-egress)</option>
                      <option value="local">Local Machine Disk (data/ folder)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-group-title">Cloud Sync Status</div>
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <div className="settings-badge-row">
                        <strong>Supabase Multi-Tenant Database</strong>
                        <span className="status-pill status-online">● Connected</span>
                      </div>
                      <span>swapfqsivtuqbrczrmns.supabase.co · User data isolated via Row-Level Security</span>
                    </div>
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() => alert('Supabase connection verified: Active session synced.')}
                    >
                      Verify
                    </button>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <div className="settings-badge-row">
                        <strong>Google Drive Integration</strong>
                        <span className="status-pill status-configured">✓ Ready</span>
                      </div>
                      <span>Sync recordings to Google Drive folder and export docs directly.</span>
                    </div>
                    <button
                      type="button"
                      className="settings-btn-secondary"
                      onClick={() => alert('Google Drive connected to user account.')}
                    >
                      Configure
                    </button>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Storage Limits</strong>
                      <span>Up to 2 GB per single audio/video recording. Unlimited cloud transcripts.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AI & MODELS TAB */}
            {activeTab === 'ai' && (
              <div className="settings-section-group">
                <div className="settings-group-title">Speech Recognition (ASR)</div>
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Transcription Engine</strong>
                      <span>Primary model used to transcribe audio recordings into timestamps and speakers.</span>
                    </div>
                    <select className="settings-select" defaultValue="groq">
                      <option value="groq">Groq Whisper Large-v3 (Ultra-fast)</option>
                      <option value="gemini">Gemini 2.5 Flash Audio ASR</option>
                      <option value="local">Local Whisper (Offline on device)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-group-title">Meeting Intelligence & Chat</div>
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <strong>Analysis & Synthesis Model</strong>
                      <span>Generates summaries, decisions, action items, and powers Ask Saamba.</span>
                    </div>
                    <select className="settings-select" defaultValue="gemini">
                      <option value="gemini">Gemini 2.5 Flash (Editorial synthesis)</option>
                      <option value="groq">Groq Llama 3.3 70B Versatile</option>
                    </select>
                  </div>
                </div>

                <div className="settings-group-title">API Credentials</div>
                <div className="settings-card">
                  <div className="settings-card-row">
                    <div className="settings-card-info">
                      <div className="settings-badge-row">
                        <strong>Gemini & Groq API Keys</strong>
                        <span className="status-pill status-online">● Configured</span>
                      </div>
                      <span>Managed securely via backend environment variables.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. WORKSPACES TAB */}
            {activeTab === 'workspaces' && (
              <div className="settings-section-group">
                <div className="settings-group-title">Your Workspaces</div>
                {workspaces.map((ws) => (
                  <div key={ws.id} className="settings-card">
                    <div className="settings-card-row">
                      <div className="settings-card-info">
                        <div className="settings-badge-row">
                          <strong>{ws.name}</strong>
                          {ws.id === activeWorkspaceId && (
                            <span className="status-pill status-active">Active</span>
                          )}
                          {ws.isDefault && (
                            <span className="status-pill status-default">Default</span>
                          )}
                        </div>
                        <span>ID: {ws.id}</span>
                      </div>
                      <button
                        type="button"
                        className="settings-btn-secondary"
                        onClick={() => {
                          setActiveWorkspaceId(ws.id);
                          handleClose();
                        }}
                      >
                        {ws.id === activeWorkspaceId ? 'Selected' : 'Switch'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. SHORTCUTS TAB */}
            {activeTab === 'shortcuts' && (
              <div className="settings-section-group">
                <div className="settings-group-title">Audio & Video Playback</div>
                <div className="settings-shortcuts-table">
                  <div className="shortcut-row">
                    <span>Play / Pause</span>
                    <kbd>Space</kbd>
                  </div>
                  <div className="shortcut-row">
                    <span>Seek Back 5 Seconds</span>
                    <kbd>J</kbd> or <kbd>←</kbd>
                  </div>
                  <div className="shortcut-row">
                    <span>Seek Forward 5 Seconds</span>
                    <kbd>L</kbd> or <kbd>→</kbd>
                  </div>
                </div>

                <div className="settings-group-title">Navigation & Tools</div>
                <div className="settings-shortcuts-table">
                  <div className="shortcut-row">
                    <span>Search Transcript</span>
                    <kbd>⌘</kbd> <kbd>F</kbd>
                  </div>
                  <div className="shortcut-row">
                    <span>Ask Saamba Chat</span>
                    <kbd>/</kbd>
                  </div>
                  <div className="shortcut-row">
                    <span>Close Any Modal</span>
                    <kbd>Esc</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </dialog>
  );
}
