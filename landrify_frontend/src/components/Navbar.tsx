import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Menu, X, LayoutDashboard, LogOut, Info, CreditCard, UserPlus, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2 group">
            <img 
              src="/LANDRIFY.png" 
              alt="Landrify Logo" 
              className="h-10 w-auto group-hover:rotate-6 transition-transform"
              referrerPolicy="no-referrer"
            />
            <span className="text-2xl font-bold tracking-tight text-gray-900">Landrify</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/how-it-works" className="text-sm font-medium text-gray-600 hover:text-landrify-green transition-colors">How it Works</Link>
            <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-landrify-green transition-colors">Pricing</Link>
            <Link to="/about" className="text-sm font-medium text-gray-600 hover:text-landrify-green transition-colors">About</Link>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard">
                  <Button variant="outline" className="px-6 py-2 rounded-xl border-gray-200 hover:border-landrify-green">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={logoutUser} className="px-4 py-2 rounded-xl text-gray-500 hover:text-red-600">Logout</Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-landrify-green transition-colors">Login</Link>
                <Link to="/register">
                  <Button className="px-6 py-2 rounded-xl shadow-lg shadow-landrify-green/20">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600 transition-transform active:scale-90">
              {isOpen ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-2 pb-8 space-y-2">
              <Link to="/how-it-works" className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-gray-50 text-gray-600 transition-colors">
                <Info size={20} strokeWidth={1.5} />
                <span className="text-lg font-medium">How it Works</span>
              </Link>
              <Link to="/pricing" className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-gray-50 text-gray-600 transition-colors">
                <CreditCard size={20} strokeWidth={1.5} />
                <span className="text-lg font-medium">Pricing</span>
              </Link>
              <Link to="/about" className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-gray-50 text-gray-600 transition-colors">
                <ShieldCheck size={20} strokeWidth={1.5} />
                <span className="text-lg font-medium">About</span>
              </Link>
              <hr className="border-gray-100 my-2" />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-gray-50 text-gray-600 transition-colors">
                    <LayoutDashboard size={20} strokeWidth={1.5} />
                    <span className="text-lg font-medium">Dashboard</span>
                  </Link>
                  <button onClick={logoutUser} className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-red-50 text-red-600 transition-colors w-full text-left">
                    <LogOut size={20} strokeWidth={1.5} />
                    <span className="text-lg font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <div className="pt-4 space-y-4">
                  <Link to="/login" className="flex items-center space-x-3 p-4 rounded-2xl hover:bg-gray-50 text-gray-600 transition-colors">
                    <LogIn size={20} strokeWidth={1.5} />
                    <span className="text-lg font-medium">Login</span>
                  </Link>
                  <Link to="/register" className="block">
                    <Button className="w-full h-14 rounded-2xl shadow-lg shadow-landrify-green/20">
                      <UserPlus className="mr-2 w-5 h-5" strokeWidth={1.5} />
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
