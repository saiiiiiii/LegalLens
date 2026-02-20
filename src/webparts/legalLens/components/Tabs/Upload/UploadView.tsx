import * as React from 'react';
import { Stack, Text } from '@fluentui/react';
import { IContractAnalysis } from '../../../models/IContractAnalysis';
import { IContract } from '../../../models/IContract';
import { ISharePointService } from '../../../services/SharePointService';
import { UploadSelect } from './UploadSelect';
import { UploadAnalyzing } from './UploadAnalyzing';
import { UploadResults } from './UploadResults';
import styles from './Upload.module.scss';

interface IUploadViewProps {
  uploadView: 'select' | 'analyzing' | 'results';
  uploadedFileName: string;
  analysisResult: IContractAnalysis | null;
  analyzingProgress: number;
  analyzeError: string | null;
  contracts: IContract[];
  sharePointService: ISharePointService;
  onFileUpload: (file: File | null) => Promise<void>;
  onReset: () => void;
}

export const UploadView: React.FC<IUploadViewProps> = ({
  uploadView,
  uploadedFileName,
  analysisResult,
  analyzingProgress,
  analyzeError,
  contracts,
  sharePointService,
  onFileUpload,
  onReset,
}) => (
  <Stack className={styles.viewWrap} tokens={{ childrenGap: 0 }}>

    <Stack className={styles.viewHeader}>
      <Stack horizontal verticalAlign="center" className={styles.viewTitleRow}>
        <Text block className={styles.viewTitle}>Upload & Analyze Contract</Text>
        <Text className={styles.aiBadge}>AI POWERED</Text>
      </Stack>
      <Text block className={styles.viewSubtitle}>
        Upload contract for instant risk & clause analysis · Powered by Azure AI Foundry
      </Text>
    </Stack>

    {analyzeError && (
      <Text block className={styles.errorBanner}>⚠ {analyzeError}</Text>
    )}

    {uploadView === 'select' && (
      <UploadSelect
        contracts={contracts}
        sharePointService={sharePointService}
        onFileUpload={onFileUpload}
      />
    )}

    {uploadView === 'analyzing' && (
      <UploadAnalyzing
        uploadedFileName={uploadedFileName}
        analyzingProgress={analyzingProgress}
      />
    )}

    {uploadView === 'results' && analysisResult && (
      <UploadResults
        analysisResult={analysisResult}
        onReset={onReset}
      />
    )}

  </Stack>
);
