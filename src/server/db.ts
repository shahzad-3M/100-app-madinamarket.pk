import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  AdminAuditLog,
  BusinessProfile,
  CategoryRecord,
  CODOrder,
  Customer,
  DeliveryAreaConfig,
  DeliveryCityConfig,
  ProductItem,
  Transaction,
  UserAccount,
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
} from '../utils/defaultData';
import {
  computeCategoryLevel,
  ensureCityAreasShape,
  getCategoryBreadcrumb,
  isProductPurchaseBlocked,
  isUpcomingCategoryName,
  normalizeTextKey,
  normalizeUpcomingCategoryRecord,
  resolveCategoryIdsFromProduct,
  slugifyId,
  UPCOMING_CATEGORY_ID,
  UPCOMING_CATEGORY_NAME,
} from '../utils/locationCategoryHelpers';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'madinamarket.db');

export interface BackupMetadata {
  id: string;
  reason: string;
  createdAt: string;
  sqliteFile: string | null;
  jsonFile: string;
  sha256: string;
  counts: Record<string, number>;
}

const DEFAULT_COLLECTION_MAP: Record<string, unknown> = {
  transactions: defaultTransactions,
  cod_orders: defaultCODOrders,
  wasal_settlements: defaultWasalSettlements,
  investors: defaultInvestors,
  investor_transactions: defaultInvestorTransactions,
  resellers: defaultResellers,
  user_accounts: defaultUserAccounts,
  branches: defaultBranches,
  walkin_customers: defaultWalkInCustomers,
  walkin_sales: defaultWalkInSales,
  salesperson_referrals: defaultSalespersonReferrals,
  commission_records: defaultCommissionRecords,
  employees: defaultEmployees,
  attendance: defaultAttendance,
  recurring_invoices: defaultRecurringInvoices,
  notifications: defaultWhatsAppNotifications,
  templates: defaultReminderTemplates,
  product_broadcasts: defaultProductBroadcasts,
  broadcast_contacts: defaultBroadcastContacts,
  saved_broadcasts: defaultSavedBroadcasts,
  lucky_draws: defaultLuckyDrawEvents,
  review_rewards: defaultReviewRewards,
  login_audits: defaultLoginAuditLogs,
  import_logs: defaultImportLogs,
  business_profile: defaultBusinessProfile,
};

let dbInstance: DatabaseSync | null = null;
let lastSyncVersion = new Date().toISOString();

export function getSyncVersion(): string {
  return lastSyncVersion;
}

export function touchSyncVersion(): string {
  lastSyncVersion = new Date().toISOString();
  return lastSyncVersion;
}

function ensureDirectories() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    ensureDirectories();
    const hadExistingDb = fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0;
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    runMigrations(dbInstance, hadExistingDb);
  }
  return dbInstance;
}

export function createVerifiedBackup(reason: string): BackupMetadata {
  ensureDirectories();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeReason = reason.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'manual';
  const id = `bak_${timestamp}_${safeReason}`;
  const sqliteBackupPath = path.join(BACKUP_DIR, `${id}.db`);
  const jsonBackupPath = path.join(BACKUP_DIR, `${id}.json`);

  let sqliteFile: string | null = null;
  if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
    try {
      if (dbInstance) {
        const escaped = sqliteBackupPath.replace(/'/g, "''");
        dbInstance.exec(`VACUUM INTO '${escaped}';`);
      } else {
        fs.copyFileSync(DB_PATH, sqliteBackupPath);
      }
      sqliteFile = path.basename(sqliteBackupPath);
    } catch {
      fs.copyFileSync(DB_PATH, sqliteBackupPath);
      sqliteFile = path.basename(sqliteBackupPath);
    }
  }

  let snapshot: Record<string, unknown> = {};
  const counts: Record<string, number> = {};

  if (dbInstance) {
    try {
      const tableRows = (table: string) =>
        dbInstance!.prepare(`SELECT * FROM ${table}`).all();
      const tables = ['categories', 'cities', 'city_areas', 'products', 'customers', 'app_collections', 'admin_audit_logs'];
      for (const tbl of tables) {
        try {
          const rows = tableRows(tbl);
          snapshot[tbl] = rows;
          counts[tbl] = rows.length;
        } catch {
          counts[tbl] = 0;
        }
      }
    } catch {
      // ignore on brand-new uninitialized db
    }
  }

  const serialized = JSON.stringify(
    {
      backupId: id,
      reason,
      createdAt: new Date().toISOString(),
      counts,
      snapshot,
    },
    null,
    2
  );
  fs.writeFileSync(jsonBackupPath, serialized, 'utf8');
  const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');

  return {
    id,
    reason,
    createdAt: new Date().toISOString(),
    sqliteFile,
    jsonFile: path.basename(jsonBackupPath),
    sha256,
    counts,
  };
}

