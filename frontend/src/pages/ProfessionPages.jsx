import React from 'react';
import { Briefcase, LayoutGrid, CheckCircle2, ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { PROFESSIONS } from '../data/mockData';

export function MyProfessionPage() {
  const { selectedProfession, setSelectedProfession, navigate, t } = useApp();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Briefcase}
        title={t('myProfession.title')}
        subtitle={t('myProfession.subtitle')}
        badge={t('myProfession.current', { prof: t(`professions.${selectedProfession}.name`) })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROFESSIONS.map((prof) => {
          const isSelected = selectedProfession === prof.id;
          const profName = t(`professions.${prof.id}.name`);
          return (
            <div
              key={prof.id}
              onClick={() => setSelectedProfession(prof.id)}
              className={`cursor-pointer rounded-[24px] overflow-hidden border transition-all bg-white ${
                isSelected
                  ? 'border-[#7650E8] ring-2 ring-[#7650E8]/25 shadow-md'
                  : 'border-[#ECEAF6] hover:border-[#7650E8]/40 shadow-xs'
              }`}
            >
              <div className="h-36 w-full overflow-hidden relative">
                <img
                  src={prof.image}
                  alt={profName}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7650E8] text-white text-[11px] font-bold shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('myProfession.selected')}</span>
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="text-[15.5px] font-bold text-[#171638]">{profName}</div>
                <div className="text-[12px] font-semibold text-[#7650E8]">
                  {t(`professions.${prof.id}.sub`)}
                </div>
                <p className="text-[12.5px] text-[#85839A] mt-1.5 leading-relaxed">
                  {t(`professions.${prof.id}.desc`)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfession(prof.id);
                    navigate('profession-services');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6336D9] hover:underline"
                >
                  <span>{t('myProfession.openServices', { prof: profName })}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProfessionServicesPage() {
  const { selectedProfession, setSelectedProfession, navigate, askWithPrompt, t, demoCards } = useApp();
  const currentProf =
    PROFESSIONS.find((p) => p.id === selectedProfession) || PROFESSIONS[0];
  const currentName = t(`professions.${currentProf.id}.name`);
  const tools = demoCards.professionTools[currentProf.id] || currentProf.tools;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutGrid}
        title={t('profServices.title')}
        subtitle={t('profServices.subtitle', { prof: currentName })}
        badge={currentName}
      />

      <div className="flex flex-wrap gap-2">
        {PROFESSIONS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProfession(p.id)}
            className={`px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all ${
              selectedProfession === p.id
                ? 'bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white shadow-sm'
                : 'bg-white border border-[#ECEAF6] text-[#323052] hover:bg-[#F1EFF8]'
            }`}
          >
            {t(`professions.${p.id}.name`)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <img
          src={currentProf.image}
          alt={currentName}
          className="w-full sm:w-48 h-32 rounded-2xl object-cover shrink-0"
        />
        <div className="flex-1">
          <h2 className="text-[18px] font-bold text-[#171638]">
            {currentName} — {t(`professions.${currentProf.id}.sub`)}
          </h2>
          <p className="text-[13.5px] text-[#5A5778] mt-1">
            {t(`professions.${currentProf.id}.desc`)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.title}
            className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-center justify-between gap-4 hover:border-[#7650E8]/40 transition-all"
          >
            <div>
              <h3 className="text-[15px] font-bold text-[#171638]">{tool.title}</h3>
              <p className="text-[12.5px] text-[#85839A] mt-1">{tool.desc}</p>
            </div>
            <button
              onClick={() =>
                tool.prompt ? askWithPrompt(tool.prompt) : navigate(tool.target)
              }
              className="px-4 py-2 rounded-full bg-[#F1EFF8] hover:bg-[#7650E8] text-[#6336D9] hover:text-white text-[12.5px] font-semibold transition-colors shrink-0 flex items-center gap-1"
            >
              <span>{t('common.open')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
