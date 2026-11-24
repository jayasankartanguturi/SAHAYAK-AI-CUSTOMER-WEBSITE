import React, { useState } from 'react';
import {
  Landmark,
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const SCHEMES_LIST = [
  {
    id: 'pm-kisan',
    name: 'PM-KISAN Samman Nidhi',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    professions: ['Farmer'],
    benefit: 'Rs. 6,000 / year in 3 installments',
    max_income: 600000,
    requires_land: true,
    documents: ['Aadhaar Card', 'Landholding Record (RoR)', 'Bank Passbook', 'Mobile Number'],
    official_url: 'https://pmkisan.gov.in',
  },
  {
    id: 'pmfby',
    name: 'Pradhan Mantri Fasal Bima Yojana',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    professions: ['Farmer'],
    benefit: 'Crop loss insurance at 1.5%–2% farmer premium',
    max_income: 1000000,
    requires_land: false,
    documents: ['Aadhaar Card', 'Sowing Certificate', 'Land/Lease Papers', 'Bank Account'],
    official_url: 'https://pmfby.gov.in',
  },
  {
    id: 'pmmsy',
    name: 'Pradhan Mantri Matsya Sampada Yojana',
    ministry: 'Department of Fisheries',
    professions: ['Fisherman'],
    benefit: '40%–60% subsidy for boats, safety kits & cold storage',
    max_income: 800000,
    requires_land: false,
    documents: ['Fisherman ID Card', 'Aadhaar Card', 'Bank Details', 'Project Proposal'],
    official_url: 'https://dof.gov.in',
  },
  {
    id: 'nsp-scholarship',
    name: 'National Scholarship Portal (Post-Matric)',
    ministry: 'Ministry of Education',
    professions: ['Student'],
    benefit: 'Tuition & maintenance allowance based on course',
    max_income: 250000,
    requires_land: false,
    documents: ['Bonafide Certificate', 'Income Certificate', 'Previous Marksheet', 'Aadhaar'],
    official_url: 'https://scholarships.gov.in',
  },
  {
    id: 'pm-mudra',
    name: 'PM Mudra Yojana (Shishu / Kishor / Tarun)',
    ministry: 'Ministry of Finance',
    professions: ['Business Owner', 'Street Vendor', 'Artisan'],
    benefit: 'Collateral-free business loans up to Rs. 10 Lakh',
    max_income: 1500000,
    requires_land: false,
    documents: ['Aadhaar & PAN', 'Business Plan / Shop Proof', 'Bank Statement'],
    official_url: 'https://mudra.org.in',
  },
  {
    id: 'pm-vishwakarma',
    name: 'PM Vishwakarma Artisan Scheme',
    ministry: 'Ministry of MSME',
    professions: ['Artisan'],
    benefit: 'Rs. 15,000 toolkit incentive + 5% credit + skill stipend',
    max_income: 800000,
    requires_land: false,
    documents: ['Aadhaar Card', 'Artisan Trade Proof', 'Bank Passbook', 'Ration Card'],
    official_url: 'https://pmvishwakarma.gov.in',
  },
];

export function GovernmentSchemesPage() {
  const { navigate, askWithPrompt, t, demoCards } = useApp();
  const [query, setQuery] = useState('');
  const [filterProf, setFilterProf] = useState('All');

  const filtered = SCHEMES_LIST.filter((s) => {
    const matchesProf = filterProf === 'All' || s.professions.includes(filterProf);
    const matchesQuery =
      !query.trim() ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.benefit.toLowerCase().includes(query.toLowerCase());
    return matchesProf && matchesQuery;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Landmark}
        title={t('schemes.title')}
        subtitle={t('schemes.subtitle')}
        badge={t('schemes.badge')}
      />

      <div className="bg-white rounded-[24px] p-4 border border-[#ECEAF6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-[#FAF9FF] border border-[#ECEAF6] rounded-full px-4 py-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#85839A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('schemes.searchPlaceholder')}
            className="w-full bg-transparent text-[13px] focus:outline-none"
          />
        </div>
        <select
          value={filterProf}
          onChange={(e) => setFilterProf(e.target.value)}
          className="rounded-full bg-[#F1EFF8] px-4 py-2 text-[12.5px] font-semibold text-[#6336D9] focus:outline-none"
        >
          <option value="All">{t('schemes.allProfessions')}</option>
          <option value="Farmer">{t('professions.Farmer.name')}</option>
          <option value="Fisherman">{t('professions.Fisherman.name')}</option>
          <option value="Student">{t('professions.Student.name')}</option>
          <option value="Business Owner">{t('professions.Business Owner.name')}</option>
          <option value="Artisan">{t('professions.Artisan.name')}</option>
        </select>
        <button
          onClick={() => navigate('eligibility')}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold"
        >
          {t('schemes.checkEligibility')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((s) => {
          const loc = demoCards.schemes[s.id] || s;
          return (
          <div
            key={s.id}
            className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15.5px] font-bold text-[#171638]">{loc.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[11px] font-semibold shrink-0">
                  {t(`professions.${s.professions[0]}.name`)}
                </span>
              </div>
              <p className="text-[11.5px] text-[#85839A] mt-0.5">{loc.ministry}</p>
              <div className="mt-3 p-3 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] text-[13px] font-semibold text-[#171638]">
                {t('schemes.benefit')} {loc.benefit}
              </div>
              <div className="mt-3">
                <div className="text-[11.5px] font-bold text-[#85839A] uppercase mb-1.5 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-[#7650E8]" />
                  <span>{t('schemes.requiredDocs')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {loc.documents.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-full bg-[#F1EFF8] text-[11px] font-medium text-[#323052]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ECEAF6] flex items-center justify-between gap-2">
              <a
                href={s.official_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7650E8] hover:underline"
              >
                <span>{t('schemes.officialPortal')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => askWithPrompt(`How do I apply for ${s.name} step by step?`)}
                className="px-3.5 py-1.5 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] text-[12px] font-semibold"
              >
                {t('schemes.askSteps')}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export function SchemeEligibilityPage() {
  const { selectedProfession, t, demoCards } = useApp();
  const [form, setForm] = useState({
    profession: selectedProfession,
    annual_income: 180000,
    state: 'Andhra Pradesh',
    owns_land: true,
    has_aadhaar: true,
  });
  const [results, setResults] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    const apiRes = await api.checkEligibility(form);
    if (apiRes?.results) {
      setResults(apiRes.results);
      return;
    }
    const local = SCHEMES_LIST.map((s) => {
      const reasons = [];
      let eligible = true;
      if (!s.professions.includes(form.profession) && form.profession !== 'General Citizen') {
        eligible = false;
        reasons.push(`Targeted for ${s.professions.join(', ')}`);
      }
      if (form.annual_income > s.max_income) {
        eligible = false;
        reasons.push(`Income exceeds demo threshold of Rs. ${s.max_income.toLocaleString()}`);
      }
      if (s.requires_land && !form.owns_land) {
        eligible = false;
        reasons.push('Requires cultivable landholding record');
      }
      if (!form.has_aadhaar) {
        eligible = false;
        reasons.push('Aadhaar linkage required for DBT');
      }
      return {
        ...s,
        eligible,
        reasons: reasons.length ? reasons : ['Meets primary demo criteria — verify on official portal'],
      };
    });
    setResults(local);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldCheck}
        title={t('eligibility.title')}
        subtitle={t('eligibility.subtitle')}
        badge={t('eligibility.badge')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleCheck}
          className="lg:col-span-5 bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm space-y-4"
        >
          <div>
            <label className="text-[12px] font-bold text-[#171638]">
              {t('eligibility.professionLabel')}
            </label>
            <select
              value={form.profession}
              onChange={(e) => setForm({ ...form, profession: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2.5 text-[13px]"
            >
              {['Farmer', 'Fisherman', 'Student', 'Business Owner', 'Artisan', 'Street Vendor', 'General Citizen'].map((p) => (
                <option key={p} value={p}>{t(`professions.${p}.name`)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#171638]">
              {t('eligibility.incomeLabel')}
            </label>
            <input
              type="number"
              min="0"
              value={form.annual_income}
              onChange={(e) => setForm({ ...form, annual_income: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2.5 text-[13px]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-[13px] text-[#171638] cursor-pointer">
            <input
              type="checkbox"
              checked={form.owns_land}
              onChange={(e) => setForm({ ...form, owns_land: e.target.checked })}
              className="accent-[#7650E8] w-4 h-4"
            />
            <span>{t('eligibility.ownsLand')}</span>
          </label>

          <label className="flex items-center gap-2.5 text-[13px] text-[#171638] cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_aadhaar}
              onChange={(e) => setForm({ ...form, has_aadhaar: e.target.checked })}
              className="accent-[#7650E8] w-4 h-4"
            />
            <span>{t('eligibility.hasAadhaar')}</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13.5px] font-semibold shadow-sm"
          >
            {t('eligibility.checkButton')}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {results ? (
            results.map((r) => (
              <div
                key={r.id}
                className={`rounded-[20px] p-4 border bg-white ${
                  r.eligible ? 'border-emerald-200' : 'border-[#ECEAF6] opacity-80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[14.5px] font-bold text-[#171638]">
                    {demoCards.schemes[r.id]?.name || r.name}
                  </h4>
                  {r.eligible ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11.5px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('eligibility.likelyEligible')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11.5px] font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('eligibility.notMatched')}</span>
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[#5A5778] mt-1">
                  {demoCards.schemes[r.id]?.benefit || r.benefit}
                </p>
                <p className="text-[11.5px] text-[#85839A] mt-1">{r.reasons[0]}</p>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[24px] p-8 border border-dashed border-[#D8D2F0] text-center text-[#85839A]">
              {t('eligibility.emptyPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
