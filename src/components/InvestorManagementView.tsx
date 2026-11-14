import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Percent,
  X,
  CreditCard,
  Edit3,
  Users,
  Handshake,
  Save,
} from 'lucide-react';
import {
  AppUser,
  BusinessProfile,
  Investor,
  InvestorProductAllocation,
  InvestorTransaction,
  PaymentMode,
  ProductItem,
  Reseller,
  UserRole,
} from '../types';
import {
  getDefaultPinForPhone,
  getInvestors,
  getInvestorTransactions,
  getResellers,
  saveInvestors,
  saveInvestorTransactions,
  saveResellers,
} from '../utils/storage';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface InvestorManagementViewProps {
  currentUser: AppUser;
  userRole: UserRole;
  products: ProductItem[];
  profile: BusinessProfile;
}

export const InvestorManagementView: React.FC<InvestorManagementViewProps> = ({
  currentUser,
  userRole,
  products,
  profile,
}) => {
  const [investors, setInvestors] = useState<Investor[]>(getInvestors);
  const [transactions, setTransactions] = useState<InvestorTransaction[]>(getInvestorTransactions);
  const [resellers, setResellers] = useState<Reseller[]>(getResellers);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const currentInvestor = investors.find(
    (inv) =>
      inv.id === currentUser.investorId ||
      inv.phone.replace(/[\s-]/g, '') === currentUser.phone?.replace(/[\s-]/g, '')
  );

  // Active view for investor vs admin
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>(
    isAdmin ? (investors[0]?.id || '') : (currentInvestor?.id || '')
  );

  // Modals state
  const [isAddInvestorModalOpen, setIsAddInvestorModalOpen] = useState(false);
  const [isEditInvestorModalOpen, setIsEditInvestorModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New investor form
  const [newInvName, setNewInvName] = useState('');
  const [newInvUrduName, setNewInvUrduName] = useState('');
  const [newInvPhone, setNewInvPhone] = useState('');
  const [newInvWhatsapp, setNewInvWhatsapp] = useState('');
  const [newInvEmail, setNewInvEmail] = useState('');
  const [newInvAddress, setNewInvAddress] = useState('');
  const [newInvCapital, setNewInvCapital] = useState<number>(100000);
  const [newInvShareType, setNewInvShareType] = useState<'percentage' | 'fixed_per_unit'>('percentage');
  const [newInvShareValue, setNewInvShareValue] = useState<number>(25);
  const [newInvNotes, setNewInvNotes] = useState('');
  const [newInvIsReseller, setNewInvIsReseller] = useState<boolean>(false);
  const [newInvResellerCode, setNewInvResellerCode] = useState('');
  const [newInvResellerChannel, setNewInvResellerChannel] = useState<'easypaisa' | 'jazzcash' | 'sadapay' | 'bank' | 'cash'>('easypaisa');

  // Edit investor form (ALL fields editable)
  const [editName, setEditName] = useState('');
  const [editUrduName, setEditUrduName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCapital, setEditCapital] = useState<number>(0);
  const [editSettledProfit, setEditSettledProfit] = useState<number>(0);
  const [editShareType, setEditShareType] = useState<'percentage' | 'fixed_per_unit'>('percentage');
  const [editShareValue, setEditShareValue] = useState<number>(25);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editNotes, setEditNotes] = useState('');
  const [editIsReseller, setEditIsReseller] = useState<boolean>(false);
  const [editResellerCode, setEditResellerCode] = useState('');
  const [editResellerChannel, setEditResellerChannel] = useState<'easypaisa' | 'jazzcash' | 'sadapay' | 'bank' | 'cash'>('easypaisa');
  const [editResellerAccountTitle, setEditResellerAccountTitle] = useState('');
  const [editResellerAccountNumber, setEditResellerAccountNumber] = useState('');

  // Draft allocations inside Product Ownership modal
  const [draftAllocations, setDraftAllocations] = useState<Record<string, InvestorProductAllocation>>({});

  // Record transaction form
  const [txType, setTxType] = useState<'investment_deposit' | 'profit_payout' | 'capital_withdrawal'>('profit_payout');
  const [txAmount, setTxAmount] = useState<number>(10000);
  const [txPaymentMode, setTxPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [txNotes, setTxNotes] = useState('');
  const [txRef, setTxRef] = useState('');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Determine which investor we are examining
  const activeInvestor = isAdmin
    ? investors.find((inv) => inv.id === selectedInvestorId) || investors[0]
    : currentInvestor;

  // Helper: Get normalized product allocations for any investor
  const getInvestorAllocations = (inv: Investor | undefined): InvestorProductAllocation[] => {
    if (!inv) return [];
    const existing = inv.productAllocations || [];
    const map = new Map<string, InvestorProductAllocation>();
    existing.forEach((a) => {
      if (a.productId) {
        map.set(a.productId, a);
      }
    });
    (inv.assignedProductIds || []).forEach((pid) => {
      if (!map.has(pid)) {
        const prod = products.find((p) => p.id === pid);
        map.set(pid, {
          productId: pid,
          unitsOwned: prod?.stockQty || 1,
          investedAmount: prod ? prod.costPrice * (prod.stockQty || 1) : 0,
        });
      }
    });
    return Array.from(map.values());
  };

  // Helper: Get all co-owners of a given product across all investors
  const getProductCoOwners = (productId: string) => {
    return investors
      .map((inv) => {
        const alloc = getInvestorAllocations(inv).find((a) => a.productId === productId);
        if (!alloc) return null;
        return {
          investor: inv,
          unitsOwned: alloc.unitsOwned,
        };
      })
      .filter((item): item is { investor: Investor; unitsOwned: number } => item !== null);
  };

  const activeAllocations = getInvestorAllocations(activeInvestor);
  const assignedProducts = products.filter((p) =>
    activeAllocations.some((a) => a.productId === p.id)
  );

  // Linked reseller stats if investor is also a reseller
  const linkedResellerRecord = activeInvestor?.isReseller
    ? resellers.find(
        (r) =>
          (activeInvestor.resellerId && r.id === activeInvestor.resellerId) ||
          (activeInvestor.linkedResellerCode &&
            r.referralCode.toLowerCase() === activeInvestor.linkedResellerCode.toLowerCase())
      )
    : undefined;

  // Compute proportional ownership metrics for active investor
  let inventoryStockValue = 0;
  let totalInvestorOwnedUnits = 0;
  let totalSalesGenerated = 0;
  let totalUnitsSoldAttributed = 0;
  let totalGrossProfitAttributed = 0;

  assignedProducts.forEach((p) => {
    const alloc = activeAllocations.find((a) => a.productId === p.id);
    const myUnits = alloc?.unitsOwned ?? 0;
    const coOwners = getProductCoOwners(p.id);
    const totalCoOwnedUnits = coOwners.reduce((sum, co) => sum + (co.unitsOwned || 0), 0);
    const ownershipRatio = totalCoOwnedUnits > 0 ? myUnits / totalCoOwnedUnits : 1;

    totalInvestorOwnedUnits += myUnits;
    inventoryStockValue += myUnits * p.costPrice;
    totalSalesGenerated += Math.round(p.totalRevenue * ownershipRatio);
    totalUnitsSoldAttributed += Math.round(p.salesCount * ownershipRatio);
    totalGrossProfitAttributed += Math.round(p.totalProfit * ownershipRatio);
  });

  // Calculate Investor Profit Share
  let calculatedInvestorProfit = 0;
  if (activeInvestor) {
    if (activeInvestor.profitShareType === 'percentage') {
      calculatedInvestorProfit = Math.round(
        (totalGrossProfitAttributed * activeInvestor.profitShareValue) / 100
      );
    } else {
      calculatedInvestorProfit = totalUnitsSoldAttributed * activeInvestor.profitShareValue;
    }
  }

  const settledProfit = activeInvestor?.settledProfit || 0;
  const pendingProfit = Math.max(0, calculatedInvestorProfit - settledProfit);

  const investorTxs = transactions.filter(
    (tx) => tx.investorId === activeInvestor?.id
  );

  // Sync Investor's Reseller Partner Record in Storage
  const syncInvestorResellerStatus = (
    investor: Investor,
    enableReseller: boolean,
    referralCode: string,
    paymentChannel: 'easypaisa' | 'jazzcash' | 'sadapay' | 'bank' | 'cash',
    accountTitle?: string,
    accountNumber?: string
  ): { updatedResellers: Reseller[]; resolvedCode?: string; resolvedResellerId?: string } => {
    const currentResellers = getResellers();
    const existingIndex = currentResellers.findIndex(
      (r) =>
        (investor.resellerId && r.id === investor.resellerId) ||
        (referralCode && r.referralCode.toLowerCase() === referralCode.toLowerCase()) ||
        (investor.linkedResellerCode &&
          r.referralCode.toLowerCase() === investor.linkedResellerCode.toLowerCase())
    );

    if (!enableReseller) {
      if (existingIndex !== -1) {
        const updated = currentResellers.map((r, idx) =>
          idx === existingIndex ? { ...r, status: 'inactive' as const } : r
        );
        saveResellers(updated);
        setResellers(updated);
      }
      return { updatedResellers: currentResellers, resolvedCode: undefined, resolvedResellerId: investor.resellerId };
    }

    const finalCode =
      referralCode.trim().toUpperCase() ||
      investor.linkedResellerCode ||
      `RES-INV-${Math.floor(100 + Math.random() * 899)}`;

    if (existingIndex !== -1) {
      const target = currentResellers[existingIndex];
      const updatedReseller: Reseller = {
        ...target,
        name: investor.name,
        urduName: investor.urduName || target.urduName,
        phone: investor.phone,
        referralCode: finalCode,
        paymentChannel,
        accountTitle: accountTitle?.trim() || investor.name,
        accountNumber: accountNumber?.trim() || investor.phone,
        status: investor.status === 'inactive' ? 'inactive' : 'active',
      };
      const updated = currentResellers.map((r, idx) =>
        idx === existingIndex ? updatedReseller : r
      );
      saveResellers(updated);
      setResellers(updated);
      return {
        updatedResellers: updated,
        resolvedCode: finalCode,
        resolvedResellerId: updatedReseller.id,
      };
    }

    const newReseller: Reseller = {
      id: `res_inv_${Date.now()}`,
      name: investor.name,
      urduName: investor.urduName || `${investor.name} (انویسٹر و ری سیلر)`,
      phone: investor.phone,
      city: 'Muzaffarabad',
      referralCode: finalCode,
      paymentChannel,
      accountTitle: accountTitle?.trim() || investor.name,
      accountNumber: accountNumber?.trim() || investor.phone,
      creditLimit: 25000,
      pin: getDefaultPinForPhone(investor.phone),
      totalReferredOrders: 0,
      totalSales: 0,
      totalPaidSales: 0,
      earnedCommission: 0,
      paidCommission: 0,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newReseller, ...currentResellers];
    saveResellers(updated);
    setResellers(updated);
    return {
      updatedResellers: updated,
      resolvedCode: finalCode,
      resolvedResellerId: newReseller.id,
    };
  };

  // Handler: Add New Investor
  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim() || !newInvPhone.trim()) {
      showNotification('error', 'Name and Phone are required.');
      return;
    }

    const newInvId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let newInv: Investor = {
      id: newInvId,
      name: newInvName.trim(),
      urduName: newInvUrduName.trim() || undefined,
      phone: newInvPhone.trim(),
      whatsapp: newInvWhatsapp.trim() || newInvPhone.trim(),
      email: newInvEmail.trim() || undefined,
      address: newInvAddress.trim() || undefined,
      totalInvestment: Number(newInvCapital) || 0,
      profitShareType: newInvShareType,
      profitShareValue: Number(newInvShareValue) || 0,
      assignedProductIds: [],
      productAllocations: [],
      isReseller: newInvIsReseller,
      resellerPaymentChannel: newInvIsReseller ? newInvResellerChannel : undefined,
      status: 'active',
      settledProfit: 0,
      notes: newInvNotes.trim() || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (newInvIsReseller) {
      const syncResult = syncInvestorResellerStatus(
        newInv,
        true,
        newInvResellerCode,
        newInvResellerChannel,
        newInv.name,
        newInv.phone
      );
      newInv = {
        ...newInv,
        linkedResellerCode: syncResult.resolvedCode,
        resellerId: syncResult.resolvedResellerId,
        resellerAccountTitle: newInv.name,
        resellerAccountNumber: newInv.phone,
      };
    }

    const updated = [...investors, newInv];
    saveInvestors(updated);
    setInvestors(updated);
    setSelectedInvestorId(newInv.id);
    setIsAddInvestorModalOpen(false);

    // Initial deposit tx if capital > 0
    if (newInv.totalInvestment > 0) {
      const initialTx: InvestorTransaction = {
        id: `inv_tx_${Date.now()}`,
        investorId: newInv.id,
        date: new Date().toISOString().split('T')[0],
        type: 'investment_deposit',
        amount: newInv.totalInvestment,
        paymentMode: 'bank_transfer',
        notes: 'Initial Capital Injection',
        reference: `INV-CAP-${Date.now().toString().slice(-5)}`,
        createdAt: new Date().toISOString(),
      };
      const updatedTxs = [initialTx, ...transactions];
      saveInvestorTransactions(updatedTxs);
      setTransactions(updatedTxs);
    }

    setNewInvName('');
    setNewInvUrduName('');
    setNewInvPhone('');
    setNewInvWhatsapp('');
    setNewInvEmail('');
    setNewInvAddress('');
    setNewInvNotes('');
    setNewInvIsReseller(false);
    setNewInvResellerCode('');

    showNotification('success', `Investor '${newInv.name}' registered successfully!`);
  };

  // Open Edit Investor Info Modal with ALL fields populated
  const openEditInvestorModal = () => {
    if (!activeInvestor) return;
    setEditName(activeInvestor.name);
    setEditUrduName(activeInvestor.urduName || '');
    setEditPhone(activeInvestor.phone);
    setEditWhatsapp(activeInvestor.whatsapp || activeInvestor.phone);
    setEditEmail(activeInvestor.email || '');
    setEditAddress(activeInvestor.address || '');
    setEditCapital(activeInvestor.totalInvestment);
    setEditSettledProfit(activeInvestor.settledProfit || 0);
    setEditShareType(activeInvestor.profitShareType);
    setEditShareValue(activeInvestor.profitShareValue);
    setEditStatus(activeInvestor.status);
    setEditNotes(activeInvestor.notes || '');
    setEditIsReseller(Boolean(activeInvestor.isReseller));
    setEditResellerCode(activeInvestor.linkedResellerCode || `RES-INV-${activeInvestor.id.slice(-3).toUpperCase()}`);
    setEditResellerChannel(activeInvestor.resellerPaymentChannel || 'easypaisa');
    setEditResellerAccountTitle(activeInvestor.resellerAccountTitle || activeInvestor.name);
    setEditResellerAccountNumber(activeInvestor.resellerAccountNumber || activeInvestor.phone);
    setIsEditInvestorModalOpen(true);
  };

  // Save Full Edited Investor Details
  const handleSaveEditInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvestor) return;
    if (!editName.trim() || !editPhone.trim()) {
      showNotification('error', 'Investor Name and Mobile Phone are required.');
      return;
    }

    let updatedInvestor: Investor = {
      ...activeInvestor,
      name: editName.trim(),
      urduName: editUrduName.trim() || undefined,
      phone: editPhone.trim(),
      whatsapp: editWhatsapp.trim() || editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      totalInvestment: Number(editCapital) || 0,
      settledProfit: Number(editSettledProfit) || 0,
      profitShareType: editShareType,
      profitShareValue: Number(editShareValue) || 0,
      status: editStatus,
      notes: editNotes.trim() || undefined,
      isReseller: editIsReseller,
      resellerPaymentChannel: editIsReseller ? editResellerChannel : activeInvestor.resellerPaymentChannel,
      resellerAccountTitle: editIsReseller ? editResellerAccountTitle.trim() : activeInvestor.resellerAccountTitle,
      resellerAccountNumber: editIsReseller ? editResellerAccountNumber.trim() : activeInvestor.resellerAccountNumber,
    };

    const syncRes = syncInvestorResellerStatus(
      updatedInvestor,
      editIsReseller,
      editResellerCode,
      editResellerChannel,
      editResellerAccountTitle,
      editResellerAccountNumber
    );

    updatedInvestor = {
      ...updatedInvestor,
      linkedResellerCode: editIsReseller ? syncRes.resolvedCode : undefined,
      resellerId: syncRes.resolvedResellerId,
    };

    const updatedList = investors.map((inv) =>
      inv.id === activeInvestor.id ? updatedInvestor : inv
    );
    saveInvestors(updatedList);
    setInvestors(updatedList);
    setIsEditInvestorModalOpen(false);
    showNotification(
      'success',
      `Updated investor profile for '${updatedInvestor.name}'${
        updatedInvestor.isReseller ? ` (Reseller Active: ${updatedInvestor.linkedResellerCode})` : ''
      }.`
    );
  };

  // Handler: Open Product Ownership & Manual Units Modal
  const openOwnershipModal = () => {
    if (!activeInvestor) return;
    const map: Record<string, InvestorProductAllocation> = {};
    getInvestorAllocations(activeInvestor).forEach((alloc) => {
      map[alloc.productId] = { ...alloc };
    });
    setDraftAllocations(map);
    setIsAssignModalOpen(true);
  };

  const toggleDraftProduct = (product: ProductItem) => {
    setDraftAllocations((prev) => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = {
          productId: product.id,
          unitsOwned: Math.max(1, product.stockQty),
          investedAmount: product.costPrice * Math.max(1, product.stockQty),
        };
      }
      return next;
    });
  };

  const updateDraftUnits = (product: ProductItem, units: number) => {
    const safeUnits = Math.max(0, Number.isNaN(units) ? 0 : units);
    setDraftAllocations((prev) => ({
      ...prev,
      [product.id]: {
        ...(prev[product.id] || { productId: product.id }),
        productId: product.id,
        unitsOwned: safeUnits,
        investedAmount: safeUnits * product.costPrice,
      },
    }));
  };

  const updateDraftNotes = (productId: string, notes: string) => {
    setDraftAllocations((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          notes,
        },
      };
    });
  };

  const handleSaveProductAllocations = () => {
    if (!activeInvestor) return;
    const allocationsList = Object.values(draftAllocations);
    const assignedIds = allocationsList.map((a) => a.productId);

    const updatedInvestors = investors.map((inv) =>
      inv.id === activeInvestor.id
        ? {
            ...inv,
            assignedProductIds: assignedIds,
            productAllocations: allocationsList,
          }
        : inv
    );
    saveInvestors(updatedInvestors);
    setInvestors(updatedInvestors);
    setIsAssignModalOpen(false);
    showNotification(
      'success',
      `Updated product ownership & manual units for ${activeInvestor.name} (${allocationsList.length} products).`
    );
  };

  // Inline quick unit update directly from table
  const handleInlineUnitUpdate = (product: ProductItem, newUnits: number) => {
    if (!activeInvestor || !isAdmin) return;
    const safeUnits = Math.max(0, Number.isNaN(newUnits) ? 0 : newUnits);
    const currentAllocs = getInvestorAllocations(activeInvestor);
    const updatedAllocs = currentAllocs.map((a) =>
      a.productId === product.id
        ? { ...a, unitsOwned: safeUnits, investedAmount: safeUnits * product.costPrice }
        : a
    );
    const updatedInvestors = investors.map((inv) =>
      inv.id === activeInvestor.id ? { ...inv, productAllocations: updatedAllocs } : inv
    );
    saveInvestors(updatedInvestors);
    setInvestors(updatedInvestors);
  };

  // Handler: Record Transaction
  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvestor) return;

    const newTx: InvestorTransaction = {
      id: `inv_tx_${Date.now()}`,
      investorId: activeInvestor.id,
      date: new Date().toISOString().split('T')[0],
      type: txType,
      amount: Number(txAmount) || 0,
      paymentMode: txPaymentMode,
      notes: txNotes.trim(),
      reference: txRef.trim() || `REF-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTxs = [newTx, ...transactions];
    saveInvestorTransactions(updatedTxs);
    setTransactions(updatedTxs);

    // Update settled profit or total investment if applicable
    if (txType === 'profit_payout') {
      const updatedInvestors = investors.map((inv) =>
        inv.id === activeInvestor.id
          ? { ...inv, settledProfit: (inv.settledProfit || 0) + Number(txAmount) }
          : inv
      );
      saveInvestors(updatedInvestors);
      setInvestors(updatedInvestors);
    } else if (txType === 'investment_deposit') {
      const updatedInvestors = investors.map((inv) =>
        inv.id === activeInvestor.id
          ? { ...inv, totalInvestment: (inv.totalInvestment || 0) + Number(txAmount) }
          : inv
      );
      saveInvestors(updatedInvestors);
      setInvestors(updatedInvestors);
    }

    setIsRecordTxModalOpen(false);
    setTxNotes('');
    setTxRef('');
    showNotification('success', 'Investor transaction recorded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isAdmin ? 'Investor Capital, Multi-Owner Stock & Profit' : 'Private Investor Portfolio'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'انویسٹرز کی مکمل معلومات، مشترکہ پروڈکٹ ملکیت، دستی یونٹس اور ری سیلر پارٹنرشپ'
                  : 'آپ کی کل سرمایہ کاری، پراڈکٹس یونٹس اور منافع کا محفوظ کھاتہ'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Admin Select Investor Dropdown */}
            {isAdmin && investors.length > 0 && (
              <select
                value={selectedInvestorId}
                onChange={(e) => setSelectedInvestorId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden"
              >
                {investors.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({profile.currencySymbol}{inv.totalInvestment.toLocaleString('en-PK')})
                    {inv.isReseller ? ' · Reseller' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Admin Edit Active Investor */}
            {isAdmin && activeInvestor && (
              <button
                type="button"
                onClick={openEditInvestorModal}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Edit Investor Info</span>
              </button>
            )}

            {/* Admin Add Investor */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddInvestorModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Investor</span>
              </button>
            )}

            {/* Direct WhatsApp Contact Button */}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const msg = `السلام علیکم! میں انویسٹر ${activeInvestor?.name} ہوں۔ اپنے انویسٹمنٹ پورٹ فولیو اور پرافٹ سیٹلمنٹ کے حوالے سے رہنمائی درکار ہے۔ شکریہ!`;
                  openWhatsAppDirect('03125256266', msg);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Investor Profile Summary Strip (Full Editable Details & Reseller Status) */}
        {activeInvestor && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {activeInvestor.name}
                </span>
                {activeInvestor.urduName && (
                  <span className="text-xs font-urdu text-slate-500 dark:text-slate-400">
                    ({activeInvestor.urduName})
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeInvestor.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {activeInvestor.status}
                </span>
                {activeInvestor.isReseller ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    <Handshake className="w-3 h-3" />
                    Also Reseller ({activeInvestor.linkedResellerCode || 'Active'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Investor Only (Not Reseller)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" /> {activeInvestor.phone}
                </span>
                {activeInvestor.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {activeInvestor.email}
                  </span>
                )}
                {activeInvestor.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {activeInvestor.address}
                  </span>
                )}
              </div>

              {activeInvestor.notes && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Note: {activeInvestor.notes}
                </p>
              )}
            </div>

            {activeInvestor.isReseller && (
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/70 shrink-0 flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                    Reseller Code
                  </span>
                  <span className="font-mono font-black text-xs text-purple-900 dark:text-white">
                    {activeInvestor.linkedResellerCode || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                    Referral Commission
                  </span>
                  <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                    {profile.currencySymbol}{(linkedResellerRecord?.earnedCommission || 0).toLocaleString('en-PK')}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                      ({linkedResellerRecord?.totalReferredOrders || 0} orders)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Notification */}
        {notification && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Capital Invested */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Capital Invested</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
            {profile.currencySymbol}{activeInvestor?.totalInvestment.toLocaleString('en-PK') || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            کل سرمایہ کاری
          </span>
        </div>

        {/* Owned Stock Units & Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Owned Units Value</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400">
            {profile.currencySymbol}{inventoryStockValue.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {totalInvestorOwnedUnits} Owned Units across {assignedProducts.length} product(s)
          </span>
        </div>

        {/* Total Profit Earned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Investor Profit Share</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {profile.currencySymbol}{calculatedInvestorProfit.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Model: {activeInvestor?.profitShareValue}{activeInvestor?.profitShareType === 'percentage' ? '% Net Profit' : ' Rs/Unit'} ({totalSalesGenerated.toLocaleString('en-PK')} rev)
          </span>
        </div>

        {/* Pending Settlement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Payout</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {profile.currencySymbol}{pendingProfit.toLocaleString('en-PK')}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Settled: {profile.currencySymbol}{settledProfit.toLocaleString('en-PK')}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Owned Products &amp; Units ({assignedProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Settlement Ledger ({investorTxs.length})
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openOwnershipModal}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Product Ownership &amp; Manual Units</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecordTxModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              Record Payout / Deposit
            </button>
          </div>
        )}
      </div>

      {/* 1. OWNED PRODUCTS & MULTI-INVESTOR ALLOCATION TAB */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Funded Catalog Products &amp; Co-Ownership Units
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Multiple investors can co-own the same product. Enter manual units owned per investor below.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Total Investor Units: <b>{totalInvestorOwnedUnits}</b> · Attributed Sales: <b>{totalUnitsSoldAttributed}</b>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Co-Owners (مشترکہ مالکان)</th>
                  <th className="py-3 px-4">My Owned Units</th>
                  <th className="py-3 px-4">Total Store Stock</th>
                  <th className="py-3 px-4">Share %</th>
                  <th className="py-3 px-4">Attributed Revenue</th>
                  <th className="py-3 px-4 text-right">My Unit Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No products currently assigned to this investor portfolio.
                      {isAdmin && ' Click "Product Ownership & Manual Units" above to assign products and unit quantities.'}
                    </td>
                  </tr>
                ) : (
                  assignedProducts.map((p) => {
                    const alloc = activeAllocations.find((a) => a.productId === p.id);
                    const myUnits = alloc?.unitsOwned ?? 0;
                    const coOwners = getProductCoOwners(p.id);
                    const totalCoOwned = coOwners.reduce((s, c) => s + (c.unitsOwned || 0), 0);
                    const sharePct = totalCoOwned > 0 ? Math.round((myUnits / totalCoOwned) * 100) : 100;
                    const attributedRev = Math.round(p.totalRevenue * (totalCoOwned > 0 ? myUnits / totalCoOwned : 1));
                    const myValuation = myUnits * p.costPrice;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            SKU: {p.sku} · Cost: {profile.currencySymbol}{p.costPrice.toLocaleString('en-PK')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {coOwners.map((co) => (
                              <span
                                key={co.investor.id}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  co.investor.id === activeInvestor?.id
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 font-bold'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {co.investor.name.split(' ')[0]} ({co.unitsOwned}u)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isAdmin ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={myUnits}
                                onChange={(e) => handleInlineUnitUpdate(p, parseInt(e.target.value, 10) || 0)}
                                className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                              />
                              <span className="text-[10px] text-slate-400">units</span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {myUnits} Units
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {p.stockQty} Units ({p.salesCount} sold)
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {sharePct}%
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-bold">
                          {profile.currencySymbol}{attributedRev.toLocaleString('en-PK')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {profile.currencySymbol}{myValuation.toLocaleString('en-PK')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TRANSACTIONS LEDGER TAB */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Date-wise Settlement &amp; Capital History
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Total Transactions: {investorTxs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {investorTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No financial transactions recorded for this investor yet.
                    </td>
                  </tr>
                ) : (
                  investorTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'profit_payout'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : tx.type === 'investment_deposit'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {tx.paymentMode || 'Bank Transfer'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {tx.reference || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {profile.currencySymbol}{tx.amount.toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER INVESTOR (ADMIN) */}
      {isAddInvestorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-4 transition-colors max-h-[92vh] flex flex-col">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black">Register New Investor</h3>
                  <span className="text-[11px] font-medium block">نیا انویسٹر اور کیپٹل پارٹنر درج کریں</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddInvestorModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInvestor} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Investor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheikh Farhan"
                    value={newInvName}
                    onChange={(e) => setNewInvName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Urdu Name / Title (اختیاری)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شیخ فرحان احمد"
                    value={newInvUrduName}
                    onChange={(e) => setNewInvUrduName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-urdu rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567"
                    value={newInvPhone}
                    onChange={(e) => setNewInvPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number:
                  </label>
                  <input
                    type="text"
                    placeholder="0300 1234567"
                    value={newInvWhatsapp}
                    onChange={(e) => setNewInvWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    placeholder="investor@domain.pk"
                    value={newInvEmail}
                    onChange={(e) => setNewInvEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business / City Address:
                  </label>
                  <input
                    type="text"
                    placeholder="Market / Office Address"
                    value={newInvAddress}
                    onChange={(e) => setNewInvAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Capital (PKR):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newInvCapital}
                    onChange={(e) => setNewInvCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profit Model:
                  </label>
                  <select
                    value={newInvShareType}
                    onChange={(e) => setNewInvShareType(e.target.value as 'percentage' | 'fixed_per_unit')}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="percentage">% Net Profit</option>
                    <option value="fixed_per_unit">Rs Fixed / Unit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Share Value:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newInvShareValue}
                    onChange={(e) => setNewInvShareValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Is Investor Also a Reseller Toggle */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Handshake className="w-4 h-4 text-purple-600" />
                    Is this Investor also a Reseller? (کیا انویسٹر ری سیلر بھی ہے؟)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewInvIsReseller(true)}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer border ${
                        newInvIsReseller
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Yes (Reseller)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInvIsReseller(false)}
                      className={`px-3 py-1 rounded-lg font-bold cursor-pointer border ${
                        !newInvIsReseller
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      No (Investor Only)
                    </button>
                  </div>
                </div>

                {newInvIsReseller && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Reseller Referral Code:
                      </label>
                      <input
                        type="text"
                        placeholder="Auto e.g. RES-INV-101"
                        value={newInvResellerCode}
                        onChange={(e) => setNewInvResellerCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono uppercase rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Commission Payout Channel:
                      </label>
                      <select
                        value={newInvResellerChannel}
                        onChange={(e) => setNewInvResellerChannel(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="easypaisa">EasyPaisa</option>
                        <option value="jazzcash">JazzCash</option>
                        <option value="sadapay">SadaPay</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Counter Cash</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (تفصیل):
                </label>
                <input
                  type="text"
                  placeholder="Agreement terms or lot remarks"
                  value={newInvNotes}
                  onChange={(e) => setNewInvNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddInvestorModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save Investor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FULL INVESTOR INFO (ALL OPTIONS EDITABLE + RESELLER TOGGLE) */}
      {isEditInvestorModalOpen && activeInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-4 transition-colors max-h-[92vh] flex flex-col">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <div>
                  <h3 className="text-base font-black">Edit Investor Profile &amp; Reseller Option</h3>
                  <span className="text-[11px] font-medium block">
                    انویسٹر کی تمام معلومات، سرمایہ کاری، منافع اور ری سیلر اسٹیٹس تبدیل کریں
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditInvestorModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvestor} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Urdu Name / Title
                  </label>
                  <input
                    type="text"
                    value={editUrduName}
                    onChange={(e) => setEditUrduName(e.target.value)}
                    className="w-full px-3 py-2 font-urdu rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Capital (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCapital}
                    onChange={(e) => setEditCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Settled Profit (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSettledProfit}
                    onChange={(e) => setEditSettledProfit(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profit Share Type
                  </label>
                  <select
                    value={editShareType}
                    onChange={(e) => setEditShareType(e.target.value as 'percentage' | 'fixed_per_unit')}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="percentage">% Net Profit</option>
                    <option value="fixed_per_unit">Rs Fixed / Unit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Share Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editShareValue}
                    onChange={(e) => setEditShareValue(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Is Investor Also a Reseller Toggle + Details */}
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Handshake className="w-4 h-4 text-purple-600" />
                      Investor Is Reseller Partner? (کیا یہ انویسٹر ری سیلر بھی ہے؟)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      When enabled, investor receives referral commission (Rs. 30 per Rs. 1,000) and appears in Resellers ledger.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsReseller(true)}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer border ${
                        editIsReseller
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Yes (Reseller)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsReseller(false)}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer border ${
                        !editIsReseller
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      No (Not Reseller)
                    </button>
                  </div>
                </div>

                {editIsReseller && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200/70 dark:border-purple-800/70">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Reseller Referral Code
                      </label>
                      <input
                        type="text"
                        value={editResellerCode}
                        onChange={(e) => setEditResellerCode(e.target.value)}
                        className="w-full px-3 py-1.5 font-mono uppercase rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Commission Payout Channel
                      </label>
                      <select
                        value={editResellerChannel}
                        onChange={(e) => setEditResellerChannel(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="easypaisa">EasyPaisa</option>
                        <option value="jazzcash">JazzCash</option>
                        <option value="sadapay">SadaPay</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Counter Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payout Account Title
                      </label>
                      <input
                        type="text"
                        value={editResellerAccountTitle}
                        onChange={(e) => setEditResellerAccountTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Payout Account / Mobile #
                      </label>
                      <input
                        type="text"
                        value={editResellerAccountNumber}
                        onChange={(e) => setEditResellerAccountNumber(e.target.value)}
                        className="w-full px-3 py-1.5 font-mono rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes &amp; Remarks
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditInvestorModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black rounded-lg cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Investor Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MULTI-INVESTOR PRODUCT OWNERSHIP & MANUAL UNIT ENTRY */}
      {isAssignModalOpen && activeInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-4 transition-colors max-h-[90vh] flex flex-col">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900 shrink-0">
              <div>
                <h3 className="text-base font-black">
                  Product Ownership &amp; Manual Units — {activeInvestor.name}
                </h3>
                <span className="text-[11px] font-medium block">
                  Multiple investors can share ownership of any product. Enter exact owned unit counts manually.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {products.map((p) => {
                  const draft = draftAllocations[p.id];
                  const isAssigned = Boolean(draft);
                  const otherCoOwners = getProductCoOwners(p.id).filter(
                    (co) => co.investor.id !== activeInvestor.id
                  );

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        isAssigned ? 'bg-amber-50/40 dark:bg-amber-950/15' : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleDraftProduct(p)}
                            className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Total Store Stock: {p.stockQty} · Cost: {profile.currencySymbol}{p.costPrice} · Wholesale: {profile.currencySymbol}{p.ourPrice}
                            </div>
                          </div>
                        </label>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {p.category}
                        </span>
                      </div>

                      {otherCoOwners.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-7 text-[10px]">
                          <span className="text-slate-500 font-semibold">Other Co-Owners:</span>
                          {otherCoOwners.map((co) => (
                            <span
                              key={co.investor.id}
                              className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono font-bold"
                            >
                              {co.investor.name}: {co.unitsOwned} units
                            </span>
                          ))}
                        </div>
                      )}

                      {isAssigned && draft && (
                        <div className="pl-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              Manual Units Owned *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={draft.unitsOwned}
                              onChange={(e) => updateDraftUnits(p, parseInt(e.target.value, 10) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              Unit Cost Value
                            </label>
                            <div className="px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                              {profile.currencySymbol}{(draft.unitsOwned * p.costPrice).toLocaleString('en-PK')}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                              Lot Note (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Lot / batch ref"
                              value={draft.notes || ''}
                              onChange={(e) => updateDraftNotes(p.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductAllocations}
                className="px-5 py-2 bg-slate-900 dark:bg-amber-500 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg cursor-pointer"
              >
                Save Ownership &amp; Units
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD TRANSACTION (ADMIN) */}
      {isRecordTxModalOpen && activeInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-4 transition-colors">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <h3 className="text-base font-black">Record Financial Entry</h3>
              <button
                type="button"
                onClick={() => setIsRecordTxModalOpen(false)}
                className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Type:
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="profit_payout">Profit Payout (منافع کی ادائیگی)</option>
                  <option value="investment_deposit">Capital Deposit (مزید سرمایہ کاری)</option>
                  <option value="capital_withdrawal">Capital Withdrawal (انویسٹمنٹ واپسی)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (PKR):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode:
                </label>
                <select
                  value={txPaymentMode}
                  onChange={(e) => setTxPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer (میزان / ایچ بی ایل)</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="sadapay">SadaPay</option>
                  <option value="cash">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Slip ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. MEZN-PAY-99214"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (تفصیل):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Profit distribution for Lot #1"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordTxModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-black text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
