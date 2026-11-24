import React, { useState } from 'react';
import { Languages, ArrowRightLeft, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../data/mockData';
import { api } from '../services/api';

export default function LanguageTranslationPage() {
  const { language, setLanguage, selectedProfession, t } = useApp();
  const phrases = t('languagePage.phrases');
  const [sourceText, setSourceText] = useState(
    Array.isArray(phrases) ? phrases[0] : ''
  );
  const [targetLang, setTargetLang] = useState('Telugu');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!sourceText.trim() || loading) return;
    setLoading(true);
    const res = await api.chat(
      `Translate and explain this clearly in ${targetLang}: "${sourceText}"`,
      targetLang,
      selectedProfession
    );
    setTranslated(res.answer);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Languages}
        title={t('languagePage.title')}
        subtitle={t('languagePage.subtitle')}
      />

      <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm">
        <h3 className="text-[14px] font-bold text-[#171638] mb-3">
          {t('languagePage.preferredTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LANGUAGES.map((lang) => {
            const active = language === lang.name;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.name)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  active
                    ? 'bg-gradient-to-br from-[#7650E8] to-[#6336D9] text-white border-transparent shadow-md'
                    : 'bg-[#FAF9FF] border-[#ECEAF6] text-[#171638] hover:border-[#7650E8]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-bold">{lang.name}</span>
                  {active && <Check className="w-4 h-4" />}
                </div>
                <div className={`text-[12.5px] mt-0.5 ${active ? 'text-white/80' : 'text-[#85839A]'}`}>
                  {lang.native}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleTranslate}
        className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-[#171638]">
            {t('languagePage.translatorTitle')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#85839A]">{t('languagePage.translateTo')}</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="rounded-full bg-[#F1EFF8] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6336D9] focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            rows={5}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={t('languagePage.inputPlaceholder')}
            className="w-full rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] p-4 text-[13.5px] focus:outline-none focus:border-[#7650E8]"
          />
          <div className="rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] p-4 text-[13.5px] text-[#171638] whitespace-pre-line min-h-[130px]">
            {translated
              ? translated.replace(/[#*]/g, '')
              : t('languagePage.outputPlaceholder')}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(phrases) &&
              phrases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSourceText(p)}
                  className="px-3 py-1 rounded-full bg-[#F1EFF8] text-[11.5px] font-medium text-[#6336D9]"
                >
                  {p}
                </button>
              ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>
              {loading
                ? t('languagePage.translating')
                : t('languagePage.translateButton', { lang: targetLang })}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
