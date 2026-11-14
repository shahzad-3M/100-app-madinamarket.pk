import React, { useState } from 'react';
import { X, Repeat, Plus, Trash2 } from 'lucide-react';
import { BusinessProfile, Customer, RecurringFrequency, RecurringInvoice } from '../types';

interface AddRecurringInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rec: Omit<RecurringInvoice, 'id' | 'createdAt' | 'lastGeneratedDate'>) => void;
  customers: Customer[];
  profile: BusinessProfile;
  initialCustomerId?: string;
}

export const AddRecurringInvoiceModal: React.FC<AddRecurringInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  profile,
  initialCustomerId,
}) => {
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || (customers[0]?.id || ''));
  const [title, setTitle] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nextBillingDate, setNextBillingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number; amount: number }>>([
    { description: 'Monthly Retainer Supply / Service', quantity: 1, unitPrice: 25000, amount: 25000 },
  ]);

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
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.amount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Please enter contract or invoice title.');
      return;
    }
    if (!customerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (totalAmount <= 0) {
      setFormError('Total amount must be greater than 0.');
      return;
    }

    onSave({
      customerId,
      title: title.trim(),
      frequency,
      items: items.filter((it) => it.description.trim().length > 0),
      totalAmount,
      startDate,
      nextBillingDate,
      status: 'active',
      autoSendWhatsApp,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Recurring Invoice Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-generate bills &amp; WhatsApp ledger reminders on cadence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contract / Recurring Profile Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monthly Generator Hire, Weekly Hardware Lot, Fleet Retainer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Party *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Ph: {c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Billing Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="weekly">Weekly (Every 7 Days)</option>
                <option value="biweekly">Bi-Weekly (Every 14 Days)</option>
                <option value="monthly">Monthly (Every Month)</option>
                <option value="quarterly">Quarterly (Every 3 Months)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contract Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Billing Date *
              </label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Itemized Line Items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recurring Line Items
              </label>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono">
                Total: {profile.currencySymbol}{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Item / Service description"
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-3 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Unit Price"
                    value={it.unitPrice || ''}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="w-20 text-right text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {profile.currencySymbol}{it.amount.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add another item
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium text-blue-900 dark:text-blue-200">
              Auto-queue WhatsApp invoice notification to customer when generated
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendWhatsApp}
                onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contract Terms / Internal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Contract valid for 12 months, includes delivery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Create Recurring Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
