// static/js/components/speaker-dialog.js - Speaker editor dialog & custom selector
import { $, $$, esc, speakerDisplayName, showToast } from '../utils.js';
import { api } from '../api.js';

let activeSpeakerTarget = null;
let currentMeetingId = null;
let onSpeakerUpdatedCallback = null;

export function renderCustomSelect(containerId, options, initialValue, onSelect) {
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

  trigger.onclick = e => {
    e.stopPropagation();
    const isHidden = optionsDiv.hidden;
    $$('.custom-select-options').forEach(el => el.hidden = true);
    $$('.custom-select-trigger').forEach(el => el.setAttribute('aria-expanded', 'false'));
    optionsDiv.hidden = !isHidden;
    trigger.setAttribute('aria-expanded', String(!isHidden));
  };

  optionsDiv.onclick = e => {
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

export function initSpeakerDialog(onUpdated) {
  onSpeakerUpdatedCallback = onUpdated;
  const speakerDialog = $('#speaker-dialog');
  const speakerClose = $('#speaker-close');
  const speakerCancel = $('#speaker-cancel');
  const speakerForm = $('#speaker-form');
  const speakerInput = $('#speaker-name-input');
  const speakerError = $('#speaker-error');
  const speakerScopeRadios = $$('input[name="speaker-scope"]');
  const speakerInputWrap = $('#speaker-input-wrap');
  const speakerSelectWrap = $('#speaker-select-wrap');

  const closeSpeakerDialog = () => {
    if (speakerDialog) speakerDialog.close();
    if (speakerError) speakerError.textContent = '';
    activeSpeakerTarget = null;
  };

  if (speakerClose) speakerClose.onclick = closeSpeakerDialog;
  if (speakerCancel) speakerCancel.onclick = closeSpeakerDialog;

  speakerScopeRadios.forEach(radio => radio.onchange = () => {
    const isRename = radio.value === 'rename';
    if (isRename) {
      speakerInputWrap.hidden = false;
      speakerSelectWrap.hidden = true;
      speakerInput.required = true;
      speakerInput.value = speakerDisplayName(activeSpeakerTarget?.speaker);
      $('#speaker-name-label').textContent = 'New name';
      speakerInput.focus();
    } else {
      speakerSelectWrap.hidden = false;
      const curReassign = $('#speaker-reassign-select-val')?.value;
      const isCustom = curReassign === '__custom__';
      speakerInputWrap.hidden = !isCustom;
      speakerInput.required = isCustom;
      if (isCustom) speakerInput.focus();
    }
  });

  if (speakerForm) {
    speakerForm.onsubmit = async e => {
      e.preventDefault();
      if (!activeSpeakerTarget || !currentMeetingId) return;
      let payload;
      if (activeSpeakerTarget.mode === 'menu') {
        const fromSpeaker = $('#speaker-target-select-val')?.value;
        const newName = speakerInput.value.trim();
        if (!newName) {
          speakerError.textContent = 'Please specify a new speaker name.';
          return;
        }
        payload = { action: 'rename', from: fromSpeaker, to: newName };
      } else {
        const scope = document.querySelector('input[name="speaker-scope"]:checked')?.value || 'rename';
        if (scope === 'rename') {
          const toSpeaker = speakerInput.value.trim();
          if (!toSpeaker) {
            speakerError.textContent = 'Please specify a speaker name.';
            return;
          }
          payload = { action: 'rename', from: activeSpeakerTarget.speaker, to: toSpeaker };
        } else {
          let toSpeaker = $('#speaker-reassign-select-val')?.value;
          if (toSpeaker === '__custom__') {
            toSpeaker = speakerInput.value.trim();
            if (!toSpeaker) {
              speakerError.textContent = 'Please specify a new speaker name.';
              return;
            }
          }
          payload = { action: 'reassign', index: activeSpeakerTarget.index, speaker: toSpeaker };
        }
      }
      try {
        $('#speaker-save').disabled = true;
        await api(`/api/meetings/${currentMeetingId}/speakers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        closeSpeakerDialog();
        showToast(payload.action === 'rename' ? 'Speaker renamed across all lines.' : 'Line reassigned.');
        if (onSpeakerUpdatedCallback) onSpeakerUpdatedCallback(currentMeetingId);
      } catch (err) {
        speakerError.textContent = err.message;
      } finally {
        $('#speaker-save').disabled = false;
      }
    };
  }
}

export function openSpeakerEditor(meetingId, target, uniqueSpeakers = []) {
  currentMeetingId = meetingId;
  activeSpeakerTarget = target;
  const speakerDialog = $('#speaker-dialog');
  const speakerError = $('#speaker-error');
  const speakerScopeOptions = $('#speaker-scope-options');
  const speakerTargetPickWrap = $('#speaker-target-pick-wrap');
  const speakerScopeSingleWrap = $('#speaker-scope-single-wrap');
  const speakerInputWrap = $('#speaker-input-wrap');
  const speakerSelectWrap = $('#speaker-select-wrap');
  const speakerInput = $('#speaker-name-input');
  if (!speakerDialog) return;

  if (speakerError) speakerError.textContent = '';
  if (target.mode === 'menu') {
    $('#speaker-dialog-title').textContent = 'Edit speakers';
    $('#speaker-dialog-subtitle').textContent = 'Choose a speaker to rename across all dialogue lines.';
    speakerScopeOptions.hidden = true;
    speakerTargetPickWrap.hidden = false;
    speakerInputWrap.hidden = false;
    speakerSelectWrap.hidden = true;
    $('#speaker-name-label').textContent = 'New name';
    speakerInput.required = true;

    const opts = uniqueSpeakers.map(spk => ({ value: spk, label: speakerDisplayName(spk) }));
    const initial = uniqueSpeakers[0] ?? '';
    renderCustomSelect('custom-target-select', opts, initial, val => {
      speakerInput.value = speakerDisplayName(val);
      speakerInput.focus();
      speakerInput.select();
    });
    speakerInput.value = speakerDisplayName(initial);
  } else {
    const currentName = speakerDisplayName(target.speaker);
    $('#speaker-dialog-title').textContent = `Speaker: ${currentName}`;
    $('#speaker-dialog-subtitle').textContent = 'Rename speaker across all lines or reassign this line.';
    speakerScopeOptions.hidden = false;
    speakerTargetPickWrap.hidden = true;
    speakerScopeSingleWrap.hidden = false;
    const reassignRadio = document.querySelector('input[value="reassign"]');
    if (reassignRadio) reassignRadio.checked = true;

    const opts = uniqueSpeakers.map(spk => ({ value: spk, label: speakerDisplayName(spk) })).concat([{ value: '__custom__', label: '+ New speaker name…' }]);
    renderCustomSelect('custom-reassign-select', opts, target.speaker, val => {
      const isCustom = val === '__custom__';
      speakerInputWrap.hidden = !isCustom;
      speakerInput.required = isCustom;
      if (isCustom) {
        speakerInput.value = '';
        speakerInput.focus();
      }
    });
    speakerSelectWrap.hidden = false;
    speakerInputWrap.hidden = true;
    speakerInput.value = '';
    speakerInput.required = false;
    $('#speaker-name-label').textContent = 'Speaker name';
  }
  speakerDialog.showModal();
  if (!speakerInputWrap.hidden) speakerInput.focus();
}
