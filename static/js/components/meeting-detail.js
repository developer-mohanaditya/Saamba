// static/js/components/meeting-detail.js - Meeting header, rename, share, delete, and rewrite actions
import { state } from '../state.js';
import { $, $$, esc, date, icon, busyStatus, statusChip, showToast } from '../utils.js';
import { api } from '../api.js';

export function renderDetailHeaderMarkup(m, canRewrite) {
  return `<div class="detail-header">
    <div class="detail-meta">
      <span class="meeting-date">
        <svg class="date-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right:3px">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        ${esc(date(m.created_at))}
      </span>
      ${busyStatus(m.status) ? `<button type="button" class="subtle-button stop-btn" id="stop-processing-btn" title="Stop processing and revert to saved notes">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true" style="margin-right:4px">
          <rect x="5" y="5" width="14" height="14" rx="2"/>
        </svg>Stop
      </button>` : ''}
      ${canRewrite ? `<div class="share-menu">
        <button class="subtle-button" id="rewrite-toggle" aria-expanded="false">${icon('rewrite')} Rewrite ${icon('chevron')}</button>
        <div class="share-options" id="rewrite-options" hidden>
          <button id="make-summary">${icon('rewrite')}${m.summary ? 'Rewrite' : 'Create'} summary</button>
          <button id="make-transcript">${icon('file')}${m.transcript.length ? 'Rewrite' : 'Create'} transcript</button>
        </div>
      </div>` : ''}
      <div class="share-menu">
        <button class="subtle-button" id="share-toggle" aria-expanded="false">${icon('share')} Share ${icon('chevron')}</button>
        <div class="share-options" id="share-options" hidden>
          <button type="button" id="share-email-btn">${icon('mail')}Send to email</button>
          <button type="button" id="share-link-btn">${icon('link')}Copy link</button>
        </div>
      </div>
      <div class="delete-menu">
        <button class="subtle-button delete-button" id="delete-toggle" aria-label="Delete meeting" aria-expanded="false" ${!canRewrite ? 'disabled' : ''}>${icon('delete')}</button>
        <div class="delete-popover" id="delete-popover" hidden>
          <p>Do you really want to delete?</p>
          <button id="delete-next" type="button">Continue</button>
        </div>
      </div>
      ${statusChip(m.status, !!m.summary && m.transcript.length > 0)}
    </div>
    <div class="title-group">
      <button id="meeting-title" class="meeting-title" title="Click to edit meeting name" aria-label="Edit meeting name">${esc(m.title)}</button>
    </div>
  </div>`;
}

