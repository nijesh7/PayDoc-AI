'use client';

import React from 'react';
import Image from 'next/image';

interface PayDocLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'auto' | 'light' | 'dark';
  showBadge?: boolean;
}

export function PayDocLogo({
  size = 'md',
  showText = true,
  className = '',
  variant = 'auto',
  showBadge = false,
}: PayDocLogoProps) {
  const sizeMap = {
    sm: { icon: 30, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 48, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 60, text: 'text-3xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  // Determine text color classes based on variant
  const titleClass =
    variant === 'dark'
      ? 'text-white drop-shadow-sm'
      : variant === 'light'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white';

  const subtitleClass =
    variant === 'dark'
      ? 'text-indigo-200/90 font-medium'
      : variant === 'light'
      ? 'text-slate-500 font-medium'
      : 'text-slate-500 dark:text-slate-400 font-medium';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Logo Icon Mark with radiant border and subtle glow */}
      <div
        className={`relative rounded-xl overflow-hidden shadow-lg shrink-0 flex items-center justify-center transition-all duration-200 ${
          variant === 'dark'
            ? 'bg-[#0E1528] border border-indigo-400/40 shadow-indigo-500/25 ring-2 ring-indigo-500/20'
            : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-[#0B0F19] border border-indigo-500/30 shadow-indigo-600/20'
        }`}
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <Image
          src="/paydoc-logo.jpg"
          alt="PayDoc AI Logo"
          width={currentSize.icon}
          height={currentSize.icon}
          className="w-full h-full object-cover scale-105"
          priority
        />
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-black tracking-tight leading-none ${titleClass} ${currentSize.text}`}>
              PAYDOC{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent font-black">
                AI
              </span>
            </span>
            {showBadge && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                  variant === 'dark'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                MSME
              </span>
            )}
          </div>
          <span className={`tracking-wider uppercase mt-1 ${subtitleClass} ${currentSize.sub}`}>
            Payroll & Document Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

export default PayDocLogo;
