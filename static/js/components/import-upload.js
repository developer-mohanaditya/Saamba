// static/js/components/import-upload.js - File import & upload modal dialog
import { state } from '../state.js';
import { $ } from '../utils.js';
import { api } from '../api.js';

export function initImportDialog(onMeetingImported) {
  const audioInput = $('#audio');
  const fileClearRow = $('#file-clear-row');
  const fileChosenName = $('#file-chosen-name');
  const fileRemoveBtn = $('#file-remove-btn');
  const titleInput = $('#title');
  const importDialog = $('#import-dialog');
  const uploadForm = $('#upload-form');

  if (titleInput) {
    titleInput.oninput = () => {
      state.titleManuallyEdited = titleInput.value.trim().length > 0;
    };
  }

  function updateFileSelection() {
    const file = audioInput && audioInput.files && audioInput.files[0];
    if (file) {
      if (fileChosenName) fileChosenName.textContent = file.name;
      if (fileClearRow) fileClearRow.hidden = false;
    } else {
      if (fileChosenName) fileChosenName.textContent = '';
      if (fileClearRow) fileClearRow.hidden = true;
    }
  }

  const openImport = () => {
    updateFileSelection();
    if (importDialog) importDialog.showModal();
  };

  const importBtn = $('#import-button');
  if (importBtn) importBtn.onclick = openImport;
  const emptyImportBtn = $('#empty-import');
  if (emptyImportBtn) emptyImportBtn.onclick = openImport;

  const closeDialogBtn = $('#close-dialog');
  if (closeDialogBtn) {
    closeDialogBtn.onclick = () => {
      if (importDialog) importDialog.close();
      if (uploadForm) uploadForm.reset();
      state.titleManuallyEdited = false;
      if (audioInput) delete audioInput.dataset.autoTitle;
      updateFileSelection();
    };
  }

  if (fileRemoveBtn) {
    fileRemoveBtn.onclick = () => {
      if (audioInput) {
        audioInput.value = '';
        updateFileSelection();
        if (titleInput) titleInput.value = '';
        state.titleManuallyEdited = false;
        delete audioInput.dataset.autoTitle;
      }
    };
  }

  if (audioInput) {
    audioInput.onchange = e => {
      updateFileSelection();
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const currentTitle = titleInput ? titleInput.value.trim() : '';
      const isAutoAssigned = !state.titleManuallyEdited || !currentTitle || currentTitle.startsWith('Meeting · ') || (audioInput && audioInput.dataset.autoTitle === currentTitle);
      if (isAutoAssigned) {
        const rawBase = file.name.replace(/\.[^.]+$/, '').trim();
        const cleaned = rawBase.replace(/[_-]+/g, ' ').trim();
        const isGeneric = /^(video|audio|recording|meeting|screen\s*recording|untitled|track|output|zoom\s*\d*|media|file)(\s*\d+)?$/i.test(cleaned);
        let newTitle = '';
        if (isGeneric || !cleaned) {
          const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          newTitle = 'Meeting · ' + today;
        } else {
          newTitle = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        if (titleInput) titleInput.value = newTitle;
        if (audioInput) audioInput.dataset.autoTitle = newTitle;
        state.titleManuallyEdited = false;
      }
    };
  }

  if (uploadForm) {
    uploadForm.onsubmit = async e => {
      e.preventDefault();
      const file = audioInput && audioInput.files && audioInput.files[0];
      if (!file) return;
      const submitBtn = $('#submit');
      const uploadError = $('#upload-error');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Importing…';
      }
      if (uploadError) uploadError.textContent = '';
      try {
        const titleVal = titleInput ? titleInput.value : '';
        const uploadHeaders = {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Meeting-Title': encodeURIComponent(titleVal)
        };
        if (state.activeWorkspaceId && state.activeWorkspaceId !== 'default') {
          uploadHeaders['X-Workspace-Id'] = state.activeWorkspaceId;
        }
        const m = await api('/api/meetings', {
          method: 'POST',
          headers: uploadHeaders,
          body: file
        });
        if (importDialog) importDialog.close();
        uploadForm.reset();
        state.titleManuallyEdited = false;
        if (audioInput) delete audioInput.dataset.autoTitle;
        updateFileSelection();
        state.selected = m.id;
        if (state.activeWorkspaceId && state.activeWorkspaceId !== 'default') {
          if (!state.workspaceMeetings[state.activeWorkspaceId]) state.workspaceMeetings[state.activeWorkspaceId] = [];
          if (!state.workspaceMeetings[state.activeWorkspaceId].includes(m.id)) {
            state.workspaceMeetings[state.activeWorkspaceId].push(m.id);
            try { localStorage.setItem('saamba-workspace-meetings', JSON.stringify(state.workspaceMeetings)); } catch (_) {}
            api(`/api/workspaces/${state.activeWorkspaceId}/meetings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meeting_id: m.id, action: 'add' })
            }).catch(() => {});
          }
        }
        state.current = null;
        if (onMeetingImported) await onMeetingImported();
      } catch (err) {
        if (uploadError) uploadError.textContent = err.message;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Import meeting';
        }
      }
    };
  }
}
