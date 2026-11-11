import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Phone,
  User,
  KeyRound,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppUser, Customer, Reseller, UserRole } from '../types';
import {
  getDefaultPinForPhone,
  getOwnerPin,
  logUserLogin,
  updateCustomerPin,
  updateOwnerPin,
  updateResellerPin,
} from '../utils/storage';

interface LoginRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectRole: (role: UserRole, userDetails?: Partial<AppUser>) => void;
  customers?: Customer[];
  resellers?: Reseller[];
  onLogout?: () => void;
}

export const LoginRoleModal: React.FC<LoginRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
  customers = [],
  resellers = [],
  onLogout,
}) => {
  const isGuest =
    currentUser.role === 'customer' &&
    (!currentUser.phone || currentUser.phone === '03125256266') &&
    currentUser.name === 'Online Customer';

  const [modalMode, setModalMode] = useState<'login' | 'account'>(
    isGuest ? 'login' : 'account'
  );

  // Unified Single Login Inputs
  const [identifier, setIdentifier] = useState(''); // Mobile number or 'admin' or reseller code
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Change PIN State inside Account Portal
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setChangePinError('');
      setChangePinSuccess('');
      if (!isGuest && currentUser.name !== 'Online Customer') {
        setModalMode('account');
      } else {
        setModalMode('login');
      }
    }
  }, [isOpen, isGuest, currentUser]);

  if (!isOpen) return null;

  // COMBINED LOGIN HANDLER: Decides automatically whether user is Admin, Reseller, or Customer
  const handleCombinedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanId = identifier.trim().replace(/[\s-]/g, '');
    const cleanPin = pin.trim();

    if (!cleanId) {
      setErrorMessage('براہ کرم اپنا موبائل نمبر درج کریں۔ (Please enter your mobile number)');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMessage('براہ کرم سیکیورٹی پن درج کریں۔ (Please enter your valid security PIN)');
      return;
    }

    // 1. Check Store Owner / Super Admin
    const ownerPin = getOwnerPin();
    if (
      (cleanId === '03125256266' || cleanId.toLowerCase() === 'admin' || cleanId === '580987') &&
      cleanPin === ownerPin
    ) {
      logUserLogin({
        userName: 'Al-Haj Muhammad Asif',
        phone: '03125256266',
        role: 'admin',
        status: 'success',
        ipOrDevice: 'Web Applet / Secure Terminal',
        notes: 'Owner / Super Admin authenticated with Master PIN',
        usedPin: '••••••',
      });
      onSelectRole('admin', {
        id: 'user_admin_1',
        name: 'Al-Haj Muhammad Asif',
        urduName: 'الحاج محمد آصف (اسٹور مالک و ایڈمن)',
        phone: '03125256266',
        resellerCode: 'RES-100D-01',
      });
      onClose();
      return;
    }

    // 2. Check Reseller Partner
    const matchingReseller = resellers.find(
      (r) =>
        r.phone.replace(/[\s-]/g, '') === cleanId ||
        r.referralCode.toLowerCase() === cleanId.toLowerCase()
    );

    if (matchingReseller) {
      const expectedPin = matchingReseller.pin || getDefaultPinForPhone(matchingReseller.phone);
      if (cleanPin === expectedPin) {
        logUserLogin({
          userId: matchingReseller.id,
          userName: matchingReseller.name,
          phone: matchingReseller.phone,
          role: 'reseller',
          status: 'success',
          ipOrDevice: 'Web Applet / Reseller Device',
          notes: 'Reseller partner authenticated with PIN',
          usedPin: '••••••',
        });
        onSelectRole('reseller', {
          id: matchingReseller.id,
          name: matchingReseller.name,
          urduName: matchingReseller.urduName || 'ری سیلر پارٹنر',
          phone: matchingReseller.phone,
          resellerCode: matchingReseller.referralCode,
        });
        onClose();
        return;
      } else {
        logUserLogin({
          userId: matchingReseller.id,
          userName: matchingReseller.name,
          phone: matchingReseller.phone,
          role: 'reseller',
          status: 'failed',
          ipOrDevice: 'Web Applet',
          notes: 'Invalid PIN entered for reseller account',
          usedPin: '••••••',
        });
        setErrorMessage('غلط سیکیورٹی پن! درست پن درج کریں۔ (Incorrect security PIN code)');
        return;
      }
    }

    // 3. Check Existing Customer
    const matchingCustomer = customers.find(
      (c) => c.phone.replace(/[\s-]/g, '') === cleanId
    );

    if (matchingCustomer) {
      const expectedPin = matchingCustomer.pin || getDefaultPinForPhone(matchingCustomer.phone);
      if (cleanPin === expectedPin) {
        logUserLogin({
          userId: matchingCustomer.id,
          userName: matchingCustomer.name,
          phone: matchingCustomer.phone,
          role: 'customer',
          status: 'success',
          ipOrDevice: 'Mobile Web Applet',
          notes: 'Customer authenticated with PIN',
          usedPin: '••••••',
        });
        onSelectRole('customer', {
          id: matchingCustomer.id,
          name: matchingCustomer.name,
          urduName: matchingCustomer.urduName || 'آن لائن کسٹمر',
          phone: matchingCustomer.phone,
          customerId: matchingCustomer.id,
        });
        onClose();
        return;
      } else {
        logUserLogin({
          userId: matchingCustomer.id,
          userName: matchingCustomer.name,
          phone: matchingCustomer.phone,
          role: 'customer',
          status: 'failed',
          ipOrDevice: 'Mobile Web Applet',
          notes: 'Incorrect customer PIN entered',
          usedPin: '••••••',
        });
        setErrorMessage(
          'غلط سیکیورٹی پن! درست پن درج کریں۔ اگر آپ نے پن تبدیل نہیں کیا تو ڈیفالٹ پن آپ کے موبائل کے آخری 6 ہندسے ہیں۔\n(Incorrect PIN. Default PIN is the last 6 digits of your phone)'
        );
        return;
      }
    }

    // 4. New Customer Registration via mobile number
    const defaultPin = getDefaultPinForPhone(cleanId);
    if (cleanPin === defaultPin) {
      const newCustName = fullName.trim() || `Customer ${cleanId.slice(-4)}`;
      logUserLogin({
        userName: newCustName,
        phone: cleanId,
        role: 'customer',
        status: 'success',
        ipOrDevice: 'Mobile Web Applet',
        notes: 'New customer instant registration with default PIN',
        usedPin: '••••••',
      });
      onSelectRole('customer', {
        id: `cust_${Date.now()}`,
        name: newCustName,
        urduName: 'آن لائن کسٹمر',
        phone: cleanId,
        customerId: `cust_${Date.now()}`,
      });
      onClose();
      return;
    }

    // If none matched:
    setErrorMessage(
      'غلط موبائل نمبر یا پن کوڈ۔ اگر آپ پہلی بار لاگ ان ہو رہے ہیں تو پن کوڈ اپنے موبائل نمبر کے آخری 6 ہندسے درج کریں۔\n(Invalid credentials. For new users, default PIN is the last 6 digits of your phone)'
    );
  };

  // CHANGE PIN HANDLER INSIDE USER PORTAL
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    setChangePinSuccess('');

    if (!currentPinInput.trim()) {
      setChangePinError('موجودہ پن درج کریں۔ (Please enter current PIN)');
      return;
    }

    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setChangePinError('نیا پن کم از کم 4 سے 6 ہندسوں پر مشتمل ہونا چاہیے۔ (New PIN must be at least 4 digits)');
      return;
    }

    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setChangePinError('نیا پن اور تصدیقی پن مماثل نہیں ہیں۔ (Confirm PIN does not match)');
      return;
    }

    if (currentUser.role === 'admin') {
      const currentMaster = getOwnerPin();
      if (currentPinInput.trim() !== currentMaster) {
        setChangePinError('موجودہ ماسٹر پن درست نہیں ہے۔ (Current Master PIN is incorrect)');
        return;
      }
      updateOwnerPin(newPinInput.trim());
      setChangePinSuccess('ایڈمن ماسٹر پن کامیابی سے تبدیل ہو گیا ہے۔ (Master PIN updated successfully!)');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      return;
    }

    if (currentUser.role === 'customer') {
      const targetCustomer = customers.find(
        (c) => c.id === currentUser.customerId || c.phone === currentUser.phone
      );
      const expected = targetCustomer?.pin || (targetCustomer ? getDefaultPinForPhone(targetCustomer.phone) : '123456');
      if (currentPinInput.trim() !== expected) {
        setChangePinError('موجودہ پن درست نہیں ہے۔ (Current PIN is incorrect)');
        return;
      }
      if (targetCustomer) {
        updateCustomerPin(targetCustomer.id, newPinInput.trim());
      }
      setChangePinSuccess('آپ کا سیکیورٹی پن کامیابی سے تبدیل ہو گیا ہے۔ (PIN updated successfully!)');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      return;
    }

    if (currentUser.role === 'reseller') {
      const targetReseller = resellers.find(
        (r) => r.id === currentUser.id || r.referralCode === currentUser.resellerCode
      );
      const expected = targetReseller?.pin || (targetReseller ? getDefaultPinForPhone(targetReseller.phone) : '123456');
      if (currentPinInput.trim() !== expected) {
        setChangePinError('موجودہ پن درست نہیں ہے۔ (Current PIN is incorrect)');
        return;
      }
      if (targetReseller) {
        updateResellerPin(targetReseller.id, newPinInput.trim());
      }
      setChangePinSuccess('ری سیلر پن کامیابی سے تبدیل ہو گیا ہے۔ (Reseller PIN updated successfully!)');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-4 sm:my-6 transition-colors">
        {/* Top Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
              100
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-tight">
                {modalMode === 'account' ? 'My Account & Security' : 'Sign In to 100DAGAR'}
              </h2>
              <span className="text-[11px] font-medium text-slate-800 block font-urdu">
                100DAGAR · مدینہ مارکیٹ
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-800 hover:text-black rounded-lg hover:bg-amber-400/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. LOGIN MODE: COMBINED SINGLE LOGIN FORM */}
        {modalMode === 'login' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Enter Mobile Number &amp; Security PIN
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                لاگ ان برائے گاہک، ری سیلرز و ایڈمن
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCombinedLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number / Username / ریفرل کوڈ:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567 or admin"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  6-Digit Security PIN (سیکیورٹی پن کوڈ):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={10}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-normal text-slate-500 dark:text-slate-400 mb-1">
                  Your Full Name (اختیاری - نئے گاہکوں کے لیے):
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Asif"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / اکاؤنٹ میں لاگ ان کریں</span>
              </button>
            </form>
          </div>
        )}

        {/* 2. ACCOUNT PORTAL (For Authenticated Users) */}
        {modalMode === 'account' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* User Profile Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {currentUser.name}
                    {currentUser.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        👑 Super Admin
                      </span>
                    )}
                    {currentUser.role === 'reseller' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        🤝 Reseller Partner
                      </span>
                    )}
                    {currentUser.role === 'customer' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        👤 Customer Account
                      </span>
                    )}
                  </h3>
                  {currentUser.phone && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      📱 {currentUser.phone}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    onSelectRole('customer', {
                      id: 'user_cust_default',
                      name: 'Online Customer',
                      role: 'customer',
                      phone: '03125256266',
                    });
                    setModalMode('login');
                  }}
                  className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900 flex items-center gap-1 cursor-pointer font-semibold"
                  title="Log out of this account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* In-Portal Change PIN Form */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Change Your Security PIN (اپنا سیکیورٹی پن تبدیل کریں)</span>
              </div>

              {changePinError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}

              {changePinSuccess && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{changePinSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePin} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-0.5">
                    Current PIN (موجودہ پن):
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={10}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-0.5">
                      New PIN (نیا پن):
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={10}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-0.5">
                      Confirm PIN (تصدیق کریں):
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={10}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Update &amp; Save New PIN
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
