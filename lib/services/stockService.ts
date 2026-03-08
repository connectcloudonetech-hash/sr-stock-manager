
import { MovementType, StockMovement, Customer, Supplier, Product, UserProfile, UserRole } from '../../types';
import { supabase, isSupabaseConfigured } from '../supabase';

const STORAGE_KEYS = {
  SUPPLIER_MOVEMENTS: 'sr_storage_v4_supplier_movements',
  CUSTOMER_MOVEMENTS: 'sr_storage_v4_customer_movements',
  CUSTOMERS: 'sr_storage_v3_customers',
  SUPPLIERS: 'sr_storage_v3_suppliers',
  PRODUCTS: 'sr_storage_v3_products',
  CATEGORIES: 'sr_storage_v3_categories',
  USERS: 'sr_storage_v3_users'
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
        try {
          await supabase.from('categories').upsert({ name: upperName });
        } catch (err) {
          console.error('Supabase addCategory network error:', err);
        }
      }
    }
    return upperName;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('name');
        if (error) {
          console.error('Supabase getCustomers API error:', error.message, error.details);
        } else if (data) {
          return data;
        }
      } catch (err) {
        console.error('Supabase getCustomers network error:', err);
      }
    }
    return getStorageData<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('suppliers').select('*').order('name');
        if (error) {
          console.error('Supabase getSuppliers API error:', error.message, error.details);
        } else if (data) {
          return data;
        }
      } catch (err) {
        console.error('Supabase getSuppliers network error:', err);
      }
    }
    return getStorageData<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  },

  addCustomer: async (name: string, details?: Partial<Customer>): Promise<Customer> => {
    const upperName = name.toUpperCase();
    const newId = `c-${Math.random().toString(36).substr(2, 5)}`;
    
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('customers').insert({ 
          id: newId,
          name: upperName, 
          ...details 
        }).select().single();
        
        if (error) {
          console.error('Supabase addCustomer API error:', error.message, error.details);
        } else if (data) {
          return data;
        }
      } catch (err) {
        console.error('Supabase addCustomer network error:', err);
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
      try {
        const { data, error } = await supabase.from('suppliers').insert({ 
          id: newId,
          name: upperName, 
          ...details 
        }).select().single();
        
        if (error) {
          console.error('Supabase addSupplier API error:', error.message, error.details);
        } else if (data) {
          return data;
        }
      } catch (err) {
        console.error('Supabase addSupplier network error:', err);
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
      try {
        const { data, error } = await supabase.from('stock_movements').select('*').order('date', { ascending: false });
        if (!error && data) {
          return data.map(m => ({
            ...m,
            is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
          }));
        }
        if (error) console.error('Supabase getMovements API error:', error.message);
      } catch (err) {
        console.error('Supabase getMovements network error:', err);
      }
    }
    
    const [s, c] = await Promise.all([
      getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []),
      getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, [])
    ]);
    return [...s, ...c].map(m => ({
      ...m,
      is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
    }));
  },

  recordSupplierMovement: async (data: Partial<StockMovement>, type: MovementType) => {
    const newId = `sm-${Math.random().toString(36).substr(2, 9)}`;
    let finalRemarks = data.remarks?.toUpperCase() || '';
    if (data.is_internal) {
      finalRemarks += ' [INT]';
    }

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
      remarks: finalRemarks,
      created_by: '1',
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: result, error } = await supabase.from('stock_movements').insert(movementData).select().single();
        if (error) {
          console.error('Supabase recordSupplierMovement API error:', error.message, error.details);
        } else if (result) {
          return { success: true, data: result };
        }
      } catch (err) {
        console.error('Supabase recordSupplierMovement network error:', err);
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
    let finalRemarks = data.remarks?.toUpperCase() || '';
    if (data.is_internal) {
      finalRemarks += ' [INT]';
    }

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
      remarks: finalRemarks,
      created_by: '1',
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: result, error } = await supabase.from('stock_movements').insert(movementData).select().single();
        if (error) {
          console.error('Supabase recordCustomerMovement API error:', error.message, error.details);
        } else if (result) {
          return { success: true, data: result };
        }
      } catch (err) {
        console.error('Supabase recordCustomerMovement network error:', err);
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
      try {
        const { error } = await supabase.from('stock_movements').delete().eq('id', id);
        if (!error) return { success: true };
        console.error('Supabase deleteMovement API error:', error.message);
      } catch (err) {
        console.error('Supabase deleteMovement network error:', err);
      }
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
      try {
        const { error } = await supabase.from('suppliers').update(data).eq('id', id);
        if (!error) return { success: true };
        console.error('Supabase updateSupplier API error:', error.message);
      } catch (err) {
        console.error('Supabase updateSupplier network error:', err);
      }
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
      try {
        await supabase.from('stock_movements').delete().eq('supplier_id', id);
        await supabase.from('suppliers').delete().eq('id', id);
        return { success: true };
      } catch (err) {
        console.error('Supabase deleteSupplier network error:', err);
      }
    }
    const suppliers = await stockService.getSuppliers();
    setStorageData(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    return { success: true };
  },

  updateCustomer: async (id: string, data: Partial<Customer>) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('customers').update(data).eq('id', id);
        if (!error) return { success: true };
        console.error('Supabase updateCustomer API error:', error.message);
      } catch (err) {
        console.error('Supabase updateCustomer network error:', err);
      }
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
      try {
        await supabase.from('stock_movements').delete().eq('customer_id', id);
        await supabase.from('customers').delete().eq('id', id);
        return { success: true };
      } catch (err) {
        console.error('Supabase deleteCustomer network error:', err);
      }
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
      try {
        const { data, error } = await supabase.from('stock_movements').select('*').not('supplier_id', 'is', null).order('date', { ascending: false });
        if (!error && data) {
          return data.map(m => ({
            ...m,
            is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
          }));
        }
        if (error) console.error('Supabase getSupplierMovements API error:', error.message);
      } catch (err) {
        console.error('Supabase getSupplierMovements network error:', err);
      }
    }
    return getStorageData<StockMovement[]>(STORAGE_KEYS.SUPPLIER_MOVEMENTS, []).map(m => ({
      ...m,
      is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
    }));
  },

  getCustomerMovements: async (): Promise<StockMovement[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('stock_movements').select('*').not('customer_id', 'is', null).order('date', { ascending: false });
        if (!error && data) {
          return data.map(m => ({
            ...m,
            is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
          }));
        }
        if (error) console.error('Supabase getCustomerMovements API error:', error.message);
      } catch (err) {
        console.error('Supabase getCustomerMovements network error:', err);
      }
    }
    return getStorageData<StockMovement[]>(STORAGE_KEYS.CUSTOMER_MOVEMENTS, []).map(m => ({
      ...m,
      is_internal: m.remarks?.toUpperCase().includes('[INT]') || m.remarks?.toUpperCase().includes('INTERNAL')
    }));
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
      try {
        const { error } = await supabase.from('stock_movements').update(data).eq('id', id);
        if (!error) return { success: true };
        console.error('Supabase updateMovement API error:', error.message);
      } catch (err) {
        console.error('Supabase updateMovement network error:', err);
      }
    }
    // Fallback logic omitted for brevity as Supabase is primary
    return { success: false, error: 'Supabase update failed' };
  },

  clearAllData: async () => {
    if (isSupabaseConfigured()) {
      try {
        // Delete in order to respect potential foreign key constraints
        await supabase.from('stock_movements').delete().neq('id', '0');
        await supabase.from('suppliers').delete().neq('id', '0');
        await supabase.from('customers').delete().neq('id', '0');
        await supabase.from('categories').delete().neq('name', 'OTHERS');
        await supabase.from('users').delete().neq('username', 'ADMIN');
      } catch (err) {
        console.error('Supabase clearAllData network error:', err);
      }
    }
    localStorage.clear();
    return { success: true };
  },

  // User Management
  getUsers: async (): Promise<UserProfile[]> => {
    const defaultUsers: UserProfile[] = [
      { id: '1', username: 'ADMIN', role: UserRole.ADMIN, full_name: 'ADMINISTRATOR', password: '123' }
    ];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('users').select('*').order('username');
        if (error) {
          console.error('Supabase getUsers API error:', error.message);
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.error('Supabase getUsers network error:', err);
      }
    }
    return getStorageData<UserProfile[]>(STORAGE_KEYS.USERS, defaultUsers);
  },

  addUser: async (user: Omit<UserProfile, 'id'>): Promise<UserProfile> => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newUser: UserProfile = { ...user, id: newId };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('users').insert(newUser).select().single();
        if (error) {
          console.error('Supabase addUser API error:', error.message);
        } else if (data) {
          return data;
        }
      } catch (err) {
        console.error('Supabase addUser network error:', err);
      }
    }

    const users = await stockService.getUsers();
    const updated = [...users, newUser];
    setStorageData(STORAGE_KEYS.USERS, updated);
    return newUser;
  },

  updateUser: async (id: string, data: Partial<UserProfile>): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('users').update(data).eq('id', id);
        if (error) {
          console.error('Supabase updateUser API error:', error.message);
        } else {
          return true;
        }
      } catch (err) {
        console.error('Supabase updateUser network error:', err);
      }
    }

    const users = await stockService.getUsers();
    const updated = users.map(u => u.id === id ? { ...u, ...data } : u);
    setStorageData(STORAGE_KEYS.USERS, updated);
    return true;
  },

  deleteUser: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
          console.error('Supabase deleteUser API error:', error.message);
        } else {
          return true;
        }
      } catch (err) {
        console.error('Supabase deleteUser network error:', err);
      }
    }

    const users = await stockService.getUsers();
    const updated = users.filter(u => u.id !== id);
    setStorageData(STORAGE_KEYS.USERS, updated);
    return true;
  }
};
