import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShoppingBag,
  Percent,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Smartphone,
  FileText,
  CalendarClock,
  AlertCircle,
  RotateCcw,
  Plus,
  Settings2,
} from 'lucide-react';
import { AppUser, BusinessProfile, CartItem, Customer, DeliveryCityConfig, PaymentMode, SalePaymentType } from '../types';
import { defaultDeliveryCities } from '../utils/defaultData';

export interface CheckoutSalePayload {
  customerId: string;
  buyerDetails: {
    name: string;
    phone: string;
    city: string;
    address: string;
  };
  saleType: SalePaymentType;
  paidAmount: number;
  dueBalance: number;
  paymentMode: PaymentMode;
  paymentTermsDays: number;
  dueDate: string;
  notes: string;
  sendWhatsApp: boolean;
  resellerCode?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customers: Customer[];
  profile: BusinessProfile;
  isCustomerView?: boolean;
  isAdmin?: boolean;
  currentUser?: AppUser;
  onSaveProfile?: (profile: BusinessProfile) => void;
  onCompleteSale: (saleData: CheckoutSalePayload) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  customers,
  profile,
  isCustomerView = false,
  isAdmin = false,
  currentUser,
  onSaveProfile,
  onCompleteSale,
}) => {
  const cityConfigs: DeliveryCityConfig[] =
    profile.deliveryCities && profile.deliveryCities.length > 0
      ? profile.deliveryCities
      : defaultDeliveryCities;
  const allowedCities = cityConfigs.filter((c) => c.allowed);
  const defaultActiveCity =
    allowedCities.find((c) => c.name.toLowerCase() === 'muzaffarabad')?.name ||
    allowedCities[0]?.name ||
    'Muzaffarabad';

  const canManageCities =
    Boolean(onSaveProfile) &&
    (isAdmin ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager');

  const [showCityManager, setShowCityManager] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const isAuthenticatedCustomer =
    currentUser?.isAuthenticated === true && Boolean(currentUser.customerId);

  const matchedLoggedCustomer = isAuthenticatedCustomer
    ? customers.find(
        (c) =>
          c.id === currentUser?.customerId ||
          (currentUser?.phone &&
            c.phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''))
      )
    : undefined;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (!isCustomerView && customers[0]?.id) {
      return customers[0].id;
    }
    if (matchedLoggedCustomer) {
      return matchedLoggedCustomer.id;
    }
    return 'new_checkout_buyer';
  });

  // Basic Checkout Form States
  const [buyerName, setBuyerName] = useState<string>(
    () => matchedLoggedCustomer?.name || (currentUser?.isAuthenticated ? currentUser.name : '') || ''
  );
  const [buyerPhone, setBuyerPhone] = useState<string>(
    () => matchedLoggedCustomer?.phone || (currentUser?.isAuthenticated ? currentUser.phone || '' : '') || ''
  );
  const [buyerCity, setBuyerCity] = useState<string>(defaultActiveCity);
  const [buyerAddress, setBuyerAddress] = useState<string>(
    () => matchedLoggedCustomer?.address || matchedLoggedCustomer?.area || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [resellerCode, setResellerCode] = useState<string>('');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);

  const isCreditAuthorizedSeller =
    !isCustomerView &&
    Boolean(
      currentUser?.isAuthenticated &&
        (currentUser.role === 'super_admin' ||
          currentUser.role === 'admin' ||
          ((currentUser.role === 'manager' || currentUser.role === 'staff') &&
            (currentUser.canAuthorizeCreditSale ||
              currentUser.managerAuthorities?.canAuthorizeCreditSale)))
    );

  // Payment States (Customers/Guests: COD or Full Payment only. Credit Sale ONLY for authorized sellers.)
  const [saleType, setSaleType] = useState<SalePaymentType>(isCustomerView ? 'cod' : 'full');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(isCustomerView ? 'cod' : 'easypaisa');
  const [creditTermsDays, setCreditTermsDays] = useState<number>(7);
  const [creditDueDate, setCreditDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formError, setFormError] = useState<string>('');

  // Sync POS selection into basic checkout form
  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    if (isCustomerView || !isCreditAuthorizedSeller) {
      if (saleType === 'time_credit' || saleType === 'partial') {
        setSaleType(isCustomerView ? 'cod' : 'full');
      }
    }
    if (isCustomerView) {
      if (matchedLoggedCustomer) {
        setSelectedCustomerId(matchedLoggedCustomer.id);
        setBuyerName(matchedLoggedCustomer.name || '');
        setBuyerPhone(matchedLoggedCustomer.phone || '');
        const custCityAllowed = allowedCities.some(
          (c) => c.name.toLowerCase() === (matchedLoggedCustomer.city || '').toLowerCase()
        );
        setBuyerCity(custCityAllowed && matchedLoggedCustomer.city ? matchedLoggedCustomer.city : defaultActiveCity);
        setBuyerAddress(matchedLoggedCustomer.address || matchedLoggedCustomer.area || '');
      } else {
        setSelectedCustomerId('new_checkout_buyer');
        setBuyerName(currentUser?.isAuthenticated ? currentUser.name : '');
        setBuyerPhone(currentUser?.isAuthenticated ? currentUser.phone || '' : '');
        setBuyerCity(defaultActiveCity);
      }
    } else if (selectedCustomerId && selectedCustomerId !== 'new_checkout_buyer') {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        setBuyerName(cust.name || '');
        setBuyerPhone(cust.phone || '');
        const custCityAllowed = allowedCities.some(
          (c) => c.name.toLowerCase() === (cust.city || '').toLowerCase()
        );
        setBuyerCity(custCityAllowed && cust.city ? cust.city : defaultActiveCity);
        setBuyerAddress(cust.address || cust.area || '');
      }
    } else {
      setBuyerCity(defaultActiveCity);
    }
  }, [isOpen, isCustomerView, isCreditAuthorizedSeller, selectedCustomerId, matchedLoggedCustomer, currentUser, customers]);

  if (!isOpen) return null;

  // Cart totals
  const totalMarketPrice = cart.reduce((acc, it) => acc + it.marketPrice * it.quantity, 0);
  const totalOurPrice = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const totalSavings = totalMarketPrice - totalOurPrice;
  const savingsPercent = totalMarketPrice > 0 ? Math.round((totalSavings / totalMarketPrice) * 100) : 0;

  const deliveryFee = saleType === 'cod' ? 250 : 0;
  const grandTotal = totalOurPrice + deliveryFee;

  const todayStr = new Date().toISOString().split('T')[0];

  const computeOffsetDate = (baseDateStr: string, offsetDays: number): string => {
    const d = new Date(baseDateStr || todayStr);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const softReminderPreviewDate = computeOffsetDate(creditDueDate, -3);
  const maxGracePreviewDate = computeOffsetDate(creditDueDate, 7);

  const handleToggleCityAllowed = (cityName: string) => {
    if (!onSaveProfile) return;
    const updatedCities = cityConfigs.map((c) =>
      c.name === cityName ? { ...c, allowed: !c.allowed } : c
    );
    onSaveProfile({ ...profile, deliveryCities: updatedCities });
    const nextAllowed = updatedCities.filter((c) => c.allowed);
    if (!nextAllowed.some((c) => c.name === buyerCity)) {
      setBuyerCity(
        nextAllowed.find((c) => c.name.toLowerCase() === 'muzaffarabad')?.name ||
          nextAllowed[0]?.name ||
          ''
      );
    }
  };

  const handleResetCities = () => {
    if (!onSaveProfile) return;
    const freshCities = defaultDeliveryCities.map((c) => ({ ...c }));
    onSaveProfile({ ...profile, deliveryCities: freshCities });
    setBuyerCity('Muzaffarabad');
  };

  const handleAddDeliveryCity = () => {
    if (!onSaveProfile || !newCityName.trim()) return;
    const trimmed = newCityName.trim();
    if (cityConfigs.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewCityName('');
      return;
    }
    const updatedCities = [...cityConfigs, { name: trimmed, allowed: true }];
    onSaveProfile({ ...profile, deliveryCities: updatedCities });
    setBuyerCity(trimmed);
    setNewCityName('');
  };

  const handleSelectExistingCustomer = (val: string) => {
    setSelectedCustomerId(val);
    if (val === 'new_checkout_buyer') {
      setBuyerName('');
      setBuyerPhone('');
      setBuyerCity(defaultActiveCity);
      setBuyerAddress('');
    } else {
      const cust = customers.find((c) => c.id === val);
      if (cust) {
        setBuyerName(cust.name);
        setBuyerPhone(cust.phone);
        const custCityAllowed = allowedCities.some(
          (c) => c.name.toLowerCase() === (cust.city || '').toLowerCase()
        );
        setBuyerCity(custCityAllowed && cust.city ? cust.city : defaultActiveCity);
        setBuyerAddress(cust.address || cust.area || '');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!buyerName.trim() || !buyerPhone.trim()) {
      setFormError('Please enter Full Name and Mobile Number to proceed with checkout.');
      return;
    }

    if (allowedCities.length === 0) {
      setFormError('No delivery cities are currently enabled. Please ask store admin to enable delivery cities.');
      return;
    }

    if (!buyerCity.trim() || !allowedCities.some((c) => c.name === buyerCity)) {
      setFormError('Selected city is not active for delivery. Please choose an allowed delivery city.');
      return;
    }

    if (saleType === 'cod' && !buyerAddress.trim()) {
      setFormError('Please enter your complete Delivery Address for Cash on Delivery.');
      return;
    }

    const effectiveSaleType: SalePaymentType =
      saleType === 'time_credit' && isCreditAuthorizedSeller ? 'time_credit' : saleType === 'cod' ? 'cod' : 'full';

    onCompleteSale({
      customerId: selectedCustomerId,
      buyerDetails: {
        name: buyerName.trim(),
        phone: buyerPhone.trim(),
        city: buyerCity.trim() || defaultActiveCity,
        address: buyerAddress.trim() || 'Counter Pickup / Direct Delivery',
      },
      saleType: effectiveSaleType,
      paidAmount: effectiveSaleType === 'full' ? totalOurPrice : 0,
      dueBalance: effectiveSaleType === 'time_credit' ? totalOurPrice : 0,
      paymentMode: effectiveSaleType === 'cod' ? 'cod' : effectiveSaleType === 'time_credit' ? 'other' : paymentMode,
      paymentTermsDays: effectiveSaleType === 'time_credit' ? creditTermsDays : 0,
      dueDate: effectiveSaleType === 'time_credit' ? creditDueDate : todayStr,
      notes:
        notes.trim() ||
        `Order: ${cart.map((c) => `${c.product.name} (${c.quantity}x)`).join(', ')}`,
      sendWhatsApp,
      resellerCode: resellerCode.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#FFD200] px-4 py-3 flex items-center justify-between text-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5" />
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Checkout &amp; Order Confirmation
              </h2>
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                100DAGAR · WE BUY WE SELL | {isCustomerView ? 'Online Checkout' : 'POS Terminal'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 text-xs overflow-y-auto">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {/* 1. POS Customer Quick Lookup (Only shown to Admin/Manager/Staff) */}
          {!isCustomerView && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Select Existing Customer or Enter New Buyer Below
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              >
                <option value="new_checkout_buyer">+ New Buyer / Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.urduName ? `(${c.urduName})` : ''} - {c.phone} [{c.city || 'Lahore'}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. BASIC CHECKOUT FORM (Name, Mobile, City, Delivery Address, Notes) */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <User className="w-4 h-4 text-amber-500" />
                <span>Customer &amp; Delivery Details (بنیادی آرڈر فارم)</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-500">Required *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mobile / WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Delivery City *
                  </label>
                  {canManageCities && (
                    <button
                      type="button"
                      onClick={() => setShowCityManager(!showCityManager)}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>{showCityManager ? 'Hide Cities' : 'Cities Setup'}</span>
                    </button>
                  )}
                </div>
                {allowedCities.length > 0 ? (
                  <select
                    value={allowedCities.some((c) => c.name === buyerCity) ? buyerCity : defaultActiveCity}
                    onChange={(e) => setBuyerCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {allowedCities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name} {city.name === 'Muzaffarabad' ? '(Default Active)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 text-[11px] font-semibold">
                    Delivery paused for all cities
                  </div>
                )}
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block mt-1">
                  ✓ {allowedCities.length} active delivery {allowedCities.length === 1 ? 'city' : 'cities'} (Default: Muzaffarabad)
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Complete Delivery Address *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required={saleType === 'cod'}
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="House / Shop #, Street, Sector / Town, Landmark"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Admin / Manager City Checkmark Allow/Disallow & Reset Panel */}
            {canManageCities && showCityManager && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] block">
                      Allowed Delivery Cities (Checkmark to Allow / Uncheck to Disable)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Muzaffarabad is the default active delivery city.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCities}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[10px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Cities</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {cityConfigs.map((c) => (
                    <label
                      key={c.name}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none ${
                        c.allowed
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={c.allowed}
                        onChange={() => handleToggleCityAllowed(c.name)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="Add new city name..."
                    className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddDeliveryCity}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-[11px] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add City</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Order Notes / Delivery Instructions (Optional)
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Deliver between 2 PM - 6 PM, call before arrival"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 3. Cart Summary & Customer Savings Banner */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-xs pb-2 border-b border-slate-200 dark:border-slate-700">
              <span>{cart.length} Products Ordered</span>
              <span className="font-mono">
                {profile.currencySymbol}{totalOurPrice.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[11px]">
              {cart.map((it) => (
                <div
                  key={it.product.id}
                  className="flex items-center justify-between text-slate-600 dark:text-slate-300"
                >
                  <span className="truncate max-w-[260px]">
                    {it.product.name} ({it.quantity}x)
                  </span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="text-slate-400 line-through">
                      {profile.currencySymbol}
                      {(it.marketPrice * it.quantity).toLocaleString('en-PK')}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {profile.currencySymbol}
                      {(it.unitPrice * it.quantity).toLocaleString('en-PK')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {saleType === 'cod' && (
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                <span>COD Standard Delivery Charges:</span>
                <span className="font-mono font-bold">
                  +{profile.currencySymbol}{deliveryFee.toLocaleString('en-PK')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span>Total Payable Amount:</span>
              <span className="font-mono text-base tabular-nums">
                {profile.currencySymbol}{grandTotal.toLocaleString('en-PK')}
              </span>
            </div>

            {/* Total Customer Savings Highlight */}
            {totalSavings > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 px-3 py-1.5 rounded-lg font-bold">
                <div className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>Total Customer Savings (کسٹمر بچت):</span>
                </div>
                <span className="font-mono text-sm">
                  {profile.currencySymbol}{totalSavings.toLocaleString('en-PK')} ({savingsPercent}% OFF)
                </span>
              </div>
            )}
          </div>

          {/* 4. Payment Mode (Customers/Guests: COD or Full Payment only. Credit Sale ONLY for authorized seller roles) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Select Payment Method (ادائیگی کا طریقہ منتخب کریں)
              </label>
              {isCreditAuthorizedSeller && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                  Authorized Credit Seller: {currentUser?.name}
                </span>
              )}
            </div>

            <div className={`grid grid-cols-1 ${isCreditAuthorizedSeller ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
              {/* Cash on Delivery (COD) */}
              <button
                type="button"
                onClick={() => {
                  setSaleType('cod');
                  setPaymentMode('cod');
                }}
                className={`py-3 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  saleType === 'cod'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 ring-2 ring-rose-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm block">Cash on Delivery (COD)</span>
                <span className="block text-[11px] font-normal mt-0.5">
                  پارسل وصول کرتے وقت نقد ادائیگی کریں
                </span>
              </button>

              {/* Full Payment (Online / Advance / Cash) */}
              <button
                type="button"
                onClick={() => {
                  setSaleType('full');
                  if (paymentMode === 'cod') setPaymentMode('easypaisa');
                }}
                className={`py-3 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  saleType === 'full'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-sm block">Full Payment (Instant Paid)</span>
                <span className="block text-[11px] font-normal mt-0.5">
                  مکمل آن لائن یا نقد ادائیگی
                </span>
              </button>

              {/* Seller Credit Sale (Strictly ONLY visible to authorized seller roles) */}
              {isCreditAuthorizedSeller && (
                <button
                  type="button"
                  onClick={() => {
                    setSaleType('time_credit');
                    setPaymentMode('other');
                  }}
                  className={`py-3 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    saleType === 'time_credit'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm block">Credit Sale (ادھار فروخت)</span>
                  <span className="block text-[11px] font-normal mt-0.5">
                    مجاز سیلر اتھارٹی · 3-Day Alert Cycle
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Seller Credit Authorization & 3-Stage Reminder Cycle Configuration */}
          {saleType === 'time_credit' && isCreditAuthorizedSeller && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                  Authorized Seller Credit Terms &amp; Reminder Schedule
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-100">
                  Role Authorized: {currentUser?.role?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Quick Credit Term:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[7, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setCreditTermsDays(days);
                          setCreditDueDate(computeOffsetDate(todayStr, days));
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold border cursor-pointer ${
                          creditTermsDays === days
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Due Date:
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={creditDueDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreditDueDate(val);
                      const diff = Math.max(
                        1,
                        Math.round(
                          (new Date(val).getTime() - new Date(todayStr).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      );
                      setCreditTermsDays(diff);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="font-bold text-amber-900 dark:text-amber-300">
                  Automated 3-Stage Collection Cycle:
                </div>
                <div>• Soft reminder before 3 days: <span className="font-mono font-bold">{softReminderPreviewDate}</span></div>
                <div>• Due date payment alert (1 week max grace): <span className="font-mono font-bold">{creditDueDate}</span> (Grace ends <span className="font-mono">{maxGracePreviewDate}</span>)</div>
                <div>• Overdue reminder every 3 days until settled</div>
              </div>
            </div>
          )}

          {/* COD Policy Notice */}
          {saleType === 'cod' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-600" /> Cash on Delivery (COD) Confirmation:
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                Pay cash directly to the courier rider upon parcel delivery: <b>Rs. {grandTotal.toLocaleString('en-PK')}</b> (includes Rs. {deliveryFee} shipping).
              </p>
            </div>
          )}

          {/* Payment Channel Selector when Full Payment is chosen */}
          {saleType === 'full' && (
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Payment Channel
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="sadapay">SadaPay</option>
                  <option value="bank_transfer">Meezan Bank Ltd (Islamic Banking)</option>
                  <option value="cash">Counter Cash (دکان پر نقد ادائیگی)</option>
                </select>
              </div>

              {(paymentMode === 'easypaisa' || paymentMode === 'jazzcash' || paymentMode === 'sadapay') && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Unified Mobile Wallet (EasyPaisa · JazzCash · SadaPay)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-md">
                      ایک ہی نمبر برائے تمام ادائیگیاں
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-urdu">
                        اکاؤنٹ نمبر برائے ایزی پیسہ، جاز کیش اور سادا پے:
                      </span>
                      <span className="font-mono text-base font-black text-slate-900 dark:text-white tracking-wider">
                        0312 5256 266
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-urdu">
                        اکاؤنٹ ٹائٹل:
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        100DAGAR · Shahzad Malik
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-amber-200 dark:border-amber-800/60 pt-1.5">
                    💡 نوٹ: رقم کی منتقلی کے بعد تصدیقی رسید / اسکرین شاٹ واٹس ایپ کر دیں۔
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Optional Reseller / Salesperson Referral Code */}
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
            <label className="font-bold text-purple-900 dark:text-purple-200 block text-xs">
              Referral Code (Optional / ریفرل کوڈ):
            </label>
            <input
              type="text"
              value={resellerCode}
              onChange={(e) => setResellerCode(e.target.value)}
              placeholder="e.g. RES-100D-01 or SP-SHAHALAM-01"
              className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase text-xs"
            />
          </div>

          {/* WhatsApp Instant Confirmation Checkbox */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <input
              type="checkbox"
              id="sendWhatsApp"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <label
              htmlFor="sendWhatsApp"
              className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Send instant order receipt &amp; confirmation via WhatsApp ({buyerPhone || 'Your Phone'})
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Place Order ({profile.currencySymbol}{grandTotal.toLocaleString('en-PK')})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
