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
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { exportAllDataJSON, importAllDataJSON, resetToDemoData, startFromScratchData } from '../utils/storage';

interface SettingsViewProps {
  profile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onRefreshAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onSaveProfile,
  onRefreshAllData,
}) => {
  const [formData, setFormData] = useState<BusinessProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
          alert('Backup restored successfully!');
          onRefreshAllData();
        } else {
          alert('Failed to parse backup file. Please ensure it is a valid JSON backup.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data back to the default 100DAGAR demo dataset with Pakistani channels and bilingual templates?')) {
      resetToDemoData();
      onRefreshAllData();
      alert('Data reset to default demo dataset.');
    }
  };

  const handleStartFromScratch = () => {
    if (
      confirm(
        'کیا آپ تمام پرانے ٹرانزیکشنز، آرڈرز اور حاضری کا ڈیٹا صاف کر کے تازہ شروعات کرنا چاہتے ہیں؟\nAre you sure you want to start from scratch?\n\nThis will clear all transactions, COD orders, and attendance records (resetting balances to Rs. 0) so you can test fresh calculations, while keeping your business profile, shipping partner settings, demo item, and reseller settings intact.'
      )
    ) {
      startFromScratchData();
      onRefreshAllData();
      alert('تمام ٹرانزیکشنز اور آرڈرز صاف کر دیے گئے۔ اب آپ نئی انٹریز درج کر سکتے ہیں!\nAll test transactions and orders cleared. System is now fresh and ready for live calculations from scratch.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            <Building className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              100DAGAR Business Profile &amp; Pakistani Payment Channels
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure EasyPaisa, JazzCash, SadaPay, Bank Account IBAN, and weekly collection schedules
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Business Details */}
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
                  Business Address / کاروباری پتہ
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NTN / STRN (National Tax No.)
                </label>
                <input
                  type="text"
                  value={formData.ntnNumber}
                  onChange={(e) => setFormData({ ...formData, ntnNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Currency (کرنسی)
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-500">Defaults to Rs. (Pakistani Rupee)</span>
              </div>
            </div>
          </div>

          {/* Pakistani Payment Channels Config */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pakistani Payment Channels / ادائیگی کے ذرائع
                </h3>
                <p className="text-xs text-slate-500">
                  These details are automatically placed in WhatsApp due notices, bills, and payment requests
                </p>
              </div>
            </div>

            {/* EasyPaisa Box */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  EasyPaisa (ایزی پیسہ)
                </span>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentChannels.easyPaisa?.enabled ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          easyPaisa: {
                            ...formData.paymentChannels.easyPaisa,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Enable EasyPaisa
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    EasyPaisa Account Title
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.easyPaisa?.accountTitle || ''}
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    EasyPaisa Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={formData.paymentChannels.easyPaisa?.accountNumber || ''}
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
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* JazzCash Box */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  JazzCash (جاز کیش)
                </span>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentChannels.jazzCash?.enabled ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          jazzCash: {
                            ...formData.paymentChannels.jazzCash,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Enable JazzCash
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    JazzCash Account Title
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.jazzCash?.accountTitle || ''}
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    JazzCash Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="03019876543"
                    value={formData.paymentChannels.jazzCash?.accountNumber || ''}
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
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* SadaPay Box */}
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  SadaPay (سادہ پے)
                </span>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentChannels.sadaPay?.enabled ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          sadaPay: {
                            ...formData.paymentChannels.sadaPay,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Enable SadaPay
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    SadaPay Account Title
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.sadaPay?.accountTitle || ''}
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    SadaTag / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="@100dagar"
                    value={formData.paymentChannels.sadaPay?.sadaTag || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          sadaPay: {
                            ...formData.paymentChannels.sadaPay,
                            sadaTag: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    SadaPay Mobile / IBAN
                  </label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={formData.paymentChannels.sadaPay?.accountNumber || ''}
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
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Pakistani Bank Account Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  Pakistani Bank Account &amp; IBAN (پاکستانی بینک کھاتہ)
                </span>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentChannels.bankDetails?.enabled ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          bankDetails: {
                            ...formData.paymentChannels.bankDetails,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Enable Bank Account
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Bank Name (e.g. Meezan Bank, HBL, UBL, Bank Alfalah)
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.bankDetails?.bankName || ''}
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
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Account Beneficiary Title
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.bankDetails?.accountTitle || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          bankDetails: {
                            ...formData.paymentChannels.bankDetails,
                            accountTitle: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.paymentChannels.bankDetails?.accountNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          bankDetails: {
                            ...formData.paymentChannels.bankDetails,
                            accountNumber: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    IBAN (International Bank Account Number)
                  </label>
                  <input
                    type="text"
                    placeholder="PK36MEZN0001020304050607"
                    value={formData.paymentChannels.bankDetails?.iban || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentChannels: {
                          ...formData.paymentChannels,
                          bankDetails: {
                            ...formData.paymentChannels.bankDetails,
                            iban: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Partner & Shipday API Configuration */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Shipping Partner &amp; Shipday API Integration (شپنگ پارٹنر و شپ ڈے سیٹنگ)
                </h3>
                <p className="text-xs text-slate-500">
                  Configure WASAL delivery partner, Shipday API key, and customer delivery inquiry helpline (0312 5256 266)
                </p>
              </div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shippingPartner?.enabled ?? true}
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
                          autoSync: true,
                        }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                Enable Shipping Integration
              </label>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Delivery Courier Name / ڈیلیوری کمپنی کا نام
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
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Default: WASAL delivery</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
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
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Used to fetch tracking updates and sync orders with Shipday</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Shipper Contact Number / ڈیلیوری ہیلپ لائن (کسٹمرز کے سوالات کے لیے)
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
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Printed on packing slips &amp; used by customers to inquire about dispatch</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
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
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">Pick-up location sent to WASAL delivery dispatchers</span>
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
                  <span>Auto Sync Delivery Status with WASAL delivery / Shipday webhook</span>
                </label>
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
                <span className="text-[10px] text-slate-500">
                  Sends weekly reminders strictly to parties with positive due balance
                </span>
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

      {/* Backup and Data Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Data Management &amp; Offline Backup
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Export full ledger backups including customer balances, Pakistani payment channels, WASAL shipping settings, and broadcast history.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Complete JSON Backup
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
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
    </div>
  );
};
