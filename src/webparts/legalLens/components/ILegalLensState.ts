import { IClassificationResult } from '../models/IClassificationResult';
import { IContract } from '../models/IContract';
import { IContractAnalysis } from '../models/IContractAnalysis';

export interface ILegalLensState {
  view: 'library' | 'upload' | 'classify' | 'translate' | 'alerts' | 'esignature';
  contracts: IContract[];
  loading: boolean;
  error: string | null;

  // Upload & Analysis
  uploadView: 'select' | 'analyzing' | 'results';
  uploadedFile: File | null;
  uploadedFileName: string;
  analysisResult: IContractAnalysis | null;
  analyzingProgress: number;
  analyzeError: string | null;

  // Classification
  classificationView: 'select' | 'classifying' | 'results' | 'processing';
  selectedFileForClassification: number;
  classificationType: string;
  classificationResult: IClassificationResult | null;
  classifying: boolean;
  classifyError: string | null;

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

  // Classification state
  classifyState: {
    step: number;
    done: boolean;
    result?: any;
  } | null;
  selectedClassificationType: string;

  // Unified analysis cache
  fullAnalysis: {
    contractType?: any;
    riskAssessment?: any;
    compliance?: any;
    entities?: any;
  } | null;

  pulseAlert: boolean;
}