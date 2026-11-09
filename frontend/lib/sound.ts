// frontend/lib/sound.ts - Web Audio alert sounds with autoplay unlock matching v1 capture.js

let alertAudio: AudioContext | null = null;

export function isSoundAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('saamba-sound-alerts') !== 'off';
  } catch (_) {
    return true;
  }
}

export function setSoundAlertsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('saamba-sound-alerts', enabled ? 'on' : 'off');
  } catch (_) {}
}

export function unlockAlertAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!alertAudio && AudioCtx) {
      alertAudio = new AudioCtx();
    }
    if (alertAudio && alertAudio.state === 'suspended') {
      alertAudio.resume().catch(() => {});
    }
  } catch (_) {}
}

export function playAlert(kind: 'start' | 'stop' | 'detected' | 'ended') {
  if (!isSoundAlertsEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!alertAudio && AudioCtx) {
      alertAudio = new AudioCtx();
    }
    if (!alertAudio) return;

    if (alertAudio.state === 'suspended') {
      alertAudio.resume().catch(() => {});
    }

    const notes: Record<string, number[]> = {
      detected: [660, 880],
      start: [523, 659, 784],
      stop: [659, 523],
      ended: [784, 587],
    };
    const seq = notes[kind];
    if (!seq) return;

    const now = alertAudio.currentTime;
    seq.forEach((frequency, i) => {
      if (!alertAudio) return;
      const at = now + i * 0.1;
      const oscillator = alertAudio.createOscillator();
      const gain = alertAudio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.035, at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      oscillator.connect(gain);
      gain.connect(alertAudio.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.17);
    });
  } catch (_) {
    // Sound must never interrupt application flow
  }
}

// Global user gesture listener to unlock Web Audio context on the first user interaction
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockAlertAudio();
  };
  document.addEventListener('pointerdown', handleUserGesture, { passive: true });
  document.addEventListener('keydown', handleUserGesture);
}
