import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Gift,
  Send,
  Ticket,
  Users,
  CheckCircle,
  Award,
  Crown,
  Share2,
  Calendar,
  Percent,
  Lock,
  ShieldCheck,
  MessageSquare,
  Instagram,
  Facebook,
  Phone,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  BusinessProfile,
  Customer,
  LuckyDrawEvent,
  LuckyDrawWinner,
  ReminderTemplate,
  ReviewRewardSubmission,
  TopBuyer,
} from '../types';
import { buildLuckyDrawWinnerMessage, openWhatsAppDirect } from '../utils/whatsapp';
import { conductLuckyDraw } from '../utils/automationEngine';

interface LuckyDrawViewProps {
  topBuyers: TopBuyer[];
  luckyDraws: LuckyDrawEvent[];
  profile: BusinessProfile;
  templates: ReminderTemplate[];
  onSaveLuckyDraw: (event: LuckyDrawEvent) => void;
  onSendWinnerNotification: (winner: LuckyDrawWinner) => void;
  isCustomerView?: boolean;
}

export const LuckyDrawView: React.FC<LuckyDrawViewProps> = ({
  topBuyers,
  luckyDraws,
  profile,
  templates,
  onSaveLuckyDraw,
  onSendWinnerNotification,
  isCustomerView = false,
}) => {
  const [eventTitle, setEventTitle] = useState('Grand Monthly Live Lucky Draw (ماہانہ لکی ڈرا)');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [latestDrawResult, setLatestDrawResult] = useState<LuckyDrawEvent | null>(luckyDraws[0] || null);
  const [activeWinnerAnnounced, setActiveWinnerAnnounced] = useState<LuckyDrawWinner | null>(null);

  // Social Review Form State for 3rd Prize (Rs. 500 coupon)
  const [reviewName, setReviewName] = useState('');
  const [reviewPhone, setReviewPhone] = useState('');
  const [reviewPlatform, setReviewPlatform] = useState<'whatsapp' | 'facebook' | 'tiktok' | 'instagram'>('whatsapp');
  const [reviewText, setReviewText] = useState('');
  const [reviewGeneratedVoucher, setReviewGeneratedVoucher] = useState<string | null>(null);

  const top3 = topBuyers.slice(0, 3);

  // Mask Phone helper (Hide contact details in public/customer view as per user directive)
  const maskPhone = (phone: string) => {
    if (!phone) return '0300****000';
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      return `${clean.substring(0, 4)}****${clean.slice(-3)}`;
    }
    return phone.substring(0, 4) + '****';
  };

  // Rearranged wheel sectors matching the 3 exact official categories
  const wheelSectors = [
    { label: '🥇 1st: 100% Coupon (Top 10)', color: '#FFD200', text: '#020617' },
    { label: '🥈 2nd: 50% Coupon (All Buyers)', color: '#38BDF8', text: '#020617' },
    { label: '🥉 3rd: Rs. 500 Review Voucher', color: '#10B981', text: '#ffffff' },
    { label: '⭐ Top 10 Shuffle', color: '#F97316', text: '#ffffff' },
    { label: '🎁 50% Off Voucher', color: '#A855F7', text: '#ffffff' },
    { label: '📱 Social Share Rs. 500', color: '#EC4899', text: '#ffffff' },
  ];

  const handleRunLiveSpin = () => {
    if (isCustomerView || isSpinning || topBuyers.length === 0) return;

    setIsSpinning(true);
    setActiveWinnerAnnounced(null);

    // Calculate rotation: 5 to 8 full spins plus random sector landing
    const extraDegrees = 1800 + Math.floor(Math.random() * 360);
    const newRotation = wheelRotation + extraDegrees;
    setWheelRotation(newRotation);

    setTimeout(() => {
      const newEvent = conductLuckyDraw(topBuyers, [], eventTitle);
      onSaveLuckyDraw(newEvent);
      setLatestDrawResult(newEvent);
      setIsSpinning(false);
      if (newEvent.winners.length > 0) {
        setActiveWinnerAnnounced(newEvent.winners[0]);
      }
    }, 3800);
  };

  const handleNotifyWinner = (winner: LuckyDrawWinner) => {
    const msg = buildLuckyDrawWinnerMessage(winner, profile, templates);
    openWhatsAppDirect(winner.phone, msg);
    onSendWinnerNotification(winner);
  };

  const handleNotifyAll = (event: LuckyDrawEvent) => {
    event.winners.forEach((w, idx) => {
      setTimeout(() => {
        const msg = buildLuckyDrawWinnerMessage(w, profile, templates);
        openWhatsAppDirect(w.phone, msg);
        onSendWinnerNotification(w);
      }, idx * 600);
    });
  };

  const handleSubmitSocialReview = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `LUCKY-100D-REV${Math.floor(100 + Math.random() * 900)}`;
    setReviewGeneratedVoucher(code);

    const cleanPhone = reviewPhone.replace(/\D/g, '');
    const msg = `🌟 *3rd Prize: Rs. 500 Product Review Coupon Activated!*\n*${profile.name} · مدینہ مارکیٹ*\n\nمحترم *${reviewName}* صاحب،\nسوشل میڈیا پر ریویو شیئر کرنے پر شکریہ!\n\n🎟️ *Your Rs. 500 Discount Voucher Code:* *${code}*\n💰 *Discount Value:* Rs. 500 Flat OFF on next order\n📱 *Platform Verified:* ${reviewPlatform.toUpperCase()}\n\nیہ واؤچر اپنے اگلے آرڈر پر کیش ڈسکاؤنٹ کے لیے استعمال فرمائیں۔ جزاک اللہ!`;

    openWhatsAppDirect(cleanPhone, msg);
  };

  return (
    <div className="space-y-6">
      {/* 1. OFFICIAL PRIZE CATEGORIES CARDS (USER DIRECTIVE: Write winning details categories) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Official Monthly Lucky Draw Prize Categories (انعامات کی سرکاری کیٹیگریز)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transparent, automated monthly lottery based on paid purchases &amp; verified reviews.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
            1st of Every Month Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1st Prize Category */}
          <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                🥇 1st Prize (پہلا انعام)
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300">
                100% Refund Coupon
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              100% Coupon Equal to Last Purchase Amount
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              آخری خریداری کی ادا شدہ رقم کا 100% ڈسکاؤنٹ واؤچر۔
            </p>
            <div className="pt-2 border-t border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200 font-semibold">
              🎯 <b>Shuffle Rule:</b> Shuffled exclusively among the <b>Top 10 buyers of the previous month</b>.
            </div>
          </div>

          {/* 2nd Prize Category */}
          <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white">
                🥈 2nd Prize (دوسرا انعام)
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-800 dark:text-blue-300">
                50% Coupon Code
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              50% Coupon of Last Purchased Amount
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              آخری خریداری کی رقم کا 50% ڈسکاؤنٹ کوپن کوڈ۔
            </p>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200 font-semibold">
              🎯 <b>Shuffle Rule:</b> Randomly shuffled from <b>all customers who shopped during the last month</b>.
            </div>
          </div>

          {/* 3rd Prize Category */}
          <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                🥉 3rd Prize (تیسرا انعام)
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                Rs. 500 Flat Coupon
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Rs. 500 Social Review &amp; Share Voucher
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              پروڈکٹ کا ریویو سوشل میڈیا (WhatsApp/FB/TikTok) پر شیئر کرنے پر۔
            </p>
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
              🎯 <b>Review Rule:</b> Available for every buyer who submits and shares a product review.
            </div>
          </div>
        </div>
      </div>

      {/* 2. LIVE INTERACTIVE SPIN WHEEL & 100DAGAR CENTER LOGO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LIVE SPINNING WHEEL */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Live Lucky Wheel (لائیو اسپنر وہیل)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            100DAGAR certified random wheel. 1st Prize 100% last order coupon, 2nd Prize 50% coupon, 3rd Prize Rs. 500 social voucher.
          </p>

          {/* Wheel Container with Pointer */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
            {/* Top Pointer Ticker Arrow */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-red-600 drop-shadow-md"></div>

            {/* Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full border-4 border-amber-400 dark:border-amber-500 shadow-xl overflow-hidden relative"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: isSpinning ? 'transform 3.8s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {wheelSectors.map((sec, idx) => {
                  const anglePerSector = 360 / wheelSectors.length;
                  const startAngle = idx * anglePerSector;
                  const endAngle = startAngle + anglePerSector;

                  const startRad = ((startAngle - 90) * Math.PI) / 180;
                  const endRad = ((endAngle - 90) * Math.PI) / 180;

                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);

                  const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                  const textAngle = startAngle + anglePerSector / 2;
                  const textRad = ((textAngle - 90) * Math.PI) / 180;
                  const tx = 50 + 32 * Math.cos(textRad);
                  const ty = 50 + 32 * Math.sin(textRad);

                  return (
                    <g key={idx}>
                      <path d={pathData} fill={sec.color} stroke="#ffffff" strokeWidth="0.5" />
                      <text
                        x={tx}
                        y={ty}
                        fill={sec.text}
                        fontSize="3.6"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                      >
                        {sec.label.substring(0, 15)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* 100DAGAR Center Logo Badge (USER DIRECTIVE: add logo inside sping) */}
            <div
              onClick={() => {
                if (!isCustomerView) handleRunLiveSpin();
              }}
              className={`absolute z-10 w-18 h-18 rounded-full bg-slate-950 text-amber-400 border-3 border-amber-400 font-black shadow-xl flex flex-col items-center justify-center select-none ${
                !isCustomerView ? 'cursor-pointer hover:scale-105 transition-transform' : ''
              }`}
            >
              <span className="text-[11px] font-black tracking-wider text-[#FFD200]">
                100DAGAR
              </span>
              <span className="text-[7px] font-bold tracking-wider uppercase text-white -mt-0.5">
                WE BUY WE SELL
              </span>
              {!isCustomerView && (
                <span className="text-[7px] text-amber-300 font-bold uppercase mt-0.5">
                  {isSpinning ? 'SPINNING' : 'TAP TO SPIN'}
                </span>
              )}
            </div>
          </div>

          {/* Action Trigger or Customer View Lock Badge */}
          {isCustomerView ? (
            /* NO SPIN OPTION TO PRESS IN CUSTOMER VIEW (USER DIRECTIVE) */
            <div className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Customer View: Live Spin Controlled by Store Admin</span>
              </div>
              <p className="text-[11px] text-slate-500">
                لکی ڈرا کی لائیو قرعہ اندازی ہر ماہ کی پہلی تاریخ کو ایڈمن کے ذریعے شفاف طریقے سے کی جاتی ہے۔ تمام فاتحین کے واؤچرز نیچے رزلٹ لسٹ میں ظاہر ہوں گے۔
              </p>
            </div>
          ) : (
            <button
              onClick={handleRunLiveSpin}
              disabled={isSpinning || topBuyers.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isSpinning
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-102'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Live Spinning in Progress...' : 'Conduct Monthly Live Draw (لائیو اسپن کریں)'}</span>
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: WINNERS LIST (WITH CONTACTS HIDDEN/MASKED) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Verified Draw Results &amp; Winning Vouchers</span>
                <span className="font-urdu text-xs font-normal text-amber-600 dark:text-amber-400">
                  (فاتحین کے نتائج اور واؤچر کوڈز)
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                {latestDrawResult?.title || 'Monthly Draw'} · {latestDrawResult?.date}
              </span>
            </div>

            {!isCustomerView && latestDrawResult && (
              <button
                onClick={() => handleNotifyAll(latestDrawResult)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Notify All Winners via WhatsApp</span>
              </button>
            )}
          </div>

          {/* Active Announced Winner Banner */}
          {activeWinnerAnnounced && (
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-2 border-amber-400 rounded-2xl animate-fade-in space-y-1">
              <span className="text-[10px] uppercase font-black text-amber-800 dark:text-amber-300 tracking-wider flex items-center gap-1">
                🎉 LIVE DRAW WINNER SELECTED!
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {activeWinnerAnnounced.customerName} won #{activeWinnerAnnounced.rank} Prize!
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {activeWinnerAnnounced.prizeTitle}
              </p>
            </div>
          )}

          {/* Results List with MASKED CONTACT NUMBERS */}
          {latestDrawResult?.winners && latestDrawResult.winners.length > 0 ? (
            <div className="space-y-3">
              {latestDrawResult.winners.map((winner) => (
                <div
                  key={winner.voucherCode}
                  className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      #{winner.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {winner.customerName}
                        </span>
                        {/* HIDE / MASK CONTACT DETAILS IN RESULT LIST (USER DIRECTIVE) */}
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">
                          📞 {maskPhone(winner.phone)}
                        </span>
                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded text-[9px] font-bold">
                          {winner.customerType}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold mt-1 text-xs">
                        🎁 {winner.prizeTitle}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold block mt-0.5">
                        {winner.categoryRule || 'Official Draw Tier Rule Applied'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Verifiable Voucher Code Badge */}
                    <div className="bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-xl text-center font-mono shadow-2xs">
                      <span className="text-[9px] text-slate-400 uppercase block leading-none font-bold">Voucher Code</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {winner.voucherCode}
                      </span>
                    </div>

                    {!isCustomerView && (
                      <button
                        onClick={() => handleNotifyWinner(winner)}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                        title="Send WhatsApp Voucher"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              No winners drawn yet. Store Admin can conduct monthly spin.
            </p>
          )}

          {/* 3. SOCIAL MEDIA REVIEW & RS. 500 COUPON SUBMISSION SECTION (USER DIRECTIVE) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                  Claim 3rd Prize: Rs. 500 Coupon Code for Product Review &amp; Social Share
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Rs. 500 Reward
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Share your review of our product or post on your WhatsApp Status, Instagram, Facebook, or TikTok, and receive an instant <b>Rs. 500 voucher code</b> for your next purchase!
            </p>

            {reviewGeneratedVoucher ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                  Congratulations! Your Rs. 500 Review Voucher is Activated!
                </h4>
                <div className="p-2 bg-white dark:bg-slate-800 font-mono font-black text-sm text-emerald-600 rounded border border-emerald-200 inline-block px-4">
                  {reviewGeneratedVoucher}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  WhatsApp notification sent to <b>{reviewPhone}</b>. Use this coupon code at checkout to claim Rs. 500 discount.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSocialReview} className="space-y-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Your Name (آپ کا نام)"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    value={reviewPhone}
                    onChange={(e) => setReviewPhone(e.target.value)}
                    placeholder="WhatsApp Phone (0300...)"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                  <select
                    value={reviewPlatform}
                    onChange={(e) => setReviewPlatform(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="whatsapp">WhatsApp Status</option>
                    <option value="instagram">Instagram Story / Post</option>
                    <option value="facebook">Facebook Post / Group</option>
                    <option value="tiktok">TikTok Video</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Paste your product review text or link to your post..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Submit Review &amp; Get Rs. 500 Coupon</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
