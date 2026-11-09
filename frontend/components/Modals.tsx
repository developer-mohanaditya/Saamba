// frontend/components/Modals.tsx - Exact Modals matching v1 markup & CSS

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { WORKSPACE_ICONS } from './Icons';
import { createWorkspace, deleteMeeting, getMeetings, getWorkspaces, getMeeting } from '../lib/api';

const TRANSLATION_LANGUAGES = [
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Mandarin', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
];

interface ModalsProps {
  workspaceModalOpen: boolean;
  onCloseWorkspaceModal: () => void;
  importModalOpen: boolean;
  onCloseImportModal: () => void;
  deleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  speakerModalOpen?: boolean;
  speakerToEdit?: string;
  speakerIndex?: number | null;
  onCloseSpeakerModal?: () => void;
  translateModalOpen?: boolean;
  onCloseTranslateModal?: () => void;
  onStartTranslation?: (code: string, name: string) => void;
}

export function Modals({
  workspaceModalOpen,
  onCloseWorkspaceModal,
  importModalOpen,
  onCloseImportModal,
  deleteModalOpen,
  onCloseDeleteModal,
  speakerModalOpen = false,
  speakerToEdit = '',
  speakerIndex = null,
  onCloseSpeakerModal,
  translateModalOpen = false,
  onCloseTranslateModal,
  onStartTranslation,
}: ModalsProps) {
  const {
    currentMeeting,
    setCurrentMeeting,
    setWorkspaces,
    setActiveWorkspaceId,
    setMeetings,
    setSelectedMeetingId,
    meetings,
    activeWorkspaceId,
  } = useAppStore();

  const [wsName, setWsName] = useState('');
  const [wsIcon, setWsIcon] = useState('briefcase');
  const [wsError, setWsError] = useState('');

  const [importTitle, setImportTitle] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const [newSpeakerName, setNewSpeakerName] = useState(speakerToEdit);
  const [speakerScope, setSpeakerScope] = useState<'rename' | 'reassign'>('rename');
  const [speakerError, setSpeakerError] = useState('');

  const [selectedLangCode, setSelectedLangCode] = useState('en');
  const [selectedLangName, setSelectedLangName] = useState('English');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    try {
      const created = await createWorkspace({ name: wsName.trim(), icon: wsIcon });
      const wsData = await getWorkspaces();
      setWorkspaces(wsData.workspaces);
      setActiveWorkspaceId(created.id);
      setWsName('');
      setWsIcon('briefcase');
      onCloseWorkspaceModal();
    } catch (err: any) {
      setWsError(err.message || 'Failed to create workspace');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importTitle.trim() || isImporting) return;
    setIsImporting(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('title', importTitle.trim());
      formData.append('audio', importFile);

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'X-Workspace-Id': activeWorkspaceId,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (HTTP ${res.status})`);
      }

      const created = await res.json();
      const allMeetings = await getMeetings();
      setMeetings(allMeetings);
      setSelectedMeetingId(created.id);

      setImportTitle('');
      setImportFile(null);
      onCloseImportModal();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMeeting) return;
    try {
      await deleteMeeting(currentMeeting.id);
      const remaining = meetings.filter((m) => m.id !== currentMeeting.id);
      setMeetings(remaining);
      setSelectedMeetingId(remaining.length > 0 ? remaining[0].id : null);
      onCloseDeleteModal();
    } catch (err: any) {
      console.error('Delete failed:', err);
    }
  };

  const handleSpeakerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMeeting || !newSpeakerName.trim()) return;
    try {
      await fetch(`/api/meetings/${encodeURIComponent(currentMeeting.id)}/speakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_name: speakerToEdit || currentMeeting.transcript?.[speakerIndex ?? 0]?.speaker,
          new_name: newSpeakerName.trim(),
          line_index: speakerScope === 'reassign' && speakerIndex != null ? speakerIndex : undefined,
        }),
      });
      const updated = await getMeeting(currentMeeting.id);
      setCurrentMeeting(updated);
      if (onCloseSpeakerModal) onCloseSpeakerModal();
    } catch (err: any) {
      setSpeakerError(err.message || 'Failed to update speaker');
    }
  };

  const handleTranslateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onStartTranslation) {
      onStartTranslation(selectedLangCode, selectedLangName);
    }
    if (onCloseTranslateModal) onCloseTranslateModal();
  };

  return (
    <>
      {/* Create Workspace Dialog */}
      {workspaceModalOpen && (
        <dialog
          id="workspace-dialog"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseWorkspaceModal();
          }}
        >
          <form id="workspace-form" onSubmit={handleCreateWorkspace}>
            <div className="dialog-top">
              <div>
                <h2>Create workspace</h2>
                <p>Organize conversations in a dedicated space.</p>
              </div>
              <button
                type="button"
                className="close"
                id="close-workspace-dialog"
                aria-label="Close"
                onClick={onCloseWorkspaceModal}
              >
                ×
              </button>
            </div>

            <label htmlFor="workspace-name-input">
              Workspace name
              <input
                id="workspace-name-input"
                maxLength={40}
                placeholder="e.g. Design Team, Executive Syncs"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                required
                autoFocus
              />
            </label>

            <div className="icon-picker-section">
              <span className="icon-picker-heading">Choose an icon</span>
              <div className="icon-picker-grid" id="icon-picker-grid">
                {Object.entries(WORKSPACE_ICONS).map(([key, svg]) => (
                  <button
                    key={key}
                    type="button"
                    className={`icon-picker-tile ${wsIcon === key ? 'is-selected' : ''}`}
                    aria-label={key}
                    title={key}
                    onClick={() => setWsIcon(key)}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                ))}
              </div>
            </div>

            {wsError && (
              <div id="workspace-error" className="error" role="alert">
                {wsError}
              </div>
            )}

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                id="workspace-cancel"
                onClick={onCloseWorkspaceModal}
              >
                Cancel
              </button>
              <button className="primary" type="submit" id="workspace-submit">
                Create workspace
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Import Meeting Dialog */}
      {importModalOpen && (
        <dialog
          id="import-dialog"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseImportModal();
          }}
        >
          <form id="upload-form" onSubmit={handleImportSubmit}>
            <div className="dialog-top">
              <div>
                <h2>Import a meeting</h2>
                <p>Keep the recording and its notes together.</p>
              </div>
              <button
                type="button"
                className="close"
                id="close-dialog"
                aria-label="Close"
                onClick={onCloseImportModal}
              >
                ×
              </button>
            </div>

            <label>
              Meeting title
              <input
                name="title"
                id="title"
                placeholder="e.g. Weekly project catch-up"
                required
                maxLength={200}
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                autoFocus
              />
            </label>

            <label htmlFor="audio">
              Audio or video file
              <input
                name="audio"
                id="audio"
                type="file"
                accept="audio/*,video/mp4,video/webm,video/quicktime"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
              />
            </label>

            <p className="hint">Up to 2 GB.</p>

            {importError && (
              <div id="upload-error" className="error" role="alert">
                {importError}
              </div>
            )}

            <button
              className="primary"
              type="submit"
              id="submit"
              disabled={isImporting}
            >
              {isImporting ? 'Importing…' : 'Import meeting'}
            </button>
          </form>
        </dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalOpen && currentMeeting && (
        <dialog
          id="delete-dialog"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseDeleteModal();
          }}
        >
          <form id="delete-form" onSubmit={handleDeleteMeeting}>
            <div className="dialog-top">
              <div>
                <h2>Delete this meeting?</h2>
                <p>
                  This will permanently delete this meeting record. You won’t get it
                  back. Do you want to confirm?
                </p>
              </div>
              <button
                type="button"
                className="close"
                id="close-delete-dialog"
                aria-label="Close"
                onClick={onCloseDeleteModal}
              >
                ×
              </button>
            </div>

            <div className="delete-dialog-actions">
              <button
                type="button"
                className="secondary"
                id="delete-cancel"
                onClick={onCloseDeleteModal}
              >
                No, keep it
              </button>
              <button className="delete-confirm" type="submit" id="delete-yes">
                Yes, delete
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Speaker Assignment Dialog */}
      {speakerModalOpen && currentMeeting && (
        <dialog
          id="speaker-dialog"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseSpeakerModal && onCloseSpeakerModal();
          }}
        >
          <form id="speaker-form" onSubmit={handleSpeakerSave}>
            <div className="dialog-top">
              <div>
                <h2 id="speaker-dialog-title">Speaker assignment</h2>
                <p id="speaker-dialog-subtitle">
                  Rename speaker across all lines or reassign this line.
                </p>
              </div>
              <button
                type="button"
                className="close"
                id="speaker-close"
                aria-label="Close"
                onClick={onCloseSpeakerModal}
              >
                ×
              </button>
            </div>

            <div className="speaker-scope-options" id="speaker-scope-options">
              <label id="speaker-scope-rename-wrap">
                <input
                  type="radio"
                  name="speaker-scope"
                  value="rename"
                  checked={speakerScope === 'rename'}
                  onChange={() => setSpeakerScope('rename')}
                />{' '}
                <span>Rename everywhere in this meeting</span>
              </label>
              <label id="speaker-scope-single-wrap">
                <input
                  type="radio"
                  name="speaker-scope"
                  value="reassign"
                  checked={speakerScope === 'reassign'}
                  onChange={() => setSpeakerScope('reassign')}
                />{' '}
                <span>Reassign only this dialogue line</span>
              </label>
            </div>

            <div id="speaker-input-wrap">
              <label htmlFor="speaker-name-input" id="speaker-name-label">
                New name
              </label>
              <input
                id="speaker-name-input"
                maxLength={100}
                required
                placeholder="e.g. Mohan"
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                autoFocus
              />
            </div>

            {speakerError && (
              <div id="speaker-error" className="error" role="alert">
                {speakerError}
              </div>
            )}

            <div className="delete-dialog-actions">
              <button
                type="button"
                className="secondary"
                id="speaker-cancel"
                onClick={onCloseSpeakerModal}
              >
                Cancel
              </button>
              <button className="primary" type="submit" id="speaker-save">
                Save changes
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Translate Conversation Dialog */}
      {translateModalOpen && (
        <dialog
          id="translate-dialog"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseTranslateModal && onCloseTranslateModal();
          }}
        >
          <form id="translate-form" onSubmit={handleTranslateSubmit}>
            <div className="dialog-top">
              <div>
                <h2>Translate conversation</h2>
                <p>Translate the transcript and summary into another language.</p>
              </div>
              <button
                type="button"
                className="close"
                id="close-translate-dialog"
                aria-label="Close"
                onClick={onCloseTranslateModal}
              >
                ×
              </button>
            </div>
            <div className="translate-modal-body">
              <label className="translate-field-label">Select target language</label>
              <div className="translate-lang-chips" id="translate-lang-chips">
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`lang-chip ${selectedLangCode === lang.code ? 'is-selected' : ''}`}
                    data-code={lang.code}
                    data-name={lang.name}
                    onClick={() => {
                      setSelectedLangCode(lang.code);
                      setSelectedLangName(lang.name);
                    }}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
              <input type="hidden" id="translate-target-code" value={selectedLangCode} />
              <input type="hidden" id="translate-target-name" value={selectedLangName} />
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                id="translate-cancel"
                onClick={onCloseTranslateModal}
              >
                Cancel
              </button>
              <button className="primary" type="submit" id="translate-submit">
                Translate
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
