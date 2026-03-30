'use client';

import React from 'react';
import type { AgentStatus } from '@/lib/types';
import { STATUS_COLORS, STATUS_LABELS_KR } from '@/lib/types';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS_KR[status];
  const isActive = ['thinking', 'working', 'debating'].includes(status);

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const gap = size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <div className={`inline-flex items-center ${gap}`}>
      {/* Status dot */}
      <span className="relative flex">
        {isActive && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotSize}`}
            style={{
              backgroundColor: color,
              animation: 'statusPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${dotSize}`}
          style={{ backgroundColor: color }}
        />
      </span>

      {/* Status label */}
      <span
        className={`${textSize} font-medium leading-none`}
        style={{
          color,
          fontFamily: 'var(--font-pixel, "Courier New", monospace)',
        }}
      >
        {label}
      </span>

      {/* Done checkmark */}
      {status === 'done' && (
        <span className={`${textSize} leading-none`} style={{ color }}>
          &#10003;
        </span>
      )}

      {/* Error X */}
      {status === 'error' && (
        <span className={`${textSize} leading-none`} style={{ color }}>
          &#10007;
        </span>
      )}

      {/* Inline keyframe style */}
      <style jsx>{`
        @keyframes statusPing {
          0% {
            transform: scale(1);
            opacity: 0.75;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
