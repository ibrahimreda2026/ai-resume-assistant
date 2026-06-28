export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: string;
}

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export type ActiveTab = 'landing' | 'auth' | 'dashboard';

export type DashboardSection = 
  | 'overview'
  | 'upload'
  | 'analyze'
  | 'improve'
  | 'cover-letter'
  | 'interview'
  | 'job-analyzer';

export interface ResumeAnalysis {
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  formattingTips: string[];
  actionVerbCount: number;
  skillsFound: string[];
  recommendedSkills: string[];

  // New schema evaluation fields
  overallScore?: number;
  formattingScore?: number;
  contentScore?: number;
  sections?: Array<{
    name: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    priority: string;
  }>;
  topImprovements?: string[];
  criticalIssues?: string[];
  missingSections?: string[];
  keywordSuggestions?: string[];
  estimatedInterviewChance?: string;
  finalVerdict?: string;
}

export interface ResumeImprovement {
  section: string;
  originalText: string;
  improvedText: string;
  explanation: string;
}

export interface CoverLetter {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  letterText: string;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  idealFocus: string;
  userAnswer?: string;
  feedback?: {
    score: number; // 0-100
    positives: string;
    improvements: string;
    suggestedAnswer: string;
  };
}

export interface InterviewSession {
  id: string;
  jobTitle: string;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  completed: boolean;
  createdAt: string;
}

export interface JobMatchAnalysis {
  matchScore: number; // 0-100
  matchingKeywords: string[];
  missingKeywords: string[];
  jobFitSummary: string;
  improvementSteps: string[];
}

export interface ResumeState {
  id?: string;
  fileName: string;
  rawText: string;
  uploadedAt: string;
  analysis?: ResumeAnalysis;
  improvements?: ResumeImprovement[];
  matches?: { [jobDescHash: string]: JobMatchAnalysis };
  parsedResume?: any;
}
