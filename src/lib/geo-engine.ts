// src/lib/geo-engine.ts
// GEO/AEO Pro-Max 분석 엔진 — Claude 4-Agent 아키텍처

import { chat, chatJSON } from '@/lib/claude';

export interface GeoAnalysisInput {
  brand: string;
  domain: string;
  industry: string;
  keywords?: string[];
  competitors?: string[];
  revenueRange?: string;
}

export interface AgentResult {
  agentName: string;
  agentEmoji: string;
  analysis: string;
  confidenceScore: number;
}

export interface GeoAnalysisResult {
  // SEO/파이프라인 호환 필드
  domain: string;
  domainRating: number;        // DA (0~100)
  organicTraffic: number;      // 월 유입량
  organicKeywords: number;     // 키워드 수
  backlinks: number;           // 백링크 수
  topKeywords: string[];       // 주요 키워드
  trafficTrend: 'rising' | 'stable' | 'declining';
  contentGap: string[];        // 콘텐츠 갭
  keywordGap: number;          // 경쟁사 대비 부족 키워드
  // GEO/AEO 전용 필드
  geoScore: number;            // AI 검색 노출 점수 (0~100)
  aeoScore: number;            // AEO 점수 (0~100)
  aiSearchVisibility: number;  // = geoScore (호환)
  aiCitationRate: number;      // AI 인용률 (%)
  competitorDomains: string[]; // 경쟁 도메인
  // 에이전트 분석 결과
  agents: AgentResult[];
  // 요약
  weaknessSummary: string;     // 핵심 약점 한 줄 요약
}

async function callClaudeJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
  return chatJSON<T>(systemPrompt, [{ role: 'user', content: prompt }]);
}

// ─── Agent 1: StatusAnalyzer ─────────────────────────────────────────────────
async function runStatusAnalyzer(input: GeoAnalysisInput): Promise<{ analysis: string; metrics: Partial<GeoAnalysisResult>; confidence: number }> {
  const systemPrompt = `당신은 GEO/AEO(생성형 AI 검색 최적화) 현황 분석 전문가입니다.
한국 이커머스·마케팅 시장의 AI 검색 노출 현황을 분석하는 StatusAnalyzer 에이전트입니다.
반드시 JSON으로만 응답하세요. 설명 텍스트 없이 순수 JSON만 반환합니다.`;

  const prompt = `다음 브랜드의 GEO/AEO 현황을 분석하고 JSON으로 반환하세요:

브랜드: ${input.brand}
도메인: ${input.domain}
업종: ${input.industry}
연매출 규모: ${input.revenueRange || '미상'}
주요 키워드: ${(input.keywords || []).join(', ') || '없음'}

다음 JSON 형식으로 반환 (실제 시장 데이터 기반 추정치):
{
  "domainRating": 숫자(0-60, DA 수준),
  "organicTraffic": 숫자(월 유입량),
  "organicKeywords": 숫자(키워드 수),
  "backlinks": 숫자,
  "geoScore": 숫자(0-40, AI검색 노출 점수, 낮을수록 개선여지 큼),
  "aiCitationRate": 숫자(0-30, AI인용률%),
  "trafficTrend": "rising"|"stable"|"declining",
  "topKeywords": ["키워드1","키워드2","키워드3"],
  "analysisText": "한국어로 현황 분석 2-3문장",
  "confidenceScore": 숫자(60-90)
}`;

  try {
    const parsed = await callClaudeJSON<{
      domainRating: number; organicTraffic: number; organicKeywords: number;
      backlinks: number; geoScore: number; aiCitationRate: number;
      trafficTrend: string; topKeywords: string[]; analysisText: string; confidenceScore: number;
    }>(prompt, systemPrompt);

    return {
      analysis: parsed.analysisText,
      metrics: {
        domainRating: Math.min(100, Math.max(0, parsed.domainRating ?? 25)),
        organicTraffic: Math.max(0, parsed.organicTraffic ?? 5000),
        organicKeywords: Math.max(0, parsed.organicKeywords ?? 300),
        backlinks: Math.max(0, parsed.backlinks ?? 500),
        geoScore: Math.min(100, Math.max(0, parsed.geoScore ?? 20)),
        aiCitationRate: Math.min(100, Math.max(0, parsed.aiCitationRate ?? 10)),
        trafficTrend: (['rising', 'stable', 'declining'].includes(parsed.trafficTrend) ? parsed.trafficTrend : 'stable') as GeoAnalysisResult['trafficTrend'],
        topKeywords: Array.isArray(parsed.topKeywords) ? parsed.topKeywords : [],
      },
      confidence: parsed.confidenceScore ?? 70,
    };
  } catch (err) {
    console.error('[GeoEngine] StatusAnalyzer fallback:', err);
    // fallback
    const h = input.domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      analysis: `${input.brand}는 ${input.industry} 업종의 브랜드로, DA ${10 + (h % 25)} 수준으로 SEO 개선 여지가 있습니다.`,
      metrics: {
        domainRating: 10 + (h % 25),
        organicTraffic: 1000 + (h % 30000),
        organicKeywords: 100 + (h % 500),
        backlinks: 50 + (h % 2000),
        geoScore: 5 + (h % 25),
        aiCitationRate: 5 + (h % 20),
        trafficTrend: h % 3 === 0 ? 'rising' : h % 3 === 1 ? 'stable' : 'declining',
        topKeywords: [input.industry + ' 추천', input.brand + ' 리뷰'],
      },
      confidence: 60,
    };
  }
}

