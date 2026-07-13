/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Lang } from '@/lib/lang';

export default function DesignCTAButton({ lang }: { lang: Lang }) {
  const href = lang === 'en' ? '/en/design' : '/design';
  const isRtl = lang === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1 }}
      className={`fixed bottom-6 md:bottom-10 z-[60] ${isRtl ? 'left-6 md:left-10' : 'right-6 md:right-10'}`}
    >
      <Link
        href={href}
        className="group relative flex items-center gap-2.5 bg-[#131313] border border-[#FF5722]/40 text-[#e5e2e1] font-sans font-bold text-sm pl-4 pr-5 py-3.5 rounded-full shadow-lg shadow-black/40 hover:border-[#FF5722] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
      >
        <span className="absolute inset-0 rounded-full bg-[#FF5722]/20 animate-ping motion-reduce:animate-none" />
        <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#FF5722]/15 text-[#FF5722]">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="relative">
          {lang === 'ar' ? 'صمم مصعدك' : 'Design Your Elevator'}
        </span>
      </Link>
    </motion.div>
  );
}
