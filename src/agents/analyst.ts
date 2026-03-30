// =============================================================================
// Tideworks Agent Office - Analyst Agent
// =============================================================================

import { BaseAgent, ClaudeClient } from './base-agent';
import {
  Brand,
  BrandDiagnosis,
  ExecutionMode,
  ScoredLead,
  SEOData,
} from './types';

// ---------------------------------------------------------------------------
// Scoring Weights
// ---------------------------------------------------------------------------

const SCORING_WEIGHTS = {
  seo: 0.25,
  aiSearch: 0.25,
  content: 0.20,
  growth: 0.15,
  fit: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface AnalystPerception {
  brands: Brand[];
  seoData: Record<string, SEOData>;
  context: string;
}

interface AnalystReasoning {
  scoringApproach: string;
  brandCount: number;
  hasCompleteSEO: boolean;
  riskFactors: string[];
}

interface AnalystPlan {
  brandsToScore: string[];
  diagnosisRequired: boolean;
  kpiDesignRequired: boolean;
}

// ---------------------------------------------------------------------------
// Analyst Agent
// ---------------------------------------------------------------------------

export class AnalystAgent extends BaseAgent {
  constructor(claudeClient: ClaudeClient) {
    super('analyst', claudeClient);
  }

  // -------------------------------------------------------------------------
  // Cognitive Loop Implementation
  // -------------------------------------------------------------------------

  protected async perceive(input: unknown): Promise<AnalystPerception> {
    const data = input as {
      brands: Brand[];
      seoData: Record<string, SEOData>;
    };

    this.addMessage(
      `Received ${data.brands.length} brands for analysis`,
      'status'
    );

    return {
      brands: data.brands,
      seoData: data.seoData,
      context: `Analyzing ${data.brands.length} brands across ${
        [...new Set(data.brands.map((b) => b.industry))].length
      } industries`,
    };
  }

  protected async reason(
    perception: unknown
  ): Promise<AnalystReasoning> {
    const p = perception as AnalystPerception;

    const brandsWithSEO = p.brands.filter(
      (b) => p.seoData[b.domain] !== undefined
    );

    return {
      scoringApproach:
        brandsWithSEO.length === p.brands.length
          ? 'full_scoring'
          : 'partial_scoring',
      brandCount: p.brands.length,
      hasCompleteSEO: brandsWithSEO.length === p.brands.length,
      riskFactors: brandsWithSEO.length < p.brands.length
        ? ['Incomplete SEO data for some brands']
        : [],
    };
  }

  protected async plan(reasoning: unknown): Promise<AnalystPlan> {
    const r = reasoning as AnalystReasoning;

    return {
      brandsToScore: Array.from({ length: r.brandCount }, (_, i) =>
        String(i)
      ),
      diagnosisRequired: true,
      kpiDesignRequired: false,
    };
  }

  protected async execute(
    plan: unknown,
    _mode: ExecutionMode
  ): Promise<ScoredLead[]> {
    const _plan = plan as AnalystPlan;

    // Access the original perception data stored during perceive
    // We retrieve it from the run context via the input passed through
    // the cognitive loop. For execute, we work on the stored state.
    // The actual scoring is done in scoreLead() called from the orchestrator.
    // During the cognitive loop, we return placeholder to be filled by
    // the orchestrator calling scoreLead() directly.

    this.addMessage(
      `Scoring plan created for ${_plan.brandsToScore.length} brands`,
      'status'
    );

    // Return empty array; the orchestrator calls scoreLead() per brand
    return [];
  }

  protected async evaluate(
    result: unknown
  ): Promise<{ passed: boolean; reason?: string; output: unknown }> {
    const scored = result as ScoredLead[];

    if (scored.length === 0) {
      // Zero scored leads is acceptable when the orchestrator calls
      // scoreLead individually. Pass through.
      return { passed: true, output: scored };
    }

    const avgScore =
      scored.reduce((sum, l) => sum + l.scores.total, 0) / scored.length;

    this.addMessage(
      `Evaluation: ${scored.length} leads scored, avg total score: ${avgScore.toFixed(1)}`,
      'text'
    );

    return { passed: true, output: scored };
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  async scoreLead(brand: Brand, seoData: SEOData): Promise<ScoredLead> {
    this.setStatus('working');
    this.setCurrentTask(`Scoring: ${brand.name}`);

    const seoScore = this.calculateSEOScore(seoData);
    const aiSearchScore = this.calculateAISearchScore(seoData);
    const contentScore = await this.calculateContentScore(brand, seoData);
    const growthScore = this.calculateGrowthScore(seoData);
    const fitScore = await this.calculateFitScore(brand);

    const total =
      seoScore * SCORING_WEIGHTS.seo +
      aiSearchScore * SCORING_WEIGHTS.aiSearch +
      contentScore * SCORING_WEIGHTS.content +
      growthScore * SCORING_WEIGHTS.growth +
      fitScore * SCORING_WEIGHTS.fit;

    const priority: ScoredLead['priority'] =
      total >= 75 ? 'high' : total >= 50 ? 'medium' : 'low';

    const salesInsight = await this.generateSalesInsight(brand, seoData, total);

    const scored: ScoredLead = {
      brand,
      seoData,
      scores: {
        seo: Math.round(seoScore * 10) / 10,
        aiSearch: Math.round(aiSearchScore * 10) / 10,
        content: Math.round(contentScore * 10) / 10,
        growth: Math.round(growthScore * 10) / 10,
        fit: Math.round(fitScore * 10) / 10,
        total: Math.round(total * 10) / 10,
      },
      rank: 0, // Assigned after sorting
      salesInsight,
      priority,
    };

    this.addMessage(
      `Scored ${brand.name}: ${scored.scores.total}/100 (${priority})`,
      'text'
    );

    return scored;
  }

  async diagnoseBrand(data: {
    brand: Brand;
    seoData: SEOData;
  }): Promise<BrandDiagnosis> {
    this.setStatus('working');
    this.setCurrentTask(`Diagnosing: ${data.brand.name}`);

    const prompt = `Analyze this brand's digital presence and provide a comprehensive SWOT-based diagnosis:

Brand: ${data.brand.name} (${data.brand.domain})
Industry: ${data.brand.industry}
Description: ${data.brand.description}

SEO Metrics:
- Domain Rating: ${data.seoData.domainRating}/100
- Organic Traffic: ${data.seoData.organicTraffic.toLocaleString()}/month
- Organic Keywords: ${data.seoData.organicKeywords.toLocaleString()}
- Backlinks: ${data.seoData.backlinks.toLocaleString()}
- Traffic Trend: ${data.seoData.trafficTrend}
- AI Search Visibility: ${data.seoData.aiSearchVisibility}%
- Content Gaps: ${data.seoData.contentGap.join(', ')}
- Competitors: ${data.seoData.competitorDomains.join(', ')}

Provide diagnosis as JSON:
{
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "opportunities": ["...", "..."],
  "threats": ["...", "..."],
  "seoGaps": ["...", "..."],
  "aiSearchGaps": ["...", "..."],
  "contentStrategy": "...",
  "competitorAnalysis": [
    { "competitor": "...", "advantage": "...", "gap": "..." }
  ],
  "priorityActions": ["...", "..."],
  "estimatedImpact": "..."
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 4096,
      temperature: 0.4,
    });

    try {
      const parsed = JSON.parse(response) as Omit<BrandDiagnosis, 'brand'>;
      return { brand: data.brand, ...parsed };
    } catch {
      return {
        brand: data.brand,
        strengths: ['Existing digital presence'],
        weaknesses: ['Incomplete SEO optimization'],
        opportunities: ['AI search optimization', 'Content gap filling'],
        threats: ['Competitor advancement in AI search'],
        seoGaps: data.seoData.contentGap,
        aiSearchGaps: ['Low AI search visibility'],
        contentStrategy: 'Focus on authoritative content creation targeting identified gaps',
        competitorAnalysis: data.seoData.competitorDomains.map((c) => ({
          competitor: c,
          advantage: 'Established presence',
          gap: 'Requires further analysis',
        })),
        priorityActions: [
          'Improve AI search visibility',
          'Address content gaps',
          'Strengthen backlink profile',
        ],
        estimatedImpact: 'Moderate to high potential for growth with targeted intervention',
      };
    }
  }

  async designKPI(clientData: {
    brand: Brand;
    seoData: SEOData;
    goals?: string[];
  }): Promise<{
    kpis: { metric: string; baseline: string; target: string; timeline: string }[];
    measurementPlan: string;
  }> {
    this.setStatus('working');
    this.setCurrentTask(`Designing KPIs for: ${clientData.brand.name}`);

    const prompt = `Design a KPI framework for this client:

Brand: ${clientData.brand.name} (${clientData.brand.domain})
Current Metrics:
- Domain Rating: ${clientData.seoData.domainRating}
- Organic Traffic: ${clientData.seoData.organicTraffic}
- AI Search Visibility: ${clientData.seoData.aiSearchVisibility}%
${clientData.goals ? `Client Goals: ${clientData.goals.join(', ')}` : ''}

Provide as JSON:
{
  "kpis": [
    { "metric": "...", "baseline": "...", "target": "...", "timeline": "..." }
  ],
  "measurementPlan": "..."
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 2048,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response) as {
        kpis: { metric: string; baseline: string; target: string; timeline: string }[];
        measurementPlan: string;
      };
    } catch {
      return {
        kpis: [
          {
            metric: 'Domain Rating',
            baseline: String(clientData.seoData.domainRating),
            target: String(Math.min(100, clientData.seoData.domainRating + 15)),
            timeline: '6 months',
          },
          {
            metric: 'Organic Traffic',
            baseline: clientData.seoData.organicTraffic.toLocaleString(),
            target: Math.round(
              clientData.seoData.organicTraffic * 1.5
            ).toLocaleString(),
            timeline: '6 months',
          },
          {
            metric: 'AI Search Visibility',
            baseline: `${clientData.seoData.aiSearchVisibility}%`,
            target: `${Math.min(100, clientData.seoData.aiSearchVisibility + 30)}%`,
            timeline: '6 months',
          },
        ],
        measurementPlan:
          'Monthly tracking via Ahrefs and AI search monitoring tools with quarterly reviews.',
      };
    }
  }

  async debate(topic: string, strategistPoint: string): Promise<string> {
    this.setStatus('debating');
    this.setCurrentTask(`Debating: ${topic}`);

    const prompt = `You are the Analyst in a debate with the Strategist about: ${topic}

The Strategist argues: "${strategistPoint}"

As the Analyst, provide a data-driven rebuttal or counter-argument. Focus on:
- Quantitative evidence and metrics
- Risk assessment and probability
- Historical data patterns
- Conservative but well-supported conclusions

Keep your response concise (3-5 sentences) and argue from a data-first perspective.`;

    const response = await this.callClaude(prompt, {
      maxTokens: 512,
      temperature: 0.5,
    });

    this.addMessage(`[Debate] ${response}`, 'text', {
      debateTopic: topic,
      role: 'analyst',
    });

    return response;
  }

  // -------------------------------------------------------------------------
  // Private Scoring Helpers
  // -------------------------------------------------------------------------

  private calculateSEOScore(seoData: SEOData): number {
    const drScore = (seoData.domainRating / 100) * 40;
    const trafficScore = Math.min(30, (seoData.organicTraffic / 100000) * 30);
    const keywordScore = Math.min(20, (seoData.organicKeywords / 10000) * 20);
    const backlinkScore = Math.min(10, (seoData.backlinks / 50000) * 10);
    return Math.min(100, drScore + trafficScore + keywordScore + backlinkScore);
  }

  private calculateAISearchScore(seoData: SEOData): number {
    // Lower AI search visibility = higher opportunity = higher score for us
    const visibilityOpportunity = 100 - seoData.aiSearchVisibility;
    const gapScore = Math.min(30, seoData.contentGap.length * 10);
    return Math.min(100, visibilityOpportunity * 0.7 + gapScore);
  }

  private async calculateContentScore(
    brand: Brand,
    seoData: SEOData
  ): Promise<number> {
    const gapPenalty = seoData.contentGap.length * 5;
    const baseScore = 70;
    const trendBonus = seoData.trafficTrend === 'rising' ? 10 : seoData.trafficTrend === 'declining' ? -10 : 0;
    const keywordDensity = Math.min(20, (seoData.organicKeywords / seoData.organicTraffic) * 100);

    void brand; // Used contextually in full implementation

    return Math.max(0, Math.min(100, baseScore - gapPenalty + trendBonus + keywordDensity));
  }

  private calculateGrowthScore(seoData: SEOData): number {
    let score = 50;

    if (seoData.trafficTrend === 'rising') {
      score += 25;
    } else if (seoData.trafficTrend === 'declining') {
      score += 15; // Declining = they need help = opportunity
    }

    if (seoData.domainRating < 40) {
      score += 15; // Room to grow
    }
    if (seoData.aiSearchVisibility < 30) {
      score += 10; // Big opportunity
    }

    return Math.min(100, score);
  }

  private async calculateFitScore(brand: Brand): Promise<number> {
    let score = 50;

    if (brand.companySize === 'midmarket' || brand.companySize === 'enterprise') {
      score += 20;
    } else if (brand.companySize === 'smb') {
      score += 10;
    }

    if (brand.annualRevenue) {
      const revenueStr = brand.annualRevenue.replace(/[^0-9.]/g, '');
      const revenue = parseFloat(revenueStr);
      if (!isNaN(revenue) && revenue > 10) {
        score += 15;
      }
    }

    if (brand.employeeCount && brand.employeeCount > 50) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private async generateSalesInsight(
    brand: Brand,
    seoData: SEOData,
    totalScore: number
  ): Promise<string> {
    const prompt = `In one concise sentence, provide a sales insight for approaching ${brand.name}:
- Their AI search visibility is ${seoData.aiSearchVisibility}%
- Domain rating: ${seoData.domainRating}
- Traffic trend: ${seoData.trafficTrend}
- Lead score: ${totalScore}/100
- Content gaps: ${seoData.contentGap.slice(0, 3).join(', ')}

Focus on the most compelling angle for a B2B sales approach.`;

    return this.callClaude(prompt, { maxTokens: 128, temperature: 0.6 });
  }
}
