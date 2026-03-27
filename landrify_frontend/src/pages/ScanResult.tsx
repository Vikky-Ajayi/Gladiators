import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useScan } from '../hooks/useScan';
import { Button } from '../components/ui/Button';
import { 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  FileText, 
  Download, 
  Share2, 
  CheckCircle2, 
  XCircle,
  TrendingDown,
  Droplets,
  Wind,
  ArrowLeft,
  Info,
  Activity,
  ShieldAlert,
  Scale,
  TreePine
} from 'lucide-react';

export function ScanResult() {
  const { id } = useParams<{ id: string }>();
  
  const mockResult = {
    id: id,
    location: { latitude: 6.45, longitude: 3.38, address: 'Lekki Phase 1, Plot 42' },
    state: { status: 'completed', progress: 100 },
    legal_status: {
      is_government_land: false,
      has_dispute: false,
      zoning: 'Residential',
      title_type: 'C of O',
      verification_score: 98
    },
    environmental_risks: {
      flood_risk: 'Very Low',
      soil_stability: 'High (Sandy-Clay)',
      erosion_risk: 'Minimal'
    },
    created_at: '2026-03-27T10:00:00Z'
  };

  const { useScanResult } = useScan();
  const result = mockResult;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-12"
      >
        <Link to="/dashboard" className="inline-flex items-center text-gray-500 hover:text-landrify-green transition-colors group">
          <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.5} />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Report */}
        <div className="lg:col-span-2 space-y-12">
          {/* Summary Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[3rem] bg-white border border-landrify-line shadow-2xl p-12"
          >
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000" 
                alt="Map texture" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="data-value text-xs text-gray-400">REPORT #{id?.slice(0, 8).toUpperCase()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">•</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-landrify-green">Verified Secure</span>
                  </div>
                  <h1 className="text-5xl font-serif font-light text-landrify-ink mb-2 tracking-tight">{result.location.address}</h1>
                  <p className="text-xl text-gray-500 font-light">Eti-Osa Local Govt, Lagos State</p>
                </div>
                
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-100"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="440"
                      initial={{ strokeDashoffset: 440 }}
                      animate={{ strokeDashoffset: 440 - (440 * result.legal_status.verification_score) / 100 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="text-landrify-green"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-landrify-ink">{result.legal_status.verification_score}</span>
                    <span className="col-header text-gray-400">Trust Score</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-landrify-line">
                <div>
                  <p className="col-header text-gray-400 mb-2">Land Area</p>
                  <p className="data-value text-2xl text-landrify-ink">1,200 SQM</p>
                </div>
                <div>
                  <p className="col-header text-gray-400 mb-2">Zoning</p>
                  <p className="data-value text-2xl text-landrify-ink">{result.legal_status.zoning}</p>
                </div>
                <div>
                  <p className="col-header text-gray-400 mb-2">Topography</p>
                  <p className="data-value text-2xl text-landrify-ink">Flat</p>
                </div>
                <div>
                  <p className="col-header text-gray-400 mb-2">Encumbrance</p>
                  <p className="data-value text-2xl text-landrify-green">None</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Sections */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-12"
          >
            {/* Legal Status */}
            <motion.div variants={itemVariants} className="p-10 rounded-[2.5rem] bg-white border border-landrify-line shadow-xl">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                  <Scale size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-medium">Legal Status</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: "C of O Status", value: "Valid & Verified", status: "success" },
                  { label: "Governor's Consent", value: "Registered", status: "success" },
                  { label: "Court Disputes", value: "No active cases", status: "success" },
                  { label: "Caveat Emptor", value: "None detected", status: "success" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-transparent hover:border-blue-100 transition-all">
                    <span className="text-gray-500 font-medium">{item.label}</span>
                    <div className="flex items-center text-landrify-green font-bold text-sm">
                      <CheckCircle2 size={16} className="mr-2" strokeWidth={1.5} />
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Environmental Risk */}
            <motion.div variants={itemVariants} className="p-10 rounded-[2.5rem] bg-white border border-landrify-line shadow-xl">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-landrify-green/10 rounded-2xl flex items-center justify-center text-landrify-green">
                  <TreePine size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-medium">Environmental</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: "Flood Risk", value: result.environmental_risks.flood_risk, status: "success" },
                  { label: "Soil Stability", value: result.environmental_risks.soil_stability, status: "success" },
                  { label: "Erosion Threat", value: result.environmental_risks.erosion_risk, status: "success" },
                  { label: "Coastal Proximity", value: "1.2km from shoreline", status: "info" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-transparent hover:border-landrify-green/10 transition-all">
                    <span className="text-gray-500 font-medium">{item.label}</span>
                    <div className="flex items-center text-landrify-ink font-bold text-sm">
                      <Info size={16} className="mr-2 text-gray-400" strokeWidth={1.5} />
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Sidebar Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-12"
        >
          <div className="p-10 rounded-[2.5rem] bg-landrify-ink text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 z-0 opacity-20">
              <img 
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800" 
                alt="Satellite Grid" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10">
              <h4 className="text-2xl font-serif font-medium mb-8">Verification Tools</h4>
              <div className="space-y-4">
                <Button className="w-full h-16 rounded-2xl bg-white text-landrify-ink hover:bg-gray-100 shadow-xl group">
                  <Download className="mr-3 w-5 h-5 group-hover:translate-y-1 transition-transform" strokeWidth={1.5} />
                  Download PDF Report
                </Button>
                <Button variant="outline" className="w-full h-16 rounded-2xl border-white/20 text-white hover:bg-white/10 group">
                  <Share2 className="mr-3 w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  Share Report
                </Button>
              </div>
            </div>
          </div>

          <div className="p-10 rounded-[2.5rem] bg-landrify-bg border border-landrify-line shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <ShieldAlert className="text-landrify-orange" size={24} strokeWidth={1.5} />
              <h4 className="text-xl font-serif font-medium">Risk Advisory</h4>
            </div>
            <p className="text-gray-600 font-light text-sm leading-relaxed mb-8">
              This land has passed all primary AI scans. We recommend a physical survey to confirm the exact beacon positions before final payment.
            </p>
            <Button variant="ghost" className="w-full text-landrify-green hover:bg-landrify-green/5 rounded-xl">
              Talk to a Surveyor
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
