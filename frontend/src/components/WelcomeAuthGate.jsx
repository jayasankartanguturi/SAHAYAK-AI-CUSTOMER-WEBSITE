import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { LANGUAGES } from '../data/mockData';
import {
  ONBOARDING_PROFESSIONS,
  getOnboardingProfessionById,
} from '../data/professionsConfig';
import { localizeProfession } from '../locales/onboardingTranslations';
import GoogleSignInButton from './ui/GoogleSignInButton';

function extractNameFromEmail(email) {
  const localPart = email.split('@')[0] || 'Citizen';
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .trim();
  if (!cleaned) return 'Citizen';
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function WelcomeAuthGate() {
  const {
    loginUser,
    triggerLoginSuccess,
    selectedProfession,
    setSelectedProfession,
    language,
    setLanguage,
    t,
  } = useApp();

  const [stage, setStage] = useState('auth'); // 'auth' | 'role' | '2fa'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [chosenRole, setChosenRole] = useState(selectedProfession || 'Farmer');
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeProf = localizeProfession(
    getOnboardingProfessionById(chosenRole),
    language
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const finishLogin = (res, roleOverride = null) => {
    if (res?.requires_2fa && res?.temp_token) {
      setTempToken(res.temp_token);
      setStage('2fa');
      return true;
    }
    if (res?.access_token && res?.user) {
      localStorage.setItem('sahayak_token', res.access_token);
      const resolvedProf =
        roleOverride || res.user.profession || selectedProfession || 'Farmer';
      loginUser({
        name: res.user.name,
        email: res.user.email,
        profession: resolvedProf,
        language: res.user.language || language,
        onboardingCompleted: true,
      });
      triggerLoginSuccess();
      return true;
    }
    return false;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t('auth.invalidEmail'));
      return;
    }

    if (mode === 'register') {
      if (!name.trim() || name.trim().length < 2) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and Confirm Password must match.');
        return;
      }
      // Validated! Advance to Role Selection screen before entering website
      setPendingGoogleUser(null);
      setStage('role');
      return;
    }

    if (password.length < 4) {
      setError(t('auth.invalidPassword'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(trimmedEmail, password);
      finishLogin(res);
    } catch (loginErr) {
      setError(loginErr?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleComplete = async () => {
    setError('');
    setLoading(true);
    try {
      setSelectedProfession(chosenRole);

      if (pendingGoogleUser) {
        await api.saveOnboarding({
          name: pendingGoogleUser.name,
          profession: chosenRole,
          preferredLanguage: language,
          onboardingCompleted: true,
        });
        finishLogin(
          {
            access_token: pendingGoogleUser.token,
            user: { ...pendingGoogleUser, profession: chosenRole, language },
          },
          chosenRole
        );
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      const derivedName = name.trim() || extractNameFromEmail(trimmedEmail);
      const res = await api.register({
        name: derivedName,
        email: trimmedEmail,
        password,
        profession: chosenRole,
        language,
        onboarding_completed: true,
      });
      finishLogin(res, chosenRole);
    } catch (err) {
      setError(err?.message || 'Unable to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.verify2faLogin(totpCode.trim(), tempToken);
      finishLogin(res);
    } catch (err) {
      setError(err?.message || 'Invalid 6-digit Authenticator code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.googleSignIn({ credential });
      if (res?.requires_2fa && res?.temp_token) {
        setTempToken(res.temp_token);
        setStage('2fa');
        return;
      }
      if (res?.access_token && res?.user) {
        localStorage.setItem('sahayak_token', res.access_token);
        // If new Google user or clicking from Create Account, let them choose their role first
        if (!res.user.onboardingCompleted || mode === 'register') {
          setPendingGoogleUser({ ...res.user, token: res.access_token });
          setChosenRole(res.user.profession || 'Farmer');
          setStage('role');
          return;
        }
        finishLogin(res);
      }
    } catch (err) {
      setError(err?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F1EEFA] bg-[radial-gradient(circle_at_18%_18%,rgba(118,80,232,0.12),transparent_42%),radial-gradient(circle_at_85%_82%,rgba(147,112,245,0.12),transparent_44%)] flex flex-col items-center justify-center p-4 relative">
      {/* Top-right language switcher */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2 bg-white/85 backdrop-blur-md border border-[#E2DCF5] rounded-full px-3 py-1.5 shadow-xs">
        <Globe className="w-3.5 h-3.5 text-[#7650E8] shrink-0" />
        <select
          aria-label="Select language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-transparent text-[12.5px] font-semibold text-[#171638] focus:outline-none cursor-pointer pr-1"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.name}>
              {lang.native}
            </option>
          ))}
        </select>
      </div>

      <AnimatePresence mode="wait">
        {/* STAGE: CHOOSE ROLE (shown after Create Account or new Google registration) */}
        {stage === 'role' ? (
          <motion.div
            key="stage-role"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-[28px] border border-[#E2DCF5] shadow-[0_20px_50px_rgba(99,54,217,0.12)] p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center mb-5">
              <img
                src="/images/sahayak-logo.png"
                alt="Sahayak AI"
                className="w-12 h-12 object-contain mb-2"
              />
              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#171638] leading-tight">
                {t('onboarding.chooseRoleTitle')}
              </h1>
              <p className="text-[13px] text-[#6C6A84] mt-1">
                {t('onboarding.chooseRoleSub')}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
                {error}
              </div>
            )}

            {/* 8 Profession Cards: 4 columns desktop, 2 columns mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ONBOARDING_PROFESSIONS.map((base) => {
                const prof = localizeProfession(base, language);
                const selected = chosenRole === base.id;
                return (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => {
                      setChosenRole(base.id);
                      setError('');
                    }}
                    aria-pressed={selected}
                    className={`relative text-center rounded-2xl p-3 border transition-all duration-200 flex flex-col items-center cursor-pointer ${
                      selected
                        ? 'border-[#6D44E5] bg-gradient-to-b from-[#F5F0FF] to-[#EAE2FF] ring-2 ring-[#6D44E5]/25 shadow-[0_8px_20px_rgba(109,68,229,0.16)]'
                        : 'border-[#E6E1F7] bg-[#FCFBFF] hover:border-[#B9A4F5] hover:bg-[#F7F4FF]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6D44E5] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-[#E5E0F6] bg-white mb-2 shadow-xs">
                      <img
                        src={prof.image}
                        alt={prof.name}
                        className="w-full h-full object-cover"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0.5 right-0.5 text-[13px] bg-white/90 rounded-md px-0.5 leading-tight"
                      >
                        {prof.emoji}
                      </span>
                    </div>
                    <div className="text-[12.5px] font-bold text-[#171638] leading-snug">
                      {prof.name}
                    </div>
                    <div className="text-[10.5px] text-[#6C6A84] leading-tight mt-0.5 line-clamp-2">
                      {prof.shortDesc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Selected Role Preview Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#EFEAFF] via-[#F7F4FF] to-[#E8DFFF] border border-[#D4C5FC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold text-[#4E2BC4] flex items-center gap-1.5">
                  <span>{activeProf.emoji}</span>
                  <span>{activeProf.dashboardTitle}</span>
                </div>
                <p className="text-[12px] text-[#4E4C6A] mt-0.5">
                  {activeProf.heroDescription}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {!pendingGoogleUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setStage('auth');
                    setError('');
                  }}
                  className="px-4 py-2.5 rounded-full border border-[#DFD8F5] hover:bg-[#F5F1FF] text-[#323052] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('onboarding.back')}
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleRoleComplete}
                className="flex-1 sm:flex-none sm:px-8 py-3 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] hover:from-[#4F2AC4] hover:to-[#6942DC] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(118,80,232,0.30)] disabled:opacity-60 cursor-pointer"
              >
                {loading
                  ? t('onboarding.settingUp')
                  : t('onboarding.enterDashboard', {
                      dashboard: activeProf.dashboardTitle,
                    })}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* STAGE: LOGIN / CREATE ACCOUNT / 2FA CARD */
          <motion.div
            key="stage-auth"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-[28px] border border-[#E2DCF5] shadow-[0_20px_50px_rgba(99,54,217,0.10)] p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src="/images/sahayak-logo.png"
                alt="Sahayak AI"
                className="w-14 h-14 object-contain mb-3"
              />
              <h1 className="text-[24px] font-bold text-[#171638] leading-tight">
                {stage === '2fa'
                  ? t('onboarding.twoFaTitle')
                  : mode === 'login'
                  ? t('onboarding.welcomeBack')
                  : t('auth.createAccountTitle') !== 'auth.createAccountTitle'
                  ? t('auth.createAccountTitle')
                  : 'Create Your Account'}
              </h1>
              <p className="text-[13px] text-[#6C6A84] mt-1">
                {stage === '2fa'
                  ? t('onboarding.twoFaSub')
                  : t('brand.subtitle')}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
                {error}
              </div>
            )}

            {stage === '2fa' ? (
              <form onSubmit={handle2faSubmit} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.4em] text-[22px] font-bold py-3 px-4 rounded-xl bg-[#F7F5FD] border border-[#DFD8F5] focus:border-[#7650E8] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#5E35D6] to-[#7B52EB] hover:from-[#522BC7] hover:to-[#6D44E5] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(118,80,232,0.28)] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? t('onboarding.verifying') : t('onboarding.verifyContinue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStage('auth');
                    setError('');
                  }}
                  className="w-full text-[12.5px] font-semibold text-[#6C6A84] hover:text-[#6336D9] cursor-pointer"
                >
                  {t('onboarding.backSignIn')}
                </button>
              </form>
            ) : (
              <>
                <GoogleSignInButton
                  disabled={loading}
                  onCredential={handleGoogleCredential}
                  onError={(msg) => setError(msg)}
                  onCancel={(msg) => setError(msg)}
                />

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#E7E2F7]" />
                  <span className="text-[11px] font-semibold text-[#85839A] uppercase">
                    {t('onboarding.or')}
                  </span>
                  <div className="h-px flex-1 bg-[#E7E2F7]" />
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <div>
                      <label className="text-[12px] font-bold text-[#171638]">
                        {t('onboarding.fullName')}
                      </label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#F7F5FD] border border-[#DFD8F5] focus-within:border-[#7650E8] px-3 py-2.5">
                        <UserIcon className="w-4 h-4 text-[#85839A] shrink-0" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Ravi Kumar"
                          className="w-full bg-transparent text-[13.5px] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[12px] font-bold text-[#171638]">
                      {t('onboarding.emailLabel')}
                    </label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#F7F5FD] border border-[#DFD8F5] focus-within:border-[#7650E8] px-3 py-2.5">
                      <Mail className="w-4 h-4 text-[#85839A] shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-transparent text-[13.5px] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-[#171638]">
                      {t('onboarding.passwordLabel')}
                    </label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#F7F5FD] border border-[#DFD8F5] focus-within:border-[#7650E8] px-3 py-2.5">
                      <Lock className="w-4 h-4 text-[#85839A] shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={mode === 'register' ? 6 : 4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === 'register'
                            ? t('onboarding.minChars')
                            : t('onboarding.passwordPlaceholder')
                        }
                        className="w-full bg-transparent text-[13.5px] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label className="text-[12px] font-bold text-[#171638]">
                        Confirm Password
                      </label>
                      <div
                        className={`mt-1 flex items-center gap-2 rounded-xl bg-[#F7F5FD] border px-3 py-2.5 transition-colors ${
                          passwordsMismatch
                            ? 'border-rose-400 focus-within:border-rose-500'
                            : passwordsMatch
                            ? 'border-emerald-400 focus-within:border-emerald-500'
                            : 'border-[#DFD8F5] focus-within:border-[#7650E8]'
                        }`}
                      >
                        <Lock className="w-4 h-4 text-[#85839A] shrink-0" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="w-full bg-transparent text-[13.5px] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={
                            showConfirmPassword
                              ? 'Hide confirm password'
                              : 'Show confirm password'
                          }
                          className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {passwordsMismatch && (
                        <p className="mt-1 text-[11.5px] font-medium text-rose-600">
                          Passwords do not match.
                        </p>
                      )}
                      {passwordsMatch && (
                        <p className="mt-1 text-[11.5px] font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Passwords match</span>
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (mode === 'register' && passwordsMismatch)}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-[#5E35D6] to-[#7B52EB] hover:from-[#522BC7] hover:to-[#6D44E5] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(118,80,232,0.28)] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loading
                      ? t('onboarding.signingIn')
                      : mode === 'login'
                      ? t('onboarding.signInBtn')
                      : t('onboarding.createAccountRole')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-[#7D7A96]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7650E8]" />
                  <span>Supports Authenticator App (2FA) in Profile Settings</span>
                </div>

                <div className="mt-4 text-center text-[13px] text-[#6C6A84]">
                  {mode === 'login' ? (
                    <>
                      {t('onboarding.newToSahayak')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setError('');
                        }}
                        className="font-bold text-[#6336D9] hover:underline cursor-pointer"
                      >
                        Create Account
                      </button>
                    </>
                  ) : (
                    <>
                      {t('onboarding.alreadyHaveAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setConfirmPassword('');
                          setError('');
                        }}
                        className="font-bold text-[#6336D9] hover:underline cursor-pointer"
                      >
                        {t('onboarding.signIn')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
