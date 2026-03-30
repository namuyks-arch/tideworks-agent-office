// =============================================================================
// Tideworks Agent Office - Approval Gate
// =============================================================================

import type { AgentId, ApprovalRequest, ApprovalStatus } from '../agents/types';
import type { HumanAction, HumanFeedback } from './types';

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export type ApprovalEventType =
  | 'approval_requested'
  | 'approval_resolved'
  | 'approval_timeout';

export interface ApprovalEvent {
  type: ApprovalEventType;
  request: ApprovalRequest;
  timestamp: number;
}

type ApprovalEventHandler = (event: ApprovalEvent) => void;

// ---------------------------------------------------------------------------
// Pending Request with Resolver
// ---------------------------------------------------------------------------

interface PendingRequest {
  request: ApprovalRequest;
  resolve: (value: {
    status: 'approved' | 'rejected' | 'modified';
    feedback?: string;
    modifiedData?: unknown;
  }) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Approval Gate
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

let approvalCounter = 0;

function generateApprovalId(): string {
  approvalCounter += 1;
  return `approval_${Date.now()}_${approvalCounter}`;
}

export class ApprovalGate {
  private pending: Map<string, PendingRequest> = new Map();
  private handlers: Map<ApprovalEventType, Set<ApprovalEventHandler>> =
    new Map();
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  // -------------------------------------------------------------------------
  // Event Emitter
  // -------------------------------------------------------------------------

  on(type: ApprovalEventType, handler: ApprovalEventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: ApprovalEventType, handler: ApprovalEventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  private emit(type: ApprovalEventType, request: ApprovalRequest): void {
    const event: ApprovalEvent = {
      type,
      request,
      timestamp: Date.now(),
    };
    this.handlers.get(type)?.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`[ApprovalGate] handler error for ${type}:`, err);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Request Approval (returns Promise that resolves on human action)
  // -------------------------------------------------------------------------

  requestApproval(
    stepId: string,
    agentId: string,
    data: unknown
  ): Promise<{
    status: 'approved' | 'rejected' | 'modified';
    feedback?: string;
    modifiedData?: unknown;
  }> {
    const request: ApprovalRequest = {
      id: generateApprovalId(),
      stepId,
      agentId: agentId as AgentId,
      data,
      status: 'pending',
      timestamp: Date.now(),
    };

    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        this.handleTimeout(request.id);
      }, this.timeoutMs);

      this.pending.set(request.id, {
        request,
        resolve,
        timeoutHandle,
      });

      this.emit('approval_requested', request);
    });
  }

  // -------------------------------------------------------------------------
  // Human Actions
  // -------------------------------------------------------------------------

  approve(requestId: string, feedback?: string): void {
    this.resolveRequest(requestId, 'approved', feedback);
  }

  reject(requestId: string, feedback?: string): void {
    this.resolveRequest(requestId, 'rejected', feedback);
  }

  modify(requestId: string, modifiedData: unknown, feedback?: string): void {
    const pendingReq = this.pending.get(requestId);
    if (!pendingReq) {
      console.warn(
        `[ApprovalGate] No pending request found for ID: ${requestId}`
      );
      return;
    }

    clearTimeout(pendingReq.timeoutHandle);
    pendingReq.request.status = 'modified';
    pendingReq.request.feedback = feedback;

    this.emit('approval_resolved', pendingReq.request);

    pendingReq.resolve({
      status: 'modified',
      feedback,
      modifiedData,
    });

    this.pending.delete(requestId);
  }

  // -------------------------------------------------------------------------
  // Resolve by HumanFeedback
  // -------------------------------------------------------------------------

  handleFeedback(requestId: string, feedback: HumanFeedback): void {
    const actionMap: Record<HumanAction, () => void> = {
      approve: () => this.approve(requestId, feedback.comment),
      reject: () => this.reject(requestId, feedback.comment),
      modify: () =>
        this.modify(requestId, feedback.modifiedData, feedback.comment),
      comment: () => {
        // Comment only -- do not resolve the request
        const pendingReq = this.pending.get(requestId);
        if (pendingReq && feedback.comment) {
          pendingReq.request.feedback =
            (pendingReq.request.feedback ?? '') +
            '\n' +
            feedback.comment;
        }
      },
    };

    const handler = actionMap[feedback.action];
    if (handler) {
      handler();
    }
  }

  // -------------------------------------------------------------------------
  // Query State
  // -------------------------------------------------------------------------

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pending.values()).map((p) => ({
      ...p.request,
    }));
  }

  getPendingRequestById(requestId: string): ApprovalRequest | null {
    const pending = this.pending.get(requestId);
    return pending ? { ...pending.request } : null;
  }

  hasPendingRequests(): boolean {
    return this.pending.size > 0;
  }

  getPendingCount(): number {
    return this.pending.size;
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  cancelAll(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeoutHandle);
      pending.resolve({ status: 'rejected', feedback: 'Cancelled' });
      this.pending.delete(id);
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private resolveRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    feedback?: string
  ): void {
    const pendingReq = this.pending.get(requestId);
    if (!pendingReq) {
      console.warn(
        `[ApprovalGate] No pending request found for ID: ${requestId}`
      );
      return;
    }

    clearTimeout(pendingReq.timeoutHandle);
    pendingReq.request.status = status as ApprovalStatus;
    pendingReq.request.feedback = feedback;

    this.emit('approval_resolved', pendingReq.request);

    pendingReq.resolve({ status, feedback });
    this.pending.delete(requestId);
  }

  private handleTimeout(requestId: string): void {
    const pendingReq = this.pending.get(requestId);
    if (!pendingReq) {
      return;
    }

    pendingReq.request.status = 'rejected';
    pendingReq.request.feedback = 'Timed out after waiting for approval';

    this.emit('approval_timeout', pendingReq.request);

    pendingReq.resolve({
      status: 'rejected',
      feedback: 'Approval request timed out',
    });

    this.pending.delete(requestId);
  }
}
