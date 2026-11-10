// static/js/components/notes-pane.js - Notes pane, tabs, transcript search, actions, and translations
import { state } from '../state.js';
import { $, $$, esc, time, date, inline, spinner, activity, showToast, speakerDisplayName } from '../utils.js';
import { api } from '../api.js';
import { openSpeakerEditor } from './speaker-dialog.js';
import { openTranslateModal } from './modals.js';

export function markdown(text) {
  const lines = String(text || '').split(/\r?\n/);
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
  const separator = line => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');
  let listStack = [], html = '';
  const closeListsTo = targetLevel => {
    while (listStack.length > targetLevel) {
      listStack.pop();
      html += '</li></ul>';
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && separator(lines[i + 1])) {
      closeListsTo(0);
      const header = cells(line); i += 2; let rows = '';
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const row = cells(lines[i]); rows += '<tr>' + header.map((_, n) => `<td>${inline(row[n] || '')}</td>`).join('') + '</tr>'; i++;
      }
      i--; html += '<div class="markdown-table"><table><thead><tr>' + header.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'; continue;
    }
    const item = line.match(/^(\s*)[-*]\s+(.+)/);
    if (item) {
      const indent = item[1].length;
      if (listStack.length === 0) {
        listStack.push(indent);
        html += '<ul><li>' + inline(item[2]);
      } else {
        const topIndent = listStack[listStack.length - 1];
        if (indent > topIndent) {
          listStack.push(indent);
          html += '<ul><li>' + inline(item[2]);
        } else if (indent < topIndent) {
          while (listStack.length > 1 && listStack[listStack.length - 1] > indent) {
            listStack.pop();
            html += '</li></ul>';
          }
          html += '</li><li>' + inline(item[2]);
        } else {
          html += '</li><li>' + inline(item[2]);
        }
      }
      continue;
    }
    closeListsTo(0);
    if (!line.trim() || /^\s*[-*_]{3,}\s*$/.test(line)) continue;
    const heading = line.match(/^\s*#{1,4}\s+(.+)/) || line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    html += heading ? `<h3>${inline(heading[1])}</h3>` : `<p>${inline(line)}</p>`;
  }
  closeListsTo(0);
  return html;
}

export function summarySections(m) {
  const sections = []; let section = { title: '', lines: [] };
  for (const line of String(m.summary || '').split(/\r?\n/)) {
    const heading = line.match(/^\s*#{1,4}\s+(.+?)\s*$/) || line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (heading) {
      if (section.title || section.lines.some(x => x.trim())) sections.push(section);
      section = { title: heading[1], lines: [] };
    } else section.lines.push(line);
  }
  if (section.title || section.lines.some(x => x.trim())) sections.push(section);
  return sections.map((part, i) => {
    const cleanTitle = part.title.replace(/^\d+[\.\)]\s*/, '').trim();
    const isAction = /^(action items?|next steps)\s*:?$/i.test(cleanTitle);
    let body = markdown(part.lines.join('\n'));
    if (isAction && m.action_items?.length) {
      body = '<div class="action-list">' + m.action_items.map(a => {
        let spk = a.speaker;
        let itemText = a.text;
        if (!spk) {
          const mSpk = itemText.match(/(?:\[|\()\s*(Speaker\s*\w+|[A-Z][a-z]+)\s*(?:\]|\))/i);
          if (mSpk) {
            spk = mSpk[1].trim();
            itemText = itemText.replace(mSpk[0], ' ');
          }
        }
        itemText = itemText.replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
        const citationHtml = a.start != null
          ? `<button type="button" class="action-citation" data-citation="${a.start}">Listen at ${time(a.start)}</button>`
          : '<span class="action-citation-unavailable">Source timestamp unavailable</span>';
        return `<div class="action-row ${a.checked ? 'is-checked' : ''}"><div class="action-item-content"><input type="checkbox" class="action-checkbox" data-action="${esc(a.key)}" ${a.checked ? 'checked' : ''} aria-label="Mark action item complete"><span class="action-text">${inline(itemText)}</span></div><div class="action-meta">${spk ? `<span class="action-speaker">${esc(spk)}</span><span class="action-meta-dot" aria-hidden="true">·</span>` : ''}${citationHtml}</div></div>`;
      }).join('') + '</div>';
    }
    return `<section class="summary-section" ${isAction ? 'id="action-section"' : ''}><div class="summary-heading"><h3>${esc(part.title)}</h3><button class="copy-section" data-section="${i}" aria-label="Copy ${esc(part.title || 'section')}" title="Copy section"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>${body}</section>`;
  }).join('');
}

