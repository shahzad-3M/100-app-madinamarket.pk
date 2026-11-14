import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import { BusinessProfile, Customer, PaymentMode, Transaction, TransactionType } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>, sendWhatsApp: boolean) => void;
  customers: Customer[];
  profile: BusinessProfile;
  initialType?: TransactionType;
  initialCustomerId?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  profile,
  initialType = 'credit',
  initialCustomerId,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || (customers[0]?.id || ''));
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('easypaisa');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');

  // Line items support
  const [showItemized, setShowItemized] = useState<boolean>(false);
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number; amount: number }>>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  useEffect(() => {
    setType(initialType);
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
    } else if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [initialType, initialCustomerId, customers]);

  // Recalculate default due date when customer changes
  useEffect(() => {
    const selectedCust = customers.find((c) => c.id === customerId);
    const terms = selectedCust?.paymentTermsDays || profile.defaultPaymentTermsDays || 14;
    const d = new Date(date || new Date().toISOString().split('T')[0]);
    d.setDate(d.getDate() + terms);
    setDueDate(d.toISOString().split('T')[0]);

    if (type === 'credit' && !invoiceNumber) {
      setInvoiceNumber(`INV-100D-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [customerId, date, type]);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: string, val: any) => {
    const newItems = [...items];
    const current = { ...newItems[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(val) : current.quantity;
      const p = field === 'unitPrice' ? Number(val) : current.unitPrice;
      current.amount = q * p;
    }

    newItems[index] = current;
    setItems(newItems);

    const total = newItems.reduce((acc, it) => acc + (it.amount || 0), 0);
    if (total > 0) {
      setAmount(String(total));
    }
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    const total = updated.reduce((acc, it) => acc + (it.amount || 0), 0);
    setAmount(String(total));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!customerId) {
      setFormError('Please select a customer.');
      return;
    }

    const cleanedItems = showItemized
      ? items.filter((it) => it.description.trim().length > 0 && it.amount > 0)
      : undefined;

    onSave(
      {
        customerId,
        type,
        amount: parsedAmount,
        date,
        dueDate: type === 'credit' ? dueDate : undefined,
        invoiceNumber: type === 'credit' ? invoiceNumber : undefined,
        notes: notes.trim(),
        paymentMode: type === 'debit' ? paymentMode : undefined,
        items: cleanedItems && cleanedItems.length > 0 ? cleanedItems : undefined,
      },
      sendWhatsApp
    );
    onClose();
  };

  const selectedCust = customers.find((c) => c.id === customerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${type === 'credit' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>
              {type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {type === 'credit' ? 'Give Credit / Billed (ادھار دیا)' : 'Accept Payment / Received (رقم وصول کی)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}
          {/* Segmented Type Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setType('credit')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'credit'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              You Gave / ادھار دیا (Credit)
            </button>
            <button
              type="button"
              onClick={() => setType('debit')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'debit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              You Got / وصول کی (Jama)
            </button>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Customer / پارٹی منتخب کریں *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.urduName ? `(${c.urduName})` : ''} — Due: {profile.currencySymbol} {c.balance.toLocaleString('en-PK')} (Ph: {c.phone})
                </option>
              ))}
            </select>
            {selectedCust && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                WhatsApp Phone: <span className="font-mono">{selectedCust.phone}</span> · Terms: <span className="font-mono">{selectedCust.paymentTermsDays} days</span>
              </p>
            )}
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({profile.currencySymbol}) / رقم *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">
                  {profile.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Date / تاریخ *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Type Specific Fields */}
          {type === 'credit' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Due Date / واپسی کی آخری تاریخ
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice / Bill Number / بل نمبر
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-100D-0250"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel / طریقہ ادائیگی (EasyPaisa, JazzCash, SadaPay, Bank)
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="easypaisa">EasyPaisa (ایزی پیسہ)</option>
                <option value="jazzcash">JazzCash (جاز کیش)</option>
                <option value="sadapay">SadaPay (سادہ پے)</option>
                <option value="bank_transfer">Pakistani Bank Transfer / IBAN (بینک ٹرانسفر)</option>
                <option value="cash">Cash In Hand (نقد رقم)</option>
                <option value="cheque">Cheque (بینک چیک)</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Optional itemized breakdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Itemized Bill Details / اشیاء کی تفصیل
              </label>
              <button
                type="button"
                onClick={() => setShowItemized(!showItemized)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {showItemized ? 'Hide Items' : '+ Add Line Items (Optional)'}
              </button>
            </div>

            {showItemized && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Item name / چیز کا نام"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="flex-3 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-16 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={it.unitPrice || ''}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-24 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    />
                    <span className="w-24 text-right text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                      {profile.currencySymbol} {it.amount.toLocaleString('en-PK')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another item
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / تفصیلی نوٹ
            </label>
            <input
              type="text"
              placeholder="e.g. Copper wiring lot, machinery payment, partial settlement"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Instant WhatsApp Prompt */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                Send WhatsApp notification &amp; receipt with EasyPaisa / JazzCash / SadaPay / Bank details immediately
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer ${
                type === 'credit' ? 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {type === 'credit' ? 'Save Credit Entry (ادھار درج کریں)' : 'Record Payment Receipt (وصولی محفوظ کریں)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
