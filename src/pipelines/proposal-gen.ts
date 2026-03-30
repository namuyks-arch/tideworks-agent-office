/**
 * Proposal Generation Pipeline
 *
 * 7단계 파이프라인: 종합적인 B2B 제안서를 생성합니다.
 *
 * 단계:
 *   1. 매니저가 리드 데이터 검토 및 진단 할당
 *   2. 애널리스트가 브랜드 진단 수행 (SWOT + 갭 분석)
 *   3. 애널리스트가 KPI 프레임워크 설계 (승인 필요)
 *   4. 스트래티지스트가 제안서 섹션 초안 작성
 *   5. 애널리스트 vs 스트래티지스트 가격/전략 토론 (승인 필요)
 *   6. 스트래티지스트가 최종 제안서 완성
 *   7. 매니저가 검토 후 Notion에 등록 (승인 필요)
 */

import type {
  PipelineStep,
  ProposalInput,
  BrandDiagnosis,
  ProposalDraft,
  DebateRound,
} from '@/agents/types';
import type { EmitEvent } from '@/app/api/agents/route';
import { waitForApproval } from '@/lib/approval-store';

// ---------------------------------------------------------------------------
// Pipeline Step Definitions
// ---------------------------------------------------------------------------

export const PROPOSAL_STEPS: PipelineStep[] = [
  {
    id: 'pg-step-1',
    name: '리드 데이터 검토',
    agentId: 'manager',
    mode: 'auto',
    description: '매니저가 입력된 리드 데이터를 검토하고 애널리스트에게 브랜드 진단을 할당합니다.',
    order: 1,
  },
  {
    id: 'pg-step-2',
    name: '브랜드 진단',
    agentId: 'analyst',
    mode: 'auto',
    description: '애널리스트가 SWOT 분석을 수행하고 SEO/AI 검색 갭을 파악하여 경쟁 현황을 구성합니다.',
    order: 2,
  },
  {
    id: 'pg-step-3',
    name: 'KPI 프레임워크',
    agentId: 'analyst',
    mode: 'approval',
    description: '애널리스트가 기준선과 목표치를 포함한 KPI 프레임워크를 설계합니다. 승인이 필요합니다.',
    order: 3,
  },
  {
    id: 'pg-step-4',
    name: '제안서 초안 작성',
    agentId: 'strategist',
    mode: 'auto',
    description: '스트래티지스트가 전략, 서비스, 예상 성과를 포함한 제안서 섹션을 초안으로 작성합니다.',
    order: 4,
  },
  {
    id: 'pg-step-5',
    name: '가격 및 전략 토론',
    agentId: 'analyst',
    mode: 'approval',
    description: '애널리스트와 스트래티지스트가 가격 티어와 전략 방향에 대해 토론합니다. 승인이 필요합니다.',
    order: 5,
  },
  {
    id: 'pg-step-6',
    name: '최종 제안서 완성',
    agentId: 'strategist',
    mode: 'auto',
    description: '스트래티지스트가 모든 섹션을 취합하여 최종 제안서 문서를 완성합니다.',
    order: 6,
  },
  {
    id: 'pg-step-7',
    name: '검토 및 등록',
    agentId: 'manager',
    mode: 'approval',
    description: '매니저가 최종 제안서를 검토하고 Notion에 등록합니다. 승인이 필요합니다.',
    order: 7,
  },
];

