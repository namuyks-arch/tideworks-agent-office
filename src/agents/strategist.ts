// =============================================================================
// Tideworks Agent Office - Strategist Agent
// =============================================================================

import { BaseAgent, ClaudeClient } from './base-agent';
import {
  BrandDiagnosis,
  ExecutionMode,
  ProposalDraft,
  ScoredLead,
  SEOData,
} from './types';

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface StrategistPerception {
  scoredLeads: ScoredLead[];
  diagnosis?: BrandDiagnosis;
  context: string;
}

interface StrategistReasoning {
  approachType: 'aggressive' | 'consultative' | 'educational';
  keySellingPoints: string[];
  pricingStrategy: string;
}

interface StrategistPlan {
  salesPointsPerLead: number;
  proposalTemplate: string;
  debateReadiness: boolean;
}

interface SalesApproach {
  leadName: string;
  approachType: string;
  openingPitch: string;
  keyPoints: string[];
  objectionHandlers: { objection: string; response: string }[];
  proposedMeeting: string;
  followUpPlan: string;
}

interface GEOStrategy {
  targetQueries: string[];
  contentPlan: {
    topic: string;
    format: string;
    aiSearchOptimization: string;
  }[];
  technicalRecommendations: string[];
  entityOptimization: string[];
  citationStrategy: string;
  expectedImpact: string;
}

// ---------------------------------------------------------------------------
// Strategist Agent
// ---------------------------------------------------------------------------

export class StrategistAgent extends BaseAgent {
  constructor(claudeClient: ClaudeClient) {
    super('strategist', claudeClient);
  }

  // -------------------------------------------------------------------------
  // Cognitive Loop Implementation
  // -------------------------------------------------------------------------

  protected async perceive(input: unknown): Promise<StrategistPerception> {
    const data = input as {
      scoredLeads?: ScoredLead[];
      diagnosis?: BrandDiagnosis;
    };

    const scoredLeads = data.scoredLeads ?? [];
    const highPriority = scoredLeads.filter((l) => l.priority === 'high');

    this.addMessage(
      `Received ${scoredLeads.length} leads (${highPriority.length} high priority)`,
      'status'
    );

    return {
      scoredLeads,
      diagnosis: data.diagnosis,
      context: `Strategy development for ${scoredLeads.length} leads`,
    };
  }

  protected async reason(
    perception: unknown
  ): Promise<StrategistReasoning> {
    const p = perception as StrategistPerception;

    const avgScore =
      p.scoredLeads.length > 0
        ? p.scoredLeads.reduce((sum, l) => sum + l.scores.total, 0) /
          p.scoredLeads.length
        : 50;

    const approachType: StrategistReasoning['approachType'] =
      avgScore >= 70
        ? 'aggressive'
        : avgScore >= 50
          ? 'consultative'
          : 'educational';

    return {
      approachType,
      keySellingPoints: [
        'AI Search Optimization (GEO/AEO)',
        'Data-driven SEO strategy',
        'Content gap analysis and execution',
        'Competitive intelligence',
      ],
      pricingStrategy:
        approachType === 'aggressive'
          ? 'premium_value'
          : approachType === 'consultative'
            ? 'tiered_options'
            : 'entry_level',
    };
  }

  protected async plan(reasoning: unknown): Promise<StrategistPlan> {
    const r = reasoning as StrategistReasoning;

    return {
      salesPointsPerLead: r.approachType === 'aggressive' ? 5 : 3,
      proposalTemplate: r.pricingStrategy,
      debateReadiness: true,
    };
  }

  protected async execute(
    plan: unknown,
    _mode: ExecutionMode
  ): Promise<unknown> {
    const _p = plan as StrategistPlan;

    this.addMessage(
      `Strategy execution plan ready: ${_p.proposalTemplate} approach`,
      'status'
    );

    return { planReady: true, template: _p.proposalTemplate };
  }

