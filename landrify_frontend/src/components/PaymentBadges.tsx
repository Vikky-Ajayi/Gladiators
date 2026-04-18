/**
 * Inline-SVG card-scheme & security badges that appear at the bottom of the
 * Interswitch hosted checkout. Self-contained — no external image loads.
 */

export function VisaBadge({ className = 'h-7' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center bg-white border border-slate-200 rounded px-2.5 ${className}`}>
      <span className="font-black italic tracking-tighter text-[#1A1F71] text-[1em]">VISA</span>
    </div>
  );
}

export function VerifiedByVisaBadge({ className = 'h-9' }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center justify-center bg-white border border-slate-200 rounded px-2 ${className}`}>
      <span className="text-[7px] font-semibold text-slate-700 leading-none">Verified by</span>
      <span className="font-black italic tracking-tighter text-[#1A1F71] leading-none mt-0.5 text-[14px]">VISA</span>
    </div>
  );
}

export function MastercardSecureCodeBadge({ className = 'h-9' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 ${className}`}>
      <span className="relative inline-block w-5 h-5">
        <span className="absolute inset-0 left-0 w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
        <span className="absolute inset-0 left-1.5 w-3.5 h-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[8px] font-bold text-[#EB001B]">MasterCard.</span>
        <span className="text-[8px] font-bold text-slate-800">SecureCode.</span>
      </span>
    </div>
  );
}

export function VerveSafetokenBadge({ className = 'h-9' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 bg-white border border-slate-200 rounded px-2 ${className}`}>
      <span className="relative inline-block w-4 h-4">
        <span className="absolute inset-0 rounded-full bg-[#E8242C]" />
        <span className="absolute inset-0 rounded-full bg-[#FBB31F] mix-blend-multiply translate-x-1" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-black text-[#E8242C]">Verve</span>
        <span className="text-[7px] text-slate-600 -mt-0.5">safetoken</span>
      </span>
    </div>
  );
}

export function MasterpassBadge({ className = 'h-9' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 ${className}`}>
      <span className="relative inline-block w-5 h-5">
        <span className="absolute inset-0 left-0 w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
        <span className="absolute inset-0 left-1.5 w-3.5 h-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
      <span className="text-[9px] font-medium text-slate-700">masterpass</span>
    </div>
  );
}
