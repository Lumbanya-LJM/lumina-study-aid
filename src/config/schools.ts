import { Scale, Briefcase, Heart } from 'lucide-react';

export type LMVSchool = 'law' | 'business' | 'health';

export const DEFAULT_SCHOOL: LMVSchool = 'law';

export interface SchoolInstitution {
  id: string;
  name: string;
  shortName: string;
}

// Discipline-specific tutor application fields
export interface DisciplineSpecificTutorFields {
  fields: {
    id: string;
    label: string;
    type: 'text' | 'select' | 'textarea' | 'checkbox' | 'number';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
  }[];
  specialties: string[];
  documentTypes: { id: string; name: string; required: boolean }[];
  targetStudentCategories: { id: string; label: string; description: string; requiresCredential?: string }[];
}

// Discipline-specific student fields
export interface DisciplineSpecificStudentFields {
  showAttemptStatus?: boolean;
  attemptStatusLabel?: string;
  attemptStatusOptions?: { value: number; label: string }[];
  yearLabel?: string;
}

export interface SchoolConfig {
  id: LMVSchool;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  icon: 'Scale' | 'Briefcase' | 'Heart';
  themeClass: string;
  primaryColor: string;
  gradientClass: string;
  emailColors: {
    primary: string;
    primaryDark: string;
    accent: string;
  };
  institutions: SchoolInstitution[];
  universities: string[];
  aiPersonality: {
    role: string;
    tone: string[];
    toneDescription: string;
    contextPreference: string[];
    examples: string[];
    greeting: string;
    avatarStyle: 'default' | 'clinical';
  };
  statsLabel: {
    casesRead: string;
  };
  luminaBranding: {
    name: string;
    tagline: string;
  };
  tutorApplication: DisciplineSpecificTutorFields;
  studentFields: DisciplineSpecificStudentFields;
  footerTagline: string;
}

