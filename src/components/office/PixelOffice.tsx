'use client';

import React from 'react';
import type { AgentId, AgentInfo } from '@/lib/types';
import { OFFICE_COLORS } from '@/lib/types';
import AgentDesk from './AgentDesk';

interface PixelOfficeProps {
  agents: Record<AgentId, AgentInfo>;
}

const AGENT_ORDER: [AgentId, AgentId, AgentId, AgentId] = [
  'researcher',
  'analyst',
  'strategist',
  'manager',
];

export default function PixelOffice({ agents }: PixelOfficeProps) {
  const analystDebating = agents.analyst?.status === 'debating';
  const strategistDebating = agents.strategist?.status === 'debating';
  const showDebateLine = analystDebating || strategistDebating;

  return (
    <div
      className="relative flex flex-col w-full h-full overflow-hidden select-none"
      style={{
        backgroundColor: OFFICE_COLORS.bg,
        fontFamily: 'var(--font-pixel, "Courier New", monospace)',
        imageRendering: 'pixelated',
      }}
    >
      {/* Office header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: OFFICE_COLORS.wall,
          borderColor: '#5a4d6e',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">&#x1F3E2;</span>
          <h2
            className="text-sm font-bold text-[#00d4aa]"
            style={{ textShadow: '0 0 8px #00d4aa44' }}
          >
            Tideworks Office
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mini status indicator dots for all agents */}
          {AGENT_ORDER.map((id) => {
            const agent = agents[id];
            if (!agent) return null;
            const isActive = ['thinking', 'working', 'debating'].includes(agent.status);
            return (
              <span
                key={id}
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: isActive ? agent.color : '#6b7280',
                  boxShadow: isActive ? `0 0 4px ${agent.color}` : 'none',
                }}
                title={`${agent.name}: ${agent.status}`}
              />
            );
          })}
        </div>
      </div>

      {/* Wall decoration */}
      <div
        className="w-full h-6 flex items-center justify-center gap-4"
        style={{ backgroundColor: OFFICE_COLORS.wall }}
      >
        {/* Wall tiles pattern */}
        <div className="flex gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-3"
              style={{
                backgroundColor:
                  i % 2 === 0 ? '#453a5a' : '#3d3352',
                borderBottom: '1px solid #352c47',
              }}
            />
          ))}
        </div>
      </div>

      {/* 2x2 Agent grid */}
      <div className="flex-1 relative p-3">
        {/* Floor background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: OFFICE_COLORS.floor,
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 39px,
                rgba(0,0,0,0.1) 39px,
                rgba(0,0,0,0.1) 40px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 39px,
                rgba(0,0,0,0.1) 39px,
                rgba(0,0,0,0.1) 40px
              )
            `,
          }}
        />

        {/* Grid container */}
        <div className="relative grid grid-cols-2 grid-rows-2 gap-2 h-full">
          {AGENT_ORDER.map((id) => {
            const agent = agents[id];
            if (!agent) return <div key={id} />;
            return (
              <div
                key={id}
                className="relative flex items-center justify-center rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(90,77,110,0.3)',
                }}
              >
                <AgentDesk
                  agentId={id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status={agent.status}
                  color={agent.color}
                  currentTask={agent.currentTask}
                />
              </div>
            );
          })}

          {/* Debate connection line between analyst (top-right) and strategist (bottom-left) */}
          {showDebateLine && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="debateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9b59b6" />
                  <stop offset="100%" stopColor="#e67e22" />
                </linearGradient>
              </defs>
              {/* Line from analyst (top-right cell center) to strategist (bottom-left cell center) */}
              <line
                x1="75%"
                y1="25%"
                x2="25%"
                y2="75%"
                stroke="url(#debateGrad)"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.7"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-20"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
              {/* Debate spark at midpoint */}
              <circle cx="50%" cy="50%" r="4" fill="#f97316" opacity="0.8">
                <animate
                  attributeName="r"
                  values="3;6;3"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0.4;0.8"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Debate emoji label */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                dy="-12"
              >
                &#x26A1;
              </text>
            </svg>
          )}
        </div>
      </div>

      {/* Floor border / baseboard */}
      <div
        className="w-full h-2"
        style={{
          background: 'linear-gradient(to bottom, #5a4d6e, #4a3f5c)',
        }}
      />
    </div>
  );
}
