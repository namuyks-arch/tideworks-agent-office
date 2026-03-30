import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────
export type PipelineType = 'lead_discovery' | 'proposal' | 'onboarding';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  assignedAgent: string;
  status: StepStatus;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface LeadResult {
  rank: number;
  name: string;
  domain: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  salesPoint: string;
  seoSummary: string;
  dealSize: string;
}

export interface ProposalResult {
  brand: string;
  industry: string;
  problems: string[];
  solutions: string;
  roi: string;
  packageName: string;
  packagePrice: string;
}

export interface OnboardResult {
  clientName: string;
  checklist: string[];
  kpis: string[];
  meetingCount: number;
  emailDraft: string;
}

export interface PipelineResults {
  leads?: LeadResult[];
  proposal?: ProposalResult;
  onboardPlan?: OnboardResult;
}

export interface PipelineState {
  id: string;
  type: PipelineType;
  label: string;
  steps: PipelineStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  createdAt: number;
  completedAt?: number;
  error?: string;
  results?: PipelineResults;
}

// ─── Pipeline Templates ──────────────────────────────────────────────
export const PIPELINE_TEMPLATES: Record<PipelineType, { label: string; steps: Omit<PipelineStep, 'status'>[] }> = {
  lead_discovery: {
    label: '리드 발굴',
    steps: [
      { id: 'ld-1', name: '① 타겟 기준 세팅', description: '업종·규모·채널 조건 정의', assignedAgent: 'manager' },
      { id: 'ld-2', name: '② 브랜드 후보 수집', description: '웹서치 + Claude로 브랜드 리스트 자동 수집', assignedAgent: 'researcher' },
      { id: 'ld-3', name: '③ Ahrefs SEO 진단', description: 'DA·트래픽·키워드갭·백링크·GEO 자동 분석', assignedAgent: 'researcher' },
      { id: 'ld-4', name: '④ 영업 포인트 생성', description: 'Claude가 각 브랜드 약점 한 줄 요약', assignedAgent: 'analyst' },
      { id: 'ld-5', name: '⑤ DB 등록', description: '브랜드+영업포인트 스프레드시트 저장', assignedAgent: 'manager' },
      { id: 'ld-6', name: '⑥ 메일 발송 대기', description: '리드 파이프라인 상태: 신규 → 발송 대기', assignedAgent: 'manager' },
    ],
  },
  proposal: {
    label: '제안서 작성',
    steps: [
      { id: 'pp-1', name: '고객 분석', description: '대상 고객의 니즈를 파악합니다', assignedAgent: 'researcher' },
      { id: 'pp-2', name: '경쟁사 비교', description: '경쟁사 제안서와 비교 분석합니다', assignedAgent: 'analyst' },
      { id: 'pp-3', name: '제안 전략 수립', description: '차별화된 제안 전략을 수립합니다', assignedAgent: 'strategist' },
      { id: 'pp-4', name: '제안서 초안', description: '제안서 초안을 작성합니다', assignedAgent: 'strategist' },
      { id: 'pp-5', name: '리뷰 및 완성', description: '최종 검토 및 품질 관리를 수행합니다', assignedAgent: 'manager' },
    ],
  },
  onboarding: {
    label: '온보딩',
    steps: [
      { id: 'ob-1', name: '고객 정보 정리', description: '신규 고객의 기본 정보를 수집합니다', assignedAgent: 'researcher' },
      { id: 'ob-2', name: '요구사항 분석', description: '고객의 세부 요구사항을 분석합니다', assignedAgent: 'analyst' },
      { id: 'ob-3', name: '온보딩 플랜', description: '맞춤 온보딩 계획을 수립합니다', assignedAgent: 'strategist' },
      { id: 'ob-4', name: '실행 및 모니터링', description: '온보딩을 실행하고 진행 상황을 추적합니다', assignedAgent: 'manager' },
    ],
  },
};

