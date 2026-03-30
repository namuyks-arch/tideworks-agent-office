'use client';

import React from 'react';
import type { PipelineState } from '@/lib/types';
import Button from '@/components/ui/Button';
import StepCard from './StepCard';

interface PipelineProgressProps {
  pipeline: PipelineState | null;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

function formatElapsed(startedAt?: number, completedAt?: number): string {
  if (!startedAt) return '--:--';
  const endTime = completedAt || Date.now();
  const diffSec = Math.floor((endTime - startedAt) / 1000);
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PipelineProgress({
  pipeline,
  onStart,
  onPause,
  onStop,
}: PipelineProgressProps) {
  if (!pipeline) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-3 p-4"
        style={{
          backgroundColor: '#2c2137',
        }}
      >
        <span className="text-3xl opacity-30">&#x1F4CB;</span>
        <p
          className="text-xs text-[#6b5f80] text-center"
          style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
        >
          &#xD30C;&#xC774;&#xD504;&#xB77C;&#xC778;&#xC774; &#xC5C6;&#xC2B5;&#xB2C8;&#xB2E4;
        </p>
        <p className="text-[10px] text-[#5a4d6e] text-center leading-relaxed">
          &#xCC44;&#xD305;&#xC5D0;&#xC11C; &#xD30C;&#xC774;&#xD504;&#xB77C;&#xC778;&#xC744; &#xC2DC;&#xC791;&#xD558;&#xC138;&#xC694;
        </p>
      </div>
    );
  }

  const totalSteps = pipeline.steps.length;
  const completedSteps = pipeline.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isRunning = pipeline.status === 'running';
  const isPaused = pipeline.status === 'paused';
  const isCompleted = pipeline.status === 'completed';
  const isError = pipeline.status === 'error';
  const elapsed = formatElapsed(pipeline.startedAt, pipeline.completedAt);

  // Status header color
  const headerColor = isCompleted
    ? '#22c55e'
    : isError
      ? '#ef4444'
      : isPaused
        ? '#eab308'
        : '#00d4aa';

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#2c2137' }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-2 px-3 py-3 border-b"
        style={{ borderColor: '#5a4d6e44' }}
      >
        {/* Pipeline name + status */}
        <div className="flex items-center justify-between">
          <h3
            className="text-xs font-bold truncate"
            style={{
              color: headerColor,
              fontFamily: 'var(--font-pixel, "Courier New", monospace)',
              textShadow: `0 0 6px ${headerColor}44`,
            }}
          >
            {pipeline.name}
          </h3>
          <span
            className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              color: headerColor,
              borderColor: `${headerColor}44`,
              backgroundColor: `${headerColor}11`,
              fontFamily: 'var(--font-pixel, "Courier New", monospace)',
            }}
          >
            {isRunning && '\uC2E4\uD589\uC911'}
            {isPaused && '\uC77C\uC2DC\uC815\uC9C0'}
            {isCompleted && '\uC644\uB8CC'}
            {isError && '\uC624\uB958'}
            {pipeline.status === 'idle' && '\uB300\uAE30'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid #5a4d6e44',
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: headerColor,
                boxShadow: `0 0 6px ${headerColor}44`,
              }}
            />
          </div>
          <span
            className="flex-shrink-0 text-[10px] font-bold tabular-nums w-8 text-right"
            style={{
              color: headerColor,
              fontFamily: 'var(--font-pixel, "Courier New", monospace)',
            }}
          >
            {progressPct}%
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Step count */}
            <span
              className="text-[10px] text-[#8b7fa6]"
              style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
            >
              &#xB2E8;&#xACC4; {completedSteps}/{totalSteps}
            </span>
            {/* Elapsed time */}
            <span
              className="text-[10px] text-[#8b7fa6] tabular-nums"
              style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
            >
              &#x23F1; {elapsed}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-1.5">
          {!isRunning && !isCompleted && (
            <Button variant="primary" size="sm" onClick={onStart} className="flex-1">
              &#x25B6; &#xC2DC;&#xC791;
            </Button>
          )}
          {isRunning && (
            <Button variant="secondary" size="sm" onClick={onPause} className="flex-1">
              &#x23F8; &#xC77C;&#xC2DC;&#xC815;&#xC9C0;
            </Button>
          )}
          {isPaused && (
            <Button variant="primary" size="sm" onClick={onStart} className="flex-1">
              &#x25B6; &#xC7AC;&#xAC1C;
            </Button>
          )}
          {(isRunning || isPaused) && (
            <Button variant="danger" size="sm" onClick={onStop}>
              &#x23F9; &#xC911;&#xC9C0;
            </Button>
          )}
        </div>
      </div>

      {/* Steps list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#5a4d6e #2c2137',
        }}
      >
        {pipeline.steps.map((step, idx) => (
          <div key={step.id} className="relative">
            {/* Vertical connector line */}
            {idx < pipeline.steps.length - 1 && (
              <div
                className="absolute left-[17px] top-[32px] w-[2px] h-[calc(100%-10px)]"
                style={{
                  backgroundColor:
                    idx < pipeline.currentStepIndex
                      ? '#22c55e44'
                      : '#5a4d6e33',
                }}
              />
            )}
            <StepCard
              step={step}
              stepNumber={idx + 1}
              isCurrent={idx === pipeline.currentStepIndex}
              isCompleted={
                step.status === 'completed' || step.status === 'skipped'
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
