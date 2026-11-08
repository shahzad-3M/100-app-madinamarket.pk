import React, { useState } from 'react';
import { X, UserPlus, Phone } from 'lucide-react';
import { BusinessProfile, Customer, CustomerType } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'balance' | 'status'>, openingBalance: number) => void;
  profile: BusinessProfile;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profile,
}) => {
  const [name, setName] = useState('');
  const [urduName, setUrduName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('retail');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [ntnNumber, setNtnNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000'); // USER DIRECTIVE: default 5000 credit limit
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(profile.defaultPaymentTermsDays || 7)); // USER DIRECTIVE: 7 days payment terms
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter party / customer name');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter WhatsApp mobile number for sending payment reminders');
      return;
    }

    onSave(
      {
        name: name.trim(),
        urduName: urduName.trim() || undefined,
        customerType,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        ntnNumber: ntnNumber.trim() || undefined,
        creditLimit: parseFloat(creditLimit) || 0,
        paymentTermsDays: parseInt(paymentTermsDays, 10) || 14,
        notes: notes.trim() || undefined,
      },
      parseFloat(openingBalance) || 0
    );

    setName('');
    setUrduName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNtnNumber('');
    setOpeningBalance('0');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Customer / نئی پارٹی کا اندراج
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register customer Khatta ledger and WhatsApp reminder contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer Classification (کسٹمر کی قسم) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerType('retail')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  customerType === 'retail'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-200 ring-2 ring-purple-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                🏪 Retail Store / دکان دار (Wholesale Buyer)
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('individual')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  customerType === 'individual'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 ring-2 ring-blue-400'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                👤 Individual / انفرادی خریدار (Direct Consumer)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Party Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Madina Electric Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                پارٹی کا نام اردو میں (Urdu Name)
              </label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثال: المدینہ الیکٹرک اسٹور"
                value={urduName}
                onChange={(e) => setUrduName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Phone *
              </label>
              <input
                type="tel"
                required
                placeholder="03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-500">Pakistani mobile (03xx / 923xx)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="party@example.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Credit Limit ({profile.currencySymbol}) / ادھار کی حد
              </label>
              <input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms (Days) / ادھار کی مدت
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NTN / STRN (National Tax No.)
              </label>
              <input
                type="text"
                placeholder="e.g. 1234567-8"
                value={ntnNumber}
                onChange={(e) => setNtnNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Opening Balance Due ({profile.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-500">پہلے سے واجب الادا رقم</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Shop / City / Market Address (پتہ)
            </label>
            <input
              type="text"
              placeholder="e.g. Shop # 12, Circular Road, Urdu Bazaar, Lahore"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes / ضروری معلومات
            </label>
            <input
              type="text"
              placeholder="e.g. Settles weekly on Monday, owner contact person"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Save Customer (پارٹی محفوظ کریں)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
