import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareText,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  Copy,
  Check,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  AlertCircle,
  Plus,
  Search,
  Pencil,
  Trash2,
  PanelLeft,
  MessageSquare,
  X,
  RotateCcw,
  Archive,
  ArchiveRestore,
  Volume2,
  Building2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { api } from '../services/api';

const PROFESSION_SUGGESTIONS = {
  Farmer: [
    'Explain PM Kisan Scheme eligibility and documents',
    'How to manage paddy leaf spots safely?',
    'What is PMFBY crop insurance premium?',
    'Emergency Kisan Call Centre helpline',
  ],
  Fisherman: [
    'How can fishermen apply for PM Matsya Sampada Yojana?',
    'Marine safety rules before going to sea',
    'Disaster helpline numbers for cyclones',
  ],
  Student: [
    'What documents are needed for National Scholarship Portal?',
    'How to check Post-Matric scholarship eligibility?',
    'Free online learning resources on SWAYAM',
  ],
  Artisan: [
    'Explain PM Vishwakarma scheme benefits for artisans',
    'How do traditional artisans get the Rs. 15,000 toolkit?',
    'How to apply for Mudra micro-credit?',
  ],
  'Business Owner': [
    'How do small business owners apply for PM Mudra Yojana?',
    'Explain Shishu, Kishor, and Tarun Mudra loans',
    'How to register for MSME Udyam?',
  ],
  'Street Vendor': [
    'How does PM SVANidhi working capital loan work?',
    'Digital UPI cashback incentives for street vendors',
  ],
  'General Citizen': [
    'How to apply for citizen certificates at CSC?',
    'Emergency and disaster helpline numbers in India',
    'How to check government scheme eligibility?',
  ],
};