export function listBackups(): Array<{ file: string; sizeBytes: number; createdAt: string }> {
  ensureDirectories();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.json') || f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        file: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
}

function runMigrations(db: DatabaseSync, hadExistingDb: boolean) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL,
      notes TEXT
    );
  `);

  const hasMigration = (id: string): boolean => {
    const row = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(id);
    return Boolean(row);
  };

  const recordMigration = (id: string, notes: string) => {
    db.prepare('INSERT OR IGNORE INTO schema_migrations (id, applied_at, notes) VALUES (?, ?, ?)').run(
      id,
      new Date().toISOString(),
      notes
    );
  };

  // Pre-migration safety backup if an existing DB was present and pending migrations exist
  const pendingMigrations =
    !hasMigration('001_initial_schema') ||
    !hasMigration('002_seed_defaults_if_empty') ||
    !hasMigration('003_upgrade_upcoming_categories_locations');

  if (hadExistingDb && pendingMigrations) {
    createVerifiedBackup('pre_migration');
  }

  // MIGRATION 001: Create all normalized tables cleanly
  if (!hasMigration('001_initial_schema')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        urdu_name TEXT,
        parent_category_id TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        is_upcoming INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_parent
        ON categories (LOWER(TRIM(name)), COALESCE(parent_category_id, ''));

      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        allowed INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS city_areas (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL,
        name TEXT NOT NULL,
        allowed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_city_areas_unique
        ON city_areas (city_id, LOWER(TRIM(name)));

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        urdu_name TEXT,
        category TEXT NOT NULL,
        parent_category_id TEXT,
        subcategory_id TEXT,
        child_subcategory_id TEXT,
        sku TEXT,
        cost_price REAL NOT NULL DEFAULT 0,
        market_price REAL NOT NULL DEFAULT 0,
        our_price REAL NOT NULL DEFAULT 0,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        min_stock_alert INTEGER NOT NULL DEFAULT 5,
        is_upcoming INTEGER NOT NULL DEFAULT 0,
        upcoming_status TEXT NOT NULL DEFAULT 'available',
        expected_arrival_date TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        data_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_parent_cat ON products(parent_category_id);
      CREATE INDEX IF NOT EXISTS idx_products_sub_cat ON products(subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_products_child_cat ON products(child_subcategory_id);
      CREATE INDEX IF NOT EXISTS idx_products_upcoming ON products(is_upcoming);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT,
        area TEXT,
        mohalla TEXT,
        landmark TEXT,
        address TEXT,
        balance REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        data_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);

      CREATE TABLE IF NOT EXISTS app_collections (
        collection_key TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT,
        actor_role TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
    recordMigration('001_initial_schema', 'Created normalized categories, cities, city_areas, products, customers, app_collections, admin_audit_logs');
  }

  // MIGRATION 002: Seed defaults ONLY into empty tables/keys (strictly non-destructive)
  if (!hasMigration('002_seed_defaults_if_empty')) {
    const now = new Date().toISOString();

    const catCount = Number((db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }).cnt || 0);
    if (catCount === 0) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, urdu_name, parent_category_id, level, description, is_upcoming, is_active, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of defaultCategoryRecords) {
        const level = c.level || computeCategoryLevel(c, defaultCategoryRecords);
        stmt.run(
          c.id,
          c.name,
          c.urduName || null,
          c.parentCategoryId || null,
          level,
          c.description || null,
          c.isUpcoming ? 1 : 0,
          c.isActive === false ? 0 : 1,
          c.displayOrder || 0,
          now,
          now
        );
      }
    }

    const cityCount = Number((db.prepare('SELECT COUNT(*) as cnt FROM cities').get() as { cnt: number }).cnt || 0);
    if (cityCount === 0) {
      const insertCity = db.prepare(`
        INSERT OR IGNORE INTO cities (id, name, allowed, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertArea = db.prepare(`
        INSERT OR IGNORE INTO city_areas (id, city_id, name, allowed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      defaultDeliveryCities.forEach((city, idx) => {
        const cityId = city.id || slugifyId('city', city.name);
        insertCity.run(cityId, city.name, city.allowed ? 1 : 0, idx + 1, now, now);
        (city.areas || []).forEach((area) => {
          const areaId = area.id || slugifyId('area', `${city.name}_${area.name}`);
          insertArea.run(areaId, cityId, area.name, area.allowed ? 1 : 0, now, now);
        });
      });
    }

    const prodCount = Number((db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt || 0);
    if (prodCount === 0) {
      for (const p of defaultProducts) {
        upsertProductRow(db, p);
      }
    }

    const custCount = Number((db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as { cnt: number }).cnt || 0);
    if (custCount === 0) {
      for (const cust of defaultCustomers) {
        upsertCustomerRow(db, cust);
      }
    }

    const insertCollection = db.prepare(`
      INSERT OR IGNORE INTO app_collections (collection_key, data_json, updated_at)
      VALUES (?, ?, ?)
    `);
    for (const [key, val] of Object.entries(DEFAULT_COLLECTION_MAP)) {
      insertCollection.run(key, JSON.stringify(val), now);
    }

    recordMigration('002_seed_defaults_if_empty', 'Seeded empty tables safely using INSERT OR IGNORE');
  }

  // MIGRATION 003: Non-destructive normalization for Upcoming Viral Products | Coming Soon, 3-level hierarchy & City areas
  if (!hasMigration('003_upgrade_upcoming_categories_locations')) {
    const now = new Date().toISOString();

    // 1. Ensure canonical Upcoming category record exists and uses new label without losing ID
    const existingUpcoming = db
      .prepare('SELECT * FROM categories WHERE id = ? OR is_upcoming = 1')
      .get(UPCOMING_CATEGORY_ID) as Record<string, unknown> | undefined;
    if (existingUpcoming) {
      db.prepare(`
        UPDATE categories
        SET name = ?, is_upcoming = 1, is_active = 1, level = 1, parent_category_id = NULL, updated_at = ?
        WHERE id = ?
      `).run(UPCOMING_CATEGORY_NAME, now, String(existingUpcoming.id));
    } else {
      const upCat = defaultCategoryRecords.find((c) => c.id === UPCOMING_CATEGORY_ID)!;
      db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, urdu_name, parent_category_id, level, description, is_upcoming, is_active, display_order, created_at, updated_at)
        VALUES (?, ?, ?, NULL, 1, ?, 1, 1, ?, ?, ?)
      `).run(upCat.id, UPCOMING_CATEGORY_NAME, upCat.urduName || null, upCat.description || null, 7, now, now);
    }

    // 2. Ensure default subcategories/child categories exist without touching custom user categories
    const insertCatIgnore = db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, urdu_name, parent_category_id, level, description, is_upcoming, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of defaultCategoryRecords) {
      insertCatIgnore.run(
        c.id,
        c.name,
        c.urduName || null,
        c.parentCategoryId || null,
        c.level || computeCategoryLevel(c, defaultCategoryRecords),
        c.description || null,
        c.isUpcoming ? 1 : 0,
        c.isActive === false ? 0 : 1,
        c.displayOrder || 0,
        now,
        now
      );
    }

    // 3. Normalize existing Upcoming products non-destructively
    const allProds = getAllProductsFromDb(db);
    for (const p of allProds) {
      if (isProductPurchaseBlocked(p)) {
        const updated: ProductItem = {
          ...p,
          category: UPCOMING_CATEGORY_NAME,
          parentCategoryId: UPCOMING_CATEGORY_ID,
          isUpcoming: true,
          upcomingStatus: 'coming_soon',
          stockQty: 0,
        };
        upsertProductRow(db, updated);
      }
    }

    // 4. Sync business_profile.deliveryCities with cities & city_areas non-destructively
    const profile = getCollectionValue<BusinessProfile>(db, 'business_profile', defaultBusinessProfile);
    if (profile.deliveryCities && profile.deliveryCities.length > 0) {
      const insertCityIgnore = db.prepare(`
        INSERT OR IGNORE INTO cities (id, name, allowed, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      profile.deliveryCities.forEach((dc, idx) => {
        insertCityIgnore.run(dc.id || slugifyId('city', dc.name), dc.name.trim(), dc.allowed ? 1 : 0, idx + 1, now, now);
      });
    }
    // Add default areas only to cities that currently have 0 areas
    const insertAreaIgnore = db.prepare(`
      INSERT OR IGNORE INTO city_areas (id, city_id, name, allowed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const defCity of defaultDeliveryCities) {
      const cityRow = db.prepare('SELECT id FROM cities WHERE LOWER(name) = LOWER(?)').get(defCity.name) as { id: string } | undefined;
      if (cityRow && defCity.areas && defCity.areas.length > 0) {
        const existingAreaCnt = Number(
          (db.prepare('SELECT COUNT(*) as cnt FROM city_areas WHERE city_id = ?').get(cityRow.id) as { cnt: number }).cnt || 0
        );
        if (existingAreaCnt === 0) {
          for (const a of defCity.areas) {
            insertAreaIgnore.run(a.id, cityRow.id, a.name, a.allowed ? 1 : 0, now, now);
          }
        }
      }
    }
    syncDeliveryCitiesIntoBusinessProfile(db);

    recordMigration('003_upgrade_upcoming_categories_locations', 'Normalized Upcoming category label, seeded multi-level sample subcategories, and synced city areas');
  }
}