export function summaryContent(m) {
  if (m.status === 'queued') return activity('Getting things ready', 'Your recording is saved.');
  if (m.status === 'transcribing') return activity('Creating your transcript', 'Follow along in the Transcript tab.') + (m.transcript_preview ? `<div class="draft-label">STREAMING TRANSCRIPT</div><div class="transcript-stream-preview"><pre>${esc(m.transcript_preview)}</pre></div>` : '');
  if (m.status === 'summarizing') {
    return activity('Creating your English summary', 'Generating summary, key points, and action items in real-time…', true) +
      `<div class="live-stream-box"><div class="draft-badge"><span class="live-pulse"></span> STREAMING SUMMARY</div><div id="stream-summary-text" class="summary-text">${m.summary_preview ? markdown(m.summary_preview.content) : ''}</div></div>`;
  }
  if (m.status === 'recording' && !m.summary) return '<p class="muted">The summary can be created after the recording ends.</p>';
  if (m.summary) return `<div class="summary-text">${summarySections(m)}</div>`;
  if (m.status === 'error') return '<p class="notice is-error">' + (m.error ? esc(m.error) : 'The summary could not be created.') + '</p>';
  return `<p class="muted">${m.transcript.length ? 'Your transcript is available. Choose Create summary to make an English summary.' : 'Create a transcript first to make a summary.'}</p>`;
}

export function transcriptActivity(m) {
  if (m.status === 'transcribing') {
    return activity('Creating your transcript', 'Transcribing speech and identifying participants in real-time…', true) +
      `<div class="live-stream-box"><div class="draft-badge"><span class="live-pulse"></span> STREAMING TRANSCRIPT</div><pre id="stream-transcript-text" class="stream-text">${m.transcript_preview ? esc(m.transcript_preview) : ''}</pre></div>`;
  }
  if (m.status === 'recording') return activity('Listening for speech', 'New transcript segments will appear here as they are ready.');
  return m.transcript.length ? '' : '<p class="muted">No transcript yet.</p>';
}

