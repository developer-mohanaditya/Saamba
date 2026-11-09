// static/js/components/sidebar.js - Workspace navigation & sidebar controller
import { state } from '../state.js';
import { $, $$, esc, showToast } from '../utils.js';
import { api } from '../api.js';

export const WORKSPACE_ICONS = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  lightning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="9" y2="18.01"/><line x1="15" y1="18" x2="15" y2="18.01"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M6 4h12v7a6 6 0 0 1-12 0V4z"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  messageSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};

export function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = collapsed;
  const appEl = $('.app');
  if (appEl) appEl.classList.toggle('sidebar-collapsed', collapsed);
  const btn = $('#sidebar-collapse-btn');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }
  try { localStorage.setItem('saamba-sidebar-collapsed', String(collapsed)); } catch (_) {}
  document.documentElement.classList.remove('init-sidebar-collapsed');
}

export function syncLibrary() {
  const currentLibrary = $('.library');
  if (currentLibrary) {
    currentLibrary.classList.toggle('is-collapsed', !state.libraryExpanded);
    currentLibrary.setAttribute('aria-hidden', String(!state.libraryExpanded));
  }
  const libToggle = $('#library-toggle');
  if (libToggle) {
    libToggle.setAttribute('aria-expanded', String(state.libraryExpanded));
  }
  const activeNavItem = $('.workspace-nav-item.active');
  if (activeNavItem) {
    activeNavItem.setAttribute('aria-expanded', String(state.libraryExpanded));
  }
  document.documentElement.classList.remove('init-library-collapsed');
}

export function updateActiveWorkspaceUI() {
  const currentWs = state.workspaces.find(w => w.id === state.activeWorkspaceId) || state.workspaces[0];
  const h1 = $('header h1');
  const eyebrow = $('header .eyebrow');
  if (h1) h1.innerHTML = `${esc(currentWs.name)}<span>.</span>`;
  if (eyebrow) eyebrow.textContent = currentWs.id === 'default' ? 'Your workspace' : `Workspace · ${currentWs.name}`;
  $$('.workspace-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workspaceId === state.activeWorkspaceId);
  });
}

export function renderWorkspaces(allMeetings = state.allMeetingsCache, onWorkspaceSelect = null) {
  if (Array.isArray(allMeetings) && allMeetings.length > 0) state.allMeetingsCache = allMeetings;
  const list = $('#workspace-list');
  if (!list) return;

  let html = '';
  state.workspaces.forEach((ws) => {
    const iconSvg = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;
    let count = 0;
    if (ws.id === 'default') {
      count = state.allMeetingsCache.length;
    } else {
      const ids = state.workspaceMeetings[ws.id] || [];
      count = state.allMeetingsCache.filter(m => ids.includes(m.id)).length;
    }
    const isActive = ws.id === state.activeWorkspaceId;
    const chevronSvg = isActive
      ? `<svg class="nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>`
      : '';
    const countBadgeHtml = count > 0 ? `<span class="workspace-count">${count}</span>` : '';
    html += `<div class="workspace-block ${isActive ? 'is-active' : ''}" data-workspace-id="${esc(ws.id)}">
      <button type="button" class="workspace-nav-item ${isActive ? 'active' : ''}" data-workspace-id="${esc(ws.id)}" aria-label="${esc(ws.name)}" aria-expanded="${isActive ? String(state.libraryExpanded) : 'false'}">
        <span class="nav-icon" aria-hidden="true">${iconSvg}</span>
        <span class="workspace-title">${esc(ws.name)}</span>
        ${countBadgeHtml}
        ${chevronSvg}
      </button>`;
    if (isActive) {
      const hasMeetings = count > 0;
      html += `<section class="library ${!state.libraryExpanded ? 'is-collapsed' : ''} ${!hasMeetings ? 'is-empty' : ''}" id="meeting-library"><div id="meetings" class="meeting-list ${!hasMeetings ? 'is-empty' : ''}"></div></section>`;
    }
    html += `</div>`;
  });
  list.innerHTML = html;

  list.querySelectorAll('.workspace-nav-item').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const wsId = btn.dataset.workspaceId;
      if (state.sidebarCollapsed) {
        setSidebarCollapsed(false);
        state.activeWorkspaceId = wsId;
        state.libraryExpanded = true;
        try { localStorage.setItem('saamba-active-workspace', state.activeWorkspaceId); } catch (_) {}
        try { localStorage.setItem('saamba-library-expanded', 'true'); } catch (_) {}
        updateActiveWorkspaceUI();
        if (onWorkspaceSelect) onWorkspaceSelect();
        return;
      }
      if (wsId === state.activeWorkspaceId) {
        state.libraryExpanded = !state.libraryExpanded;
        try { localStorage.setItem('saamba-library-expanded', String(state.libraryExpanded)); } catch (_) {}
        syncLibrary();
        btn.setAttribute('aria-expanded', String(state.libraryExpanded));
        return;
      }
      state.activeWorkspaceId = wsId;
      try { localStorage.setItem('saamba-active-workspace', state.activeWorkspaceId); } catch (_) {}
      state.libraryExpanded = true;
      try { localStorage.setItem('saamba-library-expanded', 'true'); } catch (_) {}
      updateActiveWorkspaceUI();
      if (onWorkspaceSelect) onWorkspaceSelect();
    };
  });
  syncLibrary();
}

