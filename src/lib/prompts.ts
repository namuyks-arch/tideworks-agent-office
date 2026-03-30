/**
 * System Prompts & Task-Specific Prompt Builders
 *
 * Contains the four core agent system prompts (Korean) plus composable
 * prompt-builder functions for every pipeline task.
 */

// ---------------------------------------------------------------------------
// Types used by prompt builders
// ---------------------------------------------------------------------------

export interface BrandSEOData {
  domain: string;
  dr?: number;
  traffic?: number;
  backlinks?: number;
  keywords?: string[];
  topPages?: string[];
}

export interface ScoredLead {
  brandName: string;
  domain: string;
  score: number;
  breakdown: {
    seo: number;
    aiSearch: number;
    content: number;
    growth: number;
    fit: number;
  };
  weaknesses: string[];
  summary: string;
}

export interface DiagnosisData {
  brandName: string;
  weaknesses: string[];
  opportunities: string[];
  currentSEO: BrandSEOData;
  competitorGap?: string;
}

export interface ClientData {
  brandName: string;
  domain: string;
  industry: string;
  selectedServices: string[];
  budget: number;
  kpiTargets?: Record<string, string>;
  startDate?: string;
}

export interface DebateRound {
  round: number;
  analystArgument: string;
  strategistArgument: string;
  resolution?: string;
}

export interface PipelineData {
  researcherOutput?: unknown;
  analystOutput?: unknown;
  strategistOutput?: unknown;
  debateHistory?: DebateRound[];
}

// ---------------------------------------------------------------------------
// 1. Agent System Prompts
// ---------------------------------------------------------------------------

export const RESEARCHER_SYSTEM_PROMPT = `당신은 타이드웍스의 리서처입니다. 웹 검색과 Ahrefs SEO 도구를 사용하여 데이터를 수집합니다.

## 역할
- 특정 업종/규모의 브랜드를 웹에서 탐색하고 발굴합니다.
- Ahrefs 도구로 도메인 SEO 현황을 진단합니다: DR(Domain Rating), 월간 오가닉 트래픽, 백링크 수, 주요 키워드 순위.
- 쿠팡/네이버 커머스 현황을 조사합니다: 검색 노출, 리뷰 수, 광고 현황.
- 수집한 데이터를 구조화된 형태로 정리하여 팀(분석가, 전략가)에게 전달합니다.

## 출력 형식
- JSON 출력 요청 시 반드시 순수 JSON만 출력합니다. 마크다운이나 설명 텍스트를 포함하지 않습니다.
- 표 형태 요청 시 마크다운 테이블로 출력합니다.

## 규칙
1. Ahrefs API 호출 실패 시 web_search 도구로 대체 수집하되, 팀에게 "Ahrefs 데이터 아님, 웹 검색 기반 추정치"라고 반드시 표기합니다.
2. 모든 데이터에 출처를 명시합니다 (URL 또는 도구명).
3. 추정치와 실측치를 구분하여 표기합니다.
4. 데이터가 불충분할 경우 "데이터 부족" 표기 후 추가 수집 가능한 방법을 제안합니다.
5. 최신 데이터 우선: 가능한 한 최근 6개월 이내 데이터를 수집합니다.`;

export const ANALYST_SYSTEM_PROMPT = `당신은 타이드웍스의 데이터 분석가입니다. 리서처가 수집한 데이터를 분석하여 인사이트를 도출합니다.

## 역할

### 리드 스코어링 (0-100점)
각 브랜드를 다음 기준으로 정밀 스코어링합니다:
- **SEO 수준 (25%)**: DR, 오가닉 트래픽, 백링크 프로필 품질
- **AI 검색 대응 (25%)**: GEO/AEO 최적화 여부, FAQ 스키마 유무, AI 인용 가능 콘텐츠 존재 여부
- **콘텐츠 품질 (20%)**: 블로그/콘텐츠 허브 존재 여부, 업데이트 빈도, 깊이
- **성장 잠재력 (15%)**: 업종 성장률, 경쟁 강도, 미개척 키워드 기회
- **서비스 적합도 (15%)**: 타이드웍스 서비스와의 핏 (GEO/AEO, 커머스 최적화, SNS)

### 브랜드 약점 진단
- 현재 SEO 전략의 구체적 문제점 파악
- 경쟁사 대비 갭 분석
- 놓치고 있는 키워드/트래픽 기회 식별

### KPI 프레임워크 설계
- 브랜드별 맞춤 KPI 3-5개 제안
- 측정 가능한 구체적 수치 목표 설정

### ROI 추정
- 투자 대비 예상 성과를 보수적으로 추정
- 3개월 / 6개월 / 12개월 시나리오

## 규칙
1. 모든 분석에 데이터 근거를 제시합니다. "감"이 아닌 숫자로 이야기합니다.
2. ROI는 항상 **보수적**으로 추정합니다. 과대 약속은 금지합니다.
3. 전략가와 토론 시 데이터 기반으로 반론합니다. 정성적 주장에는 정량 데이터로 응수합니다.
4. 불확실성이 높은 추정에는 신뢰 구간 또는 범위를 제시합니다.
5. JSON 출력 요청 시 순수 JSON만 출력합니다.`;

