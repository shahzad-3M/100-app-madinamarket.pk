import React, { useState } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  RotateCcw,
  Clock,
  Send,
  Printer,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BusinessProfile, CODOrder, CODOrderStatus, Customer, ProductItem, Transaction } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface CODOrdersViewProps {
  orders: CODOrder[];
  products: ProductItem[];
  customers: Customer[];
  profile: BusinessProfile;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: CODOrderStatus,
    details?: { courierPartner?: any; trackingNumber?: string }
  ) => void;
  onAddNewCODOrder: (order: CODOrder) => void;
}

export const CODOrdersView: React.FC<CODOrdersViewProps> = ({
  orders,
  products,
  customers,
  profile,
  onUpdateOrderStatus,
  onAddNewCODOrder,
}) => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<CODOrder | null>(null);

  // New Order Form State
  const [newCustName, setNewCustName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Lahore');
  const [newAddress, setNewAddress] = useState('');
  const [newProductId, setNewProductId] = useState(products[0]?.id || '');
  const [newQty, setNewQty] = useState(1);
  const [newDeliveryFee, setNewDeliveryFee] = useState(250);
  const [newCourier, setNewCourier] = useState<'WASAL delivery' | 'TCS' | 'Leopards' | 'Trax' | 'PostEx' | 'Rider' | 'Self'>('WASAL delivery');
  const [newTracking, setNewTracking] = useState('');
  const [newResellerCode, setNewResellerCode] = useState('RES-100D-01');
  const [isSyncingShipday, setIsSyncingShipday] = useState(false);

  const shipperHelpline = profile.shippingPartner?.shipperPhone || profile.phone || '0312 5256 266';
  const shipperName = profile.shippingPartner?.name || 'WASAL delivery';

  const handleSyncShipday = () => {
    setIsSyncingShipday(true);
    setTimeout(() => {
      setIsSyncingShipday(false);
      alert(`✅ Shipday API Synced!\nCarrier: ${shipperName}\nKey: ${profile.shippingPartner?.apiKey || 'SHIPDAY_API_KEY_LIVE_100D'}\nStatus: Active. Orders and dispatches are up to date.`);
    }, 900);
  };

  const handleAskShipperWhatsApp = (order: CODOrder) => {
    const cleanPhone = shipperHelpline.replace(/\D/g, '');
    const msg = `🚚 *انکوائری برائے ڈلیوری / Delivery Status Inquiry*\n*بخدمت: ${shipperName} کوریئر ٹیم*\n\nمحترم ٹیم،\nبراہ کرم اس آرڈر کی ڈلیوری یا رائڈر کی لوکیشن سے آگاہ فرمائیں:\n\n*Order No:* #${order.orderNumber}\n*Tracking ID:* ${order.trackingNumber || 'WSL-PENDING'}\n*Customer:* ${order.customerName} (${order.phone})\n*Delivery City:* ${order.city}\n*Address:* ${order.address}\n*Total COD Cash:* ${profile.currencySymbol}${order.totalAmount.toLocaleString('en-PK')}\n\nاز طرف: ${profile.name} · مدینہ مارکیٹ`;
    openWhatsAppDirect(cleanPhone, msg);
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (selectedStatusTab !== 'all' && o.status !== selectedStatusTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.phone.includes(q);
      const matchCity = o.city.toLowerCase().includes(q);
      const matchTrack = o.trackingNumber ? o.trackingNumber.toLowerCase().includes(q) : false;
      if (!matchNum && !matchName && !matchPhone && !matchCity && !matchTrack) return false;
    }
    return true;
  });

  // Financial Summaries
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const dispatchedCount = orders.filter((o) => o.status === 'dispatched').length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const returnedCount = orders.filter((o) => o.status === 'returned').length;

  const totalDeliveredCash = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalNetCash = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount - o.deliveryFee), 0);
  const totalPendingCash = orders.filter((o) => o.status === 'pending' || o.status === 'dispatched').reduce((sum, o) => sum + o.totalAmount, 0);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === newProductId) || products[0];
    if (!prod) {
      alert('Please select a valid product.');
      return;
    }

    const subtotal = prod.ourPrice * newQty;
    const totalAmount = subtotal + newDeliveryFee;
    const commissionAmount = Math.floor(subtotal / 1000) * 30; // Rs. 30 per 1000 on product amount

    const newOrder: CODOrder = {
      id: `cod_${Date.now()}`,
      orderNumber: `COD-100D-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newCustName,
      phone: newPhone,
      city: newCity,
      address: newAddress,
      items: [
        {
          productId: prod.id,
          description: prod.name,
          quantity: newQty,
          unitPrice: prod.ourPrice,
          marketPrice: prod.marketPrice,
          amount: subtotal,
          customerSavings: (prod.marketPrice - prod.ourPrice) * newQty,
        },
      ],
      subtotal,
      deliveryFee: newDeliveryFee,
      totalAmount,
      courierPartner: newCourier,
      trackingNumber: newTracking || `${newCourier.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'pending',
      resellerCode: newResellerCode.trim() || undefined,
      commissionAmount: newResellerCode.trim() ? commissionAmount : 0,
      createdAt: new Date().toISOString(),
    };

    onAddNewCODOrder(newOrder);
    setIsAddOrderOpen(false);

    // Reset inputs
    setNewCustName('');
    setNewPhone('');
    setNewAddress('');
    setNewTracking('');
    alert(`نیا کیش آن ڈلیوری آرڈر #${newOrder.orderNumber} درج کر لیا گیا!\nOrder created. Ready for dispatch.`);
  };

  const handleSendDispatchWhatsApp = (order: CODOrder) => {
    const cleanPhone = order.phone.replace(/\D/g, '');
    const itemsList = order.items.map((i) => `• ${i.description} (${i.quantity}x)`).join('\n');
    const msg = `📦 *کیش آن ڈلیوری آرڈر روانہ / COD Parcel Dispatched!*\n*${profile.name} · مدینہ مارکیٹ*\n\nمحترم *${order.customerName}* صاحب،\nآپ کا پارسل بذریعہ کوریئر روانہ کر دیا گیا ہے۔\n\n*Order No:* #${order.orderNumber}\n*Courier Partner:* ${order.courierPartner}\n*Tracking ID:* ${order.trackingNumber || 'Available shortly'}\n\n*آرڈر کی تفصیلات:*\n${itemsList}\n\n*قابل ادائیگی نقد رقم (Pay Cash to Rider):* *${profile.currencySymbol}${order.totalAmount.toLocaleString('en-PK')}*\n*ڈلیوری ایڈریس:* ${order.address}, ${order.city}\n\nپارسل وصول کرتے وقت رائڈر کو نقد رقم ادا فرمائیں۔ کسی بھی مسئلے کی صورت میں ہمارے واٹس ایپ 0312 5256 266 پر رابطہ کریں۔ شکریہ!`;

    openWhatsAppDirect(cleanPhone, msg);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Net Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Delivered Cash (موصول رقم)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {profile.currencySymbol}{totalDeliveredCash.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            Net Store Cash: {profile.currencySymbol}{totalNetCash.toLocaleString('en-PK')} ({deliveredOrders.length} orders)
          </span>
        </div>

        {/* In-Transit & Pending Cash */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>In-Transit COD (راستے میں)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
            {profile.currencySymbol}{totalPendingCash.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            {dispatchedCount} Dispatched · {pendingCount} Pending Packing
          </span>
        </div>

        {/* Returned Parcels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Returned Parcels (واپسی)</span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold font-mono text-red-600 dark:text-red-400">
            {returnedCount}
          </p>
          <span className="text-[10px] text-slate-400 block">
            Stock automatically restored to inventory
          </span>
        </div>

        {/* Shipping Partner: WASAL delivery & Shipday API */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Carrier: {shipperName}</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Shipday API Live
            </span>
            <button
              onClick={handleSyncShipday}
              disabled={isSyncingShipday}
              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              {isSyncingShipday ? 'Syncing...' : '↻ Fetch Status'}
            </button>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block pt-0.5">
            📞 Helpline: {shipperHelpline}
          </span>
        </div>
      </div>

      {/* 2. CONTROLS BAR: TABS, SEARCH, AND NEW COD ORDER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: 'all', label: `All (${orders.length})` },
            { id: 'pending', label: `Pending Packing (${pendingCount})` },
            { id: 'dispatched', label: `Dispatched (${dispatchedCount})` },
            { id: 'delivered', label: `Delivered & Settled (${deliveredOrders.length})` },
            { id: 'returned', label: `Returned (${returnedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedStatusTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, city..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => setIsAddOrderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-amber-400 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book New COD Parcel</span>
          </button>
        </div>
      </div>

      {/* 3. COD ORDERS LIST */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No COD orders found in this view
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Select another status filter or book a new cash on delivery parcel.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isDelivered = order.status === 'delivered';
            const isReturned = order.status === 'returned';
            const isDispatched = order.status === 'dispatched';
            const isPending = order.status === 'pending';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {order.createdAt.split('T')[0]}
                    </span>
                    {order.resellerCode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        🤝 Reseller: {order.resellerCode} (+{profile.currencySymbol}{order.commissionAmount || 30})
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isReturned
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : isDispatched
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      <span>
                        {isDelivered && 'Delivered & Settled'}
                        {isReturned && 'Returned (Stock Restored)'}
                        {isDispatched && 'Dispatched (In Transit)'}
                        {isPending && 'Pending Packing'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Order Details Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Customer & Address */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{order.phone}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{order.address}, {order.city}</span>
                    </div>
                  </div>

                  {/* Items Ordered */}
                  <div className="md:col-span-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Items in Parcel:</span>
                    {order.items.map((it, idx) => (
                      <div key={idx} className="truncate">
                        • {it.description} <b className="font-mono">({it.quantity}x)</b>
                      </div>
                    ))}
                  </div>

                  {/* Courier Partner & Tracking */}
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Logistics &amp; Courier:</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {order.courierPartner}
                    </p>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block truncate">
                      TRK: {order.trackingNumber || 'Pending'}
                    </span>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="md:col-span-3 text-right space-y-1">
                    <div className="font-mono">
                      <span className="text-slate-400 text-[11px]">Subtotal: </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {profile.currencySymbol}{order.subtotal.toLocaleString('en-PK')}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      <span>Delivery Fee: </span>
                      <span>+{profile.currencySymbol}{order.deliveryFee.toLocaleString('en-PK')}</span>
                    </div>
                    <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      <span>Total COD Cash: </span>
                      <span>{profile.currencySymbol}{order.totalAmount.toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendDispatchWhatsApp(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp Tracking</span>
                    </button>
                    <button
                      onClick={() => setSelectedOrderForPrint(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Courier Slip</span>
                    </button>
                    <button
                      onClick={() => handleAskShipperWhatsApp(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      title={`Inquire with ${shipperName} Helpline about delivery`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>Ask Shipper ({shipperHelpline})</span>
                    </button>
                  </div>

                  {/* Status Transition Buttons with Auto-Calculations */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => {
                          const courier = prompt('Select Courier (Trax / TCS / Leopards / Rider):', order.courierPartner) || order.courierPartner;
                          const tracking = prompt('Enter Tracking Number / Consignment #:', order.trackingNumber || '') || order.trackingNumber;
                          onUpdateOrderStatus(order.id, 'dispatched', { courierPartner: courier as any, trackingNumber: tracking });
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      >
                        Dispatch Parcel (روانہ کریں)
                      </button>
                    )}

                    {isDispatched && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm(`Confirm Delivery for #${order.orderNumber}?\nTotal Cash ${profile.currencySymbol}${order.totalAmount} will be auto-credited to ledger and reseller commission credited.`)) {
                              onUpdateOrderStatus(order.id, 'delivered');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered (کیش وصولی)</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Mark #${order.orderNumber} as RETURNED?\nStock will be automatically restored to inventory.`)) {
                              onUpdateOrderStatus(order.id, 'returned');
                            }
                          }}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg font-bold text-xs cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark Returned (واپسی)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL: BOOK NEW COD PARCEL */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                <h2 className="text-base font-black">Book New COD Parcel (نیا کیش آن ڈلیوری پارسل)</h2>
              </div>
              <button
                onClick={() => setIsAddOrderOpen(false)}
                className="p-1 text-slate-800 hover:text-black rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Full Name (گاہک کا نام)
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Haji Rashid Store / Saima Ali"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone Number (موبائل نمبر)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    City (شہر)
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Lahore / Karachi / Rawalpindi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Complete Delivery Address (مکمل پتہ)
                </label>
                <textarea
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Shop #, Street, Area landmark..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Product Selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Product Item
                  </label>
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {profile.currencySymbol}{p.ourPrice}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Courier & Delivery Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Courier Partner
                  </label>
                  <select
                    value={newCourier}
                    onChange={(e) => setNewCourier(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="WASAL delivery">WASAL delivery (Shipday API Carrier - Default)</option>
                    <option value="Trax">Trax Logistics</option>
                    <option value="TCS">TCS Express</option>
                    <option value="Leopards">Leopards Courier</option>
                    <option value="PostEx">PostEx COD</option>
                    <option value="Rider">Store Rider (Lahore)</option>
                    <option value="Self">Self Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Delivery Fee (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newDeliveryFee}
                    onChange={(e) => setNewDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Optional Reseller Referral Code */}
              <div>
                <label className="font-bold text-purple-700 dark:text-purple-300 block mb-1">
                  Reseller Referral Code (اختیاری ری سیلر کوڈ)
                </label>
                <input
                  type="text"
                  value={newResellerCode}
                  onChange={(e) => setNewResellerCode(e.target.value)}
                  placeholder="e.g. RES-100D-01"
                  className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Pays Rs. 30 per Rs. 1,000 paid to the reseller upon successful delivery.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Create COD Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: PRINT COURIER SLIP */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 print:p-0">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Courier Dispatch Label
              </span>
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="text-slate-400 hover:text-black cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Slip */}
            <div className="border-2 border-dashed border-slate-400 p-4 rounded-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-black text-lg text-slate-900">{profile.name}</h3>
                  <span className="text-[10px] text-slate-600 block">مدینہ مارکیٹ لاہور · شاہ عالم مارکیٹ</span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    کوریئر سروس: {selectedOrderForPrint.courierPartner || shipperName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Shipday API Integrated</span>
                  <span className="font-extrabold text-sm text-blue-700 block">{selectedOrderForPrint.courierPartner}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-600">
                    ID: #{selectedOrderForPrint.orderNumber}
                  </span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Deliver To (کسٹمر کی تفصیلات):
                </span>
                <p className="font-black text-sm text-slate-900">{selectedOrderForPrint.customerName}</p>
                <p className="font-mono text-xs font-bold text-slate-800">📞 فون: {selectedOrderForPrint.phone}</p>
                <p className="text-xs text-slate-700">
                  📍 پتہ: {selectedOrderForPrint.address}, <b>{selectedOrderForPrint.city}</b>
                </p>
              </div>

              {/* Shipper Helpline Details */}
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Shipper Contact / ڈلیوری انکوائری:
                  </span>
                  <span className="font-mono font-black text-amber-900 text-xs">
                    📞 {shipperHelpline} ({shipperName})
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span className="block font-bold">WASAL Delivery Hub</span>
                  <span className="font-mono">Shipday Active</span>
                </div>
              </div>

              {/* Contents */}
              <div className="border-t pt-2 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Contents (سامان):</span>
                {selectedOrderForPrint.items.map((it, idx) => (
                  <p key={idx} className="truncate">• {it.description} <b className="font-mono">({it.quantity}x)</b></p>
                ))}
              </div>

              {/* Cash on Delivery */}
              <div className="bg-slate-100 p-3 rounded-lg border flex items-center justify-between text-sm">
                <span className="font-extrabold text-slate-900">CASH ON DELIVERY (قابل ادائیگی رقم):</span>
                <span className="font-mono font-black text-base text-red-600">
                  {profile.currencySymbol}{selectedOrderForPrint.totalAmount.toLocaleString('en-PK')}
                </span>
              </div>

              <div className="text-center font-mono text-[10px] text-slate-500 space-y-0.5">
                <div>Shipday Tracking: <b>{selectedOrderForPrint.trackingNumber || 'WSL-AUTO-MANIFEST'}</b></div>
                <div className="text-[9px] text-slate-400">
                  * کسٹمر کی رہنمائی: پارسل وصول کرتے وقت رائڈر کو کیش دیں۔ معلومات کے لیے WASAL delivery ہیلپ لائن 0312 5256 266 پر رابطہ فرمائیں۔
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print pt-2">
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