export function initWorkspaceDialog(onWorkspaceCreated = null) {
  const workspaceDialog = $('#workspace-dialog');
  const createWorkspaceBtn = $('#create-workspace-btn');
  const closeWorkspaceDialog = $('#close-workspace-dialog');
  const workspaceCancel = $('#workspace-cancel');
  const workspaceForm = $('#workspace-form');
  const iconPickerGrid = $('#icon-picker-grid');
  const workspaceIconInput = $('#workspace-icon-input');
  const workspaceNameInput = $('#workspace-name-input');
  const workspaceError = $('#workspace-error');

  if (iconPickerGrid) {
    iconPickerGrid.innerHTML = Object.entries(WORKSPACE_ICONS).map(([key, svg]) => {
      return `<button type="button" class="icon-picker-tile ${key === 'briefcase' ? 'is-selected' : ''}" data-icon="${key}" aria-label="${key}" title="${key}">${svg}</button>`;
    }).join('');

    iconPickerGrid.querySelectorAll('.icon-picker-tile').forEach(tile => {
      tile.onclick = () => {
        iconPickerGrid.querySelectorAll('.icon-picker-tile').forEach(t => t.classList.remove('is-selected'));
        tile.classList.add('is-selected');
        if (workspaceIconInput) workspaceIconInput.value = tile.dataset.icon;
      };
    });
  }

  if (createWorkspaceBtn && workspaceDialog) {
    createWorkspaceBtn.onclick = (e) => {
      e.stopPropagation();
      if (state.sidebarCollapsed) setSidebarCollapsed(false);
      if (workspaceError) workspaceError.textContent = '';
      if (workspaceNameInput) workspaceNameInput.value = '';
      if (workspaceIconInput) workspaceIconInput.value = 'briefcase';
      if (iconPickerGrid) {
        iconPickerGrid.querySelectorAll('.icon-picker-tile').forEach(t => t.classList.toggle('is-selected', t.dataset.icon === 'briefcase'));
      }
      workspaceDialog.showModal();
    };
  }

  if (closeWorkspaceDialog && workspaceDialog) closeWorkspaceDialog.onclick = () => workspaceDialog.close();
  if (workspaceCancel && workspaceDialog) workspaceCancel.onclick = () => workspaceDialog.close();

  if (workspaceForm && workspaceDialog) {
    workspaceForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = workspaceNameInput ? workspaceNameInput.value.trim() : '';
      if (!name) {
        if (workspaceError) workspaceError.textContent = 'Please enter a workspace name.';
        return;
      }
      const iconKey = (workspaceIconInput && workspaceIconInput.value) || 'briefcase';
      const newWs = {
        id: 'ws_' + Date.now(),
        name,
        icon: iconKey,
        isDefault: false
      };
      state.workspaces.push(newWs);
      try { localStorage.setItem('saamba-workspaces', JSON.stringify(state.workspaces)); } catch (_) {}
      state.activeWorkspaceId = newWs.id;
      try { localStorage.setItem('saamba-active-workspace', state.activeWorkspaceId); } catch (_) {}
      workspaceDialog.close();
      showToast(`Workspace "${name}" created.`);
      if (onWorkspaceCreated) onWorkspaceCreated();

      // Persist to SQLite backend
      try {
        await api('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWs)
        });
      } catch (err) {
        console.warn('Could not save workspace to backend:', err);
      }
    };
  }
}

