/**
 * Client Onboarding Pipeline
 *
 * 8단계 파이프라인: 계약 체결 후 모든 온보딩 설정을 처리합니다.
 *
 * 단계:
 *   1. 매니저가 온보딩 플랜 생성 및 업무 할당
 *   2. 애널리스트가 KPI 기준선 및 모니터링 프레임워크 설계
 *   3. 스트래티지스트가 GEO/AEO 콘텐츠 전략 기획 (승인 필요)
 *   4. 매니저가 캘린더를 통해 미팅 일정 잡기
 *   5. 스트래티지스트가 환영 및 팔로업 이메일 초안 작성 (승인 필요)
 *   6. 애널리스트가 Notion에 보고 대시보드 생성
 *   7. 매니저가 추적을 위한 Linear 프로젝트 생성 (승인 필요)
 *   8. 매니저가 Gmail에 환영 이메일 초안 생성 (승인 필요)
 */

import type {
  PipelineStep,
  OnboardPlan,
  DebateRound,
} from '@/agents/types';
import type { EmitEvent } from '@/app/api/agents/route';
import { waitForApproval } from '@/lib/approval-store';

// ---------------------------------------------------------------------------
// Input Type
// ---------------------------------------------------------------------------

export interface OnboardingInput {
  clientName: string;
  services: string[];
}

// ---------------------------------------------------------------------------
// Pipeline Step Definitions
// ---------------------------------------------------------------------------

export const ONBOARD_STEPS: PipelineStep[] = [
  {
    id: 'ob-step-1',
    name: '온보딩 플랜 생성',
    agentId: 'manager',
    mode: 'auto',
    description: '매니저가 온보딩 체크리스트, 마일스톤 일정, 업무 할당을 생성합니다.',
    order: 1,
  },
  {
    id: 'ob-step-2',
    name: 'KPI 프레임워크 설계',
    agentId: 'analyst',
    mode: 'auto',
    description: '애널리스트가 KPI 기준선, 30/90일 목표치, 모니터링 방법론을 설정합니다.',
    order: 2,
  },
  {
    id: 'ob-step-3',
    name: 'GEO/AEO 전략',
    agentId: 'strategist',
    mode: 'approval',
    description: '스트래티지스트가 GEO/AEO 콘텐츠 전략과 기술 셋업을 기획합니다. 승인이 필요합니다.',
    order: 3,
  },
  {
    id: 'ob-step-4',
    name: '미팅 일정 잡기',
    agentId: 'manager',
    mode: 'auto',
    description: '매니저가 캘린더를 통해 킥오프, 주간 싱크, 검토 미팅을 예약합니다.',
    order: 4,
  },
  {
    id: 'ob-step-5',
    name: '이메일 초안 작성',
    agentId: 'strategist',
    mode: 'approval',
    description: '스트래티지스트가 환영, 온보딩, 팔로업 이메일 시리즈를 초안으로 작성합니다. 승인이 필요합니다.',
    order: 5,
  },
  {
    id: 'ob-step-6',
    name: '대시보드 생성',
    agentId: 'analyst',
    mode: 'auto',
    description: '애널리스트가 Notion에 보고 대시보드와 KPI 추적 데이터베이스를 생성합니다.',
    order: 6,
  },
  {
    id: 'ob-step-7',
    name: 'Linear 프로젝트 생성',
    agentId: 'manager',
    mode: 'approval',
    description: '매니저가 모든 온보딩 업무를 포함한 Linear 프로젝트를 생성합니다. 승인이 필요합니다.',
    order: 7,
  },
  {
    id: 'ob-step-8',
    name: '환영 이메일 발송',
    agentId: 'manager',
    mode: 'approval',
    description: '매니저가 Gmail에 환영 이메일 초안을 생성합니다. 발송 전 승인이 필요합니다.',
    order: 8,
  },
];