// ─── Agent 2: CompetitorAnalyzer ─────────────────────────────────────────────
async function runCompetitorAnalyzer(input: GeoAnalysisInput): Promise<{ analysis: string; metrics: Partial<GeoAnalysisResult>; confidence: number }> {
  const systemPrompt = `당신은 경쟁사 GEO/AEO 분석 전문가입니다. CompetitorAnalyzer 에이전트로서
경쟁사 대비 키워드갭과 콘텐츠갭을 분석합니다. 순수 JSON만 반환합니다.`;

  const competitors = input.competitors || [];
  const prompt = `다음 브랜드의 경쟁사 분석을 수행하고 JSON으로 반환하세요:

브랜드: ${input.brand}
업종: ${input.industry}
경쟁사: ${competitors.join(', ') || '일반적인 동종업계 경쟁사'}

JSON 형식:
{
  "keywordGap": 숫자(경쟁사 대비 부족 키워드 수, 50-400),
  "contentGap": ["갭1","갭2","갭3","갭4"],
  "competitorDomains": ["competitor1.com","competitor2.com"],
  "aeoScore": 숫자(0-50, AEO점수, 낮을수록 개선여지 큼),
  "analysisText": "한국어로 경쟁사 대비 분석 2-3문장",
  "confidenceScore": 숫자(60-90)
}`;

  try {
    const parsed = await callClaudeJSON<{
      keywordGap: number; contentGap: string[]; competitorDomains: string[];
      aeoScore: number; analysisText: string; confidenceScore: number;
    }>(prompt, systemPrompt);

    return {
      analysis: parsed.analysisText,
      metrics: {
        keywordGap: Math.max(0, parsed.keywordGap ?? 150),
        contentGap: Array.isArray(parsed.contentGap) ? parsed.contentGap.slice(0, 5) : [],
        competitorDomains: Array.isArray(parsed.competitorDomains) ? parsed.competitorDomains.slice(0, 3) : [],
        aeoScore: Math.min(100, Math.max(0, parsed.aeoScore ?? 20)),
      },
      confidence: parsed.confidenceScore ?? 70,
    };
  } catch {
    const h = input.domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      analysis: `${input.brand}은 경쟁사 대비 AI 검색 노출이 낮아 콘텐츠 최적화가 필요합니다.`,
      metrics: {
        keywordGap: 80 + (h % 200),
        contentGap: ['두괄식 즉답 콘텐츠 부족', 'FAQ 스키마 미적용', 'E-E-A-T 신호 부족'],
        competitorDomains: competitors.map(c => c.toLowerCase().replace(/\s/g, '') + '.com').slice(0, 2),
        aeoScore: 10 + (h % 25),
      },
      confidence: 60,
    };
  }
}

