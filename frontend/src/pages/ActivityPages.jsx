import React, { useState } from 'react';
import {
  Bookmark,
  History,
  FolderOpen,
  Bell,
  Trash2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useApp } from '../context/AppContext';

export function SavedAnswersPage() {
  const { savedAnswers, deleteSavedAnswer, navigate, t } = useApp();
  const [filter, setFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const items = savedAnswers.filter(
    (s) =>
      !filter.trim() ||
      s.title.toLowerCase().includes(filter.toLowerCase()) ||
      s.content.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bookmark}
        title={t('savedAnswers.title')}
        subtitle={t('savedAnswers.subtitle')}
        badge={t('savedAnswers.badge', { count: savedAnswers.length })}
      />

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t('savedAnswers.filterPlaceholder')}
        className="w-full max-w-md rounded-full bg-white border border-[#ECEAF6] px-4 py-2 text-[13px] focus:outline-none focus:border-[#7650E8]"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={t('savedAnswers.emptyTitle')}
          description={t('savedAnswers.emptyDesc')}
          actionLabel={t('nav.ask')}
          onAction={() => navigate('ask')}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[11px] font-semibold">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-[#85839A]">{item.saved_at}</span>
                </div>
                <h3 className="text-[15px] font-bold text-[#171638] mt-2">{item.title}</h3>
                <p className="text-[13px] text-[#323052] mt-1 leading-relaxed">
                  {item.content.replace(/[#*]/g, '')}
                </p>
                <div className="text-[11px] text-[#85839A] mt-2">{item.source}</div>
              </div>
              <button
                onClick={() => setPendingDelete(item)}
                className="p-2 rounded-xl text-[#85839A] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                aria-label={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('savedAnswers.deleteTitle')}
        message={t('savedAnswers.deleteMsg', { title: pendingDelete?.title || '' })}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteSavedAnswer(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export function ConversationHistoryPage() {
  const { history, deleteHistory, askWithPrompt, navigate, t, demoCards } = useApp();
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={History}
        title={t('historyPage.title')}
        subtitle={t('historyPage.subtitle')}
      />

      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title={t('historyPage.emptyTitle')}
          description={t('historyPage.emptyDesc')}
          actionLabel={t('historyPage.startConv')}
          onAction={() => navigate('ask')}
        />
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-[11.5px] text-[#85839A]">
                  {demoCards.historyLabels[h.id]?.time || h.time} • {t(`professions.${h.profession}.name`)} • {h.language}
                </div>
                <h3 className="text-[14.5px] font-bold text-[#171638] mt-1">
                  {demoCards.historyLabels[h.id]?.question || h.question}
                </h3>
                <p className="text-[12.5px] text-[#5A5778] mt-1 line-clamp-2">{h.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => askWithPrompt(h.question)}
                  className="px-3 py-1.5 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#6336D9] text-[12px] font-semibold"
                >
                  {t('historyPage.askAgain')}
                </button>
                <button
                  onClick={() => setPendingDelete(h)}
                  className="p-2 rounded-xl text-[#85839A] hover:text-rose-600 hover:bg-rose-50"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('historyPage.deleteTitle')}
        message={t('historyPage.deleteMsg')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteHistory(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export function MyDocumentsPage() {
  const { documents, deleteDocument, navigate, t } = useApp();
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderOpen}
        title={t('myDocuments.title')}
        subtitle={t('myDocuments.subtitle')}
      />

      <div className="flex justify-end">
        <button
          onClick={() => navigate('document')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>{t('myDocuments.uploadNew')}</span>
        </button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('myDocuments.emptyTitle')}
          description={t('myDocuments.emptyDesc')}
          actionLabel={t('myDocuments.goToDoc')}
          onAction={() => navigate('document')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-[22px] p-5 border border-[#ECEAF6] shadow-xs flex items-start justify-between gap-3"
            >
              <div>
                <h3 className="text-[14.5px] font-bold text-[#171638]">{doc.filename}</h3>
                <div className="text-[11.5px] text-[#85839A] mt-0.5">
                  {doc.pages}p • {doc.size_kb} KB • {doc.uploaded_at}
                </div>
                <p className="text-[12.5px] text-[#5A5778] mt-2 line-clamp-2">{doc.preview}</p>
              </div>
              <button
                onClick={() => setPendingDelete(doc)}
                className="p-2 rounded-xl text-[#85839A] hover:text-rose-600 hover:bg-rose-50"
                aria-label={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('myDocuments.deleteTitle')}
        message={t('myDocuments.deleteMsg', { name: pendingDelete?.filename || '' })}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteDocument(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export function NotificationsRemindersPage() {
  const { notifications, markNotificationRead, addReminder, deleteNotification, t, demoCards } = useApp();
  const [title, setTitle] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addReminder(title.trim(), 'Sahayak AI');
    setTitle('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bell}
        title={t('notificationsPage.title')}
        subtitle={t('notificationsPage.subtitle')}
      />

      <form onSubmit={handleAdd} className="flex gap-2 max-w-lg">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('notificationsPage.placeholder')}
          className="flex-1 rounded-full bg-white border border-[#ECEAF6] px-4 py-2 text-[13px] focus:outline-none focus:border-[#7650E8]"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-[#7650E8] text-white text-[12.5px] font-semibold"
        >
          {t('common.addReminder')}
        </button>
      </form>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('notificationsPage.emptyTitle')}
          description={t('notificationsPage.emptyDesc')}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-[22px] p-4 border flex items-start justify-between gap-3 ${
                n.read ? 'bg-white border-[#ECEAF6]' : 'bg-[#F1EFF8] border-[#7650E8]/30'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#171638]">
                    {demoCards.notificationLabels[n.id]?.title || n.title}
                  </span>
                  <span className="text-[11px] text-[#85839A]">
                    {demoCards.notificationLabels[n.id]?.time || n.time}
                  </span>
                </div>
                <p className="text-[12.5px] text-[#5A5778] mt-1">
                  {demoCards.notificationLabels[n.id]?.detail || n.detail}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.read && (
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-[#6336D9] text-[11.5px] font-semibold border border-[#E8DFFF]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('common.markRead')}</span>
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-1.5 rounded-xl text-[#85839A] hover:text-rose-600 hover:bg-rose-50"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
