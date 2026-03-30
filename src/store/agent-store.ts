import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────
export type AgentId = 'researcher' | 'analyst' | 'strategist' | 'manager';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'debating'
  | 'waiting_approval'
  | 'done'
  | 'error';

export interface AgentMessage {
  id: string;
  agentId: AgentId;
  content: string;
  type: 'text' | 'json' | 'status' | 'approval_request';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  id: AgentId;
  name: string;
  emoji: string;
  status: AgentStatus;
  currentTask?: string;
  messages: AgentMessage[];
  color: string;
}

// ─── Store Interface ─────────────────────────────────────────────────
interface AgentStore {
  agents: Record<AgentId, AgentState>;
  setStatus: (agentId: AgentId, status: AgentStatus, currentTask?: string) => void;
  addMessage: (agentId: AgentId, message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearMessages: (agentId: AgentId) => void;
  resetAll: () => void;
}

// ─── Initial Agent States ────────────────────────────────────────────
const initialAgents: Record<AgentId, AgentState> = {
  researcher: {
    id: 'researcher',
    name: '리서처',
    emoji: '\uD83D\uDD0D',
    status: 'idle',
    messages: [],
    color: '#3498db',
  },
  analyst: {
    id: 'analyst',
    name: '분석가',
    emoji: '\uD83D\uDCCA',
    status: 'idle',
    messages: [],
    color: '#9b59b6',
  },
  strategist: {
    id: 'strategist',
    name: '전략가',
    emoji: '\uD83C\uDFAF',
    status: 'idle',
    messages: [],
    color: '#e67e22',
  },
  manager: {
    id: 'manager',
    name: '매니저',
    emoji: '\uD83D\uDCBC',
    status: 'idle',
    messages: [],
    color: '#1abc9c',
  },
};

// ─── Store ───────────────────────────────────────────────────────────
export const useAgentStore = create<AgentStore>((set) => ({
  agents: structuredClone(initialAgents),

  setStatus: (agentId, status, currentTask) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          status,
          currentTask: currentTask ?? state.agents[agentId].currentTask,
        },
      },
    })),

  addMessage: (agentId, message) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          messages: [
            ...state.agents[agentId].messages,
            {
              ...message,
              id: `${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
            },
          ],
        },
      },
    })),

  clearMessages: (agentId) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          messages: [],
        },
      },
    })),

  resetAll: () =>
    set({ agents: structuredClone(initialAgents) }),
}));
