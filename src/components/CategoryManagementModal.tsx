import React, { useMemo, useState } from 'react';
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
  Pencil,
  ChevronRight,
  ChevronDown,
  Power,
  Check,
} from 'lucide-react';
import { CategoryRecord, ProductItem } from '../types';
import {
  apiDeleteCategoryRecord,
  apiSaveCategoryRecord,
  cleanupDuplicateCategories,
  deleteCategory,
  getCategoryRecords,
  saveCategoryRecords,
  saveProducts,
} from '../utils/storage';
import {
  computeCategoryLevel,
  doesProductMatchCategoryFilter,
  getCategoryBreadcrumb,
  getCategoryDescendantIds,
  isUpcomingCategoryName,
  normalizeTextKey,
  slugifyId,
  UPCOMING_CATEGORY_ID,
} from '../utils/locationCategoryHelpers';

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
  const [newCatDesc, setNewCatDesc] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrdu, setEditUrdu] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentCategoryId),
    [categories]
  );

  // Eligible parents for Level 2 & Level 3 (Level 1 Main and Level 2 Subcategories, excluding Upcoming)
  const eligibleParentOptions = useMemo(() => {
    return categories
      .filter((c) => {
        if (c.isUpcoming || c.id === UPCOMING_CATEGORY_ID || isUpcomingCategoryName(c.name)) return false;
        const lvl = computeCategoryLevel(c, categories);
        return lvl <= 2;
      })
      .map((c) => {
        const lvl = computeCategoryLevel(c, categories);
        const parent = c.parentCategoryId ? categories.find((p) => p.id === c.parentCategoryId) : undefined;
        return {
          ...c,
          level: lvl,
          label: lvl === 2 && parent ? `${parent.name} → ${c.name}` : c.name,
        };
      });
  }, [categories]);

  if (!isOpen) return null;

  const refreshList = () => {
    setCategories(getCategoryRecords());
    onCategoriesUpdated();
  };

  const getProductCount = (cat: CategoryRecord) => {
    return products.filter((p) => doesProductMatchCategoryFilter(p, cat.id, categories)).length;
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    if (isUpcomingCategoryName(trimmed)) {
      setFeedback({
        type: 'error',
        message: 'The Upcoming Viral Products | Coming Soon category already exists.',
      });
      return;
    }

    const parentId = selectedParentId || undefined;
    const duplicate = categories.some(
      (c) =>
        normalizeTextKey(c.name) === normalizeTextKey(trimmed) &&
        (c.parentCategoryId || '') === (parentId || '')
    );
    if (duplicate) {
      setFeedback({
        type: 'error',
        message: `Category "${trimmed}" already exists under the selected parent.`,
      });
      return;
    }

    setIsSaving(true);
    const parentObj = parentId ? categories.find((c) => c.id === parentId) : undefined;
    const level: 1 | 2 | 3 = !parentObj ? 1 : parentObj.parentCategoryId ? 3 : 2;
    const payload: CategoryRecord = {
      id: `${slugifyId('cat', trimmed)}_${Date.now().toString(36).slice(-4)}`,
      name: trimmed,
      urduName: newCatUrdu.trim() || undefined,
      description: newCatDesc.trim() || undefined,
      parentCategoryId: parentId,
      level,
      isActive: true,
      displayOrder: categories.length + 1,
    };

    const res = await apiSaveCategoryRecord(payload);
    setIsSaving(false);

    if (res.ok && res.categories) {
      saveCategoryRecords(res.categories);
      setCategories(res.categories);
      onCategoriesUpdated();
      if (parentId) {
        setExpandedIds((prev) => ({ ...prev, [parentId]: true }));
      }
      setFeedback({
        type: 'success',
        message: `Created ${level === 1 ? 'Main Category' : level === 2 ? 'Subcategory' : 'Child Subcategory'} "${trimmed}".`,
      });
      setNewCatName('');
      setNewCatUrdu('');
      setNewCatDesc('');
      setSelectedParentId('');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Could not create category.' });
    }
  };

  const startEdit = (cat: CategoryRecord) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditUrdu(cat.urduName || '');
    setEditDesc(cat.description || '');
    setEditParentId(cat.parentCategoryId || '');
    setFeedback(null);
  };

  const handleSaveEdit = async (cat: CategoryRecord) => {
    setFeedback(null);
    const cleanName = editName.trim();
    if (!cleanName) {
      setFeedback({ type: 'error', message: 'Category name cannot be empty.' });
      return;
    }

    const nextParentId =
      cat.isUpcoming || cat.id === UPCOMING_CATEGORY_ID ? undefined : editParentId || undefined;

    if (nextParentId) {
      const descendants = getCategoryDescendantIds(categories, cat.id);
      if (descendants.has(nextParentId)) {
        setFeedback({
          type: 'error',
          message: 'Cannot assign a category under itself or its own descendant.',
        });
        return;
      }
    }

    setIsSaving(true);
    const res = await apiSaveCategoryRecord(
      {
        name: cat.isUpcoming || cat.id === UPCOMING_CATEGORY_ID ? cat.name : cleanName,
        urduName: editUrdu.trim() || undefined,
        description: editDesc.trim() || undefined,
        parentCategoryId: nextParentId,
      },
      cat.id
    );
    setIsSaving(false);

    if (res.ok && res.categories) {
      saveCategoryRecords(res.categories);
      // Sync local product breadcrumbs
      const refreshedCats = res.categories;
      const updatedProds = products.map((p) => {
        if (
          p.parentCategoryId === cat.id ||
          p.subcategoryId === cat.id ||
          p.childSubcategoryId === cat.id
        ) {
          return {
            ...p,
            category: getCategoryBreadcrumb(
              refreshedCats,
              p.parentCategoryId,
              p.subcategoryId,
              p.childSubcategoryId,
              p.category
            ),
          };
        }
        return p;
      });
      saveProducts(updatedProds);
      setCategories(refreshedCats);
      setEditingId(null);
      onCategoriesUpdated();
      setFeedback({ type: 'success', message: `Category "${cleanName}" updated.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update category.' });
    }
  };

  const handleToggleActive = async (cat: CategoryRecord) => {
    if (cat.isUpcoming || cat.id === UPCOMING_CATEGORY_ID) return;
    setFeedback(null);
    const nextActive = cat.isActive === false;
    const res = await apiSaveCategoryRecord({ isActive: nextActive }, cat.id);
    if (res.ok && res.categories) {
      saveCategoryRecords(res.categories);
      setCategories(res.categories);
      onCategoriesUpdated();
      setFeedback({
        type: 'success',
        message: `"${cat.name}" is now ${nextActive ? 'Active' : 'Inactive'}.`,
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to toggle status.' });
    }
  };

  const handleDelete = async (cat: CategoryRecord) => {
    setFeedback(null);
    const res = await apiDeleteCategoryRecord(cat.id);
    if (res.ok) {
      deleteCategory(cat.name);
      refreshList();
      setFeedback({ type: 'success', message: `Category "${cat.name}" deleted.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Cannot delete category.' });
    }
  };

  const handleCleanupDuplicates = () => {
    setFeedback(null);
    const res = cleanupDuplicateCategories();
    setFeedback({
      type: 'success',
      message:
        res.mergedCount > 0
          ? `Cleanup complete: Merged ${res.mergedCount} duplicate category entries.`
          : 'Categories are already clean and unified.',
    });
    refreshList();
  };

  const renderCategoryRow = (cat: CategoryRecord, depth: number) => {
    const children = categories.filter((c) => c.parentCategoryId === cat.id);
    const isExpanded = expandedIds[cat.id] ?? true;
    const count = getProductCount(cat);
    const isUpcoming = Boolean(cat.isUpcoming || cat.id === UPCOMING_CATEGORY_ID);
    const isEditing = editingId === cat.id;
    const isActive = cat.isActive !== false;

    const editParentCandidates = eligibleParentOptions.filter((opt) => {
      if (opt.id === cat.id) return false;
      const desc = getCategoryDescendantIds(categories, cat.id);
      if (desc.has(opt.id)) return false;
      // If cat has children, cat cannot move under Level 2 (would push children to Level 4)
      if (children.length > 0 && opt.level >= 2) return false;
      return true;
    });

    return (
      <div key={cat.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
        <div
          className={`p-3 flex flex-col gap-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
            depth === 1 ? 'pl-8 bg-slate-50/40 dark:bg-slate-900/60' : depth === 2 ? 'pl-14 bg-slate-50/80 dark:bg-slate-950/40' : ''
          }`}
        >
          {isEditing ? (
            <div className="space-y-2.5 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled={isUpcoming}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Category name"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                />
                <input
                  type="text"
                  value={editUrdu}
                  onChange={(e) => setEditUrdu(e.target.value)}
                  placeholder="Urdu title (optional)"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu text-right"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!isUpcoming && (
                  <select
                    value={editParentId}
                    onChange={(e) => setEditParentId(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Top-Level Main Category (Level 1)</option>
                    {editParentCandidates.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        Under: {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSaveEdit(cat)}
                  className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {children.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((prev) => ({ ...prev, [cat.id]: !isExpanded }))
                    }
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-5 shrink-0 flex justify-center">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {depth === 0 ? 'Main' : depth === 1 ? 'Subcategory' : 'Child'}
                    </span>
                    {cat.urduName && (
                      <span className="text-[11px] text-slate-400 font-urdu">
                        ({cat.urduName})
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 rounded">
                        Always Visible · Checkout Locked
                      </span>
                    )}
                    {!isActive && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{cat.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {count} {count === 1 ? 'Item' : 'Items'}
                </span>

                {depth < 2 && !isUpcoming && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParentId(cat.id);
                      setFeedback(null);
                    }}
                    className="px-2 py-1 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded cursor-pointer"
                    title={`Add child under ${cat.name}`}
                  >
                    + Sub
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                  title="Edit category"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                {!isUpcoming && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(cat)}
                      className={`p-1.5 rounded-md cursor-pointer ${
                        isActive
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isActive ? 'Deactivate category' : 'Activate category'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(cat)}
                      disabled={count > 0 || children.length > 0}
                      className={`p-1.5 rounded-md transition-colors ${
                        count > 0 || children.length > 0
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer'
                      }`}
                      title={
                        children.length > 0
                          ? 'Remove or reassign subcategories first'
                          : count > 0
                          ? `Cannot delete: ${count} products attached`
                          : 'Delete empty category'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div>{children.map((child) => renderCategoryRow(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-4 sm:my-6 transition-colors">
        {/* Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-tight">
                3-Level Category &amp; Subcategory Manager
              </h2>
              <span className="text-[11px] font-medium text-slate-800 block">
                Main Category → Subcategory → Child Subcategory (Synced Across All Devices)
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

        <div className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
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

          {/* Cleanup Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Category Normalization &amp; Deduplication
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Unifies casing and spacing while keeping your 3-level hierarchy intact.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCleanupDuplicates}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clean Up</span>
            </button>
          </div>

          {/* Add Category Form */}
          <form
            onSubmit={handleAddCategory}
            className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-3"
          >
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Create Category / Subcategory / Child Subcategory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Men's Fashion or Shalwar Kameez"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Urdu Title (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً مردانہ ملبوسات"
                  value={newCatUrdu}
                  onChange={(e) => setNewCatUrdu(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden font-urdu text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Category (Max 3 Levels)
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                >
                  <option value="">None — Create Level 1 Main Category</option>
                  {eligibleParentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.level === 1 ? `[L1 Main] ${p.label}` : `[L2 Sub] ${p.label}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Short description for staff & storefront"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Create Category'}</span>
            </button>
          </form>

          {/* Hierarchical Category Tree */}
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Category Hierarchy ({categories.length} Total)</span>
              <span className="text-[11px] font-normal text-slate-400">
                Duplicate names blocked under same parent
              </span>
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {mainCategories.map((cat) => renderCategoryRow(cat, 0))}
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
