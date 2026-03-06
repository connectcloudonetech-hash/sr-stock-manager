
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Loader2
} from 'lucide-react';
import { Product, MovementType, StockMovement } from '../types';
import { stockService } from '../lib/services/stockService';
import { TableSkeleton } from '../components/Skeleton';

const UNITS = ['pcs', 'kg', 'liters', 'meters', 'box', 'set', 'roll', 'pkt', 'sqft', 'sqm'];

export const Products: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [p, cats] = await Promise.all([
      stockService.getProducts(),
      Promise.resolve(stockService.getCategories())
    ]);
    setProducts(p);
    setCategories(cats);
    setLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    await stockService.addCategory(newCategoryName);
    setNewCategoryName('');
    await fetchData();
    setIsSubmitting(false);
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async (name: string) => {
    if (name === 'OTHERS') {
      alert('CANNOT DELETE "OTHERS" CATEGORY');
      return;
    }
    if (window.confirm(`ARE YOU SURE YOU WANT TO DELETE "${name}" CATEGORY?`)) {
      await stockService.deleteCategory(name);
      await fetchData();
    }
  };

  const filteredCategories = categories.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Categories</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Classification</p>
        </div>
        <button 
          onClick={() => setIsCategoryModalOpen(true)}
          className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="SEARCH CATEGORIES..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-slate-900/5 outline-none transition shadow-soft font-black text-slate-900 uppercase text-xs tracking-wider" 
        />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-soft">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Quick Add</h3>
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              required
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition text-slate-900 font-black uppercase text-sm"
              placeholder="E.G. ACCESSORIES"
            />
            <button type="submit" className="w-14 h-14 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center active:scale-95 transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={24} />}
            </button>
          </form>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-white h-20 rounded-3xl border border-slate-50"></div>)
          ) : (
            filteredCategories.map(cat => {
              const prodCount = products.filter(p => p.category === cat).length;
              return (
                <div key={cat} className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase leading-tight">{cat}</h3>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{prodCount} Products Linked</p>
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
              );
            })
          )}
        </div>
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in duration-300">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">New Category</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category Name</label>
                <input 
                  required
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition text-slate-900 font-black uppercase text-sm"
                  placeholder="E.G. ACCESSORIES"
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="btn-gradient-primary w-full py-5 text-xs">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                  Confirm Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

