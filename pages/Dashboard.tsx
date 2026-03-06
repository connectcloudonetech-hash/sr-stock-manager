
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus,
  Minus,
  ArrowDownCircle,
  ArrowUpCircle,
  Tags,
  ChevronDown,
  Calendar,
  Layers,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { stockService } from '../lib/services/stockService';
import { StockMovement, MovementType, Customer, Supplier } from '../types';
import { DashboardSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';

type CategoryPeriod = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';
type CategoryTypeFilter = 'BOTH' | MovementType.IN | MovementType.OUT;

export const Dashboard: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryPeriod, setCategoryPeriod] = useState<CategoryPeriod>('ALL');
  const [categoryType, setCategoryType] = useState<CategoryTypeFilter>('BOTH');

  const fetchData = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const [m, c, v] = await Promise.all([
      stockService.getMovements(),
      stockService.getCustomers(),
      stockService.getSuppliers()
    ]);
    const cats = stockService.getCategories();
    const sortedMovements = [...m].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMovements(sortedMovements);
    setCustomers(c);
    setSuppliers(v);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    const balances: Record<string, number> = {};
    categories.forEach(cat => balances[cat] = 0);

    movements.forEach(m => {
      const mDate = new Date(m.date);
      let matchesPeriod = true;

      if (categoryPeriod === 'TODAY') {
        matchesPeriod = mDate.toDateString() === todayStr;
      } else if (categoryPeriod === 'WEEK') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        matchesPeriod = mDate >= startOfWeek;
      } else if (categoryPeriod === 'MONTH') {
        matchesPeriod = mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear();
      } else if (categoryPeriod === 'YEAR') {
        matchesPeriod = mDate.getFullYear() === now.getFullYear();
      }

      if (matchesPeriod) {
        if (categoryType === 'BOTH') {
          if (m.type === MovementType.IN) {
            balances[m.category] = (balances[m.category] || 0) + m.nos;
          } else {
            balances[m.category] = (balances[m.category] || 0) - m.nos;
          }
        } else if (categoryType === m.type) {
          balances[m.category] = (balances[m.category] || 0) + m.nos;
        }
      }
    });

    const todaySupplierIn = movements.filter(m => new Date(m.date).toDateString() === todayStr && m.supplier_id && m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
    const todaySupplierOut = movements.filter(m => new Date(m.date).toDateString() === todayStr && m.supplier_id && m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);
    const todayCustomerIn = movements.filter(m => new Date(m.date).toDateString() === todayStr && m.customer_id && m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
    const todayCustomerOut = movements.filter(m => new Date(m.date).toDateString() === todayStr && m.customer_id && m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);

    const totalSupplierStock = movements.filter(m => m.supplier_id).reduce((sum, m) => m.type === MovementType.IN ? sum + m.nos : sum - m.nos, 0);
    const totalCustomerStock = movements.filter(m => m.customer_id).reduce((sum, m) => m.type === MovementType.IN ? sum + m.nos : sum - m.nos, 0);

    return {
      today: {
        supplierIn: todaySupplierIn,
        supplierOut: todaySupplierOut,
        customerIn: todayCustomerIn,
        customerOut: todayCustomerOut,
        net: (todaySupplierIn + todayCustomerIn) - (todaySupplierOut + todayCustomerOut)
      },
      totalSupplierStock,
      totalCustomerStock,
      balances
    };
  }, [movements, categoryPeriod, categoryType, categories]);

  const getPartyName = (m: StockMovement) => {
    if (m.type === MovementType.IN) {
      return suppliers.find(v => v.id === m.supplier_id)?.name || m.supplier_id || 'INTERNAL';
    }
    return customers.find(c => c.id === m.customer_id)?.name || m.customer_id || 'INTERNAL';
  };

  if (loading) return <DashboardSkeleton />;

  const pinnedCategories = categories.filter(c => c !== 'OTHERS');

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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <header className="flex items-end justify-between px-1 pt-4">
        <div>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-1">
            Overview
          </p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
            Dashboard
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Calendar size={12} className="text-slate-300" />
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-soft text-slate-400 active:rotate-180 transition-all duration-700 hover:text-red-600"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <Layers size={22} className="text-red-400" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Net Inventory Balance</span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-7xl font-black tracking-tighter leading-none">
                {stats.totalSupplierStock + stats.totalCustomerStock}
              </p>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Units</span>
            </div>
            <div className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full bg-red-500 border-4 border-slate-900 shadow-lg" />
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-4 border-slate-900 shadow-lg" />
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-4 border-slate-900 shadow-lg" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Inventory</span>
              </div>
              <div className="px-3 py-1.5 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  System Sync
                </span>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-red-600/20 transition-colors duration-700" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full -ml-20 -mb-20 group-hover:bg-blue-600/20 transition-colors duration-700" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-soft relative overflow-hidden group hover:border-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchase</span>
          </div>
          <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{stats.totalSupplierStock}</p>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <TrendingUp size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Inflow</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-blue-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-soft relative overflow-hidden group hover:border-rose-100 transition-colors"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales</span>
          </div>
          <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{Math.abs(stats.totalCustomerStock)}</p>
          <div className="flex items-center gap-1.5 text-rose-600">
            <TrendingDown size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Outflow</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-rose-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      </div>

      {/* Category Breakdown Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-red-600 rounded-full" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
              Inventory Mix
            </h2>
          </div>
          
          <div className="relative">
            <select 
              value={categoryPeriod}
              onChange={(e) => setCategoryPeriod(e.target.value as CategoryPeriod)}
              className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-white border border-slate-100 shadow-soft px-4 py-2.5 rounded-2xl appearance-none outline-none pr-10 focus:ring-4 focus:ring-slate-900/5 transition-all"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Week</option>
              <option value="MONTH">Month</option>
              <option value="YEAR">Year</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {pinnedCategories.map((cat, idx) => {
            const balance = stats.balances[cat] || 0;
            const isNegative = balance < 0;
            const isPositive = balance > 0;
            
            return (
              <motion.div 
                key={cat} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-soft flex flex-col active:scale-95 transition-all group hover:border-slate-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                    isPositive ? "bg-emerald-50 text-emerald-600" : isNegative ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                  )}>
                    <Package size={18} />
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                    isPositive ? "bg-emerald-50 text-emerald-600" : isNegative ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                  )}>
                    {isPositive ? 'Stock' : isNegative ? 'Short' : 'Zero'}
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{cat}</p>
                <p className={cn(
                  "text-3xl font-black tracking-tighter leading-none",
                  isNegative ? 'text-rose-600' : isPositive ? 'text-slate-900' : 'text-slate-300'
                )}>
                  {balance > 0 ? `+${balance}` : balance}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
              Recent Activity
            </h2>
          </div>
          <Link to="/statement" className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] hover:opacity-70 transition-opacity flex items-center gap-2">
            View Ledger
            <TrendingUp size={12} className="rotate-45" />
          </Link>
        </div>

        <div className="space-y-4">
          {movements.slice(0, 5).map((m, idx) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-soft flex items-center justify-between active:bg-slate-50 transition-all group hover:border-slate-200"
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-[22px] flex items-center justify-center transition-transform group-hover:scale-110",
                  m.type === MovementType.IN ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {m.type === MovementType.IN ? <ArrowDownCircle size={28} /> : <ArrowUpCircle size={28} />}
                </div>
                <div>
                  <p className="text-base font-black text-slate-900 tracking-tight uppercase">{m.category}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest flex items-center gap-2">
                    <span className="text-slate-300">{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-slate-600 truncate max-w-[100px]">{getPartyName(m)}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-xl font-black tracking-tighter leading-none",
                  m.type === MovementType.IN ? "text-emerald-600" : "text-rose-600"
                )}>
                  {m.type === MovementType.IN ? '+' : '-'}{m.nos}
                </p>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Units</p>
              </div>
            </motion.div>
          ))}
          
          {movements.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[40px] border border-slate-50 shadow-soft">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                <Package size={40} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">No activity recorded</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

