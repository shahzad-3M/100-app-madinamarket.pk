import React, { useState } from 'react';
import {
  Building,
  CreditCard,
  Smartphone,
  Save,
  Download,
  Upload,
  RefreshCw,
  Check,
  Calendar,
  Truck,
  Trash2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Users,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Filter,
  History,
  Clock,
  RotateCcw,
  UserCheck,
  AlertCircle,
  MapPin,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react';
import { BusinessProfile, Customer, DeliveryCityConfig, LoginAuditRecord, Reseller } from '../types';
import { defaultDeliveryCities } from '../utils/defaultData';
import {
  exportAllDataJSON,
  importAllDataJSON,
  resetToDemoData,
  startFromScratchData,
  getLoginAudits,
  saveLoginAudits,
  getOwnerPin,
  updateOwnerPin,
  updateCustomerPin,
  updateResellerPin,
  getDefaultPinForPhone,
  getCustomers,
  saveCustomers,
  getResellers,
  saveResellers,
  apiAddCity,
  apiUpdateCity,
  apiAddCityArea,
  apiUpdateCityArea,
  apiDeleteCityArea,
  apiCreateServerBackup,
} from '../utils/storage';
import { ensureCityAreasShape, normalizeTextKey } from '../utils/locationCategoryHelpers';
import {
  ToastBanner,
  ToastMessage,
  ConfirmDialogModal,
  ConfirmDialogState,
  InputPromptModal,
  InputPromptState,
} from './AppDialogs';

interface SettingsViewProps {
  profile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onRefreshAllData: () => void;
  customers?: Customer[];
  resellers?: Reseller[];
  onUpdateCustomer?: (customer: Customer) => void;
  onUpdateReseller?: (reseller: Reseller) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onSaveProfile,
  onRefreshAllData,
  customers = [],
  resellers = [],
  onUpdateCustomer,
  onUpdateReseller,
}) => {
  const [formData, setFormData] = useState<BusinessProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'wasal' | 'security' | 'backup'>('profile');

  // Security / PIN States
  const [ownerMasterPin, setOwnerMasterPin] = useState(profile.adminPin || getOwnerPin() || '580987');
  const [newMasterPin, setNewMasterPin] = useState('');
  const [confirmMasterPin, setConfirmMasterPin] = useState('');
  const [showMasterPin, setShowMasterPin] = useState(false);
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<LoginAuditRecord[]>(getLoginAudits);
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // User PIN Directory State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'reseller'>('all');
  const [userListNotice, setUserListNotice] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [newDeliveryCity, setNewDeliveryCity] = useState('');
  const [expandedCityId, setExpandedCityId] = useState<string | null>('city_muzaffarabad');
  const [newAreaInputs, setNewAreaInputs] = useState<Record<string, string>>({});
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingCityName, setEditingCityName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [inputPrompt, setInputPrompt] = useState<InputPromptState | null>(null);

  const pushToast = (text: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const deliveryCities: DeliveryCityConfig[] = ensureCityAreasShape(
    formData.deliveryCities && formData.deliveryCities.length > 0
      ? formData.deliveryCities
      : defaultDeliveryCities
  );

  const handleToggleSettingsCity = async (city: DeliveryCityConfig) => {
    const targetId = city.id || city.name;
    const updated = deliveryCities.map((c) =>
      c.name === city.name ? { ...c, allowed: !c.allowed } : c
    );
    const nextProf = { ...formData, deliveryCities: updated };
    setFormData(nextProf);
    onSaveProfile(nextProf);
    await apiUpdateCity(targetId, { allowed: !city.allowed });
  };

  const handleResetSettingsCities = () => {
    const fresh = ensureCityAreasShape(defaultDeliveryCities);
    const nextProf = { ...formData, deliveryCities: fresh };
    setFormData(nextProf);
    onSaveProfile(nextProf);
    setSavedSuccess(true);
    pushToast('Default delivery cities & areas restored cleanly.', 'success');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddSettingsCity = async () => {
    const trimmed = newDeliveryCity.trim();
    if (!trimmed) return;
    if (deliveryCities.some((c) => normalizeTextKey(c.name) === normalizeTextKey(trimmed))) {
      pushToast(`City "${trimmed}" already exists.`, 'error');
      return;
    }
    const res = await apiAddCity(trimmed, true);
    if (res.ok && res.cities) {
      const nextProf = { ...formData, deliveryCities: res.cities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
      setNewDeliveryCity('');
      pushToast(`City "${trimmed}" added and synced across devices.`, 'success');
    } else {
      pushToast(res.error || 'Could not add city.', 'error');
    }
  };

  const handleSaveCityRename = async (city: DeliveryCityConfig) => {
    const clean = editingCityName.trim();
    if (!clean) return;
    if (
      deliveryCities.some(
        (c) => (c.id || c.name) !== (city.id || city.name) && normalizeTextKey(c.name) === normalizeTextKey(clean)
      )
    ) {
      pushToast(`City "${clean}" already exists.`, 'error');
      return;
    }
    const res = await apiUpdateCity(city.id || city.name, { name: clean });
    if (res.ok && res.cities) {
      const nextProf = { ...formData, deliveryCities: res.cities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
      setEditingCityId(null);
      pushToast(`City renamed to "${clean}".`, 'success');
    } else {
      pushToast(res.error || 'Could not rename city.', 'error');
    }
  };

  const handleAddAreasToCity = async (city: DeliveryCityConfig) => {
    const cityKey = city.id || city.name;
    const raw = (newAreaInputs[cityKey] || '').trim();
    if (!raw) return;
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let latestCities = deliveryCities;
    let addedCount = 0;

    for (const areaName of names) {
      const targetCity = latestCities.find((c) => (c.id || c.name) === cityKey);
      if (targetCity?.areas?.some((a) => normalizeTextKey(a.name) === normalizeTextKey(areaName))) {
        pushToast(`Duplicate area "${areaName}" skipped in ${city.name}.`, 'error');
        continue;
      }
      const res = await apiAddCityArea(cityKey, areaName, true);
      if (res.ok && res.cities) {
        latestCities = res.cities;
        addedCount++;
      } else {
        pushToast(res.error || `Failed adding area "${areaName}".`, 'error');
      }
    }

    if (addedCount > 0) {
      const nextProf = { ...formData, deliveryCities: latestCities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
      setNewAreaInputs((prev) => ({ ...prev, [cityKey]: '' }));
      pushToast(`Added ${addedCount} area(s) under ${city.name}.`, 'success');
    }
  };

  const handleToggleCityArea = async (city: DeliveryCityConfig, areaId: string, currentAllowed: boolean) => {
    const res = await apiUpdateCityArea(areaId, { allowed: !currentAllowed });
    if (res.ok && res.cities) {
      const nextProf = { ...formData, deliveryCities: res.cities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
    }
  };

  const handleSaveAreaRename = async (areaId: string) => {
    const clean = editingAreaName.trim();
    if (!clean) return;
    const res = await apiUpdateCityArea(areaId, { name: clean });
    if (res.ok && res.cities) {
      const nextProf = { ...formData, deliveryCities: res.cities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
      setEditingAreaId(null);
      pushToast(`Area updated to "${clean}".`, 'success');
    } else {
      pushToast(res.error || 'Could not update area.', 'error');
    }
  };

  const handleRemoveArea = async (areaId: string) => {
    const res = await apiDeleteCityArea(areaId);
    if (res.ok && res.cities) {
      const nextProf = { ...formData, deliveryCities: res.cities };
      setFormData(nextProf);
      onSaveProfile(nextProf);
      pushToast('Area removed.', 'info');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // OWNER PIN UPDATE
  const handleUpdateMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMsg(null);

    const cleanPin = newMasterPin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setPinChangeMsg({
        type: 'error',
        text: 'ماسٹر پن کم از کم 4 سے 6 ہندسوں پر مشتمل ہونا چاہیے۔ (PIN must be at least 4 digits)',
      });
      return;
    }

    if (cleanPin !== confirmMasterPin.trim()) {
      setPinChangeMsg({
        type: 'error',
        text: 'نیا پن اور تصدیقی پن مماثل نہیں ہیں۔ (Confirm PIN does not match)',
      });
      return;
    }

    // Save to storage and profile
    updateOwnerPin(cleanPin);
    const updatedProfile = { ...formData, adminPin: cleanPin };
    setFormData(updatedProfile);
    onSaveProfile(updatedProfile);
    setOwnerMasterPin(cleanPin);
    setNewMasterPin('');
    setConfirmMasterPin('');
    setPinChangeMsg({
      type: 'success',
      text: 'ایڈمن ماسٹر پن کامیابی سے تبدیل ہو گیا ہے۔ (Owner Master PIN updated successfully!)',
    });
    setTimeout(() => setPinChangeMsg(null), 3500);
  };

  // 1-CLICK RESET USER PIN TO DEFAULT
  const handleResetUserPinToDefault = (user: Customer | Reseller, role: 'customer' | 'reseller') => {
    const defaultPin = getDefaultPinForPhone(user.phone);
    if (role === 'customer') {
      updateCustomerPin(user.id, defaultPin);
      if (onUpdateCustomer) {
        onUpdateCustomer({ ...(user as Customer), pin: defaultPin });
      }
      setUserListNotice(
        `کسٹمر "${user.name}" کا پن ڈیفالٹ پر ری سیٹ کر دیا گیا: ${defaultPin} (موبائل کے آخری 6 ہندسے)`
      );
    } else {
      updateResellerPin(user.id, defaultPin);
      if (onUpdateReseller) {
        onUpdateReseller({ ...(user as Reseller), pin: defaultPin });
      }
      setUserListNotice(
        `ری سیلر "${user.name}" کا پن ڈیفالٹ پر ری سیٹ کر دیا گیا: ${defaultPin} (موبائل کے آخری 6 ہندسے)`
      );
    }
    setTimeout(() => setUserListNotice(null), 4000);
  };

  // SET CUSTOM PIN FOR A USER
  const handleSetCustomUserPin = (user: Customer | Reseller, role: 'customer' | 'reseller') => {
    const defaultPin = getDefaultPinForPhone(user.phone);
    setInputPrompt({
      title: 'Set Custom Security PIN',
      label: `نیا 6 ہندسوں کا پن کوڈ درج کریں برائے ${user.name} (${user.phone}):\n(Default: ${defaultPin})`,
      initialValue: user.pin || defaultPin,
      submitLabel: 'Save PIN',
      onSubmit: (input) => {
        const clean = input.trim();
        if (clean.length < 4) {
          pushToast('PIN must be at least 4 digits.', 'error');
          return;
        }
        if (role === 'customer') {
          updateCustomerPin(user.id, clean);
          if (onUpdateCustomer) {
            onUpdateCustomer({ ...(user as Customer), pin: clean });
          }
        } else {
          updateResellerPin(user.id, clean);
          if (onUpdateReseller) {
            onUpdateReseller({ ...(user as Reseller), pin: clean });
          }
        }
        setUserListNotice(`نیا سیکیورٹی پن کامیابی سے محفوظ ہو گیا: ${clean}`);
        pushToast(`Security PIN updated for ${user.name}.`, 'success');
        setTimeout(() => setUserListNotice(null), 4000);
      },
    });
  };

  const handleClearAuditLogs = () => {
    setConfirmDialog({
      title: 'Clear Login Audit History',
      message: 'کیا آپ تمام لاگ ان آڈٹ لاگز صاف کرنا چاہتے ہیں؟ Are you sure you want to clear login audit history?',
      confirmLabel: 'Clear Logs',
      danger: true,
      onConfirm: () => {
        saveLoginAudits([]);
        setAuditLogs([]);
        pushToast('Login audit history cleared.', 'info');
      },
    });
  };

  const handleRefreshAuditLogs = () => {
    setAuditLogs(getLoginAudits());
  };

  const toggleRevealPin = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (logFilterStatus !== 'all' && log.status !== logFilterStatus) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchName = log.userName.toLowerCase().includes(q);
      const matchPhone = log.phone.includes(q);
      const matchRole = log.role.toLowerCase().includes(q);
      const matchNotes = (log.notes || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchRole || matchNotes;
    }
    return true;
  });

  // Filtered Users for PIN Directory
  const combinedUsers = [
    ...customers.map((c) => ({ ...c, userType: 'customer' as const })),
    ...resellers.map((r) => ({ ...r, userType: 'reseller' as const })),
  ];

  const filteredUsers = combinedUsers.filter((u) => {
    if (userRoleFilter !== 'all' && u.userType !== userRoleFilter) return false;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchPhone = u.phone.includes(q);
      const matchUrdu = (u.urduName || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchUrdu;
    }
    return true;
  });

  // Backup & Restore Handlers
  const handleExportBackup = () => {
    const jsonStr = exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `100DAGAR_Pakistan_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllDataJSON(content);
        if (success) {
          pushToast('Backup restored successfully!', 'success');
          onRefreshAllData();
        } else {
          pushToast('Failed to parse backup file. Please ensure it is a valid JSON backup.', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setConfirmDialog({
      title: 'Reset to Demo Dataset',
      message: 'Are you sure you want to reset all data back to the default 100DAGAR demo dataset with Pakistani channels and bilingual templates?',
      confirmLabel: 'Reset Data',
      danger: true,
      onConfirm: () => {
        resetToDemoData();
        onRefreshAllData();
        pushToast('Data reset to default demo dataset.', 'info');
      },
    });
  };

  const handleStartFromScratch = () => {
    setConfirmDialog({
      title: 'Start From Scratch',
      message: 'کیا آپ تمام پرانے ٹرانزیکشنز، آرڈرز اور حاضری کا ڈیٹا صاف کر کے تازہ شروعات کرنا چاہتے ہیں؟\n\nThis will clear all transactions, COD orders, and attendance records (resetting balances to Rs. 0) while keeping your business profile, shipping partner settings, demo item, and reseller settings intact.',
      confirmLabel: 'Clear & Start Fresh',
      danger: true,
      onConfirm: () => {
        startFromScratchData();
        onRefreshAllData();
        pushToast('تمام ٹرانزیکشنز اور آرڈرز صاف کر دیے گئے۔ System is now fresh from scratch.', 'success');
      },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs">
              <Building className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                100DAGAR Admin Settings &amp; Security
                <span className="text-xs font-normal font-urdu text-amber-600 dark:text-amber-400">
                  (سیٹنگز، سیکیورٹی و بیک اپ)
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage business profile, Pakistani payments, WASAL delivery, user PINs, login audit logs, and backups.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Profile &amp; Payments (کاروبار و پے منٹس)</span>
          </button>

          <button
            onClick={() => setActiveTab('wasal')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'wasal'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>WASAL Delivery &amp; Shipday (واصل ڈلیوری)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login Security &amp; User PINs (لاگ ان سیکیورٹی و پن ہسٹری)</span>
            {auditLogs.some((l) => l.status === 'failed') && (
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Data Management &amp; Backup (بیک اپ و ری سیٹ)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BUSINESS PROFILE & PAKISTANI PAYMENT CHANNELS */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Organization Details / کاروباری تفصیلات
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tagline / کاروباری شعبہ
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp Mobile
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse / Store Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Pakistani Mobile Wallets */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pakistani Mobile Wallets / موبائل والٹ اکاؤنٹ
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* EasyPaisa */}
                <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-2">
                    EasyPaisa Account (ایزی پیسہ)
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Account Title</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.easyPaisa?.accountTitle || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              easyPaisa: {
                                ...formData.paymentChannels.easyPaisa,
                                accountTitle: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Mobile / Account Number</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.easyPaisa?.accountNumber || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              easyPaisa: {
                                ...formData.paymentChannels.easyPaisa,
                                accountNumber: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* JazzCash */}
                <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20">
                  <span className="text-xs font-bold text-red-800 dark:text-red-300 block mb-2">
                    JazzCash Account (جاز کیش)
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Account Title</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.jazzCash?.accountTitle || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              jazzCash: {
                                ...formData.paymentChannels.jazzCash,
                                accountTitle: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Mobile / Account Number</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.jazzCash?.accountNumber || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              jazzCash: {
                                ...formData.paymentChannels.jazzCash,
                                accountNumber: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SadaPay */}
                <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 block mb-2">
                    SadaPay Account (سدا پے)
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Account Title</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.sadaPay?.accountTitle || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              sadaPay: {
                                ...formData.paymentChannels.sadaPay,
                                accountTitle: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">IBAN / SadaPay Mobile</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.sadaPay?.accountNumber || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              sadaPay: {
                                ...formData.paymentChannels.sadaPay,
                                accountNumber: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account */}
                <div className="p-3.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20">
                  <span className="text-xs font-bold text-purple-800 dark:text-purple-300 block mb-2">
                    Pakistani Commercial Bank IBAN
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">Bank Name</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.bankDetails?.bankName || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              bankDetails: {
                                ...formData.paymentChannels.bankDetails,
                                bankName: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400">IBAN / Account Number</label>
                      <input
                        type="text"
                        value={formData.paymentChannels?.bankDetails?.iban || formData.paymentChannels?.bankDetails?.accountNumber || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentChannels: {
                              ...formData.paymentChannels,
                              bankDetails: {
                                ...formData.paymentChannels.bankDetails,
                                iban: e.target.value,
                                accountNumber: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Automation Schedules */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Automated Collection Schedules / خودکار شیڈول
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weekly Due Reminder Day (ہفتہ وار یاد دہانی کا دن)
                  </label>
                  <select
                    value={formData.weeklyReminderDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeklyReminderDay: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Monday">Monday (پیر)</option>
                    <option value="Tuesday">Tuesday (منگل)</option>
                    <option value="Wednesday">Wednesday (بدھ)</option>
                    <option value="Thursday">Thursday (جمعرات)</option>
                    <option value="Friday">Friday (جمعہ)</option>
                    <option value="Saturday">Saturday (ہفتہ)</option>
                    <option value="Sunday">Sunday (اتوار)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Statement Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.monthlyReminderDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyReminderDay: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Changes saved successfully!
                </span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Profile Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: WASAL DELIVERY PARTNER & SHIPDAY API */}
      {activeTab === 'wasal' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  WASAL Delivery Partner &amp; Shipday API Integration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure live shipping partner credentials, dispatch origin warehouse, and customer tracking helpline
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shipping Partner Name / ڈیلیوری کمپنی
                  </label>
                  <input
                    type="text"
                    value={formData.shippingPartner?.name || 'WASAL delivery'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingPartner: {
                          ...(formData.shippingPartner || {
                            apiKey: 'SHIPDAY_API_KEY_LIVE_100D',
                            shipperPhone: '0312 5256 266',
                            helpline: '0312 5256 266',
                            originAddress: '100DAGAR Main Warehouse, Madina Market, Lahore',
                            enabled: true,
                            autoSync: true,
                          }),
                          name: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Official courier partner: WASAL delivery</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shipday API Key / شپ ڈے اے پی آئی کی
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. key_shipday_live_..."
                    value={formData.shippingPartner?.apiKey || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingPartner: {
                          ...(formData.shippingPartner || {
                            name: 'WASAL delivery',
                            shipperPhone: '0312 5256 266',
                            helpline: '0312 5256 266',
                            originAddress: '100DAGAR Main Warehouse, Madina Market, Lahore',
                            enabled: true,
                            autoSync: true,
                          }),
                          apiKey: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Live API key used to create orders and pull live dispatch updates</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shipper Contact Number / ڈیلیوری ہیلپ لائن (گاہکوں کے لیے)
                  </label>
                  <input
                    type="text"
                    value={formData.shippingPartner?.shipperPhone || '0312 5256 266'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingPartner: {
                          ...(formData.shippingPartner || {
                            name: 'WASAL delivery',
                            apiKey: 'SHIPDAY_API_KEY_LIVE_100D',
                            originAddress: '100DAGAR Main Warehouse, Madina Market, Lahore',
                            enabled: true,
                            autoSync: true,
                          }),
                          shipperPhone: e.target.value,
                          helpline: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Printed on packing slips &amp; used by buyers to inquire about delivery</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Origin Address / گودام کا پتہ
                  </label>
                  <input
                    type="text"
                    value={formData.shippingPartner?.originAddress || '100DAGAR Main Warehouse, Madina Market, Lahore'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingPartner: {
                          ...(formData.shippingPartner || {
                            name: 'WASAL delivery',
                            apiKey: 'SHIPDAY_API_KEY_LIVE_100D',
                            shipperPhone: '0312 5256 266',
                            helpline: '0312 5256 266',
                            enabled: true,
                            autoSync: true,
                          }),
                          originAddress: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Pick-up location for WASAL delivery riders</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.shippingPartner?.autoSync ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippingPartner: {
                          ...(formData.shippingPartner || {
                            name: 'WASAL delivery',
                            apiKey: 'SHIPDAY_API_KEY_LIVE_100D',
                            shipperPhone: '0312 5256 266',
                            helpline: '0312 5256 266',
                            originAddress: '100DAGAR Main Warehouse, Madina Market, Lahore',
                            enabled: true,
                          }),
                          autoSync: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Auto Sync Delivery Status with WASAL delivery / Shipday webhooks</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Shipping partner settings saved!
                </span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Shipping Settings
              </button>
            </div>
          </form>

          {/* Delivery Cities & Nested Areas Availability Manager */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cities &amp; Areas Management (شہر اور علاقے)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Default city: <b>Muzaffarabad</b>. Click any city row to add, edit, or activate/deactivate its nested Areas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetSettingsCities}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 rounded-lg cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cities</span>
              </button>
            </div>

            {/* Add City Row */}
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newDeliveryCity}
                onChange={(e) => setNewDeliveryCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddSettingsCity();
                  }
                }}
                placeholder="Add new city (e.g. Bagh, Kotli, Chakwal)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handleAddSettingsCity()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add City</span>
              </button>
            </div>

            {/* Cities Accordion with Nested Areas */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {deliveryCities.map((c) => {
                const cityKey = c.id || c.name;
                const isExpanded = expandedCityId === cityKey;
                const areas = c.areas || [];
                const activeAreaCount = areas.filter((a) => a.allowed).length;

                return (
                  <div key={cityKey} className="bg-white dark:bg-slate-900">
                    <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={c.allowed}
                          onChange={() => void handleToggleSettingsCity(c)}
                          className="w-4 h-4 rounded text-emerald-600 cursor-pointer shrink-0"
                          title={c.allowed ? 'Active for checkout' : 'Disabled for checkout'}
                        />

                        <button
                          type="button"
                          onClick={() => setExpandedCityId(isExpanded ? null : cityKey)}
                          className="flex items-center gap-1.5 text-left cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          {editingCityId === cityKey ? null : (
                            <span
                              className={`text-xs font-bold ${
                                c.allowed
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400 line-through'
                              }`}
                            >
                              {c.name}
                            </span>
                          )}
                        </button>

                        {editingCityId === cityKey && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingCityName}
                              onChange={(e) => setEditingCityName(e.target.value)}
                              className="px-2 py-1 text-xs border border-amber-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveCityRename(c)}
                              className="px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCityId(null)}
                              className="px-2 py-1 text-[11px] text-slate-500 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {activeAreaCount}/{areas.length} Areas
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCityId(cityKey);
                            setEditingCityName(c.name);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                          title="Edit city name"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedCityId(isExpanded ? null : cityKey)}
                          className="px-2 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                        >
                          {isExpanded ? 'Hide Areas' : 'Manage Areas'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={newAreaInputs[cityKey] || ''}
                            onChange={(e) =>
                              setNewAreaInputs((prev) => ({ ...prev, [cityKey]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleAddAreasToCity(c);
                              }
                            }}
                            placeholder={`Add area(s) in ${c.name} (comma-separated allowed, e.g. Chattar, Plate, Gojra)`}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => void handleAddAreasToCity(c)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Area(s)</span>
                          </button>
                        </div>

                        {areas.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            No predefined areas yet for {c.name}. Add areas above so customers can pick from a dropdown.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {areas.map((area) => (
                              <div
                                key={area.id}
                                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                                  area.allowed
                                    ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-70'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={area.allowed}
                                    onChange={() =>
                                      void handleToggleCityArea(c, area.id, area.allowed)
                                    }
                                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer shrink-0"
                                  />
                                  {editingAreaId === area.id ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <input
                                        type="text"
                                        value={editingAreaName}
                                        onChange={(e) => setEditingAreaName(e.target.value)}
                                        className="w-full px-1.5 py-0.5 text-xs border border-amber-400 rounded bg-white dark:bg-slate-800"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => void handleSaveAreaRename(area.id)}
                                        className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded cursor-pointer"
                                      >
                                        OK
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`truncate font-medium ${
                                        area.allowed
                                          ? 'text-slate-800 dark:text-slate-200'
                                          : 'text-slate-400 line-through'
                                      }`}
                                    >
                                      {area.name}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAreaId(area.id);
                                      setEditingAreaName(area.name);
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                                    title="Edit area"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRemoveArea(area.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Remove area"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOGIN SECURITY, OWNER MASTER PIN & USER AUDIT LOGS */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Card 1: Owner Master PIN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <Lock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Store Owner Master PIN / ایڈمن ماسٹر سیکیورٹی پن
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Master PIN
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Default Master PIN is <span className="font-mono font-bold text-amber-600">580987</span>. Store owner can update this PIN anytime here.
                  </p>
                </div>
              </div>

              {/* Current PIN Display */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">Current PIN:</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-widest">
                  {showMasterPin ? ownerMasterPin : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMasterPin(!showMasterPin)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title={showMasterPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showMasterPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Change Owner PIN Form */}
            <form onSubmit={handleUpdateMasterPin} className="mt-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Master PIN (نیا ماسٹر پن)
                  </label>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="e.g. 580987"
                    value={newMasterPin}
                    onChange={(e) => setNewMasterPin(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Master PIN (تصدیق کریں)
                  </label>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="e.g. 580987"
                    value={confirmMasterPin}
                    onChange={(e) => setConfirmMasterPin(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Reset / Update Master PIN</span>
                  </button>
                </div>
              </div>

              {pinChangeMsg && (
                <div
                  className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                    pinChangeMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {pinChangeMsg.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pinChangeMsg.text}</span>
                </div>
              )}
            </form>
          </div>

          {/* Card 2: Security Policy & User PIN Directory */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Customer &amp; Reseller Security PINs / صارفین کے پن کوڈز
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Policy: Default PIN is the <span className="font-semibold text-slate-900 dark:text-white">last 6 digits of mobile number</span>. Users can change PIN inside their personal portal.
                  </p>
                </div>
              </div>

              {/* Search & Role Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or phone..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-44"
                  />
                </div>

                <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 text-xs">
                  <button
                    onClick={() => setUserRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      userRoleFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({combinedUsers.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('customer')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      userRoleFilter === 'customer'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Customers ({customers.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('reseller')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      userRoleFilter === 'reseller'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Resellers ({resellers.length})
                  </button>
                </div>
              </div>
            </div>

            {userListNotice && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{userListNotice}</span>
              </div>
            )}

            {/* Users Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">User / Name</th>
                    <th className="py-2.5 px-3 font-semibold">Mobile Number</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Active PIN (فعال پن)</th>
                    <th className="py-2.5 px-3 font-semibold">Default 6 Digits</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No registered users found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const defaultDigits = getDefaultPinForPhone(u.phone);
                      const currentPin = u.pin || defaultDigits;
                      const isRevealed = !!revealedPins[u.id];
                      const isCustomized = !!u.pin && u.pin !== defaultDigits;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {u.name}
                            </span>
                            {u.urduName && (
                              <span className="text-[11px] font-urdu text-slate-500">
                                {u.urduName}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {u.phone}
                          </td>

                          <td className="py-2.5 px-3">
                            {u.userType === 'customer' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Customer
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                Reseller
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold tracking-widest text-slate-900 dark:text-white">
                                {isRevealed ? currentPin : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealPin(u.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                                title={isRevealed ? 'Hide' : 'Reveal'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              {isCustomized ? (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                                  Custom
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {defaultDigits}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleResetUserPinToDefault(u, u.userType)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1"
                                title="Reset to last 6 digits of mobile number"
                              >
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                                <span>Reset to Default</span>
                              </button>

                              <button
                                onClick={() => handleSetCustomUserPin(u, u.userType)}
                                className="px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                                title="Manually assign custom PIN"
                              >
                                Set PIN
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

          {/* Card 3: Login Activity & Security Audit Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Login Activity &amp; Security Audit Trail / لاگ ان آڈٹ لاگ
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {auditLogs.length} Records
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive ledger of all customer, reseller, and owner authentication attempts.
                  </p>
                </div>
              </div>

              {/* Actions & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-40"
                  />
                </div>

                <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 text-xs">
                  <button
                    onClick={() => setLogFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      logFilterStatus === 'all'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({auditLogs.length})
                  </button>
                  <button
                    onClick={() => setLogFilterStatus('success')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      logFilterStatus === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Success
                  </button>
                  <button
                    onClick={() => setLogFilterStatus('failed')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      logFilterStatus === 'failed'
                        ? 'bg-red-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Failed
                  </button>
                </div>

                <button
                  onClick={handleRefreshAuditLogs}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleClearAuditLogs}
                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                  title="Clear Audit History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audit Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Date &amp; Time</th>
                    <th className="py-2.5 px-3 font-semibold">User &amp; Mobile</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Security PIN</th>
                    <th className="py-2.5 px-3 font-semibold">Device &amp; Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No login events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const logDate = new Date(log.timestamp);
                      const formattedTime = !isNaN(logDate.getTime())
                        ? logDate.toLocaleString('en-PK', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : log.timestamp;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formattedTime}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {log.userName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {log.phone}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {log.role === 'admin' || log.role === 'super_admin' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                                {log.role === 'super_admin' ? 'Super Admin' : 'Owner / Admin'}
                              </span>
                            ) : log.role === 'reseller' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Reseller
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                Customer
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {log.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <Check className="w-3 h-3" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                <ShieldAlert className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {log.usedPin || '••••••'}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            <span className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                              {log.notes || 'Authentication attempt'}
                            </span>
                            {log.ipOrDevice && (
                              <span className="text-[10px] text-slate-400">
                                Client: {log.ipOrDevice}
                              </span>
                            )}
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
      )}

      {/* TAB 4: DATA MANAGEMENT & BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Data Management &amp; Offline Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export full ledger backups including customer balances, Pakistani payment channels, WASAL shipping settings, login audit history, and user security PINs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={async () => {
                const res = await apiCreateServerBackup('manual_settings');
                if (res.ok) {
                  pushToast('Verified SQLite server backup snapshot created in /data/backups.', 'success');
                } else {
                  pushToast(res.error || 'Server backup failed.', 'error');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg cursor-pointer shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              Create Verified Server SQLite Backup
            </button>

            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Complete JSON Backup
            </button>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Restore From JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={handleStartFromScratch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg cursor-pointer"
              title="Clear all transactions, orders and debt to test from scratch (0 balance)"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              Start From Scratch (تازہ شروعات / ڈیٹا صاف)
            </button>

            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg cursor-pointer ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to Pakistan Demo Data
            </button>
          </div>
        </div>
      )}

      <ToastBanner
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      <ConfirmDialogModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />
      <InputPromptModal
        promptState={inputPrompt}
        onClose={() => setInputPrompt(null)}
      />
    </div>
  );
};