// ==========================================
// DATA ACCESS HELPERS (CENTRAL SOURCE OF TRUTH)
// ==========================================

export function getAllCategoriesFromDb(db = getDb()): CategoryRecord[] {
  const rows = db
    .prepare('SELECT * FROM categories ORDER BY display_order ASC, level ASC, name ASC')
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) =>
    normalizeUpcomingCategoryRecord({
      id: String(r.id),
      name: String(r.name),
      urduName: r.urdu_name ? String(r.urdu_name) : undefined,
      parentCategoryId: r.parent_category_id ? String(r.parent_category_id) : undefined,
      level: (Number(r.level) as 1 | 2 | 3) || 1,
      description: r.description ? String(r.description) : undefined,
      isUpcoming: Boolean(r.is_upcoming),
      isActive: r.is_active === undefined ? true : Boolean(r.is_active),
      displayOrder: Number(r.display_order || 0),
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    })
  );
}

export function upsertCategoryRow(db: DatabaseSync, cat: CategoryRecord): CategoryRecord {
  const normalized = normalizeUpcomingCategoryRecord(cat);
  const allCats = getAllCategoriesFromDb(db);
  const level = computeCategoryLevel(normalized, allCats.filter((c) => c.id !== normalized.id).concat(normalized));
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO categories (id, name, urdu_name, parent_category_id, level, description, is_upcoming, is_active, display_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      urdu_name = excluded.urdu_name,
      parent_category_id = excluded.parent_category_id,
      level = excluded.level,
      description = excluded.description,
      is_upcoming = excluded.is_upcoming,
      is_active = excluded.is_active,
      display_order = excluded.display_order,
      updated_at = excluded.updated_at
  `).run(
    normalized.id,
    normalized.name.trim(),
    normalized.urduName || null,
    normalized.parentCategoryId || null,
    level,
    normalized.description || null,
    normalized.isUpcoming ? 1 : 0,
    normalized.isActive === false ? 0 : 1,
    normalized.displayOrder || 0,
    normalized.createdAt || now,
    now
  );

  return { ...normalized, level, updatedAt: now };
}

export function getAllCitiesFromDb(db = getDb()): DeliveryCityConfig[] {
  const cityRows = db
    .prepare('SELECT * FROM cities ORDER BY display_order ASC, name ASC')
    .all() as Array<Record<string, unknown>>;
  const areaRows = db
    .prepare('SELECT * FROM city_areas ORDER BY name ASC')
    .all() as Array<Record<string, unknown>>;

  const areasByCity = new Map<string, DeliveryAreaConfig[]>();
  for (const ar of areaRows) {
    const cid = String(ar.city_id);
    const list = areasByCity.get(cid) || [];
    list.push({
      id: String(ar.id),
      name: String(ar.name),
      allowed: Boolean(ar.allowed),
    });
    areasByCity.set(cid, list);
  }

  return cityRows.map((cr) => ({
    id: String(cr.id),
    name: String(cr.name),
    allowed: Boolean(cr.allowed),
    areas: areasByCity.get(String(cr.id)) || [],
  }));
}

export function syncDeliveryCitiesIntoBusinessProfile(db = getDb()): BusinessProfile {
  const cities = getAllCitiesFromDb(db);
  const profile = getCollectionValue<BusinessProfile>(db, 'business_profile', defaultBusinessProfile);
  const updatedProfile: BusinessProfile = {
    ...profile,
    deliveryCities: ensureCityAreasShape(cities),
  };
  saveCollectionValue(db, 'business_profile', updatedProfile);
  return updatedProfile;
}

export function replaceCitiesAndAreasFromList(db: DatabaseSync, incomingCities: DeliveryCityConfig[]) {
  const now = new Date().toISOString();
  const shaped = ensureCityAreasShape(incomingCities);

  const existingCities = getAllCitiesFromDb(db);
  const existingByName = new Map(existingCities.map((c) => [normalizeTextKey(c.name), c]));

  for (let i = 0; i < shaped.length; i++) {
    const c = shaped[i];
    const matchByName = existingByName.get(normalizeTextKey(c.name));
    const cityId = matchByName?.id || c.id || slugifyId('city', c.name);
    db.prepare(`
      INSERT INTO cities (id, name, allowed, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        allowed = excluded.allowed,
        display_order = excluded.display_order,
        updated_at = excluded.updated_at
    `).run(cityId, c.name, c.allowed ? 1 : 0, i + 1, now, now);

    if (c.areas && c.areas.length > 0) {
      for (const a of c.areas) {
        const existingArea = db
          .prepare('SELECT id FROM city_areas WHERE city_id = ? AND LOWER(name) = LOWER(?)')
          .get(cityId, a.name) as { id: string } | undefined;
        const areaId = existingArea?.id || a.id || slugifyId('area', `${c.name}_${a.name}`);
        db.prepare(`
          INSERT INTO city_areas (id, city_id, name, allowed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            allowed = excluded.allowed,
            updated_at = excluded.updated_at
        `).run(areaId, cityId, a.name, a.allowed ? 1 : 0, now, now);
      }
    }
  }
}

export function getAllProductsFromDb(db = getDb()): ProductItem[] {
  const rows = db
    .prepare('SELECT * FROM products ORDER BY created_at DESC, rowid DESC')
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => {
    let parsed: ProductItem;
    try {
      parsed = JSON.parse(String(r.data_json)) as ProductItem;
    } catch {
      parsed = {
        id: String(r.id),
        name: String(r.name),
        category: String(r.category),
        sku: String(r.sku || ''),
        costPrice: Number(r.cost_price || 0),
        marketPrice: Number(r.market_price || 0),
        ourPrice: Number(r.our_price || 0),
        stockQty: Number(r.stock_qty || 0),
        minStockAlert: Number(r.min_stock_alert || 5),
        salesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        isWinningItem: false,
        createdAt: String(r.created_at),
      };
    }

    const isUpcoming = Boolean(r.is_upcoming) || isProductPurchaseBlocked(parsed);
    return {
      ...parsed,
      id: String(r.id),
      name: String(r.name),
      urduName: r.urdu_name ? String(r.urdu_name) : parsed.urduName,
      category: isUpcoming ? UPCOMING_CATEGORY_NAME : String(r.category),
      parentCategoryId: isUpcoming
        ? UPCOMING_CATEGORY_ID
        : r.parent_category_id
        ? String(r.parent_category_id)
        : parsed.parentCategoryId,
      subcategoryId: isUpcoming
        ? undefined
        : r.subcategory_id
        ? String(r.subcategory_id)
        : parsed.subcategoryId,
      childSubcategoryId: isUpcoming
        ? undefined
        : r.child_subcategory_id
        ? String(r.child_subcategory_id)
        : parsed.childSubcategoryId,
      sku: r.sku ? String(r.sku) : parsed.sku,
      costPrice: Number(r.cost_price ?? parsed.costPrice ?? 0),
      marketPrice: Number(r.market_price ?? parsed.marketPrice ?? 0),
      ourPrice: Number(r.our_price ?? parsed.ourPrice ?? 0),
      stockQty: isUpcoming ? 0 : Number(r.stock_qty ?? parsed.stockQty ?? 0),
      minStockAlert: Number(r.min_stock_alert ?? parsed.minStockAlert ?? 5),
      isUpcoming,
      upcomingStatus: isUpcoming ? 'coming_soon' : 'available',
      expectedArrivalDate: r.expected_arrival_date
        ? String(r.expected_arrival_date)
        : parsed.expectedArrivalDate,
      status: (String(r.status || parsed.status || 'published') as 'draft' | 'published'),
      updatedAt: r.updated_at ? String(r.updated_at) : parsed.updatedAt,
    };
  });
}

export function upsertProductRow(db: DatabaseSync, product: ProductItem): ProductItem {
  const allCats = getAllCategoriesFromDb(db);
  const blockedUpcoming = isProductPurchaseBlocked(product);
  const now = new Date().toISOString();

  const resolvedIds = blockedUpcoming
    ? { parentCategoryId: UPCOMING_CATEGORY_ID, subcategoryId: undefined, childSubcategoryId: undefined }
    : resolveCategoryIdsFromProduct(product, allCats);

  const normalizedCategory = blockedUpcoming
    ? UPCOMING_CATEGORY_NAME
    : resolvedIds.parentCategoryId
    ? getCategoryBreadcrumb(
        allCats,
        resolvedIds.parentCategoryId,
        resolvedIds.subcategoryId,
        resolvedIds.childSubcategoryId,
        product.category
      )
    : product.category || 'General Wholesale';

  const normalizedProduct: ProductItem = {
    ...product,
    category: normalizedCategory,
    parentCategoryId: resolvedIds.parentCategoryId,
    subcategoryId: resolvedIds.subcategoryId,
    childSubcategoryId: resolvedIds.childSubcategoryId,
    isUpcoming: blockedUpcoming,
    upcomingStatus: blockedUpcoming ? 'coming_soon' : 'available',
    stockQty: blockedUpcoming ? 0 : Math.max(0, Number(product.stockQty || 0)),
    status: product.status || 'published',
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO products (
      id, name, urdu_name, category, parent_category_id, subcategory_id, child_subcategory_id,
      sku, cost_price, market_price, our_price, stock_qty, min_stock_alert,
      is_upcoming, upcoming_status, expected_arrival_date, status, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      urdu_name = excluded.urdu_name,
      category = excluded.category,
      parent_category_id = excluded.parent_category_id,
      subcategory_id = excluded.subcategory_id,
      child_subcategory_id = excluded.child_subcategory_id,
      sku = excluded.sku,
      cost_price = excluded.cost_price,
      market_price = excluded.market_price,
      our_price = excluded.our_price,
      stock_qty = excluded.stock_qty,
      min_stock_alert = excluded.min_stock_alert,
      is_upcoming = excluded.is_upcoming,
      upcoming_status = excluded.upcoming_status,
      expected_arrival_date = excluded.expected_arrival_date,
      status = excluded.status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    normalizedProduct.id,
    normalizedProduct.name,
    normalizedProduct.urduName || null,
    normalizedProduct.category,
    normalizedProduct.parentCategoryId || null,
    normalizedProduct.subcategoryId || null,
    normalizedProduct.childSubcategoryId || null,
    normalizedProduct.sku || null,
    Number(normalizedProduct.costPrice || 0),
    Number(normalizedProduct.marketPrice || 0),
    Number(normalizedProduct.ourPrice || 0),
    Number(normalizedProduct.stockQty || 0),
    Number(normalizedProduct.minStockAlert || 5),
    normalizedProduct.isUpcoming ? 1 : 0,
    normalizedProduct.upcomingStatus || 'available',
    normalizedProduct.expectedArrivalDate || null,
    normalizedProduct.status || 'published',
    normalizedProduct.createdAt || now.split('T')[0],
    now,
    JSON.stringify(normalizedProduct)
  );

  return normalizedProduct;
}

export function getAllCustomersFromDb(db = getDb()): Customer[] {
  const rows = db
    .prepare('SELECT * FROM customers ORDER BY created_at DESC, rowid DESC')
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => {
    let parsed: Customer;
    try {
      parsed = JSON.parse(String(r.data_json)) as Customer;
    } catch {
      parsed = {
        id: String(r.id),
        name: String(r.name),
        customerType: 'individual',
        phone: String(r.phone),
        creditLimit: 5000,
        paymentTermsDays: 7,
        createdAt: String(r.created_at),
        balance: Number(r.balance || 0),
        status: (String(r.status || 'active') as 'active' | 'archived'),
      };
    }
    return {
      ...parsed,
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      city: r.city ? String(r.city) : parsed.city,
      area: r.area ? String(r.area) : parsed.area,
      mohalla: r.mohalla ? String(r.mohalla) : parsed.mohalla,
      landmark: r.landmark ? String(r.landmark) : parsed.landmark,
      address: r.address ? String(r.address) : parsed.address,
      balance: Number(r.balance ?? parsed.balance ?? 0),
      status: (String(r.status || parsed.status || 'active') as 'active' | 'archived'),
    };
  });
}

export function upsertCustomerRow(db: DatabaseSync, customer: Customer): Customer {
  const now = new Date().toISOString();
  const normalized: Customer = {
    ...customer,
    city: customer.city?.trim() || undefined,
    area: customer.area?.trim() || undefined,
    mohalla: customer.mohalla?.trim() || undefined,
    landmark: customer.landmark?.trim() || undefined,
    address: customer.address?.trim() || undefined,
  };

  db.prepare(`
    INSERT INTO customers (id, name, phone, city, area, mohalla, landmark, address, balance, status, created_at, updated_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      city = excluded.city,
      area = excluded.area,
      mohalla = excluded.mohalla,
      landmark = excluded.landmark,
      address = excluded.address,
      balance = excluded.balance,
      status = excluded.status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    normalized.id,
    normalized.name,
    normalized.phone,
    normalized.city || null,
    normalized.area || null,
    normalized.mohalla || null,
    normalized.landmark || null,
    normalized.address || null,
    Number(normalized.balance || 0),
    normalized.status || 'active',
    normalized.createdAt || now.split('T')[0],
    now,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function getCollectionValue<T>(db: DatabaseSync, key: string, fallback: T): T {
  const row = db
    .prepare('SELECT data_json FROM app_collections WHERE collection_key = ?')
    .get(key) as { data_json: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.data_json) as T;
  } catch {
    return fallback;
  }
}

export function saveCollectionValue(db: DatabaseSync, key: string, value: unknown) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_collections (collection_key, data_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(collection_key) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), now);
}

export function insertAdminAuditLog(db: DatabaseSync, log: Omit<AdminAuditLog, 'id' | 'createdAt'>): AdminAuditLog {
  const entry: AdminAuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...log,
    createdAt: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO admin_audit_logs (id, action, entity_type, entity_id, actor_id, actor_name, actor_role, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id,
    entry.action,
    entry.entityType,
    entry.entityId,
    entry.actorId || null,
    entry.actorName || null,
    entry.actorRole || null,
    entry.details ? JSON.stringify(entry.details) : null,
    entry.createdAt
  );
  return entry;
}

export function getAdminAuditLogs(db = getDb()): AdminAuditLog[] {
  const rows = db
    .prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 200')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    action: String(r.action),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id),
    actorId: r.actor_id ? String(r.actor_id) : undefined,
    actorName: r.actor_name ? String(r.actor_name) : undefined,
    actorRole: r.actor_role ? String(r.actor_role) : undefined,
    details: r.details_json ? (JSON.parse(String(r.details_json)) as Record<string, unknown>) : undefined,
    createdAt: String(r.created_at),
  }));
}

