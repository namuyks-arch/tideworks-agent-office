// src/lib/google-sheets.ts
// Google Sheets API를 통한 리드 데이터 저장 (Service Account 인증)

import { createSign } from 'crypto';

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

const SPREADSHEET_ID   = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '';
const SHEET_NAME       = process.env.GOOGLE_SHEETS_SHEET_NAME ?? '리드DB';
// SERVICE_ACCOUNT_KEY는 JSON 문자열로 환경 변수에 저장
// 예: {"type":"service_account","project_id":"...","client_email":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n..."}
const SA_KEY_JSON      = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

/** RS256 JWT 생성 */
function createJwt(email: string, privateKey: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const data = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  const sig = sign.sign(privateKey, 'base64url');

  return `${data}.${sig}`;
}

/** Service Account으로 Access Token 획득 */
async function getAccessToken(): Promise<string> {
  if (!SA_KEY_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.');

  let sa: ServiceAccountKey;
  try {
    sa = JSON.parse(SA_KEY_JSON) as ServiceAccountKey;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY JSON 파싱 실패');
  }

  // \n을 실제 줄바꿈으로 변환 (환경변수에서 이스케이프된 경우)
  const privateKey = sa.private_key.replace(/\\n/g, '\n');
  const jwt = createJwt(sa.client_email, privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth2 오류 ${res.status}: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/** 헤더 행이 없으면 자동으로 생성 */
async function ensureHeader(token: string): Promise<void> {
  const range = encodeURIComponent(`${SHEET_NAME}!A1:J1`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return;
  const data = await res.json() as { values?: string[][] };
  if (data.values && data.values.length > 0) return; // 이미 헤더 있음

  const headers = [['등록일', '순위', '브랜드명', '도메인', '점수', '우선순위', '업종', '영업 포인트', 'SEO 요약', '예상 딜 사이즈']];
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!A1`)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: headers }),
    },
  );
}

/** 리드 1개를 스프레드시트에 추가 */
async function appendRow(token: string, lead: LeadRecord): Promise<void> {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const priorityLabel = lead.priority === 'high' ? '🔴 높음' : lead.priority === 'medium' ? '🟡 중간' : '🔵 낮음';

  const row = [[
    today,
    lead.rank,
    lead.name,
    lead.domain,
    lead.score,
    priorityLabel,
    lead.industry,
    lead.salesPoint,
    lead.seoSummary,
    lead.dealSize,
  ]];

  const range = encodeURIComponent(`${SHEET_NAME}!A:J`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: row }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets append 오류 ${res.status}: ${err}`);
  }
}

/** 리드 배열 전체를 Google Sheets에 저장 */
export async function saveAllLeadsToSheets(
  leads: LeadRecord[],
  industry: string,
): Promise<{ saved: number; failed: number; errors: string[] }> {
  if (!SPREADSHEET_ID || !SA_KEY_JSON) {
    return { saved: 0, failed: leads.length, errors: ['GOOGLE_SHEETS_SPREADSHEET_ID 또는 GOOGLE_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다.'] };
  }

  let token: string;
  try {
    token = await getAccessToken();
    await ensureHeader(token);
  } catch (e) {
    return { saved: 0, failed: leads.length, errors: [String(e)] };
  }

  let saved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      await appendRow(token, { ...lead, industry });
      saved++;
    } catch (e) {
      failed++;
      errors.push(`${lead.name}: ${String(e)}`);
    }
  }

  return { saved, failed, errors };
}
