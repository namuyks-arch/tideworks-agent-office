'use client';

import React from 'react';

type BadgeVariant = 'auto' | 'approval' | 'manual' | 'info' | 'success' | 'error';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  auto: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#22c55e',
    border: '#22c55e',
  },
  approval: {
    bg: 'rgba(234, 179, 8, 0.15)',
    text: '#eab308',
    border: '#eab308',
  },
  manual: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#ef4444',
    border: '#ef4444',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#3b82f6',
    border: '#3b82f6',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#22c55e',
    border: '#22c55e',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#ef4444',
    border: '#ef4444',
  },
};

const modeEmoji: Record<string, string> = {
  auto: '\uD83D\uDFE2',
  approval: '\uD83D\uDFE1',
  manual: '\uD83D\uDD34',
};

export default function Badge({
  variant = 'info',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const styles = variantStyles[variant];
  const padSize = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2.5 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-medium leading-none border',
        padSize,
        textSize,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        borderColor: styles.border,
        fontFamily: 'var(--font-pixel, "Courier New", monospace)',
      }}
    >
      {modeEmoji[variant] && (
        <span className="text-[0.65em] leading-none">{modeEmoji[variant]}</span>
      )}
      {children}
    </span>
  );
}
