const testMenu = document.querySelector('.test-menu');
document.addEventListener('click', event => { if (testMenu && !testMenu.contains(event.target)) testMenu.open=false; });

const workspaceSidebar = document.querySelector('.workspace-sidebar');
const workspaceToggle = document.querySelector('#workspace-toggle');
const libraryPane = document.querySelector('.library');
const contentPane = document.querySelector('.content');
const libraryToggle = document.querySelector('#library-toggle');
const sidebarCollapseBtn = document.querySelector('#sidebar-collapse-btn');
let sidebarCollapsed = false;
try { sidebarCollapsed = localStorage.getItem('saamba-sidebar-collapsed') === 'true'; } catch (_) {}
function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  document.querySelector('.app').classList.toggle('sidebar-collapsed', collapsed);
  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.setAttribute('aria-expanded', String(!collapsed));
    sidebarCollapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    sidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }
  try { localStorage.setItem('saamba-sidebar-collapsed', String(collapsed)); } catch (_) {}
}
setSidebarCollapsed(sidebarCollapsed);
if (sidebarCollapseBtn) {
  sidebarCollapseBtn.addEventListener('click', e => {
    e.stopPropagation();
    setSidebarCollapsed(!sidebarCollapsed);
  });
}
workspaceToggle.addEventListener('click', (e) => {
  if (sidebarCollapsed) {
    e.stopPropagation();
    return;
  }
});
let libraryExpanded = true;
try { libraryExpanded = localStorage.getItem('saamba-library-expanded') !== 'false'; } catch (_) {}
function syncLibrary() {
  if (libraryPane) {
    libraryPane.classList.toggle('is-collapsed', !libraryExpanded);
    libraryPane.setAttribute('aria-hidden', String(!libraryExpanded));
  }
  if (libraryToggle) {
    libraryToggle.setAttribute('aria-expanded', String(libraryExpanded));
  }
  const activeNavItem = document.querySelector('.workspace-nav-item.active');
  if (activeNavItem) {
    activeNavItem.setAttribute('aria-expanded', String(libraryExpanded));
  }
}
syncLibrary();
libraryToggle.addEventListener('click', (e) => {
  if (sidebarCollapsed) {
    e.stopPropagation();
    setSidebarCollapsed(false);
    if (!libraryExpanded) {
      libraryExpanded = true;
      try { localStorage.setItem('saamba-library-expanded', 'true'); } catch (_) {}
      syncLibrary();
    }
    return;
  }
  libraryExpanded = !libraryExpanded;
  try { localStorage.setItem('saamba-library-expanded', String(libraryExpanded)); } catch (_) {}
  syncLibrary();
});

const WORKSPACE_ICONS = {
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

let workspaces = [
  { id: 'default', name: 'My meetings', icon: 'users' }
];
try {
  const savedWs = JSON.parse(localStorage.getItem('saamba-workspaces') || 'null');
  if (Array.isArray(savedWs) && savedWs.length > 0) workspaces = savedWs;
} catch (_) {}

let activeWorkspaceId = 'default';
try {
  activeWorkspaceId = localStorage.getItem('saamba-active-workspace') || 'default';
} catch (_) {}
if (!workspaces.some(w => w.id === activeWorkspaceId)) activeWorkspaceId = workspaces[0].id;

let workspaceMeetings = {};
try {
  workspaceMeetings = JSON.parse(localStorage.getItem('saamba-workspace-meetings') || '{}');
} catch (_) {}

function updateActiveWorkspaceUI() {
  const currentWs = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const h1 = document.querySelector('header h1');
  const eyebrow = document.querySelector('header .eyebrow');
  if (h1) h1.innerHTML = `${esc(currentWs.name)}<span>.</span>`;
  if (eyebrow) eyebrow.textContent = currentWs.id === 'default' ? 'Your workspace' : `Workspace · ${currentWs.name}`;
  document.querySelectorAll('.workspace-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workspaceId === activeWorkspaceId);
  });
}

let allMeetingsCache = [];
function renderWorkspaces(allMeetings = allMeetingsCache) {
  if (Array.isArray(allMeetings) && allMeetings.length > 0) allMeetingsCache = allMeetings;
  const list = document.querySelector('#workspace-list');
  if (!list) return;

  list.innerHTML = workspaces.map(ws => {
    const iconSvg = WORKSPACE_ICONS[ws.icon] || WORKSPACE_ICONS.briefcase;
    let count = 0;
    if (ws.id === 'default') {
      count = allMeetingsCache.length;
    } else {
      const ids = workspaceMeetings[ws.id] || [];
      count = allMeetingsCache.filter(m => ids.includes(m.id)).length;
    }
    const isActive = ws.id === activeWorkspaceId;
    const chevronSvg = isActive
      ? `<svg class="nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>`
      : '';
    return `<button type="button" class="workspace-nav-item ${isActive ? 'active' : ''}" data-workspace-id="${esc(ws.id)}" title="${esc(ws.name)}" aria-label="${esc(ws.name)}" aria-expanded="${isActive ? String(libraryExpanded) : 'false'}">
      <span class="nav-icon" aria-hidden="true">${iconSvg}</span>
      <span class="workspace-title">${esc(ws.name)}</span>
      <span class="workspace-count">${count}</span>
      ${chevronSvg}
    </button>`;
  }).join('');

  list.querySelectorAll('.workspace-nav-item').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const wsId = btn.dataset.workspaceId;
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
        activeWorkspaceId = wsId;
        libraryExpanded = true;
        try { localStorage.setItem('saamba-active-workspace', activeWorkspaceId); } catch (_) {}
        try { localStorage.setItem('saamba-library-expanded', 'true'); } catch (_) {}
        syncLibrary();
        updateActiveWorkspaceUI();
        refresh();
        return;
      }
      if (wsId === activeWorkspaceId) {
        libraryExpanded = !libraryExpanded;
        try { localStorage.setItem('saamba-library-expanded', String(libraryExpanded)); } catch (_) {}
        syncLibrary();
        btn.setAttribute('aria-expanded', String(libraryExpanded));
        return;
      }
      activeWorkspaceId = wsId;
      try { localStorage.setItem('saamba-active-workspace', activeWorkspaceId); } catch (_) {}
      libraryExpanded = true;
      try { localStorage.setItem('saamba-library-expanded', 'true'); } catch (_) {}
      syncLibrary();
      updateActiveWorkspaceUI();
      refresh();
    };
  });
}