// ---------------------------------------------------------------------------
// Simulation Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateDiagnosis(input: ProposalInput): BrandDiagnosis {
  const brand = input.brand;
  const seo = input.seoData;

  return {
    brand,
    strengths: [
      `검증된 도메인 (DR ${seo.domainRating})`,
      `유기 키워드 ${seo.organicKeywords}개 보유`,
      `${brand.industry} 시장에서 활발히 활동 중`,
    ],
    weaknesses: [
      `AI 검색 가시성 ${seo.aiSearchVisibility}%에 불과`,
      `${seo.contentGap.join(', ')} 분야 콘텐츠 갭 존재`,
      seo.trafficTrend === 'declining' ? '유기 트래픽 하락 중' : '성장 정체 상태',
    ],
    opportunities: [
      'GEO/AEO 전략 도입',
      'AI 검색 엔진 최적화 콘텐츠 강화',
      '경쟁사 갭 선점',
    ],
    threats: [
      '경쟁사의 AI 검색 최적화 투자 가속',
      '알고리즘 변화로 인한 전통적 SEO 가치 하락',
      '업계 시장 통합 가속화',
    ],
    seoGaps: [
      'AI 검색을 위한 구조화 데이터 미비',
      'FAQ 스키마 미구현',
      'E-E-A-T 신호 부족',
    ],
    aiSearchGaps: [
      'AI 생성 답변에 미노출',
      'ChatGPT/Perplexity 인용에서 누락',
      'GEO 최적화 콘텐츠 없음',
    ],
    contentStrategy: `${seo.topKeywords.slice(0, 3).join(', ')} 키워드를 타깃으로 한 권위 있는 장문 콘텐츠 제작에 집중하며, 적절한 스키마 마크업을 적용합니다.`,
    competitorAnalysis: seo.competitorDomains.map((c) => ({
      competitor: c,
      advantage: 'AI 검색 가시성 우위',
      gap: '니치 주제 콘텐츠 깊이 부족',
    })),
    priorityActions: [
      'GEO/AEO 콘텐츠 전략 실행',
      '핵심 페이지에 구조화 데이터 추가',
      '주제 권위 콘텐츠 클러스터 구축',
      'E-E-A-T 신호 강화',
    ],
    estimatedImpact: '6개월 내 AI 검색 가시성 40~60% 향상 예상.',
  };
}