export const STRATEGIST_SYSTEM_PROMPT = `당신은 타이드웍스의 영업 전략가입니다. 분석 결과를 바탕으로 브랜드별 맞춤 영업 전략을 수립합니다.

## 역할

### 맞춤 영업포인트 생성
- 각 브랜드의 Pain Point를 정확히 짚는 영업 메시지 작성
- "왜 지금 타이드웍스가 필요한가"를 설득력 있게 구성

### 채널 전략 수립
- **GEO/AEO 전략**: AI 검색 최적화, FAQ 스키마 구축, Entity 최적화, AI 인용 콘텐츠 제작
- **커머스 전략**: 쿠팡/네이버 검색 최적화, 상품 리스팅 개선, 리뷰 전략
- **SNS 전략**: 인플루언서 마케팅, 콘텐츠 전략, 크로스 플랫폼 시너지

### 제안서 작성
타이드웍스 표준 6섹션 제안서 구조:
1. **진단 요약**: 현재 상태와 핵심 문제
2. **기회 분석**: 시장 기회와 성장 잠재력
3. **솔루션 제안**: 타이드웍스 맞춤 서비스
4. **실행 로드맵**: 단계별 실행 계획 (1~6개월)
5. **예상 성과**: KPI 목표와 보수적 ROI
6. **투자 안내**: 비용 구조와 패키지 옵션

### GEO/AEO 콘텐츠 최적화 전략
- ChatGPT, Perplexity, Gemini 등 AI 검색엔진에서 브랜드 인용 극대화
- FAQ 스키마, How-to 스키마 등 구조화 데이터 전략
- Entity 그래프 강화 전략

## 타이드웍스 핵심 서비스
- **GEO/AEO**: FAQ 스키마 구축, AI 인용 콘텐츠 제작, Entity 최적화, 구조화 데이터 마크업
- **커머스 최적화**: 쿠팡/네이버 검색 최적화, 상품 리스팅 SEO, 리뷰 관리
- **SNS 마케팅**: 인플루언서 매칭, 콘텐츠 전략, 크로스 플랫폼 캠페인

## 규칙
1. 브랜드마다 반드시 차별화된 전략을 제시합니다. 복사+붙여넣기 전략은 금지합니다.
2. 분석가와 토론 시 시장 트렌드, 경쟁 환경, 성장 관점에서 주장합니다.
3. 제안서는 반드시 타이드웍스 표준 6섹션 구조를 따릅니다.
4. 전문 용어는 고객이 이해할 수 있도록 쉽게 풀어 설명합니다.
5. JSON 출력 요청 시 순수 JSON만 출력합니다.`;

export const MANAGER_SYSTEM_PROMPT = `당신은 타이드웍스의 세일즈매니저입니다. 팀(리서처, 분석가, 전략가)을 이끌고, 라우터(통합자) 역할을 겸합니다.

## 역할

### 오케스트레이션
- 파이프라인 각 단계에서 적절한 팀원에게 작업을 배분합니다.
- 진행 상황을 모니터링하고, 병목이나 오류 발생 시 대응합니다.
- 각 단계의 산출물을 검증하고 다음 단계로 전달합니다.

### 토론 중재
- 분석가와 전략가 사이의 토론(최대 3라운드)을 중재합니다.
- 양측 주장의 타당성을 평가하고 최선의 결론을 도출합니다.
- 합의가 안 되면 매니저가 최종 판단합니다.

### 최종 통합
- 모든 팀원의 산출물을 통합하여 최종 보고서/제안서를 완성합니다.
- 일관성, 논리적 흐름, 데이터 정합성을 검증합니다.

### MCP 연동
- Linear: 작업 생성/업데이트
- Notion: 브랜드 DB 저장, 제안서 저장
- Gmail: 제안서 발송 초안 작성
- Calendar: 미팅 일정 제안

## 규칙
1. 작업 배분 시 각 팀원의 역할과 기대 산출물을 명확히 안내합니다.
2. 토론 결과를 반드시 최종 산출물에 반영합니다.
3. 고객에게 발송하는 자료(이메일, 제안서)는 반드시 사람의 확인을 받은 후 발송합니다. 자동 발송 금지.
4. MCP 도구 호출 실패 시 텍스트 형태로 동일한 내용을 출력하여 대체합니다.
5. JSON 출력 요청 시 순수 JSON만 출력합니다.
6. 파이프라인 진행 상황을 SSE로 실시간 보고합니다.`;

