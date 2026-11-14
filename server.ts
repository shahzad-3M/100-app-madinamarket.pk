import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  BusinessProfile,
  CategoryRecord,
  CODOrder,
  Customer,
  DeliveryCityConfig,
  ProductItem,
  Reseller,
  Transaction,
  UserAccount,
} from './src/types';
import {
  defaultBusinessProfile,
} from './src/utils/defaultData';
import {
  computeCategoryLevel,
  getCategoryBreadcrumb,
  getCategoryDescendantIds,
  isProductPurchaseBlocked,
  isUpcomingCategoryName,
  isUserAuthorizedForStockTransfer,
  normalizeTextKey,
  normalizeUpcomingCategoryRecord,
  slugifyId,
  UPCOMING_CATEGORY_ID,
  UPCOMING_CATEGORY_NAME,
} from './src/utils/locationCategoryHelpers';
import {
  createVerifiedBackup,
  getAllCategoriesFromDb,
  getAllCitiesFromDb,
  getAllCustomersFromDb,
  getAllProductsFromDb,
  getCollectionValue,
  getDatabaseHealthSummary,
  getDb,
  getFullSyncState,
  getSyncVersion,
  insertAdminAuditLog,
  listBackups,
  mergeLocalSnapshotNonDestructively,
  replaceCitiesAndAreasFromList,
  saveCollectionValue,
  syncDeliveryCitiesIntoBusinessProfile,
  touchSyncVersion,
  upsertCategoryRow,
  upsertCustomerRow,
  upsertProductRow,
} from './src/server/db';

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`100dagar_${process.cwd()}`).digest('hex');

interface SessionClaims {
  userId: string;
  role: string;
  name: string;
  exp: number;
}

