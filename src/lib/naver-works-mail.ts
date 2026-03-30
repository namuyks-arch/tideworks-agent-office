// src/lib/naver-works-mail.ts
// NAVER WORKS v2 Mail API를 통한 영업 메일 발송

import { createSign } from 'crypto';

// ─── 환경 변수 ────────────────────────────────────────────────────────────────
// NAVER WORKS Developer Console에서 발급
// https://developers.worksmobile.com/kr/console/appmanagement/list

const CLIENT_ID       = process.env.NAVER_WORKS_CLIENT_ID ?? '';
const CLIENT_SECRET   = process.env.NAVER_WORKS_CLIENT_SECRET ?? '';
const SERVICE_ACCOUNT = process.env.NAVER_WORKS_SERVICE_ACCOUNT ?? '';  // xxx@xxx.worksmobile.com
const PRIVATE_KEY     = process.env.NAVER_WORKS_PRIVATE_KEY ?? '';       // RSA Private Key
const DOMAIN_ID       = process.env.NAVER_WORKS_DOMAIN_ID ?? '';          // 도메인 ID (숫자)
const SENDER_ID       = process.env.NAVER_WORKS_SENDER_ID ?? '';          // 발신자 userId (이메일 앞부분)

export interface MailPayload {
  to: string;          // 수신자 이메일
  toName?: string;     // 수신자 이름
  subject: string;
  bodyHtml: string;    // HTML 본문
  fromName?: string;   // 발신자 표시 이름 (기본: 타이드웍스)
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── JWT 인증 ─────────────────────────────────────────────────────────────────

/** RS256 JWT 생성 */
function createJwt(): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: CLIENT_ID,
    sub: SERVICE_ACCOUNT,
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const data      = `${header}.${payload}`;
  const privateKey = PRIVATE_KEY.replace(/\\n/g, '\n');
  const sign      = createSign('RSA-SHA256');
  sign.update(data);
  const sig = sign.sign(privateKey, 'base64url');

  return `${data}.${sig}`;
}

/** Service Account으로 Access Token 발급 */
async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !SERVICE_ACCOUNT || !PRIVATE_KEY) {
    throw new Error('NAVER WORKS 환경 변수가 설정되지 않았습니다. (CLIENT_ID, SERVICE_ACCOUNT, PRIVATE_KEY)');
  }

  const jwt = createJwt();

  const res = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      assertion: jwt,
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'mail',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NAVER WORKS OAuth2 오류 ${res.status}: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── 메일 발송 ────────────────────────────────────────────────────────────────

/** 메일 1통 발송 */
export async function sendMail(mail: MailPayload): Promise<MailResult> {
  if (!CLIENT_ID || !SERVICE_ACCOUNT || !PRIVATE_KEY || !DOMAIN_ID || !SENDER_ID) {
    return {
      success: false,
      error: 'NAVER WORKS 환경 변수 미설정. NAVER_WORKS_CLIENT_ID, CLIENT_SECRET, SERVICE_ACCOUNT, PRIVATE_KEY, DOMAIN_ID, SENDER_ID 확인 필요',
    };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return { success: false, error: String(e) };
  }

  const body = {
    subject: mail.subject,
    content: mail.bodyHtml,
    contentType: 'html',
    from: {
      userId: SENDER_ID,
      displayName: mail.fromName ?? '타이드웍스',
    },
    to: [
      {
        email: mail.to,
        ...(mail.toName ? { displayName: mail.toName } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://www.worksapis.com/v1.0/users/${SENDER_ID}/mails`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `NAVER WORKS Mail API 오류 ${res.status}: ${err}` };
    }

    const data = await res.json() as { messageId?: string };
    return { success: true, messageId: data.messageId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** 여러 리드에게 영업 메일 발송 */
export async function sendBulkSalesMails(
  mails: MailPayload[],
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const mail of mails) {
    // 연속 발송 시 1초 간격 (스팸 방지)
    await new Promise<void>((r) => setTimeout(r, 1000));
    const result = await sendMail(mail);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(`${mail.to}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}