export function redactStateForRole(
  state: Record<string, unknown>,
  actorRole?: string
): Record<string, unknown> {
  const isPrivileged = actorRole === 'super_admin' || actorRole === 'admin';
  if (isPrivileged) return state;

  const cloned = { ...state };
  if (cloned.business_profile && typeof cloned.business_profile === 'object') {
    const bp = { ...(cloned.business_profile as BusinessProfile) };
    bp.adminPin = undefined;
    if (bp.shippingPartner) {
      bp.shippingPartner = {
        ...bp.shippingPartner,
        apiKey: '',
      };
    }
    cloned.business_profile = bp;
  }

  if (Array.isArray(cloned.user_accounts)) {
    cloned.user_accounts = (cloned.user_accounts as UserAccount[]).map((u) => ({
      ...u,
      passwordHash: undefined,
      passwordSalt: undefined,
      resetToken: undefined,
      suggestedDefaultPin: undefined,
    }));
  }

  return cloned;
}

export function getFullSyncState(actorRole?: string): Record<string, unknown> {
  const db = getDb();
  const cities = getAllCitiesFromDb(db);
  const categories = getAllCategoriesFromDb(db);
  const products = getAllProductsFromDb(db);
  const customers = getAllCustomersFromDb(db);

  const profile = getCollectionValue<BusinessProfile>(db, 'business_profile', defaultBusinessProfile);
  const profileWithCities: BusinessProfile = {
    ...profile,
    deliveryCities: ensureCityAreasShape(cities.length > 0 ? cities : profile.deliveryCities || defaultDeliveryCities),
  };

  const state: Record<string, unknown> = {
    syncVersion: lastSyncVersion,
    products,
    categories,
    cities: profileWithCities.deliveryCities,
    customers,
    business_profile: profileWithCities,
    admin_audit_logs: getAdminAuditLogs(db),
  };

  for (const [key, fallback] of Object.entries(DEFAULT_COLLECTION_MAP)) {
    if (key === 'business_profile') continue;
    state[key] = getCollectionValue(db, key, fallback);
  }

  return redactStateForRole(state, actorRole);
}

