import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Calendar,
  Send,
  Repeat,
  UserPlus,
  Clock,
  CheckCircle2,
  ChevronRight,
  Megaphone,
} from 'lucide-react';
import { BusinessProfile, Customer, RecurringInvoice, Transaction, WhatsAppNotification } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';
import { FinancialVisuals } from './FinancialVisuals';

interface DashboardViewProps {
  customers: Customer[];
  transactions: Transaction[];
  recurringInvoices: RecurringInvoice[];
  notifications: WhatsAppNotification[];
  profile: BusinessProfile;
  onOpenAddTransaction: (type: 'credit' | 'debit', customerId?: string) => void;
  onOpenAddCustomer: () => void;
  onOpenScheduleWhatsApp: (customerId?: string, date?: string) => void;
  onOpenProductBroadcast: () => void;
  onOpenInvoiceModal: (tx: Transaction, customer: Customer) => void;
  onSelectCustomer: (customerId: string) => void;
  onRunRecurringCheck: () => void;
  onRunWeeklyDueReminders: () => void;
  onRunMonthlyReminderBatch: () => void;
  onMarkNotificationSent: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  transactions,
  recurringInvoices,
  notifications,
  profile,
  onOpenAddTransaction,
  onOpenAddCustomer,
  onOpenScheduleWhatsApp,
  onOpenProductBroadcast,
  onOpenInvoiceModal,
  onSelectCustomer,
  onRunRecurringCheck,
  onRunWeeklyDueReminders,
  onRunMonthlyReminderBatch,
  onMarkNotificationSent,
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. KPI Calculations
  const totalReceivable = customers.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0);
  const dueCustomersCount = customers.filter((c) => c.balance > 0).length;

  // Overdue calculation
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  let totalOverdueAmount = 0;
  let overdueCustomerCount = 0;

  customers.forEach((c) => {
    if (c.balance > 0) {
      const credits = transactions.filter((t) => t.customerId === c.id && t.type === 'credit');
      const hasOverdue = credits.some((t) => t.dueDate && t.dueDate < todayStr);
      if (hasOverdue) {
        totalOverdueAmount += c.balance;
        overdueCustomerCount++;
      }
    }
  });

  // Payments collected this month
  const currentYearMonth = todayStr.substring(0, 7);
  const totalCollectedThisMonth = transactions
    .filter((t) => t.type === 'debit' && t.date.startsWith(currentYearMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  // Recurring MRR
  const mrrValue = recurringInvoices
    .filter((r) => r.status === 'active')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.totalAmount;
      if (r.frequency === 'weekly') return sum + r.totalAmount * 4;
      if (r.frequency === 'biweekly') return sum + r.totalAmount * 2;
      if (r.frequency === 'quarterly') return sum + r.totalAmount / 3;
      return sum + r.totalAmount;
    }, 0);

  // Notifications due today or pending
  const pendingTodayNotifications = notifications.filter(
    (n) => n.status === 'pending' && n.scheduledFor <= todayStr
  );

  // Recurring invoices due for billing today
  const pendingRecurringDue = recurringInvoices.filter(
    (r) => r.status === 'active' && r.nextBillingDate <= todayStr
  );

  // Top Debtors
  const topDebtors = [...customers]
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Receivable */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Receivable / کل واجب الادا رقم
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {profile.currencySymbol} {totalReceivable.toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{dueCustomersCount} parties with due balance</span>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-[11px] cursor-pointer"
            >
              View ledger →
            </button>
          </div>
        </div>

        {/* Total Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Overdue Balance / تاخیر شدہ بل
            </span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
              {profile.currencySymbol} {totalOverdueAmount.toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{overdueCustomerCount} parties past due date</span>
            <button
              onClick={onRunWeeklyDueReminders}
              className="text-red-600 dark:text-red-400 font-medium hover:underline text-[11px] cursor-pointer"
            >
              Weekly reminders →
            </button>
          </div>
        </div>

        {/* Total Collected This Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Collected This Month / رواں ماہ وصولی
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {profile.currencySymbol} {totalCollectedThisMonth.toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>EasyPaisa, JazzCash &amp; Bank</span>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-[11px] cursor-pointer"
            >
              Daybook report →
            </button>
          </div>
        </div>

        {/* Monthly Recurring Contracts (MRR) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Recurring Billing / ماہانہ باقاعدہ بل
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Repeat className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {profile.currencySymbol} {Math.round(mrrValue).toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{recurringInvoices.filter((r) => r.status === 'active').length} active retainers</span>
            <button
              onClick={() => onNavigateTab('recurring')}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-[11px] cursor-pointer"
            >
              Manage billing →
            </button>
          </div>
        </div>
      </div>

      {/* Actionable Alerts Bar: Reminders Scheduled For Today or Invoices Due */}
      {(pendingTodayNotifications.length > 0 || pendingRecurringDue.length > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="p-2 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Daily Automation Alerts Due Today ({todayStr})
                </h3>
                <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 space-x-3">
                  {pendingTodayNotifications.length > 0 && (
                    <span>
                      • <b>{pendingTodayNotifications.length}</b> WhatsApp payment reminders ready to dispatch
                    </span>
                  )}
                  {pendingRecurringDue.length > 0 && (
                    <span>
                      • <b>{pendingRecurringDue.length}</b> recurring contract invoices due for generation
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingRecurringDue.length > 0 && (
                <button
                  onClick={onRunRecurringCheck}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                >
                  ⚡ Generate Invoices ({pendingRecurringDue.length})
                </button>
              )}
              {pendingTodayNotifications.length > 0 && (
                <button
                  onClick={() => onNavigateTab('whatsapp')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch WhatsApp Alerts ({pendingTodayNotifications.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Bar with Pakistani Features & Broadcast */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          100DAGAR Actions &amp; Automations
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => onOpenAddTransaction('credit')}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            + Gave Credit / ادھار
          </button>

          <button
            onClick={() => onOpenAddTransaction('debit')}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            + Got Payment / وصولی
          </button>

          {/* User Requested: Weekly reminder for only due payments */}
          <button
            onClick={onRunWeeklyDueReminders}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Weekly Due Reminders ({dueCustomersCount})
          </button>

          {/* User Requested: New thing message to all with link of new product */}
          <button
            onClick={onOpenProductBroadcast}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Broadcast New Product &amp; Link
          </button>

          <button
            onClick={() => onOpenScheduleWhatsApp()}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            Schedule on Selected Date
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            + New Party / پارٹی
          </button>
        </div>
      </div>

      {/* User Requested: Interactive Graphs and Visuals for Better Understanding */}
      <FinancialVisuals
        transactions={transactions}
        customers={customers}
        profile={profile}
        onSelectCustomer={onSelectCustomer}
      />

      {/* Main Grid: Top Debtors Table & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Debtors List (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Outstanding Customers / زیادہ واجب الادا پارٹیاں
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customers with highest pending balances and active credit terms
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              All Parties <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
            {topDebtors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No outstanding balances recorded. All customer accounts are settled!
              </div>
            ) : (
              topDebtors.map((customer) => (
                <div
                  key={customer.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-850/60 px-2 rounded-lg transition-colors"
                >
                  <div
                    onClick={() => onSelectCustomer(customer.id)}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {customer.name}
                      </span>
                      {customer.urduName && (
                        <span className="text-xs text-slate-500 font-sans">
                          ({customer.urduName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{customer.phone}</span>
                      <span>·</span>
                      <span>Terms: {customer.paymentTermsDays}d</span>
                      {customer.lastReminderSentAt && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400">Reminded {customer.lastReminderSentAt}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold font-mono tabular-nums text-red-600 dark:text-red-400 block">
                      {profile.currencySymbol} {customer.balance.toLocaleString('en-PK')}
                    </span>
                    <span className="text-[10px] text-slate-400">Pending / بقایا</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onOpenScheduleWhatsApp(customer.id)}
                      title="Schedule WhatsApp Reminder"
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const msg = `Weekly Payment Reminder / ہفتہ وار یاد دہانی\n*${profile.name}*\n\nمحترم ${customer.name} صاحب،\nآپ کے کھاتے میں واجب الادا رقم: *${profile.currencySymbol} ${customer.balance.toLocaleString('en-PK')}*\nبرائے مہربانی اس ہفتے ادائیگی کر دیں۔\n\n*Payment Channels:*\n• EasyPaisa: ${profile.paymentChannels.easyPaisa?.accountNumber}\n• JazzCash: ${profile.paymentChannels.jazzCash?.accountNumber}\n• SadaPay: ${profile.paymentChannels.sadaPay?.accountNumber}\n• Bank: ${profile.paymentChannels.bankDetails?.bankName} (A/C: ${profile.paymentChannels.bankDetails?.accountNumber})\n\nشکریہ!`;
                        openWhatsAppDirect(customer.phone, msg);
                      }}
                      title="Send WhatsApp Now"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Remind</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Feed (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Ledger Entries
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest credit and debit transactions
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Daybook →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 space-y-1">
            {recentTransactions.map((tx) => {
              const cust = customerMap.get(tx.customerId);
              const isCredit = tx.type === 'credit';
              return (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-850/60 px-1 rounded transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`p-1 rounded text-xs ${
                          isCredit
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        }`}
                      >
                        {isCredit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                      </span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {cust?.name || 'Customer'}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="font-mono">{tx.date}</span>
                      {tx.invoiceNumber && <span>· #{tx.invoiceNumber}</span>}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        isCredit ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {profile.currencySymbol} {tx.amount.toLocaleString('en-PK')}
                    </span>
                    {cust && (
                      <button
                        onClick={() => onOpenInvoiceModal(tx, cust)}
                        className="block text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mt-0.5 cursor-pointer ml-auto"
                      >
                        View Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
