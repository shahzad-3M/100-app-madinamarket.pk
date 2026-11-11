import React from 'react';
import {
  Plus,
  Sun,
  Moon,
  ShoppingBag,
  Search,
  User,
  Sparkles,
  Trophy,
  CalendarClock,
  Package,
  FileText,
  Eye,
  SlidersHorizontal,
  Truck,
  Users,
  Briefcase,
  BarChart3,
  X,
} from 'lucide-react';
import { AppUser, BusinessProfile, UserRole } from '../types';

export interface NavItem {
  id: string;
  label: string;
  urdu?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAddTransaction: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
  cartTotal?: number;
  pendingAlertsCount: number;
  codPendingCount?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
  categories?: string[];
  profile: BusinessProfile;
  viewMode: 'customer' | 'merchant';
  onToggleViewMode: (mode: 'customer' | 'merchant') => void;
  userRole?: UserRole;
  onOpenRoleModal?: () => void;
  currentUser?: AppUser;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddTransaction,
  onOpenCart,
  cartCount = 0,
  cartTotal = 0,
  pendingAlertsCount,
  codPendingCount = 0,
  darkMode,
  onToggleDarkMode,
  searchQuery = '',
  onSearchChange,
  selectedCategory = 'All Categories',
  onCategoryChange,
  categories = [],
  profile,
  viewMode,
  onToggleViewMode,
  userRole = 'customer',
  onOpenRoleModal,
  currentUser,
}) => {
  // USER DIRECTIVE: Do not public resellers information; only for reseller or admin!
  const customerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'lucky_draw', label: 'Lucky Draw & Rewards', urdu: 'لکی ڈرا اور انعامات', icon: Trophy },
    { id: 'monthly_statement', label: 'My Monthly Statement', urdu: 'ماہانہ کھاتہ و انعامات', icon: FileText },
  ];

  const resellerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'resellers', label: 'Reseller Portal & Earnings', urdu: 'ری سیلر پورٹل', icon: Briefcase },
    { id: 'lucky_draw', label: 'Lucky Draw', urdu: 'لکی ڈرا', icon: Trophy },
    { id: 'monthly_statement', label: 'Statement', urdu: 'ماہانہ کھاتہ', icon: FileText },
  ];

  const merchantNavItems: NavItem[] = [
    { id: 'store', label: 'Store & POS', urdu: 'سیل و کیٹلاگ', icon: ShoppingBag },
    { id: 'cod_orders', label: 'COD Orders & Delivery', urdu: 'کیش آن ڈلیوری', icon: Truck, badge: codPendingCount > 0 ? codPendingCount : undefined },
    { id: 'hr_payroll', label: 'HR Hiring & Payroll', urdu: 'ملازمین و تنخواہیں', icon: Users },
    { id: 'resellers', label: 'Reseller Accounts', urdu: 'ری سیلرز کمیشن', icon: Briefcase },
    { id: 'monthly_statement', label: 'Monthly Statements', urdu: 'ماہانہ اسٹیٹمنٹ', icon: FileText },
    { id: 'inventory', label: 'Inventory & Stock', urdu: 'اسٹاک و وننگ پروڈکٹس', icon: Package },
    { id: 'payment_terms', label: 'Payment Terms Alerts', urdu: '۳ روزہ یاددہانی شیڈول', icon: CalendarClock, badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined },
    { id: 'lucky_draw', label: 'Lucky Draw & Winners', urdu: 'لکی ڈرا لائیو', icon: Trophy },
    { id: 'dashboard', label: 'Ledger Overview', urdu: 'کھاتہ خلاصہ', icon: FileText },
    { id: 'customers', label: 'Customers', urdu: 'کسٹمرز کھاتہ' },
    { id: 'recurring', label: 'Recurring Billing', urdu: 'مقررہ بلنگ' },
    { id: 'whatsapp', label: 'WhatsApp Queue', urdu: 'واٹس ایپ کیو' },
    { id: 'reports', label: 'Daybook & Reports', urdu: 'روزنامچہ و آڈٹ', icon: BarChart3 },
    { id: 'settings', label: 'Settings', urdu: 'سیٹنگز' },
  ];

  const primaryNavItems =
    userRole === 'admin' && viewMode === 'merchant'
      ? merchantNavItems
      : userRole === 'reseller'
      ? resellerNavItems
      : customerNavItems;

  // Deduplicate and filter categories list
  const displayCategories = Array.from(
    new Set(['All Categories', ...categories.filter((c) => c && c !== 'All Categories')])
  );

  return (
    <header className="sticky top-0 z-40 flex flex-col no-print shadow-xs bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* 1. MAIN HEADER BAR */}
      <div className="py-2.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Urdu Subtext */}
          <div
            onClick={() => onTabChange('store')}
            className="cursor-pointer shrink-0 flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#FFD200] flex items-center justify-center font-black text-slate-900 text-base shadow-xs group-hover:scale-105 transition-transform">
              100
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                  100DAGAR
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-urdu">
                  مدینہ مارکیٹ
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block tracking-wider uppercase">
                Wholesale &amp; Retail Store
              </span>
            </div>
          </div>

          {/* Desktop Search Bar (Yellow Bordered, prominent) */}
          <div className="hidden md:flex flex-1 max-w-xl items-center mx-2">
            <div className="w-full flex items-center border-2 border-[#FFD200] rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-amber-400">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search products, categories, SKU, or Urdu name..."
                className="flex-1 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.('')}
                  className="px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {displayCategories.length > 1 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange?.(e.target.value)}
                  className="px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700 focus:outline-hidden cursor-pointer max-w-[130px] truncate"
                >
                  {displayCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => onTabChange('store')}
                className="bg-[#FFD200] hover:bg-amber-400 text-slate-900 px-3.5 py-2 cursor-pointer transition-colors"
                title="Search Products"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* VIEW MODE SWITCHER (Only shown to authenticated Super Admin) */}
            {userRole === 'admin' && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    onToggleViewMode('customer');
                    if (currentTab !== 'store' && currentTab !== 'lucky_draw' && currentTab !== 'monthly_statement') {
                      onTabChange('store');
                    }
                  }}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'customer'
                      ? 'bg-[#FFD200] text-slate-950 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Customer Storefront View"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Storefront</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleViewMode('merchant')}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'merchant'
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Admin Hub"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>
            )}

            {/* Account & Login Button */}
            {/* Account & Login Button */}
            <button
              type="button"
              onClick={() => onOpenRoleModal?.()}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs ${
                userRole === 'admin'
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                  : userRole === 'reseller'
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-amber-400'
              }`}
              title="Account Login / Portal"
            >
              <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate max-w-[85px] sm:max-w-[130px]">
                {userRole === 'admin'
                  ? 'Super Admin'
                  : userRole === 'reseller'
                  ? (currentUser?.name || 'Reseller')
                  : currentUser?.name && currentUser.name !== 'Online Customer'
                  ? currentUser.name
                  : 'Sign In / اکاؤنٹ'}
              </span>
            </button>

            {/* Quick Cart Button */}
            <button
              onClick={() => onOpenCart?.()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer transition-colors shadow-2xs"
              title="Shopping Cart / آرڈر"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white font-mono text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white hidden sm:inline">
                {profile.currencySymbol}{cartTotal.toLocaleString('en-PK')}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => onToggleDarkMode()}
              aria-label="Toggle theme"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Record Entry Quick Trigger (Only for Admin in Merchant View) */}
            {viewMode === 'merchant' && userRole === 'admin' && (
              <button
                onClick={() => onOpenAddTransaction()}
                className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Entry</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar (USER DIRECTIVE: keep showing search on mobile and other devices) */}
        <div className="md:hidden mt-2 pt-1">
          <div className="w-full flex items-center border-2 border-[#FFD200] rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-amber-400">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search products, categories, SKU..."
              className="flex-1 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange?.('')}
                className="px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onTabChange('store')}
              className="bg-[#FFD200] hover:bg-amber-400 text-slate-900 px-3 py-1.5 cursor-pointer transition-colors"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY APP TABS ROW */}
      <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 shrink-0">
            {primaryNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold ring-1 ring-slate-300 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-500 text-white rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. SHOW ALL CATEGORIES BAR ON ALL DEVICES (USER DIRECTIVE: show all catagories on others devices as well) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Categories:</span>
          </span>

          {displayCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  onCategoryChange?.(cat);
                  if (currentTab !== 'store') {
                    onTabChange('store');
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap shrink-0 transition-colors cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-[#FFD200] text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
