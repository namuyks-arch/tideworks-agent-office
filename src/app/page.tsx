'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAgentStore, type AgentId } from '@/store/agent-store';
import { useChatStore } from '@/store/chat-store';
import { usePipelineStore, PIPELINE_TEMPLATES, type PipelineType } from '@/store/pipeline-store';
import { useHumanStore, HUMAN_ROLES } from '@/store/human-store';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import HumanJoinPanel from '@/components/human/HumanJoinPanel';
import ApprovalCard from '@/components/human/ApprovalCard';
import DebateParticipant from '@/components/human/DebateParticipant';

type CenterTab = 'chat' | 'results';

/* ================================================================== */
/*  AGENT DESK — 토스 스타일 심플 카드                                  */
/* ================================================================== */
function AgentDesk({ agentId }: { agentId: AgentId }) {
  const agent = useAgentStore((s) => s.agents[agentId]);

  const agentColor: Record<string, string> = {
    researcher: '#3182F6',
    analyst: '#7C3AED',
    strategist: '#F59E0B',
    manager: '#00B852',
  };

  const statusColor: Record<string, string> = {
    idle: '#D1D5DB',
    thinking: '#F59E0B',
    working: '#00B852',
    debating: '#7C3AED',
    waiting_approval: '#F59E0B',
    done: '#00B852',
    error: '#EF4444',
  };

  const statusLabel: Record<string, string> = {
    idle: '대기 중',
    thinking: '생각 중...',
    working: '작업 중...',
    debating: '토론 중...',
    waiting_approval: '승인 대기',
    done: '완료',
    error: '에러',
  };

  const isPulsing = ['thinking', 'working', 'debating', 'waiting_approval'].includes(agent.status);
  const color = agentColor[agentId] ?? '#3182F6';

  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white"
      style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* 에이전트 이모지 */}
      <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{agent.emoji}</span>

      {/* 이름 */}
      <span
        className="text-xs font-semibold text-center leading-tight"
        style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}
      >
        {agent.name}
      </span>

      {/* 상태 인디케이터 */}
      <div className="flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-full ${isPulsing ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: statusColor[agent.status] }}
        />
        <span
          className="text-[11px]"
          style={{ color: '#8B95A1', fontFamily: 'Pretendard, sans-serif' }}
        >
          {statusLabel[agent.status]}
        </span>
      </div>

      {/* 에이전트 색상 하단 바 */}
      <div
        className="w-full h-0.5 rounded-full mt-1"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ================================================================== */
/*  AGENT OFFICE PANEL — 좌측 패널                                      */
/* ================================================================== */
function AgentOfficePanel() {
  return (
    <div className="flex flex-col h-full gap-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-base font-bold" style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}>
          에이전트 현황
        </span>
      </div>

      {/* 에이전트 카드 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        <AgentDesk agentId="researcher" />
        <AgentDesk agentId="analyst" />
        <AgentDesk agentId="strategist" />
        <AgentDesk agentId="manager" />
      </div>

      {/* 사람 참여 패널 */}
      <HumanJoinPanel />
    </div>
  );
}

