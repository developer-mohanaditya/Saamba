// static/js/main.js - Application bootstrapper and lifecycle coordinator
import { state } from './state.js';
import { api } from './api.js';
import { $, $$, esc, date, busyStatus, speakerDisplayName, showToast } from './utils.js';
import { initSidebar, renderWorkspaces, updateActiveWorkspaceUI } from './components/sidebar.js';
import { initTranslateDialog, initRewriteDialog, initStopConfirmDialog, initDialogBackdropClose } from './components/modals.js';
import { initSpeakerDialog } from './components/speaker-dialog.js';
import { initImportDialog } from './components/import-upload.js';
import { syncMediaPane, renderMediaPaneMarkup, initMediaPlayer } from './components/media-pane.js';
import { renderAskPanelMarkup, initAskPanel } from './components/ask-panel.js';
import { markdown, renderNotesPaneMarkup, initNotesPane } from './components/notes-pane.js';
import { renderDetailHeaderMarkup, initMeetingDetail } from './components/meeting-detail.js';

export function connectMeetingStream(mid) {
  if (state.activeEventSource) {
    if (state.activeEventSource._meetingId === mid) return;
    state.activeEventSource.close();
    state.activeEventSource = null;
  }
  const es = new EventSource(`/api/meetings/${encodeURIComponent(mid)}/events`);
  es._meetingId = mid;
  state.activeEventSource = es;

  es.addEventListener('transcript_chunk', (e) => {
    try {
      const data = JSON.parse(e.data);
      const pre = $('#stream-transcript-text');
      if (pre) {
        pre.textContent += data.text;
        pre.scrollTop = pre.scrollHeight;
      }
    } catch (_) {}
  });

  es.addEventListener('summary_chunk', (e) => {
    try {
      const data = JSON.parse(e.data);
      const container = $('#stream-summary-text');
      if (container) {
        container._rawText = (container._rawText || '') + data.text;
        container.innerHTML = markdown(container._rawText);
        container.scrollTop = container.scrollHeight;
      }
    } catch (_) {}
  });

  es.addEventListener('live_chunk', () => {
    if (state.current === mid) refresh();
  });

  es.addEventListener('transcript_done', () => {
    if (state.current === mid) refresh();
  });

  es.addEventListener('summary_done', () => {
    if (state.current === mid) refresh();
  });

  es.addEventListener('status', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.status === 'ready' || data.status === 'error') {
        es.close();
        if (state.activeEventSource === es) state.activeEventSource = null;
        if (state.current === mid) refresh();
      }
    } catch (_) {}
  });
}

