// frontend/components/MeetingDetail.tsx - Meeting Notes & Transcript View

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { WaveformPlayer } from './WaveformPlayer';
import { Search, Check, Globe } from './Icons';
import { toggleActionItem } from '../lib/api';

export function MeetingDetail() {
  const { currentMeeting, activeTab, setActiveTab, searchQuery, setSearchQuery } = useAppStore();
  const [localActionChecks, setLocalActionChecks] = useState<Record<string, boolean>>({});

  if (!currentMeeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FBF9F5]">
        <div className="w-14 h-14 rounded-full bg-[#F5F2EB] flex items-center justify-center text-2xl text-[#1A382B] mb-4">
          ♫
        </div>
        <h2 className="font-serif font-bold text-2xl text-[#1A1A1A] mb-2">
          Make room for the conversation.
        </h2>
        <p className="text-sm text-[#767676] max-w-sm mb-6">
          Import a recording to bring your notes, transcript, and audio together.
        </p>
      </div>
    );
  }

  const actionItems = currentMeeting.action_items || [];
  const actionCount = actionItems.filter((i) => !localActionChecks[i.key] && !i.checked).length;

  const handleToggleAction = async (key: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setLocalActionChecks((prev) => ({ ...prev, [key]: newVal }));
    try {
      await toggleActionItem(currentMeeting.id, key, newVal);
    } catch (e) {
      console.error('Failed to toggle action item:', e);
    }
  };

  const filteredSegments = (currentMeeting.transcript || []).filter((s) => {
    if (!searchQuery) return true;
    return s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.speaker && s.speaker.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FBF9F5]">
      {/* Top Media Waveform Header */}
      <div className="p-6 pb-4 sm:px-8 max-w-5xl mx-auto w-full">
        <WaveformPlayer meetingId={currentMeeting.id} />
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-[#E8E4DC] px-6 sm:px-8 max-w-5xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-[#1A382B] text-[#1A382B]'
                : 'border-transparent text-[#767676] hover:text-[#1A1A1A]'
            }`}
          >
            Summary
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === 'actions'
                ? 'border-[#1A382B] text-[#1A382B]'
                : 'border-transparent text-[#767676] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Action items</span>
            {actionCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1A382B] text-white">
                {actionCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
              activeTab === 'transcript'
                ? 'border-[#1A382B] text-[#1A382B]'
                : 'border-transparent text-[#767676] hover:text-[#1A1A1A]'
            }`}
          >
            Transcript
          </button>

          {(currentMeeting.translations || []).map((t) => (
            <button
              key={t.language_code}
              type="button"
              onClick={() => setActiveTab(`trans-${t.language_code}`)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wide border-b-2 transition-all ${
                activeTab === `trans-${t.language_code}`
                  ? 'border-[#DEB569] text-[#1A382B]'
                  : 'border-transparent text-[#767676] hover:text-[#1A1A1A]'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#DEB569]" />
              <span>{t.language_name}</span>
            </button>
          ))}
        </div>

        {activeTab === 'transcript' && (
          <div className="relative w-48 sm:w-64 my-2">
            <Search className="w-3.5 h-3.5 text-[#767676] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D5D0C6] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#1A382B]"
            />
          </div>
        )}
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-6 sm:px-8 max-w-5xl mx-auto w-full">
        {activeTab === 'summary' && (
          <div className="prose prose-stone max-w-none text-sm text-[#3D3D3D] leading-relaxed space-y-4">
            {currentMeeting.summary ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: currentMeeting.summary
                    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-serif font-bold text-[#1A382B] mt-4 mb-2">$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-serif font-semibold text-[#1A382B] mt-4 mb-2">$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-[#1A382B] mt-3 mb-1">$1</h3>')
                    .replace(/\n\n/gim, '<br/><br/>'),
                }}
              />
            ) : (
              <p className="italic text-[#767676]">Summary will appear once transcription finishes.</p>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-3">
            {actionItems.length === 0 ? (
              <p className="text-xs text-[#767676] italic">No action items detected in this conversation.</p>
            ) : (
              actionItems.map((item) => {
                const isChecked = localActionChecks[item.key] ?? item.checked;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleAction(item.key, isChecked)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[#F5F2EB]/50 border-[#E8E4DC] text-[#767676]'
                        : 'bg-white border-[#E8E4DC] shadow-2xs hover:border-[#D5D0C6] text-[#1A1A1A]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-[#1A382B] border-[#1A382B] text-white'
                          : 'border-[#D5D0C6] bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <p className={isChecked ? 'line-through text-[#767676]' : 'font-medium'}>
                        {item.text}
                      </p>
                      {item.speaker && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-[#DEB569] uppercase tracking-wider">
                          {item.speaker}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {filteredSegments.length === 0 ? (
              <p className="text-xs text-[#767676] italic">No transcript segments found.</p>
            ) : (
              filteredSegments.map((s, idx) => (
                <div key={idx} className="flex items-start gap-4 p-2 rounded-lg hover:bg-white/60 transition-colors">
                  <span className="text-[11px] font-mono text-[#767676] mt-0.5 shrink-0">
                    {Math.floor(s.start / 60)}:{(Math.floor(s.start % 60) < 10 ? '0' : '') + Math.floor(s.start % 60)}
                  </span>
                  <div className="flex-1 text-xs leading-relaxed">
                    {s.speaker && (
                      <span className="font-semibold text-[#1A382B] mr-2">
                        {s.speaker}:
                      </span>
                    )}
                    <span className="text-[#3D3D3D]">{s.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