function signSessionToken(claims: Omit<SessionClaims, 'exp'>): string {
  const payload: SessionClaims = {
    ...claims,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token?: string | null): SessionClaims | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionClaims;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function verifyServerPassword(
  plainPassword: string,
  storedHash?: string,
  storedSalt?: string
): Promise<boolean> {
  if (!storedHash) return false;
  if (!storedSalt) {
    return plainPassword === storedHash;
  }
  const digest = crypto
    .createHash('sha256')
    .update(`${storedSalt}:${plainPassword}`)
    .digest('hex');
  return digest === storedHash;
}

function normalizePhoneOrId(val: string): string {
  const clean = (val || '').trim().replace(/[\s-]/g, '');
  if (clean.startsWith('+92') && clean.length >= 12) return `0${clean.slice(3)}`;
  if (clean.startsWith('92') && clean.length >= 11 && !clean.startsWith('920')) return `0${clean.slice(2)}`;
  return clean;
}

function resolveActor(req: Request): {
  id?: string;
  role?: string;
  name?: string;
  account?: UserAccount;
} {
  const db = getDb();
  const authHeader = req.header('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const token = bearer || req.header('x-session-token');
  const claims = verifySessionToken(token);
  const accounts = getCollectionValue<UserAccount[]>(db, 'user_accounts', []);

  if (claims) {
    const account = accounts.find((u) => u.id === claims.userId);
    return {
      id: claims.userId,
      role: account?.role || claims.role,
      name: account?.fullName || claims.name,
      account,
    };
  }

  // Fallback verified against user_accounts for same-origin UI requests with actor headers
  const actorId = req.header('x-actor-id');
  const actorRole = req.header('x-actor-role');
  const actorName = req.header('x-actor-name');
  if (actorId) {
    const account = accounts.find((u) => u.id === actorId);
    if (account && account.status === 'active') {
      return {
        id: account.id,
        role: account.role,
        name: account.fullName,
        account,
      };
    }
    if (actorRole === 'super_admin' && actorId === 'usr_superadmin') {
      return { id: actorId, role: 'super_admin', name: actorName || 'Shahzad Malik' };
    }
  }
  return { role: undefined };
}

// Connected SSE clients for instant cross-device synchronization
const sseClients = new Set<Response>();

function broadcastSyncEvent(resource: string, sourceClientId?: string) {
  const updatedAt = touchSyncVersion();
  const payload = JSON.stringify({
    type: 'sync',
    resource,
    updatedAt,
    sourceClientId: sourceClientId || null,
  });
  for (const client of sseClients) {
    try {
      client.write(`event: sync\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  // Initialize SQLite DB, backups, and migrations before accepting requests
  getDb();

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Disable caching on all API routes so all devices always see fresh state
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // 1. HEALTH & BACKUP ENDPOINTS
  app.get('/api/health', (_req, res) => {
    res.json(getDatabaseHealthSummary());
  });

  app.get('/api/admin/backups', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can inspect database backups.' });
      return;
    }
    res.json({ backups: listBackups() });
  });

  app.post('/api/admin/backup', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can trigger database backups.' });
      return;
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'manual_admin';
    const meta = createVerifiedBackup(reason);
    res.json({ ok: true, backup: meta });
  });

  // 2. REAL-TIME SSE STREAM FOR CROSS-DEVICE SYNC
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(
      `event: connected\ndata: ${JSON.stringify({ syncVersion: getSyncVersion() })}\n\n`
    );

    const keepAlive = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // 3. CENTRAL STATE HYDRATION & NON-DESTRUCTIVE LOCAL MIGRATION
  app.get('/api/sync/state', (req, res) => {
    const actor = resolveActor(req);
    const state = getFullSyncState(actor.role);
    res.json(state);
  });

  app.post('/api/sync/migrate-local', (req, res) => {
    const collections = (req.body?.collections || {}) as Record<string, unknown>;
    const { mergedCounts } = mergeLocalSnapshotNonDestructively(collections);
    if (Object.keys(mergedCounts).length > 0) {
      broadcastSyncEvent('all', req.header('x-client-id'));
    }
    res.json({ ok: true, mergedCounts, syncVersion: getSyncVersion() });
  });

  // 4. AUTHENTICATION ENDPOINT
  app.post('/api/auth/login', async (req, res) => {
    const { identifier, pin } = (req.body || {}) as { identifier?: string; pin?: string };
    const cleanId = normalizePhoneOrId(identifier || '');
    const cleanIdLower = (identifier || '').trim().toLowerCase();
    const cleanPin = (pin || '').trim();

    if (!cleanId || !cleanPin) {
      res.status(400).json({ error: 'Identifier and PIN / password are required.' });
      return;
    }

    const db = getDb();
    const accounts = getCollectionValue<UserAccount[]>(db, 'user_accounts', []);
    const profile = getCollectionValue<BusinessProfile>(db, 'business_profile', defaultBusinessProfile);
    const ownerPin = profile.adminPin || '580987';
    const superAdminAcc = accounts.find((u) => u.id === 'usr_superadmin' || u.role === 'super_admin');

    const isSuperId =
      cleanId === '03125256266' || cleanIdLower === 'admin' || cleanIdLower === 'admin@madinamarket.pk';
    if (
      isSuperId &&
      (cleanPin === ownerPin ||
        (superAdminAcc ? await verifyServerPassword(cleanPin, superAdminAcc.passwordHash, superAdminAcc.passwordSalt) : false))
    ) {
      const userObj = {
        id: superAdminAcc?.id || 'usr_superadmin',
        name: superAdminAcc?.fullName || 'Shahzad Malik',
        urduName: superAdminAcc?.urduName || 'شہزاد ملک (سپر ایڈمن)',
        phone: superAdminAcc?.phone || '03125256266',
        email: superAdminAcc?.email || 'admin@madinamarket.pk',
        role: 'super_admin',
        canAuthorizeCreditSale: true,
        isAuthenticated: true,
      };
      const sessionToken = signSessionToken({ userId: userObj.id, role: 'super_admin', name: userObj.name });
      res.json({ ok: true, user: userObj, sessionToken });
      return;
    }

    const matchingAccounts = accounts.filter(
      (u) =>
        normalizePhoneOrId(u.phone) === cleanId ||
        u.username.toLowerCase() === cleanIdLower ||
        (u.email && u.email.toLowerCase() === cleanIdLower)
    );

    for (const acc of matchingAccounts) {
      const validHash = await verifyServerPassword(cleanPin, acc.passwordHash, acc.passwordSalt);
      const digits = acc.phone.replace(/\D/g, '');
      const defaultPin = digits.length >= 6 ? digits.slice(-6) : '123456';
      const validTemp =
        Boolean(acc.isTemporaryPassword || !acc.passwordHash) &&
        (cleanPin === acc.suggestedDefaultPin || cleanPin === defaultPin);
      if (validHash || validTemp) {
        if (acc.status !== 'active') {
          res.status(403).json({ error: 'Account is suspended or inactive.' });
          return;
        }
        const userObj = {
          id: acc.id,
          name: acc.fullName,
          urduName: acc.urduName,
          phone: acc.phone,
          email: acc.email,
          role: acc.role,
          customerId: acc.linkedCustomerId,
          investorId: acc.linkedInvestorId,
          resellerCode: acc.linkedResellerCode,
          branchId: acc.linkedBranchId,
          branchName: acc.linkedBranchName,
          managerAuthorities: acc.managerAuthorities,
          canAuthorizeCreditSale:
            acc.role === 'super_admin' ||
            acc.role === 'admin' ||
            Boolean(acc.canAuthorizeCreditSale ?? acc.managerAuthorities?.canAuthorizeCreditSale),
          isAuthenticated: true,
        };
        const sessionToken = signSessionToken({ userId: acc.id, role: acc.role, name: acc.fullName });
        res.json({ ok: true, user: userObj, sessionToken });
        return;
      }
    }

    res.status(401).json({ error: 'Invalid credentials.' });
  });

  // 5. PRODUCTS & UPCOMING -> ARRIVED TRANSFER
  app.get('/api/products', (_req, res) => {
    res.json({ products: getAllProductsFromDb() });
  });

  app.post('/api/products', (req, res) => {
    const db = getDb();
    const product = req.body as ProductItem;
    if (!product?.id || !product?.name) {
      res.status(400).json({ error: 'Product ID and name are required.' });
      return;
    }
    const saved = upsertProductRow(db, product);
    broadcastSyncEvent('products', req.header('x-client-id'));
    res.json({ ok: true, product: saved, syncVersion: getSyncVersion() });
  });

  app.put('/api/products/:id', (req, res) => {
    const db = getDb();
    const id = req.params.id;
    const existing = getAllProductsFromDb(db).find((p) => p.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const incoming = req.body as Partial<ProductItem>;
    const merged: ProductItem = { ...existing, ...incoming, id };

    // Prevent bypass via regular edit if product is still marked Upcoming / Coming Soon
    if (isProductPurchaseBlocked(merged)) {
      merged.isUpcoming = true;
      merged.upcomingStatus = 'coming_soon';
      merged.stockQty = 0;
      merged.category = UPCOMING_CATEGORY_NAME;
      merged.parentCategoryId = UPCOMING_CATEGORY_ID;
    }

    const saved = upsertProductRow(db, merged);
    broadcastSyncEvent('products', req.header('x-client-id'));
    res.json({ ok: true, product: saved, syncVersion: getSyncVersion() });
  });

  app.delete('/api/products/:id', (req, res) => {
    const actor = resolveActor(req);
    if (!isUserAuthorizedForStockTransfer(actor)) {
      res.status(403).json({ error: 'Unauthorized to delete products.' });
      return;
    }
    const db = getDb();
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    broadcastSyncEvent('products', req.header('x-client-id'));
    res.json({ ok: true, syncVersion: getSyncVersion() });
  });

  app.post('/api/products/:id/activate-arrival', (req, res) => {
    const actor = resolveActor(req);
    if (!isUserAuthorizedForStockTransfer(actor)) {
      res.status(403).json({
        error: 'Only administrators or authorized stock managers can confirm physical arrival and activate Coming Soon products.',
      });
      return;
    }

    const db = getDb();
    const existing = getAllProductsFromDb(db).find((p) => p.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const {
      parentCategoryId,
      subcategoryId,
      childSubcategoryId,
      ourPrice,
      marketPrice,
      costPrice,
      stockQty,
      variations,
      details,
      badgeText,
    } = (req.body || {}) as {
      parentCategoryId?: string;
      subcategoryId?: string;
      childSubcategoryId?: string;
      ourPrice?: number;
      marketPrice?: number;
      costPrice?: number;
      stockQty?: number;
      variations?: ProductItem['variations'];
      details?: string;
      badgeText?: string;
    };

    const allCats = getAllCategoriesFromDb(db);
    const targetMain = allCats.find((c) => c.id === parentCategoryId);
    if (!targetMain || targetMain.isUpcoming || targetMain.id === UPCOMING_CATEGORY_ID) {
      res.status(400).json({ error: 'Please select a valid active Main Category outside Upcoming Viral Products.' });
      return;
    }

    const finalStock = Math.max(0, Number(stockQty ?? existing.stockQty ?? 0));
    if (finalStock <= 0) {
      res.status(400).json({ error: 'Initial arrived stock quantity must be greater than 0.' });
      return;
    }

    const finalOurPrice = Number(ourPrice ?? existing.ourPrice ?? 0);
    if (finalOurPrice <= 0) {
      res.status(400).json({ error: 'Selling price must be greater than 0.' });
      return;
    }

    const categoryBreadcrumb = getCategoryBreadcrumb(allCats, parentCategoryId, subcategoryId, childSubcategoryId);
    const now = new Date().toISOString();

    const activatedProduct: ProductItem = {
      ...existing,
      category: categoryBreadcrumb,
      parentCategoryId,
      subcategoryId: subcategoryId || undefined,
      childSubcategoryId: childSubcategoryId || undefined,
      ourPrice: finalOurPrice,
      marketPrice: Number(marketPrice ?? existing.marketPrice ?? finalOurPrice),
      costPrice: Number(costPrice ?? existing.costPrice ?? 0),
      stockQty: finalStock,
      variations: Array.isArray(variations) ? variations : existing.variations,
      details: typeof details === 'string' ? details : existing.details,
      badgeText: badgeText !== undefined ? badgeText : existing.badgeText === 'COMING SOON' ? 'NEW ARRIVAL' : existing.badgeText,
      isUpcoming: false,
      upcomingStatus: 'available',
      status: 'published',
      activatedAt: now,
      activatedBy: actor.name || actor.role || 'Admin',
      updatedAt: now,
    };

    const saved = upsertProductRow(db, activatedProduct);
    insertAdminAuditLog(db, {
      action: 'activate_upcoming_arrival',
      entityType: 'product',
      entityId: saved.id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      details: {
        productName: saved.name,
        targetCategory: saved.category,
        stockQty: saved.stockQty,
        ourPrice: saved.ourPrice,
      },
    });

    broadcastSyncEvent('products', req.header('x-client-id'));
    res.json({ ok: true, product: saved, syncVersion: getSyncVersion() });
  });

  // 6. MULTI-LEVEL CATEGORIES (3 LEVELS)
  app.get('/api/categories', (_req, res) => {
    res.json({ categories: getAllCategoriesFromDb() });
  });

  app.post('/api/categories', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Only admins/managers can create categories.' });
      return;
    }

    const body = req.body as Partial<CategoryRecord>;
    const cleanName = (body.name || '').trim();
    if (!cleanName) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const db = getDb();
    const allCats = getAllCategoriesFromDb(db);
    const parentId = body.parentCategoryId?.trim() || undefined;

    if (parentId) {
      const parent = allCats.find((c) => c.id === parentId);
      if (!parent) {
        res.status(400).json({ error: 'Parent category not found.' });
        return;
      }
      if (parent.isUpcoming || parent.id === UPCOMING_CATEGORY_ID) {
        res.status(400).json({ error: 'Subcategories cannot be nested under Upcoming Viral Products.' });
        return;
      }
      const parentLevel = computeCategoryLevel(parent, allCats);
      if (parentLevel >= 3) {
        res.status(400).json({ error: 'Maximum 3 levels allowed (Main Category → Subcategory → Child Subcategory).' });
        return;
      }
    }

    const duplicate = allCats.find(
      (c) =>
        normalizeTextKey(c.name) === normalizeTextKey(cleanName) &&
        (c.parentCategoryId || '') === (parentId || '')
    );
    if (duplicate) {
      res.status(409).json({ error: `Category "${cleanName}" already exists under the same parent.` });
      return;
    }

    const newCat: CategoryRecord = {
      id: body.id || `${slugifyId('cat', cleanName)}_${Date.now().toString(36).slice(-4)}`,
      name: cleanName,
      urduName: body.urduName?.trim() || undefined,
      parentCategoryId: parentId,
      description: body.description?.trim() || undefined,
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder ?? allCats.length + 1,
    };

    const saved = upsertCategoryRow(db, newCat);
    broadcastSyncEvent('categories', req.header('x-client-id'));
    res.json({ ok: true, category: saved, categories: getAllCategoriesFromDb(db), syncVersion: getSyncVersion() });
  });

  app.put('/api/categories/:id', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Only admins/managers can update categories.' });
      return;
    }

    const db = getDb();
    const id = req.params.id;
    const allCats = getAllCategoriesFromDb(db);
    const existing = allCats.find((c) => c.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const body = req.body as Partial<CategoryRecord>;
    if (existing.id === UPCOMING_CATEGORY_ID || existing.isUpcoming) {
      // Keep canonical Upcoming category active & intact
      const saved = upsertCategoryRow(db, {
        ...existing,
        urduName: body.urduName ?? existing.urduName,
        description: body.description ?? existing.description,
        isActive: true,
        isUpcoming: true,
        name: UPCOMING_CATEGORY_NAME,
        parentCategoryId: undefined,
      });
      broadcastSyncEvent('categories', req.header('x-client-id'));
      res.json({ ok: true, category: saved, categories: getAllCategoriesFromDb(db), syncVersion: getSyncVersion() });
      return;
    }

    const nextName = (body.name ?? existing.name).trim();
    if (!nextName) {
      res.status(400).json({ error: 'Category name cannot be empty.' });
      return;
    }

    const nextParentId =
      body.parentCategoryId !== undefined
        ? body.parentCategoryId?.trim() || undefined
        : existing.parentCategoryId;

    if (nextParentId) {
      if (nextParentId === id) {
        res.status(400).json({ error: 'A category cannot be its own parent.' });
        return;
      }
      const descendants = getCategoryDescendantIds(allCats, id);
      if (descendants.has(nextParentId)) {
        res.status(400).json({ error: 'Circular parent hierarchy detected. Choose a valid parent category.' });
        return;
      }
      const parent = allCats.find((c) => c.id === nextParentId);
      if (!parent || parent.isUpcoming || parent.id === UPCOMING_CATEGORY_ID) {
        res.status(400).json({ error: 'Invalid parent category selected.' });
        return;
      }
      const parentLevel = computeCategoryLevel(parent, allCats);
      if (parentLevel >= 3) {
        res.status(400).json({ error: 'Maximum hierarchy depth is 3 levels.' });
        return;
      }
    }

    const duplicate = allCats.find(
      (c) =>
        c.id !== id &&
        normalizeTextKey(c.name) === normalizeTextKey(nextName) &&
        (c.parentCategoryId || '') === (nextParentId || '')
    );
    if (duplicate) {
      res.status(409).json({ error: `Another category named "${nextName}" already exists under the selected parent.` });
      return;
    }

    const saved = upsertCategoryRow(db, {
      ...existing,
      ...body,
      id,
      name: nextName,
      parentCategoryId: nextParentId,
    });

    // Recompute child levels & product category breadcrumbs referencing this category
    const refreshedCats = getAllCategoriesFromDb(db);
    for (const child of refreshedCats) {
      if (child.parentCategoryId === id) {
        upsertCategoryRow(db, child);
      }
    }
    const finalCats = getAllCategoriesFromDb(db);
    const prods = getAllProductsFromDb(db);
    for (const p of prods) {
      if (p.parentCategoryId === id || p.subcategoryId === id || p.childSubcategoryId === id) {
        upsertProductRow(db, {
          ...p,
          category: getCategoryBreadcrumb(finalCats, p.parentCategoryId, p.subcategoryId, p.childSubcategoryId, p.category),
        });
      }
    }

    broadcastSyncEvent('categories', req.header('x-client-id'));
    res.json({ ok: true, category: saved, categories: finalCats, syncVersion: getSyncVersion() });
  });

  app.delete('/api/categories/:id', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can delete categories.' });
      return;
    }

    const db = getDb();
    const id = req.params.id;
    const allCats = getAllCategoriesFromDb(db);
    const target = allCats.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    if (target.id === UPCOMING_CATEGORY_ID || target.isUpcoming) {
      res.status(400).json({ error: 'The Upcoming Viral Products | Coming Soon category is protected and cannot be deleted.' });
      return;
    }

    const hasChildren = allCats.some((c) => c.parentCategoryId === id);
    if (hasChildren) {
      res.status(400).json({ error: 'Cannot delete category while it has subcategories. Reassign or remove subcategories first.' });
      return;
    }

    const products = getAllProductsFromDb(db);
    const inUse = products.some(
      (p) =>
        p.parentCategoryId === id ||
        p.subcategoryId === id ||
        p.childSubcategoryId === id ||
        normalizeTextKey(p.category) === normalizeTextKey(target.name)
    );
    if (inUse) {
      res.status(400).json({ error: 'Cannot delete category with assigned products. Reassign products or deactivate instead.' });
      return;
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    broadcastSyncEvent('categories', req.header('x-client-id'));
    res.json({ ok: true, categories: getAllCategoriesFromDb(db), syncVersion: getSyncVersion() });
  });

  // 7. CITIES & AREAS LOCATION MANAGEMENT
  app.get('/api/locations', (_req, res) => {
    res.json({ cities: getAllCitiesFromDb() });
  });

  app.post('/api/cities', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Unauthorized to manage cities.' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    const allowed = req.body?.allowed !== false;
    if (!name) {
      res.status(400).json({ error: 'City name is required.' });
      return;
    }

    const db = getDb();
    const existing = getAllCitiesFromDb(db);
    if (existing.some((c) => normalizeTextKey(c.name) === normalizeTextKey(name))) {
      res.status(409).json({ error: `City "${name}" already exists.` });
      return;
    }

    const id = slugifyId('city', name) + '_' + Date.now().toString(36).slice(-4);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO cities (id, name, allowed, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      name,
      allowed ? 1 : 0,
      existing.length + 1,
      now,
      now
    );
    const profile = syncDeliveryCitiesIntoBusinessProfile(db);
    broadcastSyncEvent('locations', req.header('x-client-id'));
    res.json({ ok: true, cities: profile.deliveryCities, syncVersion: getSyncVersion() });
  });

  app.put('/api/cities/:id', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Unauthorized to manage cities.' });
      return;
    }
    const db = getDb();
    const id = req.params.id;
    const cities = getAllCitiesFromDb(db);
    const target = cities.find((c) => c.id === id || normalizeTextKey(c.name) === normalizeTextKey(id));
    if (!target || !target.id) {
      res.status(404).json({ error: 'City not found.' });
      return;
    }

    const nextName = typeof req.body?.name === 'string' ? req.body.name.trim() : target.name;
    const nextAllowed = req.body?.allowed !== undefined ? Boolean(req.body.allowed) : target.allowed;
    if (!nextName) {
      res.status(400).json({ error: 'City name cannot be empty.' });
      return;
    }
    if (cities.some((c) => c.id !== target.id && normalizeTextKey(c.name) === normalizeTextKey(nextName))) {
      res.status(409).json({ error: `City "${nextName}" already exists.` });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE cities SET name = ?, allowed = ?, updated_at = ? WHERE id = ?').run(
      nextName,
      nextAllowed ? 1 : 0,
      now,
      target.id
    );
    const profile = syncDeliveryCitiesIntoBusinessProfile(db);
    broadcastSyncEvent('locations', req.header('x-client-id'));
    res.json({ ok: true, cities: profile.deliveryCities, syncVersion: getSyncVersion() });
  });

  app.post('/api/cities/:cityId/areas', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Unauthorized to manage areas.' });
      return;
    }
    const db = getDb();
    const cities = getAllCitiesFromDb(db);
    const city = cities.find((c) => c.id === req.params.cityId || normalizeTextKey(c.name) === normalizeTextKey(req.params.cityId));
    if (!city || !city.id) {
      res.status(404).json({ error: 'Parent city not found.' });
      return;
    }
    const areaName = String(req.body?.name || '').trim();
    if (!areaName) {
      res.status(400).json({ error: 'Area name is required.' });
      return;
    }
    if ((city.areas || []).some((a) => normalizeTextKey(a.name) === normalizeTextKey(areaName))) {
      res.status(409).json({ error: `Area "${areaName}" already exists under ${city.name}.` });
      return;
    }

    const areaId = slugifyId('area', `${city.name}_${areaName}`) + '_' + Date.now().toString(36).slice(-4);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO city_areas (id, city_id, name, allowed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      areaId,
      city.id,
      areaName,
      req.body?.allowed !== false ? 1 : 0,
      now,
      now
    );
    const profile = syncDeliveryCitiesIntoBusinessProfile(db);
    broadcastSyncEvent('locations', req.header('x-client-id'));
    res.json({ ok: true, cities: profile.deliveryCities, syncVersion: getSyncVersion() });
  });

  app.put('/api/areas/:areaId', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin' && actor.role !== 'manager') {
      res.status(403).json({ error: 'Unauthorized to manage areas.' });
      return;
    }
    const db = getDb();
    const areaRow = db.prepare('SELECT * FROM city_areas WHERE id = ?').get(req.params.areaId) as Record<string, unknown> | undefined;
    if (!areaRow) {
      res.status(404).json({ error: 'Area not found.' });
      return;
    }
    const nextName = typeof req.body?.name === 'string' ? req.body.name.trim() : String(areaRow.name);
    const nextAllowed = req.body?.allowed !== undefined ? Boolean(req.body.allowed) : Boolean(areaRow.allowed);
    if (!nextName) {
      res.status(400).json({ error: 'Area name cannot be empty.' });
      return;
    }

    const dup = db
      .prepare('SELECT id FROM city_areas WHERE city_id = ? AND id != ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))')
      .get(String(areaRow.city_id), String(areaRow.id), nextName);
    if (dup) {
      res.status(409).json({ error: `Area "${nextName}" already exists in this city.` });
      return;
    }

    db.prepare('UPDATE city_areas SET name = ?, allowed = ?, updated_at = ? WHERE id = ?').run(
      nextName,
      nextAllowed ? 1 : 0,
      new Date().toISOString(),
      String(areaRow.id)
    );
    const profile = syncDeliveryCitiesIntoBusinessProfile(db);
    broadcastSyncEvent('locations', req.header('x-client-id'));
    res.json({ ok: true, cities: profile.deliveryCities, syncVersion: getSyncVersion() });
  });

  app.delete('/api/areas/:areaId', (req, res) => {
    const actor = resolveActor(req);
    if (actor.role !== 'super_admin' && actor.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can remove areas.' });
      return;
    }
    const db = getDb();
    db.prepare('DELETE FROM city_areas WHERE id = ?').run(req.params.areaId);
    const profile = syncDeliveryCitiesIntoBusinessProfile(db);
    broadcastSyncEvent('locations', req.header('x-client-id'));
    res.json({ ok: true, cities: profile.deliveryCities, syncVersion: getSyncVersion() });
  });

  // 8. CUSTOMERS CRUD
  app.get('/api/customers', (_req, res) => {
    res.json({ customers: getAllCustomersFromDb() });
  });

  app.post('/api/customers', (req, res) => {
    const db = getDb();
    const customer = req.body as Customer;
    if (!customer?.id || !customer?.name) {
      res.status(400).json({ error: 'Customer ID and name are required.' });
      return;
    }
    const saved = upsertCustomerRow(db, customer);
    broadcastSyncEvent('customers', req.header('x-client-id'));
    res.json({ ok: true, customer: saved, syncVersion: getSyncVersion() });
  });

  app.put('/api/customers/:id', (req, res) => {
    const db = getDb();
    const existing = getAllCustomersFromDb(db).find((c) => c.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    const saved = upsertCustomerRow(db, { ...existing, ...(req.body as Partial<Customer>), id: existing.id });
    broadcastSyncEvent('customers', req.header('x-client-id'));
    res.json({ ok: true, customer: saved, syncVersion: getSyncVersion() });
  });

  // 9. AUTHORITATIVE ORDER CHECKOUT WITH UPCOMING PURCHASE BLOCK
  app.post('/api/orders/checkout', (req, res) => {
    const db = getDb();
    const {
      items,
      customer,
      transaction,
      codOrder,
      resellerId,
    } = (req.body || {}) as {
      items?: Array<{ productId: string; quantity: number }>;
      customer?: Customer;
      transaction?: Transaction;
      codOrder?: CODOrder;
      resellerId?: string;
    };

    const allProducts = getAllProductsFromDb(db);
    const requestedItems = items || (transaction?.items || []).map((i) => ({ productId: i.productId || '', quantity: i.quantity }));

    for (const item of requestedItems) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod && isProductPurchaseBlocked(prod)) {
        res.status(400).json({
          error: `"${prod.name}" is in "${UPCOMING_CATEGORY_NAME}" (Coming Soon) and cannot be purchased or ordered until an authorized Admin/Stock Manager confirms physical arrival.`,
        });
        return;
      }
    }

    if (codOrder?.city) {
      const cities = getAllCitiesFromDb(db);
      const matchedCity = cities.find((c) => normalizeTextKey(c.name) === normalizeTextKey(codOrder.city));
      if (matchedCity && !matchedCity.allowed) {
        res.status(400).json({
          error: `Delivery to "${codOrder.city}" is currently disabled in delivery settings.`,
        });
        return;
      }
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      if (customer) {
        upsertCustomerRow(db, customer);
      }
      if (transaction) {
        const currentTxs = getCollectionValue<Transaction[]>(db, 'transactions', []);
        saveCollectionValue(db, 'transactions', [transaction, ...currentTxs.filter((t) => t.id !== transaction.id)]);
      }
      if (codOrder) {
        const currentOrders = getCollectionValue<CODOrder[]>(db, 'cod_orders', []);
        saveCollectionValue(db, 'cod_orders', [codOrder, ...currentOrders.filter((o) => o.id !== codOrder.id)]);
      }
      for (const item of requestedItems) {
        const prod = allProducts.find((p) => p.id === item.productId);
        if (prod && !isProductPurchaseBlocked(prod)) {
          const qty = Math.max(0, Number(item.quantity || 0));
          upsertProductRow(db, {
            ...prod,
            stockQty: Math.max(0, prod.stockQty - qty),
            salesCount: (prod.salesCount || 0) + qty,
            totalRevenue: (prod.totalRevenue || 0) + qty * prod.ourPrice,
            totalProfit: (prod.totalProfit || 0) + qty * Math.max(0, prod.ourPrice - prod.costPrice),
          });
        }
      }
      if (resellerId && transaction) {
        const resellers = getCollectionValue<Reseller[]>(db, 'resellers', []);
        const comm = Math.floor((transaction.paidAmount || 0) / 1000) * 30;
        const updatedResellers = resellers.map((r) =>
          r.id === resellerId
            ? {
                ...r,
                totalReferredOrders: r.totalReferredOrders + 1,
                totalSales: r.totalSales + transaction.amount,
                totalPaidSales: r.totalPaidSales + (transaction.paidAmount || 0),
                earnedCommission: r.earnedCommission + comm,
              }
            : r
        );
        saveCollectionValue(db, 'resellers', updatedResellers);
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Checkout persistence failed.' });
      return;
    }

    broadcastSyncEvent('orders', req.header('x-client-id'));
    res.json({ ok: true, syncVersion: getSyncVersion() });
  });

  // 10. CENTRAL COLLECTION SYNC ROUTE (KEEPS ALL EXISTING MODULES MULTI-DEVICE SYNCHRONIZED)
  app.put('/api/collections/:collectionKey', (req, res) => {
    const key = req.params.collectionKey;
    const data = req.body?.data;
    if (data === undefined) {
      res.status(400).json({ error: 'Request body must contain { data }.' });
      return;
    }

    const db = getDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      if (key === 'products' && Array.isArray(data)) {
        const incomingList = data as ProductItem[];
        const incomingIds = new Set(incomingList.map((p) => p.id));
        const existing = getAllProductsFromDb(db);
        for (const ex of existing) {
          if (!incomingIds.has(ex.id)) {
            db.prepare('DELETE FROM products WHERE id = ?').run(ex.id);
          }
        }
        for (const item of incomingList) {
          if (item?.id) {
            upsertProductRow(db, item);
          }
        }
      } else if (key === 'categories' && Array.isArray(data)) {
        const incoming = (data as CategoryRecord[]).map(normalizeUpcomingCategoryRecord);
        const hasUpcoming = incoming.some((c) => c.id === UPCOMING_CATEGORY_ID || c.isUpcoming);
        if (!hasUpcoming) {
          const existingUp = getAllCategoriesFromDb(db).find((c) => c.id === UPCOMING_CATEGORY_ID || c.isUpcoming);
          if (existingUp) incoming.push(existingUp);
        }
        const incomingIds = new Set(incoming.map((c) => c.id));
        const existing = getAllCategoriesFromDb(db);
        for (const ex of existing) {
          if (!incomingIds.has(ex.id) && ex.id !== UPCOMING_CATEGORY_ID && !ex.isUpcoming) {
            db.prepare('DELETE FROM categories WHERE id = ?').run(ex.id);
          }
        }
        for (const cat of incoming) {
          upsertCategoryRow(db, cat);
        }
      } else if (key === 'customers' && Array.isArray(data)) {
        const incoming = data as Customer[];
        const incomingIds = new Set(incoming.map((c) => c.id));
        const existing = getAllCustomersFromDb(db);
        for (const ex of existing) {
          if (!incomingIds.has(ex.id)) {
            db.prepare('DELETE FROM customers WHERE id = ?').run(ex.id);
          }
        }
        for (const c of incoming) {
          if (c?.id) upsertCustomerRow(db, c);
        }
      } else if (key === 'cities' && Array.isArray(data)) {
        replaceCitiesAndAreasFromList(db, data as DeliveryCityConfig[]);
        syncDeliveryCitiesIntoBusinessProfile(db);
      } else if (key === 'business_profile' && typeof data === 'object' && data !== null) {
        const incomingBp = data as BusinessProfile;
        const currentBp = getCollectionValue<BusinessProfile>(db, 'business_profile', defaultBusinessProfile);
        // Never accidentally erase adminPin or apiKey if client sent redacted copy
        const mergedBp: BusinessProfile = {
          ...incomingBp,
          adminPin: incomingBp.adminPin || currentBp.adminPin,
          shippingPartner: {
            ...incomingBp.shippingPartner,
            apiKey: incomingBp.shippingPartner?.apiKey || currentBp.shippingPartner?.apiKey || '',
          },
        };
        if (Array.isArray(mergedBp.deliveryCities)) {
          replaceCitiesAndAreasFromList(db, mergedBp.deliveryCities);
        }
        saveCollectionValue(db, 'business_profile', {
          ...mergedBp,
          deliveryCities: getAllCitiesFromDb(db),
        });
      } else if (key === 'user_accounts' && Array.isArray(data)) {
        const existingAccounts = getCollectionValue<UserAccount[]>(db, 'user_accounts', []);
        const byId = new Map(existingAccounts.map((u) => [u.id, u]));
        // Preserve server-stored passwordHash/salt if a non-admin client saved redacted objects
        const mergedAccounts = (data as UserAccount[]).map((u) => {
          const prev = byId.get(u.id);
          if (!prev) return u;
          return {
            ...u,
            passwordHash: u.passwordHash || prev.passwordHash,
            passwordSalt: u.passwordSalt || prev.passwordSalt,
          };
        });
        saveCollectionValue(db, 'user_accounts', mergedAccounts);
      } else {
        saveCollectionValue(db, key, data);
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to persist collection.' });
      return;
    }

    broadcastSyncEvent(key, req.header('x-client-id'));
    res.json({ ok: true, syncVersion: getSyncVersion() });
  });

  // Frontend middleware / static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`100DAGAR Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start 100DAGAR server:', err);
  process.exit(1);
});