// ---------------------------------------------------------------------------
// 2. Task-Specific Prompt Builders
// ---------------------------------------------------------------------------

/**
 * Build prompt for brand discovery search.
 */
export function buildBrandSearchPrompt(
  industry: string,
  size: string,
  region: string,
): string {
  return `## 브랜드 탐색 작업

다음 조건에 맞는 브랜드를 최대 10개 찾아주세요.

### 검색 조건
- **업종**: ${industry}
- **규모**: ${size}
- **지역**: ${region}

### 수집 항목 (브랜드별)
1. 브랜드명, 공식 웹사이트 URL
2. 업종 세부 카테고리
3. 추정 규모 (직원 수, 매출 등)
4. 주요 제품/서비스
5. 온라인 마케팅 현황 요약 (SNS 채널, 블로그 유무, 광고 집행 여부)

### 출력 형식
JSON 배열로 출력하세요:
\`\`\`json
[
  {
    "brandName": "브랜드명",
    "domain": "example.com",
    "industry": "세부 업종",
    "estimatedSize": "중소기업 / 중견기업 / 대기업",
    "products": ["주요 제품1", "주요 제품2"],
    "onlinePresence": {
      "website": true,
      "blog": false,
      "sns": ["instagram", "youtube"],
      "advertising": "네이버 SA 집행 중"
    },
    "source": "출처 URL"
  }
]
\`\`\``;
}

/**
 * Build prompt for SEO analysis of a specific domain.
 */
export function buildSEOAnalysisPrompt(domain: string): string {
  return `## SEO 분석 작업

다음 도메인의 SEO 현황을 종합 분석해주세요.

### 대상 도메인
${domain}

### 분석 항목
1. **기본 지표**: DR (Domain Rating), 월간 오가닉 트래픽 추정치, 총 백링크 수
2. **키워드 현황**: 상위 랭킹 키워드 10개, 키워드 트렌드 (상승/하락)
3. **백링크 프로필**: 주요 참조 도메인, 백링크 품질 (스팸 비율)
4. **콘텐츠 분석**: 상위 페이지 5개, 콘텐츠 유형 (블로그/제품/랜딩)
5. **기술 SEO**: 사이트 속도 (추정), HTTPS 여부, 모바일 최적화 여부
6. **AI 검색 대응**: FAQ 스키마 유무, 구조화 데이터 마크업, AI 인용 가능 콘텐츠

### 출력 형식
JSON으로 출력하세요:
\`\`\`json
{
  "domain": "${domain}",
  "metrics": {
    "dr": 0,
    "monthlyTraffic": 0,
    "totalBacklinks": 0,
    "referringDomains": 0
  },
  "topKeywords": [
    { "keyword": "", "position": 0, "volume": 0, "trend": "up|down|stable" }
  ],
  "topPages": [
    { "url": "", "traffic": 0, "keywords": 0 }
  ],
  "backlinkProfile": {
    "quality": "high|medium|low",
    "spamPercentage": 0,
    "topReferrers": [""]
  },
  "technicalSEO": {
    "https": true,
    "mobileOptimized": true,
    "estimatedSpeedScore": 0
  },
  "aiSearchReadiness": {
    "faqSchema": false,
    "structuredData": false,
    "aiCitableContent": false,
    "overallScore": 0
  },
  "dataSource": "ahrefs|web_search_estimate"
}
\`\`\``;
}

/**
 * Build prompt for lead scoring.
 */
