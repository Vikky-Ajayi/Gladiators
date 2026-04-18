import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, CreditCard, ShieldCheck, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { setDemoPro } from '../lib/demoState';

/**
 * Simulated Interswitch hosted checkout page. Visually mirrors the real
 * Interswitch / Quickteller hosted page. When the user submits, we call
 * /api/v1/payments/mock-confirm/ which marks the transaction successful
 * and upgrades the user to Pro — the same outcome as Interswitch's
 * server-to-server callback in production.
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

  const [tab, setTab] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [card, setCard] = useState({ number: '5060 9911 9909 7000', expiry: '12/30', cvv: '123', pin: '1234' });
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
    if (card.number.replace(/\s/g, '').length < 12) { setError('Enter a valid card number.'); return; }
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) { setError('Expiry must be MM/YY.'); return; }
    if (!/^\d{3,4}$/.test(card.cvv)) { setError('CVV must be 3 digits.'); return; }
    setStep('otp');
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length < 4) { setError('Enter the OTP sent to your phone.'); return; }
    setSubmitting(true);
    setStep('processing');
    // Simulate gateway authorisation latency for realism.
    await new Promise((r) => setTimeout(r, 1600));
    setDemoPro();
    setStep('done');
    setTimeout(() => goCallback('success'), 900);
    setSubmitting(false);
  };

  const cancel = () => {
    goCallback('failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 -mt-20 pt-20 pb-16">
      {/* Top bar mimicking Interswitch */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#0033A0] text-white flex items-center justify-center font-bold text-sm">i</div>
            <span className="font-bold text-slate-900">Interswitch</span>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">· Quickteller Payments</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Lock className="w-3.5 h-3.5" /> Secure
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-5 gap-6">
          {/* Order summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Pay to</div>
              <div className="text-lg font-bold text-slate-900 mb-6">{merchant}</div>

              <div className="space-y-3 text-sm">
                <Row label="Description" value="Landrify Pro Subscription" />
                <Row label="Customer" value={customerName} />
                <Row label="Email" value={email} mono />
                <Row label="Reference" value={reference} mono small />
                <Row label="Currency" value="NGN" />
              </div>

              <div className="border-t border-dashed border-slate-200 my-5" />

              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount</span>
                <span className="text-3xl font-bold text-slate-900">₦{amountNaira}</span>
              </div>
            </div>

            <div className="mt-4 px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span><strong>Demo mode:</strong> No real charge. The card is pre-filled with test data — just click <em>Pay</em> to simulate a successful Interswitch transaction.</span>
            </div>
          </div>

          {/* Payment form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                {([
                  { k: 'card', label: 'Card' },
                  { k: 'transfer', label: 'Bank Transfer' },
                  { k: 'ussd', label: 'USSD' },
                ] as const).map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                      tab === t.k ? 'text-[#0033A0] bg-white border-b-2 border-[#0033A0]' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {tab !== 'card' ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    {tab === 'transfer' ? 'Bank transfer is unavailable in demo mode.' : 'USSD is unavailable in demo mode.'}
                    <div className="mt-3">
                      <button onClick={() => setTab('card')} className="text-[#0033A0] font-bold text-sm hover:underline">
                        Pay with card instead
                      </button>
                    </div>
                  </div>
                ) : step === 'processing' ? (
                  <div className="py-16 flex flex-col items-center text-center">
                    <Loader2 className="w-10 h-10 text-[#0033A0] animate-spin mb-4" />
                    <div className="font-bold text-slate-800">Authorising payment…</div>
                    <div className="text-xs text-slate-500 mt-1">Do not close this page.</div>
                  </div>
                ) : step === 'done' ? (
                  <div className="py-16 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="font-bold text-slate-800">Approved</div>
                    <div className="text-xs text-slate-500 mt-1">Redirecting back to Landrify…</div>
                  </div>
                ) : step === 'otp' ? (
                  <form onSubmit={submitOtp} className="space-y-5">
                    <div>
                      <div className="font-bold text-slate-800">Enter OTP</div>
                      <div className="text-xs text-slate-500 mt-1">A one-time PIN has been sent to the phone number on your card. (For demo, any 4–6 digits work.)</div>
                    </div>
                    <input
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      inputMode="numeric"
                      className="w-full text-center text-2xl tracking-[0.5em] py-4 border-2 border-slate-200 rounded-xl focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 outline-none"
                    />
                    {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
                    <button type="submit" disabled={submitting}
                      className="w-full bg-[#0033A0] hover:bg-[#002578] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors">
                      Authorise
                    </button>
                    <button type="button" onClick={() => setStep('form')}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </form>
                ) : (
                  <form onSubmit={startPay} className="space-y-4">
                    <Field label="Card number">
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
                          placeholder="0000 0000 0000 0000"
                          inputMode="numeric"
                          className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 outline-none font-mono"
                        />
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Expiry (MM/YY)">
                        <input
                          value={card.expiry}
                          onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                          placeholder="MM/YY"
                          inputMode="numeric"
                          className="w-full px-3.5 py-3 border border-slate-200 rounded-xl focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 outline-none font-mono"
                        />
                      </Field>
                      <Field label="CVV">
                        <input
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="123"
                          type="password"
                          inputMode="numeric"
                          className="w-full px-3.5 py-3 border border-slate-200 rounded-xl focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 outline-none font-mono"
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
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-xl focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20 outline-none font-mono"
                      />
                    </Field>

                    {error && <div className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

                    <button type="submit"
                      className="w-full bg-[#0033A0] hover:bg-[#002578] text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> Pay ₦{amountNaira}
                    </button>
                    <button type="button" onClick={cancel}
                      className="w-full text-sm text-slate-500 hover:text-red-600">
                      Cancel payment
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS · 3-D Secure · Powered by Interswitch
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
