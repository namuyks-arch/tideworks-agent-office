// =============================================================================
// Tideworks Agent Office - Manager Agent (Router)
// =============================================================================

import { BaseAgent, ClaudeClient } from './base-agent';
import {
  DebateRound,
  ExecutionMode,
  FinalLead,
  OnboardPlan,
  PipelineType,
  ProposalDraft,
  ScoredLead,
} from './types';

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface TaskAssignment {
  agentId: string;
  task: string;
  input: unknown;
  priority: number;
  dependencies: string[];
}

interface ManagerPerception {
  pipelineType: PipelineType;
  input: unknown;
  agentStatuses: Record<string, string>;
}

interface ManagerReasoning {
  taskBreakdown: string[];
  agentAssignments: Record<string, string>;
  estimatedDuration: string;
}

interface ManagerPlan {
  assignments: TaskAssignment[];
  debateRequired: boolean;
  debateTopics: string[];
}

// ---------------------------------------------------------------------------
// Manager Agent
// ---------------------------------------------------------------------------

export class ManagerAgent extends BaseAgent {
  constructor(claudeClient: ClaudeClient) {
    super('manager', claudeClient);
  }

  // -------------------------------------------------------------------------
  // Cognitive Loop Implementation
  // -------------------------------------------------------------------------

  protected async perceive(input: unknown): Promise<ManagerPerception> {
    const data = input as {
      pipelineType: PipelineType;
      input: unknown;
    };

    this.addMessage(
      `Received ${data.pipelineType} pipeline request`,
      'status'
    );

    return {
      pipelineType: data.pipelineType,
      input: data.input,
      agentStatuses: {
        researcher: 'idle',
        analyst: 'idle',
        strategist: 'idle',
      },
    };
  }

  protected async reason(
    perception: unknown
  ): Promise<ManagerReasoning> {
    const p = perception as ManagerPerception;

    const breakdowns: Record<PipelineType, string[]> = {
      'lead-discovery': [
        'Research brands and gather data',
        'Analyze and score leads',
        'Generate sales approaches',
        'Review and finalize lead list',
      ],
      'proposal-gen': [
        'Diagnose brand health',
        'Debate strategy vs data approach',
        'Generate proposal draft',
        'Review and finalize proposal',
      ],
      onboarding: [
        'Create onboarding checklist',
        'Design KPI framework',
        'Plan GEO strategy',
        'Draft communications',
        'Compile onboarding plan',
      ],
    };

    const assignments: Record<PipelineType, Record<string, string>> = {
      'lead-discovery': {
        researcher: 'Brand discovery and SEO analysis',
        analyst: 'Lead scoring and prioritization',
        strategist: 'Sales approach generation',
        manager: 'Final review and integration',
      },
      'proposal-gen': {
        analyst: 'Brand diagnosis',
        strategist: 'Proposal creation',
        manager: 'Debate moderation and final review',
      },
      onboarding: {
        analyst: 'KPI framework design',
        strategist: 'GEO strategy and communications',
        manager: 'Checklist compilation and integration',
      },
    };

    return {
      taskBreakdown: breakdowns[p.pipelineType],
      agentAssignments: assignments[p.pipelineType],
      estimatedDuration:
        p.pipelineType === 'lead-discovery'
          ? '5-10 minutes'
          : p.pipelineType === 'proposal-gen'
            ? '3-5 minutes'
            : '3-5 minutes',
    };
  }

  protected async plan(reasoning: unknown): Promise<ManagerPlan> {
    const r = reasoning as ManagerReasoning;

    const assignments: TaskAssignment[] = Object.entries(
      r.agentAssignments
    ).map(([agentId, task], index) => ({
      agentId,
      task,
      input: null,
      priority: index + 1,
      dependencies:
        index > 0
          ? [Object.keys(r.agentAssignments)[index - 1]]
          : [],
    }));

    const debateRequired = r.taskBreakdown.some((t) =>
      t.toLowerCase().includes('debate')
    );

    return {
      assignments,
      debateRequired,
      debateTopics: debateRequired
        ? ['Optimal pricing strategy', 'Service package composition']
        : [],
    };
  }

