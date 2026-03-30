/**
 * Linear MCP Wrapper
 *
 * Provides methods for creating and updating issues in Linear via MCP.
 * Falls back to returning structured JSON text that can be used for
 * manual issue creation when the MCP server is unavailable.
 */

import { callTool, isServerAvailable } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinearIssueResult {
  id: string;
  url: string;
  isMock: boolean;
  fallbackText?: string;
  warning?: string;
}

export interface LinearUpdateResult {
  success: boolean;
  isMock: boolean;
  fallbackText?: string;
  warning?: string;
}

type LinearPriority = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LINEAR_MCP_URL = process.env.LINEAR_MCP_URL ?? 'http://localhost:3102';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an issue in Linear.
 *
 * @param title       Issue title
 * @param description Issue description (markdown)
 * @param priority    Priority level: 0=No, 1=Urgent, 2=High, 3=Medium, 4=Low
 * @param labels      Label names to apply
 * @returns           Created issue ID and URL, or fallback text
 */
export async function createIssue(
  title: string,
  description: string,
  priority: LinearPriority = 3,
  labels: string[] = [],
): Promise<LinearIssueResult> {
  try {
    const available = await isServerAvailable(LINEAR_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return buildFallbackCreate(title, description, priority, labels);
    }

    const result = await callTool(
      LINEAR_MCP_URL,
      'linear_create_issue',
      { title, description, priority, labels },
      { timeoutMs: 10_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/linear] createIssue error: ${result.errorMessage}`);
      return buildFallbackCreate(title, description, priority, labels);
    }

    const data = result.content as Record<string, unknown>;
    return {
      id: String(data.id ?? data.identifier ?? 'unknown'),
      url: String(data.url ?? ''),
      isMock: false,
    };
  } catch (err) {
    console.warn('[mcp/linear] createIssue exception:', err);
    return buildFallbackCreate(title, description, priority, labels);
  }
}

/**
 * Update an existing Linear issue.
 *
 * @param id      Issue ID or identifier
 * @param updates Fields to update
 */
export async function updateIssue(
  id: string,
  updates: Record<string, unknown>,
): Promise<LinearUpdateResult> {
  try {
    const available = await isServerAvailable(LINEAR_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return buildFallbackUpdate(id, updates);
    }

    const result = await callTool(
      LINEAR_MCP_URL,
      'linear_update_issue',
      { issueId: id, ...updates },
      { timeoutMs: 10_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/linear] updateIssue error: ${result.errorMessage}`);
      return buildFallbackUpdate(id, updates);
    }

    return { success: true, isMock: false };
  } catch (err) {
    console.warn('[mcp/linear] updateIssue exception:', err);
    return buildFallbackUpdate(id, updates);
  }
}

// ---------------------------------------------------------------------------
// Fallback Builders
// ---------------------------------------------------------------------------

function buildFallbackCreate(
  title: string,
  description: string,
  priority: LinearPriority,
  labels: string[],
): LinearIssueResult {
  const priorityLabels: Record<LinearPriority, string> = {
    0: 'No Priority',
    1: 'Urgent',
    2: 'High',
    3: 'Medium',
    4: 'Low',
  };

  const fallbackText = JSON.stringify(
    {
      action: 'CREATE_LINEAR_ISSUE',
      title,
      description,
      priority: priorityLabels[priority],
      labels,
      instructions: 'Create this issue manually in Linear or wait for MCP server to come online.',
    },
    null,
    2,
  );

  return {
    id: `mock-${Date.now()}`,
    url: '',
    isMock: true,
    fallbackText,
    warning: 'Linear MCP server unavailable. Issue data saved for manual creation.',
  };
}

function buildFallbackUpdate(
  id: string,
  updates: Record<string, unknown>,
): LinearUpdateResult {
  const fallbackText = JSON.stringify(
    {
      action: 'UPDATE_LINEAR_ISSUE',
      issueId: id,
      updates,
      instructions: 'Apply these updates manually in Linear.',
    },
    null,
    2,
  );

  return {
    success: false,
    isMock: true,
    fallbackText,
    warning: `Linear MCP server unavailable. Update for ${id} saved for manual application.`,
  };
}
