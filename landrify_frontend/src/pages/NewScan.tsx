import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, MapPin, Navigation, Info, ShieldCheck, AlertCircle } from 'lucide-react';

export function NewScan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate scan process
    setTimeout(() => {
      navigate('/scan/demo-result');
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-5xl md:text-7xl font-serif font-light text-gray-900 mb-6">
          New <span className="italic font-medium">Verification</span>
        </h1>
        <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
          Enter the location or coordinates of the land you want to verify. Our AI will analyze satellite data and government records.
        </p>
      </motion.div>

      <div className="glass-card p-10 rounded-[3rem] shadow-2xl border-white/40 bg-white/60">
        <form onSubmit={handleScan} className="space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Land Location / Coordinates</label>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
              <Input 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lekki Phase 1, Lagos or 6.45, 3.38" 
                className="pl-16 h-20 text-lg rounded-3xl"
                required
              />
              <button 
                type="button"
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors"
                title="Use current location"
              >
                <Navigation size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-landrify-bg border border-gray-100 flex items-start space-x-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-landrify-green shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">Deep Scan Analysis</p>
                <p className="text-xs text-gray-500 leading-relaxed">We'll check against 15+ data points including state registries and satellite maps.</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-landrify-bg border border-gray-100 flex items-start space-x-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-landrify-orange shadow-sm">
                <Info size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm mb-1">Environmental Risks</p>
                <p className="text-xs text-gray-500 leading-relaxed">Flood zones, soil stability, and erosion risks will be assessed automatically.</p>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-20 text-xl group rounded-3xl"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                <span>Analyzing Land Data...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span>Initiate Verification Scan</span>
                <Search className="ml-3 w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </Button>
        </form>
      </div>

      <div className="mt-12 flex items-center justify-center space-x-2 text-gray-400 text-sm">
        <AlertCircle size={16} />
        <p>Verification scans consume 1 credit. <Link to="/pricing" className="text-landrify-green font-bold hover:underline">Get more credits</Link></p>
      </div>
    </div>
  );
}
