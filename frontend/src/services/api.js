const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('sahayak_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed (${res.status})`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => request('/health'),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  googleSignIn: (payload) =>
    request('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  verify2faLogin: (code, tempToken) =>
    request('/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, temp_token: tempToken }),
    }),

  get2faStatus: () => request('/auth/2fa/status').catch(() => ({ totp_enabled: false })),

  setup2fa: () => request('/auth/2fa/setup', { method: 'POST' }),

  enable2fa: (code) =>
    request('/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }),

  disable2fa: (code) =>
    request('/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }),

  changePassword: (current_password, new_password, confirm_password) =>
    request('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password, confirm_password }),
    }),

  me: () => request('/auth/me'),

  getProfile: () => request('/profile').catch(() => null),

  saveOnboarding: (payload) =>
    request('/user/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }).catch(() => ({ logged_out: true })),

  deleteAccountData: () =>
    request('/account/data', { method: 'DELETE' }).catch(() => null),

  createConversation: (title = 'General Chat', profession = 'Farmer', language = 'English') =>
    request('/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, profession, language }),
    }).catch(() => null),

  sendConversationMessage: (convId, message, language, profession, docId = null) =>
    request(`/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, profession, doc_id: docId }),
    }),

  getConversations: () =>
    request('/conversations').catch(() => null),

  getConversationMessages: (convId) =>
    request(`/conversations/${convId}`).catch(() => null),

  renameConversation: (convId, title) =>
    request(`/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => null),

  archiveConversation: (convId, archived) =>
    request(`/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    }).catch(() => null),

  deleteConversation: (convId) =>
    request(`/conversations/${convId}`, { method: 'DELETE' }).catch(() => null),

  getSavedAnswers: () =>
    request('/saved-answers').catch(() => null),

  getDocuments: () =>
    request('/documents').catch(() => null),

  getNotifications: () =>
    request('/notifications').catch(() => null),

  getCustomerRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/customer-requests${qs ? `?${qs}` : ''}`);
  },

  createCustomerRequest: (payload) =>
    request('/customer-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  replyCustomerRequest: (requestId, message) =>
    request(`/customer-requests/${encodeURIComponent(requestId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),

  retryCustomerRequestSync: () =>
    request('/customer-requests/retry-sync', { method: 'POST' }),

  getAgricultureMarkets: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/agriculture/markets${qs ? `?${qs}` : ''}`);
  },

  getAgricultureCommodities: (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/agriculture/commodities${qs}`);
  },

  getAgriculturePrices: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/agriculture/prices${qs ? `?${qs}` : ''}`);
  },

  compareAgriculturePrices: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/agriculture/compare${qs ? `?${qs}` : ''}`);
  },

  chat: async (message, language, profession, docId = null, conversationId = null) => {
    try {
      return await request('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          language,
          profession,
          doc_id: docId,
          conversation_id: conversationId,
        }),
      });
    } catch {
      return {
        answer:
          `### Sahayak AI Guidance (${profession} • ${language})\n\n` +
          `You asked: **"${message}"**\n\n` +
          `### Key Guidance\n` +
          `1. **Relevant Context:** Based on your profile as a **${profession}**, verify official portals such as *pmkisan.gov.in*, *scholarships.gov.in*, or *pmvishwakarma.gov.in*.\n` +
          `2. **Documents to Keep Ready:** Aadhaar Card, Bank Passbook, and profession/income proof.\n` +
          `3. **Local Help:** Visit your nearest Common Service Centre (CSC) for assisted filing.\n\n` +
          `*Note: FastAPI backend is not reachable; showing offline demo fallback.*`,
        sources: [
          {
            title: 'Sahayak AI Local Demo Knowledge',
            source: 'Offline Demo Fallback',
            updated: 'Demo Mode',
          },
        ],
        mode: 'frontend-fallback',
        disclaimer:
          'AI guidance is for informational purposes only and is not a substitute for certified professional advice.',
      };
    }
  },

  voiceAssist: async (transcript, language, profession) => {
    try {
      return await request('/voice/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, language, profession }),
      });
    } catch {
      return api.chat(transcript, language, profession);
    }
  },

  analyzeImage: async (file, prompt, language, profession) => {
    const form = new FormData();
    form.append('file', file);
    form.append('prompt', prompt);
    form.append('language', language);
    form.append('profession', profession);
    try {
      return await request('/image/analyze', { method: 'POST', body: form });
    } catch {
      return {
        analysis:
          `### Image Analysis (Offline Demo Fallback)\n\n` +
          `File **${file.name}** (${Math.max(1, Math.round(file.size / 1024))} KB) selected.\n\n` +
          `1. Start the FastAPI backend and configure \`GEMINI_API_KEY\` in \`backend/.env\` for live Gemini Vision analysis.\n` +
          `2. For crop leaf photos, consult your local Krishi Vigyan Kendra (KVK) before applying treatments.`,
        mode: 'frontend-fallback',
        disclaimer: 'Visual AI analysis may contain inaccuracies; verify critical decisions with an expert.',
      };
    }
  },

  uploadDocument: async (file, language = 'English') => {
    const form = new FormData();
    form.append('file', file);
    form.append('language', language);
    try {
      return await request('/documents/upload', { method: 'POST', body: form });
    } catch {
      return {
        id: `local-${Date.now()}`,
        filename: file.name,
        pages: 1,
        size_kb: Math.max(1, Math.round(file.size / 1024)),
        chunk_count: 1,
        preview: `Uploaded locally (${file.name}). Start the FastAPI backend for PyMuPDF text extraction and RAG indexing.`,
        summary: `Offline demo summary for ${file.name}. Start the FastAPI backend for PyMuPDF extraction & Gemini summary.`,
        uploaded_at: new Date().toISOString(),
      };
    }
  },

  askDocument: async (docId, message, language, profession) => {
    try {
      return await request(`/documents/${docId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language, profession }),
      });
    } catch {
      return api.chat(message, language, profession, docId);
    }
  },

  getWeather: async (city) => {
    try {
      return await request(`/weather?city=${encodeURIComponent(city)}`);
    } catch {
      return {
        city,
        is_demo: true,
        demo_label: 'Demo Data (Connect live IMD / OpenWeather API for real-time feed)',
        current: { temp: 28, condition: 'Partly Cloudy', humidity: '64%', wind: '12 km/h' },
        forecast: [
          { day: 'Mon', temp: 27, condition: 'Partly Cloudy' },
          { day: 'Tue', temp: 29, condition: 'Sunny' },
          { day: 'Wed', temp: 30, condition: 'Warm' },
          { day: 'Thu', temp: 29, condition: 'Light Rain' },
          { day: 'Fri', temp: 28, condition: 'Partly Cloudy' },
        ],
      };
    }
  },

  getMarketUpdates: async (commodity = '', location = '') => {
    try {
      const params = new URLSearchParams();
      if (commodity) params.set('commodity', commodity);
      if (location) params.set('location', location);
      const qs = params.toString();
      return await request(`/market-updates${qs ? `?${qs}` : ''}`);
    } catch {
      return {
        is_demo: true,
        demo_label: 'Demo Mandi Reference Data • Verify on enam.gov.in',
        items: [
          { commodity: 'Paddy (Common)', mandi: 'Vijayawada', price: 'Rs. 2,300 / qtl', change: '+1.8%' },
          { commodity: 'Dry Chilli (Teja)', mandi: 'Guntur', price: 'Rs. 16,400 / qtl', change: '+2.4%' },
          { commodity: 'Cotton (Medium)', mandi: 'Adilabad', price: 'Rs. 7,120 / qtl', change: '-0.6%' },
          { commodity: 'Turmeric (Finger)', mandi: 'Duggirala', price: 'Rs. 13,800 / qtl', change: '+3.1%' },
          { commodity: 'Rohu Fish (Fresh)', mandi: 'Machilipatnam', price: 'Rs. 145 / kg', change: '+1.2%' },
        ],
      };
    }
  },

  checkEligibility: async (payload) => {
    try {
      return await request('/schemes/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      return null;
    }
  },

  saveAnswer: (payload) =>
    request('/saved-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null),

  createReminder: (payload) =>
    request('/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null),

  updateProfile: (payload) =>
    request('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null),

  updatePreferences: (payload) =>
    request('/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null),

  submitSupportRequest: async (payload) => {
    try {
      return await request('/support-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        id: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
        ...payload,
        status: 'Open (Local Demo)',
        created_at: new Date().toISOString(),
      };
    }
  },

  submitFeedback: async (payload) => {
    try {
      return await request('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      return { received: true, id: `fb-${Date.now()}`, offline: true };
    }
  },
};
