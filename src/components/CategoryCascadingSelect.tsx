import React, { useMemo, useState } from 'react';
import { FolderTree, Search, Layers } from 'lucide-react';
import { CategoryRecord } from '../types';
import {
  computeCategoryLevel,
  getCategoryBreadcrumb,
  isUpcomingCategoryName,
  UPCOMING_CATEGORY_ID,
} from '../utils/locationCategoryHelpers';

interface CategoryCascadingSelectProps {
  categories: CategoryRecord[];
  parentCategoryId?: string;
  subcategoryId?: string;
  childSubcategoryId?: string;
  excludeUpcoming?: boolean;
  onChange: (selection: {
    parentCategoryId: string;
    subcategoryId?: string;
    childSubcategoryId?: string;
    breadcrumb: string;
    isUpcoming: boolean;
  }) => void;
  label?: string;
}

export const CategoryCascadingSelect: React.FC<CategoryCascadingSelectProps> = ({
  categories,
  parentCategoryId = '',
  subcategoryId = '',
  childSubcategoryId = '',
  excludeUpcoming = false,
  onChange,
  label = 'Category Hierarchy (Main → Subcategory → Child Subcategory)',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const activeCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.isActive === false) return false;
        if (excludeUpcoming && (c.isUpcoming || c.id === UPCOMING_CATEGORY_ID || isUpcomingCategoryName(c.name))) {
          return false;
        }
        return true;
      }),
    [categories, excludeUpcoming]
  );

  const mainCategories = useMemo(
    () => activeCategories.filter((c) => !c.parentCategoryId),
    [activeCategories]
  );

  const subcategories = useMemo(
    () =>
      parentCategoryId
        ? activeCategories.filter((c) => c.parentCategoryId === parentCategoryId)
        : [],
    [activeCategories, parentCategoryId]
  );

  const childSubcategories = useMemo(
    () =>
      subcategoryId
        ? activeCategories.filter((c) => c.parentCategoryId === subcategoryId)
        : [],
    [activeCategories, subcategoryId]
  );

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return activeCategories
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.urduName && c.urduName.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [activeCategories, searchTerm]);

  const emitSelection = (mainId: string, subId?: string, childId?: string) => {
    const mainObj = categories.find((c) => c.id === mainId);
    const isUpcoming = Boolean(
      mainObj?.isUpcoming || mainId === UPCOMING_CATEGORY_ID || isUpcomingCategoryName(mainObj?.name)
    );
    const breadcrumb = getCategoryBreadcrumb(categories, mainId, subId, childId);
    onChange({
      parentCategoryId: mainId,
      subcategoryId: subId || undefined,
      childSubcategoryId: childId || undefined,
      breadcrumb,
      isUpcoming,
    });
  };

  const handleQuickPick = (cat: CategoryRecord) => {
    const level = computeCategoryLevel(cat, categories);
    if (level === 1) {
      emitSelection(cat.id);
    } else if (level === 2 && cat.parentCategoryId) {
      emitSelection(cat.parentCategoryId, cat.id);
    } else if (level === 3 && cat.parentCategoryId) {
      const sub = categories.find((c) => c.id === cat.parentCategoryId);
      if (sub?.parentCategoryId) {
        emitSelection(sub.parentCategoryId, sub.id, cat.id);
      } else {
        emitSelection(cat.parentCategoryId, cat.id);
      }
    }
    setSearchTerm('');
  };

  const selectedIsUpcoming = useMemo(() => {
    const m = categories.find((c) => c.id === parentCategoryId);
    return Boolean(m?.isUpcoming || parentCategoryId === UPCOMING_CATEGORY_ID);
  }, [categories, parentCategoryId]);

  const fieldCls =
    'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400';

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-amber-500" />
          <span>{label}</span>
        </label>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick search category..."
            className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-400"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.map((res) => {
                const lvl = computeCategoryLevel(res, categories);
                return (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => handleQuickPick(res)}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {res.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      L{lvl}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Level 1: Main Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            1. Main Category *
          </label>
          <select
            required
            value={parentCategoryId}
            onChange={(e) => emitSelection(e.target.value, undefined, undefined)}
            className={fieldCls}
          >
            <option value="">-- Select Main Category --</option>
            {mainCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 2: Subcategory */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            2. Subcategory (Optional)
          </label>
          <select
            disabled={!parentCategoryId || selectedIsUpcoming || subcategories.length === 0}
            value={subcategoryId}
            onChange={(e) =>
              emitSelection(parentCategoryId, e.target.value || undefined, undefined)
            }
            className={`${fieldCls} disabled:opacity-50`}
          >
            <option value="">
              {subcategories.length === 0 ? 'No subcategories' : '-- Optional Subcategory --'}
            </option>
            {subcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level 3: Child Subcategory */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            3. Child Subcategory (Optional)
          </label>
          <select
            disabled={!subcategoryId || selectedIsUpcoming || childSubcategories.length === 0}
            value={childSubcategoryId}
            onChange={(e) =>
              emitSelection(parentCategoryId, subcategoryId, e.target.value || undefined)
            }
            className={`${fieldCls} disabled:opacity-50`}
          >
            <option value="">
              {childSubcategories.length === 0
                ? 'No child subcategories'
                : '-- Optional Child Category --'}
            </option>
            {childSubcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {parentCategoryId && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Assigned Path:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {getCategoryBreadcrumb(categories, parentCategoryId, subcategoryId, childSubcategoryId)}
          </span>
        </div>
      )}
    </div>
  );
};
