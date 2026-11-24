import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getNavItemByPath } from '../../data/navItems';
import { useLanguage } from '../../context/AppContext';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  if (pathname === '/') return null;

  const current = getNavItemByPath(pathname);
  const groupKey = current.group.toUpperCase();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-[#85839A] mb-3">
      <Link
        to="/"
        className="inline-flex items-center gap-1 hover:text-[#6336D9] transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>{t('common.home')}</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-[#C2BBE0]" />
      <span className="text-[#85839A] hidden sm:inline">{t(`groups.${groupKey}`)}</span>
      <ChevronRight className="w-3.5 h-3.5 text-[#C2BBE0] hidden sm:inline" />
      <span className="font-semibold text-[#6336D9] truncate">{t(`nav.${current.id}`)}</span>
    </nav>
  );
}