  protected async evaluate(
    result: unknown
  ): Promise<{ passed: boolean; reason?: string; output: unknown }> {
    return { passed: true, output: result };
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  async generateSalesPoints(scoredLead: ScoredLead): Promise<SalesApproach> {
    this.setStatus('working');
    this.setCurrentTask(`Generating sales approach for: ${scoredLead.brand.name}`);

    const prompt = `Create a B2B sales approach for this lead:

Brand: ${scoredLead.brand.name} (${scoredLead.brand.domain})
Industry: ${scoredLead.brand.industry}
Lead Score: ${scoredLead.scores.total}/100
Priority: ${scoredLead.priority}

Score Breakdown:
- SEO: ${scoredLead.scores.seo}/100
- AI Search: ${scoredLead.scores.aiSearch}/100
- Content: ${scoredLead.scores.content}/100
- Growth: ${scoredLead.scores.growth}/100
- Fit: ${scoredLead.scores.fit}/100

Sales Insight: ${scoredLead.salesInsight}

SEO Data:
- Domain Rating: ${scoredLead.seoData.domainRating}
- AI Search Visibility: ${scoredLead.seoData.aiSearchVisibility}%
- Traffic Trend: ${scoredLead.seoData.trafficTrend}
- Content Gaps: ${scoredLead.seoData.contentGap.join(', ')}

Create a comprehensive sales approach as JSON:
{
  "leadName": "${scoredLead.brand.name}",
  "approachType": "consultative|aggressive|educational",
  "openingPitch": "...",
  "keyPoints": ["point1", "point2", "point3"],
  "objectionHandlers": [
    { "objection": "...", "response": "..." }
  ],
  "proposedMeeting": "...",
  "followUpPlan": "..."
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 2048,
      temperature: 0.6,
    });

    try {
      return JSON.parse(response) as SalesApproach;
    } catch {
      return {
        leadName: scoredLead.brand.name,
        approachType: 'consultative',
        openingPitch: `${scoredLead.brand.name} has significant untapped potential in AI search visibility (currently ${scoredLead.seoData.aiSearchVisibility}%). Our data shows opportunities to capture high-intent queries in their space.`,
        keyPoints: [
          `AI search visibility at ${scoredLead.seoData.aiSearchVisibility}% - below industry average`,
          `${scoredLead.seoData.contentGap.length} identified content gaps representing missed traffic`,
          `Competitor analysis reveals actionable advantages`,
        ],
        objectionHandlers: [
          {
            objection: 'We already have an SEO agency',
            response:
              'Traditional SEO is necessary but insufficient. AI search optimization (GEO/AEO) is a distinct discipline that complements existing SEO work.',
          },
        ],
        proposedMeeting: '30-minute discovery call to review AI search audit findings',
        followUpPlan: 'Send custom audit report within 24 hours, follow up in 3 business days',
      };
    }
  }

  async createProposal(
    diagnosis: BrandDiagnosis,
    seoData: SEOData
  ): Promise<ProposalDraft> {
    this.setStatus('working');
    this.setCurrentTask(`Creating proposal for: ${diagnosis.brand.name}`);

    const prompt = `Create a detailed B2B service proposal for this client:

Brand: ${diagnosis.brand.name} (${diagnosis.brand.domain})
Industry: ${diagnosis.brand.industry}

Diagnosis Summary:
Strengths: ${diagnosis.strengths.join('; ')}
Weaknesses: ${diagnosis.weaknesses.join('; ')}
Opportunities: ${diagnosis.opportunities.join('; ')}
SEO Gaps: ${diagnosis.seoGaps.join('; ')}
AI Search Gaps: ${diagnosis.aiSearchGaps.join('; ')}
Priority Actions: ${diagnosis.priorityActions.join('; ')}

Current Metrics:
- Domain Rating: ${seoData.domainRating}
- Organic Traffic: ${seoData.organicTraffic}
- AI Search Visibility: ${seoData.aiSearchVisibility}%

Create a proposal as JSON:
{
  "title": "...",
  "clientName": "${diagnosis.brand.name}",
  "executiveSummary": "...",
  "currentStateAnalysis": "...",
  "proposedStrategy": "...",
  "servicePackages": [
    {
      "name": "...",
      "description": "...",
      "deliverables": ["..."],
      "price": "...",
      "timeline": "..."
    }
  ],
  "expectedResults": [
    { "metric": "...", "current": "...", "target": "...", "timeline": "..." }
  ],
  "caseStudies": ["..."],
  "timeline": [
    { "phase": "...", "duration": "...", "milestones": ["..."] }
  ],
  "pricing": [
    { "option": "...", "monthlyFee": "...", "setupFee": "...", "details": "..." }
  ],
  "termsAndConditions": "..."
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 8192,
      temperature: 0.5,
    });

    try {
      const parsed = JSON.parse(response) as ProposalDraft;
      parsed.createdAt = Date.now();
      return parsed;
    } catch {
      return this.buildFallbackProposal(diagnosis, seoData);
    }
  }

