/**
 * Ahrefs MCP Wrapper
 *
 * Provides typed methods for SEO data retrieval via the Ahrefs MCP server.
 * Falls back to mock/estimated data with a warning when the MCP server
 * is unavailable or returns an error.
 */

import { callTool, isServerAvailable } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainRatingResult {
  dr: number;
  traffic: number;
  backlinks: number;
  topKeywords: string[];
  isMock: boolean;
  warning?: string;
}

export interface OrganicKeywordsResult {
  keywords: string[];
  isMock: boolean;
  warning?: string;
}

export interface BacklinksResult {
  count: number;
  topReferrers: string[];
  isMock: boolean;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const AHREFS_MCP_URL = process.env.AHREFS_MCP_URL ?? 'http://localhost:3101';

// ---------------------------------------------------------------------------
// Mock Data Generator
// ---------------------------------------------------------------------------

function generateMockDR(domain: string): DomainRatingResult {
  // Deterministic-ish mock based on domain string hash
  const hash = domain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const dr = 20 + (hash % 60);
  const traffic = 1000 + (hash % 50000);
  const backlinks = 50 + (hash % 5000);

  return {
    dr,
    traffic,
    backlinks,
    topKeywords: [
      `${domain.split('.')[0]} services`,
      `${domain.split('.')[0]} solutions`,
      `best ${domain.split('.')[0]}`,
      `${domain.split('.')[0]} pricing`,
      `${domain.split('.')[0]} reviews`,
    ],
    isMock: true,
    warning: `Ahrefs MCP server unavailable. Returning estimated data for ${domain}.`,
  };
}

function generateMockKeywords(domain: string): OrganicKeywordsResult {
  const base = domain.split('.')[0];
  return {
    keywords: [
      `${base} services`,
      `${base} solutions`,
      `best ${base}`,
      `${base} pricing`,
      `${base} reviews`,
      `${base} alternatives`,
      `${base} vs competitors`,
      `how to use ${base}`,
      `${base} tutorial`,
      `${base} case study`,
    ],
    isMock: true,
    warning: `Ahrefs MCP server unavailable. Returning estimated keywords for ${domain}.`,
  };
}

function generateMockBacklinks(domain: string): BacklinksResult {
  const hash = domain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    count: 50 + (hash % 5000),
    topReferrers: [
      'google.com',
      'linkedin.com',
      'medium.com',
      'github.com',
      'twitter.com',
    ],
    isMock: true,
    warning: `Ahrefs MCP server unavailable. Returning estimated backlinks for ${domain}.`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get domain rating, traffic estimate, backlink count, and top keywords.
 */
export async function getDomainRating(domain: string): Promise<DomainRatingResult> {
  try {
    const available = await isServerAvailable(AHREFS_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return generateMockDR(domain);
    }

    const result = await callTool(
      AHREFS_MCP_URL,
      'ahrefs_get_domain_rating',
      { domain },
      { timeoutMs: 15_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/ahrefs] getDomainRating error: ${result.errorMessage}`);
      return generateMockDR(domain);
    }

    const data = result.content as Record<string, unknown>;
    return {
      dr: Number(data.domain_rating ?? data.dr ?? 0),
      traffic: Number(data.organic_traffic ?? data.traffic ?? 0),
      backlinks: Number(data.backlinks ?? 0),
      topKeywords: Array.isArray(data.top_keywords)
        ? (data.top_keywords as string[])
        : [],
      isMock: false,
    };
  } catch (err) {
    console.warn('[mcp/ahrefs] getDomainRating exception:', err);
    return generateMockDR(domain);
  }
}

/**
 * Get organic keywords that a domain ranks for.
 */
export async function getOrganicKeywords(domain: string): Promise<OrganicKeywordsResult> {
  try {
    const available = await isServerAvailable(AHREFS_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return generateMockKeywords(domain);
    }

    const result = await callTool(
      AHREFS_MCP_URL,
      'ahrefs_get_organic_keywords',
      { domain, limit: 20 },
      { timeoutMs: 15_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/ahrefs] getOrganicKeywords error: ${result.errorMessage}`);
      return generateMockKeywords(domain);
    }

    const data = result.content as Record<string, unknown>;
    const keywords = Array.isArray(data.keywords)
      ? (data.keywords as string[])
      : [];

    return { keywords, isMock: false };
  } catch (err) {
    console.warn('[mcp/ahrefs] getOrganicKeywords exception:', err);
    return generateMockKeywords(domain);
  }
}

/**
 * Get backlink count and top referring domains.
 */
export async function getBacklinks(domain: string): Promise<BacklinksResult> {
  try {
    const available = await isServerAvailable(AHREFS_MCP_URL, { timeoutMs: 3000 });
    if (!available) {
      return generateMockBacklinks(domain);
    }

    const result = await callTool(
      AHREFS_MCP_URL,
      'ahrefs_get_backlinks',
      { domain, limit: 10 },
      { timeoutMs: 15_000 },
    );

    if (result.isError) {
      console.warn(`[mcp/ahrefs] getBacklinks error: ${result.errorMessage}`);
      return generateMockBacklinks(domain);
    }

    const data = result.content as Record<string, unknown>;
    return {
      count: Number(data.total ?? data.count ?? 0),
      topReferrers: Array.isArray(data.top_referrers)
        ? (data.top_referrers as string[])
        : [],
      isMock: false,
    };
  } catch (err) {
    console.warn('[mcp/ahrefs] getBacklinks exception:', err);
    return generateMockBacklinks(domain);
  }
}
