import React, { useState } from 'react';
import {
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Percent,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  ShoppingBag,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { BusinessProfile, ProductItem } from '../types';
import { getCategories, addCategory } from '../utils/storage';
import { ProductImporterModal } from './ProductImporterModal';

interface InventoryViewProps {
  products: ProductItem[];
  profile: BusinessProfile;
  onSaveProduct: (product: ProductItem) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onToggleWinningItem: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  isExternalImportOpen?: boolean;
  onCloseExternalImport?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  profile,
  onSaveProduct,
  onUpdateStock,
  onToggleWinningItem,
  onDeleteProduct,
  isExternalImportOpen = false,
  onCloseExternalImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(isExternalImportOpen);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formUrduName, setFormUrduName] = useState('');
  const [formCategory, setFormCategory] = useState('Cosmetics');
  const [formSku, setFormSku] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formMarketPrice, setFormMarketPrice] = useState('');
  const [formOurPrice, setFormOurPrice] = useState('');
  const [formStockQty, setFormStockQty] = useState('');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formIsWinning, setFormIsWinning] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');

  // Central category management (User directive: categories centrally managed & reusable across all products)
  const [centralCategories, setCentralCategories] = useState<string[]>(() => getCategories());
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Synchronize external import trigger if provided
  React.useEffect(() => {
    if (isExternalImportOpen) {
      setIsImportModalOpen(true);
    }
  }, [isExternalImportOpen]);

  // Keep central categories updated with existing product categories
  const categories = centralCategories;

  const handleCreateCategoryDirect = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryError('Please enter a category name.');
      return;
    }
    const result = addCategory(trimmed);
    setCentralCategories(result.categories);
    setFormCategory(trimmed);
    setNewCategoryInput('');
    setIsCreatingNewCategory(false);
    setCategoryError('');
  };

  // Calculate high-level KPIs
  const totalStockCount = products.reduce((acc, p) => acc + p.stockQty, 0);
  const totalInventoryValuation = products.reduce((acc, p) => acc + p.ourPrice * p.stockQty, 0);
  const totalProfitGenerated = products.reduce((acc, p) => acc + p.totalProfit, 0);
  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

  // Winning items ranked by total profit
  const winningProducts = [...products].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 3);

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchUrdu = p.urduName ? p.urduName.toLowerCase().includes(q) : false;
      const matchSku = p.sku.toLowerCase().includes(q);
      return matchName || matchUrdu || matchSku;
    }
    return true;
  });

  const handleOpenAddModal = (prod?: ProductItem) => {
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormUrduName(prod.urduName || '');
      setFormCategory(prod.category);
      setFormSku(prod.sku);
      setFormCostPrice(String(prod.costPrice));
      setFormMarketPrice(String(prod.marketPrice));
      setFormOurPrice(String(prod.ourPrice));
      setFormStockQty(String(prod.stockQty));
      setFormMinStock(String(prod.minStockAlert));
      setFormIsWinning(prod.isWinningItem);
      setFormImageUrl(prod.imageUrl || '');
      setFormWebsiteUrl(prod.websiteUrl || '');
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormUrduName('');
      setFormCategory(centralCategories[0] || 'Cosmetics');
      setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setFormCostPrice('');
      setFormMarketPrice('');
      setFormOurPrice('');
      setFormStockQty('50');
      setFormMinStock('10');
      setFormIsWinning(false);
      setFormImageUrl('');
      setFormWebsiteUrl('');
    }
    setIsCreatingNewCategory(false);
    setNewCategoryInput('');
    setCategoryError('');
    setIsAddModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(formCostPrice) || 0;
    const market = parseFloat(formMarketPrice) || 0;
    const our = parseFloat(formOurPrice) || 0;
    const stock = parseInt(formStockQty, 10) || 0;
    const minStock = parseInt(formMinStock, 10) || 10;

    const assignedCategory = formCategory.trim() || 'General';
    // Persist category centrally so it is available for all products
    const catResult = addCategory(assignedCategory);
    setCentralCategories(catResult.categories);

    const prodToSave: ProductItem = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: formName.trim(),
      urduName: formUrduName.trim() || undefined,
      category: assignedCategory,
      sku: formSku.trim() || `SKU-${Date.now()}`,
      costPrice: cost,
      marketPrice: market,
      ourPrice: our,
      stockQty: stock,
      minStockAlert: minStock,
      salesCount: editingProduct ? editingProduct.salesCount : 0,
      totalRevenue: editingProduct ? editingProduct.totalRevenue : 0,
      totalProfit: editingProduct ? (our - cost) * editingProduct.salesCount : 0,
      isWinningItem: formIsWinning,
      imageUrl: formImageUrl.trim() || undefined,
      websiteUrl: formWebsiteUrl.trim() || undefined,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString().split('T')[0],
    };

    onSaveProduct(prodToSave);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total Catalog Items</span>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {products.length} Products
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalStockCount.toLocaleString('en-PK')} units in warehouse
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Wholesale Stock Valuation</span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {profile.currencySymbol}{totalInventoryValuation.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            At our selling price
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total Gross Profit Earned</span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {profile.currencySymbol}{totalProfitGenerated.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
            Accumulated profit from sold units
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Low Stock Alert</span>
          <p className={`text-xl font-bold font-mono mt-1 ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {lowStockCount} Items
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {lowStockCount > 0 ? 'Requires immediate restock' : 'All stock levels healthy'}
          </span>
        </div>
      </div>

      {/* 2. WINNING ITEMS SPOTLIGHT (Requested in User Brief) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Winning Items Spotlight (سب سے زیادہ منافع بخش اشیاء)
              </h2>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Ranked dynamically by total sales profit, margin %, and turnover speed
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {winningProducts.map((p, idx) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-3 shadow-2xs space-y-2 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </h3>
                  {p.urduName && (
                    <span className="font-urdu text-[11px] text-slate-500 block truncate">
                      {p.urduName}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">Net Profit:</span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {profile.currencySymbol}{p.totalProfit.toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Units Sold:</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {p.salesCount} sold
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Margin: {Math.round(((p.ourPrice - p.costPrice) / p.ourPrice) * 100)}%</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  +{profile.currencySymbol}{(p.ourPrice - p.costPrice).toLocaleString('en-PK')}/unit
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. INVENTORY TABLE CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, Urdu, SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-lg shadow-2xs cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Import from Website (ویب سائٹ سے امپورٹ)</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product (نیا آئٹم)</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Product Name (نام)</th>
                <th className="py-2.5 px-3">Category / SKU</th>
                <th className="py-2.5 px-3 text-right">Cost Price</th>
                <th className="py-2.5 px-3 text-right">Market Price</th>
                <th className="py-2.5 px-3 text-right">Our Price</th>
                <th className="py-2.5 px-3 text-right">Customer Saves</th>
                <th className="py-2.5 px-3 text-center">Stock Qty</th>
                <th className="py-2.5 px-3 text-center">Winning Item</th>
                <th className="py-2.5 px-3 text-right">Quick Restock</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const savings = p.marketPrice - p.ourPrice;
                const savingsPct = Math.round((savings / p.marketPrice) * 100);
                const isLowStock = p.stockQty <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {p.name}
                      </p>
                      {p.urduName && (
                        <p className="font-urdu text-[11px] text-slate-500 mt-0.5">
                          {p.urduName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-700 dark:text-slate-300 block font-medium">
                        {p.category}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {profile.currencySymbol}{p.costPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 line-through tabular-nums">
                      {profile.currencySymbol}{p.marketPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {profile.currencySymbol}{p.ourPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {profile.currencySymbol}{savings.toLocaleString('en-PK')} ({savingsPct}%)
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        isLowStock
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}>
                        {p.stockQty}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleWinningItem(p.id)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          p.isWinningItem
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                        title="Toggle Winning Item"
                      >
                        <Sparkles className="w-4 h-4 fill-current" />
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <button
                          onClick={() => onUpdateStock(p.id, p.stockQty + 10)}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => onUpdateStock(p.id, p.stockQty + 50)}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          +50
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.websiteUrl && (
                          <a
                            href={p.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                            title="See more details on website (ویب سائٹ پر دیکھیں)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleOpenAddModal(p)}
                          className="p-1 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ADD / EDIT PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <h2 className="text-base font-extrabold tracking-tight">
                {editingProduct ? 'Edit Product Details' : 'Add New Inventory Item (نیا آئٹم)'}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Product Name in English *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 5-in-1 Hot Air Styler"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Product Name in Urdu (اردو نام)
                </label>
                <input
                  type="text"
                  value={formUrduName}
                  onChange={(e) => setFormUrduName(e.target.value)}
                  placeholder="مثال: فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu text-right focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Category (مرکزی کیٹیگری) *
                    </label>
                    {!isCreatingNewCategory && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewCategory(true)}
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        + New Category
                      </button>
                    )}
                  </div>

                  {!isCreatingNewCategory ? (
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingNewCategory(true);
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
                      required
                    >
                      <option value="">Select Existing Category...</option>
                      {centralCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__NEW__">+ Create New Category (نئی کیٹیگری بنائیں)...</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                      <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 block">
                        New Category (مرکزی ڈیٹا بیس میں محفوظ ہوگی):
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => {
                            setNewCategoryInput(e.target.value);
                            setCategoryError('');
                          }}
                          placeholder="e.g. Health & Beauty"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategoryDirect}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewCategory(false);
                            setCategoryError('');
                          }}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {categoryError && (
                        <p className="text-[10px] text-red-500 font-medium">{categoryError}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="WASH-3PC-001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pricing Matrix */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Cost Price (لاگت)
                  </label>
                  <input
                    type="number"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="2200"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Market Price (مارکیٹ)
                  </label>
                  <input
                    type="number"
                    value={formMarketPrice}
                    onChange={(e) => setFormMarketPrice(e.target.value)}
                    placeholder="6980"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-amber-700 dark:text-amber-400 block">
                    Our Price (ہماری قیمت)
                  </label>
                  <input
                    type="number"
                    value={formOurPrice}
                    onChange={(e) => setFormOurPrice(e.target.value)}
                    placeholder="3490"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Inventory & Winning toggle */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Initial Stock Qty
                  </label>
                  <input
                    type="number"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="formIsWinning"
                    checked={formIsWinning}
                    onChange={(e) => setFormIsWinning(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <label htmlFor="formIsWinning" className="font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                    Winning Item ⭐
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Image URL (تصویر کا لنک)
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Website Link (User requirement: keep website link to see more details) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Website Link to See More Details (ویب سائٹ لنک)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Customer clicks this to see full details</span>
                </label>
                <input
                  type="url"
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  placeholder="https://100dagar.pk/products/5-in-1-hot-air-styler"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. COMPLETE WEBSITE PRODUCT IMPORTER MODAL */}
      <ProductImporterModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          if (onCloseExternalImport) onCloseExternalImport();
        }}
        existingProducts={products}
        onSaveProduct={(importedProduct) => {
          onSaveProduct(importedProduct);
          setCentralCategories(getCategories());
        }}
      />
    </div>
  );
};
