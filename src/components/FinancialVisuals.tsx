import React, { useState } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';
import { BusinessProfile, Customer, Transaction } from '../types';
import { calculateDaysOverdue } from '../utils/whatsapp';

interface FinancialVisualsProps {
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
  onSelectCustomer?: (customerId: string) => void;
}

export const FinancialVisuals: React.FC<FinancialVisualsProps> = ({
  transactions,
  customers,
  profile,
  onSelectCustomer,
}) => {
  const [activeVisualTab, setActiveVisualTab] = useState<'trends' | 'aging' | 'debtors'>('trends');

  // Compute monthly trends (last 6 months)
  const monthlyData = React.useMemo(() => {
    const monthsMap = new Map<string, { monthLabel: string; credit: number; debit: number }>();
    const now = new Date();

    // Prepare 6 months back
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      monthsMap.set(key, { monthLabel, credit: 0, debit: 0 });
    }

    transactions.forEach((tx) => {
      const ym = tx.date.substring(0, 7);
      if (monthsMap.has(ym)) {
        const item = monthsMap.get(ym)!;
        if (tx.type === 'credit') {
          item.credit += tx.amount;
        } else {
          item.debit += tx.amount;
        }
      }
    });

    return Array.from(monthsMap.values());
  }, [transactions]);

  const maxMonthValue = Math.max(
    ...monthlyData.map((d) => Math.max(d.credit, d.debit)),
    10000
  );

  // Aging distribution
  const agingData = React.useMemo(() => {
    let current = 0;
    let days16to30 = 0;
    let days31to60 = 0;
    let days60Plus = 0;
    let totalDue = 0;

    customers.forEach((c) => {
      if (c.balance > 0) {
        totalDue += c.balance;
        const custTxs = transactions.filter((t) => t.customerId === c.id && t.type === 'credit');

        custTxs.forEach((t) => {
          const days = calculateDaysOverdue(t.dueDate || t.date);
          if (days <= 15) current += t.amount;
          else if (days <= 30) days16to30 += t.amount;
          else if (days <= 60) days31to60 += t.amount;
          else days60Plus += t.amount;
        });
      }
    });

    const sum = (current + days16to30 + days31to60 + days60Plus) || 1;
    return {
      current,
      days16to30,
      days31to60,
      days60Plus,
      totalDue,
      currentPct: Math.round((current / sum) * 100),
      days16to30Pct: Math.round((days16to30 / sum) * 100),
      days31to60Pct: Math.round((days31to60 / sum) * 100),
      days60PlusPct: Math.round((days60Plus / sum) * 100),
    };
  }, [customers, transactions]);

  // Top 5 debtors for visual ranking
  const topDebtors = React.useMemo(() => {
    const list = [...customers].filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
    const maxBal = list[0]?.balance || 1;
    return list.map((c) => ({
      customer: c,
      balance: c.balance,
      percentage: Math.round((c.balance / maxBal) * 100),
    }));
  }, [customers]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Financial Visuals &amp; Collection Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive visual charts for Credit (Udhaar) vs. Debit (Jama) flow and customer aging
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveVisualTab('trends')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeVisualTab === 'trends'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Cashflow Trends
          </button>
          <button
            onClick={() => setActiveVisualTab('aging')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeVisualTab === 'aging'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Aging Breakdown
          </button>
          <button
            onClick={() => setActiveVisualTab('debtors')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeVisualTab === 'debtors'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Top Debtors Visual
          </button>
        </div>
      </div>

      {/* VISUAL 1: Cashflow Trends (Monthly Credit vs Debit Bars) */}
      {activeVisualTab === 'trends' && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span>
                Credit Given (Udhaar / Billed)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block"></span>
                Payment Received (Jama)
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Last 6 Months Activity</span>
          </div>

          {/* SVG Interactive Bar Chart */}
          <div className="h-56 w-full pt-2">
            <div className="h-full flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              {monthlyData.map((item, idx) => {
                const creditHeight = Math.max(8, Math.round((item.credit / maxMonthValue) * 100));
                const debitHeight = Math.max(8, Math.round((item.debit / maxMonthValue) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-24 bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap">
                      <p className="font-bold">{item.monthLabel}</p>
                      <p className="text-amber-400">Credit: {profile.currencySymbol} {item.credit.toLocaleString('en-PK')}</p>
                      <p className="text-emerald-400">Debit: {profile.currencySymbol} {item.debit.toLocaleString('en-PK')}</p>
                    </div>

                    {/* Bars pair */}
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      {/* Credit Bar */}
                      <div
                        style={{ height: `${creditHeight}%` }}
                        className="w-full max-w-[20px] bg-amber-500 hover:bg-amber-400 rounded-t-xs transition-all relative"
                      ></div>
                      {/* Debit Bar */}
                      <div
                        style={{ height: `${debitHeight}%` }}
                        className="w-full max-w-[20px] bg-emerald-600 hover:bg-emerald-500 rounded-t-xs transition-all relative"
                      ></div>
                    </div>

                    {/* Month Label */}
                    <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-2">
                      {item.monthLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISUAL 2: Aging Distribution Visual Bar */}
      {activeVisualTab === 'aging' && (
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Total Outstanding Portfolio: <span className="font-mono text-red-600 dark:text-red-400">{profile.currencySymbol} {agingData.totalDue.toLocaleString('en-PK')}</span>
            </span>
            <span className="text-slate-400 text-[11px]">Aging Risk Analysis</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-6 w-full rounded-lg overflow-hidden flex bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
            <div
              style={{ width: `${Math.max(5, agingData.currentPct)}%` }}
              title={`Current (0-15d): ${profile.currencySymbol} ${agingData.current.toLocaleString('en-PK')}`}
              className="bg-emerald-500 rounded-xs flex items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden"
            >
              {agingData.currentPct > 10 && `${agingData.currentPct}%`}
            </div>
            <div
              style={{ width: `${Math.max(5, agingData.days16to30Pct)}%` }}
              title={`16-30 Days: ${profile.currencySymbol} ${agingData.days16to30.toLocaleString('en-PK')}`}
              className="bg-amber-500 rounded-xs flex items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden"
            >
              {agingData.days16to30Pct > 10 && `${agingData.days16to30Pct}%`}
            </div>
            <div
              style={{ width: `${Math.max(5, agingData.days31to60Pct)}%` }}
              title={`31-60 Days: ${profile.currencySymbol} ${agingData.days31to60.toLocaleString('en-PK')}`}
              className="bg-orange-500 rounded-xs flex items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden"
            >
              {agingData.days31to60Pct > 10 && `${agingData.days31to60Pct}%`}
            </div>
            <div
              style={{ width: `${Math.max(5, agingData.days60PlusPct)}%` }}
              title={`60+ Days Overdue: ${profile.currencySymbol} ${agingData.days60Plus.toLocaleString('en-PK')}`}
              className="bg-red-600 rounded-xs flex items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden"
            >
              {agingData.days60PlusPct > 10 && `${agingData.days60PlusPct}%`}
            </div>
          </div>

          {/* Detailed Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">
                Current (0-15d)
              </span>
              <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {profile.currencySymbol} {agingData.current.toLocaleString('en-PK')}
              </span>
              <span className="text-[10px] text-emerald-600 block">{agingData.currentPct}% of total</span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block">
                16-30 Days
              </span>
              <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                {profile.currencySymbol} {agingData.days16to30.toLocaleString('en-PK')}
              </span>
              <span className="text-[10px] text-amber-600 block">{agingData.days16to30Pct}% of total</span>
            </div>

            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
              <span className="text-[11px] font-semibold text-orange-800 dark:text-orange-300 block">
                31-60 Days
              </span>
              <span className="text-sm font-bold font-mono text-orange-700 dark:text-orange-400">
                {profile.currencySymbol} {agingData.days31to60.toLocaleString('en-PK')}
              </span>
              <span className="text-[10px] text-orange-600 block">{agingData.days31to60Pct}% of total</span>
            </div>

            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <span className="text-[11px] font-semibold text-red-800 dark:text-red-300 block">
                &gt;60 Days Overdue
              </span>
              <span className="text-sm font-bold font-mono text-red-700 dark:text-red-400">
                {profile.currencySymbol} {agingData.days60Plus.toLocaleString('en-PK')}
              </span>
              <span className="text-[10px] text-red-600 block">{agingData.days60PlusPct}% of total</span>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL 3: Top Debtors Visual Ranking */}
      {activeVisualTab === 'debtors' && (
        <div className="pt-4 space-y-3">
          <div className="text-xs text-slate-500 mb-2">
            Top customer credit exposures relative to highest debtor balance:
          </div>
          {topDebtors.map(({ customer, balance, percentage }) => (
            <div
              key={customer.id}
              onClick={() => onSelectCustomer && onSelectCustomer(customer.id)}
              className="space-y-1 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {customer.name}
                  {customer.urduName && (
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      ({customer.urduName})
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {profile.currencySymbol} {balance.toLocaleString('en-PK')}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${percentage}%` }}
                  className="bg-red-500 dark:bg-red-600 h-full rounded-full transition-all group-hover:bg-red-600"
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
