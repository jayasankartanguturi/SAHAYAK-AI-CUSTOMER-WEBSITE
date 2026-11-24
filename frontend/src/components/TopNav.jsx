import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  ChevronDown,
  Bell,
  Menu,
  User,
  Accessibility,
  LogIn,
  LogOut,
  CheckCircle2,
  Sparkles,
  MessageSquareText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ALL_NAV_ITEMS } from '../data/navItems';
import { LANGUAGES } from '../data/mockData';

export default function TopNav({ onOpenAuthModal }) {
  const {
    activePage,
    user,
    logoutUser,
    language,
    setLanguage,
    t,
    demoCards,
    navigate,
    askWithPrompt,
    setMobileMenuOpen,
    notifications,
    markNotificationRead,
    unreadCount,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(null); // 'ai' | 'services' | 'activity' | null

  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setSearchFocused(false);
        setLangOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
        setTopMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPages = searchQuery.trim()
    ? ALL_NAV_ITEMS.filter((item) => {
        const localized = t(`nav.${item.id}`).toLowerCase();
        return (
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          localized.includes(searchQuery.toLowerCase())
        );
      }).slice(0, 5)
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (filteredPages.length > 0) {
      navigate(filteredPages[0].id);
    } else {
      askWithPrompt(searchQuery.trim());
    }
    setSearchQuery('');
    setSearchFocused(false);
  };

  const topMenus = {
    ai: [
      { id: 'voice', label: t('nav.voice') },
      { id: 'image', label: t('nav.image') },
      { id: 'document', label: t('nav.document') },
      { id: 'language', label: t('nav.language') },
    ],
    services: [
      { id: 'my-profession', label: t('nav.my-profession') },
      { id: 'profession-services', label: t('nav.profession-services') },
      { id: 'schemes', label: t('nav.schemes') },
      { id: 'agriculture-market', label: t('nav.agriculture-market') },
      { id: 'weather-market', label: t('nav.weather-market') },
      { id: 'local-info', label: t('nav.local-info') },
    ],
    activity: [
      { id: 'saved', label: t('nav.saved') },
      { id: 'history', label: t('nav.history') },
      { id: 'my-documents', label: t('nav.my-documents') },
      { id: 'notifications', label: t('nav.notifications') },
    ],
  };

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-20 bg-[#F3F0FA]/85 backdrop-blur-md border-b border-[#E2DCF5] px-4 sm:px-6 lg:px-8 py-3"
    >
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger + Desktop Quick Nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white/90 border border-[#E2DCF5] text-[#171638] hover:bg-[#EAE3FF]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="hidden xl:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('home')}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activePage === 'home'
                  ? 'bg-[#E3DAFA] text-[#4E2BC4]'
                  : 'text-[#323052] hover:bg-white/70'
              }`}
            >
              {t('nav.home')}
            </button>

            <button
              type="button"
              onClick={() => navigate('ask')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activePage === 'ask'
                  ? 'bg-gradient-to-r from-[#5B35D5] via-[#7650E8] to-[#9B7BF7] text-white shadow-[0_6px_18px_rgba(118,80,232,0.34)]'
                  : 'bg-[#ECE6FC] text-[#5B35D5] hover:bg-[#E2D9FA]'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>{t('topNav.askShort')}</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {[
              { key: 'ai', label: t('topNav.aiAssist') },
              { key: 'services', label: t('topNav.services') },
              { key: 'activity', label: t('topNav.activity') },
            ].map((menu) => (
              <div key={menu.key} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setTopMenuOpen((v) => (v === menu.key ? null : menu.key))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold text-[#323052] hover:bg-white/70 transition-colors cursor-pointer"
                >
                  <span>{menu.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#726F8C]" />
                </button>

                {topMenuOpen === menu.key && (
                  <div className="absolute left-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E2DCF5] shadow-xl py-1.5 z-40">
                    {topMenus[menu.key].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate(item.id);
                          setTopMenuOpen(null);
                        }}
                        className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-[#323052] hover:bg-[#F3EEFF] hover:text-[#5B35D5] transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Center: Glowing Search Pill */}
        <div className="relative flex-1 max-w-[360px] mx-auto">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2.5 bg-white/85 border border-[#C7B8FA] shadow-[0_0_16px_rgba(118,80,232,0.16)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7650E8]/35 rounded-full px-4 py-2 transition-all">
              <Search className="w-4 h-4 text-[#85839A] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('topNav.searchPlaceholder')}
                className="w-full bg-transparent text-[13px] text-[#171638] placeholder:text-[#85839A] focus:outline-none"
              />
            </div>
          </form>

          {searchFocused && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#ECEAF6] overflow-hidden z-40">
              {filteredPages.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    onClick={() => {
                      navigate(page.id);
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#171638] hover:bg-[#F1EFF8] transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#7650E8]" />
                    <span>{t('topNav.openPage', { label: t(`nav.${page.id}`) })}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  askWithPrompt(searchQuery.trim());
                  setSearchQuery('');
                  setSearchFocused(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-[#7650E8] bg-[#FAF9FF] hover:bg-[#E8DFFF]/60 border-t border-[#ECEAF6]"
              >
                <Search className="w-4 h-4" />
                <span>{t('topNav.askAiQuery', { query: searchQuery.trim() })}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setLangOpen((v) => !v);
                setNotifOpen(false);
                setProfileOpen(false);
              }}
              className="flex items-center gap-2 bg-white border border-[#ECEAF6] hover:border-[#7650E8]/40 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[#171638] shadow-xs transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-[#7650E8]" />
              <span className="hidden sm:inline">
                {LANGUAGES.find((l) => l.name === language)?.native || language}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#85839A]" />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-[#ECEAF6] py-1.5 z-40">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.name);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-[12.5px] hover:bg-[#F1EFF8] ${
                      language === lang.name
                        ? 'text-[#7650E8] font-semibold bg-[#FAF9FF]'
                        : 'text-[#171638]'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[11px] text-[#85839A]">{lang.native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setLangOpen(false);
                setProfileOpen(false);
              }}
              className="relative w-9 h-9 rounded-full bg-white border border-[#ECEAF6] hover:border-[#7650E8]/40 flex items-center justify-center text-[#171638] shadow-xs transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-[#323052]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#ECEAF6] p-3 z-40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#ECEAF6]">
                  <span className="text-[13px] font-bold text-[#171638]">{t('topNav.notifications')}</span>
                  <button
                    onClick={() => {
                      navigate('notifications');
                      setNotifOpen(false);
                    }}
                    className="text-[11.5px] font-semibold text-[#7650E8] hover:underline"
                  >
                    {t('common.viewAll')}
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                        n.read ? 'bg-[#FAF9FF]' : 'bg-[#F1EFF8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[12px] font-semibold text-[#171638]">
                          {demoCards.notificationLabels[n.id]?.title || n.title}
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#7650E8] mt-1 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#85839A] mt-0.5 line-clamp-2">
                        {demoCards.notificationLabels[n.id]?.detail || n.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setLangOpen(false);
                setNotifOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7650E8] to-[#5630C6] text-white font-bold text-[14px] flex items-center justify-center shadow-sm hover:opacity-95 transition-opacity"
              aria-label="User profile"
            >
              {user.name?.[0]?.toUpperCase() || 'J'}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#ECEAF6] py-2 z-40">
                <div className="px-4 py-2 border-b border-[#ECEAF6]">
                  <div className="text-[13px] font-bold text-[#171638]">{user.name}</div>
                  <div className="text-[11px] text-[#85839A] truncate">{user.email}</div>
                </div>
                <button
                  onClick={() => {
                    navigate('profile');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-[#171638] hover:bg-[#F1EFF8]"
                >
                  <User className="w-4 h-4 text-[#7650E8]" />
                  <span>{t('topNav.profileSettings')}</span>
                </button>
                <button
                  onClick={() => {
                    navigate('accessibility');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-[#171638] hover:bg-[#F1EFF8]"
                >
                  <Accessibility className="w-4 h-4 text-[#7650E8]" />
                  <span>{t('topNav.accessibilitySettings')}</span>
                </button>
                <div className="border-t border-[#ECEAF6] mt-1 pt-1">
                  {user.isAuthenticated ? (
                    <button
                      onClick={() => {
                        logoutUser();
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('topNav.signOut')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-[#7650E8] font-semibold hover:bg-[#F1EFF8]"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{t('topNav.signInRegister')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

