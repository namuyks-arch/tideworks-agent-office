// =============================================================================
// Tideworks Agent Office - Pipeline Orchestrator
// =============================================================================

import { AgentEventEmitter } from './base-agent';
import type { ClaudeClient } from './base-agent';
import { ResearcherAgent } from './researcher';
import { AnalystAgent } from './analyst';
import { StrategistAgent } from './strategist';
import { ManagerAgent } from './manager';
import {
  Brand,
  DebateRound,
  ExecutionMode,
  LeadInput,
  OnboardPlan,
  PipelineState,
  PipelineStep,
  PipelineType,
  ProposalInput,
  ScoredLead,
  SEOData,
} from './types';

// ---------------------------------------------------------------------------
// SSE Event Types
// ---------------------------------------------------------------------------

export type SSEEventType =
  | 'pipeline_start'
  | 'pipeline_complete'
  | 'pipeline_error'
  | 'step_start'
  | 'step_complete'
  | 'step_error'
  | 'agent_status'
  | 'agent_message'
  | 'debate_round'
  | 'approval_request'
  | 'approval_response';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

type SSEHandler = (event: SSEEvent) => void;

// ---------------------------------------------------------------------------
// Mode Config Type
// ---------------------------------------------------------------------------

export type ModeConfig = Record<string, ExecutionMode>;

// ---------------------------------------------------------------------------
// Pipeline Step Definitions
// ---------------------------------------------------------------------------

const LEAD_DISCOVERY_STEPS: PipelineStep[] = [
  {
    id: 'ld-research',
    name: 'Brand Research',
    agentId: 'researcher',
    mode: 'auto',
    description: 'Discover and gather data on potential leads',
    order: 1,
  },
  {
    id: 'ld-scoring',
    name: 'Lead Scoring',
    agentId: 'analyst',
    mode: 'auto',
    description: 'Score leads using weighted formula',
    order: 2,
  },
  {
    id: 'ld-debate',
    name: 'Strategy Debate',
    agentId: 'manager',
    mode: 'auto',
    description: 'Analyst and Strategist debate priorities',
    order: 3,
  },
  {
    id: 'ld-sales',
    name: 'Sales Approach',
    agentId: 'strategist',
    mode: 'approval',
    description: 'Generate sales approaches for top leads',
    order: 4,
  },
  {
    id: 'ld-final',
    name: 'Final Review',
    agentId: 'manager',
    mode: 'approval',
    description: 'Manager integrates and finalizes lead list',
    order: 5,
  },
];

const PROPOSAL_GEN_STEPS: PipelineStep[] = [
  {
    id: 'pg-diagnosis',
    name: 'Brand Diagnosis',
    agentId: 'analyst',
    mode: 'auto',
    description: 'Deep analysis of client brand health',
    order: 1,
  },
  {
    id: 'pg-debate',
    name: 'Strategy Debate',
    agentId: 'manager',
    mode: 'auto',
    description: 'Analyst and Strategist debate strategy',
    order: 2,
  },
  {
    id: 'pg-proposal',
    name: 'Proposal Draft',
    agentId: 'strategist',
    mode: 'approval',
    description: 'Generate proposal document',
    order: 3,
  },
  {
    id: 'pg-review',
    name: 'Final Review',
    agentId: 'manager',
    mode: 'approval',
    description: 'Manager reviews and finalizes proposal',
    order: 4,
  },
];

const ONBOARDING_STEPS: PipelineStep[] = [
  {
    id: 'ob-kpi',
    name: 'KPI Design',
    agentId: 'analyst',
    mode: 'auto',
    description: 'Design KPI framework for client',
    order: 1,
  },
  {
    id: 'ob-geo',
    name: 'GEO Strategy',
    agentId: 'strategist',
    mode: 'auto',
    description: 'Design GEO/AEO optimization strategy',
    order: 2,
  },
  {
    id: 'ob-plan',
    name: 'Onboard Plan',
    agentId: 'manager',
    mode: 'approval',
    description: 'Compile full onboarding plan',
    order: 3,
  },
  {
    id: 'ob-comms',
    name: 'Communications',
    agentId: 'manager',
    mode: 'approval',
    description: 'Draft welcome emails and meeting invites',
    order: 4,
  },
];

const PIPELINE_STEPS: Record<PipelineType, PipelineStep[]> = {
  'lead-discovery': LEAD_DISCOVERY_STEPS,
  'proposal-gen': PROPOSAL_GEN_STEPS,
  onboarding: ONBOARDING_STEPS,
};

// ---------------------------------------------------------------------------
// Approval Gate Interface (imported from human layer)
// ---------------------------------------------------------------------------

