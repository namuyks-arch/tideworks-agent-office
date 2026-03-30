/**
 * Shared in-memory approval store
 * 파이프라인 서버 코드와 API route 양쪽에서 공유하는 승인 저장소
 */

import type { ApprovalStatus } from '@/agents/types';

export interface ApprovalRecord {
  approvalId: string;
  action: 'approve' | 'reject' | 'modify';
  feedback?: string;
  modifiedData?: unknown;
  status: ApprovalStatus;
  decidedAt: number;
}

// In-memory store (서버 프로세스 내 공유)
export const approvalStore = new Map<string, ApprovalRecord>();

export function getApproval(approvalId: string): ApprovalRecord | undefined {
  return approvalStore.get(approvalId);
}

export function waitForApproval(
  approvalId: string,
  timeoutMs: number = 300_000,
): Promise<ApprovalRecord> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      const record = approvalStore.get(approvalId);
      if (record) {
        resolve(record);
        return;
      }
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Approval timeout: ${approvalId}`));
        return;
      }
      setTimeout(check, 500);
    };

    check();
  });
}
