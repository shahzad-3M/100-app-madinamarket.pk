import React, { useState } from 'react';
import {
  Briefcase,
  UserPlus,
  DollarSign,
  Share2,
  Copy,
  Check,
  Send,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Search,
  Pencil,
} from 'lucide-react';
import { BusinessProfile, Reseller } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface ResellersViewProps {
  resellers: Reseller[];
  profile: BusinessProfile;
  onSaveReseller: (reseller: Reseller) => void;
  onPayoutCommission: (resellerId: string, amount: number) => void;
  isResellerRole?: boolean;
  activeResellerCode?: string;
}

export const ResellersView: React.FC<ResellersViewProps> = ({
  resellers,
  profile,
  onSaveReseller,
  onPayoutCommission,
  isResellerRole = false,
  activeResellerCode,
}) => {
  const [isAddResellerOpen, setIsAddResellerOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Reseller Form State
  const [name, setName] = useState('');
  const [urduName, setUrduName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [paymentChannel, setPaymentChannel] = useState<'easypaisa' | 'jazzcash' | 'sadapay' | 'bank' | 'cash'>('easypaisa');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('03125256266');
  const [creditLimit, setCreditLimit] = useState<number>(25000);

  // Filter if logged in as specific reseller
  const displayResellers = isResellerRole && activeResellerCode
    ? resellers.filter((r) => r.referralCode === activeResellerCode)
    : resellers;

  const totalEarnedCommission = displayResellers.reduce((sum, r) => sum + r.earnedCommission, 0);
  const totalPaidCommission = displayResellers.reduce((sum, r) => sum + r.paidCommission, 0);
  const totalPayableCommission = Math.max(0, totalEarnedCommission - totalPaidCommission);
  const totalPaidSalesVol = displayResellers.reduce((sum, r) => sum + r.totalPaidSales, 0);

  const handleCopyLink = (referralCode: string) => {
    const link = `https://100dagar.pk/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(referralCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShareWhatsApp = (r: Reseller) => {
    const cleanPhone = r.phone.replace(/\D/g, '');
    const msg = `🤝 *100DAGAR ری سیلر کمیشن اکاؤنٹ / Reseller Affiliate Portal*\n*${profile.name} · مدینہ مارکیٹ*\n\nمحترم *${r.name}* صاحب،\nآپ کا ری سیلر ریفرل کوڈ: *${r.referralCode}*\n\n*کمیشن فارمولا:* ہر 1,000 روپے کی ادائیگی پر نقد *30 روپے کمیشن* (صرف موصولہ / ادا شدہ رقم پر قابل ادائیگی)۔\n\n*آپ کا ریفرل لنک:* https://100dagar.pk/?ref=${r.referralCode}\n\n*آپ کے کمیشن کی تفصیلات:*\n• ادا شدہ سیلز والیم: ${profile.currencySymbol}${r.totalPaidSales.toLocaleString('en-PK')}\n• کمایا گیا کل کمیشن: ${profile.currencySymbol}${r.earnedCommission.toLocaleString('en-PK')}\n• وصول شدہ کمیشن: ${profile.currencySymbol}${r.paidCommission.toLocaleString('en-PK')}\n• بقایا واجب الادا کمیشن: *${profile.currencySymbol}${(r.earnedCommission - r.paidCommission).toLocaleString('en-PK')}*\n• ہول سیل کریڈٹ لمٹ: *${profile.currencySymbol}${(r.creditLimit || 25000).toLocaleString('en-PK')}*\n\nادائیگی بذریعہ نقد کیش (دکان پر)، EasyPaisa، JazzCash، یا SadaPay (03125256266) کی جاتی ہے۔ شکریہ!`;

    openWhatsAppDirect(cleanPhone, msg);
  };

  const handleCreateReseller = (e: React.FormEvent) => {
    e.preventDefault();
    const referralCode = `RES-100D-${Math.floor(10 + Math.random() * 90)}`;

    const newReseller: Reseller = {
      id: `res_${Date.now()}`,
      name,
      urduName,
      phone,
      city,
      referralCode,
      paymentChannel,
      accountTitle: accountTitle || name,
      accountNumber,
      creditLimit: creditLimit || 25000,
      totalReferredOrders: 0,
      totalSales: 0,
      totalPaidSales: 0,
      earnedCommission: 0,
      paidCommission: 0,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveReseller(newReseller);
    setIsAddResellerOpen(false);

    setName('');
    setUrduName('');
    setPhone('');
    setAccountTitle('');
    alert(`نیا ری سیلر ${name} کوڈ #${referralCode} (کریڈٹ لمٹ 25,000 روپے) کے ساتھ رجسٹر ہو گیا ہے!`);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payable Commission Due */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Payable Commission (قابل ادائیگی کمیشن)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {profile.currencySymbol}{totalPayableCommission.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            Earned: {profile.currencySymbol}{totalEarnedCommission.toLocaleString('en-PK')} · Paid: {profile.currencySymbol}{totalPaidCommission.toLocaleString('en-PK')}
          </span>
        </div>

        {/* Paid Sales Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Delivered &amp; Paid Sales</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
            {profile.currencySymbol}{totalPaidSalesVol.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block">
            Commission only payable on PAID amount
          </span>
        </div>

        {/* Commission Rate Rule (User Requirement) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Affiliate Rate Formula</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 pt-1">
            Rs. 30 per Rs. 1,000 Paid (3%)
          </p>
          <span className="text-[10px] text-slate-400 block">
            1000 روپے پر 30 روپے نقد کمیشن
          </span>
        </div>

        {/* Resellers Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Active Partners</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {displayResellers.length} Partners
          </p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
            EasyPaisa / JazzCash / SadaPay Payouts
          </span>
        </div>
      </div>

      {/* 2. HEADER & ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Reseller Accounts &amp; Commission Payouts</span>
            <span className="font-urdu text-xs font-normal text-amber-600 dark:text-amber-400">
              (ری سیلر کمیشن اکاؤنٹ)
            </span>
          </h2>
          <span className="text-xs text-slate-500">
            Strict Rule: Commission (Rs. 30 per Rs. 1,000) is ONLY calculated and payable on PAID amounts.
          </span>
        </div>

        {!isResellerRole && (
          <button
            onClick={() => setIsAddResellerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-amber-400 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Reseller (نیا ری سیلر)</span>
          </button>
        )}
      </div>

      {/* 3. RESELLER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayResellers.map((r) => {
          const balance = Math.max(0, r.earnedCommission - r.paidCommission);

          return (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 hover:shadow-md transition-all text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                      Code: {r.referralCode}
                    </span>
                    <span className="text-[10px] text-slate-400">📍 {r.city}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {r.name}
                  </h3>
                  {r.urduName && (
                    <p className="font-urdu text-xs text-slate-500 dark:text-slate-400">
                      {r.urduName}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Commission Due</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                    {profile.currencySymbol}{balance.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Commission Stats Grid */}
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Paid Sales:</span>
                  <b className="text-slate-900 dark:text-white">
                    {profile.currencySymbol}{r.totalPaidSales.toLocaleString('en-PK')}
                  </b>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Total Earned:</span>
                  <b className="text-blue-600 dark:text-blue-400">
                    {profile.currencySymbol}{r.earnedCommission.toLocaleString('en-PK')}
                  </b>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Paid Out:</span>
                  <b className="text-emerald-600 dark:text-emerald-400">
                    {profile.currencySymbol}{r.paidCommission.toLocaleString('en-PK')}
                  </b>
                </div>
              </div>

              {/* Wholesale Credit Limit */}
              <div className="flex items-center justify-between text-[11px] bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-200 dark:border-purple-800">
                <span className="font-bold text-purple-900 dark:text-purple-300">
                  Wholesale Credit Limit (ہول سیل کریڈٹ لمٹ):
                </span>
                <span className="font-mono font-black text-purple-800 dark:text-purple-200">
                  {profile.currencySymbol}{(r.creditLimit || 25000).toLocaleString('en-PK')}
                </span>
              </div>

              {/* Payout Account Info */}
              <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900 text-[11px] flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase text-amber-800 dark:text-amber-400 font-bold block">
                    Payout Channel: {r.paymentChannel.toUpperCase()} {r.paymentChannel === 'cash' && '(دکان پر نقد)'}
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">
                    {r.paymentChannel === 'cash' ? 'Cash at Counter (دکان پر وصولی)' : `${r.accountNumber} (${r.accountTitle})`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {r.totalReferredOrders} Orders Referred
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyLink(r.referralCode)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                  >
                    {copiedCode === r.referralCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleShareWhatsApp(r)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Statement</span>
                  </button>

                  <button
                    onClick={() => setEditingReseller(r)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[11px] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Partner (تبدیل کریں)</span>
                  </button>
                </div>

                {/* Settle Commission Payout Button for Admin */}
                {!isResellerRole && balance > 0 && (
                  <button
                    onClick={() => {
                      const amountStr = prompt(`Enter commission payout amount for ${r.name} (Max due: Rs. ${balance}):\nPayment Mode: ${r.paymentChannel === 'cash' ? 'Cash at Counter' : r.paymentChannel}`, String(balance));
                      if (amountStr) {
                        const amt = parseFloat(amountStr) || 0;
                        if (amt > 0) {
                          onPayoutCommission(r.id, amt);
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-2xs"
                  >
                    Pay Commission (رقم ادا کریں)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MODAL: REGISTER NEW RESELLER */}
      {isAddResellerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                <h2 className="text-base font-black">Register New Reseller Partner (نیا ری سیلر رجسٹر کریں)</h2>
              </div>
              <button
                onClick={() => setIsAddResellerOpen(false)}
                className="p-1 text-slate-800 hover:text-black rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReseller} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reseller Full Name (ری سیلر کا نام)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Usman Ghani"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mobile Phone (واٹس ایپ)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03125256266"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    City (شہر)
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lahore / Karachi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Payment Channel */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Commission Payout Account (کمیشن ادائیگی اکاؤنٹ):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Payout Channel</label>
                    <select
                      value={paymentChannel}
                      onChange={(e) => setPaymentChannel(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="cash">Cash (دکان پر نقد ادائیگی)</option>
                      <option value="easypaisa">EasyPaisa (0312 5256 266)</option>
                      <option value="jazzcash">JazzCash (0312 5256 266)</option>
                      <option value="sadapay">SadaPay (0312 5256 266)</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Account Title / نام</label>
                    <input
                      type="text"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      placeholder="e.g. Counter Cash / Name"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Account / Mobile Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="03125256266"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-purple-600 dark:text-purple-400 block mb-1 font-bold">
                      Credit Limit (کریڈٹ لمٹ - Rs.)
                    </label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 25000)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddResellerOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT EXISTING RESELLER */}
      {editingReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-500" />
                <span>Edit Reseller Profile (ری سیلر پارٹنر کی معلومات کی تدوین)</span>
              </h2>
              <button
                onClick={() => setEditingReseller(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveReseller(editingReseller);
                setEditingReseller(null);
                alert(`ری سیلر ${editingReseller.name} کی معلومات کامیابی سے تبدیل ہو گئیں!`);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Partner Name (نام)
                  </label>
                  <input
                    type="text"
                    value={editingReseller.name}
                    onChange={(e) => setEditingReseller({ ...editingReseller, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Urdu Name (اردو نام)
                  </label>
                  <input
                    type="text"
                    value={editingReseller.urduName || ''}
                    onChange={(e) => setEditingReseller({ ...editingReseller, urduName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone (موبائل / واٹس ایپ)
                  </label>
                  <input
                    type="text"
                    value={editingReseller.phone}
                    onChange={(e) => setEditingReseller({ ...editingReseller, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    City (شہر)
                  </label>
                  <input
                    type="text"
                    value={editingReseller.city}
                    onChange={(e) => setEditingReseller({ ...editingReseller, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Referral Code (ریفرل کوڈ)
                  </label>
                  <input
                    type="text"
                    value={editingReseller.referralCode}
                    onChange={(e) => setEditingReseller({ ...editingReseller, referralCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Payment Channel & Credit Limit */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Commission Payout &amp; Credit Limit (کمیشن ادائیگی و کریڈٹ لمٹ):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Payout Channel</label>
                    <select
                      value={editingReseller.paymentChannel}
                      onChange={(e) =>
                        setEditingReseller({ ...editingReseller, paymentChannel: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="cash">Cash (دکان پر نقد ادائیگی)</option>
                      <option value="easypaisa">EasyPaisa (0312 5256 266)</option>
                      <option value="jazzcash">JazzCash (0312 5256 266)</option>
                      <option value="sadapay">SadaPay (0312 5256 266)</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Account Title</label>
                    <input
                      type="text"
                      value={editingReseller.accountTitle}
                      onChange={(e) =>
                        setEditingReseller({ ...editingReseller, accountTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Account / Mobile Number</label>
                    <input
                      type="text"
                      value={editingReseller.accountNumber}
                      onChange={(e) =>
                        setEditingReseller({ ...editingReseller, accountNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-purple-600 dark:text-purple-400 block mb-1 font-bold">
                      Credit Limit (کریڈٹ لمٹ - 25,000 روپے)
                    </label>
                    <input
                      type="number"
                      value={editingReseller.creditLimit || 25000}
                      onChange={(e) =>
                        setEditingReseller({
                          ...editingReseller,
                          creditLimit: parseFloat(e.target.value) || 25000,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingReseller(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Save Partner Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
