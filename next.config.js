/** @type {import('next').NextConfig} */

// .env.local에서 직접 읽기 (로컬 개발 전용 — 프로덕션에서는 Render 환경변수 사용)
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  // 프로덕션(Render)에서는 env vars가 process.env에 이미 설정되므로 스킵
  if (process.env.NODE_ENV === 'production') return {};
  try {
    const envPath = path.join(__dirname, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.substring(0, eqIdx).trim();
        const v = trimmed.substring(eqIdx + 1).trim();
        if (k && v) envVars[k] = v;
      }
    }
    return envVars;
  } catch {
    return {};
  }
}

const nextConfig = {
  reactStrictMode: true,
  env: loadEnvLocal(),
};

module.exports = nextConfig;
