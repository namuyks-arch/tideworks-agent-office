/**
 * Chat Endpoint
 *
 * POST /api/chat
 *
 * Routes user messages to individual agents or starts new pipelines.
 * Supports both streaming (SSE) and JSON response modes depending on
 * whether a pipelineType is provided (redirects to /api/agents) or
 * a specific agent is targeted.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AgentId, PipelineType } from '@/agents/types';
import { AGENT_CONFIGS } from '@/agents/types';
import { chat } from '@/lib/claude';

// ---------------------------------------------------------------------------
// Request / Response Types
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  message: string;
  targetAgent?: AgentId;
  pipelineType?: PipelineType;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

interface ChatResponse {
  reply: string;
  agentId?: AgentId;
  pipelineStarted?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// In-Memory Conversation Store (per agent)
// ---------------------------------------------------------------------------

const conversationStore = new Map<
  AgentId,
  { role: 'user' | 'assistant'; content: string }[]
>();

function getConversation(agentId: AgentId): { role: 'user' | 'assistant'; content: string }[] {
  if (!conversationStore.has(agentId)) {
    conversationStore.set(agentId, []);
  }
  return conversationStore.get(agentId)!;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse> | Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { reply: '', error: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  const { message, targetAgent, pipelineType, conversationHistory } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { reply: '', error: 'message is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  // ── Route 1: Start a new pipeline via redirect ──────────────────────
  if (pipelineType) {
    // Forward to /api/agents as an SSE pipeline execution.
    // The frontend should call /api/agents directly for SSE, but we
    // support this path for convenience from the chat interface.
    const baseUrl = request.nextUrl.origin;
    const agentsUrl = `${baseUrl}/api/agents`;

    try {
      const agentsResponse = await fetch(agentsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineType,
          input: parsePipelineInput(message, pipelineType),
        }),
      });

      // Return the SSE stream directly
      if (agentsResponse.body) {
        return new Response(agentsResponse.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }

      return NextResponse.json({
        reply: 'Pipeline started successfully.',
        pipelineStarted: true,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { reply: '', error: `Failed to start pipeline: ${errorMsg}` },
        { status: 500 },
      );
    }
  }

  // ── Route 2: Direct agent chat ──────────────────────────────────────
  if (targetAgent) {
    const config = AGENT_CONFIGS[targetAgent];
    if (!config) {
      return NextResponse.json(
        { reply: '', error: `Unknown agent: ${targetAgent}` },
        { status: 400 },
      );
    }

    // Build conversation history
    const history = conversationHistory ?? getConversation(targetAgent);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...history,
      { role: 'user' as const, content: message },
    ];

    try {
      const reply = await chat(config.systemPrompt, messages);

      // Store conversation turn
      const stored = getConversation(targetAgent);
      stored.push({ role: 'user', content: message });
      stored.push({ role: 'assistant', content: reply });

      // Keep conversation within a reasonable window
      if (stored.length > 40) {
        stored.splice(0, stored.length - 40);
      }

      return NextResponse.json({
        reply,
        agentId: targetAgent,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Fallback: return a simulated response when the API key is not configured
      if (errorMsg.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json({
          reply: getSimulatedResponse(targetAgent, message),
          agentId: targetAgent,
        });
      }

      return NextResponse.json(
        { reply: '', agentId: targetAgent, error: errorMsg },
        { status: 500 },
      );
    }
  }

  // ── Route 3: General chat (no specific agent, auto-route) ───────────
  // Determine the best agent based on message content
  const bestAgent = routeToAgent(message);

  try {
    const config = AGENT_CONFIGS[bestAgent];
    const reply = await chat(config.systemPrompt, [{ role: 'user', content: message }]);

    return NextResponse.json({
      reply,
      agentId: bestAgent,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json({
        reply: getSimulatedResponse(bestAgent, message),
        agentId: bestAgent,
      });
    }

    return NextResponse.json(
      { reply: '', error: errorMsg },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple keyword-based routing to decide which agent should handle a message.
 */
