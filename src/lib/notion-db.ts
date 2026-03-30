// src/lib/notion-db.ts
// Notion API를 통한 리드 DB 저장

export interface LeadRecord {
  rank: number;
  name: string;
  domain: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  salesPoint: string;
  seoSummary: string;
  dealSize: string;
  industry: string;
}

const NOTION_API_KEY     = process.env.NOTION_API_KEY ?? '';
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID ?? '';
const NOTION_API_BASE    = 'https://api.notion.com/v1';

const notionHeaders = () => ({
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28',
});

/** DB 스키마 자동 초기화 (필요한 컬럼이 없으면 추가) */
async function ensureSchema(): Promise<void> {
  const res = await fetch(`${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}`, {
    headers: notionHeaders(),
  });
  if (!res.ok) return;
  const db = await res.json() as { properties: Record<string, unknown> };
  const existing = Object.keys(db.properties);

  // 추가가 필요한 컬럼 정의
  const needed: Record<string, unknown> = {};
  if (!existing.includes('도메인'))        needed['도메인']        = { url: {} };
  if (!existing.includes('점수'))          needed['점수']          = { number: {} };
  if (!existing.includes('우선순위'))      needed['우선순위']      = { select: { options: [{ name: '높음', color: 'red' }, { name: '중간', color: 'yellow' }, { name: '낮음', color: 'blue' }] } };
  if (!existing.includes('영업 포인트'))   needed['영업 포인트']   = { rich_text: {} };
  if (!existing.includes('SEO 요약'))      needed['SEO 요약']      = { rich_text: {} };
  if (!existing.includes('예상 딜 사이즈')) needed['예상 딜 사이즈'] = { rich_text: {} };
  if (!existing.includes('업종'))          needed['업종']          = { rich_text: {} };
  if (!existing.includes('상태'))          needed['상태']          = { select: { options: [{ name: '신규', color: 'blue' }, { name: '연락 중', color: 'yellow' }, { name: '미팅', color: 'orange' }, { name: '계약', color: 'green' }] } };
  if (!existing.includes('등록일'))        needed['등록일']        = { date: {} };

  // 기존 title 컬럼명이 '이름'이면 '브랜드명'으로 변경
  const titleKey = Object.entries(db.properties as Record<string, { type: string }>).find(([, v]) => v.type === 'title')?.[0];
  if (titleKey && titleKey !== '브랜드명') {
    needed['브랜드명'] = { name: '브랜드명' };
    await fetch(`${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}/properties/${encodeURIComponent(titleKey)}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({ name: '브랜드명' }),
    });
  }

  if (Object.keys(needed).length === 0) return;
  await fetch(`${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ properties: needed }),
  });
}

let schemaReady = false;

/** Notion DB에 리드 카드 1개 저장 */
export async function saveLeadToNotion(lead: LeadRecord): Promise<{ success: boolean; pageId?: string; error?: string }> {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return { success: false, error: 'NOTION_API_KEY 또는 NOTION_DATABASE_ID가 설정되지 않았습니다.' };
  }

  // 처음 호출 시 스키마 자동 생성
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }

  const body = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      '브랜드명': {
        title: [{ text: { content: lead.name } }],
      },
      '도메인': {
        url: `https://${lead.domain}`,
      },
      '점수': {
        number: lead.score,
      },
      '우선순위': {
        select: {
          name: lead.priority === 'high' ? '높음' : lead.priority === 'medium' ? '중간' : '낮음',
        },
      },
      '영업 포인트': {
        rich_text: [{ text: { content: lead.salesPoint } }],
      },
      'SEO 요약': {
        rich_text: [{ text: { content: lead.seoSummary } }],
      },
      '예상 딜 사이즈': {
        rich_text: [{ text: { content: lead.dealSize } }],
      },
      '업종': {
        rich_text: [{ text: { content: lead.industry } }],
      },
      '상태': {
        select: { name: '신규' },
      },
      '등록일': {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  };

  try {
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Notion API 오류 ${res.status}: ${err}` };
    }

    const data = await res.json() as { id: string };
    return { success: true, pageId: data.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 리드 배열 전체를 Notion에 저장 */
export async function saveAllLeadsToNotion(
  leads: LeadRecord[],
  industry: string,
): Promise<{ saved: number; failed: number; errors: string[] }> {
  let saved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const result = await saveLeadToNotion({ ...lead, industry });
    if (result.success) {
      saved++;
    } else {
      failed++;
      if (result.error) errors.push(`${lead.name}: ${result.error}`);
    }
  }

  return { saved, failed, errors };
}
