import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { CategoryRecord, ProductItem } from '../types';
import {
  addCategory,
  cleanupDuplicateCategories,
  deleteCategory,
  getCategoryRecords,
  saveCategoryRecords,
} from '../utils/storage';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onCategoriesUpdated: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  products,
  onCategoriesUpdated,
}) => {
  const [categories, setCategories] = useState<CategoryRecord[]>(getCategoryRecords);
  const [newCatName, setNewCatName] = useState('');
  const [newCatUrdu, setNewCatUrdu] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isUpcomingFlag, setIsUpcomingFlag] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Refresh local list
  const refreshList = () => {
    setCategories(getCategoryRecords());
    onCategoriesUpdated();
  };

  // Product count for each category
  const getProductCount = (categoryName: string) => {
    return products.filter(
      (p) => p.category?.trim().toLowerCase() === categoryName.trim().toLowerCase()
    ).length;
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Category name is required' });
      return;
    }

    const res = addCategory(trimmed, selectedParentId || undefined, isUpcomingFlag);
    if (res.added) {
      setFeedback({
        type: 'success',
        message: `Category '${trimmed}' created successfully.`,
      });
      setNewCatName('');
      setNewCatUrdu('');
      setSelectedParentId('');
      setIsUpcomingFlag(false);
      refreshList();
    } else {
      setFeedback({
        type: 'error',
        message: `Category '${trimmed}' already exists.`,
      });
    }
  };

  const handleDeleteCategory = (catName: string) => {
    setFeedback(null);
    const res = deleteCategory(catName);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      refreshList();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCleanupDuplicates = () => {
    setFeedback(null);
    const res = cleanupDuplicateCategories();
    setFeedback({
      type: 'success',
      message:
        res.mergedCount > 0
          ? `Cleanup complete: Merged ${res.mergedCount} duplicate/inconsistent category entries.`
          : 'Categories are already clean and unified. No duplicate entries found.',
    });
    refreshList();
  };

  const parentOptions = categories.filter((c) => !c.parentCategoryId && !c.isUpcoming);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-4 sm:my-6 transition-colors">
        {/* Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-tight">
                Category Management &amp; Grouping
              </h2>
              <span className="text-[11px] font-medium text-slate-800 block">
                مرکزی کیٹگری مینجمنٹ و ڈپلیکیٹ کلین اپ
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Quick Action: Cleanup Duplicates */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Automatic Category Deduplication
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Safe cleanup of duplicate naming, extra spaces, and casing inconsistencies across catalog items.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCleanupDuplicates}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clean Up</span>
            </button>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Create Category or Subcategory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name (English):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Watches"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Urdu Title (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="مثلاً اسمارٹ واچز"
                  value={newCatUrdu}
                  onChange={(e) => setNewCatUrdu(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden font-urdu text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Category (Optional Grouping):
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                >
                  <option value="">None (Top-Level Category)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUpcomingFlag}
                    onChange={(e) => setIsUpcomingFlag(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Mark as "Upcoming / Viral" (Disabled Checkout)
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </form>

          {/* Categories Table / List */}
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Existing Categories ({categories.length})</span>
              <span className="text-[11px] font-normal text-slate-400">
                Safe deletion: only empty categories can be removed
              </span>
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((cat) => {
                const count = getProductCount(cat.name);
                const parentCat = categories.find((c) => c.id === cat.parentCategoryId);
                return (
                  <div
                    key={cat.id || cat.name}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {cat.name}
                          </span>
                          {cat.urduName && (
                            <span className="text-[11px] text-slate-400 font-urdu">
                              ({cat.urduName})
                            </span>
                          )}
                          {cat.isUpcoming && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 rounded">
                              Upcoming / Viral
                            </span>
                          )}
                        </div>
                        {parentCat && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5" /> Subcategory of: {parentCat.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {count} {count === 1 ? 'Product' : 'Products'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.name)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          count > 0
                            ? 'text-slate-300 dark:text-slate-600 hover:text-slate-400 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                        title={
                          count > 0
                            ? `Cannot delete: ${count} active products attached`
                            : 'Delete empty category'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Done / محفوظ کریں
          </button>
        </div>
      </div>
    </div>
  );
};
