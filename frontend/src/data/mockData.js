export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

export const PROFESSIONS = [
  {
    id: 'Farmer',
    name: 'Farmer',
    subtitle: 'Crop & Weather Guidance',
    image: '/images/farmer.jpg',
    description: 'Crop guidance, crop disease information, fertilizer guidance, weather and mandi market updates.',
    tools: [
      { title: 'Crop Guidance', desc: 'Seasonal sowing, irrigation & variety recommendations', target: 'ask', prompt: 'Give me seasonal crop guidance for paddy and pulses.' },
      { title: 'Crop Disease Information', desc: 'Upload leaf photos to inspect spots or pests safely', target: 'image' },
      { title: 'Fertilizer Guidance', desc: 'Balanced NPK nutrient schedules & soil health tips', target: 'ask', prompt: 'What is the recommended paddy fertilizer and NPK schedule?' },
      { title: 'Weather & Market Information', desc: '5-day forecast and regional mandi price updates', target: 'weather-market' },
    ],
  },
  {
    id: 'Business Owner',
    name: 'Business Owner',
    subtitle: 'Business & Trade Support',
    image: '/images/business.jpg',
    description: 'Business management, suppliers, pricing strategies, and government MSME / Mudra support.',
    tools: [
      { title: 'Business Guidance', desc: 'Udyam MSME registration, GST basics & operations', target: 'ask', prompt: 'How do small business owners register for MSME Udyam and GST?' },
      { title: 'Pricing & Margin Helper', desc: 'Ask AI to structure unit pricing & cost breakdowns', target: 'ask', prompt: 'Help me calculate retail pricing and profit margins for my shop.' },
      { title: 'Government Support', desc: 'PM Mudra loans & credit guarantee eligibility', target: 'eligibility' },
      { title: 'Document & Invoice Reader', desc: 'Extract & ask questions on business PDFs', target: 'document' },
    ],
  },
  {
    id: 'Student',
    name: 'Student',
    subtitle: 'Study & Career Guidance',
    image: '/images/student.jpg',
    description: 'Education assistance, exams, scholarships on NSP, and AI-powered learning support.',
    tools: [
      { title: 'Education Assistance', desc: 'Career roadmaps, exam prep & skill programs', target: 'ask', prompt: 'Create a structured study plan and career roadmap for college students.' },
      { title: 'Scholarships', desc: 'Explore NSP & Post-Matric scholarship eligibility', target: 'schemes' },
      { title: 'Learning Support (PDF)', desc: 'Upload textbook PDFs to summarize & ask questions', target: 'document' },
      { title: 'Multilingual Study Helper', desc: 'Translate study concepts into Telugu, Hindi & more', target: 'language' },
    ],
  },
  {
    id: 'Teacher',
    name: 'Teacher',
    subtitle: 'Teaching & Lesson Support',
    image: '/images/teacher.jpg',
    description: 'Lesson planning, bilingual worksheets, quiz generation, and educational resources.',
    tools: [
      { title: 'Lesson Plan Builder', desc: 'Create structured classroom lesson plans quickly', target: 'ask', prompt: 'Create an interactive 45-minute lesson plan with activities and review questions.' },
      { title: 'Quiz & Worksheet Maker', desc: 'Generate MCQs and practice sheets for students', target: 'ask', prompt: 'Generate a 10-question practice quiz with answer key for high school students.' },
      { title: 'Curriculum PDF Helper', desc: 'Summarize syllabus & textbook chapters fast', target: 'document' },
      { title: 'Bilingual Classroom Notes', desc: 'Translate lessons into Telugu, Hindi & English', target: 'language' },
    ],
  },
  {
    id: 'Healthcare',
    name: 'Healthcare',
    subtitle: 'Health Info & Documentation',
    image: '/images/healthcare.jpg',
    description: 'Healthcare information, multilingual patient communication, and public health scheme references.',
    tools: [
      { title: 'Patient Education Helper', desc: 'Explain care instructions in simple local language', target: 'ask', prompt: 'Draft simple multilingual preventive health and hydration tips for rural patients.' },
      { title: 'Health Schemes (AB-PMJAY)', desc: 'Check Ayushman Bharat & state health coverage', target: 'schemes' },
      { title: 'Clinical Document Reader', desc: 'Summarize healthcare PDFs & circulars safely', target: 'document' },
      { title: 'Emergency Helplines', desc: 'Quick access to 108, 112 & health helplines', target: 'emergency' },
    ],
  },
  {
    id: 'Government Employee',
    name: 'Government Employee',
    subtitle: 'Public Services & Admin',
    image: '/images/govt-employee.jpg',
    description: 'Government services, circular summaries, welfare scheme references, and administrative drafting.',
    tools: [
      { title: 'Circular & Policy Reader', desc: 'Upload government orders & PDFs for instant summary', target: 'document' },
      { title: 'Citizen Scheme Lookup', desc: 'Verify welfare scheme eligibility & required docs', target: 'eligibility' },
      { title: 'Official Note Drafting', desc: 'Draft clear notices & summaries in English/Telugu/Hindi', target: 'ask', prompt: 'Help me draft a clear citizen awareness notice for local welfare scheme enrollment.' },
      { title: 'Bilingual Translation', desc: 'Translate administrative notices accurately', target: 'language' },
    ],
  },
  {
    id: 'Skilled Worker',
    name: 'Skilled Worker',
    subtitle: 'Skills & Job Support',
    image: '/images/skilled-worker.jpg',
    description: 'Technical troubleshooting, safety tips, PM Vishwakarma toolkit benefits, and job opportunities.',
    tools: [
      { title: 'Technical & Repair Guide', desc: 'Step-by-step electrical, mechanical & repair help', target: 'ask', prompt: 'Share a practical safety and troubleshooting checklist for residential electrical wiring.' },
      { title: 'PM Vishwakarma Scheme', desc: 'Rs. 15,000 toolkit grant, training & 5% credit', target: 'schemes' },
      { title: 'Hands-Free Voice Helper', desc: 'Ask questions by voice while on the job', target: 'voice' },
      { title: 'Visual Inspection', desc: 'Upload tool or equipment photos for quick guidance', target: 'image' },
    ],
  },
  {
    id: 'Professional',
    name: 'Professional',
    subtitle: 'Work & Productivity',
    image: '/images/professional.jpg',
    description: 'Productivity workflows, research summaries, document analysis, and career assistance.',
    tools: [
      { title: 'Research & Writing Assistant', desc: 'Draft proposals, emails & structured summaries', target: 'ask', prompt: 'Help me structure a concise project status report and executive summary.' },
      { title: 'Document & Report Analyzer', desc: 'Upload PDFs to extract key points & action items', target: 'document' },
      { title: 'Multilingual Communication', desc: 'Translate business communications effortlessly', target: 'language' },
      { title: 'Career & Upskilling', desc: 'Explore skill roadmaps and certification paths', target: 'ask', prompt: 'Suggest a 90-day upskilling plan for career growth in my industry.' },
    ],
  },
];

