import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CloudSun,
  AlertTriangle,
  PhoneCall,
  Navigation,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { LOCAL_SERVICES, EMERGENCY_HELPLINES } from '../data/mockData';
import { api } from '../services/api';

export function LocalInformationPage() {
  const { city, t, demoCards } = useApp();
  const [locStatus, setLocStatus] = useState('idle');
  const [coords, setCoords] = useState(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(3),
          lon: pos.coords.longitude.toFixed(3),
        });
        setLocStatus('granted');
      },
      () => setLocStatus('denied')
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={MapPin}
        title={t('localInfo.title')}
        subtitle={t('localInfo.subtitle', { city })}
        badge={t('localInfo.badge')}
      />

      <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-bold text-[#171638]">
            {t('localInfo.locationTitle')}
          </div>
          <p className="text-[12px] text-[#85839A]">
            {locStatus === 'granted' && coords
              ? t('localInfo.locationGranted', { lat: coords.lat, lon: coords.lon })
              : t('localInfo.locationPrompt')}
          </p>
        </div>
        <button
          onClick={requestLocation}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] text-[12.5px] font-semibold"
        >
          <Navigation className="w-4 h-4" />
          <span>
            {locStatus === 'granted'
              ? t('localInfo.locationEnabled')
              : t('localInfo.useLocation')}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demoCards.localServices.map((svc) => (
          <div
            key={svc.name}
            className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-start justify-between gap-3"
          >
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[11px] font-semibold">
                {svc.type}
              </span>
              <h3 className="text-[15px] font-bold text-[#171638] mt-2">{svc.name}</h3>
              <p className="text-[12px] text-[#85839A] mt-1">
                {t('localInfo.hours')} {svc.hours}
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#7650E8] shrink-0">
              {svc.distance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeatherMarketPage() {
  const { city, setCity, t, demoCards } = useApp();
  const [weather, setWeather] = useState(null);
  const [market, setMarket] = useState(null);
  const [commodityFilter, setCommodityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    api.getWeather(city).then(setWeather);
  }, [city]);

  useEffect(() => {
    api.getMarketUpdates(commodityFilter, locationFilter).then(setMarket);
  }, [commodityFilter, locationFilter]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CloudSun}
        title={t('weatherMarket.title')}
        subtitle={t('weatherMarket.subtitle')}
        badge={t('weatherMarket.badge')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-gradient-to-br from-[#F7F5FF] to-[#EAE3FA] rounded-[24px] p-5 border border-[#E8DFFF] space-y-4">
          <div className="flex items-center justify-between">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-[#171638] border border-[#E8DFFF]"
            >
              <option>Vijayawada</option>
              <option>Guntur</option>
              <option>Visakhapatnam</option>
              <option>Hyderabad</option>
            </select>
            <span className="text-[11px] font-semibold text-[#7650E8] bg-white/80 px-2.5 py-1 rounded-full">
              {weather?.is_live ? 'Live • Open-Meteo' : t('common.demoForecast')}
            </span>
          </div>

          {weather && (
            <>
              <div>
                <div className="text-[40px] font-extrabold text-[#171638]">
                  {weather.current.temp}°C
                </div>
                <div className="text-[14px] font-medium text-[#5A5778]">
                  {demoCards.weatherConditions[weather.current.condition] || weather.current.condition} • {t('weatherMarket.humidity')} {weather.current.humidity} • {t('weatherMarket.wind')}{' '}
                  {weather.current.wind}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 pt-3 border-t border-[#DFD6FA]">
                {weather.forecast.map((f) => (
                  <div key={f.day} className="bg-white/70 rounded-xl p-2 text-center">
                    <div className="text-[11px] font-medium text-[#5A5778]">
                      {demoCards.weekDays[f.day] || f.day}
                    </div>
                    <div className="text-[14px] font-bold text-[#171638] mt-1">{f.temp}°</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#85839A]">{weather.demo_label}</p>
            </>
          )}
        </div>

        <div className="lg:col-span-7 bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#7650E8]" />
              <h3 className="text-[15px] font-bold text-[#171638]">
                {t('weatherMarket.mandiTitle')}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[#85839A]">
              {t('weatherMarket.mandiNote')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value)}
              placeholder="Commodity (e.g. Paddy, Chilli)..."
              className="flex-1 min-w-[150px] rounded-full bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-1.5 text-[12.5px] focus:outline-none focus:border-[#7650E8]"
            />
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Market / City..."
              className="flex-1 min-w-[140px] rounded-full bg-[#FAF9FF] border border-[#ECEAF6] px-3.5 py-1.5 text-[12.5px] focus:outline-none focus:border-[#7650E8]"
            />
          </div>

          <div className="divide-y divide-[#ECEAF6]">
            {(market?.is_live ? market.items : demoCards.mandiItems.filter((item) =>
              (!commodityFilter.trim() || item.commodity.toLowerCase().includes(commodityFilter.toLowerCase())) &&
              (!locationFilter.trim() || item.mandi.toLowerCase().includes(locationFilter.toLowerCase()))
            )).map((item) => (
              <div
                key={`${item.commodity}-${item.mandi || item.market}`}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-[#171638]">
                    {item.commodity}
                  </div>
                  <div className="text-[11.5px] text-[#85839A]">
                    {item.mandi || item.market} {item.min_price ? `• Min ${item.min_price} / Max ${item.max_price}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] font-bold text-[#171638]">
                    {item.modal_price || item.price}
                  </div>
                  <div
                    className={`text-[11.5px] font-semibold ${
                      String(item.change).startsWith('+') || item.change === 'Live' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {item.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmergencyDisasterPage() {
  const { t, demoCards } = useApp();
  const checklist = t('emergency.checklist');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={AlertTriangle}
        title={t('emergency.title')}
        subtitle={t('emergency.subtitle')}
        badge={t('emergency.badge')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoCards.helplines.map((h) => (
          <div
            key={h.name}
            className="bg-white rounded-[22px] p-5 border border-rose-100 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="text-[13.5px] font-bold text-[#171638]">{h.name}</div>
              <p className="text-[12px] text-[#85839A] mt-1">{h.desc}</p>
            </div>
            <a
              href={`tel:${h.number}`}
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[14px] transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t('emergency.call', { number: h.number })}</span>
            </a>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] space-y-2.5">
        <div className="flex items-center gap-2 text-[#171638] font-bold text-[15px]">
          <ShieldAlert className="w-5 h-5 text-[#7650E8]" />
          <span>{t('emergency.checklistTitle')}</span>
        </div>
        <ul className="list-disc pl-5 text-[13px] text-[#323052] space-y-1.5">
          {Array.isArray(checklist) && checklist.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}
