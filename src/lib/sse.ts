/**
 * SSE (Server-Sent Events) Utilities
 *
 * Provides encoding helpers and stream factories for real-time event delivery
 * from Next.js API routes to the browser.
 */

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/**
 * All recognised SSE event types used across the application.
 */
export const SSEEventTypes = {
  /** Agent status update (started, idle, working). */
  AGENT_STATUS: "agent:status",
  /** Agent text message / partial response. */
  AGENT_MESSAGE: "agent:message",
  /** Pipeline step transition. */
  PIPELINE_STEP: "pipeline:step",
  /** Human approval request (blocks pipeline until approved). */
  APPROVAL_REQUEST: "approval:request",
  /** A single round of the analyst-strategist debate. */
  DEBATE_ROUND: "debate:round",
  /** Pipeline has completed successfully. */
  PIPELINE_COMPLETE: "pipeline:complete",
  /** Error event. */
  ERROR: "error",
} as const;

export type SSEEventType = (typeof SSEEventTypes)[keyof typeof SSEEventTypes];

// ---------------------------------------------------------------------------
// SSEEncoder
// ---------------------------------------------------------------------------

/**
 * Encodes arbitrary data into the `text/event-stream` wire format.
 *
 * Each SSE frame looks like:
 * ```
 * event: <name>\n
 * data: <json>\n
 * \n
 * ```
 */
export class SSEEncoder {
  /**
   * Encode a single SSE frame.
   *
   * @param event - The event name (e.g. "agent:status").
   * @param data  - Arbitrary data; will be JSON-stringified.
   * @returns A formatted SSE string ready to write to the stream.
   */
  encode(event: string, data: unknown): string {
    const jsonStr = JSON.stringify(data);
    // SSE spec: multi-line data needs each line prefixed with "data: ".
    const dataLines = jsonStr
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n");
    return `event: ${event}\n${dataLines}\n\n`;
  }

  /**
   * Encode multiple SSE frames at once.
   *
   * @param events - Array of { event, data } pairs.
   * @returns Concatenated SSE string.
   */
  encodeMultiple(events: { event: string; data: unknown }[]): string {
    return events.map((e) => this.encode(e.event, e.data)).join("");
  }
}

// ---------------------------------------------------------------------------
// Stream Factories
// ---------------------------------------------------------------------------

/** Controller handle returned by createSSEStream. */
export interface SSEStreamController {
  /** The ReadableStream to return from a Next.js route handler. */
  stream: ReadableStream<Uint8Array>;
  /** Send an event to the client. */
  send: (event: string, data: unknown) => void;
  /** Close the stream gracefully. */
  close: () => void;
}

/**
 * Creates a ReadableStream suitable for returning from a Next.js App Router
 * `route.ts` handler together with a controller for pushing events.
 *
 * Usage in a route handler:
 * ```ts
 * export async function GET() {
 *   const { stream, send, close } = createSSEStream();
 *   // ... push events with send()
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       Connection: "keep-alive",
 *     },
 *   });
 * }
 * ```
 */
export function createSSEStream(): SSEStreamController {
  const encoder = new SSEEncoder();
  const textEncoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    cancel() {
      controllerRef = null;
    },
  });

  function send(event: string, data: unknown): void {
    if (!controllerRef) return;
    try {
      const frame = encoder.encode(event, data);
      controllerRef.enqueue(textEncoder.encode(frame));
    } catch {
      // Stream may have been closed by the client; swallow.
    }
  }

  function close(): void {
    if (!controllerRef) return;
    try {
      controllerRef.close();
    } catch {
      // Already closed.
    }
    controllerRef = null;
  }

  return { stream, send, close };
}

// ---------------------------------------------------------------------------
// Transform Stream Helper
// ---------------------------------------------------------------------------

/**
 * Typed SSE event passed through the transform stream.
 */
export interface SSEEvent {
  event: string;
  data: unknown;
}

/**
 * Creates a TransformStream that converts `SSEEvent` objects into encoded
 * `Uint8Array` chunks in the SSE wire format.
 *
 * Useful when you want to pipe a readable source of events through a
 * transformer and get a byte stream out:
 *
 * ```ts
 * const { readable, writable } = createSSETransformStream();
 * const writer = writable.getWriter();
 * await writer.write({ event: "agent:status", data: { status: "working" } });
 * // readable emits the encoded SSE bytes
 * ```
 */
export function createSSETransformStream(): TransformStream<
  SSEEvent,
  Uint8Array
> {
  const encoder = new SSEEncoder();
  const textEncoder = new TextEncoder();

  return new TransformStream<SSEEvent, Uint8Array>({
    transform(chunk, controller) {
      const frame = encoder.encode(chunk.event, chunk.data);
      controller.enqueue(textEncoder.encode(frame));
    },
  });
}

// ---------------------------------------------------------------------------
// Response Helper
// ---------------------------------------------------------------------------

/**
 * Convenience function to build a Next.js-compatible `Response` object
 * with the correct SSE headers.
 *
 * @param stream - A ReadableStream of Uint8Array (e.g. from createSSEStream).
 * @returns A Response configured for SSE.
 */
export function createSSEResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Typed Helper Functions
// ---------------------------------------------------------------------------

/**
 * Shorthand helpers that combine createSSEStream with typed event sending.
 * These produce correctly typed payloads for each event type.
 */

export interface AgentStatusPayload {
  agentId: string;
  agentName: string;
  status: "idle" | "working" | "done" | "error";
  message?: string;
}

export interface AgentMessagePayload {
  agentId: string;
  agentName: string;
  content: string;
  isPartial: boolean;
}

export interface PipelineStepPayload {
  step: number;
  totalSteps: number;
  stepName: string;
  status: "started" | "completed" | "failed";
  data?: unknown;
}

export interface ApprovalRequestPayload {
  requestId: string;
  type: "email_send" | "proposal_send" | "task_create" | "meeting_schedule";
  title: string;
  description: string;
  data: unknown;
}

export interface DebateRoundPayload {
  round: number;
  maxRounds: number;
  topic: string;
  analystArgument: string;
  strategistArgument: string;
  consensusReached: boolean;
  resolution?: string;
}

export interface PipelineCompletePayload {
  success: boolean;
  summary: string;
  duration: number;
  outputs: unknown;
}

export interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
}

/**
 * Convenience wrapper that creates an SSE stream and returns typed send
 * functions for every event type so callers don't have to remember event
 * name strings.
 */
export function createTypedSSEStream() {
  const { stream, send, close } = createSSEStream();

  return {
    stream,
    close,

    sendAgentStatus(payload: AgentStatusPayload) {
      send(SSEEventTypes.AGENT_STATUS, payload);
    },
    sendAgentMessage(payload: AgentMessagePayload) {
      send(SSEEventTypes.AGENT_MESSAGE, payload);
    },
    sendPipelineStep(payload: PipelineStepPayload) {
      send(SSEEventTypes.PIPELINE_STEP, payload);
    },
    sendApprovalRequest(payload: ApprovalRequestPayload) {
      send(SSEEventTypes.APPROVAL_REQUEST, payload);
    },
    sendDebateRound(payload: DebateRoundPayload) {
      send(SSEEventTypes.DEBATE_ROUND, payload);
    },
    sendPipelineComplete(payload: PipelineCompletePayload) {
      send(SSEEventTypes.PIPELINE_COMPLETE, payload);
    },
    sendError(payload: ErrorPayload) {
      send(SSEEventTypes.ERROR, payload);
    },

    /** Raw send for custom events not in the standard set. */
    sendRaw: send,
  };
}
