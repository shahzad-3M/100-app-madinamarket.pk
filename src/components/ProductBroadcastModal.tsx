import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Megaphone,
  Link as LinkIcon,
  Sparkles,
  Copy,
  Check,
  Users,
  Filter,
  MapPin,
  BookmarkPlus,
} from 'lucide-react';
import {
  BroadcastContact,
  BusinessProfile,
  Customer,
  ProductBroadcast,
  ReminderTemplate,
} from '../types';
import { BroadcastSegmentFilters } from '../utils/automationEngine';
import { buildProductBroadcastMessage, openWhatsAppDirect } from '../utils/whatsapp';

interface ProductBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcast: (
    product: ProductBroadcast,
    filters: BroadcastSegmentFilters,
    sendFirstImmediately: boolean,
    saveCampaign: boolean
  ) => void;
  customers: Customer[];
  manualContacts?: BroadcastContact[];
  profile: BusinessProfile;
  templates: ReminderTemplate[];
}

export const ProductBroadcastModal: React.FC<ProductBroadcastModalProps> = ({
  isOpen,
  onClose,
  onBroadcast,
  customers,
  manualContacts = [],
  profile,
  templates,
}) => {
  const [productName, setProductName] = useState('');
  const [urduProductName, setUrduProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [productLink, setProductLink] = useState('https://100dagar.pk/new-arrival');
  const [copied, setCopied] = useState(false);

  // Segmentation Filters (Area-wise, Age-wise, Gender-wise, Group-wise)
  const [filterArea, setFilterArea] = useState('all');
  const [filterAgeGroup, setFilterAgeGroup] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [includeManualContacts, setIncludeManualContacts] = useState(true);
  const [saveCampaign, setSaveCampaign] = useState(true);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  // Real-time recipient matching
  const matchesFilter = (
    cityOrArea: string | undefined,
    ageGroup: string | undefined,
    gender: string | undefined,
    group: string | undefined
  ) => {
    if (filterArea !== 'all') {
      const areaVal = (cityOrArea || '').toLowerCase();
      const target = filterArea.toLowerCase();
      if (!areaVal.includes(target) && !target.includes(areaVal)) return false;
    }
    if (filterAgeGroup !== 'all' && ageGroup !== filterAgeGroup) return false;
    if (filterGender !== 'all' && gender !== filterGender) return false;
    if (filterGroup !== 'all' && group !== filterGroup) return false;
    return true;
  };

  const matchedCustomers = includeCustomers
    ? customers.filter((c) => {
        if (c.status !== 'active') return false;
        const areaStr = [c.city, c.area].filter(Boolean).join(' ');
        return matchesFilter(areaStr, c.ageGroup, c.gender, c.customerType);
      })
    : [];

  const matchedManualContacts = includeManualContacts
    ? manualContacts.filter((mc) => {
        const areaStr = [mc.city, mc.area].filter(Boolean).join(' ');
        return matchesFilter(areaStr, mc.ageGroup, mc.gender, mc.type);
      })
    : [];

  const totalMatchedCount = matchedCustomers.length + matchedManualContacts.length;

  const sampleCustomer = matchedCustomers[0] || customers[0] || { name: 'Valued Customer' };

  const currentProduct: ProductBroadcast = {
    id: `prod_${Date.now()}`,
    productName: productName || '5-in-1 Hot Air Styler & Hair Dryer Brush',
    urduName: urduProductName || 'فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر',
    description: description || 'High-demand wholesale item with 50% discount savings.',
    price: parseFloat(price) || 3490,
    productLink: productLink.trim(),
    targetArea: filterArea,
    targetAgeGroup: filterAgeGroup,
    targetGender: filterGender,
    createdAt: new Date().toISOString().split('T')[0],
  };

  const previewMessage = buildProductBroadcastMessage(
    sampleCustomer as Customer,
    currentProduct,
    profile,
    templates
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (sendNow: boolean) => {
    setFormError('');
    if (!productName.trim()) {
      setFormError('Please enter product / item name.');
      return;
    }
    if (!productLink.trim()) {
      setFormError('Please enter product or catalog link.');
      return;
    }

    const filters: BroadcastSegmentFilters = {
      area: filterArea,
      ageGroup: filterAgeGroup,
      gender: filterGender,
      group: filterGroup,
      includeCustomers,
      includeManualContacts,
    };

    onBroadcast(currentProduct, filters, sendNow, saveCampaign);

    if (sendNow) {
      const firstRecipient = matchedCustomers[0] || matchedManualContacts[0];
      if (firstRecipient) {
        openWhatsAppDirect(firstRecipient.phone, previewMessage);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#FFD200] text-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-950 text-amber-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Segmented Broadcast Campaign &amp; WhatsApp Dispatch
              </h2>
              <span className="text-[11px] font-medium text-slate-800">
                ایریا، عمر، جنس اور گروپس کے لحاظ سے مخصوص واٹس ایپ براڈکاسٹ
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-800 hover:text-black rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left Column: Product Information (5 Cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              1. Product &amp; Offer Details
            </h3>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 5-in-1 Hot Air Styler"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Name in Urdu (اردو نام)
              </label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثال: فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر"
                value={urduProductName}
                onChange={(e) => setUrduProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wholesale Price ({profile.currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="3490"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-1.5 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Save Campaign?
                </label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="saveCamp"
                    checked={saveCampaign}
                    onChange={(e) => setSaveCampaign(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <label htmlFor="saveCamp" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                    Save to History
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                Product Website Link / Catalog URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://100dagar.pk/products/item-link"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                className="w-full px-3 py-1.5 font-mono text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Offer Highlight / Selling Points
              </label>
              <textarea
                rows={2}
                placeholder="Original lot with guarantee, instant cash on delivery available..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Middle Column: Multi-Dimensional Segmentation Filters (3.5 Cols) */}
          <div className="lg:col-span-3 space-y-3.5 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>2. Target Audience Segmentation</span>
            </h3>

            {/* Area Filter */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Area / City (علاقہ وار)
              </label>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">All Cities &amp; Areas (تمام پاکستان)</option>
                <option value="Lahore">Lahore (لاہور)</option>
                <option value="Karachi">Karachi (کراچی)</option>
                <option value="Rawalpindi">Rawalpindi / Islamabad (راولپنڈی/اسلام آباد)</option>
                <option value="Faisalabad">Faisalabad (فیصل آباد)</option>
                <option value="Multan">Multan (ملتان)</option>
                <option value="Peshawar">Peshawar (پشاور)</option>
                <option value="Gujranwala">Gujranwala (گوجرانوالہ)</option>
                <option value="Sialkot">Sialkot (سیالکوٹ)</option>
              </select>
            </div>

            {/* Age Group Filter */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Age Group (عمر کے لحاظ سے)
              </label>
              <select
                value={filterAgeGroup}
                onChange={(e) => setFilterAgeGroup(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">All Age Groups (تمام عمر)</option>
                <option value="18-25">18–25 (Youth / Gen Z)</option>
                <option value="26-35">26–35 (Young Professionals)</option>
                <option value="36-50">36–50 (Family / Retailers)</option>
                <option value="50+">50+ (Senior)</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gender (جنس کے لحاظ سے)
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">All Genders (مرد و خواتین)</option>
                <option value="male">Male (مردانہ)</option>
                <option value="female">Female (خواتین)</option>
              </select>
            </div>

            {/* Customer Group Filter */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Group (کسٹمر کی قسم)
              </label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">All Groups (تمام پارٹیوں کو)</option>
                <option value="retail">Retail Stores Only (صرف دکانیں)</option>
                <option value="individual">Individuals (انفرادی خریدار)</option>
                <option value="lead">New Leads (نئے رابطے)</option>
              </select>
            </div>

            {/* Contact Pool Checkboxes */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incCust"
                  checked={includeCustomers}
                  onChange={(e) => setIncludeCustomers(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500"
                />
                <label htmlFor="incCust" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Ledger Customers ({matchedCustomers.length})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incMan"
                  checked={includeManualContacts}
                  onChange={(e) => setIncludeManualContacts(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-amber-500"
                />
                <label htmlFor="incMan" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Manual Contacts ({matchedManualContacts.length})
                </label>
              </div>
            </div>

            {/* Total Matched Badge */}
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center font-mono">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block uppercase font-bold">
                Target Matched Audience
              </span>
              <span className="text-base font-black text-emerald-900 dark:text-emerald-100">
                {totalMatchedCount} Recipients
              </span>
            </div>
          </div>

          {/* Right Column: WhatsApp Preview (3.5 Cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  3. WhatsApp Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="bg-emerald-950/10 dark:bg-slate-950 p-3 rounded-xl border border-emerald-200 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-lg shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60 font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {previewMessage}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1.5 text-right font-mono">
                  Bilingual Urdu &amp; English · Direct link included
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={totalMatchedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-200 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Queue &amp; Send First Now</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={totalMatchedCount === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Queue Broadcast for All ({totalMatchedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
