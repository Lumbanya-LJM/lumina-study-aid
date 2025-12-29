import { FileText, Brain, BookOpen, Scale, TrendingUp, Building2, Stethoscope, Heart, Pill, Calculator, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LMVSchool } from './schools';

interface QuickPrompt {
  icon: LucideIcon;
  label: string;
  action: string;
}

interface SchoolPromptConfig {
  greeting: string;
  quickPrompts: QuickPrompt[];
  promptMap: Record<string, string>;
}

export const schoolPromptConfigs: Record<LMVSchool, SchoolPromptConfig> = {
  law: {
    greeting: "I'm Lumina, your AI study companion for Zambian law. What would you like to learn today?",
    quickPrompts: [
      { icon: FileText, label: 'Summarise a case', action: 'summarise' },
      { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
      { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
      { icon: Scale, label: 'Find a case', action: 'zambialii' },
    ],
    promptMap: {
      summarise: 'Please summarise this Zambian case, focusing on the key facts, issue, holding, and reasoning.',
      flashcards: 'Create detailed flashcards from my notes that focus on key principles, definitions, and case law.',
      quiz: 'Generate a practice quiz based on my recent study topics with multiple choice questions.',
    },
  },
  business: {
    greeting: "I'm Lumina, your AI study companion for business and management. What would you like to learn today?",
    quickPrompts: [
      { icon: BarChart3, label: 'Analyse a case study', action: 'analyse' },
      { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
      { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
      { icon: TrendingUp, label: 'Explain a concept', action: 'explain' },
    ],
    promptMap: {
      analyse: 'Please analyse this business case study, focusing on the problem, analysis framework, key findings, and strategic recommendations.',
      flashcards: 'Create detailed flashcards from my notes that focus on key business concepts, frameworks, and management principles.',
      quiz: 'Generate a practice quiz based on my recent study topics with multiple choice questions covering business and management concepts.',
      explain: 'Explain this business concept in simple terms with practical examples and real-world applications.',
    },
  },
  health: {
    greeting: "I'm Lumina, your AI study companion for health sciences. What would you like to learn today?",
    quickPrompts: [
      { icon: Stethoscope, label: 'Explain a condition', action: 'explain' },
      { icon: Brain, label: 'Create flashcards', action: 'flashcards' },
      { icon: BookOpen, label: 'Quiz me', action: 'quiz' },
      { icon: Pill, label: 'Drug information', action: 'drug' },
    ],
    promptMap: {
      explain: 'Explain this medical condition or health concept, including pathophysiology, signs and symptoms, diagnosis, and management approaches.',
      flashcards: 'Create detailed flashcards from my notes that focus on anatomy, physiology, pathology, and clinical concepts.',
      quiz: 'Generate a practice quiz based on my recent study topics with multiple choice questions covering health sciences concepts.',
      drug: 'Provide comprehensive information about this medication including mechanism of action, indications, contraindications, side effects, and nursing considerations.',
    },
  },
};

export function getSchoolPromptConfig(school: LMVSchool): SchoolPromptConfig {
  return schoolPromptConfigs[school] || schoolPromptConfigs.law;
}

// Check if a quick action is specific to law school (ZambiaLII)
export function isLawSpecificAction(action: string): boolean {
  return action === 'zambialii';
}

// Get the appropriate library tabs based on school
export function getLibraryTabs(school: LMVSchool) {
  const baseTabs = [
    { id: 'all', label: 'All' },
    { id: 'summarizer', label: 'AI Summarizer' },
  ];

  if (school === 'law') {
    return [
      ...baseTabs,
      { id: 'zambialii', label: 'ZambiaLII' },
      { id: 'cases', label: 'Cases' },
      { id: 'summaries', label: 'Summaries' },
      { id: 'papers', label: 'Past Papers' },
      { id: 'videos', label: 'Videos' },
      { id: 'alerts', label: 'Alerts' },
    ];
  }

  // For business and health, exclude ZambiaLII and Cases
  return [
    ...baseTabs,
    { id: 'summaries', label: 'Summaries' },
    { id: 'papers', label: 'Past Papers' },
    { id: 'videos', label: 'Videos' },
    { id: 'alerts', label: 'Alerts' },
  ];
}
