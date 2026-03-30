'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'pixel';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#00d4aa] text-[#1a1525] hover:bg-[#00e6bb] active:bg-[#00c49a] border-2 border-[#00a888]',
  secondary:
    'bg-[#3d3352] text-[#c4b5d4] hover:bg-[#4a3f5c] active:bg-[#352c47] border-2 border-[#5a4d6e]',
  danger:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] border-2 border-[#c53030]',
  ghost:
    'bg-transparent text-[#c4b5d4] hover:bg-[#3d3352]/50 active:bg-[#3d3352] border-2 border-transparent',
  pixel:
    'bg-[#3d3352] text-[#00d4aa] hover:bg-[#4a3f5c] active:bg-[#352c47] border-[3px] border-[#00d4aa]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-6 py-3 text-base gap-2',
};

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <svg
      className={`${dim} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4aa]',
        variantStyles[variant],
        sizeStyles[size],
        variant === 'pixel' ? 'pixel-border' : 'rounded',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        fontFamily: 'var(--font-pixel, "Courier New", monospace)',
        imageRendering: variant === 'pixel' ? 'pixelated' : undefined,
      }}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {children}

      <style jsx>{`
        .pixel-border {
          border-style: solid;
          box-shadow:
            inset -2px -2px 0 0 rgba(0, 0, 0, 0.25),
            inset 2px 2px 0 0 rgba(255, 255, 255, 0.15),
            2px 2px 0 0 rgba(0, 0, 0, 0.4);
          image-rendering: pixelated;
        }
        .pixel-border:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            inset -2px -2px 0 0 rgba(0, 0, 0, 0.25),
            inset 2px 2px 0 0 rgba(255, 255, 255, 0.15),
            3px 3px 0 0 rgba(0, 0, 0, 0.4);
        }
        .pixel-border:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            inset 2px 2px 0 0 rgba(0, 0, 0, 0.25),
            inset -1px -1px 0 0 rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </button>
  );
}
