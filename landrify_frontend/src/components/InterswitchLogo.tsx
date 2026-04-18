/**
 * Interswitch logo marks — inline SVG so we never depend on external hosts.
 * Brand colors: red #E8242C, ink #1A1A1A.
 */

/** The "running figure" mark only — used as an icon (e.g. Quickteller row). */
export function InterswitchMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <img
      src="/interswitch-mark.png"
      alt=""
      aria-hidden="true"
      className={`object-contain ${className}`}
      referrerPolicy="no-referrer"
    />
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