export const SCHOOL_CONFIGS: Record<LMVSchool, SchoolConfig> = {
  law: {
    id: 'law',
    name: 'LMV Law',
    fullName: 'Luminary Innovision Academy - School of Law',
    tagline: 'Legal education, redefined.',
    description: 'Preparing future legal professionals with rigorous academic training and practical skills.',
    icon: 'Scale',
    themeClass: 'school-law',
    primaryColor: '#1e3a5f',
    gradientClass: 'gradient-law',
    emailColors: {
      primary: '#1e3a5f',
      primaryDark: '#0f1f33',
      accent: '#3366a3',
    },
    institutions: [
      { id: 'ZIALE', name: 'Zambia Institute of Advanced Legal Education', shortName: 'ZIALE' },
      { id: 'University', name: 'University Law Programmes', shortName: 'University' },
    ],
    universities: [
      'University of Zambia',
      'Copperbelt University',
      'Mulungushi University',
      'Cavendish University Zambia',
      'University of Lusaka',
      'Zambian Open University',
      'ZCAS University',
      'Northrise University',
      'Zambia Institute of Advanced Legal Education (ZIALE)',
      'Other',
    ],
    aiPersonality: {
      role: 'Premium legal study mentor & case-law guide',
      tone: ['analytical', 'ethical', 'professional', 'supportive'],
      toneDescription: 'Your communication is precise, authoritative, and academically rigorous. You use proper legal terminology and maintain the standards expected of legal professionals.',
      contextPreference: [
        'Case law analysis',
        'Statutory interpretation',
        'Legal reasoning',
        'Exam preparation support (not writing assignments)',
        'Precedent and jurisprudence',
        'Structured legal argumentation',
        'Professional ethics',
      ],
      examples: [
        'Case analysis using IRAC methodology',
        'Statutory interpretation techniques',
        'Legal citation and referencing',
        'Moot court preparation',
      ],
      greeting: "Hello! I'm Lumina, your legal study mentor. How can I assist with your legal studies today?",
      avatarStyle: 'default',
    },
    statsLabel: {
      casesRead: 'Cases Read',
    },
    luminaBranding: {
      name: 'Lumina Law',
      tagline: 'Smart Legal Learning',
    },
    footerTagline: 'Case law, Statutes, and the Constitution of Zambia',
    tutorApplication: {
      fields: [
        {
          id: 'calledToBar',
          label: 'Have you been called to the bar?',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          required: false,
        },
        {
          id: 'yearsAtBar',
          label: 'Years at the bar',
          type: 'number',
          placeholder: 'Enter number of years',
          required: false,
        },
        {
          id: 'practiceArea',
          label: 'Primary practice area',
          type: 'select',
          options: [
            { value: 'litigation', label: 'Litigation' },
            { value: 'corporate', label: 'Corporate & Commercial' },
            { value: 'criminal', label: 'Criminal Law' },
            { value: 'family', label: 'Family Law' },
            { value: 'property', label: 'Property & Conveyancing' },
            { value: 'labour', label: 'Labour & Employment' },
            { value: 'constitutional', label: 'Constitutional Law' },
            { value: 'academic', label: 'Academic/Teaching Focus' },
            { value: 'other', label: 'Other' },
          ],
          required: false,
        },
      ],
      specialties: [
        'Constitutional Law',
        'Criminal Law',
        'Contract Law',
        'Property Law',
        'Administrative Law',
        'Company Law',
        'Family Law',
        'Labour Law',
        'Tort Law',
        'Evidence',
        'Civil Procedure',
        'Criminal Procedure',
        'Legal Research & Writing',
      ],
      documentTypes: [
        { id: 'bachelors_degree', name: "Bachelor's Degree (Required)", required: true },
        { id: 'laz_certificate', name: 'LAZ Practicing Certificate (If applicable)', required: false },
      ],
      targetStudentCategories: [
        { id: 'university', label: 'University Students', description: 'LLB students at universities' },
        { id: 'ziale', label: 'ZIALE Students', description: 'Bar course students (requires bar admission)', requiresCredential: 'calledToBar' },
      ],
    },
    studentFields: {
      showAttemptStatus: true,
      attemptStatusLabel: 'Attempt Status',
      attemptStatusOptions: [
        { value: 1, label: 'First Attempt' },
        { value: 2, label: 'Repeater' },
      ],
      yearLabel: 'Year of Study',
    },
  },
  business: {
    id: 'business',
    name: 'LMV Business',
    fullName: 'Luminary Innovision Academy - School of Business',
    tagline: 'Shape the future of commerce.',
    description: 'Developing business leaders with analytical thinking and practical management skills.',
    icon: 'Briefcase',
    themeClass: 'school-business',
    primaryColor: '#1a5c42',
    gradientClass: 'gradient-business',
    emailColors: {
      primary: '#1a5c42',
      primaryDark: '#0e3326',
      accent: '#c9a227',
    },
    institutions: [
      { id: 'ZICPA', name: 'Zambia Institute of Chartered Accountants', shortName: 'ZICA' },
      { id: 'University', name: 'University Business Programmes', shortName: 'University' },
    ],
    universities: [
      'University of Zambia',
      'Copperbelt University',
      'Mulungushi University',
      'Cavendish University Zambia',
      'University of Lusaka',
      'Zambian Open University',
      'ZCAS University',
      'Northrise University',
      'Zambia Centre for Accountancy Studies (ZCAS)',
      'Other',
    ],
    aiPersonality: {
      role: 'Business learning coach — practical, strategy-focused, entrepreneurial-minded',
      tone: ['commercially aware', 'growth oriented', 'structured', 'motivational', 'professional'],
      toneDescription: 'Your communication is professional, analytical, and results-oriented. You use business terminology and emphasize practical application of concepts.',
      contextPreference: [
        'Economics and financial analysis',
        'Accounting principles',
        'Management strategies',
        'Entrepreneurship',
        'Case-based business analysis',
        'Data-driven decision making',
        'Strategic reasoning',
        'Ethical business practice',
      ],
      examples: [
        'SWOT and PESTLE analysis',
        'Financial statement interpretation',
        'Case study methodology',
        'Business plan development',
      ],
      greeting: "Welcome! I'm Lumina, your business learning coach. Ready to explore strategies and insights?",
      avatarStyle: 'default',
    },
    statsLabel: {
      casesRead: 'Reports Reviewed',
    },
    luminaBranding: {
      name: 'Lumina Business',
      tagline: 'Learn. Build. Lead.',
    },
    footerTagline: 'Finance, Accounting, Marketing, Management & more',
    tutorApplication: {
      fields: [
        {
          id: 'industryExperience',
          label: 'Industry experience (years)',
          type: 'number',
          placeholder: 'Years of industry experience',
          required: false,
        },
        {
          id: 'businessSpecialty',
          label: 'Business specialty',
          type: 'select',
          options: [
            { value: 'accounting', label: 'Accounting & Auditing' },
            { value: 'finance', label: 'Finance & Banking' },
            { value: 'economics', label: 'Economics' },
            { value: 'marketing', label: 'Marketing & Sales' },
            { value: 'management', label: 'Management & Leadership' },
            { value: 'entrepreneurship', label: 'Entrepreneurship' },
            { value: 'hr', label: 'Human Resources' },
            { value: 'operations', label: 'Operations & Supply Chain' },
            { value: 'other', label: 'Other' },
          ],
          required: false,
        },
        {
          id: 'professionalCertifications',
          label: 'Professional certifications',
          type: 'textarea',
          placeholder: 'E.g., CA, ACCA, CFA, CPA, etc.',
          required: false,
        },
      ],
      specialties: [
        'Financial Accounting',
        'Management Accounting',
        'Auditing',
        'Taxation',
        'Corporate Finance',
        'Economics',
        'Marketing',
        'Strategic Management',
        'Human Resource Management',
        'Entrepreneurship',
        'Business Statistics',
        'Business Law',
      ],
      documentTypes: [
        { id: 'bachelors_degree', name: "Bachelor's Degree (Required)", required: true },
        { id: 'professional_cert', name: 'Professional Certification (If applicable)', required: false },
      ],
      targetStudentCategories: [
        { id: 'university', label: 'University Students', description: 'Business/Commerce students at universities' },
        { id: 'professional', label: 'Professional Students', description: 'ZICA/ACCA certification candidates' },
      ],
    },
    studentFields: {
      showAttemptStatus: false,
      yearLabel: 'Year of Study',
    },
  },
  health: {
    id: 'health',
    name: 'LMV Health',
    fullName: 'Luminary Innovision Academy - School of Health Sciences',
    tagline: 'Excellence in health sciences education.',
    description: 'Training healthcare professionals with clinical knowledge and compassionate care.',
    icon: 'Heart',
    themeClass: 'school-health',
    primaryColor: '#2A5A6A',
    gradientClass: 'gradient-health',
    emailColors: {
      primary: '#2A5A6A',
      primaryDark: '#163945',
      accent: '#3d8e8e',
    },
    institutions: [
      { id: 'Medical School', name: 'Medical School', shortName: 'Medical' },
      { id: 'Nursing School', name: 'Nursing School', shortName: 'Nursing' },
      { id: 'University', name: 'University Health Programmes', shortName: 'University' },
    ],
    universities: [
      'University of Zambia - School of Medicine',
      'Copperbelt University - School of Medicine',
      'Levy Mwanawasa Medical University',
      'Lusaka Apex Medical University',
      'Cavendish University Zambia',
      'University of Lusaka',
      'Zambian Open University',
      'Northrise University',
      'Other',
    ],
    aiPersonality: {
      role: 'Health sciences study mentor — clinically aware & evidence-based',
      tone: ['calm', 'precise', 'safety-oriented', 'supportive', 'empathetic'],
      toneDescription: 'Your communication is precise, empathetic, and clinically accurate. You use proper medical terminology while ensuring concepts are accessible to students at various levels.',
      contextPreference: [
        'Anatomy and physiology',
        'Nursing care principles',
        'Public health awareness',
        'Clinical reasoning',
        'Evidence-based practice',
        'Patient-centered care',
        'Medical ethics',
        'Ethical patient-first language',
      ],
      examples: [
        'Clinical case presentations',
        'Differential diagnosis methodology',
        'Medical literature review',
        'Patient care planning',
      ],
      greeting: "Hello! I'm Lumina, your health sciences mentor. How can I support your medical education today?",
      avatarStyle: 'clinical',
    },
    statsLabel: {
      casesRead: 'Cases Studied',
    },
    luminaBranding: {
      name: 'Lumina Health',
      tagline: 'Advancing Medical & Health Knowledge',
    },
    footerTagline: 'Anatomy, Physiology, Clinical Practice & more',
    tutorApplication: {
      fields: [
        {
          id: 'healthDiscipline',
          label: 'Health discipline',
          type: 'select',
          options: [
            { value: 'medicine', label: 'Medicine' },
            { value: 'nursing', label: 'Nursing' },
            { value: 'pharmacy', label: 'Pharmacy' },
            { value: 'public_health', label: 'Public Health' },
            { value: 'biomedical', label: 'Biomedical Sciences' },
            { value: 'physiotherapy', label: 'Physiotherapy' },
            { value: 'clinical_officer', label: 'Clinical Medicine' },
            { value: 'other', label: 'Other' },
          ],
          required: false,
        },
        {
          id: 'clinicalExperience',
          label: 'Clinical experience (years)',
          type: 'number',
          placeholder: 'Years of clinical experience',
          required: false,
        },
        {
          id: 'professionalRegistration',
          label: 'Professional registration body',
          type: 'text',
          placeholder: 'E.g., HPCZ, Nursing Council of Zambia',
          required: false,
        },
      ],
      specialties: [
        'Anatomy',
        'Physiology',
        'Biochemistry',
        'Pharmacology',
        'Pathology',
        'Microbiology',
        'Community Health',
        'Clinical Skills',
        'Nursing Fundamentals',
        'Medical-Surgical Nursing',
        'Pediatrics',
        'Obstetrics & Gynecology',
      ],
      documentTypes: [
        { id: 'bachelors_degree', name: "Bachelor's Degree / Diploma (Required)", required: true },
        { id: 'registration_cert', name: 'Professional Registration Certificate (If applicable)', required: false },
      ],
      targetStudentCategories: [
        { id: 'medical', label: 'Medical Students', description: 'MBBS/MD students' },
        { id: 'nursing', label: 'Nursing Students', description: 'Nursing diploma and degree students' },
        { id: 'allied', label: 'Allied Health', description: 'Other health science programmes' },
      ],
    },
    studentFields: {
      showAttemptStatus: false,
      yearLabel: 'Year of Study',
    },
  },
};

