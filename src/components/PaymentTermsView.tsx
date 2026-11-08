import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Sparkles,
  Phone,
  ShieldCheck,
  Percent,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { BusinessProfile, Customer, ReminderTemplate, Transaction, WhatsAppNotification } from '../types';
import { formatPaymentChannelsText, openWhatsAppDirect } from '../utils/whatsapp';

interface PaymentTermsViewProps {
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
  templates: ReminderTemplate[];
  onRunTermsEngine: () => void;
  onSendSingleReminder: (tx: Transaction, customer: Customer) => void;
  onSettlePayment: (tx: Transaction, customer: Customer) => void;
}

export const PaymentTermsView: React.FC<PaymentTermsViewProps> = ({
  transactions,
  customers,
  profile,
  templates,
  onRunTermsEngine,
  onSendSingleReminder,
  onSettlePayment,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'soft_3days' | 'due_today' | 'overdue_3days' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'individual' | 'retail'>('all');

  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const todayStr = new Date().toISOString().split('T')[0];
  const todayObj = new Date(todayStr);
  todayObj.setHours(0, 0, 0, 0);

  // Filter credit transactions with terms
  const creditTxs = transactions.filter((t) => t.type === 'credit' && t.dueDate);

  // Classify each transaction into its payment terms lifecycle stage
  const classifiedTxs = creditTxs.map((tx) => {
    const cust = customerMap.get(tx.customerId);
    const dueObj = new Date(tx.dueDate!);
    dueObj.setHours(0, 0, 0, 0);

    const diffMs = dueObj.getTime() - todayObj.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)); // >0 before due, 0 due today, <0 overdue
    const unpaidAmount = tx.dueBalance !== undefined ? tx.dueBalance : tx.amount;
    const isSettled = unpaidAmount <= 0;

    let stage: 'soft_3days' | 'due_today' | 'overdue_3days' | 'future' | 'settled' = 'future';
    if (isSettled) {
      stage = 'settled';
    } else if (diffDays === 3 || (diffDays > 0 && diffDays <= 3)) {
      stage = 'soft_3days';
    } else if (diffDays === 0) {
      stage = 'due_today';
    } else if (diffDays < 0) {
      stage = 'overdue_3days';
    }

    return {
      tx,
      cust,
      diffDays,
      daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
      unpaidAmount,
      isSettled,
      stage,
    };
  });

  // KPI Metrics
  const totalUnpaidReceivables = classifiedTxs
    .filter((c) => !c.isSettled)
    .reduce((acc, c) => acc + c.unpaidAmount, 0);
  const softReminderCount = classifiedTxs.filter((c) => c.stage === 'soft_3days').length;
  const dueTodayCount = classifiedTxs.filter((c) => c.stage === 'due_today').length;
  const overdueCount = classifiedTxs.filter((c) => c.stage === 'overdue_3days').length;
  const settledCount = classifiedTxs.filter((c) => c.isSettled).length;

  const filteredList = classifiedTxs.filter((item) => {
    // Stage Filter
    if (filterTab === 'soft_3days' && item.stage !== 'soft_3days') return false;
    if (filterTab === 'due_today' && item.stage !== 'due_today') return false;
    if (filterTab === 'overdue_3days' && item.stage !== 'overdue_3days') return false;
    if (filterTab === 'settled' && item.stage !== 'settled') return false;
    if (filterTab === 'all' && item.isSettled) return false; // Show active terms by default on 'all'

    // Customer Type Filter
    if (customerTypeFilter !== 'all' && item.cust?.customerType !== customerTypeFilter) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.cust?.name.toLowerCase().includes(q) || false;
      const matchUrdu = item.cust?.urduName?.toLowerCase().includes(q) || false;
      const matchInv = item.tx.invoiceNumber?.toLowerCase().includes(q) || false;
      return matchName || matchUrdu || matchInv;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE TERMS ALERT BANNER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <CalendarClock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Payment Terms &amp; 3-Day Reminder Engine</span>
                <span className="font-urdu text-xs font-normal text-amber-600 dark:text-amber-400">
                  (ادائیگی کی شرائط اور ۳ روزہ الرٹ سسٹم)
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated 3-stage collection cycle: Soft reminder 3 days before terms day, payment due today alert (1 week grace max), and every 3 days overdue until settled.
              </p>
            </div>
          </div>

          {/* Trigger Engine Button */}
          <button
            onClick={onRunTermsEngine}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Run All Scheduled Terms Alerts Now</span>
          </button>
        </div>

        {/* 4 STAGE KPI METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 block">Total Active Receivables</span>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {profile.currencySymbol}{totalUnpaidReceivables.toLocaleString('en-PK')}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              EasyPaisa: 03125256266
            </span>
          </div>

          <div
            onClick={() => setFilterTab('soft_3days')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'soft_3days'
                ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400 dark:bg-amber-950/60'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
            }`}
          >
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block">
              1. Soft Reminder (3 Days Before)
            </span>
            <p className="text-lg font-bold font-mono text-amber-900 dark:text-amber-200 mt-1">
              {softReminderCount} Invoices
            </p>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">
              نرم یاددہانی ۳ دن قبل
            </span>
          </div>

          <div
            onClick={() => setFilterTab('due_today')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'due_today'
                ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-400 dark:bg-blue-950/60'
                : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
            }`}
          >
            <span className="text-[11px] text-blue-800 dark:text-blue-300 font-bold block">
              2. Payment Due Today
            </span>
            <p className="text-lg font-bold font-mono text-blue-900 dark:text-blue-200 mt-1">
              {dueTodayCount} Invoices
            </p>
            <span className="text-[10px] text-blue-700 dark:text-blue-400 block mt-0.5">
              آج ادائیگی کی آخری تاریخ
            </span>
          </div>

          <div
            onClick={() => setFilterTab('overdue_3days')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'overdue_3days'
                ? 'bg-red-100/70 border-red-400 ring-2 ring-red-400 dark:bg-red-950/60'
                : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            }`}
          >
            <span className="text-[11px] text-red-800 dark:text-red-300 font-bold block">
              3. Overdue (Every 3 Days)
            </span>
            <p className="text-lg font-bold font-mono text-red-900 dark:text-red-200 mt-1">
              {overdueCount} Invoices
            </p>
            <span className="text-[10px] text-red-700 dark:text-red-400 block mt-0.5">
              ہر ۳ دن بعد تاخیری نوٹس
            </span>
          </div>

          <div
            onClick={() => setFilterTab('settled')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'settled'
                ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-400 dark:bg-emerald-950/60'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">
              4. Fully Settled
            </span>
            <p className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-1">
              {settledCount} Invoices
            </p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
              مکمل ادا شدہ
            </span>
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH ROW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Stage Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                filterTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Active Terms
            </button>
            <button
              onClick={() => setFilterTab('soft_3days')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                filterTab === 'soft_3days'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soft Alert (3 Days Before)
            </button>
            <button
              onClick={() => setFilterTab('due_today')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                filterTab === 'due_today'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Due Today (Terms Day)
            </button>
            <button
              onClick={() => setFilterTab('overdue_3days')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                filterTab === 'overdue_3days'
                  ? 'bg-red-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Overdue (Every 3 Days Cycle)
            </button>
            <button
              onClick={() => setFilterTab('settled')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                filterTab === 'settled'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Settled
            </button>
          </div>

          {/* Customer Type Segmented Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setCustomerTypeFilter('all')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  customerTypeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCustomerTypeFilter('retail')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  customerTypeFilter === 'retail'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Retailers Only
              </button>
              <button
                onClick={() => setCustomerTypeFilter('individual')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  customerTypeFilter === 'individual'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Individuals
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, invoice #..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 3. TERMS TRACKER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Customer (کسٹمر)</th>
                <th className="py-2.5 px-3">Invoice &amp; Sale Mode</th>
                <th className="py-2.5 px-3 text-right">Invoice Total</th>
                <th className="py-2.5 px-3 text-right">Paid Amount</th>
                <th className="py-2.5 px-3 text-right">Due Balance</th>
                <th className="py-2.5 px-3">Soft Alert (3d Before)</th>
                <th className="py-2.5 px-3">Terms Due Date</th>
                <th className="py-2.5 px-3">Lifecycle Status</th>
                <th className="py-2.5 px-3 text-right">WhatsApp Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map(({ tx, cust, diffDays, daysOverdue, unpaidAmount, isSettled, stage }) => {
                const softDate = tx.softReminderDate || (() => {
                  const d = new Date(tx.dueDate!);
                  d.setDate(d.getDate() - 3);
                  return d.toISOString().split('T')[0];
                })();

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {cust?.name || 'Unknown'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          cust?.customerType === 'retail'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {cust?.customerType === 'retail' ? 'Retailer' : 'Individual'}
                        </span>
                      </div>
                      {cust?.urduName && (
                        <p className="font-urdu text-[11px] text-slate-500 mt-0.5">
                          {cust.urduName}
                        </p>
                      )}
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                        📞 {cust?.phone}
                      </p>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                        #{tx.invoiceNumber || 'INV-100D'}
                      </span>
                      <span className="text-[10px] text-slate-500 block capitalize">
                        {tx.saleType ? tx.saleType.replace('_', ' ') : 'Credit Sale'} · {tx.paymentTermsDays || 14}d Terms
                      </span>
                      {tx.items && tx.items.length > 0 && (
                        <span className="text-[10px] text-slate-400 italic block truncate max-w-[180px]">
                          {tx.items.map((i) => i.description).join(', ')}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {profile.currencySymbol}{(tx.paidAmount || 0).toLocaleString('en-PK')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {profile.currencySymbol}{unpaidAmount.toLocaleString('en-PK')}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        {softDate}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        3 days before due
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white">
                        <span>{tx.dueDate}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Max 1 Wk Grace
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle className="w-3 h-3" /> SETTLED
                        </span>
                      ) : stage === 'soft_3days' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                          <Clock className="w-3 h-3" /> SOFT NOTICE (In 3d)
                        </span>
                      ) : stage === 'due_today' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-bounce">
                          <AlertTriangle className="w-3 h-3" /> DUE TODAY
                        </span>
                      ) : stage === 'overdue_3days' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" /> {daysOverdue}D OVERDUE (3d Alert)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">
                          Due in {diffDays} days
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isSettled && cust && (
                          <button
                            onClick={() => onSendSingleReminder(tx, cust)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                            title="Dispatch WhatsApp Alert with Pakistani Payment Channels"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                        {!isSettled && cust && (
                          <button
                            onClick={() => onSettlePayment(tx, cust)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[11px] font-medium cursor-pointer"
                          >
                            Settle
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

        {filteredList.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-bold">No active payment terms under this filter.</p>
            <p className="text-slate-400 mt-0.5">All customer payments are up to date!</p>
          </div>
        )}
      </div>
    </div>
  );
};
