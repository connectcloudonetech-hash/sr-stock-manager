
import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon, Check, Lock, X, Database, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { stockService } from '../lib/services/stockService';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: UserRole.STAFF,
    full_name: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await stockService.getUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await stockService.addUser({
        username: newUser.username.toUpperCase(),
        full_name: newUser.full_name.toUpperCase(),
        role: newUser.role,
        password: newUser.password
      });
      setUsers([...users, created]);
      setIsAdding(false);
      setNewUser({ username: '', password: '', role: UserRole.STAFF, full_name: '' });
    } catch (err) {
      alert('Error adding user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === '1' || users.find(u => u.id === id)?.username === 'ADMIN') {
      alert('Cannot delete the primary administrator account.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await stockService.deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        alert('Error deleting user');
      }
    }
  };

  const handleUpdatePassword = async () => {
    if (!editingUser || !newPassword) return;
    setIsSubmitting(true);
    try {
      await stockService.updateUser(editingUser.id, { password: newPassword });
      alert('Password updated successfully');
      setIsChangingPassword(false);
      setNewPassword('');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert('Error updating password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await stockService.clearAllData();
      alert('All system data has been cleared successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error clearing data');
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Staff</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Management</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            <UserPlus size={20} />
          </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-6 rounded-[32px] border border-blue-50 shadow-soft animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">New Profile</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-5">
            <div className="space-y-4">
              <div className="floating-label-group">
                <input 
                  required
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value.toUpperCase()})}
                  className="input-mobile"
                  placeholder=" "
                />
                <label className="floating-label">Full Name</label>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                <div className="relative">
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="input-mobile appearance-none uppercase font-bold text-sm"
                  >
                    <option value={UserRole.STAFF}>Staff User</option>
                    <option value={UserRole.MANAGER}>Store Manager</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                  <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="floating-label-group">
                <input 
                  required
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value.toUpperCase()})}
                  className="input-mobile"
                  placeholder=" "
                />
                <label className="floating-label">Username</label>
              </div>

              <div className="floating-label-group">
                <input 
                  required
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="input-mobile"
                  placeholder=" "
                />
                <label className="floating-label">Password</label>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Confirm
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="px-6 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isChangingPassword && editingUser && (
        <div className="bg-white p-6 rounded-[32px] border border-blue-50 shadow-soft animate-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Change Password</h2>
            <button onClick={() => setIsChangingPassword(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition">
              <X size={20} />
            </button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Updating password for: {editingUser.full_name}</p>
          
          <div className="space-y-5">
            <div className="floating-label-group">
              <input 
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-mobile"
                placeholder=" "
                autoFocus
              />
              <label className="floating-label">New Password</label>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                onClick={handleUpdatePassword}
                disabled={isSubmitting || !newPassword}
                className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Update Password
              </button>
              <button 
                type="button" 
                onClick={() => setIsChangingPassword(false)} 
                className="px-6 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft flex items-center justify-between group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase leading-tight">{u.full_name}</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">@{u.username} • {u.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                onClick={() => {
                  setEditingUser(u);
                  setIsChangingPassword(true);
                  setNewPassword('');
                }}
              >
                <Lock size={16} />
              </button>
              <button 
                className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                onClick={() => handleDeleteUser(u.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* System Maintenance Section */}
      <div className="mt-12 pt-8 border-t border-slate-100">
        <div className="flex items-center space-x-3 mb-6 px-1">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Maintenance</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Tools</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] space-y-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xs font-black text-rose-900 uppercase tracking-tight">Factory Reset</h3>
              <p className="text-[10px] text-rose-700/70 font-bold uppercase mt-1 leading-relaxed">
                Permanently delete all stock movements, customers, suppliers, and product data.
              </p>
            </div>
          </div>

          <div className="pt-2">
            {!showClearConfirm ? (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-rose-100 uppercase tracking-widest text-[10px]"
              >
                Clear All Data
              </button>
            ) : (
              <div className="flex gap-2 animate-in zoom-in duration-200">
                <button 
                  onClick={handleClearAllData}
                  disabled={isClearing}
                  className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-rose-100 uppercase tracking-widest text-[10px] flex items-center justify-center"
                >
                  {isClearing ? <RefreshCw className="animate-spin mr-2" size={14} /> : null}
                  Confirm Delete
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-6 py-4 bg-white text-slate-600 border border-slate-200 font-black rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
