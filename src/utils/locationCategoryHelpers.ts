import { CategoryRecord, DeliveryAreaConfig, DeliveryCityConfig, ProductItem } from '../types';

export const UPCOMING_CATEGORY_ID = 'cat_upcoming';
export const UPCOMING_CATEGORY_NAME = 'Upcoming Viral Products | Coming Soon';
export const LEGACY_UPCOMING_CATEGORY_NAME = 'Upcoming / Viral Products';

export function normalizeTextKey(val?: string | null): string {
  return (val || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isUpcomingCategoryName(name?: string | null): boolean {
  const n = normalizeTextKey(name);
  if (!n) return false;
  return (
    n === normalizeTextKey(UPCOMING_CATEGORY_NAME) ||
    n === normalizeTextKey(LEGACY_UPCOMING_CATEGORY_NAME) ||
    (n.includes('upcoming') && (n.includes('viral') || n.includes('coming soon')))
  );
}

/**
 * Single authoritative purchase/cart guard for Upcoming / Coming Soon items.
 * IMPORTANT: Never automatically unlocks based on expectedArrivalDate passing.
 * Only an authorized Admin / Stock Manager transfer sets isUpcoming=false & upcomingStatus='available'.
 */
export function isProductPurchaseBlocked(product?: Partial<ProductItem> | null): boolean {
  if (!product) return false;
  if (product.isUpcoming === true) return true;
  if (product.upcomingStatus === 'coming_soon') return true;
  if (product.parentCategoryId === UPCOMING_CATEGORY_ID) return true;
  if (isUpcomingCategoryName(product.category)) return true;
  return false;
}

export function isUserAuthorizedForStockTransfer(user?: {
  role?: string;
  managerAuthorities?: { canManageStock?: boolean };
} | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (user.role === 'manager' && user.managerAuthorities?.canManageStock === true) return true;
  return false;
}

export function normalizeUpcomingCategoryRecord(cat: CategoryRecord): CategoryRecord {
  if (cat.id === UPCOMING_CATEGORY_ID || cat.isUpcoming || isUpcomingCategoryName(cat.name)) {
    return {
      ...cat,
      id: cat.id || UPCOMING_CATEGORY_ID,
      name: UPCOMING_CATEGORY_NAME,
      isUpcoming: true,
      isActive: true,
      level: 1,
      parentCategoryId: undefined,
    };
  }
  return cat;
}

export function computeCategoryLevel(
  cat: CategoryRecord,
  allCategories: CategoryRecord[]
): 1 | 2 | 3 {
  if (!cat.parentCategoryId) return 1;
  const parent = allCategories.find((c) => c.id === cat.parentCategoryId);
  if (!parent || !parent.parentCategoryId) return 2;
  return 3;
}

export function getCategoryDescendantIds(
  allCategories: CategoryRecord[],
  rootCategoryId: string
): Set<string> {
  const result = new Set<string>([rootCategoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of allCategories) {
      if (c.parentCategoryId && result.has(c.parentCategoryId) && !result.has(c.id)) {
        result.add(c.id);
        changed = true;
      }
    }
  }
  return result;
}

export function getCategoryBreadcrumb(
  allCategories: CategoryRecord[],
  categoryId?: string,
  subcategoryId?: string,
  childSubcategoryId?: string,
  fallbackCategory?: string
): string {
  const parts: string[] = [];
  const main = categoryId ? allCategories.find((c) => c.id === categoryId) : undefined;
  const sub = subcategoryId ? allCategories.find((c) => c.id === subcategoryId) : undefined;
  const child = childSubcategoryId ? allCategories.find((c) => c.id === childSubcategoryId) : undefined;

  if (main) parts.push(main.name);
  if (sub && sub.id !== main?.id) parts.push(sub.name);
  if (child && child.id !== sub?.id && child.id !== main?.id) parts.push(child.name);

  if (parts.length > 0) return parts.join(' > ');
  return fallbackCategory || 'General Wholesale';
}

export function resolveCategoryIdsFromProduct(
  product: Partial<ProductItem>,
  allCategories: CategoryRecord[]
): {
  parentCategoryId?: string;
  subcategoryId?: string;
  childSubcategoryId?: string;
} {
  if (isProductPurchaseBlocked(product)) {
    return {
      parentCategoryId: UPCOMING_CATEGORY_ID,
      subcategoryId: undefined,
      childSubcategoryId: undefined,
    };
  }

  let mainId = product.parentCategoryId;
  let subId = product.subcategoryId;
  let childId = product.childSubcategoryId;

  // Validate existing IDs exist in allCategories
  const mainCat = mainId ? allCategories.find((c) => c.id === mainId) : undefined;
  const subCat = subId ? allCategories.find((c) => c.id === subId) : undefined;
  const childCat = childId ? allCategories.find((c) => c.id === childId) : undefined;

  if (childCat && !subCat && childCat.parentCategoryId) {
    subId = childCat.parentCategoryId;
  }
  const resolvedSub = subId ? allCategories.find((c) => c.id === subId) : undefined;
  if (resolvedSub && !mainCat && resolvedSub.parentCategoryId) {
    mainId = resolvedSub.parentCategoryId;
  }

  if (!mainId && product.category) {
    const segs = product.category
      .split('>')
      .map((s) => s.trim())
      .filter(Boolean);
    if (segs.length > 0) {
      const m = allCategories.find((c) => !c.parentCategoryId && normalizeTextKey(c.name) === normalizeTextKey(segs[0]));
      if (m) {
        mainId = m.id;
        if (segs[1]) {
          const s = allCategories.find(
            (c) => c.parentCategoryId === m.id && normalizeTextKey(c.name) === normalizeTextKey(segs[1])
          );
          if (s) {
            subId = s.id;
            if (segs[2]) {
              const ch = allCategories.find(
                (c) => c.parentCategoryId === s.id && normalizeTextKey(c.name) === normalizeTextKey(segs[2])
              );
              if (ch) childId = ch.id;
            }
          }
        }
      } else {
        // Check if leaf name matches any level
        const anyMatch = allCategories.find((c) => normalizeTextKey(c.name) === normalizeTextKey(segs[0]));
        if (anyMatch) {
          const lvl = computeCategoryLevel(anyMatch, allCategories);
          if (lvl === 1) mainId = anyMatch.id;
          if (lvl === 2) {
            subId = anyMatch.id;
            mainId = anyMatch.parentCategoryId;
          }
          if (lvl === 3) {
            childId = anyMatch.id;
            subId = anyMatch.parentCategoryId;
            mainId = allCategories.find((c) => c.id === subId)?.parentCategoryId;
          }
        }
      }
    }
  }

  return {
    parentCategoryId: mainId,
    subcategoryId: subId,
    childSubcategoryId: childId,
  };
}

/**
 * Checks if a product belongs to a selected category (including all descendants at Level 2 & Level 3).
 */
export function doesProductMatchCategoryFilter(
  product: ProductItem,
  selectedCategoryFilter: string,
  allCategories: CategoryRecord[]
): boolean {
  if (!selectedCategoryFilter || selectedCategoryFilter === 'All') return true;

  // Special handling for Upcoming Viral Products | Coming Soon
  if (
    selectedCategoryFilter === UPCOMING_CATEGORY_ID ||
    isUpcomingCategoryName(selectedCategoryFilter)
  ) {
    return isProductPurchaseBlocked(product);
  }

  // First try resolving filter as a category ID or exact category name
  const targetCat = allCategories.find(
    (c) =>
      c.id === selectedCategoryFilter ||
      normalizeTextKey(c.name) === normalizeTextKey(selectedCategoryFilter)
  );

  if (targetCat) {
    if (targetCat.isUpcoming || targetCat.id === UPCOMING_CATEGORY_ID) {
      return isProductPurchaseBlocked(product);
    }

    const descendantIds = getCategoryDescendantIds(allCategories, targetCat.id);
    const descendantNames = new Set<string>();
    allCategories.forEach((c) => {
      if (descendantIds.has(c.id)) {
        descendantNames.add(normalizeTextKey(c.name));
      }
    });

    if (product.parentCategoryId && descendantIds.has(product.parentCategoryId)) {
      // Important: If targetCat is Level 2 or Level 3, only match if product is actually in targetCat or its descendants!
      const targetLevel = computeCategoryLevel(targetCat, allCategories);
      if (targetLevel === 1) return true;
    }
    if (product.subcategoryId && descendantIds.has(product.subcategoryId)) {
      const targetLevel = computeCategoryLevel(targetCat, allCategories);
      if (targetLevel <= 2) return true;
    }
    if (product.childSubcategoryId && descendantIds.has(product.childSubcategoryId)) {
      return true;
    }

    // Fallback string matching on breadcrumb segments e.g. "Fashion & Apparel > Men's Fashion > Shirts"
    const productSegs = (product.category || '')
      .split('>')
      .map((s) => normalizeTextKey(s))
      .filter(Boolean);
    for (const seg of productSegs) {
      if (descendantNames.has(seg)) {
        // Ensure we don't accidentally match parent if targetCat is a child and seg is parent
        if (seg === normalizeTextKey(targetCat.name) || descendantNames.has(seg)) {
          // Only match if targetCat itself or a child of targetCat appears in segments
          const targetIdx = productSegs.indexOf(normalizeTextKey(targetCat.name));
          if (targetIdx !== -1) return true;
          for (const dId of descendantIds) {
            const dObj = allCategories.find((c) => c.id === dId);
            if (dObj && productSegs.includes(normalizeTextKey(dObj.name))) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Fallback raw string match
  return (
    normalizeTextKey(product.category) === normalizeTextKey(selectedCategoryFilter) ||
    normalizeTextKey(product.category).includes(normalizeTextKey(selectedCategoryFilter))
  );
}

export function slugifyId(prefix: string, name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `${prefix}_${slug || Date.now()}`;
}

export function ensureCityAreasShape(cities: DeliveryCityConfig[]): DeliveryCityConfig[] {
  return (cities || []).map((c, idx) => ({
    id: c.id || slugifyId('city', c.name || `city_${idx}`),
    name: (c.name || '').trim(),
    allowed: c.allowed !== false,
    areas: (c.areas || []).map((a, aIdx): DeliveryAreaConfig => ({
      id: a.id || slugifyId('area', `${c.name}_${a.name || aIdx}`),
      name: (a.name || '').trim(),
      allowed: a.allowed !== false,
    })),
  }));
}
