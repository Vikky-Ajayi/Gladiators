import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Map, 
  Search, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Globe,
  Zap,
  Lock,
  Activity,
  Database,
  Satellite
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export function HowItWorks() {
  const steps = [
    {
      icon: <Search className="w-8 h-8" strokeWidth={1.5} />,
      title: "Input Location",
      desc: "Enter the land's address, coordinates, or drop a pin on our interactive map. Our system supports all 36 states in Nigeria."
    },
    {
      icon: <Satellite className="w-8 h-8" strokeWidth={1.5} />,
      title: "Satellite Analysis",
      desc: "We use high-resolution satellite imagery to verify boundaries, check for encroachments, and analyze the topography of the land."
    },
    {
      icon: <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />,
      title: "Registry Cross-Check",
      desc: "Our AI cross-references the land data with state land registries to verify the title status (C of O, Governor's Consent, etc.)."
    },
    {
      icon: <FileText className="w-8 h-8" strokeWidth={1.5} />,
      title: "Risk Assessment",
      desc: "We evaluate environmental factors like flood risk, soil stability, and erosion to give you a comprehensive risk score."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="py-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-landrify-green/10 text-landrify-green mb-8 border border-landrify-green/20"
          >
            <Sparkles size={14} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Our Process</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif font-light text-landrify-ink mb-8 tracking-tight"
          >
            How <span className="italic font-medium">Landrify</span> Works
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 font-light leading-relaxed"
          >
            We've simplified the complex process of land verification into four easy steps, powered by advanced AI and real-time data.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10"
        >
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="relative p-10 rounded-[2.5rem] bg-white border border-landrify-line shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-landrify-ink text-white rounded-full flex items-center justify-center font-bold text-sm shadow-xl group-hover:bg-landrify-green transition-colors duration-500">
                0{idx + 1}
              </div>
              <div className="w-20 h-20 bg-landrify-bg rounded-3xl flex items-center justify-center text-landrify-green mb-10 group-hover:scale-110 transition-transform duration-500">
                {step.icon}
              </div>
              <h3 className="text-2xl font-serif font-medium text-landrify-ink mb-4">{step.title}</h3>
              <p className="text-gray-500 font-light leading-relaxed text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-landrify-ink py-40 text-white overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000" 
            alt="Satellite Data Grid" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-6xl md:text-8xl font-serif font-light mb-16 leading-tight tracking-tighter">
                Advanced <span className="italic">Data</span> <br />
                Sourcing.
              </h2>
              <div className="space-y-12">
                {[
                  { icon: <Database className="w-6 h-6" />, title: "State Land Registries", desc: "Direct access to digital land records for title verification." },
                  { icon: <Satellite className="w-6 h-6" />, title: "Sentinel-2 Satellite Data", desc: "Real-time environmental and boundary analysis." },
                  { icon: <Activity className="w-6 h-6" />, title: "Historical Records", desc: "Analyzing land use history to identify potential disputes." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-8 group">
                    <div className="mt-1 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-landrify-green group-hover:bg-landrify-green group-hover:text-white transition-all duration-500">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-medium mb-3">{item.title}</h4>
                      <p className="text-white/40 font-light leading-relaxed text-lg">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-4 rounded-[4rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm"
            >
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000" 
                alt="Satellite Visualization" 
                className="w-full h-auto rounded-[3.5rem] shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-40 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-serif font-light text-landrify-ink mb-16 tracking-tight"
          >
            Ready to <span className="italic">verify</span> your land?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
          >
            <Link to="/register">
              <Button className="h-24 px-20 text-2xl group rounded-[2rem] shadow-2xl">
                Start Your First Scan
                <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="h-24 px-20 text-2xl rounded-[2rem] border-landrify-line">
                View Pricing
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
