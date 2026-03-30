/** @type {import('next').NextConfig} */

// .env.local에서 직접 읽기 (Next.js env 로딩 문제 우회)
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
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

const envVars = loadEnvLocal();

const nextConfig = {
  reactStrictMode: true,
  env: envVars,
};

module.exports = nextConfig;
