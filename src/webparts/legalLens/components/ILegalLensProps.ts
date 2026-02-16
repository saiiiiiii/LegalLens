import { ISharePointService } from '../services/SharePointService';
import { IAzureAIFoundryService } from '../services/AzureAIFoundryService';

export interface ILegalLensProps {
  description: string;
  sharePointService: ISharePointService;
  aiFoundryService: IAzureAIFoundryService;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
}