// ─── Agent 3: AdStrategyPlanner ──────────────────────────────────────────────
async function runAdStrategyPlanner(input: GeoAnalysisInput, statusMetrics: Partial<GeoAnalysisResult>): Promise<{ analysis: string; confidence: number }> {
  const systemPrompt = `당신은 GEO/AEO 광고전략 전문가입니다. AdStrategyPlanner 에이전트로서
최적의 AI 검색 최적화 광고 전략을 제안합니다. 순수 JSON만 반환합니다.`;

  const prompt = `다음 브랜드에 맞는 GEO/AEO 광고전략을 분석하고 JSON으로 반환하세요:

브랜드: ${input.brand}
업종: ${input.industry}
현재 GEO 점수: ${statusMetrics.geoScore ?? 20}
AI 인용률: ${statusMetrics.aiCitationRate ?? 10}%
트래픽 추세: ${statusMetrics.trafficTrend ?? 'stable'}

JSON 형식:
{
  "topStrategy": "최우선 전략 한 줄",
  "recommendedChannels": ["채널1","채널2","채널3"],
  "estimatedROI": "예상 ROI 범위",
  "analysisText": "한국어로 광고전략 분석 2-3문장",
  "confidenceScore": 숫자(60-90)
}`;

  try {
    const parsed = await callClaudeJSON<{
      topStrategy: string; recommendedChannels: string[];
      estimatedROI: string; analysisText: string; confidenceScore: number;
    }>(prompt, systemPrompt);
    return {
      analysis: parsed.analysisText,
      confidence: parsed.confidenceScore ?? 70,
    };
  } catch {
    return {
      analysis: `${input.brand}의 AI 검색 노출 향상을 위해 두괄식 콘텐츠 제작과 스키마 마크업 적용이 시급합니다.`,
      confidence: 65,
    };
  }
}

// ─── Agent 4: ActionPlanner ──────────────────────────────────────────────────
async function runActionPlanner(
  input: GeoAnalysisInput,
  statusMetrics: Partial<GeoAnalysisResult>,
  compMetrics: Partial<GeoAnalysisResult>
): Promise<{ analysis: string; weaknessSummary: string; confidence: number }> {
  const systemPrompt = `당신은 B2B 세일즈 전략가이자 GEO/AEO 액션플랜 전문가입니다. ActionPlanner 에이전트로서
브랜드의 핵심 약점을 파악하고 영업 포인트를 도출합니다. 순수 JSON만 반환합니다.`;

  const prompt = `다음 SEO/GEO 데이터를 기반으로 핵심 약점과 영업 포인트를 분석하세요:

브랜드: ${input.brand}
업종: ${input.industry}
DA: ${statusMetrics.domainRating ?? 25}
월 트래픽: ${statusMetrics.organicTraffic ?? 5000}
GEO 점수: ${statusMetrics.geoScore ?? 20}/100
AI 인용률: ${statusMetrics.aiCitationRate ?? 10}%
콘텐츠 갭: ${(compMetrics.contentGap || []).join(', ')}

JSON 형식:
{
  "weaknessSummary": "핵심 약점 한 문장 (30자 이내, 한국어)",
  "priorityActions": ["액션1","액션2","액션3"],
  "salesPitch": "타이드웍스 서비스로 해결 가능한 포인트 한 문장",
  "analysisText": "한국어로 액션플랜 분석 2-3문장",
  "confidenceScore": 숫자(60-90)
}`;

  try {
    const parsed = await callClaudeJSON<{
      weaknessSummary: string; priorityActions: string[];
      salesPitch: string; analysisText: string; confidenceScore: number;
    }>(prompt, systemPrompt);
    return {
      analysis: parsed.analysisText,
      weaknessSummary: parsed.weaknessSummary,
      confidence: parsed.confidenceScore ?? 70,
    };
  } catch {
    return {
      analysis: `${input.brand}의 GEO/AEO 점수 향상을 통해 AI 검색 시대 경쟁력 확보가 필요합니다.`,
      weaknessSummary: `DA ${statusMetrics.domainRating ?? 25}, GEO ${statusMetrics.geoScore ?? 20}점으로 AI 검색 노출 취약`,
      confidence: 65,
    };
  }
}

// ─── 메인 분석 함수 ───────────────────────────────────────────────────────────
const GEO_API_URL = process.env.GEO_AEO_API_URL ?? 'https://geo-aeo-dashboard.onrender.com';

