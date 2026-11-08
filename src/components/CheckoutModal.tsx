import React, { useState } from 'react';
import {
  X,
  Check,
  ShoppingBag,
  Percent,
  Calendar,
  CreditCard,
  User,
  Phone,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { BusinessProfile, CartItem, Customer, PaymentMode, SalePaymentType, Transaction } from '../types';
import { formatPaymentChannelsText, openWhatsAppDirect } from '../utils/whatsapp';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customers: Customer[];
  profile: BusinessProfile;
  isCustomerView?: boolean;
  isAdmin?: boolean;
  onCompleteSale: (
    saleData: {
      customerId: string;
      saleType: SalePaymentType;
      paidAmount: number;
      dueBalance: number;
      paymentMode: PaymentMode;
      paymentTermsDays: number;
      dueDate: string;
      notes: string;
      sendWhatsApp: boolean;
      resellerCode?: string;
    }
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  customers,
  profile,
  isCustomerView = false,
  isAdmin = true,
  onCompleteSale,
}) => {
  if (!isOpen) return null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [saleType, setSaleType] = useState<SalePaymentType>(isCustomerView ? 'cod' : 'full');
  const [partialPaidInput, setPartialPaidInput] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(isCustomerView ? 'cod' : 'easypaisa');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(7); // USER DIRECTIVE: payment terms 7 days
  const [resellerCode, setResellerCode] = useState<string>('');

  const [customDueDate, setCustomDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default 7 days
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Cart totals
  const totalMarketPrice = cart.reduce((acc, it) => acc + it.marketPrice * it.quantity, 0);
  const totalOurPrice = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalSavings = totalMarketPrice - totalOurPrice;
  const savingsPercent = totalMarketPrice > 0 ? Math.round((totalSavings / totalMarketPrice) * 100) : 0;

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculate paid & due amounts based on sale type
  let paidAmount = totalOurPrice;
  let dueBalance = 0;

  if (saleType === 'partial') {
    const parsed = parseFloat(partialPaidInput) || 0;
    paidAmount = Math.min(totalOurPrice, Math.max(0, parsed));
    dueBalance = Math.max(0, totalOurPrice - paidAmount);
  } else if (saleType === 'time_credit') {
    paidAmount = 0;
    dueBalance = totalOurPrice;
  }

  // Calculate automated reminder dates based on due date
  const dueDateObj = new Date(customDueDate);
  const softDateObj = new Date(dueDateObj);
  softDateObj.setDate(softDateObj.getDate() - 3);
  const softReminderDate = softDateObj.toISOString().split('T')[0];

  const graceDateObj = new Date(dueDateObj);
  graceDateObj.setDate(graceDateObj.getDate() + 7);
  const maxGraceDate = graceDateObj.toISOString().split('T')[0];

  const handleTermsDaysChange = (days: number) => {
    setPaymentTermsDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setCustomDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select or specify a customer.');
      return;
    }

    onCompleteSale({
      customerId: selectedCustomerId,
      saleType,
      paidAmount,
      dueBalance,
      paymentMode,
      paymentTermsDays,
      dueDate: customDueDate,
      notes: notes || `Sale: ${cart.map((c) => `${c.product.name} (${c.quantity}x)`).join(', ')}`,
      sendWhatsApp,
      resellerCode: resellerCode.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Complete Sale &amp; Payment Terms (فروخت اور ادائیگی شرائط)
              </h2>
              <span className="text-[11px] font-medium text-slate-800">
                100DAGAR · مدینہ مارکیٹ | {isCustomerView ? 'Online Store Checkout' : 'POS Cashier Terminal'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* 1. Customer Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Select Customer (کسٹمر کا انتخاب کریں)</span>
              {selectedCustomer && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedCustomer.customerType === 'retail'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {selectedCustomer.customerType === 'retail' ? '🏪 Retail Store' : '👤 Individual'}
                </span>
              )}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const cust = customers.find((c) => c.id === e.target.value);
                if (cust?.paymentTermsDays) {
                  handleTermsDaysChange(cust.paymentTermsDays);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.urduName ? `(${c.urduName})` : ''} - {c.phone} [{c.customerType === 'retail' ? 'Retailer' : 'Individual'}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cart Summary & Customer Savings Banner */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span>{cart.length} Products Ordered</span>
              <span className="font-mono">
                {profile.currencySymbol}{totalOurPrice.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[11px]">
              {cart.map((it) => (
                <div key={it.product.id} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="truncate max-w-[280px]">
                    {it.product.name} ({it.quantity}x)
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 line-through">
                      {profile.currencySymbol}{(it.marketPrice * it.quantity).toLocaleString('en-PK')}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {profile.currencySymbol}{(it.unitPrice * it.quantity).toLocaleString('en-PK')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Customer Savings Highlight */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 px-3 py-1.5 rounded-lg font-bold">
              <div className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                <span>Customer Total Savings (کسٹمر کی کل بچت):</span>
              </div>
              <span className="font-mono text-sm">
                {profile.currencySymbol}{totalSavings.toLocaleString('en-PK')} ({savingsPercent}% OFF)
              </span>
            </div>
          </div>

          {/* 3. Sale Payment Type (Full, Partial, Time-Based Credit, Cash on Delivery) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Payment Terms &amp; Settlement Mode (ادائیگی کی قسم)
              </label>
              {isCustomerView && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Online Buyer Terms Active
                </span>
              )}
            </div>

            {/* ONLINE BUYER LOCKED TERMS NOTICE (USER DIRECTIVE) */}
            {isCustomerView && (
              <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Credit &amp; Partial Payment Locked for Online Buyers (آن لائن گاہکوں کے لیے ادھار مقفل ہے):</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  قسط ادھار کھاتہ اور جزوی ادائیگی صرف واک ان دکان (Walk-in store) اور ایڈمن سے منظور شدہ اکاؤنٹس کے لیے مخصوص ہے۔ آن لائن خریدار <b>کیش آن ڈلیوری (Cash on Delivery)</b> یا <b>مکمل آن لائن ادائیگی (Full Paid)</b> منتخب کر سکتے ہیں۔
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaleType('full');
                  if (paymentMode === 'cod') setPaymentMode('easypaisa');
                }}
                className={`py-2 px-2.5 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                  saleType === 'full'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Full Paid</span>
                <span className="block text-[10px] font-normal mt-0.5">مکمل نقد وصولی</span>
              </button>

              {/* Partial Paid: Locked if isCustomerView */}
              <button
                type="button"
                disabled={isCustomerView}
                onClick={() => {
                  if (isCustomerView) return;
                  setSaleType('partial');
                  if (paymentMode === 'cod') setPaymentMode('easypaisa');
                }}
                className={`py-2 px-2.5 rounded-lg border text-center font-bold transition-all relative ${
                  isCustomerView
                    ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                    : saleType === 'partial'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 ring-2 ring-amber-400 cursor-pointer'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {isCustomerView && (
                  <span className="absolute -top-1.5 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
                <span>Partial Paid</span>
                <span className="block text-[10px] font-normal mt-0.5">
                  {isCustomerView ? 'واک ان دکان فقط' : 'جزوی ایڈوانس'}
                </span>
              </button>

              {/* Time Credit: Locked if isCustomerView */}
              <button
                type="button"
                disabled={isCustomerView}
                onClick={() => {
                  if (isCustomerView) return;
                  setSaleType('time_credit');
                  if (paymentMode === 'cod') setPaymentMode('easypaisa');
                }}
                className={`py-2 px-2.5 rounded-lg border text-center font-bold transition-all relative ${
                  isCustomerView
                    ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                    : saleType === 'time_credit'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 ring-2 ring-blue-400 cursor-pointer'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {isCustomerView && (
                  <span className="absolute -top-1.5 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
                <span>Time Credit</span>
                <span className="block text-[10px] font-normal mt-0.5">
                  {isCustomerView ? 'واک ان دکان فقط' : 'قسط ادھار کھاتہ'}
                </span>
              </button>

              {/* Cash on Delivery (COD) */}
              <button
                type="button"
                onClick={() => {
                  setSaleType('cod');
                  setPaymentMode('cod');
                }}
                className={`py-2 px-2.5 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                  saleType === 'cod'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 ring-2 ring-rose-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Cash on Delivery</span>
                <span className="block text-[10px] font-normal mt-0.5">رائڈر وصول کرے گا</span>
              </button>
            </div>
          </div>

          {/* Special COD Removal Rule Highlight (User Directive: remove account details for sending inbox) */}
          {saleType === 'cod' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-600" /> Cash on Delivery (COD) Clean Inbox Policy:
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                Online bank details (EasyPaisa, JazzCash, SadaPay 03125256266) are completely removed from the WhatsApp receipt sent to customer inbox. Parcel will be marked with clear rider instruction: <i>"Collect Cash Rs. {totalOurPrice.toLocaleString('en-PK')} on delivery."</i>
              </p>
            </div>
          )}

          {/* Optional Reseller Referral Code */}
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
            <label className="font-bold text-purple-900 dark:text-purple-200 block text-xs">
              Have a Reseller Referral Code? (ری سیلر ریفرل کوڈ درج کریں):
            </label>
            <input
              type="text"
              value={resellerCode}
              onChange={(e) => setResellerCode(e.target.value)}
              placeholder="e.g. RES-100D-01"
              className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase text-xs"
            />
            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">
              Earns Rs. 30 per Rs. 1,000 for your referring wholesale partner upon paid delivery.
            </span>
          </div>

          {/* 4. Partial Payment Input (If Partial selected) */}
          {saleType === 'partial' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  Advance Paid Amount (ادا کردہ ایڈوانس رقم)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    max={totalOurPrice}
                    value={partialPaidInput}
                    onChange={(e) => setPartialPaidInput(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Remaining Due Balance (باقی واجب الادا)
                </label>
                <p className="font-mono font-bold text-base text-red-600 dark:text-red-400 py-1.5">
                  {profile.currencySymbol}{dueBalance.toLocaleString('en-PK')}
                </p>
              </div>
            </div>
          )}

          {/* 5. Payment Channel & Terms Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Channel */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Payment Channel
              </label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  const mode = e.target.value as PaymentMode;
                  setPaymentMode(mode);
                  if (mode === 'cod') setSaleType('cod');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="easypaisa">EasyPaisa (03125256266 - مدینہ مارکیٹ)</option>
                <option value="jazzcash">JazzCash (03125256266 - مدینہ مارکیٹ)</option>
                <option value="sadapay">SadaPay (03125256266 - @100dagar)</option>
                <option value="bank_transfer">Meezan Bank Ltd (Islamic Banking)</option>
                <option value="cash">Counter Cash (دکان پر نقد وصولی)</option>
                <option value="cod">Cash on Delivery (COD - Remove accounts from WhatsApp)</option>
              </select>
            </div>

            {/* Terms Due Date */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Payment Due Date (آخری تاریخ ادائیگی)
                </label>
                <span className="text-[10px] text-amber-600 font-bold">Terms: {paymentTermsDays} Days</span>
              </div>
              <input
                type="date"
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[7, 14, 21, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleTermsDaysChange(days)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      paymentTermsDays === days
                        ? 'bg-[#FFD200] text-slate-950 font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {days} Days {days === 7 && '(Default)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CREDIT LIMIT EXCEEDED WARNING (USER DIRECTIVE: default 5000 credit limit) */}
          {dueBalance > 0 && selectedCustomer && (
            (() => {
              const limit = selectedCustomer.creditLimit || 5000;
              const totalDueAfter = (selectedCustomer.balance || 0) + dueBalance;
              const isOverLimit = totalDueAfter > limit;

              if (isOverLimit) {
                return (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-300 dark:border-red-800 space-y-1 text-xs text-red-900 dark:text-red-200">
                    <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Credit Limit Warning (ادھار حد سے تجاوز):</span>
                    </div>
                    <p className="text-[11px]">
                      کسٹمر کی کریڈٹ لمیٹ <b>{profile.currencySymbol}{limit.toLocaleString('en-PK')}</b> ہے۔ اس آرڈر کے بعد کل واجب الادا رقم <b>{profile.currencySymbol}{totalDueAfter.toLocaleString('en-PK')}</b> ہو جائے گی (حد سے <b>{profile.currencySymbol}{(totalDueAfter - limit).toLocaleString('en-PK')}</b> زائد)۔
                    </p>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Automated Reminders Cycle Schedule Card */}
          {dueBalance > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-1.5 text-[11px] text-blue-900 dark:text-blue-200">
              <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-100">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Automated Payment Terms Schedule (خودکار یاددہانی شیڈول):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
                <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-blue-100 dark:border-blue-800">
                  <span className="text-[10px] text-slate-500 block">1. Soft Reminder (3 Days Before)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{softReminderDate}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-blue-100 dark:border-blue-800">
                  <span className="text-[10px] text-slate-500 block">2. Due Date Alert (Terms Day)</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{customDueDate}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-blue-100 dark:border-blue-800">
                  <span className="text-[10px] text-slate-500 block">3. Overdue Cycle (Every 3 Days)</span>
                  <span className="font-bold text-red-600 dark:text-red-400">Max 1 Wk ({maxGraceDate})</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. WhatsApp Instant Notification Checkbox */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <input
              type="checkbox"
              id="sendWhatsApp"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <label htmlFor="sendWhatsApp" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Send instant bilingual invoice &amp; savings receipt to customer via WhatsApp ({selectedCustomer?.phone || 'Selected Phone'})
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm Sale &amp; Update Ledger</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
