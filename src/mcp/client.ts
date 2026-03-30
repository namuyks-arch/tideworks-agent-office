/**
 * Base MCP (Model Context Protocol) Client
 *
 * Generic client that communicates with MCP servers over HTTP.
 * Provides tool invocation and tool listing with automatic retry (3 attempts),
 * timeout handling, and structured error responses.
 *
 * In production, MCP servers are expected to expose:
 *   POST /tools/call  - invoke a tool
 *   GET  /tools/list  - list available tools
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: unknown;
  isError?: boolean;
  errorMessage?: string;
}

export interface MCPClientOptions {
  /** Maximum number of retries on transient failures. Default: 3 */
  maxRetries?: number;
  /** Request timeout in milliseconds. Default: 30_000 */
  timeoutMs?: number;
  /** Optional auth token to pass as Bearer header */
  authToken?: string;
}

interface MCPErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const INITIAL_BACKOFF_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates an AbortController that auto-aborts after `ms` milliseconds.
 */
function createTimeoutController(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    controller,
    clear: () => clearTimeout(timer),
  };
}

// ---------------------------------------------------------------------------
// MCP Client
// ---------------------------------------------------------------------------

/**
 * Calls a tool on an MCP server.
 *
 * @param serverUrl  Base URL of the MCP server (e.g. "http://localhost:3100")
 * @param toolName   The tool to invoke
 * @param params     Parameters to pass to the tool
 * @param options    Optional retry/timeout configuration
 * @returns          The tool result payload
 */
export async function callTool(
  serverUrl: string,
  toolName: string,
  params: Record<string, unknown>,
  options?: MCPClientOptions,
): Promise<MCPToolResult> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { controller, clear } = createTimeoutController(timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (options?.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      }

      const url = `${serverUrl.replace(/\/$/, '')}/tools/call`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: toolName, arguments: params }),
        signal: controller.signal,
      });

      clear();

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');

        if (isRetryableStatus(res.status) && attempt < maxRetries) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await delay(backoff);
          continue;
        }

        let parsedError: MCPErrorResponse | undefined;
        try {
          parsedError = JSON.parse(errorBody) as MCPErrorResponse;
        } catch {
          // Not JSON, use raw text
        }

        return {
          content: null,
          isError: true,
          errorMessage: parsedError?.error ?? `MCP HTTP ${res.status}: ${errorBody}`,
        };
      }

      const result = (await res.json()) as MCPToolResult;
      return result;
    } catch (err) {
      clear();
      lastError = err instanceof Error ? err : new Error(String(err));

      // AbortError means timeout
      if (lastError.name === 'AbortError') {
        lastError = new Error(`MCP call to ${toolName} timed out after ${timeoutMs}ms`);
      }

      // Retry on network errors
      if (attempt < maxRetries) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await delay(backoff);
        continue;
      }
    }
  }

  return {
    content: null,
    isError: true,
    errorMessage: lastError?.message ?? `MCP call to ${toolName} failed after ${maxRetries + 1} attempts`,
  };
}

/**
 * Lists all tools available on an MCP server.
 *
 * @param serverUrl  Base URL of the MCP server
 * @param options    Optional retry/timeout configuration
 * @returns          Array of tool definitions
 */
export async function listTools(
  serverUrl: string,
  options?: MCPClientOptions,
): Promise<ToolDef[]> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { controller, clear } = createTimeoutController(timeoutMs);

    try {
      const headers: Record<string, string> = {};
      if (options?.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      }

      const url = `${serverUrl.replace(/\/$/, '')}/tools/list`;
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clear();

      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < maxRetries) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await delay(backoff);
          continue;
        }

        const errorBody = await res.text().catch(() => '');
        throw new Error(`MCP listTools HTTP ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as { tools: ToolDef[] };
      return data.tools ?? [];
    } catch (err) {
      clear();
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === 'AbortError') {
        lastError = new Error(`MCP listTools timed out after ${timeoutMs}ms`);
      }

      if (attempt < maxRetries) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await delay(backoff);
        continue;
      }
    }
  }

  console.error('[mcp/client] listTools failed:', lastError?.message);
  return [];
}

/**
 * Health check for an MCP server. Returns true if the server responds.
 */
export async function isServerAvailable(
  serverUrl: string,
  options?: MCPClientOptions,
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 5_000;
  const { controller, clear } = createTimeoutController(timeoutMs);

  try {
    const url = `${serverUrl.replace(/\/$/, '')}/tools/list`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clear();
    return res.ok;
  } catch {
    clear();
    return false;
  }
}
