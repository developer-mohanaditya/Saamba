// frontend/components/AskPanel.tsx - Exact Ask Saamba component matching v1 markup & CSS

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { markdown } from '../lib/markdown';
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
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<'this' | 'mine'>('this');
  const scopeMenuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Outside click listener for scope menu
  useEffect(() => {
    if (!scopeOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
        setScopeOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [scopeOpen]);

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

    if (isCollapsed) setIsCollapsed(false);
    addChatMessage({ role: 'user', content: q });
    setInput('');
    setIsAsking(true);

    try {
      const res = await sendChatMessage(
        currentMeeting.id,
        q,
        activeScope === 'this' ? 'current' : 'all'
      );
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
    <section
      className={`ask-panel ${isCollapsed ? 'is-collapsed' : ''}`}
      id="ask-panel"
      onClick={() => {
        if (isCollapsed) setIsCollapsed(false);
      }}
    >
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
          aria-label={isCollapsed ? 'Expand Ask Saamba' : 'Collapse Ask Saamba'}
          aria-expanded={!isCollapsed}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </div>

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
                    data-question={q}
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
              <div key={i} className={`chat-message ${msg.role}`}>
                <div
                  dangerouslySetInnerHTML={{ __html: markdown(msg.content) }}
                />
              </div>
            ))}
            {isAsking && (
              <div className="chat-message assistant">
                <span className="spinner" /> Thinking…
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
          <button
            id="ask-expand"
            type="button"
            className="ask-expand-brand"
            aria-label="Expand Ask Saamba"
            aria-expanded={!isCollapsed}
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <svg
              className="ask-ai-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="9,2 16,11 9,20 2,11" />
              <polygon points="17,4 22,9 17,14 12,9" opacity="0.85" />
            </svg>
            <span className="ask-expand-label">Ask Saamba</span>
          </button>
          <input
            ref={inputRef}
            id="ask-input"
            type="text"
            maxLength={2000}
            placeholder="Ask about your meetings…"
            aria-label="Ask Saamba"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (isCollapsed) setIsCollapsed(false);
            }}
            onClick={(e) => {
              if (isCollapsed) {
                e.stopPropagation();
                setIsCollapsed(false);
              }
            }}
            required
          />
          <div className="ask-controls">
            <div className="share-menu scope-menu" ref={scopeMenuRef}>
              <button
                type="button"
                className="subtle-button"
                id="ask-scope-toggle"
                aria-expanded={scopeOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setScopeOpen(!scopeOpen);
                }}
              >
                {activeScope === 'this' ? 'This call' : 'My meetings'}{' '}
                <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </button>
              {scopeOpen && (
                <div className="share-options" id="ask-scope-options">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveScope('this');
                      setScopeOpen(false);
                    }}
                  >
                    This call
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveScope('mine');
                      setScopeOpen(false);
                    }}
                  >
                    My meetings
                  </button>
                  <button type="button" disabled>
                    Team calls
                  </button>
                  <button type="button" disabled>
                    All calls
                  </button>
                </div>
              )}
            </div>
            <button
              className="ask-send"
              type="submit"
              aria-label="Send question"
              disabled={isAsking}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