function buildClientTitle(text) {
  const cleaned = text.trim();
  if (/^(hi+|hello+|hey+|namaste|namaskaram|good\s*(morning|afternoon|evening)|how\s*are\s*you|what\s*are\s*you\s*doing|thanks?|thank\s*you|నమస్కారం|హలో|नमस्ते)[!?. ]*$/i.test(cleaned)) {
    return 'General Chat';
  }
  const stripped = cleaned
    .replace(/^(please\s+)?(explain|tell\s+me\s+about|what\s+is|what\s+are|how\s+do\s+i|how\s+to|give\s+me|check)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
  if (!stripped) return 'General Chat';
  const short = stripped.split(/\s+/).slice(0, 6).join(' ');
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function FormattedAnswer({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed text-[#171638]">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="text-[14.5px] font-bold text-[#6336D9] pt-1.5">
              {line.replace('### ', '')}
            </h4>
          );
        }
        if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
          return (
            <p key={i} className="text-[11.5px] italic text-[#85839A] pt-1">
              {line.slice(1, -1)}
            </p>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={i} className="pl-2 flex gap-2">
              <span className="font-semibold text-[#7650E8]">{line.match(/^\d+\./)[0]}</span>
              <span>{line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '')}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

export default function AskSahayakPage() {
  const {
    user,
    language,
    selectedProfession,
    pendingPrompt,
    setPendingPrompt,
    saveAnswer,
    addHistory,
    deleteHistory,
    navigate,
    accessibility,
    t,
  } = useApp();

  const localizedProf = t(`professions.${selectedProfession}.name`);
  const userEmail = (user.email || 'guest').trim().toLowerCase();
  const threadsKey = `sahayak_user_${userEmail}_threads`;
  const activeThreadKey = `sahayak_user_${userEmail}_active_thread`;

  const makeWelcomeMessage = () => ({
    id: 'welcome-msg',
    role: 'assistant',
    rag_used: false,
    text: t('ask.welcome', { profession: localizedProf, language }),
    sources: [],
  });

  const [threads, setThreads] = useState(() => {
    try {
      const raw = localStorage.getItem(threadsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [activeThreadId, setActiveThreadId] = useState(() => {
    try {
      return localStorage.getItem(activeThreadKey) || null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState(() => {
    try {
      const savedActiveId = localStorage.getItem(activeThreadKey);
      const raw = localStorage.getItem(threadsKey);
      if (savedActiveId && raw) {
        const parsed = JSON.parse(raw);
        const found = Array.isArray(parsed) ? parsed.find((th) => th.id === savedActiveId) : null;
        if (found?.messages?.length) return found.messages;
      }
    } catch {
      // ignore storage errors
    }
    return [makeWelcomeMessage()];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [historyOpenMobile, setHistoryOpenMobile] = useState(false);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { listening: micListening, start: toggleChatMic } = useSpeechRecognition({
    language,
    onTranscript: (text) => setInput(text),
    onError: (msg) => setErrorMsg(msg),
  });
  const [copiedId, setCopiedId] = useState(null);
  const [savedIds, setSavedIds] = useState({});
  const [feedbackMap, setFeedbackMap] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(threadsKey, JSON.stringify(threads));
    } catch {
      // ignore storage errors
    }
  }, [threads, threadsKey]);

  useEffect(() => {
    try {
      if (activeThreadId) {
        localStorage.setItem(activeThreadKey, activeThreadId);
      } else {
        localStorage.removeItem(activeThreadKey);
      }
    } catch {
      // ignore storage errors
    }
  }, [activeThreadId, activeThreadKey]);

  // Restore active thread messages from MongoDB on refresh if not cached locally
  useEffect(() => {
    if (!activeThreadId) return;
    const cached = threads.find((th) => th.id === activeThreadId);
    if (cached?.messages?.length) return;
    api.getConversationMessages(activeThreadId).then((res) => {
      if (res?.messages?.length) {
        const mapped = res.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          sources: m.sources || [],
          rag_used: m.rag_used ?? (m.sources?.length > 0),
        }));
        setMessages(mapped);
      }
    });
  }, [activeThreadId]);

  useEffect(() => {
    let active = true;
    api.getConversations().then((res) => {
      if (!active || !res?.items) return;
      setThreads((prev) => {
        const byId = new Map(prev.map((th) => [th.id, th]));
        for (const item of res.items) {
          const existing = byId.get(item.id);
          byId.set(item.id, {
            id: item.id,
            title: item.title || existing?.title || 'General Chat',
            archived: Boolean(item.archived ?? existing?.archived ?? false),
            updated_at: item.updated_at || item.created_at || existing?.updated_at,
            messages: existing?.messages || null,
          });
        }
        return Array.from(byId.values()).sort((a, b) =>
          String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
        );
      });
    });
    return () => {
      active = false;
    };
  }, [userEmail]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === 'welcome-msg'
            ? { ...m, text: t('ask.welcome', { profession: localizedProf, language }) }
            : m
        )
      );
    }
  }, [language, selectedProfession, activeThreadId]);

  const startNewChat = () => {
    setActiveThreadId(null);
    setMessages([makeWelcomeMessage()]);
    setErrorMsg('');
    setHistoryOpenMobile(false);
  };

  const selectThread = async (thread) => {
    setActiveThreadId(thread.id);
    setErrorMsg('');
    setHistoryOpenMobile(false);
    if (Array.isArray(thread.messages) && thread.messages.length > 0) {
      setMessages(thread.messages);
      return;
    }
    const res = await api.getConversationMessages(thread.id);
    if (res?.messages?.length) {
      const mapped = res.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.content,
        sources: m.sources || [],
        b2b_referrals: m.b2b_referrals || [],
        rag_used: m.rag_used ?? (m.sources?.length > 0),
      }));
      setMessages(mapped);
      setThreads((prev) =>
        prev.map((th) => (th.id === thread.id ? { ...th, messages: mapped } : th))
      );
    } else {
      setMessages([makeWelcomeMessage()]);
    }
  };

  const handleRenameSubmit = async (convId) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    setThreads((prev) =>
      prev.map((th) => (th.id === convId ? { ...th, title: trimmed } : th))
    );
    setRenamingId(null);
    await api.renameConversation(convId, trimmed);
  };

  const handleArchiveToggle = async (convId, nextArchived) => {
    setThreads((prev) =>
      prev.map((th) => (th.id === convId ? { ...th, archived: nextArchived } : th))
    );
    if (activeThreadId === convId && nextArchived) {
      startNewChat();
    }
    await api.archiveConversation(convId, nextArchived);
  };

  const handleDeleteThread = async (convId) => {
    setThreads((prev) => prev.filter((th) => th.id !== convId));
    deleteHistory(convId);
    if (activeThreadId === convId) {
      startNewChat();
    }
    await api.deleteConversation(convId);
  };

  const sendMessage = async (textToSend, { isRegenerate = false, baseMessages = null } = {}) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setErrorMsg('');
    const currentMsgs = baseMessages || messages.filter((m) => m.id !== 'welcome-msg');
    const nextWithUser = isRegenerate
      ? currentMsgs
      : [...currentMsgs, { id: `u-${Date.now()}`, role: 'user', text: trimmed }];

    setMessages(nextWithUser);
    if (!isRegenerate) setInput('');
    setLoading(true);

    try {
      let res;
      if (activeThreadId && !String(activeThreadId).startsWith('local-')) {
        try {
          res = await api.sendConversationMessage(
            activeThreadId,
            trimmed,
            language,
            selectedProfession
          );
        } catch {
          res = await api.chat(trimmed, language, selectedProfession, null, activeThreadId);
        }
      } else {
        res = await api.chat(trimmed, language, selectedProfession, null, activeThreadId);
      }
      const convId = res.conversation_id || activeThreadId || `local-${Date.now()}`;
      setActiveThreadId(convId);

      const resolvedTitle = res.conversation_title || buildClientTitle(trimmed);

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.answer,
        sources: res.sources || [],
        b2b_referrals: res.b2b_referrals || [],
        rag_used: res.rag_used ?? (res.sources?.length > 0),
        disclaimer: res.disclaimer,
        mode: res.mode,
      };

      const fullThreadMessages = [...nextWithUser, aiMsg];
      setMessages(fullThreadMessages);

      setThreads((prev) => {
        const existing = prev.find((th) => th.id === convId);
        const nowIso = new Date().toISOString();
        if (existing) {
          const updated = {
            ...existing,
            title:
              existing.title === 'General Chat' && resolvedTitle !== 'General Chat'
                ? resolvedTitle
                : existing.title,
            updated_at: nowIso,
            messages: fullThreadMessages,
          };
          return [updated, ...prev.filter((th) => th.id !== convId)];
        }
        const created = {
          id: convId,
          title: resolvedTitle,
          archived: false,
          updated_at: nowIso,
          messages: fullThreadMessages,
        };
        return [created, ...prev];
      });

      if (!isRegenerate) {
        addHistory(resolvedTitle, res.answer.slice(0, 140), convId);
      }

      if (accessibility.voiceAutoRead && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(res.answer.replace(/[#*]/g, ''));
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to reach Sahayak AI right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = (aiIndex) => {
    // Find the nearest preceding user message
    let lastUserText = '';
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserText = messages[i].text;
        break;
      }
    }
    if (!lastUserText) return;
    const trimmedMessages = messages.slice(0, aiIndex);
    sendMessage(lastUserText, { isRegenerate: true, baseMessages: trimmedMessages });
  };

  useEffect(() => {
    if (pendingPrompt) {
      const q = pendingPrompt;
      setPendingPrompt('');
      startNewChat();
      sendMessage(q);
    }
  }, [pendingPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSave = (msg) => {
    saveAnswer(
      msg.text.split('\n')[0].replace(/#/g, '').trim() || t('common.saveAnswer'),
      msg.text,
      localizedProf,
      msg.sources?.[0]?.source || t('brand.name')
    );
    setSavedIds((prev) => ({ ...prev, [msg.id]: true }));
  };

  const handleListen = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[#*]/g, ''));
    utter.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : 'en-IN';
    window.speechSynthesis.speak(utter);
  };

  const professionSuggestions =
    PROFESSION_SUGGESTIONS[selectedProfession] || t('ask.suggestions');

  const filteredThreads = threads.filter((th) => {
    const matchesArchive = showArchived ? Boolean(th.archived) : !th.archived;
    const matchesSearch =
      !searchQuery.trim() ||
      (th.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArchive && matchesSearch;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-md md:rounded-[26px] border border-[#E2DCF5] shadow-[0_14px_38px_rgba(99,54,217,0.08)] w-64 sm:w-72 overflow-hidden">
      <div className="p-3.5 space-y-2.5 border-b border-[#EAE5F8]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={startNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#5B35D5] via-[#7650E8] to-[#9B7BF7] text-white text-[13px] font-semibold shadow-[0_8px_20px_rgba(118,80,232,0.32)] hover:shadow-[0_10px_24px_rgba(118,80,232,0.42)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('ask.newChat')}</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpenMobile(false)}
            className="md:hidden p-2 rounded-xl text-[#85839A] hover:bg-[#F1EFF8]"
            aria-label="Close chat history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#ECEAF6] focus-within:border-[#7650E8] rounded-full px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-[#85839A] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ask.searchChats')}
            className="w-full bg-transparent text-[12px] text-[#171638] placeholder:text-[#85839A] focus:outline-none"
          />
        </div>
      </div>

      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#85839A]">
          {showArchived ? t('ask.archived') : t('ask.recentChats')}
        </span>
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="text-[11px] font-semibold text-[#7650E8] hover:underline"
        >
          {showArchived ? t('ask.active') : t('ask.archived')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {filteredThreads.length === 0 ? (
          <div className="text-center text-[12px] text-[#85839A] py-8 px-3">
            {t('ask.noChats')}
          </div>
        ) : (
          filteredThreads.map((th) => {
            const isActive = activeThreadId === th.id;
            const isRenaming = renamingId === th.id;
            return (
              <div
                key={th.id}
                className={`group flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-[#DFD4FF] to-[#EDE7FF] text-[#4E2BC4] border border-[#C6B3FC] font-semibold'
                    : 'hover:bg-[#F4F0FF] text-[#323052]'
                }`}
              >
                {isRenaming ? (
                  <input
                    type="text"
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => handleRenameSubmit(th.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(th.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="flex-1 bg-white border border-[#7650E8] rounded-lg px-2 py-1 text-[12px] text-[#171638] focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => selectThread(th)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="text-[12.5px] font-medium truncate">
                      {th.title}
                    </span>
                  </button>
                )}

                {!isRenaming && (
                  <div className="flex items-center gap-0.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(th.id);
                        setRenameText(th.title || '');
                      }}
                      title={t('ask.rename')}
                      aria-label={t('ask.rename')}
                      className="p-1 rounded-lg hover:bg-white/80 text-[#5A5778] hover:text-[#6336D9]"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveToggle(th.id, !th.archived);
                      }}
                      title={th.archived ? t('ask.unarchive') : t('ask.archive')}
                      aria-label={th.archived ? t('ask.unarchive') : t('ask.archive')}
                      className="p-1 rounded-lg hover:bg-white/80 text-[#5A5778] hover:text-[#6336D9]"
                    >
                      {th.archived ? (
                        <ArchiveRestore className="w-3 h-3" />
                      ) : (
                        <Archive className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(th.id);
                      }}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      className="p-1 rounded-lg hover:bg-rose-50 text-[#5A5778] hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] sm:h-[calc(100vh-140px)] max-h-[820px]">
      <PageHeader
        icon={MessageSquareText}
        title={t('ask.title')}
        subtitle={t('ask.subtitle', { profession: localizedProf, language })}
        badge={t('ask.badge')}
      />

      <div className="flex-1 flex gap-4 overflow-hidden relative min-h-0">
        <div className="hidden md:block shrink-0 h-full">{sidebarContent}</div>

        {historyOpenMobile && (
          <div className="absolute inset-0 z-30 md:hidden flex">
            <div
              className="fixed inset-0 bg-[#171638]/30"
              onClick={() => setHistoryOpenMobile(false)}
            />
            <div className="relative z-10 h-full shadow-xl">{sidebarContent}</div>
          </div>
        )}

        <div className="flex-1 bg-white/85 backdrop-blur-md rounded-[26px] border border-[#E2DCF5] shadow-[0_14px_38px_rgba(99,54,217,0.08)] flex flex-col min-w-0 overflow-hidden">
          <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[#ECEAF6] bg-[#FAF9FF]">
            <button
              type="button"
              onClick={() => setHistoryOpenMobile(true)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6336D9]"
            >
              <PanelLeft className="w-4 h-4" />
              <span>{t('ask.recentChats')} ({filteredThreads.length})</span>
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[12px] font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ask.newChat')}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {errorMsg && (
              <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg('')} />
            )}

            {messages.map((msg, msgIdx) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#5B35D5] to-[#7650E8] text-white rounded-br-sm shadow-[0_6px_18px_rgba(118,80,232,0.24)]'
                      : 'bg-white border border-[#C9BAFA] rounded-bl-sm shadow-[0_4px_16px_rgba(99,54,217,0.06)]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-[13.5px] leading-relaxed">{msg.text}</p>
                  ) : (
                    <div>
                      <FormattedAnswer text={msg.text} />

                      {msg.b2b_referrals?.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-[#FAF8FF] border border-[#D8CCF9]">
                          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#5B35D5] mb-2">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>B2B & Partner Referrals ({localizedProf})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.b2b_referrals.map((ref) => (
                              <a
                                key={ref.name}
                                href={ref.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-[#DDD2FF] via-[#EFEAFF] to-[#D4C4FF] hover:from-[#D2C3FF] hover:to-[#C8B4FF] border border-[#C2AFFB] shadow-2xs transition-all"
                              >
                                <div className="min-w-0">
                                  <div className="text-[12px] font-bold text-[#171638] truncate">
                                    {ref.name}
                                  </div>
                                  <div className="text-[11px] text-[#454166] line-clamp-1">
                                    {ref.desc}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-[#5B35D5] shrink-0 mt-0.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.rag_used !== false && msg.sources?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#E8DFFF] flex flex-wrap gap-1.5">
                          {msg.sources.map((s, idx) =>
                            s.url ? (
                              <a
                                key={idx}
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#F1EFF8] border border-[#E8DFFF] text-[11px] font-medium text-[#6336D9]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>{s.source}{s.last_updated ? ` • ${s.last_updated}` : ''}</span>
                              </a>
                            ) : (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E8DFFF] text-[11px] font-medium text-[#6336D9]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>{s.source}</span>
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {msg.rag_used !== false && msg.disclaimer && (
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#85839A]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#7650E8]" />
                          <span>{msg.disclaimer}</span>
                        </div>
                      )}

                      {msg.id !== 'welcome-msg' && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1EFF8] border border-[#ECEAF6] text-[11px] font-medium text-[#323052]"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{t('common.copied')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{t('common.copy')}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSave(msg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1EFF8] border border-[#ECEAF6] text-[11px] font-medium text-[#323052]"
                          >
                            <Bookmark
                              className={`w-3 h-3 ${
                                savedIds[msg.id] ? 'fill-[#7650E8] text-[#7650E8]' : ''
                              }`}
                            />
                            <span>{savedIds[msg.id] ? t('common.saved') : t('common.saveAnswer')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleListen(msg.text)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1EFF8] border border-[#ECEAF6] text-[11px] font-medium text-[#323052]"
                          >
                            <Volume2 className="w-3 h-3 text-[#7650E8]" />
                            <span>{t('voice.readAloud')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRegenerate(msgIdx)}
                            disabled={loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1EFF8] border border-[#ECEAF6] text-[11px] font-medium text-[#323052] disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{t('ask.regenerate')}</span>
                          </button>

                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => setFeedbackMap((p) => ({ ...p, [msg.id]: 'up' }))}
                              className={`p-1.5 rounded-lg border ${
                                feedbackMap[msg.id] === 'up'
                                  ? 'bg-[#E8DFFF] border-[#7650E8] text-[#6336D9]'
                                  : 'bg-white border-[#ECEAF6] text-[#85839A]'
                              }`}
                              aria-label="Helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackMap((p) => ({ ...p, [msg.id]: 'down' }))}
                              className={`p-1.5 rounded-lg border ${
                                feedbackMap[msg.id] === 'down'
                                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                                  : 'bg-white border-[#ECEAF6] text-[#85839A]'
                              }`}
                              aria-label="Not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#FAF9FF] border border-[#ECEAF6] rounded-2xl px-4 py-3 flex items-center gap-2.5 text-[13px] text-[#7650E8]">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7650E8] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7650E8] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7650E8] animate-bounce" />
                  </span>
                  <span>{t('ask.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#FAF9FF] border-t border-[#ECEAF6] flex items-center gap-1.5 overflow-x-auto sm:flex-wrap">
            {Array.isArray(professionSuggestions) &&
              professionSuggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="shrink-0 px-2.5 sm:px-3 py-1 rounded-full bg-white hover:bg-[#E8DFFF] border border-[#E8DFFF] text-[10.5px] sm:text-[11.5px] font-medium text-[#6336D9] transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-2 sm:p-4 bg-white border-t border-[#ECEAF6] flex items-center gap-1.5 sm:gap-2"
          >
            <button
              type="button"
              onClick={toggleChatMic}
              title={micListening ? t('voice.listening') : t('voice.tapToSpeak')}
              aria-label={micListening ? t('voice.listening') : t('voice.tapToSpeak')}
              className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 transition-colors cursor-pointer ${
                micListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-sm'
                  : 'bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9]'
              }`}
            >
              {micListening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('image')}
              title={t('nav.image')}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('document')}
              title={t('nav.document')}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ask.placeholder', { language })}
              className="flex-1 min-w-0 bg-[#FAF9FF] border border-[#ECEAF6] focus:border-[#7650E8] rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[12.5px] sm:text-[13.5px] text-[#171638] focus:outline-none"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full shrink-0 bg-gradient-to-r from-[#5B35D5] to-[#7650E8] text-white text-[12px] sm:text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-[0_6px_18px_rgba(118,80,232,0.28)] hover:shadow-[0_8px_22px_rgba(118,80,232,0.38)] transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">{t('common.send')}</span>
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