export const INITIAL_SAVED_ANSWERS = [
  {
    id: 'saved-1',
    title: 'PM-KISAN Installment & e-KYC Steps',
    category: 'Government Schemes',
    source: 'pmkisan.gov.in (Demo Snapshot)',
    saved_at: '1 day ago',
    content:
      'Eligible landholding farmer families receive Rs. 6,000/year in three Rs. 2,000 installments. Complete Aadhaar e-KYC on pmkisan.gov.in or at your nearest CSC.',
  },
  {
    id: 'saved-2',
    title: 'Paddy Leaf Spot Early Care',
    category: 'Crop Guidance',
    source: 'icar.org.in (Demo Reference)',
    saved_at: '2 days ago',
    content:
      'Inspect leaf undersides, avoid excess nitrogen, ensure proper drainage, and consult your local Krishi Vigyan Kendra (KVK) before applying any fungicide.',
  },
];

export const INITIAL_HISTORY = [
  {
    id: 'hist-1',
    question: 'Asked about PM Kisan Scheme',
    time: '2 hours ago',
    profession: 'Farmer',
    language: 'English',
    answer: 'PM-KISAN provides Rs. 6,000 per year in 3 installments via DBT. Keep Aadhaar, land record, and bank passbook ready.',
  },
  {
    id: 'hist-2',
    question: 'Viewed Weather Updates for Vijayawada',
    time: '3 hours ago',
    profession: 'Farmer',
    language: 'English',
    answer: 'Demo forecast shows 28°C Partly Cloudy in Vijayawada with light rain expected on Thursday.',
  },
  {
    id: 'hist-3',
    question: 'Saved Crop Disease Info',
    time: '1 day ago',
    profession: 'Farmer',
    language: 'Telugu',
    answer: 'Checked integrated pest management steps for paddy leaf yellowing and saved the KVK guidance.',
  },
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Weather Alert: Heavy Rain Expected',
    detail: 'Demo Alert: Light to moderate rain forecast in coastal Andhra districts over the next 48 hours.',
    time: '1h ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'New Government Scheme Launched',
    detail: 'Demo Update: PM Vishwakarma & PM-KISAN e-KYC camp dates updated for Vijayawada block.',
    time: '3h ago',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Your Support Request is Resolved',
    detail: 'Ticket #SR-4021 regarding document PDF upload has been marked resolved.',
    time: '1d ago',
    type: 'success',
    read: true,
  },
];

