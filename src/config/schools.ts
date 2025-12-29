import { Scale, Briefcase, Heart } from 'lucide-react';

export type LMVSchool = 'law' | 'business' | 'health';

export const DEFAULT_SCHOOL: LMVSchool = 'law';

export interface SchoolInstitution {
  id: string;
  name: string;
  shortName: string;
}

export interface SchoolConfig {
  id: LMVSchool;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  icon: 'Scale' | 'Briefcase' | 'Heart';
  accentColor: string;
  institutions: SchoolInstitution[];
  universities: string[];
  aiPersonality: {
    tone: string;
    focus: string[];
    examples: string[];
  };
  statsLabel: {
    casesRead: string; // Different label per school
  };
  luminaBranding: {
    name: string;
    tagline: string;
  };
}

export const SCHOOL_CONFIGS: Record<LMVSchool, SchoolConfig> = {
  law: {
    id: 'law',
    name: 'LMV Law',
    fullName: 'Luminary Innovision Academy - School of Law',
    tagline: 'Legal education, redefined.',
    description: 'Preparing future legal professionals with rigorous academic training and practical skills.',
    icon: 'Scale',
    accentColor: 'primary',
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
      tone: 'Your communication is precise, authoritative, and academically rigorous. You use proper legal terminology and maintain the standards expected of legal professionals.',
      focus: [
        'Legal reasoning and case analysis',
        'Statutory interpretation',
        'Precedent and jurisprudence',
        'Clarity and precision in expression',
        'Structured legal argumentation',
        'Professional ethics',
      ],
      examples: [
        'Case analysis using IRAC methodology',
        'Statutory interpretation techniques',
        'Legal citation and referencing',
        'Moot court preparation',
      ],
    },
    statsLabel: {
      casesRead: 'Cases Read',
    },
    luminaBranding: {
      name: 'Lumina Law',
      tagline: 'Smart Legal Learning',
    },
  },
  business: {
    id: 'business',
    name: 'LMV Business',
    fullName: 'Luminary Innovision Academy - School of Business',
    tagline: 'Shape the future of commerce.',
    description: 'Developing business leaders with analytical thinking and practical management skills.',
    icon: 'Briefcase',
    accentColor: 'primary',
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
      tone: 'Your communication is professional, analytical, and results-oriented. You use business terminology and emphasize practical application of concepts.',
      focus: [
        'Practical business application',
        'Analytical and critical thinking',
        'Data-driven decision making',
        'Business literacy and financial acumen',
        'Strategic reasoning',
        'Ethical business practice',
      ],
      examples: [
        'SWOT and PESTLE analysis',
        'Financial statement interpretation',
        'Case study methodology',
        'Business plan development',
      ],
    },
    statsLabel: {
      casesRead: 'Reports Reviewed',
    },
    luminaBranding: {
      name: 'Lumina Business',
      tagline: 'Learn. Build. Lead.',
    },
  },
  health: {
    id: 'health',
    name: 'LMV Health',
    fullName: 'Luminary Innovision Academy - School of Health Sciences',
    tagline: 'Excellence in health sciences education.',
    description: 'Training healthcare professionals with clinical knowledge and compassionate care.',
    icon: 'Heart',
    accentColor: 'primary',
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
      tone: 'Your communication is precise, empathetic, and clinically accurate. You use proper medical terminology while ensuring concepts are accessible to students at various levels.',
      focus: [
        'Clinical reasoning and diagnosis',
        'Evidence-based practice',
        'Patient-centered care',
        'Medical ethics and professionalism',
        'Anatomical and physiological understanding',
        'Public health awareness',
      ],
      examples: [
        'Clinical case presentations',
        'Differential diagnosis methodology',
        'Medical literature review',
        'Patient care planning',
      ],
    },
    statsLabel: {
      casesRead: 'Cases Studied',
    },
    luminaBranding: {
      name: 'Lumina Health',
      tagline: 'Advancing Medical & Health Knowledge',
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