export function initMeetingDetail(m, { onRefresh, onDeleted }) {
  const id = m.id;

  // Inline title editing
  const title = $('#meeting-title');
  if (title) {
    title.onclick = () => {
      state.editing = true;
      const input = document.createElement('input');
      input.className = 'title-input';
      input.value = m.title;
      input.maxLength = 200;
      input.setAttribute('aria-label', 'Meeting name');
      title.replaceWith(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      let done = false;
      const save = async () => {
        if (done) return;
        done = true;
        const value = input.value.trim();
        try {
          if (value && value !== m.title) {
            await api(`/api/meetings/${id}/rename`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: value })
            });
          }
        } catch (e) {
          showToast(e.message || String(e));
        } finally {
          state.editing = false;
          state.current = null;
          if (onRefresh) onRefresh();
        }
      };
      input.onblur = save;
      input.onkeydown = e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.value = m.title;
          input.blur();
        }
      };
    };
  }

  // Rewrite & share menu dropdown toggles
  for (const name of ['share', 'rewrite']) {
    const toggle = $('#' + name + '-toggle');
    const menu = $('#' + name + '-options');
    if (toggle && menu) {
      toggle.onclick = () => {
        const opening = menu.hidden;
        $$('.share-options').forEach(x => x.hidden = true);
        $$('[aria-expanded]').forEach(x => x.setAttribute('aria-expanded', 'false'));
        menu.hidden = !opening;
        toggle.setAttribute('aria-expanded', String(opening));
      };
    }
  }

  // Share link
  const shareLinkBtn = $('#share-link-btn');
  if (shareLinkBtn) {
    shareLinkBtn.onclick = () => {
      const shareOpts = $('#share-options');
      if (shareOpts) shareOpts.hidden = true;
      $('#share-toggle')?.setAttribute('aria-expanded', 'false');
      const shareUrl = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Snapshot link copied to clipboard!');
      }).catch(() => {
        prompt('Copy snapshot link:', shareUrl);
      });
    };
  }

  // Share email
  const shareEmailBtn = $('#share-email-btn');
  if (shareEmailBtn) {
    shareEmailBtn.onclick = () => {
      const shareOpts = $('#share-options');
      if (shareOpts) shareOpts.hidden = true;
      $('#share-toggle')?.setAttribute('aria-expanded', 'false');
      const shareUrl = `${window.location.origin}/share/${id}`;
      const subject = encodeURIComponent(`Meeting Notes: ${m.title}`);
      const body = encodeURIComponent(`Hi,\n\nHere are the notes from our meeting "${m.title}":\n\nRead-only Snapshot: ${shareUrl}\n\nSummary:\n${m.summary || '(Summary in progress)'}\n\nGenerated by Saamba.`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };
  }

  // Delete popover and dialog
  const deleteToggle = $('#delete-toggle');
  const deletePopover = $('#delete-popover');
  if (deleteToggle && deletePopover) {
    deleteToggle.onclick = () => {
      deletePopover.hidden = !deletePopover.hidden;
      deleteToggle.setAttribute('aria-expanded', String(!deletePopover.hidden));
    };
  }

  const deleteNext = $('#delete-next');
  if (deleteNext && deleteToggle && deletePopover) {
    deleteNext.onclick = () => {
      deletePopover.hidden = true;
      deleteToggle.setAttribute('aria-expanded', 'false');
      const errEl = $('#delete-error');
      if (errEl) errEl.textContent = '';
      const dlg = $('#delete-dialog');
      if (dlg) dlg.showModal();
    };
  }

  const deleteForm = $('#delete-form');
  if (deleteForm) {
    deleteForm.onsubmit = async e => {
      e.preventDefault();
      const deleteYes = $('#delete-yes');
      if (deleteYes) deleteYes.disabled = true;
      try {
        await api(`/api/meetings/${id}/delete`, { method: 'POST' });
        const dlg = $('#delete-dialog');
        if (dlg) dlg.close();
        state.selected = null;
        state.current = null;
        state.lastVersion = null;
        const detail = $('#detail');
        if (detail) {
          detail.innerHTML = '<div class="empty"><h2>Choose a meeting.</h2><p>Select a conversation from your library.</p></div>';
        }
        if (onDeleted) await onDeleted();
      } catch (err) {
        const errEl = $('#delete-error');
        if (errEl) errEl.textContent = err.message;
      } finally {
        if (deleteYes) deleteYes.disabled = false;
      }
    };
  }

  const deleteCancel = $('#delete-cancel');
  if (deleteCancel) {
    deleteCancel.onclick = () => {
      const dlg = $('#delete-dialog');
      if (dlg) dlg.close();
    };
  }

  // Rewrite summary & transcript buttons
  for (const [button, action] of [['make-summary', 'summary'], ['make-transcript', 'transcript']]) {
    const el = $('#' + button);
    if (el) {
      el.onclick = async () => {
        const rwOpts = $('#rewrite-options');
        if (rwOpts) rwOpts.hidden = true;
        $('#rewrite-toggle')?.setAttribute('aria-expanded', 'false');
        const execute = async () => {
          try {
            await api(`/api/meetings/${id}/${action}`, { method: 'POST' });
            state.current = null;
            if (onRefresh) onRefresh();
          } catch (e) {
            showToast(e.message || String(e));
          }
        };
        if (action === 'transcript' && m.summary) {
          state.pendingRewriteAction = execute;
          const rd = $('#rewrite-dialog');
          if (rd) rd.showModal();
          else await execute();
        } else {
          await execute();
        }
      };
    }
  }

  // Stop processing buttons
  $$('#stop-processing-btn, #stop-activity-btn').forEach(btn => {
    btn.onclick = () => {
      state.pendingStopAction = async () => {
        btn.disabled = true;
        btn.textContent = 'Stopping…';
        try {
          await api(`/api/meetings/${id}/stop`, { method: 'POST' });
          showToast('Processing stopped. Reverted to previous notes.');
          state.current = null;
          if (onRefresh) await onRefresh();
        } catch (err) {
          showToast(err.message || 'Could not stop processing.');
          btn.disabled = false;
          btn.textContent = 'Stop';
        }
      };
      const dialog = $('#stop-confirm-dialog');
      if (dialog) dialog.showModal();
      else if (state.pendingStopAction) state.pendingStopAction();
    };
  });
}
