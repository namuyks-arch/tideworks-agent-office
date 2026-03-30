/**
 * Google Calendar MCP Wrapper
 *
 * Provides a method for creating calendar events via the Calendar MCP server.
 * Falls back to returning formatted meeting info text for manual creation
 * when the MCP server is unavailable.
 */

import { callTool, isServerAvailable } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEventResult {
  id: string;
  url: string;
  isMock: boolean;
  fallbackText?: string;
  warning?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  count?: number;
  until?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CALENDAR_MCP_URL = process.env.CALENDAR_MCP_URL ?? 'http://localhost:3105';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a calendar event.
 *
 * @param title      Event title
 * @param startTime  ISO 8601 start time
 * @param endTime    ISO 8601 end time
 * @param attendees  Array of attendee email addresses
 * @param recurring  Optional recurrence rule
 */
export async function createEvent(
  title: string,
  startTime: string,
  endTime: string,
  attendees: string[],
  recurring?: RecurrenceRule,
): Promise<CalendarEventResult> {
  // Basic validation
  if (!title.trim()) {
    return {
      id: '',
      url: '',
      isMock: true,
      fallbackText: buildFallbackEvent(title, startTime, endTime, attendees, recurring),
      warning: 'Event title is empty.',
    };
  }

  try {
    const available = await isServerAvailable(CALENDAR_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return {
        id: `mock-event-${Date.now()}`,
        url: '',
        isMock: true,
        fallbackText: buildFallbackEvent(title, startTime, endTime, attendees, recurring),
        warning: 'Calendar MCP server unavailable. Meeting info ready for manual creation.',
      };
    }

    const params: Record<string, unknown> = {
      title,
      startTime,
      endTime,
      attendees,
    };

    if (recurring) {
      params.recurrence = buildRRuleString(recurring);
    }

    const result = await callTool(
      CALENDAR_MCP_URL,
      'calendar_create_event',
      params,
      { timeoutMs: 10_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/calendar] createEvent error: ${result.errorMessage}`);
      return {
        id: `mock-event-${Date.now()}`,
        url: '',
        isMock: true,
        fallbackText: buildFallbackEvent(title, startTime, endTime, attendees, recurring),
        warning: `Calendar MCP error: ${result.errorMessage}`,
      };
    }

    const data = result.content as Record<string, unknown>;
    return {
      id: String(data.id ?? data.eventId ?? 'unknown'),
      url: String(data.htmlLink ?? data.url ?? ''),
      isMock: false,
    };
  } catch (err) {
    console.warn('[mcp/calendar] createEvent exception:', err);
    return {
      id: `mock-event-${Date.now()}`,
      url: '',
      isMock: true,
      fallbackText: buildFallbackEvent(title, startTime, endTime, attendees, recurring),
      warning: 'Calendar MCP server error. Meeting info ready for manual creation.',
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRRuleString(rule: RecurrenceRule): string {
  const freqMap: Record<string, string> = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    biweekly: 'WEEKLY;INTERVAL=2',
    monthly: 'MONTHLY',
  };

  let rrule = `RRULE:FREQ=${freqMap[rule.frequency]}`;
  if (rule.count) {
    rrule += `;COUNT=${rule.count}`;
  }
  if (rule.until) {
    rrule += `;UNTIL=${rule.until.replace(/[-:]/g, '')}`;
  }
  return rrule;
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

function buildFallbackEvent(
  title: string,
  startTime: string,
  endTime: string,
  attendees: string[],
  recurring?: RecurrenceRule,
): string {
  const lines = [
    '=== CALENDAR EVENT (Create Manually) ===',
    '',
    `Title: ${title}`,
    `Start: ${formatDateTime(startTime)}`,
    `End:   ${formatDateTime(endTime)}`,
    '',
  ];

  if (attendees.length > 0) {
    lines.push('Attendees:');
    attendees.forEach((a) => lines.push(`  - ${a}`));
    lines.push('');
  }

  if (recurring) {
    lines.push(`Recurrence: ${recurring.frequency}`);
    if (recurring.count) lines.push(`  Repeats: ${recurring.count} times`);
    if (recurring.until) lines.push(`  Until: ${recurring.until}`);
    lines.push('');
  }

  lines.push('NOTE: This event was NOT created. Please add it to your calendar manually.');

  return lines.join('\n');
}