// ─── Store Interface ─────────────────────────────────────────────────
interface PipelineStore {
  currentPipeline: PipelineState | null;
  history: PipelineState[];
  startPipeline: (type: PipelineType) => void;
  advanceStep: () => void;
  setCurrentStep: (stepId: string) => void;
  completePipeline: () => void;
  setPipelineError: (error: string) => void;
  resetPipeline: () => void;
  setResults: (results: PipelineResults) => void;
}

// ─── Store ───────────────────────────────────────────────────────────
export const usePipelineStore = create<PipelineStore>((set, _get) => ({
  currentPipeline: null,
  history: [],

  setCurrentStep: (stepId) =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline) return state;
      const stepIdx = pipeline.steps.findIndex((s) => s.id === stepId);
      if (stepIdx === -1) return state;
      const updatedSteps = pipeline.steps.map((s, i) => {
        if (i < stepIdx) return { ...s, status: 'completed' as const, completedAt: s.completedAt ?? Date.now() };
        if (i === stepIdx) return { ...s, status: 'running' as const, startedAt: s.startedAt ?? Date.now() };
        return { ...s, status: 'pending' as const };
      });
      return { currentPipeline: { ...pipeline, steps: updatedSteps, currentStepIndex: stepIdx } };
    }),

  startPipeline: (type) => {
    const template = PIPELINE_TEMPLATES[type];
    const pipeline: PipelineState = {
      id: `pipeline-${Date.now()}`,
      type,
      label: template.label,
      steps: template.steps.map((step) => ({ ...step, status: 'pending' as const })),
      currentStepIndex: 0,
      status: 'running',
      createdAt: Date.now(),
    };
    // Mark first step as running
    pipeline.steps[0].status = 'running';
    pipeline.steps[0].startedAt = Date.now();
    set({ currentPipeline: pipeline });
  },

  advanceStep: () =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline || pipeline.status !== 'running') return state;

      const updatedSteps = [...pipeline.steps];
      const currentIdx = pipeline.currentStepIndex;

      // Complete current step
      updatedSteps[currentIdx] = {
        ...updatedSteps[currentIdx],
        status: 'completed',
        completedAt: Date.now(),
      };

      const nextIdx = currentIdx + 1;

      // If there is a next step, start it
      if (nextIdx < updatedSteps.length) {
        updatedSteps[nextIdx] = {
          ...updatedSteps[nextIdx],
          status: 'running',
          startedAt: Date.now(),
        };
        return {
          currentPipeline: {
            ...pipeline,
            steps: updatedSteps,
            currentStepIndex: nextIdx,
          },
        };
      }

      // All steps done
      return {
        currentPipeline: {
          ...pipeline,
          steps: updatedSteps,
          currentStepIndex: currentIdx,
          status: 'completed',
          completedAt: Date.now(),
        },
      };
    }),

  completePipeline: () =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline) return state;

      const completedPipeline: PipelineState = {
        ...pipeline,
        status: 'completed',
        completedAt: Date.now(),
        steps: pipeline.steps.map((s) =>
          s.status === 'running'
            ? { ...s, status: 'completed' as const, completedAt: Date.now() }
            : s
        ),
      };

      return {
        currentPipeline: null,
        history: [...state.history, completedPipeline],
      };
    }),

  setPipelineError: (error) =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline) return state;

      const updatedSteps = pipeline.steps.map((s) =>
        s.status === 'running' ? { ...s, status: 'error' as const, error } : s
      );

      return {
        currentPipeline: {
          ...pipeline,
          steps: updatedSteps,
          status: 'error',
          error,
        },
      };
    }),

  resetPipeline: () =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline) return state;
      return {
        currentPipeline: null,
        history: [...state.history, { ...pipeline, status: 'error' as const, error: 'Reset by user' }],
      };
    }),

  setResults: (results) =>
    set((state) => {
      const pipeline = state.currentPipeline;
      if (!pipeline) return state;
      return {
        currentPipeline: { ...pipeline, results },
      };
    }),
}));
