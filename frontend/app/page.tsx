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
import { AuthModal } from '../components/AuthModal';
import { SettingsModal } from '../components/SettingsModal';
import { getMeetings, getMeeting, getWorkspaces, getChatMessages } from '../lib/api';
import { startRecording, stopRecording, isRecording } from '../lib/capture';

export default function Home() {
  const {
    user,
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
    activeTranslation,
    setActiveTranslation,
    activeTab,
    setActiveTab,
    toastMessage,
    setToastMessage,
    setActiveWorkspaceId,
  } = useAppStore();

  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
  const [speakerToEdit, setSpeakerToEdit] = useState('');
  const [speakerIndex, setSpeakerIndex] = useState<number | null>(null);
  const [translateModalOpen, setTranslateModalOpen] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordStatus, setRecordStatus] = useState('');
  const [detectedMeetTab, setDetectedMeetTab] = useState<number | null>(null);

  const mediaPaneRef = useRef<MediaPaneHandle>(null);

  // Initial load and periodic refresh of meeting list
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
          const curActive = useAppStore.getState().activeWorkspaceId;
          const found = wsData.workspaces.find((w) => w.id === curActive);
          if (!found) {
            const def = wsData.workspaces.find((w) => w.isDefault) || wsData.workspaces[0];
            if (def) setActiveWorkspaceId(def.id);
          }
        }
        if (Array.isArray(meetingList)) {
          setMeetings(meetingList);
          if (meetingList.length > 0) {
            const curSelected = useAppStore.getState().selectedMeetingId;
            if (!curSelected || !meetingList.some((m) => m.id === curSelected)) {
              setSelectedMeetingId(meetingList[0].id);
            }
          } else {
            setSelectedMeetingId(null);
            setCurrentMeeting(null);
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
  }, [user]);

  // Fetch full meeting details when selectedMeetingId changes
  useEffect(() => {
    if (!selectedMeetingId) {
      setCurrentMeeting(null);
      return;
    }
    let active = true;
    setIsLoadingMeeting(true);

    // Reset active translation when changing meeting
    setActiveTranslation(null);
    let preferredTab = 'summary';
    try {
      preferredTab = localStorage.getItem(`saamba-active-tab-${selectedMeetingId}`) || 'summary';
    } catch (_) {}
    setActiveTab(preferredTab);

    getMeeting(selectedMeetingId)
      .then((m) => {
        if (!active) return;
        setCurrentMeeting(m);
        if (m.status === 'transcribing') {
          setActiveTab('transcript');
        }
        // Load chat history for this meeting
        getChatMessages(m.id)
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

  // Live auto-polling while active meeting is processing (queued, transcribing, summarizing)
  useEffect(() => {
    if (!currentMeeting) return;
    if (currentMeeting.status === 'ready' || currentMeeting.status === 'error') return;

    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const updated = await getMeeting(currentMeeting.id);
        if (!mounted || !updated) return;
        setCurrentMeeting(updated);
        setMeetings(
          useAppStore.getState().meetings.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  title: updated.title,
                  status: updated.status,
                  has_summary: Boolean(updated.summary && updated.summary.trim().length > 0),
                  has_transcript: Boolean(updated.transcript && updated.transcript.length > 0),
                }
              : m
          )
        );
      } catch (err) {
        console.error('Active meeting polling error:', err);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentMeeting?.id, currentMeeting?.status]);

  const handleStartTranslation = async (code: string, name: string) => {
    if (!currentMeeting) return;
    setActiveTranslation({
      code,
      name,
      status: 'loading',
      data: null,
    });
    setActiveTab(`trans-${code}`);

    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(currentMeeting.id)}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language_code: code, language_name: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Translation failed');
      }
      const data = await res.json();
      setActiveTranslation({
        code,
        name,
        status: 'ready',
        data,
      });
      const updated = await getMeeting(currentMeeting.id);
      setCurrentMeeting(updated);
    } catch (err: any) {
      setActiveTranslation({
        code,
        name,
        status: 'error',
        error: err.message || 'Translation failed',
      });
    }
  };

  const handleSelectTranslation = async (code: string, name: string) => {
    if (!currentMeeting) return;
    setActiveTranslation({
      code,
      name,
      status: 'loading',
      data: null,
    });
    setActiveTab(`trans-${code}`);

    try {
      const res = await fetch(
        `/api/meetings/${encodeURIComponent(currentMeeting.id)}/translations/${encodeURIComponent(code)}`
      );
      if (!res.ok) throw new Error('Could not load translation');
      const data = await res.json();
      setActiveTranslation({
        code,
        name,
        status: 'ready',
        data,
      });
    } catch (err: any) {
      setActiveTranslation({
        code,
        name,
        status: 'error',
        error: err.message || 'Could not load translation',
      });
    }
  };

  const handleCloseTranslationTab = () => {
    setActiveTranslation(null);
    setActiveTab('transcript');
  };

  const handleToggleRecord = async () => {
    if (recordingActive) {
      try {
        const res = await stopRecording({
          onStatus: (status) => setRecordStatus(status),
        });
        setRecordingActive(false);
        const list = await getMeetings();
        setMeetings(list);
        setSelectedMeetingId(res.id);
      } catch (err: any) {
        setRecordStatus(`Error: ${err.message}`);
        setRecordingActive(false);
      }
    } else {
      try {
        setRecordingActive(true);
        setRecordStatus('Starting meeting capture…');
        await startRecording({
          workspaceId: useAppStore.getState().activeWorkspaceId,
          onStatus: (status) => setRecordStatus(status),
          onCreated: async (id) => {
            const list = await getMeetings();
            setMeetings(list);
            setSelectedMeetingId(id);
          },
        });
      } catch (err: any) {
        setRecordingActive(false);
        setRecordStatus('');
        if (err.name !== 'NotAllowedError') {
          alert(err.message || 'Could not start recording.');
        }
      }
    }
  };

  // Toast notification auto-dismiss timer
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage, setToastMessage]);

  // Chrome Extension bridge listener for Google Meet auto-detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleExtensionMsg = async (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.source !== 'saamba-meeting-detector'
      ) {
        return;
      }

      if (event.data.type === 'meeting-detected') {
        const tabId = Number(event.data.meetingTabId);
        if (tabId && !isRecording()) {
          setDetectedMeetTab(tabId);
          setRecordStatus('Google Meet detected — click "Capture this meeting" to begin.');
        }
        return;
      }

      if (event.data.type === 'start-tab-capture') {
        if (isRecording()) return;
        setDetectedMeetTab(null);
        setRecordingActive(true);
        setRecordStatus('Connecting to Google Meet tab capture…');
        try {
          await startRecording({
            workspaceId: useAppStore.getState().activeWorkspaceId,
            extensionStream: event.data,
            onStatus: (st) => setRecordStatus(st),
            onCreated: async (id) => {
              const list = await getMeetings();
              setMeetings(list);
              setSelectedMeetingId(id);
            },
          });
        } catch (err: any) {
          setRecordingActive(false);
          setRecordStatus('');
          alert(err.message || 'Could not start recording from extension.');
        }
        return;
      }

      if (event.data.type === 'stop-recording') {
        if (isRecording()) {
          handleToggleRecord();
        }
        return;
      }

      if (event.data.type === 'meeting-ended') {
        const endedId = Number(event.data.meetingTabId);
        if (detectedMeetTab === endedId) {
          setDetectedMeetTab(null);
        }
        if (isRecording()) {
          handleToggleRecord();
        }
        return;
      }
    };

    window.addEventListener('message', handleExtensionMsg);
    return () => window.removeEventListener('message', handleExtensionMsg);
  }, [detectedMeetTab]);

  return (
    <div
      className={`app layout-sidebar ${
        sidebarCollapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      <Sidebar
        onCreateWorkspace={() => setWorkspaceModalOpen(true)}
        onRecord={handleToggleRecord}
        onImport={() => setImportModalOpen(true)}
        isRecording={recordingActive}
      />

      <main>
        <Header
          isRecording={recordingActive}
          onRecord={handleToggleRecord}
          onImport={() => setImportModalOpen(true)}
        />

        {detectedMeetTab && !recordingActive && (
          <div
            id="meeting-prompt"
            className="meeting-prompt"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              background: '#eef6f1',
              borderRadius: '8px',
              margin: '8px 24px',
              border: '1px solid #c0dfcc',
            }}
          >
            <span style={{ fontSize: '13px', color: '#1a382b', fontWeight: 600 }}>
              Google Meet detected
            </span>
            <button
              type="button"
              className="primary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => {
                window.postMessage(
                  {
                    source: 'saamba-app',
                    type: 'request-tab-capture',
                    meetingTabId: detectedMeetTab,
                  },
                  location.origin
                );
              }}
            >
              Capture this meeting
            </button>
            <button
              type="button"
              className="subtle-button"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setDetectedMeetTab(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <p id="record-status" role="status">
          {recordStatus}
        </p>

        <div className="content">
          <section id="detail" className={`detail ${!currentMeeting ? 'is-empty' : ''}`}>
            <MeetingDetail
              onImport={() => setImportModalOpen(true)}
              onDeleteMeeting={() => setDeleteModalOpen(true)}
              onSeekAudio={(sec) => mediaPaneRef.current?.seekTo(sec)}
              onOpenSpeakerDialog={(spk, idx) => {
                setSpeakerToEdit(spk);
                setSpeakerIndex(idx ?? null);
                setSpeakerModalOpen(true);
              }}
              onOpenTranslateModal={() => setTranslateModalOpen(true)}
              onSelectTranslation={handleSelectTranslation}
              onCloseTranslationTab={handleCloseTranslationTab}
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
        translateModalOpen={translateModalOpen}
        onCloseTranslateModal={() => setTranslateModalOpen(false)}
        onStartTranslation={handleStartTranslation}
      />

      <AuthModal />
      <SettingsModal />

      {toastMessage && (
        <div id="toast" className="toast" role="alert">
          <span>{toastMessage}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToastMessage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
