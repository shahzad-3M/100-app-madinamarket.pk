import {
  AdminAuditLog,
  AppUser,
  AttendanceRecord,
  Branch,
  BroadcastContact,
  BusinessProfile,
  CategoryRecord,
  CODOrder,
  CommissionRecord,
  Customer,
  DeliveryCityConfig,
  Employee,
  Investor,
  InvestorTransaction,
  LoginAuditRecord,
  LoginFormConfig,
  LuckyDrawEvent,
  ProductBroadcast,
  ProductImportLog,
  ProductItem,
  ProductVariation,
  RecurringInvoice,
  ReminderTemplate,
  Reseller,
  ReviewRewardSubmission,
  SalespersonReferral,
  SavedBroadcastCampaign,
  Transaction,
  UserAccount,
  UserRole,
  WalkInCustomer,
  WalkInSale,
  WasalSettlement,
  WhatsAppNotification,
} from '../types';
import {
  defaultAttendance,
  defaultBranches,
  defaultBroadcastContacts,
  defaultBusinessProfile,
  defaultCategoryRecords,
  defaultCODOrders,
  defaultCommissionRecords,
  defaultCustomers,
  defaultDeliveryCities,
  defaultEmployees,
  defaultImportLogs,
  defaultInvestors,
  defaultInvestorTransactions,
  defaultLoginAuditLogs,
  defaultLoginFormConfig,
  defaultLuckyDrawEvents,
  defaultProductBroadcasts,
  defaultProducts,
  defaultRecurringInvoices,
  defaultReminderTemplates,
  defaultResellers,
  defaultReviewRewards,
  defaultSalespersonReferrals,
  defaultSavedBroadcasts,
  defaultTransactions,
  defaultUserAccounts,
  defaultWalkInCustomers,
  defaultWalkInSales,
  defaultWasalSettlements,
  defaultWhatsAppNotifications,
} from './defaultData';
import {
  ensureCityAreasShape,
  isUpcomingCategoryName,
  normalizeTextKey,
  normalizeUpcomingCategoryRecord,
  UPCOMING_CATEGORY_ID,
  UPCOMING_CATEGORY_NAME,
} from './locationCategoryHelpers';

const STORAGE_KEYS = {
  PROFILE: '100dagar_business_profile_v5',
  CUSTOMERS: '100dagar_customers_v5',
  TRANSACTIONS: '100dagar_transactions_v5',
  PRODUCTS: '100dagar_products_v5',
  RECURRING: '100dagar_recurring_invoices_v5',
  NOTIFICATIONS: '100dagar_whatsapp_notifications_v5',
  TEMPLATES: '100dagar_reminder_templates_v5',
  BROADCASTS: '100dagar_product_broadcasts_v5',
  LUCKY_DRAWS: '100dagar_lucky_draws_v5',
  BROADCAST_CONTACTS: '100dagar_broadcast_contacts_v5',
  SAVED_BROADCASTS: '100dagar_saved_broadcasts_v5',
  COD_ORDERS: '100dagar_cod_orders_v5',
  EMPLOYEES: '100dagar_employees_v5',
  ATTENDANCE: '100dagar_attendance_v5',
  RESELLERS: '100dagar_resellers_v5',
  REVIEW_REWARDS: '100dagar_review_rewards_v5',
  ACTIVE_ROLE: '100dagar_active_role_v5',
  CURRENT_USER: '100dagar_current_user_v5',
  LOGIN_AUDITS: '100dagar_login_audits_v5',
  CATEGORIES: '100dagar_categories_v5',
  CATEGORY_RECORDS: '100dagar_category_records_v5',
  INVESTORS: '100dagar_investors_v5',
  INVESTOR_TRANSACTIONS: '100dagar_investor_transactions_v5',
  USER_ACCOUNTS: '100dagar_user_accounts_v5',
  LOGIN_CONFIG: '100dagar_login_config_v5',
  BRANCHES: '100dagar_branches_v5',
  SP_REFERRALS: '100dagar_sp_referrals_v5',
  WALK_IN_CUSTOMERS: '100dagar_walkin_customers_v5',
  WALK_IN_SALES: '100dagar_walkin_sales_v5',
  COMMISSIONS: '100dagar_commissions_v5',
  IMPORT_LOGS: '100dagar_import_logs_v5',
  WASAL_SETTLEMENTS: '100dagar_wasal_settlements_v5',
};

const MIGRATION_FLAG_KEY = '100dagar_server_migrated_v1';
const SESSION_TOKEN_KEY = '100dagar_session_token_v1';

// Unique per-tab client ID to suppress redundant self-triggered SSE reloads
const CLIENT_ID = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Maps localStorage keys <-> Central SQLite collection keys
const STORAGE_TO_COLLECTION: Record<string, string> = {
  [STORAGE_KEYS.PROFILE]: 'business_profile',
  [STORAGE_KEYS.CUSTOMERS]: 'customers',
  [STORAGE_KEYS.TRANSACTIONS]: 'transactions',
  [STORAGE_KEYS.PRODUCTS]: 'products',
  [STORAGE_KEYS.RECURRING]: 'recurring_invoices',
  [STORAGE_KEYS.NOTIFICATIONS]: 'notifications',
  [STORAGE_KEYS.TEMPLATES]: 'templates',
  [STORAGE_KEYS.BROADCASTS]: 'product_broadcasts',
  [STORAGE_KEYS.LUCKY_DRAWS]: 'lucky_draws',
  [STORAGE_KEYS.BROADCAST_CONTACTS]: 'broadcast_contacts',
  [STORAGE_KEYS.SAVED_BROADCASTS]: 'saved_broadcasts',
  [STORAGE_KEYS.COD_ORDERS]: 'cod_orders',
  [STORAGE_KEYS.EMPLOYEES]: 'employees',
  [STORAGE_KEYS.ATTENDANCE]: 'attendance',
  [STORAGE_KEYS.RESELLERS]: 'resellers',
  [STORAGE_KEYS.REVIEW_REWARDS]: 'review_rewards',
  [STORAGE_KEYS.LOGIN_AUDITS]: 'login_audits',
  [STORAGE_KEYS.CATEGORY_RECORDS]: 'categories',
  [STORAGE_KEYS.INVESTORS]: 'investors',
  [STORAGE_KEYS.INVESTOR_TRANSACTIONS]: 'investor_transactions',
  [STORAGE_KEYS.USER_ACCOUNTS]: 'user_accounts',
  [STORAGE_KEYS.BRANCHES]: 'branches',
  [STORAGE_KEYS.SP_REFERRALS]: 'salesperson_referrals',
  [STORAGE_KEYS.WALK_IN_CUSTOMERS]: 'walkin_customers',
  [STORAGE_KEYS.WALK_IN_SALES]: 'walkin_sales',
  [STORAGE_KEYS.COMMISSIONS]: 'commission_records',
  [STORAGE_KEYS.IMPORT_LOGS]: 'import_logs',
  [STORAGE_KEYS.WASAL_SETTLEMENTS]: 'wasal_settlements',
};

