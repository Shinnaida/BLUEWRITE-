// BLUEWRITE — BrandMark Component
// Original BLUEWRITE mark: shield + report document + AI assistance sparkle.

import React from 'react';
import { FileText, PenLine, Shield, Sparkles } from 'lucide-react';

function BrandMark({ size = 'md', variant = 'dark', showText = false, className = '' }) {
  const sizes = {
    sm: { box: 'h-10 w-10', shield: 28, file: 14, spark: 10, title: 'text-base' },
    md: { box: 'h-14 w-14', shield: 38, file: 18, spark: 12, title: 'text-2xl' },
    lg: { box: 'h-28 w-28', shield: 78, file: 34, pen: 30, spark: 18, title: 'text-4xl' },
    hero: { box: 'h-36 w-36 sm:h-40 sm:w-40', shield: 112, file: 48, pen: 43, spark: 24, title: 'text-5xl' },
  };

  const isDarkBackground = variant === 'dark';
  const palette = isDarkBackground
    ? 'bg-[#0A2347]/80 text-white ring-police-blue-400/50'
    : 'bg-police-blue-50 text-navy-900 ring-police-blue-200';
  const iconTone = isDarkBackground ? 'text-white' : 'text-navy-900';
  const sparkleTone = 'text-amber-500';
  const selected = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex ${selected.box} items-center justify-center rounded-[2rem] ${palette} shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1`}
        aria-hidden="true"
      >
        <div className="absolute inset-3 rounded-[1.6rem] border border-police-blue-400/20 bg-gradient-to-br from-police-blue-500/20 to-transparent" />
        <Shield size={selected.shield} strokeWidth={2.15} className="relative z-10 text-white drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]" />
        <FileText size={selected.file} strokeWidth={2.35} className={`absolute z-20 -translate-y-1 ${iconTone}`} />
        <PenLine size={selected.pen || Math.round(selected.file * 0.9)} strokeWidth={2.5} className={`absolute bottom-[24%] right-[18%] z-30 rotate-[-28deg] ${iconTone}`} />
        <Sparkles size={selected.spark} strokeWidth={2.6} className={`absolute right-[12%] top-[12%] z-30 ${sparkleTone} drop-shadow-[0_0_8px_rgba(245,158,11,0.65)]`} />
      </div>
      {showText && (
        <div>
          <p className={`${selected.title} font-extrabold tracking-wide text-current`}>BLUEWRITE</p>
          <p className="text-xs font-medium leading-tight opacity-85">Police Incident Reporting</p>
        </div>
      )}
    </div>
  );
}

export default BrandMark;