/**
 * Non-destructive one-time localStorage -> SQLite merge.
 * Strictly inserts missing IDs only and never overwrites or deletes existing database rows.
 */
export function mergeLocalSnapshotNonDestructively(localCollections: Record<string, unknown>): {
  mergedCounts: Record<string, number>;
} {
  const db = getDb();
  const mergedCounts: Record<string, number> = {};
  const hasAnyData = Object.keys(localCollections || {}).length > 0;
  if (!hasAnyData) return { mergedCounts };

  createVerifiedBackup('before_local_merge');

  db.exec('BEGIN IMMEDIATE;');
  try {
    // 1. Categories
    if (Array.isArray(localCollections.categories)) {
      const existingIds = new Set(getAllCategoriesFromDb(db).map((c) => c.id));
      const existingNameParent = new Set(
        getAllCategoriesFromDb(db).map((c) => `${normalizeTextKey(c.name)}::${c.parentCategoryId || ''}`)
      );
      let added = 0;
      for (const raw of localCollections.categories as CategoryRecord[]) {
        if (!raw?.name) continue;
        const norm = normalizeUpcomingCategoryRecord(raw);
        const key = `${normalizeTextKey(norm.name)}::${norm.parentCategoryId || ''}`;
        if (!existingIds.has(norm.id) && !existingNameParent.has(key) && !isUpcomingCategoryName(norm.name)) {
          upsertCategoryRow(db, norm);
          existingIds.add(norm.id);
          existingNameParent.add(key);
          added++;
        }
      }
      if (added > 0) mergedCounts.categories = added;
    }

    // 2. Products
    if (Array.isArray(localCollections.products)) {
      const existingIds = new Set(getAllProductsFromDb(db).map((p) => p.id));
      let added = 0;
      for (const p of localCollections.products as ProductItem[]) {
        if (p?.id && p?.name && !existingIds.has(p.id)) {
          upsertProductRow(db, p);
          existingIds.add(p.id);
          added++;
        }
      }
      if (added > 0) mergedCounts.products = added;
    }

    // 3. Customers
    if (Array.isArray(localCollections.customers)) {
      const existingIds = new Set(getAllCustomersFromDb(db).map((c) => c.id));
      let added = 0;
      for (const c of localCollections.customers as Customer[]) {
        if (c?.id && c?.name && !existingIds.has(c.id)) {
          upsertCustomerRow(db, c);
          existingIds.add(c.id);
          added++;
        }
      }
      if (added > 0) mergedCounts.customers = added;
    }

    // 4. Cities / Delivery Cities (add missing cities/areas only)
    const localProfile = localCollections.business_profile as BusinessProfile | undefined;
    const localCities = (localCollections.cities as DeliveryCityConfig[] | undefined) || localProfile?.deliveryCities;
    if (Array.isArray(localCities) && localCities.length > 0) {
      const existingCities = getAllCitiesFromDb(db);
      const byName = new Map(existingCities.map((c) => [normalizeTextKey(c.name), c]));
      let added = 0;
      const now = new Date().toISOString();
      for (const lc of localCities) {
        if (!lc?.name) continue;
        const existing = byName.get(normalizeTextKey(lc.name));
        if (!existing) {
          const cid = lc.id || slugifyId('city', lc.name);
          db.prepare('INSERT OR IGNORE INTO cities (id, name, allowed, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
            cid,
            lc.name.trim(),
            lc.allowed !== false ? 1 : 0,
            existingCities.length + added + 1,
            now,
            now
          );
          for (const a of lc.areas || []) {
            if (!a?.name) continue;
            db.prepare('INSERT OR IGNORE INTO city_areas (id, city_id, name, allowed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
              a.id || slugifyId('area', `${lc.name}_${a.name}`),
              cid,
              a.name.trim(),
              a.allowed !== false ? 1 : 0,
              now,
              now
            );
          }
          added++;
        } else if (Array.isArray(lc.areas)) {
          const existingAreaNames = new Set((existing.areas || []).map((a) => normalizeTextKey(a.name)));
          for (const a of lc.areas) {
            if (a?.name && !existingAreaNames.has(normalizeTextKey(a.name))) {
              db.prepare('INSERT OR IGNORE INTO city_areas (id, city_id, name, allowed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
                a.id || slugifyId('area', `${existing.name}_${a.name}`),
                existing.id!,
                a.name.trim(),
                a.allowed !== false ? 1 : 0,
                now,
                now
              );
              existingAreaNames.add(normalizeTextKey(a.name));
            }
          }
        }
      }
      if (added > 0) {
        mergedCounts.cities = added;
        syncDeliveryCitiesIntoBusinessProfile(db);
      }
    }

    // 5. Generic array collections
    for (const key of Object.keys(DEFAULT_COLLECTION_MAP)) {
      if (key === 'business_profile') continue;
      const incomingArr = localCollections[key];
      if (!Array.isArray(incomingArr) || incomingArr.length === 0) continue;
      const currentArr = getCollectionValue<Array<Record<string, unknown>>>(db, key, []);
      const existingIds = new Set(currentArr.map((item) => String(item.id || '')));
      let added = 0;
      for (const item of incomingArr as Array<Record<string, unknown>>) {
        const id = item?.id ? String(item.id) : '';
        if (id && !existingIds.has(id)) {
          currentArr.push(item);
          existingIds.add(id);
          added++;
        }
      }
      if (added > 0) {
        saveCollectionValue(db, key, currentArr);
        mergedCounts[key] = added;
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  touchSyncVersion();
  return { mergedCounts };
}

export function getDatabaseHealthSummary() {
  const db = getDb();
  const counts = {
    categories: Number((db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c),
    cities: Number((db.prepare('SELECT COUNT(*) as c FROM cities').get() as { c: number }).c),
    cityAreas: Number((db.prepare('SELECT COUNT(*) as c FROM city_areas').get() as { c: number }).c),
    products: Number((db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c),
    customers: Number((db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c),
    transactions: getCollectionValue<Transaction[]>(db, 'transactions', []).length,
    codOrders: getCollectionValue<CODOrder[]>(db, 'cod_orders', []).length,
    auditLogs: Number((db.prepare('SELECT COUNT(*) as c FROM admin_audit_logs').get() as { c: number }).c),
  };
  return {
    status: 'ok',
    dbPath: DB_PATH,
    syncVersion: lastSyncVersion,
    counts,
    backups: listBackups().slice(0, 5),
  };
}
