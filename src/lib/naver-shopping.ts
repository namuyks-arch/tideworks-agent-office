// src/lib/naver-shopping.ts
// 네이버 쇼핑 API로 실제 브랜드 수집

const NAVER_CLIENT_ID     = process.env.NAVER_CLIENT_ID ?? '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? '';

export interface BrandCandidate {
  name: string;
  domain: string;
  description: string;
  channels: string[];
}

// 업종별 검색 키워드 + 대표 플랫폼 매핑
const INDUSTRY_QUERIES: Record<string, string[]> = {
  '뷰티':   ['올리브영 브랜드 스킨케어', '국내 뷰티 브랜드 화장품', 'K뷰티 스킨케어'],
  '패션':   ['무신사 패션 브랜드', '국내 의류 브랜드', '한국 패션'],
  '식품':   ['마켓컬리 식품 브랜드', '국내 식품 브랜드', '건강식품'],
  '가전':   ['국내 가전 브랜드', '소형가전 브랜드'],
  '스포츠': ['스포츠 브랜드 운동', '피트니스 의류 브랜드'],
  '생활':   ['생활용품 브랜드', '홈리빙 브랜드'],
};

interface NaverShopItem {
  title: string;
  link: string;
  brand: string;
  maker: string;
  mallName: string;
  lprice: string;
  category1: string;
  category2: string;
}

/** 브랜드명에서 HTML 태그 제거 */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

/** 도메인 추출 (mallName → 도메인 추정) */
function guessDomain(brand: string, mallName: string): string {
  const clean = brand.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');

  // 영문 브랜드명이면 바로 도메인으로
  if (/^[a-z0-9]+$/.test(clean)) return `${clean}.com`;

  // 한글이면 mallName에서 도메인 힌트
  const mallClean = mallName.toLowerCase().replace(/\s+/g, '');
  if (/^[a-z0-9]+$/.test(mallClean) && mallClean.length > 2) return `${mallClean}.com`;

  return `${clean}.co.kr`;
}

/** 네이버 쇼핑 API로 업종별 실제 브랜드 수집 */
export async function fetchBrandsFromNaver(
  industry: string,
  count = 8,
): Promise<BrandCandidate[]> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.');
  }

  const queries = INDUSTRY_QUERIES[industry] ?? [`${industry} 브랜드`];
  const brandMap = new Map<string, BrandCandidate>();

  for (const query of queries) {
    if (brandMap.size >= count) break;

    try {
      const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=30&sort=sim`;
      const res = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
      });

      if (!res.ok) continue;
      const data = await res.json() as { items: NaverShopItem[] };

      for (const item of data.items ?? []) {
        const brand = stripTags(item.brand || item.maker || '');
        if (!brand || brand.length < 2) continue;
        if (brandMap.has(brand)) continue;

        // 대형 플랫폼 자체는 제외 (올리브영, 쿠팡 등은 플랫폼이지 타겟 브랜드가 아님)
        const excluded = ['올리브영', '쿠팡', '네이버', '무신사', '마켓컬리', '지마켓', '11번가', 'SSG', '롯데온'];
        if (excluded.some(e => brand.includes(e))) continue;

        const domain = guessDomain(brand, item.mallName || '');
        brandMap.set(brand, {
          name: brand,
          domain,
          description: `${item.category1 || industry} ${item.category2 || ''} 브랜드 — ${item.mallName || '쇼핑몰'} 판매`,
          channels: ['네이버 쇼핑', item.mallName || '온라인 쇼핑몰'],
        });

        if (brandMap.size >= count) break;
      }
    } catch {
      // 이 쿼리 실패 → 다음 쿼리로
    }
  }

  return Array.from(brandMap.values());
}
