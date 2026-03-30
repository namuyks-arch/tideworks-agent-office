/**
 * Approval Endpoint
 *
 * POST /api/approve
 *
 * Accepts human-in-the-loop approval, rejection, or modification decisions.
 * The approval state is stored in an in-memory Map (will be replaced with
 * a persistent store in production).
 *
 * Each approval is keyed by approvalId and holds the action taken, optional
 * feedback, and any modified data the user provided.
 */

import { NextRequest, NextResponse } from 'next/server';
import { approvalStore, type ApprovalRecord } from '@/lib/approval-store';
import type { ApprovalStatus } from '@/agents/types';

// ---------------------------------------------------------------------------
// Request / Response Types
// ---------------------------------------------------------------------------

interface ApproveRequestBody {
  approvalId: string;
  action: 'approve' | 'reject' | 'modify';
  feedback?: string;
  modifiedData?: unknown;
}

interface ApproveResponse {
  success: boolean;
  nextStep?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Step Progression Map
// ---------------------------------------------------------------------------

/**
 * Maps a step that required approval to the next step in the pipeline.
 * This is used to tell the frontend which step comes next after approval.
 */
const NEXT_STEP_MAP: Record<string, string> = {
  // Lead Discovery
  'ld-step-4': 'ld-step-5',
  'ld-step-5': 'ld-step-6',
  'ld-step-7': 'ld-step-8',
  'ld-step-8': 'pipeline-complete',
  // Proposal Generation
  'pg-step-3': 'pg-step-4',
  'pg-step-5': 'pg-step-6',
  'pg-step-7': 'pipeline-complete',
  // Onboarding
  'ob-step-3': 'ob-step-4',
  'ob-step-5': 'ob-step-6',
  'ob-step-7': 'ob-step-8',
  'ob-step-8': 'pipeline-complete',
};

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<ApproveResponse>> {
  let body: ApproveRequestBody;
  try {
    body = (await request.json()) as ApproveRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  const { approvalId, action, feedback, modifiedData } = body;

  // Validation
  if (!approvalId || typeof approvalId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'approvalId is required and must be a string' },
      { status: 400 },
    );
  }

  const validActions = ['approve', 'reject', 'modify'] as const;
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { success: false, error: `action must be one of: ${validActions.join(', ')}` },
      { status: 400 },
    );
  }

  if (action === 'modify' && modifiedData === undefined && !feedback) {
    return NextResponse.json(
      { success: false, error: 'feedback or modifiedData is required when action is "modify"' },
      { status: 400 },
    );
  }

  // Map action to approval status
  const statusMap: Record<typeof action, ApprovalStatus> = {
    approve: 'approved',
    reject: 'rejected',
    modify: 'modified',
  };

  const record: ApprovalRecord = {
    approvalId,
    action,
    feedback,
    modifiedData,
    status: statusMap[action],
    decidedAt: Date.now(),
  };

  approvalStore.set(approvalId, record);

  // Derive the step ID from the approval ID (format: "approval-{stepId}-{timestamp}")
  const stepIdMatch = approvalId.match(/^approval-(.+)-\d+$/);
  const stepId = stepIdMatch ? stepIdMatch[1] : undefined;
  const nextStep = stepId ? NEXT_STEP_MAP[stepId] : undefined;

  return NextResponse.json({
    success: true,
    nextStep: action === 'reject' ? undefined : nextStep,
  });
}

// ---------------------------------------------------------------------------
// GET Handler - Retrieve approval status
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  // ?id=... 또는 ?approvalId=... 두 가지 형태 모두 지원
  const approvalId = searchParams.get('id') ?? searchParams.get('approvalId');

  if (!approvalId) {
    return NextResponse.json(
      { error: 'id (or approvalId) query parameter is required' },
      { status: 400 },
    );
  }

  const record = approvalStore.get(approvalId);
  if (!record) {
    return NextResponse.json(
      { status: 'pending', approvalId },
      { status: 200 },
    );
  }

  return NextResponse.json(record);
}
