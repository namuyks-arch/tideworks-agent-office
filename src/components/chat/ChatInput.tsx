'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/components/ui/Button';

interface ChatInputProps {
  onSend: (text: string) => void;
  onPipelineStart?: (pipelineType: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  isPipelineRunning?: boolean;
  isWaitingApproval?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const QUICK_PIPELINES = [
  { id: 'lead_discovery', label: '\uD83D\uDD0D \uB9AC\uB4DC \uBC1C\uAD74', emoji: '\uD83D\uDD0D' },
  { id: 'proposal', label: '\uD83D\uDCC4 \uC81C\uC548\uC11C', emoji: '\uD83D\uDCC4' },
  { id: 'onboarding', label: '\uD83D\uDE80 \uC628\uBCF4\uB529', emoji: '\uD83D\uDE80' },
];

export default function ChatInput({
  onSend,
  onPipelineStart,
  onApprove,
  onReject,
  isPipelineRunning = false,
  isWaitingApproval = false,
  disabled = false,
  placeholder,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 border-t"
      style={{
        backgroundColor: '#241e30',
        borderColor: '#5a4d6e',
      }}
    >
      {/* Pipeline quick-start buttons (when no pipeline running) */}
      {!isPipelineRunning && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_PIPELINES.map((p) => (
            <button
              key={p.id}
              onClick={() => onPipelineStart?.(p.id)}
              disabled={disabled}
              className="flex-shrink-0 px-2.5 py-1.5 text-[11px] rounded border transition-all duration-150 cursor-pointer hover:border-[#00d4aa66] hover:bg-[#00d4aa0d] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderColor: '#5a4d6e55',
                color: '#c4b5d4',
                fontFamily: 'var(--font-pixel, "Courier New", monospace)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Approval buttons (when waiting for approval) */}
      {isWaitingApproval && (
        <div className="flex gap-2 pb-1">
          <Button
            variant="primary"
            size="sm"
            onClick={onApprove}
            className="flex-1"
          >
            &#x2705; &#xC2B9;&#xC778;
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onReject}
            className="flex-1"
          >
            &#x274C; &#xBC18;&#xB824;
          </Button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div
          className="flex-1 flex rounded-lg border overflow-hidden transition-colors duration-150"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderColor: text ? '#00d4aa55' : '#5a4d6e44',
          }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder ||
              (isPipelineRunning
                ? '\uC5D0\uC774\uC804\uD2B8\uC5D0\uAC8C \uC9C0\uC2DC\uD558\uAE30...'
                : '\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694...')
            }
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-xs text-[#e2d8f0] placeholder-[#6b5f80] px-3 py-2 resize-none outline-none"
            style={{
              fontFamily: 'var(--font-pixel, "Courier New", monospace)',
              maxHeight: '120px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#5a4d6e transparent',
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border-2 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: text.trim() ? '#00d4aa' : 'transparent',
            borderColor: text.trim() ? '#00d4aa' : '#5a4d6e44',
            color: text.trim() ? '#1a1525' : '#6b5f80',
          }}
          title="&#xC804;&#xC1A1; (Enter)"
        >
          {/* Send arrow SVG */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>

      {/* Pipeline running indicator */}
      {isPipelineRunning && !isWaitingApproval && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex gap-0.5">
            <span
              className="w-1 h-1 rounded-full bg-[#00d4aa]"
              style={{ animation: 'runDot 1s ease-in-out infinite 0s' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-[#00d4aa]"
              style={{ animation: 'runDot 1s ease-in-out infinite 0.2s' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-[#00d4aa]"
              style={{ animation: 'runDot 1s ease-in-out infinite 0.4s' }}
            />
          </div>
          <span
            className="text-[10px] text-[#00d4aa99]"
            style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
          >
            &#xD30C;&#xC774;&#xD504;&#xB77C;&#xC778; &#xC2E4;&#xD589;&#xC911;...
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes runDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