const COLLECTION_TO_STORAGE: Record<string, string> = Object.fromEntries(
  Object.entries(STORAGE_TO_COLLECTION).map(([sKey, cKey]) => [cKey, sKey])
);

// In-memory authoritative state cache hydrated from /api/sync/state
const memoryStore = new Map<string, unknown>();
let adminAuditLogsCache: AdminAuditLog[] = [];
let syncListeners = new Set<() => void>();
let currentSyncVersion = '';
let sseSource: EventSource | null = null;
let initializedPromise: Promise<void> | null = null;
const pendingWriteQueues = new Map<string, Promise<void>>();

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-id': CLIENT_ID,
  };
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const user = getCurrentUser();
  if (user && user.isAuthenticated) {
    headers['x-actor-id'] = user.id;
    headers['x-actor-role'] = user.role;
    headers['x-actor-name'] = user.name;
  }
  return headers;
}

function notifyListeners() {
  for (const cb of syncListeners) {
    try {
      cb();
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  }
}

// Safe localStorage + memoryStore getter
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item) as T;
    memoryStore.set(key, parsed);
    return parsed;
  } catch (e) {
    console.error(`Error loading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function queueServerCollectionWrite(collectionKey: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const prev = pendingWriteQueues.get(collectionKey) || Promise.resolve();
  const next = prev
    .then(async () => {
      const res = await fetch(`/api/collections/${encodeURIComponent(collectionKey)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ data: value }),
      });
      if (res.ok) {
        const json = (await res.json()) as { syncVersion?: string };
        if (json.syncVersion) currentSyncVersion = json.syncVersion;
      }
    })
    .catch((err) => {
      console.warn(`Background sync failed for ${collectionKey}:`, err);
    });
  pendingWriteQueues.set(collectionKey, next);
}

// Safe localStorage + central backend setter
function saveToStorage<T>(key: string, value: T, skipRemotePush = false): void {
  memoryStore.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
  const collectionKey = STORAGE_TO_COLLECTION[key];
  if (!skipRemotePush && collectionKey) {
    queueServerCollectionWrite(collectionKey, value);
  }
}

function applyServerStateSnapshot(state: Record<string, unknown>) {
  if (!state || typeof state !== 'object') return;
  if (typeof state.syncVersion === 'string') {
    currentSyncVersion = state.syncVersion;
  }
  if (Array.isArray(state.admin_audit_logs)) {
    adminAuditLogsCache = state.admin_audit_logs as AdminAuditLog[];
  }
  for (const [colKey, sKey] of Object.entries(COLLECTION_TO_STORAGE)) {
    if (state[colKey] !== undefined) {
      let val = state[colKey];
      if (colKey === 'business_profile' && val && typeof val === 'object') {
        const bp = val as BusinessProfile;
        if (!bp.deliveryCities && Array.isArray(state.cities)) {
          val = { ...bp, deliveryCities: state.cities as DeliveryCityConfig[] };
        }
      }
      memoryStore.set(sKey, val);
      try {
        // Never persist unauthenticated redacted profile over local if user isn't logged in,
        // or cleanly mirror safe server copy to localStorage cache
        localStorage.setItem(sKey, JSON.stringify(val));
      } catch {
        // ignore quota errors on large image galleries
      }
    }
  }
}

export async function refreshSyncState(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/sync/state', {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as Record<string, unknown>;
    applyServerStateSnapshot(data);
    notifyListeners();
    return true;
  } catch {
    return false;
  }
}

async function migrateLocalStorageIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'done') return;

    const collections: Record<string, unknown> = {};
    let hasAnyLocalData = false;
    for (const [sKey, colKey] of Object.entries(STORAGE_TO_COLLECTION)) {
      const raw = localStorage.getItem(sKey);
      if (raw) {
        try {
          collections[colKey] = JSON.parse(raw);
          hasAnyLocalData = true;
        } catch {
          // skip corrupt JSON
        }
      }
    }

    if (hasAnyLocalData) {
      await fetch('/api/sync/migrate-local', {
        method: 'POST',
        headers: getAuthHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ collections }),
      });
    }
    localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
  } catch (err) {
    console.warn('Non-destructive localStorage migration skipped or deferred:', err);
  }
}

export function initSyncStore(): Promise<void> {
  if (initializedPromise) return initializedPromise;
  initializedPromise = (async () => {
    await migrateLocalStorageIfNeeded();
    await refreshSyncState();
  })();
  return initializedPromise;
}

export function subscribeToServerSync(listener: () => void): () => void {
  syncListeners.add(listener);

  if (typeof window !== 'undefined' && !sseSource) {
    try {
      sseSource = new EventSource('/api/events');
      sseSource.addEventListener('sync', (ev) => {
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as {
            sourceClientId?: string;
            updatedAt?: string;
          };
          if (payload.sourceClientId && payload.sourceClientId === CLIENT_ID) {
            return; // Ignore our own echo
          }
          if (payload.updatedAt && payload.updatedAt === currentSyncVersion) {
            return;
          }
        } catch {
          // refresh anyway
        }
        void refreshSyncState();
      });
    } catch {
      // EventSource not supported or blocked
    }

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshSyncState();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    // Lightweight periodic sync check (15s) as fallback
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshSyncState();
      }
    }, 15000);

    return () => {
      syncListeners.delete(listener);
      if (syncListeners.size === 0) {
        sseSource?.close();
        sseSource = null;
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
        window.clearInterval(interval);
      }
    };
  }

  return () => {
    syncListeners.delete(listener);
  };
}

