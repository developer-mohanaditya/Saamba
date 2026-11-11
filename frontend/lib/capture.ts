// frontend/lib/capture.ts - Full in-browser meeting recording engine matching v1 capture.js

import { playAlert, unlockAlertAudio } from './sound';

function wav(samples: Float32Array, rate: number): ArrayBuffer {
  const out = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(out);
  function text(at: number, s: string) {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  }
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // 1 channel (mono)
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  }
  return out;
}

const WORKLET_CODE = `
class Recorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.length = Math.round(sampleRate * 15);
    this.buffer = new Float32Array(this.length);
    this.used = 0;
    this.port.onmessage = e => {
      if (e.data === 'flush') {
        this.flush();
        this.port.postMessage({ type: 'flushed' });
      }
    };
  }
  flush() {
    if (!this.used) return;
    const samples = this.buffer.slice(0, this.used);
    this.port.postMessage({ type: 'chunk', samples, rate: sampleRate }, [samples.buffer]);
    this.buffer = new Float32Array(this.length);
    this.used = 0;
  }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input) {
      let offset = 0;
      while (offset < input.length) {
        const count = Math.min(input.length - offset, this.length - this.used);
        this.buffer.set(input.subarray(offset, offset + count), this.used);
        this.used += count;
        offset += count;
        if (this.used === this.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('saamba-recorder', Recorder);
`;

export interface RecordingSession {
  id: string;
  screen?: MediaStream | null;
  mic?: MediaStream | null;
  context: AudioContext;
  node: AudioWorkletNode;
  recorder?: MediaRecorder | null;
  meetingTabId?: number | null;
  stopping: boolean;
  captureStopped: boolean;
  outbox: Array<{ payload: ArrayBuffer; index: number }>;
  saving: Promise<void> | null;
  videoOutbox: Array<{ payload: Blob; index: number }>;
  videoCount: number;
  videoSaving: Promise<void> | null;
  videoStopped: Promise<void> | null;
  drain: () => Promise<void>;
  videoDrain: () => Promise<void>;
  flush: () => Promise<void>;
}

let activeSession: RecordingSession | null = null;

export function isRecording(): boolean {
  return activeSession !== null;
}

