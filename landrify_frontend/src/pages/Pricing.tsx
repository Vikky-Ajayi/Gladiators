import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Zap, Globe, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "₦5,000",
      desc: "Perfect for a single land verification.",
      features: [
        "1 Verification Scan",
        "Satellite Boundary Check",
        "Environmental Risk Assessment",
        "PDF Report",
        "7-Day Access"
      ],
      cta: "Included",
      link: "/dashboard",
      popular: false
    },
    {
      name: "Professional",
      price: "₦25,000",
      desc: "For serious investors and realtors.",
      features: [
        "6 Verification Scans",
        "Deep Legal Status Check",
        "Priority Processing",
        "Certified Reports",
        "30-Day Access",
        "Dedicated Support"
      ],
      cta: "Already Unlocked",
      link: "/dashboard",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For developers and law firms.",
      features: [
        "Unlimited Scans",
        "API Access",
        "Bulk Verification",
        "White-label Reports",
        "Custom Data Integration",
        "Account Manager"
      ],
      cta: "Already Unlocked",
      link: "/dashboard",
      popular: false
    }
  ];

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h1 className="text-5xl md:text-7xl font-serif font-light text-gray-900 mb-8">
            Simple <span className="italic font-medium">Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 font-light leading-relaxed">
            Choose the plan that fits your investment needs. No hidden fees, just pure verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-10 rounded-[3rem] border transition-all ${
                plan.popular 
                ? 'bg-gray-900 text-white border-gray-800 shadow-2xl scale-105 z-10' 
                : 'bg-white text-gray-900 border-gray-100 shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-landrify-green text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-10">
                <h3 className="text-2xl font-serif font-medium mb-2">{plan.name}</h3>
                <p className={`text-sm font-light ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
              </div>

              <div className="mb-10">
                <span className="text-5xl font-bold tracking-tighter">{plan.price}</span>
                {plan.price !== 'Custom' && <span className={`text-sm font-light ml-2 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>/ per scan</span>}
              </div>

              <div className="space-y-5 mb-12">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle2 className={`w-5 h-5 ${plan.popular ? 'text-landrify-green' : 'text-landrify-green'}`} />
                    <span className={`text-sm font-light ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              <Link to={plan.link}>
                <Button className={`w-full h-16 text-lg ${plan.popular ? 'bg-landrify-green hover:bg-landrify-green-dark' : ''}`}>
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="glass-card p-12 rounded-[3rem] shadow-xl border-white/40 bg-landrify-bg flex flex-col md:flex-row items-center justify-between gap-12 mb-24">
          <div className="max-w-xl">
            <h3 className="text-3xl font-serif font-medium text-gray-900 mb-4">Need a custom solution?</h3>
            <p className="text-gray-600 font-light leading-relaxed">
              We offer tailored packages for real estate developers, law firms, and financial institutions. Get in touch with our team for a personalized demo.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="h-16 px-12 text-lg">All Features Active</Button>
            </Link>
            <Link to="/dashboard">
              <Button className="h-16 px-12 text-lg">Go to Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-serif font-medium mb-8">Not sure which plan is right for you?</h3>
          <div className="flex justify-center gap-8">
            <Link to="/how-it-works" className="text-landrify-green font-bold hover:underline">See how it works</Link>
            <Link to="/about" className="text-landrify-green font-bold hover:underline">About our technology</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
