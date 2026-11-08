import React from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Briefcase,
  Store,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface LoginRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectRole: (role: UserRole) => void;
}

export const LoginRoleModal: React.FC<LoginRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const rolesList: Array<{
    role: UserRole;
    title: string;
    titleUrdu: string;
    badge: string;
    description: string;
    permissions: string[];
    icon: any;
    color: string;
  }> = [
    {
      role: 'admin',
      title: 'Super Admin & Store Owner',
      titleUrdu: 'ایڈمن و اسٹور مالک (مشترکہ کردار)',
      badge: 'Unified Owner & Admin',
      description: 'Combined Store Owner and Merchant Administration: Full access to financial ledger, POS counter sales, HR hiring & salaries, COD fulfillment, Shipday logistics, and settings.',
      permissions: [
        'All Merchant Admin and Store Owner controls combined into one role',
        'Approve partial / time-credit terms strictly for in-store walk-in customers',
        'HR hiring, salary allowances packages & staff attendance management',
        'Reseller commission approvals (Rs. 30 per Rs. 1,000 paid) & Rs. 25,000 credit limit',
        'WASAL Delivery & Shipday API configuration and daily audit closing report',
      ],
      icon: ShieldCheck,
      color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
    },
    {
      role: 'reseller',
      title: 'Reseller / Affiliate Partner',
      titleUrdu: 'ری سیلر پارٹنر',
      badge: 'Commission Based',
      description: 'Earn Rs. 30 on every Rs. 1,000 paid wholesale sale via custom referral links.',
      permissions: [
        'Unique referral code (e.g. RES-100D-01) for online sharing',
        'Real-time commission tracker on PAID delivered orders',
        'Track referred customer orders & COD delivery status',
        'Request instant payout via EasyPaisa, JazzCash, or Bank',
      ],
      icon: Briefcase,
      color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
    },
    {
      role: 'customer',
      title: 'Online Customer / Retail Buyer',
      titleUrdu: 'آن لائن گاہک / خریدار',
      badge: 'Customer View',
      description: 'Browse wholesale clearance catalog with up to 61% savings and Cash on Delivery checkout.',
      permissions: [
        'Cash on Delivery (COD) and Full Online payment checkout',
        'Credit & Partial payment locked (available for in-store walk-in only)',
        'Monthly statement tracking & Lucky Draw voucher viewing',
        'Claim Rs. 500 Coupon code by reviewing & sharing on social media',
      ],
      icon: ShoppingBag,
      color: 'border-purple-400 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-slate-950" />
            <div>
              <h2 className="text-base font-black tracking-tight">
                Switch User Role &amp; Access Level (کردار منتخب کریں)
              </h2>
              <span className="text-[11px] font-medium text-slate-800">
                100DAGAR · مدینہ مارکیٹ | Multi-Role Authentication
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

        {/* Roles List */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Select a role to test or switch views. As requested, <b>Online Customers have partial/time payments locked</b>, whereas <b>Store Admins and Managers have full ledger, HR, and COD access</b>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rolesList.map((r) => {
              const isSelected = currentUser.role === r.role;
              const Icon = r.icon;

              return (
                <div
                  key={r.role}
                  onClick={() => {
                    onSelectRole(r.role);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2.5 hover:shadow-md ${
                    isSelected
                      ? `${r.color} ring-2 ring-amber-400 shadow-sm`
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm">{r.title}</h3>
                        <p className="font-urdu text-[11px] text-slate-500 dark:text-slate-400">
                          {r.titleUrdu}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Active
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {r.description}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400">
                    {r.permissions.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`w-full py-1.5 rounded-lg font-bold text-center text-xs mt-1 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    {isSelected ? 'Currently Selected' : `Switch to ${r.title.split('/')[0].trim()}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                Current Session: <b>{currentUser.name}</b> ({currentUser.role.toUpperCase()})
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg text-slate-800 dark:text-white font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
