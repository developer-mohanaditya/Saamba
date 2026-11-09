// frontend/components/AskPanel.tsx - Ask Saamba AI Companion

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Sparkles, X, ChevronRight } from './Icons';
import { sendChatMessage } from '../lib/api';

const QUICK_PROMPTS = [
  'What were the major decisions made?',
  'List all next steps and owners.',
  'Summarize the key blockers mentioned.',
  'What was discussed regarding timeline?',
];

export function AskPanel() {
  const {
    askPanelOpen,
    toggleAskPanel,
    currentMeeting,
    chatMessages,
    addChatMessage,
    isAsking,
    setIsAsking,
    askScope,
    setAskScope,
  } = useAppStore();

  const [prompt, setPrompt] = useState('');

  if (!askPanelOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || prompt).trim();
    if (!text || isAsking || !currentMeeting) return;

    addChatMessage({ role: 'user', content: text });
    setPrompt('');
    setIsAsking(true);

    try {
      const res = await sendChatMessage(currentMeeting.id, text, askScope);
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
    <aside className="w-80 sm:w-96 border-l border-[#E8E4DC] bg-white flex flex-col h-full shadow-lg z-30 transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#E8E4DC] bg-[#FBF9F5]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#DEB569]" />
          <h3 className="font-serif font-bold text-sm text-[#1A382B]">Ask Saamba</h3>
        </div>
        <button
          type="button"
          onClick={toggleAskPanel}
          className="p-1 rounded-md text-[#767676] hover:bg-[#EFECE4]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scope Selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#F5F2EB]/50 border-b border-[#E8E4DC] text-xs">
        <span className="text-[#767676]">Search scope:</span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D5D0C6]">
          <button
            type="button"
            onClick={() => setAskScope('current')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              askScope === 'current'
                ? 'bg-[#1A382B] text-white'
                : 'text-[#767676] hover:text-[#1A1A1A]'
            }`}
          >
            This meeting
          </button>
          <button
            type="button"
            onClick={() => setAskScope('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              askScope === 'all'
                ? 'bg-[#1A382B] text-white'
                : 'text-[#767676] hover:text-[#1A1A1A]'
            }`}
          >
            All meetings
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-xs text-[#767676]">
              Ask questions about what was discussed, decisions made, or assigned actions.
            </p>
            <div className="space-y-1.5 text-left">
              <span className="text-[11px] font-semibold text-[#767676] uppercase tracking-wider block mb-1">
                Suggested questions:
              </span>
              {QUICK_PROMPTS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="w-full text-left p-2 rounded-lg bg-[#FBF9F5] border border-[#E8E4DC] hover:border-[#DEB569] hover:bg-white text-xs text-[#1A1A1A] transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{q}</span>
                  <ChevronRight className="w-3 h-3 text-[#767676] group-hover:text-[#DEB569] shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1A382B] text-white rounded-br-xs'
                    : 'bg-[#F5F2EB] text-[#1A1A1A] border border-[#E8E4DC] rounded-bl-xs'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isAsking && (
          <div className="flex items-center gap-2 p-3 text-xs text-[#767676] italic bg-[#F5F2EB] rounded-xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#DEB569] animate-ping" />
            Saamba is analyzing the conversation…
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-[#E8E4DC] bg-[#FBF9F5]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a question about this meeting…"
            className="flex-1 px-3 py-2 rounded-xl border border-[#D5D0C6] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1A382B]"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isAsking}
            className="px-3.5 py-2 rounded-xl bg-[#1A382B] text-white text-xs font-semibold hover:bg-[#132A20] disabled:opacity-40 transition-colors shadow-2xs"
          >
            Ask
          </button>
        </form>
      </div>
    </aside>
  );
}
