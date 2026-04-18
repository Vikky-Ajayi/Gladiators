import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { initializePayment } from '../api/payments';

export function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startPro = async () => {
    setError(null);
    if (!isAuthenticated) { navigate('/register'); return; }
    if (user?.is_pro) { navigate('/dashboard'); return; }
    setLoadingPlan('pro');
    try {
      const res = await initializePayment();
      window.location.href = res.authorization_url;
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.detail || 'Could not start payment.');
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: 'basic',
      name: 'Basic',
      price: 'Free',
      sub: 'One free scan to get started.',
      features: [
        '1 land verification',
        'Satellite boundary check',
        'Basic risk report',
        'Downloadable PDF',
      ],
      cta: user?.plan === 'basic' ? 'Current plan' : 'Get started',
      onClick: () => navigate(isAuthenticated ? '/dashboard' : '/register'),
      popular: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '₦5,000',
      priceSuffix: '/ month',
      sub: 'Unlimited scans + AI 50-year projections.',
      features: [
        'Unlimited verification scans',
        'Deep legal status check',
        'AI 50-year time-projection report',
        'Priority processing',
        'Premium PDF reports',
        'Email support',
      ],
      cta: user?.is_pro ? 'You are Pro' : 'Upgrade to Pro',
      onClick: startPro,
      popular: true,
      disabled: user?.is_pro,
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      sub: 'For developers and law firms.',
      features: [
        'Unlimited scans',
        'API access',
        'Bulk verification',
        'White-label reports',
        'Account manager',
      ],
      cta: 'Contact sales',
      onClick: () => window.location.href = 'mailto:hello@landrify.app?subject=Enterprise%20plan',
      popular: false,
    },
  ];

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-serif font-light text-gray-900 mb-8">
            Simple <span className="italic font-medium">Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 font-light leading-relaxed">
            Start free. Upgrade to Pro for unlimited scans and AI insights. Cancel anytime.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-10 rounded-[3rem] border transition-all ${
                plan.popular
                  ? 'bg-gray-900 text-white border-gray-800 shadow-2xl md:scale-105 z-10'
                  : 'bg-white text-gray-900 border-gray-100 shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-landrify-green text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-serif font-medium mb-2">{plan.name}</h3>
                <p className={`text-sm font-light ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.sub}</p>
              </div>

              <div className="mb-10">
                <span className="text-5xl font-bold tracking-tighter">{plan.price}</span>
                {plan.priceSuffix && (
                  <span className={`text-sm font-light ml-2 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                    {plan.priceSuffix}
                  </span>
                )}
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-landrify-green shrink-0" />
                    <span className={`text-sm font-light ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={plan.onClick}
                disabled={plan.disabled || loadingPlan === plan.key}
                className={`w-full h-14 text-base ${plan.popular ? 'bg-landrify-green hover:bg-landrify-green-dark' : ''}`}
              >
                {loadingPlan === plan.key ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</>
                ) : plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-xl font-serif font-medium mb-4 text-gray-700">Questions?</h3>
          <div className="flex justify-center gap-8 text-sm">
            <Link to="/how-it-works" className="text-landrify-green font-bold hover:underline">How it works</Link>
            <Link to="/about" className="text-landrify-green font-bold hover:underline">About</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
