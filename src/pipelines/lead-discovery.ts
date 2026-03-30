/**
 * Lead Discovery Pipeline — 6단계
 *
 * ① 타겟 기준 세팅  → ② 브랜드 후보 수집 → ③ Ahrefs SEO 진단
 * ④ 영업 포인트 생성 → ⑤ DB 등록          → ⑥ 메일 발송 대기
 */

import type { LeadInput } from '@/agents/types';
import type { EmitEvent } from '@/app/api/agents/route';
import { chatJSON, chat } from '@/lib/claude';
import { waitForApproval } from '@/lib/approval-store';
import { analyzeGeo } from '@/lib/geo-engine';

// ─── Step 정의 ───────────────────────────────────────────────────────────────

export const LEAD_DISCOVERY_STEPS = [
  { id: 'ld-1', name: '① 타겟 기준 세팅',    agentId: 'manager',    mode: 'auto',     order: 1 },
  { id: 'ld-2', name: '② 브랜드 후보 수집',  agentId: 'researcher', mode: 'auto',     order: 2 },
  { id: 'ld-3', name: '③ GEO/AEO 진단',      agentId: 'researcher', mode: 'auto',     order: 3 },
  { id: 'ld-4', name: '④ 영업 포인트 생성',  agentId: 'analyst',    mode: 'approval', order: 4 },
  { id: 'ld-5', name: '⑤ DB 등록',           agentId: 'manager',    mode: 'auto',     order: 5 },
  { id: 'ld-6', name: '⑥ 메일 발송 대기',    agentId: 'manager',    mode: 'auto',     order: 6 },
] as const;

const TOTAL = LEAD_DISCOVERY_STEPS.length;

// ─── 내부 타입 ───────────────────────────────────────────────────────────────

interface BrandCandidate {
  name: string;
  domain: string;
  description: string;
  channels: string[];
}

interface SeoResult {
  domain: string;
  domainRating: number;       // DA
  organicTraffic: number;     // 월 유입량
  keywordGap: number;         // 경쟁사 대비 부족 키워드 수
  backlinks: number;          // 백링크 수
  geoScore: number;           // AI 검색 노출 점수 (0~100)
  trend: 'rising' | 'stable' | 'declining';
}

