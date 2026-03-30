// =============================================================================
// Tideworks Agent Office - Agent Type System
// =============================================================================

// ---------------------------------------------------------------------------
// Core Agent Identity & Status
// ---------------------------------------------------------------------------

export type AgentId = 'researcher' | 'analyst' | 'strategist' | 'manager';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'debating'
  | 'waiting_approval'
  | 'done'
  | 'error';

export type ExecutionMode = 'auto' | 'approval' | 'manual';

// ---------------------------------------------------------------------------
// Agent Messaging
// ---------------------------------------------------------------------------

export type AgentMessageType = 'text' | 'json' | 'status' | 'approval_request';

export interface AgentMessage {
  id: string;
  agentId: AgentId;
  content: string;
  type: AgentMessageType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent Runtime State
// ---------------------------------------------------------------------------

export interface AgentState {
  id: AgentId;
  name: string;
  emoji: string;
  status: AgentStatus;
  currentTask?: string;
  messages: AgentMessage[];
  color: string;
}

// ---------------------------------------------------------------------------
// Pipeline Definitions
// ---------------------------------------------------------------------------

export interface PipelineStep {
  id: string;
  name: string;
  agentId: AgentId;
  mode: ExecutionMode;
  description: string;
  order: number;
}

export type PipelineType = 'lead-discovery' | 'proposal-gen' | 'onboarding';

export type PipelineStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error';

export interface PipelineState {
  type: PipelineType;
  steps: PipelineStep[];
  currentStep: number;
  status: PipelineStatus;
  startedAt?: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Lead Discovery Pipeline Data
// ---------------------------------------------------------------------------

export interface LeadInput {
  industry: string;           // 업종 (예: 뷰티·패션·식품)
  revenueRange: string;       // 연매출 범위 (예: 50억~500억)
  channelCondition: string;   // 채널 조건 (예: SNS 광고 집행 중)
  daThreshold: number;        // SEO 약점 기준 DA (예: 30)
  recipientEmail?: string;    // 메일 발송 수신자 이메일 (입력 시 NAVER WORKS로 실제 발송)
  // 하위 호환 유지
  companySize?: string;
  region?: string;
  keywords?: string[];
}

export interface Brand {
  name: string;
  domain: string;
  industry: string;
  companySize: string;
  region: string;
  description: string;
  contactEmail?: string;
  contactName?: string;
  annualRevenue?: string;
  employeeCount?: number;
  foundedYear?: number;
  socialProfiles?: Record<string, string>;
}

export interface SEOData {
  domain: string;
  domainRating: number;
  organicTraffic: number;
  organicKeywords: number;
  backlinks: number;
  topKeywords: string[];
  trafficTrend: 'rising' | 'stable' | 'declining';
  contentGap: string[];
  aiSearchVisibility: number;
  competitorDomains: string[];
}

export interface ScoredLead {
  brand: Brand;
  seoData: SEOData;
  scores: {
    seo: number;
    aiSearch: number;
    content: number;
    growth: number;
    fit: number;
    total: number;
  };
  rank: number;
  salesInsight: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FinalLead {
  scoredLead: ScoredLead;
  salesApproach: string;
  proposedServices: string[];
  estimatedDealSize: string;
  nextSteps: string[];
  assignedTo?: string;
}

// ---------------------------------------------------------------------------
// Proposal Generation Pipeline Data
// ---------------------------------------------------------------------------

export interface ProposalInput {
  brand: Brand;
  seoData: SEOData;
  scoredLead: ScoredLead;
  clientGoals?: string[];
  competitorUrls?: string[];
  budget?: string;
  timeline?: string;
}

export interface BrandDiagnosis {
  brand: Brand;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  seoGaps: string[];
  aiSearchGaps: string[];
  contentStrategy: string;
  competitorAnalysis: {
    competitor: string;
    advantage: string;
    gap: string;
  }[];
  priorityActions: string[];
  estimatedImpact: string;
}

export interface ProposalDraft {
  title: string;
  clientName: string;
  executiveSummary: string;
  currentStateAnalysis: string;
  proposedStrategy: string;
  servicePackages: {
    name: string;
    description: string;
    deliverables: string[];
    price: string;
    timeline: string;
  }[];
  expectedResults: {
    metric: string;
    current: string;
    target: string;
    timeline: string;
  }[];
  caseStudies: string[];
  timeline: {
    phase: string;
    duration: string;
    milestones: string[];
  }[];
  pricing: {
    option: string;
    monthlyFee: string;
    setupFee: string;
    details: string;
  }[];
  termsAndConditions: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Onboarding Pipeline Data
// ---------------------------------------------------------------------------

export interface OnboardPlan {
  clientName: string;
  checklist: {
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
    category: string;
  }[];
  meetings: {
    title: string;
    attendees: string[];
    date: string;
    duration: string;
    agenda: string[];
    type: 'kickoff' | 'weekly' | 'review' | 'training';
  }[];
  kpis: {
    metric: string;
    baseline: string;
    target30d: string;
    target90d: string;
    measurementMethod: string;
  }[];
  emailDraft: {
    subject: string;
    body: string;
    recipients: string[];
    sendDate: string;
    type: 'welcome' | 'followup' | 'report' | 'milestone';
  }[];
  geoStrategy: {
    targetQueries: string[];
    contentPlan: {
      topic: string;
      format: string;
      targetDate: string;
      status: 'planned' | 'drafting' | 'review' | 'published';
    }[];
    technicalSetup: string[];
    monitoringPlan: string;
  };
}

// ---------------------------------------------------------------------------
// Debate System
// ---------------------------------------------------------------------------

export interface DebateRound {
  round: number;
  analystMessage: string;
  strategistMessage: string;
  topic: string;
}

// ---------------------------------------------------------------------------
// Approval System
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface ApprovalRequest {
  id: string;
  stepId: string;
  agentId: AgentId;
  data: unknown;
  status: ApprovalStatus;
  feedback?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Agent Configuration Constant
// ---------------------------------------------------------------------------

export interface AgentConfig {
  name: string;
  emoji: string;
  color: string;
  systemPrompt: string;
}

export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  researcher: {
    name: 'Researcher',
    emoji: '\uD83D\uDD0D',
    color: '#3B82F6',
    systemPrompt:
      'You are the Research Agent for Tideworks. Your role is to discover and gather data on potential B2B leads. You search the web, analyze SEO metrics via Ahrefs, and compile brand intelligence. You focus on data accuracy and completeness before passing findings to the Analyst.',
  },
  analyst: {
    name: 'Analyst',
    emoji: '\uD83D\uDCCA',
    color: '#8B5CF6',
    systemPrompt:
      'You are the Analyst Agent for Tideworks. Your role is to score leads using a weighted formula (SEO 25%, AI Search 25%, Content 20%, Growth 15%, Fit 15%), diagnose brand health, and design KPI frameworks. You provide data-driven arguments in debates with the Strategist.',
  },
  strategist: {
    name: 'Strategist',
    emoji: '\uD83C\uDFAF',
    color: '#F59E0B',
    systemPrompt:
      'You are the Strategist Agent for Tideworks. Your role is to generate sales approaches, create proposal drafts, design GEO/AEO strategies, and argue for creative market-driven approaches in debates with the Analyst. You focus on persuasion and business impact.',
  },
  manager: {
    name: 'Manager',
    emoji: '\uD83D\uDC54',
    color: '#10B981',
    systemPrompt:
      'You are the Manager Agent for Tideworks. Your role is to orchestrate the other agents, distribute work across pipelines, moderate debates to reach consensus, and integrate final outputs. You also handle MCP tool integrations (Linear, Notion, Gmail, Calendar).',
  },
};
