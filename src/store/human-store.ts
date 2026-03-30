import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────
export type HumanRole = 'ceo' | 'sales_lead' | 'reviewer' | 'strategist_human';

export type ApprovalAction = 'approved' | 'rejected' | 'revision_requested';

export interface ApprovalRequest {
  id: string;
  stepId: string;
  pipelineId: string;
  agentId: string;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  status: 'pending' | ApprovalAction;
  feedback?: string;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: HumanRole;
}

// ─── Store Interface ─────────────────────────────────────────────────
interface HumanStore {
  activeRole: HumanRole;
  joinedRoles: Set<HumanRole>;
  pendingApprovals: ApprovalRequest[];
  approvalHistory: ApprovalRequest[];
  setActiveRole: (role: HumanRole) => void;
  joinRole: (role: HumanRole) => void;
  leaveRole: (role: HumanRole) => void;
  addApproval: (request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>) => void;
  addApprovalWithId: (request: Omit<ApprovalRequest, 'status' | 'createdAt'>) => void;
  resolveApproval: (id: string, action: ApprovalAction, feedback?: string) => Promise<void>;
  getPending: () => ApprovalRequest[];
  clearAll: () => void;
}

// ─── Human Role Metadata ─────────────────────────────────────────────
export const HUMAN_ROLES: Record<HumanRole, { name: string; emoji: string; label: string }> = {
  ceo:              { name: '이정',  emoji: '👑', label: '이정 (세일즈매니저)' },
  sales_lead:       { name: '남재',  emoji: '🔍', label: '남재 (리서처)' },
  reviewer:         { name: '우슬',  emoji: '📊', label: '우슬 (분석가)' },
  strategist_human: { name: '윤기',  emoji: '🎯', label: '윤기 (전략가)' },
};

// ─── Store ───────────────────────────────────────────────────────────
export const useHumanStore = create<HumanStore>((set, get) => ({
  activeRole: 'ceo',
  // 초기값: ceo만 입장된 상태
  joinedRoles: new Set<HumanRole>(['ceo']),
  pendingApprovals: [],
  approvalHistory: [],

  setActiveRole: (role) =>
    set((state) => ({
      activeRole: role,
      // 역할 전환 시 해당 역할도 자동 입장 처리
      joinedRoles: new Set([...state.joinedRoles, role]),
    })),

  joinRole: (role) =>
    set((state) => ({
      joinedRoles: new Set([...state.joinedRoles, role]),
    })),

  leaveRole: (role) =>
    set((state) => {
      // activeRole은 퇴장 불가
      if (state.activeRole === role) return state;
      const next = new Set(state.joinedRoles);
      next.delete(role);
      return { joinedRoles: next };
    }),

  addApproval: (request) =>
    set((state) => ({
      pendingApprovals: [
        ...state.pendingApprovals,
        {
          ...request,
          id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'pending' as const,
          createdAt: Date.now(),
        },
      ],
    })),

  addApprovalWithId: (request) =>
    set((state) => ({
      pendingApprovals: [
        ...state.pendingApprovals,
        {
          ...request,
          status: 'pending' as const,
          createdAt: Date.now(),
        },
      ],
    })),

  resolveApproval: async (id, action, feedback) => {
    // 1. Zustand 스토어 즉시 업데이트 (UI 반응성 확보)
    set((state) => {
      const target = state.pendingApprovals.find((a) => a.id === id);
      if (!target) return state;

      const resolved: ApprovalRequest = {
        ...target,
        status: action,
        feedback,
        resolvedAt: Date.now(),
        resolvedBy: state.activeRole,
      };

      return {
        pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id),
        approvalHistory: [...state.approvalHistory, resolved],
      };
    });

    // 2. ApprovalAction -> API action 매핑
    //    스토어는 'approved'/'rejected'/'revision_requested' 사용
    //    API는 'approve'/'reject'/'modify' 사용
    const actionMap: Record<ApprovalAction, 'approve' | 'reject' | 'modify'> = {
      approved: 'approve',
      rejected: 'reject',
      revision_requested: 'modify',
    };
    const apiAction = actionMap[action];

    // 3. API에 결정 전송 (파이프라인의 waitForApproval 폴링이 이 응답을 수신)
    try {
      await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, action: apiAction, feedback }),
      });
    } catch {
      // API 전송 실패는 무시 (스토어 상태는 이미 업데이트됨)
    }
  },

  getPending: () => get().pendingApprovals,

  clearAll: () => set({ pendingApprovals: [], approvalHistory: [] }),
}));
