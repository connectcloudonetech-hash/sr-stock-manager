
import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Users, 
  Banknote, 
  Database, 
  Moon, 
  Sun, 
  ShieldCheck, 
  Fingerprint, 
  LifeBuoy, 
  LogOut, 
  Camera, 
  ChevronRight, 
  Download, 
  Upload, 
  Trash2, 
  Lock,
  Check,
  AlertTriangle,
  Loader2,
  Tag,
  Package,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { stockService } from '../lib/services/stockService';
import { isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

interface CompanyProfile {
  name: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
}

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('sr_theme') === 'dark');
  const [currency, setCurrency] = useState(() => localStorage.getItem('sr_currency') || 'INR');
  const [company, setCompany] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem('sr_company_profile');
    return saved ? JSON.parse(saved) : {
      name: 'SR INFOTECH',
      logo: 'https://raw.githubusercontent.com/connectcloudonetech-hash/cloudoneuae/refs/heads/main/images/logo-512.png',
      email: 'info@srinfotech.com',
      phone: '+91 98765 43210',
      address: 'Industrial Area, Mumbai, India'
    };
  });
  const [securityPin, setSecurityPin] = useState(() => localStorage.getItem('sr_security_pin') || '');
  const [isFingerprintEnabled, setIsFingerprintEnabled] = useState(() => localStorage.getItem('sr_fingerprint') === 'true');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Effects
  useEffect(() => {
    if (activeSection === 'categories') {
      setCategories(stockService.getCategories());
    }
  }, [activeSection]);
  useEffect(() => {
    localStorage.setItem('sr_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('sr_company_profile', JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem('sr_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('sr_security_pin', securityPin);
  }, [securityPin]);

  useEffect(() => {
    localStorage.setItem('sr_fingerprint', isFingerprintEnabled.toString());
  }, [isFingerprintEnabled]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany({ ...company, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const data: Record<string, any> = {};
      const keys = [
        'sr_storage_v4_supplier_movements',
        'sr_storage_v4_customer_movements',
        'sr_storage_v3_customers',
        'sr_storage_v3_suppliers',
        'sr_storage_v3_products',
        'sr_storage_v3_categories',
        'sr_company_profile',
        'sr_currency',
        'sr_security_pin',
        'sr_fingerprint',
        'sr_theme'
      ];
      
      keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) data[key] = val;
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sr_infotech_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed', error);
    } finally {
      setTimeout(() => setIsBackingUp(false), 1000);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsRestoring(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          Object.entries(data).forEach(([key, val]) => {
            localStorage.setItem(key, val as string);
          });
          window.location.reload();
        } catch (error) {
          console.error('Restore failed', error);
          alert('Invalid backup file');
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('CRITICAL: This will permanently delete ALL your data. This action cannot be undone. Are you sure?')) {
      await stockService.clearAllData();
      localStorage.removeItem('sr_company_profile');
      localStorage.removeItem('sr_currency');
      localStorage.removeItem('sr_security_pin');
      localStorage.removeItem('sr_fingerprint');
      localStorage.removeItem('sr_theme');
      window.location.reload();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmittingCategory(true);
    await stockService.addCategory(newCategoryName);
    setNewCategoryName('');
    setCategories(stockService.getCategories());
    setIsSubmittingCategory(false);
  };

  const handleDeleteCategory = async (name: string) => {
    if (name === 'OTHERS') {
      alert('CANNOT DELETE "OTHERS" CATEGORY');
      return;
    }
    if (window.confirm(`ARE YOU SURE YOU WANT TO DELETE "${name}" CATEGORY?`)) {
      await stockService.deleteCategory(name);
      setCategories(stockService.getCategories());
    }
  };

  const menuItems = [
    { id: 'profile', icon: Building2, label: 'Company Profile', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'categories', icon: Tag, label: 'Categories', color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'users', icon: Users, label: 'User Management', color: 'text-purple-600', bg: 'bg-purple-50', adminOnly: true },
    { id: 'currency', icon: Banknote, label: 'Currency Settings', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'database', icon: Database, label: 'Database Status', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'data', icon: Database, label: 'Data Control', color: 'text-rose-600', bg: 'bg-rose-50', adminOnly: true },
    { id: 'theme', icon: isDarkMode ? Moon : Sun, label: 'Theme Settings', color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'security', icon: ShieldCheck, label: 'Security', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'support', icon: LifeBuoy, label: 'Support & Help', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[32px] bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                  {company.logo ? (
                    <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="text-slate-300" size={40} />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                >
                  <Camera size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Update Branding</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Logo & Identity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                <input 
                  type="text" 
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="text" 
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                <textarea 
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  rows={3}
                  className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition shadow-sm resize-none"
                />
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-purple-50 p-6 rounded-[32px] border border-purple-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-black text-purple-900 uppercase tracking-tight">Team Access</h3>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Manage Permissions</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/users')}
              className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Plus size={18} />
              Go to User Management
            </button>
          </div>
        );

      case 'database':
        const hasSupabase = isSupabaseConfigured();
        const env = (import.meta as any).env;
        const hasUrl = !!env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_URL !== 'your_supabase_project_url';
        const hasKey = !!env?.VITE_SUPABASE_ANON_KEY && env?.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';
        const isHttps = env?.VITE_SUPABASE_URL?.startsWith('https://');
        
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-black text-blue-900 uppercase tracking-tight">Cloud Sync</h3>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Supabase Connectivity</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${hasUrl ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Project URL</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {hasUrl ? (isHttps ? 'CONFIGURED' : 'INVALID URL') : 'MISSING'}
                </p>
              </div>

              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <p className="font-black text-slate-900 uppercase tracking-tight text-xs">API Key</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {hasKey ? 'CONFIGURED' : 'MISSING'}
                </p>
              </div>
            </div>

            {!hasSupabase ? (
              <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
                <div className="flex items-center gap-3 text-rose-600 mb-2">
                  <AlertTriangle size={20} />
                  <p className="font-black uppercase tracking-tight text-xs">Sync Disabled</p>
                </div>
                <p className="text-[10px] font-bold text-rose-400 uppercase leading-relaxed">
                  Your app is currently using **LocalStorage** only. To enable cloud sync, please add your Supabase credentials to the environment variables in your deployment platform.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                  <Check size={20} />
                  <p className="font-black uppercase tracking-tight text-xs">Cloud Active</p>
                </div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase leading-relaxed">
                  Your app is successfully connected to Supabase. All data is being synced to the cloud in real-time.
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Note: If you just added credentials, you may need to refresh the page or redeploy for changes to take effect.
              </p>
            </div>
          </div>
        );

      case 'currency':
        const currencies = [
          { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
          { code: 'USD', symbol: '$', name: 'US Dollar' },
          { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
          { code: 'EUR', symbol: '€', name: 'Euro' },
          { code: 'GBP', symbol: '£', name: 'British Pound' },
        ];
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`w-full p-5 rounded-[28px] border flex items-center justify-between transition-all ${
                  currency === c.code 
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                    : 'bg-white border-slate-100 active:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                    currency === c.code ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {c.symbol}
                  </div>
                  <div className="text-left">
                    <p className={`font-black uppercase tracking-tight ${currency === c.code ? 'text-emerald-900' : 'text-slate-900'}`}>{c.code}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.name}</p>
                  </div>
                </div>
                {currency === c.code && <Check className="text-emerald-500" size={24} />}
              </button>
            ))}
          </div>
        );

      case 'data':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-black text-rose-900 uppercase tracking-tight">Data Integrity</h3>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Backup & Recovery</p>
              </div>
            </div>

            <button 
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex items-center justify-between active:bg-slate-50 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
                  {isBackingUp ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 uppercase tracking-tight">Backup Database</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Download JSON file</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300" size={20} />
            </button>

            <label className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex items-center justify-between active:bg-slate-50 transition-all shadow-sm group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
                  {isRestoring ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 uppercase tracking-tight">Restore Data</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload backup file</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300" size={20} />
              <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
            </label>

            <button 
              onClick={handleDeleteAll}
              className="w-full p-5 bg-rose-50 border border-rose-100 rounded-[28px] flex items-center justify-between active:bg-rose-100 transition-all shadow-sm group mt-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center group-active:scale-90 transition-transform">
                  <Trash2 size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-rose-900 uppercase tracking-tight">Wipe All Data</p>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Permanent deletion</p>
                </div>
              </div>
              <AlertTriangle className="text-rose-500" size={20} />
            </button>
          </div>
        );

      case 'theme':
        return (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setIsDarkMode(false)}
              className={`p-8 rounded-[40px] border-2 flex flex-col items-center gap-4 transition-all ${
                !isDarkMode ? 'bg-white border-slate-900 shadow-xl' : 'bg-slate-50 border-transparent text-slate-400'
              }`}
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${!isDarkMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                <Sun size={32} />
              </div>
              <p className="font-black uppercase tracking-widest text-xs">Light Mode</p>
            </button>
            <button
              onClick={() => setIsDarkMode(true)}
              className={`p-8 rounded-[40px] border-2 flex flex-col items-center gap-4 transition-all ${
                isDarkMode ? 'bg-slate-900 border-slate-900 shadow-xl text-white' : 'bg-slate-50 border-transparent text-slate-400'
              }`}
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-200 text-slate-400'}`}>
                <Moon size={32} />
              </div>
              <p className="font-black uppercase tracking-widest text-xs">Dark Mode</p>
            </button>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-indigo-900 uppercase tracking-tight">Access Control</h3>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Privacy & Protection</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lock className="text-slate-400" size={18} />
                    <p className="font-black text-slate-900 uppercase tracking-tight text-xs">4-Digit PIN</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${securityPin ? 'bg-emerald-500' : 'bg-slate-200'}`} onClick={() => !securityPin && setSecurityPin('1234')}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${securityPin ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
                {securityPin && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 font-black text-lg border border-slate-100">
                        *
                      </div>
                    ))}
                    <button onClick={() => setSecurityPin('')} className="p-3 text-rose-500 active:scale-90 transition-transform">
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint className="text-slate-400" size={18} />
                  <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Biometric Lock</p>
                </div>
                <div 
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${isFingerprintEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  onClick={() => setIsFingerprintEnabled(!isFingerprintEnabled)}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isFingerprintEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm text-center">
              <div className="w-20 h-20 bg-cyan-50 text-cyan-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                <LifeBuoy size={40} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Need Assistance?</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 px-4">Our technical support team is available 24/7 to help you.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a href="tel:+919876543210" className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-center active:scale-95 transition-transform">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call Us</p>
                <p className="text-xs font-black text-slate-900">+91 98765 43210</p>
              </a>
              <a href="mailto:support@srinfotech.com" className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-center active:scale-95 transition-transform">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Us</p>
                <p className="text-xs font-black text-slate-900">support@sr.com</p>
              </a>
            </div>

            <div className="bg-slate-900 p-6 rounded-[32px] text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version</p>
                <p className="text-sm font-black">v4.2.0-stable</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build</p>
                <p className="text-sm font-black">2024.03.05</p>
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                <Tag size={24} />
              </div>
              <div>
                <h3 className="font-black text-orange-900 uppercase tracking-tight">Categories</h3>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Inventory Classification</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-soft">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Quick Add</h3>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  required
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                  className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition text-slate-900 font-black uppercase text-sm"
                  placeholder="E.G. ACCESSORIES"
                />
                <button type="submit" className="w-14 h-14 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-center active:scale-95 transition-all">
                  {isSubmittingCategory ? <Loader2 className="animate-spin" size={20} /> : <Plus size={24} />}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat} className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase leading-tight">{cat}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cat !== 'OTHERS' && (
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-[40px] border border-slate-50 shadow-soft flex items-center gap-5">
              <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                {company.logo ? (
                  <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="text-slate-300" size={32} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{company.name}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">{user?.role} Profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {menuItems.map((item) => {
                if (item.adminOnly && user?.role !== UserRole.ADMIN) return null;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection(item.id)}
                    className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft flex items-center justify-between group active:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.bg} ${item.color} group-active:scale-90 transition-transform`}>
                        <item.icon size={24} />
                      </div>
                      <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-slate-900 transition-colors" size={20} />
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full p-6 bg-rose-50 text-rose-600 rounded-[32px] border border-rose-100 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-sm"
            >
              <LogOut size={18} />
              Sign Out Securely
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveSection(null)}
                className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm active:scale-90 transition-transform"
              >
                <ChevronRight className="rotate-180" size={24} />
              </button>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {menuItems.find(m => m.id === activeSection)?.label}
              </h2>
            </div>

            {renderSection()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
