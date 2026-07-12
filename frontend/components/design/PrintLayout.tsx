'use client';

import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';

interface PrintLayoutProps {
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  projectionSrc: string;
  printRef: React.RefObject<HTMLDivElement | null>;
}

export default function PrintLayout({
  categories, selections, lang, projectionSrc, printRef,
}: PrintLayoutProps) {
  const isAr = lang === 'ar';
  const year = new Date().getFullYear();

  return (
    <div
      ref={printRef}
      style={{
        position: 'fixed',
        left: '-10000px',
        top: '-10000px',
        width: '794px',
        minHeight: '1123px',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'none',
        backgroundColor: '#ffffff',
        fontFamily: isAr ? 'Arial, "Noto Sans Arabic", sans-serif' : 'Arial, sans-serif',
        direction: isAr ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <div style={{ backgroundColor: '#131313', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Asset-1-square-removed-background.png"
          alt="Dusr logo"
          style={{ width: '52px', height: '52px', objectFit: 'contain' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold' }}>
            {isAr ? 'دسر لأنظمة المصاعد' : 'Dusr Elevators'}
          </div>
          <div style={{ color: '#cccccc', fontSize: '10px', marginTop: '3px' }}>
            {isAr ? 'تركيب وصيانة المصاعد — المملكة العربية السعودية' : 'Elevator Installation & Maintenance — Saudi Arabia'}
          </div>
          <div style={{ color: '#999999', fontSize: '9px', marginTop: '2px' }}>
            <span style={{ direction: 'ltr', unicodeBidi: 'embed', display: 'inline-block' }}>
              +966 53 970 5301
            </span>
            {' | dusr.sa'}
          </div>
        </div>
      </div>

      {/* Section title */}
      <div style={{ padding: '18px 28px 8px', borderBottom: '2px solid #FF5722' }}>
        <div style={{ color: '#FF5722', fontSize: '13px', fontWeight: 'bold', textTransform: isAr ? 'none' : 'uppercase', letterSpacing: isAr ? 'normal' : '1px' }}>
          {isAr ? 'تصميم كبينة المصعد' : 'Elevator Cabin Design'}
        </div>
      </div>

      {/* Projection image */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 28px' }}>
        {projectionSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={projectionSrc}
            alt="Design preview"
            style={{ width: '260px', height: 'auto', borderRadius: '12px', border: '1px solid #e5e5e5' }}
          />
        )}
      </div>

      {/* Component summary */}
      <div style={{ padding: '0 28px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
          {isAr ? 'ملخص المكونات' : 'Component Summary'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <tbody>
            {categories.map((cat, i) => {
              const sel = selections[cat.id];
              const catName = isAr ? cat.name_ar : cat.name_en;
              const optName = sel ? (isAr ? sel.name_ar : sel.name_en) : (isAr ? '—' : '—');
              return (
                <tr key={cat.id} style={{ backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#ffffff' }}>
                  <td style={{ padding: '7px 10px', color: '#666', width: '40%', borderBottom: '1px solid #eee' }}>
                    {catName}
                  </td>
                  <td style={{ padding: '7px 10px', color: '#222', fontWeight: sel ? '600' : 'normal', borderBottom: '1px solid #eee' }}>
                    {optName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Spacer pushes the footer to the bottom of the A4 page */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ backgroundColor: '#131313', padding: '10px 28px', textAlign: 'center' }}>
        <span style={{ color: '#888888', fontSize: '8px' }}>
          dusr.sa | © {year} {isAr ? 'دسر للمصاعد. جميع الحقوق محفوظة.' : 'Dusr Elevators. All rights reserved.'}
        </span>
      </div>
    </div>
  );
}
