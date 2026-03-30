import { create } from 'zustand';
import type { PipelineType } from './pipeline-store';

// ─── Types ───────────────────────────────────────────────────────────
export type ExecutionMode = 'auto' | 'approval' | 'manual';

// ─── Default Modes per Pipeline ──────────────────────────────────────
const DEFAULT_MODES: Record<PipelineType, Record<string, ExecutionMode>> = {
  lead_discovery: {
    'ld-1': 'auto',
    'ld-2': 'auto',
    'ld-3': 'approval',
    'ld-4': 'approval',
    'ld-5': 'approval',
  },
  proposal: {
    'pp-1': 'auto',
    'pp-2': 'auto',
    'pp-3': 'approval',
    'pp-4': 'approval',
    'pp-5': 'approval',
  },
  onboarding: {
    'ob-1': 'auto',
    'ob-2': 'auto',
    'ob-3': 'approval',
    'ob-4': 'manual',
  },
};

// Flatten all defaults into a single record
function flattenDefaults(): Record<string, ExecutionMode> {
  const flat: Record<string, ExecutionMode> = {};
  for (const pipelineModes of Object.values(DEFAULT_MODES)) {
    for (const [stepId, mode] of Object.entries(pipelineModes)) {
      flat[stepId] = mode;
    }
  }
  return flat;
}

// ─── Store Interface ─────────────────────────────────────────────────
interface ModeStore {
  modes: Record<string, ExecutionMode>;
  setMode: (stepId: string, mode: ExecutionMode) => void;
  setAllModes: (modes: Record<string, ExecutionMode>) => void;
  getMode: (stepId: string) => ExecutionMode;
  getModesForPipeline: (type: PipelineType) => Record<string, ExecutionMode>;
  resetToDefaults: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────
export const useModeStore = create<ModeStore>((set, get) => ({
  modes: flattenDefaults(),

  setMode: (stepId, mode) =>
    set((state) => ({
      modes: { ...state.modes, [stepId]: mode },
    })),

  setAllModes: (modes) =>
    set((state) => ({
      modes: { ...state.modes, ...modes },
    })),

  getMode: (stepId) => get().modes[stepId] ?? 'approval',

  getModesForPipeline: (type) => {
    const stepIds = Object.keys(DEFAULT_MODES[type] ?? {});
    const current = get().modes;
    const result: Record<string, ExecutionMode> = {};
    for (const id of stepIds) {
      result[id] = current[id] ?? 'approval';
    }
    return result;
  },

  resetToDefaults: () => set({ modes: flattenDefaults() }),
}));

export { DEFAULT_MODES };