/* ================================================================== */
/*  CHAT MESSAGES — inner scrollable list                             */
/* ================================================================== */
function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const pendingApprovals = useHumanStore((s) => s.pendingApprovals);
  const approvalHistory = useHumanStore((s) => s.approvalHistory);
  const resolveApproval = useHumanStore((s) => s.resolveApproval);
  const addMessage = useChatStore((s) => s.addMessage);
  const activeRole = useHumanStore((s) => s.activeRole);
  const roleInfo = HUMAN_ROLES[activeRole];
  const bottomRef = useRef<HTMLDivElement>(null);

  // 토론 진행 감지
  const isDebating = messages.some(
    (m) => m.type === 'text' && m.content.startsWith('[토론 ')
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleApprove = (approvalId: string, title: string) => {
    resolveApproval(approvalId, 'approved');
    addMessage({
      sender: activeRole,
      senderName: roleInfo.name,
      senderEmoji: roleInfo.emoji,
      content: `"${title}" 승인 완료`,
      type: 'text',
    });
  };

  const handleReject = (approvalId: string, title: string) => {
    resolveApproval(approvalId, 'rejected');
    addMessage({
      sender: activeRole,
      senderName: roleInfo.name,
      senderEmoji: roleInfo.emoji,
      content: `"${title}" 반려`,
      type: 'text',
    });
  };

  const handleModify = (approvalId: string, title: string, feedback: string) => {
    resolveApproval(approvalId, 'revision_requested', feedback);
    addMessage({
      sender: activeRole,
      senderName: roleInfo.name,
      senderEmoji: roleInfo.emoji,
      content: `"${title}" 수정 요청: ${feedback}`,
      type: 'text',
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-2 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-5xl">💬</span>
            <p
              className="text-sm text-center"
              style={{ fontFamily: 'Pretendard, sans-serif', color: '#8B95A1' }}
            >
              파이프라인을 시작하면<br />에이전트들이 대화를 시작합니다
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isSystem = msg.sender === 'system' || msg.sender === '오류';
          const isHuman = ['ceo', 'sales_lead', 'reviewer', 'strategist_human'].includes(msg.sender);
          const agentClass = !isSystem && !isHuman
            ? `speech-bubble-${msg.sender}`
            : '';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-1">
                <span className="speech-bubble-system inline-block px-3 py-1">
                  {msg.senderEmoji} {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isHuman ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* 아바타 */}
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base bg-white"
                style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {msg.senderEmoji}
              </div>

              {/* 말풍선 */}
              <div className={`max-w-[78%] flex flex-col ${isHuman ? 'items-end' : 'items-start'}`}>
                <span
                  className="text-xs mb-1 font-semibold"
                  style={{ color: '#8B95A1', fontFamily: 'Pretendard, sans-serif' }}
                >
                  {msg.senderName}
                </span>

                {msg.type === 'approval_card' && msg.metadata?.approvalId ? (
                  (() => {
                    const approval =
                      pendingApprovals.find((a) => a.id === msg.metadata?.approvalId) ??
                      approvalHistory.find((a) => a.id === msg.metadata?.approvalId);
                    if (approval) {
                      return (
                        <ApprovalCard
                          approval={approval}
                          onApprove={() => handleApprove(approval.id, approval.title)}
                          onReject={() => handleReject(approval.id, approval.title)}
                          onModify={(feedback) =>
                            handleModify(approval.id, approval.title, feedback)
                          }
                        />
                      );
                    }
                    return (
                      <div className={`speech-bubble ${agentClass}`}>
                        <div style={{ borderLeft: '3px solid #F59E0B', paddingLeft: '8px' }}>
                          <span
                            className="text-xs block mb-1 font-semibold"
                            style={{ color: '#F59E0B', fontFamily: 'Pretendard, sans-serif' }}
                          >
                            ⏳ 승인 요청
                          </span>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className={isHuman ? 'speech-bubble-human' : `speech-bubble ${agentClass}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 토론 중 DebateParticipant */}
      {isDebating && (
        <div
          className="px-2 pt-2 pb-1"
          style={{ borderTop: '1px solid #E5E8EB' }}
        >
          <DebateParticipant />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  CENTER PANEL — 탭: 대화 / 결과                                      */
/* ================================================================== */
function CenterPanel({
  activeTab,
  onTabChange,
  selectedPipeline,
}: {
  activeTab: CenterTab;
  onTabChange: (tab: CenterTab) => void;
  selectedPipeline: PipelineType;
}) {
  const messages = useChatStore((s) => s.messages);

  return (
    <div className="flex flex-col h-full">
      {/* 토스 스타일 언더라인 탭 */}
      <div
        className="flex items-center mb-3 px-1"
        style={{ borderBottom: '1px solid #E5E8EB' }}
      >
        <button
          onClick={() => onTabChange('chat')}
          className="px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            fontFamily: 'Pretendard, sans-serif',
            color: activeTab === 'chat' ? '#191F28' : '#8B95A1',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid #3182F6' : '2px solid transparent',
            marginBottom: '-1px',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          💬 대화
        </button>
        <button
          onClick={() => onTabChange('results')}
          className="px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            fontFamily: 'Pretendard, sans-serif',
            color: activeTab === 'results' ? '#191F28' : '#8B95A1',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: activeTab === 'results' ? '2px solid #3182F6' : '2px solid transparent',
            marginBottom: '-1px',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          📊 결과
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            <ChatMessages />
          </div>
        ) : (
          <ResultsPanel
            pipelineType={selectedPipeline}
            messages={messages}
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PIPELINE PANEL — 우측 패널                                          */
/* ================================================================== */
function PipelinePanel() {
  const pipeline = usePipelineStore((s) => s.currentPipeline);
  const history = usePipelineStore((s) => s.history);
  const pendingApprovals = useHumanStore((s) => s.pendingApprovals);

  const stepIcon = (status: string) => {
    if (status === 'completed') return '✓';
    if (status === 'running') return '→';
    if (status === 'error') return '✕';
    return '○';
  };

  const stepColor = (status: string) => {
    if (status === 'completed') return '#00B852';
    if (status === 'running') return '#3182F6';
    if (status === 'error') return '#EF4444';
    return '#D1D5DB';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="text-base font-bold"
          style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}
        >
          파이프라인
        </span>
      </div>

      {!pipeline && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl p-6"
          style={{ background: '#ffffff', border: '1px solid #E5E8EB' }}
        >
          <span className="text-4xl">🚀</span>
          <p
            className="text-sm text-center"
            style={{ fontFamily: 'Pretendard, sans-serif', color: '#8B95A1' }}
          >
            아래에서 파이프라인을<br />선택하여 시작하세요
          </p>
          {history.length > 0 && (
            <p
              className="text-xs text-center"
              style={{ fontFamily: 'Pretendard, sans-serif', color: '#B0B8C1' }}
            >
              완료된 파이프라인: {history.length}개
            </p>
          )}
        </div>
      )}

      {pipeline && (
        <div className="flex-1 overflow-y-auto space-y-3 px-1">
          {/* 파이프라인 헤더 카드 */}
          <div
            className="rounded-xl p-4 bg-white"
            style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-bold"
                style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}
              >
                {pipeline.label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  fontFamily: 'Pretendard, sans-serif',
                  backgroundColor:
                    pipeline.status === 'running' ? '#E8F5E9'
                    : pipeline.status === 'completed' ? '#EBF3FF'
                    : pipeline.status === 'error' ? '#FEECEC'
                    : '#F2F4F6',
                  color:
                    pipeline.status === 'running' ? '#00B852'
                    : pipeline.status === 'completed' ? '#3182F6'
                    : pipeline.status === 'error' ? '#EF4444'
                    : '#8B95A1',
                }}
              >
                {pipeline.status === 'running' ? '실행 중'
                  : pipeline.status === 'completed' ? '완료'
                  : pipeline.status === 'error' ? '오류'
                  : '대기'}
              </span>
            </div>

            {/* 진행바 */}
            <div
              className="w-full rounded-full h-1.5 mb-4"
              style={{ backgroundColor: '#F2F4F6' }}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (pipeline.steps.filter((s) => s.status === 'completed').length /
                      pipeline.steps.length) *
                    100
                  }%`,
                  backgroundColor: '#3182F6',
                }}
              />
            </div>

            {/* 스텝 리스트 */}
            <div className="space-y-2">
              {pipeline.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
                  style={{
                    backgroundColor: step.status === 'running' ? '#EBF3FF' : 'transparent',
                  }}
                >
                  {/* 상태 아이콘 */}
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      backgroundColor: stepColor(step.status) + '1A',
                      color: stepColor(step.status),
                    }}
                  >
                    {stepIcon(step.status)}
                  </span>

                  {/* 스텝 이름 */}
                  <span
                    className="flex-1 text-sm truncate"
                    style={{
                      fontFamily: 'Pretendard, sans-serif',
                      color:
                        step.status === 'running' ? '#191F28'
                        : step.status === 'completed' ? '#B0B8C1'
                        : '#6B7280',
                      fontWeight: step.status === 'running' ? 600 : 400,
                    }}
                  >
                    {idx + 1}. {step.name}
                  </span>

                  {/* 담당 에이전트 태그 */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                    style={{
                      fontFamily: 'Pretendard, sans-serif',
                      color: '#8B95A1',
                      backgroundColor: '#F2F4F6',
                    }}
                  >
                    {step.assignedAgent.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 승인 대기 카드 */}
          {pendingApprovals.length > 0 && (
            <div
              className="rounded-xl p-4 bg-white"
              style={{ border: '1px solid #FDE68A', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <span
                className="text-sm font-bold block mb-3"
                style={{ color: '#F59E0B', fontFamily: 'Pretendard, sans-serif' }}
              >
                ⏳ 승인 대기 ({pendingApprovals.length})
              </span>
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-lg p-3 mb-2"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <p
                    className="text-sm mb-2"
                    style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {approval.title}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-lg text-white text-xs font-semibold transition-colors"
                      style={{ backgroundColor: '#00B852', fontFamily: 'Pretendard, sans-serif' }}
                    >
                      승인
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg text-white text-xs font-semibold transition-colors"
                      style={{ backgroundColor: '#EF4444', fontFamily: 'Pretendard, sans-serif' }}
                    >
                      반려
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TOP NAV                                                           */
/* ================================================================== */
function TopNav({
  selectedPipeline,
  onPipelineSelect,
}: {
  selectedPipeline: PipelineType;
  onPipelineSelect: (type: PipelineType) => void;
}) {
  const pipelineTypes: PipelineType[] = ['lead_discovery', 'proposal', 'onboarding'];

  return (
    <nav
      className="h-12 bg-white flex items-center justify-between px-5"
      style={{ borderBottom: '1px solid #E5E8EB' }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: '#191F28', fontFamily: 'Pretendard, sans-serif' }}
        >
          Tideworks
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: '#3182F6', backgroundColor: '#EBF3FF', fontFamily: 'Pretendard, sans-serif' }}
        >
          Agent Office
        </span>
      </div>

      {/* 파이프라인 탭 */}
      <div className="flex items-center gap-1">
        {pipelineTypes.map((type) => (
          <button
            key={type}
            onClick={() => onPipelineSelect(type)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              fontFamily: 'Pretendard, sans-serif',
              backgroundColor: selectedPipeline === type ? '#3182F6' : 'transparent',
              color: selectedPipeline === type ? '#ffffff' : '#6B7280',
            }}
          >
            {PIPELINE_TEMPLATES[type].label}
          </button>
        ))}
      </div>

      {/* 설정 */}
      <Link
        href="/settings"
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: '#6B7280', fontFamily: 'Pretendard, sans-serif' }}
      >
        <span>⚙️</span>
        <span>설정</span>
      </Link>
    </nav>
  );
}

/* ================================================================== */
/*  BOTTOM INPUT BAR                                                  */
/* ================================================================== */
function BottomBar({
  selectedPipeline,
  onPipelineComplete,
}: {
  selectedPipeline: PipelineType;
  onPipelineComplete: () => void;
}) {
  const [chatInput, setChatInput] = useState('');
  const [industry, setIndustry] = useState('뷰티');
  const [revenueRange, setRevenueRange] = useState('50억~500억');
  const [channelCond, setChannelCond] = useState('SNS 광고 집행 중');
  const [daThreshold, setDaThreshold] = useState('30');

  const startPipeline = usePipelineStore((s) => s.startPipeline);
  const currentPipeline = usePipelineStore((s) => s.currentPipeline);
  const addChatMessage = useChatStore((s) => s.addMessage);
  const activeRole = useHumanStore((s) => s.activeRole);
  const roleInfo = HUMAN_ROLES[activeRole];

  const pipelineTypeMap: Record<string, string> = {
    lead_discovery: 'lead-discovery',
    proposal: 'proposal-gen',
    onboarding: 'onboarding',
  };

  const buildInput = (): Record<string, unknown> => {
    if (selectedPipeline === 'lead_discovery') {
      return {
        industry,
        revenueRange,
        channelCondition: channelCond,
        daThreshold: Number(daThreshold) || 30,
      };
    }
    if (selectedPipeline === 'proposal') return { brand: '브랜드명', industry: '뷰티', channel: '쿠팡', budget: '월 500~1000만원' };
    return { clientName: '고객사', services: ['GEO_AEO', 'COMMERCE'] };
  };

  const handleStart = async () => {
    if (currentPipeline?.status === 'running') return;

    const apiType = pipelineTypeMap[selectedPipeline];
    const input = buildInput();

    startPipeline(selectedPipeline);
    addChatMessage({
      sender: 'system',
      senderName: '시스템',
      senderEmoji: '🔔',
      content: `[${PIPELINE_TEMPLATES[selectedPipeline].label}] 파이프라인이 시작되었습니다.`,
      type: 'system',
    });

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineType: apiType, input }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const eventLine = part.split('\n').find((l) => l.startsWith('event:'));
          const dataLine = part.split('\n').find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace('event:', '').trim();
          const payload = JSON.parse(dataLine.replace('data:', '').trim());

          if (eventType === 'agent:status') {
            useAgentStore.getState().setStatus(payload.agentId, payload.status, payload.currentTask);
          } else if (eventType === 'agent:message') {
            const agentInfo = useAgentStore.getState().agents[payload.agentId as AgentId];
            useChatStore.getState().addMessage({
              sender: payload.agentId,
              senderName: agentInfo?.name ?? payload.agentId,
              senderEmoji: agentInfo?.emoji ?? '🤖',
              content: payload.content,
              type: payload.type === 'json' ? 'json' : 'text',
              metadata: payload.metadata,
            });
          } else if (eventType === 'pipeline:step') {
            usePipelineStore.getState().setCurrentStep(payload.stepId);
            addChatMessage({
              sender: 'system',
              senderName: '시스템',
              senderEmoji: '📋',
              content: `Step ${payload.order}/${payload.totalSteps}: ${payload.stepName}`,
              type: 'system',
            });
          } else if (eventType === 'debate:round') {
            const analystInfo = useAgentStore.getState().agents['analyst'];
            const strategistInfo = useAgentStore.getState().agents['strategist'];
            useChatStore.getState().addMessage({
              sender: 'analyst',
              senderName: analystInfo.name,
              senderEmoji: analystInfo.emoji,
              content: `[토론 ${payload.round}라운드] ${payload.analystMessage}`,
              type: 'text',
            });
            useChatStore.getState().addMessage({
              sender: 'strategist',
              senderName: strategistInfo.name,
              senderEmoji: strategistInfo.emoji,
              content: `[토론 ${payload.round}라운드] ${payload.strategistMessage}`,
              type: 'text',
            });
          } else if (eventType === 'approval:request') {
            const approvalId = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            useHumanStore.getState().addApprovalWithId({
              id: approvalId,
              stepId: payload.stepId,
              pipelineId: 'current',
              agentId: payload.agentId,
              title: payload.summary,
              description: payload.summary,
              data: payload.data,
            });
            const agentInfoForApproval = useAgentStore.getState().agents[payload.agentId as AgentId];
            useChatStore.getState().addMessage({
              sender: payload.agentId,
              senderName: agentInfoForApproval?.name ?? payload.agentId,
              senderEmoji: agentInfoForApproval?.emoji ?? '🤖',
              content: payload.summary,
              type: 'approval_card',
              metadata: { approvalId },
            });
          } else if (eventType === 'pipeline:complete') {
            usePipelineStore.getState().completePipeline();
            addChatMessage({
              sender: 'system',
              senderName: '시스템',
              senderEmoji: '✅',
              content: `파이프라인 완료! (${Math.round(payload.durationMs / 1000)}초) ${payload.summary}`,
              type: 'system',
            });
            onPipelineComplete();
          } else if (eventType === 'error') {
            addChatMessage({
              sender: 'system',
              senderName: '오류',
              senderEmoji: '⚠️',
              content: `오류 발생: ${payload.message}`,
              type: 'system',
            });
          }
        }
      }
    } catch (err) {
      addChatMessage({
        sender: 'system',
        senderName: '오류',
        senderEmoji: '⚠️',
        content: `연결 오류: ${err instanceof Error ? err.message : String(err)}`,
        type: 'system',
      });
    }
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    addChatMessage({
      sender: activeRole,
      senderName: roleInfo.name,
      senderEmoji: roleInfo.emoji,
      content: chatInput.trim(),
      type: 'text',
    });
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isRunning = currentPipeline?.status === 'running';
  const messages = useChatStore((s) => s.messages);
  const isDebating = messages.some(
    (m) => m.type === 'text' && m.content.startsWith('[토론 ')
  );
  const isLeadPipeline = selectedPipeline === 'lead_discovery';

  return (
    <div
      className="bg-white px-4 py-3 flex flex-col gap-2"
      style={{ borderTop: '1px solid #E5E8EB' }}
    >
      {isDebating && <DebateParticipant />}

      {/* 리드 발굴 조건 입력 */}
      {isLeadPipeline && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{ color: '#8B95A1', fontFamily: 'Pretendard, sans-serif' }}
          >
            타겟 조건:
          </span>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="업종 (뷰티·패션·식품)"
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-28"
            style={{
              fontFamily: 'Pretendard, sans-serif',
              backgroundColor: '#F2F4F6',
              border: '1px solid #E5E8EB',
              color: '#191F28',
            }}
          />
          <input
            value={revenueRange}
            onChange={(e) => setRevenueRange(e.target.value)}
            placeholder="연매출 (50억~500억)"
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-32"
            style={{
              fontFamily: 'Pretendard, sans-serif',
              backgroundColor: '#F2F4F6',
              border: '1px solid #E5E8EB',
              color: '#191F28',
            }}
          />
          <input
            value={channelCond}
            onChange={(e) => setChannelCond(e.target.value)}
            placeholder="채널 조건"
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-36"
            style={{
              fontFamily: 'Pretendard, sans-serif',
              backgroundColor: '#F2F4F6',
              border: '1px solid #E5E8EB',
              color: '#191F28',
            }}
          />
          <div className="flex items-center gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: '#8B95A1', fontFamily: 'Pretendard, sans-serif' }}
            >
              DA≤
            </span>
            <input
              value={daThreshold}
              onChange={(e) => setDaThreshold(e.target.value)}
              type="number"
              placeholder="30"
              className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-14"
              style={{
                fontFamily: 'Pretendard, sans-serif',
                backgroundColor: '#F2F4F6',
                border: '1px solid #E5E8EB',
                color: '#191F28',
              }}
            />
          </div>
        </div>
      )}

      {/* 입력 바 */}
      <div className="flex items-center gap-2 h-10">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
          style={{
            fontFamily: 'Pretendard, sans-serif',
            backgroundColor: isRunning ? '#E5E8EB' : '#3182F6',
            color: isRunning ? '#B0B8C1' : '#ffffff',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxShadow: isRunning ? 'none' : '0 2px 8px rgba(49,130,246,0.25)',
          }}
        >
          {isRunning ? '실행 중...' : '▶ 시작'}
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="에이전트에게 메시지 보내기..."
            className="w-full rounded-xl px-4 py-2 text-sm focus:outline-none transition-colors"
            style={{
              fontFamily: 'Pretendard, sans-serif',
              backgroundColor: '#F2F4F6',
              border: '1px solid #E5E8EB',
              color: '#191F28',
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!chatInput.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{
            fontFamily: 'Pretendard, sans-serif',
            backgroundColor: chatInput.trim() ? '#3182F6' : '#E5E8EB',
            color: chatInput.trim() ? '#ffffff' : '#B0B8C1',
            cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function HomePage() {
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineType>('lead_discovery');
  const [activeTab, setActiveTab] = useState<CenterTab>('chat');

  const handlePipelineComplete = useCallback(() => {
    setActiveTab('results');
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#F2F4F6' }}>
      {/* Top Navigation */}
      <TopNav
        selectedPipeline={selectedPipeline}
        onPipelineSelect={setSelectedPipeline}
      />

      {/* 3패널 레이아웃 */}
      <main className="flex-1 flex overflow-hidden gap-3 p-3">
        {/* LEFT: 에이전트 현황 + 사람 참여 */}
        <section
          className="w-[270px] flex-shrink-0 rounded-2xl bg-white p-4 overflow-y-auto"
          style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <AgentOfficePanel />
        </section>

        {/* CENTER: 채팅 / 결과 */}
        <section
          className="flex-1 min-w-0 rounded-2xl bg-white p-4 overflow-hidden"
          style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <CenterPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedPipeline={selectedPipeline}
          />
        </section>

        {/* RIGHT: 파이프라인 진행 */}
        <section
          className="w-[280px] flex-shrink-0 rounded-2xl bg-white p-4 overflow-y-auto"
          style={{ border: '1px solid #E5E8EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <PipelinePanel />
        </section>
      </main>

      {/* Bottom Input Bar */}
      <BottomBar
        selectedPipeline={selectedPipeline}
        onPipelineComplete={handlePipelineComplete}
      />
    </div>
  );
}
