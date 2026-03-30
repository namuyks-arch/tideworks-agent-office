'use client';

import React, { useState } from 'react';
import type { PipelineStep } from '@/lib/types';
import { AGENT_COLORS } from '@/lib/types';
import Badge from '@/components/ui/Badge';

interface StepCardProps {
  step: PipelineStep;
  stepNumber: number;
  isCurrent: boolean;
  isCompleted: boolean;
}

const STEP_STATUS_ICON: Record<string, string> = {
  pending: '\u25CB',     // empty circle
  running: '\u25D4',     // half circle
  waiting_approval: '\u23F3', // hourglass
  completed: '\u2713',   // checkmark
  skipped: '\u2014',     // dash
  error: '\u2717',       // x mark
};

const STEP_STATUS_COLOR: Record<string, string> = {
  pending: '#6b7280',
  running: '#3b82f6',
  waiting_approval: '#eab308',
  completed: '#22c55e',
  skipped: '#6b7280',
  error: '#ef4444',
};

const MODE_BADGE_VARIANT: Record<string, 'auto' | 'approval' | 'manual'> = {
  auto: 'auto',
  approval: 'approval',
  manual: 'manual',
};

const MODE_LABEL_KR: Record<string, string> = {
  auto: '\uC790\uB3D9',
  approval: '\uC2B9\uC778',
  manual: '\uC218\uB3D9',
};

export default function StepCard({
  step,
  stepNumber,
  isCurrent,
  isCompleted,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showExpanded = (isCurrent || expanded) && step.details;
  const agentColor = AGENT_COLORS[step.agentId] || '#6b7280';
  const statusColor = STEP_STATUS_COLOR[step.status] || '#6b7280';
  const statusIcon = STEP_STATUS_ICON[step.status] || '\u25CB';
  const isRunning = step.status === 'running';

  // Calculate elapsed time if running
  let elapsed = '';
  if (step.startedAt) {
    const endTime = step.completedAt || Date.now();
    const diffSec = Math.floor((endTime - step.startedAt) / 1000);
    if (diffSec < 60) {
      elapsed = `${diffSec}\uCD08`;
    } else {
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      elapsed = `${m}\uBD84 ${s}\uCD08`;
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded border transition-all duration-200 ${
        isCurrent ? 'border-opacity-100' : 'border-opacity-30'
      }`}
      style={{
        backgroundColor: isCurrent ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
        borderColor: isCurrent ? statusColor : '#5a4d6e',
        boxShadow: isCurrent ? `0 0 8px ${statusColor}22` : undefined,
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer w-full text-left"
      >
        {/* Step number with status icon */}
        <div
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold"
          style={{
            backgroundColor: `${statusColor}22`,
            color: statusColor,
            border: `1px solid ${statusColor}44`,
            fontFamily: 'var(--font-pixel, "Courier New", monospace)',
            animation: isRunning ? 'stepPulse 1.5s ease-in-out infinite' : undefined,
          }}
        >
          {isCompleted ? statusIcon : stepNumber}
        </div>

        {/* Agent emoji */}
        <span className="flex-shrink-0 text-sm">{step.agentEmoji}</span>

        {/* Step name */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-[11px] font-medium truncate block ${
              isCompleted ? 'text-[#8b7fa6] line-through' : 'text-[#e2d8f0]'
            }`}
            style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
          >
            {step.name}
          </span>
        </div>

        {/* Mode badge */}
        <Badge
          variant={MODE_BADGE_VARIANT[step.mode]}
          size="sm"
        >
          {MODE_LABEL_KR[step.mode]}
        </Badge>

        {/* Status indicator dot */}
        <span className="relative flex-shrink-0">
          {isRunning && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: statusColor,
                animation: 'statusPing 1.5s cubic-bezier(0,0,0.2,1) infinite',
              }}
            />
          )}
          <span
            className="relative block w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </span>
      </button>

      {/* Expanded details */}
      {showExpanded && (
        <div
          className="px-2.5 pb-2 pt-0.5 border-t"
          style={{ borderColor: '#5a4d6e33' }}
        >
          <p
            className="text-[10px] text-[#8b7fa6] leading-relaxed"
            style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
          >
            {step.details}
          </p>

          {/* Elapsed time */}
          {elapsed && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[9px]">&#x23F1;</span>
              <span
                className="text-[9px] text-[#6b5f80]"
                style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
              >
                {elapsed}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Running indicator bar at bottom */}
      {isRunning && (
        <div className="h-0.5 overflow-hidden rounded-b">
          <div
            className="h-full"
            style={{
              backgroundColor: statusColor,
              animation: 'runBar 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes stepPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes statusPing {
          0% { transform: scale(1); opacity: 0.75; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes runBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
