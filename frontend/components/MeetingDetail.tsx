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
  onOpenSpeakerDialog?: (speaker: string, index?: number) => void;
}

export function MeetingDetail({
  onImport,
  onDeleteMeeting,
  onSeekAudio,
  onOpenSpeakerDialog,
}: MeetingDetailProps) {
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
  const [transcriptMenuOpen, setTranscriptMenuOpen] = useState(false);
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

  const handleExport = (format: 'txt' | 'md' | 'pdf') => {
    setTranscriptMenuOpen(false);
    const exportSegments = currentMeeting.transcript || [];
    if (exportSegments.length === 0) {
      alert('No transcript available to export.');
      return;
    }
    const cleanTitle = (currentMeeting.title || 'Meeting')
      .replace(/[\\/\x00-\x1f\x7f]+/g, ' ')
      .trim();

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const rowsHtml = exportSegments
        .map((s) => {
          const timestamp = time(Number(s.start) || 0);
          const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
          return `<div class="transcript-row"><div class="row-meta"><span class="timestamp">[${esc(
            timestamp
          )}]</span> <strong class="speaker">${esc(spk)}:</strong></div><p class="text">${esc(
            s.text || ''
          )}</p></div>`;
        })
        .join('');

      printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(
        cleanTitle
      )} - Transcript</title><style>@page{margin:20mm 15mm;size:A4}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a;line-height:1.5;padding:24px;max-width:800px;margin:0 auto}h1{font-size:22px;margin-bottom:4px;color:#1a382b;font-family:Georgia,serif}.meta{font-size:13px;color:#666;margin-bottom:24px;border-bottom:1px solid #e5e5e5;padding-bottom:12px}.transcript-row{margin-bottom:16px;page-break-inside:avoid}.row-meta{font-size:13px;margin-bottom:4px;display:flex;gap:8px;align-items:baseline}.timestamp{font-family:ui-monospace,monospace;font-size:12px;color:#888;background:#f3f3f3;padding:2px 6px;border-radius:4px}.speaker{color:#1a382b;font-weight:600}.text{margin:0;font-size:14.5px;color:#222;white-space:pre-wrap;line-height:1.6}@media print{body{padding:0}}</style></head><body><h1>${esc(
        cleanTitle
      )}</h1><div class="meta">Date: ${esc(date(currentMeeting.created_at))} · ${
        exportSegments.length
      } segments</div><div class="transcript-body">${rowsHtml}</div><script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script></body></html>`);
      printWindow.document.close();
      return;
    }

    if (format === 'md') {
      const mdLines = [
        `# ${currentMeeting.title || 'Meeting'}`,
        `*Date: ${date(currentMeeting.created_at)}*`,
        `*Segments: ${exportSegments.length}*`,
        '',
        '---',
        '',
      ];
      for (const s of exportSegments) {
        const timestamp = time(Number(s.start) || 0);
        const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
        mdLines.push(`**[${timestamp}] ${spk}:**`);
        mdLines.push(s.text || '');
        mdLines.push('');
      }
      const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanTitle} - Transcript.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }

    // Default TXT
    const textLines = [
      `Meeting: ${currentMeeting.title || 'Meeting'}`,
      `Date: ${date(currentMeeting.created_at)}`,
      `Segments: ${exportSegments.length}`,
      '------------------------------------------------------------',
      '',
    ];
    for (const s of exportSegments) {
      const timestamp = time(Number(s.start) || 0);
      const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
      textLines.push(`[${timestamp}] ${spk}:`);
      textLines.push(s.text || '');
      textLines.push('');
    }
    const blob = new Blob([textLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTitle} - Transcript.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

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
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: icon('rewrite') }} />
                  {currentMeeting.summary ? 'Rewrite' : 'Create'} summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRewriteOpen(false);
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
              data-tab="summary"
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button
              type="button"
              className={`tab action-tab ${activeTab === 'actions' ? 'active' : ''}`}
              data-tab="actions"
              onClick={() => setActiveTab('actions')}
            >
              Action items <span className="action-count">{actionCounterText}</span>
            </button>
            <div className="transcript-tab-wrapper">
              <button
                type="button"
                className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
                data-tab="transcript"
                onClick={() => setActiveTab('transcript')}
              >
                Transcript
              </button>
              <div
                className={`transcript-menu-wrap ${transcriptMenuOpen ? 'is-open' : ''}`}
                id="transcript-menu-wrap"
              >
                <button
                  type="button"
                  className="transcript-more-btn"
                  id="transcript-more-btn"
                  aria-label="Transcript options"
                  title="Transcript options"
                  onClick={() => setTranscriptMenuOpen(!transcriptMenuOpen)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {transcriptMenuOpen && (
                  <div className="transcript-dropdown" id="transcript-dropdown">
                    <button
                      type="button"
                      id="menu-edit-speakers"
                      onClick={() => {
                        setTranscriptMenuOpen(false);
                        if (onOpenSpeakerDialog) onOpenSpeakerDialog('');
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginRight: '6px' }}
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                      Edit speakers
                    </button>
                    <div className="transcript-dropdown-divider" />
                    <div className="transcript-dropdown-label">Export transcript</div>
                    <button
                      type="button"
                      id="menu-download-txt"
                      onClick={() => handleExport('txt')}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginRight: '6px' }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Text (.txt)
                    </button>
                    <button
                      type="button"
                      id="menu-download-md"
                      onClick={() => handleExport('md')}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginRight: '6px' }}
                      >
                        <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                        <path d="M7 15V9l3 3 3-3v6" />
                        <path d="m18 12-2 3-2-3" />
                      </svg>
                      Markdown (.md)
                    </button>
                    <button
                      type="button"
                      id="menu-download-pdf"
                      onClick={() => handleExport('pdf')}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginRight: '6px' }}
                      >
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print / PDF (.pdf)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Exact Search Bar positioned right in the tabs */}
            <div
              id="search-wrap"
              className="search-wrap"
              style={{ display: activeTab === 'transcript' ? 'flex' : 'none' }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <input
                id="search"
                className="search"
                placeholder="Search transcript"
                aria-label="Search transcript"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="notes-scroll" id="notes-scroll">
            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div
                id="summary"
                className="tab-content"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            )}

            {/* ACTION ITEMS TAB */}
            {activeTab === 'actions' && (
              <div id="actions" className="tab-content">
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
              </div>
            )}

            {/* TRANSCRIPT TAB */}
            {activeTab === 'transcript' && (
              <div id="transcript" className="tab-content">
                <div id="segments">
                  {filteredSegments.length === 0 ? (
                    <p className="muted">No matching transcript segments found.</p>
                  ) : (
                    filteredSegments.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="segment"
                        data-time={s.start}
                        onClick={() => onSeekAudio && onSeekAudio(Number(s.start))}
                      >
                        <span className="segment-time">{time(s.start)}</span>
                        <span className="segment-body">
                          {s.speaker && (
                            <span
                              className="speaker-tag"
                              data-speaker={s.speaker}
                              data-index={idx}
                              title="Click to rename or reassign speaker"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenSpeakerDialog) onOpenSpeakerDialog(s.speaker || '', idx);
                              }}
                            >
                              <strong>{speakerDisplayName(s.speaker)}</strong>
                              <span className="speaker-edit-btn" aria-hidden="true">
                                <svg
                                  className="speaker-edit-icon"
                                  viewBox="0 0 24 24"
                                  width="12"
                                  height="12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                              </span>
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