export async function openMeeting(id, rerender = true, targetTab = null) {
  if (state.current !== id) {
    state.mediaCollapsed = false;
    try { localStorage.setItem('saamba-media-collapsed', 'false'); } catch (_) {}
  }
  state.selected = id;
  const m = await api(`/api/meetings/${id}`);
  if (rerender) {
    await refresh();
    return;
  }
  if (busyStatus(m.status) || m.status === 'recording') {
    connectMeetingStream(id);
  } else if (state.activeEventSource && state.activeEventSource._meetingId !== id) {
    state.activeEventSource.close();
    state.activeEventSource = null;
  }
  if (!state.chats[id]) {
    const messages = await api(`/api/meetings/${id}/chat`);
    if (state.selected !== id) return;
    state.chats[id] = { messages, scope: 'this', collapsed: false, question: '' };
  }

  const activeTrans = state.activeTranslationByMeeting[id] || null;
  const transVersion = activeTrans ? `${activeTrans.code}:${activeTrans.status}:${activeTrans.data ? 'ready' : 'empty'}` : 'none';
  const version = JSON.stringify([m.id, m.title, m.status, m.error, m.summary, m.summary_preview, m.transcript, m.mime, m.action_items, transVersion]);
  if (state.current === id && state.lastVersion === version && !targetTab) return;
  state.lastVersion = version;

  const same = state.current === id;
  const oldPlayer = $('#player');
  const position = same ? oldPlayer?.currentTime || 0 : 0;
  const playing = same && oldPlayer && !oldPlayer.paused;
  const previousTab = same && document.querySelector('.tab.active')?.dataset.tab;
  const savedTab = (() => { try { return localStorage.getItem(`saamba-active-tab-${id}`); } catch (_) { return null; } })();
  const validSavedTab = savedTab && (savedTab === 'summary' || savedTab === 'actions' || savedTab === 'transcript' || (activeTrans && savedTab === `trans-${activeTrans.code}`)) ? savedTab : null;
  const activeTab = targetTab || previousTab || validSavedTab || (m.status === 'recording' ? 'transcript' : 'summary');
  const searchTerm = same ? ($('#search')?.value || '') : '';
  const oldScroll = same ? ($('#notes-scroll')?.scrollTop || 0) : 0;

  state.current = id;
  const canRewrite = !busyStatus(m.status) && m.status !== 'recording';
  const totalActions = m.action_items?.length || 0;
  const checkedActions = m.action_items?.filter(a => a.checked).length || 0;
  const actionCounterText = totalActions > 0 ? `${checkedActions}/${totalActions}` : '0';

  const uniqueSpeakers = [];
  const seenSpeakers = new Set();
  for (const s of m.transcript) {
    if (s.speaker != null) {
      const name = speakerDisplayName(s.speaker);
      if (!seenSpeakers.has(name)) {
        seenSpeakers.add(name);
        uniqueSpeakers.push(s.speaker);
      }
    }
  }

  // Render combined HTML into #detail
  const headerHtml = renderDetailHeaderMarkup(m, canRewrite);
  const errorNoticeHtml = m.error ? `<p class="notice">${esc(m.error)}</p>` : '';
  const notesHtml = renderNotesPaneMarkup(m, activeTab, activeTrans, actionCounterText);
  const mediaHtml = renderMediaPaneMarkup(m);
  const askHtml = renderAskPanelMarkup(m);

  const detailEl = $('#detail');
  if (detailEl) {
    detailEl.innerHTML = `<div class="notes-card">${headerHtml}${errorNoticeHtml}${notesHtml}</div>${mediaHtml}${askHtml}`;
  }

  // Initialize sub-components
  initMeetingDetail(m, {
    onRefresh: () => refresh(),
    onDeleted: () => refresh()
  });

  initNotesPane(m, {
    onTabSwitch: () => {},
    openMeetingFn: openMeeting,
    uniqueSpeakers
  });

  initMediaPlayer(m, position, playing, () => refresh());

  initAskPanel(id, markdown);

  const search = $('#search');
  if (search && searchTerm) {
    search.value = searchTerm;
    search.dispatchEvent(new Event('input'));
  }

  const scroller = $('#notes-scroll');
  if (scroller) scroller.scrollTop = oldScroll;
}

