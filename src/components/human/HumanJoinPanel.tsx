'use client';

import { useHumanStore, HUMAN_ROLES, type HumanRole } from '@/store/human-store';

/* ================================================================== */
/*  HUMAN JOIN PANEL — 토스 스타일                                      */
/* ================================================================== */

const ROLE_ORDER: HumanRole[] = ['ceo', 'sales_lead', 'reviewer', 'strategist_human'];

export default function HumanJoinPanel() {
  const activeRole = useHumanStore((s) => s.activeRole);
  const joinedRoles = useHumanStore((s) => s.joinedRoles);
  const setActiveRole = useHumanStore((s) => s.setActiveRole);
  const joinRole = useHumanStore((s) => s.joinRole);
  const leaveRole = useHumanStore((s) => s.leaveRole);

  const handleRoleClick = (role: HumanRole) => {
    if (role === activeRole) return;
    setActiveRole(role);
  };

  const handleLeave = (e: React.MouseEvent, role: HumanRole) => {
    e.stopPropagation();
    leaveRole(role);
  };

  return (
    <div
      className="rounded-xl p-3 mt-1"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #E5E8EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* 섹션 헤더 */}
      <div
        className="flex items-center gap-2 mb-3 pb-2"
        style={{ borderBottom: '1px solid #E5E8EB' }}
      >
        <span style={{ fontSize: '15px' }}>👥</span>
        <span
          style={{
            fontSize: '13px',
            color: '#191F28',
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 700,
          }}
        >
          사람 참여
        </span>
      </div>

      {/* 역할 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ROLE_ORDER.map((role) => {
          const info = HUMAN_ROLES[role];
          const isActive = role === activeRole;
          const isJoined = joinedRoles.has(role);

          return (
            <button
              key={role}
              onClick={() => handleRoleClick(role)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '10px',
                border: isActive
                  ? '1.5px solid #3182F6'
                  : '1px solid #E5E8EB',
                backgroundColor: isActive
                  ? '#EBF3FF'
                  : isJoined
                  ? '#F9FAFB'
                  : '#ffffff',
                cursor: isActive ? 'default' : 'pointer',
                transition: 'all 150ms ease',
                width: '100%',
                textAlign: 'left',
              }}
              title={isActive ? '현재 역할' : isJoined ? '클릭하여 역할 전환' : '클릭하여 입장'}
            >
              {/* 역할 이모지 */}
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{info.emoji}</span>

              {/* 이름 */}
              <span
                style={{
                  flex: 1,
                  fontSize: '12px',
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#3182F6' : isJoined ? '#191F28' : '#8B95A1',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {info.label}
              </span>

              {/* 상태 영역 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isJoined ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#00B852',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'Pretendard, sans-serif',
                        color: '#00B852',
                        fontWeight: 500,
                      }}
                    >
                      온라인
                    </span>
                    {!isActive && (
                      <button
                        onClick={(e) => handleLeave(e, role)}
                        style={{
                          marginLeft: '2px',
                          padding: '0 4px',
                          fontSize: '13px',
                          color: '#B0B8C1',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          lineHeight: 1,
                        }}
                        title="퇴장"
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#D1D5DB',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'Pretendard, sans-serif',
                        color: '#B0B8C1',
                      }}
                    >
                      입장
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div
        className="mt-3 pt-2"
        style={{ borderTop: '1px solid #E5E8EB' }}
      >
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'Pretendard, sans-serif',
            color: '#B0B8C1',
            display: 'block',
            textAlign: 'center',
          }}
        >
          역할 클릭 시 해당 사람으로 전환
        </span>
      </div>
    </div>
  );
}
