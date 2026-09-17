'use client';

import React from 'react';

/**
 * GenAce Official Brand Logo Component
 * Pixel-accurate vector implementation of the 3D origami ribbon folded "A" mark.
 * 
 * @param {'mark' | 'full' | 'icon'} variant - Logo layout variant
 * @param {'dark' | 'light' | 'auto'} mode - Theme mode for colors
 * @param {number | string} size - Icon / mark height in pixels (default: 40)
 * @param {boolean} showTagline - Whether to render "NEXT GENERATION. EXCELLENCE."
 * @param {string} className - Additional CSS classes
 */
export default function Logo({
  variant = 'full',
  mode = 'auto',
  size,
  showTagline = false,
  className = '',
  onClick
}) {
  const isDark = mode === 'dark' || mode === 'auto';

  // Unique IDs for SVG gradients to prevent rendering collisions
  const uid = React.useId().replace(/:/g, '');
  const leftGradId = `genace-left-ribbon-${uid}`;
  const rightGradId = `genace-right-metallic-${uid}`;
  const crossGradId = `genace-cross-fold-${uid}`;
  const aceTextGradId = `genace-ace-text-${uid}`;

  // Pixel-perfect 3D Origami Ribbon "A" SVG Vector
  const MarkIcon = ({ svgSize = 40 }) => (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-lg"
    >
      <defs>
        {/* Main Ribbon Gradient (Electric Cyan -> Blue -> Purple -> Violet Apex) */}
        <linearGradient id={leftGradId} x1="100" y1="440" x2="260" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="25%" stopColor="#0072FF" />
          <stop offset="60%" stopColor="#7C3AED" />
          <stop offset="90%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* Metallic Silver Right Fold Gradient (White -> Light Gray -> Slate) */}
        <linearGradient id={rightGradId} x1="280" y1="120" x2="380" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#E2E8F0" />
          <stop offset="65%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Folded Crossbar Facet Gradient (Indigo to Bright Purple) */}
        <linearGradient id={crossGradId} x1="170" y1="320" x2="320" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="45%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>

        {/* Ace Text Gradient */}
        <linearGradient id={aceTextGradId} x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* 3D Soft Shadow for Ribbon Overlaps */}
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="8" stdDeviation="7" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. RIGHT DIAGONAL LEG (Metallic Silver Fold, Tucked behind apex) */}
      <path
        d="M260 145 
           L308 145 
           L380 430 
           L318 430 
           L272 260 
           Z"
        fill={`url(#${rightGradId})`}
      />

      {/* Right Leg Inner Shadow Edge for Depth */}
      <path
        d="M272 260 L318 430 L300 430 L262 265 Z"
        fill="#000000"
        fillOpacity="0.15"
      />

      {/* 2. FOLDED CROSSBAR RIBBON (Sharp fold pointing right) */}
      <path
        d="M178 305 
           L325 210 
           L275 270 
           L218 305 
           Z"
        fill={`url(#${crossGradId})`}
        filter={`url(#shadow-${uid})`}
      />

      {/* 3. MAIN OUTER RIBBON LOOP (Left leg to top apex, folding over) */}
      <path
        d="M120 430 
           L245 70 
           C255 52 278 55 292 78 
           L305 135 
           L265 215 
           L215 310 
           L172 430 
           H120 
           Z"
        fill={`url(#${leftGradId})`}
        filter={`url(#shadow-${uid})`}
      />

      {/* Crisp Left Outer Fold Highlight */}
      <path
        d="M120 430 L245 70 Q258 52 278 68 L296 120 L256 200 L210 300 L172 430 Z"
        fill={`url(#${leftGradId})`}
      />

      {/* Inner Triangle Loop Cutout Shadow Accent */}
      <path
        d="M200 300 L245 155 L248 155 L225 240 Z"
        fill="#FFFFFF"
        fillOpacity="0.2"
      />
    </svg>
  );

  // App Icon Squircle Container Variant (Matches bottom-right tile in reference image)
  if (variant === 'icon') {
    const iconContainerSize = size || 56;
    const isDarkBg = mode === 'dark' || (mode === 'auto' && true);
    return (
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center rounded-2xl shadow-2xl transition-transform hover:scale-105 select-none ${
          isDarkBg
            ? 'bg-[#090d18] border border-white/10 shadow-purple-950/60'
            : 'bg-white border border-slate-200 shadow-slate-300/60'
        } ${className}`}
        style={{ width: iconContainerSize, height: iconContainerSize }}
      >
        <MarkIcon svgSize={iconContainerSize * 0.65} />
      </div>
    );
  }

  // Standalone Mark Variant
  if (variant === 'mark') {
    const markSize = size || 40;
    return (
      <div onClick={onClick} className={`inline-flex items-center ${className}`}>
        <MarkIcon svgSize={markSize} />
      </div>
    );
  }

  // Full Logo Variant ("A" Mark + "GenAce" Text + Optional Tagline)
  const fullSize = size || 38;

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {/* 3D Folded "A" Logo Mark */}
        <MarkIcon svgSize={fullSize} />

        {/* Brand Text Typography */}
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline font-black tracking-tight leading-none text-2xl font-outfit">
            {/* "Gen" */}
            <span
              className={
                mode === 'light'
                  ? 'text-slate-900'
                  : mode === 'dark'
                  ? 'text-white'
                  : 'text-white dark:text-white light:text-slate-900'
              }
            >
              Gen
            </span>

            {/* "Ace" Gradient Text */}
            <span
              className="bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent ml-0.5"
            >
              Ace
            </span>
          </div>

          {/* Subtitle Tagline */}
          {showTagline && (
            <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase mt-1">
              NEXT GENERATION. EXCELLENCE.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
