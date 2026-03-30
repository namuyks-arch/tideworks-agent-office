'use client';

import type { ChatMessage } from '@/store/chat-store';
import type { LeadResult, ProposalResult, OnboardResult } from '@/store/pipeline-store';
import {
  parseLeadsFromMessages,
  parseProposalFromMessages,
  parseOnboardFromMessages,
} from '@/lib/parse-results';

// ─── Design tokens (토스 스타일) ──────────────────────────────────────────────

const COLOR = {
  bg: '#F2F4F6',
  card: '#ffffff',
  accent: '#3182F6',
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#3182F6',
  text: '#191F28',
  textMuted: '#8B95A1',
  border: '#E5E8EB',
  success: '#00B852',
} as const;

function priorityColor(priority: LeadResult['priority']): string {
  if (priority === 'high') return COLOR.priorityHigh;
  if (priority === 'medium') return COLOR.priorityMedium;
  return COLOR.priorityLow;
}

function priorityLabel(priority: LeadResult['priority']): string {
  if (priority === 'high') return '높음';
  if (priority === 'medium') return '중간';
  return '낮음';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{ backgroundColor: COLOR.card, border: `1px solid ${COLOR.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <h3
        className="text-xs font-bold mb-3 tracking-wide uppercase"
        style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  return (
    <div
      className="w-full rounded-full h-1.5 mt-1"
      style={{ backgroundColor: '#F2F4F6' }}
    >
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: COLOR.accent }}
      />
    </div>
  );
}

// ─── Lead results ─────────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: LeadResult }) {
  const pColor = priorityColor(lead.priority);
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        backgroundColor: COLOR.card,
        border: `1px solid ${COLOR.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: pColor + '15', color: pColor }}
          >
            {lead.rank}
          </span>
          <span
            className="font-semibold text-sm truncate"
            style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
          >
            {lead.name}
          </span>
        </div>
        <span
          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: pColor + '15', color: pColor, fontFamily: 'Pretendard, sans-serif' }}
        >
          {priorityLabel(lead.priority)}
        </span>
      </div>

      {/* Domain */}
      <p
        className="text-xs mb-3"
        style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
      >
        {lead.domain}
      </p>

      {/* Score bar */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[11px] font-medium"
          style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
        >
          스코어
        </span>
        <div className="flex-1">
          <ScoreBar score={lead.score} />
        </div>
        <span
          className="text-xs font-bold"
          style={{ color: COLOR.accent, fontFamily: 'Pretendard, sans-serif' }}
        >
          {lead.score}
        </span>
      </div>

      {/* Deal size */}
      {lead.dealSize && (
        <div className="flex items-center gap-1 mb-2">
          <span
            className="text-xs"
            style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
          >
            예상 딜:
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: '#F59E0B', fontFamily: 'Pretendard, sans-serif' }}
          >
            {lead.dealSize}
          </span>
        </div>
      )}

      {/* Sales point */}
      {lead.salesPoint && (
        <p
          className="text-xs leading-relaxed mb-1"
          style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
        >
          <span style={{ color: COLOR.textMuted }}>영업 포인트: </span>
          {lead.salesPoint}
        </p>
      )}

      {/* SEO summary */}
      {lead.seoSummary && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
        >
          {lead.seoSummary}
        </p>
      )}
    </div>
  );
}

