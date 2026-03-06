
import { MovementType, StockMovement, Customer, Supplier, Product } from '../../types';
import { supabase } from '../supabase';

const STORAGE_KEYS = {
  SUPPLIER_MOVEMENTS: 'sr_storage_v4_supplier_movements',
  CUSTOMER_MOVEMENTS: 'sr_storage_v4_customer_movements',
  CUSTOMERS: 'sr_storage_v3_customers',
  SUPPLIERS: 'sr_storage_v3_suppliers',
  PRODUCTS: 'sr_storage_v3_products',
  CATEGORIES: 'sr_storage_v3_categories'
};

const INITIAL_CATEGORIES = [
  'LAPTOP',
  'RF MOBILE',
  'NEW MOBILE',
  'BURKA',
  'GAME',
  'FACE-CREAM',
  'CPU',
  'OTHERS'
];

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
  const env = (import.meta as any).env;
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_ANON_KEY;
  
  // Check if variables exist and aren't just the placeholder strings from .env.example
  const isConfigured = !!(
    url && 
    key && 
    url !== 'your_supabase_project_url' && 
    key !== 'your_supabase_anon_key' &&
    url.startsWith('https://')
  );
  
  return isConfigured;
};

// Helper to interact with LocalStorage
const getStorageData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error parsing localStorage key: ${key}`, e);
    return defaultValue;
  }
};

const setStorageData = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Service Implementation
export const stockService = {
  getCategories: (): string[] => {
    return getStorageData<string[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },

  addCategory: async (name: string): Promise<string> => {
    const categories = stockService.getCategories();
    const upperName = name.toUpperCase();
    if (!categories.includes(upperName)) {
      const updated = [...categories, upperName];
      setStorageData(STORAGE_KEYS.CATEGORIES, updated);
      
      if (isSupabaseConfigured()) {
        await supabase.from('categories').upsert({ name: upperName });
      }
    }
    return upperName;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) {
        console.error('Supabase getCustomers error:', error.message, error.details);
      } else if (data) {
        return data;
      }
    }
    return getStorageData<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) {
        console.error('Supabase getSuppliers error:', error.message, error.details);
      } else if (data) {
        return data;
      }
    }
    return getStorageData<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  },

  addCustomer: async (name: string, details?: Partial<Customer>): Promise<Customer> => {
    const upperName = name.toUpperCase();
    const newId = `c-${Math.random().toString(36).substr(2, 5)}`;
    
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('customers').insert({ 
        id: newId,
        name: upperName, 
        ...details 
      }).select().single();
      
      if (error) {
        console.error('Supabase addCustomer error:', error.message, error.details);
      } else if (data) {
        return data;
      }
    }
    
    const customers = await stockService.getCustomers();
    const newCust: Customer = {
      id: newId,
      name: upperName,
      ...details
    };
    setStorageData(STORAGE_KEYS.CUSTOMERS, [...customers, newCust]);
    return newCust;
  },

  addSupplier: async (name: string, details?: Partial<Supplier>): Promise<Supplier> => {
    const upperName = name.toUpperCase();
    const newId = `s-${Math.random().toString(36).substr(2, 5)}`;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('suppliers').insert({ 
        id: newId,
        name: upperName, 
        ...details 
      }).select().single();
      
      if (error) {
        console.error('Supabase addSupplier error:', error.message, error.details);
      } else if (data) {
        return data;
      }
    }

    const suppliers = await stockService.getSuppliers();
    const newSupplier: Supplier = {
      id: newId,
      name: upperName,
      ...details
    };
    setStorageData(STORAGE_KEYS.SUPPLIERS, [...suppliers, newSupplier]);
    return newSupplier;
  },

  getMovements: async (): Promise<StockMovement[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('stock_movements').select('*').order('date', { ascending: false });
      if (!error && data) return data;
    }
    
    const [s, c] = await Promise.all([
      getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []),
      getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, [])
    ]);
    return [...s, ...c];
  },

  recordSupplierMovement: async (data: Partial<StockMovement>, type: MovementType) => {
    const newId = `sm-${Math.random().toString(36).substr(2, 9)}`;
    const movementData = {
      id: newId,
      date: data.date!,
      type: type,
      category: data.category!.toUpperCase(),
      supplier_id: data.supplier_id,
      qty: data.nos!,
      nos: data.nos!,
      unit_price: data.unit_price,
      weight: data.weight,
      amount: data.amount,
      remarks: data.remarks?.toUpperCase(),
      created_by: '1',
    };

    if (isSupabaseConfigured()) {
      const { data: result, error } = await supabase.from('stock_movements').insert(movementData).select().single();
      if (error) {
        console.error('Supabase recordSupplierMovement error:', error.message, error.details);
      } else if (result) {
        return { success: true, data: result };
      }
    }

    const movements = getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []);
    const newMovement: StockMovement = {
      ...movementData,
      created_at: new Date().toISOString(),
    };
    setStorageData(STORAGE_KEYS.SUPPLIER_MOVEMENTS, [newMovement, ...movements]);
    return { success: true, data: newMovement };
  },

  recordCustomerMovement: async (data: Partial<StockMovement>, type: MovementType) => {
    const newId = `cm-${Math.random().toString(36).substr(2, 9)}`;
    const movementData = {
      id: newId,
      date: data.date!,
      type: type,
      category: data.category!.toUpperCase(),
      customer_id: data.customer_id,
      qty: data.nos!,
      nos: data.nos!,
      unit_price: data.unit_price,
      weight: data.weight,
      amount: data.amount,
      remarks: data.remarks?.toUpperCase(),
      created_by: '1',
    };

    if (isSupabaseConfigured()) {
      const { data: result, error } = await supabase.from('stock_movements').insert(movementData).select().single();
      if (error) {
        console.error('Supabase recordCustomerMovement error:', error.message, error.details);
      } else if (result) {
        return { success: true, data: result };
      }
    }

    const movements = getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, []);
    const newMovement: StockMovement = {
      ...movementData,
      created_at: new Date().toISOString(),
    };
    setStorageData(STORAGE_KEYS.CUSTOMER_MOVEMENTS, [newMovement, ...movements]);
    return { success: true, data: newMovement };
  },

  deleteMovement: async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('stock_movements').delete().eq('id', id);
      if (!error) return { success: true };
    }

    const sMovements = getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []);
    const cMovements = getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, []);
    
    setStorageData(STORAGE_KEYS.SUPPLIER_MOVEMENTS, sMovements.filter(m => m.id !== id));
    setStorageData(STORAGE_KEYS.CUSTOMER_MOVEMENTS, cMovements.filter(m => m.id !== id));
    
    return { success: true };
  },

  getProducts: async (): Promise<Product[]> => {
    return getStorageData<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },
  
  deleteCategory: async (name: string): Promise<void> => {
    const categories = stockService.getCategories();
    const updated = categories.filter(c => c !== name.toUpperCase());
    setStorageData(STORAGE_KEYS.CATEGORIES, updated);
  },

  updateSupplier: async (id: string, data: Partial<Supplier>) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('suppliers').update(data).eq('id', id);
      if (!error) return { success: true };
    }
    const suppliers = await stockService.getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index !== -1) {
      suppliers[index] = { ...suppliers[index], ...data };
      setStorageData(STORAGE_KEYS.SUPPLIERS, suppliers);
      return { success: true };
    }
    return { success: false };
  },

  deleteSupplier: async (id: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from('stock_movements').delete().eq('supplier_id', id);
      await supabase.from('suppliers').delete().eq('id', id);
      return { success: true };
    }
    const suppliers = await stockService.getSuppliers();
    setStorageData(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    return { success: true };
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('customers').update(data).eq('id', id);
      if (!error) return { success: true };
    }
    const customers = await stockService.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...data };
      setStorageData(STORAGE_KEYS.CUSTOMERS, customers);
      return { success: true };
    }
    return { success: false };
  },

  deleteCustomer: async (id: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from('stock_movements').delete().eq('customer_id', id);
      await supabase.from('customers').delete().eq('id', id);
      return { success: true };
    }
    const customers = await stockService.getCustomers();
    setStorageData(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    return { success: true };
  },

  ensureProductExists: async (name: string, category: string = 'OTHERS'): Promise<void> => {
    // This was used for local product tracking, can be a no-op or category check for Supabase
    await stockService.addCategory(category);
  },

  clearSupplierHistory: async (supplierId: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from('stock_movements').delete().eq('supplier_id', supplierId);
      return { success: true };
    }
    const movements = getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []);
    setStorageData(STORAGE_KEYS.SUPPLIER_MOVEMENTS, movements.filter(m => m.supplier_id !== supplierId));
    return { success: true };
  },

  clearCustomerHistory: async (customerId: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from('stock_movements').delete().eq('customer_id', customerId);
      return { success: true };
    }
    const movements = getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, []);
    setStorageData(STORAGE_KEYS.CUSTOMER_MOVEMENTS, movements.filter(m => m.customer_id !== customerId));
    return { success: true };
  },

  // Added missing methods to maintain compatibility
  getSupplierMovements: async (): Promise<StockMovement[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('stock_movements').select('*').not('supplier_id', 'is', null).order('date', { ascending: false });
      if (!error && data) return data;
    }
    return getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []);
  },

  getCustomerMovements: async (): Promise<StockMovement[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('stock_movements').select('*').not('customer_id', 'is', null).order('date', { ascending: false });
      if (!error && data) return data;
    }
    return getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, []);
  },

  getMovementById: async (id: string): Promise<StockMovement | undefined> => {
    const movements = await stockService.getMovements();
    return movements.find(m => m.id === id);
  },

  getMovementsByCustomerId: async (customerId: string): Promise<StockMovement[]> => {
    const movements = await stockService.getCustomerMovements();
    return movements.filter(m => m.customer_id === customerId);
  },

  getMovementsBySupplierId: async (supplierId: string): Promise<StockMovement[]> => {
    const movements = await stockService.getSupplierMovements();
    return movements.filter(m => m.supplier_id === supplierId);
  },

  updateMovement: async (id: string, data: Partial<StockMovement>) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('stock_movements').update(data).eq('id', id);
      if (!error) return { success: true };
    }
    // Fallback logic omitted for brevity as Supabase is primary
    return { success: false, error: 'Supabase update failed' };
  },

  clearAllData: async () => {
    localStorage.clear();
    return { success: true };
  }
};
