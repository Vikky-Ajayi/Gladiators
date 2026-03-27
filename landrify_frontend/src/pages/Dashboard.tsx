import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Search, MapPin, History, ShieldCheck, TrendingUp, AlertTriangle, FileText, Plus, ArrowUpRight, Activity, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const recentScans = [
    { id: 'LR-9021', location: 'Lekki Phase 1, Lagos', date: '2 hours ago', status: 'Verified', score: 98, type: 'Residential' },
    { id: 'LR-8842', location: 'Ibeju-Lekki, Lagos', date: 'Yesterday', status: 'Warning', score: 64, type: 'Agricultural' },
    { id: 'LR-8710', location: 'Maitama, Abuja', date: '3 days ago', status: 'Verified', score: 95, type: 'Commercial' }
  ];

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
        <Link to="/scan-result">
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
                <Link to="/scan-result">
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
              <Button variant="ghost" className="text-landrify-green hover:bg-landrify-green/5 rounded-xl">
                View All <ArrowUpRight className="ml-2 w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>

            <div className="space-y-4">
              {recentScans.map((scan) => (
                <motion.div
                  key={scan.id}
                  variants={itemVariants}
                  whileHover={{ x: 10 }}
                  className="group flex items-center justify-between p-8 rounded-3xl bg-white border border-landrify-line hover:border-landrify-green transition-all shadow-sm hover:shadow-xl"
                >
                  <div className="flex items-center space-x-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      scan.status === 'Verified' ? 'bg-landrify-green/10 text-landrify-green' : 'bg-landrify-orange/10 text-landrify-orange'
                    }`}>
                      {scan.status === 'Verified' ? <CheckCircle2 strokeWidth={1.5} /> : <AlertCircle strokeWidth={1.5} />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="data-value text-xs text-gray-400">{scan.id}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">•</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{scan.type}</span>
                      </div>
                      <h4 className="text-xl font-medium text-landrify-ink">{scan.location}</h4>
                      <p className="text-sm text-gray-500 mt-1">{scan.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-12">
                    <div className="text-right">
                      <p className="col-header text-gray-400 mb-1">Trust Score</p>
                      <p className={`text-2xl font-bold ${
                        scan.score > 80 ? 'text-landrify-green' : 'text-landrify-orange'
                      }`}>{scan.score}%</p>
                    </div>
                    <Link to="/scan-result">
                      <Button variant="outline" className="w-12 h-12 p-0 rounded-xl group-hover:bg-landrify-green group-hover:text-white group-hover:border-landrify-green transition-all">
                        <ArrowUpRight size={20} strokeWidth={1.5} />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
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
          {/* Upgrade Card */}
          <div className="p-10 rounded-[2.5rem] bg-landrify-bg border border-landrify-line relative overflow-hidden group shadow-lg">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-landrify-green/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="w-12 h-12 bg-landrify-green rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-landrify-green/20">
              <TrendingUp className="text-white w-6 h-6" strokeWidth={1.5} />
            </div>
            <h4 className="text-2xl font-serif font-medium mb-4">Enterprise Plan</h4>
            <p className="text-gray-600 font-light mb-8 leading-relaxed text-sm">Unlock bulk verification, API access, and priority support for your firm.</p>
            <Button className="w-full h-14 rounded-2xl shadow-lg shadow-landrify-green/10">Upgrade Now</Button>
          </div>

          {/* Resources */}
          <div className="space-y-6">
            <h4 className="text-xl font-serif font-medium px-2">Resources</h4>
            <div className="space-y-3">
              {[
                { icon: <FileText size={18} strokeWidth={1.5} />, label: "Land Act 2024 Guide" },
                { icon: <ShieldCheck size={18} strokeWidth={1.5} />, label: "Security Best Practices" },
                { icon: <Activity size={18} strokeWidth={1.5} />, label: "System Status" }
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
