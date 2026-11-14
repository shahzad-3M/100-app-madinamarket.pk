import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  User,
  ShoppingBag,
  History,
  ShieldCheck,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
  Edit3,
} from 'lucide-react';
import { BusinessProfile, Customer, Transaction, TransactionAuditEntry } from '../types';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
  userRole?: string;
  currentUser?: { customerId?: string; role?: string; name?: string; phone?: string };
  onOpenInvoiceModal: (tx: Transaction, customer: Customer) => void;
  onUpdateTransactionStatus?: (
    txId: string,
    newStatus: 'completed' | 'pending' | 'partially_paid' | 'overdue' | 'cancelled',
    notes?: string,
    responsibleStaff?: string
  ) => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  customers,
  profile,
  userRole = 'customer',
  currentUser,
  onOpenInvoiceModal,
  onUpdateTransactionStatus,
}) => {
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Find active customer if in customer role (strict boundary: never fall back to another customer)
  const matchedCustomer = useMemo(() => {
    if (!currentUser) return isCustomer ? null : customers[0] || null;
    if (currentUser.customerId) {
      const found = customers.find((c) => c.id === currentUser.customerId);
      if (found) return found;
    }
    if (currentUser.phone) {
      const cleanPhone = currentUser.phone.replace(/\D/g, '');
      const found = customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
      if (found) return found;
    }
    return isCustomer ? null : customers[0] || null;
  }, [customers, currentUser, isCustomer]);

  // Date filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Other filters
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Audit modal state
  const [selectedTxForAudit, setSelectedTxForAudit] = useState<Transaction | null>(null);

  // Status update modal state (Admin only)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [newStatus, setNewStatus] = useState<'completed' | 'pending' | 'partially_paid' | 'overdue' | 'cancelled'>('completed');
  const [statusNotes, setStatusNotes] = useState('');
  const [responsibleStaff, setResponsibleStaff] = useState('Super Admin');

  // Customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Base customer-scoped transactions
  const scopedTransactions = useMemo(() => {
    if (isCustomer) {
      if (!matchedCustomer) return [];
      return transactions.filter((t) => t.customerId === matchedCustomer.id);
    }
    return transactions;
  }, [transactions, isCustomer, matchedCustomer]);

  // Filtered and chronologically sorted transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return scopedTransactions
      .filter((tx) => {
        // Customer filter (admin view)
        if (!isCustomer && selectedCustomerId !== 'all' && tx.customerId !== selectedCustomerId) {
          return false;
        }

        // Type filter
        if (typeFilter !== 'all' && tx.type !== typeFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const currentStatus = tx.status || (tx.paidAmount && tx.paidAmount >= tx.amount ? 'completed' : 'pending');
          if (currentStatus !== statusFilter) return false;
        }

        // Payment mode filter
        if (paymentModeFilter !== 'all' && tx.paymentMode !== paymentModeFilter) {
          return false;
        }

        // Date filter
        const txDate = tx.date;
        if (dateFilter === 'today') {
          if (txDate !== todayStr) return false;
        } else if (dateFilter === 'this_week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (txDate < oneWeekAgo || txDate > todayStr) return false;
        } else if (dateFilter === 'this_month') {
          const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          if (txDate < firstDayMonth) return false;
        } else if (dateFilter === 'last_month') {
          const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
          const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
          if (txDate < firstDayLastMonth || txDate > lastDayLastMonth) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && txDate < customStartDate) return false;
          if (customEndDate && txDate > customEndDate) return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const cust = customerMap.get(tx.customerId);
          const custName = cust ? cust.name.toLowerCase() : '';
          const custPhone = cust ? cust.phone : '';
          const invNum = (tx.invoiceNumber || '').toLowerCase();
          const notes = (tx.notes || '').toLowerCase();
          const itemMatch = tx.items?.some((it) => it.description.toLowerCase().includes(q)) || false;

          if (!custName.includes(q) && !custPhone.includes(q) && !invNum.includes(q) && !notes.includes(q) && !itemMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [
    scopedTransactions,
    isCustomer,
    selectedCustomerId,
    typeFilter,
    statusFilter,
    paymentModeFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    searchTerm,
    sortOrder,
    customerMap,
  ]);

  // Aggregates
  const totalVolume = filteredTransactions.reduce((acc, tx) => acc + tx.amount, 0);
  const totalPaid = filteredTransactions.reduce((acc, tx) => acc + (tx.paidAmount || (tx.type === 'debit' ? tx.amount : 0)), 0);
  const totalDue = filteredTransactions.reduce((acc, tx) => acc + (tx.dueBalance !== undefined ? tx.dueBalance : Math.max(0, tx.amount - (tx.paidAmount || 0))), 0);
  const totalSavings = filteredTransactions.reduce((acc, tx) => acc + (tx.totalSavings || 0), 0);

  // Status updater handler
  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !onUpdateTransactionStatus) return;

    onUpdateTransactionStatus(editingTx.id, newStatus, statusNotes.trim(), responsibleStaff);
    setEditingTx(null);
    setStatusNotes('');
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Invoice #',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Type',
      'Amount (PKR)',
      'Paid (PKR)',
      'Due Balance (PKR)',
      'Savings (PKR)',
      'Payment Mode',
      'Status',
      'Responsible Staff',
      'Notes',
    ];

    const rows = filteredTransactions.map((tx) => {
      const cust = customerMap.get(tx.customerId);
      return [
        `"${tx.id}"`,
        `"${tx.invoiceNumber || 'N/A'}"`,
        `"${tx.createdAt || tx.date}"`,
        `"${cust?.name || 'Walk-in'}"`,
        `"${cust?.phone || ''}"`,
        `"${tx.type.toUpperCase()}"`,
        tx.amount,
        tx.paidAmount || 0,
        tx.dueBalance || 0,
        tx.totalSavings || 0,
        `"${tx.paymentMode || 'cash'}"`,
        `"${tx.status || 'completed'}"`,
        `"${tx.responsibleStaff || 'Staff'}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `100DAGAR_Transaction_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. VIEW HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isCustomer
                  ? 'My Date-Wise Order & Transaction History'
                  : 'Complete Date-Wise Transaction History & Audit Ledger'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isCustomer
                  ? 'Permanent chronological record of all your purchases, payments, invoices, and savings.'
                  : 'Immutable date-wise transaction audit trail, status changes, and staff accountability.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
            title="Print Ledger"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Transactions
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {filteredTransactions.length}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            In selected date range
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Billed Volume
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {profile.currencySymbol}{totalVolume.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Gross transaction value
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Customer Savings (بچت)
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {profile.currencySymbol}{totalSavings.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Discount vs market retail price
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Settled / Received
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {profile.currencySymbol}{totalPaid.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Remaining Due: {profile.currencySymbol}{totalDue.toLocaleString('en-PK')}
          </span>
        </div>
      </div>

      {/* 3. FILTERING & CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Date Range:</span>
          </span>

          {[
            { id: 'today', label: 'Today (آج)' },
            { id: 'this_week', label: 'This Week (اس ہفتے)' },
            { id: 'this_month', label: 'This Month (اس ماہ)' },
            { id: 'last_month', label: 'Last Month (پچھلا ماہ)' },
            { id: 'all', label: 'All Time (تمام)' },
            { id: 'custom', label: 'Custom Range...' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDateFilter(preset.id as any)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                dateFilter === preset.id
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-auto text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice #, customer, item, notes..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Customer select (Admin only) */}
          {!isCustomer && (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Customers (تمام کسٹمرز)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="all">All Statuses (تمام اسٹیٹس)</option>
            <option value="completed">Completed / Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Mode filter */}
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash (دکان نقد)</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="sadapay">SadaPay</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cod">Cash on Delivery</option>
          </select>

          {/* Sort order */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium flex items-center justify-between cursor-pointer"
          >
            <span>Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            <span className="font-mono">{sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
        </div>
      </div>

      {/* 4. CHRONOLOGICAL TRANSACTION TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Invoice / Ref #</th>
                {!isCustomer && <th className="py-3 px-3">Customer</th>}
                <th className="py-3 px-3">Products &amp; Description</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid / Received</th>
                <th className="py-3 px-3 text-right">Due Balance</th>
                <th className="py-3 px-3 text-center">Payment Method</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => {
                const cust = customerMap.get(tx.customerId);
                const isCredit = tx.type === 'credit';
                const currentStatus = tx.status || (tx.paidAmount && tx.paidAmount >= tx.amount ? 'completed' : 'pending');
                const hasAuditTrail = tx.auditTrail && tx.auditTrail.length > 0;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100 block">
                        {tx.date}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 block">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}
                      </span>
                    </td>

                    {/* Invoice # */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800">
                        {tx.invoiceNumber || `INV-${tx.id.slice(-6).toUpperCase()}`}
                      </span>
                      {tx.saleType && (
                        <span className="block text-[9px] text-slate-400 uppercase mt-0.5">
                          {tx.saleType}
                        </span>
                      )}
                    </td>

                    {/* Customer (Admin only) */}
                    {!isCustomer && (
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                          {cust ? cust.name : 'Walk-in Customer'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 block">
                          {cust?.phone || ''}
                        </span>
                      </td>
                    )}

                    {/* Product & Services items */}
                    <td className="py-3 px-3 max-w-xs">
                      {tx.items && tx.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {tx.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                {it.description}
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                          {tx.items.length > 2 && (
                            <span className="text-[10px] text-amber-600 font-bold block">
                              +{tx.items.length - 2} more items
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-1">
                          {tx.notes || (isCredit ? 'Wholesale Product Purchase' : 'Payment Received')}
                        </span>
                      )}

                      {tx.totalSavings && tx.totalSavings > 0 ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          Saved: {profile.currencySymbol}{tx.totalSavings.toLocaleString('en-PK')}
                        </span>
                      ) : null}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {profile.currencySymbol}{(tx.paidAmount || (tx.type === 'debit' ? tx.amount : 0)).toLocaleString('en-PK')}
                    </td>

                    {/* Due Balance */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                      <span className={tx.dueBalance && tx.dueBalance > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}>
                        {profile.currencySymbol}{(tx.dueBalance !== undefined ? tx.dueBalance : Math.max(0, tx.amount - (tx.paidAmount || 0))).toLocaleString('en-PK')}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {tx.paymentMode || 'cash'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          currentStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : currentStatus === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : currentStatus === 'overdue'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : currentStatus === 'cancelled'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {currentStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => cust && onOpenInvoiceModal(tx, cust)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                          title="View Invoice & Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTxForAudit(tx)}
                          className={`p-1 rounded cursor-pointer ${
                            hasAuditTrail
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                          }`}
                          title="View Audit Trail Log"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTx(tx);
                              setNewStatus(tx.status || 'completed');
                              setStatusNotes('');
                            }}
                            className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                            title="Update Status & Log Audit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No transactions found for the selected date range or filters.
            </p>
            <p className="text-xs text-slate-400">
              Try switching to "All Time" or resetting your search filters.
            </p>
            <button
              onClick={() => {
                setDateFilter('all');
                setTypeFilter('all');
                setStatusFilter('all');
                setPaymentModeFilter('all');
                setSearchTerm('');
              }}
              className="mt-3 px-3 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg cursor-pointer hover:bg-amber-400"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 5. AUDIT TRAIL MODAL (IMMUTABLE RECORD OF EDITS, STATUS CHANGES & ACTIONS) */}
      {selectedTxForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    Transaction Audit Trail &amp; History
                  </h3>
                  <span className="text-[11px] font-mono text-slate-800">
                    Ref: {selectedTxForAudit.invoiceNumber || selectedTxForAudit.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxForAudit(null)}
                className="p-1 text-slate-800 hover:text-black rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Transaction Date
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedTxForAudit.date} ({selectedTxForAudit.createdAt ? new Date(selectedTxForAudit.createdAt).toLocaleTimeString() : '10:00 AM'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Amount
                  </span>
                  <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                    {profile.currencySymbol}{selectedTxForAudit.amount.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Chronological Audit Logs */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Immutable Audit History (آڈٹ لاگ ریکارڈ):
                </span>

                {selectedTxForAudit.auditTrail && selectedTxForAudit.auditTrail.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-amber-400 pl-3">
                    {selectedTxForAudit.auditTrail.map((log, i) => (
                      <div key={log.id || i} className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 dark:text-white capitalize">
                            Action: {log.action.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.previousStatus && log.newStatus && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Status changed: <span className="font-mono font-bold">{log.previousStatus}</span> → <span className="font-mono font-bold text-amber-600">{log.newStatus}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">
                          Responsible: <span className="font-bold">{log.changedBy}</span>
                        </div>
                        {log.notes && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 italic pt-0.5">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-lg text-slate-500 text-center">
                    Original transaction recorded on {selectedTxForAudit.date}. No subsequent status modifications.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTxForAudit(null)}
                  className="px-4 py-2 bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADMIN STATUS UPDATE & AUDIT RECORDER MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">
                  Update Transaction Status &amp; Record Audit
                </h3>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusUpdate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select New Status:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="pending">Pending Payment</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Responsible Staff Member:
                </label>
                <input
                  type="text"
                  value={responsibleStaff}
                  onChange={(e) => setResponsibleStaff(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Audit Remarks / Correction Notes:
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Reason for status change or settlement details..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Save &amp; Record to Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
