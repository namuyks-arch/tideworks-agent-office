// src/app/api/geo-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeGeo, type GeoAnalysisInput } from '@/lib/geo-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GeoAnalysisInput;

    if (!body.brand || !body.domain) {
      return NextResponse.json({ error: '브랜드명과 도메인은 필수입니다.' }, { status: 400 });
    }

    const result = await analyzeGeo(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/geo-analyze]', err);
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GEO Analyze API v1.0', endpoints: ['POST /api/geo-analyze'] });
}
