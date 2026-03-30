'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useModeStore, DEFAULT_MODES, type ExecutionMode } from '@/store/mode-store';
import { PIPELINE_TEMPLATES, type PipelineType } from '@/store/pipeline-store';

/* ================================================================== */
/*  MODE BADGE                                                        */
/* ================================================================== */
function ModeBadge({ mode }: { mode: ExecutionMode }) {
  const config: Record<ExecutionMode, { label: string; bg: string; text: string }> = {
    auto: { label: '자동', bg: 'bg-mode-auto/20', text: 'text-mode-auto' },
    approval: { label: '승인', bg: 'bg-mode-approval/20', text: 'text-mode-approval' },
    manual: { label: '수동', bg: 'bg-mode-manual/20', text: 'text-mode-manual' },
  };
  const c = config[mode];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full pixel-text text-[10px] ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

/* ================================================================== */
/*  MODE TOGGLE — cycles through auto -> approval -> manual           */
/* ================================================================== */
function ModeToggle({
  stepId,
  currentMode,
}: {
  stepId: string;
  currentMode: ExecutionMode;
}) {
  const setMode = useModeStore((s) => s.setMode);

  const modes: ExecutionMode[] = ['auto', 'approval', 'manual'];

  const colorMap: Record<ExecutionMode, string> = {
    auto: 'bg-mode-auto',
    approval: 'bg-mode-approval',
    manual: 'bg-mode-manual',
  };

  const handleClick = (mode: ExecutionMode) => {
    setMode(stepId, mode);
  };

  return (
    <div className="flex items-center gap-1">
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => handleClick(mode)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all text-xs ${
            currentMode === mode
              ? `${colorMap[mode]} text-white shadow-md`
              : 'bg-tw-navy text-gray-500 hover:text-gray-300'
          }`}
          title={mode === 'auto' ? '자동 실행' : mode === 'approval' ? '승인 후 실행' : '수동 실행'}
        >
          {mode === 'auto' ? '⚡' : mode === 'approval' ? '✋' : '🖐️'}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  STEP ROW                                                          */
/* ================================================================== */
function StepRow({
  step,
  index,
  mode,
}: {
  step: { id: string; name: string; description: string; assignedAgent: string };
  index: number;
  mode: ExecutionMode;
}) {
  const agentEmoji: Record<string, string> = {
    researcher: '\uD83D\uDD0D',
    analyst: '\uD83D\uDCCA',
    strategist: '\uD83C\uDFAF',
    manager: '\uD83D\uDCBC',
  };

  return (
    <div className="flex items-center gap-3 bg-tw-dark rounded-lg px-4 py-3 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      {/* Step number */}
      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-tw-navy flex items-center justify-center text-xs text-gray-400 pixel-text">
        {index + 1}
      </span>

      {/* Step info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{step.name}</span>
          <span className="text-sm">{agentEmoji[step.assignedAgent]}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{step.description}</p>
      </div>

      {/* Current mode badge */}
      <ModeBadge mode={mode} />

      {/* Mode toggle */}
      <ModeToggle stepId={step.id} currentMode={mode} />
    </div>
  );
}

/* ================================================================== */
/*  SETTINGS PAGE                                                     */
/* ================================================================== */
export default function SettingsPage() {
  const tabs: { type: PipelineType; label: string }[] = [
    { type: 'lead_discovery', label: '리드 발굴' },
    { type: 'proposal', label: '제안서' },
    { type: 'onboarding', label: '온보딩' },
  ];

  const [activeTab, setActiveTab] = useState<PipelineType>('lead_discovery');
  const modes = useModeStore((s) => s.modes);
  const resetToDefaults = useModeStore((s) => s.resetToDefaults);

  const template = PIPELINE_TEMPLATES[activeTab];
  const stepIds = Object.keys(DEFAULT_MODES[activeTab]);

  return (
    <div className="h-screen flex flex-col bg-tw-navy text-white">
      {/* Header */}
      <header className="h-12 bg-tw-dark/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-lg">←</span>
            <span className="pixel-text text-xs">돌아가기</span>
          </Link>
          <span className="text-gray-600">|</span>
          <span className="pixel-text text-sm text-tw-gold">실행 모드 설정</span>
        </div>

        <button
          onClick={resetToDefaults}
          className="px-3 py-1 text-xs pixel-text text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded-md transition-colors"
        >
          기본값 초기화
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-6 text-xs">
          <span className="text-gray-500">모드 범례:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-mode-auto" /> 자동 (에이전트가 독립 실행)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-mode-approval" /> 승인 (사람 승인 후 실행)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-mode-manual" /> 수동 (사람이 직접 실행)
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-700/50">
          {tabs.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 pixel-text text-xs transition-colors border-b-2 ${
                activeTab === type
                  ? 'border-tw-accent text-tw-accent'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {template.steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              index={idx}
              mode={modes[step.id] ?? 'approval'}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-tw-dark rounded-lg p-4 pixel-border">
          <h3 className="pixel-text text-xs text-tw-gold mb-3">현재 설정 요약</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-2xl font-bold text-mode-auto">
                {stepIds.filter((id) => modes[id] === 'auto').length}
              </span>
              <p className="text-[10px] text-gray-500 pixel-text mt-1">자동 단계</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-mode-approval">
                {stepIds.filter((id) => modes[id] === 'approval').length}
              </span>
              <p className="text-[10px] text-gray-500 pixel-text mt-1">승인 단계</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-mode-manual">
                {stepIds.filter((id) => modes[id] === 'manual').length}
              </span>
              <p className="text-[10px] text-gray-500 pixel-text mt-1">수동 단계</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
