// frontend/components/AskPanel.tsx - Exact Ask Saamba component matching v1 markup & CSS

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { markdown } from '../lib/markdown';
import { icon } from './Icons';
import { sendChatMessage } from '../lib/api';

export function AskPanel() {
  const {
    currentMeeting,
    chatMessages,
    addChatMessage,
    isAsking,
    setIsAsking,
    askScope,
    setAskScope,
    askPanelOpen,
    toggleAskPanel,
  } = useAppStore();

  const [input, setInput] = useState('');

  if (!currentMeeting) return null;

  // Generate contextual suggestion pills like v1
  const suggestions = [
    'What key decisions were finalized?',
    'What are the next steps for open action items?',
    'Draft a follow-up email to attendees',
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isAsking) return;

    addChatMessage({ role: 'user', content: q });
    setInput('');
    setIsAsking(true);

    try {
      const res = await sendChatMessage(currentMeeting.id, q, askScope);
      addChatMessage({ role: 'assistant', content: res.answer });
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: `Error: ${err.message || 'Could not fetch response.'}`,
      });
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <section className="ask-panel" id="ask-panel">
      <div className="ask-head">
        <div className="ask-title">
          <svg
            className="ask-ai-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <polygon points="9,2 16,11 9,20 2,11" />
            <polygon points="17,4 22,9 17,14 12,9" opacity="0.85" />
          </svg>
          <span>Ask Saamba</span>
        </div>
        <button
          id="ask-collapse"
          type="button"
          aria-label="Collapse Ask Saamba"
          aria-expanded={askPanelOpen}
          onClick={toggleAskPanel}
        >
          <span dangerouslySetInnerHTML={{ __html: icon('chevron') }} />
        </button>
      </div>

      {askPanelOpen && (
        <div id="ask-body">
          <div className="ask-content">
            {chatMessages.length === 0 && (
              <div className="suggestions" id="suggestions">
                <div className="suggestions-intro">Try these:</div>
                <div className="suggestions-list">
                  {suggestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-pill"
                      onClick={() => handleSend(q)}
                    >
                      <svg
                        className="suggestion-action-icon"
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span className="suggestion-text">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-messages" aria-live="polite">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-bubble chat-bubble-${msg.role}`}>
                  <div
                    className="chat-bubble-content"
                    dangerouslySetInnerHTML={{ __html: markdown(msg.content) }}
                  />
                </div>
              ))}
              {isAsking && (
                <div className="chat-bubble chat-bubble-assistant">
                  <div className="chat-bubble-content">
                    <span className="spinner" /> Thinking…
                  </div>
                </div>
              )}
            </div>
          </div>

          <form
            id="ask-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              id="ask-input"
              type="text"
              maxLength={2000}
              placeholder="Ask about your meetings…"
              aria-label="Ask Saamba"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
            />
            <div className="ask-controls">
              <button
                className="primary ask-submit-btn"
                type="submit"
                disabled={isAsking}
              >
                Ask
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
