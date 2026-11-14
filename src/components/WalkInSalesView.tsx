import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  User,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Printer,
  Share2,
  X,
  CreditCard,
  ShoppingBag,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ProductItem,
  ProductVariation,
  WalkInSale,
  WalkInSaleItem,
  WalkInCustomer,
  Branch,
  UserAccount,
  AppUser,
  PaymentMode,
  SalespersonReferral,
  CommissionRecord,
} from '../types';
import {
  getBranches,
  getWalkInCustomers,
  saveWalkInCustomers,
  getWalkInSales,
  saveWalkInSales,
  getSalespersonReferrals,
  saveSalespersonReferrals,
  getCommissionRecords,
  saveCommissionRecords,
  calculateSalespersonCommission,
} from '../utils/storage';
import { openWhatsAppDirect } from '../utils/whatsapp';
import { ToastBanner, ToastMessage } from './AppDialogs';

interface WalkInSalesViewProps {
  products: ProductItem[];
  currentUser: AppUser;
  selectedInitialBranchId?: string;
  onStockUpdated?: (updatedProducts: ProductItem[]) => void;
}

export const WalkInSalesView: React.FC<WalkInSalesViewProps> = ({
  products,
  currentUser,
  selectedInitialBranchId,
  onStockUpdated,
}) => {
  const branches = getBranches();
  const [customers, setCustomers] = useState<WalkInCustomer[]>(getWalkInCustomers);
  const [sales, setSales] = useState<WalkInSale[]>(getWalkInSales);
  const [referrals, setReferrals] = useState<SalespersonReferral[]>(getSalespersonReferrals);
  const [commissions, setCommissions] = useState<CommissionRecord[]>(getCommissionRecords);

  // Active view tab: POS Counter vs. History
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'customers'>('pos');

  // Selected Branch for Walk-in POS
  const defaultBranch = branches.find((b) => b.id === selectedInitialBranchId) ||
    branches.find((b) => b.id === currentUser.branchId) ||
    branches[0] || {
      id: 'branch_1',
      name: 'Shah Alam Head Office & Main Wholesale Branch',
      code: 'BR-LHR-01',
      address: 'Shop # 14, Madina Market (مدینہ مارکیٹ), Shah Alam, Lahore',
      contactNumber: '0312 5256 266',
      status: 'active',
      createdAt: '2026-01-01',
    };

  const [currentBranchId, setCurrentBranchId] = useState<string>(defaultBranch.id);
  const activeBranch = branches.find((b) => b.id === currentBranchId) || defaultBranch;

  // POS Cart State
  const [cart, setCart] = useState<WalkInSaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // Customer Selection & Registration
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [salespersonCodeInput, setSalespersonCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode | 'cash' | 'split'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  // Receipt Modal State
  const [completedSaleReceipt, setCompletedSaleReceipt] = useState<WalkInSale | null>(null);

  // Quick Customer Registration Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustReferral, setNewCustReferral] = useState('');
  const [quickRegError, setQuickRegError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (text: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Authorities check
  const managerAuth = currentUser.managerAuthorities;
  const canAuthorizeDiscount = managerAuth?.canAuthorizeDiscount ?? true;
  const maxDiscountPercent = managerAuth?.maxDiscountPercent ?? 15;
  const isCreditAuthorizedSeller =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    Boolean(currentUser.canAuthorizeCreditSale || managerAuth?.canAuthorizeCreditSale);

  // Cart Totals
  const subtotal = cart.reduce((acc, item) => acc + item.totalAmount, 0);
  const netTotal = Math.max(0, subtotal - appliedDiscount);

  // Auto-fill customer if phone matches
  const handlePhoneLookup = (phone: string) => {
    setCustomerPhoneInput(phone);
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 7) {
      const match = customers.find((c) => c.phone.replace(/\D/g, '') === clean);
      if (match) {
        setCustomerNameInput(match.name);
        if (match.salespersonCode) {
          setSalespersonCodeInput(match.salespersonCode);
        }
      }
    }
  };

  // Add Item to Cart
  const handleAddItemToCart = () => {
    if (!selectedProduct) return;

    const unitPrice = selectedVariation?.salePrice || selectedProduct.ourPrice;
    const marketPrice = selectedVariation?.originalPrice || selectedProduct.marketPrice;
    const varDetails = selectedVariation
      ? Object.entries(selectedVariation.attributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : selectedProduct.selectedSize || undefined;

    const existingIdx = cart.findIndex(
      (it) => it.productId === selectedProduct.id && it.variationId === selectedVariation?.id
    );

    if (existingIdx >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIdx].quantity + itemQuantity;
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: newQty,
        totalAmount: unitPrice * newQty,
      };
      setCart(updated);
    } else {
      const newItem: WalkInSaleItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        variationId: selectedVariation?.id,
        variationDetails: varDetails,
        quantity: itemQuantity,
        unitPrice,
        marketPrice,
        totalAmount: unitPrice * itemQuantity,
      };
      setCart([...cart, newItem]);
    }

    // Reset selection
    setSelectedProduct(null);
    setSelectedVariation(null);
    setItemQuantity(1);
    setSearchQuery('');
  };

  const handleRemoveCartItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleUpdateCartQty = (idx: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      handleRemoveCartItem(idx);
      return;
    }
    updated[idx] = {
      ...updated[idx],
      quantity: newQty,
      totalAmount: updated[idx].unitPrice * newQty,
    };
    setCart(updated);
  };

  // COMPLETE SALE
  const handleProcessSale = () => {
    if (cart.length === 0) {
      pushToast('Cart is empty. Please select products first.', 'error');
      return;
    }

    if (!customerNameInput.trim() || !customerPhoneInput.trim()) {
      pushToast('Customer Name and Contact Phone are required for in-store sales records.', 'error');
      return;
    }

    // Validate discount limit
    if (appliedDiscount > 0) {
      const maxDiscountValue = (subtotal * maxDiscountPercent) / 100;
      if (appliedDiscount > maxDiscountValue && !currentUser.role?.includes('admin')) {
        pushToast(
          `Discount of Rs. ${appliedDiscount} exceeds your authorized manager limit of ${maxDiscountPercent}% (Max Rs. ${Math.round(maxDiscountValue)}).`,
          'error'
        );
        return;
      }
    }

    const rawPaid = paidAmountInput.trim() ? parseFloat(paidAmountInput) : netTotal;
    const paidAmount = isCreditAuthorizedSeller ? Math.max(0, Math.min(netTotal, rawPaid)) : netTotal;
    const dueAmount = Math.max(0, netTotal - paidAmount);

    if (dueAmount > 0 && !isCreditAuthorizedSeller) {
      pushToast(
        'Only authorized sellers (with Credit Sale role permission) are allowed to process credit/due balances.',
        'error'
      );
      return;
    }

    const paymentStatus: 'completed' | 'partial' | 'pending' =
      dueAmount === 0 ? 'completed' : paidAmount > 0 ? 'partial' : 'pending';

    const branchCode = activeBranch.code || 'BR01';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `POS-${branchCode}-${randomNum}`;

    // 1. Register or update walk-in customer
    const cleanPhone = customerPhoneInput.replace(/\D/g, '');
    let existingCust = customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);

    if (!existingCust) {
      existingCust = {
        id: `walkin_${Date.now()}`,
        name: customerNameInput.trim(),
        phone: customerPhoneInput.trim(),
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        registrationDate: new Date().toISOString().split('T')[0],
        salespersonCode: salespersonCodeInput.trim() || undefined,
        status: 'active',
      };
      const updatedCusts = [existingCust, ...customers];
      setCustomers(updatedCusts);
      saveWalkInCustomers(updatedCusts);
    }

    // 2. Create Sale Record
    const newSale: WalkInSale = {
      id: `sale_${Date.now()}_${randomNum}`,
      receiptNumber,
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      managerId: currentUser.id || 'usr_manager_1',
      managerName: currentUser.name || 'Store Manager',
      customerId: existingCust.id,
      customerName: customerNameInput.trim(),
      customerPhone: customerPhoneInput.trim(),
      salespersonCode: salespersonCodeInput.trim() || undefined,
      items: cart,
      subtotal,
      discountAmount: appliedDiscount,
      discountReason: discountReason.trim() || undefined,
      totalAmount: netTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      paymentStatus,
      saleDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      notes: notesInput.trim() || undefined,
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveWalkInSales(updatedSales);

    // 3. Trigger Salesperson Commission (PKR 30 per PKR 1,000 qualifying sales)
    if (salespersonCodeInput.trim() && paidAmount >= 1000) {
      const spCode = salespersonCodeInput.trim().toUpperCase();
      const earnedComm = calculateSalespersonCommission(paidAmount);

      if (earnedComm > 0) {
        const commRecord: CommissionRecord = {
          id: `comm_${Date.now()}`,
          referralCode: spCode,
          salespersonId: `sp_${spCode}`,
          salespersonName: `Salesperson (${spCode})`,
          branchId: activeBranch.id,
          branchName: activeBranch.name,
          transactionId: newSale.id,
          receiptNumber,
          saleType: 'walk_in',
          eligibleSalesAmount: paidAmount,
          commissionRate: 30,
          calculatedCommission: earnedComm,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        const updatedComms = [commRecord, ...commissions];
        setCommissions(updatedComms);
        saveCommissionRecords(updatedComms);

        // Update salesperson tally
        const updatedRefs = referrals.map((r) =>
          r.code === spCode
            ? {
                ...r,
                totalSales: r.totalSales + paidAmount,
                paidSales: r.paidSales + paidAmount,
                earnedCommission: r.earnedCommission + earnedComm,
              }
            : r
        );
        setReferrals(updatedRefs);
        saveSalespersonReferrals(updatedRefs);
      }
    }

    // 4. Update Product Stock
    let stockChanged = false;
    const updatedProducts = products.map((prod) => {
      const cartItem = cart.find((it) => it.productId === prod.id);
      if (cartItem) {
        stockChanged = true;
        const newStock = Math.max(0, prod.stockQty - cartItem.quantity);
        return {
          ...prod,
          stockQty: newStock,
          salesCount: (prod.salesCount || 0) + cartItem.quantity,
          totalRevenue: (prod.totalRevenue || 0) + cartItem.totalAmount,
        };
      }
      return prod;
    });

    if (stockChanged && onStockUpdated) {
      onStockUpdated(updatedProducts);
    }

    // Open receipt modal
    setCompletedSaleReceipt(newSale);

    // Reset POS form
    setCart([]);
    setCustomerPhoneInput('');
    setCustomerNameInput('');
    setSalespersonCodeInput('');
    setAppliedDiscount(0);
    setDiscountReason('');
    setPaidAmountInput('');
    setNotesInput('');
  };

  // QUICK REGISTER CUSTOMER
  const handleQuickRegisterCustomer = () => {
    setQuickRegError(null);
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setQuickRegError('Name and Mobile Number are required.');
      return;
    }

    const clean = newCustPhone.replace(/\D/g, '');
    const exists = customers.some((c) => c.phone.replace(/\D/g, '') === clean);
    if (exists) {
      setQuickRegError('A customer with this phone number already exists.');
      return;
    }

    const newCust: WalkInCustomer = {
      id: `walkin_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || undefined,
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      registrationDate: new Date().toISOString().split('T')[0],
      salespersonCode: newCustReferral.trim() || undefined,
      status: 'active',
    };

    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveWalkInCustomers(updated);

    // Select this customer in POS
    setCustomerNameInput(newCust.name);
    setCustomerPhoneInput(newCust.phone);
    if (newCust.salespersonCode) setSalespersonCodeInput(newCust.salespersonCode);

    setIsAddCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustReferral('');
  };

  // Filter products for POS quick search
  const filteredProducts = products.filter(
    (p) =>
      !p.isUpcoming &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP HEADER & BRANCH SELECTOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  WALK-IN SALES &amp; POS COUNTER
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Thermal Receipt &amp; WhatsApp Receipt Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical counter checkout, instant discount validation, customer registration &amp; salesperson referral tracking.
              </p>
            </div>
          </div>

          {/* Branch Switcher & Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Branch:</span>
              <select
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'pos'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                POS Counter
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Sales History ({sales.filter((s) => s.branchId === activeBranch.id).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Walk-in Customers ({customers.filter((c) => c.branchId === activeBranch.id).length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. POS COUNTER TERMINAL */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: PRODUCT SEARCH & VARIATION PICKER (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan SKU barcode or search products by title / category..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Product Selection List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg">
                {filteredProducts.slice(0, 8).map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setSelectedVariation(prod.variations?.[0] || null);
                    }}
                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      selectedProduct?.id === prod.id
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-9 h-9 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {prod.sku} · Stock: {prod.stockQty}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        Rs. {prod.ourPrice.toLocaleString('en-PK')}
                      </div>
                      <div className="text-[10px] text-slate-400 line-through">
                        Rs. {prod.marketPrice.toLocaleString('en-PK')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Product Variation & Quantity Picker */}
              {selectedProduct && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3 animate-fade-in text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{selectedProduct.name}</span>
                    <span className="font-mono text-emerald-600">
                      Rs.{' '}
                      {(
                        selectedVariation?.salePrice || selectedProduct.ourPrice
                      ).toLocaleString('en-PK')}
                    </span>
                  </div>

                  {/* Variation Options if any */}
                  {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                        Select Variation (Size / Color)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.variations.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariation(v)}
                            className={`px-2.5 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                              selectedVariation?.id === v.id
                                ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {v.size || ''} {v.color ? `(${v.color})` : ''} - Rs.{' '}
                            {(v.salePrice || selectedProduct.ourPrice).toLocaleString('en-PK')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity and Add to Cart Button */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">Qty:</span>
                      <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-mono font-bold text-slate-900 dark:text-white">
                          {itemQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQuantity(itemQuantity + 1)}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemToCart}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Counter Cart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  Counter Cart Items ({cart.length})
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No items in counter cart. Search and select products above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">Price</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cart.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {item.productName}
                            </div>
                            {item.variationDetails && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.variationDetails}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                            Rs. {item.unitPrice.toLocaleString('en-PK')}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(idx, -1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(idx, 1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-right text-slate-900 dark:text-white">
                            Rs. {item.totalAmount.toLocaleString('en-PK')}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CUSTOMER, DISCOUNT, PAYMENT & CHECKOUT (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  Customer &amp; Payment Details
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  + New Customer
                </button>
              </div>

              {/* Customer Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Mobile Number (Phone Lookup)
                  </label>
                  <input
                    type="text"
                    value={customerPhoneInput}
                    onChange={(e) => handlePhoneLookup(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    placeholder="Walk-in Customer Name"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                    Salesperson Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={salespersonCodeInput}
                    onChange={(e) => setSalespersonCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SP-SHAHALAM-01"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Triggers PKR 30 commission per PKR 1,000 qualifying sales.
                  </span>
                </div>
              </div>

              {/* Discount Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-500" />
                    Counter Discount (Rs.)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Max authorized: {maxDiscountPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={appliedDiscount || ''}
                    disabled={!canAuthorizeDiscount}
                    onChange={(e) => setAppliedDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="Rs. 0"
                    className="w-28 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Reason (e.g. Bulk lot rounding)"
                    className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-slate-600 dark:text-slate-400 font-bold block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['cash', 'easypaisa', 'jazzcash', 'sadapay'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid Amount & Due Calculation */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-mono font-bold">Rs. {subtotal.toLocaleString('en-PK')}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs text-amber-600 font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-Rs. {appliedDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Net Payable Amount:</span>
                  <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                    Rs. {netTotal.toLocaleString('en-PK')}
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 text-[11px]">
                      {isCreditAuthorizedSeller
                        ? 'Amount Paid by Customer (Leave blank if fully settled)'
                        : 'Full Payment Required (Credit Sale Not Authorized for Role)'}
                    </label>
                    {isCreditAuthorizedSeller && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Credit Auth Active
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    disabled={!isCreditAuthorizedSeller}
                    value={isCreditAuthorizedSeller ? paidAmountInput : String(netTotal)}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder={`Full Amount: Rs. ${netTotal}`}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono font-bold disabled:opacity-70"
                  />
                </div>
              </div>

              {/* Complete & Print Checkout Button */}
              <button
                type="button"
                onClick={handleProcessSale}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Walk-in Sale &amp; Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: SALES HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Branch Walk-in Transaction History ({activeBranch.name})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Receipt / Ref</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items Count</th>
                  <th className="p-3">Salesperson</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales
                  .filter((s) => s.branchId === activeBranch.id)
                  .map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.receiptNumber}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {sale.saleDate}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sale.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sale.customerPhone}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {sale.items.length} items
                      </td>
                      <td className="p-3 font-mono text-amber-600 font-bold">
                        {sale.salespersonCode || 'None'}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Rs. {sale.totalAmount.toLocaleString('en-PK')}
                      </td>
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setCompletedSaleReceipt(sale)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: WALK-IN CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" />
              Registered In-Store Walk-in Customers ({activeBranch.name})
            </h3>
            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">Registered Branch</th>
                  <th className="p-3">Salesperson Code</th>
                  <th className="p-3">Registration Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers
                  .filter((c) => c.branchId === activeBranch.id)
                  .map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {cust.name}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {cust.phone}
                      </td>
                      <td className="p-3 text-slate-500">{cust.branchName}</td>
                      <td className="p-3 font-mono font-bold text-amber-600">
                        {cust.salespersonCode || '—'}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{cust.registrationDate}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerNameInput(cust.name);
                            setCustomerPhoneInput(cust.phone);
                            if (cust.salespersonCode) setSalespersonCodeInput(cust.salespersonCode);
                            setActiveTab('pos');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs cursor-pointer"
                        >
                          Select for POS
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: QUICK REGISTER CUSTOMER */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" />
                Register Walk-in Customer
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickRegError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickRegError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Sheikh Zahid"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Mobile Number (Unique)
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-bold block mb-1">
                  Assigned Salesperson Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={newCustReferral}
                  onChange={(e) => setNewCustReferral(e.target.value.toUpperCase())}
                  placeholder="e.g. SP-SHAHALAM-01"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickRegisterCustomer}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
              >
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE / SHAREABLE RECEIPT */}
      {completedSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-xs font-mono border-2 border-slate-300">
            {/* Thermal Receipt Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="inline-block px-2 py-0.5 bg-[#FFD200] text-slate-950 font-black text-xs rounded">
                100DAGAR
              </div>
              <h2 className="font-extrabold text-sm tracking-tight">WE BUY WE SELL</h2>
              <p className="text-[10px] text-slate-500 leading-tight">
                {completedSaleReceipt.branchName}
              </p>
              <p className="text-[10px] text-slate-500">Helpline: 0312 5256 266</p>
            </div>

            {/* Receipt Metadata */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{completedSaleReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date &amp; Time:</span>
                <span>{new Date(completedSaleReceipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{completedSaleReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{completedSaleReceipt.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Manager:</span>
                <span>{completedSaleReceipt.managerName}</span>
              </div>
              {completedSaleReceipt.salespersonCode && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Salesperson Ref:</span>
                  <span>{completedSaleReceipt.salespersonCode}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 py-1 text-[11px]">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                <span>Item</span>
                <span>Total</span>
              </div>
              {completedSaleReceipt.items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-medium line-clamp-1">{it.productName}</span>
                    <span className="font-bold">Rs. {it.totalAmount.toLocaleString('en-PK')}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {it.quantity} x Rs. {it.unitPrice.toLocaleString('en-PK')}{' '}
                    {it.variationDetails ? `(${it.variationDetails})` : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="space-y-1 pt-2 border-t border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {completedSaleReceipt.subtotal.toLocaleString('en-PK')}</span>
              </div>
              {completedSaleReceipt.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount ({completedSaleReceipt.discountReason || 'Special'}):</span>
                  <span>-Rs. {completedSaleReceipt.discountAmount.toLocaleString('en-PK')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                <span>Total Paid:</span>
                <span>Rs. {completedSaleReceipt.totalAmount.toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Payment Mode:</span>
                <span className="uppercase">{completedSaleReceipt.paymentMethod} (PAID)</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
              <p>Thank you for shopping at 100DAGAR!</p>
              <p>WE BUY WE SELL · Guaranteed Wholesale Lot Rates</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `*100DAGAR In-Store Walk-in Receipt*\n*${completedSaleReceipt.receiptNumber}*\n\nBranch: ${completedSaleReceipt.branchName}\nCustomer: ${completedSaleReceipt.customerName}\nTotal Paid: Rs. ${completedSaleReceipt.totalAmount.toLocaleString('en-PK')}\n\nThank you for shopping with us!`;
                  openWhatsAppDirect(completedSaleReceipt.customerPhone, text);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp Receipt
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Thermal
              </button>
              <button
                type="button"
                onClick={() => setCompletedSaleReceipt(null)}
                className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastBanner
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
