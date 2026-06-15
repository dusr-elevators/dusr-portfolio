/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface LogoProps {
  className?: string;
  showText?: boolean;
  lang?: 'ar' | 'en';
}

export default function Logo({ className = '', showText = true, lang = 'ar' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Hexagonal Dusr Icon Custom SVG */}
      <svg
        className="w-10 h-10 shrink-0 transform hover:scale-105 transition-transform duration-300"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gray Outer Hexagonal Frame */}
        <path
          d="M50 4L88 26V74L50 96L12 74V26L50 4Z"
          stroke="#3d3d3d"
          strokeWidth="6"
          strokeLinejoin="round"
          className="stroke-neutral-600 dark:stroke-neutral-500"
        />
        
        {/* Inner Gray Hexagon Cut Layout */}
        <path
          d="M50 12L78 28.5V71.5L50 88L22 71.5V28.5L50 12Z"
          fill="#1c1c1c"
          stroke="#2a2a2a"
          strokeWidth="2"
        />

        {/* Vertical Shaft Line Indicator */}
        <line
          x1="50"
          y1="20"
          x2="50"
          y2="80"
          stroke="#3a3a3a"
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        {/* Up Arrow - Safety Orange (#FF5722) */}
        <path
          d="M50 22L62 36H55V48H45V36H38L50 22Z"
          fill="#FF5722"
          className="fill-[#FF5722]"
        />

        {/* Down Arrow - Safety Orange (#FF5722) */}
        <path
          d="M50 78L38 64H45V52H55V64H62L50 78Z"
          fill="#FF5722"
          className="fill-[#FF5722]"
        />

        {/* Decorative Orange Segment bottom right for logo fidelity */}
        <path
          d="M74 65L86 72L78 84L68 77"
          fill="#FF5722"
          stroke="#FF5722"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Brand Text Representation */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          {/* دسر in Noto Sans Arabic calligraphy design */}
          <span 
            className="text-xl md:text-2xl font-display font-black tracking-tight text-[#FF5722] mb-0.5"
            dir="rtl"
          >
            دسر
          </span>
          {/* DUSR in technical display font */}
          <span className="text-[10px] md:text-xs font-mono font-medium tracking-[0.25em] text-[#e5e2e1] uppercase">
            DUSR
          </span>
        </div>
      )}
    </div>
  );
}