export function buildScoringPrompt(
  brands: { brandName: string; domain: string }[],
  seoData: BrandSEOData[],
): string {
  return `## 리드 스코어링 작업

다음 브랜드들을 타이드웍스 리드 스코어링 기준에 따라 점수를 매기세요.

### 스코어링 기준 (총 100점)
- **SEO 수준 (25점)**: DR, 오가닉 트래픽, 백링크 프로필 품질
- **AI 검색 대응 (25점)**: GEO/AEO 최적화 여부, FAQ 스키마 유무, AI 인용 가능 콘텐츠
- **콘텐츠 품질 (20점)**: 블로그/콘텐츠 허브, 업데이트 빈도
- **성장 잠재력 (15점)**: 업종 성장률, 경쟁 강도, 미개척 키워드 기회
- **서비스 적합도 (15점)**: 타이드웍스 서비스 (GEO/AEO, 커머스, SNS)와의 핏

### 분석 대상 브랜드
${JSON.stringify(brands, null, 2)}

### SEO 데이터
${JSON.stringify(seoData, null, 2)}

### 출력 형식
JSON 배열로 출력하세요. 점수가 높은 순서로 정렬:
\`\`\`json
[
  {
    "brandName": "",
    "domain": "",
    "score": 0,
    "breakdown": {
      "seo": 0,
      "aiSearch": 0,
      "content": 0,
      "growth": 0,
      "fit": 0
    },
    "tier": "A|B|C",
    "weaknesses": ["구체적 약점 1", "구체적 약점 2"],
    "opportunities": ["기회 1", "기회 2"],
    "summary": "한 줄 요약"
  }
]
\`\`\`

### 티어 기준
- **A 티어 (80-100점)**: 즉시 영업 대상. 서비스 니즈가 명확하고 예산 여력 추정
- **B 티어 (60-79점)**: 육성 대상. 잠재력 높으나 추가 교육/설득 필요
- **C 티어 (40-59점)**: 관찰 대상. 현재는 니즈 낮으나 중장기적 가능성`;
}

/**
 * Build prompt for generating sales points per lead.
 */
export function buildSalesPointPrompt(scoredLeads: ScoredLead[]): string {
  return `## 영업포인트 생성 작업

스코어링된 리드를 바탕으로 각 브랜드별 맞춤 영업포인트를 생성하세요.

### 스코어링 결과
${JSON.stringify(scoredLeads, null, 2)}

### 생성 항목 (브랜드별)
1. **핵심 Pain Point**: 브랜드가 현재 겪고 있을 가장 큰 문제 1개
2. **영업 훅(Hook)**: 첫 연락 시 주의를 끌 수 있는 한 문장
3. **추천 서비스 조합**: 타이드웍스 서비스 중 이 브랜드에 가장 적합한 서비스 2-3개
4. **예상 ROI 시나리오**: 보수적 추정 기반 3/6/12개월 예상 성과
5. **경쟁사 대비 차별점**: 왜 타이드웍스를 선택해야 하는지 2-3가지

### 출력 형식
JSON 배열로 출력하세요:
\`\`\`json
[
  {
    "brandName": "",
    "painPoint": "",
    "salesHook": "",
    "recommendedServices": [
      { "service": "GEO/AEO 최적화", "reason": "선택 이유", "priority": 1 }
    ],
    "roiScenario": {
      "month3": { "metric": "", "expected": "" },
      "month6": { "metric": "", "expected": "" },
      "month12": { "metric": "", "expected": "" }
    },
    "differentiators": ["차별점 1", "차별점 2"],
    "approachStrategy": "콜드이메일|LinkedIn|직접방문|웨비나초대",
    "urgencyTrigger": "왜 지금 시작해야 하는지"
  }
]
\`\`\``;
}

/**
 * Build prompt for analyst-strategist debate.
 */
export function buildDebatePrompt(
  topic: string,
  previousRounds: DebateRound[],
): string {
  const roundHistory =
    previousRounds.length > 0
      ? `### 이전 토론 내용\n${previousRounds
          .map(
            (r) =>
              `**[라운드 ${r.round}]**\n- 분석가: ${r.analystArgument}\n- 전략가: ${r.strategistArgument}${r.resolution ? `\n- 합의: ${r.resolution}` : ""}`,
          )
          .join("\n\n")}\n\n`
      : "";

  return `## 토론 작업

분석가와 전략가가 다음 주제에 대해 토론합니다.

### 토론 주제
${topic}

${roundHistory}### 토론 규칙
1. 최대 3라운드 진행합니다.
2. 각 라운드에서 분석가는 데이터 기반 주장, 전략가는 시장/전략 관점 주장을 합니다.
3. 합의에 도달하면 즉시 종료합니다.
4. 3라운드까지 합의 불가 시, 매니저가 최종 판단합니다.

### 현재 라운드
${previousRounds.length + 1}/3

### 출력 형식
JSON으로 출력하세요:
\`\`\`json
{
  "round": ${previousRounds.length + 1},
  "analystArgument": "데이터 기반 주장...",
  "strategistArgument": "전략/시장 관점 주장...",
  "consensusReached": true|false,
  "resolution": "합의 내용 (합의 시에만)",
  "nextAction": "proceed_to_next_round|consensus_reached|manager_decision"
}
\`\`\``;
}

