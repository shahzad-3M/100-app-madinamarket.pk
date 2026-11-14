import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Send,
  Printer,
  Trash2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Edit2,
  X,
} from 'lucide-react';
import { BusinessProfile, Customer, Transaction } from '../types';
import { defaultDeliveryCities } from '../utils/defaultData';
import { AddressFieldsGroup } from './AddressFieldsGroup';
import { openWhatsAppDirect, formatPaymentChannelsText } from '../utils/whatsapp';

interface CustomersViewProps {
  customers: Customer[];
  transactions: Transaction[];
  profile: BusinessProfile;
  selectedCustomerId?: string;
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer: () => void;
  onOpenAddTransaction: (type: 'credit' | 'debit', customerId: string) => void;
  onOpenScheduleWhatsApp: (customerId: string) => void;
  onOpenInvoiceModal: (tx: Transaction, customer: Customer) => void;
  onDeleteTransaction: (txId: string) => void;
  onUpdateCustomer?: (updated: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  transactions,
  profile,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenAddTransaction,
  onOpenScheduleWhatsApp,
  onOpenInvoiceModal,
  onDeleteTransaction,
  onUpdateCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'settled' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'name' | 'recent'>('balance_desc');
  const [editingAddressCustomer, setEditingAddressCustomer] = useState<Customer | null>(null);
  const [draftCity, setDraftCity] = useState('');
  const [draftArea, setDraftArea] = useState('');
  const [draftMohalla, setDraftMohalla] = useState('');
  const [draftLandmark, setDraftLandmark] = useState('');
  const [draftAddress, setDraftAddress] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Active selected customer
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find((c) => c.id === selectedCustomerId) || customers[0];
    }
    return customers[0] || null;
  }, [selectedCustomerId, customers]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          c.name.toLowerCase().includes(q) ||
          (c.urduName && c.urduName.includes(searchQuery)) ||
          c.phone.includes(searchQuery) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.mohalla && c.mohalla.toLowerCase().includes(q)) ||
          (c.landmark && c.landmark.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        if (filterType === 'due') return c.balance > 0;
        if (filterType === 'settled') return c.balance === 0;
        if (filterType === 'overdue') {
          if (c.balance <= 0) return false;
          const credits = transactions.filter((t) => t.customerId === c.id && t.type === 'credit');
          return credits.some((t) => t.dueDate && t.dueDate < todayStr);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'balance_desc') return b.balance - a.balance;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [customers, searchQuery, filterType, sortBy, transactions, todayStr]);

  // Transactions for active customer with running balance
  const activeCustomerTransactions = useMemo(() => {
    if (!activeCustomer) return [];

    const list = transactions
      .filter((t) => t.customerId === activeCustomer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return list.map((tx) => {
      if (tx.type === 'credit') {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }
      return {
        ...tx,
        runningBalance: running,
      };
    });
  }, [activeCustomer, transactions]);

  const displayTransactions = useMemo(() => {
    return [...activeCustomerTransactions].reverse();
  }, [activeCustomerTransactions]);

  const handlePrintLedger = () => {
    window.print();
  };

  const handleSendStatementWhatsApp = () => {
    if (!activeCustomer) return;
    const paymentText = formatPaymentChannelsText(profile);
    const msg = `*Ledger Statement / کھاتہ تفصیل - ${profile.name}*\n\nمحترم *${activeCustomer.name}* صاحب،\nتاریخ: ${todayStr}\nکل واجب الادا رقم (Total Outstanding Balance): *${profile.currencySymbol} ${activeCustomer.balance.toLocaleString('en-PK')}*\nPayment Terms: ${activeCustomer.paymentTermsDays} Days\n\n*Payment Channels / ادائیگی کے ذرائع:*\n${paymentText}\n\nThank you for doing business with 100DAGAR! جزاک اللہ۔`;
    openWhatsAppDirect(activeCustomer.phone, msg);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Customer Directory (5 Cols on lg) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs no-print">
        {/* Directory Header & Add Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Customer Accounts (کھاتہ دار / پارٹیاں)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredCustomers.length} registered customers
            </p>
          </div>
          <button
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Party / نئی پارٹی
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, Urdu name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('due')}
              className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'due'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Due (بقایا)
            </button>
            <button
              onClick={() => setFilterType('overdue')}
              className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'overdue'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setFilterType('settled')}
              className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'settled'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Settled
            </button>
          </div>
        </div>

        {/* Customer List items */}
        <div className="mt-3 space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No customers match your search criteria.
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected = activeCustomer?.id === c.id;
              const hasDue = c.balance > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800'
                      : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {c.name} {c.urduName && <span className="font-normal font-sans text-slate-500 text-[11px]">({c.urduName})</span>}
                      </p>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        c.customerType === 'retail'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {c.customerType === 'retail' ? 'Retail' : 'Individual'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{c.phone}</span>
                      <span>·</span>
                      <span>Terms: {c.paymentTermsDays}d</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold font-mono tabular-nums block ${
                        hasDue ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
                      }`}
                    >
                      {profile.currencySymbol} {Math.abs(c.balance).toLocaleString('en-PK')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {c.balance > 0 ? 'You will get' : c.balance < 0 ? 'You will give' : 'Settled'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Customer Ledger Detail View (7 Cols on lg) */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        {activeCustomer ? (
          <div>
            {/* Customer Profile Header */}
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-slate-950 dark:text-white">
                    {activeCustomer.name}
                  </h1>
                  {activeCustomer.urduName && (
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      {activeCustomer.urduName}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {activeCustomer.phone}
                    </span>
                    {activeCustomer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {activeCustomer.email}
                      </span>
                    )}
                    {activeCustomer.ntnNumber && (
                      <span>NTN: <b className="font-mono">{activeCustomer.ntnNumber}</b></span>
                    )}
                  </div>
                  {(activeCustomer.address || activeCustomer.city || activeCustomer.area || activeCustomer.mohalla || activeCustomer.landmark) && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 space-y-0.5">
                      <p className="flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          {[
                            activeCustomer.address,
                            activeCustomer.mohalla,
                            activeCustomer.area,
                            activeCustomer.city,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </p>
                      {activeCustomer.landmark && (
                        <p className="text-[11px] text-slate-500 pl-4">
                          Nearby Landmark: <b className="text-slate-700 dark:text-slate-300">{activeCustomer.landmark}</b>
                        </p>
                      )}
                    </div>
                  )}
                  {onUpdateCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressCustomer(activeCustomer);
                        setDraftCity(activeCustomer.city || 'Muzaffarabad');
                        setDraftArea(activeCustomer.area || '');
                        setDraftMohalla(activeCustomer.mohalla || '');
                        setDraftLandmark(activeCustomer.landmark || '');
                        setDraftAddress(activeCustomer.address || '');
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer no-print"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit City / Area / Mohalla / Landmark</span>
                    </button>
                  )}
                </div>

                {/* Balance Box */}
                <div className="text-right sm:self-center bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Current Balance Due / بقایا رقم
                  </span>
                  <span
                    className={`text-xl font-bold font-mono tabular-nums ${
                      activeCustomer.balance > 0
                        ? 'text-red-600 dark:text-red-400'
                        : activeCustomer.balance < 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {profile.currencySymbol} {Math.abs(activeCustomer.balance).toLocaleString('en-PK')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {activeCustomer.balance > 0 ? 'Pending Collection (ادھار)' : 'Account Settled'}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mt-4 no-print">
                <button
                  onClick={() => onOpenAddTransaction('credit', activeCustomer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  + Gave (ادھار دیا)
                </button>

                <button
                  onClick={() => onOpenAddTransaction('debit', activeCustomer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  + Got (رقم وصول کی)
                </button>

                <button
                  onClick={() => onOpenScheduleWhatsApp(activeCustomer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Schedule WhatsApp
                </button>

                <button
                  onClick={handleSendStatementWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp Statement
                </button>

                <button
                  onClick={handlePrintLedger}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ml-auto cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Ledger
                </button>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Transaction Ledger History ({activeCustomerTransactions.length} entries)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Credit Limit: {profile.currencySymbol} {activeCustomer.creditLimit.toLocaleString('en-PK')}
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Details / Invoice</th>
                      <th className="py-2.5 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">
                        You Gave / ادھار (+)
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">
                        You Got / وصولی (-)
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                      <th className="py-2.5 px-3 font-semibold text-center no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No transactions recorded for this customer yet. Use the buttons above to record an entry.
                        </td>
                      </tr>
                    ) : (
                      displayTransactions.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-850/70 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="py-2.5 px-3 min-w-[160px]">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {tx.notes || (isCredit ? 'Credit invoice' : 'Payment received')}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                {tx.invoiceNumber && <span className="font-mono">#{tx.invoiceNumber}</span>}
                                {tx.dueDate && isCredit && <span>· Due: {tx.dueDate}</span>}
                                {tx.paymentMode && <span className="uppercase text-emerald-600 font-semibold">· {tx.paymentMode}</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {isCredit ? `${profile.currencySymbol} ${tx.amount.toLocaleString('en-PK')}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {!isCredit ? `${profile.currencySymbol} ${tx.amount.toLocaleString('en-PK')}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {profile.currencySymbol} {tx.runningBalance.toLocaleString('en-PK')}
                            </td>
                            <td className="py-2.5 px-3 text-center no-print whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => onOpenInvoiceModal(tx, activeCustomer)}
                                  title="View Bill / Receipt"
                                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(tx.id)}
                                  title="Delete Entry"
                                  className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            Please select or add a customer to view their Khatta ledger.
          </div>
        )}
      </div>

      {/* Edit Customer Location & Address Modal */}
      {editingAddressCustomer && onUpdateCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#FFD200] text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <MapPin className="w-4 h-4" />
                <span>Update Address — {editingAddressCustomer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingAddressCustomer(null)}
                className="p-1 rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateCustomer({
                  ...editingAddressCustomer,
                  city: draftCity.trim() || undefined,
                  area: draftArea.trim() || undefined,
                  mohalla: draftMohalla.trim() || undefined,
                  landmark: draftLandmark.trim() || undefined,
                  address: draftAddress.trim() || undefined,
                });
                setEditingAddressCustomer(null);
              }}
              className="p-5 space-y-4"
            >
              <AddressFieldsGroup
                cities={
                  profile.deliveryCities && profile.deliveryCities.length > 0
                    ? profile.deliveryCities
                    : defaultDeliveryCities
                }
                city={draftCity}
                area={draftArea}
                mohalla={draftMohalla}
                landmark={draftLandmark}
                address={draftAddress}
                filterActiveCitiesOnly={false}
                showCompleteAddress={true}
                onChange={(patch) => {
                  if (patch.city !== undefined) setDraftCity(patch.city);
                  if (patch.area !== undefined) setDraftArea(patch.area);
                  if (patch.mohalla !== undefined) setDraftMohalla(patch.mohalla);
                  if (patch.landmark !== undefined) setDraftLandmark(patch.landmark);
                  if (patch.address !== undefined) setDraftAddress(patch.address);
                }}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAddressCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-lg cursor-pointer"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
