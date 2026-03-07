
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CarryIn } from './pages/CarryIn';
import { CarryOut } from './pages/CarryOut';
import { UserManagement } from './pages/UserManagement';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Products } from './pages/Products';
import { Reports as Statement } from './pages/Reports';
import { Settings } from './pages/Settings';
import { PinLock } from './components/PinLock';
import { UserRole, UserProfile } from './types';
import { SplashScreen } from './components/SplashScreen';

// Mock Auth Context for Demo
interface AuthContextType {
  user: UserProfile | null;
  login: (profile: UserProfile) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('sr_infotech_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('sr_infotech_user', JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sr_infotech_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('sr_security_pin'));

  return (
    <AuthProvider>
      <SplashScreen />
      {isLocked && <PinLock onSuccess={() => setIsLocked(false)} />}
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="carry-in" element={<CarryIn />} />
            <Route path="carry-in/:id" element={<CarryIn />} />
            <Route path="carry-out" element={<CarryOut />} />
            <Route path="carry-out/:id" element={<CarryOut />} />
            <Route path="statement" element={<Statement />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={
              <ProtectedRoute roles={[UserRole.ADMIN]}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
