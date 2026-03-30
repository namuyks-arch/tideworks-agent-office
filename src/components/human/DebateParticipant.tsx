'use client';

import { useState } from 'react';
import { useHumanStore, HUMAN_ROLES } from '@/store/human-store';
import { useChatStore } from '@/store/chat-store';

/* ================================================================== */
/*  DEBATE PARTICIPANT                                                  */
/*  토론 진행 중 사람이 의견을 낄 수 있는 인풋 바                       */
/*  토론 단계(debate:round)에서 채팅창 하단에 추가로 표시               */
/* ================================================================== */

export default function DebateParticipant() {
  const [opinion, setOpinion] = useState('');
  const activeRole = useHumanStore((s) => s.activeRole);
  const roleInfo = HUMAN_ROLES[activeRole];
  const addMessage = useChatStore((s) => s.addMessage);

  const handleSpeak = () => {
    if (!opinion.trim()) return;

    addMessage({
      sender: activeRole,
      senderName: roleInfo.name,
      senderEmoji: roleInfo.emoji,
      content: `[토론 참여] ${opinion.trim()}`,
      type: 'text',
    });

    setOpinion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSpeak();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        backgroundColor: 'rgba(155, 89, 182, 0.08)',
        border: '1px solid rgba(155, 89, 182, 0.3)',
        borderRadius: '8px',
        marginTop: '4px',
      }}
    >
      {/* 아이콘 + 레이블 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '14px' }}>🗣️</span>
        <span
          className="pixel-text"
          style={{ fontSize: '9px', color: '#9b59b6', whiteSpace: 'nowrap' }}
        >
          토론 참여:
        </span>
      </div>

      {/* 입력 필드 */}
      <input
        type="text"
        value={opinion}
        onChange={(e) => setOpinion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="내 의견 입력..."
        style={{
          flex: 1,
          padding: '5px 10px',
          backgroundColor: '#0f1420',
          border: '1px solid #2e3347',
          borderRadius: '5px',
          color: '#e8eaf0',
          fontSize: '12px',
          outline: 'none',
          transition: 'border-color 150ms ease',
          minWidth: 0,
        }}
        onFocus={(e) => {
          (e.target as HTMLInputElement).style.borderColor = '#9b59b6';
        }}
        onBlur={(e) => {
          (e.target as HTMLInputElement).style.borderColor = '#2e3347';
        }}
      />

      {/* 발언 버튼 */}
      <button
        onClick={handleSpeak}
        disabled={!opinion.trim()}
        style={{
          padding: '5px 12px',
          backgroundColor: opinion.trim() ? '#9b59b6' : '#2e3347',
          color: opinion.trim() ? '#fff' : '#6a6a7a',
          border: 'none',
          borderRadius: '5px',
          cursor: opinion.trim() ? 'pointer' : 'not-allowed',
          fontSize: '11px',
          fontWeight: 600,
          transition: 'all 150ms ease',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}
        onMouseOver={(e) => {
          if (opinion.trim()) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8e44ad';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseOut={(e) => {
          if (opinion.trim()) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#9b59b6';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }
        }}
      >
        <span style={{ fontSize: '10px' }}>{roleInfo.emoji}</span>
        <span className="pixel-text" style={{ fontSize: '9px' }}>발언</span>
      </button>
    </div>
  );
}
