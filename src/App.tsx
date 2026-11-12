import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import {
  AgeGroupType,
  AppUser,
  AttendanceRecord,
  BroadcastContact,
  BusinessProfile,
  CartItem,
  CODOrder,
  CODOrderStatus,
  Customer,
  Employee,
  GenderType,
  LuckyDrawEvent,
  LuckyDrawWinner,
  PaymentMode,
  ProductBroadcast,
  ProductItem,
  RecurringInvoice,
  ReminderTemplate,
  Reseller,
  SalePaymentType,
  SavedBroadcastCampaign,
  TopBuyer,
  Transaction,
  TransactionAuditEntry,
  UserRole,
  WhatsAppNotification,
} from './types';
import {
  defaultCustomerUser,
  getActiveRole,
  getAttendance,
  getBroadcastContacts,
  getBusinessProfile,
  getCODOrders,
  getCurrentUser,
  getCustomers,
  getDefaultPinForPhone,
  getEmployees,
  getLuckyDraws,
  getProductBroadcasts,
  getProducts,
  getRecurringInvoices,
  getReminderTemplates,
  getResellers,
  getSavedBroadcasts,
  getTransactions,
  getWhatsAppNotifications,
  recalculateCustomerBalances,
  saveActiveRole,
  saveAttendance,
  saveBroadcastContacts,
  saveBusinessProfile,
  saveCODOrders,
  saveCurrentUser,
  saveCustomers,
  saveEmployees,
  saveLuckyDraws,
  saveProductBroadcasts,
  saveProducts,
  saveRecurringInvoices,
  saveReminderTemplates,
  saveResellers,
  saveSavedBroadcasts,
  saveTransactions,
  saveWhatsAppNotifications,
  getCategories,
  saveCategories,
  addCategory,
} from './utils/storage';
import {
  buildCustomerPaymentReminderMessage,
  buildSaleInvoiceMessage,
  formatPaymentChannelsText,
  openWhatsAppDirect,
} from './utils/whatsapp';
import {
  computeTopBuyers,
  generateMonthlyRemindersBatch,
  generatePaymentTermsAlertsBatch,
  generateProductBroadcastBatch,
  generateSegmentedBroadcastBatch,
  generateWeeklyDueRemindersBatch,
  runRecurringInvoicesCheck,
} from './utils/automationEngine';
import { Navbar } from './components/Navbar';
import { StoreCatalogView } from './components/StoreCatalogView';
import { MonthlyStatementView } from './components/MonthlyStatementView';
import { InventoryView } from './components/InventoryView';
import { PaymentTermsView } from './components/PaymentTermsView';
import { LuckyDrawView } from './components/LuckyDrawView';
import { CODOrdersView } from './components/CODOrdersView';
import { HRManagementView } from './components/HRManagementView';
import { ResellersView } from './components/ResellersView';
import { LoginRoleModal } from './components/LoginRoleModal';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { RecurringInvoicesView } from './components/RecurringInvoicesView';
import { WhatsAppAutomationView } from './components/WhatsAppAutomationView';
import { ReportsView } from './components/ReportsView';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import { SettingsView } from './components/SettingsView';
import { CheckoutModal } from './components/CheckoutModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { ScheduleWhatsAppModal } from './components/ScheduleWhatsAppModal';
import { AddRecurringInvoiceModal } from './components/AddRecurringInvoiceModal';
import { ProductBroadcastModal } from './components/ProductBroadcastModal';
import { InvoiceModal } from './components/InvoiceModal';
import { UserManagementView } from './components/UserManagementView';
import { InvestorManagementView } from './components/InvestorManagementView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { CategoryManagementModal } from './components/CategoryManagementModal';

