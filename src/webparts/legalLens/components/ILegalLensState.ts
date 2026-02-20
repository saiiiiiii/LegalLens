import { IContract } from '../models/IContract';

export interface ILegalLensState {
  view: 'library' | 'upload' | 'classify' | 'translate' | 'alerts' | 'esignature';
  contracts: IContract[];
  loading: boolean;
  error: string | null;

  // Shared between Upload and Classification tabs
  uploadedFile: File | null;
  fullAnalysis: {
    contractType?: any;
    riskAssessment?: any;
    compliance?: any;
    entities?: any;
  } | null;

  // Translation state
  selContract: number;
  selLang: string;
  translating: boolean;
  translateProgress: number;
  cache: { [key: string]: { summary: string; clauses: any[] } };
  translateError: string | null;

  // Q&A state (multilingual)
  qaLanguage: string;
  qaHistory: Array<{ role: string; text: string; language: string; citedClauses?: string[] }>;
  qaInput: string;
  qaLoading: boolean;

  pulseAlert: boolean;
}
