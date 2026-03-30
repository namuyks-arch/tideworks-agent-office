'use client';

import React, { useEffect, useRef } from 'react';
import type { ChatMessageData } from '@/lib/types';
import SpeechBubble from './SpeechBubble';

interface ChatPanelProps {
  messages: ChatMessageData[];
  onApprove?: (messageId: string) => void;
  onReject?: (messageId: string) => void;
  onModify?: (messageId: string) => void;
}

export default function ChatPanel({
  messages,
  onApprove,
  onReject,
  onModify,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Group debate messages that are consecutive
  const groupedMessages: (ChatMessageData | ChatMessageData[])[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (
      msg.type === 'debate' &&
      i + 1 < messages.length &&
      messages[i + 1].type === 'debate' &&
      messages[i + 1].senderId !== msg.senderId
    ) {
      groupedMessages.push([msg, messages[i + 1]]);
      i++; // skip next
    } else {
      groupedMessages.push(msg);
    }
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden py-3"
      style={{
        backgroundColor: '#2c2137',
        scrollbarWidth: 'thin',
        scrollbarColor: '#5a4d6e #2c2137',
      }}
    >
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <span className="text-4xl">&#x1F3E2;</span>
          <p
            className="text-sm text-[#8b7fa6]"
            style={{ fontFamily: 'var(--font-pixel, "Courier New", monospace)' }}
          >
            Tideworks Agent Office
          </p>
          <p className="text-xs text-[#6b5f80] leading-relaxed">
            &#xD30C;&#xC774;&#xD504;&#xB77C;&#xC778;&#xC744; &#xC2DC;&#xC791;&#xD558;&#xBA74; &#xC5D0;&#xC774;&#xC804;&#xD2B8;&#xB4E4;&#xC774; &#xC5C5;&#xBB34;&#xB97C; &#xC2DC;&#xC791;&#xD569;&#xB2C8;&#xB2E4;
          </p>
        </div>
      )}

      {groupedMessages.map((item, idx) => {
        // Debate pair - side by side
        if (Array.isArray(item)) {
          return (
            <div
              key={`debate-${idx}`}
              className="flex gap-1 my-1.5 px-3"
            >
              <div className="flex-1">
                <SpeechBubble message={item[0]} />
              </div>
              <div className="flex items-center text-sm">&#x26A1;</div>
              <div className="flex-1">
                <SpeechBubble message={item[1]} />
              </div>
            </div>
          );
        }

        // Normal message
        return (
          <SpeechBubble
            key={item.id}
            message={item}
            onApprove={onApprove}
            onReject={onReject}
            onModify={onModify}
          />
        );
      })}

      {/* Auto-scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
