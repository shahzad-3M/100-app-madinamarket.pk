import React, { useState, useEffect } from 'react';
import { X, Calendar, Send, Clock, Copy, Check } from 'lucide-react';
import { BusinessProfile, Customer, ReminderTemplate, WhatsAppNotification } from '../types';
import { formatTemplateMessage, openWhatsAppDirect, calculateDaysOverdue, formatPaymentChannelsText } from '../utils/whatsapp';

interface ScheduleWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (notification: Omit<WhatsAppNotification, 'id' | 'createdAt' | 'status'>, sendImmediately: boolean) => void;
  customers: Customer[];
  templates: ReminderTemplate[];
  profile: BusinessProfile;
  initialCustomerId?: string;
  initialDate?: string;
}

export const ScheduleWhatsAppModal: React.FC<ScheduleWhatsAppModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  customers,
  templates,
  profile,
  initialCustomerId,
  initialDate,
}) => {
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || (customers[0]?.id || ''));
  const [scheduledFor, setScheduledFor] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [customDueDate, setCustomDueDate] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
    if (initialDate) setScheduledFor(initialDate);
  }, [initialCustomerId, initialDate]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    if (!selectedCustomer) return;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + (selectedCustomer.paymentTermsDays || 14));
    const effectiveDueDate = customDueDate || defaultDueDate.toISOString().split('T')[0];

    const template = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const daysOverdue = calculateDaysOverdue(effectiveDueDate);
    const paymentChannelsText = formatPaymentChannelsText(profile);

    const text = formatTemplateMessage(template ? template.content : '', {
      customerName: selectedCustomer.name + (selectedCustomer.urduName ? ` (${selectedCustomer.urduName})` : ''),
      amount: Math.abs(selectedCustomer.balance),
      currency: profile.currencySymbol,
      dueDate: effectiveDueDate,
      daysOverdue,
      businessName: profile.name,
      paymentChannelsText,
      paymentTerms: selectedCustomer.paymentTermsDays,
    });

    setMessageText(text);
  }, [customerId, selectedTemplateId, customDueDate, profile, selectedCustomer, templates]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (sendNow: boolean) => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (!scheduledFor) {
      alert('Please choose a scheduled date');
      return;
    }

    onSchedule(
      {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        phone: selectedCustomer.phone,
        amount: Math.abs(selectedCustomer.balance),
        dueDate: customDueDate || undefined,
        scheduledFor,
        type: 'scheduled_date',
        messageText,
        notes: `Scheduled reminder for ${scheduledFor}`,
      },
      sendNow
    );

    if (sendNow) {
      openWhatsAppDirect(selectedCustomer.phone, messageText);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Auto WhatsApp Notification on Selected Date
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مخصوص تاریخ پر خودکار واٹس ایپ پیغام یا ادائیگی یاد دہانی شیڈول کریں
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

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Customer / پارٹی منتخب کریں *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.urduName ? `(${c.urduName})` : ''} — Due: {profile.currencySymbol} {c.balance.toLocaleString('en-PK')}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Phone: <b className="font-mono">{selectedCustomer.phone}</b></span>
                  <span>Balance: <b className="font-mono text-emerald-600 dark:text-emerald-400">{profile.currencySymbol} {selectedCustomer.balance.toLocaleString('en-PK')}</b></span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Notification Trigger Date / یاد دہانی کی تاریخ *
              </label>
              <input
                type="date"
                required
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Template / پیغام کا سانچہ
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Override Payment Due Date (Optional)
              </label>
              <input
                type="date"
                value={customDueDate}
                onChange={(e) => setCustomDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* WhatsApp Chat Preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                WhatsApp Preview &amp; Edit (اردو + انگلش)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>

            <div className="flex-1 bg-emerald-950/10 dark:bg-slate-950 p-3 rounded-lg border border-emerald-200 dark:border-slate-800 flex flex-col justify-between">
              {/* WhatsApp Bubble */}
              <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3.5 rounded-lg rounded-tl-none shadow-xs border border-emerald-200/60 dark:border-emerald-800/60">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  100DAGAR · Pakistan Ledger
                </div>
                <textarea
                  rows={9}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full text-xs text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:ring-0 p-0 font-sans resize-none leading-relaxed"
                />
                <div className="text-right text-[10px] text-slate-400 mt-1">
                  EasyPaisa · JazzCash · SadaPay · Bank IBAN
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
                <span>Receiver: <b className="font-mono">{selectedCustomer?.phone}</b></span>
                <span>Scheduled for: <b className="font-mono">{scheduledFor}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-200 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Schedule &amp; Send Now
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Save to Scheduled Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
