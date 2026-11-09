// frontend/components/WaveformPlayer.tsx - Interactive 42-bar audio waveform

'use client';

import React, { useRef, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Play, Pause, Volume2 } from './Icons';

// Precomputed heights for aesthetic 42-bar waveform
const BARS = [
  24, 40, 68, 48, 80, 56, 32, 60, 92, 72, 44, 88, 64, 36, 76, 52, 28, 68,
  100, 84, 52, 96, 70, 40, 80, 60, 32, 72, 50, 26, 64, 90, 74, 46, 82, 58,
  34, 70, 48, 28, 54, 38
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function WaveformPlayer({ meetingId }: { meetingId?: string }) {
  const { isPlaying, setIsPlaying, currentTime, setCurrentTime } = useAppStore();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const totalDuration = 184; // mock 3m 04s or actual duration

  const progressPercent = Math.min(100, (currentTime / totalDuration) * 100);

  const handleBarClick = (index: number) => {
    const fraction = index / (BARS.length - 1);
    setCurrentTime(fraction * totalDuration);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E4DC] shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-[#1A382B] text-white flex items-center justify-center hover:bg-[#132A20] transition-colors shadow-sm active:scale-95"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <div>
            <div className="text-xs font-semibold text-[#1A1A1A]">Recording Playback</div>
            <div className="text-[11px] text-[#767676] font-mono">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#767676]">
          <Volume2 className="w-4 h-4" />
          <span className="text-[11px] font-mono uppercase bg-[#F5F2EB] px-2 py-0.5 rounded-md">
            1.0x
          </span>
        </div>
      </div>

      {/* 42-Bar Visualizer Container */}
      <div
        className="h-16 flex items-center justify-between gap-1 px-1 bg-[#FBF9F5] rounded-xl border border-[#E8E4DC]/60 cursor-pointer relative"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {BARS.map((heightPercent, idx) => {
          const barFraction = idx / (BARS.length - 1);
          const isPlayed = barFraction * 100 <= progressPercent;
          const isHovered = hoverIndex !== null && idx <= hoverIndex;

          return (
            <div
              key={idx}
              onClick={() => handleBarClick(idx)}
              onMouseEnter={() => setHoverIndex(idx)}
              className="flex-1 h-full flex items-center justify-center group"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                  isPlayed
                    ? 'bg-[#1A382B]'
                    : isHovered
                    ? 'bg-[#DEB569]'
                    : 'bg-[#D5D0C6]'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
