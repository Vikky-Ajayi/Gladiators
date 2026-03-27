import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Search, MapPin, ShieldCheck, TrendingUp, FileText, Plus, ArrowUpRight, Activity, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserScans } from '../api/scans';
import type { ScanResult } from '../types/api';

const riskColorClasses: Record<string, string> = {
  low: 'text-landrify-green',
  medium: 'text-amber-500',
  high: 'text-landrify-orange',
  critical: 'text-red-600',
  unknown: 'text-gray-500',
};

const riskIconClasses: Record<string, string> = {
  low: 'bg-landrify-green/10 text-landrify-green',
  medium: 'bg-amber-100 text-amber-500',
  high: 'bg-landrify-orange/10 text-landrify-orange',
  critical: 'bg-red-100 text-red-600',
  unknown: 'bg-gray-100 text-gray-500',
};

const getRelativeDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const displayAddress = (scan: ScanResult) => {
  const address = (scan.address ?? '').trim();
  const coordinatePattern = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
  if (!address || coordinatePattern.test(address)) {
    return `${scan.lga}, ${scan.state}`;
  }
  return address;
};

export function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const { data: recentScans, isLoading: scansLoading, error: scansError } = useQuery({
    queryKey: ['dashboard-recent-scans'],
    queryFn: async () => {
      const scans = await getUserScans();
      return scans.slice(0, 3);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6"
      >
        <div>
          <h1 className="text-4xl font-serif font-light text-gray-900 mb-2">
            Welcome, <span className="italic font-medium">{user?.full_name?.split(' ')[0] || 'Investor'}</span>
          </h1>
          <p className="text-gray-500 font-light tracking-wide">Manage your land verifications and risk assessments.</p>
        </div>
        <Link to="/scan/new">
          <Button className="h-14 px-8 group rounded-2xl shadow-xl shadow-landrify-green/20">
            <Plus className="mr-2 w-5 h-5" strokeWidth={1.5} />
            New Land Scan
          </Button>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          {/* Quick Verification */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[3rem] bg-landrify-ink p-12 text-white shadow-2xl"
          >
            <div className="absolute inset-0 z-0 opacity-20">
              <img 
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000" 
                alt="Satellite Grid" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-landrify-green animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-landrify-green">System Online</span>
              </div>
              
              <h2 className="text-5xl font-serif font-light mb-10 tracking-tight">Quick Verification</h2>
              
              <div className="space-y-6">
                <div className="relative group">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-landrify-green transition-colors" size={24} strokeWidth={1.5} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Land Coordinates or Address..."
                    className="w-full h-20 bg-white/10 border border-white/10 rounded-2xl pl-16 pr-6 text-xl focus:outline-none focus:ring-2 focus:ring-landrify-green/50 focus:bg-white/20 transition-all placeholder:text-white/30"
                  />
                </div>
                <Link to="/scan/new">
                  <Button className="w-full h-20 text-xl rounded-2xl shadow-xl shadow-landrify-green/20 group">
                    Start AI Scan
                    <Search className="ml-3 w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/10">
                <div>
                  <p className="col-header text-white/40 mb-2">Available Credits</p>
                  <p className="data-value text-3xl text-white">12</p>
                </div>
                <div>
                  <p className="col-header text-white/40 mb-2">Total Scans</p>
                  <p className="data-value text-3xl text-white">48</p>
                </div>
                <div>
                  <p className="col-header text-white/40 mb-2">Success Rate</p>
                  <p className="data-value text-3xl text-landrify-green">100%</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Scans */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-serif font-medium text-landrify-ink">Recent Scans</h3>
              <Link to="/scans">
                <Button variant="ghost" className="text-landrify-green hover:bg-landrify-green/5 rounded-xl">
                  View All <ArrowUpRight className="ml-2 w-4 h-4" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {scansLoading && (
                <>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-32 rounded-3xl bg-gray-200 animate-pulse" />
                  ))}
                </>
              )}

              {!scansLoading && scansError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {(scansError as any)?.response?.data?.error || (scansError as any)?.response?.data?.detail || (scansError as Error)?.message}
                </div>
              )}

              {!scansLoading && !scansError && recentScans && recentScans.length === 0 && (
                <div className="rounded-2xl border border-landrify-line bg-white p-8 text-center">
                  <p className="text-gray-700">No scans yet.</p>
                  <Link to="/scan/new" className="inline-block mt-4">
                    <Button className="rounded-xl">Start your first scan</Button>
                  </Link>
                </div>
              )}

              {!scansLoading && !scansError && recentScans && recentScans.length > 0 && recentScans.map((scan) => {
                const riskLevel = scan.risk_level || 'unknown';
                const iconClass = riskIconClasses[riskLevel] ?? riskIconClasses.unknown;
                const scoreClass = riskColorClasses[riskLevel] ?? riskColorClasses.unknown;

                return (
                  <motion.div
                    key={scan.id}
                    variants={itemVariants}
                    whileHover={{ x: 10 }}
                    className="group flex items-center justify-between p-8 rounded-3xl bg-white border border-landrify-line hover:border-landrify-green transition-all shadow-sm hover:shadow-xl"
                  >
                    <div className="flex items-center space-x-8">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${iconClass}`}>
                        {riskLevel === 'low' ? <CheckCircle2 strokeWidth={1.5} /> : riskLevel === 'critical' ? <AlertCircle strokeWidth={1.5} /> : <AlertTriangle strokeWidth={1.5} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="data-value text-xs text-gray-400">{scan.scan_reference}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">•</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{scan.scan_type === 'pro' ? 'Pro ⭐' : 'Basic'}</span>
                        </div>
                        <h4 className="text-xl font-medium text-landrify-ink">{displayAddress(scan)}</h4>
                        <p className="text-sm text-gray-500 mt-1">{getRelativeDate(scan.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-12">
                      <div className="text-right">
                        <p className="col-header text-gray-400 mb-1">RISK SCORE</p>
                        <p className={`text-2xl font-bold ${scoreClass}`}>{scan.risk_score ?? 0}</p>
                      </div>
                      <Link to={`/scan/${scan.id}`}>
                        <Button variant="outline" className="w-12 h-12 p-0 rounded-xl group-hover:bg-landrify-green group-hover:text-white group-hover:border-landrify-green transition-all">
                          <ArrowUpRight size={20} strokeWidth={1.5} />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-12"
        >
          {/* Pro Access Card */}
          <div className="p-10 rounded-[2.5rem] bg-landrify-bg border border-landrify-line relative overflow-hidden group shadow-lg">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-landrify-green/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="w-12 h-12 bg-landrify-green rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-landrify-green/20">
              <TrendingUp className="text-white w-6 h-6" strokeWidth={1.5} />
            </div>
            <h4 className="text-2xl font-serif font-medium mb-4">Pro Access Active</h4>
            <p className="text-gray-600 font-light mb-8 leading-relaxed text-sm">Your account has full access enabled, including premium scan and report features.</p>
            <Button className="w-full h-14 rounded-2xl shadow-lg shadow-landrify-green/10">Plan Active</Button>
          </div>

          {/* Resources */}
          <div className="space-y-6">
            <h4 className="text-xl font-serif font-medium px-2">Resources</h4>
            <div className="space-y-3">
              {[
                { icon: <FileText size={18} strokeWidth={1.5} />, label: 'Land Act 2024 Guide' },
                { icon: <ShieldCheck size={18} strokeWidth={1.5} />, label: 'Security Best Practices' },
                { icon: <Activity size={18} strokeWidth={1.5} />, label: 'System Status' }
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-white border border-transparent hover:border-landrify-line transition-all group">
                  <div className="flex items-center space-x-4 text-gray-600 group-hover:text-landrify-ink">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ExternalLink size={16} className="text-gray-300 group-hover:text-landrify-green" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
