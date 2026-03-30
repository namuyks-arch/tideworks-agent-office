// ---------------------------------------------------------------------------
// Shared Types for Tideworks Agent Office
// ---------------------------------------------------------------------------

// Agent Types
export type AgentId = 'researcher' | 'analyst' | 'strategist' | 'manager';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'debating'
  | 'waiting_approval'
  | 'done'
  | 'error';

export interface AgentInfo {
  name: string;
  emoji: string;
  status: AgentStatus;
  color: string;
  currentTask?: string;
}

// Chat Types
export type SenderType = 'agent' | 'human' | 'system';

export type MessageType =
  | 'text'
  | 'approval'
  | 'debate'
  | 'json'
  | 'error'
  | 'status';

export interface ChatMessageData {
  id: string;
  senderType: SenderType;
  senderId?: AgentId;
  senderName: string;
  senderEmoji: string;
  senderColor?: string;
  content: string;
  type: MessageType;
  timestamp: number;
  jsonData?: Record<string, unknown>;
  approvalData?: {
    title: string;
    description: string;
    details?: string;
  };
  debatePartner?: AgentId;
}

// Pipeline Types
export type StepMode = 'auto' | 'approval' | 'manual';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'skipped'
  | 'error';

export interface PipelineStep {
  id: string;
  name: string;
  agentId: AgentId;
  agentEmoji: string;
  mode: StepMode;
  status: StepStatus;
  details?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface PipelineState {
  id: string;
  name: string;
  steps: PipelineStep[];
  currentStepIndex: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  startedAt?: number;
  completedAt?: number;
}

// Design Tokens
export const AGENT_COLORS: Record<AgentId, string> = {
  researcher: '#3498db',
  analyst: '#9b59b6',
  strategist: '#e67e22',
  manager: '#1abc9c',
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#6b7280',
  thinking: '#3b82f6',
  working: '#22c55e',
  debating: '#f97316',
  waiting_approval: '#eab308',
  done: '#22c55e',
  error: '#ef4444',
};

export const STATUS_LABELS_KR: Record<AgentStatus, string> = {
  idle: '\uB300\uAE30',
  thinking: '\uC0AC\uACE0\uC911',
  working: '\uC791\uC5C5\uC911',
  debating: '\uD1A0\uB860\uC911',
  waiting_approval: '\uC2B9\uC778\uB300\uAE30',
  done: '\uC644\uB8CC',
  error: '\uC624\uB958',
};

export const OFFICE_COLORS = {
  bg: '#2c2137',
  floor: '#4a3f5c',
  wall: '#3d3352',
  desk: '#8b6914',
  screen: '#00d4aa',
} as const;
