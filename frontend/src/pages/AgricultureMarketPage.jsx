import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  HelpCircle,
  Info,
  MapPin,
  RefreshCw,
  Scale,
  Search,
  Sprout,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

function formatInr(val, unavailableLabel = 'Unavailable') {
  if (val === null || val === undefined) return unavailableLabel;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="bg-white/85 rounded-[22px] p-5 border border-[#E2DCF5] animate-pulse space-y-3"
        >
          <div className="h-4 w-2/3 bg-[#EAE5F8] rounded-full" />
          <div className="h-3 w-1/2 bg-[#F1EEFA] rounded-full" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="h-12 bg-[#F4F1FC] rounded-xl" />
            <div className="h-12 bg-[#F4F1FC] rounded-xl" />
            <div className="h-12 bg-[#EDE7FF] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AgricultureMarketPage() {
  const { t } = useApp();
  const [states, setStates] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [catalogSource, setCatalogSource] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const [selectedState, setSelectedState] = useState('Andhra Pradesh');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [commodityQuery, setCommodityQuery] = useState('Dry Chillies');

  const [pricesData, setPricesData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load live States & Commodities from Agmarknet 2.0
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError('');

    Promise.all([
      api.getAgricultureMarkets({ state: 'Andhra Pradesh' }),
      api.getAgricultureCommodities(),
    ])
      .then(([mktRes, cmdtRes]) => {
        if (!active) return;
        setStates(mktRes?.states || []);
        setMarkets(mktRes?.markets || []);
        setCommodities(cmdtRes?.commodities || []);
        setCatalogSource(mktRes?.source || 'Agmarknet 2.0');
      })
      .catch((err) => {
        if (!active) return;
        setCatalogError(err?.message || 'Unable to load live Agmarknet market catalog.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Reload markets whenever State changes
  useEffect(() => {
    if (!selectedState) {
      setMarkets([]);
      return;
    }
    let active = true;
    api
      .getAgricultureMarkets({ state: selectedState })
      .then((res) => {
        if (!active) return;
        setMarkets(res?.markets || []);
        setSelectedMarket('');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedState]);

  const matchingCommodities = useMemo(() => {
    if (!commodityQuery.trim()) return commodities.slice(0, 30);
    const q = commodityQuery.toLowerCase();
    return commodities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [commodities, commodityQuery]);

  const runSearch = async (forceRefresh = false) => {
    if (!selectedState && !selectedMarket && !commodityQuery.trim()) {
      setError('Please select a state, market, or commodity to search.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const [priceRes, compRes] = await Promise.all([
        api.getAgriculturePrices({
          state: selectedState,
          market: selectedMarket,
          commodity: commodityQuery.trim(),
          refresh: forceRefresh ? 'true' : '',
        }),
        commodityQuery.trim()
          ? api.compareAgriculturePrices({
              commodity: commodityQuery.trim(),
              state: selectedState,
              refresh: forceRefresh ? 'true' : '',
            })
          : Promise.resolve(null),
      ]);
      setPricesData(priceRes);
      setCompareData(compRes);
    } catch (err) {
      setError(err?.message || 'Failed to fetch mandi prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(false);
  }, []);

  const highestMarket = compareData?.highest_reported_market;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Sprout}
        title={t('agriMarket.title')}
        subtitle={t('agriMarket.subtitle')}
        badge={catalogSource || 'Agmarknet 2.0'}
      />

      {/* Search & Filter Panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(false);
        }}
        className="bg-white/90 backdrop-blur-md rounded-[24px] p-5 border border-[#E2DCF5] shadow-[0_12px_32px_rgba(99,54,217,0.07)] space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* State Filter */}
          <div>
            <label className="text-[12px] font-bold text-[#171638]">{t('agriMarket.state')}</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={catalogLoading}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] focus:border-[#7650E8] px-3 py-2.5 text-[13px] text-[#171638] focus:outline-none cursor-pointer"
            >
              <option value="">{t('agriMarket.allStates')}</option>
              {states.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Market / Mandi Filter */}
          <div>
            <label className="text-[12px] font-bold text-[#171638]">
              {t('agriMarket.market')} {markets.length > 0 && <span className="text-[#85839A] font-normal">({markets.length})</span>}
            </label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              disabled={catalogLoading}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] focus:border-[#7650E8] px-3 py-2.5 text-[13px] text-[#171638] focus:outline-none cursor-pointer"
            >
              <option value="">{t('agriMarket.allMarketsIn', { state: selectedState || 'India' })}</option>
              {markets.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} {m.district ? `(${m.district})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Commodity Search */}
          <div>
            <label className="text-[12px] font-bold text-[#171638]">
              {t('agriMarket.crop')} {commodities.length > 0 && <span className="text-[#85839A] font-normal">({commodities.length})</span>}
            </label>
            <input
              type="text"
              list="agmarknet-commodities-list"
              value={commodityQuery}
              onChange={(e) => setCommodityQuery(e.target.value)}
              placeholder={t('agriMarket.cropPlaceholder')}
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] focus:border-[#7650E8] px-3.5 py-2.5 text-[13px] text-[#171638] focus:outline-none"
            />
            <datalist id="agmarknet-commodities-list">
              {matchingCommodities.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] hover:from-[#4E2BC4] hover:to-[#6942DC] text-white text-[13px] font-semibold shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? t('agriMarket.searching') : t('agriMarket.searchPrices')}</span>
            </button>
            <button
              type="button"
              onClick={() => runSearch(true)}
              disabled={loading}
              title="Refresh live prices"
              aria-label="Refresh live prices"
              className="p-2.5 rounded-full bg-[#F3EEFF] hover:bg-[#E7E0FA] border border-[#DFD8F5] text-[#5B35D5] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Andhra Pradesh / Popular Crop Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11.5px] font-semibold text-[#6C6A84]">{t('agriMarket.quickSearch')}</span>
          {[
            { label: 'AP • Dry Chillies', state: 'Andhra Pradesh', market: '', crop: 'Dry Chillies' },
            { label: 'Guntur APMC', state: 'Andhra Pradesh', market: 'Guntur APMC', crop: '' },
            { label: 'AP • Tomato', state: 'Andhra Pradesh', market: '', crop: 'Tomato' },
            { label: 'AP • Onion', state: 'Andhra Pradesh', market: '', crop: 'Onion' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSelectedState(preset.state);
                setSelectedMarket(preset.market);
                setCommodityQuery(preset.crop);
              }}
              className="px-3 py-1 rounded-full bg-[#F5F2FF] hover:bg-[#EAE2FF] border border-[#DFD8F5] text-[11.5px] font-semibold text-[#5B35D5] transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </form>

      {catalogError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{catalogError}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Honest Data Source Notice (when API key needed or upstream unavailable) */}
      {!loading && pricesData && !pricesData.available && (
        <div className="bg-white/90 rounded-[24px] p-6 border border-[#DFD8F5] shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15.5px] font-bold text-[#171638]">
                Live Mandi Price Feed Configuration Needed
              </h3>
              <p className="text-[13px] text-[#4E4C6A] mt-1 leading-relaxed">
                {pricesData.message}
              </p>
              <p className="text-[12px] text-[#6C6A84] mt-2">
                Live catalog loaded from <strong>{catalogSource}</strong> ({states.length} states,{' '}
                {markets.length} markets in {selectedState || 'India'}, {commodities.length} commodities).
                We never display fake or sample numbers as live mandi prices.
              </p>
              <a
                href="https://agmarknet.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-[12.5px] font-bold text-[#5B35D5] hover:underline"
              >
                <span>Open Official Agmarknet 2.0 Portal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <SkeletonCards />}

      {/* Live Price Cards */}
      {!loading && pricesData?.available && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#5A5778]">
            <span>
              {t('agriMarket.showingRecords', { count: pricesData.items.length })}{' '}
              <strong>{t('agriMarket.unit')}</strong>
            </span>
            <span className="px-3 py-1 rounded-full bg-white/85 border border-[#E2DCF5] text-[11.5px] font-semibold text-[#5B35D5]">
              {t('agriMarket.source')}: {pricesData.source} • {pricesData.cached ? t('agriMarket.cached') : t('agriMarket.live')}
            </span>
          </div>

          {pricesData.items.length === 0 ? (
            <div className="bg-white/90 rounded-[24px] p-8 border border-[#E2DCF5] text-center">
              <Sprout className="w-8 h-8 mx-auto text-[#7650E8] mb-2" />
              <h3 className="text-[15px] font-bold text-[#171638]">{t('agriMarket.noPricesTitle')}</h3>
              <p className="text-[13px] text-[#6C6A84] mt-1">{pricesData.message}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pricesData.items.map((item, idx) => (
                <div
                  key={`${item.market}-${item.commodity}-${item.reported_date}-${idx}`}
                  className="bg-white/90 backdrop-blur-md rounded-[22px] p-5 border border-[#DFD8F5] shadow-[0_8px_24px_rgba(99,54,217,0.06)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#171638]">{item.commodity}</h3>
                      {item.variety && (
                        <p className="text-[11.5px] text-[#6C6A84]">{item.variety}</p>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F3EEFF] text-[#5B35D5] text-[11px] font-semibold shrink-0">
                      {t('agriMarket.unit')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#4E4C6A]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#171638]">
                      <MapPin className="w-3.5 h-3.5 text-[#7650E8]" />
                      {item.market}
                    </span>
                    {item.district && <span>• {item.district}</span>}
                    <span>• {item.state}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] text-center">
                      <div className="text-[10.5px] font-semibold text-[#6C6A84]">{t('agriMarket.min')}</div>
                      <div className="text-[13.5px] font-bold text-[#171638] mt-0.5">
                        {formatInr(item.min_price, t('agriMarket.unavailable'))}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] text-center">
                      <div className="text-[10.5px] font-semibold text-[#6C6A84]">{t('agriMarket.max')}</div>
                      <div className="text-[13.5px] font-bold text-[#171638] mt-0.5">
                        {formatInr(item.max_price, t('agriMarket.unavailable'))}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-b from-[#EFEAFF] to-[#E5DCFA] border border-[#C9BAFA] text-center">
                      <div className="text-[10.5px] font-bold text-[#5B35D5]">{t('agriMarket.modal')}</div>
                      <div className="text-[14px] font-extrabold text-[#4E2BC4] mt-0.5">
                        {formatInr(item.modal_price, t('agriMarket.unavailable'))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1EEF9] flex items-center justify-between text-[11px] text-[#6C6A84]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#7650E8]" />
                      {t('agriMarket.reported')} <strong>{item.reported_date || t('agriMarket.unavailable')}</strong>
                    </span>
                    <span>Agmarknet</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Market Comparison Section */}
          {compareData?.available && compareData.items?.length > 1 && (
            <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-5 border border-[#DFD8F5] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#6336D9]" />
                  <h3 className="text-[16px] font-bold text-[#171638]">
                    {t('agriMarket.compareTitle', { commodity: compareData.commodity, state: compareData.state })}
                  </h3>
                </div>
                {highestMarket && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t('agriMarket.highestReported')} {highestMarket.market} ({formatInr(highestMarket.modal_price ?? highestMarket.max_price, t('agriMarket.unavailable'))})
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#EAE5F8] text-[#6C6A84]">
                      <th className="py-2 pr-3 font-bold">{t('agriMarket.colMarket')}</th>
                      <th className="py-2 pr-3 font-bold">{t('agriMarket.colDistrict')}</th>
                      <th className="py-2 pr-3 font-bold">{t('agriMarket.colMin')}</th>
                      <th className="py-2 pr-3 font-bold">{t('agriMarket.colMax')}</th>
                      <th className="py-2 pr-3 font-bold">{t('agriMarket.colModal')}</th>
                      <th className="py-2 font-bold">{t('agriMarket.colDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareData.items.slice(0, 12).map((row, idx) => (
                      <tr key={`${row.market}-${idx}`} className="border-b border-[#F4F1FC]">
                        <td className="py-2.5 pr-3 font-bold text-[#171638]">{row.market}</td>
                        <td className="py-2.5 pr-3 text-[#5A5778]">{row.district || '—'}</td>
                        <td className="py-2.5 pr-3">{formatInr(row.min_price, t('agriMarket.unavailable'))}</td>
                        <td className="py-2.5 pr-3">{formatInr(row.max_price, t('agriMarket.unavailable'))}</td>
                        <td className="py-2.5 pr-3 font-bold text-[#5B35D5]">{formatInr(row.modal_price, t('agriMarket.unavailable'))}</td>
                        <td className="py-2.5 text-[#6C6A84]">{row.reported_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11.5px] text-[#6C6A84] italic">{t('agriMarket.disclaimer')}</p>
            </div>
          )}
        </div>
      )}

      {/* Farmer-Friendly Price Guide */}
      <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-5 border border-[#E2DCF5] shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4.5 h-4.5 text-[#6336D9]" />
          <h3 className="text-[14.5px] font-bold text-[#171638]">
            {t('agriMarket.guideTitle')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">
          <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6]">
            <div className="font-bold text-[#171638]">{t('agriMarket.guideMinTitle')}</div>
            <p className="text-[#5A5778] mt-1">{t('agriMarket.guideMinDesc')}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6]">
            <div className="font-bold text-[#171638]">{t('agriMarket.guideMaxTitle')}</div>
            <p className="text-[#5A5778] mt-1">{t('agriMarket.guideMaxDesc')}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#F4F0FF] border border-[#D8CCF9]">
            <div className="font-bold text-[#4E2BC4]">{t('agriMarket.guideModalTitle')}</div>
            <p className="text-[#4E4C6A] mt-1">{t('agriMarket.guideModalDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