export async function syncWorkspacesWithServer(onWorkspaceChange = null) {
  try {
    const res = await api('/api/workspaces/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaces: state.workspaces,
        workspaceMeetings: state.workspaceMeetings
      })
    });
    if (res && Array.isArray(res.workspaces) && res.workspaces.length > 0) {
      state.workspaces = res.workspaces;
      state.workspaceMeetings = res.workspaceMeetings || res.workspace_meetings || {};
      try { localStorage.setItem('saamba-workspaces', JSON.stringify(state.workspaces)); } catch (_) {}
      try { localStorage.setItem('saamba-workspace-meetings', JSON.stringify(state.workspaceMeetings)); } catch (_) {}
      if (!state.workspaces.some(w => w.id === state.activeWorkspaceId)) {
        state.activeWorkspaceId = state.workspaces[0].id;
        try { localStorage.setItem('saamba-active-workspace', state.activeWorkspaceId); } catch (_) {}
      }
      renderWorkspaces(state.allMeetingsCache, onWorkspaceChange);
      updateActiveWorkspaceUI();
      if (onWorkspaceChange) onWorkspaceChange();
    }
  } catch (err) {
    console.warn('Workspace sync failed; staying on local state:', err);
  }
}

export function initSidebar(onWorkspaceChange = null) {
  try {
    const savedWs = JSON.parse(localStorage.getItem('saamba-workspaces') || 'null');
    if (Array.isArray(savedWs) && savedWs.length > 0) state.workspaces = savedWs;
  } catch (_) {}

  try {
    state.activeWorkspaceId = localStorage.getItem('saamba-active-workspace') || 'default';
  } catch (_) {}
  if (!state.workspaces.some(w => w.id === state.activeWorkspaceId)) state.activeWorkspaceId = state.workspaces[0].id;

  try {
    state.workspaceMeetings = JSON.parse(localStorage.getItem('saamba-workspace-meetings') || '{}');
  } catch (_) {}

  try { state.sidebarCollapsed = localStorage.getItem('saamba-sidebar-collapsed') === 'true'; } catch (_) {}
  setSidebarCollapsed(state.sidebarCollapsed);

  const sidebarCollapseBtn = $('#sidebar-collapse-btn');
  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', e => {
      e.stopPropagation();
      setSidebarCollapsed(!state.sidebarCollapsed);
    });
  }

  const workspaceToggle = $('#workspace-toggle');
  if (workspaceToggle) {
    workspaceToggle.addEventListener('click', e => {
      if (state.sidebarCollapsed) e.stopPropagation();
    });
  }

  try { state.libraryExpanded = localStorage.getItem('saamba-library-expanded') !== 'false'; } catch (_) {}
  syncLibrary();

  initWorkspaceDialog(onWorkspaceChange);
  updateActiveWorkspaceUI();

  // Async sync with SQLite database
  syncWorkspacesWithServer(onWorkspaceChange);
}
  updateActiveWorkspaceUI();
}