function initWorkspaceDialog() {
  const workspaceDialog = document.querySelector('#workspace-dialog');
  const createWorkspaceBtn = document.querySelector('#create-workspace-btn');
  const closeWorkspaceDialog = document.querySelector('#close-workspace-dialog');
  const workspaceCancel = document.querySelector('#workspace-cancel');
  const workspaceForm = document.querySelector('#workspace-form');
  const iconPickerGrid = document.querySelector('#icon-picker-grid');
  const workspaceIconInput = document.querySelector('#workspace-icon-input');
  const workspaceNameInput = document.querySelector('#workspace-name-input');
  const workspaceError = document.querySelector('#workspace-error');

  if (iconPickerGrid) {
    iconPickerGrid.innerHTML = Object.entries(WORKSPACE_ICONS).map(([key, svg]) => {
      return `<button type="button" class="icon-picker-tile ${key === 'briefcase' ? 'is-selected' : ''}" data-icon="${key}" aria-label="${key}" title="${key}">${svg}</button>`;
    }).join('');

    iconPickerGrid.querySelectorAll('.icon-picker-tile').forEach(tile => {
      tile.onclick = () => {
        iconPickerGrid.querySelectorAll('.icon-picker-tile').forEach(t => t.classList.remove('is-selected'));
        tile.classList.add('is-selected');
        workspaceIconInput.value = tile.dataset.icon;
      };
    });
  }

  if (createWorkspaceBtn && workspaceDialog) {
    createWorkspaceBtn.onclick = (e) => {
      e.stopPropagation();
      if (sidebarCollapsed) setSidebarCollapsed(false);
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
    workspaceForm.onsubmit = (e) => {
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
        icon: iconKey
      };
      workspaces.push(newWs);
      try { localStorage.setItem('saamba-workspaces', JSON.stringify(workspaces)); } catch (_) {}
      activeWorkspaceId = newWs.id;
      try { localStorage.setItem('saamba-active-workspace', activeWorkspaceId); } catch (_) {}
      workspaceDialog.close();
      showToast(`Workspace "${name}" created.`);
      refresh();
    };
  }
}
initWorkspaceDialog();
const $ = s => document.querySelector(s);
let selected = null, current = null, lastVersion = null, editing = false;
const chats = {};
const downloads = new Set();
let mediaCollapsed = false;
try { mediaCollapsed = localStorage.getItem('saamba-media-collapsed') === 'true'; } catch (_) {}
function syncMediaPane() {
  const pane = document.querySelector('#media-pane');
  const btn = document.querySelector('#media-collapse-btn');
  if (!pane || !btn) return;
  pane.classList.toggle('is-collapsed', mediaCollapsed);
  btn.setAttribute('aria-expanded', String(!mediaCollapsed));
  btn.setAttribute('title', mediaCollapsed ? 'Expand media player' : 'Collapse media player');
  btn.setAttribute('aria-label', mediaCollapsed ? 'Expand media player' : 'Collapse media player');
}
function showToast(message){const toast=$('#toast');toast.querySelector('span').textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3000);}
$('#toast button').onclick=()=>$('#toast').hidden=true;
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = n => { n=Math.floor(Number(n)||0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
const date = s => new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const busyStatus = s => ['queued','transcribing','summarizing'].includes(s);
const statusText = s => ({queued:'Getting ready',transcribing:'Creating transcript',summarizing:'Creating summary',recording:'Recording',ready:'Ready',error:'Needs attention','needs setup':'Setup needed'}[s]||s);
const icon = name => ({rewrite:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5 10a7 7 0 0 1 12-3l3 5M19 14a7 7 0 0 1-12 3l-3-5"/></svg>', share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v6h14v-6"/></svg>',delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>',mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',link:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-2 2M14 11a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l2-2"/></svg>',file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>',chevron:'<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>'}[name]);
const spinner = () => '<span class="spinner" aria-hidden="true"></span>';
const statusChip = (s,notes=false) => `<span class="status-chip ${busyStatus(s)?'is-busy':''} ${s==='error'?'is-error':''}">${busyStatus(s)?spinner():''}${esc(s==='error'&&notes?'Notes saved · last attempt failed':statusText(s))}${busyStatus(s)?'…':''}</span>`;
const activity = (title,detail) => `<div class="activity" role="status">${spinner()}<div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div></div>`;
const inline = value => esc(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
const speakerDisplayName = spk => {
  if (spk == null) return '';
  if (typeof spk === 'number') return `Speaker ${spk + 1}`;
  if (!isNaN(Number(spk))) return `Speaker ${Number(spk) + 1}`;
  return String(spk);
};
// Render a small, safe subset of Markdown; all model content is escaped first.
function markdown(text) {
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
function summarySections(m) {
  const sections=[]; let section={title:'',lines:[]};
  for(const line of String(m.summary||'').split(/\r?\n/)){
    const heading=line.match(/^\s*#{1,4}\s+(.+?)\s*$/)||line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if(heading){if(section.title||section.lines.some(x=>x.trim()))sections.push(section);section={title:heading[1],lines:[]};}else section.lines.push(line);
  }
  if(section.title||section.lines.some(x=>x.trim()))sections.push(section);
  return sections.map((part,i)=>{
    const cleanTitle=part.title.replace(/^\d+[\.\)]\s*/,'').trim();
    const isAction=/^(action items?|next steps)\s*:?$/i.test(cleanTitle);
    let body=markdown(part.lines.join('\n'));
    if(isAction && m.action_items?.length){
      body='<div class="action-list">'+m.action_items.map(a=>{
        let spk = a.speaker;
        let itemText = a.text;
        if(!spk) {
          const mSpk = itemText.match(/(?:\[|\()\s*(Speaker\s*\w+|[A-Z][a-z]+)\s*(?:\]|\))/i);
          if(mSpk) {
            spk = mSpk[1].trim();
            itemText = itemText.replace(mSpk[0], ' ');
          }
        }
        itemText = itemText.replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
        const citationHtml = a.start!=null
          ? `<button type="button" class="action-citation" data-citation="${a.start}">Listen at ${time(a.start)}</button>`
          : '<span class="action-citation-unavailable">Source timestamp unavailable</span>';
        return `<div class="action-row ${a.checked?'is-checked':''}"><div class="action-item-content"><input type="checkbox" class="action-checkbox" data-action="${esc(a.key)}" ${a.checked?'checked':''} aria-label="Mark action item complete"><span class="action-text">${inline(itemText)}</span></div><div class="action-meta">${spk?`<span class="action-speaker">${esc(spk)}</span><span class="action-meta-dot" aria-hidden="true">·</span>`:''}${citationHtml}</div></div>`;
      }).join('')+'</div>';
    }
    return `<section class="summary-section" ${isAction?'id="action-section"':''}><div class="summary-heading"><h3>${esc(part.title)}</h3><button class="copy-section" data-section="${i}" aria-label="Copy ${esc(part.title||'section')}" title="Copy section"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>${body}</section>`;
  }).join('');
}
function summaryContent(m) {
  if(m.status==='queued')return activity('Getting things ready','Your recording is saved.');
  if(m.status==='transcribing')return activity('Creating your transcript','Follow along in the Transcript tab.');
  if(m.status==='summarizing')return activity('Creating your English summary',m.summary_preview?`Draft sections ready: ${m.summary_preview.completed} of ${m.summary_preview.total}. The final summary may change.`:'Working through the transcript. Draft sections will appear as they are ready.')+(m.summary_preview?`<div class="draft-label">DRAFT · WORK IN PROGRESS</div><div class="summary-text">${markdown(m.summary_preview.content)}</div>`:'');
  if(m.status==='recording'&&!m.summary)return '<p class="muted">The summary can be created after the recording ends.</p>';
  if(m.summary)return `<div class="summary-text">${summarySections(m)}</div>`;
  if(m.status==='error')return '<p class="muted">The summary could not be created. See the message above for details.</p>';
  return `<p class="muted">${m.transcript.length?'Your transcript is available. Choose Create summary to make an English summary.':'Create a transcript first to make a summary.'}</p>`;
}

function getMeetingSuggestions(m) {
  if (!m || !m.summary) {
    return [
      'Draft a follow-up email',
      'What action items were assigned?',
      'What were the key takeaways from this meeting?'
    ].sort((a, b) => a.length - b.length);
  }
  const suggestions = [];
  const summary = m.summary;

  const boldMatches = [...summary.matchAll(/\*\*(.+?)\:\*\*/g)].map(x => x[1].trim());
  const sectionHeadings = [...summary.matchAll(/^\s*#{1,4}\s+(.+?)\s*$/gm)]
    .map(x => x[1].replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(h => !/^(summary|action items?|next steps)\b/i.test(h));

  if (boldMatches.length > 0) {
    const topic = boldMatches[0].replace(/[:\-]/g, '').trim();
    suggestions.push(`Tell me more about ${topic.toLowerCase()}`);
  } else if (sectionHeadings.includes('Decisions') || /decisions?/i.test(summary)) {
    suggestions.push('What key decisions were finalized?');
  } else {
    suggestions.push('What were the most important takeaways?');
  }

  if (m.action_items && m.action_items.length > 0) {
    const uncompleted = m.action_items.filter(a => !a.checked).length;
    if (uncompleted > 0) {
      suggestions.push(`What are the next steps for the ${uncompleted} open action items?`);
    } else {
      suggestions.push('Help me plan the follow-ups for this call.');
    }
  } else if (boldMatches.length > 1) {
    const topic = boldMatches[1].replace(/[:\-]/g, '').trim();
    suggestions.push(`What was discussed regarding ${topic.toLowerCase()}?`);
  } else {
    suggestions.push('Anything left unresolved or needing follow-up?');
  }

  if (boldMatches.length > 2) {
    const topic = boldMatches[2].replace(/[:\-]/g, '').trim();
    suggestions.push(`Summarize discussion on ${topic.toLowerCase()}`);
  } else if (m.title && !m.title.toLowerCase().startsWith('untitled')) {
    suggestions.push(`Draft a recap email for "${m.title}"`);
  } else {
    suggestions.push('Draft a follow-up email to attendees');
  }

  return suggestions.slice(0, 3).sort((a, b) => a.length - b.length);
}

function renderCustomSelect(containerId, options, initialValue, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const trigger = container.querySelector('.custom-select-trigger');
  const valueSpan = container.querySelector('.custom-select-value');
  const optionsDiv = container.querySelector('.custom-select-options');
  const hiddenInput = container.parentElement.querySelector('input[type="hidden"]');
  const checkSvg = `<svg class="check-icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;

  let currentValue = initialValue != null ? String(initialValue) : (options[0]?.value != null ? String(options[0].value) : '');

  const updateUI = () => {
    optionsDiv.innerHTML = options.map(opt => {
      const isSelected = String(opt.value) === currentValue;
      return `<button type="button" class="custom-select-option ${isSelected ? 'is-selected' : ''}" data-val="${esc(opt.value)}">
        <span>${esc(opt.label)}</span>
        ${isSelected ? checkSvg : ''}
      </button>`;
    }).join('');

    const matched = options.find(o => String(o.value) === currentValue) || options[0];
    if (matched) {
      valueSpan.textContent = matched.label;
      if (hiddenInput) hiddenInput.value = matched.value;
    }
  };

  updateUI();

  trigger.onclick = (e) => {
    e.stopPropagation();
    const isHidden = optionsDiv.hidden;
    document.querySelectorAll('.custom-select-options').forEach(el => el.hidden = true);
    document.querySelectorAll('.custom-select-trigger').forEach(el => el.setAttribute('aria-expanded', 'false'));
    optionsDiv.hidden = !isHidden;
    trigger.setAttribute('aria-expanded', String(!isHidden));
  };

  optionsDiv.onclick = (e) => {
    const btn = e.target.closest('.custom-select-option');
    if (!btn) return;
    e.stopPropagation();
    currentValue = btn.dataset.val;
    updateUI();
    optionsDiv.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (onSelect) onSelect(currentValue);
  };
}

async function api(url,options){const r=await fetch(url,options),v=await r.json();if(!r.ok)throw Error(v.error||'Something went wrong');return v;}
async function refresh(){
  const allMeetings=await api('/api/meetings');
  renderWorkspaces(allMeetings);
  updateActiveWorkspaceUI();
  let meetings = allMeetings;
  if (activeWorkspaceId && activeWorkspaceId !== 'default') {
    const ids = workspaceMeetings[activeWorkspaceId] || [];
    meetings = allMeetings.filter(m => ids.includes(m.id));
  }
  const countEl = $('#count');
  if (countEl) {
    countEl.textContent=String(meetings.length);
    countEl.setAttribute('aria-label',`${meetings.length} ${meetings.length===1?'meeting':'meetings'}`);
  }
  if(!selected&&meetings.length)selected=meetings[0].id;
  if(selected&&!meetings.some(m=>m.id===selected)){
    selected=meetings.length?meetings[0].id:null;
  }
  if(!meetings.length){
    const wsName = (workspaces.find(w => w.id === activeWorkspaceId) || {}).name || 'workspace';
    $('#detail').innerHTML=`<div class="empty"><div class="empty-icon">♫</div><h2>${activeWorkspaceId==='default'?'Make room for the conversation.':`No meetings in ${esc(wsName)} yet.`}</h2><p>${activeWorkspaceId==='default'?'Import a recording to bring your notes, transcript, and audio together.':'Import a new recording while this workspace is selected to add meetings here.'}</p><button class="primary" id="empty-import">Import a meeting</button></div>`;
    $('#empty-import').onclick=()=>$('#import-dialog').showModal();
  }
  $('#meetings').innerHTML=meetings.length?meetings.map(m=>`<button class="meeting ${selected===m.id?'selected':''}" data-id="${esc(m.id)}" title="${esc(m.title)}"><span class="meeting-icon">♫</span><span class="meeting-copy"><strong>${esc(m.title)}</strong><small>${esc(date(m.created_at))}</small></span></button>`).join(''):`<div class="list-empty">No meetings in this workspace.<br>Start with a recording.</div>`;
  document.querySelectorAll('.meeting').forEach(b=>b.onclick=()=>openMeeting(b.dataset.id));
  if(selected&&!editing)await openMeeting(selected,false);
}
function transcriptActivity(m){if(m.status==='transcribing')return activity('Creating your transcript','More passages will appear here as they are ready.');if(m.status==='recording')return activity('Listening for speech','New transcript segments will appear here as they are ready.');return m.transcript.length?'':'<p class="muted">No transcript yet.</p>';}
async function openMeeting(id,rerender=true){
  selected=id;const m=await api(`/api/meetings/${id}`);if(rerender){await refresh();return;}
  if(!chats[id]){const messages=await api(`/api/meetings/${id}/chat`);if(selected!==id)return;chats[id]={messages,scope:'this',collapsed:false,question:''};}
  const version=JSON.stringify([m.id,m.title,m.status,m.error,m.summary,m.summary_preview,m.transcript,m.mime,m.action_items]);if(current===id&&lastVersion===version)return;lastVersion=version;
  const same=current===id,oldPlayer=$('#player'),position=same?oldPlayer?.currentTime||0:0,playing=same&&oldPlayer&&!oldPlayer.paused;
  const previousTab=same&&document.querySelector('.tab.active')?.dataset.tab; const activeTab=previousTab||(m.status==='recording'?'transcript':'summary');
  const searchTerm=same?($('#search')?.value||''):'';const oldScroll=same?($('#notes-scroll')?.scrollTop||0):0;current=id;
  const canRewrite=!busyStatus(m.status)&&m.status!=='recording';
  const video=m.mime.startsWith('video/');
  const totalActions=m.action_items?.length||0;
  const checkedActions=m.action_items?.filter(a=>a.checked).length||0;
  const actionCounterText=totalActions>0?`${checkedActions}/${totalActions}`:'0';
  const uniqueSpeakers=[]; const seenSpeakers=new Set();
  for(const s of m.transcript){
    if(s.speaker!=null){
      const name = speakerDisplayName(s.speaker);
      if(!seenSpeakers.has(name)){
        seenSpeakers.add(name);
        uniqueSpeakers.push(s.speaker);
      }
    }
  }
  const speakerBar='';
  const editIcon = `<svg class="speaker-edit-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
  const segments=m.transcript.map((s,idx)=>`<button class="segment" data-time="${Number(s.start)||0}"><span class="segment-time">${time(s.start)}</span><span class="segment-body">${s.speaker==null?'':`<span class="speaker-tag" data-speaker="${esc(s.speaker)}" data-index="${idx}" title="Click to rename or reassign speaker"><strong>${esc(speakerDisplayName(s.speaker))}</strong><span class="speaker-edit-btn" aria-hidden="true">${editIcon}</span></span>`}<span>${esc(s.text)}</span></span></button>`).join('');
  $('#detail').innerHTML=`<div class="notes-card"><div class="detail-header"><div class="detail-meta"><span class="meeting-date"><svg class="date-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right:3px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${esc(date(m.created_at))}</span>${canRewrite?`<div class="share-menu"><button class="subtle-button" id="rewrite-toggle" aria-expanded="false">${icon('rewrite')} Rewrite ${icon('chevron')}</button><div class="share-options" id="rewrite-options" hidden><button id="make-transcript">${icon('file')}${m.transcript.length?'Rewrite':'Create'} transcript</button><button id="make-summary">${icon('rewrite')}${m.summary?'Rewrite':'Create'} summary</button></div></div>`:''}<div class="share-menu"><button class="subtle-button" id="share-toggle" aria-expanded="false">${icon('share')} Share ${icon('chevron')}</button><div class="share-options" id="share-options" hidden><button disabled>${icon('mail')}Send to email</button><button disabled>${icon('link')}Copy link</button></div></div><div class="delete-menu"><button class="subtle-button delete-button" id="delete-toggle" aria-label="Delete meeting" aria-expanded="false" ${!canRewrite?'disabled':''}>${icon('delete')}</button><div class="delete-popover" id="delete-popover" hidden><p>Do you really want to delete?</p><button id="delete-next" type="button">Continue</button></div></div>${statusChip(m.status,!!m.summary&&m.transcript.length>0)}</div><div class="title-group"><button id="meeting-title" class="meeting-title" title="Click to edit meeting name" aria-label="Edit meeting name">${esc(m.title)}</button></div></div>${m.error?`<p class="notice">${esc(m.error)}</p>`:''}<div class="meeting-workspace"><section class="notes-pane"><div class="tabs"><button class="tab ${activeTab==='summary'?'active':''}" data-tab="summary">Summary ${m.status==='summarizing'?spinner():''}</button><button class="tab action-tab ${activeTab==='actions'?'active':''}" data-tab="actions">Action items <span class="action-count">${actionCounterText}</span></button><div class="transcript-tab-wrapper"><button class="tab ${activeTab==='transcript'?'active':''}" data-tab="transcript">${m.status==='recording'?'Live transcript':'Transcript'} ${m.status==='transcribing'?spinner():''}</button><div class="transcript-menu-wrap" id="transcript-menu-wrap" ${activeTab==='transcript'?'':'hidden'}><button type="button" class="transcript-more-btn" id="transcript-more-btn" aria-label="Transcript options" title="Transcript options">⋮</button><div class="transcript-dropdown" id="transcript-dropdown" hidden><button type="button" id="menu-edit-speakers"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>Edit speakers</button><button type="button" id="menu-translate" disabled title="Coming soon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Translate</button></div></div></div><div id="search-wrap" class="search-wrap" ${activeTab==='transcript'?'':'hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><input id="search" class="search" placeholder="Search transcript" aria-label="Search transcript"></div></div>${m.transcript.length && m.transcript.every(s=>s.speaker==null)?`<p class="speaker-note" id="speaker-note" ${activeTab==='transcript'?'':'hidden'}>Speaker identification is not available for this recording.</p>`:''}<div class="notes-scroll" id="notes-scroll"><div id="summary" class="tab-content" ${['summary','actions'].includes(activeTab)?'':'hidden'}>${summaryContent(m)}</div><div id="transcript" class="tab-content" ${activeTab==='transcript'?'':'hidden'}>${speakerBar}<div id="segments">${segments}${transcriptActivity(m)}</div></div></div></section></div></div><aside class="media-pane" id="media-pane"><div class="media-heading"><h3>Return to the moment</h3><div class="media-actions">${m.status!=='recording'?`<div class="share-menu download-menu"><button type="button" id="download-toggle" class="download-toggle" aria-expanded="false" ${downloads.has(id)?'disabled':''}><span class="download-label">${downloads.has(id)?spinner():'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg>'} ${downloads.has(id)?'Downloading…':'Download'}</span><span class="download-chevron">${icon('chevron')}</span></button><div class="share-options" id="download-options" hidden><button type="button" data-download="mp4" ${video?'':'disabled'}>Video · MP4</button><button type="button" data-download="webm" ${video?'':'disabled'}>Video · WebM</button><button type="button" data-download="mp3">Audio · MP3</button><button type="button" data-download="audio-webm">Audio · WebM</button></div></div>`:''}<button id="media-collapse-btn" type="button" class="subtle-button media-collapse-btn" aria-label="Collapse media player" aria-expanded="true" title="Collapse media player"><svg class="media-chevron-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg></button></div></div><div class="media-body" id="media-body">${m.status==='recording'?'<p class="notice">Recording in progress. Audio playback is available after you stop.</p><button class="retry" id="recover-live">Finish saved recording</button>':`${video?'':'<div class="waveform" aria-hidden="true">'+Array.from({length:42},(_,i)=>`<i style="height:${10+((i*23+19)%37)}px"></i>`).join('')+'</div>'}<${video?'video':'audio'} id="player" controls preload="metadata" src="/api/meetings/${esc(id)}/audio"></${video?'video':'audio'}>${video?'':'<p class="hint">Audio recording. Video was not saved for this meeting.</p>'}`}</div></aside><section class="ask-panel" id="ask-panel"><div class="ask-head"><div class="ask-title"><svg class="ask-ai-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="9,2 16,11 9,20 2,11"/><polygon points="17,4 22,9 17,14 12,9" opacity="0.85"/></svg> <span>Ask Saamba</span></div><button id="ask-collapse" type="button" aria-label="Collapse Ask Saamba" aria-expanded="true">${icon('chevron')}</button></div><div id="ask-body"><div class="ask-content"><div class="suggestions" id="suggestions"><div class="suggestions-intro">Try these:</div><div class="suggestions-list">${getMeetingSuggestions(m).map(q=>`<button type="button" class="suggestion-pill" data-question="${esc(q)}"><svg class="suggestion-action-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span class="suggestion-text">${esc(q)}</span></button>`).join('')}</div></div><div class="chat-messages" aria-live="polite"></div></div><form id="ask-form"><button id="ask-expand" type="button" class="ask-expand-brand" aria-label="Expand Ask Saamba" aria-expanded="false"><svg class="ask-ai-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><polygon points="9,2 16,11 9,20 2,11"/><polygon points="17,4 22,9 17,14 12,9" opacity="0.85"/></svg> <span class="ask-expand-label">Ask Saamba</span></button><input id="ask-input" type="text" maxlength="2000" placeholder="Ask about your meetings…" aria-label="Ask Saamba" required><div class="ask-controls"><div class="share-menu scope-menu"><button type="button" class="subtle-button" id="ask-scope-toggle" aria-expanded="false">This call ${icon('chevron')}</button><div class="share-options" id="ask-scope-options" hidden><button type="button" data-scope="this">This call</button><button type="button" data-scope="mine">My meetings</button><button type="button" disabled>Team calls</button><button type="button" disabled>All calls</button></div></div><button class="ask-send" type="submit" aria-label="Send question"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></form></div></section>`;
  const title=$('#meeting-title');title.onclick=()=>{
    editing=true;const input=document.createElement('input');input.className='title-input';input.value=m.title;input.maxLength=200;input.setAttribute('aria-label','Meeting name');title.replaceWith(input);input.focus();input.setSelectionRange(input.value.length,input.value.length);let done=false;
    const save=async()=>{if(done)return;done=true;const value=input.value.trim();try{if(value&&value!==m.title)await api(`/api/meetings/${id}/rename`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:value})});}catch(e){alert(e.message);}finally{editing=false;current=null;refresh();}};
    input.onblur=save;input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.value=m.title;input.blur();}};
  };
  for(const name of ['share','rewrite','download']){const toggle=$('#'+name+'-toggle'),menu=$('#'+name+'-options');if(toggle)toggle.onclick=()=>{const opening=menu.hidden;document.querySelectorAll('.share-options').forEach(x=>x.hidden=true);document.querySelectorAll('[aria-expanded]').forEach(x=>x.setAttribute('aria-expanded','false'));menu.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));};}
  document.querySelectorAll('[data-download]').forEach(button=>button.onclick=async()=>{
    if(downloads.has(id))return;
    const format=button.dataset.download;downloads.add(id);$('#download-options').hidden=true;
    const toggle=$('#download-toggle');toggle.disabled=true;toggle.setAttribute('aria-expanded','false');toggle.querySelector('.download-label').innerHTML=spinner()+' Downloading…';
    try{
      const response=await fetch(`/api/meetings/${encodeURIComponent(id)}/download?format=${encodeURIComponent(format)}`);
      if(!response.ok){let message='Could not prepare the download.';try{message=(await response.json()).error||message;}catch(_){}throw Error(message);}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download=(m.title.replace(/[\\/\x00-\x1f\x7f]/g,' ').trim().slice(0,120)||'Meeting')+(format==='audio-webm'?'.webm':'.'+format);
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){showToast(error.message);}finally{downloads.delete(id);if(current===id){const t=$('#download-toggle');if(t){t.disabled=false;t.querySelector('.download-label').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg> Download';}}}
  });
  const deleteToggle=$('#delete-toggle'),deletePopover=$('#delete-popover');
  deleteToggle.onclick=()=>{deletePopover.hidden=!deletePopover.hidden;deleteToggle.setAttribute('aria-expanded',String(!deletePopover.hidden));};
  $('#delete-next').onclick=()=>{deletePopover.hidden=true;deleteToggle.setAttribute('aria-expanded','false');$('#delete-error').textContent='';$('#delete-dialog').showModal();};
  $('#delete-form').onsubmit=async e=>{e.preventDefault();$('#delete-yes').disabled=true;try{await api(`/api/meetings/${id}/delete`,{method:'POST'});$('#delete-dialog').close();selected=null;current=null;lastVersion=null;$('#detail').innerHTML='<div class="empty"><h2>Choose a meeting.</h2><p>Select a conversation from your library.</p></div>';await refresh();}catch(err){$('#delete-error').textContent=err.message;}finally{$('#delete-yes').disabled=false;}};
  for(const [button,action] of [['make-transcript','transcript'],['make-summary','summary']]){const el=$('#'+button);if(el)el.onclick=async()=>{if(action==='transcript'&&m.summary&&!confirm('A new transcript will remove the current summary. Continue?'))return;try{await api(`/api/meetings/${id}/${action}`,{method:'POST'});current=null;refresh();}catch(e){alert(e.message);}};}
  if($('#recover-live'))$('#recover-live').onclick=async()=>{if(capture&&capture.id===id){alert('Use Stop recording to finish the active meeting.');return;}try{await api(`/api/live/${id}/finish`,{method:'POST'});current=null;refresh();}catch(e){alert(e.message);}};
  const search=$('#search');search.value=searchTerm;search.oninput=()=>document.querySelectorAll('.segment').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(search.value.toLowerCase()));search.dispatchEvent(new Event('input'));
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{const isTranscript=b.dataset.tab==='transcript';const action=b.dataset.tab==='actions';document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-content').forEach(x=>x.hidden=x.id!==(action?'summary':b.dataset.tab));$('#search-wrap').hidden=!isTranscript;const menuWrap=$('#transcript-menu-wrap');if(menuWrap)menuWrap.hidden=!isTranscript;const drop=$('#transcript-dropdown');if(drop)drop.hidden=true;const note=$('#speaker-note');if(note)note.hidden=!isTranscript;if(action){const target=$('#action-section');if(target)$('#notes-scroll').scrollTop=target.offsetTop-$('#notes-scroll').offsetTop;else showToast('No action items are available yet.');}else $('#notes-scroll').scrollTop=0;});
  document.querySelectorAll('[data-action]').forEach(box=>box.onchange=async()=>{
    box.closest('.action-row')?.classList.toggle('is-checked', box.checked);const desired=box.checked;box.disabled=true;try{await api(`/api/meetings/${id}/action-check`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:box.dataset.action,checked:desired})});const item=m.action_items.find(a=>a.key===box.dataset.action);if(item)item.checked=desired;const total=m.action_items.length;const checked=m.action_items.filter(a=>a.checked).length;$('.action-count').textContent=`${checked}/${total}`;$('.action-count').setAttribute('aria-label',`${checked} of ${total} completed`);lastVersion=JSON.stringify([m.id,m.title,m.status,m.error,m.summary,m.summary_preview,m.transcript,m.mime,m.action_items]);}catch(e){box.checked=!desired;showToast(e.message);}finally{box.disabled=false;}});
  document.querySelectorAll('.copy-section').forEach(button=>button.onclick=async()=>{const section=button.closest('.summary-section');try{const copy=section.cloneNode(true);copy.querySelectorAll('button').forEach(el=>el.remove());await navigator.clipboard.writeText(copy.innerText.trim());showToast('Section copied.');}catch(e){showToast('Could not copy this section.');}});
  document.querySelectorAll('[data-citation]').forEach(button=>button.onclick=()=>{const player=$('#player');if(player){player.currentTime=Number(button.dataset.citation);player.play().catch(()=>{});}});
  const speakerDialog=$('#speaker-dialog'),speakerForm=$('#speaker-form'),speakerClose=$('#speaker-close'),speakerCancel=$('#speaker-cancel');
  const speakerInput=$('#speaker-name-input'),speakerScopeRadios=document.querySelectorAll('input[name="speaker-scope"]');
  const speakerScopeOptions=$('#speaker-scope-options'),speakerScopeSingleWrap=$('#speaker-scope-single-wrap');
  const speakerTargetPickWrap=$('#speaker-target-pick-wrap');
  const speakerInputWrap=$('#speaker-input-wrap'),speakerSelectWrap=$('#speaker-select-wrap'),speakerError=$('#speaker-error');
  let activeSpeakerTarget=null;
  const closeSpeakerDialog=()=>{if(speakerDialog)speakerDialog.close();if(speakerError)speakerError.textContent='';activeSpeakerTarget=null;};
  if(speakerClose)speakerClose.onclick=closeSpeakerDialog;if(speakerCancel)speakerCancel.onclick=closeSpeakerDialog;
  const openSpeakerEditor=(target)=>{
    activeSpeakerTarget=target;if(speakerError)speakerError.textContent='';
    if(target.mode==='menu'){
      $('#speaker-dialog-title').textContent='Edit speakers';
      $('#speaker-dialog-subtitle').textContent='Choose a speaker to rename across all dialogue lines.';
      speakerScopeOptions.hidden=true;
      speakerTargetPickWrap.hidden=false;
      speakerInputWrap.hidden=false;
      speakerSelectWrap.hidden=true;
      $('#speaker-name-label').textContent='New name';
      speakerInput.required=true;

      const opts = uniqueSpeakers.map(spk=>({value:spk, label:speakerDisplayName(spk)}));
      const initial = uniqueSpeakers[0] ?? '';
      renderCustomSelect('custom-target-select', opts, initial, (val)=>{
        speakerInput.value=speakerDisplayName(val);
        speakerInput.focus();
        speakerInput.select();
      });
      speakerInput.value=speakerDisplayName(initial);
    } else {
      const currentName=speakerDisplayName(target.speaker);
      $('#speaker-dialog-title').textContent=`Speaker: ${currentName}`;
      $('#speaker-dialog-subtitle').textContent='Rename speaker across all lines or reassign this line.';
      speakerScopeOptions.hidden=false;
      speakerTargetPickWrap.hidden=true;
      speakerScopeSingleWrap.hidden=false;
      document.querySelector('input[value="reassign"]').checked=true;

      const opts = uniqueSpeakers.map(spk=>({value:spk, label:speakerDisplayName(spk)})).concat([{value:'__custom__', label:'+ New speaker name…'}]);
      renderCustomSelect('custom-reassign-select', opts, target.speaker, (val)=>{
        const isCustom=val==='__custom__';
        speakerInputWrap.hidden=!isCustom;
        speakerInput.required=isCustom;
        if(isCustom){speakerInput.value='';speakerInput.focus();}
      });
      speakerSelectWrap.hidden=false;
      speakerInputWrap.hidden=true;
      speakerInput.value='';
      speakerInput.required=false;
      $('#speaker-name-label').textContent='Speaker name';
    }
    speakerDialog.showModal();if(!speakerInputWrap.hidden)speakerInput.focus();
  };
  speakerScopeRadios.forEach(radio=>radio.onchange=()=>{
    const isRename=radio.value==='rename';
    if(isRename){
      speakerInputWrap.hidden=false;speakerSelectWrap.hidden=true;speakerInput.required=true;speakerInput.value=speakerDisplayName(activeSpeakerTarget?.speaker);$('#speaker-name-label').textContent='New name';speakerInput.focus();
    } else {
      speakerSelectWrap.hidden=false;
      const curReassign=$('#speaker-reassign-select-val')?.value;
      const isCustom=curReassign==='__custom__';
      speakerInputWrap.hidden=!isCustom;speakerInput.required=isCustom;
      if(isCustom)speakerInput.focus();
    }
  });
  const moreBtn=$('#transcript-more-btn'),moreDrop=$('#transcript-dropdown');
  if(moreBtn&&moreDrop){
    moreBtn.onclick=e=>{
      e.stopPropagation();
      const open=moreDrop.hidden;
      document.querySelectorAll('.share-options, .transcript-dropdown').forEach(x=>{if(x!==moreDrop)x.hidden=true;});
      moreDrop.hidden=!open;
    };
  }
  const menuEditSpk=$('#menu-edit-speakers');
  if(menuEditSpk){
    menuEditSpk.onclick=e=>{
      e.stopPropagation();
      if(moreDrop)moreDrop.hidden=true;
      openSpeakerEditor({mode:'menu'});
    };
  }
  if(speakerForm)speakerForm.onsubmit=async e=>{
    e.preventDefault();if(!activeSpeakerTarget)return;
    let payload;
    if(activeSpeakerTarget.mode==='menu'){
      const fromSpeaker=$('#speaker-target-select-val').value;
      const newName=speakerInput.value.trim();
      if(!newName){speakerError.textContent='Please specify a new speaker name.';return;}
      payload={action:'rename',from:fromSpeaker,to:newName};
    } else {
      const scope=document.querySelector('input[name="speaker-scope"]:checked')?.value||'rename';
      if(scope==='rename'){
        const toSpeaker=speakerInput.value.trim();
        if(!toSpeaker){speakerError.textContent='Please specify a speaker name.';return;}
        payload={action:'rename',from:activeSpeakerTarget.speaker,to:toSpeaker};
      } else {
        let toSpeaker=$('#speaker-reassign-select-val').value;
        if(toSpeaker==='__custom__'){
          toSpeaker=speakerInput.value.trim();
          if(!toSpeaker){speakerError.textContent='Please specify a new speaker name.';return;}
        }
        payload={action:'reassign',index:activeSpeakerTarget.index,speaker:toSpeaker};
      }
    }
    try{
      $('#speaker-save').disabled=true;
      await api(`/api/meetings/${id}/speakers`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      closeSpeakerDialog();showToast(payload.action==='rename'?'Speaker renamed across all lines.':'Line reassigned.');
      current=null;await openMeeting(id,false);
    }catch(err){speakerError.textContent=err.message;}finally{$('#speaker-save').disabled=false;}
  };
  document.querySelectorAll('.speaker-tag').forEach(tag=>tag.onclick=e=>{e.stopPropagation();openSpeakerEditor({mode:'tag',speaker:tag.dataset.speaker,index:Number(tag.dataset.index)});});
  const chat=chats[id];
  const chatPanel=$('#ask-panel'),chatInput=$('#ask-input'),chatScope=$('#ask-scope-toggle'),scopeMenu=$('#ask-scope-options'),chatMessages=$('.chat-messages');
  const chatContent=$('.ask-content'),suggestions=$('.suggestions');
  const renderChat=()=>{suggestions.hidden=!!chat.messages.length||!!chatInput.value.trim();chatMessages.innerHTML=chat.messages.map(x=>`<div class="chat-message ${esc(x.role)}">${x.role==='assistant'?markdown(x.text):esc(x.text)}</div>`).join('');chatContent.scrollTop=chatContent.scrollHeight;};
  const setCollapsed=collapsed=>{chat.collapsed=collapsed;chatPanel.classList.toggle('is-collapsed',collapsed);$('#ask-collapse').setAttribute('aria-expanded',String(!collapsed));$('#ask-expand').setAttribute('aria-expanded',String(!collapsed));scopeMenu.hidden=true;chatScope.setAttribute('aria-expanded','false');};
  setCollapsed(chat.collapsed);$('#ask-collapse').onclick=()=>setCollapsed(true);$('#ask-expand').onclick=()=>setCollapsed(false);
  const updateScope=()=>{chatScope.innerHTML=(chat.scope==='mine'?'My meetings':'This call')+' '+icon('chevron');};updateScope();
  chatScope.onclick=()=>{if(chat.collapsed)setCollapsed(false);const opening=scopeMenu.hidden;document.querySelectorAll('.share-options').forEach(x=>x.hidden=true);document.querySelectorAll('[aria-expanded]').forEach(x=>{if(x!==$('#ask-collapse')&&x!==$('#ask-expand'))x.setAttribute('aria-expanded','false');});scopeMenu.hidden=!opening;chatScope.setAttribute('aria-expanded',String(opening));};
  scopeMenu.querySelectorAll('[data-scope]').forEach(option=>option.onclick=()=>{chat.scope=option.dataset.scope;updateScope();scopeMenu.hidden=true;chatScope.setAttribute('aria-expanded','false');});
  chatInput.value=chat.question;chatInput.onfocus=()=>{if(chat.collapsed)setCollapsed(false);};chatInput.oninput=()=>{chat.question=chatInput.value;suggestions.hidden=!!chat.messages.length||!!chat.question.trim();};renderChat();
  document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{chatInput.value=b.dataset.question;chat.question=chatInput.value;suggestions.hidden=true;chatInput.focus();});
  $('#ask-form').onsubmit=async e=>{e.preventDefault();if(chat.collapsed)setCollapsed(false);const question=chatInput.value.trim();if(!question||chat.pending)return;chat.pending=true;chat.messages.push({role:'user',text:question});chatInput.value='';chat.question='';renderChat();const send=$('.ask-send');send.disabled=true;try{const response=await api('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,scope:chat.scope,meeting_id:id})});chat.messages.push({role:'assistant',text:response.answer});}catch(err){chat.messages.push({role:'assistant',text:err.message});}finally{chat.pending=false;if(current===id){send.disabled=false;renderChat();}}};
  const player=$('#player');if(player){if(position)player.currentTime=position;if(playing)player.play().catch(()=>{});let active=null;const updateWave=()=>{const progress=Number.isFinite(player.duration)&&player.duration>0?player.currentTime/player.duration:0;document.querySelectorAll('.waveform i').forEach((bar,i,all)=>bar.classList.toggle('played',(i+0.5)/all.length<=progress));};player.addEventListener('seeked',updateWave);player.addEventListener('loadedmetadata',updateWave);player.addEventListener('timeupdate',()=>{updateWave();if(player.paused||$('#transcript').hidden)return;const all=[...document.querySelectorAll('.segment')];let target=null;for(const item of all){if(Number(item.dataset.time)<=player.currentTime)target=item;else break;}if(target!==active){if(active)active.classList.remove('is-playing');active=target;if(active){active.classList.add('is-playing');if(!active.hidden){const scroller=$('#notes-scroll');const top=active.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-(scroller.clientHeight-active.offsetHeight)/2;scroller.scrollTo({top,behavior:'smooth'});}}}});document.querySelectorAll('.segment').forEach(b=>b.onclick=()=>{player.currentTime=Number(b.dataset.time);player.play().catch(()=>{});});}
  syncMediaPane();
  const mediaCollapseBtn = $('#media-collapse-btn');
  if (mediaCollapseBtn) {
    mediaCollapseBtn.onclick = (e) => {
      e.stopPropagation();
      mediaCollapsed = !mediaCollapsed;
      try { localStorage.setItem('saamba-media-collapsed', String(mediaCollapsed)); } catch (_) {}
      syncMediaPane();
    };
  }
  const mediaPane = $('#media-pane');
  if (mediaPane) {
    mediaPane.onclick = (e) => {
      if (!mediaCollapsed) return;
      if (e.target.closest('.download-menu') || e.target.closest('#media-collapse-btn')) return;
      mediaCollapsed = false;
      try { localStorage.setItem('saamba-media-collapsed', 'false'); } catch (_) {}
      syncMediaPane();
    };
  }
  $('#notes-scroll').scrollTop=oldScroll;
}
const audioInput=$('#audio'),fileClearRow=$('#file-clear-row'),fileChosenName=$('#file-chosen-name'),fileRemoveBtn=$('#file-remove-btn');
let titleManuallyEdited=false;
const titleInput=$('#title');
if(titleInput){titleInput.oninput=()=>{titleManuallyEdited=titleInput.value.trim().length>0;};}
function updateFileSelection(){
  const file=audioInput&&audioInput.files&&audioInput.files[0];
  if(file){if(fileChosenName)fileChosenName.textContent=file.name;if(fileClearRow)fileClearRow.hidden=false;}
  else{if(fileChosenName)fileChosenName.textContent='';if(fileClearRow)fileClearRow.hidden=true;}
}
$('#import-button').onclick=$('#empty-import').onclick=()=>{updateFileSelection();$('#import-dialog').showModal();};
$('#close-dialog').onclick=()=>{$('#import-dialog').close();$('#upload-form').reset();titleManuallyEdited=false;if(audioInput)delete audioInput.dataset.autoTitle;updateFileSelection();};
if(fileRemoveBtn){
  fileRemoveBtn.onclick=()=>{
    if(audioInput){
      audioInput.value='';
      updateFileSelection();
      $('#title').value='';
      titleManuallyEdited=false;
      delete audioInput.dataset.autoTitle;
    }
  };
}
$('#audio').onchange=e=>{
  updateFileSelection();
  const file=e.target.files&&e.target.files[0];
  if(!file)return;
  const currentTitle=$('#title').value.trim();
  const isAutoAssigned=!titleManuallyEdited||!currentTitle||currentTitle.startsWith('Meeting · ')||(audioInput&&audioInput.dataset.autoTitle===currentTitle);
  if(isAutoAssigned){
    const rawBase=file.name.replace(/\.[^.]+$/, "").trim();
    const cleaned=rawBase.replace(/[_-]+/g, " ").trim();
    const isGeneric=/^(video|audio|recording|meeting|screen\s*recording|untitled|track|output|zoom\s*\d*|media|file)(\s*\d+)?$/i.test(cleaned);
    let newTitle='';
    if(isGeneric||!cleaned){
      const today=new Date().toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"});
      newTitle="Meeting · "+today;
    }else{
      newTitle=cleaned.charAt(0).toUpperCase()+cleaned.slice(1);
    }
    $('#title').value=newTitle;
    if(audioInput)audioInput.dataset.autoTitle=newTitle;
    titleManuallyEdited=false;
  }
};
$('#upload-form').onsubmit=async e=>{
  e.preventDefault();
  const file=$('#audio').files[0];
  if(!file)return;
  $('#submit').disabled=true;
  $('#submit').textContent='Importing…';
  $('#upload-error').textContent='';
  try{
    const m=await api('/api/meetings',{
      method:'POST',
      headers:{'Content-Type':file.type||'application/octet-stream','X-Meeting-Title':encodeURIComponent($('#title').value)},
      body:file
    });
    $('#import-dialog').close();
    e.target.reset();
    titleManuallyEdited=false;
    if(audioInput)delete audioInput.dataset.autoTitle;
    updateFileSelection();
    selected=m.id;
    if (activeWorkspaceId && activeWorkspaceId !== 'default') {
      if (!workspaceMeetings[activeWorkspaceId]) workspaceMeetings[activeWorkspaceId] = [];
      if (!workspaceMeetings[activeWorkspaceId].includes(m.id)) {
        workspaceMeetings[activeWorkspaceId].push(m.id);
        try { localStorage.setItem('saamba-workspace-meetings', JSON.stringify(workspaceMeetings)); } catch (_) {}
      }
    }
    current=null;
    await refresh();
  }catch(err){
    $('#upload-error').textContent=err.message;
  }finally{
    $('#submit').disabled=false;
    $('#submit').textContent='Import meeting';
  }
};
refresh().catch(e=>$('#meetings').textContent=e.message);setInterval(()=>refresh().catch(()=>{}),5000);

$('#delete-cancel').onclick=()=>$('#delete-dialog').close();
document.addEventListener('click',e=>{
  if(!e.target.closest('.custom-select')){
    document.querySelectorAll('.custom-select-options').forEach(x=>x.hidden=true);
    document.querySelectorAll('.custom-select-trigger').forEach(x=>x.setAttribute('aria-expanded','false'));
  }
  if(!e.target.closest('.share-menu')&&!e.target.closest('.transcript-menu-wrap')){document.querySelectorAll('.share-options, .transcript-dropdown').forEach(x=>x.hidden=true);document.querySelectorAll('#share-toggle,#rewrite-toggle,#ask-scope-toggle,#download-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));}
  if(!e.target.closest('.delete-menu')){const pop=$('#delete-popover');if(pop)pop.hidden=true;const toggle=$('#delete-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');}
  if(!e.target.closest('.notes-card, .media-pane, dialog')){const player=$('#player');if(player&&!player.paused)player.pause();}
});
