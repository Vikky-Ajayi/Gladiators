import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const response = await registerApi({
        ...data,
        email: data.email.trim().toLowerCase(),
      });
      loginUser(response.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.userMessage || err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block"
        >
          <h2 className="text-6xl font-serif font-light text-gray-900 mb-8 leading-[1.1]">
            Secure Your <br />
            <span className="italic font-medium text-landrify-green">Legacy</span> Today.
          </h2>
          <p className="text-xl text-gray-600 font-light mb-12 max-w-md leading-relaxed">
            Join thousands of smart investors who trust Landrify for their real estate verification in Nigeria.
          </p>
          
          <div className="space-y-6">
            {[
              "Instant satellite boundary verification",
              "Legal status & C of O cross-check",
              "Environmental risk assessment",
              "Certified verification reports"
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-landrify-green/10 flex items-center justify-center">
                  <CheckCircle2 className="text-landrify-green w-4 h-4" />
                </div>
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="text-center lg:text-left mb-10">
            <Link to="/" className="inline-flex items-center space-x-2 mb-8 group">
              <img 
                src="/LANDRIFY.png" 
                alt="Landrify Logo" 
                className="h-12 w-auto group-hover:rotate-6 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="text-3xl font-bold tracking-tight text-gray-900">Landrify</span>
            </Link>
            <h2 className="text-4xl font-serif font-light text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500 font-light">Start your journey to safe land ownership</p>
          </div>

          <div className="glass-card p-10 rounded-[2.5rem] shadow-xl border-white/40">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    {...register('full_name')}
                    placeholder="John Doe" 
                    className="pl-12"
                  />
                </div>
                {errors.full_name && <p className="text-xs text-red-500 ml-1">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    {...register('email')}
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-12"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    {...register('password')}
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12"
                  />
                </div>
                {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input 
                    {...register('confirm_password')}
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12"
                  />
                </div>
                {errors.confirm_password && <p className="text-xs text-red-500 ml-1">{errors.confirm_password.message}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg group mt-4"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-landrify-green hover:underline">Sign In</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
