import React from 'react';
import {
  Repeat,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  Trash2,
  Pause,
  FileText,
} from 'lucide-react';
import { BusinessProfile, Customer, RecurringInvoice, Transaction } from '../types';

interface RecurringInvoicesViewProps {
  recurringInvoices: RecurringInvoice[];
  customers: Customer[];
  transactions: Transaction[];
  profile: BusinessProfile;
  onOpenAddRecurring: () => void;
  onRunRecurringCheck: () => void;
  onToggleStatus: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
  onTriggerSingleRecurring: (rec: RecurringInvoice) => void;
  onOpenInvoiceModal: (tx: Transaction, customer: Customer) => void;
}

export const RecurringInvoicesView: React.FC<RecurringInvoicesViewProps> = ({
  recurringInvoices,
  customers,
  transactions,
  profile,
  onOpenAddRecurring,
  onRunRecurringCheck,
  onToggleStatus,
  onDeleteRecurring,
  onTriggerSingleRecurring,
  onOpenInvoiceModal,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  // MRR Calculation
  const activeContracts = recurringInvoices.filter((r) => r.status === 'active');
  const mrrTotal = activeContracts.reduce((sum, r) => {
    if (r.frequency === 'monthly') return sum + r.totalAmount;
    if (r.frequency === 'weekly') return sum + r.totalAmount * 4;
    if (r.frequency === 'biweekly') return sum + r.totalAmount * 2;
    if (r.frequency === 'quarterly') return sum + r.totalAmount / 3;
    return sum + r.totalAmount;
  }, 0);

  const dueForGeneration = activeContracts.filter((r) => r.nextBillingDate <= todayStr);

  // Past recurring transactions
  const recurringTransactions = transactions
    .filter((t) => t.notes && t.notes.toLowerCase().includes('recurring'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Repeat className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Recurring Invoice Engine
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Automate periodic contracts, retainers, and subscriptions. The engine automatically creates credit ledger entries, advances billing dates, and queues customer WhatsApp notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {dueForGeneration.length > 0 && (
              <button
                onClick={onRunRecurringCheck}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer animate-pulse"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Generate {dueForGeneration.length} Due Invoices Now
              </button>
            )}

            <button
              onClick={onOpenAddRecurring}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Create Billing Contract
            </button>
          </div>
        </div>

        {/* 3 Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500">Active Retainers</span>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {activeContracts.length} / {recurringInvoices.length}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Monthly Recurring Value (MRR)</span>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {profile.currencySymbol}{Math.round(mrrTotal).toLocaleString('en-PK')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Invoices Due Today</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                dueForGeneration.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {dueForGeneration.length} ready
            </p>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recurring Billing Schedules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contract configurations and scheduled next billing dates
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Contract &amp; Party</th>
                <th className="py-2.5 px-3 font-semibold">Cadence</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                <th className="py-2.5 px-3 font-semibold">Next Billing</th>
                <th className="py-2.5 px-3 font-semibold">WhatsApp Alert</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recurringInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No recurring contracts configured. Click "+ Create Billing Contract" to get started.
                  </td>
                </tr>
              ) : (
                recurringInvoices.map((rec) => {
                  const cust = customerMap.get(rec.customerId);
                  const isDue = rec.status === 'active' && rec.nextBillingDate <= todayStr;
                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/70 transition-colors ${
                        isDue ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {rec.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Party: <span className="font-medium text-slate-700 dark:text-slate-300">{cust?.name || 'Customer'}</span>
                          {cust && <span className="font-mono"> ({cust.phone})</span>}
                        </p>
                        {rec.items && rec.items.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">
                            {rec.items.map((it) => `${it.description} (${it.quantity}x)`).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {rec.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {profile.currencySymbol}{rec.totalAmount.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{rec.nextBillingDate}</span>
                          {isDue && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                              DUE
                            </span>
                          )}
                        </div>
                        {rec.lastGeneratedDate && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Last: {rec.lastGeneratedDate}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          {rec.autoSendWhatsApp ? 'WhatsApp Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-semibold ${
                            rec.status === 'active'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {rec.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onTriggerSingleRecurring(rec)}
                            title="Generate this bill now"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            Bill Now
                          </button>
                          <button
                            onClick={() => onToggleStatus(rec.id)}
                            title={rec.status === 'active' ? 'Pause contract' : 'Resume contract'}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecurring(rec.id)}
                            title="Delete recurring contract"
                            className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Invoices History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Recent Generated Invoices from Recurring Engine
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Automatic credit ledger entries recorded for billing cycles
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recurringTransactions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No recurring invoices generated yet. Click "Generate Due Invoices Now" to trigger pending billing runs.
            </p>
          ) : (
            recurringTransactions.slice(0, 5).map((tx) => {
              const cust = customerMap.get(tx.customerId);
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {cust?.name}
                    </span>
                    <span className="text-slate-500 ml-2">#{tx.invoiceNumber}</span>
                    <p className="text-[11px] text-slate-400">{tx.notes}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                    </span>
                    {cust && (
                      <button
                        onClick={() => onOpenInvoiceModal(tx, cust)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        Print Invoice
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