export const TRUSTED_SOURCES = [
  {
    name: 'PM-KISAN Portal',
    org: 'Ministry of Agriculture & Farmers Welfare',
    url: 'https://pmkisan.gov.in',
    category: 'Agriculture',
    lastUpdated: 'Demo Snapshot • Verify Live',
  },
  {
    name: 'National Scholarship Portal (NSP)',
    org: 'Ministry of Electronics & IT / Education',
    url: 'https://scholarships.gov.in',
    category: 'Education',
    lastUpdated: 'Demo Snapshot • Verify Live',
  },
  {
    name: 'India Meteorological Department (IMD)',
    org: 'Ministry of Earth Sciences',
    url: 'https://mausam.imd.gov.in',
    category: 'Weather & Alerts',
    lastUpdated: 'Live Feed Not Connected (Demo)',
  },
  {
    name: 'e-NAM National Agriculture Market',
    org: 'Ministry of Agriculture',
    url: 'https://enam.gov.in',
    category: 'Market Prices',
    lastUpdated: 'Live Feed Not Connected (Demo)',
  },
  {
    name: 'National Disaster Management Authority',
    org: 'Government of India',
    url: 'https://ndma.gov.in',
    category: 'Emergency & Safety',
    lastUpdated: 'Verified Helpline Reference',
  },
  {
    name: 'PM Vishwakarma & MSME Portal',
    org: 'Ministry of MSME',
    url: 'https://pmvishwakarma.gov.in',
    category: 'Artisans & Business',
    lastUpdated: 'Demo Snapshot • Verify Live',
  },
];

export const EMERGENCY_HELPLINES = [
  { name: 'National Emergency Number', number: '112', desc: 'All-in-one Police, Fire & Ambulance' },
  { name: 'Disaster Management (NDMA)', number: '1078', desc: 'Flood, Cyclone & Earthquake response' },
  { name: 'Ambulance / Medical Emergency', number: '108', desc: '24x7 emergency medical transport' },
  { name: 'Kisan Call Centre', number: '1800-180-1551', desc: 'Toll-free agricultural & crop helpline' },
  { name: 'Fire & Rescue', number: '101', desc: 'Immediate fire emergency dispatch' },
  { name: 'Women & Child Helpline', number: '181 / 1098', desc: '24x7 safety and protection support' },
];

export const LOCAL_SERVICES = [
  { name: 'Krishi Vigyan Kendra (KVK), Garikapadu', type: 'Agriculture Office', distance: '14 km (Demo)', hours: '9:30 AM – 5:00 PM' },
  { name: 'Common Service Centre (CSC) – Benz Circle', type: 'Citizen e-Services', distance: '2.1 km (Demo)', hours: '9:00 AM – 7:00 PM' },
  { name: 'Rythu Bharosa Kendra (RBK) – Patamata', type: 'Seed & Soil Testing', distance: '3.4 km (Demo)', hours: '9:00 AM – 5:00 PM' },
  { name: 'District Fisheries Office – Machilipatnam Rd', type: 'Fisheries Support', distance: '4.8 km (Demo)', hours: '10:00 AM – 5:00 PM' },
  { name: 'Government General Hospital', type: '24x7 Healthcare', distance: '3.9 km (Demo)', hours: 'Open 24 Hours' },
];

