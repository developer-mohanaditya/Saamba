// frontend/components/MediaPane.tsx - Exact Media Pane matching v1 markup & CSS

'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAppStore } from '../lib/store';
import { icon } from './Icons';

export interface MediaPaneHandle {
  seekTo: (seconds: number) => void;
}

export const MediaPane = forwardRef<MediaPaneHandle, { meetingId?: string }>(
  function MediaPane({ meetingId }, ref) {
    const { currentMeeting, mediaCollapsed, toggleMediaCollapsed } = useAppStore();
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState('');
    const downloadMenuRef = useRef<HTMLDivElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Outside click dismissal for download menu
    useEffect(() => {
      if (!downloadOpen) return;
      const handleOutsideClick = (e: MouseEvent) => {
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
          setDownloadOpen(false);
        }
      };
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }, [downloadOpen]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const player = audioRef.current || videoRef.current;
        if (player) {
          player.currentTime = seconds;
          player.play().catch(() => {});
        }
      },
    }));

    if (!currentMeeting) return null;

    const isVideo = currentMeeting.mime && currentMeeting.mime.startsWith('video/');

    const handleDownload = async (format: string) => {
      if (isDownloading || !currentMeeting) return;
      setDownloadOpen(false);
      setIsDownloading(true);
      setDownloadProgress('Preparing…');

      try {
        const response = await fetch(
          `/api/meetings/${encodeURIComponent(currentMeeting.id)}/download?format=${encodeURIComponent(format)}`
        );
        if (!response.ok) {
          let message = 'Could not prepare the download.';
          try {
            message = (await response.json()).error || message;
          } catch (_) {}
          throw new Error(message);
        }

        const totalHeader = response.headers.get('content-length') || response.headers.get('x-total-bytes');
        const total = parseInt(totalHeader || '0', 10);
        let loaded = 0;
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              loaded += value.length;
              const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
              if (total > 0) {
                const pct = Math.min(100, Math.round((loaded / total) * 100));
                const mbTotal = (total / (1024 * 1024)).toFixed(1);
                setDownloadProgress(`Downloading ${pct}% (${mbLoaded}/${mbTotal}MB)`);
              } else {
                setDownloadProgress(`Downloading ${mbLoaded}MB`);
              }
            }
          }
        }

        const blob = new Blob(chunks as any, {
          type: response.headers.get('content-type') || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        let filename =
          (currentMeeting.title.replace(/[\\/\x00-\x1f\x7f]/g, ' ').trim().slice(0, 120) || 'Meeting') +
          (format === 'audio-webm' ? '.webm' : '.' + format);
        const disp = response.headers.get('content-disposition');
        if (disp && disp.includes("filename*=UTF-8''")) {
          try {
            filename = decodeURIComponent(disp.split("filename*=UTF-8''")[1].split(';')[0]);
          } catch (_) {}
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err: any) {
        alert(err.message || 'Download failed');
      } finally {
        setIsDownloading(false);
        setDownloadProgress('');
      }
    };

    return (
      <aside
        className={`media-pane ${mediaCollapsed ? 'is-collapsed' : ''}`}
        id="media-pane"
      >
        <div className="media-heading">
          <h3>Return to the moment</h3>
          <div className="media-actions">
            <div className="share-menu download-menu" ref={downloadMenuRef}>
              <button
                type="button"
                id="download-toggle"
                className="download-toggle"
                aria-expanded={downloadOpen}
                disabled={isDownloading}
                onClick={() => setDownloadOpen(!downloadOpen)}
              >
                <span className="download-label">
                  {isDownloading ? (
                    <>
                      <span className="spinner" aria-hidden="true" style={{ marginRight: '6px' }} />
                      {downloadProgress}
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        style={{ marginRight: '4px', verticalAlign: 'text-bottom' }}
                      >
                        <path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3" />
                      </svg>
                      Download
                    </>
                  )}
                </span>
                <span
                  className="download-chevron"
                  dangerouslySetInnerHTML={{ __html: icon('chevron') }}
                />
              </button>
              {downloadOpen && (
                <div className="share-options" id="download-options">
                  <button type="button" onClick={() => handleDownload('mp3')}>
                    Audio · MP3
                  </button>
                  <button type="button" onClick={() => handleDownload('audio-webm')}>
                    Audio · WebM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('mp4')}
                    disabled={!isVideo}
                  >
                    Video · MP4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('webm')}
                    disabled={!isVideo}
                  >
                    Video · WebM
                  </button>
                </div>
              )}
            </div>

            <button
              id="media-collapse-btn"
              type="button"
              className="subtle-button media-collapse-btn"
              aria-label={mediaCollapsed ? 'Expand media player' : 'Collapse media player'}
              aria-expanded={!mediaCollapsed}
              title={mediaCollapsed ? 'Expand media player' : 'Collapse media player'}
              onClick={toggleMediaCollapsed}
            >
              <svg
                className="media-chevron-icon"
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="media-body" id="media-body">
          {!isVideo && (
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 42 }, (_, i) => (
                <i
                  key={i}
                  style={{ height: `${10 + ((i * 23 + 19) % 37)}px` }}
                />
              ))}
            </div>
          )}

          {isVideo ? (
            <video
              ref={videoRef}
              id="player"
              controls
              preload="metadata"
              src={`/api/meetings/${encodeURIComponent(currentMeeting.id)}/audio`}
            />
          ) : (
            <audio
              ref={audioRef}
              id="player"
              controls
              preload="metadata"
              src={`/api/meetings/${encodeURIComponent(currentMeeting.id)}/audio`}
            />
          )}

          {!isVideo && (
            <p className="hint">Audio recording. Video was not saved for this meeting.</p>
          )}
        </div>
      </aside>
    );
  }
);