function generateProposalDraft(
  input: ProposalInput,
  diagnosis: BrandDiagnosis,
): ProposalDraft {
  return {
    title: `${input.brand.name} - 디지털 성장 제안서`,
    clientName: input.brand.name,
    executiveSummary: `본 제안서는 ${input.brand.name}의 디지털 가시성 향상을 위한 종합 전략을 제시합니다. AI 검색 최적화와 콘텐츠 권위 구축에 집중하며, 분석 결과를 바탕으로 6개월 내 AI 검색 가시성 40~60% 개선을 목표로 합니다.`,
    currentStateAnalysis: `${input.brand.name}의 현재 도메인 레이팅은 ${input.seoData.domainRating}이며, 월 유기 방문자는 ${input.seoData.organicTraffic}명입니다. AI 검색 가시성은 ${input.seoData.aiSearchVisibility}%로, 상당한 성장 기회가 존재합니다.`,
    proposedStrategy: '3가지 핵심 축으로 구성된 접근법: (1) GEO/AEO 콘텐츠 최적화, (2) 구조화 데이터를 활용한 기술 SEO 강화, (3) 전략적 콘텐츠 파트너십을 통한 권위 구축.',
    servicePackages: [
      {
        name: '스타터',
        description: '필수 AI 검색 최적화',
        deliverables: ['SEO 감사', 'GEO 전략', '월 5페이지 최적화', '월간 보고'],
        price: '월 $2,500',
        timeline: '6개월',
      },
      {
        name: '그로스',
        description: '종합 디지털 가시성',
        deliverables: ['전체 SEO 감사', 'GEO/AEO 전략', '월 10페이지', '링크 빌딩', '격주 보고'],
        price: '월 $5,000',
        timeline: '12개월',
      },
      {
        name: '엔터프라이즈',
        description: '풀서비스 디지털 혁신',
        deliverables: ['상시 감사', '풀 GEO/AEO', '월 20페이지 이상', 'PR + 링크', '주간 보고', '전담 어카운트 매니저'],
        price: '월 $10,000',
        timeline: '12개월',
      },
    ],
    expectedResults: [
      { metric: 'AI 검색 가시성', current: `${input.seoData.aiSearchVisibility}%`, target: '60%+', timeline: '6개월' },
      { metric: '유기 트래픽', current: `${input.seoData.organicTraffic}`, target: `${Math.round(input.seoData.organicTraffic * 1.5)}`, timeline: '6개월' },
      { metric: '도메인 레이팅', current: `${input.seoData.domainRating}`, target: `${Math.min(100, input.seoData.domainRating + 10)}`, timeline: '12개월' },
    ],
    caseStudies: [
      '사례 연구: 이커머스 브랜드, 5개월 만에 AI 검색 가시성 15%에서 65%로 향상',
      '사례 연구: SaaS 기업, GEO 최적화 콘텐츠 전략으로 유기 트래픽 2배 달성',
    ],
    timeline: [
      { phase: '기반 구축', duration: '1~2개월', milestones: ['감사 완료', '전략 확정', '기술 셋업'] },
      { phase: '실행', duration: '3~4개월', milestones: ['콘텐츠 제작 본격화', '스키마 적용', '링크 빌딩 시작'] },
      { phase: '최적화', duration: '5~6개월', milestones: ['성과 검토', '전략 정교화', '성공 전술 확대'] },
    ],
    pricing: [
      { option: '스타터', monthlyFee: '$2,500', setupFee: '$1,000', details: '기본 GEO/AEO 최적화' },
      { option: '그로스', monthlyFee: '$5,000', setupFee: '$2,000', details: '풀 디지털 가시성 서비스' },
      { option: '엔터프라이즈', monthlyFee: '$10,000', setupFee: '$5,000', details: '완전한 디지털 혁신' },
    ],
    termsAndConditions: '표준 90일 성과 보장. 월 청구. 30일 해지 통보 필요.',
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Pipeline Runner
// ---------------------------------------------------------------------------

export async function runProposalGen(
  input: ProposalInput,
  modeConfig: Record<string, string>,
  emitEvent: EmitEvent,
): Promise<void> {
  const totalSteps = PROPOSAL_STEPS.length;

  function resolveMode(step: PipelineStep): string {
    return modeConfig[step.id] ?? step.mode;
  }

  // ── Step 1: 매니저 리드 데이터 검토 ─────────────────────────────
  const step1 = PROPOSAL_STEPS[0];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step1.id, stepName: step1.name, agentId: step1.agentId, mode: step1.mode, order: step1.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: '제안서 작성을 위한 리드 데이터 검토 중' },
  });
  await sleep(1000);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: `${input.brand.name}의 리드 데이터를 검토합니다. DR: ${input.seoData.domainRating}, AI 가시성: ${input.seoData.aiSearchVisibility}%. 애널리스트에게 브랜드 진단을 할당합니다.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });

  // ── Step 2: 애널리스트 브랜드 진단 ───────────────────────────────
  const step2 = PROPOSAL_STEPS[1];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step2.id, stepName: step2.name, agentId: step2.agentId, mode: step2.mode, order: step2.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'working', currentTask: '브랜드 진단 및 SWOT 분석 수행 중' },
  });
  await sleep(2000);

  const diagnosis = generateDiagnosis(input);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'analyst',
      content: JSON.stringify({
        strengths: diagnosis.strengths,
        weaknesses: diagnosis.weaknesses,
        opportunities: diagnosis.opportunities,
        priorityActions: diagnosis.priorityActions,
      }),
      type: 'json',
      metadata: { dataType: 'brand-diagnosis' },
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'done' },
  });

  // ── Step 3: 애널리스트 KPI 프레임워크 (승인) ──────────────────────
  const step3 = PROPOSAL_STEPS[2];
  const mode3 = resolveMode(step3);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step3.id, stepName: step3.name, agentId: step3.agentId, mode: step3.mode, order: step3.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'working', currentTask: 'KPI 프레임워크 설계 중' },
  });
  await sleep(1500);

  const kpis = [
    { metric: 'AI 검색 가시성', baseline: `${input.seoData.aiSearchVisibility}%`, target30d: `${input.seoData.aiSearchVisibility + 10}%`, target90d: '60%+' },
    { metric: '유기 트래픽', baseline: `${input.seoData.organicTraffic}`, target30d: `${Math.round(input.seoData.organicTraffic * 1.1)}`, target90d: `${Math.round(input.seoData.organicTraffic * 1.4)}` },
    { metric: '콘텐츠 점수', baseline: '45/100', target30d: '60/100', target90d: '80/100' },
  ];

  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'analyst',
      content: JSON.stringify(kpis),
      type: 'json',
      metadata: { dataType: 'kpi-framework' },
    },
  });

  if (mode3 === 'approval') {
    const approvalId = `approval-${step3.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'analyst', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step3.id,
        agentId: 'analyst',
        summary: `${kpis.length}개 지표로 KPI 프레임워크를 설계했습니다. 제안서 초안 작성 전 기준선과 목표치를 검토해주세요.`,
        data: kpis,
      },
    });
    // 실제 사람 결정 대기 (30초 타임아웃 후 자동 진행)
    try {
      const decision = await waitForApproval(approvalId, 30_000);
      if (decision.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: step3.agentId, content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: step3.agentId, status: 'done' } });
        return;
      }
      if (decision.action === 'modify' && decision.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: step3.agentId, content: `수정 요청 반영: ${decision.feedback}`, type: 'text' } });
      }
    } catch {
      // 타임아웃 또는 오류 시 자동 진행
    }
  }
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'done' },
  });

  // ── Step 4: 스트래티지스트 제안서 초안 작성 ────────────────────────────
  const step4 = PROPOSAL_STEPS[3];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step4.id, stepName: step4.name, agentId: step4.agentId, mode: step4.mode, order: step4.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'working', currentTask: '제안서 섹션 초안 작성 중' },
  });
  await sleep(2500);

  const draft = generateProposalDraft(input, diagnosis);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'strategist',
      content: `${draft.clientName} 제안서 초안 완성. ${draft.servicePackages.length}개 서비스 티어와 ${draft.timeline.length}단계 실행 계획을 포함합니다.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'strategist',
      content: JSON.stringify({
        title: draft.title,
        packages: draft.servicePackages.map((p) => ({ name: p.name, price: p.price })),
        expectedResults: draft.expectedResults,
      }),
      type: 'json',
      metadata: { dataType: 'proposal-draft-summary' },
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'done' },
  });

  // ── Step 5: 가격 및 전략 토론 (승인) ──────────────────────
  const step5 = PROPOSAL_STEPS[4];
  const mode5 = resolveMode(step5);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step5.id, stepName: step5.name, agentId: step5.agentId, mode: step5.mode, order: step5.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'debating' },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'debating' },
  });

  const debateRounds: DebateRound[] = [
    {
      round: 1,
      topic: '가격 티어 구조',
      analystMessage: `고객의 규모(${input.brand.companySize})와 현재 DR(${input.seoData.domainRating})을 고려했을 때, 그로스 티어를 강조할 것을 권장합니다. 데이터에 따르면 중간 티어 패키지는 65% 더 높은 유지율을 보입니다.`,
      strategistMessage: '엔터프라이즈를 먼저 제시하고 높게 앵커링할 것을 권장합니다. 전체 범위를 먼저 보여주면 대비 효과로 40% 더 많은 고객이 그로스 티어를 선택합니다. ROI 근거가 프리미엄 가격을 충분히 뒷받침합니다.',
    },
    {
      round: 2,
      topic: '전략 강조점',
      analystMessage: '콘텐츠 최적화가 핵심이어야 합니다. 분석 결과 AI 검색 인용의 73%가 잘 구성된 권위 있는 콘텐츠에서 나옵니다. 기술 SEO는 필요조건이지만 충분조건은 아닙니다.',
      strategistMessage: '콘텐츠 우선 접근에는 동의하지만, 제안서는 경쟁 인텔리전스 관점을 앞에 내세워야 합니다. AI 검색 결과에서 경쟁사에게 얼마나 뒤처지고 있는지를 보여주세요. 긴박감이 더 빠른 계약을 이끕니다.',
    },
  ];

  for (const round of debateRounds) {
    await sleep(1200);
    emitEvent({
      type: 'debate:round',
      payload: round,
    });
  }

  if (mode5 === 'approval') {
    const approvalId = `approval-${step5.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'analyst', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step5.id,
        agentId: 'analyst',
        summary: '토론이 완료되었습니다. 애널리스트는 콘텐츠 우선 전략으로 그로스 티어 강조를 권장합니다. 스트래티지스트는 경쟁 긴박감으로 엔터프라이즈 앵커링을 권장합니다. 선호하는 접근법을 승인해주세요.',
        data: { debateRounds, recommendation: '하이브리드: 경쟁 인텔리전스로 시작하고, 그로스 티어를 권장하며, 콘텐츠 우선으로 실행.' },
      },
    });
    // 실제 사람 결정 대기 (30초 타임아웃 후 자동 진행)
    try {
      const decision = await waitForApproval(approvalId, 30_000);
      if (decision.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: step5.agentId, content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: step5.agentId, status: 'done' } });
        emitEvent({ type: 'agent:status', payload: { agentId: 'strategist', status: 'done' } });
        return;
      }
      if (decision.action === 'modify' && decision.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: step5.agentId, content: `수정 요청 반영: ${decision.feedback}`, type: 'text' } });
      }
    } catch {
      // 타임아웃 또는 오류 시 자동 진행
    }
  }

  emitEvent({ type: 'agent:status', payload: { agentId: 'analyst', status: 'done' } });
  emitEvent({ type: 'agent:status', payload: { agentId: 'strategist', status: 'done' } });

  // ── Step 6: 최종 제안서 완성 ────────────────────────────────
  const step6 = PROPOSAL_STEPS[5];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step6.id, stepName: step6.name, agentId: step6.agentId, mode: step6.mode, order: step6.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'working', currentTask: '최종 제안서 문서 완성 중' },
  });
  await sleep(1800);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'strategist',
      content: `최종 제안서 완성: "${draft.title}". 서비스 티어 ${draft.servicePackages.length}개, KPI ${draft.expectedResults.length}개, ${draft.timeline.length}단계 타임라인. 매니저 검토 준비 완료.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'done' },
  });

  // ── Step 7: 매니저 검토 및 Notion 등록 (승인) ────────
  const step7 = PROPOSAL_STEPS[6];
  const mode7 = resolveMode(step7);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step7.id, stepName: step7.name, agentId: step7.agentId, mode: step7.mode, order: step7.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: '최종 검토 및 Notion 등록 중' },
  });
  await sleep(1500);

  if (mode7 === 'approval') {
    const approvalId = `approval-${step7.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'manager', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step7.id,
        agentId: 'manager',
        summary: `${draft.clientName}의 최종 제안서가 준비되었습니다. Notion 등록 및 클라이언트 전달용 문서 생성을 승인해주세요.`,
        data: draft,
      },
    });
    // 실제 사람 결정 대기 (30초 타임아웃 후 자동 진행)
    try {
      const decision = await waitForApproval(approvalId, 30_000);
      if (decision.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: step7.agentId, content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: step7.agentId, status: 'done' } });
        return;
      }
      if (decision.action === 'modify' && decision.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: step7.agentId, content: `수정 요청 반영: ${decision.feedback}`, type: 'text' } });
      }
    } catch {
      // 타임아웃 또는 오류 시 자동 진행
    }
  }

  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: `${draft.clientName} 제안서가 Notion에 등록되었습니다. 클라이언트 전달 준비 완료.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });
}
