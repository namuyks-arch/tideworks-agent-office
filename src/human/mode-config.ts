// =============================================================================
// Tideworks Agent Office - Mode Configuration
// =============================================================================

import type { ExecutionMode, PipelineType } from '../agents/types';
import type { ModeConfig } from './types';

// ---------------------------------------------------------------------------
// Lead Discovery Pipeline - Default Mode Config
// ---------------------------------------------------------------------------
// Step 1 (Research):        auto     - Agent runs without human intervention
// Step 2 (Scoring):         auto     - Scoring uses deterministic formula
// Step 3 (Debate):          auto     - Debate happens between agents
// Step 4 (Sales Approach):  approval - Human reviews sales strategy
// Step 5 (Final Review):    approval - Human signs off on final list
// ---------------------------------------------------------------------------

export const DEFAULT_LEAD_MODES: ModeConfig = {
  'ld-research': 'auto',
  'ld-scoring': 'auto',
  'ld-debate': 'auto',
  'ld-sales': 'approval',
  'ld-final': 'approval',
};

// ---------------------------------------------------------------------------
// Proposal Generation Pipeline - Default Mode Config
// ---------------------------------------------------------------------------
// Step 1 (Brand Diagnosis):  auto     - Data-driven, no human needed
// Step 2 (Strategy Debate):  auto     - Agent debate for strategy alignment
// Step 3 (Proposal Draft):   approval - Human reviews proposal before sending
// Step 4 (Final Review):     approval - Sales manager final sign-off
// ---------------------------------------------------------------------------

export const DEFAULT_PROPOSAL_MODES: ModeConfig = {
  'pg-diagnosis': 'auto',
  'pg-debate': 'auto',
  'pg-proposal': 'approval',
  'pg-review': 'approval',
};

// ---------------------------------------------------------------------------
// Onboarding Pipeline - Default Mode Config
// ---------------------------------------------------------------------------
// Step 1 (KPI Design):      auto     - Analyst generates KPI framework
// Step 2 (GEO Strategy):    auto     - Strategist designs GEO plan
// Step 3 (Onboard Plan):    approval - Human reviews full plan
// Step 4 (Communications):  approval - Human approves before sending
// ---------------------------------------------------------------------------

export const DEFAULT_ONBOARD_MODES: ModeConfig = {
  'ob-kpi': 'auto',
  'ob-geo': 'auto',
  'ob-plan': 'approval',
  'ob-comms': 'approval',
};

// ---------------------------------------------------------------------------
// Mode Config Getter
// ---------------------------------------------------------------------------

const PIPELINE_MODE_CONFIGS: Record<PipelineType, ModeConfig> = {
  'lead-discovery': DEFAULT_LEAD_MODES,
  'proposal-gen': DEFAULT_PROPOSAL_MODES,
  onboarding: DEFAULT_ONBOARD_MODES,
};

export function getModeConfig(pipelineType: PipelineType): ModeConfig {
  return { ...PIPELINE_MODE_CONFIGS[pipelineType] };
}

// ---------------------------------------------------------------------------
// Mode Override Helpers
// ---------------------------------------------------------------------------

/** Set all steps to a single mode (useful for testing or full manual control). */
export function createUniformConfig(
  pipelineType: PipelineType,
  mode: ExecutionMode
): ModeConfig {
  const base = getModeConfig(pipelineType);
  const uniform: ModeConfig = {};
  for (const stepId of Object.keys(base)) {
    uniform[stepId] = mode;
  }
  return uniform;
}

/** Override specific steps while keeping defaults for the rest. */
export function createCustomConfig(
  pipelineType: PipelineType,
  overrides: Record<string, ExecutionMode>
): ModeConfig {
  const base = getModeConfig(pipelineType);
  const result: ModeConfig = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (key in result) {
      result[key] = value;
    }
  }
  return result;
}

/** Validate that a mode config has entries for all required step IDs. */
export function validateModeConfig(
  pipelineType: PipelineType,
  config: ModeConfig
): { valid: boolean; missingSteps: string[] } {
  const required = getModeConfig(pipelineType);
  const requiredKeys = Object.keys(required);
  const missingSteps = requiredKeys.filter(
    (key) => config[key] === undefined
  );

  return {
    valid: missingSteps.length === 0,
    missingSteps,
  };
}
