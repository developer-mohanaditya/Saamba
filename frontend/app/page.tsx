// frontend/app/page.tsx - Exact page layout matching v1 markup & CSS

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { MeetingDetail } from '../components/MeetingDetail';
import { MediaPane, MediaPaneHandle } from '../components/MediaPane';
import { AskPanel } from '../components/AskPanel';
import { Modals } from '../components/Modals';
import { getMeetings, getMeeting, getWorkspaces } from '../lib/api';

export default function Home() {
  const {
    sidebarCollapsed,
    meetings,
    setMeetings,
    selectedMeetingId,
    setSelectedMeetingId,
    currentMeeting,
    setCurrentMeeting,
    setIsLoadingMeeting,
    setWorkspaces,
    setWorkspaceMeetings,
    setChatMessages,
  } = useAppStore();

  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
  const [speakerToEdit, setSpeakerToEdit] = useState('');
  const [speakerIndex, setSpeakerIndex] = useState<number | null>(null);

  const mediaPaneRef = useRef<MediaPaneHandle>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function loadData() {
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
        console.error('Data load error:', err);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full meeting details when selectedMeetingId changes
  useEffect(() => {
    if (!selectedMeetingId) {
      setCurrentMeeting(null);
      return;
    }
    let active = true;
    setIsLoadingMeeting(true);

    getMeeting(selectedMeetingId)
      .then((m) => {
        if (!active) return;
        setCurrentMeeting(m);
        // Load chat history for this meeting
        fetch(`/api/meetings/${encodeURIComponent(m.id)}/chat`)
          .then((r) => r.json())
          .then((msgs) => {
            if (active && Array.isArray(msgs)) setChatMessages(msgs);
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load meeting details:', err);
      })
      .finally(() => {
        if (active) setIsLoadingMeeting(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMeetingId]);

  return (
    <div
      className={`app layout-sidebar ${
        sidebarCollapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      <Sidebar onCreateWorkspace={() => setWorkspaceModalOpen(true)} />

      <main>
        <Header
          onRecord={() =>
            alert('Live recording is available from the desktop application.')
          }
          onImport={() => setImportModalOpen(true)}
        />

        <p id="record-status" role="status" />

        <div className="content">
          <section id="detail" className="detail">
            <MeetingDetail
              onImport={() => setImportModalOpen(true)}
              onDeleteMeeting={() => setDeleteModalOpen(true)}
              onSeekAudio={(sec) => mediaPaneRef.current?.seekTo(sec)}
              onOpenSpeakerDialog={(spk, idx) => {
                setSpeakerToEdit(spk);
                setSpeakerIndex(idx ?? null);
                setSpeakerModalOpen(true);
              }}
            />
            {currentMeeting && (
              <>
                <MediaPane ref={mediaPaneRef} meetingId={currentMeeting.id} />
                <AskPanel />
              </>
            )}
          </section>
        </div>

        <footer>Everything worth remembering, in one place.</footer>
      </main>

      <Modals
        workspaceModalOpen={workspaceModalOpen}
        onCloseWorkspaceModal={() => setWorkspaceModalOpen(false)}
        importModalOpen={importModalOpen}
        onCloseImportModal={() => setImportModalOpen(false)}
        deleteModalOpen={deleteModalOpen}
        onCloseDeleteModal={() => setDeleteModalOpen(false)}
        speakerModalOpen={speakerModalOpen}
        speakerToEdit={speakerToEdit}
        speakerIndex={speakerIndex}
        onCloseSpeakerModal={() => setSpeakerModalOpen(false)}
      />
    </div>
  );
}
