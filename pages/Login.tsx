import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { stockService } from '../lib/services/stockService';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const LOGO_URL = "https://raw.githubusercontent.com/connectcloudonetech-hash/cloudoneuae/refs/heads/main/images/logo-512.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const users = await stockService.getUsers();
      const user = users.find(u => 
        u.username.toUpperCase() === username.toUpperCase() && 
        u.password === password
      );

      if (user) {
        login(user);
        navigate('/dashboard');
      } else {
        setError('Invalid username or password. Default is ADMIN/123');
        setLoading(false);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50 rounded-full blur-3xl -mr-64 -mt-64 opacity-50" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200 rounded-full blur-3xl -ml-64 -mb-64 opacity-50" />

      <div className="w-full max-w-[420px] relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6 p-2 border border-slate-100">
            <img src={LOGO_URL} alt="SR INFOTECH Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SR INFOTECH</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Stock Maintenance System</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 overflow-hidden"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-xs font-bold leading-tight">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="floating-label-group">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-mobile"
                  placeholder=" "
                  required
                />
                <label className="floating-label">Username</label>
              </div>

              <div className="floating-label-group">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-mobile"
                  placeholder=" "
                  required
                />
                <label className="floating-label">Password</label>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded-lg border-slate-200 text-red-600 focus:ring-red-500/20" />
                <span className="text-xs text-slate-400 font-bold group-hover:text-slate-600 transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-xs text-red-600 font-bold hover:text-red-700 transition-colors">Forgot?</button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn-gradient-primary w-full py-4 text-sm"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            SR INFOTECH &bull; DUBAI, UAE
          </p>
        </motion.div>
      </div>
    </div>
  );
};
