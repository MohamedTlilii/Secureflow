interface LogoIconProps {
  size: number;
  glow?: 'soft' | 'strong';
}

export function LogoIcon({ size, glow = 'soft' }: LogoIconProps) {
  const filter = glow === 'strong'
    ? 'drop-shadow(0 0 8px rgba(18,183,106,0.95)) drop-shadow(0 0 18px rgba(6,182,212,0.6))'
    : 'drop-shadow(0 0 6px rgba(18,183,106,0.95)) drop-shadow(0 0 12px rgba(6,182,212,0.5))';
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ filter }}>
      <circle cx="10" cy="6" r="4" fill="white"/>
      <path d="M6 12 Q10 10 14 12 L13 22 H7 Z" fill="white"/>
      <path d="M14 14 Q20 11 25 13" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M24 11 Q27 12 26 15 Q23 16 22 14" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="9" r="3.5" fill="none" stroke="white" strokeWidth="1.8"/>
    </svg>
  );
}
