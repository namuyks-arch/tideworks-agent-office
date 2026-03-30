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

/** Notion DB에 리드 카드 1개 저장 */
export async function saveLeadToNotion(lead: LeadRecord): Promise<{ success: boolean; pageId?: string; error?: string }> {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return { success: false, error: 'NOTION_API_KEY 또는 NOTION_DATABASE_ID가 설정되지 않았습니다.' };
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
          name: lead.priority === 'high' ? '🔴 높음' : lead.priority === 'medium' ? '🟡 중간' : '🔵 낮음',
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
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
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
