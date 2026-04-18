import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, CreditCard, ShieldCheck, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Building2, Smartphone, QrCode } from 'lucide-react';
import { setDemoPro } from '../lib/demoState';
import { InterswitchLogo } from '../components/InterswitchLogo';

/**
 * Interswitch hosted checkout page. Layout, colors, copy, and flow mirror
 * Interswitch's production hosted page (pay.interswitchng.com).
 */
export function PaymentCheckout() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const reference = params.get('txnref') || '';
  const amountKobo = parseInt(params.get('amount') || '0', 10);
  const email = params.get('email') || '';
  const customerName = params.get('name') || '';
  const merchant = params.get('merchant') || 'LANDRIFY';
  const redirect = params.get('redirect') || '/payment/callback';
  const amountNaira = (amountKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [tab, setTab] = useState<'card' | 'transfer' | 'ussd' | 'qr'>('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', pin: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp' | 'processing' | 'done'>('form');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!reference) navigate('/pricing');
  }, [reference, navigate]);

  const goCallback = (status: 'success' | 'failed') => {
    const url = new URL(redirect, window.location.origin);
    url.searchParams.set('reference', reference);
    url.searchParams.set('txnref', reference);
    url.searchParams.set('status', status);
    window.location.href = url.toString();
  };

  const startPay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (card.number.replace(/\s/g, '').length < 12) { setError('Please enter a valid card number.'); return; }
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) { setError('Expiry must be in MM/YY format.'); return; }
    if (!/^\d{3,4}$/.test(card.cvv)) { setError('Please enter the 3-digit CVV from the back of your card.'); return; }
    if (!/^\d{4}$/.test(card.pin)) { setError('Please enter your 4-digit card PIN.'); return; }
    setStep('otp');
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length < 4) { setError('Please enter the OTP sent to your phone.'); return; }
    setSubmitting(true);
    setStep('processing');
    await new Promise((r) => setTimeout(r, 1700));
    setDemoPro();
    setStep('done');
    setTimeout(() => goCallback('success'), 950);
    setSubmitting(false);
  };

  const cancel = () => goCallback('failed');

  return (
    <div className="min-h-screen bg-[#F4F5F7] -mt-20 pt-20 pb-16">
      {/* Top brand bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <InterswitchLogo className="h-7" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Lock className="w-3.5 h-3.5" /> Secured by Interswitch
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-5 gap-5">
          {/* Order summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Pay to</div>
              <div className="text-base font-bold text-slate-900 mb-5">{merchant}</div>

              <div className="space-y-2.5 text-[13px]">
                <Row label="Description" value="Landrify Pro Subscription" />
                <Row label="Customer" value={customerName} />
                <Row label="Email" value={email} mono />
                <Row label="Reference" value={reference} mono small />
                <Row label="Currency" value="NGN" />
              </div>

              <div className="border-t border-dashed border-slate-200 my-4" />

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Amount</span>
                <span className="text-2xl font-bold text-slate-900">₦{amountNaira}</span>
              </div>
            </div>

            <div className="hidden md:flex mt-4 items-center justify-center gap-4 text-slate-400">
              <CardBrand kind="visa" />
              <CardBrand kind="mc" />
              <CardBrand kind="verve" />
            </div>
          </div>

          {/* Payment form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
                {([
                  { k: 'card', label: 'Card', icon: CreditCard },
                  { k: 'transfer', label: 'Bank Transfer', icon: Building2 },
                  { k: 'ussd', label: 'USSD', icon: Smartphone },
                  { k: 'qr', label: 'QR', icon: QrCode },
                ] as const).map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.k;
                  return (
                    <button
                      key={t.k}
                      onClick={() => setTab(t.k)}
                      className={`flex-1 min-w-[88px] py-3 flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
                        active ? 'text-[#E8242C] border-b-2 border-[#E8242C] bg-[#FFF7F7]' : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-5 sm:p-6">
                {tab !== 'card' ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    {tab === 'transfer' && 'Bank transfer is currently unavailable for this merchant.'}
                    {tab === 'ussd' && 'USSD is currently unavailable for this merchant.'}
                    {tab === 'qr' && 'QR payment is currently unavailable for this merchant.'}
                    <div className="mt-3">
                      <button onClick={() => setTab('card')} className="text-[#E8242C] font-bold text-sm hover:underline">
                        Pay with card instead
                      </button>
                    </div>
                  </div>
                ) : step === 'processing' ? (
                  <div className="py-16 flex flex-col items-center text-center">
                    <Loader2 className="w-10 h-10 text-[#E8242C] animate-spin mb-4" />
                    <div className="font-bold text-slate-800">Authorising payment…</div>
                    <div className="text-xs text-slate-500 mt-1">Please do not close or refresh this page.</div>
                  </div>
                ) : step === 'done' ? (
                  <div className="py-16 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="font-bold text-slate-800">Payment Approved</div>
                    <div className="text-xs text-slate-500 mt-1">Redirecting back to {merchant}…</div>
                  </div>
                ) : step === 'otp' ? (
                  <form onSubmit={submitOtp} className="space-y-5">
                    <div>
                      <div className="font-bold text-slate-800">Enter One-Time PIN</div>
                      <div className="text-xs text-slate-500 mt-1">A 6-digit OTP has been sent to the phone number registered to your card.</div>
                    </div>
                    <input
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      inputMode="numeric"
                      className="w-full text-center text-2xl tracking-[0.5em] py-4 border-2 border-slate-200 rounded-lg focus:border-[#E8242C] focus:ring-2 focus:ring-[#E8242C]/15 outline-none"
                    />
                    {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                    <button type="submit" disabled={submitting}
                      className="w-full bg-[#E8242C] hover:bg-[#C81F26] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors">
                      Authorise Payment
                    </button>
                    <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null); }}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </form>
                ) : (
                  <form onSubmit={startPay} className="space-y-4">
                    <Field label="Card Number">
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                          placeholder="0000 0000 0000 0000"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:border-[#E8242C] focus:ring-2 focus:ring-[#E8242C]/15 outline-none font-mono text-[15px]"
                        />
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Expiry Date">
                        <input
                          value={card.expiry}
                          onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                          placeholder="MM/YY"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          className="w-full px-3.5 py-3 border border-slate-200 rounded-lg focus:border-[#E8242C] focus:ring-2 focus:ring-[#E8242C]/15 outline-none font-mono text-[15px]"
                        />
                      </Field>
                      <Field label="CVV">
                        <input
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="123"
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          className="w-full px-3.5 py-3 border border-slate-200 rounded-lg focus:border-[#E8242C] focus:ring-2 focus:ring-[#E8242C]/15 outline-none font-mono text-[15px]"
                        />
                      </Field>
                    </div>
                    <Field label="Card PIN">
                      <input
                        value={card.pin}
                        onChange={(e) => setCard({ ...card, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="••••"
                        type="password"
                        inputMode="numeric"
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-lg focus:border-[#E8242C] focus:ring-2 focus:ring-[#E8242C]/15 outline-none font-mono text-[15px] tracking-[0.5em]"
                      />
                    </Field>

                    {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

                    <button type="submit"
                      className="w-full bg-[#E8242C] hover:bg-[#C81F26] text-white font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Lock className="w-4 h-4" /> Pay ₦{amountNaira}
                    </button>
                    <button type="button" onClick={cancel}
                      className="w-full text-sm text-slate-500 hover:text-red-600">
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Level 1 · 3-D Secure · Powered by Interswitch
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-800 text-right break-all ${mono ? 'font-mono' : 'font-medium'} ${small ? 'text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

function CardBrand({ kind }: { kind: 'visa' | 'mc' | 'verve' }) {
  if (kind === 'visa') return (
    <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[10px] font-black tracking-widest text-[#1A1F71]">VISA</div>
  );
  if (kind === 'mc') return (
    <div className="px-2 py-1 bg-white border border-slate-200 rounded flex items-center gap-0.5">
      <span className="w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
      <span className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-1.5 mix-blend-multiply" />
    </div>
  );
  return (
    <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[10px] font-black tracking-widest text-[#0F4F2F]">verve</div>
  );
}