  async debate(topic: string, analystPoint: string): Promise<string> {
    this.setStatus('debating');
    this.setCurrentTask(`Debating: ${topic}`);

    const prompt = `You are the Strategist in a debate with the Analyst about: ${topic}

The Analyst argues: "${analystPoint}"

As the Strategist, provide a market-driven and creative rebuttal. Focus on:
- Business impact and revenue potential
- Market timing and competitive advantage
- Creative approaches and blue ocean opportunities
- Client relationship and trust building

Keep your response concise (3-5 sentences) and argue from a business-strategy perspective.`;

    const response = await this.callClaude(prompt, {
      maxTokens: 512,
      temperature: 0.6,
    });

    this.addMessage(`[Debate] ${response}`, 'text', {
      debateTopic: topic,
      role: 'strategist',
    });

    return response;
  }

  async designGEOStrategy(clientData: {
    brand: string;
    domain: string;
    industry: string;
    seoData: SEOData;
    goals?: string[];
  }): Promise<GEOStrategy> {
    this.setStatus('working');
    this.setCurrentTask(`Designing GEO strategy for: ${clientData.brand}`);

    const prompt = `Design a comprehensive GEO (Generative Engine Optimization) and AEO (Answer Engine Optimization) strategy:

Brand: ${clientData.brand} (${clientData.domain})
Industry: ${clientData.industry}
Current AI Search Visibility: ${clientData.seoData.aiSearchVisibility}%
Content Gaps: ${clientData.seoData.contentGap.join(', ')}
Top Keywords: ${clientData.seoData.topKeywords.join(', ')}
${clientData.goals ? `Goals: ${clientData.goals.join(', ')}` : ''}

Provide as JSON:
{
  "targetQueries": ["...", "..."],
  "contentPlan": [
    { "topic": "...", "format": "...", "aiSearchOptimization": "..." }
  ],
  "technicalRecommendations": ["...", "..."],
  "entityOptimization": ["...", "..."],
  "citationStrategy": "...",
  "expectedImpact": "..."
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 4096,
      temperature: 0.5,
    });

    try {
      return JSON.parse(response) as GEOStrategy;
    } catch {
      return {
        targetQueries: clientData.seoData.topKeywords.map(
          (k) => `best ${k} for ${clientData.industry}`
        ),
        contentPlan: clientData.seoData.contentGap.map((gap) => ({
          topic: gap,
          format: 'long-form guide',
          aiSearchOptimization:
            'Structured data markup, FAQ schema, clear entity definitions',
        })),
        technicalRecommendations: [
          'Implement comprehensive Schema.org markup',
          'Create FAQ sections for AI answer extraction',
          'Optimize meta descriptions for AI citation',
          'Build entity-rich content with clear definitions',
        ],
        entityOptimization: [
          `Establish ${clientData.brand} as authoritative entity in ${clientData.industry}`,
          'Create knowledge panel optimization strategy',
          'Build entity associations through content',
        ],
        citationStrategy:
          'Publish authoritative content that AI systems will cite as primary sources. Focus on data-driven insights and original research.',
        expectedImpact: `Projected 30-50% improvement in AI search visibility within 6 months, targeting ${Math.min(100, clientData.seoData.aiSearchVisibility + 35)}% visibility.`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private buildFallbackProposal(
    diagnosis: BrandDiagnosis,
    seoData: SEOData
  ): ProposalDraft {
    return {
      title: `AI Search & SEO Growth Proposal for ${diagnosis.brand.name}`,
      clientName: diagnosis.brand.name,
      executiveSummary: `${diagnosis.brand.name} has significant opportunity to improve digital visibility through AI search optimization. Current AI search visibility stands at ${seoData.aiSearchVisibility}%, with ${diagnosis.seoGaps.length} identified SEO gaps and ${diagnosis.aiSearchGaps.length} AI search optimization opportunities.`,
      currentStateAnalysis: `Domain Rating: ${seoData.domainRating}/100. Organic traffic: ${seoData.organicTraffic.toLocaleString()}/month. Traffic trend: ${seoData.trafficTrend}. Key weaknesses: ${diagnosis.weaknesses.slice(0, 3).join('; ')}.`,
      proposedStrategy: diagnosis.contentStrategy,
      servicePackages: [
        {
          name: 'Essential AI Search',
          description: 'Foundation-level AI search optimization',
          deliverables: [
            'AI search audit',
            'Schema markup implementation',
            'Monthly content optimization (4 pages)',
            'Quarterly reporting',
          ],
          price: '300만원/월',
          timeline: '6 months',
        },
        {
          name: 'Growth AI Search',
          description: 'Comprehensive AI search and SEO growth',
          deliverables: [
            'Everything in Essential',
            'GEO strategy design',
            'Monthly content creation (8 pages)',
            'Competitor monitoring',
            'Bi-weekly reporting',
          ],
          price: '600만원/월',
          timeline: '12 months',
        },
        {
          name: 'Enterprise AI Search',
          description: 'Full-service AI search dominance',
          deliverables: [
            'Everything in Growth',
            'Custom AI search dashboard',
            'Weekly content creation (4+ pages)',
            'Entity optimization',
            'Weekly strategy calls',
            'Dedicated account manager',
          ],
          price: '1,200만원/월',
          timeline: '12 months',
        },
      ],
      expectedResults: [
        {
          metric: 'AI Search Visibility',
          current: `${seoData.aiSearchVisibility}%`,
          target: `${Math.min(100, seoData.aiSearchVisibility + 35)}%`,
          timeline: '6 months',
        },
        {
          metric: 'Organic Traffic',
          current: seoData.organicTraffic.toLocaleString(),
          target: Math.round(seoData.organicTraffic * 1.8).toLocaleString(),
          timeline: '12 months',
        },
        {
          metric: 'Domain Rating',
          current: String(seoData.domainRating),
          target: String(Math.min(100, seoData.domainRating + 15)),
          timeline: '12 months',
        },
      ],
      caseStudies: [
        'Similar industry client achieved 45% AI search visibility increase in 4 months',
        'B2B client grew organic leads by 120% through GEO strategy',
      ],
      timeline: [
        {
          phase: 'Discovery & Audit',
          duration: '2 weeks',
          milestones: [
            'Complete AI search audit',
            'Competitor analysis',
            'Strategy presentation',
          ],
        },
        {
          phase: 'Foundation',
          duration: '1 month',
          milestones: [
            'Technical setup',
            'Schema implementation',
            'Content calendar',
          ],
        },
        {
          phase: 'Growth',
          duration: '3 months',
          milestones: [
            'Content production',
            'Link building',
            'First results reporting',
          ],
        },
        {
          phase: 'Scale',
          duration: '6+ months',
          milestones: [
            'Expanded content',
            'Advanced GEO tactics',
            'ROI reporting',
          ],
        },
      ],
      pricing: [
        {
          option: 'Essential',
          monthlyFee: '300만원',
          setupFee: '200만원',
          details: 'Foundation AI search package with core optimizations',
        },
        {
          option: 'Growth',
          monthlyFee: '600만원',
          setupFee: '300만원',
          details: 'Comprehensive growth package with full GEO strategy',
        },
        {
          option: 'Enterprise',
          monthlyFee: '1,200만원',
          setupFee: '500만원',
          details: 'Full-service package with dedicated team and custom tools',
        },
      ],
      termsAndConditions:
        'Minimum 6-month engagement. Monthly billing. 30-day notice for cancellation after minimum term. Results are projected estimates based on industry benchmarks.',
      createdAt: Date.now(),
    };
  }
}
