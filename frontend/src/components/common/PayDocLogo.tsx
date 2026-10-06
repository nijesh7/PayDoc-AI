'use client';

import React from 'react';
import Image from 'next/image';

interface PayDocLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function PayDocLogo({ size = 'md', showText = true, className = '' }: PayDocLogoProps) {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 36, text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 56, text: 'text-3xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon Mark */}
      <div
        className="relative rounded-xl overflow-hidden shadow-md shadow-indigo-600/30 shrink-0 border border-indigo-400/30 flex items-center justify-center bg-[#0B0F19]"
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
          <span className={`font-black tracking-tight leading-none text-slate-900 dark:text-white ${currentSize.text}`}>
            PAYDOC <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">AI</span>
          </span>
          <span className={`font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 mt-0.5 ${currentSize.sub}`}>
            Payroll & Document Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

export default PayDocLogo;
