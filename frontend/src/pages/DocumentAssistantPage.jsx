import React, { useState } from 'react';
import { FileText, UploadCloud, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export default function DocumentAssistantPage() {
  const { documents, addDocument, language, selectedProfession, t } = useApp();
  const [selectedDoc, setSelectedDoc] = useState(documents[0] || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const doc = await api.uploadDocument(file, language);
    if (doc?.isError) {
      setUploadError(doc.error || 'Failed to upload document.');
    } else {
      addDocument(doc);
      setSelectedDoc(doc);
    }
    setUploading(false);
  };

  const handleAskDoc = async (e) => {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    const res = await api.askDocument(
      selectedDoc?.id,
      question.trim(),
      language,
      selectedProfession
    );
    setAnswer(res.answer);
    setAsking(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileText}
        title={t('documentAssistant.title')}
        subtitle={t('documentAssistant.subtitle')}
        badge={t('documentAssistant.badge')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <label className="block bg-white rounded-[24px] p-6 border-2 border-dashed border-[#D8D2F0] hover:border-[#7650E8] text-center cursor-pointer transition-colors">
            <input
              type="file"
              accept=".pdf,.txt,.md,.csv"
              onChange={handleUpload}
              className="hidden"
            />
            <UploadCloud className="w-9 h-9 text-[#7650E8] mx-auto mb-2" />
            <div className="text-[14px] font-bold text-[#171638]">
              {uploading ? t('documentAssistant.uploadLoading') : t('documentAssistant.uploadTitle')}
            </div>
            <div className="text-[11.5px] text-[#85839A] mt-1">
              {t('documentAssistant.uploadSubtitle')}
            </div>
          </label>

          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-[12.5px]">
              {uploadError}
            </div>
          )}

          <div className="bg-white rounded-[24px] p-5 border border-[#ECEAF6] shadow-sm space-y-2.5">
            <h3 className="text-[14px] font-bold text-[#171638]">
              {t('documentAssistant.indexedDocs')}
            </h3>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setAnswer('');
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedDoc?.id === doc.id
                    ? 'bg-[#F1EFF8] border-[#7650E8]/50'
                    : 'bg-[#FAF9FF] border-[#ECEAF6] hover:bg-[#F1EFF8]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#171638] truncate">
                    {doc.filename}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-[#7650E8] shrink-0" />
                </div>
                <div className="text-[11px] text-[#85839A] mt-0.5">
                  {doc.pages}p • {doc.size_kb} KB • {doc.chunk_count} RAG
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#ECEAF6] shadow-sm space-y-4">
          {selectedDoc ? (
            <>
              <div>
                <div className="text-[12px] font-bold text-[#85839A] uppercase">
                  {t('documentAssistant.extractedPreview')} — {selectedDoc.filename}
                </div>
                <p className="mt-2 p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#ECEAF6] text-[12.5px] text-[#323052] leading-relaxed">
                  {selectedDoc.preview}
                </p>
                {selectedDoc.summary && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#F1EFF8] border border-[#E8DFFF] text-[12.5px] text-[#171638] whitespace-pre-line leading-relaxed">
                    {selectedDoc.summary}
                  </div>
                )}
              </div>

              <form onSubmit={handleAskDoc} className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t('documentAssistant.askPlaceholder')}
                  className="flex-1 rounded-full bg-[#FAF9FF] border border-[#ECEAF6] focus:border-[#7650E8] px-4 py-2.5 text-[13px] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || asking}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{asking ? t('common.asking') : t('common.ask')}</span>
                </button>
              </form>

              {answer && (
                <div className="p-4 rounded-2xl bg-[#FAF9FF] border border-[#E8DFFF] text-[13.5px] text-[#171638] whitespace-pre-line leading-relaxed">
                  {answer.replace(/[#*]/g, '')}
                </div>
              )}
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-[#85839A]">
              <Sparkles className="w-7 h-7 text-[#7650E8] mb-2" />
              <p className="text-[13.5px] font-medium text-[#171638]">
                {t('documentAssistant.emptyText')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