export interface ApprovalGateInterface {
  requestApproval(
    stepId: string,
    agentId: string,
    data: unknown
  ): Promise<{
    status: 'approved' | 'rejected' | 'modified';
    feedback?: string;
    modifiedData?: unknown;
  }>;
}

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------

export class PipelineOrchestrator {
  private researcher: ResearcherAgent;
  private analyst: AnalystAgent;
  private strategist: StrategistAgent;
  private manager: ManagerAgent;
  private emitter: AgentEventEmitter;
  private sseHandlers: Set<SSEHandler> = new Set();
  private approvalGate: ApprovalGateInterface | null = null;
  private pipelineState: PipelineState | null = null;

  constructor(claudeClient: ClaudeClient) {
    this.researcher = new ResearcherAgent(claudeClient);
    this.analyst = new AnalystAgent(claudeClient);
    this.strategist = new StrategistAgent(claudeClient);
    this.manager = new ManagerAgent(claudeClient);
    this.emitter = new AgentEventEmitter();

    this.wireAgentEvents();
  }

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  setApprovalGate(gate: ApprovalGateInterface): void {
    this.approvalGate = gate;
  }

  onSSE(handler: SSEHandler): () => void {
    this.sseHandlers.add(handler);
    return () => {
      this.sseHandlers.delete(handler);
    };
  }

  getPipelineState(): Readonly<PipelineState> | null {
    return this.pipelineState
      ? { ...this.pipelineState, steps: [...this.pipelineState.steps] }
      : null;
  }

  getAgentStates() {
    return {
      researcher: this.researcher.getState(),
      analyst: this.analyst.getState(),
      strategist: this.strategist.getState(),
      manager: this.manager.getState(),
    };
  }

  // -------------------------------------------------------------------------
  // Main Pipeline Runner
  // -------------------------------------------------------------------------