export async function startRecording({
  workspaceId,
  extensionStream,
  onStatus,
  onCreated,
}: {
  workspaceId?: string;
  extensionStream?: any;
  onStatus?: (status: string) => void;
  onCreated?: (meetingId: string) => void;
}): Promise<string> {
  if (activeSession) throw new Error('A recording is already in progress.');
  unlockAlertAudio();

  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Audio recording is not supported in this browser.');
  }

  let screen: MediaStream | null = null;
  let sharedTitle = '';

  // Use Chrome extension stream if provided, otherwise standard getDisplayMedia
  if (extensionStream && extensionStream.streamId) {
    const source = {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: extensionStream.streamId,
    };
    screen = await (navigator.mediaDevices.getUserMedia as any)({
      audio: { mandatory: source },
      video: { mandatory: source },
    });
    sharedTitle = extensionStream.title || '';
  } else if (navigator.mediaDevices.getDisplayMedia) {
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const videoTrack = screen.getVideoTracks()[0];
      if (videoTrack) {
        sharedTitle = (videoTrack.label || '').replace(/^Meet\s*[-–]\s*/i, '').trim();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        const proceedWithMic = window.confirm(
          'Screen sharing was cancelled. Would you like to record microphone audio instead?'
        );
        if (!proceedWithMic) throw err;
        screen = null;
      } else {
        throw err;
      }
    }
  }

  // Get microphone
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const usableTitle =
    /^(google meet|meet|chrome tab|tab|screen|window)$/i.test(sharedTitle)
      ? ''
      : sharedTitle;

  const title =
    usableTitle ||
    `Meeting · ${new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;

  const headers: Record<string, string> = {
    'X-Meeting-Title': encodeURIComponent(title),
  };
  if (workspaceId && workspaceId !== 'default') {
    headers['X-Workspace-Id'] = workspaceId;
  }

  const startRes = await fetch('/api/live/start', {
    method: 'POST',
    headers,
  });
  if (!startRes.ok) throw new Error('Could not start live recording.');
  const { id } = await startRes.json();
  if (onCreated) onCreated(id);

  // Set up Audio Context and AudioWorklet
  const context = new (window.AudioContext || (window as any).webkitAudioContext)();
  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  await context.audioWorklet.addModule(blobUrl);
  URL.revokeObjectURL(blobUrl);

  const node = new AudioWorkletNode(context, 'saamba-recorder');

  // Mix microphone
  const micSource = context.createMediaStreamSource(mic);
  const micGain = context.createGain();
  micGain.gain.value = 0.5;
  micSource.connect(micGain).connect(node);

  // Mix screen audio if present
  if (screen && screen.getAudioTracks().length > 0) {
    const screenSource = context.createMediaStreamSource(
      new MediaStream(screen.getAudioTracks())
    );
    const screenGain = context.createGain();
    screenGain.gain.value = 0.5;
    screenSource.connect(screenGain).connect(node);
  }

  // Mute audio node output to speakers to prevent feedback loop
  const mute = context.createGain();
  mute.gain.value = 0;
  node.connect(mute).connect(context.destination);

  let chunkIndex = 0;
  let flushResolve: (() => void) | null = null;

  const session: RecordingSession = {
    id,
    screen,
    mic,
    context,
    node,
    recorder: null,
    stopping: false,
    captureStopped: false,
    outbox: [],
    saving: null,
    videoOutbox: [],
    videoCount: 0,
    videoSaving: null,
    videoStopped: null,
    drain: () => {
      if (session.saving) return session.saving;
      session.saving = (async () => {
        while (session.outbox.length) {
          const item = session.outbox[0];
          const response = await fetch(`/api/live/${id}/chunk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Chunk-Index': String(item.index),
            },
            body: item.payload,
          });
          if (!response.ok) {
            throw new Error('A recording segment could not be saved.');
          }
          session.outbox.shift();
        }
      })().finally(() => {
        session.saving = null;
      });
      return session.saving;
    },
    videoDrain: () => {
      if (session.videoSaving) return session.videoSaving;
      session.videoSaving = (async () => {
        while (session.videoOutbox.length) {
          const item = session.videoOutbox[0];
          const response = await fetch(`/api/live/${id}/video-chunk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Chunk-Index': String(item.index),
            },
            body: item.payload,
          });
          if (!response.ok) {
            throw new Error('A video segment could not be saved.');
          }
          session.videoOutbox.shift();
        }
      })().finally(() => {
        session.videoSaving = null;
      });
      return session.videoSaving;
    },
    flush: () =>
      new Promise<void>((resolve) => {
        flushResolve = resolve;
        node.port.postMessage('flush');
      }),
  };

  node.port.onmessage = (e) => {
    if (e.data.type === 'flushed') {
      flushResolve?.();
      return;
    }
    if (e.data.type !== 'chunk') return;
    session.outbox.push({
      payload: wav(e.data.samples, e.data.rate),
      index: chunkIndex++,
    });
    session.drain().catch(() => {
      onStatus?.('Saving is delayed. Keep this tab open; press stop to retry.');
    });
  };

  // If video tracks exist, start video recording
  if (screen && screen.getVideoTracks().length > 0 && typeof MediaRecorder !== 'undefined') {
    const videoMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    try {
      const recorder = new MediaRecorder(new MediaStream(screen.getVideoTracks()), {
        mimeType: videoMime,
        videoBitsPerSecond: 1200000,
      });
      session.recorder = recorder;
      session.videoStopped = new Promise<void>((resolve) =>
        recorder.addEventListener('stop', () => resolve(), { once: true })
      );
      recorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) {
          session.videoOutbox.push({
            payload: e.data,
            index: session.videoCount++,
          });
          session.videoDrain().catch(() => {
            onStatus?.('Saving video is delayed.');
          });
        }
      });
      recorder.start(10000);
    } catch (_) {}

    screen.getVideoTracks()[0].addEventListener('ended', () => {
      stopRecording({ onStatus }).catch(() => {});
    });
  }

  const meetingTabId = extensionStream?.meetingTabId ? Number(extensionStream.meetingTabId) : null;
  session.meetingTabId = meetingTabId;
  if (meetingTabId && typeof window !== 'undefined') {
    window.postMessage(
      {
        source: 'saamba-app',
        type: 'recording-status',
        meetingTabId,
        recording: true,
      },
      location.origin
    );
  }

  activeSession = session;
  playAlert('start');
  onStatus?.(
    screen
      ? 'Recording video, meeting audio and microphone. Keep this tab open.'
      : 'Recording microphone audio. Keep this tab open.'
  );

  return id;
}

export async function stopRecording({
  onStatus,
}: {
  onStatus?: (status: string) => void;
} = {}): Promise<{ id: string; video_saved: boolean }> {
  const session = activeSession;
  if (!session || session.stopping) {
    throw new Error('No active recording session.');
  }

  session.stopping = true;
  onStatus?.('Saving the recording…');

  try {
    if (!session.captureStopped) {
      const flushed = session.flush();
      if (session.recorder && session.recorder.state !== 'inactive') {
        session.recorder.stop();
      }
      session.screen?.getTracks().forEach((t) => t.stop());
      session.mic?.getTracks().forEach((t) => t.stop());
      await flushed;
      if (session.videoStopped) {
        await session.videoStopped;
      }
      session.captureStopped = true;
      await session.context.close();
    }

    await session.drain();
    await session.videoDrain();

    const response = await fetch(`/api/live/${session.id}/finish`, {
      method: 'POST',
      headers: { 'X-Video-Chunks': String(session.videoCount) },
    });
    if (!response.ok) {
      throw new Error('Could not finish saving the recording.');
    }
    const result = await response.json();
    if (session.meetingTabId && typeof window !== 'undefined') {
      window.postMessage(
        {
          source: 'saamba-app',
          type: 'recording-status',
          meetingTabId: session.meetingTabId,
          recording: false,
        },
        location.origin
      );
    }
    playAlert('stop');
    activeSession = null;
    onStatus?.(
      result.video_saved
        ? 'Video and audio saved. Transcription and summary are finishing.'
        : 'Audio saved. Transcription and summary are finishing.'
    );
    return { id: session.id, video_saved: !!result.video_saved };
  } catch (err: any) {
    session.stopping = false;
    onStatus?.(`Error saving recording: ${err.message}`);
    throw err;
  }
}
