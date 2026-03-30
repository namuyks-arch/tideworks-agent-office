'use client';

import { useState } from 'react';
import { type ApprovalRequest } from '@/store/human-store';

/* ================================================================== */
/*  APPROVAL CARD                                                       */
/*  파이프라인이 승인 요청 시 채팅창에 표시되는 인터랙티브 카드         */
/* ================================================================== */

type ApprovalCardProps = {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  onModify: (feedback: string) => void;
};

type CardState = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export default function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onModify,
}: ApprovalCardProps) {
  const [feedback, setFeedback] = useState('');
  const [cardState, setCardState] = useState<CardState>(
    approval.status === 'pending' ? 'pending' : (approval.status as CardState)
  );

  const handleApprove = () => {
    setCardState('approved');
    onApprove();
  };

  const handleReject = () => {
    setCardState('rejected');
    onReject();
  };

  const handleModify = () => {
    if (!feedback.trim()) return;
    setCardState('revision_requested');
    onModify(feedback.trim());
  };

  // ─── 처리 완료 상태 표시 ───────────────────────────────────────────
  if (cardState !== 'pending') {
    const stateConfig: Record<
      Exclude<CardState, 'pending'>,
      { icon: string; label: string; color: string; bg: string; border: string }
    > = {
      approved: {
        icon: '✅',
        label: '승인됨',
        color: '#2ecc71',
        bg: 'rgba(46, 204, 113, 0.1)',
        border: '#2ecc71',
      },
      rejected: {
        icon: '❌',
        label: '반려됨',
        color: '#e74c3c',
        bg: 'rgba(231, 76, 60, 0.1)',
        border: '#e74c3c',
      },
      revision_requested: {
        icon: '✏️',
        label: '수정 요청됨',
        color: '#f39c12',
        bg: 'rgba(243, 156, 18, 0.1)',
        border: '#f39c12',
      },
    };

    const cfg = stateConfig[cardState];

    return (
      <div
        style={{
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
        <div>
          <span
            className="pixel-text"
            style={{ fontSize: '10px', color: cfg.color, display: 'block' }}
          >
            {cfg.label}
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{approval.title}</span>
        </div>
      </div>
    );
  }

  // ─── 승인 대기 상태 (전체 카드) ───────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: '#1a1f2e',
        border: '1px solid #f39c12',
        borderRadius: '8px',
        padding: '14px',
        width: '100%',
        maxWidth: '360px',
      }}
    >
      {/* 카드 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid #2e3347',
        }}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>⏳</span>
        <div>
          <span
            className="pixel-text"
            style={{ fontSize: '10px', color: '#f39c12', display: 'block', marginBottom: '2px' }}
          >
            승인 요청
          </span>
          <span style={{ fontSize: '11px', color: '#c8d0e0', display: 'block' }}>
            {approval.title}
          </span>
          {approval.description && approval.description !== approval.title && (
            <span
              style={{
                fontSize: '11px',
                color: '#8a90a0',
                display: 'block',
                marginTop: '4px',
                lineHeight: 1.5,
              }}
            >
              {approval.description}
            </span>
          )}
        </div>
      </div>

      {/* 액션 버튼 3개 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          onClick={handleApprove}
          style={{
            flex: 1,
            padding: '7px 4px',
            backgroundColor: '#2ecc71',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#27ae60';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2ecc71';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          <span>✅</span>
          <span className="pixel-text" style={{ fontSize: '9px' }}>승인</span>
        </button>

        <button
          onClick={handleReject}
          style={{
            flex: 1,
            padding: '7px 4px',
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c0392b';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e74c3c';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          <span>❌</span>
          <span className="pixel-text" style={{ fontSize: '9px' }}>반려</span>
        </button>

        <button
          onClick={handleModify}
          disabled={!feedback.trim()}
          style={{
            flex: 1,
            padding: '7px 4px',
            backgroundColor: feedback.trim() ? '#f39c12' : '#5a4a30',
            color: feedback.trim() ? '#fff' : '#7a6a5a',
            border: 'none',
            borderRadius: '5px',
            cursor: feedback.trim() ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 600,
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
          }}
          onMouseOver={(e) => {
            if (feedback.trim()) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#d68910';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (feedback.trim()) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f39c12';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }
          }}
        >
          <span>✏️</span>
          <span className="pixel-text" style={{ fontSize: '9px' }}>수정 요청</span>
        </button>
      </div>

      {/* 의견 입력 영역 */}
      <div>
        <label
          className="pixel-text"
          style={{
            fontSize: '9px',
            color: '#7a80a0',
            display: 'block',
            marginBottom: '5px',
          }}
        >
          💬 의견 남기기:
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && feedback.trim()) handleModify();
            }}
            placeholder="수정 의견 입력..."
            style={{
              flex: 1,
              padding: '6px 10px',
              backgroundColor: '#0f1420',
              border: '1px solid #2e3347',
              borderRadius: '4px',
              color: '#e8eaf0',
              fontSize: '11px',
              outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#f39c12';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#2e3347';
            }}
          />
          <button
            onClick={handleModify}
            disabled={!feedback.trim()}
            style={{
              padding: '6px 10px',
              backgroundColor: feedback.trim() ? '#f39c12' : '#2e3347',
              color: feedback.trim() ? '#fff' : '#6a6a7a',
              border: 'none',
              borderRadius: '4px',
              cursor: feedback.trim() ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'background-color 150ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
