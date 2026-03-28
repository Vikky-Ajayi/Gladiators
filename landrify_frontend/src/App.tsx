import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { NewScan } from './pages/NewScan';
import { ScanResult } from './pages/ScanResult';
import { HowItWorks } from './pages/HowItWorks';
import { Pricing } from './pages/Pricing';
import { About } from './pages/About';
import { ScansHistory } from './pages/ScansHistory';
import { useAuth } from './hooks/useAuth';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-landrify-bg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-landrify-green"></div>
    </div>
  );
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/scan/new" 
              element={
                <ProtectedRoute>
                  <NewScan />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/scans" 
              element={
                <ProtectedRoute>
                  <ScansHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/scans" 
              element={<Navigate to="/scans" />} 
            />
            <Route 
              path="/scan/:id" 
              element={
                <ProtectedRoute>
                  <ScanResult />
                </ProtectedRoute>
              } 
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}