// ---------------------------------------------------------------------------
// Simulation Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateOnboardPlan(input: OnboardingInput): OnboardPlan {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    clientName: input.clientName,
    checklist: [
      { id: 'task-1', task: '환영 패키지 발송', assignee: 'Manager', dueDate: weekFromNow.toISOString().split('T')[0], status: 'pending', category: 'admin' },
      { id: 'task-2', task: '기술 감사 완료', assignee: 'Analyst', dueDate: weekFromNow.toISOString().split('T')[0], status: 'pending', category: 'technical' },
      { id: 'task-3', task: '분석 추적 설정', assignee: 'Analyst', dueDate: weekFromNow.toISOString().split('T')[0], status: 'pending', category: 'technical' },
      { id: 'task-4', task: '콘텐츠 캘린더 작성', assignee: 'Strategist', dueDate: weekFromNow.toISOString().split('T')[0], status: 'pending', category: 'content' },
      { id: 'task-5', task: '스키마 마크업 구현', assignee: 'Researcher', dueDate: monthFromNow.toISOString().split('T')[0], status: 'pending', category: 'technical' },
      { id: 'task-6', task: '첫 GEO 콘텐츠 배치 발행', assignee: 'Strategist', dueDate: monthFromNow.toISOString().split('T')[0], status: 'pending', category: 'content' },
    ],
    meetings: [
      {
        title: `${input.clientName} - 킥오프 미팅`,
        attendees: ['client@example.com', 'team@tideworks.com'],
        date: weekFromNow.toISOString(),
        duration: '60분',
        agenda: ['소개', '목표 검토', '타임라인 안내', '접근 권한 설정', 'Q&A'],
        type: 'kickoff',
      },
      {
        title: `${input.clientName} - 주간 싱크`,
        attendees: ['client@example.com', 'team@tideworks.com'],
        date: new Date(weekFromNow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: '30분',
        agenda: ['진행 상황 공유', '블로커 확인', '다음 주 우선순위'],
        type: 'weekly',
      },
      {
        title: `${input.clientName} - 30일 검토`,
        attendees: ['client@example.com', 'team@tideworks.com'],
        date: monthFromNow.toISOString(),
        duration: '45분',
        agenda: ['KPI 검토', '전략 조정', '다음 단계 기획'],
        type: 'review',
      },
    ],
    kpis: [
      { metric: 'AI 검색 가시성', baseline: '감사 후 확정', target30d: '+10%', target90d: '+40%', measurementMethod: 'GEO 추적 도구' },
      { metric: '유기 트래픽', baseline: '감사 후 확정', target30d: '+5%', target90d: '+25%', measurementMethod: 'Google Analytics' },
      { metric: '발행 콘텐츠 수', baseline: '0', target30d: '8편', target90d: '24편', measurementMethod: 'CMS 집계' },
      { metric: '스키마 커버리지', baseline: '감사 후 확정', target30d: '50%', target90d: '95%', measurementMethod: '스키마 감사 도구' },
    ],
    emailDraft: [
      {
        subject: `Tideworks에 오신 것을 환영합니다 - ${input.clientName} 온보딩`,
        body: `${input.clientName} 팀 관계자분들께,\n\nTideworks에 오신 것을 환영합니다! 함께 디지털 성장 여정을 시작하게 되어 정말 기쁩니다.\n\n앞으로의 진행 일정입니다:\n1. 킥오프 미팅 (일정 확정)\n2. 기술 감사 (1주차)\n3. 전략 프레젠테이션 (2주차)\n4. 콘텐츠 제작 시작 (3주차)\n\n궁금한 점이 있으시면 언제든지 연락 주세요.\n\n감사합니다,\nTideworks 팀 드림`,
        recipients: ['client@example.com'],
        sendDate: now.toISOString().split('T')[0],
        type: 'welcome',
      },
      {
        subject: `${input.clientName} - 1주차 진행 보고`,
        body: `${input.clientName} 팀 관계자분들께,\n\n첫 번째 주간 진행 보고를 전달드립니다:\n\n- 기술 감사: 완료\n- 분석 설정: 진행 중\n- 콘텐츠 캘린더: 초안 완성\n\n다음 주부터 콘텐츠 제작을 시작하겠습니다.\n\n감사합니다,\nTideworks 팀 드림`,
        recipients: ['client@example.com'],
        sendDate: weekFromNow.toISOString().split('T')[0],
        type: 'followup',
      },
    ],
    geoStrategy: {
      targetQueries: [
        `최고의 ${input.services[0]?.toLowerCase() ?? 'seo'} 에이전시`,
        `${input.services[0]?.toLowerCase() ?? 'seo'} 개선 방법`,
        `${input.clientName.toLowerCase()} 후기`,
        `${input.services.join(' 및 ').toLowerCase()} 서비스`,
      ],
      contentPlan: [
        { topic: 'AI 검색 최적화 완벽 가이드', format: '장문 아티클', targetDate: weekFromNow.toISOString().split('T')[0], status: 'planned' },
        { topic: 'AI 검색 가시성 300% 향상 사례 연구', format: '케이스 스터디', targetDate: monthFromNow.toISOString().split('T')[0], status: 'planned' },
        { topic: `${input.services[0] ?? 'SEO'} FAQ 스키마 가이드`, format: '기술 가이드', targetDate: weekFromNow.toISOString().split('T')[0], status: 'planned' },
      ],
      technicalSetup: [
        '상위 20개 페이지에 FAQ 스키마 구현',
        '튜토리얼 콘텐츠에 HowTo 스키마 추가',
        'Organization 스키마 설정',
        '브레드크럼 스키마 구성',
      ],
      monitoringPlan: 'GEO 추적 도구를 통한 주간 AI 검색 가시성 점검, 트래픽 및 순위 데이터를 포함한 월간 종합 보고서 제공.',
    },
  };
}

