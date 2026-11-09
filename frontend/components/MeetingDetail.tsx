// frontend/components/MeetingDetail.tsx - Exact Meeting Detail & Notes pane matching v1

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { date, time, inline, esc, speakerDisplayName, summarySections } from '../lib/markdown';
import { icon } from './Icons';
import { toggleActionItem, renameMeeting } from '../lib/api';

interface MeetingDetailProps {
  onImport: () => void;
  onDeleteMeeting: () => void;
  onSeekAudio?: (seconds: number) => void;
}

export function MeetingDetail({ onImport, onDeleteMeeting, onSeekAudio }: MeetingDetailProps) {
  const {
    currentMeeting,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    setCurrentMeeting,
    setMeetings,
    meetings,
  } = useAppStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>({});

  if (!currentMeeting) {
    return (
      <div className="empty">
        <div className="empty-icon">♫</div>
        <h2>Make room for the conversation.</h2>
        <p>Import a recording to bring your notes, transcript, and audio together.</p>
        <button className="primary" id="empty-import" type="button" onClick={onImport}>
          Import your first meeting
        </button>
      </div>
    );
  }

  const actionItems = currentMeeting.action_items || [];
  const totalActions = actionItems.length;
  const checkedActions = actionItems.filter(
    (a) => (localChecks[a.key] !== undefined ? localChecks[a.key] : a.checked)
  ).length;
  const actionCounterText = totalActions > 0 ? `${checkedActions}/${totalActions}` : '0';

  const handleSaveTitle = async () => {
    const trimmed = titleValue.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === currentMeeting.title) return;
    try {
      await renameMeeting(currentMeeting.id, trimmed);
      const updated = { ...currentMeeting, title: trimmed };
      setCurrentMeeting(updated);
      setMeetings(meetings.map((m) => (m.id === currentMeeting.id ? updated : m)));
    } catch (e) {
      console.error('Rename failed:', e);
    }
  };

  const handleActionToggle = async (key: string, currentChecked: boolean) => {
    const nextVal = !currentChecked;
    setLocalChecks((prev) => ({ ...prev, [key]: nextVal }));
    try {
      await toggleActionItem(currentMeeting.id, key, nextVal);
      // Update store meeting
      const updatedActions = actionItems.map((a) =>
        a.key === key ? { ...a, checked: nextVal } : a
      );
      setCurrentMeeting({ ...currentMeeting, action_items: updatedActions });
    } catch (e) {
      console.error('Action toggle failed:', e);
    }
  };

  const filteredSegments = (currentMeeting.transcript || []).filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.text && s.text.toLowerCase().includes(q)) ||
      (s.speaker && s.speaker.toLowerCase().includes(q))
    );
  });

  const summaryHtml = currentMeeting.summary
    ? summarySections(currentMeeting)
    : '<p class="muted">Summary will appear once transcription finishes.</p>';

  return (
    <div className="notes-card">
      {/* Detail Header */}
      <div className="detail-header">
        <div className="detail-meta">
          <span className="meeting-date">
            <svg
              className="date-icon"
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ marginRight: '3px' }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {date(currentMeeting.created_at)}
          </span>

          {/* Rewrite Menu */}
          <div className="share-menu">
            <button
              className="subtle-button"
              type="button"
              onClick={() => {
                setRewriteOpen(!rewriteOpen);
                setShareOpen(false);
              }}
              aria-expanded={rewriteOpen}
            >
              <span dangerouslySetInnerHTML={{ __html: icon('rewrite') }} /> Rewrite{' '}
              <span dangerouslySetInnerHTML={{ __html: icon('chevron') }} />
            </button>
            {rewriteOpen && (
              <div className="share-options" id="rewrite-options">
                <button
                  type="button"
                  onClick={() => {
                    setRewriteOpen(false);
                    // trigger summary rewrite
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: icon('rewrite') }} />
                  {currentMeeting.summary ? 'Rewrite' : 'Create'} summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRewriteOpen(false);
                    // trigger transcript rewrite
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: icon('file') }} />
                  {(currentMeeting.transcript || []).length ? 'Rewrite' : 'Create'} transcript
                </button>
              </div>
            )}
          </div>

          {/* Share Menu */}
          <div className="share-menu">
            <button
              className="subtle-button"
              type="button"
              onClick={() => {
                setShareOpen(!shareOpen);
                setRewriteOpen(false);
              }}
              aria-expanded={shareOpen}
            >
              <span dangerouslySetInnerHTML={{ __html: icon('share') }} /> Share{' '}
              <span dangerouslySetInnerHTML={{ __html: icon('chevron') }} />
            </button>
            {shareOpen && (
              <div className="share-options" id="share-options">
                <button
                  type="button"
                  onClick={() => {
                    setShareOpen(false);
                    const subject = encodeURIComponent(`Meeting Notes: ${currentMeeting.title}`);
                    const body = encodeURIComponent(currentMeeting.summary || '');
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: icon('mail') }} />
                  Send to email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    alert('Meeting link copied to clipboard!');
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: icon('link') }} />
                  Copy link
                </button>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <div className="delete-menu">
            <button
              className="subtle-button delete-button"
              type="button"
              aria-label="Delete meeting"
              onClick={onDeleteMeeting}
            >
              <span dangerouslySetInnerHTML={{ __html: icon('delete') }} />
            </button>
          </div>

          {/* Status chip */}
          <span
            className={`status-chip ${
              currentMeeting.status === 'ready' ? '' : 'is-busy'
            }`}
          >
            {currentMeeting.status === 'ready' ? 'Ready' : currentMeeting.status}
          </span>
        </div>

        {/* Editable Title Group */}
        <div className="title-group">
          {editingTitle ? (
            <input
              className="title-input"
              value={titleValue}
              maxLength={200}
              autoFocus
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
          ) : (
            <button
              id="meeting-title"
              className="meeting-title"
              title="Click to edit meeting name"
              aria-label="Edit meeting name"
              onClick={() => {
                setTitleValue(currentMeeting.title);
                setEditingTitle(true);
              }}
            >
              {currentMeeting.title}
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Notes Workspace */}
      <div className="meeting-workspace">
        <section className="notes-pane">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button
              type="button"
              className={`tab action-tab ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              Action items <span className="action-count">{actionCounterText}</span>
            </button>
            <div className="transcript-tab-wrapper">
              <button
                type="button"
                className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                Transcript
              </button>
            </div>
          </div>

          <div className="notes-scroll" id="notes-scroll">
            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div
                className="summary-text"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            )}

            {/* ACTION ITEMS TAB */}
            {activeTab === 'actions' && (
              <div className="action-list">
                {actionItems.length === 0 ? (
                  <p className="muted">No action items detected in this conversation.</p>
                ) : (
                  actionItems.map((a) => {
                    const isChecked =
                      localChecks[a.key] !== undefined
                        ? localChecks[a.key]
                        : a.checked;
                    return (
                      <div
                        key={a.key}
                        className={`action-row ${isChecked ? 'is-checked' : ''}`}
                      >
                        <div className="action-item-content">
                          <input
                            type="checkbox"
                            className="action-checkbox"
                            checked={!!isChecked}
                            onChange={() => handleActionToggle(a.key, !!isChecked)}
                            aria-label="Mark action item complete"
                          />
                          <span
                            className="action-text"
                            dangerouslySetInnerHTML={{ __html: inline(a.text) }}
                          />
                        </div>
                        <div className="action-meta">
                          {a.speaker && (
                            <>
                              <span className="action-speaker">{a.speaker}</span>
                              <span className="action-meta-dot" aria-hidden="true">
                                ·
                              </span>
                            </>
                          )}
                          {a.start != null ? (
                            <button
                              type="button"
                              className="action-citation"
                              onClick={() => onSeekAudio && onSeekAudio(Number(a.start))}
                            >
                              Listen at {time(a.start)}
                            </button>
                          ) : (
                            <span className="action-citation-unavailable">
                              Source timestamp unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TRANSCRIPT TAB */}
            {activeTab === 'transcript' && (
              <div className="transcript-pane">
                <div className="transcript-head">
                  <h3>Transcript</h3>
                  <input
                    id="search"
                    type="search"
                    placeholder="Search transcript…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="segments">
                  {filteredSegments.length === 0 ? (
                    <p className="muted">No matching transcript segments found.</p>
                  ) : (
                    filteredSegments.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="segment"
                        onClick={() => onSeekAudio && onSeekAudio(Number(s.start))}
                      >
                        <span className="segment-time">{time(s.start)}</span>
                        <span className="segment-body">
                          {s.speaker && (
                            <span className="speaker-tag">
                              <strong>{speakerDisplayName(s.speaker)}</strong>
                            </span>
                          )}
                          <span>{s.text}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
