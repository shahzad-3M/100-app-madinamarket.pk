import {
  AppUser,
  AttendanceRecord,
  BroadcastContact,
  BusinessProfile,
  CODOrder,
  Customer,
  Employee,
  LoginAuditRecord,
  LuckyDrawEvent,
  ProductBroadcast,
  ProductItem,
  RecurringInvoice,
  ReminderTemplate,
  Reseller,
  ReviewRewardSubmission,
  SavedBroadcastCampaign,
  Transaction,
  UserRole,
  WhatsAppNotification,
} from '../types';
import {
  defaultAttendance,
  defaultBroadcastContacts,
  defaultBusinessProfile,
  defaultCODOrders,
  defaultCustomers,
  defaultEmployees,
  defaultLoginAuditLogs,
  defaultLuckyDrawEvents,
  defaultProductBroadcasts,
  defaultProducts,
  defaultRecurringInvoices,
  defaultReminderTemplates,
  defaultResellers,
  defaultReviewRewards,
  defaultSavedBroadcasts,
  defaultTransactions,
  defaultWhatsAppNotifications,
} from './defaultData';

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
};

// Safe localStorage getter
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error loading ${key} from localStorage`, e);
    return defaultValue;
  }
}

// Safe localStorage setter
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

// Business Profile
export function getBusinessProfile(): BusinessProfile {
  const prof = loadFromStorage<BusinessProfile>(STORAGE_KEYS.PROFILE, defaultBusinessProfile);
  if (!prof.shippingPartner) {
    prof.shippingPartner = defaultBusinessProfile.shippingPartner;
  }
  if (!prof.adminPin) {
    prof.adminPin = '580987';
  }
  return prof;
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  saveToStorage(STORAGE_KEYS.PROFILE, profile);
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

// Centrally Managed Product Categories
export function getCategories(): string[] {
  const defaultCats = [
    'Cosmetics & Personal Care',
    'Fashion & Apparel',
    'Decorative Items',
    'Electronics & Gadgets',
    'Kitchen & Home',
    'Accessories',
  ];
  const products = getProducts();
  const productCats = products.map((p) => p.category?.trim()).filter(Boolean);
  const stored = loadFromStorage<string[]>(STORAGE_KEYS.CATEGORIES, []);
  const combined = Array.from(new Set([...defaultCats, ...stored, ...productCats]));
  return combined.sort((a, b) => a.localeCompare(b));
}

export function saveCategories(categories: string[]): void {
  const clean = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  saveToStorage(STORAGE_KEYS.CATEGORIES, clean);
}

export function addCategory(newCategory: string): { categories: string[]; added: boolean } {
  const trimmed = newCategory.trim();
  if (!trimmed) return { categories: getCategories(), added: false };
  const current = getCategories();
  const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    const updated = [...current, trimmed].sort((a, b) => a.localeCompare(b));
    saveCategories(updated);
    return { categories: updated, added: true };
  }
  return { categories: current, added: false };
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

export const defaultCustomerUser: AppUser = {
  id: 'user_cust_default',
  name: 'Online Customer',
  urduName: 'آن لائن کسٹمر',
  role: 'customer',
  phone: '03125256266',
  customerId: 'cust_1',
};

// Active Role & User Session (USER DIRECTIVE: Default to Customer)
export function getActiveRole(): UserRole {
  return loadFromStorage<UserRole>(STORAGE_KEYS.ACTIVE_ROLE, 'customer');
}

export function saveActiveRole(role: UserRole): void {
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, role);
}

export function getCurrentUser(): AppUser {
  return loadFromStorage<AppUser>(STORAGE_KEYS.CURRENT_USER, defaultCustomerUser);
}

export function saveCurrentUser(user: AppUser): void {
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

// Login Audits & History (USER DIRECTIVE: history of all users pin and login information inside admin area)
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

// Default PIN extraction from mobile number (USER DIRECTIVE: default pin suggestion 6 digits can be last 6 digits of mobile number)
export function getDefaultPinForPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 6) {
    return digits.slice(-6);
  }
  return digits.padEnd(6, '0');
}

// User PIN update functions (USER DIRECTIVE: only show to user inside portal change pin option)
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

  // Sort chronologically to find latest purchase
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

// Reset everything to default demo data
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
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, 'admin');
}

// Clear all transactional records to start completely fresh from scratch (0 orders, 0 debt, 0 attendance)
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
  saveToStorage(STORAGE_KEYS.PRODUCTS, defaultProducts); // Keeps the single demo catalog item
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
  saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, 'customer');
  saveToStorage(STORAGE_KEYS.CURRENT_USER, defaultCustomerUser);
  saveToStorage(STORAGE_KEYS.LOGIN_AUDITS, defaultLoginAuditLogs);
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
    return true;
  } catch (e) {
    console.error('Failed to import JSON data', e);
    return false;
  }
}

