'use client';

import React from 'react';
import type { AgentId, AgentStatus } from '@/lib/types';
import StatusBadge from './StatusBadge';

interface AgentDeskProps {
  agentId: AgentId;
  name: string;
  emoji: string;
  status: AgentStatus;
  color: string;
  currentTask?: string;
}

export default function AgentDesk({
  name,
  emoji,
  status,
  color,
  currentTask,
}: AgentDeskProps) {
  const isActive = ['thinking', 'working', 'debating'].includes(status);
  const isThinking = status === 'thinking';
  const isWorking = status === 'working';

  return (
    <div className="relative flex flex-col items-center gap-1 p-3 select-none">
      {/* Glow effect when active */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${color}, transparent 70%)`,
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Agent character area */}
      <div className="relative flex flex-col items-center">
        {/* Thinking dots above head */}
        {isThinking && (
          <div className="flex gap-1 mb-1 h-4 items-end">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6]"
              style={{ animation: 'thinkDot 1.2s ease-in-out infinite 0s' }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6]"
              style={{ animation: 'thinkDot 1.2s ease-in-out infinite 0.2s' }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6]"
              style={{ animation: 'thinkDot 1.2s ease-in-out infinite 0.4s' }}
            />
          </div>
        )}
        {!isThinking && <div className="h-4 mb-1" />}

        {/* Agent emoji character with pixel border */}
        <div
          className="relative flex items-center justify-center w-14 h-14 text-3xl"
          style={{
            border: `3px solid ${color}`,
            backgroundColor: 'rgba(0,0,0,0.3)',
            boxShadow: isActive
              ? `0 0 12px ${color}66, inset 0 0 8px ${color}33`
              : `inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.1)`,
            imageRendering: 'pixelated',
            animation: isWorking ? 'workBounce 0.6s ease-in-out infinite' : undefined,
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Desk with monitor */}
      <div className="relative w-full mt-1">
        {/* Monitor */}
        <div className="relative mx-auto w-16 h-10 bg-[#1a1525] border-2 border-[#5a4d6e] flex items-center justify-center overflow-hidden">
          {/* Screen content */}
          <div
            className="absolute inset-[2px] flex items-center justify-center"
            style={{
              backgroundColor: isActive ? '#001a15' : '#0d0d0d',
            }}
          >
            {isActive && (
              <>
                {/* Scanlines */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,170,0.1) 2px, rgba(0,212,170,0.1) 4px)',
                  }}
                />
                {/* Screen text */}
                <div
                  className="text-[6px] font-mono leading-tight text-[#00d4aa] text-center overflow-hidden"
                  style={{
                    textShadow: '0 0 4px #00d4aa88',
                    animation: isWorking ? 'screenType 2s steps(8) infinite' : undefined,
                  }}
                >
                  {isWorking && '>>>_'}
                  {isThinking && '...?'}
                  {status === 'debating' && '<=>'}
                </div>
              </>
            )}
            {!isActive && status === 'done' && (
              <span className="text-[8px] text-[#22c55e]">OK</span>
            )}
            {!isActive && status === 'error' && (
              <span className="text-[8px] text-[#ef4444]">ERR</span>
            )}
          </div>
        </div>

        {/* Monitor stand */}
        <div className="mx-auto w-3 h-1.5 bg-[#5a4d6e]" />

        {/* Desk surface */}
        <div
          className="w-full h-3 rounded-sm"
          style={{
            backgroundColor: '#8b6914',
            boxShadow:
              'inset 0 -2px 0 #6b5010, inset 0 2px 0 #a87d1a, 0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Name tag */}
      <div
        className="mt-1.5 px-2 py-0.5 text-[11px] font-bold text-center leading-tight"
        style={{
          color,
          fontFamily: 'var(--font-pixel, "Courier New", monospace)',
          textShadow: `0 0 6px ${color}44`,
        }}
      >
        {name}
      </div>

      {/* Status badge */}
      <StatusBadge status={status} size="sm" />

      {/* Current task tooltip */}
      {currentTask && isActive && (
        <div
          className="mt-1 px-2 py-1 text-[9px] text-[#c4b5d4]/70 text-center leading-tight max-w-full truncate"
          style={{
            fontFamily: 'var(--font-pixel, "Courier New", monospace)',
          }}
        >
          {currentTask}
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }
        @keyframes thinkDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes workBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes screenType {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