/**
 * Build prompt for proposal generation.
 */
export function buildProposalPrompt(
  diagnosis: DiagnosisData,
  seoData: BrandSEOData,
  budget: number,
): string {
  return `## 제안서 작성 작업

다음 진단 결과와 SEO 데이터를 바탕으로 타이드웍스 표준 6섹션 제안서를 작성하세요.

### 브랜드 진단 결과
${JSON.stringify(diagnosis, null, 2)}

### SEO 데이터
${JSON.stringify(seoData, null, 2)}

### 예상 월 예산
${budget.toLocaleString()}원

### 제안서 구조 (6섹션)

\`\`\`json
{
  "proposalTitle": "[브랜드명] 디지털 마케팅 성장 전략 제안서",
  "createdAt": "YYYY-MM-DD",
  "sections": {
    "diagnosis": {
      "title": "1. 진단 요약",
      "currentState": "현재 상태 분석...",
      "coreProblems": ["핵심 문제 1", "핵심 문제 2", "핵심 문제 3"],
      "competitorGap": "경쟁사 대비 격차 분석..."
    },
    "opportunity": {
      "title": "2. 기회 분석",
      "marketOpportunity": "시장 기회...",
      "growthPotential": "성장 잠재력...",
      "untappedKeywords": ["미개척 키워드 1", "미개척 키워드 2"]
    },
    "solution": {
      "title": "3. 솔루션 제안",
      "services": [
        {
          "name": "서비스명",
          "description": "설명",
          "expectedImpact": "기대 효과"
        }
      ]
    },
    "roadmap": {
      "title": "4. 실행 로드맵",
      "phases": [
        {
          "phase": "1단계 (1-2개월)",
          "focus": "핵심 포커스",
          "tasks": ["태스크 1", "태스크 2"],
          "milestone": "마일스톤"
        }
      ]
    },
    "expectedResults": {
      "title": "5. 예상 성과",
      "kpis": [
        {
          "metric": "KPI명",
          "current": "현재 값",
          "target3m": "3개월 목표",
          "target6m": "6개월 목표",
          "target12m": "12개월 목표"
        }
      ],
      "roiEstimate": "보수적 ROI 추정..."
    },
    "investment": {
      "title": "6. 투자 안내",
      "monthlyBudget": ${budget},
      "packages": [
        {
          "name": "패키지명",
          "price": 0,
          "includes": ["포함 항목 1", "포함 항목 2"]
        }
      ],
      "paymentTerms": "결제 조건..."
    }
  }
}
\`\`\`

### 규칙
1. 모든 수치는 보수적으로 추정하세요.
2. 전문 용어는 고객이 이해할 수 있도록 쉽게 풀어 설명하세요.
3. 브랜드의 구체적 상황에 맞춘 맞춤형 내용을 작성하세요.
4. 예산에 맞는 현실적인 서비스 조합을 제안하세요.`;
}

/**
 * Build prompt for final integration of all pipeline outputs.
 */
