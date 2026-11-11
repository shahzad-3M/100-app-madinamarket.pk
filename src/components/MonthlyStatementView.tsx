import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Send,
  Printer,
  Trophy,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Phone,
  FileText,
  AlertCircle,
  X,
  PackagePlus,
} from 'lucide-react';
import {
  AppUser,
  BusinessProfile,
  Customer,
  LuckyDrawEvent,
  MonthlyCustomerStatement,
  Transaction,
  UserRole,
} from '../types';
import { generateMonthlyCustomerStatements } from '../utils/automationEngine';
import { buildMonthlyStatementWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';

interface MonthlyStatementViewProps {
  customers: Customer[];
  transactions: Transaction[];
  luckyDraws: LuckyDrawEvent[];
  profile: BusinessProfile;
  userRole?: UserRole;
  currentUser?: AppUser;
}

export const MonthlyStatementView: React.FC<MonthlyStatementViewProps> = ({
  customers,
  transactions,
  luckyDraws,
  profile,
  userRole = 'customer',
  currentUser,
}) => {
  const isCustomer = userRole === 'customer';
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [printableStatement, setPrintableStatement] = useState<MonthlyCustomerStatement | null>(null);

  // Identify logged in customer strictly by customerId or phone
  const loggedInCustomer = useMemo(() => {
    if (!currentUser) return null;
    return (
      customers.find(
        (c) =>
          (currentUser.customerId && c.id === currentUser.customerId) ||
          (currentUser.phone && c.phone && c.phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''))
      ) || null
    );
  }, [customers, currentUser]);

  // Generate statements for all customers who made purchases in this entire month
  const allMonthlyStatements = useMemo(() => {
    return generateMonthlyCustomerStatements(
      customers,
      transactions,
      luckyDraws,
      selectedMonth,
      selectedYear
    );
  }, [customers, transactions, luckyDraws, selectedMonth, selectedYear]);

  // USER DIRECTIVE: Limit customer to its own boundary only; never show other account settlements or WhatsApp send!
  const monthlyStatements = useMemo(() => {
    if (isCustomer) {
      if (!loggedInCustomer) return [];
      return allMonthlyStatements.filter((st) => st.customer.id === loggedInCustomer.id);
    }
    return allMonthlyStatements;
  }, [isCustomer, loggedInCustomer, allMonthlyStatements]);

  const filteredStatements = useMemo(() => {
    if (isCustomer) {
      return monthlyStatements;
    }
    if (!searchTerm.trim()) return monthlyStatements;
    const q = searchTerm.toLowerCase();
    return monthlyStatements.filter((st) => {
      const matchName = st.customer.name.toLowerCase().includes(q);
      const matchUrdu = st.customer.urduName ? st.customer.urduName.toLowerCase().includes(q) : false;
      const matchPhone = st.customer.phone.includes(q);
      const matchCity = st.customer.city ? st.customer.city.toLowerCase().includes(q) : false;
      return matchName || matchUrdu || matchPhone || matchCity;
    });
  }, [isCustomer, monthlyStatements, searchTerm]);

  // High-level aggregates
  const totalMonthPurchases = monthlyStatements.reduce((acc, st) => acc + st.totalPurchases, 0);
  const totalMonthPaid = monthlyStatements.reduce((acc, st) => acc + st.totalPaid, 0);
  const totalMonthSavings = monthlyStatements.reduce((acc, st) => acc + st.totalSavings, 0);
  const winnersCount = monthlyStatements.filter((st) => st.luckyDrawWinnings?.hasWon).length;

  const handleSendWhatsApp = (statement: MonthlyCustomerStatement) => {
    const msg = buildMonthlyStatementWhatsAppMessage(statement, profile);
    openWhatsAppDirect(statement.customer.phone, msg);
  };

  const handleBatchSendAll = () => {
    if (monthlyStatements.length === 0) {
      alert('No monthly statements found for this period.');
      return;
    }
    const confirmSend = confirm(
      `Send WhatsApp monthly statement to ${monthlyStatements.length} customer(s) for ${monthlyStatements[0]?.monthName}?`
    );
    if (!confirmSend) return;

    monthlyStatements.forEach((st, idx) => {
      setTimeout(() => {
        const msg = buildMonthlyStatementWhatsAppMessage(st, profile);
        openWhatsAppDirect(st.customer.phone, msg);
      }, idx * 600);
    });
  };

  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & MONTH SELECTOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FFD200] text-slate-950 font-black text-xs px-2.5 py-1 rounded-md uppercase">
              {isCustomer ? 'My Khata' : 'Monthly Khata'}
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {isCustomer
                ? 'My Monthly Statement & Ledger (میرا ماہانہ کھاتہ)'
                : 'Customer Monthly Statements (ماہانہ کسٹمر اسٹیٹمنٹ)'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCustomer
              ? 'Your personal purchase records, payment receipts, discount savings, and lucky draw rewards.'
              : 'Entire month purchasing report, paid totals, savings breakdown, and Lucky Draw winning amounts.'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-amber-500 ml-1" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value} className="dark:bg-slate-900">
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer border-l border-slate-300 dark:border-slate-700 pl-1.5"
            >
              <option value={2025} className="dark:bg-slate-900">2025</option>
              <option value={2026} className="dark:bg-slate-900">2026</option>
              <option value={2027} className="dark:bg-slate-900">2027</option>
            </select>
          </div>

          {!isCustomer && (
            <button
              onClick={handleBatchSendAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send All Statements (واٹس ایپ ارسال)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isCustomer ? 'My Orders / Invoices' : 'Purchasing Customers'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {isCustomer ? (monthlyStatements[0]?.invoicesCount || 0) : monthlyStatements.length}
            </span>
            <span className="text-xs text-amber-600 font-urdu">
              {isCustomer ? 'کل آرڈرز' : 'کل خریدار کسٹمرز'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isCustomer ? 'My Month Purchases' : 'Total Monthly Sales'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {profile.currencySymbol}{totalMonthPurchases.toLocaleString('en-PK')}
            </span>
            <span className="text-xs text-emerald-600 font-urdu">ماہانہ خریداری</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isCustomer ? 'My Total Paid' : 'Total Paid / Collected'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {profile.currencySymbol}{totalMonthPaid.toLocaleString('en-PK')}
            </span>
            <span className="text-xs text-slate-400 font-urdu">وصول شدہ رقم</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isCustomer ? 'Lucky Draw Rewards' : 'Lucky Draw Winners in Month'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              {isCustomer
                ? (monthlyStatements[0]?.luckyDrawWinnings?.hasWon ? 'Winner 🏆' : 'Active ⭐')
                : winnersCount}
            </span>
            <span className="text-xs text-amber-600 font-urdu">لکی ڈرا انعام</span>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER ROW (Only for Admin) */}
      {!isCustomer && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name, Urdu name, city, phone..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
            />
          </div>

          <span className="text-xs font-mono text-slate-500">
            Showing {filteredStatements.length} statement(s)
          </span>
        </div>
      )}

      {/* 4. STATEMENTS LIST & EMPTY STATE */}
      {filteredStatements.length === 0 ? (
        isCustomer ? (
          /* USER DIRECTIVE: if nothing show nothing except common button message for all customers "add my product" direct link towards admin whatsApp */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs my-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <PackagePlus className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                No Khata Records Found for this Month
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-urdu max-w-md mx-auto">
                آپ کے ذاتی کھاتے میں اس ماہ کا کوئی بل یا بقایا رقم موجود نہیں ہے۔
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const text = 'السلام علیکم! میں مدینہ مارکیٹ پر اپنی نئی پراڈکٹ شامل / سپلائی کروانا چاہتا ہوں۔ براہ کرم تفصیلات اور طریقہ کار رہنمائی فرمائیں۔ جزاک اللہ!';
                  openWhatsAppDirect('03125256266', text);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-white shrink-0" />
                <span>Add My Product (واٹس ایپ پر اپنی پراڈکٹ شامل کروائیں)</span>
              </button>
              <span className="text-[11px] text-slate-400 block font-urdu">
                مدینہ مارکیٹ ہول سیل ایڈمن کے ساتھ براہِ راست واٹس ایپ رابطہ
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Purchases Found for Selected Month
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              اس مہینے میں کسی کسٹمر کی خریداری موجود نہیں ہے یا تاریخ منتخب کریں۔
            </p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {filteredStatements.map((st) => {
            const isExpanded = expandedCustomerId === st.customer.id;
            const hasWon = st.luckyDrawWinnings?.hasWon;

            return (
              <div
                key={st.customer.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden shadow-2xs ${
                  hasWon
                    ? 'border-amber-400/80 ring-2 ring-amber-300/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Main Summary Header */}
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  {/* Left: Customer Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center font-bold text-amber-900 dark:text-amber-200 text-sm shrink-0">
                      {st.customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {st.customer.name}
                        </h2>
                        {st.customer.urduName && (
                          <span className="font-urdu text-xs text-slate-500">
                            ({st.customer.urduName})
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {st.customer.customerType}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-mono">{st.customer.phone}</span>
                        {st.customer.city && <span>· {st.customer.city}</span>}
                        <span>· Invoices: {st.invoicesCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Financial Metrics */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Purchases</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {profile.currencySymbol}{st.totalPurchases.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Paid Amount</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {profile.currencySymbol}{st.totalPaid.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Due Balance</span>
                      <span className={`font-mono font-bold text-sm ${
                        st.closingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                      }`}>
                        {profile.currencySymbol}{st.closingBalance.toLocaleString('en-PK')}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintableStatement(st)}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Print / View Detailed Statement"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {!isCustomer && (
                      <button
                        onClick={() => handleSendWhatsApp(st)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp Statement</span>
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedCustomerId(isExpanded ? null : st.customer.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CELEBRATORY BANNER IF CUSTOMER WON IN LUCKY DRAW (User directive!) */}
                {hasWon && st.luckyDrawWinnings && (
                  <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-yellow-500/20 border-t border-b border-amber-300 dark:border-amber-700 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                        🏆
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">
                          LUCKY DRAW WINNER ({st.monthName}) - {st.luckyDrawWinnings.prizeTitle}
                        </span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-400 font-urdu">
                          مبارک ہو! یہ کسٹمر اس مہینے کے لکی ڈرا میں فاتح ہیں اور انعام کے حقدار ہیں۔
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black bg-amber-400/40 text-amber-950 dark:text-amber-200 px-2.5 py-1 rounded-md border border-amber-400">
                        Code: {st.luckyDrawWinnings.voucherCode}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-2xs">
                        Reward: {st.luckyDrawWinnings.discountValue}
                      </span>
                    </div>
                  </div>
                )}

                {/* Expanded Invoices List */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Purchases &amp; Payment Ledger Breakdown for {st.monthName}
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Invoice / Items</th>
                            <th className="py-2.5 px-3">Total Bill</th>
                            <th className="py-2.5 px-3">Paid Amount</th>
                            <th className="py-2.5 px-3">Due Balance</th>
                            <th className="py-2.5 px-3">Customer Savings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {st.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono">
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{tx.date}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  tx.type === 'credit'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                }`}>
                                  {tx.type === 'credit' ? 'SALE / BILL' : 'PAYMENT'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">
                                {tx.notes || (tx.items ? tx.items.map((i) => i.description).join(', ') : 'Wholesale items')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600">
                                {profile.currencySymbol}{(tx.paidAmount !== undefined ? tx.paidAmount : (tx.dueBalance === 0 ? tx.amount : 0)).toLocaleString('en-PK')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-amber-600">
                                {profile.currencySymbol}{(tx.dueBalance || 0).toLocaleString('en-PK')}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-600 font-semibold">
                                {profile.currencySymbol}{(tx.totalSavings || 0).toLocaleString('en-PK')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Common Button for All Customers: Add My Product Direct Link to Admin WhatsApp (USER DIRECTIVE) */}
      {isCustomer && filteredStatements.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Want to sell or add custom wholesale lots on 100DAGAR?
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-urdu block">
                اپنی دکان یا برانڈ کی پراڈکٹ 100DAGAR مارکیٹ پر شامل کروانے کے لیے ایڈمن سے رابطہ فرمائیں۔
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const text = 'السلام علیکم! میں مدینہ مارکیٹ پر اپنی نئی پراڈکٹ شامل / سپلائی کروانا چاہتا ہوں۔ براہ کرم تفصیلات اور طریقہ کار رہنمائی فرمائیں۔ جزاک اللہ!';
              openWhatsAppDirect('03125256266', text);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Add My Product (واٹس ایپ پر رابطہ)</span>
          </button>
        </div>
      )}

      {/* 5. PRINTABLE DETAILED MONTHLY STATEMENT MODAL */}
      {printableStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h2 className="font-extrabold text-sm sm:text-base">
                  Monthly Statement - {printableStatement.customer.name} ({printableStatement.monthName})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setPrintableStatement(null)}
                  className="p-1 rounded-lg hover:bg-amber-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Sheet */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-950">{profile.name}</h1>
                  <span className="text-xs font-bold text-amber-600 font-urdu block">{profile.tagline}</span>
                  <p className="text-[11px] text-slate-500 mt-1">{profile.address}</p>
                  <p className="text-[11px] text-slate-500">Phone: {profile.phone} · NTN: {profile.ntnNumber}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    MONTHLY STATEMENT
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{printableStatement.monthName}</h3>
                  <p className="text-[10px] text-slate-400">Date Generated: {new Date().toLocaleDateString('en-PK')}</p>
                </div>
              </div>

              {/* Customer Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To (کسٹمر تفصیل):</span>
                  <h3 className="font-extrabold text-sm text-slate-900">{printableStatement.customer.name}</h3>
                  {printableStatement.customer.urduName && (
                    <span className="font-urdu text-xs text-slate-600 block">{printableStatement.customer.urduName}</span>
                  )}
                  <p className="text-slate-600 mt-0.5">Mobile: {printableStatement.customer.phone}</p>
                  {printableStatement.customer.city && (
                    <p className="text-slate-600">Location: {printableStatement.customer.city}{printableStatement.customer.area ? `, ${printableStatement.customer.area}` : ''}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-500">Total Month Purchases: </span>
                    <span className="font-mono font-bold">{profile.currencySymbol}{printableStatement.totalPurchases.toLocaleString('en-PK')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Amount Paid: </span>
                    <span className="font-mono font-bold text-emerald-600">{profile.currencySymbol}{printableStatement.totalPaid.toLocaleString('en-PK')}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-800 font-bold">Closing Balance Due: </span>
                    <span className="font-mono font-extrabold text-amber-700 text-sm">{profile.currencySymbol}{printableStatement.closingBalance.toLocaleString('en-PK')}</span>
                  </div>
                </div>
              </div>

              {/* Lucky Draw Winner Banner if applicable */}
              {printableStatement.luckyDrawWinnings?.hasWon && (
                <div className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="font-extrabold text-xs text-amber-950 block">
                        LUCKY DRAW PRIZE WINNER / لکی ڈرا انعامی واؤچر
                      </span>
                      <span className="text-[11px] text-amber-800">
                        {printableStatement.luckyDrawWinnings.prizeTitle}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded text-xs block">
                      Voucher: {printableStatement.luckyDrawWinnings.voucherCode}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Value: {printableStatement.luckyDrawWinnings.discountValue}
                    </span>
                  </div>
                </div>
              )}

              {/* Invoices Table */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">Itemized Invoices &amp; Payments:</h4>
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-right">Bill Amount</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {printableStatement.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="p-2 text-slate-600">{tx.date}</td>
                        <td className="p-2 font-sans">{tx.notes || 'Wholesale order'}</td>
                        <td className="p-2 text-right font-bold">{profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}</td>
                        <td className="p-2 text-right text-emerald-600 font-bold">{profile.currencySymbol}{(tx.paidAmount || 0).toLocaleString('en-PK')}</td>
                        <td className="p-2 text-right text-amber-700 font-bold">{profile.currencySymbol}{(tx.dueBalance || 0).toLocaleString('en-PK')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Accounts */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                <h5 className="font-bold text-slate-900 mb-1">Official Payment Channels (EasyPaisa / JazzCash / SadaPay: 03125256266):</h5>
                <p className="text-slate-600">EasyPaisa / JazzCash: 03125256266 · SadaPay: 03125256266 (@100dagar) · Meezan Bank A/C: 01020304050607 (100DAGAR Enterprises)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
