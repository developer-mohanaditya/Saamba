// static/js/utils.js - Formatting utilities and helpers

export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

export const time = n => {
  n = Math.floor(Number(n) || 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

export const date = s => new Date(s).toLocaleDateString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export const busyStatus = s => ['queued', 'transcribing', 'summarizing'].includes(s);

export const statusText = s => ({
  queued: 'Getting ready',
  transcribing: 'Creating transcript',
  summarizing: 'Creating summary',
  recording: 'Recording',
  ready: 'Ready',
  error: 'Needs attention',
  'needs setup': 'Setup needed'
}[s] || s);

export const spinner = () => '<span class="spinner" aria-hidden="true"></span>';

export const statusChip = (s, notes = false) => `<span class="status-chip ${busyStatus(s) ? 'is-busy' : ''} ${s === 'error' ? 'is-error' : ''}">${busyStatus(s) ? spinner() : ''}${esc(s === 'error' && notes ? 'Notes saved · last attempt failed' : statusText(s))}${busyStatus(s) ? '…' : ''}</span>`;

export const activity = (title, detail, canStop = false) => `<div class="activity" role="status">${spinner()}<div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>${canStop ? `<button type="button" class="subtle-button stop-activity-btn" id="stop-activity-btn" title="Stop processing and revert">Stop</button>` : ''}</div>`;

export const inline = value => esc(value)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

export const speakerDisplayName = spk => {
  if (spk == null) return '';
  const s = String(spk).trim();
  const m = s.match(/^(?:SPEAKER_?|speaker\s*)(\d+)$/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return `Speaker ${num >= 0 && num <= 9 ? num + 1 : num}`;
  }
  return s;
};

export const icon = name => ({
  rewrite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5 10a7 7 0 0 1 12-3l3 5M19 14a7 7 0 0 1-12 3l-3-5"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v6h14v-6"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-2 2M14 11a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l2-2"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>',
  chevron: '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
  translate: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>'
}[name]);

export function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  const span = toast.querySelector('span');
  if (span) span.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000);
}
