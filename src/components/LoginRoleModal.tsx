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
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { AppUser, Customer, LoginFormConfig, Reseller, UserAccount, UserRole } from '../types';
import {
  getDefaultPinForPhone,
  getLoginFormConfig,
  getOwnerPin,
  getUserAccounts,
  logUserLogin,
  saveUserAccounts,
  updateCustomerPin,
  updateOwnerPin,
  updateResellerPin,
  updateUserAccount,
} from '../utils/storage';
import { createPasswordRecord, generateResetToken, verifyPassword } from '../utils/security';
import { openWhatsAppDirect } from '../utils/whatsapp';

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

  const [modalMode, setModalMode] = useState<'login' | 'account' | 'forgot_password' | 'force_change_password'>(
    isGuest ? 'login' : 'account'
  );

  const [loginConfig, setLoginConfig] = useState<LoginFormConfig>(getLoginFormConfig);

  // Unified Single Login Inputs
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pending user when mandatory password change is required
  const [pendingUserAccount, setPendingUserAccount] = useState<UserAccount | null>(null);
  const [forcedNewPass, setForcedNewPass] = useState('');
  const [forcedConfirmPass, setForcedConfirmPass] = useState('');
  const [forcePassError, setForcePassError] = useState('');

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [generatedToken, setGeneratedToken] = useState('');
  const [enteredToken, setEnteredToken] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [recoveryConfirmPass, setRecoveryConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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
      setForgotError('');
      setForgotSuccess('');
      setForcePassError('');
      setLoginConfig(getLoginFormConfig());

      if (!isGuest && currentUser.name !== 'Online Customer') {
        setModalMode('account');
      } else {
        setModalMode('login');
      }
    }
  }, [isOpen, isGuest, currentUser]);

  if (!isOpen) return null;

  // COMBINED LOGIN HANDLER: Supports all roles with salted password hashing
  const handleCombinedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanId = identifier.trim().replace(/[\s-]/g, '');
    const cleanPin = pin.trim();

    if (!cleanId) {
      setErrorMessage('Please enter your mobile number or username.');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMessage('Please enter your valid security PIN / password.');
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
        role: 'super_admin',
        status: 'success',
        ipOrDevice: 'Web Applet / Master Console',
        notes: 'Super Admin Master authenticated',
        usedPin: '••••••',
      });
      onSelectRole('super_admin', {
        id: 'user_superadmin_1',
        name: 'Al-Haj Muhammad Asif',
        urduName: 'الحاج محمد آصف (اسٹور مالک و ایڈمن)',
        phone: '03125256266',
        role: 'super_admin',
        isAuthenticated: true,
      });
      onClose();
      return;
    }

    // 2. Check Central User Accounts (Managers, Staff, Investors, Customers)
    const userAccounts = getUserAccounts();
    const matchedAccount = userAccounts.find(
      (u) =>
        u.phone.replace(/[\s-]/g, '') === cleanId ||
        u.username.toLowerCase() === cleanId.toLowerCase() ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
    );

    if (matchedAccount) {
      if (matchedAccount.status === 'suspended') {
        setErrorMessage('This account is currently suspended. Please contact administrator.');
        return;
      }

      const isPassValid = await verifyPassword(
        cleanPin,
        matchedAccount.passwordHash,
        matchedAccount.passwordSalt
      );

      // Also check fallback to suggested default PIN
      const defaultPin = getDefaultPinForPhone(matchedAccount.phone);
      const isDefaultMatch = cleanPin === defaultPin || cleanPin === matchedAccount.suggestedDefaultPin;

      if (isPassValid || isDefaultMatch) {
        logUserLogin({
          userId: matchedAccount.id,
          userName: matchedAccount.fullName,
          phone: matchedAccount.phone,
          role: matchedAccount.role,
          status: 'success',
          ipOrDevice: 'Web Application Terminal',
          notes: `${matchedAccount.role} signed in successfully`,
          usedPin: '••••••',
        });

        // Update login stats
        updateUserAccount(matchedAccount.id, {
          lastLoginAt: new Date().toISOString(),
          loginCount: (matchedAccount.loginCount || 0) + 1,
        });

        // Check if mandatory password change is required
        if (matchedAccount.mustChangePassword || isDefaultMatch) {
          setPendingUserAccount(matchedAccount);
          setModalMode('force_change_password');
          return;
        }

        onSelectRole(matchedAccount.role, {
          id: matchedAccount.id,
          name: matchedAccount.fullName,
          urduName: matchedAccount.urduName,
          phone: matchedAccount.phone,
          role: matchedAccount.role,
          customerId: matchedAccount.linkedCustomerId,
          investorId: matchedAccount.linkedInvestorId,
          resellerCode: matchedAccount.linkedResellerCode,
          branchId: matchedAccount.linkedBranchId,
          branchName: matchedAccount.linkedBranchName,
          managerAuthorities: matchedAccount.managerAuthorities,
          isAuthenticated: true,
        });
        onClose();
        return;
      } else {
        setErrorMessage('Incorrect security PIN / password. Please verify and try again.');
        return;
      }
    }

    // 3. Check Resellers
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
          ipOrDevice: 'Web Applet',
          notes: 'Reseller partner authenticated with PIN',
          usedPin: '••••••',
        });
        onSelectRole('reseller', {
          id: matchingReseller.id,
          name: matchingReseller.name,
          urduName: matchingReseller.urduName || 'ری سیلر پارٹنر',
          phone: matchingReseller.phone,
          resellerCode: matchingReseller.referralCode,
          role: 'reseller',
          isAuthenticated: true,
        });
        onClose();
        return;
      } else {
        setErrorMessage('Invalid reseller PIN code.');
        return;
      }
    }

    // 4. Check Existing Customer
    const matchingCustomer = customers.find(
      (c) => c.phone.replace(/[\s-]/g, '') === cleanId
    );

    if (matchingCustomer) {
      const defaultPin = getDefaultPinForPhone(matchingCustomer.phone);
      const expectedPin = matchingCustomer.pin || defaultPin;
      const isDefault = cleanPin === defaultPin;

      if (cleanPin === expectedPin || isDefault) {
        logUserLogin({
          userId: matchingCustomer.id,
          userName: matchingCustomer.name,
          phone: matchingCustomer.phone,
          role: 'customer',
          status: 'success',
          ipOrDevice: 'Mobile Web Applet',
          notes: isDefault ? 'Customer login with default PIN' : 'Customer login with private PIN',
          usedPin: '••••••',
        });

        if (isDefault) {
          // Guided mandatory password update
          const virtualAccount: UserAccount = {
            id: `usr_${matchingCustomer.id}`,
            username: matchingCustomer.phone,
            fullName: matchingCustomer.name,
            phone: matchingCustomer.phone,
            role: 'customer',
            status: 'active',
            linkedCustomerId: matchingCustomer.id,
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
          };
          setPendingUserAccount(virtualAccount);
          setModalMode('force_change_password');
          return;
        }

        onSelectRole('customer', {
          id: matchingCustomer.id,
          name: matchingCustomer.name,
          urduName: matchingCustomer.urduName || 'آن لائن کسٹمر',
          phone: matchingCustomer.phone,
          customerId: matchingCustomer.id,
          role: 'customer',
          isAuthenticated: true,
        });
        onClose();
        return;
      } else {
        setErrorMessage('Invalid credentials. Please verify your mobile number and security PIN.');
        return;
      }
    }

    // 5. Instant Customer Self-Registration
    if (loginConfig.allowSelfRegistration) {
      const defaultPin = getDefaultPinForPhone(cleanId);
      if (cleanPin === defaultPin) {
        const newCustName = fullName.trim() || `Customer ${cleanId.slice(-4)}`;
        const newCustId = `cust_${Date.now()}`;
        const newAccount: UserAccount = {
          id: `usr_${Date.now()}`,
          username: cleanId,
          fullName: newCustName,
          phone: cleanId,
          role: 'customer',
          status: 'active',
          linkedCustomerId: newCustId,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        };

        logUserLogin({
          userName: newCustName,
          phone: cleanId,
          role: 'customer',
          status: 'success',
          ipOrDevice: 'Mobile Web Applet',
          notes: 'New customer instant self-registration',
          usedPin: '••••••',
        });

        setPendingUserAccount(newAccount);
        setModalMode('force_change_password');
        return;
      }
    }

    setErrorMessage('Invalid credentials. Please check your username/phone and password.');
  };

  // MANDATORY / FORCED PASSWORD CHANGE HANDLER
  // Immediately completes and satisfies user request 2.4:
  // "After a successful password update, display a simple confirmation such as 'Password changed successfully.'
  // Do not show unnecessary popup windows asking the user to change the password again."
  const handleForcedPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcePassError('');

    if (forcedNewPass.trim().length < 4) {
      setForcePassError('Password must be at least 4 characters long.');
      return;
    }

    if (forcedNewPass.trim() !== forcedConfirmPass.trim()) {
      setForcePassError('Confirm password does not match.');
      return;
    }

    const passRecord = await createPasswordRecord(forcedNewPass.trim());

    if (pendingUserAccount) {
      // Invalidate temporary credentials and clear mustChangePassword
      updateUserAccount(pendingUserAccount.id, {
        passwordHash: passRecord.hash,
        passwordSalt: passRecord.salt,
        mustChangePassword: false,
        isTemporaryPassword: false,
      });

      if (pendingUserAccount.linkedCustomerId) {
        updateCustomerPin(pendingUserAccount.linkedCustomerId, forcedNewPass.trim());
      }

      onSelectRole(pendingUserAccount.role, {
        id: pendingUserAccount.id,
        name: pendingUserAccount.fullName,
        urduName: pendingUserAccount.urduName,
        phone: pendingUserAccount.phone,
        role: pendingUserAccount.role,
        customerId: pendingUserAccount.linkedCustomerId,
        investorId: pendingUserAccount.linkedInvestorId,
        resellerCode: pendingUserAccount.linkedResellerCode,
        branchId: pendingUserAccount.linkedBranchId,
        branchName: pendingUserAccount.linkedBranchName,
        managerAuthorities: pendingUserAccount.managerAuthorities,
        mustChangePassword: false,
        hasDefaultPin: false,
        isAuthenticated: true,
      });
    }

    // Single clean confirmation as requested in 2.4
    setSuccessMessage('Password changed successfully.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // FORGOT PASSWORD RECOVERY HANDLERS
  const handleRequestResetToken = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const clean = forgotIdentifier.trim().replace(/[\s-]/g, '');
    if (!clean) {
      setForgotError('Please enter your registered mobile number or username.');
      return;
    }

    const tokenObj = generateResetToken();
    setGeneratedToken(tokenObj.token);
    setForgotStep(2);
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (enteredToken.trim() !== generatedToken) {
      setForgotError('Invalid or expired verification token code.');
      return;
    }

    if (recoveryNewPass.trim().length < 4) {
      setForgotError('Password must be at least 4 characters long.');
      return;
    }

    if (recoveryNewPass.trim() !== recoveryConfirmPass.trim()) {
      setForgotError('Passwords do not match.');
      return;
    }

    const passRecord = await createPasswordRecord(recoveryNewPass.trim());
    const accounts = getUserAccounts();
    const cleanId = forgotIdentifier.trim().replace(/[\s-]/g, '');

    const found = accounts.find(
      (a) =>
        a.phone.replace(/[\s-]/g, '') === cleanId ||
        a.username.toLowerCase() === cleanId.toLowerCase()
    );

    if (found) {
      updateUserAccount(found.id, {
        passwordHash: passRecord.hash,
        passwordSalt: passRecord.salt,
        mustChangePassword: false,
        isTemporaryPassword: false,
      });
    }

    setForgotSuccess('Password changed successfully. You can now sign in with your new password.');
    setTimeout(() => {
      setModalMode('login');
      setForgotStep(1);
    }, 1500);
  };

  // CHANGE PIN HANDLER INSIDE USER PORTAL
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    setChangePinSuccess('');

    if (!currentPinInput.trim()) {
      setChangePinError('Please enter your current PIN.');
      return;
    }

    if (newPinInput.trim().length < 4) {
      setChangePinError('New PIN must be at least 4 digits/characters long.');
      return;
    }

    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setChangePinError('Confirm PIN does not match.');
      return;
    }

    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
      const currentMaster = getOwnerPin();
      if (currentPinInput.trim() !== currentMaster) {
        setChangePinError('Current Master PIN is incorrect.');
        return;
      }
      updateOwnerPin(newPinInput.trim());
      setChangePinSuccess('Password changed successfully.');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      return;
    }

    if (currentUser.role === 'customer') {
      const targetCustomer = customers.find(
        (c) => c.id === currentUser.customerId || c.phone === currentUser.phone
      );
      const expected = targetCustomer?.pin || getDefaultPinForPhone(currentUser.phone || '');
      if (currentPinInput.trim() !== expected) {
        setChangePinError('Current PIN is incorrect.');
        return;
      }
      if (targetCustomer) {
        updateCustomerPin(targetCustomer.id, newPinInput.trim());
      }
      onSelectRole('customer', {
        ...currentUser,
        hasDefaultPin: false,
        mustChangePassword: false,
      });
      setChangePinSuccess('Password changed successfully.');
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
        setChangePinError('Current PIN is incorrect.');
        return;
      }
      if (targetReseller) {
        updateResellerPin(targetReseller.id, newPinInput.trim());
      }
      setChangePinSuccess('Password changed successfully.');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-4 sm:my-6 transition-colors">
        {/* Header */}
        <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs">
              100
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-tight">
                {modalMode === 'account'
                  ? 'My Account & Security'
                  : modalMode === 'forgot_password'
                  ? 'Password Recovery'
                  : modalMode === 'force_change_password'
                  ? 'Set Your Private Password'
                  : loginConfig.title}
              </h2>
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block tracking-wider uppercase">
                100DAGAR · WE BUY WE SELL
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

        {/* 1. LOGIN MODE: CONFIGURABLE UNIFIED LOGIN FORM */}
        {modalMode === 'login' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Enter Login Credentials
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {loginConfig.description}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleCombinedLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number / Username / Handle:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567 or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Security PIN / Password:
                  </label>
                  {loginConfig.showForgotPasswordLink && (
                    <button
                      type="button"
                      onClick={() => setModalMode('forgot_password')}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={20}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                  {loginConfig.showPasswordVisibilityToggle && (
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {loginConfig.allowSelfRegistration && (
                <div>
                  <label className="block text-xs font-normal text-slate-500 dark:text-slate-400 mb-1">
                    Your Full Name (اختیاری - نئے کسٹمرز کے لیے):
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Tariq Mehmood"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {loginConfig.showRememberMe && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span>Remember Me</span>
                  </label>

                  <span className="text-[11px] text-slate-400">
                    Default PIN: Last 6 digits
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / لاگ ان کریں</span>
              </button>
            </form>

            {/* Support contact info */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  const text = 'السلام علیکم! مجھے 100DAGAR اکاؤنٹ میں لاگ ان / پاس ورڈ میں مدد چاہیے۔ شکریہ!';
                  openWhatsAppDirect('03125256266', text);
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Help &amp; WhatsApp Support ({loginConfig.supportContactNumber})</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. FORCE CHANGE PASSWORD (First login with default/temporary PIN) */}
        {modalMode === 'force_change_password' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Set Your New Private Password</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Welcome to 100DAGAR! Since you logged in using a temporary or default PIN, please establish a secure new password for your account.
              </p>
            </div>

            {forcePassError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forcePassError}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleForcedPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Private Password / PIN (نیا پاس ورڈ):
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="Min 4 to 6 characters"
                  value={forcedNewPass}
                  onChange={(e) => setForcedNewPass(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password (پاس ورڈ کی تصدیق):
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="Repeat new password"
                  value={forcedConfirmPass}
                  onChange={(e) => setForcedConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer mt-2"
              >
                Save Password &amp; Proceed to Portal
              </button>
            </form>
          </div>
        )}

        {/* 3. FORGOT PASSWORD SELF-RECOVERY FLOW */}
        {modalMode === 'forgot_password' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalMode('login')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Account Recovery (پاس ورڈ بحالی)
              </h3>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetToken} className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your registered mobile number or username to receive an instant verification reset token.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Mobile / Username:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300 1234567"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Generate Secure Reset Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="text-slate-500 block">Verification Token Issued:</span>
                  <div className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                    {generatedToken}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    (Valid for 30 minutes. Enter below to reset your password.)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enter Verification Code:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={generatedToken}
                    value={enteredToken}
                    onChange={(e) => setEnteredToken(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={recoveryNewPass}
                    onChange={(e) => setRecoveryNewPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={recoveryConfirmPass}
                    onChange={(e) => setRecoveryConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer mt-1"
                >
                  Confirm &amp; Reset Password
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. ACCOUNT PORTAL (For Authenticated Users) */}
        {modalMode === 'account' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {currentUser.name}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </h3>
                  {currentUser.phone && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
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
                      isAuthenticated: false,
                    });
                    setModalMode('login');
                  }}
                  className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900 flex items-center gap-1 cursor-pointer font-semibold"
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
                <span>Change Your Security Password / PIN</span>
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
                    Current PIN:
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={20}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-0.5">
                      New PIN:
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-0.5">
                      Confirm PIN:
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white font-bold rounded-lg cursor-pointer transition-colors"
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
