import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Target, Users, Award, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export function About() {
  useEffect(() => {
    console.log('About page mounted');
  }, []);

  const values = [
    {
      icon: <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />,
      title: "Trust & Transparency",
      desc: "We believe every land transaction should be backed by verifiable data, eliminating the fear of fraud in the real estate market."
    },
    {
      icon: <Target className="w-8 h-8" strokeWidth={1.5} />,
      title: "Precision Technology",
      desc: "Our AI-driven satellite analysis provides accuracy that traditional methods simply cannot match, ensuring your boundaries are exact."
    },
    {
      icon: <Users className="w-8 h-8" strokeWidth={1.5} />,
      title: "Customer Centric",
      desc: "We build for the investor. Our platform is designed to be intuitive, fast, and accessible to everyone from first-time buyers to large firms."
    },
    {
      icon: <Award className="w-8 h-8" strokeWidth={1.5} />,
      title: "Excellence",
      desc: "We are committed to maintaining the highest standards in data integrity and security, partnering with official registries across Nigeria."
    }
  ];

  return (
    <div className="py-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-landrify-green/10 text-landrify-green mb-8 border border-landrify-green/20"
          >
            <Sparkles size={14} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Our Mission</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif font-light text-landrify-ink mb-10 tracking-tight"
          >
            Securing the <span className="italic font-medium text-landrify-green">Future</span> of Land Ownership.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 font-light leading-relaxed mb-12"
          >
            Landrify was founded with a single goal: to eliminate land fraud in Nigeria through cutting-edge technology and transparent data access. We empower investors to make informed decisions with confidence.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link to="/register">
              <Button className="h-11 px-6 text-sm rounded-full shadow-md shadow-landrify-green/20 group">
                Join the Revolution
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="outline" className="h-11 px-6 text-sm rounded-full border-gray-200">
                See How it Works
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-landrify-bg py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-serif font-light text-landrify-ink mb-6">Our Core <span className="italic">Values</span></h2>
            <p className="text-gray-500 font-light max-w-2xl mx-auto">The principles that guide our innovation and commitment to the real estate industry.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-10 rounded-[2.5rem] bg-white border border-landrify-line shadow-xl hover:shadow-2xl transition-all group"
              >
                <div className="w-16 h-16 bg-landrify-bg rounded-2xl flex items-center justify-center text-landrify-green mb-8 group-hover:scale-110 transition-transform duration-500">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-serif font-medium text-landrify-ink mb-4">{value.title}</h3>
                <p className="text-gray-500 font-light leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team/Story Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-7xl font-serif font-light text-landrify-ink mb-10 leading-tight">
                Built by <span className="italic">Experts</span> for Investors.
              </h2>
              <p className="text-lg text-gray-600 font-light leading-relaxed mb-8">
                Our team consists of seasoned real estate professionals, satellite data scientists, and software engineers who saw the gap in the Nigerian land market. We combined our expertise to create a solution that is both technically advanced and practically useful.
              </p>
              <p className="text-lg text-gray-600 font-light leading-relaxed mb-12">
                Today, Landrify is used by individual investors, real estate firms, and legal professionals to verify thousands of land parcels across the country.
              </p>
              <Link to="/register">
                <Button className="h-11 px-6 text-sm rounded-full group">
                  Start Verifying Today
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000" 
                alt="Our Team" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-landrify-ink/60 to-transparent" />
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <p className="text-2xl font-serif font-medium italic">"Innovation is the only way to secure trust in real estate."</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 text-center bg-landrify-ink text-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-5xl md:text-7xl font-serif font-light mb-12 tracking-tight">
            Join the <span className="italic">thousands</span> of secure investors.
          </h2>
          <Link to="/register">
            <Button className="h-12 px-8 text-base bg-landrify-green hover:bg-landrify-green/90 rounded-full shadow-lg shadow-landrify-green/20 group">
              Get Started Now
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
