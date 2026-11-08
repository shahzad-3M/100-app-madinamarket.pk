import React from 'react';
import {
  Plus,
  Sun,
  Moon,
  ShoppingBag,
  Phone,
  Mail,
  Search,
  Heart,
  User,
  Sparkles,
  Trophy,
  CalendarClock,
  Package,
  FileText,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Truck,
  Users,
  Briefcase,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { BusinessProfile, UserRole } from '../types';

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
  userRole = 'admin',
  onOpenRoleModal,
}) => {
  const customerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'lucky_draw', label: 'Lucky Draw & Rewards', urdu: 'لکی ڈرا اور انعامات', icon: Trophy },
    { id: 'monthly_statement', label: 'My Monthly Statement', urdu: 'ماہانہ کھاتہ و انعامات', icon: FileText },
    { id: 'resellers', label: 'Become a Reseller', urdu: 'ری سیلر کمیشن', icon: Briefcase },
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

  const primaryNavItems = viewMode === 'customer' || userRole === 'customer' ? customerNavItems : merchantNavItems;

  return (
    <header className="sticky top-0 z-40 flex flex-col no-print shadow-xs">
      {/* 1. TOP YELLOW UTILITY ROW (Matching Screenshot Exact Theme) */}
      <div className="bg-[#FFD200] text-slate-900 text-[11px] font-medium py-1.5 px-4 sm:px-6 lg:px-8 border-b border-amber-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left Partner, Seller & Phone Block */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-0.5 font-semibold text-slate-900 bg-amber-400/70 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-400">
              Be A Partner <ChevronRight className="w-3 h-3" />
            </span>

            <span className="bg-white text-slate-800 font-semibold px-2 py-0.5 rounded shadow-2xs cursor-pointer hover:bg-slate-50">
              Become 3M Seller
            </span>

            <span className="bg-slate-900 text-amber-300 font-bold px-2 py-0.5 rounded font-urdu tracking-wide">
              مدینہ مارکیٹ
            </span>

            <a
              href={`https://wa.me/923125256266?text=${encodeURIComponent('السلام علیکم! 100DAGAR مدینہ مارکیٹ سے معلومات درکار ہیں۔')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 hover:text-slate-800 bg-amber-300/60 px-2 py-0.5 rounded cursor-pointer"
              title="EasyPaisa, JazzCash & SadaPay: 03125256266"
            >
              <Phone className="w-3 h-3 text-slate-800" />
              <span>0312 5256 266</span>
            </a>

            <a
              href="mailto:info@100dagar.pk"
              className="hidden md:inline-flex items-center gap-1 text-slate-800 hover:underline"
            >
              <Mail className="w-3 h-3" />
              <span>Mail us</span>
            </a>
          </div>

          {/* Right Utility Links */}
          <div className="hidden lg:flex items-center gap-3 text-slate-800 text-[11px]">
            <span className="cursor-pointer hover:underline">Store Locator</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline" onClick={() => onTabChange('customers')}>My Orders</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline" onClick={() => onTabChange('payment_terms')}>Track Terms</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline" onClick={() => onTabChange('lucky_draw')}>Lucky Draw</span>
            <span>·</span>
            <span className="font-bold cursor-pointer hover:underline" onClick={() => onTabChange('store')}>Shop</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline" onClick={() => onTabChange('settings')}>My Account</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER ROW (White background with Search & Action Controls) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Urdu Subtext */}
          <div
            onClick={() => onTabChange('store')}
            className="cursor-pointer shrink-0 flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded bg-[#FFD200] flex items-center justify-center font-black text-slate-900 text-lg shadow-2xs group-hover:scale-105 transition-transform">
              100
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                  100DAGAR
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-urdu">
                  مدینہ مارکیٹ
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block tracking-wider uppercase">
                Wholesale &amp; Retail Ledger
              </span>
            </div>
          </div>

          {/* Yellow Bordered Search Bar (Exact match to screenshot) */}
          <div className="hidden md:flex flex-1 max-w-xl items-center mx-2">
            <div className="w-full flex items-center border-2 border-[#FFD200] rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-amber-400">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search for Products, Categories, SKU, or Urdu Name..."
                className="flex-1 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
              />
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange?.(e.target.value)}
                  className="px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((c) => (
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

          {/* Right Header Actions: View Mode Switcher, Quick Cart, Dark Mode & Record Entry */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* VIEW MODE SWITCHER (USER DIRECTIVE: hide everything backend as customer view) */}
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
                title="Customer Storefront View (Cost Price & Profit Hidden)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Customer View (گاہک)</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleViewMode('merchant')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'merchant'
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Merchant Admin Portal (Full Ledger & Inventory)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Merchant Admin (ایڈمن)</span>
              </button>
            </div>

            {/* Role Switcher & Login Badge (USER DIRECTIVE: login option for admin and customers area add some major roles) */}
            <button
              type="button"
              onClick={onOpenRoleModal}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                userRole === 'admin'
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                  : userRole === 'manager'
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                  : userRole === 'reseller'
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                  : 'border-purple-400 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200'
              }`}
              title="Click to Switch Role / Login"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {userRole === 'admin' && '👑 Super Admin'}
                {userRole === 'manager' && '💼 Store Manager'}
                {userRole === 'reseller' && '🤝 Reseller Partner'}
                {userRole === 'customer' && '🛍️ Online Customer'}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Switch</span>
            </button>

            {/* Quick Cart Pill Button */}
            <button
              onClick={onOpenCart}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer transition-colors shadow-2xs"
              title="Open Sale / POS Cart"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white font-mono text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left text-xs leading-none">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">POS Cart</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {profile.currencySymbol}{cartTotal.toLocaleString('en-PK')}
                </span>
              </div>
            </button>

            {/* Dark Mode */}
            <button
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Record Entry Quick Trigger (Hidden in Customer View!) */}
            {viewMode === 'merchant' && (
              <button
                onClick={onOpenAddTransaction}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Entry</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOMER VIEW NOTICE BANNER */}
      {viewMode === 'customer' && (
        <div className="bg-emerald-600 text-white text-[11px] font-medium py-1 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
          <Eye className="w-3.5 h-3.5" />
          <span>
            <b>Customer View Active:</b> All backend cost prices, supplier margins, and internal accounting are hidden. Ready for customers to browse &amp; order.
          </span>
          <button
            onClick={() => onToggleViewMode('merchant')}
            className="underline font-bold hover:text-amber-200 cursor-pointer ml-1"
          >
            Switch to Merchant Admin
          </button>
        </div>
      )}

      {/* 3. PRIMARY APP TABS ROW (Clean single-line segmented bar with Urdu tooltips) */}
      <div className="bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-1.5 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 shrink-0">
            {primaryNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold ring-1 ring-slate-300 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />}
                  <span>{item.label}</span>
                  {item.urdu && (
                    <span className="font-urdu text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      ({item.urdu})
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-500 text-white rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Categories Bar (School, Office, Travel, Hot picks) */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span
              onClick={() => {
                onCategoryChange?.('Education & Learning');
                onTabChange('store');
              }}
              className="cursor-pointer hover:text-slate-900 dark:hover:text-white"
            >
              School
            </span>
            <span
              onClick={() => {
                onCategoryChange?.('Cleaning Appliances');
                onTabChange('store');
              }}
              className="cursor-pointer hover:text-slate-900 dark:hover:text-white"
            >
              Office
            </span>
            <span
              onClick={() => {
                onCategoryChange?.('Fashion & Apparel');
                onTabChange('store');
              }}
              className="cursor-pointer hover:text-slate-900 dark:hover:text-white"
            >
              Travel
            </span>
            <span
              onClick={() => {
                onCategoryChange?.('Hot Pick of the week');
                onTabChange('store');
              }}
              className="text-amber-600 dark:text-amber-400 font-bold cursor-pointer hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Hot picks of the week
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
