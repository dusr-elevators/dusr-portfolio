import dusrLogo from '../assets/dusr-logo.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  lang?: 'ar' | 'en';
}

export default function Logo({ className = '', showText = true, lang = 'ar' }: LogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src={dusrLogo}
        alt={lang === 'ar' ? 'شعار دسر' : 'Dusr logo'}
        className={`h-14 w-auto object-contain ${showText ? 'max-w-[180px]' : 'max-w-[64px]'}`}
      />
    </div>
  );
}