  async runPipeline(
    type: PipelineType,
    input: unknown,
    modeConfig?: ModeConfig
  ): Promise<unknown> {
    const steps = PIPELINE_STEPS[type].map((step) => ({
      ...step,
      mode: modeConfig?.[step.id] ?? step.mode,
    }));

    this.pipelineState = {
      type,
      steps,
      currentStep: 0,
      status: 'running',
      startedAt: Date.now(),
    };

    this.emitSSE('pipeline_start', {
      type,
      steps: steps.map((s) => ({ id: s.id, name: s.name, mode: s.mode })),
    });

    try {
      let result: unknown;

      switch (type) {
        case 'lead-discovery':
          result = await this.runLeadDiscovery(input as LeadInput, steps, modeConfig);
          break;
        case 'proposal-gen':
          result = await this.runProposalGen(input as ProposalInput, steps, modeConfig);
          break;
        case 'onboarding':
          result = await this.runOnboarding(input as ProposalInput, steps, modeConfig);
          break;
      }

      this.pipelineState.status = 'completed';
      this.pipelineState.completedAt = Date.now();
      this.emitSSE('pipeline_complete', { type, result });

      return result;
    } catch (error) {
      this.pipelineState.status = 'error';
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.emitSSE('pipeline_error', { type, error: errorMessage });
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Lead Discovery Pipeline
  // -------------------------------------------------------------------------

  private async runLeadDiscovery(
    input: LeadInput,
    steps: PipelineStep[],
    modeConfig?: ModeConfig
  ): Promise<unknown> {
    const results: Record<string, unknown> = {};

    // Step 1: Research
    await this.executeStep(steps[0], modeConfig, async () => {
      const researchOutput = await this.researcher.run(input, steps[0].mode);
      results['research'] = researchOutput;
      return researchOutput;
    });

    // Step 2: Scoring
    await this.executeStep(steps[1], modeConfig, async () => {
      const research = results['research'] as {
        brands: Brand[];
        seoData: Record<string, SEOData>;
      };

      const scoredLeads: ScoredLead[] = [];
      for (const brand of research.brands) {
        const seoData = research.seoData[brand.domain];
        if (seoData) {
          const scored = await this.analyst.scoreLead(brand, seoData);
          scoredLeads.push(scored);
        }
      }

      // Sort and assign ranks
      scoredLeads.sort((a, b) => b.scores.total - a.scores.total);
      scoredLeads.forEach((lead, index) => {
        lead.rank = index + 1;
      });

      results['scoredLeads'] = scoredLeads;
      return scoredLeads;
    });

    // Step 3: Debate
    await this.executeStep(steps[2], modeConfig, async () => {
      const scoredLeads = results['scoredLeads'] as ScoredLead[];
      const topLead = scoredLeads[0];

      if (!topLead) {
        results['consensus'] = 'No leads to debate.';
        return results['consensus'];
      }

      const debateRounds = await this.runDebate(
        `Priority scoring and sales approach for ${topLead.brand.name}`,
        2
      );

      const consensus = await this.manager.moderateDebate(debateRounds);
      results['consensus'] = consensus;
      results['debateRounds'] = debateRounds;
      return consensus;
    });

    // Step 4: Sales Approaches
    await this.executeStep(steps[3], modeConfig, async () => {
      const scoredLeads = results['scoredLeads'] as ScoredLead[];
      const topLeads = scoredLeads.filter((l) => l.priority !== 'low').slice(0, 5);

      const salesApproaches: Record<string, unknown> = {};
      for (const lead of topLeads) {
        const approach = await this.strategist.generateSalesPoints(lead);
        salesApproaches[lead.brand.domain] = approach;
      }

      results['salesApproaches'] = salesApproaches;
      return salesApproaches;
    });

    // Step 5: Final Integration
    await this.executeStep(steps[4], modeConfig, async () => {
      const finalOutput = await this.manager.integrateFinalOutput(results);
      results['finalOutput'] = finalOutput;
      return finalOutput;
    });

    return results['finalOutput'];
  }

  // -------------------------------------------------------------------------
  // Proposal Generation Pipeline
  // -------------------------------------------------------------------------

  private async runProposalGen(
    input: ProposalInput,
    steps: PipelineStep[],
    modeConfig?: ModeConfig
  ): Promise<unknown> {
    const results: Record<string, unknown> = {};

    // Step 1: Brand Diagnosis
    await this.executeStep(steps[0], modeConfig, async () => {
      const diagnosis = await this.analyst.diagnoseBrand({
        brand: input.brand,
        seoData: input.seoData,
      });
      results['diagnosis'] = diagnosis;
      return diagnosis;
    });

    // Step 2: Strategy Debate
    await this.executeStep(steps[1], modeConfig, async () => {
      const debateRounds = await this.runDebate(
        `Optimal service strategy and pricing for ${input.brand.name}`,
        2
      );

      const consensus = await this.manager.moderateDebate(debateRounds);
      results['consensus'] = consensus;
      results['debateRounds'] = debateRounds;
      return consensus;
    });

    // Step 3: Proposal Draft
    await this.executeStep(steps[2], modeConfig, async () => {
      const diagnosis = results['diagnosis'] as import('./types').BrandDiagnosis;
      const proposal = await this.strategist.createProposal(
        diagnosis,
        input.seoData
      );
      results['proposal'] = proposal;
      return proposal;
    });

    // Step 4: Final Review
    await this.executeStep(steps[3], modeConfig, async () => {
      const finalOutput = await this.manager.integrateFinalOutput(results);
      results['finalOutput'] = finalOutput;
      return finalOutput;
    });

    return results['finalOutput'];
  }

  // -------------------------------------------------------------------------
  // Onboarding Pipeline
  // -------------------------------------------------------------------------

  private async runOnboarding(
    input: ProposalInput,
    steps: PipelineStep[],
    modeConfig?: ModeConfig
  ): Promise<unknown> {
    const results: Record<string, unknown> = {};

    // Step 1: KPI Design
    await this.executeStep(steps[0], modeConfig, async () => {
      const kpiResult = await this.analyst.designKPI({
        brand: input.brand,
        seoData: input.seoData,
        goals: input.clientGoals,
      });
      results['kpis'] = kpiResult;
      return kpiResult;
    });

    // Step 2: GEO Strategy
    await this.executeStep(steps[1], modeConfig, async () => {
      const geoStrategy = await this.strategist.designGEOStrategy({
        brand: input.brand.name,
        domain: input.brand.domain,
        industry: input.brand.industry,
        seoData: input.seoData,
        goals: input.clientGoals,
      });
      results['geoStrategy'] = geoStrategy;
      return geoStrategy;
    });

    // Step 3: Compile Onboard Plan
    await this.executeStep(steps[2], modeConfig, async () => {
      const kpis = results['kpis'] as {
        kpis: { metric: string; baseline: string; target: string; timeline: string }[];
      };
      const geoStrategy = results['geoStrategy'] as {
        targetQueries: string[];
        contentPlan: { topic: string; format: string }[];
        technicalRecommendations: string[];
        monitoringPlan?: string;
      };

      const onboardPlan: OnboardPlan = {
        clientName: input.brand.name,
        checklist: [
          {
            id: 'ob-1',
            task: 'Complete technical audit',
            assignee: 'SEO Team',
            dueDate: this.futureDate(7),
            status: 'pending',
            category: 'Technical',
          },
          {
            id: 'ob-2',
            task: 'Set up tracking and monitoring tools',
            assignee: 'Tech Team',
            dueDate: this.futureDate(7),
            status: 'pending',
            category: 'Technical',
          },
          {
            id: 'ob-3',
            task: 'Create content calendar',
            assignee: 'Content Team',
            dueDate: this.futureDate(14),
            status: 'pending',
            category: 'Content',
          },
          {
            id: 'ob-4',
            task: 'Implement Schema.org markup',
            assignee: 'Dev Team',
            dueDate: this.futureDate(14),
            status: 'pending',
            category: 'Technical',
          },
          {
            id: 'ob-5',
            task: 'First content batch production',
            assignee: 'Content Team',
            dueDate: this.futureDate(21),
            status: 'pending',
            category: 'Content',
          },
          {
            id: 'ob-6',
            task: 'Client training session on dashboard',
            assignee: 'Account Manager',
            dueDate: this.futureDate(14),
            status: 'pending',
            category: 'Client Relations',
          },
        ],
        meetings: [
          {
            title: 'Kickoff Meeting',
            attendees: [
              'Account Manager',
              'SEO Lead',
              'Client POC',
            ],
            date: this.futureDate(3),
            duration: '60 min',
            agenda: [
              'Introductions',
              'Project scope review',
              'Timeline walkthrough',
              'Q&A',
            ],
            type: 'kickoff',
          },
          {
            title: 'Weekly Status Update',
            attendees: ['Account Manager', 'Client POC'],
            date: this.futureDate(10),
            duration: '30 min',
            agenda: [
              'Progress update',
              'Metrics review',
              'Next week priorities',
            ],
            type: 'weekly',
          },
          {
            title: '30-Day Review',
            attendees: [
              'Account Manager',
              'SEO Lead',
              'Analyst',
              'Client POC',
            ],
            date: this.futureDate(30),
            duration: '45 min',
            agenda: [
              'KPI review',
              'Strategy adjustments',
              'Content performance',
              'Next phase planning',
            ],
            type: 'review',
          },
        ],
        kpis: kpis.kpis.map((k) => ({
          metric: k.metric,
          baseline: k.baseline,
          target30d: k.target,
          target90d: k.target,
          measurementMethod: 'Automated tracking via Ahrefs + AI search monitoring',
        })),
        emailDraft: [
          {
            subject: `Welcome to Tideworks - ${input.brand.name} Onboarding`,
            body: `Dear ${input.brand.contactName ?? 'Team'},\n\nWelcome to Tideworks! We are excited to begin our partnership.\n\nYour onboarding process has been initiated and your dedicated team is ready to help you achieve your AI search optimization goals.\n\nNext steps:\n1. Kickoff meeting scheduled for ${this.futureDate(3)}\n2. Technical audit begins immediately\n3. Your dashboard access will be set up within 48 hours\n\nPlease let us know if you have any questions.\n\nBest regards,\nTideworks Team`,
            recipients: [input.brand.contactEmail ?? 'client@example.com'],
            sendDate: this.futureDate(1),
            type: 'welcome',
          },
          {
            subject: `${input.brand.name} - Week 1 Progress Report`,
            body: `Dear ${input.brand.contactName ?? 'Team'},\n\nHere is your first weekly progress report.\n\n[Report details will be auto-generated based on actual progress]\n\nBest regards,\nTideworks Team`,
            recipients: [input.brand.contactEmail ?? 'client@example.com'],
            sendDate: this.futureDate(7),
            type: 'report',
          },
        ],
        geoStrategy: {
          targetQueries: geoStrategy.targetQueries,
          contentPlan: geoStrategy.contentPlan.map((c) => ({
            topic: c.topic,
            format: c.format,
            targetDate: this.futureDate(14),
            status: 'planned' as const,
          })),
          technicalSetup: geoStrategy.technicalRecommendations,
          monitoringPlan:
            geoStrategy.monitoringPlan ??
            'Weekly AI search visibility tracking with monthly comprehensive reports',
        },
      };

      results['onboardPlan'] = onboardPlan;
      return onboardPlan;
    });

    // Step 4: Communications
    await this.executeStep(steps[3], modeConfig, async () => {
      const plan = results['onboardPlan'] as OnboardPlan;

      // Create calendar events and email drafts via manager MCP stubs
      for (const meeting of plan.meetings) {
        await this.manager.createCalendarEvent({
          title: meeting.title,
          attendees: meeting.attendees,
          startTime: meeting.date,
          endTime: meeting.date,
          description: meeting.agenda.join('\n'),
        });
      }

      for (const email of plan.emailDraft) {
        await this.manager.sendGmailDraft({
          to: email.recipients[0],
          subject: email.subject,
          body: email.body,
        });
      }

      results['communicationsReady'] = true;
      return plan;
    });

    return results['onboardPlan'];
  }

  // -------------------------------------------------------------------------
  // Step Execution with Mode Handling
  // -------------------------------------------------------------------------

  private async executeStep(
    step: PipelineStep,
    modeConfig: ModeConfig | undefined,
    executor: () => Promise<unknown>
  ): Promise<unknown> {
    const effectiveMode = modeConfig?.[step.id] ?? step.mode;

    if (this.pipelineState) {
      this.pipelineState.currentStep = step.order - 1;
    }

    this.emitSSE('step_start', {
      stepId: step.id,
      name: step.name,
      agentId: step.agentId,
      mode: effectiveMode,
    });

    try {
      // Manual mode: wait for approval before executing
      if (effectiveMode === 'manual') {
        const preApproval = await this.waitForApproval(
          step.id,
          step.agentId,
          { message: `Approve to start: ${step.name}` }
        );

        if (preApproval.status === 'rejected') {
          this.emitSSE('step_complete', {
            stepId: step.id,
            skipped: true,
          });
          return null;
        }
      }

      const result = await executor();

      // Approval mode: execute first, then get approval on result
      if (effectiveMode === 'approval') {
        const approval = await this.waitForApproval(
          step.id,
          step.agentId,
          result
        );

        if (approval.status === 'rejected') {
          throw new Error(`Step ${step.name} rejected by approver`);
        }

        if (approval.status === 'modified' && approval.modifiedData) {
          this.emitSSE('step_complete', {
            stepId: step.id,
            result: approval.modifiedData,
            modified: true,
          });
          return approval.modifiedData;
        }
      }

      this.emitSSE('step_complete', { stepId: step.id, result });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.emitSSE('step_error', {
        stepId: step.id,
        error: errorMessage,
      });
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Debate Management
  // -------------------------------------------------------------------------

  private async runDebate(
    topic: string,
    maxRounds: number
  ): Promise<DebateRound[]> {
    const rounds: DebateRound[] = [];

    // Analyst opens with an initial position
    let analystPoint = await this.analyst.debate(
      topic,
      'Opening statement requested.'
    );

    for (let i = 1; i <= maxRounds; i++) {
      // Strategist rebuts
      const strategistPoint = await this.strategist.debate(
        topic,
        analystPoint
      );

      // Analyst rebuts
      analystPoint = await this.analyst.debate(topic, strategistPoint);

      const round: DebateRound = {
        round: i,
        analystMessage: analystPoint,
        strategistMessage: strategistPoint,
        topic,
      };

      rounds.push(round);

      this.emitSSE('debate_round', round);
    }

    return rounds;
  }

  // -------------------------------------------------------------------------
  // Approval Handling
  // -------------------------------------------------------------------------

  private async waitForApproval(
    stepId: string,
    agentId: string,
    data: unknown
  ): Promise<{
    status: 'approved' | 'rejected' | 'modified';
    feedback?: string;
    modifiedData?: unknown;
  }> {
    this.emitSSE('approval_request', { stepId, agentId, data });

    if (this.approvalGate) {
      const response = await this.approvalGate.requestApproval(
        stepId,
        agentId,
        data
      );

      this.emitSSE('approval_response', {
        stepId,
        agentId,
        status: response.status,
      });

      return response;
    }

    // No approval gate set: auto-approve
    return { status: 'approved' };
  }

  // -------------------------------------------------------------------------
  // SSE Emission
  // -------------------------------------------------------------------------

  private emitSSE(type: SSEEventType, data: unknown): void {
    const event: SSEEvent = { type, data, timestamp: Date.now() };
    this.sseHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`[SSE handler error for ${type}]:`, err);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Wire Agent Events to SSE
  // -------------------------------------------------------------------------

  private wireAgentEvents(): void {
    const agents = [
      this.researcher,
      this.analyst,
      this.strategist,
      this.manager,
    ];

    for (const agent of agents) {
      const agentEmitter = agent.getEmitter();

      agentEmitter.on('status_change', (event) => {
        this.emitSSE('agent_status', event.payload);
      });

      agentEmitter.on('message', (event) => {
        this.emitSSE('agent_message', event.payload);
      });

      agentEmitter.on('error', (event) => {
        this.emitSSE('pipeline_error', event.payload);
      });
    }
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private futureDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }
}
