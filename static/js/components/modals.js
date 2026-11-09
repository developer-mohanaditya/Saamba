// static/js/components/modals.js - Modal dialog controllers
import { state } from '../state.js';
import { $, $$, showToast } from '../utils.js';
import { api } from '../api.js';

export function initTranslateDialog(openMeetingFn) {
  const translateDialog = $('#translate-dialog');
  const translateForm = $('#translate-form');
  const translateClose = $('#close-translate-dialog');
  const translateCancel = $('#translate-cancel');
  const translateError = $('#translate-error');
  if (!translateDialog) return;

  const closeDialog = () => {
    translateDialog.close();
    if (translateError) translateError.textContent = '';
  };
  if (translateClose) translateClose.onclick = closeDialog;
  if (translateCancel) translateCancel.onclick = closeDialog;

  $$('.lang-chip').forEach(chip => {
    chip.onclick = () => {
      $$('.lang-chip').forEach(c => c.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      const codeInput = $('#translate-target-code');
      const nameInput = $('#translate-target-name');
      if (codeInput) codeInput.value = chip.dataset.code;
      if (nameInput) nameInput.value = chip.dataset.name;
    };
  });

  if (translateForm) {
    translateForm.onsubmit = e => {
      e.preventDefault();
      const targetMid = translateForm.dataset.meetingId;
      if (!targetMid) return;
      const code = $('#translate-target-code')?.value || 'en';
      const name = $('#translate-target-name')?.value || 'English';

      closeDialog();
      state.dismissedTranslationByMeeting[targetMid] = false;
      try { localStorage.removeItem(`saamba-active-tab-${targetMid}`); } catch (_) {}

      state.activeTranslationByMeeting[targetMid] = {
        code,
        name,
        status: 'loading',
        error: null,
        data: state.translationsCache[`${targetMid}:${code}`] || null
      };

      state.current = null;
      if (openMeetingFn) openMeetingFn(targetMid, false, `trans-${code}`);

      if (state.translationsCache[`${targetMid}:${code}`]) {
        state.activeTranslationByMeeting[targetMid].status = 'ready';
        state.activeTranslationByMeeting[targetMid].data = state.translationsCache[`${targetMid}:${code}`];
        state.current = null;
        if (openMeetingFn) openMeetingFn(targetMid, false, `trans-${code}`);
        return;
      }

      api(`/api/meetings/${targetMid}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language_code: code, language_name: name })
      }).then(result => {
        state.translationsCache[`${targetMid}:${code}`] = result;
        if (state.activeTranslationByMeeting[targetMid]?.code === code) {
          state.activeTranslationByMeeting[targetMid] = {
            code,
            name,
            status: 'ready',
            error: null,
            data: result
          };
          if (state.current === targetMid && openMeetingFn) {
            state.current = null;
            openMeetingFn(targetMid, false, `trans-${code}`);
          }
          showToast(`Conversation translated into ${name}.`);
        }
      }).catch(err => {
        if (state.activeTranslationByMeeting[targetMid]?.code === code) {
          state.activeTranslationByMeeting[targetMid] = {
            code,
            name,
            status: 'error',
            error: err.message || 'Translation failed.',
            data: null
          };
          if (state.current === targetMid && openMeetingFn) {
            state.current = null;
            openMeetingFn(targetMid, false, `trans-${code}`);
          }
        }
      });
    };
  }
}

export function openTranslateModal(meetingId) {
  const translateDialog = $('#translate-dialog');
  const translateForm = $('#translate-form');
  const translateError = $('#translate-error');
  if (!translateDialog) return;
  translateForm.dataset.meetingId = meetingId;
  if (translateError) translateError.textContent = '';

  const activeTrans = state.activeTranslationByMeeting[meetingId];
  const targetCode = activeTrans?.code || 'en';
  $$('.lang-chip').forEach(chip => {
    chip.classList.toggle('is-selected', chip.dataset.code === targetCode);
  });
  const codeInput = $('#translate-target-code');
  const nameInput = $('#translate-target-name');
  if (codeInput) codeInput.value = targetCode;
  const selectedChip = document.querySelector(`.lang-chip[data-code="${targetCode}"]`);
  if (nameInput && selectedChip) nameInput.value = selectedChip.dataset.name;

  translateDialog.showModal();
}

export function initRewriteDialog() {
  const rewriteDialog = $('#rewrite-dialog');
  const rewriteForm = $('#rewrite-form');
  const rewriteClose = $('#close-rewrite-dialog');
  const rewriteCancel = $('#rewrite-cancel');
  if (!rewriteDialog) return;

  const closeDialog = () => {
    rewriteDialog.close();
    state.pendingRewriteAction = null;
  };
  if (rewriteClose) rewriteClose.onclick = closeDialog;
  if (rewriteCancel) rewriteCancel.onclick = closeDialog;
  if (rewriteForm) {
    rewriteForm.onsubmit = async e => {
      e.preventDefault();
      const fn = state.pendingRewriteAction;
      closeDialog();
      if (fn) await fn();
    };
  }
}

export function initStopConfirmDialog() {
  const dialog = $('#stop-confirm-dialog');
  const closeBtn = $('#close-stop-confirm-dialog');
  const cancelBtn = $('#stop-confirm-cancel');
  const form = $('#stop-confirm-form');
  if (!dialog) return;

  const close = () => {
    dialog.close();
    state.pendingStopAction = null;
  };
  if (closeBtn) closeBtn.onclick = close;
  if (cancelBtn) cancelBtn.onclick = close;
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const action = state.pendingStopAction;
      close();
      if (action) await action();
    };
  }
}

export function initDialogBackdropClose() {
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  });
}
