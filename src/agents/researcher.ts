// =============================================================================
// Tideworks Agent Office - Researcher Agent
// =============================================================================

import { BaseAgent, ClaudeClient } from './base-agent';
import {
  Brand,
  ExecutionMode,
  LeadInput,
  SEOData,
} from './types';

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface ResearchPerception {
  industry: string;
  companySize: string;
  region: string;
  keywords: string[];
  budget?: string;
  notes?: string;
}

interface ResearchReasoning {
  searchStrategy: 'web_search' | 'ahrefs' | 'combined';
  queries: string[];
  targetBrandCount: number;
  focusAreas: string[];
}

interface ResearchPlan {
  steps: {
    action: 'web_search' | 'ahrefs_lookup' | 'enrich_brand';
    query: string;
    expectedOutput: string;
  }[];
  brandTargets: number;
  seoAnalysisRequired: boolean;
}

interface ResearchResult {
  brands: Brand[];
  seoDataMap: Map<string, SEOData>;
}

// ---------------------------------------------------------------------------
// Researcher Agent
// ---------------------------------------------------------------------------

export class ResearcherAgent extends BaseAgent {
  constructor(claudeClient: ClaudeClient) {
    super('researcher', claudeClient);
  }

  // -------------------------------------------------------------------------
  // Cognitive Loop Implementation
  // -------------------------------------------------------------------------

  protected async perceive(input: unknown): Promise<ResearchPerception> {
    const leadInput = input as LeadInput;

    this.addMessage(
      `Parsing input for industry: ${leadInput.industry}, region: ${leadInput.region}`,
      'status'
    );

    return {
      industry: leadInput.industry,
      companySize: leadInput.companySize ?? 'smb',
      region: leadInput.region ?? '국내',
      keywords: leadInput.keywords ?? [],
      budget: undefined,
      notes: undefined,
    };
  }

  protected async reason(
    perception: unknown
  ): Promise<ResearchReasoning> {
    const p = perception as ResearchPerception;

    const prompt = `Given this research target:
Industry: ${p.industry}
Company Size: ${p.companySize}
Region: ${p.region}
Keywords: ${p.keywords.join(', ')}
${p.notes ? `Notes: ${p.notes}` : ''}

Determine:
1. The best search strategy (web_search, ahrefs, or combined)
2. Specific search queries to find B2B leads
3. How many brands to target (5-20 range)
4. Key focus areas for data collection

Respond in JSON format:
{
  "searchStrategy": "combined",
  "queries": ["query1", "query2"],
  "targetBrandCount": 10,
  "focusAreas": ["area1", "area2"]
}`;

    const response = await this.callClaude(prompt, {
      maxTokens: 1024,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response) as ResearchReasoning;
      this.addMessage(
        `Strategy: ${parsed.searchStrategy}, targeting ${parsed.targetBrandCount} brands`,
        'text'
      );
      return parsed;
    } catch {
      return {
        searchStrategy: 'combined',
        queries: [
          `${p.industry} companies ${p.region}`,
          `top ${p.companySize} ${p.industry} brands`,
          ...p.keywords.map((k) => `${k} ${p.industry} company`),
        ],
        targetBrandCount: 10,
        focusAreas: ['seo_performance', 'market_position', 'content_strategy'],
      };
    }
  }

  protected async plan(reasoning: unknown): Promise<ResearchPlan> {
    const r = reasoning as ResearchReasoning;

    const steps: ResearchPlan['steps'] = [];

    for (const query of r.queries) {
      steps.push({
        action: 'web_search',
        query,
        expectedOutput: 'brand_list',
      });
    }

    if (r.searchStrategy === 'ahrefs' || r.searchStrategy === 'combined') {
      steps.push({
        action: 'ahrefs_lookup',
        query: r.focusAreas.join(','),
        expectedOutput: 'seo_metrics',
      });
    }

    steps.push({
      action: 'enrich_brand',
      query: 'all_discovered_brands',
      expectedOutput: 'enriched_brands',
    });

    return {
      steps,
      brandTargets: r.targetBrandCount,
      seoAnalysisRequired:
        r.searchStrategy === 'ahrefs' || r.searchStrategy === 'combined',
    };
  }

  protected async execute(
    plan: unknown,
    _mode: ExecutionMode
  ): Promise<ResearchResult> {
    const p = plan as ResearchPlan;

    this.addMessage(`Executing ${p.steps.length} research steps`, 'status');

    const brands: Brand[] = [];
    const seoDataMap = new Map<string, SEOData>();

    for (const step of p.steps) {
      this.setCurrentTask(`Running: ${step.action} - ${step.query}`);

      switch (step.action) {
        case 'web_search': {
          const searchResults = await this.searchBrands(
            step.query,
            'smb',
            'global'
          );
          for (const brand of searchResults) {
            const exists = brands.some((b) => b.domain === brand.domain);
            if (!exists) {
              brands.push(brand);
            }
          }
          break;
        }
        case 'ahrefs_lookup': {
          for (const brand of brands) {
            const seo = await this.analyzeSEO(brand.domain);
            seoDataMap.set(brand.domain, seo);
          }
          break;
        }
        case 'enrich_brand': {
          const prompt = `Given these brands, enrich them with additional context:
${JSON.stringify(brands.map((b) => ({ name: b.name, domain: b.domain })))}

For each brand, provide a brief description focusing on their digital presence and potential need for SEO/AI search optimization services.

Respond as a JSON array of objects with "domain" and "description" fields.`;

          const response = await this.callClaude(prompt, {
            maxTokens: 2048,
            temperature: 0.4,
          });

          try {
            const enrichments = JSON.parse(response) as {
              domain: string;
              description: string;
            }[];
            for (const enrichment of enrichments) {
              const brand = brands.find(
                (b) => b.domain === enrichment.domain
              );
              if (brand) {
                brand.description = enrichment.description;
              }
            }
          } catch {
            this.addMessage(
              'Brand enrichment parsing failed, using defaults',
              'status'
            );
          }
          break;
        }
      }
    }

    this.addMessage(
      `Discovered ${brands.length} brands with ${seoDataMap.size} SEO profiles`,
      'text'
    );

    return { brands, seoDataMap };
  }

