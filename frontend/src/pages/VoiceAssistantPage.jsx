import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, ShieldCheck, Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { api } from '../services/api';

export default function VoiceAssistantPage() {
  const { language, selectedProfession, addHistory, t } = useApp();
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const { listening, permission, error: micError, start, stop } = useSpeechRecognition({
    language,
    onTranscript: (text) => setTranscript(text),
    onUnsupported: () => setTranscript(t('voice.samples')[0]),
  });

  const askVoiceQuery = async (text) => {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    const res = await api.voiceAssist(q, language, selectedProfession);
    setAnswer(res.answer);
    addHistory(`Voice: ${q}`, res.answer.slice(0, 140));
    setLoading(false);
  };

  const speakAnswer = () => {
    if (!answer || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(answer.replace(/[#*]/g, ''));
    utter.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : 'en-IN';
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const samples = t('voice.samples');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Mic}
        title={t('voice.title')}
        subtitle={t('voice.subtitle', { language })}
        badge={t('voice.badge')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1EFF8] text-[11.5px] font-medium text-[#6336D9] mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('voice.micNotice')}</span>
          </div>

          <button
            onClick={listening ? stop : start}
            className={`w-28 h-28 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
              listening
                ? 'bg-rose-500 animate-pulse scale-105'
                : 'bg-gradient-to-br from-[#7650E8] to-[#6336D9] hover:scale-105'
            }`}
            aria-label={listening ? t('voice.listening') : t('voice.tapToSpeak')}
          >
            {listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
          </button>

          <p className="mt-4 text-[14px] font-bold text-[#171638]">
            {listening ? t('voice.listening') : t('voice.tapToSpeak')}
          </p>
          {(micError || permission === 'denied') && (
            <p className="mt-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[12px] text-rose-700">
              {micError || t('voice.micDenied')}
            </p>
          )}

          <div className="w-full mt-5 space-y-2 text-left">
            <div className="text-[11.5px] font-semibold text-[#85839A] uppercase">
              {t('voice.sampleQueries')}
            </div>
            {Array.isArray(samples) &&
              samples.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setTranscript(s);
                    askVoiceQuery(s);
                  }}
                  className="w-full text-left px-3.5 py-2 rounded-xl bg-[#FAF9FF] hover:bg-[#E8DFFF] text-[12.5px] font-medium text-[#171638] border border-[#ECEAF6] transition-colors"
                >
                  "{s}"
                </button>
              ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <label className="text-[12px] font-bold text-[#85839A] uppercase">
              {t('voice.transcriptLabel')}
            </label>
            <div className="mt-2 flex gap-2">
              <textarea
                rows={3}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t('voice.transcriptPlaceholder')}
                className="flex-1 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] p-3 text-[13.5px] text-[#171638] focus:outline-none focus:border-[#7650E8]"
              />
            </div>
            <button
              onClick={() => askVoiceQuery(transcript)}
              disabled={!transcript.trim() || loading}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? t('common.processing') : t('voice.askButton')}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#ECEAF6]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-[#85839A] uppercase">
                {t('voice.responseLabel')}
              </span>
              {answer && (
                <button
                  onClick={speakAnswer}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[12px] font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{speaking ? t('voice.speaking') : t('voice.readAloud')}</span>
                </button>
              )}
            </div>
            {answer ? (
              <div className="p-4 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] text-[13.5px] text-[#171638] whitespace-pre-line leading-relaxed">
                {answer.replace(/[#*]/g, '')}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FAF9FF] border border-dashed border-[#D8D2F0] text-center text-[13px] text-[#85839A]">
                <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-[#7650E8]" />
                {t('voice.emptyResponse')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
