// static/js/components/media-pane.js - Audio/video player synchronization, waveform, and export downloads
import { state } from '../state.js';
import { $, esc, icon, spinner, showToast } from '../utils.js';
import { api } from '../api.js';

export function syncMediaPane() {
  const pane = $('#media-pane');
  const btn = $('#media-collapse-btn');
  if (!pane || !btn) return;
  pane.classList.toggle('is-collapsed', state.mediaCollapsed);
  btn.setAttribute('aria-expanded', String(!state.mediaCollapsed));
  btn.setAttribute('title', state.mediaCollapsed ? 'Expand media player' : 'Collapse media player');
  btn.setAttribute('aria-label', state.mediaCollapsed ? 'Expand media player' : 'Collapse media player');
}

export function renderMediaPaneMarkup(m) {
  const id = m.id;
  const video = m.mime && m.mime.startsWith('video/');
  return `<aside class="media-pane" id="media-pane">
    <div class="media-heading">
      <h3>Return to the moment</h3>
      <div class="media-actions">
        ${m.status !== 'recording' ? `<div class="share-menu download-menu">
          <button type="button" id="download-toggle" class="download-toggle" aria-expanded="false" ${state.downloads.has(id) ? 'disabled' : ''}>
            <span class="download-label">${state.downloads.has(id) ? (spinner() + ' ' + (state.downloadProgress[id] || 'Preparing…')) : ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg> Download')}</span>
            <span class="download-chevron">${icon('chevron')}</span>
          </button>
          <div class="share-options" id="download-options" hidden>
            <button type="button" data-download="mp4" ${video ? '' : 'disabled'}>Video · MP4</button>
            <button type="button" data-download="webm" ${video ? '' : 'disabled'}>Video · WebM</button>
            <button type="button" data-download="mp3">Audio · MP3</button>
            <button type="button" data-download="audio-webm">Audio · WebM</button>
          </div>
        </div>` : ''}
        <button id="media-collapse-btn" type="button" class="subtle-button media-collapse-btn" aria-label="Collapse media player" aria-expanded="true" title="Collapse media player">
          <svg class="media-chevron-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>
        </button>
      </div>
    </div>
    <div class="media-body" id="media-body">
      ${m.status === 'recording'
        ? '<p class="notice">Recording in progress. Audio playback is available after you stop.</p><button class="retry" id="recover-live">Finish saved recording</button>'
        : `${video ? '' : '<div class="waveform" aria-hidden="true">' + Array.from({ length: 42 }, (_, i) => `<i style="height:${10 + ((i * 23 + 19) % 37)}px"></i>`).join('') + '</div>'}<${video ? 'video' : 'audio'} id="player" controls preload="metadata" src="/api/meetings/${esc(id)}/audio"></${video ? 'video' : 'audio'}>${video ? '' : '<p class="hint">Audio recording. Video was not saved for this meeting.</p>'}`}
    </div>
  </aside>`;
}

export async function handleDownload(m, format) {
  const id = m.id;
  if (state.downloads.has(id)) return;
  state.downloads.add(id);
  const options = $('#download-options');
  if (options) options.hidden = true;

  const updateLabel = (text) => {
    state.downloadProgress[id] = text;
    const cur = document.querySelector('#download-toggle .download-label');
    if (cur) cur.innerHTML = spinner() + ' ' + text;
  };

  const toggle = $('#download-toggle');
  if (toggle) {
    toggle.disabled = true;
    toggle.setAttribute('aria-expanded', 'false');
  }
  updateLabel('Preparing…');

  try {
    const response = await fetch(`/api/meetings/${encodeURIComponent(id)}/download?format=${encodeURIComponent(format)}`);
    if (!response.ok) {
      let message = 'Could not prepare the download.';
      try { message = (await response.json()).error || message; } catch (_) {}
      throw Error(message);
    }
    const totalHeader = response.headers.get('content-length') || response.headers.get('x-total-bytes');
    const total = parseInt(totalHeader || '0', 10);
    let loaded = 0;
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
      if (total > 0) {
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        const mbTotal = (total / (1024 * 1024)).toFixed(1);
        updateLabel(`Downloading ${pct}% (${mbLoaded}/${mbTotal}MB)`);
      } else {
        updateLabel(`Downloading ${mbLoaded}MB`);
      }
    }
    const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = (m.title.replace(/[\\/\x00-\x1f\x7f]/g, ' ').trim().slice(0, 120) || 'Meeting') + (format === 'audio-webm' ? '.webm' : '.' + format);
    const disp = response.headers.get('content-disposition');
    if (disp && disp.includes("filename*=UTF-8''")) {
      try { filename = decodeURIComponent(disp.split("filename*=UTF-8''")[1].split(';')[0]); } catch (_) {}
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    showToast(error.message);
  } finally {
    state.downloads.delete(id);
    delete state.downloadProgress[id];
    if (state.current === id) {
      const t = $('#download-toggle');
      if (t) {
        t.disabled = false;
        const l = t.querySelector('.download-label');
        if (l) l.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg> Download';
      }
    }
  }
}

export function initMediaPlayer(m, prevPosition = 0, wasPlaying = false, onRefresh = null) {
  const player = $('#player');
  if (player) {
    if (prevPosition) player.currentTime = prevPosition;
    if (wasPlaying) player.play().catch(() => {});
    let active = null;
    const updateWave = () => {
      const progress = Number.isFinite(player.duration) && player.duration > 0 ? player.currentTime / player.duration : 0;
      document.querySelectorAll('.waveform i').forEach((bar, i, all) => bar.classList.toggle('played', (i + 0.5) / all.length <= progress));
    };
    player.addEventListener('seeked', updateWave);
    player.addEventListener('loadedmetadata', updateWave);
    player.addEventListener('timeupdate', () => {
      updateWave();
      const activeContent = document.querySelector('.tab-content:not([hidden])');
      if (player.paused || !activeContent || activeContent.id === 'summary') return;
      const all = [...activeContent.querySelectorAll('.segment')];
      let target = null;
      for (const item of all) {
        if (Number(item.dataset.time) <= player.currentTime) target = item;
        else break;
      }
      if (target !== active) {
        if (active) active.classList.remove('is-playing');
        active = target;
        if (active) {
          active.classList.add('is-playing');
          if (!active.hidden) {
            const scroller = $('#notes-scroll');
            if (scroller) {
              const top = active.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (scroller.clientHeight - active.offsetHeight) / 2;
              scroller.scrollTo({ top, behavior: 'smooth' });
            }
          }
        }
      }
    });

    document.querySelectorAll('.segment').forEach(b => {
      b.onclick = () => {
        player.currentTime = Number(b.dataset.time);
        player.play().catch(() => {});
      };
    });
  }

  // Bind download toggle
  const downloadToggle = $('#download-toggle');
  const downloadMenu = $('#download-options');
  if (downloadToggle && downloadMenu) {
    downloadToggle.onclick = () => {
      const opening = downloadMenu.hidden;
      document.querySelectorAll('.share-options').forEach(x => x.hidden = true);
      document.querySelectorAll('[aria-expanded]').forEach(x => x.setAttribute('aria-expanded', 'false'));
      downloadMenu.hidden = !opening;
      downloadToggle.setAttribute('aria-expanded', String(opening));
    };
  }

  // Bind download format buttons
  document.querySelectorAll('[data-download]').forEach(button => {
    button.onclick = async () => {
      await handleDownload(m, button.dataset.download);
    };
  });

  // Media collapse button
  const mediaCollapseBtn = $('#media-collapse-btn');
  if (mediaCollapseBtn) {
    mediaCollapseBtn.onclick = (e) => {
      e.stopPropagation();
      state.mediaCollapsed = !state.mediaCollapsed;
      try { localStorage.setItem('saamba-media-collapsed', String(state.mediaCollapsed)); } catch (_) {}
      syncMediaPane();
    };
  }

  // Media pane click when collapsed to expand
  const mediaPane = $('#media-pane');
  if (mediaPane) {
    mediaPane.onclick = (e) => {
      if (!state.mediaCollapsed) return;
      if (e.target.closest('.download-menu') || e.target.closest('#media-collapse-btn')) return;
      state.mediaCollapsed = false;
      try { localStorage.setItem('saamba-media-collapsed', 'false'); } catch (_) {}
      syncMediaPane();
    };
  }

  // Recover live button
  const recoverLive = $('#recover-live');
  if (recoverLive) {
    recoverLive.onclick = async () => {
      if (window.capture && window.capture.id === m.id) {
        showToast('Use Stop recording to finish the active meeting.');
        return;
      }
      try {
        await api(`/api/live/${m.id}/finish`, { method: 'POST' });
        state.current = null;
        if (onRefresh) onRefresh();
      } catch (e) {
        showToast(e.message || String(e));
      }
    };
  }

  syncMediaPane();
}