// ==========================================
// SERVER-VALIDATED DOMAIN API ACTIONS
// ==========================================

export async function apiAuthenticateLogin(
  identifier: string,
  pin: string
): Promise<{ ok: boolean; user?: Partial<AppUser>; sessionToken?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': CLIENT_ID },
      cache: 'no-store',
      body: JSON.stringify({ identifier, pin }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok: boolean; user?: Partial<AppUser>; sessionToken?: string };
    if (data.ok && data.sessionToken) {
      setSessionToken(data.sessionToken);
      await refreshSyncState();
    }
    return data;
  } catch {
    return { ok: false };
  }
}

export async function apiActivateProductArrival(
  productId: string,
  payload: {
    parentCategoryId: string;
    subcategoryId?: string;
    childSubcategoryId?: string;
    ourPrice: number;
    marketPrice: number;
    costPrice: number;
    stockQty: number;
    variations?: ProductVariation[];
    details?: string;
    badgeText?: string;
  }
): Promise<{ ok: boolean; product?: ProductItem; error?: string }> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}/activate-arrival`, {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; product?: ProductItem; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to confirm arrival.' };
    }
    await refreshSyncState();
    return { ok: true, product: data.product };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiSaveCategoryRecord(
  payload: Partial<CategoryRecord>,
  existingId?: string
): Promise<{ ok: boolean; category?: CategoryRecord; categories?: CategoryRecord[]; error?: string }> {
  try {
    const url = existingId
      ? `/api/categories/${encodeURIComponent(existingId)}`
      : '/api/categories';
    const res = await fetch(url, {
      method: existingId ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      category?: CategoryRecord;
      categories?: CategoryRecord[];
      error?: string;
    };
    if (!res.ok) return { ok: false, error: data.error || 'Category operation failed.' };
    await refreshSyncState();
    return { ok: true, category: data.category, categories: data.categories };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiDeleteCategoryRecord(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Cannot delete category.' };
    await refreshSyncState();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiAddCity(
  name: string,
  allowed = true
): Promise<{ ok: boolean; cities?: DeliveryCityConfig[]; error?: string }> {
  try {
    const res = await fetch('/api/cities', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ name, allowed }),
    });
    const data = (await res.json()) as { ok?: boolean; cities?: DeliveryCityConfig[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Failed to add city.' };
    await refreshSyncState();
    return { ok: true, cities: data.cities };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiUpdateCity(
  idOrName: string,
  updates: { name?: string; allowed?: boolean }
): Promise<{ ok: boolean; cities?: DeliveryCityConfig[]; error?: string }> {
  try {
    const res = await fetch(`/api/cities/${encodeURIComponent(idOrName)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(updates),
    });
    const data = (await res.json()) as { ok?: boolean; cities?: DeliveryCityConfig[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Failed to update city.' };
    await refreshSyncState();
    return { ok: true, cities: data.cities };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiAddCityArea(
  cityIdOrName: string,
  name: string,
  allowed = true
): Promise<{ ok: boolean; cities?: DeliveryCityConfig[]; error?: string }> {
  try {
    const res = await fetch(`/api/cities/${encodeURIComponent(cityIdOrName)}/areas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ name, allowed }),
    });
    const data = (await res.json()) as { ok?: boolean; cities?: DeliveryCityConfig[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Failed to add area.' };
    await refreshSyncState();
    return { ok: true, cities: data.cities };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiUpdateCityArea(
  areaId: string,
  updates: { name?: string; allowed?: boolean }
): Promise<{ ok: boolean; cities?: DeliveryCityConfig[]; error?: string }> {
  try {
    const res = await fetch(`/api/areas/${encodeURIComponent(areaId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(updates),
    });
    const data = (await res.json()) as { ok?: boolean; cities?: DeliveryCityConfig[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Failed to update area.' };
    await refreshSyncState();
    return { ok: true, cities: data.cities };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiDeleteCityArea(
  areaId: string
): Promise<{ ok: boolean; cities?: DeliveryCityConfig[]; error?: string }> {
  try {
    const res = await fetch(`/api/areas/${encodeURIComponent(areaId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    const data = (await res.json()) as { ok?: boolean; cities?: DeliveryCityConfig[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Failed to remove area.' };
    await refreshSyncState();
    return { ok: true, cities: data.cities };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiSubmitCheckoutOrder(payload: {
  items: Array<{ productId: string; quantity: number }>;
  customer?: Customer;
  transaction?: Transaction;
  codOrder?: CODOrder;
  resellerId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Checkout blocked by server validation.' };
    await refreshSyncState();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function apiCreateServerBackup(reason = 'manual'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/backup', {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ reason }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error || 'Backup failed.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function getAdminAuditLogs(): AdminAuditLog[] {
  return adminAuditLogsCache;
}

// ==========================================
// EXISTING STORAGE EXPORTS (BACKWARD COMPATIBLE)
// ==========================================

// Business Profile
export function getBusinessProfile(): BusinessProfile {
  const prof = loadFromStorage<BusinessProfile>(STORAGE_KEYS.PROFILE, defaultBusinessProfile);
  if (!prof.shippingPartner) {
    prof.shippingPartner = defaultBusinessProfile.shippingPartner;
  }
  if (!prof.adminPin) {
    prof.adminPin = '580987';
  }
  if (!prof.deliveryCities || prof.deliveryCities.length === 0) {
    prof.deliveryCities = ensureCityAreasShape(defaultDeliveryCities);
  } else {
    prof.deliveryCities = ensureCityAreasShape(prof.deliveryCities);
    if (!prof.deliveryCities.some((c) => c.name.toLowerCase() === 'muzaffarabad')) {
      const defMzd = defaultDeliveryCities.find((c) => c.name.toLowerCase() === 'muzaffarabad')!;
      prof.deliveryCities = [defMzd, ...prof.deliveryCities];
    }
  }
  return prof;
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  const normalized = {
    ...profile,
    deliveryCities: profile.deliveryCities ? ensureCityAreasShape(profile.deliveryCities) : undefined,
  };
  saveToStorage(STORAGE_KEYS.PROFILE, normalized);
}

export function resetDeliveryCities(): DeliveryCityConfig[] {
  const prof = getBusinessProfile();
  const fresh = ensureCityAreasShape(defaultDeliveryCities);
  saveBusinessProfile({ ...prof, deliveryCities: fresh });
  return fresh;
}

// Customers
export function getCustomers(): Customer[] {
  return loadFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, defaultCustomers);
}

export function saveCustomers(customers: Customer[]): void {
  saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
}

// Products & Inventory
export function getProducts(): ProductItem[] {
  return loadFromStorage<ProductItem[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
}

export function saveProducts(products: ProductItem[]): void {
  saveToStorage(STORAGE_KEYS.PRODUCTS, products);
}

// Centrally Managed Product Categories (3-level normalized)
export function getCategoryRecords(): CategoryRecord[] {
  const raw = loadFromStorage<CategoryRecord[]>(STORAGE_KEYS.CATEGORY_RECORDS, defaultCategoryRecords);
  const normalized = raw.map(normalizeUpcomingCategoryRecord);
  if (!normalized.some((c) => c.id === UPCOMING_CATEGORY_ID || c.isUpcoming)) {
    const defUpcoming = defaultCategoryRecords.find((c) => c.id === UPCOMING_CATEGORY_ID)!;
    normalized.push(defUpcoming);
  }
  return normalized;
}

export function saveCategoryRecords(records: CategoryRecord[]): void {
  const normalized = records.map(normalizeUpcomingCategoryRecord);
  saveToStorage(STORAGE_KEYS.CATEGORY_RECORDS, normalized);
}

export function getCategories(): string[] {
  const records = getCategoryRecords();
  const recordNames = records.map((r) => r.name.trim()).filter(Boolean);
  const products = getProducts();
  const productCats = products
    .map((p) => (isUpcomingCategoryName(p.category) ? UPCOMING_CATEGORY_NAME : p.category?.trim()))
    .filter(Boolean) as string[];
  const stored = loadFromStorage<string[]>(STORAGE_KEYS.CATEGORIES, []);
  const normalizedStored = stored
    .map((c) => (isUpcomingCategoryName(c) ? UPCOMING_CATEGORY_NAME : c.trim()))
    .filter(Boolean);
  const combined = Array.from(new Set([...recordNames, ...normalizedStored, ...productCats]));
  return combined.sort((a, b) => a.localeCompare(b));
}

export function saveCategories(categories: string[]): void {
  const clean = Array.from(
    new Set(
      categories
        .map((c) => (isUpcomingCategoryName(c) ? UPCOMING_CATEGORY_NAME : c.trim()))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  saveToStorage(STORAGE_KEYS.CATEGORIES, clean);
}

export function addCategory(
  newCategory: string,
  parentCategoryId?: string,
  isUpcoming: boolean = false
): { categories: string[]; added: boolean; record?: CategoryRecord } {
  const trimmed = isUpcoming || isUpcomingCategoryName(newCategory)
    ? UPCOMING_CATEGORY_NAME
    : newCategory.trim();
  if (!trimmed) return { categories: getCategories(), added: false };
  const current = getCategories();
  const exists = current.some((c) => normalizeTextKey(c) === normalizeTextKey(trimmed));

  const records = getCategoryRecords();
  const recordExists = records.some(
    (r) =>
      normalizeTextKey(r.name) === normalizeTextKey(trimmed) &&
      (r.parentCategoryId || '') === (parentCategoryId || '')
  );
  let newRecord: CategoryRecord | undefined = undefined;

  if (!recordExists) {
    const parent = parentCategoryId ? records.find((r) => r.id === parentCategoryId) : undefined;
    const level: 1 | 2 | 3 = !parent ? 1 : parent.parentCategoryId ? 3 : 2;
    newRecord = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      parentCategoryId,
      level,
      isUpcoming,
      isActive: true,
      displayOrder: records.length + 1,
    };
    saveCategoryRecords([...records, newRecord]);
  }

  if (!exists) {
    const updated = [...current, trimmed].sort((a, b) => a.localeCompare(b));
    saveCategories(updated);
    return { categories: updated, added: true, record: newRecord };
  }
  return { categories: current, added: false, record: newRecord };
}

// Safely delete category if no active products are using it
export function deleteCategory(categoryName: string): { success: boolean; message: string } {
  if (isUpcomingCategoryName(categoryName)) {
    return {
      success: false,
      message: `"${UPCOMING_CATEGORY_NAME}" is a required store category and cannot be deleted.`,
    };
  }
  const products = getProducts();
  const inUse = products.some((p) => normalizeTextKey(p.category) === normalizeTextKey(categoryName));
  if (inUse) {
    return {
      success: false,
      message: `Cannot delete '${categoryName}' because active catalog products belong to it. Reassign or delete products first.`,
    };
  }

  const records = getCategoryRecords();
  const targetRec = records.find((r) => normalizeTextKey(r.name) === normalizeTextKey(categoryName));
  if (targetRec && records.some((r) => r.parentCategoryId === targetRec.id)) {
    return {
      success: false,
      message: `Cannot delete '${categoryName}' because it contains subcategories. Remove or move subcategories first.`,
    };
  }

  const current = getCategories();
  const updated = current.filter((c) => normalizeTextKey(c) !== normalizeTextKey(categoryName));
  saveCategories(updated);

  const updatedRecords = records.filter((r) => normalizeTextKey(r.name) !== normalizeTextKey(categoryName));
  saveCategoryRecords(updatedRecords);

  return { success: true, message: `Category '${categoryName}' removed successfully.` };
}

// Category deduplication & normalization cleanup
export function cleanupDuplicateCategories(): { mergedCount: number; remaining: string[] } {
  const products = getProducts();
  const cats = getCategories();
  const map = new Map<string, string>();
  let mergedCount = 0;

  cats.forEach((cat) => {
    const canonicalName = isUpcomingCategoryName(cat) ? UPCOMING_CATEGORY_NAME : cat.trim();
    const lower = canonicalName.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, canonicalName);
    } else {
      mergedCount++;
    }
  });

  let productsChanged = false;
  const updatedProducts = products.map((p) => {
    if (p.category) {
      const canonical = map.get(p.category.trim().toLowerCase());
      if (canonical && canonical !== p.category) {
        productsChanged = true;
        return { ...p, category: canonical };
      }
    }
    return p;
  });

  if (productsChanged) {
    saveProducts(updatedProducts);
  }

  const remaining = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  saveCategories(remaining);
  return { mergedCount, remaining };
}

// Transactions
export function getTransactions(): Transaction[] {
  return loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, defaultTransactions);
}

export function saveTransactions(transactions: Transaction[]): void {
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
}

// Recurring Invoices
export function getRecurringInvoices(): RecurringInvoice[] {
  return loadFromStorage<RecurringInvoice[]>(STORAGE_KEYS.RECURRING, defaultRecurringInvoices);
}

export function saveRecurringInvoices(invoices: RecurringInvoice[]): void {
  saveToStorage(STORAGE_KEYS.RECURRING, invoices);
}

// WhatsApp Notifications
export function getWhatsAppNotifications(): WhatsAppNotification[] {
  return loadFromStorage<WhatsAppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, defaultWhatsAppNotifications);
}

export function saveWhatsAppNotifications(notifications: WhatsAppNotification[]): void {
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

// Reminder Templates
export function getReminderTemplates(): ReminderTemplate[] {
  return loadFromStorage<ReminderTemplate[]>(STORAGE_KEYS.TEMPLATES, defaultReminderTemplates);
}

export function saveReminderTemplates(templates: ReminderTemplate[]): void {
  saveToStorage(STORAGE_KEYS.TEMPLATES, templates);
}

// Product Broadcasts
export function getProductBroadcasts(): ProductBroadcast[] {
  return loadFromStorage<ProductBroadcast[]>(STORAGE_KEYS.BROADCASTS, defaultProductBroadcasts);
}

export function saveProductBroadcasts(broadcasts: ProductBroadcast[]): void {
  saveToStorage(STORAGE_KEYS.BROADCASTS, broadcasts);
}

// Lucky Draw Events
export function getLuckyDraws(): LuckyDrawEvent[] {
  return loadFromStorage<LuckyDrawEvent[]>(STORAGE_KEYS.LUCKY_DRAWS, defaultLuckyDrawEvents);
}

export function saveLuckyDraws(events: LuckyDrawEvent[]): void {
  saveToStorage(STORAGE_KEYS.LUCKY_DRAWS, events);
}

// Manual Broadcast Contacts
export function getBroadcastContacts(): BroadcastContact[] {
  return loadFromStorage<BroadcastContact[]>(STORAGE_KEYS.BROADCAST_CONTACTS, defaultBroadcastContacts);
}

export function saveBroadcastContacts(contacts: BroadcastContact[]): void {
  saveToStorage(STORAGE_KEYS.BROADCAST_CONTACTS, contacts);
}

// Saved Broadcast Campaigns
export function getSavedBroadcasts(): SavedBroadcastCampaign[] {
  return loadFromStorage<SavedBroadcastCampaign[]>(STORAGE_KEYS.SAVED_BROADCASTS, defaultSavedBroadcasts);
}

export function saveSavedBroadcasts(campaigns: SavedBroadcastCampaign[]): void {
  saveToStorage(STORAGE_KEYS.SAVED_BROADCASTS, campaigns);
}

// COD Orders
export function getCODOrders(): CODOrder[] {
  return loadFromStorage<CODOrder[]>(STORAGE_KEYS.COD_ORDERS, defaultCODOrders);
}

export function saveCODOrders(orders: CODOrder[]): void {
  saveToStorage(STORAGE_KEYS.COD_ORDERS, orders);
}

// WASAL Delivery Settlements (Amount Received from Courier)
export function getWasalSettlements(): WasalSettlement[] {
  return loadFromStorage<WasalSettlement[]>(STORAGE_KEYS.WASAL_SETTLEMENTS, defaultWasalSettlements);
}

export function saveWasalSettlements(settlements: WasalSettlement[]): void {
  saveToStorage(STORAGE_KEYS.WASAL_SETTLEMENTS, settlements);
}

// HR Employees
export function getEmployees(): Employee[] {
  return loadFromStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
}

export function saveEmployees(employees: Employee[]): void {
  saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);
}

// HR Attendance
export function getAttendance(): AttendanceRecord[] {
  return loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, defaultAttendance);
}

export function saveAttendance(records: AttendanceRecord[]): void {
  saveToStorage(STORAGE_KEYS.ATTENDANCE, records);
}

// Resellers
export function getResellers(): Reseller[] {
  return loadFromStorage<Reseller[]>(STORAGE_KEYS.RESELLERS, defaultResellers);
}

export function saveResellers(resellers: Reseller[]): void {
  saveToStorage(STORAGE_KEYS.RESELLERS, resellers);
}

// Review Reward Submissions
export function getReviewRewards(): ReviewRewardSubmission[] {
  return loadFromStorage<ReviewRewardSubmission[]>(STORAGE_KEYS.REVIEW_REWARDS, defaultReviewRewards);
}

export function saveReviewRewards(submissions: ReviewRewardSubmission[]): void {
  saveToStorage(STORAGE_KEYS.REVIEW_REWARDS, submissions);
}

export const defaultGuestUser: AppUser = {
  id: 'guest',
  name: 'Guest Visitor',
  urduName: 'مہمان صارف',
  role: 'customer',
  phone: '',
  isAuthenticated: false,
};

export const defaultCustomerUser: AppUser = defaultGuestUser;

// Active Role & User Session (stays per browser/session)
export function getActiveRole(): UserRole {
  const user = getCurrentUser();
  if (!user || user.isAuthenticated !== true) {
    return 'customer';
  }
  return loadFromStorage<UserRole>(STORAGE_KEYS.ACTIVE_ROLE, user.role || 'customer');
}

export function saveActiveRole(role: UserRole): void {
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, role, true);
}

export function getCurrentUser(): AppUser {
  const user = loadFromStorage<AppUser>(STORAGE_KEYS.CURRENT_USER, defaultGuestUser);
  if (!user || user.id === 'user_cust_default' || user.isAuthenticated !== true) {
    return defaultGuestUser;
  }
  return user;
}

export function saveCurrentUser(user: AppUser): void {
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user, true);
}

// Login Audits & History
export function getLoginAudits(): LoginAuditRecord[] {
  return loadFromStorage<LoginAuditRecord[]>(STORAGE_KEYS.LOGIN_AUDITS, defaultLoginAuditLogs);
}

export function logUserLogin(record: Omit<LoginAuditRecord, 'id' | 'timestamp'>): void {
  const newEntry: LoginAuditRecord = {
    ...record,
    id: `login_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const currentLogs = getLoginAudits();
  saveToStorage(STORAGE_KEYS.LOGIN_AUDITS, [newEntry, ...currentLogs.slice(0, 99)]);
}

export function saveLoginAudits(logs: LoginAuditRecord[]): void {
  saveToStorage(STORAGE_KEYS.LOGIN_AUDITS, logs);
}

// Default PIN extraction from mobile number
export function getDefaultPinForPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 6) {
    return digits.slice(-6);
  }
  return digits.padEnd(6, '0');
}

// User PIN update functions
export function updateCustomerPin(customerId: string, newPin: string): boolean {
  const custs = getCustomers();
  const updated = custs.map((c) => (c.id === customerId ? { ...c, pin: newPin } : c));
  saveCustomers(updated);
  return true;
}

export function updateResellerPin(resellerId: string, newPin: string): boolean {
  const resells = getResellers();
  const updated = resells.map((r) => (r.id === resellerId ? { ...r, pin: newPin } : r));
  saveResellers(updated);
  return true;
}

export function updateOwnerPin(newPin: string): void {
  const prof = getBusinessProfile();
  prof.adminPin = newPin;
  saveBusinessProfile(prof);
}

export function getOwnerPin(): string {
  const prof = getBusinessProfile();
  return prof.adminPin || '580987';
}

// INVESTOR MANAGEMENT
export function getInvestors(): Investor[] {
  return loadFromStorage<Investor[]>(STORAGE_KEYS.INVESTORS, defaultInvestors);
}

export function saveInvestors(investors: Investor[]): void {
  saveToStorage(STORAGE_KEYS.INVESTORS, investors);
}

export function getInvestorTransactions(): InvestorTransaction[] {
  return loadFromStorage<InvestorTransaction[]>(STORAGE_KEYS.INVESTOR_TRANSACTIONS, defaultInvestorTransactions);
}

export function saveInvestorTransactions(txs: InvestorTransaction[]): void {
  saveToStorage(STORAGE_KEYS.INVESTOR_TRANSACTIONS, txs);
}

// USER ACCOUNTS & CREDENTIAL MANAGEMENT
export function getUserAccounts(): UserAccount[] {
  const saved = loadFromStorage<UserAccount[]>(STORAGE_KEYS.USER_ACCOUNTS, defaultUserAccounts);
  let didMigrate = false;

  const normalized = saved.map((u) => {
    let next = u;
    if (u.username.toLowerCase() === 'bilal_manager' && u.id === 'usr_manager_1') {
      didMigrate = true;
      next = { ...next, id: 'usr_manager_bilal' };
    }
    if (u.id === 'usr_superadmin' || u.role === 'super_admin') {
      const needsSuperAdminSync =
        u.fullName === 'Al-Haj Muhammad Asif' ||
        u.email === 'owner@100dagar.pk' ||
        u.suggestedDefaultPin !== undefined ||
        u.fullName !== 'Shahzad Malik' ||
        u.phone !== '03125256266' ||
        u.email !== 'admin@madinamarket.pk';
      if (needsSuperAdminSync) {
        didMigrate = true;
        const { suggestedDefaultPin: _removed, ...rest } = next;
        next = {
          ...rest,
          fullName: 'Shahzad Malik',
          urduName: 'شہزاد ملک (سپر ایڈمن)',
          phone: '03125256266',
          email: 'admin@madinamarket.pk',
          canAuthorizeCreditSale: true,
        };
      }
    }
    return next;
  });

  const existingUsernames = new Set(normalized.map((u) => u.username.toLowerCase()));
  const missingDefaults = defaultUserAccounts.filter(
    (def) => !existingUsernames.has(def.username.toLowerCase())
  );
  if (missingDefaults.length > 0 || didMigrate) {
    const merged = [...normalized, ...missingDefaults];
    saveToStorage(STORAGE_KEYS.USER_ACCOUNTS, merged, true);
    return merged;
  }
  return normalized;
}

export function saveUserAccounts(accounts: UserAccount[]): void {
  saveToStorage(STORAGE_KEYS.USER_ACCOUNTS, accounts);
}

export function createUserAccount(user: Omit<UserAccount, 'id' | 'createdAt'>): UserAccount {
  const newAccount: UserAccount = {
    ...user,
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    loginCount: 0,
  };
  const accounts = getUserAccounts();
  saveUserAccounts([...accounts, newAccount]);
  return newAccount;
}

export function updateUserAccount(id: string, updates: Partial<UserAccount>): boolean {
  const accounts = getUserAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return false;
  accounts[index] = { ...accounts[index], ...updates };
  saveUserAccounts(accounts);
  return true;
}

export function resetUserPasswordToDefault(userId: string): { tempPin: string; account?: UserAccount } {
  const accounts = getUserAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return { tempPin: '123456' };

  const tempPin = getDefaultPinForPhone(target.phone);
  const updatedAccounts = accounts.map((a) => {
    if (a.id === userId) {
      return {
        ...a,
        passwordHash: tempPin,
        passwordSalt: undefined,
        mustChangePassword: true,
        isTemporaryPassword: true,
        suggestedDefaultPin: tempPin,
      };
    }
    return a;
  });

  saveUserAccounts(updatedAccounts);

  if (target.linkedCustomerId) {
    updateCustomerPin(target.linkedCustomerId, tempPin);
  }
  if (target.linkedResellerCode) {
    const res = getResellers().find((r) => r.referralCode === target.linkedResellerCode);
    if (res) updateResellerPin(res.id, tempPin);
  }

  return { tempPin, account: updatedAccounts.find((a) => a.id === userId) };
}

// CONFIGURABLE LOGIN FORM CONFIGURATION
export function getLoginFormConfig(): LoginFormConfig {
  const prof = getBusinessProfile();
  if (prof.loginFormConfig) return prof.loginFormConfig;
  return loadFromStorage<LoginFormConfig>(STORAGE_KEYS.LOGIN_CONFIG, defaultLoginFormConfig);
}

export function saveLoginFormConfig(config: LoginFormConfig): void {
  saveToStorage(STORAGE_KEYS.LOGIN_CONFIG, config, true);
  const prof = getBusinessProfile();
  prof.loginFormConfig = config;
  saveBusinessProfile(prof);
}

// Calculate Customer Balance and Total Purchases from Transactions
export function recalculateCustomerBalances(
  customers: Customer[],
  transactions: Transaction[]
): Customer[] {
  const balanceMap = new Map<string, number>();
  const purchaseMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  const lastPurchaseAmountMap = new Map<string, number>();
  const lastPaidAmountMap = new Map<string, number>();
  const lastPurchaseDateMap = new Map<string, string>();

  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedTxs.forEach((tx) => {
    const curBalance = balanceMap.get(tx.customerId) || 0;
    const curPurchases = purchaseMap.get(tx.customerId) || 0;
    const curCount = countMap.get(tx.customerId) || 0;

    if (tx.type === 'credit') {
      balanceMap.set(tx.customerId, curBalance + (tx.dueBalance !== undefined ? tx.dueBalance : tx.amount));
      purchaseMap.set(tx.customerId, curPurchases + tx.amount);
      countMap.set(tx.customerId, curCount + 1);
      lastPurchaseAmountMap.set(tx.customerId, tx.amount);
      const paid = tx.paidAmount !== undefined ? tx.paidAmount : (tx.dueBalance === 0 ? tx.amount : 0);
      lastPaidAmountMap.set(tx.customerId, paid);
      lastPurchaseDateMap.set(tx.customerId, tx.date);
    } else {
      balanceMap.set(tx.customerId, curBalance - tx.amount);
    }
  });

  return customers.map((c) => ({
    ...c,
    creditLimit: c.creditLimit || 5000,
    paymentTermsDays: c.paymentTermsDays || 7,
    balance: balanceMap.get(c.id) ?? c.balance ?? 0,
    totalPurchases: purchaseMap.get(c.id) ?? c.totalPurchases ?? 0,
    ordersCount: countMap.get(c.id) ?? c.ordersCount ?? 0,
    lastPurchaseAmount: lastPurchaseAmountMap.get(c.id) ?? c.lastPurchaseAmount ?? (c.totalPurchases || 0),
    lastPaidAmount: lastPaidAmountMap.get(c.id) ?? c.lastPaidAmount ?? (c.totalPurchases ? Math.max(0, (c.totalPurchases || 0) - (c.balance || 0)) : 0),
    lastPurchaseDate: lastPurchaseDateMap.get(c.id) ?? c.lastPurchaseDate,
  }));
}

export function resetToDemoData(): void {
  saveToStorage(STORAGE_KEYS.PROFILE, defaultBusinessProfile);
  saveToStorage(STORAGE_KEYS.CUSTOMERS, defaultCustomers);
  saveToStorage(STORAGE_KEYS.PRODUCTS, defaultProducts);
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, defaultTransactions);
  saveToStorage(STORAGE_KEYS.RECURRING, defaultRecurringInvoices);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, defaultWhatsAppNotifications);
  saveToStorage(STORAGE_KEYS.TEMPLATES, defaultReminderTemplates);
  saveToStorage(STORAGE_KEYS.BROADCASTS, defaultProductBroadcasts);
  saveToStorage(STORAGE_KEYS.LUCKY_DRAWS, defaultLuckyDrawEvents);
  saveToStorage(STORAGE_KEYS.BROADCAST_CONTACTS, defaultBroadcastContacts);
  saveToStorage(STORAGE_KEYS.SAVED_BROADCASTS, defaultSavedBroadcasts);
  saveToStorage(STORAGE_KEYS.COD_ORDERS, defaultCODOrders);
  saveToStorage(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
  saveToStorage(STORAGE_KEYS.ATTENDANCE, defaultAttendance);
  saveToStorage(STORAGE_KEYS.RESELLERS, defaultResellers);
  saveToStorage(STORAGE_KEYS.REVIEW_REWARDS, defaultReviewRewards);
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, 'admin', true);
}

export function startFromScratchData(): void {
  const profile = getBusinessProfile();
  saveToStorage(STORAGE_KEYS.PROFILE, profile);
  const resetCustomers = defaultCustomers.map((c) => ({
    ...c,
    balance: 0,
    totalPurchases: 0,
    ordersCount: 0,
    lastPurchaseAmount: 0,
    lastPaidAmount: 0,
    creditLimit: c.creditLimit || 5000,
    paymentTermsDays: c.paymentTermsDays || 7,
  }));
  saveToStorage(STORAGE_KEYS.CUSTOMERS, resetCustomers);
  saveToStorage(STORAGE_KEYS.PRODUCTS, defaultProducts);
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, []);
  saveToStorage(STORAGE_KEYS.RECURRING, []);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  saveToStorage(STORAGE_KEYS.TEMPLATES, defaultReminderTemplates);
  saveToStorage(STORAGE_KEYS.BROADCASTS, []);
  saveToStorage(STORAGE_KEYS.LUCKY_DRAWS, []);
  saveToStorage(STORAGE_KEYS.BROADCAST_CONTACTS, defaultBroadcastContacts);
  saveToStorage(STORAGE_KEYS.SAVED_BROADCASTS, []);
  saveToStorage(STORAGE_KEYS.COD_ORDERS, []);
  saveToStorage(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
  saveToStorage(STORAGE_KEYS.ATTENDANCE, []);
  const freshResellers = defaultResellers.map((r) => ({
    ...r,
    creditLimit: 25000,
    totalReferredOrders: 0,
    totalSales: 0,
    totalPaidSales: 0,
    earnedCommission: 0,
    paidCommission: 0,
  }));
  saveToStorage(STORAGE_KEYS.RESELLERS, freshResellers);
  saveToStorage(STORAGE_KEYS.REVIEW_REWARDS, []);
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, 'customer', true);
  saveToStorage(STORAGE_KEYS.CURRENT_USER, defaultCustomerUser, true);
  saveToStorage(STORAGE_KEYS.LOGIN_AUDITS, defaultLoginAuditLogs);
}

// BRANCH MANAGEMENT
export function getBranches(): Branch[] {
  return loadFromStorage<Branch[]>(STORAGE_KEYS.BRANCHES, defaultBranches);
}

export function saveBranches(branches: Branch[]): void {
  saveToStorage(STORAGE_KEYS.BRANCHES, branches);
}

export function getBranchById(id: string): Branch | undefined {
  return getBranches().find((b) => b.id === id);
}

// SALESPERSON REFERRALS
export function getSalespersonReferrals(): SalespersonReferral[] {
  return loadFromStorage<SalespersonReferral[]>(STORAGE_KEYS.SP_REFERRALS, defaultSalespersonReferrals);
}

export function saveSalespersonReferrals(referrals: SalespersonReferral[]): void {
  saveToStorage(STORAGE_KEYS.SP_REFERRALS, referrals);
}

export function calculateSalespersonCommission(eligibleSalesAmount: number): number {
  if (eligibleSalesAmount < 1000) return 0;
  return Math.floor(eligibleSalesAmount / 1000) * 30;
}

// COMMISSION RECORDS LEDGER
export function getCommissionRecords(): CommissionRecord[] {
  return loadFromStorage<CommissionRecord[]>(STORAGE_KEYS.COMMISSIONS, defaultCommissionRecords);
}

export function saveCommissionRecords(records: CommissionRecord[]): void {
  saveToStorage(STORAGE_KEYS.COMMISSIONS, records);
}

// WALK-IN CUSTOMERS
export function getWalkInCustomers(): WalkInCustomer[] {
  return loadFromStorage<WalkInCustomer[]>(STORAGE_KEYS.WALK_IN_CUSTOMERS, defaultWalkInCustomers);
}

export function saveWalkInCustomers(customers: WalkInCustomer[]): void {
  saveToStorage(STORAGE_KEYS.WALK_IN_CUSTOMERS, customers);
}

// WALK-IN SALES
export function getWalkInSales(): WalkInSale[] {
  return loadFromStorage<WalkInSale[]>(STORAGE_KEYS.WALK_IN_SALES, defaultWalkInSales);
}

export function saveWalkInSales(sales: WalkInSale[]): void {
  saveToStorage(STORAGE_KEYS.WALK_IN_SALES, sales);
}

// PRODUCT IMPORT LOGS
export function getProductImportLogs(): ProductImportLog[] {
  return loadFromStorage<ProductImportLog[]>(STORAGE_KEYS.IMPORT_LOGS, defaultImportLogs);
}

export function saveProductImportLogs(logs: ProductImportLog[]): void {
  saveToStorage(STORAGE_KEYS.IMPORT_LOGS, logs);
}

export function logProductImport(log: Omit<ProductImportLog, 'id' | 'timestamp'>): void {
  const newLog: ProductImportLog = {
    ...log,
    id: `implog_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const logs = getProductImportLogs();
  saveProductImportLogs([newLog, ...logs.slice(0, 99)]);
}

// Export all data as JSON
export function exportAllDataJSON(): string {
  const data = {
    exportDate: new Date().toISOString(),
    businessProfile: getBusinessProfile(),
    customers: getCustomers(),
    products: getProducts(),
    transactions: getTransactions(),
    recurringInvoices: getRecurringInvoices(),
    whatsAppNotifications: getWhatsAppNotifications(),
    reminderTemplates: getReminderTemplates(),
    productBroadcasts: getProductBroadcasts(),
    luckyDraws: getLuckyDraws(),
    broadcastContacts: getBroadcastContacts(),
    savedBroadcasts: getSavedBroadcasts(),
    codOrders: getCODOrders(),
    employees: getEmployees(),
    attendance: getAttendance(),
    resellers: getResellers(),
    reviewRewards: getReviewRewards(),
    loginAudits: getLoginAudits(),
    categoryRecords: getCategoryRecords(),
    investors: getInvestors(),
    investorTransactions: getInvestorTransactions(),
    userAccounts: getUserAccounts(),
    branches: getBranches(),
    salespersonReferrals: getSalespersonReferrals(),
    walkInCustomers: getWalkInCustomers(),
    walkInSales: getWalkInSales(),
    commissionRecords: getCommissionRecords(),
    importLogs: getProductImportLogs(),
    wasalSettlements: getWasalSettlements(),
  };
  return JSON.stringify(data, null, 2);
}

// Import all data from JSON
export function importAllDataJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.businessProfile) saveBusinessProfile(parsed.businessProfile);
    if (parsed.customers) saveCustomers(parsed.customers);
    if (parsed.products) saveProducts(parsed.products);
    if (parsed.transactions) saveTransactions(parsed.transactions);
    if (parsed.recurringInvoices) saveRecurringInvoices(parsed.recurringInvoices);
    if (parsed.whatsAppNotifications) saveWhatsAppNotifications(parsed.whatsAppNotifications);
    if (parsed.reminderTemplates) saveReminderTemplates(parsed.reminderTemplates);
    if (parsed.productBroadcasts) saveProductBroadcasts(parsed.productBroadcasts);
    if (parsed.luckyDraws) saveLuckyDraws(parsed.luckyDraws);
    if (parsed.broadcastContacts) saveBroadcastContacts(parsed.broadcastContacts);
    if (parsed.savedBroadcasts) saveSavedBroadcasts(parsed.savedBroadcasts);
    if (parsed.codOrders) saveCODOrders(parsed.codOrders);
    if (parsed.employees) saveEmployees(parsed.employees);
    if (parsed.attendance) saveAttendance(parsed.attendance);
    if (parsed.resellers) saveResellers(parsed.resellers);
    if (parsed.reviewRewards) saveReviewRewards(parsed.reviewRewards);
    if (parsed.loginAudits) saveLoginAudits(parsed.loginAudits);
    if (parsed.categoryRecords) saveCategoryRecords(parsed.categoryRecords);
    if (parsed.investors) saveInvestors(parsed.investors);
    if (parsed.investorTransactions) saveInvestorTransactions(parsed.investorTransactions);
    if (parsed.userAccounts) saveUserAccounts(parsed.userAccounts);
    if (parsed.branches) saveBranches(parsed.branches);
    if (parsed.salespersonReferrals) saveSalespersonReferrals(parsed.salespersonReferrals);
    if (parsed.walkInCustomers) saveWalkInCustomers(parsed.walkInCustomers);
    if (parsed.walkInSales) saveWalkInSales(parsed.walkInSales);
    if (parsed.commissionRecords) saveCommissionRecords(parsed.commissionRecords);
    if (parsed.importLogs) saveProductImportLogs(parsed.importLogs);
    if (parsed.wasalSettlements) saveWasalSettlements(parsed.wasalSettlements);
    return true;
  } catch (e) {
    console.error('Failed to import JSON data', e);
    return false;
  }
}