function LeadsResults({ leads }: { leads: LeadResult[] }) {
  if (leads.length === 0) {
    return (
      <p
        className="text-xs text-center py-6"
        style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
      >
        리드 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <span
          className="text-xs font-medium"
          style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
        >
          총 {leads.length}개 리드
        </span>
        <div className="flex gap-3 text-[11px]">
          {(['high', 'medium', 'low'] as const).map((p) => (
            <span
              key={p}
              className="flex items-center gap-1 font-medium"
              style={{ color: priorityColor(p), fontFamily: 'Pretendard, sans-serif' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: priorityColor(p) }}
              />
              {priorityLabel(p)}
            </span>
          ))}
        </div>
      </div>
      {leads.map((lead) => (
        <LeadCard key={`${lead.rank}-${lead.domain}`} lead={lead} />
      ))}
    </div>
  );
}

// ─── Proposal results ─────────────────────────────────────────────────────────

function ProposalResults({ proposal }: { proposal: ProposalResult }) {
  return (
    <div>
      <SectionCard title="브랜드 현황">
        <div className="flex gap-6">
          <div>
            <p
              className="text-[11px] mb-1 font-medium"
              style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
            >
              브랜드
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
            >
              {proposal.brand || '-'}
            </p>
          </div>
          <div>
            <p
              className="text-[11px] mb-1 font-medium"
              style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
            >
              산업
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
            >
              {proposal.industry || '-'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="핵심 문제점">
        {proposal.problems.length === 0 ? (
          <p className="text-xs" style={{ color: COLOR.textMuted }}>-</p>
        ) : (
          <ul className="space-y-2">
            {proposal.problems.map((problem, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{
                    backgroundColor: COLOR.priorityHigh + '15',
                    color: COLOR.priorityHigh,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
                >
                  {problem}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="솔루션">
        <p
          className="text-xs leading-relaxed"
          style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
        >
          {proposal.solutions || '-'}
        </p>
      </SectionCard>

      <SectionCard title="예상 ROI">
        <p
          className="text-sm font-bold"
          style={{ color: COLOR.accent, fontFamily: 'Pretendard, sans-serif' }}
        >
          {proposal.roi || '-'}
        </p>
      </SectionCard>

      <SectionCard title="추천 패키지">
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-semibold"
            style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
          >
            {proposal.packageName || '-'}
          </span>
          <span
            className="px-3 py-1 rounded-lg text-sm font-bold"
            style={{
              backgroundColor: COLOR.accent + '15',
              color: COLOR.accent,
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            {proposal.packagePrice || '-'}
          </span>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Onboard results ──────────────────────────────────────────────────────────

function OnboardResults({ onboardPlan }: { onboardPlan: OnboardResult }) {
  return (
    <div>
      <SectionCard title="온보딩 개요">
        <div className="flex justify-between items-center">
          <div>
            <p
              className="text-[11px] mb-1 font-medium"
              style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
            >
              고객사
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
            >
              {onboardPlan.clientName || '-'}
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-[11px] mb-1 font-medium"
              style={{ color: COLOR.textMuted, fontFamily: 'Pretendard, sans-serif' }}
            >
              미팅 횟수
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: COLOR.accent, fontFamily: 'Pretendard, sans-serif' }}
            >
              {onboardPlan.meetingCount}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="체크리스트">
        {onboardPlan.checklist.length === 0 ? (
          <p className="text-xs" style={{ color: COLOR.textMuted }}>-</p>
        ) : (
          <ul className="space-y-2">
            {onboardPlan.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className="flex-shrink-0 mt-0.5 font-bold text-sm"
                  style={{ color: COLOR.success }}
                >
                  ✓
                </span>
                <span
                  style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="KPI 목표">
        {onboardPlan.kpis.length === 0 ? (
          <p className="text-xs" style={{ color: COLOR.textMuted }}>-</p>
        ) : (
          <ul className="space-y-2">
            {onboardPlan.kpis.map((kpi, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{
                    backgroundColor: COLOR.priorityLow + '15',
                    color: COLOR.priorityLow,
                  }}
                >
                  K
                </span>
                <span
                  style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
                >
                  {kpi}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {onboardPlan.emailDraft && (
        <SectionCard title="이메일 초안">
          <pre
            className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
            style={{ color: COLOR.text, fontFamily: 'Pretendard, sans-serif' }}
          >
            {onboardPlan.emailDraft}
          </pre>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Empty / loading state ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 py-16"
      style={{ color: COLOR.textMuted }}
    >
      <span className="text-5xl select-none">📊</span>
      <p
        className="text-sm text-center leading-relaxed"
        style={{ fontFamily: 'Pretendard, sans-serif', color: COLOR.textMuted }}
      >
        결과를 불러오는 중...
        <br />
        <span
          className="text-xs"
          style={{ color: '#B0B8C1' }}
        >
          파이프라인이 완료되면 여기에 표시됩니다
        </span>
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ResultsPanelProps {
  pipelineType: string;
  messages: ChatMessage[];
}

export function ResultsPanel({ pipelineType, messages }: ResultsPanelProps) {
  const isLead = pipelineType === 'lead_discovery' || pipelineType === 'lead-discovery';
  const isProposal = pipelineType === 'proposal' || pipelineType === 'proposal-gen';
  const isOnboarding = pipelineType === 'onboarding';

  const leads = isLead ? parseLeadsFromMessages(messages) : [];
  const proposal = isProposal ? parseProposalFromMessages(messages) : null;
  const onboardPlan = isOnboarding ? parseOnboardFromMessages(messages) : null;

  const hasData =
    (isLead && leads.length > 0) ||
    (isProposal && proposal !== null) ||
    (isOnboarding && onboardPlan !== null);

  return (
    <div
      className="h-full overflow-y-auto px-1"
      style={{ backgroundColor: COLOR.bg }}
    >
      {!hasData && <EmptyState />}

      {isLead && leads.length > 0 && <LeadsResults leads={leads} />}

      {isProposal && proposal !== null && (
        <ProposalResults proposal={proposal} />
      )}

      {isOnboarding && onboardPlan !== null && (
        <OnboardResults onboardPlan={onboardPlan} />
      )}
    </div>
  );
}
