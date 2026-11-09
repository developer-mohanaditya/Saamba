// frontend/app/page.tsx - Main Saamba v2 Next.js Application Page

'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { MeetingDetail } from '../components/MeetingDetail';
import { AskPanel } from '../components/AskPanel';
import { getMeetings, getMeeting, getWorkspaces } from '../lib/api';

export default function Home() {
  const {
    meetings,
    setMeetings,
    selectedMeetingId,
    setSelectedMeetingId,
    setCurrentMeeting,
    setIsLoadingMeeting,
    setWorkspaces,
    setWorkspaceMeetings,
  } = useAppStore();

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Initial data load: workspaces and meetings from SQLite backend
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [wsData, meetingList] = await Promise.all([
          getWorkspaces().catch(() => ({ workspaces: [], workspaceMeetings: {} })),
          getMeetings().catch(() => []),
        ]);

        if (!mounted) return;

        if (wsData.workspaces && wsData.workspaces.length > 0) {
          setWorkspaces(wsData.workspaces);
          setWorkspaceMeetings(wsData.workspaceMeetings || {});
        }

        if (Array.isArray(meetingList)) {
          setMeetings(meetingList);
          if (meetingList.length > 0 && !selectedMeetingId) {
            setSelectedMeetingId(meetingList[0].id);
          }
        }
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    }

    loadInitialData();
    const interval = setInterval(loadInitialData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full details whenever the selected meeting changes
  useEffect(() => {
    if (!selectedMeetingId) {
      setCurrentMeeting(null);
      return;
    }

    let mounted = true;
    setIsLoadingMeeting(true);

    getMeeting(selectedMeetingId)
      .then((m) => {
        if (mounted) setCurrentMeeting(m);
      })
      .catch((err) => {
        console.error('Failed to load meeting details:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingMeeting(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedMeetingId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBF9F5] text-[#1A1A1A] font-sans antialiased">
      {/* 1. Left Workspace Sidebar */}
      <Sidebar />

      {/* 2. Main Work Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onRecordClick={() => {
            alert('Live audio capture will start via the browser media stream.');
          }}
          onImportClick={() => setImportDialogOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden relative">
          <MeetingDetail />
          <AskPanel />
        </div>
      </main>

      {/* Import Modal Placeholder */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#FBF9F5] w-full max-w-lg rounded-2xl shadow-2xl border border-[#E8E4DC] p-6 space-y-4">
            <h2 className="font-serif font-bold text-xl text-[#1A382B]">Import a meeting</h2>
            <p className="text-xs text-[#767676]">Upload an audio or video recording to transcribe and summarize.</p>
            <div className="p-8 border-2 border-dashed border-[#D5D0C6] rounded-xl text-center bg-white cursor-pointer hover:border-[#1A382B] transition-colors">
              <input type="file" accept="audio/*,video/*" className="hidden" id="modal-file-upload" />
              <label htmlFor="modal-file-upload" className="cursor-pointer block">
                <span className="text-3xl block mb-2">📁</span>
                <span className="text-sm font-semibold text-[#1A382B]">Click to browse</span>
                <span className="text-xs text-[#767676] block mt-1">Audio or video files up to 2 GB</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setImportDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-[#767676] hover:bg-[#EFECE4]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