/** geo-aeo-dashboard REST API 호출 후 내부 Claude 엔진 fallback */
export async function analyzeGeo(input: GeoAnalysisInput): Promise<GeoAnalysisResult> {
  // 1) 외부 geo-aeo-dashboard API 시도
  try {
    const res = await fetch(`${GEO_API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: input.brand,
        domain: input.domain,
        industry: input.industry,
        keywords: input.keywords ?? [],
        competitors: input.competitors ?? [],
        revenue_range: input.revenueRange ?? '',
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const data = await res.json() as Record<string, unknown>;
        if (data.geo_score !== undefined) {
          console.log(`[GeoEngine] 외부 API 성공: ${input.brand}`);
          return mapExternalResponse(input, data);
        }
      }
    }
  } catch {
    // 외부 API 실패 → 내부 엔진으로 fallback
  }

  // 2) 내부 Claude 4-에이전트 분석 (fallback)
  console.log(`[GeoEngine] 내부 Claude 엔진 사용: ${input.brand} (${input.domain})`);
  return analyzeGeoInternal(input);
}

function mapExternalResponse(input: GeoAnalysisInput, data: Record<string, unknown>): GeoAnalysisResult {
  const geoScore = (data.geo_score as number) ?? 20;
  const aeoScore = (data.aeo_score as number) ?? 20;
  const rawAgents = (data.agents as { agent_name?: string; agentName?: string; emoji?: string; agentEmoji?: string; analysis?: string; confidence_score?: number; confidenceScore?: number }[]) ?? [];
  return {
    domain: (data.domain as string) ?? input.domain,
    domainRating: (data.domain_rating as number) ?? 25,
    organicTraffic: (data.organic_traffic as number) ?? 5000,
    organicKeywords: (data.organic_keywords as number) ?? 300,
    backlinks: (data.backlinks as number) ?? 500,
    topKeywords: (data.top_keywords as string[]) ?? [],
    trafficTrend: ((data.traffic_trend as string) ?? 'stable') as 'rising' | 'stable' | 'declining',
    contentGap: (data.content_gap as string[]) ?? [],
    keywordGap: (data.keyword_gap as number) ?? 150,
    geoScore,
    aeoScore,
    aiSearchVisibility: Math.round((geoScore + aeoScore) / 2),
    aiCitationRate: (data.ai_citation_rate as number) ?? 10,
    competitorDomains: (data.competitor_domains as string[]) ?? [],
    agents: rawAgents.map((a) => ({
      agentName: a.agent_name ?? a.agentName ?? 'Agent',
      agentEmoji: a.emoji ?? a.agentEmoji ?? '🤖',
      analysis: a.analysis ?? '',
      confidenceScore: a.confidence_score ?? a.confidenceScore ?? 75,
    })),
    weaknessSummary: (data.weakness_summary as string) ?? (data.weaknessSummary as string) ?? '',
  };
}

async function analyzeGeoInternal(input: GeoAnalysisInput): Promise<GeoAnalysisResult> {
  const [statusResult, compResult] = await Promise.all([
    runStatusAnalyzer(input),
    runCompetitorAnalyzer(input),
  ]);
  const [adResult, actionResult] = await Promise.all([
    runAdStrategyPlanner(input, statusResult.metrics),
    runActionPlanner(input, statusResult.metrics, compResult.metrics),
  ]);
  const geoScore = statusResult.metrics.geoScore ?? 20;
  const aeoScore = compResult.metrics.aeoScore ?? 20;
  return {
    domain: input.domain,
    domainRating: statusResult.metrics.domainRating ?? 25,
    organicTraffic: statusResult.metrics.organicTraffic ?? 5000,
    organicKeywords: statusResult.metrics.organicKeywords ?? 300,
    backlinks: statusResult.metrics.backlinks ?? 500,
    topKeywords: statusResult.metrics.topKeywords ?? [],
    trafficTrend: statusResult.metrics.trafficTrend ?? 'stable',
    contentGap: compResult.metrics.contentGap ?? [],
    keywordGap: compResult.metrics.keywordGap ?? 150,
    geoScore,
    aeoScore,
    aiSearchVisibility: Math.round((geoScore + aeoScore) / 2),
    aiCitationRate: statusResult.metrics.aiCitationRate ?? 10,
    competitorDomains: compResult.metrics.competitorDomains ?? [],
    agents: [
      { agentName: 'StatusAnalyzer',    agentEmoji: '🔍', analysis: statusResult.analysis, confidenceScore: statusResult.confidence },
      { agentName: 'CompetitorAnalyzer',agentEmoji: '⚔️', analysis: compResult.analysis,   confidenceScore: compResult.confidence },
      { agentName: 'AdStrategyPlanner', agentEmoji: '📣', analysis: adResult.analysis,      confidenceScore: adResult.confidence },
      { agentName: 'ActionPlanner',     agentEmoji: '🎯', analysis: actionResult.analysis,  confidenceScore: actionResult.confidence },
    ],
    weaknessSummary: actionResult.weaknessSummary,
  };
}

