/**
 * SSE Endpoint for Pipeline Execution
 *
 * POST /api/agents
 *
 * Accepts a pipeline type and input, then streams execution events back
 * to the client using Server-Sent Events. Each event carries a typed payload
 * so the frontend can update agent cards, progress bars, and approval modals
 * in real time.
 *
 * Event types:
 *   agent:status      - Agent status change (idle -> working -> done)
 *   agent:message     - Agent produced a text/json message
 *   pipeline:step     - Pipeline advanced to a new step
 *   approval:request  - Human-in-the-loop approval needed
 *   debate:round      - Analyst vs Strategist debate round
 *   pipeline:complete - Pipeline finished successfully
 *   error             - Something went wrong
 */

import { NextRequest } from 'next/server';
import type {
  PipelineType,
  AgentId,
  AgentStatus,
  ExecutionMode,
  LeadInput,
  ProposalInput,
} from '@/agents/types';
import { runLeadDiscovery } from '@/pipelines/lead-discovery';
import { runProposalGen } from '@/pipelines/proposal-gen';
import { runOnboarding } from '@/pipelines/onboarding';

// ---------------------------------------------------------------------------
// SSE Event Types
// ---------------------------------------------------------------------------

export interface SSEAgentStatus {
  agentId: AgentId;
  status: AgentStatus;
  currentTask?: string;
}

export interface SSEAgentMessage {
  agentId: AgentId;
  content: string;
  type: 'text' | 'json';
  metadata?: Record<string, unknown>;
}

export interface SSEPipelineStep {
  stepId: string;
  stepName: string;
  agentId: AgentId;
  mode: ExecutionMode;
  order: number;
  totalSteps: number;
}

export interface SSEApprovalRequest {
  approvalId: string;
  stepId: string;
  agentId: AgentId;
  summary: string;
  data: unknown;
}

export interface SSEDebateRound {
  round: number;
  topic: string;
  analystMessage: string;
  strategistMessage: string;
}

export interface SSEPipelineComplete {
  pipelineType: PipelineType;
  durationMs: number;
  summary: string;
}

export interface SSEError {
  message: string;
  stepId?: string;
  recoverable: boolean;
}

// Union type for the emitEvent callback
export type SSEEventType =
  | { type: 'agent:status'; payload: SSEAgentStatus }
  | { type: 'agent:message'; payload: SSEAgentMessage }
  | { type: 'pipeline:step'; payload: SSEPipelineStep }
  | { type: 'approval:request'; payload: SSEApprovalRequest }
  | { type: 'debate:round'; payload: SSEDebateRound }
  | { type: 'pipeline:complete'; payload: SSEPipelineComplete }
  | { type: 'error'; payload: SSEError };

export type EmitEvent = (event: SSEEventType) => void;

// ---------------------------------------------------------------------------
// Request / Response Types
// ---------------------------------------------------------------------------

interface AgentsRequestBody {
  pipelineType: PipelineType;
  input: LeadInput | ProposalInput | { clientName: string; services: string[] };
  modeConfig?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  let body: AgentsRequestBody;
  try {
    body = (await request.json()) as AgentsRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { pipelineType, input, modeConfig } = body;

  if (!pipelineType || !input) {
    return new Response(
      JSON.stringify({ error: 'pipelineType and input are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const validTypes: PipelineType[] = ['lead-discovery', 'proposal-gen', 'onboarding'];
  if (!validTypes.includes(pipelineType)) {
    return new Response(
      JSON.stringify({ error: `Invalid pipelineType. Must be one of: ${validTypes.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Build a TransformStream that encodes SSE frames
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emitEvent: EmitEvent = (event: SSEEventType) => {
    const frame = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    writer.write(encoder.encode(frame)).catch(() => {
      // Client disconnected; swallow the error
    });
  };

  // Run the pipeline in the background so we can return the stream immediately
  const pipelinePromise = (async () => {
    const startTime = Date.now();
    try {
      switch (pipelineType) {
        case 'lead-discovery':
          await runLeadDiscovery(input as LeadInput, modeConfig ?? {}, emitEvent);
          break;
        case 'proposal-gen':
          await runProposalGen(input as ProposalInput, modeConfig ?? {}, emitEvent);
          break;
        case 'onboarding':
          await runOnboarding(
            input as { clientName: string; services: string[] },
            modeConfig ?? {},
            emitEvent,
          );
          break;
      }

      emitEvent({
        type: 'pipeline:complete',
        payload: {
          pipelineType,
          durationMs: Date.now() - startTime,
          summary: `Pipeline ${pipelineType} completed successfully`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitEvent({
        type: 'error',
        payload: { message, recoverable: false },
      });
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  // Prevent unhandled rejection warnings
  pipelinePromise.catch(() => {});

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
