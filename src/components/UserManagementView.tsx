import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  KeyRound,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  Check,
  X,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Calendar,
  Lock,
  History,
  Settings,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { LoginFormConfig, LoginAuditRecord, UserAccount, UserRole } from '../types';
import {
  createUserAccount,
  getLoginAudits,
  getLoginFormConfig,
  getUserAccounts,
  resetUserPasswordToDefault,
  saveLoginFormConfig,
  updateUserAccount,
} from '../utils/storage';
import { createPasswordRecord } from '../utils/security';

interface UserManagementViewProps {
  currentUserRole: UserRole;
  onRefreshSession?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUserRole,
  onRefreshSession,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(getUserAccounts);
  const [loginAudits, setLoginAudits] = useState<LoginAuditRecord[]>(getLoginAudits);
  const [loginConfig, setLoginConfig] = useState<LoginFormConfig>(getLoginFormConfig);

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'audits' | 'login_config'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetSuccessModalOpen, setIsResetSuccessModalOpen] = useState(false);
  const [resetModalData, setResetModalData] = useState<{ user: UserAccount; tempPin: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit user form state
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [editCreditAuth, setEditCreditAuth] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [newCreditAuth, setNewCreditAuth] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [useDefaultMobilePin, setUseDefaultMobilePin] = useState(true);

  const refreshData = () => {
    setUsers(getUserAccounts());
    setLoginAudits(getLoginAudits());
    setLoginConfig(getLoginFormConfig());
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.trim().replace(/[\s-]/g, '');
    const cleanUsername = newUsername.trim().toLowerCase();

    if (!cleanPhone) {
      showNotification('error', 'Phone number is required');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      showNotification('error', `Username '${cleanUsername}' is already taken.`);
      return;
    }

    let initialPin = customPassword.trim();
    if (useDefaultMobilePin || !initialPin) {
      const digits = cleanPhone.replace(/\D/g, '');
      initialPin = digits.length >= 6 ? digits.slice(-6) : digits.padEnd(6, '0');
    }

    const passRecord = await createPasswordRecord(initialPin);

    const isSellerRole = newRole === 'super_admin' || newRole === 'admin' || newRole === 'manager' || newRole === 'staff';
    const allowCredit = newRole === 'super_admin' || newRole === 'admin' || (isSellerRole && newCreditAuth);

    const created = createUserAccount({
      username: cleanUsername,
      fullName: newFullName.trim() || `User ${cleanUsername}`,
      phone: cleanPhone,
      email: newEmail.trim() || undefined,
      role: newRole,
      status: 'active',
      canAuthorizeCreditSale: allowCredit,
      passwordHash: passRecord.hash,
      passwordSalt: passRecord.salt,
      mustChangePassword: true,
      isTemporaryPassword: true,
      suggestedDefaultPin: initialPin,
    });

    setIsCreateModalOpen(false);
    setNewUsername('');
    setNewFullName('');
    setNewPhone('');
    setNewEmail('');
    setNewCreditAuth(false);
    setCustomPassword('');
    refreshData();

    setResetModalData({ user: created, tempPin: initialPin });
    setIsResetSuccessModalOpen(true);
  };

  // Handle Admin Reset Password to Default Mobile PIN
  const handleResetPassword = (user: UserAccount) => {
    if (user.role === 'super_admin') {
      showNotification(
        'error',
        'Super Admin does not use a suggested default PIN. Change Master PIN securely inside My Account or Settings.'
      );
      return;
    }
    const result = resetUserPasswordToDefault(user.id);
    refreshData();
    if (result.account) {
      setResetModalData({ user: result.account, tempPin: result.tempPin });
      setIsResetSuccessModalOpen(true);
    }
  };

  // Open Edit User Modal
  const openEditUserModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditPhone(user.phone);
    setEditEmail(user.email || '');
    setEditRole(user.role);
    setEditCreditAuth(Boolean(user.canAuthorizeCreditSale ?? user.managerAuthorities?.canAuthorizeCreditSale));
  };

  // Save Edited User Details
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const cleanPhone = editPhone.trim().replace(/[\s-]/g, '');
    const cleanUsername = editUsername.trim().toLowerCase();

    if (!cleanPhone || !editFullName.trim() || !cleanUsername) {
      showNotification('error', 'Full name, username, and phone number are required.');
      return;
    }

    if (
      users.some(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername
      )
    ) {
      showNotification('error', `Username '${cleanUsername}' is already used by another account.`);
      return;
    }

    const effectiveRole = editingUser.role === 'super_admin' ? 'super_admin' : editRole;
    const allowCredit =
      effectiveRole === 'super_admin' ||
      effectiveRole === 'admin' ||
      ((effectiveRole === 'manager' || effectiveRole === 'staff') && editCreditAuth);

    updateUserAccount(editingUser.id, {
      fullName: editFullName.trim(),
      username: cleanUsername,
      phone: cleanPhone,
      email: editEmail.trim() || undefined,
      role: effectiveRole,
      canAuthorizeCreditSale: allowCredit,
      managerAuthorities: editingUser.managerAuthorities
        ? { ...editingUser.managerAuthorities, canAuthorizeCreditSale: allowCredit }
        : undefined,
    });

    setEditingUser(null);
    refreshData();
    if (onRefreshSession) onRefreshSession();
    showNotification('success', `User '${editFullName.trim()}' updated successfully.`);
  };

  // Handle Toggle User Status
  const handleToggleStatus = (user: UserAccount) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    updateUserAccount(user.id, { status: newStatus });
    refreshData();
    showNotification('success', `User '${user.fullName}' status changed to ${newStatus}.`);
  };

  // Handle Toggle Seller Credit Sale Authorization
  const handleToggleCreditAuth = (user: UserAccount) => {
    if (user.role !== 'manager' && user.role !== 'staff') return;
    const currentVal = Boolean(user.canAuthorizeCreditSale ?? user.managerAuthorities?.canAuthorizeCreditSale);
    const nextVal = !currentVal;
    updateUserAccount(user.id, {
      canAuthorizeCreditSale: nextVal,
      managerAuthorities: user.managerAuthorities
        ? { ...user.managerAuthorities, canAuthorizeCreditSale: nextVal }
        : undefined,
    });
    refreshData();
    showNotification(
      'success',
      `Credit Sale permission for '${user.fullName}' (${user.role}) ${nextVal ? 'ENABLED' : 'REVOKED'}.`
    );
  };

  // Handle Save Login Config
  const handleSaveLoginConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveLoginFormConfig(loginConfig);
    refreshData();
    showNotification('success', 'Login form customization saved successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                User Management &amp; Security Controls
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سینٹرل ایڈمنسٹریشن، رولز اسائنمنٹ، پاس ورڈ ری سیٹ اور لاگ ان آڈٹ ٹریل
              </p>
            </div>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'users'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Users ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('audits')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'audits'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-500" />
              <span>Login Audits ({loginAudits.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('login_config')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'login_config'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-500" />
              <span>Login Form Config</span>
            </button>
          </div>
        </div>

        {/* Global Notification */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* 1. USERS LIST SUB-TAB */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, username, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
                <option value="investor">Investor</option>
                <option value="reseller">Reseller</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer hidden sm:inline-block"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">User &amp; Username</th>
                    <th className="py-3 px-4">Contact &amp; Phone</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Security Flag</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{user.fullName}</div>
                          <div className="text-[11px] font-mono text-slate-400">@{user.username}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-700 dark:text-slate-300">{user.phone}</div>
                          {user.email && <div className="text-[11px] text-slate-400">{user.email}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'super_admin'
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                                  : user.role === 'admin'
                                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : user.role === 'investor'
                                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300'
                                  : user.role === 'staff'
                                  ? 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300'
                                  : user.role === 'reseller'
                                  ? 'bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {user.role.replace('_', ' ')}
                            </span>
                            {(user.role === 'super_admin' || user.role === 'admin') && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Credit Auth
                              </span>
                            )}
                            {(user.role === 'manager' || user.role === 'staff') && (
                              <button
                                type="button"
                                onClick={() => handleToggleCreditAuth(user)}
                                title="Click to grant or revoke Seller Credit Sale permission"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border transition-colors ${
                                  user.canAuthorizeCreditSale || user.managerAuthorities?.canAuthorizeCreditSale
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:border-amber-400'
                                }`}
                              >
                                {user.canAuthorizeCreditSale || user.managerAuthorities?.canAuthorizeCreditSale
                                  ? '✓ Credit Seller'
                                  : '✗ No Credit'}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              user.status === 'active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            {user.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {user.mustChangePassword ? (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Temp PIN (Must Change)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Private Password Set
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                          {user.loginCount !== undefined && (
                            <span className="block text-[10px] text-slate-400">({user.loginCount} logins)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit User Button */}
                            <button
                              type="button"
                              onClick={() => openEditUserModal(user)}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                              title="Edit user info"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {/* Reset Password Button (Disabled/omitted for Super Admin so no suggested default PIN exists) */}
                            {user.role !== 'super_admin' && (
                              <button
                                type="button"
                                onClick={() => handleResetPassword(user)}
                                className="px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 rounded border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer flex items-center gap-1"
                                title="Reset to temporary default PIN (last 6 digits of mobile)"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset PIN</span>
                              </button>
                            )}

                            {/* Toggle Active / Suspended */}
                            {user.role !== 'super_admin' && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  user.status === 'active'
                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                                title={user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                              >
                                {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOGIN AUDITS SUB-TAB */}
      {activeSubTab === 'audits' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Authentication &amp; Login Audit Trail
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                مکمل سیکیورٹی لاگز، موبائل نمبرز اور لاگ ان ہسٹری (صرف ایڈمنسٹریٹر کے لیے محفوظ)
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Total {loginAudits.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Mobile / ID</th>
                  <th className="py-3 px-4">Role Assigned</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Device / IP</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loginAudits.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {log.phone}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {log.role}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                      {log.ipOrDevice || 'Web Applet'}
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LOGIN FORM CONFIGURATION SUB-TAB */}
      {activeSubTab === 'login_config' && (
        <form onSubmit={handleSaveLoginConfig} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              Configurable Login Form Options
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize the public login screen title, description, allowed identifiers, and recovery options.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Form Title:
              </label>
              <input
                type="text"
                value={loginConfig.title}
                onChange={(e) => setLoginConfig({ ...loginConfig, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Support Helpline / WhatsApp:
              </label>
              <input
                type="text"
                value={loginConfig.supportContactNumber}
                onChange={(e) => setLoginConfig({ ...loginConfig, supportContactNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Form Description &amp; Subtitle:
            </label>
            <input
              type="text"
              value={loginConfig.description}
              onChange={(e) => setLoginConfig({ ...loginConfig, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Login Instructions &amp; Default PIN Guidance:
            </label>
            <textarea
              rows={3}
              value={loginConfig.loginInstructions}
              onChange={(e) => setLoginConfig({ ...loginConfig, loginInstructions: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>

          {/* Toggle Switches */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Enabled Identifier &amp; UI Controls</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.allowMobileLogin}
                  onChange={(e) => setLoginConfig({ ...loginConfig, allowMobileLogin: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Allow Login with Mobile Number</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.allowUsernameLogin}
                  onChange={(e) => setLoginConfig({ ...loginConfig, allowUsernameLogin: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Allow Login with Username / Handle</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.showPasswordVisibilityToggle}
                  onChange={(e) => setLoginConfig({ ...loginConfig, showPasswordVisibilityToggle: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Show Password Visibility Toggle (Eye icon)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.showRememberMe}
                  onChange={(e) => setLoginConfig({ ...loginConfig, showRememberMe: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Show "Remember Me" Option</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.showForgotPasswordLink}
                  onChange={(e) => setLoginConfig({ ...loginConfig, showForgotPasswordLink: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Show "Forgot Password" Recovery Link</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={loginConfig.allowSelfRegistration}
                  onChange={(e) => setLoginConfig({ ...loginConfig, allowSelfRegistration: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200">Allow Customer Instant Registration</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Login Form Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight leading-tight">Create User Account</h3>
                  <span className="text-[11px] font-medium text-slate-800 block">نیا صارف اور سیکیورٹی کریڈینشلز بنائیں</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (پورا نام):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tariq_invest"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone (موبائل نمبر):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role (کردار / اجازت نامہ):
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    <option value="customer">Customer (صارف / گاہک)</option>
                    <option value="investor">Investor (انویسٹر پورٹل)</option>
                    <option value="staff">Staff (کاؤنٹر و کیش)</option>
                    <option value="manager">Manager (سٹور مینیجر)</option>
                    <option value="reseller">Reseller (آن لائن ری سیلر)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email (اختیاری):
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {(newRole === 'manager' || newRole === 'staff') && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newCreditAuth}
                      onChange={(e) => setNewCreditAuth(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Authorize Seller Credit Sales (صرف مجاز سیلرز کو ادھار فروخت کی اجازت)
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                  <input
                    type="checkbox"
                    checked={useDefaultMobilePin}
                    onChange={(e) => setUseDefaultMobilePin(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Use last 6 digits of mobile number as default temporary PIN (Recommended)
                  </span>
                </label>

                {!useDefaultMobilePin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Set Custom Temporary PIN:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 580987"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPORARY DEFAULT PIN ISSUED MODAL */}
      {isResetSuccessModalOpen && resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-4 text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Temporary Default Password Generated
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                عارضی ڈیفالٹ پاس ورڈ کامیابی سے جاری کر دیا گیا ہے۔
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Account:</span>
                <span className="font-bold text-slate-900 dark:text-white">{resetModalData.user.fullName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="font-mono text-slate-900 dark:text-white">{resetModalData.user.phone}</span>
              </div>
              <div className="flex justify-between text-xs items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-amber-600 dark:text-amber-400">Temporary PIN (Last 6 Digits):</span>
                <span className="font-mono text-base font-black tracking-widest text-slate-900 dark:text-white bg-[#FFD200]/30 px-2 py-0.5 rounded">
                  {resetModalData.tempPin}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
              ⚠️ <strong>Mandatory Security Notice:</strong> This credential is a temporary recovery suggestion only. The user will be required to establish a new private password immediately upon their next login.
            </p>

            <button
              type="button"
              onClick={() => {
                setIsResetSuccessModalOpen(false);
                setResetModalData(null);
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Acknowledge &amp; Close / سمجھ آ گئی
            </button>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <div>
                  <h3 className="text-base font-black tracking-tight leading-tight">
                    Edit User Account ({editingUser.role.replace('_', ' ').toUpperCase()})
                  </h3>
                  <span className="text-[11px] font-medium text-slate-800 block">
                    صارف کی تفصیلات اور اجازتیں اپ ڈیٹ کریں
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username:
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone:
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role:
                  </label>
                  <select
                    value={editRole}
                    disabled={editingUser.role === 'super_admin'}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    {editingUser.role === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                    <option value="customer">Customer</option>
                    <option value="investor">Investor</option>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="reseller">Reseller</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {(editRole === 'manager' || editRole === 'staff') && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editCreditAuth}
                      onChange={(e) => setEditCreditAuth(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Authorize Seller Credit Sales
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
