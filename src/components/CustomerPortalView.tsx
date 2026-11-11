import React, { useState } from 'react';
import {
  User,
  ShoppingBag,
  Clock,
  BarChart3,
  CreditCard,
  KeyRound,
  LogOut,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AppUser, BusinessProfile, Customer, Transaction } from '../types';
import {
  getDefaultPinForPhone,
  getTransactions,
  saveCustomers,
  updateCustomerPin,
} from '../utils/storage';
import { createPasswordRecord, verifyPassword } from '../utils/security';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface CustomerPortalViewProps {
  currentUser: AppUser;
  customer?: Customer;
  transactions: Transaction[];
  profile: BusinessProfile;
  onLogout: () => void;
  onOpenCart?: () => void;
  onNavigateTab: (tab: string) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  currentUser,
  customer,
  transactions,
  profile,
  onLogout,
  onOpenCart,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'orders' | 'reports' | 'payments' | 'security'
  >('dashboard');

  // Change Password State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Scoped customer data: strictly filter by customerId or phone
  const customerId = currentUser.customerId || customer?.id;
  const myTransactions = transactions.filter(
    (tx) =>
      tx.customerId === customerId ||
      (customer && tx.customerId === customer.id)
  );

  const totalPurchases = myTransactions
    .filter((tx) => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPaid = myTransactions
    .filter((tx) => tx.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0) +
    myTransactions
      .filter((tx) => tx.type === 'credit' && tx.paidAmount)
      .reduce((sum, tx) => sum + (tx.paidAmount || 0), 0);

  const totalSavings = myTransactions.reduce(
    (sum, tx) => sum + (tx.totalSavings || 0),
    0
  );

  const currentBalance = customer?.balance || Math.max(0, totalPurchases - totalPaid);

  // Handle password change with salted hashing
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');
    setIsUpdatingPassword(true);

    if (!currentPasswordInput.trim()) {
      setSecurityError('Please enter your current password / PIN.');
      setIsUpdatingPassword(false);
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setSecurityError('New password must be at least 4 digits/characters long.');
      setIsUpdatingPassword(false);
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setSecurityError('New password and confirm password do not match.');
      setIsUpdatingPassword(false);
      return;
    }

    // Verify current credentials
    const defaultPin = getDefaultPinForPhone(customer?.phone || currentUser.phone || '');
    const currentStored = customer?.pin || defaultPin;

    const isMatch = await verifyPassword(currentPasswordInput.trim(), currentStored);
    if (!isMatch && currentPasswordInput.trim() !== defaultPin) {
      setSecurityError('Current password is incorrect. Please check and try again.');
      setIsUpdatingPassword(false);
      return;
    }

    // Hash new password
    const newPassRecord = await createPasswordRecord(newPasswordInput.trim());

    if (customer) {
      updateCustomerPin(customer.id, newPasswordInput.trim());
    }

    setIsUpdatingPassword(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setSecuritySuccess('Password changed successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFD200] text-slate-950 flex items-center justify-center font-black text-lg shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {customer?.name || currentUser.name}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded uppercase">
                  Verified Customer Khata
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                Phone: {customer?.phone || currentUser.phone} · Credit Limit: {profile.currencySymbol}{(customer?.creditLimit || 5000).toLocaleString('en-PK')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('store')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>Browse Catalog</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Portal Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Orders &amp; Khata ({myTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>My Reports &amp; Savings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'payments'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Instructions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'security'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password / PIN</span>
          </button>
        </div>
      </div>

      {/* 1. DASHBOARD OVERVIEW TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metric Strips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Current Due Balance
              </span>
              <div
                className={`text-xl font-black font-mono mt-1 ${
                  currentBalance > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {profile.currencySymbol}{currentBalance.toLocaleString('en-PK')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {currentBalance > 0 ? 'باقی واجب الادا رقم' : 'کھاتہ کلیئر ہے'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Purchases
              </span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {profile.currencySymbol}{totalPurchases.toLocaleString('en-PK')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {myTransactions.filter((tx) => tx.type === 'credit').length} Orders Delivered
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Cash Saved
              </span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {profile.currencySymbol}{totalSavings.toLocaleString('en-PK')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                مارکیٹ ریٹ سے بچت
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Payment Terms
              </span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {customer?.paymentTermsDays || 7} Days
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ادائیگی کی مدت
              </span>
            </div>
          </div>

          {/* Quick Action: "Add My Product" Link direct to WhatsApp */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                  Want to sell or supply products on 100DAGAR? (اپنی پراڈکٹ شامل کروائیں)
                </h3>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Send your product catalog, wholesale wholesale lot details, or samples directly to our procurement admin.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `السلام علیکم! میں مدینہ مارکیٹ کسٹمر ${customer?.name || currentUser.name} ہوں۔ میں اپنی نئی پراڈکٹ کی تفصیلات اور قیمت شامل کروانا چاہتا ہوں۔ براہ کرم رہنمائی فرمائیں۔`;
                openWhatsAppDirect('03125256266', text);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Add My Product</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. ORDERS & KHATA HISTORY TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              My Transaction &amp; Purchase History
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {myTransactions.length} Total Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Invoice / Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Market Rate</th>
                  <th className="py-3 px-4">You Paid / Bill</th>
                  <th className="py-3 px-4 text-right">Your Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No transactions recorded for this account yet.
                    </td>
                  </tr>
                ) : (
                  myTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {tx.invoiceNumber || 'Sale Invoice'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tx.items?.map((it) => `${it.quantity}x ${it.description}`).join(', ') || tx.notes || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : tx.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {tx.status?.replace('_', ' ') || 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 line-through">
                        {tx.items && tx.items[0]?.marketPrice
                          ? `${profile.currencySymbol}${(tx.items.reduce((s, i) => s + (i.marketPrice || i.unitPrice) * i.quantity, 0)).toLocaleString('en-PK')}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {tx.totalSavings ? `+${profile.currencySymbol}${tx.totalSavings.toLocaleString('en-PK')}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. REPORTS & SAVINGS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Personal Wholesale Savings Report (ذاتی بچت کا خلاصہ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comparison between regular retail market prices and your wholesale rates on 100DAGAR.
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Lifetime Cumulative Savings
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {profile.currencySymbol}{totalSavings.toLocaleString('en-PK')} Saved
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('monthly_statement')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                View Full Monthly Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAYMENT INSTRUCTIONS TAB */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Official Payment Channels &amp; Settlement (رقم ادائیگی کے ذرائع)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Please use the official accounts below for settling your khata balance. Send payment screenshot on WhatsApp after transfer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* EasyPaisa */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                EasyPaisa Account
              </span>
              <div className="font-mono text-sm font-black text-slate-900 dark:text-white mt-1">
                {profile.paymentChannels.easyPaisa.accountNumber}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Title: {profile.paymentChannels.easyPaisa.accountTitle}
              </span>
            </div>

            {/* JazzCash */}
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20">
              <span className="text-xs font-bold text-red-800 dark:text-red-300 block">
                JazzCash Account
              </span>
              <div className="font-mono text-sm font-black text-slate-900 dark:text-white mt-1">
                {profile.paymentChannels.jazzCash.accountNumber}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Title: {profile.paymentChannels.jazzCash.accountTitle}
              </span>
            </div>

            {/* SadaPay */}
            <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/50 dark:bg-cyan-950/20">
              <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 block">
                SadaPay / IBAN
              </span>
              <div className="font-mono text-sm font-black text-slate-900 dark:text-white mt-1">
                {profile.paymentChannels.sadaPay.accountNumber}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                SadaTag: {profile.paymentChannels.sadaPay.sadaTag}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHANGE PASSWORD / PIN TAB */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs max-w-lg">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Change Security Password / PIN
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              اپنے کھاتے کا سیکیورٹی پاس ورڈ یا پن کوڈ تبدیل کریں (محفوظ سالٹڈ اینکرپشن)
            </p>
          </div>

          {securityError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{securityError}</span>
            </div>
          )}

          {securitySuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{securitySuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current Password / PIN (موجودہ پن):
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={currentPasswordInput}
              onChange={(e) => setCurrentPasswordInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Password / PIN (نیا پن):
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={4}
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              placeholder="Min 4 to 6 digits"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password (تصدیق نیا پن):
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={4}
              value={confirmPasswordInput}
              onChange={(e) => setConfirmPasswordInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              placeholder="Repeat new PIN"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? 'Hide password' : 'Show password'}</span>
            </button>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
