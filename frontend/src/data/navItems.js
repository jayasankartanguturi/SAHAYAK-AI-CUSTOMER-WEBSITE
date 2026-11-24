import {
  Home,
  MessageSquareText,
  Mic,
  Image as ImageIcon,
  FileText,
  Languages,
  Briefcase,
  LayoutGrid,
  Landmark,
  ShieldCheck,
  MapPin,
  CloudSun,
  AlertTriangle,
  Bookmark,
  History,
  FolderOpen,
  Bell,
  BadgeCheck,
  Sparkles,
  Headphones,
  ClipboardList,
  MessageSquareWarning,
  Accessibility,
  Settings,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    title: 'MAIN',
    items: [
      { id: 'home', path: '/', number: 1, label: 'Home', icon: Home, group: 'Main' },
      { id: 'ask', path: '/ask', number: 2, label: 'Ask Sahayak AI', icon: MessageSquareText, group: 'Main' },
    ],
  },
  {
    title: 'AI ASSISTANCE',
    items: [
      { id: 'voice', path: '/voice', number: 3, label: 'Voice Assistant', icon: Mic, group: 'AI Assistance' },
      { id: 'image', path: '/image', number: 4, label: 'Image Assistant', icon: ImageIcon, group: 'AI Assistance' },
      { id: 'document', path: '/document', number: 5, label: 'Document Assistant', icon: FileText, group: 'AI Assistance' },
      { id: 'language', path: '/language', number: 6, label: 'Language & Translation', icon: Languages, group: 'AI Assistance' },
    ],
  },
  {
    title: 'PROFESSION & SERVICES',
    items: [
      { id: 'my-profession', path: '/my-profession', number: 7, label: 'My Profession', icon: Briefcase, group: 'Profession & Services' },
      { id: 'profession-services', path: '/profession-services', number: 8, label: 'Profession-Based Services', icon: LayoutGrid, group: 'Profession & Services' },
      { id: 'schemes', path: '/schemes', number: 9, label: 'Government Schemes', icon: Landmark, group: 'Profession & Services' },
      { id: 'eligibility', path: '/eligibility', number: 10, label: 'Scheme Eligibility Assistant', icon: ShieldCheck, group: 'Profession & Services' },
      { id: 'local-info', path: '/local-info', number: 11, label: 'Local Information', icon: MapPin, group: 'Profession & Services' },
      { id: 'weather-market', path: '/weather-market', number: 12, label: 'Weather & Market Updates', icon: CloudSun, group: 'Profession & Services' },
      { id: 'emergency', path: '/emergency', number: 13, label: 'Emergency & Disaster Assistance', icon: AlertTriangle, group: 'Profession & Services' },
    ],
  },
  {
    title: 'MY ACTIVITY',
    items: [
      { id: 'saved', path: '/saved', number: 14, label: 'Saved Answers', icon: Bookmark, group: 'My Activity' },
      { id: 'history', path: '/history', number: 15, label: 'Conversation History', icon: History, group: 'My Activity' },
      { id: 'my-documents', path: '/my-documents', number: 16, label: 'My Documents', icon: FolderOpen, group: 'My Activity' },
      { id: 'notifications', path: '/notifications', number: 17, label: 'Notifications & Reminders', icon: Bell, hasBadge: true, group: 'My Activity' },
    ],
  },
  {
    title: 'TRUST & PERSONALIZATION',
    items: [
      { id: 'trusted-sources', path: '/trusted-sources', number: 18, label: 'Trusted Information Sources', icon: BadgeCheck, group: 'Trust & Personalization' },
      { id: 'recommendations', path: '/recommendations', number: 19, label: 'Personalized Recommendations', icon: Sparkles, group: 'Trust & Personalization' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { id: 'expert-support', path: '/expert-support', number: 20, label: 'Expert Support', icon: Headphones, group: 'Support' },
      { id: 'support-requests', path: '/support-requests', number: 21, label: 'My Support Requests', icon: ClipboardList, group: 'Support' },
      { id: 'feedback', path: '/feedback', number: 22, label: 'Feedback & Report an Issue', icon: MessageSquareWarning, group: 'Support' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'accessibility', path: '/accessibility', number: 23, label: 'Accessibility Settings', icon: Accessibility, group: 'Account' },
      { id: 'profile', path: '/profile', number: 24, label: 'My Profile & Settings', icon: Settings, group: 'Account' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function getNavItemById(id) {
  return ALL_NAV_ITEMS.find((item) => item.id === id) || ALL_NAV_ITEMS[0];
}

export function getNavItemByPath(pathname) {
  return ALL_NAV_ITEMS.find((item) => item.path === pathname) || ALL_NAV_ITEMS[0];
}
