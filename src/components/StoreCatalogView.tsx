import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Percent,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Clock,
  ArrowRight,
  Send,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Tag,
  AlertTriangle,
  ExternalLink,
  Globe,
  Download,
} from 'lucide-react';
import { BusinessProfile, CartItem, Customer, ProductItem } from '../types';
import { ProductDetailsModal } from './ProductDetailsModal';

interface StoreCatalogViewProps {
  products: ProductItem[];
  customers: Customer[];
  profile: BusinessProfile;
  cart: CartItem[];
  onAddToCart: (product: ProductItem, qty?: number) => void;
  onUpdateCartQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenImportModal?: () => void;
  isCustomerView?: boolean;
  hideCostPrice?: boolean;
  userRole?: string;
}

export const StoreCatalogView: React.FC<StoreCatalogViewProps> = ({
  products,
  customers,
  profile,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onOpenCheckout,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenImportModal,
  isCustomerView = false,
  hideCostPrice = false,
  userRole = 'customer',
}) => {
  const [sortBy, setSortBy] = useState<'default' | 'winning_profit' | 'highest_savings' | 'price_low' | 'price_high'>('default');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'individual' | 'retail'>('all');
  const [showWinningOnly, setShowWinningOnly] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<ProductItem | null>(null);

  // DYNAMIC CATEGORIES: Strictly only categories present or imported from website (User directive)
  const dynamicCategories = useMemo(() => {
    const countsMap = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category ? p.category.trim() : 'General';
      countsMap.set(cat, (countsMap.get(cat) || 0) + 1);
    });
    return Array.from(countsMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [products]);

  // Cart calculations
  const totalCartItems = cart.reduce((acc, it) => acc + it.quantity, 0);
  const totalCartMarket = cart.reduce((acc, it) => acc + it.marketPrice * it.quantity, 0);
  const totalCartAmount = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalCartSavings = totalCartMarket - totalCartAmount;

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory && selectedCategory !== 'All Categories' && selectedCategory !== 'For you') {
          const matchCat = p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            selectedCategory.toLowerCase().includes(p.category.toLowerCase());
          if (!matchCat) return false;
        }

        // Winning items toggle
        if (showWinningOnly && !p.isWinningItem) {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchUrdu = p.urduName ? p.urduName.toLowerCase().includes(q) : false;
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchUrdu && !matchSku && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'winning_profit') {
          return b.totalProfit - a.totalProfit;
        }
        if (sortBy === 'highest_savings') {
          const saveA = a.marketPrice - a.ourPrice;
          const saveB = b.marketPrice - b.ourPrice;
          return saveB - saveA;
        }
        if (sortBy === 'price_low') {
          return a.ourPrice - b.ourPrice;
        }
        if (sortBy === 'price_high') {
          return b.ourPrice - a.ourPrice;
        }
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy, showWinningOnly]);

  return (
    <div className="space-y-6">
      {/* 1. BREADCRUMB & TOP BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">Home</span>
          <span>&gt;</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {selectedCategory || 'For you'}
          </span>
          {showWinningOnly && (
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Winning Items Only / وننگ پروڈکٹس
            </span>
          )}
        </div>
      </div>

      {/* 2. MAIN LAYOUT: LEFT SIDEBAR + PRODUCT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT SIDEBAR: CATEGORIES TREE (Matching Screenshot) */}
        <aside className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Show All Categories</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </h2>
            <button
              onClick={() => onCategoryChange('All Categories')}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Quick Filter: Winning Items Toggle */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
            <button
              onClick={() => setShowWinningOnly(!showWinningOnly)}
              className="w-full flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Winning Items (High Profit)</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] ${showWinningOnly ? 'bg-amber-500 text-white' : 'bg-amber-200 text-amber-800'}`}>
                {showWinningOnly ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Dynamic Categories List from products */}
          <nav className="space-y-0.5 text-xs">
            <button
              onClick={() => onCategoryChange('All Categories')}
              className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left transition-colors cursor-pointer ${
                selectedCategory === 'All Categories' || selectedCategory === 'For you'
                  ? 'bg-[#FFD200]/20 text-slate-950 dark:text-white font-bold border-l-3 border-[#FFD200]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="truncate">All Categories (تمام اشیاء)</span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({products.length})
              </span>
            </button>

            {dynamicCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => onCategoryChange(cat.name)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFD200]/20 text-slate-950 dark:text-white font-bold border-l-3 border-[#FFD200]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({cat.count})
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Quick Import from Website Button in Sidebar (USER DIRECTIVE: keep only visible import from website link for super admin hide for others) */}
          {userRole === 'admin' && onOpenImportModal && (
            <div className="pt-2">
              <button
                onClick={onOpenImportModal}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Import from Website Link</span>
              </button>
              <span className="text-[10px] text-slate-400 text-center block mt-1">
                ویب سائٹ لنک سے پراڈکٹ امپورٹ کریں (ایڈمن)
              </span>
            </div>
          )}

          {/* Customer Type Quick Selector (Admin Only) */}
          {!isCustomerView && userRole === 'admin' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                Customer Mode (کسٹمر کی قسم)
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  onClick={() => setCustomerTypeFilter('individual')}
                  className={`py-1 px-2 rounded text-center font-medium cursor-pointer transition-colors ${
                    customerTypeFilter === 'individual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Individual (انفرادی)
                </button>
                <button
                  onClick={() => setCustomerTypeFilter('retail')}
                  className={`py-1 px-2 rounded text-center font-medium cursor-pointer transition-colors ${
                    customerTypeFilter === 'retail'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Retail Store (ریٹیلر)
                </button>
              </div>
            </div>
          )}

          {/* Payment Terms Info Card */}
          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> Payment Terms Policy:
            </span>
            <p>• Soft reminder before 3 days</p>
            <p>• Due date payment alert (1 week max grace)</p>
            <p>• Overdue reminder every 3 days until settled</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 pt-1 text-[10px]">
              EasyPaisa · JazzCash · SadaPay · COD Available
            </p>
          </div>
        </aside>

        {/* RIGHT AREA: HEADER BAR + PRODUCT GRID + CART DRAWER TRIGGER */}
        <section className="lg:col-span-3 space-y-4">
          {/* Main Grid Header Row (Matching Screenshot) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {selectedCategory || 'For you'}
              </h1>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing 1–{filteredProducts.length} of {products.length} wholesale catalog items
              </span>
            </div>

            {/* Sorting & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                >
                  <option value="default">Default sorting</option>
                  <option value="winning_profit">Winning items by Sale Profit ⭐</option>
                  <option value="highest_savings">Highest Customer Savings (زیادہ بچت)</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              <span className="text-slate-400 text-xs">|</span>

              <span className="text-slate-500 text-[11px] font-mono">
                Page 1 of {Math.max(1, Math.ceil(filteredProducts.length / 15))}
              </span>
            </div>
          </div>

          {/* PRODUCT CARDS GRID (USER DIRECTIVE: show two products in row on mobile & fix device paddings) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const savings = product.marketPrice - product.ourPrice;
              const savingsPercent = Math.round((savings / product.marketPrice) * 100);
              const inCart = cart.find((it) => it.product.id === product.id);

              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* Top Image */}
                  <div
                    onClick={() => setSelectedDetailProduct(product)}
                    className="relative bg-slate-100 dark:bg-slate-800 h-32 sm:h-44 overflow-hidden flex items-center justify-center cursor-pointer"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center gap-1 font-mono">
                        <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 opacity-40" />
                        <span className="text-[10px]">100DAGAR Lot</span>
                      </div>
                    )}

                    {/* Green Discount Badge */}
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1 items-start">
                      <span className="bg-emerald-600 text-white font-extrabold text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded shadow-xs">
                        -{savingsPercent}%
                      </span>
                      {product.isWinningItem && (
                        <span className="bg-amber-500 text-slate-950 font-bold text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 rounded shadow-xs flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> WINNING
                        </span>
                      )}
                    </div>

                    {/* Stock Alert Badge */}
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                      <span className={`text-[8px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded font-bold ${
                        product.stockQty <= product.minStockAlert
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-900/80 text-white backdrop-blur-xs'
                      }`}>
                        {product.stockQty} in stock
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {/* Category kicker */}
                      <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                        {product.category}
                      </span>

                      {/* Title */}
                      <h3
                        onClick={() => setSelectedDetailProduct(product)}
                        className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 line-clamp-2 mt-0.5 cursor-pointer leading-tight"
                        title={product.name}
                      >
                        {product.name}
                      </h3>

                      {/* Urdu Name */}
                      {product.urduName && (
                        <p className="font-urdu text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate leading-snug">
                          {product.urduName}
                        </p>
                      )}
                    </div>

                    {/* Pricing Block with Market Price, Our Price & Customer Savings */}
                    <div className="pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1.5 sm:gap-2">
                        {/* Our Price */}
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                          {profile.currencySymbol}{product.ourPrice.toLocaleString('en-PK')}
                        </span>

                        {/* Strikethrough Market Price */}
                        <span className="text-[10px] sm:text-xs text-slate-400 line-through font-mono tabular-nums">
                          {profile.currencySymbol}{product.marketPrice.toLocaleString('en-PK')}
                        </span>
                      </div>

                      {/* Customer Savings Highlight Badge */}
                      <div className="mt-1 flex items-center justify-between text-[9px] sm:text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        <span className="truncate">بچت (Save):</span>
                        <span className="font-mono font-bold shrink-0">
                          {profile.currencySymbol}{savings.toLocaleString('en-PK')}
                        </span>
                      </div>

                      {/* Profit Metrics for Store Manager (STRICTLY HIDDEN IN CUSTOMER VIEW!) */}
                      {!isCustomerView && !hideCostPrice && (
                        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                          <span>Cost: {profile.currencySymbol}{product.costPrice.toLocaleString('en-PK')}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            +{profile.currencySymbol}{(product.ourPrice - product.costPrice).toLocaleString('en-PK')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Specs & Detailed Pictures Quick View Trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedDetailProduct(product)}
                      className="w-full inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer border border-amber-200/80 dark:border-amber-900 truncate"
                    >
                      <Eye className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">Specs &amp; Photos (تفصیل)</span>
                    </button>

                    {/* Website Link (User requirement: keep website link to see more details) */}
                    {product.websiteUrl && (
                      <a
                        href={product.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">View on Website</span>
                      </a>
                    )}

                    {/* Action Bar: Add to Cart / Sell */}
                    <div className="pt-0.5 flex items-center justify-between gap-1.5">
                      {inCart ? (
                        <div className="w-full flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-0.5 sm:p-1">
                          <button
                            onClick={() => onUpdateCartQty(product.id, inCart.quantity - 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded shadow-2xs hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-[11px] sm:text-xs text-amber-900 dark:text-amber-200">
                            {inCart.quantity} in cart
                          </span>
                          <button
                            onClick={() => onUpdateCartQty(product.id, inCart.quantity + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-amber-500 text-slate-900 rounded shadow-2xs hover:bg-amber-400 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart(product, 1)}
                          className="w-full inline-flex items-center justify-center gap-1 py-1.5 sm:py-2 px-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No products found in category "{selectedCategory}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for another keyword or select "Show All Categories".
              </p>
              <button
                onClick={() => {
                  onCategoryChange('All Categories');
                  onSearchChange('');
                  setShowWinningOnly(false);
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 3. FLOATING POS DRAFT CART BAR (If cart has items) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-mono">
              {totalCartItems}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Active Sale / POS Cart</span>
                <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                  Customer Saves: {profile.currencySymbol}{totalCartSavings.toLocaleString('en-PK')}
                </span>
              </div>
              <span className="text-xs text-slate-300 font-mono">
                Total Our Price: <b className="text-amber-400 text-sm">{profile.currencySymbol}{totalCartAmount.toLocaleString('en-PK')}</b> (Market: <span className="line-through">{profile.currencySymbol}{totalCartMarket.toLocaleString('en-PK')}</span>)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearCart}
              className="px-3 py-2 text-xs text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
            >
              Clear Cart
            </button>
            <button
              onClick={onOpenCheckout}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform hover:scale-102 cursor-pointer"
            >
              <span>Proceed to Checkout &amp; Payment Terms</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS, PICTURES, SIZES & SPECS MODAL */}
      <ProductDetailsModal
        product={selectedDetailProduct}
        isOpen={!!selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
        onAddToCart={onAddToCart}
        profile={profile}
        isCustomerView={isCustomerView}
      />
    </div>
  );
};
