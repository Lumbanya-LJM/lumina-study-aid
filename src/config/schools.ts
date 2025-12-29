// LMV Multi-School Configuration
// This configuration system allows easy addition of new schools in the future

export type LMVSchool = 'law' | 'business';

export interface SchoolConfig {
  id: LMVSchool;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  icon: string; // Lucide icon name
  accentColor: string; // Tailwind color class
  institutions: {
    id: string;
    name: string;
    shortName?: string;
  }[];
  universities: string[];
  aiPersonality: {
    tone: string;
    focus: string[];
    examples: string[];
    terminology: Record<string, string>;
  };
  features: {
    hasLiveClasses: boolean;
    hasRecordings: boolean;
    hasFlashcards: boolean;
    hasQuizzes: boolean;
    hasJournal: boolean;
    hasFocusMode: boolean;
  };
}

export const SCHOOL_CONFIGS: Record<LMVSchool, SchoolConfig> = {
  law: {
    id: 'law',
    name: 'LMV Law',
    fullName: 'Luminary Innovision Academy - School of Law',
    tagline: 'Excellence in Legal Education',
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
        'When analyzing legal issues, apply the IRAC method (Issue, Rule, Application, Conclusion)',
        'Cite cases using proper legal citation format',
        'Reference statutes with full names and section numbers',
        'Use Latin legal maxims where appropriate with translations',
      ],
      terminology: {
        assignment: 'legal brief',
        project: 'case study',
        topic: 'legal issue',
        subject: 'area of law',
        lesson: 'seminar',
      },
    },
    features: {
      hasLiveClasses: true,
      hasRecordings: true,
      hasFlashcards: true,
      hasQuizzes: true,
      hasJournal: true,
      hasFocusMode: true,
    },
  },
  business: {
    id: 'business',
    name: 'LMV Business',
    fullName: 'Luminary Innovision Academy - School of Business',
    tagline: 'Building Tomorrow\'s Business Leaders',
    description: 'Developing analytical thinkers and ethical business professionals for the modern economy.',
    icon: 'Briefcase',
    accentColor: 'accent',
    institutions: [
      { id: 'University', name: 'University Business Programmes', shortName: 'University' },
      { id: 'ZICPA', name: 'Zambia Institute of Certified Public Accountants', shortName: 'ZICPA' },
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
      tone: 'Your communication is professional, practical, and results-oriented. You emphasize real-world application, analytical thinking, and ethical business practices.',
      focus: [
        'Practical business application',
        'Analytical and critical thinking',
        'Financial literacy and numeracy',
        'Ethical business practices',
        'Strategic decision-making',
        'Professional communication',
      ],
      examples: [
        'Use case studies from real companies to illustrate concepts',
        'Apply frameworks like SWOT, Porter\'s Five Forces, and PESTLE analysis',
        'Connect theory to practical business scenarios',
        'Emphasize data-driven decision making',
      ],
      terminology: {
        assignment: 'business report',
        project: 'case analysis',
        topic: 'business concept',
        subject: 'business discipline',
        lesson: 'lecture',
      },
    },
    features: {
      hasLiveClasses: true,
      hasRecordings: true,
      hasFlashcards: true,
      hasQuizzes: true,
      hasJournal: true,
      hasFocusMode: true,
    },
  },
};

export const DEFAULT_SCHOOL: LMVSchool = 'law';

export function getSchoolConfig(school: LMVSchool | null | undefined): SchoolConfig {
  return SCHOOL_CONFIGS[school || DEFAULT_SCHOOL];
}

export function getSchoolDisplayName(school: LMVSchool | null | undefined): string {
  return getSchoolConfig(school).name;
}

export function getSchoolIcon(school: LMVSchool | null | undefined): string {
  return getSchoolConfig(school).icon;
}

export function getAllSchools(): SchoolConfig[] {
  return Object.values(SCHOOL_CONFIGS);
}
