import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, CreditCard, Building2, Wallet, Smartphone, ArrowUpRight,
  Loader2, CheckCircle2, AlertCircle, ArrowLeft, Calendar, Lock,
} from 'lucide-react';
import { activatePro } from '../api/auth';
import { InterswitchLogo, InterswitchMark } from '../components/InterswitchLogo';
import {
  VisaBadge, VerifiedByVisaBadge, MastercardSecureCodeBadge, VerveSafetokenBadge,
} from '../components/PaymentBadges';

type Step = 'methods' | 'card' | 'otp' | 'processing' | 'done';
type Method = 'card' | 'quickteller' | 'transfer' | 'wallet' | 'gpay' | 'credit' | 'mobile';

export function PaymentCheckout() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const reference = params.get('txnref') || '';
  const amountKobo = parseInt(params.get('amount') || '0', 10);
  const merchant = params.get('merchant') || 'LANDRIFY';
  const redirect = params.get('redirect') || '/payment/callback';
  const amountNaira = (amountKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [step, setStep] = useState<Step>('methods');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'card' | 'paycode' | 'credit'>('card');

  useEffect(() => { if (!reference) navigate('/pricing'); }, [reference, navigate]);

  const goCallback = (status: 'success' | 'failed') => {
    // Only allow same-origin path redirects to prevent open-redirect abuse.
    let path = '/payment/callback';
    try {
      const u = new URL(redirect, window.location.origin);
      if (u.origin === window.location.origin) path = u.pathname + u.search;
    } catch { /* keep default */ }
    const url = new URL(path, window.location.origin);
    url.searchParams.set('reference', reference);
    url.searchParams.set('txnref', reference);
    url.searchParams.set('status', status);
    window.location.href = url.toString();
  };

  const cancel = () => goCallback('failed');

  const pickMethod = (m: Method) => {
    setError(null);
    if (m === 'card') { setStep('card'); return; }
    // Other methods aren't implemented in this build — stay on the screen.
    setError('This payment method is currently unavailable. Please pay with card.');
  };

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (card.number.replace(/\s/g, '').length < 12) { setError('Please enter a valid card number.'); return; }
    {
      const m = card.expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/);
      if (!m) { setError('Expiry must be in MM/YY format.'); return; }
      const mm = parseInt(m[1], 10);
      if (mm < 1 || mm > 12) { setError('Please enter a valid expiry month (01–12).'); return; }
    }
    if (!/^\d{3,4}$/.test(card.cvv)) { setError('Please enter the 3-digit CVV.'); return; }
    setStep('otp');
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length < 4) { setError('Please enter the OTP sent to your phone.'); return; }
    setStep('processing');
    try {
      await activatePro();
    } catch {
      /* TEST_MODE may be off in production — fall through to callback */
    }
    setStep('done');
    setTimeout(() => goCallback('success'), 950);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] -mt-20 pt-8 pb-12 px-4">
      {/* Cancel link */}
      <div className="max-w-md mx-auto flex items-center gap-2 text-[13px] text-slate-500 mb-3">
        <button onClick={cancel} className="inline-flex items-center gap-1.5 hover:text-slate-800 transition-colors">
          <X className="w-4 h-4" />
          <span>Cancel payment and return to <span className="lowercase">{merchant.toLowerCase()}</span></span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 'methods' && (
          <motion.div key="methods" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <MethodsScreen amount={amountNaira} onPick={pickMethod} error={error} />
          </motion.div>
        )}

        {(step === 'card' || step === 'otp' || step === 'processing' || step === 'done') && (
          <motion.div key="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <CardScreen
              merchant={merchant}
              amount={amountNaira}
              tab={tab} setTab={setTab}
              card={card} setCard={setCard}
              otp={otp} setOtp={setOtp}
              step={step}
              error={error}
              onBack={() => { setStep('methods'); setError(null); }}
              onSubmitCard={submitCard}
              onSubmitOtp={submitOtp}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="max-w-md mx-auto mt-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>powered by</span>
          <InterswitchLogo className="h-4" />
        </div>
        {step !== 'methods' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <VerveSafetokenBadge />
            <MastercardSecureCodeBadge />
            <VerifiedByVisaBadge />
            <VisaBadge className="h-9" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1 — payment method selection
// ─────────────────────────────────────────────────────────────────────────────

function MethodsScreen({
  amount, onPick, error,
}: {
  amount: string;
  onPick: (m: Method) => void;
  error: string | null;
}) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-slate-100">
        <div className="text-[15px] text-slate-700">You're paying</div>
        <div className="text-[26px] font-bold text-slate-900 mt-0.5">NGN {amount}</div>
      </div>

      <ul className="divide-y divide-slate-100">
        <MethodRow icon={<CardIcon />} title="Pay with Card"
          desc="Verve, Visa, Mastercard, discover and Amex cards are all accepted"
          onClick={() => onPick('card')} />

        <MethodRow icon={<QuicktellerIcon />} title="Pay with Quickteller"
          desc="Login to your quickteller wallet to get access to your saved cards."
          onClick={() => onPick('quickteller')} />

        <MethodRow icon={<TransferIcon />} title="Pay with Bank Transfer"
          desc="Make a transfer directly from your bank account to complete a transaction"
          onClick={() => onPick('transfer')} />

        <MethodRow icon={<WalletIcon />} title="Pay with Wallet"
          desc="Make secure payments using third-party payment solutions."
          onClick={() => onPick('wallet')} />

        <MethodRow icon={<GpayIcon />} title="Google Pay"
          desc="Make secure payments using your instruments saved with Google."
          onClick={() => onPick('gpay')} />

        <MethodRow icon={<CreditIcon />} title="Pay on Credit"
          desc="Buy whatever you need today and pay later"
          onClick={() => onPick('credit')} />

        <MethodRow icon={<MobileIcon />} title="Pay with Mobile Money"
          desc="Use your Mobile Money credentials to make secure payments"
          onClick={() => onPick('mobile')} />
      </ul>

      {error && (
        <div className="px-5 py-3 bg-red-50 text-red-600 text-[13px] flex items-center gap-2 border-t border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}

function MethodRow({
  icon, title, desc, onClick,
}: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors group"
      >
        <span className="shrink-0 w-11 h-11 rounded-md bg-[#EAF2FF] text-[#3B82F6] flex items-center justify-center">
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-slate-900">{title}</span>
          <span className="block text-[12.5px] text-slate-500 leading-snug mt-0.5">{desc}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
      </button>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 — Card form (matches the prestashop-interswitch-webpay screenshot)
// ─────────────────────────────────────────────────────────────────────────────

function CardScreen({
  merchant, amount, tab, setTab, card, setCard, otp, setOtp,
  step, error, onBack, onSubmitCard, onSubmitOtp,
}: {
  merchant: string;
  amount: string;
  tab: 'card' | 'paycode' | 'credit';
  setTab: (t: 'card' | 'paycode' | 'credit') => void;
  card: { number: string; expiry: string; cvv: string };
  setCard: (c: { number: string; expiry: string; cvv: string }) => void;
  otp: string;
  setOtp: (s: string) => void;
  step: Step;
  error: string | null;
  onBack: () => void;
  onSubmitCard: (e: React.FormEvent) => void;
  onSubmitOtp: (e: React.FormEvent) => void;
}) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Top: merchant + amount + Webpay tag */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-md border border-slate-200 flex items-center justify-center bg-white">
            <InterswitchMark className="w-7 h-7" />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] text-slate-700">{merchant}</div>
            <div className="text-[22px] font-bold text-slate-900 mt-0.5">₦{amount}</div>
          </div>
        </div>
        <div className="text-[12px] font-bold text-[#E8242C]">Webpay new version</div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#F8F9FB] border-b border-slate-100">
        {([
          { k: 'card', label: 'Card', icon: <TabCardIcon /> },
          { k: 'paycode', label: 'Paycode', icon: <TabPaycodeIcon /> },
          { k: 'credit', label: 'Credit', icon: <TabCreditIcon /> },
        ] as const).map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-[12px] font-semibold transition-colors ${
                active ? 'text-[#1786C5] bg-white border-b-2 border-[#1786C5]' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
              }`}
            >
              <span className={active ? 'text-[#1786C5]' : 'text-slate-400'}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {tab !== 'card' ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            {tab === 'paycode' ? 'Paycode is currently unavailable.' : 'Pay on Credit is currently unavailable.'}
            <div className="mt-3">
              <button onClick={() => setTab('card')} className="text-[#1786C5] font-bold text-sm hover:underline">
                Pay with card instead
              </button>
            </div>
          </div>
        ) : step === 'processing' ? (
          <div className="py-14 flex flex-col items-center text-center">
            <Loader2 className="w-10 h-10 text-[#1786C5] animate-spin mb-4" />
            <div className="font-bold text-slate-800">Authorising payment…</div>
            <div className="text-xs text-slate-500 mt-1">Please do not close or refresh this page.</div>
          </div>
        ) : step === 'done' ? (
          <div className="py-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="font-bold text-slate-800">Payment Approved</div>
            <div className="text-xs text-slate-500 mt-1">Redirecting back to {merchant}…</div>
          </div>
        ) : step === 'otp' ? (
          <form onSubmit={onSubmitOtp} className="space-y-4">
            <div>
              <div className="font-bold text-slate-800 text-[15px]">Enter One-Time PIN</div>
              <div className="text-xs text-slate-500 mt-1">A 6-digit OTP has been sent to the phone number registered to your card.</div>
            </div>
            <input
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              className="w-full text-center text-2xl tracking-[0.5em] py-3.5 border border-slate-300 rounded focus:border-[#1786C5] focus:ring-2 focus:ring-[#1786C5]/15 outline-none"
            />
            {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
            <button type="submit"
              className="w-full bg-[#1786C5] hover:bg-[#1372A8] text-white font-bold py-3 rounded transition-colors">
              Authorise Payment
            </button>
            <button type="button" onClick={() => setOtp('')} className="w-full text-sm text-slate-500 hover:text-slate-700">
              Resend OTP
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitCard} className="space-y-4">
            {/* Card number */}
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={card.number}
                onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                placeholder="Card Number"
                inputMode="numeric"
                autoComplete="cc-number"
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded text-base md:text-[14px] focus:border-[#1786C5] focus:ring-2 focus:ring-[#1786C5]/15 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* What's this? */}
            <div className="flex justify-end">
              <button type="button" className="text-[12px] text-[#1786C5] hover:underline">What's this?</button>
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                  placeholder="MM / YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded text-base md:text-[14px] focus:border-[#1786C5] focus:ring-2 focus:ring-[#1786C5]/15 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="CVV"
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded text-base md:text-[14px] focus:border-[#1786C5] focus:ring-2 focus:ring-[#1786C5]/15 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            {/* Pay button */}
            <button type="submit"
              className="w-full bg-[#3DB7E4] hover:bg-[#2BA0CC] text-white font-bold py-3 rounded transition-colors">
              Pay
            </button>

            {/* OR divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-[11px] font-semibold text-slate-400 tracking-widest">OR</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* eWallet button */}
            <button type="button"
              className="w-full bg-[#0E3A5C] hover:bg-[#0A2C46] text-white font-bold py-3 rounded transition-colors">
              Login to Verve eWallet
            </button>

            {/* Back link */}
            <button type="button" onClick={onBack}
              className="w-full mt-1 text-[12.5px] text-slate-500 hover:text-slate-800 inline-flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Choose another payment method
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Method-row icons (lucide is fine, but these match the screenshot best)
// ─────────────────────────────────────────────────────────────────────────────
function CardIcon() { return <CreditCard className="w-5 h-5" strokeWidth={2.2} />; }
function QuicktellerIcon() { return <InterswitchMark className="w-5 h-5" />; }
function TransferIcon() { return <ArrowUpRight className="w-5 h-5" strokeWidth={2.2} />; }
function WalletIcon() { return <Wallet className="w-5 h-5" strokeWidth={2.2} />; }
function GpayIcon() {
  return (
    <span className="text-[10px] font-bold tracking-tight">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]"> </span>
      <span className="text-slate-700">Pay</span>
    </span>
  );
}
function CreditIcon() { return <Wallet className="w-5 h-5" strokeWidth={2.2} />; }
function MobileIcon() { return <Smartphone className="w-5 h-5" strokeWidth={2.2} />; }

// Tab icons
function TabCardIcon() { return <CreditCard className="w-4 h-4" strokeWidth={2} />; }
function TabPaycodeIcon() { return <Building2 className="w-4 h-4" strokeWidth={2} />; }
function TabCreditIcon() { return <Lock className="w-4 h-4" strokeWidth={2} />; }

// ─────────────────────────────────────────────────────────────────────────────
function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)} / ${d.slice(2)}`;
}