export function handleTranscriptExport(m, format, activeTab) {
  const moreDrop = $('#transcript-dropdown');
  const moreWrap = $('#transcript-menu-wrap');
  if (moreDrop) moreDrop.hidden = true;
  if (moreWrap) moreWrap.classList.remove('is-open');

  let exportSegments = m.transcript || [];
  let langSuffix = '';

  if (activeTab && activeTab.startsWith('trans-')) {
    const langCode = activeTab.slice(6);
    const transData = state.translationsCache[`${m.id}:${langCode}`]?.transcript;
    if (transData && transData.length > 0) {
      exportSegments = transData;
      const langName = state.activeTranslationByMeeting[m.id]?.name || langCode;
      langSuffix = ` (${langName})`;
    }
  }

  if (!exportSegments || exportSegments.length === 0) {
    showToast('No transcript available to export.');
    return;
  }

  const cleanTitle = (m.title || 'Meeting').replace(/[\\/\x00-\x1f\x7f]+/g, ' ').trim().slice(0, 120);

  if (format === 'pdf') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to export PDF');
      return;
    }
    const rowsHtml = exportSegments.map(s => {
      const timestamp = time(Number(s.start) || 0);
      const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
      return `<div class="transcript-row"><div class="row-meta"><span class="timestamp">[${esc(timestamp)}]</span> <strong class="speaker">${esc(spk)}:</strong></div><p class="text">${esc(s.text || '')}</p></div>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(cleanTitle)} - Transcript</title>
  <style>
    @page { margin: 20mm 15mm; size: A4; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #1a382b; font-family: Georgia, serif; }
    .meta { font-size: 13px; color: #666; margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px; }
    .transcript-row { margin-bottom: 16px; page-break-inside: avoid; }
    .row-meta { font-size: 13px; margin-bottom: 4px; display: flex; gap: 8px; align-items: baseline; }
    .timestamp { font-family: ui-monospace, monospace; font-size: 12px; color: #888; background: #f3f3f3; padding: 2px 6px; border-radius: 4px; }
    .speaker { color: #1a382b; font-weight: 600; }
    .text { margin: 0; font-size: 14.5px; color: #222; white-space: pre-wrap; line-height: 1.6; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${esc(cleanTitle)}</h1>
  <div class="meta">Date: ${esc(date(m.created_at))} ${langSuffix ? `· Translation: ${esc(langSuffix.trim())}` : ''} · ${exportSegments.length} segments</div>
  <div class="transcript-body">${rowsHtml}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };<\/script>
</body>
</html>`);
    printWindow.document.close();
    showToast('Opening PDF print preview…');
    return;
  }

  if (format === 'md') {
    const mdLines = [
      `# ${m.title || 'Meeting'}`,
      `*Date: ${date(m.created_at)}*${langSuffix ? ` · *Translation: ${langSuffix.trim()}*` : ''}`,
      `*Segments: ${exportSegments.length}*`,
      '',
      '---',
      ''
    ];
    for (const s of exportSegments) {
      const timestamp = time(Number(s.start) || 0);
      const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
      mdLines.push(`**[${timestamp}] ${spk}:**`);
      mdLines.push(s.text || '');
      mdLines.push('');
    }
    const fileContent = mdLines.join('\n');
    const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTitle} - Transcript${langSuffix}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast('Markdown transcript downloaded');
    return;
  }

  // Default TXT
  const textLines = [
    `Meeting: ${m.title || 'Meeting'}`,
    `Date: ${date(m.created_at)}`,
    langSuffix ? `Translation: ${langSuffix.trim()}` : null,
    `Segments: ${exportSegments.length}`,
    '------------------------------------------------------------',
    ''
  ].filter(Boolean);
  for (const s of exportSegments) {
    const timestamp = time(Number(s.start) || 0);
    const spk = s.speaker != null ? speakerDisplayName(s.speaker) : 'Speaker';
    textLines.push(`[${timestamp}] ${spk}:`);
    textLines.push(s.text || '');
    textLines.push('');
  }
  const fileContent = textLines.join('\n');
  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanTitle} - Transcript${langSuffix}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('Text transcript downloaded');
}

