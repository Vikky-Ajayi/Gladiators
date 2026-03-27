import { Link } from 'react-router-dom';
import { ShieldCheck, Twitter, Linkedin, Facebook, Instagram, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

export function Footer() {
  return (
    <footer className="bg-landrify-ink text-white pt-32 pb-10 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000" 
          alt="Satellite Grid" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Pre-footer CTA */}
        <div className="mb-32 p-16 rounded-[3rem] bg-landrify-green text-landrify-ink flex flex-col md:flex-row justify-between items-center gap-12 shadow-2xl">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-4xl md:text-5xl font-serif font-medium mb-6 leading-tight">Ready to <span className="italic">secure</span> your land investment?</h3>
            <p className="text-landrify-ink/80 font-light text-lg">Join thousands of smart investors who use Landrify to verify their real estate acquisitions in Nigeria.</p>
          </div>
          <Link to="/register">
            <Button className="h-20 px-12 text-xl bg-landrify-ink text-white hover:bg-landrify-ink/90 rounded-2xl shadow-2xl group">
              Get Started Now
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-8 group">
              <img 
                src="/LANDRIFY.png" 
                alt="Landrify Logo" 
                className="h-10 w-auto group-hover:rotate-6 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="text-2xl font-bold tracking-tight">Landrify</span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs">
              Protecting your investments with AI-powered land verification and risk assessment. The most trusted platform for Nigerian real estate.
            </p>
            <div className="flex space-x-5">
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-landrify-green hover:bg-white/10 transition-all"><Twitter size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-landrify-green hover:bg-white/10 transition-all"><Linkedin size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-landrify-green hover:bg-white/10 transition-all"><Facebook size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-landrify-green hover:bg-white/10 transition-all"><Instagram size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Platform</h4>
            <ul className="space-y-5 text-white/60 text-sm">
              <li><Link to="/how-it-works" className="hover:text-landrify-green transition-colors">How it Works</Link></li>
              <li><Link to="/pricing" className="hover:text-landrify-green transition-colors">Pricing</Link></li>
              <li><Link to="/dashboard" className="hover:text-landrify-green transition-colors">Recent Scans</Link></li>
              <li><Link to="/api-docs" className="hover:text-landrify-green transition-colors">API Reference</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Company</h4>
            <ul className="space-y-5 text-white/60 text-sm">
              <li><Link to="/about" className="hover:text-landrify-green transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-landrify-green transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="hover:text-landrify-green transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-landrify-green transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-8">Legal</h4>
            <ul className="space-y-5 text-white/60 text-sm">
              <li><Link to="/privacy" className="hover:text-landrify-green transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-landrify-green transition-colors">Terms of Service</Link></li>
              <li><Link to="/disclaimer" className="hover:text-landrify-green transition-colors">Legal Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center text-white/20 text-[10px] font-mono uppercase tracking-widest">
          <p>© 2026 Landrify Technologies. All rights reserved.</p>
          <p className="mt-4 md:mt-0">Built for the Nigerian Real Estate Market.</p>
        </div>
      </div>
    </footer>
  );
}
