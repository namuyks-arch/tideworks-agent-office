/**
 * Gmail MCP Wrapper
 *
 * Provides a method for creating email DRAFTS via the Gmail MCP server.
 * IMPORTANT: This module NEVER auto-sends emails. All emails are created
 * as drafts that require explicit human review and manual sending.
 *
 * Falls back to returning formatted email text for copy/paste when the
 * MCP server is unavailable.
 */

import { callTool, isServerAvailable } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GmailDraftResult {
  id: string;
  isMock: boolean;
  fallbackText?: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GMAIL_MCP_URL = process.env.GMAIL_MCP_URL ?? 'http://localhost:3104';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an email DRAFT in Gmail. Never sends automatically.
 *
 * @param to      Recipient email address
 * @param subject Email subject line
 * @param body    Email body (plain text or HTML)
 * @returns       Draft ID or fallback text for manual creation
 */
export async function createDraft(
  to: string,
  subject: string,
  body: string,
): Promise<GmailDraftResult> {
  // Input validation
  if (!to || !to.includes('@')) {
    return {
      id: '',
      isMock: true,
      fallbackText: buildFallbackEmail(to, subject, body),
      warning: `Invalid recipient email address: ${to}`,
    };
  }

  if (!subject.trim()) {
    return {
      id: '',
      isMock: true,
      fallbackText: buildFallbackEmail(to, subject, body),
      warning: 'Email subject is empty.',
    };
  }

  try {
    const available = await isServerAvailable(GMAIL_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return {
        id: `mock-draft-${Date.now()}`,
        isMock: true,
        fallbackText: buildFallbackEmail(to, subject, body),
        warning: 'Gmail MCP server unavailable. Email text ready for copy/paste.',
      };
    }

    const result = await callTool(
      GMAIL_MCP_URL,
      'gmail_create_draft',
      {
        to,
        subject,
        body,
        // Explicitly pass sendImmediately: false as a safety measure
        sendImmediately: false,
      },
      { timeoutMs: 10_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/gmail] createDraft error: ${result.errorMessage}`);
      return {
        id: `mock-draft-${Date.now()}`,
        isMock: true,
        fallbackText: buildFallbackEmail(to, subject, body),
        warning: `Gmail MCP error: ${result.errorMessage}. Email text ready for copy/paste.`,
      };
    }

    const data = result.content as Record<string, unknown>;
    return {
      id: String(data.id ?? data.draftId ?? 'unknown'),
      isMock: false,
    };
  } catch (err) {
    console.warn('[mcp/gmail] createDraft exception:', err);
    return {
      id: `mock-draft-${Date.now()}`,
      isMock: true,
      fallbackText: buildFallbackEmail(to, subject, body),
      warning: 'Gmail MCP server error. Email text ready for copy/paste.',
    };
  }
}

// ---------------------------------------------------------------------------
// Fallback Builder
// ---------------------------------------------------------------------------

function buildFallbackEmail(to: string, subject: string, body: string): string {
  return [
    '=== EMAIL DRAFT (Copy & Paste) ===',
    '',
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    '--- Body ---',
    body,
    '',
    '--- End ---',
    '',
    'NOTE: This email was NOT sent. Please copy and paste into your email client.',
  ].join('\n');
}