  protected async execute(
    plan: unknown,
    _mode: ExecutionMode
  ): Promise<TaskAssignment[]> {
    const p = plan as ManagerPlan;

    this.addMessage(
      `Distributing ${p.assignments.length} tasks to agents`,
      'status'
    );

    return p.assignments;
  }

  protected async evaluate(
    result: unknown
  ): Promise<{ passed: boolean; reason?: string; output: unknown }> {
    const assignments = result as TaskAssignment[];

    if (assignments.length === 0) {
      return {
        passed: false,
        reason: 'No task assignments generated',
        output: null,
      };
    }

    return { passed: true, output: assignments };
  }

  // -------------------------------------------------------------------------
  // Public Methods: Work Distribution
  // -------------------------------------------------------------------------

  async distributeWork(
    pipelineType: PipelineType,
    input: unknown
  ): Promise<TaskAssignment[]> {
    this.setStatus('working');
    this.setCurrentTask(`Distributing work for: ${pipelineType}`);

    const result = (await this.run(
      { pipelineType, input },
      'auto'
    )) as TaskAssignment[];

    return result;
  }

  // -------------------------------------------------------------------------
  // Public Methods: Debate Moderation
  // -------------------------------------------------------------------------

  async moderateDebate(rounds: DebateRound[]): Promise<string> {
    this.setStatus('working');
    this.setCurrentTask('Moderating debate and reaching consensus');

    const debateSummary = rounds
      .map(
        (r) =>
          `Round ${r.round} - Topic: ${r.topic}\n` +
          `  Analyst: ${r.analystMessage}\n` +
          `  Strategist: ${r.strategistMessage}`
      )
      .join('\n\n');

    const prompt = `As the Manager, moderate this debate and reach a consensus:

${debateSummary}

Synthesize the best points from both sides into a balanced consensus. Consider:
1. Where the Analyst's data-driven points strengthen the strategy
2. Where the Strategist's market insights add value
3. Practical compromises that serve the client best

Provide a concise consensus statement (3-5 sentences) that both parties can agree on.`;

    const consensus = await this.callClaude(prompt, {
      maxTokens: 1024,
      temperature: 0.4,
    });

    this.addMessage(`[Consensus] ${consensus}`, 'text', {
      debateRounds: rounds.length,
    });

    return consensus;
  }

  // -------------------------------------------------------------------------
  // Public Methods: Output Integration
  // -------------------------------------------------------------------------

  async integrateFinalOutput(
    allResults: Record<string, unknown>
  ): Promise<unknown> {
    this.setStatus('working');
    this.setCurrentTask('Integrating final output');

    const resultKeys = Object.keys(allResults);
    this.addMessage(
      `Integrating outputs from: ${resultKeys.join(', ')}`,
      'status'
    );

    // Determine the type of integration needed based on available data
    if (allResults['scoredLeads'] && allResults['salesApproaches']) {
      return this.integrateFinalLeads(allResults);
    }

    if (allResults['proposal']) {
      return this.integrateFinalProposal(allResults);
    }

    if (allResults['onboardPlan']) {
      return allResults['onboardPlan'];
    }

    // Generic integration via Claude
    const prompt = `Integrate these pipeline results into a coherent final output:

${JSON.stringify(allResults, null, 2)}

Combine all data into a unified, well-structured result. Preserve all important details while eliminating redundancy.

Return the integrated result as JSON.`;

    const response = await this.callClaude(prompt, {
      maxTokens: 8192,
      temperature: 0.3,
    });

    try {
      const integrated = JSON.parse(response) as unknown;
      this.addMessage('Final output integrated successfully', 'status');
      return integrated;
    } catch {
      this.addMessage('Integration parsing failed, returning raw results', 'status');
      return allResults;
    }
  }

