/**
 * Interswitch logo marks — inline SVG so we never depend on external hosts.
 * Brand colors: red #E8242C, ink #1A1A1A.
 */

/** The "running figure" mark only — used as an icon (e.g. Quickteller row). */
export function InterswitchMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Head */}
      <circle cx="20" cy="6" r="5" fill="#E8242C" />
      {/* Body / leading leg */}
      <path d="M8 38 Q12 22 22 18 Q26 16 28 22 L24 26 Q20 24 18 30 L14 38 Z" fill="#E8242C" />
      {/* Trailing leg */}
      <path d="M3 36 Q9 30 14 32 L11 38 Z" fill="#E8242C" opacity="0.85" />
    </svg>
  );
}

/** Full wordmark — mark + "interswitch" lowercase text. */
export function InterswitchLogo({ className = 'h-6' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <InterswitchMark className="h-full w-auto" />
      <span className="font-bold text-[#1A1A1A] text-[1.05em] tracking-tight lowercase">interswitch</span>
    </span>
  );
}
