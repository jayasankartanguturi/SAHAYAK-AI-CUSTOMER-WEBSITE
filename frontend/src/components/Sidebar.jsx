import React from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { NAV_GROUPS } from '../data/navItems';
import { useApp } from '../context/AppContext';

function BrandLogo() {
  const { t } = useApp();
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      <img
        src="/images/sahayak-logo.png"
        alt="Sahayak AI"
        className="w-10 h-10 object-contain shrink-0"
      />
      <div className="min-w-0">
        <div className="text-[17px] font-bold tracking-tight text-[#171638] leading-tight">
          {t('brand.name')}
        </div>
        <div className="text-[10px] font-medium text-[#85839A] truncate">
          {t('brand.subtitle')}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { mobileMenuOpen, setMobileMenuOpen, unreadCount, t } = useApp();

  const navContent = (
    <div className="flex flex-col h-full bg-[#F4F1FC]/90 backdrop-blur-md border-r border-[#E2DCF5] w-[256px] select-none">
      <div className="flex items-center justify-between pr-2">
        <BrandLogo />
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#85839A] hover:bg-[#F1EFF8]"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-1.5 text-[10px] font-bold tracking-[0.08em] text-[#85839A] uppercase">
              {t(`groups.${group.title}`)}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-[#6D44E5] via-[#7F5AF0] to-[#9B7BF7] text-white font-semibold shadow-[0_6px_16px_rgba(109,68,229,0.28)]'
                          : 'text-[#323052] hover:bg-[#E7E0FA]/70 hover:text-[#5B35D5]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-[#5A5778]'
                            }`}
                          />
                          <span className="truncate">{t(`nav.${item.id}`)}</span>
                        </span>
                        {item.hasBadge && unreadCount > 0 && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none ${
                              isActive
                                ? 'bg-white text-[#7650E8]'
                                : 'bg-[#7650E8] text-white'
                            }`}
                          >
                            {unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile / Tablet drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#171638]/30 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full shadow-2xl">{navContent}</div>
        </div>
      )}
    </>
  );
}

