import { lazy } from 'react';
import HomeDashboard from '../components/HomeDashboard';

const AskSahayakPage = lazy(() => import('../pages/AskSahayakPage'));
const VoiceAssistantPage = lazy(() => import('../pages/VoiceAssistantPage'));
const ImageAssistantPage = lazy(() => import('../pages/ImageAssistantPage'));
const DocumentAssistantPage = lazy(() => import('../pages/DocumentAssistantPage'));
const LanguageTranslationPage = lazy(() => import('../pages/LanguageTranslationPage'));

const MyProfessionPage = lazy(() =>
  import('../pages/ProfessionPages').then((m) => ({ default: m.MyProfessionPage }))
);
const ProfessionServicesPage = lazy(() =>
  import('../pages/ProfessionPages').then((m) => ({ default: m.ProfessionServicesPage }))
);
const GovernmentSchemesPage = lazy(() =>
  import('../pages/SchemesPages').then((m) => ({ default: m.GovernmentSchemesPage }))
);
const SchemeEligibilityPage = lazy(() =>
  import('../pages/SchemesPages').then((m) => ({ default: m.SchemeEligibilityPage }))
);
const LocalInformationPage = lazy(() =>
  import('../pages/InfoUpdatesPages').then((m) => ({ default: m.LocalInformationPage }))
);
const WeatherMarketPage = lazy(() =>
  import('../pages/InfoUpdatesPages').then((m) => ({ default: m.WeatherMarketPage }))
);
const EmergencyDisasterPage = lazy(() =>
  import('../pages/InfoUpdatesPages').then((m) => ({ default: m.EmergencyDisasterPage }))
);
const SavedAnswersPage = lazy(() =>
  import('../pages/ActivityPages').then((m) => ({ default: m.SavedAnswersPage }))
);
const ConversationHistoryPage = lazy(() =>
  import('../pages/ActivityPages').then((m) => ({ default: m.ConversationHistoryPage }))
);
const MyDocumentsPage = lazy(() =>
  import('../pages/ActivityPages').then((m) => ({ default: m.MyDocumentsPage }))
);
const NotificationsRemindersPage = lazy(() =>
  import('../pages/ActivityPages').then((m) => ({ default: m.NotificationsRemindersPage }))
);
const TrustedSourcesPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.TrustedSourcesPage }))
);
const PersonalizedRecommendationsPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.PersonalizedRecommendationsPage }))
);
const ExpertSupportPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.ExpertSupportPage }))
);
const MySupportRequestsPage = lazy(() =>
  import('../pages/CustomerRequestsPage')
);
const FeedbackReportPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.FeedbackReportPage }))
);
const AccessibilitySettingsPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.AccessibilitySettingsPage }))
);
const ProfileSettingsPage = lazy(() =>
  import('../pages/TrustSupportAccountPages').then((m) => ({ default: m.ProfileSettingsPage }))
);

export const APP_ROUTES = [
  { path: '/', Component: HomeDashboard },
  { path: '/ask', Component: AskSahayakPage },
  { path: '/voice', Component: VoiceAssistantPage },
  { path: '/image', Component: ImageAssistantPage },
  { path: '/document', Component: DocumentAssistantPage },
  { path: '/language', Component: LanguageTranslationPage },
  { path: '/my-profession', Component: MyProfessionPage },
  { path: '/profession-services', Component: ProfessionServicesPage },
  { path: '/schemes', Component: GovernmentSchemesPage },
  { path: '/eligibility', Component: SchemeEligibilityPage },
  { path: '/local-info', Component: LocalInformationPage },
  { path: '/weather-market', Component: WeatherMarketPage },
  { path: '/emergency', Component: EmergencyDisasterPage },
  { path: '/saved', Component: SavedAnswersPage },
  { path: '/history', Component: ConversationHistoryPage },
  { path: '/my-documents', Component: MyDocumentsPage },
  { path: '/notifications', Component: NotificationsRemindersPage },
  { path: '/trusted-sources', Component: TrustedSourcesPage },
  { path: '/recommendations', Component: PersonalizedRecommendationsPage },
  { path: '/expert-support', Component: ExpertSupportPage },
  { path: '/support-requests', Component: MySupportRequestsPage },
  { path: '/feedback', Component: FeedbackReportPage },
  { path: '/accessibility', Component: AccessibilitySettingsPage },
  { path: '/profile', Component: ProfileSettingsPage },
];
