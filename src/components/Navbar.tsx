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
  ChevronDown,
  Phone,
} from 'lucide-react';
import { AppUser, BusinessProfile, UserRole } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';

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
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // USER DIRECTIVE: lucky draw and statement change place and dropdown best place not in quick front
  const customerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
  ];
  const customerDropdownItems: NavItem[] = [
    { id: 'monthly_statement', label: 'My Monthly Statement', urdu: 'ماہانہ کسٹمر کھاتہ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw & Rewards', urdu: 'لکی ڈرا اور انعامات', icon: Trophy },
  ];

  const resellerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'resellers', label: 'Reseller Portal & Earnings', urdu: 'ری سیلر پورٹل', icon: Briefcase },
  ];
  const resellerDropdownItems: NavItem[] = [
    { id: 'monthly_statement', label: 'Statement', urdu: 'ماہانہ کھاتہ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw', urdu: 'لکی ڈرا', icon: Trophy },
  ];

  const merchantNavItems: NavItem[] = [
    { id: 'store', label: 'Store & POS', urdu: 'سیل و کیٹلاگ', icon: ShoppingBag },
    { id: 'cod_orders', label: 'COD Orders & Delivery', urdu: 'کیش آن ڈلیوری', icon: Truck, badge: codPendingCount > 0 ? codPendingCount : undefined },
    { id: 'inventory', label: 'Inventory & Stock', urdu: 'اسٹاک و وننگ پروڈکٹس', icon: Package },
    { id: 'payment_terms', label: 'Payment Terms Alerts', urdu: '۳ روزہ یاددہانی شیڈول', icon: CalendarClock, badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined },
    { id: 'resellers', label: 'Reseller Accounts', urdu: 'ری سیلرز کمیشن', icon: Briefcase },
    { id: 'hr_payroll', label: 'HR Hiring & Payroll', urdu: 'ملازمین و تنخواہیں', icon: Users },
    { id: 'reports', label: 'Daybook & Reports', urdu: 'روزنامچہ و آڈٹ', icon: BarChart3 },
  ];
  const merchantDropdownItems: NavItem[] = [
    { id: 'monthly_statement', label: 'Monthly Statements', urdu: 'ماہانہ اسٹیٹمنٹ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw & Winners', urdu: 'لکی ڈرا لائیو', icon: Trophy },
    { id: 'dashboard', label: 'Ledger Overview', urdu: 'کھاتہ خلاصہ', icon: FileText },
    { id: 'customers', label: 'Customers Khata', urdu: 'کسٹمرز کھاتہ', icon: Users },
    { id: 'recurring', label: 'Recurring Billing', urdu: 'مقررہ بلنگ', icon: CalendarClock },
    { id: 'whatsapp', label: 'WhatsApp Queue', urdu: 'واٹس ایپ کیو', icon: Phone },
    { id: 'settings', label: 'Settings', urdu: 'سیٹنگز' },
  ];

  const primaryNavItems =
    userRole === 'admin' && viewMode === 'merchant'
      ? merchantNavItems
      : userRole === 'reseller'
      ? resellerNavItems
      : customerNavItems;

  const dropdownNavItems =
    userRole === 'admin' && viewMode === 'merchant'
      ? merchantDropdownItems
      : userRole === 'reseller'
      ? resellerDropdownItems
      : customerDropdownItems;

  // Deduplicate and filter categories list
  const displayCategories = Array.from(
    new Set(['All Categories', ...categories.filter((c) => c && c !== 'All Categories')])
  );

  return (
    <header className="sticky top-0 z-40 flex flex-col no-print shadow-xs bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* 1. MAIN HEADER BAR */}
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4">
            {/* Logo & Urdu Subtext */}
            <div
              onClick={() => onTabChange('store')}
              className="cursor-pointer shrink-0 flex items-center gap-1.5 sm:gap-2 group select-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FFD200] flex items-center justify-center font-black text-slate-900 text-sm sm:text-base shadow-xs group-hover:scale-105 transition-transform shrink-0">
                100
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                    100DAGAR
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 font-urdu leading-none">
                    مدینہ مارکیٹ
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 block tracking-wider uppercase leading-tight mt-0.5">
                  Wholesale &amp; Retail Store
                </span>
              </div>
            </div>

            {/* Desktop Search Bar (Yellow Bordered, prominent) */}
            <div className="hidden md:flex flex-1 max-w-xl items-center mx-2 lg:mx-4">
              <div className="w-full flex items-center border-2 border-[#FFD200] rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-amber-400">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search products, categories, SKU, or Urdu name..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    className="px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear search"
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
                  type="button"
                  onClick={() => onTabChange('store')}
                  className="bg-[#FFD200] hover:bg-amber-400 text-slate-900 px-3.5 py-2 cursor-pointer transition-colors shrink-0"
                  title="Search Products"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
                    className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'customer'
                        ? 'bg-[#FFD200] text-slate-950 shadow-2xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Customer Storefront View"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Storefront</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleViewMode('merchant')}
                    className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'merchant'
                        ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Admin Hub"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                </div>
              )}

              {/* Account & Login Button */}
              <button
                type="button"
                onClick={() => onOpenRoleModal?.()}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
                  userRole === 'admin'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : userRole === 'reseller'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-amber-400'
                }`}
                title="Account Login / Portal"
              >
                <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate max-w-[65px] xs:max-w-[85px] sm:max-w-[130px]">
                  {userRole === 'admin'
                    ? 'Super Admin'
                    : userRole === 'reseller'
                    ? (currentUser?.name || 'Reseller')
                    : currentUser?.name && currentUser.name !== 'Online Customer'
                    ? currentUser.name
                    : 'Sign In'}
                </span>
              </button>

              {/* Quick Cart Button */}
              <button
                type="button"
                onClick={() => onOpenCart?.()}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer transition-colors shadow-2xs shrink-0"
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
                type="button"
                onClick={() => onToggleDarkMode()}
                aria-label="Toggle theme"
                className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Record Entry Quick Trigger (Only for Admin in Merchant View) */}
              {viewMode === 'merchant' && userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => onOpenAddTransaction()}
                  className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Entry</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar (USER DIRECTIVE: keep showing search on mobile and other devices) */}
          <div className="md:hidden mt-2 pt-0.5">
            <div className="w-full flex items-center border-2 border-[#FFD200] rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs focus-within:ring-2 focus-within:ring-amber-400">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search products, categories, SKU..."
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="px-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onTabChange('store')}
                className="bg-[#FFD200] hover:bg-amber-400 text-slate-900 px-3 py-1.5 cursor-pointer transition-colors shrink-0"
                title="Search"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY APP TABS ROW */}
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 shrink-0">
            {primaryNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
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

            {/* USER DIRECTIVE: lucky draw and statement change place and dropdown best place not in quick front */}
            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  dropdownNavItems.some((it) => it.id === currentTab)
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold ring-1 ring-amber-400 dark:ring-amber-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {dropdownNavItems.find((it) => it.id === currentTab)?.label || 'More Services (مزید)'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMoreOpen && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                  {dropdownNavItems.map((item) => {
                    const Icon = item.icon;
                    const isItemActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setIsMoreOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isItemActive
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        {Icon && <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-semibold">{item.label}</div>
                          {item.urdu && <div className="text-[10px] text-slate-400 font-urdu">{item.urdu}</div>}
                        </div>
                      </button>
                    );
                  })}

                  {userRole === 'customer' && (
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreOpen(false);
                          const text = 'السلام علیکم! میں مدینہ مارکیٹ پر اپنی نئی پراڈکٹ شامل / سپلائی کروانا چاہتا ہوں۔ براہ کرم تفصیلات اور طریقہ کار رہنمائی فرمائیں۔ جزاک اللہ!';
                          openWhatsAppDirect('03125256266', text);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer font-bold"
                      >
                        <Phone className="w-4 h-4 shrink-0 text-emerald-600" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">Add My Product</div>
                          <div className="text-[10px] text-emerald-600/80 font-urdu">واٹس ایپ پر اپنی پراڈکٹ شامل کروائیں</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* 3. SHOW ALL CATEGORIES BAR ON ALL DEVICES (USER DIRECTIVE: show all catagories on others devices as well) */}
      <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Categories:</span>
          </span>

          {displayCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
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