export function buildIntegrationPrompt(allData: PipelineData): string {
  return `## 최종 통합 작업

파이프라인의 모든 산출물을 통합하여 최종 보고서를 작성하세요.

### 수집된 데이터

#### 리서처 산출물
${JSON.stringify(allData.researcherOutput ?? "데이터 없음", null, 2)}

#### 분석가 산출물
${JSON.stringify(allData.analystOutput ?? "데이터 없음", null, 2)}

#### 전략가 산출물
${JSON.stringify(allData.strategistOutput ?? "데이터 없음", null, 2)}

#### 토론 기록
${JSON.stringify(allData.debateHistory ?? [], null, 2)}

### 통합 규칙
1. 모든 팀원의 인사이트를 빠짐없이 반영합니다.
2. 토론에서 도출된 합의/결론을 최종 전략에 반영합니다.
3. 데이터 간 모순이 있으면 해결하고 일관된 내러티브를 만듭니다.
4. 실행 가능성과 우선순위를 고려하여 최종 권고안을 정리합니다.

### 출력 형식
JSON으로 출력하세요:
\`\`\`json
{
  "reportTitle": "최종 통합 보고서",
  "executiveSummary": "경영진 요약 (3-5문장)...",
  "brandsAnalyzed": 0,
  "topLeads": [
    {
      "brandName": "",
      "score": 0,
      "tier": "A|B|C",
      "primaryStrategy": "핵심 전략...",
      "nextAction": "다음 액션..."
    }
  ],
  "keyInsights": ["핵심 인사이트 1", "핵심 인사이트 2"],
  "debateConclusions": ["토론 결론 1", "토론 결론 2"],
  "recommendations": [
    {
      "priority": 1,
      "action": "권고 액션",
      "responsible": "담당자/팀",
      "deadline": "기한",
      "expectedImpact": "기대 효과"
    }
  ],
  "mcpActions": {
    "linear": [{ "type": "create_task", "title": "", "description": "" }],
    "notion": [{ "type": "update_db", "database": "", "data": {} }],
    "gmail": [{ "type": "draft_email", "to": "", "subject": "", "bodyPreview": "" }],
    "calendar": [{ "type": "suggest_meeting", "title": "", "suggestedDate": "" }]
  }
}
\`\`\``;
}

/**
 * Build prompt for client onboarding plan.
 */
export function buildOnboardPlanPrompt(clientData: ClientData): string {
  return `## 온보딩 계획 수립 작업

새 클라이언트의 온보딩 계획을 수립하세요.

### 클라이언트 정보
${JSON.stringify(clientData, null, 2)}

### 온보딩 계획 요구사항
1. **킥오프 미팅 안건**: 첫 미팅에서 다룰 내용
2. **초기 진단 항목**: 온보딩 후 즉시 수행할 분석/진단
3. **30일 액션플랜**: 첫 한 달간의 세부 실행 계획
4. **KPI 설정**: 성과 측정 기준과 목표치
5. **커뮤니케이션 계획**: 보고 주기, 채널, 담당자

### 출력 형식
JSON으로 출력하세요:
\`\`\`json
{
  "clientName": "${clientData.brandName}",
  "onboardingPlan": {
    "kickoff": {
      "suggestedDate": "YYYY-MM-DD",
      "duration": "60분",
      "agenda": [
        { "item": "안건 1", "duration": "10분", "owner": "담당자" }
      ],
      "preMeetingTasks": ["사전 준비 1", "사전 준비 2"]
    },
    "initialDiagnosis": {
      "tasks": [
        {
          "task": "진단 항목",
          "tool": "사용 도구",
          "deadline": "D+N일",
          "deliverable": "산출물"
        }
      ]
    },
    "thirtyDayPlan": {
      "week1": { "focus": "주간 포커스", "tasks": ["태스크 1"] },
      "week2": { "focus": "주간 포커스", "tasks": ["태스크 1"] },
      "week3": { "focus": "주간 포커스", "tasks": ["태스크 1"] },
      "week4": { "focus": "주간 포커스", "tasks": ["태스크 1"] }
    },
    "kpiFramework": [
      {
        "metric": "KPI명",
        "baseline": "현재 값",
        "target30d": "30일 목표",
        "target90d": "90일 목표",
        "measurementMethod": "측정 방법"
      }
    ],
    "communicationPlan": {
      "reportingCadence": "주간|격주|월간",
      "channels": ["Slack", "Email", "Notion"],
      "escalationProcess": "에스컬레이션 절차...",
      "keyContacts": [
        { "role": "역할", "name": "이름 (TBD)", "responsibility": "담당 업무" }
      ]
    }
  }
}
\`\`\`

### 규칙
1. 선택된 서비스(${clientData.selectedServices.join(", ")})에 맞춘 현실적 계획을 수립하세요.
2. 예산(월 ${clientData.budget.toLocaleString()}원)에 맞는 리소스 배분을 고려하세요.
3. 첫 30일의 Quick Win을 포함하여 클라이언트의 신뢰를 확보하세요.
4. 모든 일정은 ${clientData.startDate ?? "계약일"} 기준으로 산정하세요.`;
}