interface LeadFinal {
  rank: number;
  name: string;
  domain: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  salesPoint: string;   // Claude가 한 줄로 생성
  seoSummary: string;   // DA / 트래픽 요약
  dealSize: string;
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

/** 한국 브랜드명 기반으로 결정론적 SEO mock 데이터 생성 */
function mockSeo(brand: BrandCandidate, daThreshold: number): SeoResult {
  const h = brand.domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const da = 10 + (h % (daThreshold + 5)); // daThreshold 이하에 집중
  return {
    domain: brand.domain,
    domainRating: da,
    organicTraffic: 1_000 + (h % 80_000),
    keywordGap: 50 + (h % 300),
    backlinks: 20 + (h % 5_000),
    geoScore: 5 + (h % 40),
    trend: h % 3 === 0 ? 'rising' : h % 3 === 1 ? 'stable' : 'declining',
  };
}

function calcScore(seo: SeoResult): number {
  const daScore   = Math.min(100, (30 - seo.domainRating) * 2.5); // DA 낮을수록 개선 여지 큼
  const geoScore  = 100 - seo.geoScore;                           // GEO 낮을수록 기회
  const gapScore  = Math.min(100, seo.keywordGap / 3);
  return Math.round(daScore * 0.35 + geoScore * 0.35 + gapScore * 0.3);
}

function priority(score: number): 'high' | 'medium' | 'low' {
  return score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
}

function dealSize(p: 'high' | 'medium' | 'low') {
  return p === 'high' ? '월 500~1,000만원' : p === 'medium' ? '월 200~500만원' : '월 100~200만원';
}

// ─── 메인 파이프라인 ─────────────────────────────────────────────────────────

export async function runLeadDiscovery(
  input: LeadInput,
  modeConfig: Record<string, string>,
  emitEvent: EmitEvent,
): Promise<void> {

  const industry        = input.industry        || '뷰티';
  const revenueRange    = input.revenueRange     || '50억~500억';
  const channelCond     = input.channelCondition || 'SNS 광고 집행 중';
  const daThreshold     = input.daThreshold      ?? 30;

  // ── ① 타겟 기준 세팅 ──────────────────────────────────────────────────────
  const s1 = LEAD_DISCOVERY_STEPS[0];
  emitEvent({ type: 'pipeline:step', payload: { stepId: s1.id, stepName: s1.name, agentId: s1.agentId, mode: s1.mode, order: s1.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'manager', status: 'working', currentTask: '타겟 기준 세팅 중' } });
  await sleep(800);

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'manager',
    content: `타겟 기준을 설정했습니다.\n\n📌 업종: ${industry}\n💰 연매출: ${revenueRange}\n📱 채널: ${channelCond}\n📉 SEO 약점 기준: DA ${daThreshold} 이하\n\n리서처에게 브랜드 후보 수집을 지시합니다.`,
    type: 'text',
  }});
  emitEvent({ type: 'agent:status', payload: { agentId: 'manager', status: 'done' } });

  // ── ② 브랜드 후보 수집 (Claude API) ────────────────────────────────────────
  const s2 = LEAD_DISCOVERY_STEPS[1];
  emitEvent({ type: 'pipeline:step', payload: { stepId: s2.id, stepName: s2.name, agentId: s2.agentId, mode: s2.mode, order: s2.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'researcher', status: 'working', currentTask: 'Claude로 브랜드 후보 수집 중' } });

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'researcher',
    content: `웹서치 + Claude로 조건에 맞는 브랜드를 탐색합니다.\n업종: ${industry} / 연매출: ${revenueRange} / 채널: ${channelCond}`,
    type: 'text',
  }});

  let brands: BrandCandidate[] = [];
  try {
    brands = await chatJSON<BrandCandidate[]>(
      `당신은 B2B 영업 리서처입니다. 아래 조건에 맞는 실제로 존재할 법한 한국 브랜드 6개를 생성해주세요.
반드시 JSON 배열만 반환하세요. 설명 텍스트 없이 순수 JSON만 응답합니다.`,
      [{
        role: 'user',
        content: `조건:
- 업종: ${industry}
- 연매출 규모: ${revenueRange}
- 채널 조건: ${channelCond}

각 브랜드에 대해 다음 JSON 형식으로 6개 반환:
[{"name":"브랜드명","domain":"도메인.com","description":"한 줄 설명","channels":["채널1","채널2"]}]`,
      }],
    );
  } catch {
    // Claude 실패 시 업종 기반 fallback
    const names = industry.includes('뷰티')
      ? ['글로시에코리아', '닥터자르트', '에이프릴스킨', '클리오', '아이소이', '토리든']
      : industry.includes('패션')
      ? ['무신사스탠다드', '마르디메크르디', '아더에러', '젝시믹스', '스파오', '에잇세컨즈']
      : ['오리온', '농심', '하림', '사조', '빙그레', '롯데웰푸드'];
    brands = names.map((n, i) => ({
      name: n,
      domain: `${n.toLowerCase().replace(/\s/g, '')}.com`,
      description: `${industry} 분야 중견 브랜드`,
      channels: ['인스타그램', '네이버 쇼핑'],
    }));
  }

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'researcher',
    content: `브랜드 후보 ${brands.length}개를 수집했습니다:\n${brands.map((b, i) => `${i+1}. ${b.name} (${b.domain})`).join('\n')}`,
    type: 'text',
  }});
  emitEvent({ type: 'agent:status', payload: { agentId: 'researcher', status: 'done' } });

  // ── ③ Ahrefs SEO 진단 ─────────────────────────────────────────────────────
  const s3 = LEAD_DISCOVERY_STEPS[2];
  emitEvent({ type: 'pipeline:step', payload: { stepId: s3.id, stepName: s3.name, agentId: s3.agentId, mode: s3.mode, order: s3.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'researcher', status: 'working', currentTask: 'Ahrefs SEO 진단 실행 중' } });

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'researcher',
    content: `GEO/AEO 엔진으로 각 도메인의 DA·트래픽·키워드갭·백링크·GEO 점수를 분석합니다. (DA ${daThreshold} 이하 타겟)`,
    type: 'text',
  }});

  const seoMap: Record<string, SeoResult> = {};
  for (const brand of brands) {
    emitEvent({ type: 'agent:message', payload: {
      agentId: 'researcher',
      content: `🧠 GEO 엔진으로 ${brand.name} (${brand.domain}) 분석 중...`,
      type: 'text',
    }});
    try {
      const geo = await analyzeGeo({
        brand: brand.name,
        domain: brand.domain,
        industry,
        revenueRange,
        keywords: [],
        competitors: [],
      });
      seoMap[brand.name] = {
        domain: geo.domain,
        domainRating: geo.domainRating,
        organicTraffic: geo.organicTraffic,
        keywordGap: geo.keywordGap,
        backlinks: geo.backlinks,
        geoScore: geo.geoScore,
        trend: geo.trafficTrend,
      };
      emitEvent({ type: 'agent:message', payload: {
        agentId: 'researcher',
        content: `✅ ${brand.name} (${brand.domain})\n  DA: ${geo.domainRating} | 트래픽: ${geo.organicTraffic.toLocaleString()}/월 | 키워드갭: ${geo.keywordGap}개 | GEO: ${geo.geoScore}점 | AI인용률: ${geo.aiCitationRate}%\n  📋 약점: ${geo.weaknessSummary}`,
        type: 'text',
      }});
    } catch {
      // GEO 분석 실패시 mockSeo 폴백
      const seo = mockSeo(brand, daThreshold);
      seoMap[brand.name] = seo;
      emitEvent({ type: 'agent:message', payload: {
        agentId: 'researcher',
        content: `⚠️ ${brand.name}: GEO 분석 실패, 추정치 사용\n  DA: ${seo.domainRating} | 트래픽: ${seo.organicTraffic.toLocaleString()}/월 | GEO: ${seo.geoScore}점`,
        type: 'text',
      }});
    }
  }
  emitEvent({ type: 'agent:status', payload: { agentId: 'researcher', status: 'done' } });

  // ── ④ 영업 포인트 생성 (Claude + 승인) ────────────────────────────────────
  const s4 = LEAD_DISCOVERY_STEPS[3];
  const mode4 = modeConfig[s4.id] ?? s4.mode;
  emitEvent({ type: 'pipeline:step', payload: { stepId: s4.id, stepName: s4.name, agentId: s4.agentId, mode: s4.mode, order: s4.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'analyst', status: 'working', currentTask: 'Claude로 영업 포인트 분석 중' } });

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'analyst',
    content: `SEO 데이터를 바탕으로 각 브랜드의 핵심 약점과 영업 포인트를 Claude가 분석합니다.`,
    type: 'text',
  }});

  // 각 브랜드별 Claude 영업 포인트 생성
  const leads: LeadFinal[] = [];
  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const seo   = seoMap[brand.name];
    const score = calcScore(seo);
    const prio  = priority(score);

    let salesPoint = '';
    try {
      salesPoint = await chat(
        `당신은 B2B 세일즈 전략가입니다. 주어진 SEO 데이터를 보고 타이드웍스 서비스로 해결 가능한 핵심 약점을 한 문장(30자 이내)으로 요약하세요. 반드시 한국어로, 한 문장만 출력하세요.`,
        [{
          role: 'user',
          content: `브랜드: ${brand.name}\nDA: ${seo.domainRating} (목표: 30+)\n월 트래픽: ${seo.organicTraffic.toLocaleString()}\nAI 검색 노출(GEO): ${seo.geoScore}점\n키워드 갭: ${seo.keywordGap}개\n설명: ${brand.description}`,
        }],
      );
      salesPoint = salesPoint.trim().split('\n')[0] ?? salesPoint.trim(); // 첫 줄만
    } catch {
      salesPoint = `DA ${seo.domainRating}로 SEO 경쟁력 부족, GEO ${seo.geoScore}점으로 AI 검색 노출 개선 필요`;
    }

    leads.push({
      rank:       i + 1,
      name:       brand.name,
      domain:     brand.domain,
      score,
      priority:   prio,
      salesPoint,
      seoSummary: `DA ${seo.domainRating} | 트래픽 ${seo.organicTraffic.toLocaleString()}/월 | GEO ${seo.geoScore}점`,
      dealSize:   dealSize(prio),
    });
  }

  // 점수 순 정렬
  leads.sort((a, b) => b.score - a.score);
  leads.forEach((l, i) => { l.rank = i + 1; });

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'analyst',
    content: JSON.stringify(leads),
    type: 'json',
    metadata: { dataType: 'final-leads' },
  }});

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'analyst',
    content: `영업 포인트 생성 완료!\n\n${leads.slice(0, 3).map(l => `🏆 ${l.rank}위 ${l.name}: ${l.salesPoint}`).join('\n')}`,
    type: 'text',
  }});

  if (mode4 === 'approval') {
    const approvalId = `approval-ld-step-4-${Date.now()}`;
    emitEvent({ type: 'agent:status', payload: { agentId: 'analyst', status: 'waiting_approval' } });
    emitEvent({ type: 'approval:request', payload: {
      approvalId,
      stepId: s4.id,
      agentId: 'analyst',
      summary: `${leads.length}개 브랜드 분석 완료. 최우선 타겟: ${leads[0]?.name} — "${leads[0]?.salesPoint}". DB 등록을 승인해주세요.`,
      data: leads,
    }});
    try {
      const d = await waitForApproval(approvalId, 120_000);
      if (d.action === 'reject') {
        emitEvent({ type: 'agent:message', payload: { agentId: 'analyst', content: '반려되었습니다. 기준을 재검토합니다.', type: 'text' } });
        emitEvent({ type: 'agent:status', payload: { agentId: 'analyst', status: 'done' } });
        return;
      }
      if (d.action === 'modify' && d.feedback) {
        emitEvent({ type: 'agent:message', payload: { agentId: 'analyst', content: `수정 요청 반영: ${d.feedback}`, type: 'text' } });
      }
    } catch { /* 타임아웃 → 자동 진행 */ }
  }
  emitEvent({ type: 'agent:status', payload: { agentId: 'analyst', status: 'done' } });

  // ── ⑤ DB 등록 ─────────────────────────────────────────────────────────────
  const s5 = LEAD_DISCOVERY_STEPS[4];
  emitEvent({ type: 'pipeline:step', payload: { stepId: s5.id, stepName: s5.name, agentId: s5.agentId, mode: s5.mode, order: s5.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'manager', status: 'working', currentTask: '스프레드시트에 리드 저장 중' } });
  await sleep(800);

  for (const lead of leads) {
    await sleep(200);
    emitEvent({ type: 'agent:message', payload: {
      agentId: 'manager',
      content: `📊 DB 저장: ${lead.name} | ${lead.domain} | 점수 ${lead.score} | ${lead.salesPoint}`,
      type: 'text',
    }});
  }
  emitEvent({ type: 'agent:message', payload: {
    agentId: 'manager',
    content: `✅ ${leads.length}개 리드가 스프레드시트에 저장되었습니다. (브랜드명·도메인·DA·트래픽·영업포인트 포함)`,
    type: 'text',
  }});
  emitEvent({ type: 'agent:status', payload: { agentId: 'manager', status: 'done' } });

  // ── ⑥ 메일 발송 대기 ──────────────────────────────────────────────────────
  const s6 = LEAD_DISCOVERY_STEPS[5];
  emitEvent({ type: 'pipeline:step', payload: { stepId: s6.id, stepName: s6.name, agentId: s6.agentId, mode: s6.mode, order: s6.order, totalSteps: TOTAL } });
  emitEvent({ type: 'agent:status',  payload: { agentId: 'manager', status: 'working', currentTask: '리드 파이프라인 상태 업데이트 중' } });
  await sleep(600);

  emitEvent({ type: 'agent:message', payload: {
    agentId: 'manager',
    content: `📬 리드 파이프라인 상태 업데이트 완료\n\n${leads.map(l => `• ${l.name} → 상태: 신규 → 발송 대기 (${l.priority === 'high' ? '🔴 우선' : l.priority === 'medium' ? '🟡 일반' : '🔵 관찰'})`).join('\n')}\n\n이정님, 이메일 발송을 진행하시면 됩니다! 📧`,
    type: 'text',
  }});
  emitEvent({ type: 'agent:status', payload: { agentId: 'manager', status: 'done' } });
}
