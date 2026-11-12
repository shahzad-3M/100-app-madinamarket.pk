import React, { useState } from 'react';
import {
  Building2,
  Users,
  Plus,
  Shield,
  Edit,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Check,
  X,
  Lock,
  RotateCcw,
  Sliders,
  Calendar,
  Sparkles,
  CreditCard,
  Briefcase,
  Store,
} from 'lucide-react';
import {
  Branch,
  UserAccount,
  SalespersonReferral,
  CommissionRecord,
  WalkInSale,
  ManagerAuthorities,
  UserRole,
  AppUser,
} from '../types';
import {
  getBranches,
  saveBranches,
  getUserAccounts,
  saveUserAccounts,
  createUserAccount,
  updateUserAccount,
  resetUserPasswordToDefault,
  getSalespersonReferrals,
  saveSalespersonReferrals,
  getCommissionRecords,
  saveCommissionRecords,
  getWalkInSales,
  calculateSalespersonCommission,
} from '../utils/storage';
import { createPasswordRecord } from '../utils/security';

interface BranchManagementViewProps {
  currentUserRole: UserRole;
  currentUser?: AppUser;
  onRefreshSession?: () => void;
  onOpenWalkInTerminal?: (branchId?: string) => void;
}

export const BranchManagementView: React.FC<BranchManagementViewProps> = ({
  currentUserRole,
  currentUser,
  onRefreshSession,
  onOpenWalkInTerminal,
}) => {
  const [branches, setBranches] = useState<Branch[]>(getBranches);
  const [users, setUsers] = useState<UserAccount[]>(getUserAccounts);
  const [referrals, setReferrals] = useState<SalespersonReferral[]>(getSalespersonReferrals);
  const [commissions, setCommissions] = useState<CommissionRecord[]>(getCommissionRecords);
  const [walkInSales, setWalkInSales] = useState<WalkInSale[]>(getWalkInSales);

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<'branches' | 'managers' | 'referrals' | 'commissions' | 'overview'>('branches');

  // Selected Branch Filter for Consolidation
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Branch Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<Branch>>({
    name: '',
    code: '',
    address: '',
    contactNumber: '',
    remarks: '',
    status: 'active',
  });

  // Manager Edit & Authorities Modal
  const [isAuthoritiesModalOpen, setIsAuthoritiesModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<UserAccount | null>(null);
  const [managerAuthoritiesForm, setManagerAuthoritiesForm] = useState<ManagerAuthorities>({
    canRegisterWalkIn: true,
    canEnterSales: true,
    canViewStock: true,
    canManageStock: false,
    canRecordPayment: true,
    canRecordCash: true,
    canManageOrders: true,
    canManageCustomers: true,
    canAssignReferral: true,
    canTrackReferrals: true,
    canViewReports: true,
    canViewHistory: true,
    canAuthorizeDiscount: true,
    maxDiscountPercent: 10,
  });

  // Create Manager Modal
  const [isCreateManagerModalOpen, setIsCreateManagerModalOpen] = useState(false);
  const [newManagerForm, setNewManagerForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    branchId: '',
    password: '',
  });

  // Salesperson Referral Modal
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [newReferralForm, setNewReferralForm] = useState({
    code: '',
    salespersonName: '',
    phone: '',
    branchId: '',
  });

  // Payout Commission Modal
  const [payoutTarget, setPayoutTarget] = useState<CommissionRecord | null>(null);
  const [payoutRef, setPayoutRef] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Check role
  const isSuperAdminOrAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  // BRANCH ACTIONS
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: `BR-00${branches.length + 1}`,
      address: '',
      contactNumber: '0312 5256 266',
      remarks: '',
      status: 'active',
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm(branch);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = () => {
    if (!branchForm.name?.trim() || !branchForm.code?.trim()) {
      alert('Branch Name and Code are required.');
      return;
    }

    let updated: Branch[];
    if (editingBranch) {
      updated = branches.map((b) =>
        b.id === editingBranch.id
          ? {
              ...b,
              ...branchForm,
              name: branchForm.name!.trim(),
              code: branchForm.code!.trim(),
            }
          : b
      );
    } else {
      const newBranch: Branch = {
        id: `branch_${Date.now()}`,
        name: branchForm.name!.trim(),
        code: branchForm.code!.trim(),
        address: branchForm.address?.trim() || '',
        contactNumber: branchForm.contactNumber?.trim() || '0312 5256 266',
        status: branchForm.status || 'active',
        createdAt: new Date().toISOString().split('T')[0],
        remarks: branchForm.remarks?.trim() || '',
        specialAuthorities: {
          canRegisterWalkIn: true,
          canEnterSales: true,
          canViewStock: true,
          canManageStock: false,
          canRecordPayment: true,
          canRecordCash: true,
          canManageOrders: true,
          canManageCustomers: true,
          canAssignReferral: true,
          canTrackReferrals: true,
          canViewReports: true,
          canViewHistory: true,
          canAuthorizeDiscount: true,
          maxDiscountPercent: 10,
        },
      };
      updated = [...branches, newBranch];
    }

    setBranches(updated);
    saveBranches(updated);
    setIsBranchModalOpen(false);
  };

  const handleToggleBranchStatus = (branchId: string) => {
    const updated = branches.map((b) =>
      b.id === branchId ? { ...b, status: b.status === 'active' ? ('inactive' as const) : ('active' as const) } : b
    );
    setBranches(updated);
    saveBranches(updated);
  };

  // STORE MANAGER ACTIONS
  const handleOpenAuthoritiesModal = (manager: UserAccount) => {
    setSelectedManager(manager);
    const existing = manager.managerAuthorities || {
      canRegisterWalkIn: true,
      canEnterSales: true,
      canViewStock: true,
      canManageStock: false,
      canRecordPayment: true,
      canRecordCash: true,
      canManageOrders: true,
      canManageCustomers: true,
      canAssignReferral: true,
      canTrackReferrals: true,
      canViewReports: true,
      canViewHistory: true,
      canAuthorizeDiscount: true,
      maxDiscountPercent: 10,
    };
    setManagerAuthoritiesForm(existing);
    setIsAuthoritiesModalOpen(true);
  };

  const handleSaveManagerAuthorities = () => {
    if (!selectedManager) return;
    const updated = updateUserAccount(selectedManager.id, {
      managerAuthorities: managerAuthoritiesForm,
    });
    setUsers(updated);
    setIsAuthoritiesModalOpen(false);
    alert(`Updated special authorities for manager ${selectedManager.fullName}.`);
  };

  const handleAssignManagerBranch = (managerId: string, branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    const manager = users.find((u) => u.id === managerId);
    if (!manager) return;

    // Update user account
    const updatedUsers = updateUserAccount(managerId, {
      linkedBranchId: branchId || undefined,
      linkedBranchName: branch ? branch.name : undefined,
    });
    setUsers(updatedUsers);

    // Update branch assigned manager
    if (branchId) {
      const updatedBranches = branches.map((b) =>
        b.id === branchId
          ? {
              ...b,
              assignedManagerId: managerId,
              assignedManagerName: manager.fullName,
            }
          : b
      );
      setBranches(updatedBranches);
      saveBranches(updatedBranches);
    }
  };

  const handleCreateManager = async () => {
    if (!newManagerForm.username.trim() || !newManagerForm.fullName.trim() || !newManagerForm.phone.trim()) {
      alert('Username, Full Name, and Mobile Number are required.');
      return;
    }

    const assignedBranch = branches.find((b) => b.id === newManagerForm.branchId);
    const plainPin = newManagerForm.password.trim() || newManagerForm.phone.replace(/\D/g, '').slice(-6) || '123456';
    const pwdRecord = await createPasswordRecord(plainPin);

    const created = createUserAccount({
      username: newManagerForm.username.trim(),
      fullName: newManagerForm.fullName.trim(),
      phone: newManagerForm.phone.trim(),
      email: newManagerForm.email.trim() || undefined,
      role: 'manager',
      status: 'active',
      passwordHash: pwdRecord.hash,
      passwordSalt: pwdRecord.salt,
      suggestedDefaultPin: plainPin,
      mustChangePassword: true,
      linkedBranchId: assignedBranch?.id,
      linkedBranchName: assignedBranch?.name,
      managerAuthorities: {
        canRegisterWalkIn: true,
        canEnterSales: true,
        canViewStock: true,
        canManageStock: false,
        canRecordPayment: true,
        canRecordCash: true,
        canManageOrders: true,
        canManageCustomers: true,
        canAssignReferral: true,
        canTrackReferrals: true,
        canViewReports: true,
        canViewHistory: true,
        canAuthorizeDiscount: true,
        maxDiscountPercent: 10,
      },
    });

    if (created) {
      if (assignedBranch) {
        const updatedBranches = branches.map((b) =>
          b.id === assignedBranch.id
            ? {
                ...b,
                assignedManagerId: created.id,
                assignedManagerName: created.fullName,
              }
            : b
        );
        setBranches(updatedBranches);
        saveBranches(updatedBranches);
      }
      setUsers(getUserAccounts());
      setIsCreateManagerModalOpen(false);
      setNewManagerForm({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        branchId: '',
        password: '',
      });
      alert(`Store Manager account created successfully! Temporary PIN: ${plainPin}`);
    } else {
      alert('Username or phone already taken.');
    }
  };

  // SALESPERSON REFERRAL ACTIONS
  const handleCreateReferralCode = () => {
    if (!newReferralForm.code.trim() || !newReferralForm.salespersonName.trim()) {
      alert('Referral Code and Salesperson Name are required.');
      return;
    }

    const branch = branches.find((b) => b.id === newReferralForm.branchId);
    const newRef: SalespersonReferral = {
      id: `sp_${Date.now()}`,
      code: newReferralForm.code.trim().toUpperCase(),
      salespersonName: newReferralForm.salespersonName.trim(),
      phone: newReferralForm.phone.trim() || '0312 5256 266',
      branchId: branch?.id || branches[0]?.id || 'branch_1',
      branchName: branch?.name || branches[0]?.name || 'Main Branch',
      status: 'active',
      totalSales: 0,
      paidSales: 0,
      earnedCommission: 0,
      paidCommission: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...referrals, newRef];
    setReferrals(updated);
    saveSalespersonReferrals(updated);
    setIsReferralModalOpen(false);
    setNewReferralForm({
      code: '',
      salespersonName: '',
      phone: '',
      branchId: '',
    });
  };

  const handleToggleReferralStatus = (id: string) => {
    const updated = referrals.map((r) =>
      r.id === id ? { ...r, status: r.status === 'active' ? ('inactive' as const) : ('active' as const) } : r
    );
    setReferrals(updated);
    saveSalespersonReferrals(updated);
  };

  // SETTLE COMMISSION
  const handleSettleCommission = () => {
    if (!payoutTarget || !payoutRef.trim()) {
      alert('Please provide a settlement reference or bank voucher ID.');
      return;
    }

    const updatedComms = commissions.map((c) =>
      c.id === payoutTarget.id
        ? {
            ...c,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
            settlementReference: payoutRef.trim(),
          }
        : c
    );
    setCommissions(updatedComms);
    saveCommissionRecords(updatedComms);

    // Update salesperson paidCommission tally
    const sp = referrals.find((r) => r.code === payoutTarget.referralCode || r.id === payoutTarget.salespersonId);
    if (sp) {
      const updatedRefs = referrals.map((r) =>
        r.id === sp.id ? { ...r, paidCommission: r.paidCommission + payoutTarget.calculatedCommission } : r
      );
      setReferrals(updatedRefs);
      saveSalespersonReferrals(updatedRefs);
    }

    setPayoutTarget(null);
    setPayoutRef('');
    alert(`Commission of Rs. ${payoutTarget.calculatedCommission.toLocaleString('en-PK')} settled successfully!`);
  };

  // FILTERED DATA BY BRANCH
  const filteredBranches = selectedBranchFilter === 'all'
    ? branches
    : branches.filter((b) => b.id === selectedBranchFilter);

  const managerAccounts = users.filter((u) => u.role === 'manager');

  const filteredManagers = selectedBranchFilter === 'all'
    ? managerAccounts
    : managerAccounts.filter((m) => m.linkedBranchId === selectedBranchFilter);

  const filteredWalkInSales = selectedBranchFilter === 'all'
    ? walkInSales
    : walkInSales.filter((s) => s.branchId === selectedBranchFilter);

  const filteredReferrals = selectedBranchFilter === 'all'
    ? referrals
    : referrals.filter((r) => r.branchId === selectedBranchFilter);

  const filteredCommissions = selectedBranchFilter === 'all'
    ? commissions
    : commissions.filter((c) => c.branchId === selectedBranchFilter);

  // CONSOLIDATED OVERVIEW STATS
  const totalWalkInRevenue = filteredWalkInSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesCount = filteredWalkInSales.length;
  const totalEarnedCommissions = filteredCommissions.reduce((acc, c) => acc + c.calculatedCommission, 0);
  const totalPendingCommissions = filteredCommissions
    .filter((c) => c.status === 'pending')
    .reduce((acc, c) => acc + c.calculatedCommission, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  STORE MANAGERS &amp; BRANCH MANAGEMENT
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {branches.length} Branches Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-branch operations, store manager assignments, specialized authorities, and walk-in referral commissions.
              </p>
            </div>
          </div>

          {/* Action Buttons & Branch Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            {onOpenWalkInTerminal && (
              <button
                type="button"
                onClick={() => onOpenWalkInTerminal(selectedBranchFilter !== 'all' ? selectedBranchFilter : undefined)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Receipt className="w-4 h-4" />
                Walk-in POS Terminal
              </button>
            )}

            {isSuperAdminOrAdmin && (
              <button
                type="button"
                onClick={handleOpenAddBranch}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Add New Branch
              </button>
            )}
          </div>
        </div>

        {/* SUB-TABS */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800 mt-5 pt-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'branches'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Branches ({branches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('managers')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'managers'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Store Managers &amp; Authorities ({managerAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'referrals'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Salesperson Referral Codes ({referrals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commissions')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'commissions'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Commissions Ledger ({commissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Consolidated Branch Overview
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: BRANCHES CONFIGURATION */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredBranches.map((branch) => {
              const manager = users.find((u) => u.id === branch.assignedManagerId);
              const branchSalesCount = walkInSales.filter((s) => s.branchId === branch.id).length;
              const branchSalesAmount = walkInSales
                .filter((s) => s.branchId === branch.id)
                .reduce((acc, s) => acc + s.totalAmount, 0);

              return (
                <div
                  key={branch.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {branch.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          branch.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {branch.status === 'active' ? 'Active Branch' : 'Inactive'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {branch.name}
                    </h3>

                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{branch.address}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{branch.contactNumber}</span>
                      </p>
                    </div>

                    {/* Assigned Store Manager Badge */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">
                        Assigned Store Manager
                      </span>
                      {manager ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {manager.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {manager.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">
                          No Manager Assigned
                        </span>
                      )}
                    </div>

                    {branch.remarks && (
                      <p className="text-[11px] text-slate-400 italic">"{branch.remarks}"</p>
                    )}
                  </div>

                  {/* Branch Metrics & Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Walk-in Sales</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        Rs. {branchSalesAmount.toLocaleString('en-PK')} ({branchSalesCount})
                      </span>
                    </div>

                    {isSuperAdminOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBranch(branch)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit branch details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBranchStatus(branch.id)}
                          className={`text-[11px] px-2 py-1 rounded font-bold cursor-pointer ${
                            branch.status === 'active'
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {branch.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: STORE MANAGERS & SPECIAL AUTHORITIES */}
      {activeTab === 'managers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                Store Manager Accounts &amp; Individual Branch Authorities
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each manager has unique login credentials and individually toggled permissions (Walk-in sales, discounts, stock, cash).
              </p>
            </div>

            {isSuperAdminOrAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateManagerModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Create Manager Account
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Manager Name &amp; Phone</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Assigned Branch</th>
                  <th className="p-3">Special Authorities</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredManagers.map((manager) => {
                  const auths = manager.managerAuthorities;

                  return (
                    <tr key={manager.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {manager.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {manager.phone}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        @{manager.username}
                      </td>

                      <td className="p-3">
                        <select
                          value={manager.linkedBranchId || ''}
                          disabled={!isSuperAdminOrAdmin}
                          onChange={(e) => handleAssignManagerBranch(manager.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">Unassigned</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code} - {b.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {auths?.canEnterSales && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-bold">
                              Walk-in POS
                            </span>
                          )}
                          {auths?.canAuthorizeDiscount && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold">
                              Max {auths.maxDiscountPercent || 10}% Disc
                            </span>
                          )}
                          {auths?.canRecordCash && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded text-[10px] font-bold">
                              Cash Ledger
                            </span>
                          )}
                          {auths?.canManageStock && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded text-[10px] font-bold">
                              Stock Edit
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            manager.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {manager.status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAuthoritiesModal(manager)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-bold cursor-pointer text-xs flex items-center gap-1"
                            title="Configure special authorities"
                          >
                            <Shield className="w-3 h-3 text-amber-500" />
                            Authorities
                          </button>

                          {isSuperAdminOrAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPin = prompt(
                                  `Reset manager PIN for ${manager.fullName}. Default suggested: last 6 digits of mobile (${manager.phone.replace(/\D/g, '').slice(-6)})`,
                                  manager.phone.replace(/\D/g, '').slice(-6)
                                );
                                if (newPin) {
                                  resetUserPasswordToDefault(manager.id, newPin);
                                  setUsers(getUserAccounts());
                                  alert(`Password reset for ${manager.fullName} to: ${newPin}`);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              title="Reset Password"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: SALESPERSON REFERRAL CODES & COMMISSION FORMULA */}
      {activeTab === 'referrals' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Salesperson Referral Code Management
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula strictly matches reseller rule: <strong>PKR 30 commission per PKR 1,000 qualifying sales</strong>.
              </p>
            </div>

            {isSuperAdminOrAdmin && (
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Create Referral Code
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Referral Code</th>
                  <th className="p-3">Salesperson</th>
                  <th className="p-3">Assigned Branch</th>
                  <th className="p-3">Total Sales</th>
                  <th className="p-3">Earned Commission</th>
                  <th className="p-3">Settled / Paid</th>
                  <th className="p-3">Pending Balance</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReferrals.map((ref) => {
                  const pending = Math.max(0, ref.earnedCommission - ref.paidCommission);

                  return (
                    <tr key={ref.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {ref.code}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {ref.salespersonName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{ref.phone}</div>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {ref.branchName}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        Rs. {ref.totalSales.toLocaleString('en-PK')}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {ref.earnedCommission.toLocaleString('en-PK')}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        Rs. {ref.paidCommission.toLocaleString('en-PK')}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600">
                        Rs. {pending.toLocaleString('en-PK')}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleReferralStatus(ref.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                            ref.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ref.status}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: COMMISSIONS LEDGER */}
      {activeTab === 'commissions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Salesperson Commission Ledger &amp; Disbursement History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanent record of every walk-in and online referral sale with auto-calculated commission.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Receipt / Ref</th>
                  <th className="p-3">Referral Code</th>
                  <th className="p-3">Salesperson</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Sale Amount</th>
                  <th className="p-3">Commission (Rs. 30/1k)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(comm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {comm.receiptNumber || comm.transactionId}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-600">
                      {comm.referralCode}
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">
                      {comm.salespersonName}
                    </td>
                    <td className="p-3 text-slate-500">{comm.branchName}</td>
                    <td className="p-3 font-mono font-bold">
                      Rs. {comm.eligibleSalesAmount.toLocaleString('en-PK')}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {comm.calculatedCommission.toLocaleString('en-PK')}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          comm.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {comm.status === 'paid' ? 'Settled' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {comm.status === 'pending' && isSuperAdminOrAdmin && (
                        <button
                          type="button"
                          onClick={() => setPayoutTarget(comm)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs"
                        >
                          Disburse
                        </button>
                      )}
                      {comm.status === 'paid' && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ref: {comm.settlementReference}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: CONSOLIDATED BRANCH OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 block">Total Walk-in Sales Volume</span>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                Rs. {totalWalkInRevenue.toLocaleString('en-PK')}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                {totalSalesCount} counter invoices issued
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 block">Active Operating Branches</span>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {branches.filter((b) => b.status === 'active').length} / {branches.length}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Expandable multi-branch network
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 block">Store Managers Assigned</span>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {managerAccounts.filter((m) => m.linkedBranchId).length} Managers
              </p>
              <span className="text-[10px] text-blue-600 font-bold mt-1 block">
                Independent authorities enabled
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 block">Salesperson Commissions</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                Rs. {totalEarnedCommissions.toLocaleString('en-PK')}
              </p>
              <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                Rs. {totalPendingCommissions.toLocaleString('en-PK')} pending settlement
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                {editingBranch ? 'Edit Branch Record' : 'Configure New Branch'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={branchForm.name || ''}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Faisalabad Wholesale Hub"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Branch Code (Unique)
                </label>
                <input
                  type="text"
                  value={branchForm.code || ''}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BR-FSD-04"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Branch Address
                </label>
                <input
                  type="text"
                  value={branchForm.address || ''}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="e.g. Main Clock Tower Market, Faisalabad"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={branchForm.contactNumber || ''}
                  onChange={(e) => setBranchForm({ ...branchForm, contactNumber: e.target.value })}
                  placeholder="0312 5256 266"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Operational Remarks
                </label>
                <textarea
                  rows={2}
                  value={branchForm.remarks || ''}
                  onChange={(e) => setBranchForm({ ...branchForm, remarks: e.target.value })}
                  placeholder="e.g. Regional distribution and retail sales center."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBranch}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-xs"
              >
                Save Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE SPECIAL MANAGER AUTHORITIES */}
      {isAuthoritiesModalOpen && selectedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Special Authorities: {selectedManager.fullName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Branch: {selectedManager.linkedBranchName || 'Unassigned'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthoritiesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Configurable Permissions Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canRegisterWalkIn}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canRegisterWalkIn: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Walk-in Customer Registration</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canEnterSales}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canEnterSales: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Walk-in Sales Entry (POS)</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canViewStock}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canViewStock: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Product Selection &amp; Stock View</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canManageStock}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canManageStock: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Stock Management &amp; Adjustment</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canRecordPayment}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canRecordPayment: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Digital Payment Recording</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canRecordCash}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canRecordCash: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Cash Counter Transaction Entry</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canAssignReferral}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canAssignReferral: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Referral Code Assignment</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canTrackReferrals}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canTrackReferrals: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Salesperson Referral Tracking</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canViewReports}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canViewReports: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Branch-wise Reports View</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canViewHistory}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canViewHistory: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Branch Transaction History</span>
              </label>
            </div>

            {/* Discount Authorization Setting */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2 text-xs">
              <label className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managerAuthoritiesForm.canAuthorizeDiscount}
                  onChange={(e) =>
                    setManagerAuthoritiesForm({
                      ...managerAuthoritiesForm,
                      canAuthorizeDiscount: e.target.checked,
                    })
                  }
                  className="rounded text-amber-500"
                />
                <span>Discount Authorization Permitted</span>
              </label>
              {managerAuthoritiesForm.canAuthorizeDiscount && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-600 dark:text-slate-400">Maximum Discount Allowed:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={managerAuthoritiesForm.maxDiscountPercent || 10}
                    onChange={(e) =>
                      setManagerAuthoritiesForm({
                        ...managerAuthoritiesForm,
                        maxDiscountPercent: parseInt(e.target.value, 10) || 10,
                      })
                    }
                    className="w-16 px-2 py-1 text-xs border border-amber-300 dark:border-amber-700 rounded bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <span>%</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAuthoritiesModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManagerAuthorities}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
              >
                Save Authorities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MANAGER ACCOUNT */}
      {isCreateManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                Create Store Manager Account
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateManagerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  value={newManagerForm.fullName}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, fullName: e.target.value })}
                  placeholder="e.g. Asad Ullah"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Login Username (Unique)
                </label>
                <input
                  type="text"
                  value={newManagerForm.username}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, username: e.target.value })}
                  placeholder="e.g. manager_lahore_central"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Mobile Number (Required for recovery)
                </label>
                <input
                  type="text"
                  value={newManagerForm.phone}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, phone: e.target.value })}
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Assign to Branch
                </label>
                <select
                  value={newManagerForm.branchId}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">Select Branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Temporary PIN (Leave blank for last 6 digits of mobile)
                </label>
                <input
                  type="password"
                  value={newManagerForm.password}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, password: e.target.value })}
                  placeholder="******"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateManagerModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManager}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
              >
                Create Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE REFERRAL CODE */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Create Salesperson Referral Code
              </h3>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Referral Code (Unique)
                </label>
                <input
                  type="text"
                  value={newReferralForm.code}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SP-SHAHALAM-04"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Salesperson Full Name
                </label>
                <input
                  type="text"
                  value={newReferralForm.salespersonName}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, salespersonName: e.target.value })}
                  placeholder="e.g. Usman Ghani"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Salesperson Contact Number
                </label>
                <input
                  type="text"
                  value={newReferralForm.phone}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, phone: e.target.value })}
                  placeholder="0321 4455667"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Assign to Branch
                </label>
                <select
                  value={newReferralForm.branchId}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">Select Branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateReferralCode}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
              >
                Save Referral Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE COMMISSION PAYOUT */}
      {payoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Disburse Commission Payout
              </h3>
              <button type="button" onClick={() => setPayoutTarget(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <p>
                <strong>Salesperson:</strong> {payoutTarget.salespersonName} ({payoutTarget.referralCode})
              </p>
              <p>
                <strong>Order Reference:</strong> {payoutTarget.receiptNumber || payoutTarget.transactionId}
              </p>
              <p>
                <strong>Commission Amount:</strong>{' '}
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  Rs. {payoutTarget.calculatedCommission.toLocaleString('en-PK')}
                </span>
              </p>
            </div>

            <div>
              <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                Settlement Reference / Voucher Number
              </label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="e.g. CASH-PAID-01 or TRX-88219"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleCommission}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
