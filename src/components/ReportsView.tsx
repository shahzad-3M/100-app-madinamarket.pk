import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  PieChart,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Clock,
  Sparkles,
  ShoppingBag,
  Eye,
  User,
  ShieldCheck,
} from 'lucide-react';
import { BusinessProfile, CODOrder, Customer, ProductItem, Transaction } from '../types';
import { calculateDaysOverdue, openWhatsAppDirect, formatPaymentChannelsText } from '../utils/whatsapp';
import { FinancialVisuals } from './FinancialVisuals';

interface ReportsViewProps {
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
  codOrders?: CODOrder[];
  products?: ProductItem[];
  onOpenInvoiceModal: (tx: Transaction, customer: Customer) => void;
  userRole?: string;
  currentUser?: { customerId?: string; role?: string; name?: string; phone?: string };
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  customers,
  profile,
  codOrders = [],
  products = [],
  onOpenInvoiceModal,
  userRole = 'admin',
  currentUser,
}) => {
  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'this_week'>('this_month');
  const [reportType, setReportType] = useState<'daily_closing' | 'summary' | 'daybook' | 'aging'>('daily_closing');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const todayStr = new Date().toISOString().split('T')[0];
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    return transactions.filter((tx) => {
      if (dateRange === 'all') return true;
      const txDate = new Date(tx.date);

      if (dateRange === 'this_month') {
        return txDate.getFullYear() === today.getFullYear() && txDate.getMonth() === today.getMonth();
      }
      if (dateRange === 'last_month') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return txDate.getFullYear() === lastMonth.getFullYear() && txDate.getMonth() === lastMonth.getMonth();
      }
      if (dateRange === 'this_week') {
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= oneWeekAgo;
      }
      return true;
    });
  }, [transactions, dateRange]);

  // Financial aggregates
  const totalCredit = filteredTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebit = filteredTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredit - totalDebit;
  const collectionRate = totalCredit > 0 ? Math.round((totalDebit / totalCredit) * 100) : 100;

  // Aging Analysis
  const agingAnalysis = useMemo(() => {
    return customers
      .filter((c) => c.balance > 0)
      .map((c) => {
        const custTxs = transactions.filter((t) => t.customerId === c.id && t.type === 'credit');
        let current = 0;
        let days16to30 = 0;
        let days31to60 = 0;
        let days60Plus = 0;

        custTxs.forEach((t) => {
          const days = calculateDaysOverdue(t.dueDate || t.date);
          if (days <= 15) current += t.amount;
          else if (days <= 30) days16to30 += t.amount;
          else if (days <= 60) days31to60 += t.amount;
          else days60Plus += t.amount;
        });

        return {
          customer: c,
          totalDue: c.balance,
          current: Math.min(c.balance, current),
          days16to30,
          days31to60,
          days60Plus,
        };
      })
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [customers, transactions]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Party Name', 'Phone', 'Type', 'Amount (PKR)', 'Invoice Number', 'Due Date', 'Notes', 'Payment Mode'];
    const rows = filteredTransactions.map((t) => {
      const cust = customerMap.get(t.customerId);
      return [
        t.date,
        `"${cust?.name || ''}"`,
        cust?.phone || '',
        t.type === 'credit' ? 'CREDIT (GAVE)' : 'DEBIT (GOT)',
        t.amount,
        t.invoiceNumber || '',
        t.dueDate || '',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        t.paymentMode || '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `100DAGAR_Pakistan_Ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Comprehensive Daily Closing Calculations for selectedDailyDate
  const dailyCODPlaced = useMemo(
    () => codOrders.filter((o) => o.createdAt.startsWith(selectedDailyDate)),
    [codOrders, selectedDailyDate]
  );
  const dailyWalkinCredit = useMemo(
    () => transactions.filter((t) => t.date === selectedDailyDate && t.type === 'credit'),
    [transactions, selectedDailyDate]
  );
  const totalOrdersPlacedCount = dailyCODPlaced.length + dailyWalkinCredit.length;
  const totalOrdersPlacedAmount =
    dailyCODPlaced.reduce((s, o) => s + o.totalAmount, 0) +
    dailyWalkinCredit.reduce((s, t) => s + t.amount, 0);

  // Delivered Today
  const dailyCODDelivered = useMemo(
    () =>
      codOrders.filter(
        (o) =>
          o.status === 'delivered' &&
          (o.deliveredAt?.startsWith(selectedDailyDate) || o.createdAt.startsWith(selectedDailyDate))
      ),
    [codOrders, selectedDailyDate]
  );
  const totalDeliveredCount = dailyCODDelivered.length;
  const totalDeliveredCash = dailyCODDelivered.reduce((s, o) => s + o.totalAmount, 0);

  // Payments / Amount Collected Today (Broken down by channels)
  const dailyDebits = useMemo(
    () => transactions.filter((t) => t.date === selectedDailyDate && t.type === 'debit'),
    [transactions, selectedDailyDate]
  );

  const cashChannelSum = dailyDebits
    .filter((t) => !t.paymentMode || t.paymentMode === 'cash')
    .reduce((s, t) => s + t.amount, 0);
  const codChannelSum = totalDeliveredCash + dailyDebits
    .filter((t) => t.paymentMode === 'cod')
    .reduce((s, t) => s + t.amount, 0);
  const easyPaisaChannelSum = dailyDebits
    .filter((t) => t.paymentMode === 'easypaisa')
    .reduce((s, t) => s + t.amount, 0);
  const jazzCashChannelSum = dailyDebits
    .filter((t) => t.paymentMode === 'jazzcash')
    .reduce((s, t) => s + t.amount, 0);
  const sadaPayChannelSum = dailyDebits
    .filter((t) => t.paymentMode === 'sadapay')
    .reduce((s, t) => s + t.amount, 0);
  const bankChannelSum = dailyDebits
    .filter((t) => t.paymentMode === 'bank_transfer')
    .reduce((s, t) => s + t.amount, 0);

  const totalAmountCollectedToday =
    cashChannelSum +
    codChannelSum +
    easyPaisaChannelSum +
    jazzCashChannelSum +
    sadaPayChannelSum +
    bankChannelSum;

  // Shipments Ready to Deliver (Pipeline)
  const pendingPackingOrders = useMemo(
    () => codOrders.filter((o) => o.status === 'pending'),
    [codOrders]
  );
  const dispatchedOrders = useMemo(
    () => codOrders.filter((o) => o.status === 'dispatched'),
    [codOrders]
  );
  const totalReadyToDeliverCount = pendingPackingOrders.length + dispatchedOrders.length;
  const totalReadyToDeliverValue =
    pendingPackingOrders.reduce((s, o) => s + o.totalAmount, 0) +
    dispatchedOrders.reduce((s, o) => s + o.totalAmount, 0);

  // Total Returns Today
  const dailyReturns = useMemo(
    () =>
      codOrders.filter(
        (o) =>
          o.status === 'returned' &&
          (o.returnedAt?.startsWith(selectedDailyDate) || o.createdAt.startsWith(selectedDailyDate))
      ),
    [codOrders, selectedDailyDate]
  );
  const totalReturnsCount = dailyReturns.length;
  const totalReturnsValue = dailyReturns.reduce((s, o) => s + o.totalAmount, 0);

  // Low Stock Items Alert (stockQty <= minStockAlert)
  const lowStockAlertItems = useMemo(
    () => products.filter((p) => p.stockQty <= (p.minStockAlert || 10)),
    [products]
  );

  const handleSendDailyClosingWhatsApp = () => {
    const cleanPhone = (profile.phone || '03125256266').replace(/\D/g, '');
    const msg = `📊 *ڈیلی کلوزنگ و روزنامچہ رپورٹ / Daily Closing Report*\n*${profile.name}*\n*تاریخ:* ${selectedDailyDate}\n\n*1. کل موصولہ رقم:* ${profile.currencySymbol}${totalAmountCollectedToday.toLocaleString('en-PK')}\n• دکان نقد: ${profile.currencySymbol}${cashChannelSum.toLocaleString('en-PK')}\n• آن لائن چینلز: ${profile.currencySymbol}${(easyPaisaChannelSum + jazzCashChannelSum + sadaPayChannelSum + bankChannelSum).toLocaleString('en-PK')}\n\n*2. آج کے آرڈرز:* ${totalOrdersPlacedCount} (${profile.currencySymbol}${totalOrdersPlacedAmount.toLocaleString('en-PK')})\n*3. ڈلیور شدہ پارسلز:* ${totalDeliveredCount} (${profile.currencySymbol}${totalDeliveredCash.toLocaleString('en-PK')})\n*4. کم اسٹاک الرٹ:* ${lowStockAlertItems.length} آئٹمز`;
    openWhatsAppDirect(cleanPhone, msg);
  };

  // DEDICATED CUSTOMER REPORTS & SAVINGS PORTAL (USER DIRECTIVE: customer-scoped reports visibility)
  if (userRole === 'customer') {
    let matchedCustomer = customers[0];
    if (currentUser?.customerId) {
      const found = customers.find((c) => c.id === currentUser.customerId);
      if (found) matchedCustomer = found;
    } else if (currentUser?.phone) {
      const clean = currentUser.phone.replace(/\D/g, '');
      const found = customers.find((c) => c.phone.replace(/\D/g, '') === clean);
      if (found) matchedCustomer = found;
    }

    const custTxs = transactions.filter((t) => t.customerId === matchedCustomer?.id);
    const custTotalPurchases = custTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const custTotalPaid = custTxs.reduce((s, t) => s + (t.paidAmount || (t.type === 'debit' ? t.amount : 0)), 0);
    const custBalance = Math.max(0, custTotalPurchases - custTotalPaid);
    const custTotalSavings = custTxs.reduce((s, t) => s + (t.totalSavings || 0), 0);
    const custOrdersCount = custTxs.filter((t) => t.type === 'credit').length;

    return (
      <div className="space-y-6">
        {/* Customer Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-2xs">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  My Purchases &amp; Savings Report
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {matchedCustomer ? matchedCustomer.name : 'Customer Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                خلاصہ و بچت رپورٹ - Your complete personal spending overview, instant savings, and invoice history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* 4 Customer KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Orders
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {custOrdersCount} Orders
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Purchases to date
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Purchases
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {profile.currencySymbol}{custTotalPurchases.toLocaleString('en-PK')}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Wholesale lot spend
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total Wholesale Savings (بچت)
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {profile.currencySymbol}{custTotalSavings.toLocaleString('en-PK')}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Saved compared to retail prices
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {custBalance === 0 ? 'Clear (صاف)' : `${profile.currencySymbol}${custBalance.toLocaleString('en-PK')}`}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Total Paid: {profile.currencySymbol}{custTotalPaid.toLocaleString('en-PK')}
            </span>
          </div>
        </div>

        {/* Invoices & Purchase History for Customer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>My Invoices &amp; Transaction Statements</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {custTxs.length} Record(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Items / Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Your Savings</th>
                  <th className="py-2.5 px-3 text-center">Payment Mode</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {custTxs.map((tx) => {
                  const isPaid = tx.paidAmount && tx.paidAmount >= tx.amount;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono">{tx.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-600">
                        {tx.invoiceNumber || `INV-${tx.id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="py-2.5 px-3">
                        {tx.items && tx.items.length > 0 ? (
                          <span>{tx.items.map((i) => `${i.description} (×${i.quantity})`).join(', ')}</span>
                        ) : (
                          <span>{tx.notes || (tx.type === 'credit' ? 'Product Order' : 'Payment Received')}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                        {tx.totalSavings ? `${profile.currencySymbol}${tx.totalSavings.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center uppercase font-mono text-[10px]">
                        {tx.paymentMode || 'cash'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isPaid ? 'PAID' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {matchedCustomer && (
                          <button
                            type="button"
                            onClick={() => onOpenInvoiceModal(tx, matchedCustomer)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 font-bold text-[11px] cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-amber-500" />
                            <span>View</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {custTxs.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No orders recorded in your history yet.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Ledger Reports &amp; Financial Daybook (مالیاتی گوشوارہ)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comprehensive credit vs. debit ledger analysis, collection efficiency, and customer aging for 100DAGAR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setDateRange('this_month')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  dateRange === 'this_month'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateRange('last_month')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  dateRange === 'last_month'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => setDateRange('this_week')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  dateRange === 'this_week'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  dateRange === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Time
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500">Credit Extended (ادھار دیا)</span>
            <p className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
              {profile.currencySymbol} {totalCredit.toLocaleString('en-PK')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Payments Received (وصولی کی)</span>
            <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {profile.currencySymbol} {totalDebit.toLocaleString('en-PK')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Net Receivable Delta</span>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {profile.currencySymbol} {netBalance.toLocaleString('en-PK')}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Collection Recovery Rate</span>
            <p className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
              {collectionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Visual Analytics Graphs */}
      <FinancialVisuals
        transactions={filteredTransactions}
        customers={customers}
        profile={profile}
      />

      {/* Report View Toggle */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit text-xs font-semibold no-print">
        <button
          onClick={() => setReportType('daily_closing')}
          className={`px-3 py-1.5 rounded-md cursor-pointer ${
            reportType === 'daily_closing'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Daily Closing &amp; Audit Report (ڈیلی روزنامچہ)
        </button>
        <button
          onClick={() => setReportType('summary')}
          className={`px-3 py-1.5 rounded-md cursor-pointer ${
            reportType === 'summary'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Customer Aging Analysis ({agingAnalysis.length})
        </button>
        <button
          onClick={() => setReportType('daybook')}
          className={`px-3 py-1.5 rounded-md cursor-pointer ${
            reportType === 'daybook'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Daybook Transactions Log ({filteredTransactions.length})
        </button>
      </div>

      {/* REPORT 0: Comprehensive Daily Closing Report */}
      {reportType === 'daily_closing' && (
        <div className="space-y-6">
          {/* Daily Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Select Closing Date (تاریخ منتخب کریں):
              </span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline">
                Carrier: {profile.shippingPartner?.name || 'WASAL delivery'} (Shipday Synced)
              </span>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleSendDailyClosingWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Daily Summary to Owner</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Daily Closing</span>
              </button>
            </div>
          </div>

          {/* 6 Key Operational Metrics (USER DIRECTIVE: daily report cover all order placed order deliverd amount collected shipment redy to deliver to tal returns, low stock items) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Orders Placed Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Orders Placed</span>
                <span className="p-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {totalOrdersPlacedCount}
              </p>
              <span className="text-[10px] text-slate-400 block font-mono">
                {profile.currencySymbol}{totalOrdersPlacedAmount.toLocaleString('en-PK')}
              </span>
            </div>

            {/* 2. Orders Delivered Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Delivered Today</span>
                <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {totalDeliveredCount}
              </p>
              <span className="text-[10px] text-slate-400 block font-mono">
                COD Cash: {profile.currencySymbol}{totalDeliveredCash.toLocaleString('en-PK')}
              </span>
            </div>

            {/* 3. Total Amount Collected Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Total Collected</span>
                <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {profile.currencySymbol}{totalAmountCollectedToday.toLocaleString('en-PK')}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Across all channels
              </span>
            </div>

            {/* 4. Shipments Ready to Deliver */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Ready to Deliver</span>
                <span className="p-1 rounded bg-amber-50 dark:bg-amber-950 text-amber-600">
                  <Truck className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                {totalReadyToDeliverCount}
              </p>
              <span className="text-[10px] text-slate-400 block font-mono">
                {profile.currencySymbol}{totalReadyToDeliverValue.toLocaleString('en-PK')} (In Pipeline)
              </span>
            </div>

            {/* 5. Total Returns Today */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Total Returns</span>
                <span className="p-1 rounded bg-red-50 dark:bg-red-950 text-red-600">
                  <RotateCcw className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-red-600 dark:text-red-400">
                {totalReturnsCount}
              </p>
              <span className="text-[10px] text-slate-400 block font-mono">
                {profile.currencySymbol}{totalReturnsValue.toLocaleString('en-PK')} (Restored)
              </span>
            </div>

            {/* 6. Low Stock Alert Items */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Low Stock Alert</span>
                <span className="p-1 rounded bg-rose-50 dark:bg-rose-950 text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                {lowStockAlertItems.length} Items
              </p>
              <span className="text-[10px] text-slate-400 block">
                Stock &le; Alert Level
              </span>
            </div>
          </div>

          {/* Amount Collected Breakdown by Pakistani Payment Channels */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Payment Channels Collection Breakdown (موصول رقم کی چینل وار تفصیل)
                </h2>
                <span className="text-xs text-slate-500">
                  Collected on {selectedDailyDate} via Cash, WASAL COD, EasyPaisa, JazzCash, SadaPay, and Bank Account.
                </span>
              </div>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                Total: {profile.currencySymbol}{totalAmountCollectedToday.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Cash Counter */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">💵 Counter Cash</span>
                <p className="text-base font-mono font-black text-slate-900 dark:text-white mt-1">
                  {profile.currencySymbol}{cashChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-slate-400 block">Walk-in Store Drawer</span>
              </div>

              {/* COD (WASAL delivery) */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold block">
                  🚚 COD ({profile.shippingPartner?.name || 'WASAL delivery'})
                </span>
                <p className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {profile.currencySymbol}{codChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 block">Shipday Manifest</span>
              </div>

              {/* EasyPaisa */}
              <div className="p-3 bg-green-50/70 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-800">
                <span className="text-[10px] text-green-800 dark:text-green-300 uppercase font-bold block">
                  📱 EasyPaisa (03125256266)
                </span>
                <p className="text-base font-mono font-black text-green-700 dark:text-green-400 mt-1">
                  {profile.currencySymbol}{easyPaisaChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-slate-400 block">Instant Wallet</span>
              </div>

              {/* JazzCash */}
              <div className="p-3 bg-red-50/70 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800">
                <span className="text-[10px] text-red-800 dark:text-red-300 uppercase font-bold block">
                  🔴 JazzCash (03125256266)
                </span>
                <p className="text-base font-mono font-black text-red-700 dark:text-red-400 mt-1">
                  {profile.currencySymbol}{jazzCashChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-slate-400 block">Mobile Account</span>
              </div>

              {/* SadaPay */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800">
                <span className="text-[10px] text-teal-800 dark:text-teal-300 uppercase font-bold block">
                  💳 SadaPay (@100dagar)
                </span>
                <p className="text-base font-mono font-black text-teal-700 dark:text-teal-400 mt-1">
                  {profile.currencySymbol}{sadaPayChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-slate-400 block">0312 5256 266</span>
              </div>

              {/* Bank Transfer */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] text-blue-800 dark:text-blue-300 uppercase font-bold block">
                  🏦 Meezan Bank IBAN
                </span>
                <p className="text-base font-mono font-black text-blue-700 dark:text-blue-400 mt-1">
                  {profile.currencySymbol}{bankChannelSum.toLocaleString('en-PK')}
                </p>
                <span className="text-[9px] text-slate-400 block">Direct Transfer</span>
              </div>
            </div>
          </div>

          {/* Two-Column Detail: Pipeline Shipments & Low Stock Alert Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Shipments Ready to Deliver (Pipeline) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200">
                    Shipments Ready / In Delivery ({totalReadyToDeliverCount})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {profile.shippingPartner?.name || 'WASAL delivery'}
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {[...pendingPackingOrders, ...dispatchedOrders].length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">
                    All shipments are cleared and settled!
                  </p>
                ) : (
                  [...pendingPackingOrders, ...dispatchedOrders].map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-750 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span>#{ord.orderNumber}</span>
                          <span className="text-slate-400 font-normal">· {ord.customerName}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              ord.status === 'dispatched'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">
                          {ord.city} · Trk: {ord.trackingNumber || 'WSL-PENDING'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {profile.currencySymbol}{ord.totalAmount.toLocaleString('en-PK')}
                        </span>
                        <span className="text-[9px] text-slate-400 block">COD Amount</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Low Stock Alert Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200">
                    Low Stock Alert Items ({lowStockAlertItems.length})
                  </h3>
                </div>
                <span className="text-[10px] text-rose-600 font-bold uppercase">
                  Re-order required
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {lowStockAlertItems.length === 0 ? (
                  <p className="text-center py-6 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    ✓ All inventory products are well above minimum alert thresholds!
                  </p>
                ) : (
                  lowStockAlertItems.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {prod.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          SKU: {prod.sku} · {prod.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 text-xs">
                          Qty: {prod.stockQty} left
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Min Alert: {prod.minStockAlert}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 1: Customer Aging Analysis */}
      {reportType === 'summary' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Accounts Receivable Aging Analysis (تاخیر شدہ واجبات کی درجہ بندی)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorization of customer dues by payment delay days for collection follow-ups
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Customer Party</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Due</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">
                    Current (0-15d)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">
                    16-30 Days
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right text-orange-600 dark:text-orange-400">
                    31-60 Days
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right text-red-600 dark:text-red-400">
                    &gt; 60 Days
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agingAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No overdue balances found!
                    </td>
                  </tr>
                ) : (
                  agingAnalysis.map(({ customer, totalDue, current, days16to30, days31to60, days60Plus }) => (
                    <tr key={customer.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/70">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {customer.name} {customer.urduName && <span className="font-normal font-sans text-slate-500">({customer.urduName})</span>}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">{customer.phone}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {profile.currencySymbol} {totalDue.toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {current > 0 ? `${profile.currencySymbol} ${current.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {days16to30 > 0 ? `${profile.currencySymbol} ${days16to30.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-orange-600 dark:text-orange-400">
                        {days31to60 > 0 ? `${profile.currencySymbol} ${days31to60.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-red-600 dark:text-red-400">
                        {days60Plus > 0 ? `${profile.currencySymbol} ${days60Plus.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center no-print whitespace-nowrap">
                        <button
                          onClick={() => {
                            const paymentText = formatPaymentChannelsText(profile);
                            const msg = `*Payment Reminder / یاد دہانی*\n*${profile.name}*\n\nمحترم ${customer.name} صاحب،\nآپ کے کھاتے میں بقایا رقم: *${profile.currencySymbol} ${totalDue.toLocaleString('en-PK')}*\nبرائے مہربانی ادائیگی کر دیں۔\n\n*Payment Channels:*\n${paymentText}\n\nشکریہ!`;
                            openWhatsAppDirect(customer.phone, msg);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Remind
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: Daybook Log */}
      {reportType === 'daybook' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Daybook Register / روزنامچہ کھاتہ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredTransactions.length} total entries recorded in this period
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Party</th>
                  <th className="py-2.5 px-3 font-semibold">Details / Remarks</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">Credit (ادھار)</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">Debit (وصولی)</th>
                  <th className="py-2.5 px-3 font-semibold text-center no-print">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const cust = customerMap.get(tx.customerId);
                  const isCredit = tx.type === 'credit';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/70">
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {cust?.name || 'Party'} {cust?.urduName && <span className="font-normal text-slate-500 font-sans">({cust.urduName})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {tx.notes || (isCredit ? 'Credit invoice' : 'Payment received')}
                        {tx.invoiceNumber && <span className="ml-1 font-mono text-[10px] text-slate-400">#{tx.invoiceNumber}</span>}
                        {tx.paymentMode && <span className="ml-1 uppercase text-[10px] font-semibold text-emerald-600">({tx.paymentMode})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        {isCredit ? `${profile.currencySymbol} ${tx.amount.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {!isCredit ? `${profile.currencySymbol} ${tx.amount.toLocaleString('en-PK')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        {cust && (
                          <button
                            onClick={() => onOpenInvoiceModal(tx, cust)}
                            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
