'use client';

import React, { useState } from 'react';
import type { ChatMessageData } from '@/lib/types';
import Button from '@/components/ui/Button';

interface SpeechBubbleProps {
  message: ChatMessageData;
  onApprove?: (messageId: string) => void;
  onReject?: (messageId: string) => void;
  onModify?: (messageId: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function SpeechBubble({
  message,
  onApprove,
  onReject,
  onModify,
}: SpeechBubbleProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const isAgent = message.senderType === 'agent';
  const isHuman = message.senderType === 'human';
  const isSystem = message.senderType === 'system';
  const isApproval = message.type === 'approval';
  const isDebate = message.type === 'debate';
  const isJson = message.type === 'json';
  const isError = message.type === 'error';

  // System messages - centered, muted
  if (isSystem) {
    return (
      <div className="flex justify-center my-2 px-4">
        <div
          className="px-3 py-1.5 text-[11px] text-[#8b7fa6] text-center rounded-full border border-[#5a4d6e]/30"
          style={{
            backgroundColor: 'rgba(61,51,82,0.4)',
            fontFamily: 'var(--font-pixel, "Courier New", monospace)',
          }}
        >
          {message.senderEmoji && (
            <span className="mr-1">{message.senderEmoji}</span>
          )}
          {message.content}
        </div>
      </div>
    );
  }

  // Layout alignment
  const alignment = isHuman ? 'justify-end' : 'justify-start';
  const bubbleMaxWidth = isApproval ? 'max-w-[95%]' : 'max-w-[85%]';

  // Bubble style
  const bubbleBg = isHuman
    ? 'rgba(0,212,170,0.12)'
    : isError
      ? 'rgba(239,68,68,0.1)'
      : 'rgba(0,0,0,0.25)';

  const bubbleBorder = isHuman
    ? '#00d4aa44'
    : isError
      ? '#ef444466'
      : message.senderColor
        ? `${message.senderColor}55`
        : '#5a4d6e55';

  return (
    <div className={`flex ${alignment} my-1.5 px-3`}>
      <div className={`flex flex-col ${bubbleMaxWidth} ${isHuman ? 'items-end' : 'items-start'}`}>
        {/* Sender info (agent messages only) */}
        {isAgent && (
          <div className="flex items-center gap-1.5 mb-0.5 px-1">
            <span className="text-sm">{message.senderEmoji}</span>
            <span
              className="text-[11px] font-bold"
              style={{
                color: message.senderColor || '#c4b5d4',
                fontFamily: 'var(--font-pixel, "Courier New", monospace)',
              }}
            >
              {message.senderName}
            </span>
          </div>
        )}

        {/* Speech bubble */}
        <div
          className="relative px-3 py-2 rounded-lg border"
          style={{
            backgroundColor: bubbleBg,
            borderColor: bubbleBorder,
            // Pixel-style box shadow for agent messages
            boxShadow: isAgent
              ? `2px 2px 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`
              : undefined,
          }}
        >
          {/* Debate indicator */}
          {isDebate && (
            <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-[#5a4d6e]/30">
              <span className="text-xs">&#x26A1;</span>
              <span
                className="text-[10px] text-[#f97316]"
                style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
              >
                &#xD1A0;&#xB860;
              </span>
            </div>
          )}

          {/* Approval card */}
          {isApproval && message.approvalData ? (
            <div className="flex flex-col gap-2">
              {/* Approval header */}
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#eab30833]">
                <span className="text-sm">&#x1F4CB;</span>
                <span
                  className="text-xs font-bold text-[#eab308]"
                  style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
                >
                  &#xC2B9;&#xC778; &#xC694;&#xCCAD;
                </span>
              </div>

              {/* Approval content */}
              <div>
                <h4
                  className="text-sm font-bold text-[#e2d8f0] mb-1"
                  style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
                >
                  {message.approvalData.title}
                </h4>
                <p className="text-xs text-[#c4b5d4] leading-relaxed">
                  {message.approvalData.description}
                </p>
                {message.approvalData.details && (
                  <div
                    className="mt-2 px-2 py-1.5 text-[10px] text-[#8b7fa6] bg-[#1a1525] rounded border border-[#5a4d6e]/30 whitespace-pre-wrap"
                    style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
                  >
                    {message.approvalData.details}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onApprove?.(message.id)}
                >
                  &#x2705; &#xC2B9;&#xC778;
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onReject?.(message.id)}
                >
                  &#x274C; &#xBC18;&#xB824;
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onModify?.(message.id)}
                >
                  &#x270F;&#xFE0F; &#xC218;&#xC815;
                </Button>
              </div>
            </div>
          ) : isJson && message.jsonData ? (
            /* JSON data - collapsible code block */
            <div className="flex flex-col gap-1">
              <p className="text-xs text-[#c4b5d4] leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              <button
                onClick={() => setJsonExpanded(!jsonExpanded)}
                className="flex items-center gap-1 text-[10px] text-[#00d4aa] hover:text-[#00e6bb] cursor-pointer mt-1"
                style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
              >
                <span
                  className="inline-block transition-transform duration-200"
                  style={{ transform: jsonExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  &#x25B6;
                </span>
                {jsonExpanded ? '&#xC811;&#xAE30;' : '&#xB370;&#xC774;&#xD130; &#xBCF4;&#xAE30;'}
              </button>
              {jsonExpanded && (
                <pre
                  className="mt-1 px-2 py-1.5 text-[10px] text-[#00d4aa] bg-[#0d0d0d] rounded border border-[#5a4d6e]/30 overflow-x-auto max-h-48 overflow-y-auto"
                  style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
                >
                  {JSON.stringify(message.jsonData, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            /* Normal text message */
            <p
              className={`text-xs leading-relaxed whitespace-pre-wrap ${
                isHuman ? 'text-[#e2d8f0]' : isError ? 'text-[#ef4444]' : 'text-[#c4b5d4]'
              }`}
            >
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <span
          className="text-[9px] text-[#6b5f80] mt-0.5 px-1"
          style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