export default function App() {
  // Main Data States
  const [profile, setProfile] = useState<BusinessProfile>(getBusinessProfile);
  const [products, setProducts] = useState<ProductItem[]>(getProducts);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const rawCusts = getCustomers();
    const rawTxs = getTransactions();
    return recalculateCustomerBalances(rawCusts, rawTxs);
  });
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>(getRecurringInvoices);
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>(getWhatsAppNotifications);
  const [templates, setTemplates] = useState<ReminderTemplate[]>(getReminderTemplates);
  const [productBroadcasts, setProductBroadcasts] = useState<ProductBroadcast[]>(getProductBroadcasts);
  const [luckyDraws, setLuckyDraws] = useState<LuckyDrawEvent[]>(getLuckyDraws);
  const [broadcastContacts, setBroadcastContacts] = useState<BroadcastContact[]>(getBroadcastContacts);
  const [savedBroadcasts, setSavedBroadcasts] = useState<SavedBroadcastCampaign[]>(getSavedBroadcasts);
  const [isWebsiteImportModalOpen, setIsWebsiteImportModalOpen] = useState(false);

  // New Features States: COD Orders, HR, Resellers, User Roles
  const [codOrders, setCODOrders] = useState<CODOrder[]>(getCODOrders);
  const [employees, setEmployees] = useState<Employee[]>(getEmployees);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(getAttendance);
  const [resellers, setResellers] = useState<Reseller[]>(getResellers);
  const [activeRole, setActiveRole] = useState<UserRole>(getActiveRole);
  const [currentUser, setCurrentUser] = useState<AppUser>(getCurrentUser);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const openRoleModal = () => {
    setIsRoleModalOpen(true);
  };

  // POS / Sale Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Navigation & Filter States
  const [currentTab, setCurrentTab] = useState<string>('store'); // Default to Store & POS Catalog matching screenshot!
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'customer' | 'merchant'>(() => {
    const role = getActiveRole();
    return role === 'customer' ? 'customer' : 'merchant';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const handleTabChange = (tab: string) => {
    if (tab === 'categories_manage') {
      setIsCategoryModalOpen(true);
      return;
    }
    if (activeRole === 'customer') {
      const allowed = ['store', 'customer_portal', 'history', 'reports', 'monthly_statement', 'lucky_draw'];
      if (!allowed.includes(tab)) {
        setCurrentTab('store');
        return;
      }
    } else if (activeRole === 'investor') {
      const allowed = ['store', 'investors', 'lucky_draw'];
      if (!allowed.includes(tab)) {
        setCurrentTab('investors');
        return;
      }
    } else if (activeRole === 'reseller') {
      const allowed = ['store', 'resellers', 'history', 'monthly_statement', 'lucky_draw'];
      if (!allowed.includes(tab)) {
        setCurrentTab('resellers');
        return;
      }
    }
    setCurrentTab(tab);
  };

  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('100dagar_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // Modal States
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [addTxType, setAddTxType] = useState<'credit' | 'debit'>('credit');
  const [addTxCustomerId, setAddTxCustomerId] = useState<string | undefined>(undefined);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScheduleWhatsAppOpen, setIsScheduleWhatsAppOpen] = useState(false);
  const [scheduleCustomerId, setScheduleCustomerId] = useState<string | undefined>(undefined);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>(undefined);

  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isProductBroadcastOpen, setIsProductBroadcastOpen] = useState(false);

  const [invoiceModalTx, setInvoiceModalTx] = useState<Transaction | null>(null);
  const [invoiceModalCustomer, setInvoiceModalCustomer] = useState<Customer | null>(null);

  // Synchronize Dark Mode with Document Root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('100dagar_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('100dagar_theme', 'light');
    }
  }, [darkMode]);

  // Recalculate balances and customer purchases whenever transactions change
  const syncTransactionsAndBalances = useCallback(
    (newTxs: Transaction[], newCusts: Customer[]) => {
      const balanced = recalculateCustomerBalances(newCusts, newTxs);
      setCustomers(balanced);
      setTransactions(newTxs);
      saveCustomers(balanced);
      saveTransactions(newTxs);
    },
    []
  );

  // Derived Top Buyers calculation
  const topBuyers = useMemo(() => {
    return computeTopBuyers(customers, transactions);
  }, [customers, transactions]);

  // Centralized Distinct Categories
  const allCategories = useMemo(() => {
    const central = getCategories();
    const fromProds = products.map((p) => p.category?.trim()).filter(Boolean);
    return Array.from(new Set([...central, ...fromProds])).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Pending alerts badge count
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingAlertsCount = notifications.filter(
    (n) => n.status === 'pending' && n.scheduledFor <= todayStr
  ).length;

  // Cart Totals
  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const cartTotal = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

  // Refresh all state from localStorage
  const handleRefreshAllData = () => {
    const prof = getBusinessProfile();
    const rawTxs = getTransactions();
    const rawCusts = getCustomers();
    const prods = getProducts();
    const recs = getRecurringInvoices();
    const notifs = getWhatsAppNotifications();
    const tpls = getReminderTemplates();
    const bcasts = getProductBroadcasts();
    const draws = getLuckyDraws();
    const bContacts = getBroadcastContacts();
    const savedCamps = getSavedBroadcasts();
    const cods = getCODOrders();
    const emps = getEmployees();
    const atts = getAttendance();
    const resells = getResellers();

    const balanced = recalculateCustomerBalances(rawCusts, rawTxs);

    setProfile(prof);
    setProducts(prods);
    setCustomers(balanced);
    setTransactions(rawTxs);
    setRecurringInvoices(recs);
    setNotifications(notifs);
    setTemplates(tpls);
    setProductBroadcasts(bcasts);
    setLuckyDraws(draws);
    setBroadcastContacts(bContacts);
    setSavedBroadcasts(savedCamps);
    setCODOrders(cods);
    setEmployees(emps);
    setAttendance(atts);
    setResellers(resells);

    const actRole = getActiveRole();
    const curUser = getCurrentUser();
    setActiveRole(actRole);
    setCurrentUser(curUser);
    setViewMode(actRole === 'customer' ? 'customer' : 'merchant');
  };

  const handleSaveBroadcastContact = (contact: BroadcastContact) => {
    const exists = broadcastContacts.some((c) => c.id === contact.id);
    const updated = exists
      ? broadcastContacts.map((c) => (c.id === contact.id ? contact : c))
      : [contact, ...broadcastContacts];
    setBroadcastContacts(updated);
    saveBroadcastContacts(updated);
  };

  const handleDeleteBroadcastContact = (id: string) => {
    const updated = broadcastContacts.filter((c) => c.id !== id);
    setBroadcastContacts(updated);
    saveBroadcastContacts(updated);
  };

  const handleSaveBroadcastCampaign = (campaign: SavedBroadcastCampaign) => {
    const updated = [campaign, ...savedBroadcasts];
    setSavedBroadcasts(updated);
    saveSavedBroadcasts(updated);
  };

  // CART HANDLERS
  const handleAddToCart = (product: ProductItem, qty: number = 1) => {
    const existing = cart.find((it) => it.product.id === product.id);
    const unitSavings = Math.max(0, product.marketPrice - product.ourPrice);

    if (existing) {
      const updatedQty = existing.quantity + qty;
      const updated = cart.map((it) =>
        it.product.id === product.id
          ? {
              ...it,
              quantity: updatedQty,
              totalAmount: it.unitPrice * updatedQty,
              totalSavings: unitSavings * updatedQty,
            }
          : it
      );
      setCart(updated);
    } else {
      const newItem: CartItem = {
        product,
        quantity: qty,
        unitPrice: product.ourPrice,
        marketPrice: product.marketPrice,
        unitSavings,
        totalAmount: product.ourPrice * qty,
        totalSavings: unitSavings * qty,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    const updated = cart.map((it) =>
      it.product.id === productId
        ? {
            ...it,
            quantity: qty,
            totalAmount: it.unitPrice * qty,
            totalSavings: it.unitSavings * qty,
          }
        : it
    );
    setCart(updated);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((it) => it.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // COMPLETE SALE (Full, Partial, Time-Based Credit, or COD)
  const handleCompleteSale = (saleData: {
    customerId: string;
    saleType: SalePaymentType;
    paidAmount: number;
    dueBalance: number;
    paymentMode: PaymentMode;
    paymentTermsDays: number;
    dueDate: string;
    notes: string;
    sendWhatsApp: boolean;
    resellerCode?: string;
  }) => {
    const customer = customers.find((c) => c.id === saleData.customerId);
    const invoiceNumber = `INV-100D-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalSavings = cart.reduce((acc, it) => acc + it.totalSavings, 0);
    const totalAmount = cart.reduce((acc, it) => acc + it.totalAmount, 0);

    const softDateObj = new Date(saleData.dueDate);
    softDateObj.setDate(softDateObj.getDate() - 3);
    const softReminderDate = softDateObj.toISOString().split('T')[0];

    const graceDateObj = new Date(saleData.dueDate);
    graceDateObj.setDate(graceDateObj.getDate() + 7);
    const maxGraceDate = graceDateObj.toISOString().split('T')[0];

    const txItems = cart.map((it) => ({
      productId: it.product.id,
      description: it.product.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      marketPrice: it.marketPrice,
      amount: it.totalAmount,
      customerSavings: it.totalSavings,
    }));

    const initialStatus =
      saleData.saleType === 'cod'
        ? 'pending'
        : saleData.dueBalance === 0
        ? 'completed'
        : (saleData.paidAmount > 0)
        ? 'partially_paid'
        : 'pending';

    const staffName = activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff';

    // 1. Create Transaction with Permanent Audit Trail
    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId: saleData.customerId,
      type: 'credit',
      amount: totalAmount,
      paidAmount: saleData.paidAmount,
      dueBalance: saleData.dueBalance,
      saleType: saleData.saleType,
      date: todayStr,
      dueDate: saleData.dueDate,
      paymentTermsDays: saleData.paymentTermsDays,
      softReminderDate,
      maxGraceDate,
      invoiceNumber,
      notes: saleData.notes,
      paymentMode: saleData.paymentMode,
      items: txItems,
      totalSavings,
      status: initialStatus,
      responsibleStaff: staffName,
      auditTrail: [
        {
          id: `audit_chk_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'created',
          newStatus: initialStatus,
          newAmount: totalAmount,
          changedBy: staffName,
          notes: `Order created via checkout (${saleData.saleType.toUpperCase()}) with ${txItems.length} items`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const updatedTxs = [newTx, ...transactions];
    syncTransactionsAndBalances(updatedTxs, customers);

    // 2. Decrement Product Stock and Increment Sales Count
    const updatedProducts = products.map((p) => {
      const cartItem = cart.find((c) => c.product.id === p.id);
      if (cartItem) {
        const newStock = Math.max(0, p.stockQty - cartItem.quantity);
        const newSales = p.salesCount + cartItem.quantity;
        const newRevenue = p.totalRevenue + cartItem.totalAmount;
        const unitProfit = p.ourPrice - p.costPrice;
        const newProfit = p.totalProfit + unitProfit * cartItem.quantity;
        return {
          ...p,
          stockQty: newStock,
          salesCount: newSales,
          totalRevenue: newRevenue,
          totalProfit: newProfit,
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    // 3. If COD sale: Create COD Order in Logistics Hub
    if (saleData.saleType === 'cod') {
      const codTotal = totalAmount + 250;
      const commissionAmount = saleData.resellerCode ? Math.floor(totalAmount / 1000) * 30 : 0;
      const newCODOrder: CODOrder = {
        id: `cod_${Date.now()}`,
        orderNumber: `COD-100D-${Math.floor(100 + Math.random() * 900)}`,
        customerId: customer?.id,
        customerName: customer?.name || 'Walk-in / Online Buyer',
        phone: customer?.phone || '03001234567',
        city: customer?.city || 'Lahore',
        address: customer?.address || customer?.area || 'Address on file',
        items: txItems,
        subtotal: totalAmount,
        deliveryFee: 250,
        totalAmount: codTotal,
        courierPartner: 'Trax',
        trackingNumber: `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'pending',
        resellerCode: saleData.resellerCode,
        commissionAmount,
        notes: saleData.notes,
        createdAt: new Date().toISOString(),
      };
      const updatedCOD = [newCODOrder, ...codOrders];
      setCODOrders(updatedCOD);
      saveCODOrders(updatedCOD);
    }

    // 4. Clear Cart & Close Modal
    setCart([]);
    setIsCheckoutOpen(false);

    // 5. Send Instant WhatsApp Invoice if selected
    if (saleData.sendWhatsApp && customer) {
      const msg = buildSaleInvoiceMessage(customer, newTx, profile);
      openWhatsAppDirect(customer.phone, msg);

      // Log notification
      const logNotif: WhatsAppNotification = {
        id: `notif_sale_${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        amount: saleData.dueBalance > 0 ? saleData.dueBalance : totalAmount,
        dueDate: saleData.dueDate,
        scheduledFor: todayStr,
        type: 'payment_receipt',
        status: 'sent',
        messageText: msg,
        sentAt: new Date().toISOString(),
        notes: `Instant sale receipt (${saleData.saleType}) with savings breakdown`,
        createdAt: new Date().toISOString(),
      };
      const updatedNotifs = [logNotif, ...notifications];
      setNotifications(updatedNotifs);
      saveWhatsAppNotifications(updatedNotifs);
    }

    alert(
      `کامیابی سے بل #${invoiceNumber} بنام ${customer?.name || 'کسٹمر'} درج کر لیا گیا!\nSale confirmed. Customer savings: ${profile.currencySymbol}${totalSavings.toLocaleString('en-PK')}. Stock updated.`
    );
  };

  // COD ORDERS LOGISTICS HANDLERS
  const handleUpdateCODStatus = (
    orderId: string,
    newStatus: CODOrderStatus,
    details?: { courierPartner?: any; trackingNumber?: string }
  ) => {
    let updatedProducts = [...products];
    let updatedTxs = [...transactions];
    let updatedResellers = [...resellers];

    const updatedOrders = codOrders.map((ord) => {
      if (ord.id === orderId) {
        const wasNotDelivered = ord.status !== 'delivered';
        const wasNotReturned = ord.status !== 'returned';

        const updated: CODOrder = {
          ...ord,
          status: newStatus,
          courierPartner: details?.courierPartner || ord.courierPartner,
          trackingNumber: details?.trackingNumber || ord.trackingNumber,
          dispatchedAt: newStatus === 'dispatched' ? new Date().toISOString() : ord.dispatchedAt,
          deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : ord.deliveredAt,
          returnedAt: newStatus === 'returned' ? new Date().toISOString() : ord.returnedAt,
        };

        // Auto-calculation on status = delivered:
        // Record payment in ledger and calculate net cash
        if (newStatus === 'delivered' && wasNotDelivered) {
          const netCash = ord.totalAmount - ord.deliveryFee;
          const debitTx: Transaction = {
            id: `tx_cod_deliv_${Date.now()}`,
            customerId: ord.customerId || customers[0]?.id || 'cust_1',
            type: 'debit',
            amount: ord.totalAmount,
            date: todayStr,
            paymentMode: 'cod',
            notes: `COD Settlement #${ord.orderNumber} (${ord.courierPartner}) - Net Cash Rs. ${netCash.toLocaleString('en-PK')}`,
            createdAt: new Date().toISOString(),
          };
          updatedTxs = [debitTx, ...updatedTxs];

          // Trigger reseller commission strictly on PAID amount (Rs. 30 per Rs. 1000)
          if (ord.resellerCode) {
            const earned = Math.floor(ord.subtotal / 1000) * 30;
            updatedResellers = updatedResellers.map((r) =>
              r.referralCode === ord.resellerCode
                ? {
                    ...r,
                    totalReferredOrders: r.totalReferredOrders + 1,
                    totalSales: r.totalSales + ord.subtotal,
                    totalPaidSales: r.totalPaidSales + ord.subtotal,
                    earnedCommission: r.earnedCommission + earned,
                  }
                : r
            );
          }
        }

        // Auto-calculation on status = returned:
        // Restore inventory stock automatically!
        if (newStatus === 'returned' && wasNotReturned) {
          updatedProducts = updatedProducts.map((p) => {
            const ordItem = ord.items.find((it) => it.productId === p.id);
            if (ordItem) {
              return {
                ...p,
                stockQty: p.stockQty + ordItem.quantity,
              };
            }
            return p;
          });
        }

        return updated;
      }
      return ord;
    });

    setCODOrders(updatedOrders);
    saveCODOrders(updatedOrders);

    if (updatedProducts !== products) {
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
    }

    if (updatedTxs !== transactions) {
      syncTransactionsAndBalances(updatedTxs, customers);
    }

    if (updatedResellers !== resellers) {
      setResellers(updatedResellers);
      saveResellers(updatedResellers);
    }
  };

  const handleAddNewCODOrder = (order: CODOrder) => {
    const updated = [order, ...codOrders];
    setCODOrders(updated);
    saveCODOrders(updated);

    // Decrement stock for the items
    const updatedProducts = products.map((p) => {
      const it = order.items.find((item) => item.productId === p.id);
      if (it) {
        return { ...p, stockQty: Math.max(0, p.stockQty - it.quantity) };
      }
      return p;
    });
    setProducts(updatedProducts);
    saveProducts(updatedProducts);
  };

  // HR MANAGEMENT HANDLERS
  const handleSaveEmployee = (emp: Employee) => {
    const exists = employees.some((e) => e.id === emp.id);
    const updated = exists ? employees.map((e) => (e.id === emp.id ? emp : e)) : [emp, ...employees];
    setEmployees(updated);
    saveEmployees(updated);
  };

  const handleSaveAttendance = (record: AttendanceRecord) => {
    const exists = attendance.some((a) => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
    const updated = exists
      ? attendance.map((a) =>
          a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date) ? record : a
        )
      : [record, ...attendance];
    setAttendance(updated);
    saveAttendance(updated);
  };

  const handleDeleteEmployee = (empId: string) => {
    if (confirm('Are you sure you want to remove this employee record?')) {
      const updated = employees.filter((e) => e.id !== empId);
      setEmployees(updated);
      saveEmployees(updated);
    }
  };

  const handleDeleteAttendance = (recId: string) => {
    if (confirm('Delete this attendance entry?')) {
      const updated = attendance.filter((a) => a.id !== recId);
      setAttendance(updated);
      saveAttendance(updated);
    }
  };

  // RESELLER ACCOUNTS HANDLERS
  const handleSaveReseller = (reseller: Reseller) => {
    const exists = resellers.some((r) => r.id === reseller.id);
    const updated = exists ? resellers.map((r) => (r.id === reseller.id ? reseller : r)) : [reseller, ...resellers];
    setResellers(updated);
    saveResellers(updated);
  };

  const handlePayoutCommission = (resellerId: string, amount: number) => {
    const updated = resellers.map((r) =>
      r.id === resellerId ? { ...r, paidCommission: r.paidCommission + amount } : r
    );
    setResellers(updated);
    saveResellers(updated);
    alert(`کامیابی سے رقم Rs. ${amount.toLocaleString('en-PK')} کمیشن واؤچر جاری کر دیا گیا!`);
  };

  // USER ROLE SELECTION & LOGIN HANDLER
  const handleSelectRole = (newRole: UserRole, userDetails?: Partial<AppUser>) => {
    setActiveRole(newRole);
    saveActiveRole(newRole);

    let updatedUser: AppUser;
    if (userDetails) {
      updatedUser = {
        ...currentUser,
        ...userDetails,
        role: newRole,
      };
    } else if (newRole === 'super_admin' || newRole === 'admin') {
      updatedUser = {
        id: 'user_admin_1',
        name: 'Al-Haj Muhammad Asif',
        urduName: 'الحاج محمد آصف (اسٹور مالک و ایڈمن)',
        role: newRole,
        phone: '03125256266',
        resellerCode: 'RES-100D-01',
      };
    } else if (newRole === 'investor') {
      updatedUser = {
        id: 'user_investor_1',
        name: 'Chaudhry Nadeem (Investor)',
        urduName: 'چوہدری ندیم (انویسٹر)',
        role: 'investor',
        phone: '03009876543',
        investorId: 'inv_1',
      };
    } else if (newRole === 'reseller') {
      updatedUser = {
        id: 'user_reseller_1',
        name: 'Usman Ghani',
        urduName: 'عثمان غنی (ری سیلر)',
        role: 'reseller',
        phone: '03125256266',
        resellerCode: 'RES-100D-01',
      };
    } else if (newRole === 'manager' || newRole === 'staff') {
      updatedUser = {
        id: `user_${newRole}_1`,
        name: newRole === 'manager' ? 'Branch Manager' : 'Sales Staff',
        urduName: newRole === 'manager' ? 'برانچ مینیجر' : 'اسٹور اسٹاف',
        role: newRole,
        phone: '03125256266',
      };
    } else {
      updatedUser = {
        id: 'user_cust_default',
        name: 'Online Customer',
        urduName: 'آن لائن کسٹمر',
        role: 'customer',
        phone: '03125256266',
        customerId: customers[0]?.id || 'cust_1',
      };
    }

    setCurrentUser(updatedUser);
    saveCurrentUser(updatedUser);

    if (newRole === 'customer') {
      setViewMode('customer');
      if (userDetails?.customerId && userDetails?.phone && userDetails.phone !== '03125256266') {
        const cleanPhone = userDetails.phone.replace(/\D/g, '');
        const exists = customers.some(
          (c) => c.id === userDetails.customerId || c.phone.replace(/\D/g, '') === cleanPhone
        );
        if (!exists) {
          const newCustRecord: Customer = {
            id: userDetails.customerId,
            name: userDetails.name || `Customer ${cleanPhone.slice(-4)}`,
            urduName: userDetails.urduName || 'آن لائن کسٹمر',
            phone: userDetails.phone,
            city: 'Lahore',
            customerType: 'individual',
            balance: 0,
            totalPurchases: 0,
            creditLimit: 5000,
            paymentTermsDays: 7,
            status: 'active',
            pin: getDefaultPinForPhone(userDetails.phone),
            createdAt: new Date().toISOString(),
          };
          const updatedCusts = [newCustRecord, ...customers];
          setCustomers(updatedCusts);
          saveCustomers(updatedCusts);
        }
      }
      setCurrentTab('store');
    } else if (newRole === 'investor') {
      setViewMode('merchant');
      setCurrentTab('investors');
    } else {
      setViewMode('merchant');
    }
  };

  const handleLogout = () => {
    setActiveRole('customer');
    saveActiveRole('customer');
    setCurrentUser(defaultCustomerUser);
    saveCurrentUser(defaultCustomerUser);
    setViewMode('customer');
    setCurrentTab('store');
  };

  // INVENTORY PRODUCT HANDLERS
  const handleSaveProduct = (product: ProductItem) => {
    const exists = products.some((p) => p.id === product.id);
    let updated: ProductItem[];
    if (exists) {
      updated = products.map((p) => (p.id === product.id ? product : p));
    } else {
      updated = [product, ...products];
    }
    setProducts(updated);
    saveProducts(updated);
  };

  const handleUpdateStock = (productId: string, newStock: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, stockQty: Math.max(0, newStock) } : p
    );
    setProducts(updated);
    saveProducts(updated);
  };

  const handleToggleWinningItem = (productId: string) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, isWinningItem: !p.isWinningItem } : p
    );
    setProducts(updated);
    saveProducts(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Delete this product from catalog?')) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      saveProducts(updated);
    }
  };

  // PAYMENT TERMS AUTOMATION ENGINE TRIGGER
  const handleRunPaymentTermsEngine = () => {
    const newNotifs = generatePaymentTermsAlertsBatch(transactions, customers, profile, templates);

    if (newNotifs.length === 0) {
      alert('تمام ادھار کھاتے اپ ٹو ڈیٹ ہیں۔ فی الوقت ۳ روزہ نرم یاددہانی یا تاریخ ادائیگی کا کوئی الرٹ واجب نہیں ہے۔\nAll payment terms are up to date. No new 3-day alerts due today.');
      return;
    }

    const updatedNotifs = [...newNotifs, ...notifications];
    setNotifications(updatedNotifs);
    saveWhatsAppNotifications(updatedNotifs);

    alert(
      `۳ روزہ ادائیگی الرٹ سسٹم: کل ${newNotifs.length} کسٹمرز کے لیے پیغامات کیو میں شامل کر دیے گئے ہیں!\nQueued ${newNotifs.length} payment terms alerts (3 days soft notices & overdue cycle).`
    );
  };

  const handleSendSingleTermsReminder = (tx: Transaction, customer: Customer) => {
    const unpaid = tx.dueBalance !== undefined ? tx.dueBalance : tx.amount;
    const paymentChannelsText = formatPaymentChannelsText(profile);
    const msg = `*ادائیگی یاددہانی / Payment Terms Notice*\n*${profile.name} · مدینہ مارکیٹ*\n\nمحترم ${customer.name}${customer.urduName ? ` (${customer.urduName})` : ''} صاحب،\nآپ کے بل #${tx.invoiceNumber || 'INV'} برائے رقم *${profile.currencySymbol}${unpaid.toLocaleString('en-PK')}* کی ادائیگی کی آخری تاریخ *${tx.dueDate}* ہے۔\n\n*Payment Accounts (EasyPaisa / JazzCash / SadaPay: 03125256266):*\n${paymentChannelsText}\n\nبرائے مہربانی بروقت ادائیگی فرما کر کھاتہ کلیئر کریں۔ جزاک اللہ!`;

    openWhatsAppDirect(customer.phone, msg);

    const logNotif: WhatsAppNotification = {
      id: `notif_terms_${Date.now()}`,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: unpaid,
      dueDate: tx.dueDate,
      scheduledFor: todayStr,
      type: 'payment_reminder',
      status: 'sent',
      messageText: msg,
      sentAt: new Date().toISOString(),
      notes: `Single terms alert for #${tx.invoiceNumber}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [logNotif, ...notifications];
    setNotifications(updated);
    saveWhatsAppNotifications(updated);
  };

  const handleSettleTermsPayment = (tx: Transaction, customer: Customer) => {
    const unpaid = tx.dueBalance !== undefined ? tx.dueBalance : tx.amount;
    const amountToSettle = prompt(
      `Enter payment amount received from ${customer.name} (Current Due: Rs. ${unpaid.toLocaleString('en-PK')}):`,
      String(unpaid)
    );
    if (!amountToSettle) return;

    const settledNum = parseFloat(amountToSettle) || 0;
    if (settledNum <= 0) return;

    // 1. Create debit recovery transaction with audit trail
    const debitTx: Transaction = {
      id: `tx_recov_${Date.now()}`,
      customerId: customer.id,
      type: 'debit',
      amount: settledNum,
      date: todayStr,
      notes: `Payment receipt against Invoice #${tx.invoiceNumber || 'INV'}`,
      paymentMode: 'easypaisa',
      status: 'completed',
      responsibleStaff: activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff',
      auditTrail: [
        {
          id: `audit_deb_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'created',
          newStatus: 'completed',
          newAmount: settledNum,
          changedBy: activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff',
          notes: `Payment receipt recorded against invoice #${tx.invoiceNumber || 'INV'}`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // 2. Update original credit transaction due balance and append audit entry without overwriting
    const updatedTxs: Transaction[] = transactions.map((t) => {
      if (t.id === tx.id) {
        const curDue = t.dueBalance !== undefined ? t.dueBalance : t.amount;
        const curPaid = t.paidAmount || 0;
        const newDue = Math.max(0, curDue - settledNum);
        const newStatus: 'completed' | 'partially_paid' = newDue === 0 ? 'completed' : 'partially_paid';
        const prevAudit = t.auditTrail || [];
        const auditLog: TransactionAuditEntry = {
          id: `audit_pay_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'payment_received',
          previousStatus: t.status || 'pending',
          newStatus,
          previousAmount: curDue,
          newAmount: newDue,
          changedBy: activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff',
          notes: `Payment of Rs. ${settledNum.toLocaleString('en-PK')} recorded. Balance now: Rs. ${newDue.toLocaleString('en-PK')}`,
        };
        return {
          ...t,
          dueBalance: newDue,
          paidAmount: curPaid + settledNum,
          status: newStatus,
          auditTrail: [auditLog, ...prevAudit],
        };
      }
      return t;
    });

    syncTransactionsAndBalances([debitTx, ...updatedTxs], customers);

    alert(`Received Rs. ${settledNum.toLocaleString('en-PK')} from ${customer.name}. Ledger updated!`);
  };

  // LUCKY DRAW HANDLERS
  const handleSaveLuckyDraw = (event: LuckyDrawEvent) => {
    const updated = [event, ...luckyDraws];
    setLuckyDraws(updated);
    saveLuckyDraws(updated);
  };

  const handleSendWinnerNotification = (winner: LuckyDrawWinner) => {
    const logNotif: WhatsAppNotification = {
      id: `notif_lucky_${winner.voucherCode}`,
      customerId: winner.customerId,
      customerName: winner.customerName,
      phone: winner.phone,
      amount: 0,
      scheduledFor: todayStr,
      type: 'lucky_draw_winner',
      status: 'sent',
      messageText: `Lucky draw voucher ${winner.voucherCode} dispatched for ${winner.prizeTitle}`,
      voucherCode: winner.voucherCode,
      sentAt: new Date().toISOString(),
      notes: `Lucky draw winner voucher notification`,
      createdAt: new Date().toISOString(),
    };
    const updated = [logNotif, ...notifications];
    setNotifications(updated);
    saveWhatsAppNotifications(updated);
  };

  // COMPLETE TRANSACTION AUDIT UPDATER (USER DIRECTIVE: maintain permanent audit trail of status changes & edits)
  const handleUpdateTransactionStatus = (
    txId: string,
    newStatus: 'completed' | 'pending' | 'partially_paid' | 'overdue' | 'cancelled',
    notes?: string,
    staff?: string
  ) => {
    const updated: Transaction[] = transactions.map((t) => {
      if (t.id === txId) {
        const auditLog: TransactionAuditEntry = {
          id: `audit_stat_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'status_updated' as const,
          previousStatus: t.status || 'pending',
          newStatus,
          changedBy: staff || (activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff'),
          notes: notes || 'Status updated from date-wise ledger',
        };
        const prevAudit = t.auditTrail || [];
        return {
          ...t,
          status: newStatus,
          responsibleStaff: staff || t.responsibleStaff || 'Super Admin',
          auditTrail: [auditLog, ...prevAudit],
        };
      }
      return t;
    });
    setTransactions(updated);
    saveTransactions(updated);
  };

  // STANDARD TRANSACTION HANDLER
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    sendWhatsApp: boolean
  ) => {
    const initialStatus: 'completed' | 'pending' | 'partially_paid' | 'overdue' | 'cancelled' =
      txData.status ||
      (txData.paidAmount && txData.paidAmount >= txData.amount
        ? 'completed'
        : txData.paidAmount && txData.paidAmount > 0
        ? 'partially_paid'
        : 'pending');
    const staffName = activeRole === 'admin' ? 'Super Admin' : currentUser.name || 'Store Staff';

    const newTx: Transaction = {
      ...txData,
      status: initialStatus,
      responsibleStaff: txData.responsibleStaff || staffName,
      auditTrail: [
        {
          id: `audit_create_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'created',
          newStatus: initialStatus,
          newAmount: txData.amount,
          changedBy: staffName,
          notes: txData.notes || 'Transaction created and posted to ledger',
        },
      ],
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTxs = [newTx, ...transactions];
    syncTransactionsAndBalances(updatedTxs, customers);

    const customer = customers.find((c) => c.id === txData.customerId);

    if (sendWhatsApp && customer) {
      const isCredit = txData.type === 'credit';
      const updatedBalance = isCredit ? customer.balance + txData.amount : customer.balance - txData.amount;
      const paymentChannelsText = formatPaymentChannelsText(profile.paymentChannels);

      let msg = '';
      if (isCredit) {
        msg = `*فاتورہ / بل نوٹس - ${profile.name} · مدینہ مارکیٹ*\n*Invoice Notice*\n\nمحترم ${customer.name}${customer.urduName ? ` (${customer.urduName})` : ''} صاحب،\nآپ کے کھاتے میں نیا کریڈٹ بل بنام *#${txData.invoiceNumber || 'INV'}* رقم *${profile.currencySymbol}${txData.amount.toLocaleString('en-PK')}* درج کر دیا گیا ہے۔\n\nکل بقایا واجب الادا رقم: *${profile.currencySymbol}${updatedBalance.toLocaleString('en-PK')}*\nآخری تاریخ ادائیگی: ${txData.dueDate || 'معمول کے مطابق'}\n\n${paymentChannelsText}\n\nشکریہ،\n*${profile.name}*`;
      } else {
        msg = `*رسید وصولی رقم - ${profile.name} · مدینہ مارکیٹ*\n*Payment Receipt*\n\nمحترم ${customer.name}${customer.urduName ? ` (${customer.urduName})` : ''} صاحب،\nآپ کی جانب سے مبلغ *${profile.currencySymbol}${txData.amount.toLocaleString('en-PK')}* کی وصولی بذریعہ ${txData.paymentMode?.toUpperCase() || 'ONLINE'} موصول ہوگئی ہے۔ کھاتہ اپ ڈیٹ کر دیا گیا ہے۔\n\nبقایا واجب الادا رقم: *${profile.currencySymbol}${Math.max(0, updatedBalance).toLocaleString('en-PK')}*\n\nشکریہ،\n*${profile.name}*`;
      }

      openWhatsAppDirect(customer.phone, msg);

      const logNotif: WhatsAppNotification = {
        id: `notif_tx_${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        amount: txData.amount,
        dueDate: txData.dueDate,
        scheduledFor: todayStr,
        type: isCredit ? 'payment_reminder' : 'payment_receipt',
        status: 'sent',
        messageText: msg,
        sentAt: new Date().toISOString(),
        notes: `Instant ${isCredit ? 'credit invoice' : 'debit receipt'} notification`,
        createdAt: new Date().toISOString(),
      };
      const updatedNotifs = [logNotif, ...notifications];
      setNotifications(updatedNotifs);
      saveWhatsAppNotifications(updatedNotifs);
    }
  };

  // ADD CUSTOMER HANDLER
  const handleSaveCustomer = (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'balance' | 'status'>,
    openingBalance: number
  ) => {
    const newCustId = `cust_${Date.now()}`;
    const newCust: Customer = {
      ...customerData,
      id: newCustId,
      createdAt: todayStr,
      balance: openingBalance,
      status: 'active',
      totalPurchases: openingBalance > 0 ? openingBalance : 0,
      ordersCount: openingBalance > 0 ? 1 : 0,
    };

    let updatedTxs = [...transactions];
    if (openingBalance !== 0) {
      const opTx: Transaction = {
        id: `tx_op_${Date.now()}`,
        customerId: newCustId,
        type: openingBalance > 0 ? 'credit' : 'debit',
        amount: Math.abs(openingBalance),
        date: todayStr,
        notes: 'Initial Opening Balance Due (ابتدائی بقایا رقم)',
        createdAt: new Date().toISOString(),
      };
      updatedTxs = [opTx, ...updatedTxs];
    }

    const updatedCusts = [newCust, ...customers];
    syncTransactionsAndBalances(updatedTxs, updatedCusts);
    setSelectedCustomerId(newCustId);
    setCurrentTab('customers');
  };

  // SCHEDULE WHATSAPP HANDLER
  const handleScheduleWhatsApp = (
    notifData: Omit<WhatsAppNotification, 'id' | 'createdAt' | 'status'>,
    sendImmediately: boolean
  ) => {
    const newNotif: WhatsAppNotification = {
      ...notifData,
      id: `notif_${Date.now()}`,
      status: sendImmediately ? 'sent' : 'pending',
      sentAt: sendImmediately ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveWhatsAppNotifications(updated);

    if (sendImmediately) {
      const updatedCusts = customers.map((c) =>
        c.id === notifData.customerId ? { ...c, lastReminderSentAt: todayStr } : c
      );
      setCustomers(updatedCusts);
      saveCustomers(updatedCusts);
    }
  };

  // RECURRING INVOICES ACTIONS
  const handleRunRecurringCheck = () => {
    const result = runRecurringInvoicesCheck(recurringInvoices, customers, profile, templates);

    if (result.generatedInvoicesCount === 0) {
      alert('تمام مقررہ بلنگ شیڈول اپ ٹو ڈیٹ ہیں۔ فی الوقت کوئی بل واجب نہیں ہے۔\nAll recurring billing profiles are up to date.');
      return;
    }

    const updatedTxs = [...result.newTransactions, ...transactions];
    syncTransactionsAndBalances(updatedTxs, customers);

    setRecurringInvoices(result.updatedRecurringInvoices);
    saveRecurringInvoices(result.updatedRecurringInvoices);

    if (result.newNotifications.length > 0) {
      const updatedNotifs = [...result.newNotifications, ...notifications];
      setNotifications(updatedNotifs);
      saveWhatsAppNotifications(updatedNotifs);
    }

    alert(
      `کامیابی کے ساتھ ${result.generatedInvoicesCount} نئے مقررہ بل تیار کر دیے گئے!\nSuccessfully generated ${result.generatedInvoicesCount} recurring credit invoices.`
    );
  };

  const handleToggleRecurringStatus = (id: string) => {
    const updated = recurringInvoices.map((r) =>
      r.id === id ? { ...r, status: r.status === 'active' ? ('paused' as const) : ('active' as const) } : r
    );
    setRecurringInvoices(updated);
    saveRecurringInvoices(updated);
  };

  const handleDeleteRecurring = (id: string) => {
    if (confirm('اس مقررہ بلنگ شیڈول کو خارج کریں؟ Delete schedule?')) {
      const updated = recurringInvoices.filter((r) => r.id !== id);
      setRecurringInvoices(updated);
      saveRecurringInvoices(updated);
    }
  };

  // OPEN MODALS
  const openAddTransaction = (type?: unknown, customerId?: unknown) => {
    const validType = (type === 'debit') ? 'debit' : 'credit';
    setAddTxType(validType);
    setAddTxCustomerId(typeof customerId === 'string' ? customerId : selectedCustomerId);
    setIsAddTxOpen(true);
  };

  const openScheduleWhatsApp = (customerId?: unknown, date?: unknown) => {
    setScheduleCustomerId(typeof customerId === 'string' ? customerId : selectedCustomerId);
    setScheduleDate(typeof date === 'string' ? date : undefined);
    setIsScheduleWhatsAppOpen(true);
  };

  const openInvoiceModal = (tx: Transaction, customer: Customer) => {
    setInvoiceModalTx(tx);
    setInvoiceModalCustomer(customer);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar with Yellow Bar (Matching Screenshot Exact Theme) */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenAddTransaction={() => openAddTransaction('credit')}
        onOpenCart={() => setIsCheckoutOpen(true)}
        cartCount={cartCount}
        cartTotal={cartTotal}
        pendingAlertsCount={pendingAlertsCount}
        codPendingCount={codOrders.filter((o) => o.status === 'pending' || o.status === 'dispatched').length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat) => setSelectedCategory(cat)}
        categories={allCategories}
        profile={profile}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        userRole={activeRole}
        currentUser={currentUser}
        onOpenRoleModal={openRoleModal}
      />

      {/* Security Reminder Banner: Prompt Customer to Change Default Password (USER DIRECTIVE) */}
      {(currentUser.mustChangePassword || currentUser.hasDefaultPin) && activeRole === 'customer' && (
        <div className="bg-amber-500 text-slate-950 px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-xs border-b border-amber-600 no-print">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                سیکیورٹی یاددہانی: آپ کا پاس ورڈ ڈیفالٹ ہے۔ اپنے کھاتے اور آرڈرز کو محفوظ رکھنے کے لیے نیا پاس ورڈ تبدیل کریں۔
                <span className="hidden sm:inline font-normal text-slate-900 ml-1">
                  (Please change your default PIN to secure your account)
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={openRoleModal}
              className="px-2.5 py-1 bg-slate-950 text-white hover:bg-slate-900 rounded-md text-[11px] font-extrabold whitespace-nowrap cursor-pointer shrink-0 transition-colors"
            >
              پاس ورڈ تبدیل کریں (Change PIN)
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body (USER DIRECTIVE: fix to all device friendly fix the paddings especially for mobile too) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6">
        {/* 1. STORE & POS CATALOG VIEW (Default View Matching Screenshot) */}
        {currentTab === 'store' && (
          <StoreCatalogView
            products={products}
            customers={customers}
            profile={profile}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onOpenImportModal={() => {
              setIsWebsiteImportModalOpen(true);
              setCurrentTab('inventory');
            }}
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            isCustomerView={viewMode === 'customer' || activeRole === 'customer'}
            hideCostPrice={viewMode === 'customer' || activeRole === 'customer'}
            userRole={activeRole}
          />
        )}

        {/* CUSTOMER SELF-SERVICE PORTAL */}
        {currentTab === 'customer_portal' && (
          <CustomerPortalView
            currentUser={currentUser}
            customer={customers.find(
              (c) =>
                c.id === currentUser.customerId ||
                (currentUser.phone && c.phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''))
            )}
            transactions={transactions}
            profile={profile}
            onLogout={handleLogout}
            onOpenCart={() => setIsCheckoutOpen(true)}
            onNavigateTab={handleTabChange}
          />
        )}

        {/* INVESTOR MANAGEMENT & PORTFOLIO */}
        {currentTab === 'investors' && (
          <InvestorManagementView
            currentUser={currentUser}
            userRole={activeRole}
            products={products}
            profile={profile}
          />
        )}

        {/* USER CREDENTIALS & SECURITY MANAGEMENT */}
        {currentTab === 'users' && (
          <UserManagementView
            currentUserRole={activeRole}
            onRefreshSession={handleRefreshAllData}
          />
        )}

        {/* COD ORDERS & LOGISTICS HUB (USER DIRECTIVE: separate area for cod order and delivered process etc return etc with auto calculation once status is changed) */}
        {currentTab === 'cod_orders' && (
          <CODOrdersView
            orders={codOrders}
            products={products}
            customers={customers}
            profile={profile}
            onUpdateOrderStatus={handleUpdateCODStatus}
            onAddNewCODOrder={handleAddNewCODOrder}
          />
        )}

        {/* HR MANAGEMENT, ALLOWANCES & ATTENDANCE (USER DIRECTIVE: Add HR hiring, package with allowances attendance auto calculation salaries role base hiring) */}
        {currentTab === 'hr_payroll' && (
          <HRManagementView
            employees={employees}
            attendance={attendance}
            profile={profile}
            onSaveEmployee={handleSaveEmployee}
            onSaveAttendance={handleSaveAttendance}
            onDeleteEmployee={handleDeleteEmployee}
            onDeleteAttendance={handleDeleteAttendance}
          />
        )}

        {/* RESELLERS AFFILIATE COMMISSION PORTAL (USER DIRECTIVE: do not public resallers information only for resaller of admin) */}
        {currentTab === 'resellers' && (
          activeRole === 'customer' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 text-center max-w-md mx-auto space-y-3 shadow-xs my-8">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reseller Portal Restricted / ری سیلر پورٹل
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reseller accounts and commission ledgers are private and accessible only by registered reseller partners and store administration.
              </p>
              <button
                onClick={() => setCurrentTab('store')}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                Back to Market Catalog (مارکیٹ پر جائیں)
              </button>
            </div>
          ) : (
            <ResellersView
              resellers={resellers}
              profile={profile}
              onSaveReseller={handleSaveReseller}
              onPayoutCommission={handlePayoutCommission}
              isResellerRole={activeRole === 'reseller'}
              activeResellerCode={currentUser.resellerCode}
            />
          )
        )}

        {/* MONTHLY STATEMENTS & WINNING AMOUNTS VIEW (USER DIRECTIVE: customer scoped) */}
        {currentTab === 'monthly_statement' && (
          <MonthlyStatementView
            customers={customers}
            transactions={transactions}
            luckyDraws={luckyDraws}
            profile={profile}
            userRole={activeRole}
            currentUser={currentUser}
          />
        )}

        {/* 2. INVENTORY & WINNING ITEMS VIEW */}
        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            profile={profile}
            onSaveProduct={handleSaveProduct}
            onUpdateStock={handleUpdateStock}
            onToggleWinningItem={handleToggleWinningItem}
            onDeleteProduct={handleDeleteProduct}
            isExternalImportOpen={isWebsiteImportModalOpen}
            onCloseExternalImport={() => setIsWebsiteImportModalOpen(false)}
          />
        )}

        {/* 3. PAYMENT TERMS & 3-DAY REMINDERS VIEW */}
        {currentTab === 'payment_terms' && (
          <PaymentTermsView
            transactions={transactions}
            customers={customers}
            profile={profile}
            templates={templates}
            onRunTermsEngine={handleRunPaymentTermsEngine}
            onSendSingleReminder={handleSendSingleTermsReminder}
            onSettlePayment={handleSettleTermsPayment}
          />
        )}

        {/* 4. TOP 3 BUYERS & LUCKY DRAW VIEW */}
        {currentTab === 'lucky_draw' && (
          <LuckyDrawView
            topBuyers={topBuyers}
            luckyDraws={luckyDraws}
            profile={profile}
            templates={templates}
            onSaveLuckyDraw={handleSaveLuckyDraw}
            onSendWinnerNotification={handleSendWinnerNotification}
            isCustomerView={viewMode === 'customer' || activeRole === 'customer'}
          />
        )}

        {/* 5. DASHBOARD & LEDGER OVERVIEW */}
        {currentTab === 'dashboard' && (
          <DashboardView
            customers={customers}
            transactions={transactions}
            recurringInvoices={recurringInvoices}
            notifications={notifications}
            profile={profile}
            onOpenAddTransaction={openAddTransaction}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onOpenScheduleWhatsApp={openScheduleWhatsApp}
            onOpenInvoiceModal={openInvoiceModal}
            onSelectCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setCurrentTab('customers');
            }}
            onRunRecurringCheck={handleRunRecurringCheck}
            onRunMonthlyReminderBatch={() => {
              const newNotifs = generateMonthlyRemindersBatch(customers, profile, templates);
              if (newNotifs.length > 0) {
                const updated = [...newNotifs, ...notifications];
                setNotifications(updated);
                saveWhatsAppNotifications(updated);
                setCurrentTab('whatsapp');
                alert(`Queued monthly statements for ${newNotifs.length} customers.`);
              } else {
                alert('All customer accounts are clear!');
              }
            }}
            onRunWeeklyDueReminders={() => {
              const newNotifs = generateWeeklyDueRemindersBatch(customers, profile, templates);
              if (newNotifs.length > 0) {
                const updated = [...newNotifs, ...notifications];
                setNotifications(updated);
                saveWhatsAppNotifications(updated);
                setCurrentTab('whatsapp');
                alert(`Queued weekly due reminders for ${newNotifs.length} customers.`);
              } else {
                alert('All accounts are clear!');
              }
            }}
            onOpenProductBroadcast={() => setIsProductBroadcastOpen(true)}
            onMarkNotificationSent={(id) => {
              const updated = notifications.map((n) =>
                n.id === id ? { ...n, status: 'sent' as const, sentAt: new Date().toISOString() } : n
              );
              setNotifications(updated);
              saveWhatsAppNotifications(updated);
            }}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* 6. CUSTOMERS & KHATTA LEDGER */}
        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            transactions={transactions}
            profile={profile}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={(cId) => setSelectedCustomerId(cId)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onOpenAddTransaction={openAddTransaction}
            onOpenScheduleWhatsApp={openScheduleWhatsApp}
            onOpenInvoiceModal={openInvoiceModal}
            onDeleteTransaction={(txId) => {
              if (confirm('Delete transaction?')) {
                const updated = transactions.filter((t) => t.id !== txId);
                syncTransactionsAndBalances(updated, customers);
              }
            }}
          />
        )}

        {/* 7. RECURRING BILLING CONTRACTS */}
        {currentTab === 'recurring' && (
          <RecurringInvoicesView
            recurringInvoices={recurringInvoices}
            customers={customers}
            transactions={transactions}
            profile={profile}
            onOpenAddRecurring={() => setIsAddRecurringOpen(true)}
            onRunRecurringCheck={handleRunRecurringCheck}
            onToggleStatus={handleToggleRecurringStatus}
            onDeleteRecurring={handleDeleteRecurring}
            onTriggerSingleRecurring={(rec) => {
              alert(`Contract ${rec.title} triggered.`);
            }}
            onOpenInvoiceModal={openInvoiceModal}
          />
        )}

        {/* 8. WHATSAPP NOTIFICATIONS QUEUE */}
        {currentTab === 'whatsapp' && (
          <WhatsAppAutomationView
            notifications={notifications}
            customers={customers}
            templates={templates}
            profile={profile}
            productBroadcasts={productBroadcasts}
            manualContacts={broadcastContacts}
            savedBroadcasts={savedBroadcasts}
            onOpenScheduleWhatsApp={openScheduleWhatsApp}
            onOpenProductBroadcast={() => setIsProductBroadcastOpen(true)}
            onSaveManualContact={handleSaveBroadcastContact}
            onDeleteManualContact={handleDeleteBroadcastContact}
            onResendSavedBroadcast={(camp) => {
              const product: ProductBroadcast = {
                id: `prod_resend_${Date.now()}`,
                productName: camp.productName,
                productLink: camp.productLink || 'https://100dagar.pk',
                description: camp.messageText,
                createdAt: new Date().toISOString().split('T')[0],
              };
              const newNotifs = generateSegmentedBroadcastBatch(
                product,
                customers,
                broadcastContacts,
                camp.filters,
                profile,
                templates
              );
              if (newNotifs.length > 0) {
                const updated = [...newNotifs, ...notifications];
                setNotifications(updated);
                saveWhatsAppNotifications(updated);
                alert(`Re-queued broadcast to ${newNotifs.length} matching recipients!`);
              }
            }}
            onRunWeeklyDueReminders={() => {
              const newNotifs = generateWeeklyDueRemindersBatch(customers, profile, templates);
              if (newNotifs.length > 0) {
                const updated = [...newNotifs, ...notifications];
                setNotifications(updated);
                saveWhatsAppNotifications(updated);
              }
            }}
            onMarkNotificationSent={(id) => {
              const updated = notifications.map((n) =>
                n.id === id ? { ...n, status: 'sent' as const, sentAt: new Date().toISOString() } : n
              );
              setNotifications(updated);
              saveWhatsAppNotifications(updated);
            }}
            onDeleteNotification={(id) => {
              const updated = notifications.filter((n) => n.id !== id);
              setNotifications(updated);
              saveWhatsAppNotifications(updated);
            }}
            onUpdateTemplates={(updated) => {
              setTemplates(updated);
              saveReminderTemplates(updated);
            }}
            onRunMonthlyReminderBatch={() => {
              const newNotifs = generateMonthlyRemindersBatch(customers, profile, templates);
              if (newNotifs.length > 0) {
                const updated = [...newNotifs, ...notifications];
                setNotifications(updated);
                saveWhatsAppNotifications(updated);
              }
            }}
          />
        )}

        {/* 9. REPORTS & SAVINGS PORTAL (CUSTOMER & ADMIN SCOPED) */}
        {currentTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            customers={customers}
            profile={profile}
            codOrders={codOrders}
            products={products}
            onOpenInvoiceModal={openInvoiceModal}
            userRole={activeRole}
            currentUser={currentUser}
          />
        )}

        {/* 10. COMPLETE DATE-WISE TRANSACTION HISTORY & AUDIT LEDGER */}
        {currentTab === 'history' && (
          <TransactionHistoryView
            transactions={transactions}
            customers={customers}
            profile={profile}
            userRole={activeRole}
            currentUser={currentUser}
            onOpenInvoiceModal={openInvoiceModal}
            onUpdateTransactionStatus={handleUpdateTransactionStatus}
          />
        )}

        {/* 10. SETTINGS VIEW */}
        {currentTab === 'settings' && (
          <SettingsView
            profile={profile}
            onSaveProfile={(updated) => {
              setProfile(updated);
              saveBusinessProfile(updated);
            }}
            onRefreshAllData={handleRefreshAllData}
            customers={customers}
            resellers={resellers}
            onUpdateCustomer={(updatedCust) => {
              const updated = customers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
              setCustomers(updated);
              saveCustomers(updated);
            }}
            onUpdateReseller={(updatedReseller) => {
              const updated = resellers.map((r) => (r.id === updatedReseller.id ? updatedReseller : r));
              setResellers(updated);
              saveResellers(updated);
            }}
          />
        )}
      </main>

      {/* Pakistani Business Footer (USER DIRECTIVE: hide payment phone numbers from footer, use single number only in checkout) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">100DAGAR</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md">
              EasyPaisa Verified
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 rounded-md">
              JazzCash Verified
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md">
              SadaPay Verified
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
              Cash on Delivery (COD) Available
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>۳ روزہ نرم یاددہانی، تاریخ ادائیگی اور لکی ڈرا سسٹم فعال</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => {
                setIsRoleModalOpen(true);
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
            >
              Staff / Admin Portal
            </button>
          </div>
        </div>
      </footer>

      {/* POS CHECKOUT MODAL (WITH LOCKED PARTIAL/TIME CREDIT FOR ONLINE BUYERS) */}
      {cart.length > 0 && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          customers={customers}
          profile={profile}
          isCustomerView={viewMode === 'customer' || activeRole === 'customer'}
          isAdmin={activeRole === 'admin'}
          currentUser={currentUser}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {/* LOGIN & USER ROLE SWITCHER MODAL */}
      <LoginRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentUser={currentUser}
        customers={customers}
        resellers={resellers}
        onSelectRole={handleSelectRole}
        onLogout={handleLogout}
      />

      {/* STANDARD MODALS */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSave={handleSaveTransaction}
        customers={customers}
        profile={profile}
        initialType={addTxType}
        initialCustomerId={addTxCustomerId}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSave={handleSaveCustomer}
        profile={profile}
      />

      <ScheduleWhatsAppModal
        isOpen={isScheduleWhatsAppOpen}
        onClose={() => setIsScheduleWhatsAppOpen(false)}
        onSchedule={handleScheduleWhatsApp}
        customers={customers}
        templates={templates}
        profile={profile}
        initialCustomerId={scheduleCustomerId}
        initialDate={scheduleDate}
      />

      <AddRecurringInvoiceModal
        isOpen={isAddRecurringOpen}
        onClose={() => setIsAddRecurringOpen(false)}
        onSave={(recData) => {
          const newRec: RecurringInvoice = {
            ...recData,
            id: `rec_${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          const updated = [newRec, ...recurringInvoices];
          setRecurringInvoices(updated);
          saveRecurringInvoices(updated);
        }}
        customers={customers}
        profile={profile}
        initialCustomerId={selectedCustomerId}
      />

      <ProductBroadcastModal
        isOpen={isProductBroadcastOpen}
        onClose={() => setIsProductBroadcastOpen(false)}
        customers={customers}
        manualContacts={broadcastContacts}
        profile={profile}
        templates={templates}
        onBroadcast={(product, filters, sendFirst, saveCampaign) => {
          const newNotifs = generateSegmentedBroadcastBatch(
            product,
            customers,
            broadcastContacts,
            filters,
            profile,
            templates
          );

          if (newNotifs.length > 0) {
            if (sendFirst && newNotifs[0]) {
              openWhatsAppDirect(newNotifs[0].phone, newNotifs[0].messageText);
            }
            const updated = [...newNotifs, ...notifications];
            setNotifications(updated);
            saveWhatsAppNotifications(updated);

            if (saveCampaign) {
              const campaign: SavedBroadcastCampaign = {
                id: `camp_${Date.now()}`,
                title: `Broadcast: ${product.productName}`,
                productName: product.productName,
                productLink: product.productLink,
                messageText: newNotifs[0].messageText,
                filters: {
                  area: filters.area,
                  ageGroup: filters.ageGroup,
                  gender: filters.gender,
                  customerGroup: filters.group,
                },
                recipientsCount: newNotifs.length,
                sentAt: new Date().toLocaleString(),
                createdAt: new Date().toISOString(),
              };
              handleSaveBroadcastCampaign(campaign);
            }

            alert(`Queued broadcast to ${newNotifs.length} matching recipients (Customers & Leads)!`);
          } else {
            alert('No matching customers or manual contacts found with these segmentation filters.');
          }
          setIsProductBroadcastOpen(false);
        }}
      />

      {invoiceModalTx && invoiceModalCustomer && (
        <InvoiceModal
          isOpen={!!invoiceModalTx}
          onClose={() => {
            setInvoiceModalTx(null);
            setInvoiceModalCustomer(null);
          }}
          transaction={invoiceModalTx}
          customer={invoiceModalCustomer}
          profile={profile}
        />
      )}

      {/* CATEGORY CLEANUP & PARENT/SUB-CATEGORY MANAGEMENT MODAL */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        products={products}
        onCategoriesUpdated={() => {
          setProducts(getProducts());
        }}
      />
    </div>
  );
}
