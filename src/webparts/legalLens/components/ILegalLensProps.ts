import { ISharePointService } from '../services/SharePointService';
import { IAzureAIFoundryService } from '../services/AzureAIFoundryService';

export interface IContract {
  id: number;
  name: string;
  type: string;
  jurisdiction: string;
  status: 'compliant' | 'warning' | 'critical';
  parties: string[];
  expiry: string;
  tags: string[];
  risk: number;
  uploaded: string;
  summary: string;
  clauses: IClause[];
  flag?: string;
  fileUrl?: string;
  fullText?: string;  // NEW: Full document content for Q&A
}

export interface IClause {
  ref: string;
  title: string;
  text: string;
}

export interface ILegalLensProps {
  description: string;
  sharePointService: ISharePointService;
  aiFoundryService: IAzureAIFoundryService;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
}