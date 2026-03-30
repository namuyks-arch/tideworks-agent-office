/**
 * Claude API Client Wrapper
 *
 * Provides typed methods for interacting with the Anthropic Messages API:
 *   - chat()       : single-turn or multi-turn text completion
 *   - chatStream() : SSE streaming completion
 *   - chatJSON()   : forces JSON output and parses the response
 *
 * All methods include automatic retry (up to 3 attempts) with exponential
 * back-off for transient 429 / 5xx errors.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single message in a conversation. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Minimal tool definition accepted by the Anthropic Messages API. */
export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Shape of the Anthropic Messages API response. */
interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/** SSE delta event coming from the streaming endpoint. */
interface SSEDeltaEvent {
  type: string;
  index?: number;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1500;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const ANTHROPIC_API_VERSION = "2023-06-01";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "[claude] ANTHROPIC_API_KEY is not set in environment variables.",
    );
  }
  return key;
}

/** Returns true when the HTTP status code is retryable. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Generic retry wrapper with exponential back-off.
 * Only retries on network errors or retryable HTTP status codes.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isLast = attempt === maxRetries - 1;
      if (isLast) break;

      // Only retry on retryable errors (network / 429 / 5xx).
      const isRetryableError =
        lastError.message.includes("retryable") ||
        lastError.message.includes("429") ||
        lastError.message.includes("500") ||
        lastError.message.includes("502") ||
        lastError.message.includes("503") ||
        lastError.message.includes("fetch failed");

      if (!isRetryableError) break;

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error("[claude] Unknown error during retry.");
}

/**
 * Low-level call to the Anthropic Messages API (non-streaming).
 */
async function callAnthropic(body: Record<string, unknown>): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    if (isRetryable(res.status)) {
      throw new Error(
        `[claude] retryable HTTP ${res.status}: ${errorBody}`,
      );
    }
    throw new Error(
      `[claude] HTTP ${res.status}: ${errorBody}`,
    );
  }

  return (await res.json()) as AnthropicResponse;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Standard chat completion.
 *
 * @param systemPrompt - The system prompt that sets agent behaviour.
 * @param messages     - Conversation history.
 * @param tools        - Optional tool definitions for function-calling.
 * @returns The assistant's text reply.
 */
export async function chat(
  systemPrompt: string,
  messages: ChatMessage[],
  tools?: ToolDef[],
): Promise<string> {
  return withRetry(async () => {
    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await callAnthropic(body);

    // Extract all text blocks from the response.
    const textBlocks = response.content
      .filter((block): block is AnthropicContentBlock & { type: "text"; text: string } => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text);

    if (textBlocks.length === 0) {
      throw new Error("[claude] No text content in API response.");
    }

    return textBlocks.join("\n");
  });
}

/**
 * Streaming chat completion using SSE.
 *
 * Calls the Anthropic Messages API with `stream: true` and invokes `onChunk`
 * for every text delta. Returns the full concatenated response.
 *
 * @param systemPrompt - The system prompt.
 * @param messages     - Conversation history.
 * @param onChunk      - Callback invoked with each incremental text chunk.
 * @returns The full assistant reply.
 */
export async function chatStream(
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      if (isRetryable(res.status)) {
        throw new Error(`[claude] retryable HTTP ${res.status}: ${errorBody}`);
      }
      throw new Error(`[claude] HTTP ${res.status}: ${errorBody}`);
    }

    if (!res.body) {
      throw new Error("[claude] Response body is null (streaming failed).");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE frames from the buffer.
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer.
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6); // strip "data: "
        if (dataStr === "[DONE]") continue;

        let event: SSEDeltaEvent;
        try {
          event = JSON.parse(dataStr) as SSEDeltaEvent;
        } catch {
          // Non-JSON data line; skip.
          continue;
        }

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          fullText += event.delta.text;
          onChunk(event.delta.text);
        }
      }
    }

    if (fullText.length === 0) {
      throw new Error("[claude] No text received from streaming response.");
    }

    return fullText;
  });
}

/**
 * Chat completion that forces JSON output.
 *
 * Appends an instruction to the system prompt asking the model to reply with
 * **only** valid JSON, then parses and returns the result as `T`.
 *
 * @param systemPrompt - The system prompt.
 * @param messages     - Conversation history.
 * @returns Parsed JSON of type `T`.
 */
export async function chatJSON<T>(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt}\n\n[중요] 반드시 유효한 JSON만 출력하세요. 마크다운 코드블록이나 설명 텍스트 없이 순수 JSON만 응답합니다.`;

  // Ensure the last user message also reinforces JSON expectation.
  const augmentedMessages: ChatMessage[] = [
    ...messages.slice(0, -1),
    {
      role: messages[messages.length - 1]?.role ?? "user",
      content:
        (messages[messages.length - 1]?.content ?? "") +
        "\n\nJSON 형식으로만 응답해주세요.",
    },
  ];

  const raw = await chat(jsonSystemPrompt, augmentedMessages);

  // Strip markdown code fences if the model wraps them anyway.
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `[claude] Failed to parse JSON response.\nRaw output:\n${raw}`,
    );
  }
}