  // -------------------------------------------------------------------------
  // MCP Tool Stubs (Linear, Notion, Gmail, Calendar)
  // -------------------------------------------------------------------------

  async createLinearIssue(data: {
    title: string;
    description: string;
    assignee?: string;
    priority?: number;
    labels?: string[];
  }): Promise<{ issueId: string; url: string }> {
    this.addMessage(`[Linear] Creating issue: ${data.title}`, 'status');
    // MCP integration stub - will connect to Linear MCP server
    return {
      issueId: `LIN-${Date.now()}`,
      url: `https://linear.app/tideworks/issue/LIN-${Date.now()}`,
    };
  }

  async createNotionPage(data: {
    title: string;
    content: string;
    databaseId?: string;
    properties?: Record<string, unknown>;
  }): Promise<{ pageId: string; url: string }> {
    this.addMessage(`[Notion] Creating page: ${data.title}`, 'status');
    // MCP integration stub - will connect to Notion MCP server
    return {
      pageId: `notion-${Date.now()}`,
      url: `https://notion.so/tideworks/${Date.now()}`,
    };
  }

  async sendGmailDraft(data: {
    to: string;
    subject: string;
    body: string;
    cc?: string[];
  }): Promise<{ draftId: string; status: string }> {
    this.addMessage(`[Gmail] Creating draft to: ${data.to}`, 'status');
    // MCP integration stub - will connect to Gmail MCP server
    return {
      draftId: `draft-${Date.now()}`,
      status: 'draft_created',
    };
  }

  async createCalendarEvent(data: {
    title: string;
    attendees: string[];
    startTime: string;
    endTime: string;
    description?: string;
  }): Promise<{ eventId: string; url: string }> {
    this.addMessage(`[Calendar] Creating event: ${data.title}`, 'status');
    // MCP integration stub - will connect to Google Calendar MCP server
    return {
      eventId: `cal-${Date.now()}`,
      url: `https://calendar.google.com/event/${Date.now()}`,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private async integrateFinalLeads(
    results: Record<string, unknown>
  ): Promise<FinalLead[]> {
    const scoredLeads = results['scoredLeads'] as ScoredLead[];
    const salesApproaches = results['salesApproaches'] as Record<
      string,
      { keyPoints: string[]; followUpPlan: string }
    >;

    const finalLeads: FinalLead[] = scoredLeads
      .sort((a, b) => b.scores.total - a.scores.total)
      .map((scoredLead, index) => {
        const approach = salesApproaches[scoredLead.brand.domain];
        return {
          scoredLead: { ...scoredLead, rank: index + 1 },
          salesApproach: approach
            ? approach.keyPoints.join('; ')
            : scoredLead.salesInsight,
          proposedServices: [
            'AI Search Optimization',
            'SEO Strategy',
            'Content Gap Analysis',
          ],
          estimatedDealSize:
            scoredLead.priority === 'high'
              ? '600만원-1,200만원/월'
              : scoredLead.priority === 'medium'
                ? '300만원-600만원/월'
                : '200만원-300만원/월',
          nextSteps: [
            'Send personalized outreach email',
            'Schedule discovery call',
            'Prepare custom audit report',
          ],
        };
      });

    this.addMessage(
      `Integrated ${finalLeads.length} final leads`,
      'text'
    );

    return finalLeads;
  }

  private async integrateFinalProposal(
    results: Record<string, unknown>
  ): Promise<{
    proposal: ProposalDraft;
    consensus?: string;
    onboardPlan?: OnboardPlan;
  }> {
    const proposal = results['proposal'] as ProposalDraft;
    const consensus = results['consensus'] as string | undefined;

    this.addMessage(
      `Final proposal ready for: ${proposal.clientName}`,
      'text'
    );

    return {
      proposal,
      consensus,
      onboardPlan: results['onboardPlan'] as OnboardPlan | undefined,
    };
  }
}
