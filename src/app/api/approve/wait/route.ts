/**
 * POST /api/approve/wait
 *
 * 파이프라인이 특정 approvalId에 대한 사람의 결정을 대기합니다.
 * 결정이 내려지거나 타임아웃(기본 30초) 시 자동으로 approve를 반환합니다.
 *
 * Request body:
 *   { approvalId: string; timeoutMs?: number }
 *
 * Response:
 *   { action: 'approve' | 'reject' | 'modify'; feedback?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitForApproval } from '@/lib/approval-store';

interface WaitRequestBody {
  approvalId: string;
  timeoutMs?: number;
}

interface WaitResponse {
  action: 'approve' | 'reject' | 'modify';
  feedback?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<WaitResponse>> {
  let body: WaitRequestBody;
  try {
    body = (await request.json()) as WaitRequestBody;
  } catch {
    // 파싱 실패 시 자동 승인으로 fallback
    return NextResponse.json({ action: 'approve' });
  }

  const { approvalId, timeoutMs = 30_000 } = body;

  if (!approvalId || typeof approvalId !== 'string') {
    return NextResponse.json({ action: 'approve' });
  }

  try {
    const record = await waitForApproval(approvalId, timeoutMs);
    return NextResponse.json({
      action: record.action,
      feedback: record.feedback,
    });
  } catch {
    // 타임아웃 또는 오류 시 자동 승인
    return NextResponse.json({ action: 'approve' });
  }
}
