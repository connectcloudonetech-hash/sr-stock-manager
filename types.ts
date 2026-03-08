
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff'
}

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
  password?: string;
}

// Added Product interface to fix error in pages/Products.tsx
export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT'
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: MovementType;
  category: string;
  customer_id?: string;
  supplier_id?: string;
  qty: number;
  nos: number;
  unit_price?: number;
  weight?: number;
  amount?: number;
  remarks?: string;
  is_internal?: boolean;
  created_at: string;
  created_by: string;
}

export interface DashboardStats {
  totalStockQuantity: number;
  todayIn: number;
  todayOut: number;
}