function routeToAgent(message: string): AgentId {
  const lower = message.toLowerCase();

  // Research-related keywords
  if (
    lower.includes('search') ||
    lower.includes('find') ||
    lower.includes('research') ||
    lower.includes('discover') ||
    lower.includes('brand') ||
    lower.includes('company')
  ) {
    return 'researcher';
  }

  // Analysis-related keywords
  if (
    lower.includes('score') ||
    lower.includes('analyz') ||
    lower.includes('metric') ||
    lower.includes('kpi') ||
    lower.includes('data') ||
    lower.includes('seo')
  ) {
    return 'analyst';
  }

  // Strategy-related keywords
  if (
    lower.includes('strategy') ||
    lower.includes('proposal') ||
    lower.includes('approach') ||
    lower.includes('sales') ||
    lower.includes('pitch') ||
    lower.includes('geo') ||
    lower.includes('aeo')
  ) {
    return 'strategist';
  }

  // Default to manager for orchestration tasks
  return 'manager';
}

/**
 * Attempts to parse a freeform message into structured pipeline input.
 */
function parsePipelineInput(
  message: string,
  pipelineType: PipelineType,
): Record<string, unknown> {
  switch (pipelineType) {
    case 'lead-discovery':
      return {
        industry: 'general',
        companySize: 'smb' as const,
        region: 'Global',
        keywords: message.split(/[,\s]+/).filter(Boolean),
        notes: message,
      };
    case 'proposal-gen':
      return {
        brand: {
          name: 'Unknown',
          domain: '',
          industry: '',
          companySize: '',
          region: '',
          description: message,
        },
        seoData: {
          domain: '',
          domainRating: 0,
          organicTraffic: 0,
          organicKeywords: 0,
          backlinks: 0,
          topKeywords: [],
          trafficTrend: 'stable' as const,
          contentGap: [],
          aiSearchVisibility: 0,
          competitorDomains: [],
        },
        scoredLead: {
          brand: { name: 'Unknown', domain: '', industry: '', companySize: '', region: '', description: '' },
          seoData: { domain: '', domainRating: 0, organicTraffic: 0, organicKeywords: 0, backlinks: 0, topKeywords: [], trafficTrend: 'stable' as const, contentGap: [], aiSearchVisibility: 0, competitorDomains: [] },
          scores: { seo: 0, aiSearch: 0, content: 0, growth: 0, fit: 0, total: 0 },
          rank: 0,
          salesInsight: '',
          priority: 'medium' as const,
        },
        clientGoals: [message],
      };
    case 'onboarding':
      return {
        clientName: 'New Client',
        services: ['SEO', 'Content Strategy'],
      };
    default:
      return { message };
  }
}

/**
 * Returns a simulated response when Claude API is not available.
 */
function getSimulatedResponse(agentId: AgentId, message: string): string {
  const config = AGENT_CONFIGS[agentId];
  const agentName = config.name;

  const responses: Record<AgentId, string> = {
    researcher: `[${agentName}] I would search for relevant brands and gather intelligence based on your query: "${message.slice(0, 80)}...". Connect the Anthropic API key to enable real research capabilities.`,
    analyst: `[${agentName}] I would analyze the data and score leads based on our weighted formula (SEO 25%, AI Search 25%, Content 20%, Growth 15%, Fit 15%) for: "${message.slice(0, 80)}...". Connect the Anthropic API key for live analysis.`,
    strategist: `[${agentName}] I would develop a strategic sales approach and proposal based on: "${message.slice(0, 80)}...". Connect the Anthropic API key to generate real strategies.`,
    manager: `[${agentName}] I would coordinate the team and orchestrate the workflow for: "${message.slice(0, 80)}...". Connect the Anthropic API key to enable full pipeline management.`,
  };

  return responses[agentId];
}