  protected async evaluate(
    result: unknown
  ): Promise<{ passed: boolean; reason?: string; output: unknown }> {
    const r = result as ResearchResult;

    if (r.brands.length === 0) {
      return {
        passed: false,
        reason: 'No brands discovered. Search parameters may be too narrow.',
        output: null,
      };
    }

    const brandsWithSEO = r.brands.filter((b) =>
      r.seoDataMap.has(b.domain)
    );

    if (brandsWithSEO.length < r.brands.length * 0.5) {
      this.addMessage(
        `Warning: Only ${brandsWithSEO.length}/${r.brands.length} brands have SEO data`,
        'status'
      );
    }

    const output = {
      brands: r.brands,
      seoData: Object.fromEntries(r.seoDataMap),
      summary: {
        totalBrands: r.brands.length,
        withSEOData: brandsWithSEO.length,
        industries: [...new Set(r.brands.map((b) => b.industry))],
        regions: [...new Set(r.brands.map((b) => b.region))],
      },
    };

    return { passed: true, output };
  }

  // -------------------------------------------------------------------------
  // Public Tool Methods
  // -------------------------------------------------------------------------

  async searchBrands(
    industry: string,
    size: string,
    region: string
  ): Promise<Brand[]> {
    this.addMessage(
      `Searching brands: industry=${industry}, size=${size}, region=${region}`,
      'status'
    );

    const prompt = `You are a B2B lead research tool. Find realistic potential client brands for these criteria:
Industry: ${industry}
Company Size: ${size}
Region: ${region}

Generate 5-10 realistic brand profiles as a JSON array. Each brand should have:
{
  "name": "Brand Name",
  "domain": "brand.com",
  "industry": "${industry}",
  "companySize": "${size}",
  "region": "${region}",
  "description": "Brief description of the company",
  "contactEmail": "info@brand.com",
  "employeeCount": 100,
  "annualRevenue": "$10M-$50M"
}

Respond ONLY with the JSON array, no other text.`;

    const response = await this.callClaude(prompt, {
      maxTokens: 4096,
      temperature: 0.7,
    });

    try {
      const brands = JSON.parse(response) as Brand[];
      return brands.map((b) => ({
        name: b.name ?? 'Unknown',
        domain: b.domain ?? 'unknown.com',
        industry: b.industry ?? industry,
        companySize: b.companySize ?? size,
        region: b.region ?? region,
        description: b.description ?? '',
        contactEmail: b.contactEmail,
        contactName: b.contactName,
        annualRevenue: b.annualRevenue,
        employeeCount: b.employeeCount,
        foundedYear: b.foundedYear,
        socialProfiles: b.socialProfiles,
      }));
    } catch {
      this.addMessage('Failed to parse brand search results', 'status');
      return [];
    }
  }

  async analyzeSEO(domain: string): Promise<SEOData> {
    this.addMessage(`Analyzing SEO for: ${domain}`, 'status');

    const prompt = `You are an SEO analysis tool (simulating Ahrefs data). Provide realistic SEO metrics for the domain: ${domain}

Generate realistic data as JSON:
{
  "domain": "${domain}",
  "domainRating": 45,
  "organicTraffic": 15000,
  "organicKeywords": 3200,
  "backlinks": 8500,
  "topKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "trafficTrend": "rising",
  "contentGap": ["gap1", "gap2", "gap3"],
  "aiSearchVisibility": 35,
  "competitorDomains": ["comp1.com", "comp2.com"]
}

Respond ONLY with the JSON, no other text.`;

    const response = await this.callClaude(prompt, {
      maxTokens: 1024,
      temperature: 0.5,
    });

    try {
      const data = JSON.parse(response) as SEOData;
      return {
        domain: data.domain ?? domain,
        domainRating: Math.min(100, Math.max(0, data.domainRating ?? 30)),
        organicTraffic: Math.max(0, data.organicTraffic ?? 0),
        organicKeywords: Math.max(0, data.organicKeywords ?? 0),
        backlinks: Math.max(0, data.backlinks ?? 0),
        topKeywords: data.topKeywords ?? [],
        trafficTrend: data.trafficTrend ?? 'stable',
        contentGap: data.contentGap ?? [],
        aiSearchVisibility: Math.min(
          100,
          Math.max(0, data.aiSearchVisibility ?? 20)
        ),
        competitorDomains: data.competitorDomains ?? [],
      };
    } catch {
      return {
        domain,
        domainRating: 30,
        organicTraffic: 5000,
        organicKeywords: 500,
        backlinks: 1000,
        topKeywords: [],
        trafficTrend: 'stable',
        contentGap: [],
        aiSearchVisibility: 20,
        competitorDomains: [],
      };
    }
  }
}
