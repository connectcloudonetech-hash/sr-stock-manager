
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users, 
  LogOut,
  Menu,
  X,
  FileText,
  Truck,
  Package,
  Tag,
  ChevronLeft,
  UserCircle,
  Plus,
  History,
  Home,
  Settings
} from 'lucide-react';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFabMenu, setShowFabMenu] = useState(false);

  const company = JSON.parse(localStorage.getItem('sr_company_profile') || '{}');
  const LOGO_URL = company.logo || "https://raw.githubusercontent.com/connectcloudonetech-hash/cloudoneuae/refs/heads/main/images/logo-512.png";
  const COMPANY_NAME = company.name || "SR INFOTECH UAE";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const bottomNavItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Truck, label: 'Suppliers', path: '/suppliers' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: FileText, label: 'Reports', path: '/statement' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Close menu on route change
  useEffect(() => {
    setShowFabMenu(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/suppliers')) return 'Suppliers';
    if (path.includes('/customers')) return 'Customers';
    if (path.includes('/statement')) return 'History';
    if (path.includes('/carry-in')) return 'Carry In';
    if (path.includes('/carry-out')) return 'Carry Out';
    if (path.includes('/products')) return 'Categories';
    if (path.includes('/users')) return 'Users';
    if (path.includes('/settings')) return 'Settings';
    return COMPANY_NAME;
  };

  const isRootPath = ['/dashboard', '/suppliers', '/customers', '/statement', '/settings'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* App Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          {!isRootPath ? (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full active:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-900" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <img src={LOGO_URL} alt="Logo" className="w-5 h-5 object-contain" />
            </div>
          )}
          <h1 className="font-black text-lg tracking-tight text-slate-900">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Menu button removed */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-32 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* FAB - Floating Action Button */}
      <div className="fixed bottom-28 right-6 z-40">
        <AnimatePresence>
          {showFabMenu && (
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end">
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={() => navigate('/carry-in')}
                className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl font-bold text-sm whitespace-nowrap active:scale-95"
              >
                <ArrowDownCircle size={18} />
                Carry In
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.05 }}
                onClick={() => navigate('/carry-out')}
                className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl font-bold text-sm whitespace-nowrap active:scale-95"
              >
                <ArrowUpCircle size={18} />
                Carry Out
              </motion.button>
            </div>
          )}
        </AnimatePresence>
        
        <motion.button
          animate={{ rotate: showFabMenu ? 45 : 0 }}
          onClick={() => setShowFabMenu(!showFabMenu)}
          className="w-14 h-14 rounded-full bg-slate-900 text-white shadow-2xl shadow-red-200 flex items-center justify-center active:scale-90 transition-all"
        >
          <Plus size={28} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-2 pb-4 z-50 pointer-events-none">
        <nav className="bg-slate-900 backdrop-blur-2xl border border-white/10 flex justify-between items-center py-2.5 px-1 rounded-[32px] shadow-[0_20px_50px_rgba(220,38,38,0.3)] pointer-events-auto">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 flex-1 min-w-0 py-2 rounded-2xl transition-all relative group",
                isActive ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "relative z-10 transition-transform duration-300",
                    isActive ? "scale-110" : "group-active:scale-90"
                  )}>
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tight transition-all duration-300 relative z-10 truncate w-full text-center px-1",
                    isActive ? "opacity-100 translate-y-0" : "opacity-80"
                  )}>
                    {item.label}
                  </span>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/20 rounded-2xl z-0 mx-1"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Side Menu Drawer removed */}
    </div>
  );
};

