import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, UploadCloud, Sparkles, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function ImageAssistantPage() {
  const { language, selectedProfession, addHistory, t } = useApp();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [prompt, setPrompt] = useState(t('imageAssistant.defaultPrompt'));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPrompt(t('imageAssistant.defaultPrompt'));
  }, [language]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    const res = await api.analyzeImage(file, prompt, language, selectedProfession);
    setResult(res);
    addHistory(`Image: ${file.name}`, res.analysis.slice(0, 140));
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ImageIcon}
        title={t('imageAssistant.title')}
        subtitle={t('imageAssistant.subtitle')}
        badge={t('imageAssistant.badge')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleAnalyze}
          className="lg:col-span-5 bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm space-y-4"
        >
          <label className="block border-2 border-dashed border-[#D8D2F0] hover:border-[#7650E8] rounded-2xl p-6 text-center cursor-pointer bg-[#FAF9FF] transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {preview ? (
              <img
                src={preview}
                alt="Uploaded preview"
                className="max-h-56 mx-auto rounded-xl object-contain"
              />
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 text-[#7650E8] mx-auto" />
                <div className="text-[13.5px] font-bold text-[#171638]">
                  {t('imageAssistant.uploadTitle')}
                </div>
                <div className="text-[11.5px] text-[#85839A]">
                  {t('imageAssistant.uploadSubtitle')}
                </div>
              </div>
            )}
          </label>

          <div>
            <label className="text-[12px] font-bold text-[#171638]">
              {t('imageAssistant.promptLabel')}
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1.5 w-full rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] p-3 text-[13px] focus:outline-none focus:border-[#7650E8]"
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13.5px] font-semibold disabled:opacity-50 shadow-sm"
          >
            {loading ? t('imageAssistant.analyzingButton') : t('imageAssistant.analyzeButton')}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm">
          <h3 className="text-[15px] font-bold text-[#171638] mb-3">
            {t('imageAssistant.resultsTitle')}
          </h3>
          {result ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] text-[13.5px] text-[#171638] whitespace-pre-line leading-relaxed">
                {result.analysis.replace(/[#*]/g, '')}
              </div>
              <div className="flex items-start gap-2 text-[11.5px] text-[#85839A] bg-[#F1EFF8] p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 text-[#7650E8] shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>
            </div>
          ) : (
            <div className="h-64 rounded-2xl bg-[#FAF9FF] border border-dashed border-[#D8D2F0] flex flex-col items-center justify-center text-center p-6 text-[#85839A]">
              <Sparkles className="w-7 h-7 text-[#7650E8] mb-2" />
              <p className="text-[13.5px] font-medium text-[#171638]">
                {t('imageAssistant.emptyTitle')}
              </p>
              <p className="text-[12px] mt-1">{t('imageAssistant.emptyDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