export function renderNotesPaneMarkup(m, activeTab, activeTrans, actionCounterText) {
  const editIcon = `<svg class="speaker-edit-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
  const segments = m.transcript.map((s, idx) => `<button class="segment" data-time="${Number(s.start) || 0}"><span class="segment-time">${time(s.start)}</span><span class="segment-body">${s.speaker == null ? '' : `<span class="speaker-tag" data-speaker="${esc(s.speaker)}" data-index="${idx}" title="Click to rename or reassign speaker"><strong>${esc(speakerDisplayName(s.speaker))}</strong><span class="speaker-edit-btn" aria-hidden="true">${editIcon}</span></span>`}<span>${esc(s.text)}</span></span></button>`).join('');

  let translationTabsHtml = '';
  let translationPanesHtml = '';
  if (activeTrans) {
    const tabId = `trans-${activeTrans.code}`;
    const isTabActive = activeTab === tabId;
    const isLoading = activeTrans.status === 'loading';
    const isError = activeTrans.status === 'error';

    translationTabsHtml = `<button class="tab translation-tab ${isTabActive ? 'active' : ''}" data-tab="${esc(tabId)}" title="Translated transcript into ${esc(activeTrans.name)}">${esc(activeTrans.name)}${isLoading ? ' ' + spinner() : ''} <span class="tab-close" data-close-tab="true" title="Close translation tab" role="button" aria-label="Close tab">×</span></button>`;

    let paneContent = '';
    if (isLoading) {
      paneContent = `<div class="activity" role="status">${spinner()}<div><strong>Translating conversation into ${esc(activeTrans.name)}…</strong><p>Generating translated transcript segments with audio synchronization.</p></div></div>`;
    } else if (isError) {
      paneContent = `<p class="notice is-error">${esc(activeTrans.error)}</p>`;
    } else {
      const transSegments = (activeTrans.data?.transcript || []).map(s => `<button class="segment" data-time="${Number(s.start) || 0}"><span class="segment-time">${time(s.start)}</span><span class="segment-body">${s.speaker == null ? '' : `<span class="speaker-tag" data-speaker="${esc(s.speaker)}"><strong>${esc(speakerDisplayName(s.speaker))}</strong></span>`}<span>${esc(s.text)}</span></span></button>`).join('');
      paneContent = `<div class="segments">${transSegments}</div>`;
    }
    translationPanesHtml = `<div id="${esc(tabId)}" class="tab-content" ${isTabActive ? '' : 'hidden'}>${paneContent}</div>`;
  }

  return `<div class="meeting-workspace">
    <section class="notes-pane">
      <div class="tabs">
        <button class="tab ${activeTab === 'summary' ? 'active' : ''}" data-tab="summary">Summary ${m.status === 'summarizing' ? spinner() : ''}</button>
        <button class="tab action-tab ${activeTab === 'actions' ? 'active' : ''}" data-tab="actions">Action items <span class="action-count">${actionCounterText}</span></button>
        <div class="transcript-tab-wrapper">
          <button class="tab ${activeTab === 'transcript' ? 'active' : ''}" data-tab="transcript">${m.status === 'recording' ? 'Live transcript' : 'Transcript'} ${m.status === 'transcribing' ? spinner() : ''}</button>
          <div class="transcript-menu-wrap" id="transcript-menu-wrap">
            <button type="button" class="transcript-more-btn" id="transcript-more-btn" aria-label="Transcript options" title="Transcript options">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <div class="transcript-dropdown" id="transcript-dropdown" hidden>
              <button type="button" id="menu-edit-speakers"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>Edit speakers</button>
              ${(m.translations && m.translations.length > 0) ? `<div class="transcript-submenu-wrap" id="menu-translate-wrap">
                <button type="button" id="menu-translate" class="menu-item-with-submenu" aria-haspopup="true" aria-expanded="false">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                  <span>Translate</span>
                  <svg class="submenu-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <div class="transcript-side-dropdown" id="translate-side-dropdown">
                  <button type="button" id="menu-translate-new"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>New translation…</span></button>
                  <div class="transcript-dropdown-divider"></div>
                  <div class="transcript-dropdown-label">Saved</div>
                  ${m.translations.map(t => `<button type="button" class="menu-open-translation" data-code="${esc(t.language_code)}" data-name="${esc(t.language_name)}"><span>${esc(t.language_name)}</span></button>`).join('')}
                </div>
              </div>` : `<button type="button" id="menu-translate"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>Translate</button>`}
              <div class="transcript-dropdown-divider"></div>
              <div class="transcript-dropdown-label">Export transcript</div>
              <button type="button" id="menu-download-txt"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Text (.txt)</button>
              <button type="button" id="menu-download-md"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M7 15V9l3 3 3-3v6"/><path d="m18 12-2 3-2-3"/></svg>Markdown (.md)</button>
              <button type="button" id="menu-download-pdf"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print / PDF (.pdf)</button>
            </div>
          </div>
        </div>
        ${translationTabsHtml}
        <div id="search-wrap" class="search-wrap" ${activeTab === 'transcript' || activeTab.startsWith('trans-') ? '' : 'hidden'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
          <input id="search" class="search" placeholder="Search transcript" aria-label="Search transcript">
        </div>
      </div>
      ${m.transcript.length && m.transcript.every(s => s.speaker == null) ? `<p class="speaker-note" id="speaker-note" ${activeTab === 'transcript' ? '' : 'hidden'}>Speaker identification is not available for this recording.</p>` : ''}
      <div class="notes-scroll" id="notes-scroll">
        <div id="summary" class="tab-content" ${['summary', 'actions'].includes(activeTab) ? '' : 'hidden'}>${summaryContent(m)}</div>
        <div id="transcript" class="tab-content" ${activeTab === 'transcript' ? '' : 'hidden'}>
          <div id="segments">${segments}${transcriptActivity(m)}</div>
        </div>
        ${translationPanesHtml}
      </div>
    </section>
  </div>`;
}

export function initNotesPane(m, { onTabSwitch, openMeetingFn, uniqueSpeakers }) {
  const id = m.id;
  const moreDrop = $('#transcript-dropdown');
  const moreWrap = $('#transcript-menu-wrap');

  // Tab switching
  $$('.tab').forEach(b => {
    b.onclick = (e) => {
      if (e.target.closest('.tab-close')) return;
      const tab = b.dataset.tab;
      if (!tab.startsWith('trans-')) {
        try { localStorage.setItem(`saamba-active-tab-${id}`, tab); } catch (_) {}
      }
      const isOriginalTranscript = b.dataset.tab === 'transcript';
      const isAnyTranscript = isOriginalTranscript || (b.dataset.tab && b.dataset.tab.startsWith('trans-'));
      const action = b.dataset.tab === 'actions';
      $$('.tab').forEach(x => x.classList.toggle('active', x === b));
      $$('.tab-content').forEach(x => x.hidden = x.id !== (action ? 'summary' : b.dataset.tab));
      const searchWrap = $('#search-wrap');
      if (searchWrap) searchWrap.hidden = !isAnyTranscript;
      if (moreDrop) moreDrop.hidden = true;
      const note = $('#speaker-note');
      if (note) note.hidden = !isOriginalTranscript;

      const scroller = $('#notes-scroll');
      if (action) {
        const target = $('#action-section');
        if (target && scroller) scroller.scrollTop = target.offsetTop - scroller.offsetTop;
        else showToast('No action items are available yet.');
      } else if (scroller) {
        scroller.scrollTop = 0;
      }
      if (onTabSwitch) onTabSwitch(tab);
    };
  });

  // Transcript search
  const search = $('#search');
  if (search) {
    search.oninput = () => {
      $$('.segment').forEach(x => x.hidden = !x.textContent.toLowerCase().includes(search.value.toLowerCase()));
    };
    search.dispatchEvent(new Event('input'));
  }

  // Translation tab close
  $$('.tab-close[data-close-tab]').forEach(closeBtn => {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      state.dismissedTranslationByMeeting[id] = true;
      state.activeTranslationByMeeting[id] = null;
      try { localStorage.removeItem(`saamba-active-tab-${id}`); } catch (_) {}
      state.current = null;
      if (openMeetingFn) openMeetingFn(id, false, 'transcript');
    };
  });

  // Action item checkbox
  $$('[data-action]').forEach(box => {
    box.onchange = async () => {
      box.closest('.action-row')?.classList.toggle('is-checked', box.checked);
      const desired = box.checked;
      box.disabled = true;
      try {
        await api(`/api/meetings/${id}/action-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: box.dataset.action, checked: desired })
        });
        const item = m.action_items.find(a => a.key === box.dataset.action);
        if (item) item.checked = desired;
        const total = m.action_items.length;
        const checked = m.action_items.filter(a => a.checked).length;
        const countSpan = $('.action-count');
        if (countSpan) {
          countSpan.textContent = `${checked}/${total}`;
          countSpan.setAttribute('aria-label', `${checked} of ${total} completed`);
        }
      } catch (e) {
        box.checked = !desired;
        showToast(e.message);
      } finally {
        box.disabled = false;
      }
    };
  });

  // Copy section buttons
  $$('.copy-section').forEach(button => {
    button.onclick = async () => {
      const section = button.closest('.summary-section');
      if (!section) return;
      try {
        const copy = section.cloneNode(true);
        copy.querySelectorAll('button').forEach(el => el.remove());
        await navigator.clipboard.writeText(copy.innerText.trim());
        showToast('Section copied.');
      } catch (e) {
        showToast('Could not copy this section.');
      }
    };
  });

  // Citation buttons
  $$('[data-citation]').forEach(button => {
    button.onclick = () => {
      const player = $('#player');
      if (player) {
        player.currentTime = Number(button.dataset.citation);
        player.play().catch(() => {});
      }
    };
  });

  // Speaker tag clicks
  $$('.speaker-tag').forEach(tag => {
    tag.onclick = e => {
      e.stopPropagation();
      openSpeakerEditor(id, {
        mode: 'tag',
        speaker: tag.dataset.speaker,
        index: Number(tag.dataset.index)
      }, uniqueSpeakers);
    };
  });

  // Transcript options dropdown button
  const moreBtn = $('#transcript-more-btn');
  if (moreBtn && moreDrop) {
    moreBtn.onclick = e => {
      e.stopPropagation();
      const open = moreDrop.hidden;
      document.querySelectorAll('.share-options, .transcript-dropdown').forEach(x => {
        if (x !== moreDrop) x.hidden = true;
      });
      document.querySelectorAll('.transcript-menu-wrap').forEach(w => w.classList.remove('is-open'));
      moreDrop.hidden = !open;
      if (moreWrap) moreWrap.classList.toggle('is-open', open);
    };
  }

  // Edit speakers from menu
  const menuEditSpk = $('#menu-edit-speakers');
  if (menuEditSpk) {
    menuEditSpk.onclick = e => {
      e.stopPropagation();
      if (moreDrop) moreDrop.hidden = true;
      openSpeakerEditor(id, { mode: 'menu' }, uniqueSpeakers);
    };
  }

  // Menu translate trigger
  const menuTranslate = $('#menu-translate');
  if (menuTranslate) {
    menuTranslate.onclick = e => {
      e.stopPropagation();
      const wrap = $('#menu-translate-wrap');
      if (wrap) {
        wrap.classList.toggle('is-open');
        const isOpen = wrap.classList.contains('is-open');
        menuTranslate.setAttribute('aria-expanded', String(isOpen));
      } else {
        if (moreDrop) moreDrop.hidden = true;
        openTranslateModal(id);
      }
    };
  }

  // New translation button in flyout
  const menuTranslateNew = $('#menu-translate-new');
  if (menuTranslateNew) {
    menuTranslateNew.onclick = e => {
      e.stopPropagation();
      if (moreDrop) moreDrop.hidden = true;
      openTranslateModal(id);
    };
  }

  // Open saved translation from flyout
  $$('.menu-open-translation').forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const code = btn.dataset.code;
      const name = btn.dataset.name;
      if (moreDrop) moreDrop.hidden = true;
      if (!state.translationsCache[`${id}:${code}`]) {
        try {
          const transData = await api(`/api/meetings/${id}/translations/${code}`);
          state.translationsCache[`${id}:${code}`] = transData;
        } catch (_) {}
      }
      state.activeTranslationByMeeting[id] = {
        code,
        name,
        status: 'ready',
        error: null,
        data: state.translationsCache[`${id}:${code}`] || null
      };
      state.dismissedTranslationByMeeting[id] = false;
      state.current = null;
      if (openMeetingFn) openMeetingFn(id, false, `trans-${code}`);
    };
  });

  // Transcript export handlers
  const getActiveTab = () => document.querySelector('.tab.active')?.dataset.tab;
  const btnTxt = $('#menu-download-txt');
  if (btnTxt) btnTxt.onclick = e => { e.stopPropagation(); handleTranscriptExport(m, 'txt', getActiveTab()); };
  const btnMd = $('#menu-download-md');
  if (btnMd) btnMd.onclick = e => { e.stopPropagation(); handleTranscriptExport(m, 'md', getActiveTab()); };
  const btnPdf = $('#menu-download-pdf');
  if (btnPdf) btnPdf.onclick = e => { e.stopPropagation(); handleTranscriptExport(m, 'pdf', getActiveTab()); };
}
