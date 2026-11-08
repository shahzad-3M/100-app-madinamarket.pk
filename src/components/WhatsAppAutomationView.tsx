import React, { useState } from 'react';
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Edit2,
  RefreshCw,
  MessageSquare,
  Megaphone,
  Link as LinkIcon,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AgeGroupType,
  BroadcastContact,
  BusinessProfile,
  Customer,
  GenderType,
  ProductBroadcast,
  ReminderTemplate,
  SavedBroadcastCampaign,
  WhatsAppNotification,
} from '../types';
import { openWhatsAppDirect, formatPaymentChannelsText } from '../utils/whatsapp';

interface WhatsAppAutomationViewProps {
  notifications: WhatsAppNotification[];
  customers: Customer[];
  templates: ReminderTemplate[];
  productBroadcasts: ProductBroadcast[];
  manualContacts?: BroadcastContact[];
  savedBroadcasts?: SavedBroadcastCampaign[];
  profile: BusinessProfile;
  onOpenScheduleWhatsApp: (customerId?: string, date?: string) => void;
  onOpenProductBroadcast: () => void;
  onMarkNotificationSent: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onUpdateTemplates: (templates: ReminderTemplate[]) => void;
  onRunWeeklyDueReminders: () => void;
  onRunMonthlyReminderBatch: () => void;
  onSaveManualContact?: (contact: BroadcastContact) => void;
  onDeleteManualContact?: (id: string) => void;
  onResendSavedBroadcast?: (campaign: SavedBroadcastCampaign) => void;
}