export const getSchoolConfig = (school: LMVSchool): SchoolConfig => {
  return SCHOOL_CONFIGS[school] || SCHOOL_CONFIGS.law;
};

export const getSchoolIcon = (school: LMVSchool) => {
  const iconMap = {
    law: Scale,
    business: Briefcase,
    health: Heart,
  };
  return iconMap[school] || Scale;
};

export const getAllSchools = (): SchoolConfig[] => {
  return Object.values(SCHOOL_CONFIGS);
};

export const getSchoolSubtitle = (school: LMVSchool): string => {
  const subtitles: Record<LMVSchool, string> = {
    law: 'Legal Excellence • Professional Growth',
    business: 'Business Acumen • Leadership Development',
    health: 'Clinical Excellence • Compassionate Care',
  };
  return subtitles[school] || subtitles.law;
};

// Get discipline-neutral placeholder text
export const getDisciplineText = (school: LMVSchool): {
  motivationPlaceholder: string;
  experiencePlaceholder: string;
  qualificationsPlaceholder: string;
} => {
  const texts: Record<LMVSchool, { motivationPlaceholder: string; experiencePlaceholder: string; qualificationsPlaceholder: string }> = {
    law: {
      motivationPlaceholder: 'What motivates you to become a tutor? Why do you want to teach law students?',
      experiencePlaceholder: 'Describe your teaching or legal practice experience...',
      qualificationsPlaceholder: 'List your educational qualifications, degrees, certifications...',
    },
    business: {
      motivationPlaceholder: 'What motivates you to become a tutor? Why do you want to teach business students?',
      experiencePlaceholder: 'Describe your teaching or professional business experience...',
      qualificationsPlaceholder: 'List your educational qualifications, degrees, professional certifications...',
    },
    health: {
      motivationPlaceholder: 'What motivates you to become a tutor? Why do you want to teach health sciences students?',
      experiencePlaceholder: 'Describe your teaching or clinical experience...',
      qualificationsPlaceholder: 'List your educational qualifications, degrees, professional registrations...',
    },
  };
  return texts[school] || texts.law;
};