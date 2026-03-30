import type { ChatMessage } from '@/store/chat-store';
import type { LeadResult, ProposalResult, OnboardResult } from '@/store/pipeline-store';

// ─── Helpers ────────────────────────────────────────────────────────────────

function tryParseJson(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function isJsonMessage(msg: ChatMessage): boolean {
  return msg.type === 'json';
}

// ─── Lead Parsers ────────────────────────────────────────────────────────────

function isLeadArray(value: unknown): value is LeadResult[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  const first = value[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    'name' in first &&
    ('rank' in first || 'score' in first || 'priority' in first)
  );
}

function normalizeLeadPriority(val: unknown): 'high' | 'medium' | 'low' {
  if (val === 'high' || val === 'medium' || val === 'low') return val;
  return 'medium';
}

function coerceLeadResult(raw: Record<string, unknown>, index: number): LeadResult {
  const score =
    typeof raw.score === 'number' ? raw.score :
    typeof raw.total === 'number' ? raw.total : 0;
  return {
    rank: typeof raw.rank === 'number' ? raw.rank : index + 1,
    name: typeof raw.name === 'string' ? raw.name : '(미확인)',
    domain: typeof raw.domain === 'string' ? raw.domain : '',
    score,
    priority: normalizeLeadPriority(raw.priority),
    salesPoint: typeof raw.salesPoint === 'string' ? raw.salesPoint : '',
    seoSummary: typeof raw.seoSummary === 'string' ? raw.seoSummary : '',
    dealSize: typeof raw.dealSize === 'string' ? raw.dealSize : '',
  };
}

export function parseLeadsFromMessages(messages: ChatMessage[]): LeadResult[] {
  const jsonMessages = messages.filter(isJsonMessage);

  // Priority order: final-leads > scored-leads
  const dataPriority = ['final-leads', 'scored-leads'] as const;

  for (const dataType of dataPriority) {
    for (let i = jsonMessages.length - 1; i >= 0; i--) {
      const msg = jsonMessages[i];
      const parsed = tryParseJson(msg.content);
      if (!parsed || typeof parsed !== 'object') continue;

      const obj = parsed as Record<string, unknown>;

      // Check dataType field on root or metadata
      const msgDataType =
        obj.dataType ??
        (msg.metadata as Record<string, unknown> | undefined)?.dataType;

      if (msgDataType !== dataType) continue;

      // Leads may be at root array, obj.leads, or obj.data
      const candidates = [obj.leads, obj.data, parsed];
      for (const candidate of candidates) {
        if (isLeadArray(candidate)) {
          return (candidate as unknown as Record<string, unknown>[]).map((raw, idx) =>
            coerceLeadResult(raw, idx)
          );
        }
      }
    }
  }

  return [];
}

// ─── Proposal Parser ─────────────────────────────────────────────────────────

export function parseProposalFromMessages(
  messages: ChatMessage[]
): ProposalResult | null {
  const jsonMessages = messages.filter(isJsonMessage);

  for (let i = jsonMessages.length - 1; i >= 0; i--) {
    const msg = jsonMessages[i];
    const parsed = tryParseJson(msg.content);
    if (!parsed || typeof parsed !== 'object') continue;

    const obj = parsed as Record<string, unknown>;
    const msgDataType =
      obj.dataType ??
      (msg.metadata as Record<string, unknown> | undefined)?.dataType;

    if (msgDataType !== 'proposal-draft') continue;

    // Accept root or obj.proposal
    const source =
      (obj.proposal as Record<string, unknown> | undefined) ?? obj;

    if (typeof source !== 'object' || source === null) continue;
    const s = source as Record<string, unknown>;

    return {
      brand: typeof s.brand === 'string' ? s.brand : '',
      industry: typeof s.industry === 'string' ? s.industry : '',
      problems: Array.isArray(s.problems)
        ? (s.problems as unknown[]).filter((p): p is string => typeof p === 'string')
        : [],
      solutions: typeof s.solutions === 'string' ? s.solutions : '',
      roi: typeof s.roi === 'string' ? s.roi : '',
      packageName: typeof s.packageName === 'string' ? s.packageName : '',
      packagePrice: typeof s.packagePrice === 'string' ? s.packagePrice : '',
    };
  }

  return null;
}

// ─── Onboard Parser ──────────────────────────────────────────────────────────

export function parseOnboardFromMessages(
  messages: ChatMessage[]
): OnboardResult | null {
  const jsonMessages = messages.filter(isJsonMessage);

  for (let i = jsonMessages.length - 1; i >= 0; i--) {
    const msg = jsonMessages[i];
    const parsed = tryParseJson(msg.content);
    if (!parsed || typeof parsed !== 'object') continue;

    const obj = parsed as Record<string, unknown>;
    const msgDataType =
      obj.dataType ??
      (msg.metadata as Record<string, unknown> | undefined)?.dataType;

    if (msgDataType !== 'onboard-plan') continue;

    const source =
      (obj.onboardPlan as Record<string, unknown> | undefined) ?? obj;

    if (typeof source !== 'object' || source === null) continue;
    const s = source as Record<string, unknown>;

    return {
      clientName: typeof s.clientName === 'string' ? s.clientName : '',
      checklist: Array.isArray(s.checklist)
        ? (s.checklist as unknown[]).filter((c): c is string => typeof c === 'string')
        : [],
      kpis: Array.isArray(s.kpis)
        ? (s.kpis as unknown[]).filter((k): k is string => typeof k === 'string')
        : [],
      meetingCount: typeof s.meetingCount === 'number' ? s.meetingCount : 0,
      emailDraft: typeof s.emailDraft === 'string' ? s.emailDraft : '',
    };
  }

  return null;
}