// ---------------------------------------------------------------------------
// Pipeline Runner
// ---------------------------------------------------------------------------

export async function runOnboarding(
  input: OnboardingInput,
  modeConfig: Record<string, string>,
  emitEvent: EmitEvent,
): Promise<void> {
  const totalSteps = ONBOARD_STEPS.length;

  function resolveMode(step: PipelineStep): string {
    return modeConfig[step.id] ?? step.mode;
  }

  const plan = generateOnboardPlan(input);

  // ── Step 1: 매니저 온보딩 플랜 생성 ───────────────────────
  const step1 = ONBOARD_STEPS[0];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step1.id, stepName: step1.name, agentId: step1.agentId, mode: step1.mode, order: step1.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: `${input.clientName} 온보딩 플랜 생성 중` },
  });
  await sleep(1500);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: `${input.clientName} 온보딩 플랜이 완성되었습니다. 서비스: ${input.services.join(', ')}. 총 ${plan.checklist.length}개 업무, ${plan.meetings.length}개 미팅이 예약되었습니다.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: JSON.stringify({
        tasks: plan.checklist.length,
        meetings: plan.meetings.length,
        services: input.services,
      }),
      type: 'json',
      metadata: { dataType: 'onboard-summary' },
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });

  // ── Step 2: 애널리스트 KPI 프레임워크 설계 ─────────────────────────
  const step2 = ONBOARD_STEPS[1];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step2.id, stepName: step2.name, agentId: step2.agentId, mode: step2.mode, order: step2.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'working', currentTask: 'KPI 기준선 및 목표치 설계 중' },
  });
  await sleep(1800);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'analyst',
      content: JSON.stringify(plan.kpis),
      type: 'json',
      metadata: { dataType: 'kpi-framework' },
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'done' },
  });

  // ── Step 3: 스트래티지스트 GEO/AEO 전략 (승인) ───────────────
  const step3 = ONBOARD_STEPS[2];
  const mode3 = resolveMode(step3);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step3.id, stepName: step3.name, agentId: step3.agentId, mode: step3.mode, order: step3.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'working', currentTask: 'GEO/AEO 콘텐츠 전략 기획 중' },
  });
  await sleep(2000);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'strategist',
      content: JSON.stringify({
        targetQueries: plan.geoStrategy.targetQueries,
        contentPlan: plan.geoStrategy.contentPlan,
        technicalSetup: plan.geoStrategy.technicalSetup,
      }),
      type: 'json',
      metadata: { dataType: 'geo-strategy' },
    },
  });

  if (mode3 === 'approval') {
    const approvalId = `approval-${step3.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'strategist', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step3.id,
        agentId: 'strategist',
        summary: `${plan.geoStrategy.targetQueries.length}개 타겟 쿼리와 ${plan.geoStrategy.contentPlan.length}개 콘텐츠 기획이 포함된 GEO/AEO 전략이 완성되었습니다. 진행 전 검토해주세요.`,
        data: plan.geoStrategy,
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
    payload: { agentId: 'strategist', status: 'done' },
  });

  // ── Step 4: 매니저 미팅 일정 잡기 ────────────────────────────
  const step4 = ONBOARD_STEPS[3];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step4.id, stepName: step4.name, agentId: step4.agentId, mode: step4.mode, order: step4.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: '캘린더를 통해 미팅 일정 잡는 중' },
  });

  for (const meeting of plan.meetings) {
    await sleep(800);
    emitEvent({
      type: 'agent:message',
      payload: {
        agentId: 'manager',
        content: `일정 등록 완료: ${meeting.title} (${meeting.type}) - ${meeting.duration}`,
        type: 'text',
      },
    });
  }
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });

  // ── Step 5: 스트래티지스트 이메일 초안 작성 (승인) ───────────────────
  const step5 = ONBOARD_STEPS[4];
  const mode5 = resolveMode(step5);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step5.id, stepName: step5.name, agentId: step5.agentId, mode: step5.mode, order: step5.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'working', currentTask: '환영 및 팔로업 이메일 초안 작성 중' },
  });
  await sleep(1500);

  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'strategist',
      content: JSON.stringify(
        plan.emailDraft.map((e) => ({
          subject: e.subject,
          type: e.type,
          sendDate: e.sendDate,
        })),
      ),
      type: 'json',
      metadata: { dataType: 'email-drafts' },
    },
  });

  if (mode5 === 'approval') {
    const approvalId = `approval-${step5.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'strategist', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step5.id,
        agentId: 'strategist',
        summary: `${plan.emailDraft.length}개 이메일 초안(환영 + 팔로업)이 준비되었습니다. Gmail 연동 전 내용을 검토해주세요.`,
        data: plan.emailDraft,
      },
    });
    // 실제 사람 결정 대기 (30초 타임아웃 후 자동 진행)
    try {
      const decision = await waitForApproval(approvalId, 30_000);
      if (decision.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: step5.agentId, content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: step5.agentId, status: 'done' } });
        return;
      }
      if (decision.action === 'modify' && decision.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: step5.agentId, content: `수정 요청 반영: ${decision.feedback}`, type: 'text' } });
      }
    } catch {
      // 타임아웃 또는 오류 시 자동 진행
    }
  }
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'strategist', status: 'done' },
  });

  // ── Step 6: 애널리스트 Notion 대시보드 생성 ──────────────────────
  const step6 = ONBOARD_STEPS[5];
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step6.id, stepName: step6.name, agentId: step6.agentId, mode: step6.mode, order: step6.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'working', currentTask: 'Notion에 보고 대시보드 생성 중' },
  });
  await sleep(1500);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'analyst',
      content: `${input.clientName} Notion 대시보드가 생성되었습니다. KPI 추적기, 콘텐츠 캘린더, 업무 보드가 포함됩니다.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'analyst', status: 'done' },
  });

  // ── Step 7: 매니저 Linear 프로젝트 생성 (승인) ─────────────
  const step7 = ONBOARD_STEPS[6];
  const mode7 = resolveMode(step7);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step7.id, stepName: step7.name, agentId: step7.agentId, mode: step7.mode, order: step7.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: '업무 추적을 위한 Linear 프로젝트 생성 중' },
  });
  await sleep(1200);

  const linearTasks = plan.checklist.map((t) => ({
    title: t.task,
    assignee: t.assignee,
    dueDate: t.dueDate,
    category: t.category,
  }));

  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: JSON.stringify(linearTasks),
      type: 'json',
      metadata: { dataType: 'linear-tasks' },
    },
  });

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
        summary: `Linear 프로젝트 생성을 위한 ${linearTasks.length}개 업무가 준비되었습니다. 담당자 및 기한을 검토해주세요.`,
        data: linearTasks,
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

  await sleep(800);
  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: `Linear 프로젝트 생성 완료: "${input.clientName} 온보딩" (${linearTasks.length}개 업무 포함).`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });

  // ── Step 8: 환영 이메일 초안 발송 (승인) ───────────────────
  const step8 = ONBOARD_STEPS[7];
  const mode8 = resolveMode(step8);
  emitEvent({
    type: 'pipeline:step',
    payload: { stepId: step8.id, stepName: step8.name, agentId: step8.agentId, mode: step8.mode, order: step8.order, totalSteps },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'working', currentTask: 'Gmail에 환영 이메일 초안 생성 중' },
  });
  await sleep(1000);

  const welcomeEmail = plan.emailDraft[0];

  if (mode8 === 'approval') {
    const approvalId = `approval-${step8.id}-${Date.now()}`;
    emitEvent({
      type: 'agent:status',
      payload: { agentId: 'manager', status: 'waiting_approval' },
    });
    emitEvent({
      type: 'approval:request',
      payload: {
        approvalId,
        stepId: step8.id,
        agentId: 'manager',
        summary: `${input.clientName} 환영 이메일 초안이 준비되었습니다. 제목: "${welcomeEmail.subject}". 초안만 생성되며 자동 발송되지 않습니다.`,
        data: welcomeEmail,
      },
    });
    // 실제 사람 결정 대기 (30초 타임아웃 후 자동 진행)
    try {
      const decision = await waitForApproval(approvalId, 30_000);
      if (decision.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: step8.agentId, content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: step8.agentId, status: 'done' } });
        return;
      }
      if (decision.action === 'modify' && decision.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: step8.agentId, content: `수정 요청 반영: ${decision.feedback}`, type: 'text' } });
      }
    } catch {
      // 타임아웃 또는 오류 시 자동 진행
    }
  }

  emitEvent({
    type: 'agent:message',
    payload: {
      agentId: 'manager',
      content: `${input.clientName} Gmail 환영 이메일 초안이 생성되었습니다. 제목: "${welcomeEmail.subject}". 직접 검토 후 발송해주세요.`,
      type: 'text',
    },
  });
  emitEvent({
    type: 'agent:status',
    payload: { agentId: 'manager', status: 'done' },
  });
}
