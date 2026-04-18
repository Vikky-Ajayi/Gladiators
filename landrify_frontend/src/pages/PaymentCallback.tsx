import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { verifyPayment } from '../api/payments';
import { useAuth } from '../hooks/useAuth';

export function PaymentCallback() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const reference = params.get('reference') || params.get('txnref') || '';

  const [state, setState] = useState<'verifying' | 'success' | 'failed' | 'pending'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!reference) {
      setState('failed');
      setMessage('No transaction reference was provided.');
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 5; i++) {
        try {
          const r = await verifyPayment(reference);
          if (cancelled) return;
          if (r.status === 'success') {
            setState('success');
            setMessage(r.message || 'Pro is now active on your account.');
            await refresh();
            return;
          }
          if (r.status === 'failed') {
            setState('failed');
            setMessage('The payment was not completed.');
            return;
          }
        } catch (e: any) {
          if (e?.response?.status === 404) {
            setState('failed');
            setMessage('Transaction not found.');
            return;
          }
        }
        await new Promise((res) => setTimeout(res, 1200));
      }
      if (!cancelled) {
        setState('pending');
        setMessage('Still confirming with the gateway. Please refresh in a moment.');
      }
    })();
    return () => { cancelled = true; };
  }, [reference, refresh]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-gray-100 rounded-3xl shadow-xl p-10 text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-14 h-14 text-landrify-green animate-spin mx-auto mb-5" />
            <h1 className="text-2xl font-serif text-gray-900 mb-2">Confirming payment…</h1>
            <p className="text-sm text-gray-500">Hold on while we verify your transaction.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">Payment successful</h1>
            <p className="text-sm text-gray-500 mb-2">{message}</p>
            {reference && <p className="text-[11px] font-mono text-gray-400 mb-6">Ref: {reference}</p>}
            <Button onClick={() => navigate('/dashboard')} className="w-full h-12">
              Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-9 h-9 text-red-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">Payment failed</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="flex gap-3">
              <Link to="/pricing" className="flex-1"><Button variant="outline" className="w-full h-12">Try again</Button></Link>
              <Link to="/dashboard" className="flex-1"><Button className="w-full h-12">Dashboard</Button></Link>
            </div>
          </>
        )}
        {state === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <RefreshCcw className="w-9 h-9 text-amber-600" />
            </div>
            <h1 className="text-2xl font-serif text-gray-900 mb-2">Still processing</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Button onClick={() => window.location.reload()} className="w-full h-12">
              <RefreshCcw className="mr-2 w-4 h-4" /> Check again
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