export async function refresh() {
  const allMeetings = await api('/api/meetings');
  renderWorkspaces(allMeetings, () => refresh());
  updateActiveWorkspaceUI();
  let meetings = allMeetings;
  if (state.activeWorkspaceId && state.activeWorkspaceId !== 'default') {
    const ids = state.workspaceMeetings[state.activeWorkspaceId] || [];
    meetings = allMeetings.filter(m => ids.includes(m.id));
  }
  const countEl = $('#count');
  if (countEl) {
    countEl.textContent = String(meetings.length);
    countEl.setAttribute('aria-label', `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'}`);
  }
  if (!state.selected && meetings.length) state.selected = meetings[0].id;
  if (state.selected && !meetings.some(m => m.id === state.selected)) {
    state.selected = meetings.length ? meetings[0].id : null;
  }
  if (!meetings.length) {
    const wsName = (state.workspaces.find(w => w.id === state.activeWorkspaceId) || {}).name || 'workspace';
    const detail = $('#detail');
    if (detail) {
      detail.innerHTML = `<div class="empty"><div class="empty-icon">♫</div><h2>${state.activeWorkspaceId === 'default' ? 'Make room for the conversation.' : `No meetings in ${esc(wsName)} yet.`}</h2><p>${state.activeWorkspaceId === 'default' ? 'Import a recording to bring your notes, transcript, and audio together.' : 'Import a new recording while this workspace is selected to add meetings here.'}</p><button class="primary" id="empty-import">Import a meeting</button></div>`;
      const emptyBtn = $('#empty-import');
      if (emptyBtn) emptyBtn.onclick = () => $('#import-dialog')?.showModal();
    }
  }
  const meetingsEl = $('#meetings');
  const libEl = document.querySelector('.library');
  if (libEl) libEl.classList.toggle('is-empty', meetings.length === 0);
  if (meetingsEl) {
    meetingsEl.classList.toggle('is-empty', meetings.length === 0);
    meetingsEl.innerHTML = meetings.length ? meetings.map(m => {
      const isVideo = m.mime && m.mime.startsWith('video/');
      const meetingIconHtml = isVideo
        ? `<svg class="meeting-media-icon video-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`
        : `<span class="meeting-audio-symbol">♫</span>`;
      return `<button class="meeting ${state.selected === m.id ? 'selected' : ''}" data-id="${esc(m.id)}" title="${esc(m.title)}"><span class="meeting-icon">${meetingIconHtml}</span><span class="meeting-copy"><strong>${esc(m.title)}</strong><small>${esc(date(m.created_at))}</small></span></button>`;
    }).join('') : `<div class="list-empty">Nothing in this workspace.<br>Start with something.</div>`;
  }
  document.querySelectorAll('.meeting').forEach(b => b.onclick = () => openMeeting(b.dataset.id));
  if (state.selected && !state.editing) await openMeeting(state.selected, false);
}

function setupGlobalListeners() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select')) {
      $$('.custom-select-options').forEach(x => x.hidden = true);
      $$('.custom-select-trigger').forEach(x => x.setAttribute('aria-expanded', 'false'));
    }
    if (!e.target.closest('.share-menu') && !e.target.closest('.transcript-menu-wrap')) {
      $$('.share-options, .transcript-dropdown').forEach(x => x.hidden = true);
      $$('.transcript-menu-wrap').forEach(w => w.classList.remove('is-open'));
      $$('#share-toggle, #rewrite-toggle, #ask-scope-toggle, #download-toggle').forEach(x => x.setAttribute('aria-expanded', 'false'));
    }
    if (!e.target.closest('.delete-menu')) {
      const pop = $('#delete-popover');
      if (pop) pop.hidden = true;
      const toggle = $('#delete-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
    if (!e.target.closest('.notes-card, .media-pane, dialog')) {
      const player = $('#player');
      if (player && !player.paused) player.pause();
    }
  });

  const toastCloseBtn = $('#toast button');
  if (toastCloseBtn) {
    toastCloseBtn.onclick = () => {
      const toast = $('#toast');
      if (toast) toast.hidden = true;
    };
  }
}

export function initApp() {
  // Bind global references for capture.js compatibility
  window.refresh = refresh;
  window.openMeeting = openMeeting;
  Object.defineProperty(window, 'selected', {
    get: () => state.selected,
    set: (v) => { state.selected = v; }
  });
  Object.defineProperty(window, 'current', {
    get: () => state.current,
    set: (v) => { state.current = v; }
  });

  initSidebar(() => refresh());
  initTranslateDialog(openMeeting);
  initRewriteDialog();
  initStopConfirmDialog();
  initDialogBackdropClose();
  initSpeakerDialog((mid) => {
    state.current = null;
    openMeeting(mid, false);
  });
  initImportDialog(() => refresh());
  setupGlobalListeners();

  refresh().catch(e => {
    const meetings = $('#meetings');
    if (meetings) meetings.textContent = e.message;
  });

  setInterval(() => refresh().catch(() => {}), 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
