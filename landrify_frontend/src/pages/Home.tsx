import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { ShieldCheck, MapPin, Search, ArrowRight, CheckCircle2, Globe, FileText, Zap, Sparkles, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[78vh] flex items-center pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
            alt="Vast Land" 
            className="w-full h-full object-cover opacity-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-landrify-bg/90 via-landrify-bg to-landrify-bg" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-landrify-green/10 border border-landrify-green/20 mb-6"
              >
                <Sparkles className="w-3.5 h-3.5 text-landrify-green" strokeWidth={1.5} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-landrify-green">AI-Powered Verification</span>
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-serif font-light leading-[0.95] tracking-tight text-landrify-ink mb-6">
                Secure Your <br />
                <span className="italic font-medium text-landrify-green">Land</span> Legacy.
              </h1>
              
              <p className="text-base md:text-lg text-gray-600 font-light max-w-md mb-8 leading-relaxed">
                The most advanced land verification platform in Nigeria. Satellite AI and legal data — together — protect your real estate investments.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register">
                  <Button className="w-full sm:w-auto h-11 px-6 text-sm group rounded-full shadow-lg shadow-landrify-green/20">
                    Verify a Plot
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.75} />
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" className="w-full sm:w-auto h-11 px-6 text-sm rounded-full border-landrify-line text-landrify-ink hover:bg-white">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
              className="relative perspective-1000"
            >
              <div className="relative z-10 glass-card p-2 rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.1)] overflow-hidden border-white/60 max-w-md mx-auto">
                <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5]">
                  <img 
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
                    alt="Satellite Map View" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  
                  {/* Scanning Overlay Effect */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-landrify-green shadow-[0_0_20px_rgba(0,255,159,1)] z-20"
                  />

                  <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="glass-card px-3 py-2 rounded-xl border-white/30 backdrop-blur-md"
                    >
                      <p className="col-header text-white/70 mb-0.5 text-[9px]">Coordinates</p>
                      <p className="data-value text-xs text-white">6.4531° N, 3.3958° E</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ rotate: 15 }}
                      className="w-10 h-10 bg-landrify-green rounded-xl flex items-center justify-center shadow-lg"
                    >
                      <ShieldCheck className="text-white w-5 h-5" strokeWidth={1.5} />
                    </motion.div>
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 glass-card p-5 rounded-2xl border-white/30 backdrop-blur-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="col-header text-white/70 mb-0.5 text-[9px]">Status</p>
                        <p className="text-sm font-bold text-white">Verified Secure</p>
                      </div>
                      <div className="text-right">
                        <p className="col-header text-white/70 mb-0.5 text-[9px]">Risk Score</p>
                        <p className="text-sm font-bold text-landrify-green">98/100</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98%' }}
                        transition={{ duration: 2, delay: 0.5 }}
                        className="h-full bg-landrify-green shadow-[0_0_12px_rgba(0,255,159,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating UI Elements */}
              <motion.div 
                animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-6 top-1/4 glass-card p-3 rounded-xl shadow-xl border-white/40 z-20 hidden lg:block"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                    <MapPin size={16} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="col-header text-gray-400 mb-0 text-[9px]">Location</p>
                    <p className="text-xs font-bold text-landrify-ink">Lekki Phase 1</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ x: [0, 8, 0], y: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 bottom-1/4 glass-card p-3 rounded-xl shadow-xl border-white/40 z-20 hidden lg:block"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-landrify-orange/10 rounded-lg flex items-center justify-center text-landrify-orange">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="col-header text-gray-400 mb-0 text-[9px]">Security</p>
                    <p className="text-xs font-bold text-landrify-ink">Encrypted</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center max-w-3xl mx-auto mb-24"
          >
            <motion.h2 variants={itemVariants} className="text-4xl md:text-6xl font-serif font-light tracking-tight text-gray-900 mb-8">
              Why <span className="italic">Landrify</span>?
            </motion.h2>
            <motion.p variants={itemVariants} className="text-xl text-gray-600 font-light leading-relaxed">
              We combine satellite imagery, government records, and AI to give you a complete picture of any land in Nigeria.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-16"
          >
            {[
              {
                icon: <Globe className="w-10 h-10" strokeWidth={1.5} />,
                title: "Satellite Analysis",
                desc: "High-resolution satellite imagery to verify boundaries and topography with sub-meter precision.",
                link: "/how-it-works"
              },
              {
                icon: <FileText className="w-10 h-10" strokeWidth={1.5} />,
                title: "Legal Verification",
                desc: "Direct integration with state land registries for authentic C of O and Governor's Consent verification.",
                link: "/about"
              },
              {
                icon: <Zap className="w-10 h-10" strokeWidth={1.5} />,
                title: "Instant Results",
                desc: "Our AI engine processes millions of data points to deliver a comprehensive risk report in minutes.",
                link: "/pricing"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -15, scale: 1.02 }}
                className="p-12 rounded-[3rem] bg-landrify-bg border border-landrify-line hover:shadow-2xl transition-all duration-500 group"
              >
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-landrify-green mb-10 group-hover:bg-landrify-green group-hover:text-white transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-3xl font-serif font-medium text-landrify-ink mb-6">{feature.title}</h3>
                <p className="text-gray-600 font-light leading-relaxed text-lg mb-8">{feature.desc}</p>
                <Link to={feature.link} className="inline-flex items-center text-landrify-green font-bold text-sm uppercase tracking-widest group/link">
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-landrify-green-dark z-0" />
        <div className="absolute inset-0 opacity-20 z-10">
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000" 
            alt="Map background" 
            className="w-full h-full object-cover mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-serif font-light text-white mb-12 tracking-tight">
              Ready to <span className="italic">secure</span> your future?
            </h2>
            <p className="text-xl text-white/80 font-light max-w-2xl mx-auto mb-16 leading-relaxed">
              Join thousands of smart investors who use Landrify to verify their real estate acquisitions in Nigeria.
            </p>
            <Link to="/register">
              <Button className="bg-white text-landrify-green-dark hover:bg-gray-100 h-12 px-8 text-base shadow-xl rounded-full transition-transform active:translate-y-px">
                Get Started Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
