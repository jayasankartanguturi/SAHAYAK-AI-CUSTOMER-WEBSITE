import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const CATEGORIES = [
  'Customer Support',
  'Profession-Based Service',
  'Technical Assistance',
  'Government Scheme Assistance',
  'Document Assistance',
  'Expert Consultation',
  'General Assistance',
];

const STATUSES = [
  'Pending',
  'Under Review',
  'Accepted',
  'Assigned',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Rejected',
  'Closed',
];

function statusBadgeClass(status) {
  switch (status) {
    case 'Resolved':
    case 'Accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Waiting for Customer':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'In Progress':
    case 'Assigned':
    case 'Under Review':
      return 'bg-[#EDE7FF] text-[#5B35D5] border-[#D4C5FC]';
    case 'Closed':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-[#F5F2FF] text-[#6336D9] border-[#E2DCF5]';
  }
}

export default function CustomerRequestsPage() {
  const { t } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: CATEGORIES[0],
    priority: 'Normal',
    description: '',
    attachments: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCustomerRequests(
        statusFilter ? { status: statusFilter } : {}
      );
      const items = res?.items || [];
      setRequests(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].request_id);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load your requests. Make sure you are signed in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleAttachmentSelect = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    const mapped = files.map((f) => ({
      name: f.name,
      url: '',
      mimeType: f.type || 'application/octet-stream',
      sizeBytes: f.size,
    }));
    setForm((prev) => ({ ...prev, attachments: mapped }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const created = await api.createCustomerRequest(form);
      setRequests((prev) => [created, ...prev]);
      setSelectedId(created.request_id);
      setForm({
        title: '',
        category: CATEGORIES[0],
        priority: 'Normal',
        description: '',
        attachments: [],
      });
      setShowForm(false);
      setSuccessMsg(
        `Request ${created.request_id} submitted! ${
          created.sync_status === 'synced'
            ? 'Synchronized with Admin Portal.'
            : 'Saved securely and queued for Admin Portal synchronization.'
        }`
      );
    } catch (err) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;
    setReplySending(true);
    setError('');
    try {
      const updated = await api.replyCustomerRequest(selectedId, replyText.trim());
      setRequests((prev) =>
        prev.map((r) => (r.request_id === updated.request_id ? updated : r))
      );
      setReplyText('');
    } catch (err) {
      setError(err?.message || 'Unable to send reply.');
    } finally {
      setReplySending(false);
    }
  };

  const handleRetrySync = async () => {
    setRetrying(true);
    setError('');
    try {
      const res = await api.retryCustomerRequestSync();
      setSuccessMsg(`Sync retry complete: ${res.synced} synced, ${res.failed} pending.`);
      await loadRequests();
    } catch (err) {
      setError(err?.message || 'Sync retry failed.');
    } finally {
      setRetrying(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.request_id || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q)
    );
  });

  const selectedRequest =
    filtered.find((r) => r.request_id === selectedId) || filtered[0] || null;

  const hasUnsynced = requests.some((r) => r.sync_status !== 'synced');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ClipboardList}
        title={t('supportRequests.title') !== 'supportRequests.title' ? t('supportRequests.title') : 'My Requests'}
        subtitle={t('myRequests.subtitle')}
        badge={t('myRequests.badge')}
      />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 bg-white/85 border border-[#DFD8F5] rounded-full px-3.5 py-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-[#85839A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('myRequests.searchPlaceholder')}
              className="w-full bg-transparent text-[13px] focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/85 border border-[#DFD8F5] rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-[#171638] focus:outline-none cursor-pointer"
          >
            <option value="">{t('myRequests.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsynced && (
            <button
              type="button"
              onClick={handleRetrySync}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[12.5px] font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>Retry Sync</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadRequests}
            className="p-2 rounded-full bg-white/85 hover:bg-[#F3EEFF] border border-[#DFD8F5] text-[#6336D9] cursor-pointer"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] text-white text-[13px] font-semibold shadow-sm cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Close Form' : 'New Request'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-[#DFD8F5] shadow-sm space-y-4"
        >
          <h3 className="text-[16px] font-bold text-[#171638]">Submit a New Request</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-1">
              <label className="text-[12px] font-bold text-[#171638]">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#7650E8]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#171638]">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#7650E8]"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#171638]">
                Attachments <span className="font-normal text-[#85839A]">(Optional)</span>
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                onChange={handleAttachmentSelect}
                className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] px-2.5 py-2 text-[12px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#171638]">Request Title</label>
            <input
              type="text"
              required
              minLength={3}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Need help with PM-KISAN e-KYC document verification"
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-[#7650E8]"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#171638]">Description</label>
            <textarea
              rows={3}
              required
              minLength={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your request clearly so our admin team can assist you quickly..."
              className="mt-1 w-full rounded-xl bg-[#FAF9FF] border border-[#DFD8F5] px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-[#7650E8]"
            />
          </div>

          {form.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.attachments.map((a) => (
                <span
                  key={a.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3EEFF] text-[#5B35D5] text-[11.5px] font-semibold"
                >
                  <Paperclip className="w-3 h-3" />
                  {a.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-full border border-[#DFD8F5] text-[13px] font-semibold text-[#5A5778] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] text-white text-[13px] font-semibold disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Master-Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Request Cards List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="bg-white/85 rounded-[22px] p-6 border border-[#E2DCF5] text-center text-[13px] text-[#85839A]">
              Loading your requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/85 rounded-[22px] p-8 border border-[#E2DCF5] text-center">
              <ClipboardList className="w-8 h-8 mx-auto text-[#7650E8] mb-2" />
              <h3 className="text-[15px] font-bold text-[#171638]">No requests yet</h3>
              <p className="text-[12.5px] text-[#6C6A84] mt-1">
                Click <strong>New Request</strong> to submit a support, scheme, document, or expert request.
              </p>
            </div>
          ) : (
            filtered.map((req) => {
              const active = selectedRequest?.request_id === req.request_id;
              return (
                <button
                  key={req.request_id}
                  type="button"
                  onClick={() => setSelectedId(req.request_id)}
                  className={`w-full text-left rounded-[22px] p-4 border transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#F3EEFF] to-white border-[#7650E8] shadow-[0_8px_22px_rgba(118,80,232,0.12)]'
                      : 'bg-white/85 hover:bg-white border-[#E2DCF5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-[#6336D9]">
                      {req.request_id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClass(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[#171638] mt-1 line-clamp-1">
                    {req.title}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#6C6A84]">
                    <span className="px-2 py-0.5 rounded-full bg-[#F4F1FC] text-[#5B35D5] font-semibold">
                      {req.category}
                    </span>
                    <span>• {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.sync_status === 'failed' && (
                      <span className="text-amber-700 font-semibold">• Sync Pending</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Request Details + Timeline + Admin Responses */}
        <div className="lg:col-span-7">
          {selectedRequest ? (
            <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-6 border border-[#E2DCF5] shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFEBF9] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-bold text-[#6336D9]">
                      {selectedRequest.request_id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F4F1FC] text-[#5B35D5] text-[11px] font-semibold">
                      {selectedRequest.category}
                    </span>
                    <span className="text-[11px] text-[#85839A]">
                      Priority: {selectedRequest.priority}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#171638] mt-1">
                    {selectedRequest.title}
                  </h3>
                  <p className="text-[13px] text-[#4E4C6A] mt-1.5 whitespace-pre-line">
                    {selectedRequest.description}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-bold border ${statusBadgeClass(
                    selectedRequest.status
                  )}`}
                >
                  {selectedRequest.status}
                </span>
              </div>

              {selectedRequest.assigned_staff_name && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F2FF] border border-[#E2DCF5] text-[12.5px] text-[#4E2BC4] font-medium">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Assigned to: <strong>{selectedRequest.assigned_staff_name}</strong>
                  </span>
                </div>
              )}

              {/* Admin Responses & Conversation */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#85839A] mb-2.5">
                  Admin Responses & Updates
                </h4>
                {selectedRequest.responses?.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedRequest.responses.map((resp, i) => (
                      <div
                        key={resp.event_id || i}
                        className={`p-3.5 rounded-2xl border text-[13px] ${
                          resp.sender === 'admin'
                            ? 'bg-gradient-to-r from-[#F3EEFF] to-[#FAF8FF] border-[#D4C5FC]'
                            : 'bg-[#FAF9FF] border-[#ECEAF6]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#6336D9] mb-1">
                          <span>
                            {resp.sender === 'admin' ? '🛡️ ' : '👤 '}
                            {resp.author}
                          </span>
                          <span className="font-normal text-[#85839A]">
                            {new Date(resp.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#171638] whitespace-pre-line">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12.5px] text-[#85839A] italic">
                    No admin response yet. You will be notified as soon as our team reviews your request.
                  </p>
                )}

                {!['Closed', 'Rejected'].includes(selectedRequest.status) && (
                  <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Add follow-up information or reply to admin..."
                      className="flex-1 rounded-full bg-[#FAF9FF] border border-[#DFD8F5] focus:border-[#7650E8] px-4 py-2 text-[13px] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={replySending || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#5B35D5] to-[#7650E8] text-white text-[12.5px] font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#85839A] mb-2.5">
                  Status Timeline
                </h4>
                <div className="space-y-2.5 border-l-2 border-[#DFD8F5] pl-4 ml-1.5">
                  {(selectedRequest.status_history || []).map((ev, idx) => (
                    <div key={ev.event_id || idx} className="relative">
                      <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#6D44E5] ring-4 ring-[#F3EEFF]" />
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="font-bold text-[#171638]">{ev.status}</span>
                        <span className="text-[#85839A] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#5A5778] mt-0.5">{ev.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/85 rounded-[24px] p-10 border border-[#E2DCF5] text-center text-[13px] text-[#85839A]">
              Select a request on the left to view its status timeline and admin responses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
