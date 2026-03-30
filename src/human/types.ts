// =============================================================================
// Tideworks Agent Office - Human Participant Types
// =============================================================================

import type { ExecutionMode } from '../agents/types';

// ---------------------------------------------------------------------------
// Human Roles
// ---------------------------------------------------------------------------

export type HumanRole =
  | 'researcher_lead'
  | 'analyst_lead'
  | 'strategist_lead'
  | 'sales_manager';

// ---------------------------------------------------------------------------
// Human Actions
// ---------------------------------------------------------------------------

export type HumanAction = 'approve' | 'reject' | 'modify' | 'comment';

// ---------------------------------------------------------------------------
// Human Feedback
// ---------------------------------------------------------------------------

export interface HumanFeedback {
  action: HumanAction;
  comment?: string;
  modifiedData?: unknown;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Mode Configuration
// ---------------------------------------------------------------------------

export type ModeConfig = Record<string, ExecutionMode>;

// ---------------------------------------------------------------------------
// Human Participant State
// ---------------------------------------------------------------------------

export interface HumanParticipant {
  role: HumanRole;
  name: string;
  email: string;
  activeSteps: string[];
  feedbackHistory: HumanFeedback[];
}

// ---------------------------------------------------------------------------
// Role-to-Agent Mapping
// ---------------------------------------------------------------------------

export const ROLE_AGENT_MAP: Record<HumanRole, string> = {
  researcher_lead: 'researcher',
  analyst_lead: 'analyst',
  strategist_lead: 'strategist',
  sales_manager: 'manager',
};

// ---------------------------------------------------------------------------
// Role Display Config
// ---------------------------------------------------------------------------

export interface RoleConfig {
  label: string;
  description: string;
  color: string;
}

export const ROLE_CONFIGS: Record<HumanRole, RoleConfig> = {
  researcher_lead: {
    label: 'Research Lead',
    description: 'Oversees brand research and data collection quality',
    color: '#3B82F6',
  },
  analyst_lead: {
    label: 'Analyst Lead',
    description: 'Reviews scoring methodology and brand diagnoses',
    color: '#8B5CF6',
  },
  strategist_lead: {
    label: 'Strategy Lead',
    description: 'Guides sales strategy and proposal direction',
    color: '#F59E0B',
  },
  sales_manager: {
    label: 'Sales Manager',
    description: 'Final approval authority for all pipeline outputs',
    color: '#10B981',
  },
};
