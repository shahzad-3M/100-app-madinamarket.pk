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
  Clock,
  TrendingUp,
  FolderTree,
  Building2,
  Receipt,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AppUser, BusinessProfile, CategoryRecord, UserRole } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';
import { UPCOMING_CATEGORY_ID, UPCOMING_CATEGORY_NAME } from '../utils/locationCategoryHelpers';

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
  categoryRecords?: CategoryRecord[];
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
  categoryRecords = [],
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

  // Check authentication status (USER DIRECTIVE 5: Guest vs Authenticated User)
  const isAuthenticated = currentUser?.isAuthenticated === true;

  // 1. Guest Visitor Navigation (Public browsing only - all private portals strictly hidden)
  const guestNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
  ];
  const guestDropdownItems: NavItem[] = [];

  // 2. Authenticated Customer Navigation (Only shown when customer logs in)
  const customerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'customer_portal', label: 'My Portal', urdu: 'کسٹمر پورٹل و سیکیورٹی', icon: User },
    { id: 'history', label: 'My Orders & Khata', urdu: 'کھاتہ و ہسٹری', icon: Clock },
    { id: 'reports', label: 'My Reports & Savings', urdu: 'میرا خلاصہ و بچت', icon: BarChart3 },
  ];
  const customerDropdownItems: NavItem[] = [
    { id: 'monthly_statement', label: 'My Monthly Statement', urdu: 'ماہانہ کسٹمر کھاتہ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw & Rewards', urdu: 'لکی ڈرا اور انعامات', icon: Trophy },
  ];

  // 3. Investor Navigation (Strictly isolated portfolio)
  const investorNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'investors', label: 'Investor Portfolio', urdu: 'انویسٹر پورٹل و منافع', icon: TrendingUp },
  ];
  const investorDropdownItems: NavItem[] = [
    { id: 'lucky_draw', label: 'Lucky Draw', urdu: 'لکی ڈرا', icon: Trophy },
  ];

  // 4. Reseller Navigation
  const resellerNavItems: NavItem[] = [
    { id: 'store', label: 'Shop & Catalog', urdu: 'مارکیٹ کیٹلاگ', icon: ShoppingBag },
    { id: 'resellers', label: 'Reseller Portal & Earnings', urdu: 'ری سیلر پورٹل', icon: Briefcase },
  ];
  const resellerDropdownItems: NavItem[] = [
    { id: 'history', label: 'Transaction History', urdu: 'کھاتہ ہسٹری', icon: Clock },
    { id: 'monthly_statement', label: 'Statement', urdu: 'ماہانہ کھاتہ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw', urdu: 'لکی ڈرا', icon: Trophy },
  ];

  // 5. Staff Navigation
  const staffNavItems: NavItem[] = [
    { id: 'store', label: 'Store & POS', urdu: 'سیل و کیٹلاگ', icon: ShoppingBag },
    { id: 'walkin_pos', label: 'Walk-in POS', urdu: 'واک ان کاؤنٹر', icon: Receipt },
    { id: 'cod_orders', label: 'COD Orders', urdu: 'کیش آن ڈلیوری', icon: Truck, badge: codPendingCount > 0 ? codPendingCount : undefined },
    { id: 'reports', label: 'Daybook', urdu: 'روزنامچہ', icon: BarChart3 },
  ];
  const staffDropdownItems: NavItem[] = [
    { id: 'history', label: 'History', urdu: 'ہسٹری', icon: Clock },
    { id: 'lucky_draw', label: 'Lucky Draw', urdu: 'لکی ڈرا', icon: Trophy },
  ];

  // 6. Store Manager Navigation (Section 2 & 3: Multi-branch operations)
  const managerNavItems: NavItem[] = [
    { id: 'store', label: 'Store & POS', urdu: 'سیل و کیٹلاگ', icon: ShoppingBag },
    { id: 'walkin_pos', label: 'Walk-in POS', urdu: 'واک ان کاؤنٹر', icon: Receipt },
    { id: 'branches_manage', label: 'Branch & Store', urdu: 'برانچ مینجمنٹ', icon: Building2 },
    { id: 'inventory', label: 'Branch Stock', urdu: 'اسٹاک و وننگ اشیاء', icon: Package },
    { id: 'reports', label: 'Daybook & Reports', urdu: 'رپورٹس', icon: BarChart3 },
  ];
  const managerDropdownItems: NavItem[] = [
    { id: 'customers', label: 'Customers Khata', urdu: 'کسٹمرز کھاتہ', icon: Users },
    { id: 'cod_orders', label: 'COD Orders', urdu: 'ڈلیوری آرڈرز', icon: Truck, badge: codPendingCount > 0 ? codPendingCount : undefined },
    { id: 'payment_terms', label: 'Payment Terms Alerts', urdu: '۳ روزہ یاددہانی', icon: CalendarClock, badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined },
    { id: 'history', label: 'Transaction History & Audit', urdu: 'کھاتہ ہسٹری', icon: Clock },
    { id: 'monthly_statement', label: 'Monthly Statements', urdu: 'ماہانہ اسٹیٹمنٹ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw & Winners', urdu: 'لکی ڈرا', icon: Trophy },
  ];

  // 7. Super Admin & Admin Navigation
  const adminNavItems: NavItem[] = [
    { id: 'store', label: 'Store & POS', urdu: 'سیل و کیٹلاگ', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory & Stock', urdu: 'اسٹاک و وننگ اشیاء', icon: Package },
    { id: 'branches_manage', label: 'Branches & Managers', urdu: 'برانچز و مینیجرز', icon: Building2 },
    { id: 'walkin_pos', label: 'Walk-in POS', urdu: 'واک ان سیلز', icon: Receipt },
    { id: 'cod_orders', label: 'COD Orders', urdu: 'کیش آن ڈلیوری', icon: Truck, badge: codPendingCount > 0 ? codPendingCount : undefined },
    { id: 'users', label: 'User Management', urdu: 'صارفین و سیکیورٹی', icon: Users },
    { id: 'investors', label: 'Investors', urdu: 'انویسٹرز کیپٹل', icon: TrendingUp },
    { id: 'reports', label: 'Daybook & Reports', urdu: 'روزنامچہ و آڈٹ', icon: BarChart3 },
  ];
  const adminDropdownItems: NavItem[] = [
    { id: 'categories_manage', label: 'Category Cleanup', urdu: 'کیٹگریز مینجمنٹ', icon: FolderTree },
    { id: 'payment_terms', label: 'Payment Terms Alerts', urdu: '۳ روزہ یاددہانی شیڈول', icon: CalendarClock, badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined },
    { id: 'resellers', label: 'Reseller Accounts', urdu: 'ری سیلرز کمیشن', icon: Briefcase },
    { id: 'hr_payroll', label: 'HR Hiring & Payroll', urdu: 'ملازمین و تنخواہیں', icon: Users },
    { id: 'history', label: 'Transaction History & Audit', urdu: 'مکمل تاریخ وار کھاتہ', icon: Clock },
    { id: 'monthly_statement', label: 'Monthly Statements', urdu: 'ماہانہ اسٹیٹمنٹ', icon: FileText },
    { id: 'lucky_draw', label: 'Lucky Draw & Winners', urdu: 'لکی ڈرا لائیو', icon: Trophy },
    { id: 'dashboard', label: 'Ledger Overview', urdu: 'کھاتہ خلاصہ', icon: FileText },
    { id: 'customers', label: 'Customers Khata', urdu: 'کسٹمرز کھاتہ', icon: Users },
    { id: 'recurring', label: 'Recurring Billing', urdu: 'مقررہ بلنگ', icon: CalendarClock },
    { id: 'whatsapp', label: 'WhatsApp Queue', urdu: 'واٹس ایپ کیو', icon: Phone },
    { id: 'settings', label: 'Settings', urdu: 'سیٹنگز' },
  ];

  const isSuperAdminOrAdmin = userRole === 'super_admin' || userRole === 'admin';

  const primaryNavItems =
    !isAuthenticated
      ? guestNavItems
      : isSuperAdminOrAdmin && viewMode === 'merchant'
      ? adminNavItems
      : userRole === 'manager' && viewMode === 'merchant'
      ? managerNavItems
      : userRole === 'staff' && viewMode === 'merchant'
      ? staffNavItems
      : userRole === 'investor'
      ? investorNavItems
      : userRole === 'reseller'
      ? resellerNavItems
      : customerNavItems;

  const dropdownNavItems =
    !isAuthenticated
      ? guestDropdownItems
      : isSuperAdminOrAdmin && viewMode === 'merchant'
      ? adminDropdownItems
      : userRole === 'manager' && viewMode === 'merchant'
      ? managerDropdownItems
      : userRole === 'staff' && viewMode === 'merchant'
      ? staffDropdownItems
      : userRole === 'investor'
      ? investorDropdownItems
      : userRole === 'reseller'
      ? resellerDropdownItems
      : customerDropdownItems;

  // Build top categories bar from active Level-1 CategoryRecords + always include Upcoming Viral Products | Coming Soon
  const topLevelRecordNames = categoryRecords
    .filter((c) => c.isActive !== false && !c.parentCategoryId && !c.isUpcoming && c.id !== UPCOMING_CATEGORY_ID)
    .map((c) => c.name.trim())
    .filter(Boolean);
  const displayCategories = Array.from(
    new Set([
      'All Categories',
      UPCOMING_CATEGORY_NAME,
      ...(topLevelRecordNames.length > 0 ? topLevelRecordNames : categories.map((c) => c.split('>')[0].trim())),
    ].filter((c) => c && c !== 'All'))
  );

  return (
    <header className="sticky top-0 z-40 flex flex-col no-print shadow-xs bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* 1. MAIN HEADER BAR */}
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4">
            {/* Logo & Tagline (WE BUY WE SELL, Urdu removed) */}
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
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 block tracking-wider uppercase leading-tight mt-0.5">
                  WE BUY WE SELL
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
              {/* VIEW MODE SWITCHER (Only shown to authenticated Super Admin / Admin) */}
              {isAuthenticated && isSuperAdminOrAdmin && (
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
                className={`px-1.5 xs:px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
                  !isAuthenticated
                    ? 'border-amber-400 bg-amber-400/10 text-slate-900 dark:text-white hover:bg-amber-400/20'
                    : userRole === 'super_admin' || userRole === 'admin'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : userRole === 'investor'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                    : userRole === 'manager' || userRole === 'staff'
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                    : userRole === 'reseller'
                    ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-amber-400'
                }`}
                title={isAuthenticated ? 'Account Profile & Security' : 'Sign in to access your account'}
              >
                {!isAuthenticated ? (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate max-w-[65px] xs:max-w-[85px] sm:max-w-[130px]">
                      {userRole === 'super_admin'
                        ? 'Super Admin'
                        : userRole === 'admin'
                        ? 'Admin'
                        : userRole === 'investor'
                        ? (currentUser?.name ? `Inv: ${currentUser.name.split(' ')[0]}` : 'Investor')
                        : userRole === 'manager'
                        ? (currentUser?.name || 'Manager')
                        : userRole === 'staff'
                        ? (currentUser?.name || 'Staff')
                        : userRole === 'reseller'
                        ? (currentUser?.name || 'Reseller')
                        : currentUser?.name || 'My Account'}
                    </span>
                  </>
                )}
              </button>

              {/* Quick Cart Button (Moved slightly left on mobile) */}
              <button
                type="button"
                onClick={() => onOpenCart?.()}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 -ml-1 sm:ml-0 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100 cursor-pointer transition-colors shadow-2xs shrink-0"
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

              {/* Theme Toggle (Moved slightly left on mobile) */}
              <button
                type="button"
                onClick={() => onToggleDarkMode()}
                aria-label="Toggle theme"
                className="p-1 sm:p-1.5 -ml-0.5 sm:ml-0 mr-0.5 sm:mr-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Record Entry Quick Trigger (Only for Admin / Super Admin in Merchant View) */}
              {isAuthenticated && viewMode === 'merchant' && isSuperAdminOrAdmin && (
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
