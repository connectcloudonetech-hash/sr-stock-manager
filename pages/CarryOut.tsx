
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpCircle, Check, Loader2, AlertTriangle, Banknote, Tag, ChevronDown, Edit3, Trash2, Search } from 'lucide-react';
import { stockService } from '../lib/services/stockService';
import { Customer, Supplier, MovementType, Product } from '../types';

export const CarryOut: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryList, setShowCategoryList] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    customer_id: '',
    supplier_id: '',
    nos: '',
    unit_price: '',
    weight: '',
    amount: '',
    remarks: ''
  });

  // Merge predefined categories with product names for the dropdown
  const categories = React.useMemo(() => {
    const productNames = products.map(p => p.name.toUpperCase());
    const combined = Array.from(new Set([...categoriesList.filter(c => c !== 'OTHERS'), ...productNames]));
    return [...combined, 'OTHERS'];
  }, [products, categoriesList]);

  useEffect(() => {
    const loadData = async () => {
      const [c, v, p] = await Promise.all([
        stockService.getCustomers(),
        stockService.getSuppliers(),
        stockService.getProducts()
      ]);
      const cats = stockService.getCategories();
      setCustomers(c);
      setSuppliers(v);
      setProducts(p);
      setCategoriesList(cats);

      if (id) {
        const movement = await stockService.getMovementById(id);
        if (movement) {
          const isPredefinedCategory = cats.includes(movement.category) || p.some(prod => prod.name.toUpperCase() === movement.category.toUpperCase());
          setFormData({
            date: movement.date,
            category: isPredefinedCategory ? movement.category : 'OTHERS',
            customer_id: movement.customer_id || '',
            supplier_id: movement.supplier_id || '',
            nos: movement.nos.toString(),
            unit_price: movement.unit_price?.toString() || '',
            weight: movement.weight?.toString() || '',
            amount: movement.amount?.toString() || '',
            remarks: movement.remarks || ''
          });
          if (!isPredefinedCategory) {
            setCustomCategory(movement.category);
          }
        }
      } else if (location.state?.customerId) {
        setFormData(prev => ({ ...prev, customer_id: location.state.customerId }));
      } else if (location.state?.supplierId) {
        setFormData(prev => ({ ...prev, supplier_id: location.state.supplierId }));
      }
    };
    loadData();
  }, [id, location.state]);

  // Auto-calculate amount
  useEffect(() => {
    const nos = parseFloat(formData.nos);
    const unitPrice = parseFloat(formData.unit_price);
    if (!isNaN(nos) && !isNaN(unitPrice)) {
      const calculatedAmount = nos * unitPrice;
      setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
    }
  }, [formData.nos, formData.unit_price]);

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const created = await stockService.addCustomer(newCustomerName.toUpperCase());
      setCustomers([...customers, created]);
      setFormData({ ...formData, customer_id: created.id });
      setIsAddingNewCustomer(false);
    } catch (err) {
      alert('Error adding customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formData.category === 'OTHERS' ? customCategory : formData.category;
    if (!finalCategory) {
      alert("Please select or type a product name");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // Auto-add to product list if it's a new "OTHER" product
      if (formData.category === 'OTHERS' && customCategory) {
        await stockService.ensureProductExists(customCategory.toUpperCase());
      }

      const payload = {
        date: formData.date,
        category: finalCategory.toUpperCase(),
        customer_id: formData.customer_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        nos: Number(formData.nos),
        unit_price: formData.unit_price ? Number(formData.unit_price) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        amount: formData.amount ? Number(formData.amount) : undefined,
        remarks: formData.remarks.toUpperCase()
      };

      if (id) {
        await stockService.updateMovement(id, payload);
      } else if (formData.customer_id) {
        await stockService.recordCustomerMovement(payload, MovementType.OUT);
      } else if (formData.supplier_id) {
        await stockService.recordSupplierMovement(payload, MovementType.OUT);
      } else {
        // Default to customer if nothing selected
        await stockService.recordCustomerMovement(payload, MovementType.OUT);
      }

      setShowSuccess(true);
      // If we came from a specific customer, go back to customers and tell it to reopen that customer
      const isFromSupplier = !!location.state?.supplierId;
      const targetPath = isFromSupplier ? '/suppliers' : (location.state?.customerId ? '/customers' : '/dashboard');
      const targetState = isFromSupplier ? { reopenId: location.state.supplierId } : (location.state?.customerId ? { reopenId: location.state.customerId } : undefined);
      
      setTimeout(() => navigate(targetPath, { state: targetState, replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || 'Error saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('ARE YOU SURE YOU WANT TO DELETE THIS TRANSACTION? THIS WILL REVERT STOCK BALANCES.')) {
      setIsSubmitting(true);
      try {
        await stockService.deleteMovement(id);
        const isFromSupplier = !!location.state?.supplierId;
        const targetPath = isFromSupplier ? '/suppliers' : (location.state?.customerId ? '/customers' : '/dashboard');
        const targetState = isFromSupplier ? { reopenId: location.state.supplierId } : (location.state?.customerId ? { reopenId: location.state.customerId } : undefined);
        navigate(targetPath, { state: targetState, replace: true });
      } catch (err) {
        setError('Failed to delete transaction');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <Check size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{id ? 'Entry Updated!' : 'Carry OUT Recorded!'}</h2>
        <p className="text-slate-500 font-medium text-sm">Inventory updated successfully.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div className="flex items-center space-x-3 text-slate-800">
        <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
          <ArrowUpCircle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{id ? 'Edit Carry OUT' : 'New Carry OUT'}</h1>
          <p className="text-slate-500 font-medium text-sm">
             {id ? 'Modify the details of this outgoing transaction.' : 'Release transaction by product.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft space-y-6">
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 font-bold text-xs"><AlertTriangle size={18} /> <span>{error}</span></div>}

        <div className="space-y-4">
          <div className="floating-label-group">
            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="input-mobile" placeholder=" " />
            <label className="floating-label">Date</label>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1 px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {location.state?.supplierId ? 'Supplier' : 'Customer'}
              </label>
              {!id && !location.state?.supplierId && (
                <button type="button" onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)} className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                  {isAddingNewCustomer ? 'Cancel' : 'Add My Self'}
                </button>
              )}
            </div>
            {isAddingNewCustomer ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NAME..." 
                  value={newCustomerName} 
                  onChange={(e) => setNewCustomerName(e.target.value.toUpperCase())} 
                  className="flex-1 input-mobile !py-3" 
                />
                <button type="button" onClick={handleAddNewCustomer} className="px-4 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Add</button>
              </div>
            ) : location.state?.supplierId ? (
              <select required value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})} className="input-mobile appearance-none uppercase font-bold text-sm">
                <option value="">CHOOSE SUPPLIER</option>
                {suppliers.map(v => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
              </select>
            ) : (
              <select required value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value})} className="input-mobile appearance-none uppercase font-bold text-sm">
                <option value="">CHOOSE CUSTOMER</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Product</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="SEARCH OR SELECT PRODUCT..."
                value={categorySearch || formData.category}
                onFocus={() => setShowCategoryList(true)}
                onChange={(e) => {
                  setCategorySearch(e.target.value.toUpperCase());
                  setFormData({...formData, category: ''});
                }}
                className="input-mobile uppercase font-bold text-sm pr-10"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search size={18} />
              </div>
            </div>

            <AnimatePresence>
              {showCategoryList && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategoryList(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 max-h-60 overflow-y-auto p-2 space-y-1"
                  >
                    {categories
                      .filter(cat => cat.toUpperCase().includes(categorySearch.toUpperCase()))
                      .map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, category: cat});
                            setCategorySearch('');
                            setShowCategoryList(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                            formData.category === cat ? 'bg-rose-50 text-rose-600' : 'text-slate-600 active:bg-slate-50'
                          }`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, category: 'OTHERS'});
                        setCategorySearch('');
                        setShowCategoryList(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                        formData.category === 'OTHERS' ? 'bg-rose-50 text-rose-600' : 'text-slate-600 active:bg-slate-50'
                      }`}
                    >
                      + ADD NEW PRODUCT (OTHERS)
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            
            {formData.category === 'OTHERS' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <input 
                  required
                  type="text" 
                  placeholder="CUSTOM PRODUCT NAME..." 
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value.toUpperCase())}
                  className="input-mobile !bg-slate-100 !text-slate-900 border border-slate-200 uppercase font-bold"
                />
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="floating-label-group">
              <input type="number" required value={formData.nos} onChange={(e) => setFormData({...formData, nos: e.target.value})} className="input-mobile" placeholder=" " />
              <label className="floating-label">Pieces</label>
            </div>
            <div className="floating-label-group">
              <input type="number" step="any" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: e.target.value})} className="input-mobile" placeholder=" " />
              <label className="floating-label">Unit Price</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="floating-label-group">
              <input type="number" step="any" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="input-mobile" placeholder=" " />
              <label className="floating-label">Weight (kg)</label>
            </div>
            <div className="floating-label-group">
              <input type="number" step="any" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="input-mobile font-black text-slate-900" placeholder=" " />
              <label className="floating-label">Total Amount</label>
            </div>
          </div>

          <div className="floating-label-group">
            <textarea 
              value={formData.remarks} 
              onChange={(e) => setFormData({...formData, remarks: e.target.value.toUpperCase()})} 
              className="input-mobile h-24 resize-none" 
              placeholder=" " 
            />
            <label className="floating-label">Remarks</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-gradient-secondary flex-1 py-4 text-sm">
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            {id ? 'Update Entry' : 'Confirm Carry OUT'}
          </button>

          {id && (
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={isSubmitting}
              className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl active:scale-95 transition-all"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
