import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  MessageCircle,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  Briefcase,
  Star,
  MapPin,
  ChevronDown,
  Landmark,
  Clock,
  Bell,
  CloudSun,
  Sun,
  CloudRain,
  Sprout,
  Bookmark,
  GraduationCap,
  X,
  HeartHandshake,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { PROFESSIONS } from '../data/mockData';
import { getOnboardingProfessionById } from '../data/professionsConfig';
import { localizeProfession } from '../locales/onboardingTranslations';
import { api } from '../services/api';

export default function HomeDashboard() {
  const {
    user,
    navigate,
    askWithPrompt,
    setSelectedProfession,
    city,
    setCity,
    history,
    notifications,
    language,
    selectedProfession,
    t,
    demoCards,
  } = useApp();

  const [heroInput, setHeroInput] = useState('');
  const [weather, setWeather] = useState(null);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(() => {
    try {
      return localStorage.getItem('sahayak_hide_tips') !== '1';
    } catch {
      return true;
    }
  });

  const dismissTips = () => {
    setShowTips(false);
    try {
      localStorage.setItem('sahayak_hide_tips', '1');
    } catch {
      // ignore
    }
  };

  const {
    listening,
    error: micError,
    start: toggleHeroMic,
  } = useSpeechRecognition({
    language,
    onTranscript: (text) => setHeroInput(text),
  });

  useEffect(() => {
    let active = true;
    api.getWeather(city).then((data) => {
      if (active) setWeather(data);
    });
    return () => {
      active = false;
    };
  }, [city]);

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (!heroInput.trim()) return;
    askWithPrompt(heroInput.trim());
    setHeroInput('');
  };

  const quickAccess = [
    {
      id: 'ask',
      title: t('home.quickChatTitle'),
      subtitle: t('home.quickChatSub'),
      icon: MessageCircle,
      bg: 'bg-[#F3EEFF] hover:bg-[#EAE1FF]',
      iconBg: 'bg-gradient-to-br from-[#8B68F2] to-[#6336D9]',
      arrowColor: 'text-[#7650E8]',
    },
    {
      id: 'voice',
      title: t('home.quickVoiceTitle'),
      subtitle: t('home.quickAssistantSub'),
      icon: Mic,
      bg: 'bg-[#ECF5FF] hover:bg-[#DFEEFF]',
      iconBg: 'bg-gradient-to-br from-[#52A5FF] to-[#2B7DE9]',
      arrowColor: 'text-[#2B7DE9]',
    },
    {
      id: 'image',
      title: t('home.quickImageTitle'),
      subtitle: t('home.quickAssistantSub'),
      icon: ImageIcon,
      bg: 'bg-[#EAFBF2] hover:bg-[#DCF6E9]',
      iconBg: 'bg-gradient-to-br from-[#34D399] to-[#10B981]',
      arrowColor: 'text-[#10B981]',
    },
    {
      id: 'document',
      title: t('home.quickDocTitle'),
      subtitle: t('home.quickAssistantSub'),
      icon: FileText,
      bg: 'bg-[#FFF4EA] hover:bg-[#FFEAD8]',
      iconBg: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C]',
      arrowColor: 'text-[#EA580C]',
    },
    {
      id: 'my-profession',
      title: t('home.quickProfessionTitle'),
      subtitle: '',
      icon: Briefcase,
      bg: 'bg-[#FFEDF2] hover:bg-[#FFE0E9]',
      iconBg: 'bg-gradient-to-br from-[#F43F5E] to-[#E11D48]',
      arrowColor: 'text-[#E11D48]',
    },
  ];

  const suggestedPrompts = [
    { label: t('home.pmKisanChip'), icon: Landmark, prompt: 'Explain PM Kisan Scheme eligibility, benefits, and required documents.' },
    { label: t('home.cropDiseaseChip'), icon: Sprout, prompt: 'How do I identify and manage common paddy leaf diseases safely?' },
    { label: t('home.weatherChip'), icon: CloudSun, prompt: 'What is the weather forecast and farming advisory for Vijayawada?' },
    { label: t('home.educationChip'), icon: GraduationCap, prompt: 'What scholarships are available on the National Scholarship Portal?' },
  ];

  const activeProfConfig = localizeProfession(
    getOnboardingProfessionById(selectedProfession),
    language
  );
  const activeProfData =
    PROFESSIONS.find((p) => p.id === selectedProfession) || PROFESSIONS[0];
  const featuredProfessions = PROFESSIONS;
  const cities = ['Vijayawada', 'Guntur', 'Visakhapatnam', 'Hyderabad'];

  return (
    <div className="space-y-5">
      {/* 1. HERO / WELCOME BANNER */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-[28px] overflow-hidden bg-gradient-to-r from-[#F6F3FF] via-[#EFEAFF] to-[#E4DAFD] border border-[#E8DFFF] shadow-[0_12px_36px_rgba(118,80,232,0.08)]"
      >
        <div className="hidden md:block absolute inset-y-0 right-0 w-[44%] pointer-events-none">
          <img
            src="/images/hero-robot.jpg"
            alt="Sahayak AI Assistant"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#EFEAFF] via-[#EFEAFF]/45 to-transparent" />
          <div className="absolute top-6 left-4 lg:left-8 -rotate-6 text-[#6336D9]">
            <div className="font-handwritten text-[24px] lg:text-[28px] leading-none font-bold drop-shadow-xs">
              {t('home.empowering1')}
              <br />
              {t('home.empowering2')}
            </div>
            <svg viewBox="0 0 120 14" className="w-28 h-3 mt-1 text-[#7650E8]" fill="none">
              <path
                d="M3 10C32 3 85 2 116 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 p-6 sm:p-8 lg:p-9 max-w-[650px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/75 border border-[#E4DDF7] text-[11.5px] font-semibold text-[#6336D9] mb-2.5">
            <span>{activeProfConfig.emoji}</span>
            <span>
              {activeProfConfig.dashboardTitle}
              {user.specialization ? ` • ${user.specialization}` : ''} • {language}
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-[#171638] leading-tight">
            {t('home.hello')}, <span className="text-[#3C3868] font-bold">{user.name}!</span>{' '}
            <span className="inline-block">👋</span>
          </h1>
          <p className="text-[14.5px] sm:text-[15.5px] text-[#5A5778] mt-1 font-medium">
            {activeProfConfig.heroDescription || t('home.heroSubtitle')}
          </p>

          <form onSubmit={handleHeroSubmit} className="mt-5">
            <div className="flex items-center gap-3 bg-white rounded-full p-1.5 pl-4 shadow-[0_10px_28px_rgba(118,80,232,0.14)] border border-[#E8DFFF] focus-within:ring-2 focus-within:ring-[#7650E8]/35 transition-all">
              <Sparkles className="w-5 h-5 text-[#7650E8] shrink-0" />
              <input
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder={listening ? t('voice.listening') : t('home.askPlaceholder')}
                className="w-full bg-transparent text-[14px] text-[#171638] placeholder:text-[#85839A] focus:outline-none py-2"
              />
              <button
                type="button"
                onClick={toggleHeroMic}
                title={listening ? t('voice.listening') : t('voice.tapToSpeak')}
                aria-label={listening ? t('voice.listening') : t('voice.tapToSpeak')}
                className={`p-2 flex items-center justify-center transition-colors shrink-0 focus:outline-none ${
                  listening
                    ? 'text-rose-500 animate-pulse'
                    : 'text-[#7650E8] hover:text-[#6336D9]'
                }`}
              >
                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white flex items-center justify-center shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all shrink-0"
                aria-label={t('nav.ask')}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {micError && (
            <p className="mt-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[12px] font-medium text-rose-700">
              {micError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {suggestedPrompts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => askWithPrompt(item.prompt)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[12px] font-medium text-[#323052] border border-[#E4DDF7] shadow-2xs hover:border-[#7650E8]/40 hover:text-[#6336D9] transition-all"
                >
                  <Icon className="w-3.5 h-3.5 text-[#7650E8]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {showTips && (
        <div className="bg-white rounded-2xl px-4 py-3 border border-[#E8DFFF] shadow-2xs flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#323052]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EFEAFF] text-[#6336D9] font-bold text-[11px]">
              Quick Tip
            </span>
            <span>
              <strong>1.</strong> Type or tap the <strong>Mic</strong> to ask in {language} •{' '}
              <strong>2.</strong> Upload crop photos or PDFs •{' '}
              <strong>3.</strong> Switch profession or language anytime
            </span>
          </div>
          <button
            type="button"
            onClick={dismissTips}
            aria-label="Dismiss tip"
            className="p-1 rounded-lg text-[#85839A] hover:bg-[#F1EFF8] hover:text-[#171638]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. QUICK ACCESS CARDS ROW */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {quickAccess.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.04 }}
              onClick={() => navigate(card.id)}
              className={`group flex items-center justify-between gap-3 p-3.5 rounded-2xl ${card.bg} border border-white/80 shadow-[0_4px_16px_rgba(23,22,56,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(118,80,232,0.10)] transition-all text-left`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full ${card.iconBg} text-white flex items-center justify-center shadow-sm shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-[13px] font-bold text-[#171638] truncate">
                    {card.title}
                  </div>
                  {card.subtitle && (
                    <div className="text-[12px] font-medium text-[#5A5778] flex items-center gap-1">
                      <span>{card.subtitle}</span>
                      <ArrowRight className={`w-3 h-3 ${card.arrowColor}`} />
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight
                className={`w-4 h-4 ${card.arrowColor} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0`}
              />
            </motion.button>
          );
        })}
      </section>

      {/* 3. MIDDLE ROW: PROFESSION-BASED SERVICES + WEATHER CARD */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-[0_6px_24px_rgba(23,22,56,0.04)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EFEAFF] text-[#7650E8] flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-[#7650E8]" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#171638]">
                  {t('home.profServicesTitle')}
                </h2>
                <p className="text-[12px] text-[#85839A]">
                  {t('home.profServicesSub')}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('profession-services')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[12px] font-semibold text-[#6336D9] transition-colors shrink-0"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {featuredProfessions.map((prof) => (
              <button
                key={prof.id}
                onClick={() => {
                  setSelectedProfession(prof.id);
                  navigate('profession-services');
                }}
                className="group bg-[#FAF9FF] hover:bg-white rounded-2xl overflow-hidden border border-[#ECEAF6] hover:border-[#7650E8]/40 hover:shadow-md transition-all text-center flex flex-col"
              >
                <div className="h-24 w-full overflow-hidden">
                  <img
                    src={prof.image}
                    alt={t(`professions.${prof.id}.name`)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-[13px] font-bold text-[#171638] truncate">
                    {t(`professions.${prof.id}.name`)}
                  </div>
                  <div className="text-[11px] text-[#85839A] truncate">
                    {t(`professions.${prof.id}.sub`)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-gradient-to-br from-[#F7F5FF] via-[#F2EEFC] to-[#EAE3FA] rounded-[24px] p-5 border border-[#E8DFFF] shadow-[0_6px_24px_rgba(118,80,232,0.06)] relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center shadow-xs">
                  <CloudSun className="w-9 h-9 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="text-[32px] font-extrabold text-[#171638] leading-none">
                    {weather ? `${weather.current.temp}°C` : '28°C'}
                  </div>
                  <div className="text-[13px] font-medium text-[#5A5778] mt-1">
                    {weather
                      ? demoCards.weatherConditions[weather.current.condition] || weather.current.condition
                      : t('home.partlyCloudy')}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-semibold text-[#7650E8] border border-[#E8DFFF]">
                {weather?.is_live ? 'Live • Open-Meteo' : t('common.demoData')}
              </span>
            </div>

            <div className="relative mt-3 inline-block">
              <button
                onClick={() => setCityMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#171638] hover:text-[#6336D9]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#7650E8]" />
                <span>{city}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#85839A]" />
              </button>
              {cityMenuOpen && (
                <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#ECEAF6] py-1 z-20">
                  {cities.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCity(c);
                        setCityMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F1EFF8] text-[#171638]"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 mt-4 pt-3 border-t border-[#DFD6FA] relative z-10">
            {(weather?.forecast || [
              { day: 'Mon', temp: 27, condition: 'Partly Cloudy' },
              { day: 'Tue', temp: 29, condition: 'Sunny' },
              { day: 'Wed', temp: 30, condition: 'Warm' },
              { day: 'Thu', temp: 29, condition: 'Light Rain' },
              { day: 'Fri', temp: 28, condition: 'Partly Cloudy' },
            ]).map((f) => (
              <div
                key={f.day}
                className="flex flex-col items-center py-1.5 rounded-xl bg-white/55 text-center"
              >
                <span className="text-[11px] font-medium text-[#5A5778]">
                  {demoCards.weekDays[f.day] || f.day}
                </span>
                {f.condition.includes('Rain') ? (
                  <CloudRain className="w-4 h-4 text-[#3B82F6] my-1" />
                ) : f.condition.includes('Sunny') || f.condition.includes('Warm') ? (
                  <Sun className="w-4 h-4 text-[#F59E0B] my-1" />
                ) : (
                  <CloudSun className="w-4 h-4 text-[#F59E0B] my-1" />
                )}
                <span className="text-[12px] font-bold text-[#171638]">{f.temp}°</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BOTTOM ROW: GOVERNMENT SCHEMES + RECENT ACTIVITY + NOTIFICATIONS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="relative rounded-[24px] p-5 bg-gradient-to-br from-[#EFEAFF] via-[#E8E1FC] to-[#DED4FA] border border-[#E2D8FA] shadow-[0_6px_24px_rgba(118,80,232,0.08)] overflow-hidden flex flex-col justify-between min-h-[190px]">
          <img
            src="/images/govt-dome.jpg"
            alt={t('home.govtSchemesTitle')}
            className="absolute right-0 bottom-0 w-36 h-36 object-cover opacity-55 mix-blend-multiply pointer-events-none"
          />
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7650E8] text-white flex items-center justify-center shadow-sm shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#171638]">{t('home.govtSchemesTitle')}</h3>
              <p className="text-[12.5px] text-[#5A5778] mt-0.5">
                {t('home.govtSchemesSub')}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => navigate('eligibility')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <span>{t('home.checkEligibility')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('schemes')}
              className="px-3.5 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#6336D9] text-[12px] font-semibold transition-colors"
            >
              {t('common.browseAll')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-[0_6px_24px_rgba(23,22,56,0.04)]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7650E8]" />
              <h3 className="text-[15px] font-bold text-[#171638]">{t('home.recentActivity')}</h3>
            </div>
            <button
              onClick={() => navigate('history')}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7650E8] hover:underline"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {history.slice(0, 3).map((item, idx) => (
              <button
                key={item.id}
                onClick={() => navigate('history')}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-[#FAF9FF] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-[#EFEAFF] text-[#7650E8]'
                        : idx === 1
                        ? 'bg-[#ECF5FF] text-[#2B7DE9]'
                        : 'bg-[#F3EEFF] text-[#6336D9]'
                    }`}
                  >
                    {idx === 0 ? (
                      <MessageCircle className="w-3.5 h-3.5" />
                    ) : idx === 1 ? (
                      <CloudSun className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[12.5px] font-medium text-[#171638] truncate">
                    {demoCards.historyLabels[item.id]?.question || item.question}
                  </span>
                </div>
                <span className="text-[11px] text-[#85839A] shrink-0">
                  {demoCards.historyLabels[item.id]?.time || item.time}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-[0_6px_24px_rgba(23,22,56,0.04)]">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-[15px] font-bold text-[#171638]">{t('home.notifications')}</h3>
            </div>
            <button
              onClick={() => navigate('notifications')}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7650E8] hover:underline"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {notifications.slice(0, 3).map((n) => (
              <button
                key={n.id}
                onClick={() => navigate('notifications')}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-[#FAF9FF] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      n.type === 'warning'
                        ? 'bg-[#10B981]'
                        : n.type === 'info'
                        ? 'bg-[#3B82F6]'
                        : 'bg-[#7650E8]'
                    }`}
                  />
                  <span className="text-[12.5px] font-medium text-[#171638] truncate">
                    {demoCards.notificationLabels[n.id]?.title || n.title}
                  </span>
                </div>
                <span className="text-[11px] text-[#85839A] shrink-0">
                  {demoCards.notificationLabels[n.id]?.time || n.time}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
