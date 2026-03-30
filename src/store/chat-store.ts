import { create } from 'zustand';
import type { AgentId } from './agent-store';

// ─── Types ───────────────────────────────────────────────────────────
export type HumanRole = 'ceo' | 'sales_lead' | 'reviewer' | 'strategist_human';

export type ChatSender = AgentId | HumanRole | 'system' | '오류';

export type ChatMessageType =
  | 'text'
  | 'json'
  | 'approval_card'
  | 'debate'
  | 'system';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  senderName: string;
  senderEmoji: string;
  content: string;
  type: ChatMessageType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ─── Store Interface ─────────────────────────────────────────────────
interface ChatStore {
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  getMessagesByAgent: (agentId: AgentId) => ChatMessage[];
}

// ─── Store ───────────────────────────────────────────────────────────
export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        },
      ],
    })),

  clearChat: () => set({ messages: [] }),

  getMessagesByAgent: (agentId) =>
    get().messages.filter((m) => m.sender === agentId),
}));
