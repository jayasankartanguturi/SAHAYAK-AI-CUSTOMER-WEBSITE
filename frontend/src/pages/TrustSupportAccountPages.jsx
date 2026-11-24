import React, { useState, useEffect } from 'react';
import {
  BadgeCheck,
  Sparkles,
  Headphones,
  ClipboardList,
  MessageSquareWarning,
  Accessibility,
  Settings,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Shield,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { TRUSTED_SOURCES, PROFESSIONS, LANGUAGES } from '../data/mockData';
import { api } from '../services/api';

export function TrustedSourcesPage() {
  const { t } = useApp();
  return (
    <div className="space-y-5">
      <PageHeader
        icon={BadgeCheck}
        title={t('trustedSources.title')}
        subtitle={t('trustedSources.subtitle')}
        badge={t('trustedSources.badge')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRUSTED_SOURCES.map((src) => (
          <div
            key={src.name}
            className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[11px] font-semibold">
                  {src.category}
                </span>
                <span className="text-[11px] text-[#85839A]">{src.lastUpdated}</span>
              </div>
              <h3 className="text-[15px] font-bold text-[#171638] mt-2">{src.name}</h3>
              <p className="text-[12.5px] text-[#5A5778] mt-0.5">{src.org}</p>
            </div>
            <a
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7650E8] hover:underline"
            >
              <span>{src.url}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonalizedRecommendationsPage() {
  const { selectedProfession, language, askWithPrompt, navigate, t, demoCards } = useApp();
  const prof = PROFESSIONS.find((p) => p.id === selectedProfession) || PROFESSIONS[0];
  const profName = t(`professions.${selectedProfession}.name`);
  const tools = demoCards.professionTools[selectedProfession] || prof.tools;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Sparkles}
        title={t('recommendations.title')}
        subtitle={t('recommendations.subtitle', { prof: profName, lang: language })}
        badge={profName}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.title}
            className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-[15px] font-bold text-[#171638]">{tool.title}</h3>
              <p className="text-[12.5px] text-[#85839A] mt-1">{tool.desc}</p>
            </div>
            <button
              onClick={() => (tool.prompt ? askWithPrompt(tool.prompt) : navigate(tool.target))}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12px] font-semibold shrink-0 flex items-center gap-1"
            >
              <span>{t('common.try')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpertSupportPage() {
  const { setSupportRequests, navigate, t } = useApp();
  const [form, setForm] = useState({
    subject: '',
    category: 'Scheme Eligibility',
    description: '',
    priority: 'Normal',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError(t('expertSupport.error'));
      return;
    }
    setError('');
    const ticket = await api.submitSupportRequest(form);
    setSupportRequests((prev) => [ticket, ...prev]);
    setSubmitted(true);
    setForm({ subject: '', category: 'Scheme Eligibility', description: '', priority: 'Normal' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Headphones}
        title={t('expertSupport.title')}
        subtitle={t('expertSupport.subtitle')}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-4"
      >
        {submitted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {t('expertSupport.submitted')}
            </span>
            <button
              type="button"
              onClick={() => navigate('support-requests')}
              className="font-bold underline"
            >
              {t('expertSupport.viewRequests')}
            </button>
          </div>
        )}
        {error && <div className="text-[12.5px] text-rose-600 font-medium">{error}</div>}

        <div>
          <label className="text-[12px] font-bold text-[#171638]">{t('expertSupport.subject')}</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t('expertSupport.subjectPlaceholder')}
            className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('expertSupport.category')}</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2.5 text-[13px]"
            >
              <option>Scheme Eligibility</option>
              <option>Crop / Fisheries Advisory</option>
              <option>Document Assistant</option>
              <option>Account & Technical</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('expertSupport.priority')}</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2.5 text-[13px]"
            >
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-[#171638]">{t('expertSupport.details')}</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t('expertSupport.detailsPlaceholder')}
            className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] p-3.5 text-[13px]"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold"
        >
          {t('expertSupport.submitButton')}
        </button>
      </form>
    </div>
  );
}

export function MySupportRequestsPage() {
  const { supportRequests, navigate, t } = useApp();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ClipboardList}
        title={t('supportRequests.title')}
        subtitle={t('supportRequests.subtitle')}
      />

      <div className="flex justify-end">
        <button
          onClick={() => navigate('expert-support')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold"
        >
          {t('supportRequests.newRequest')}
        </button>
      </div>

      <div className="space-y-3">
        {supportRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-start justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#7650E8]">{req.id}</span>
                <span className="text-[11px] text-[#85839A]">• {req.category} • {req.created_at}</span>
              </div>
              <h3 className="text-[15px] font-bold text-[#171638] mt-1">{req.subject}</h3>
              <p className="text-[12.5px] text-[#5A5778] mt-1">{req.description}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[11.5px] font-bold shrink-0 ${
                req.status === 'Resolved'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[#E8DFFF] text-[#6336D9]'
              }`}
            >
              {req.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedbackReportPage() {
  const { t } = useApp();
  const [form, setForm] = useState({ type: 'Feedback', subject: '', details: '', page: 'Ask Sahayak AI' });
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.details.trim()) return;
    await api.submitFeedback(form);
    setDone(true);
    setForm({ type: 'Feedback', subject: '', details: '', page: 'Ask Sahayak AI' });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={MessageSquareWarning}
        title={t('feedback.title')}
        subtitle={t('feedback.subtitle')}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-4"
      >
        {done && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-medium">
            {t('feedback.success')}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('feedback.type')}</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2.5 text-[13px]"
            >
              <option>Feedback</option>
              <option>Incorrect AI Answer</option>
              <option>Translation Issue</option>
              <option>Bug / UI Issue</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('feedback.feature')}</label>
            <input
              type="text"
              value={form.page}
              onChange={(e) => setForm({ ...form, page: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
            />
          </div>
        </div>
        <div>
          <label className="text-[12px] font-bold text-[#171638]">{t('feedback.summary')}</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t('feedback.summaryPlaceholder')}
            className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="text-[12px] font-bold text-[#171638]">{t('feedback.details')}</label>
          <textarea
            rows={4}
            required
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            placeholder={t('feedback.detailsPlaceholder')}
            className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] p-3.5 text-[13px]"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold"
        >
          {t('feedback.submitButton')}
        </button>
      </form>
    </div>
  );
}

export function AccessibilitySettingsPage() {
  const { accessibility, setAccessibility, t } = useApp();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Accessibility}
        title={t('accessibilityPage.title')}
        subtitle={t('accessibilityPage.subtitle')}
      />

      <div className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-5">
        <div>
          <label className="text-[13px] font-bold text-[#171638]">{t('accessibilityPage.textSize')}</label>
          <div className="flex gap-2 mt-2">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => setAccessibility({ ...accessibility, fontSize: size })}
                className={`px-4 py-2 rounded-full text-[12.5px] font-semibold ${
                  accessibility.fontSize === size
                    ? 'bg-[#7650E8] text-white'
                    : 'bg-[#F1EFF8] text-[#323052]'
                }`}
              >
                {t(`accessibilityPage.sizes.${size}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] cursor-pointer">
          <div>
            <div className="text-[13.5px] font-bold text-[#171638]">{t('accessibilityPage.highContrast')}</div>
            <div className="text-[12px] text-[#85839A]">{t('accessibilityPage.highContrastDesc')}</div>
          </div>
          <input
            type="checkbox"
            checked={accessibility.highContrast}
            onChange={(e) =>
              setAccessibility({ ...accessibility, highContrast: e.target.checked })
            }
            className="w-5 h-5 accent-[#7650E8]"
          />
        </label>

        <label className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] cursor-pointer">
          <div>
            <div className="text-[13.5px] font-bold text-[#171638]">{t('accessibilityPage.autoRead')}</div>
            <div className="text-[12px] text-[#85839A]">{t('accessibilityPage.autoReadDesc')}</div>
          </div>
          <input
            type="checkbox"
            checked={accessibility.voiceAutoRead}
            onChange={(e) =>
              setAccessibility({ ...accessibility, voiceAutoRead: e.target.checked })
            }
            className="w-5 h-5 accent-[#7650E8]"
          />
        </label>
      </div>
    </div>
  );
}

export function ProfileSettingsPage() {
  const {
    user,
    setUser,
    selectedProfession,
    setSelectedProfession,
    language,
    setLanguage,
    clearAllUserData,
    t,
  } = useApp();

  const [name, setName] = useState(user.name);
  const [location, setLocation] = useState(user.location);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [cleared, setCleared] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  // Authenticator (2FA) state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState(null); // { secret, otpauth_uri }
  const [totpCode, setTotpCode] = useState('');
  const [totpMsg, setTotpMsg] = useState('');
  const [totpErr, setTotpErr] = useState('');

  useEffect(() => {
    api.get2faStatus().then((r) => setTotpEnabled(Boolean(r?.totp_enabled)));
  }, []);

  const handleStart2fa = async () => {
    setTotpErr('');
    setTotpMsg('');
    try {
      const res = await api.setup2fa();
      setTotpSetup(res);
    } catch (err) {
      setTotpErr(err.message || 'Sign in with an account to configure Authenticator 2FA.');
    }
  };

  const handleEnable2fa = async (e) => {
    e.preventDefault();
    setTotpErr('');
    try {
      await api.enable2fa(totpCode.trim());
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpCode('');
      setTotpMsg('Authenticator 2FA is now enabled for your account.');
    } catch (err) {
      setTotpErr(err.message || 'Invalid 6-digit code.');
    }
  };

  const handleDisable2fa = async (e) => {
    e.preventDefault();
    setTotpErr('');
    try {
      await api.disable2fa(totpCode.trim());
      setTotpEnabled(false);
      setTotpCode('');
      setTotpMsg('Authenticator 2FA has been disabled.');
    } catch (err) {
      setTotpErr(err.message || 'Invalid 6-digit code.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');

    if (newPassword.length < 6) {
      setPwErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErr('New password and confirm password do not match.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
      setPwMsg(res?.message || 'Password updated successfully. Your new password is active immediately.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwErr(err?.message || 'Unable to update password. Check your current password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = { ...user, name, location, phone };
    setUser(updated);
    localStorage.setItem('sahayak_user', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings}
        title={t('profilePage.title')}
        subtitle={t('profilePage.subtitle')}
      />

      <form
        onSubmit={handleSave}
        className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-4"
      >
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('profilePage.saved')}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('profilePage.fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('profilePage.phone')}</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('profilePage.location')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('profilePage.profession')}</label>
            <select
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
            >
              {PROFESSIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(`professions.${p.id}.name`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-[#171638]">{t('profilePage.language')}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2.5 text-[13px]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.name}>
                {l.name} ({l.native})
              </option>
            ))}
          </select>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] flex items-start gap-2.5 text-[12px] text-[#5A5778]">
          <Shield className="w-4 h-4 text-[#7650E8] shrink-0 mt-0.5" />
          <span>{t('profilePage.privacyNote')}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold"
          >
            {t('profilePage.saveButton')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-semibold"
          >
            Delete My Stored Data
          </button>
        </div>
        {cleared && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold">
            Your stored conversations, documents, saved answers, and reminders have been cleared.
          </div>
        )}
      </form>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Delete All Stored Data?"
        message="This removes your saved answers, conversation history, uploaded documents, and reminders."
        confirmLabel={t('common.delete')}
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          await clearAllUserData();
          setConfirmClearOpen(false);
          setCleared(true);
        }}
      />

      {/* Change Password Card */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EFEAFF] text-[#7650E8] flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#171638]">Change Password</h3>
            <p className="text-[12px] text-[#85839A]">
              Update your account password immediately (Google users can also set a password here)
            </p>
          </div>
        </div>

        {pwMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12.5px] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwMsg}</span>
          </div>
        )}
        {pwErr && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-semibold">
            {pwErr}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="text-[12px] font-bold text-[#171638]">Current Password</label>
            <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] focus-within:border-[#7650E8] px-3 py-2.5">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">New Password</label>
            <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] focus-within:border-[#7650E8] px-3 py-2.5">
              <input
                type={showNewPw ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[12px] font-bold text-[#171638]">Confirm Password</label>
            <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] focus-within:border-[#7650E8] px-3 py-2.5">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pwLoading}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] hover:from-[#4F2AC4] hover:to-[#6942DC] text-white text-[13px] font-semibold shadow-sm disabled:opacity-60 cursor-pointer"
        >
          {pwLoading ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>

      {/* Authenticator App (2FA) Card */}
      <div className="bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEAFF] text-[#7650E8] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#171638]">
                Two-Factor Authentication (Authenticator App)
              </h3>
              <p className="text-[12px] text-[#85839A]">
                Use Google Authenticator, Microsoft Authenticator, or Authy for extra security
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11.5px] font-bold shrink-0 ${
              totpEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1EFF8] text-[#5A5778]'
            }`}
          >
            {totpEnabled ? 'Enabled' : 'Off'}
          </span>
        </div>

        {totpMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[12.5px] font-semibold">
            {totpMsg}
          </div>
        )}
        {totpErr && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-[12.5px] font-semibold">
            {totpErr}
          </div>
        )}

        {!totpEnabled && !totpSetup && (
          <button
            type="button"
            onClick={handleStart2fa}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] text-[13px] font-semibold"
          >
            <KeyRound className="w-4 h-4" />
            <span>Set Up Authenticator App</span>
          </button>
        )}

        {totpSetup && !totpEnabled && (
          <form onSubmit={handleEnable2fa} className="space-y-3 p-4 rounded-2xl bg-[#FAF9FF] border border-[#E8DFFF]">
            <div className="text-[12.5px] text-[#323052]">
              Add this setup key manually in your Authenticator app (<strong>Time-based / TOTP</strong>):
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#ECEAF6] font-mono text-[13px] font-bold text-[#6336D9] select-all break-all">
              {totpSetup.secret}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="flex-1 rounded-xl bg-white border border-[#ECEAF6] px-3.5 py-2 text-[13px]"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold"
              >
                Verify & Enable
              </button>
            </div>
          </form>
        )}

        {totpEnabled && (
          <form onSubmit={handleDisable2fa} className="flex flex-wrap gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Enter 6-digit code to disable"
              className="flex-1 min-w-[200px] rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-2 text-[13px]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-semibold"
            >
              Disable Authenticator
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
