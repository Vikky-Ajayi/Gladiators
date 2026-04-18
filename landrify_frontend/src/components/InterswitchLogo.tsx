/**
 * Interswitch wordmark — inline SVG so we never depend on an external host.
 * Colors match the official Interswitch brand (red-orange #E8242C + ink #1B1B1B).
 */
export function InterswitchLogo({ className = 'h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Interswitch"
    >
      {/* Stylized "i" — running figure mark */}
      <g transform="translate(2,4)">
        {/* head dot */}
        <circle cx="22" cy="10" r="9" fill="#E8242C" />
        {/* body / running stroke */}
        <path
          d="M14 24 L30 24 L26 56 L10 56 Z"
          fill="#E8242C"
        />
        {/* trailing motion swoosh */}
        <path
          d="M2 38 Q14 30 26 38"
          stroke="#E8242C"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </g>
      {/* nterswitch wordmark */}
      <text
        x="48"
        y="44"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="34"
        fontWeight="700"
        fill="#1B1B1B"
        letterSpacing="-1"
      >
        nterswitch
      </text>
    </svg>
  );
}
