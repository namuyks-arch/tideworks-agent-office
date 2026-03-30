/**
 * Approval Client
 *
 * 프론트엔드에서 승인 결정을 제출하고 파이프라인의 결정 대기를 처리하는
 * 클라이언트 함수 모음입니다.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmitApprovalResult {
  success: boolean;
  nextStep?: string;
  error?: string;
}

export interface WaitForApprovalResult {
  action: 'approve' | 'reject' | 'modify';
  feedback?: string;
}

// ---------------------------------------------------------------------------
// submitApproval
// ---------------------------------------------------------------------------

/**
 * 사람의 승인/반려/수정 결정을 API에 제출합니다.
 *
 * @param approvalId  - 결정 대상 approval ID
 * @param action      - 'approve' | 'reject' | 'modify'
 * @param feedback    - 반려 또는 수정 시 피드백 텍스트 (선택)
 * @returns           { success: boolean, nextStep?: string }
 */
export async function submitApproval(
  approvalId: string,
  action: 'approve' | 'reject' | 'modify',
  feedback?: string,
): Promise<SubmitApprovalResult> {
  try {
    const response = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, action, feedback }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (errorBody as { error?: string }).error ?? `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { success: boolean; nextStep?: string };
    return { success: data.success, nextStep: data.nextStep };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// waitForApproval
// ---------------------------------------------------------------------------

/**
 * 특정 approvalId에 대한 사람의 결정을 기다립니다.
 * timeoutMs 경과 시 자동으로 approve를 반환합니다.
 *
 * @param approvalId  - 결정을 기다릴 approval ID
 * @param timeoutMs   - 최대 대기 시간 (기본 30초)
 * @returns           { action: string; feedback?: string }
 */
export async function waitForApproval(
  approvalId: string,
  timeoutMs = 30_000,
): Promise<WaitForApprovalResult> {
  try {
    const response = await fetch('/api/approve/wait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, timeoutMs }),
    });

    if (!response.ok) {
      return { action: 'approve' };
    }

    const data = (await response.json()) as WaitForApprovalResult;
    return {
      action: data.action ?? 'approve',
      feedback: data.feedback,
    };
  } catch {
    // 네트워크 오류 또는 타임아웃 시 자동 승인
    return { action: 'approve' };
  }
}
