import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Calendar,
  Layers,
  Phone,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  Search,
  Percent,
  X,
  CreditCard,
  Send,
} from 'lucide-react';
import {
  AppUser,
  BusinessProfile,
  Investor,
  InvestorTransaction,
  PaymentMode,
  ProductItem,
  UserRole,
} from '../types';
import {
  getInvestors,
  getInvestorTransactions,
  saveInvestors,
  saveInvestorTransactions,
} from '../utils/storage';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface InvestorManagementViewProps {
  currentUser: AppUser;
  userRole: UserRole;
  products: ProductItem[];
  profile: BusinessProfile;
}

export const InvestorManagementView: React.FC<InvestorManagementViewProps> = ({
  currentUser,
  userRole,
  products,
  profile,
}) => {
  const [investors, setInvestors] = useState<Investor[]>(getInvestors);
  const [transactions, setTransactions] = useState<InvestorTransaction[]>(getInvestorTransactions);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const currentInvestor = investors.find(
    (inv) =>
      inv.id === currentUser.investorId ||
      inv.phone.replace(/[\s-]/g, '') === currentUser.phone?.replace(/[\s-]/g, '')
  );

  // Active view for investor vs admin
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'transactions'>('overview');
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>(
    isAdmin ? (investors[0]?.id || '') : (currentInvestor?.id || '')
  );

  // Modals state
  const [isAddInvestorModalOpen, setIsAddInvestorModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New investor form
  const [newInvName, setNewInvName] = useState('');
  const [newInvPhone, setNewInvPhone] = useState('');
  const [newInvWhatsapp, setNewInvWhatsapp] = useState('');
  const [newInvCapital, setNewInvCapital] = useState<number>(100000);
  const [newInvShareType, setNewInvShareType] = useState<'percentage' | 'fixed_per_unit'>('percentage');
  const [newInvShareValue, setNewInvShareValue] = useState<number>(25);

  // Record transaction form
  const [txType, setTxType] = useState<'investment_deposit' | 'profit_payout' | 'capital_withdrawal'>('profit_payout');
  const [txAmount, setTxAmount] = useState<number>(10000);
  const [txPaymentMode, setTxPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [txNotes, setTxNotes] = useState('');
  const [txRef, setTxRef] = useState('');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshData = () => {
    setInvestors(getInvestors());
    setTransactions(getInvestorTransactions());
  };

  // Determine which investor we are examining
  const activeInvestor = isAdmin
    ? investors.find((inv) => inv.id === selectedInvestorId) || investors[0]
    : currentInvestor;

  // Compute metrics for active investor
  const assignedProducts = products.filter((p) =>
    activeInvestor?.assignedProductIds?.includes(p.id)
  );

  const inventoryStockValue = assignedProducts.reduce(
    (sum, p) => sum + p.costPrice * p.stockQty,
    0
  );

  const totalSalesGenerated = assignedProducts.reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );

  const totalUnitsSold = assignedProducts.reduce(
    (sum, p) => sum + p.salesCount,
    0
  );

  const totalGrossProfit = assignedProducts.reduce(
    (sum, p) => sum + p.totalProfit,
    0
  );

  // Calculate Investor Profit Share
  let calculatedInvestorProfit = 0;
  if (activeInvestor) {
    if (activeInvestor.profitShareType === 'percentage') {
      calculatedInvestorProfit = Math.round(
        (totalGrossProfit * activeInvestor.profitShareValue) / 100
      );
    } else {
      calculatedInvestorProfit = totalUnitsSold * activeInvestor.profitShareValue;
    }
  }

  const settledProfit = activeInvestor?.settledProfit || 0;
  const pendingProfit = Math.max(0, calculatedInvestorProfit - settledProfit);

  const investorTxs = transactions.filter(
    (tx) => tx.investorId === activeInvestor?.id
  );

  // Handler: Add New Investor
  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim() || !newInvPhone.trim()) {
      showNotification('error', 'Name and Phone are required.');
      return;
    }

    const newInv: Investor = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newInvName.trim(),
      phone: newInvPhone.trim(),
      whatsapp: newInvWhatsapp.trim() || newInvPhone.trim(),
      totalInvestment: Number(newInvCapital) || 0,
      profitShareType: newInvShareType,
      profitShareValue: Number(newInvShareValue) || 0,
      assignedProductIds: [],
      status: 'active',
      settledProfit: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...investors, newInv];
    saveInvestors(updated);
    setInvestors(updated);
    setSelectedInvestorId(newInv.id);
    setIsAddInvestorModalOpen(false);

    // Initial deposit tx if capital > 0
    if (newInv.totalInvestment > 0) {
      const initialTx: InvestorTransaction = {
        id: `inv_tx_${Date.now()}`,
        investorId: newInv.id,
        date: new Date().toISOString().split('T')[0],
        type: 'investment_deposit',
        amount: newInv.totalInvestment,
        paymentMode: 'bank_transfer',
        notes: 'Initial Capital Injection',
        reference: `INV-CAP-${Date.now().toString().slice(-5)}`,
        createdAt: new Date().toISOString(),
      };
      const updatedTxs = [initialTx, ...transactions];
      saveInvestorTransactions(updatedTxs);
      setTransactions(updatedTxs);
    }

    showNotification('success', `Investor '${newInv.name}' registered successfully!`);
  };

  // Handler: Record Transaction
  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvestor) return;

    const newTx: InvestorTransaction = {
      id: `inv_tx_${Date.now()}`,
      investorId: activeInvestor.id,
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount: Number(txAmount) || 0,
      paymentMode: txPaymentMode,
      notes: txNotes.trim(),
      reference: txRef.trim() || `REF-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTxs = [newTx, ...transactions];
    saveInvestorTransactions(updatedTxs);
    setTransactions(updatedTxs);

    // Update settled profit or total investment if applicable
    if (txType === 'profit_payout') {
      const updatedInvestors = investors.map((inv) =>
        inv.id === activeInvestor.id
          ? { ...inv, settledProfit: (inv.settledProfit || 0) + Number(txAmount) }
          : inv
      );
      saveInvestors(updatedInvestors);
      setInvestors(updatedInvestors);
    } else if (txType === 'investment_deposit') {
      const updatedInvestors = investors.map((inv) =>
        inv.id === activeInvestor.id
          ? { ...inv, totalInvestment: (inv.totalInvestment || 0) + Number(txAmount) }
          : inv
      );
      saveInvestors(updatedInvestors);
      setInvestors(updatedInvestors);
    }

    setIsRecordTxModalOpen(false);
    setTxNotes('');
    setTxRef('');
    showNotification('success', 'Investor transaction recorded successfully!');
  };

  // Handler: Toggle Product Assignment
  const handleToggleProductAssignment = (productId: string) => {
    if (!activeInvestor) return;
    const currentList = activeInvestor.assignedProductIds || [];
    const isAssigned = currentList.includes(productId);
    const updatedList = isAssigned
      ? currentList.filter((id) => id !== productId)
      : [...currentList, productId];

    const updatedInvestors = investors.map((inv) =>
      inv.id === activeInvestor.id ? { ...inv, assignedProductIds: updatedList } : inv
    );
    saveInvestors(updatedInvestors);
    setInvestors(updatedInvestors);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isAdmin ? 'Investor Capital & Profit Management' : 'Private Investor Portfolio'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'انویسٹرز کی انویسٹمنٹ، اسٹاک شیئر اور تاریخ وار منافع کی تقسیم'
                  : 'آپ کی کل سرمایہ کاری، پراڈکٹس اسٹاک اور منافع کا محفوظ کھاتہ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Select Investor Dropdown */}
            {isAdmin && investors.length > 0 && (
              <select
                value={selectedInvestorId}
                onChange={(e) => setSelectedInvestorId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden"
              >
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({profile.currencySymbol}{inv.totalInvestment.toLocaleString('en-PK')})
                  </option>
                ))}
              </select>
            )}

            {/* Admin Add Investor */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddInvestorModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Investor</span>
              </button>
            )}

            {/* Direct WhatsApp Contact Button */}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const msg = `السلام علیکم! میں انویسٹر ${activeInvestor?.name} ہوں۔ اپنے انویسٹمنٹ پورٹ فولیو اور پرافٹ سیٹلمنٹ کے حوالے سے رہنمائی درکار ہے۔ شکریہ!`;
                  openWhatsAppDirect('03125256266', msg);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Admin</span>
              </button>
            )}
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Capital Invested */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Capital Invested</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
            {profile.currencySymbol}{activeInvestor?.totalInvestment.toLocaleString('en-PK') || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            کل سرمایہ کاری
          </span>
        </div>

        {/* Active Inventory Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400">
            {profile.currencySymbol}{inventoryStockValue.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {assignedProducts.length} پراڈکٹس اسٹاک ویلیو
          </span>
        </div>

        {/* Total Profit Earned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Profit Earned</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {profile.currencySymbol}{calculatedInvestorProfit.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Share: {activeInvestor?.profitShareValue}{activeInvestor?.profitShareType === 'percentage' ? '% Profit' : ' Rs/Unit'}
          </span>
        </div>

        {/* Pending Settlement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Payout</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {profile.currencySymbol}{pendingProfit.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Settled: {profile.currencySymbol}{settledProfit.toLocaleString('en-PK')}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Assigned Products ({assignedProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Settlement Ledger ({investorTxs.length})
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Assign Products
            </button>
            <button
              type="button"
              onClick={() => setIsRecordTxModalOpen(true)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              Record Payout / Deposit
            </button>
          </div>
        )}
      </div>

      {/* 1. ASSIGNED PRODUCTS TAB */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Funded Catalog Products &amp; Sales Velocity
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Total Units Sold: {totalUnitsSold}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Wholesale Rate</th>
                  <th className="py-3 px-4">Units Sold</th>
                  <th className="py-3 px-4">Revenue Generated</th>
                  <th className="py-3 px-4 text-right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No products currently assigned to this investor portfolio.
                    </td>
                  </tr>
                ) : (
                  assignedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">SKU: {p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {p.stockQty} Units
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {profile.currencySymbol}{p.ourPrice.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {p.salesCount} Sold
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-bold">
                        {profile.currencySymbol}{p.totalRevenue.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {profile.currencySymbol}{(p.costPrice * p.stockQty).toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TRANSACTIONS LEDGER TAB */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Date-wise Settlement &amp; Capital History
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Total Transactions: {investorTxs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {investorTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No financial transactions recorded for this investor yet.
                    </td>
                  </tr>
                ) : (
                  investorTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'profit_payout'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : tx.type === 'investment_deposit'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {tx.paymentMode || 'Bank Transfer'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {tx.reference || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER INVESTOR (ADMIN) */}
      {isAddInvestorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Register New Investor</h3>
                  <span className="text-[11px] font-medium block">نیا انویسٹر اور کیپٹل پارٹنر درج کریں</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddInvestorModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInvestor} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Investor Full Name (نام):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sheikh Farhan"
                  value={newInvName}
                  onChange={(e) => setNewInvName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567"
                    value={newInvPhone}
                    onChange={(e) => setNewInvPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp (For Product Orders):
                  </label>
                  <input
                    type="text"
                    placeholder="0300 1234567"
                    value={newInvWhatsapp}
                    onChange={(e) => setNewInvWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Capital (PKR):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newInvCapital}
                    onChange={(e) => setNewInvCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profit Model:
                  </label>
                  <select
                    value={newInvShareType}
                    onChange={(e) => setNewInvShareType(e.target.value as 'percentage' | 'fixed_per_unit')}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="percentage">% Net Profit</option>
                    <option value="fixed_per_unit">Rs Fixed / Unit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Share Value:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newInvShareValue}
                    onChange={(e) => setNewInvShareValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddInvestorModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save Investor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN PRODUCTS TO INVESTOR (ADMIN) */}
      {isAssignModalOpen && activeInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <h3 className="text-base font-black">
                Assign Products to {activeInvestor.name}
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check the products funded by this investor. Sales and profit will automatically link to this portfolio.
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {products.map((p) => {
                  const isAssigned = activeInvestor.assignedProductIds?.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleToggleProductAssignment(p.id)}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Stock: {p.stockQty} · Wholesale: {profile.currencySymbol}{p.ourPrice}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                        {p.category}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD TRANSACTION (ADMIN) */}
      {isRecordTxModalOpen && activeInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <h3 className="text-base font-black">Record Financial Entry</h3>
              <button
                onClick={() => setIsRecordTxModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Type:
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="profit_payout">Profit Payout (منافع کی ادائیگی)</option>
                  <option value="investment_deposit">Capital Deposit (مزید سرمایہ کاری)</option>
                  <option value="capital_withdrawal">Capital Withdrawal (انویسٹمنٹ واپسی)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (PKR):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode:
                </label>
                <select
                  value={txPaymentMode}
                  onChange={(e) => setTxPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer (میزان / ایچ بی ایل)</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="sadapay">SadaPay</option>
                  <option value="cash">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Slip ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. MEZN-PAY-99214"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (تفصیل):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Profit distribution for Lot #1"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordTxModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
