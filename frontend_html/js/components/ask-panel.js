// static/js/components/ask-panel.js - Ask Saamba chat panel & AI question assistant
import { state } from '../state.js';
import { $, esc, icon } from '../utils.js';
import { api } from '../api.js';

export function getMeetingSuggestions(m) {
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

export function renderAskPanelMarkup(m) {
  const suggestions = getMeetingSuggestions(m);
  return `<section class="ask-panel" id="ask-panel">
    <div class="ask-head">
      <div class="ask-title">
        <svg class="ask-ai-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <polygon points="9,2 16,11 9,20 2,11"/>
          <polygon points="17,4 22,9 17,14 12,9" opacity="0.85"/>
        </svg>
        <span>Ask Saamba</span>
      </div>
      <button id="ask-collapse" type="button" aria-label="Collapse Ask Saamba" aria-expanded="true">${icon('chevron')}</button>
    </div>
    <div id="ask-body">
      <div class="ask-content">
        <div class="suggestions" id="suggestions">
          <div class="suggestions-intro">Try these:</div>
          <div class="suggestions-list">
            ${suggestions.map(q => `<button type="button" class="suggestion-pill" data-question="${esc(q)}"><svg class="suggestion-action-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span class="suggestion-text">${esc(q)}</span></button>`).join('')}
          </div>
        </div>
        <div class="chat-messages" aria-live="polite"></div>
      </div>
      <form id="ask-form">
        <button id="ask-expand" type="button" class="ask-expand-brand" aria-label="Expand Ask Saamba" aria-expanded="false">
          <svg class="ask-ai-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <polygon points="9,2 16,11 9,20 2,11"/>
            <polygon points="17,4 22,9 17,14 12,9" opacity="0.85"/>
          </svg>
          <span class="ask-expand-label">Ask Saamba</span>
        </button>
        <input id="ask-input" type="text" maxlength="2000" placeholder="Ask about your meetings…" aria-label="Ask Saamba" required>
        <div class="ask-controls">
          <div class="share-menu scope-menu">
            <button type="button" class="subtle-button" id="ask-scope-toggle" aria-expanded="false">This call ${icon('chevron')}</button>
            <div class="share-options" id="ask-scope-options" hidden>
              <button type="button" data-scope="this">This call</button>
              <button type="button" data-scope="mine">My meetings</button>
              <button type="button" disabled>Team calls</button>
              <button type="button" disabled>All calls</button>
            </div>
          </div>
          <button class="ask-send" type="submit" aria-label="Send question">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </form>
    </div>
  </section>`;
}

export function initAskPanel(id, markdownFn) {
  const chat = state.chats[id];
  if (!chat) return;

  const chatPanel = $('#ask-panel');
  const chatInput = $('#ask-input');
  const chatScope = $('#ask-scope-toggle');
  const scopeMenu = $('#ask-scope-options');
  const chatMessages = $('.chat-messages');
  const chatContent = $('.ask-content');
  const suggestions = $('.suggestions');

  if (!chatPanel || !chatInput || !chatMessages) return;

  const renderChat = () => {
    if (suggestions) suggestions.hidden = !!chat.messages.length || !!chatInput.value.trim();
    chatMessages.innerHTML = chat.messages.map(x => `<div class="chat-message ${esc(x.role)}">${x.role === 'assistant' ? markdownFn(x.text) : esc(x.text)}</div>`).join('');
    if (chatContent) chatContent.scrollTop = chatContent.scrollHeight;
  };

  let expandTimer = null;
  const setCollapsed = (collapsed, animate = true, autoFocus = false) => {
    chat.collapsed = collapsed;
    clearTimeout(expandTimer);
    if (!collapsed) {
      if (animate) {
        chatPanel.classList.add('is-expanding');
        chatPanel.classList.remove('is-collapsed');
        expandTimer = setTimeout(() => {
          chatPanel.classList.remove('is-expanding');
          if (autoFocus || document.activeElement === chatInput) { chatInput.focus(); }
        }, 40);
      } else {
        chatPanel.classList.remove('is-expanding');
        chatPanel.classList.remove('is-collapsed');
      }
      const collapseBtn = $('#ask-collapse');
      if (collapseBtn) collapseBtn.setAttribute('aria-expanded', 'true');
      const expandBtn = $('#ask-expand');
      if (expandBtn) expandBtn.setAttribute('aria-expanded', 'true');
      if (scopeMenu) scopeMenu.hidden = true;
      if (chatScope) chatScope.setAttribute('aria-expanded', 'false');
    } else {
      chatPanel.classList.remove('is-expanding');
      chatPanel.classList.add('is-collapsed');
      const collapseBtn = $('#ask-collapse');
      if (collapseBtn) collapseBtn.setAttribute('aria-expanded', 'false');
      const expandBtn = $('#ask-expand');
      if (expandBtn) expandBtn.setAttribute('aria-expanded', 'false');
      if (scopeMenu) scopeMenu.hidden = true;
      if (chatScope) chatScope.setAttribute('aria-expanded', 'false');
    }
  };

  setCollapsed(chat.collapsed, false);

  const collapseBtn = $('#ask-collapse');
  if (collapseBtn) collapseBtn.onclick = () => setCollapsed(true, true);
  const expandBtn = $('#ask-expand');
  if (expandBtn) expandBtn.onclick = () => setCollapsed(false, true, true);

  const updateScope = () => {
    if (chatScope) chatScope.innerHTML = (chat.scope === 'mine' ? 'My meetings' : 'This call') + ' ' + icon('chevron');
  };
  updateScope();

  if (chatScope && scopeMenu) {
    chatScope.onclick = () => {
      if (chat.collapsed) setCollapsed(false, true);
      const opening = scopeMenu.hidden;
      document.querySelectorAll('.share-options').forEach(x => x.hidden = true);
      document.querySelectorAll('[aria-expanded]').forEach(x => {
        if (x !== $('#ask-collapse') && x !== $('#ask-expand')) x.setAttribute('aria-expanded', 'false');
      });
      scopeMenu.hidden = !opening;
      chatScope.setAttribute('aria-expanded', String(opening));
    };

    scopeMenu.querySelectorAll('[data-scope]').forEach(option => {
      option.onclick = () => {
        chat.scope = option.dataset.scope;
        updateScope();
        scopeMenu.hidden = true;
        chatScope.setAttribute('aria-expanded', 'false');
      };
    });
  }

  chatInput.value = chat.question;
  chatInput.onfocus = () => { if (chat.collapsed) setCollapsed(false, true, true); };
  chatInput.oninput = () => {
    chat.question = chatInput.value;
    if (suggestions) suggestions.hidden = !!chat.messages.length || !!chat.question.trim();
  };

  renderChat();

  document.querySelectorAll('[data-question]').forEach(b => {
    b.onclick = () => {
      chatInput.value = b.dataset.question;
      chat.question = chatInput.value;
      if (suggestions) suggestions.hidden = true;
      chatInput.focus();
    };
  });

  const askForm = $('#ask-form');
  if (askForm) {
    askForm.onsubmit = async e => {
      e.preventDefault();
      if (chat.collapsed) setCollapsed(false, true);
      const question = chatInput.value.trim();
      if (!question || chat.pending) return;
      chat.pending = true;
      chat.messages.push({ role: 'user', text: question });
      chatInput.value = '';
      chat.question = '';
      renderChat();
      const send = $('.ask-send');
      if (send) send.disabled = true;
      try {
        const response = await api('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, scope: chat.scope, meeting_id: id })
        });
        chat.messages.push({ role: 'assistant', text: response.answer });
      } catch (err) {
        chat.messages.push({ role: 'assistant', text: err.message });
      } finally {
        chat.pending = false;
        if (state.current === id) {
          if (send) send.disabled = false;
          renderChat();
        }
      }
    };
  }
}
