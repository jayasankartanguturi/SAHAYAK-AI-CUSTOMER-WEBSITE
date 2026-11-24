import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { getNavItemById, getNavItemByPath } from '../data/navItems';
import { createTranslator } from '../locales/i18n';
import { getDemoCards } from '../locales/demoCards';
import { api } from '../services/api';
import { loadUserList, saveUserList } from '../utils/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const routerNavigate = useNavigate();
  const { pathname } = useLocation();
  const activePage = getNavItemByPath(pathname).id;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginSuccessVisible, setLoginSuccessVisible] = useState(false);
  const loginSuccessGuardRef = useRef(false);
  const loginSuccessTimerRef = useRef(null);
  const loginSuccessResetTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (loginSuccessTimerRef.current) clearTimeout(loginSuccessTimerRef.current);
      if (loginSuccessResetTimerRef.current) clearTimeout(loginSuccessResetTimerRef.current);
    };
  }, []);

  const triggerLoginSuccess = () => {
    if (loginSuccessGuardRef.current) return;
    loginSuccessGuardRef.current = true;
    setLoginSuccessVisible(true);

    if (loginSuccessTimerRef.current) clearTimeout(loginSuccessTimerRef.current);
    if (loginSuccessResetTimerRef.current) clearTimeout(loginSuccessResetTimerRef.current);

    loginSuccessTimerRef.current = setTimeout(() => {
      setLoginSuccessVisible(false);
      routerNavigate('/');
      loginSuccessResetTimerRef.current = setTimeout(() => {
        loginSuccessGuardRef.current = false;
      }, 350);
    }, 1750);
  };

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return {
      name: 'Citizen',
      email: '',
      location: 'Vijayawada, Andhra Pradesh',
      phone: '+91 98765 43210',
      isAuthenticated: false,
    };
  });

  const [selectedProfession, setSelectedProfession] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.profession) return parsed.profession;
      }
    } catch {
      // ignore
    }
    return 'Farmer';
  });
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('sahayak_language') || 'English';
    } catch {
      return 'English';
    }
  });
  const setLanguage = (nextLang) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem('sahayak_language', nextLang);
    } catch {
      // ignore storage errors
    }
  };
  const [city, setCity] = useState('Vijayawada');
  const [pendingPrompt, setPendingPrompt] = useState('');

  // User-scoped state (isolated per email address!)
  const [savedAnswers, setSavedAnswers] = useState(() =>
    user.isAuthenticated ? loadUserList(user.email, 'saved', []) : []
  );
  const [history, setHistory] = useState(() =>
    user.isAuthenticated ? loadUserList(user.email, 'history', []) : []
  );
  const [documents, setDocuments] = useState(() =>
    user.isAuthenticated ? loadUserList(user.email, 'documents', []) : []
  );
  const [notifications, setNotifications] = useState(() =>
    user.isAuthenticated
      ? loadUserList(user.email, 'notifications', INITIAL_NOTIFICATIONS)
      : INITIAL_NOTIFICATIONS
  );
  const [supportRequests, setSupportRequests] = useState(() =>
    user.isAuthenticated ? loadUserList(user.email, 'support', []) : []
  );

  // Sync user-scoped lists to localStorage per email
  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      saveUserList(user.email, 'saved', savedAnswers);
    }
  }, [savedAnswers, user.isAuthenticated, user.email]);

  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      saveUserList(user.email, 'history', history);
    }
  }, [history, user.isAuthenticated, user.email]);

  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      saveUserList(user.email, 'documents', documents);
    }
  }, [documents, user.isAuthenticated, user.email]);

  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      saveUserList(user.email, 'notifications', notifications);
    }
  }, [notifications, user.isAuthenticated, user.email]);

  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      saveUserList(user.email, 'support', supportRequests);
    }
  }, [supportRequests, user.isAuthenticated, user.email]);

  // Hydrate from backend MongoDB for the active JWT user
  const hydrateFromBackend = async () => {
    const token = localStorage.getItem('sahayak_token');
    if (!token) return;
    const [profileRes, convRes, savedRes, docsRes, notifsRes] = await Promise.all([
      api.getProfile(),
      api.getConversations(),
      api.getSavedAnswers(),
      api.getDocuments(),
      api.getNotifications(),
    ]);
    if (notifsRes?.items?.length) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fromDb = notifsRes.items
          .filter((n) => !existingIds.has(n.id))
          .map((n) => ({
            id: n.id,
            title: n.title,
            detail: n.message || n.detail || '',
            time: n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now',
            read: Boolean(n.read),
          }));
        return [...fromDb, ...prev];
      });
    }
    if (profileRes?.profession) {
      setSelectedProfession(profileRes.profession);
      if (profileRes.language) setLanguage(profileRes.language);
      setUser((prev) => {
        const merged = {
          ...prev,
          name: profileRes.name || prev.name,
          email: profileRes.email || prev.email,
          profession: profileRes.profession,
          specialization: profileRes.specialization || '',
          profile_details: profileRes.profile_details || {},
          location: profileRes.location || prev.location,
          location_details: profileRes.location_details || {},
          interactionPreference: profileRes.interactionPreference || 'both',
          notificationsEnabled: profileRes.notificationsEnabled ?? true,
          interests: profileRes.interests || [],
          onboardingCompleted: Boolean(profileRes.onboardingCompleted),
        };
        try {
          localStorage.setItem('sahayak_user', JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    }
    if (convRes?.items?.length) {
      setHistory((prev) => {
        const existingIds = new Set(prev.map((h) => h.id));
        const fromDb = convRes.items
          .filter((c) => !existingIds.has(c.id))
          .map((c) => ({
            id: c.id,
            question: c.title,
            answer: '',
            profession: c.profession || 'Farmer',
            language: c.language || 'English',
            time: new Date(c.updated_at || c.created_at).toLocaleString(),
          }));
        return [...prev, ...fromDb];
      });
    }
    if (savedRes?.items?.length) {
      setSavedAnswers((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const fromDb = savedRes.items.filter((s) => !existingIds.has(s.id));
        return [...prev, ...fromDb];
      });
    }
    if (docsRes?.documents?.length) {
      setDocuments((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const fromDb = docsRes.documents.filter((d) => !existingIds.has(d.id));
        return [...prev, ...fromDb];
      });
    }
  };

  useEffect(() => {
    if (user.isAuthenticated) {
      hydrateFromBackend();
    }
  }, [user.isAuthenticated, user.email]);

  const loginUser = ({
    name,
    email,
    profession,
    specialization = '',
    profile_details = {},
    location,
    location_details = {},
    language: userLang,
    interactionPreference = 'both',
    notificationsEnabled = true,
    interests = [],
    onboardingCompleted = true,
  }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const resolvedProfession = profession || selectedProfession || 'Farmer';
    const nextUser = {
      name,
      email: cleanEmail,
      profession: resolvedProfession,
      specialization,
      profile_details,
      location: location || 'Vijayawada, Andhra Pradesh',
      location_details,
      interactionPreference,
      notificationsEnabled,
      interests,
      onboardingCompleted,
      phone: '+91 98765 43210',
      isAuthenticated: true,
    };
    setSelectedProfession(resolvedProfession);
    if (userLang) setLanguage(userLang);
    if (interactionPreference === 'voice') {
      setAccessibility((prev) => ({ ...prev, voiceAutoRead: true }));
    }
    setUser(nextUser);
    localStorage.setItem('sahayak_user', JSON.stringify(nextUser));

    // Load this specific email's saved history & data (isolated from other users!)
    setSavedAnswers(loadUserList(cleanEmail, 'saved', []));
    setHistory(loadUserList(cleanEmail, 'history', []));
    setDocuments(loadUserList(cleanEmail, 'documents', []));
    setNotifications(loadUserList(cleanEmail, 'notifications', INITIAL_NOTIFICATIONS));
    setSupportRequests(loadUserList(cleanEmail, 'support', []));
  };

  const logoutUser = () => {
    api.logout();
    localStorage.removeItem('sahayak_token');
    localStorage.removeItem('sahayak_user');
    setUser({
      name: 'Citizen',
      email: '',
      location: 'Vijayawada, Andhra Pradesh',
      phone: '+91 98765 43210',
      isAuthenticated: false,
    });
    setSavedAnswers([]);
    setHistory([]);
    setDocuments([]);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSupportRequests([]);
  };

  const clearAllUserData = async () => {
    await api.deleteAccountData();
    setSavedAnswers([]);
    setHistory([]);
    setDocuments([]);
    setNotifications([]);
    setSupportRequests([]);
  };

  const [accessibility, setAccessibility] = useState({
    fontSize: 'medium',
    highContrast: false,
    voiceAutoRead: false,
    reduceMotion: false,
  });

  const navigate = (pageId) => {
    const target = getNavItemById(pageId);
    routerNavigate(target.path);
    setMobileMenuOpen(false);
  };

  const askWithPrompt = (promptText) => {
    setPendingPrompt(promptText);
    routerNavigate('/ask');
    setMobileMenuOpen(false);
  };

  const saveAnswer = (title, content, category = 'AI Answer', source = 'Sahayak AI') => {
    const newItem = {
      id: `saved-${Date.now()}`,
      title,
      content,
      category,
      source,
      saved_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSavedAnswers((prev) => [newItem, ...prev]);
    api.saveAnswer({ title, content, category, source });
  };

  const deleteSavedAnswer = (id) => {
    setSavedAnswers((prev) => prev.filter((item) => item.id !== id));
  };

  const addHistory = (question, answer, idOverride = null) => {
    const entryId = idOverride || `hist-${Date.now()}`;
    const entry = {
      id: entryId,
      question,
      answer,
      profession: selectedProfession,
      language,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory((prev) => [entry, ...prev.filter((item) => item.id !== entryId)]);
  };

  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    api.deleteConversation(id);
  };

  const addDocument = (doc) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const deleteDocument = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addReminder = (title, detail) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title,
        detail,
        time: 'Reminder Set',
        type: 'info',
        read: false,
      },
      ...prev,
    ]);
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const t = useMemo(() => createTranslator(language), [language]);
  const demoCards = useMemo(() => getDemoCards(language), [language]);

  return (
    <AppContext.Provider
      value={{
        activePage,
        navigate,
        mobileMenuOpen,
        setMobileMenuOpen,
        user,
        setUser,
        loginUser,
        logoutUser,
        loginSuccessVisible,
        triggerLoginSuccess,
        clearAllUserData,
        selectedProfession,
        setSelectedProfession,
        language,
        setLanguage,
        t,
        demoCards,
        city,
        setCity,
        pendingPrompt,
        setPendingPrompt,
        askWithPrompt,
        savedAnswers,
        saveAnswer,
        deleteSavedAnswer,
        history,
        addHistory,
        deleteHistory,
        documents,
        addDocument,
        deleteDocument,
        notifications,
        markNotificationRead,
        addReminder,
        deleteNotification,
        unreadCount,
        supportRequests,
        setSupportRequests,
        accessibility,
        setAccessibility,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export function useLanguage() {
  const ctx = useContext(AppContext);
  return {
    language: ctx.language,
    setLanguage: ctx.setLanguage,
    t: ctx.t,
  };
}