export const WhatsAppAutomationView: React.FC<WhatsAppAutomationViewProps> = ({
  notifications,
  customers,
  templates,
  productBroadcasts,
  manualContacts = [],
  savedBroadcasts = [],
  profile,
  onOpenScheduleWhatsApp,
  onOpenProductBroadcast,
  onMarkNotificationSent,
  onDeleteNotification,
  onUpdateTemplates,
  onRunWeeklyDueReminders,
  onRunMonthlyReminderBatch,
  onSaveManualContact,
  onDeleteManualContact,
  onResendSavedBroadcast,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'weekly_due' | 'broadcast' | 'contacts' | 'templates'>('queue');
  const [queueFilter, setQueueFilter] = useState<'all' | 'due_today' | 'pending' | 'sent'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);

  // Manual Contact Form State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<BroadcastContact | null>(null);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cCity, setCCity] = useState('Lahore');
  const [cArea, setCArea] = useState('');
  const [cGender, setCGender] = useState<GenderType>('unspecified');
  const [cAgeGroup, setCAgeGroup] = useState<AgeGroupType>('26-35');
  const [cType, setCType] = useState<'retail' | 'individual' | 'lead'>('retail');
  const [cNotes, setCNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const dueTodayCount = notifications.filter(
    (n) => n.status === 'pending' && n.scheduledFor <= todayStr
  ).length;

  const totalSentCount = notifications.filter((n) => n.status === 'sent').length;

  // Filtered queue
  const filteredNotifications = notifications
    .filter((n) => {
      if (queueFilter === 'due_today') return n.status === 'pending' && n.scheduledFor <= todayStr;
      if (queueFilter === 'pending') return n.status === 'pending';
      if (queueFilter === 'sent') return n.status === 'sent';
      return true;
    })
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  // Customers with ONLY DUE balances (User requirement: weekly reminder for only due payments)
  const customersWithDueBalance = customers.filter((c) => c.balance > 0 && c.status === 'active');
  const totalDueAmount = customersWithDueBalance.reduce((sum, c) => sum + c.balance, 0);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDirectSend = (notif: WhatsAppNotification) => {
    openWhatsAppDirect(notif.phone, notif.messageText);
    onMarkNotificationSent(notif.id);
  };

  const handleBatchSendAllDueToday = () => {
    const dueItems = notifications.filter(
      (n) => n.status === 'pending' && n.scheduledFor <= todayStr
    );
    if (dueItems.length === 0) {
      alert('No reminders due today.');
      return;
    }

    const first = dueItems[0];
    handleDirectSend(first);

    if (dueItems.length > 1) {
      alert(
        `Dispatched first WhatsApp reminder to ${first.customerName}. Click Send on the remaining ${
          dueItems.length - 1
        } queued alerts below.`
      );
    }
  };

  const handleSaveTemplate = (updated: ReminderTemplate) => {
    const newTemplates = templates.map((t) => (t.id === updated.id ? updated : t));
    onUpdateTemplates(newTemplates);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                WhatsApp Automation &amp; Notification Engine
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Bilingual Urdu &amp; English reminders with Pakistani payment channels (EasyPaisa, JazzCash, SadaPay &amp; Bank IBAN). Auto-send weekly due reminders and broadcast new products with links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {dueTodayCount > 0 && (
              <button
                onClick={handleBatchSendAllDueToday}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch {dueTodayCount} Due Today
              </button>
            )}

            <button
              onClick={onOpenProductBroadcast}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Broadcast New Product &amp; Link
            </button>

            <button
              onClick={() => onOpenScheduleWhatsApp()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule on Date
            </button>
          </div>
        </div>

        {/* 3 Metric Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500">Scheduled for Today ({todayStr})</span>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                dueTodayCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {dueTodayCount} reminders
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Due Accounts (Weekly Target)</span>
            <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {customersWithDueBalance.length} parties ({profile.currencySymbol} {totalDueAmount.toLocaleString('en-PK')})
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Dispatched Messages</span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalSentCount} sent
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Scheduled Queue ({notifications.filter((n) => n.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('weekly_due')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'weekly_due'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Weekly Due Reminders ({customersWithDueBalance.length} Parties)
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Product Broadcasts ({productBroadcasts.length})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'contacts'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Manual Broadcast Contacts ({manualContacts.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Bilingual Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: Scheduled Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Scheduled WhatsApp Notifications Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Messages queued for selected dates, weekly due alerts, and product broadcasts
              </p>
            </div>

            {/* Filter segments */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  queueFilter === 'pending'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Pending ({notifications.filter((n) => n.status === 'pending').length})
              </button>
              <button
                onClick={() => setQueueFilter('due_today')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  queueFilter === 'due_today'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Due Today ({dueTodayCount})
              </button>
              <button
                onClick={() => setQueueFilter('sent')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  queueFilter === 'sent'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                Sent ({totalSentCount})
              </button>
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  queueFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                All ({notifications.length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No notifications in this filter view.
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isDue = n.status === 'pending' && n.scheduledFor <= todayStr;
                const isSent = n.status === 'sent';
                return (
                  <div
                    key={n.id}
                    className={`py-4 px-2 hover:bg-slate-50/70 dark:hover:bg-slate-850/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDue ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {n.customerName}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          ({n.phone})
                        </span>
                        {n.type === 'weekly_due' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 rounded">
                            WEEKLY DUE
                          </span>
                        )}
                        {n.type === 'product_broadcast' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 rounded">
                            BROADCAST LINK
                          </span>
                        )}
                        {isDue && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                            DUE TODAY
                          </span>
                        )}
                        {isSent && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>Trigger: <b className="font-mono text-slate-700 dark:text-slate-300">{n.scheduledFor}</b></span>
                        {n.amount > 0 && (
                          <>
                            <span>·</span>
                            <span>Amount: <b className="font-mono text-slate-800 dark:text-slate-200">{profile.currencySymbol} {n.amount.toLocaleString('en-PK')}</b></span>
                          </>
                        )}
                        {n.productLink && (
                          <>
                            <span>·</span>
                            <a
                              href={n.productLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" /> View Product Link
                            </a>
                          </>
                        )}
                      </div>

                      <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-850 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans max-h-24 overflow-y-auto leading-relaxed">
                        {n.messageText}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleCopyMessage(n.id, n.messageText)}
                        title="Copy message text"
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        {copiedId === n.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {n.status === 'pending' ? (
                        <button
                          onClick={() => handleDirectSend(n)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send WhatsApp
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDirectSend(n)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resend
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteNotification(n.id)}
                        title="Delete notification"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Weekly Due Reminders (USER SPECIFIC REQUIREMENT) */}
      {activeTab === 'weekly_due' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Weekly Due Payment Reminders (ہفتہ وار یاد دہانی)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Automatically targets <b>ONLY parties with unpaid due balances</b> (Balance &gt; 0). Generates bilingual Urdu + English reminders with your EasyPaisa, JazzCash, SadaPay, and Bank Account IBAN.
                </p>
              </div>

              <button
                onClick={onRunWeeklyDueReminders}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Clock className="w-3.5 h-3.5" />
                Queue Weekly Reminders for {customersWithDueBalance.length} Parties
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Weekly Scheduled Day: <b>Every {profile.weeklyReminderDay}</b></span>
              <span>Total Due to Collect: <b className="font-mono text-purple-600 dark:text-purple-400">{profile.currencySymbol} {totalDueAmount.toLocaleString('en-PK')}</b></span>
            </div>
          </div>

          {/* List of Due Parties */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Customers Currently Due for Collection ({customersWithDueBalance.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customersWithDueBalance.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  All customer accounts are settled! No payments are currently due.
                </div>
              ) : (
                customersWithDueBalance.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {c.name} {c.urduName && <span className="text-slate-500 font-normal">({c.urduName})</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Phone: {c.phone} · Terms: {c.paymentTermsDays}d
                        {c.lastReminderSentAt && ` · Last Reminded: ${c.lastReminderSentAt}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 block">
                        {profile.currencySymbol} {c.balance.toLocaleString('en-PK')}
                      </span>
                      <button
                        onClick={() => {
                          const paymentText = formatPaymentChannelsText(profile);
                          const msg = `*Weekly Due Payment Reminder / ہفتہ وار یاد دہانی*\n*${profile.name}*\n\nمحترم ${c.name} صاحب،\nآپ کے کھاتے میں واجب الادا رقم: *${profile.currencySymbol} ${c.balance.toLocaleString('en-PK')}*\nKindly clear your due balance for this week.\n\n*Payment Channels / ادائیگی کے ذرائع:*\n${paymentText}\n\nشکریہ! جزاک اللہ۔`;
                          openWhatsAppDirect(c.phone, msg);
                        }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Send Weekly WhatsApp Reminder
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: New Product Broadcast (USER SPECIFIC REQUIREMENT) */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Broadcast New Product &amp; Link to All Parties
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Announce new stock arrivals, promotions, and special inventory lots to all registered customers with clickable product links and bilingual Urdu + English copy.
                </p>
              </div>

              <button
                onClick={onOpenProductBroadcast}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Megaphone className="w-3.5 h-3.5" />
                + New Product Announcement
              </button>
            </div>
          </div>

          {/* Past Broadcast History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Product Broadcast Catalog ({productBroadcasts.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productBroadcasts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {prod.productName}
                      </h4>
                      {prod.price && prod.price > 0 && (
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {profile.currencySymbol} {prod.price.toLocaleString('en-PK')}
                        </span>
                      )}
                    </div>

                    {prod.urduName && (
                      <p className="text-xs text-slate-500 mt-0.5 font-sans">
                        {prod.urduName}
                      </p>
                    )}

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {prod.description}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <a
                        href={prod.productLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono truncate"
                      >
                        {prod.productLink}
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">{prod.createdAt}</span>
                    <button
                      onClick={() => {
                        const msg = `📢 *New Product Alert! / نئی پروڈکٹ کی آمد*\n*${profile.name}*\n\nمحترم کسٹمر، ہمارے پاس نیا اسٹاک آ گیا ہے!\n\n📦 *${prod.productName}*\n📝 ${prod.description}\n${prod.price ? `💰 Price / قیمت: *${profile.currencySymbol} ${prod.price.toLocaleString('en-PK')}*\n` : ''}\n🔗 *View Product Link:*\n${prod.productLink}\n\nآرڈر کے لیے واٹس ایپ پر رابطہ کریں۔`;
                        navigator.clipboard.writeText(msg);
                        alert('Broadcast message copied to clipboard!');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Message Text
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAVED BROADCAST CAMPAIGNS LOG (User directive: save all brodcost as well) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Saved Broadcast Campaigns Log (محفوظ شدہ براڈکاسٹ مہمات)
                </h3>
                <span className="text-xs text-slate-400">
                  Audit trail of dispatched marketing broadcasts with area, age, gender filters
                </span>
              </div>
              <span className="font-mono text-xs text-slate-500 font-bold">
                {savedBroadcasts.length} Campaigns
              </span>
            </div>

            {savedBroadcasts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No saved broadcast campaigns yet. Campaigns are automatically saved when you dispatch broadcasts.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {savedBroadcasts.map((camp) => (
                  <div key={camp.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {camp.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {camp.recipientsCount} Recipients
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {camp.filters.area && camp.filters.area !== 'all' && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                            📍 {camp.filters.area}
                          </span>
                        )}
                        {camp.filters.gender && camp.filters.gender !== 'all' && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                            👤 {camp.filters.gender}
                          </span>
                        )}
                        {camp.filters.ageGroup && camp.filters.ageGroup !== 'all' && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                            🎂 {camp.filters.ageGroup}
                          </span>
                        )}
                        <span className="font-mono">· {camp.sentAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(camp.messageText);
                          alert('Campaign message text copied to clipboard!');
                        }}
                        className="px-2.5 py-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Message</span>
                      </button>
                      {onResendSavedBroadcast && (
                        <button
                          onClick={() => onResendSavedBroadcast(camp)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Re-Broadcast</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MANUAL BROADCAST CONTACTS (USER DIRECTIVE) */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Manual Broadcast Contacts Directory (دستی براڈکاسٹ رابطے)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Maintain non-ledger customer leads, retail shop owners, and targeted contact lists with area, age group, and gender for segmented WhatsApp broadcasting.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingContact(null);
                  setCName('');
                  setCPhone('');
                  setCCity('Lahore');
                  setCArea('');
                  setCGender('unspecified');
                  setCAgeGroup('26-35');
                  setCType('retail');
                  setCNotes('');
                  setIsContactModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <span>+ Add Manual Contact (نیا رابطہ شامل کریں)</span>
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                All Registered Manual Contacts ({manualContacts.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Contact Name</th>
                    <th className="py-2.5 px-3">Phone (WhatsApp)</th>
                    <th className="py-2.5 px-3">City / Area</th>
                    <th className="py-2.5 px-3">Gender / Age</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {manualContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {contact.name}
                        </span>
                        {contact.notes && (
                          <span className="text-[10px] text-slate-400 block">{contact.notes}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {contact.phone}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        <span>{contact.city}</span>
                        {contact.area && <span className="text-slate-400">, {contact.area}</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 capitalize">
                        <span>{contact.gender}</span> · <span className="font-mono">{contact.ageGroup}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          contact.type === 'retail'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : contact.type === 'individual'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {contact.type === 'retail' ? '🏪 Retail Store' : contact.type === 'lead' ? '✨ New Lead' : '👤 Individual'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const msg = `السلام علیکم ${contact.name}! 100DAGAR ہول سیل شاپ کی جانب سے خوش آمدید۔`;
                              openWhatsAppDirect(contact.phone, msg);
                            }}
                            className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 rounded-lg cursor-pointer"
                            title="Open WhatsApp Chat"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteManualContact && (
                            <button
                              onClick={() => onDeleteManualContact(contact.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Contact Modal */}
          {isContactModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add Manual Broadcast Contact
                  </h3>
                  <button onClick={() => setIsContactModalOpen(false)} className="p-1 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Mobile / WhatsApp Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="03001234567"
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        City (شہر)
                      </label>
                      <input
                        type="text"
                        placeholder="Lahore, Karachi..."
                        value={cCity}
                        onChange={(e) => setCCity(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Area / Market
                      </label>
                      <input
                        type="text"
                        placeholder="Shah Alam, DHA..."
                        value={cArea}
                        onChange={(e) => setCArea(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Gender
                      </label>
                      <select
                        value={cGender}
                        onChange={(e) => setCGender(e.target.value as GenderType)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="unspecified">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Age Group
                      </label>
                      <select
                        value={cAgeGroup}
                        onChange={(e) => setCAgeGroup(e.target.value as AgeGroupType)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="18-25">18–25</option>
                        <option value="26-35">26–35</option>
                        <option value="36-50">36–50</option>
                        <option value="50+">50+</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Type
                      </label>
                      <select
                        value={cType}
                        onChange={(e) => setCType(e.target.value as any)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="retail">Retailer</option>
                        <option value="individual">Individual</option>
                        <option value="lead">Lead</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!cName.trim() || !cPhone.trim()) {
                          alert('Please enter Name and Phone');
                          return;
                        }
                        const newContact: BroadcastContact = {
                          id: `cnt_${Date.now()}`,
                          name: cName.trim(),
                          phone: cPhone.trim(),
                          city: cCity.trim() || 'Pakistan',
                          area: cArea.trim() || undefined,
                          gender: cGender,
                          ageGroup: cAgeGroup,
                          type: cType,
                          notes: cNotes.trim() || undefined,
                          createdAt: new Date().toISOString().split('T')[0],
                        };
                        if (onSaveManualContact) {
                          onSaveManualContact(newContact);
                        }
                        setIsContactModalOpen(false);
                      }}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
                    >
                      Save Contact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Bilingual Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Bilingual Urdu + English Message Templates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              All templates support dynamic tags: <code className="font-mono text-slate-700 dark:text-slate-300">{"{CUSTOMER_NAME}"}</code>, <code className="font-mono text-slate-700 dark:text-slate-300">{"{AMOUNT}"}</code>, <code className="font-mono text-slate-700 dark:text-slate-300">{"{PAYMENT_CHANNELS}"}</code>, <code className="font-mono text-slate-700 dark:text-slate-300">{"{PRODUCT_NAME}"}</code>, <code className="font-mono text-slate-700 dark:text-slate-300">{"{PRODUCT_LINK}"}</code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {tpl.title}
                        </span>
                        {tpl.titleUrdu && (
                          <span className="text-[11px] text-slate-500 font-sans">
                            {tpl.titleUrdu}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingTemplate(tpl)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <pre className="text-xs font-sans text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                      {tpl.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Template Modal */}
          {editingTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Edit Template: {editingTemplate.title}
                </h3>
                <textarea
                  rows={9}
                  value={editingTemplate.content}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, content: e.target.value })
                  }
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-sans leading-relaxed"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveTemplate(editingTemplate)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
