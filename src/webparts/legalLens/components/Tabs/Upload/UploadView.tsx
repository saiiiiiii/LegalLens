import * as React from 'react';
import { Stack, Text } from '@fluentui/react';
import {
  DocumentRegular,
  ErrorCircleFilled,
  WarningFilled,
  CheckmarkCircleFilled,
  ChartMultipleFilled,
  DocumentBulletListRegular,
  InfoRegular,
  CircleFilled,
} from '@fluentui/react-icons';
import { IContractAnalysis } from '../../../models/IContractAnalysis';
import { IContract } from '../../../models/IContract';
import { ISharePointService } from '../../../services/SharePointService';
import styles from './Upload.module.scss';
import { clauseRiskBgColor, clauseRiskTextColor, riskScoreBgColor, riskScoreTextColor } from '../../../utilities/colorUtils';

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

function getSeverityIcon(severity: string): React.ReactElement {
  const iconProps = { style: { fontSize: '20px' } };
  switch (severity.toLowerCase()) {
    case 'critical': return <ErrorCircleFilled {...iconProps} style={{ ...iconProps.style, color: '#ef4444' }} />;
    case 'high': return <WarningFilled {...iconProps} style={{ ...iconProps.style, color: '#f59e0b' }} />;
    case 'medium': return <InfoRegular {...iconProps} style={{ ...iconProps.style, color: '#fbbf24' }} />;
    case 'low': return <CheckmarkCircleFilled {...iconProps} style={{ ...iconProps.style, color: '#10b981' }} />;
    default: return <CircleFilled {...iconProps} style={{ ...iconProps.style, color: '#6b7280' }} />;
  }
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
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
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
        <Stack tokens={{ childrenGap: 0 }}>
          <div
            className={styles.dropZone}
            onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFileUpload(file); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <DocumentRegular className={styles.dropZoneIcon} />
            <Text block className={styles.dropZoneTitle}>Drag & drop contract file here</Text>
            <Text block className={styles.dropZoneHint}>or click to browse</Text>
            <Text block className={styles.dropZoneNote}>Supported: PDF, DOCX · Max size: 10MB</Text>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={e => onFileUpload(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
          </div>

          <Text block className={styles.orDivider}>— OR —</Text>

          <Stack>
            <label className={styles.libraryLabel}>Select from Library</label>
            <select
              className={styles.librarySelect}
              onChange={async e => {
                const idx = Number(e.target.value);
                if (idx >= 0) {
                  const contract = contracts[idx];
                  if (contract.fileUrl) {
                    const blob = await sharePointService.getContractFile(contract.fileUrl);
                    const file = new File([blob], contract.name, { type: 'application/pdf' });
                    onFileUpload(file);
                  }
                }
              }}
            >
              <option value="-1" style={{ background: '#1e293b', color: '#e2e8f0' }}>Choose contract from library...</option>
              {contracts.map((c, i) => (
                <option key={i} value={i} style={{ background: '#1e293b', color: '#e2e8f0' }}>{c.name}</option>
              ))}
            </select>
          </Stack>
        </Stack>
      )}

      {uploadView === 'analyzing' && (
        <Stack className={styles.analyzingCard} tokens={{ childrenGap: 0 }}>
          <Text block className={styles.analyzingTitle}>Analyzing: {uploadedFileName}</Text>

          <Stack className={styles.progressWrap}>
            <Stack horizontal horizontalAlign="space-between" className={styles.progressHeader}>
              <Text className={styles.progressLabel}>Processing...</Text>
              <Text className={styles.progressPercent}>{analyzingProgress}%</Text>
            </Stack>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${analyzingProgress}%` }} />
            </div>
          </Stack>

          <Stack className={styles.stepList} tokens={{ childrenGap: 8 }}>
            {[
              { step: 'Extracting text', done: analyzingProgress > 20 },
              { step: 'Identifying entities', done: analyzingProgress > 40 },
              { step: 'Analyzing clauses', done: analyzingProgress > 60 },
              { step: 'Calculating risk score', done: analyzingProgress > 80 },
            ].map((item, i) => (
              <Stack key={i} horizontal verticalAlign="center" className={styles.stepRow} tokens={{ childrenGap: 8 }}>
                <div
                  className={styles.stepDot}
                  style={{
                    border: '2px solid ' + (item.done ? '#10b981' : 'rgba(255,255,255,0.2)'),
                    background: item.done ? '#10b981' : 'transparent',
                  }}
                >
                  {item.done && <Text className={styles.stepCheck}>✓</Text>}
                </div>
                <Text style={{ fontSize: '11px', color: item.done ? '#e2e8f0' : '#64748b' }}>
                  {item.step}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}

      {uploadView === 'results' && analysisResult && (
        <Stack tokens={{ childrenGap: 0 }}>
          <Stack className={styles.successBanner}>
            <Text block className={styles.successTitle}>Analysis Complete & Saved to SharePoint</Text>
            <Text block className={styles.successHint}>
              Document uploaded to library with metadata · Refresh library view to see it
            </Text>
          </Stack>

          <div
            className={styles.riskScoreCard}
            style={{ background: `linear-gradient(135deg, ${riskScoreBgColor(analysisResult.overallRiskScore)}, rgba(0,0,0,0.1))` }}
          >
            <Text block className={styles.riskScoreLabel}>Overall Risk Score</Text>
            <Text block className={styles.riskScoreNumber} style={{ color: riskScoreTextColor(analysisResult.overallRiskScore) }}>
              {analysisResult.overallRiskScore}
            </Text>
            <Text block className={styles.riskScoreTotal}>/ 100</Text>
            <Stack horizontal verticalAlign="center" horizontalAlign="center" className={styles.riskScoreStatus} tokens={{ childrenGap: 6 }}>
              {analysisResult.overallRiskScore >= 70 ? (
                <><ErrorCircleFilled style={{ fontSize: '14px', color: '#ef4444' }} /><Text>High Risk</Text></>
              ) : analysisResult.overallRiskScore >= 40 ? (
                <><WarningFilled style={{ fontSize: '14px', color: '#f59e0b' }} /><Text>Medium Risk</Text></>
              ) : (
                <><CheckmarkCircleFilled style={{ fontSize: '14px', color: '#10b981' }} /><Text>Low Risk</Text></>
              )}
            </Stack>
          </div>

          {analysisResult.riskFactors && analysisResult.riskFactors.length > 0 && (
            <Stack style={{ marginBottom: '20px' }}>
              <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 6 }}>
                <ChartMultipleFilled style={{ fontSize: '14px' }} />
                <Text block className={styles.sectionTitle}>Risk Factors ({analysisResult.riskFactors.length})</Text>
              </Stack>
              {analysisResult.riskFactors.map((factor, i) => (
                <div key={i} className={styles.riskFactorCard}>
                  <Stack horizontal className={styles.riskFactorContent} tokens={{ childrenGap: 12 }}>
                    <div className={styles.riskFactorIconWrap}>{getSeverityIcon(factor.severity)}</div>
                    <Stack className={styles.riskFactorBody} tokens={{ childrenGap: 4 }}>
                      <Text block className={styles.riskFactorSeverity}>{factor.severity} - {factor.factor}</Text>
                      <Text block className={styles.riskFactorDesc}>{factor.description}</Text>
                      <div className={styles.riskFactorRec}>
                        <span>→</span>
                        <span>{factor.recommendation}</span>
                      </div>
                    </Stack>
                  </Stack>
                </div>
              ))}
            </Stack>
          )}

          <Stack>
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 6 }}>
              <DocumentBulletListRegular style={{ fontSize: '14px' }} />
              <Text block className={styles.sectionTitle}>Clauses ({analysisResult.clauses.length})</Text>
            </Stack>
            {analysisResult.clauses.map((clause, i) => (
              <Stack key={i} horizontal verticalAlign="center" className={styles.clauseRow} tokens={{ childrenGap: 0 }}>
                <Stack className={styles.clauseInfo}>
                  <Text block className={styles.clauseTitle}>{clause.ref} — {clause.title}</Text>
                  {clause.riskReason && (
                    <Text block className={styles.clauseRiskReason}>⚠ {clause.riskReason}</Text>
                  )}
                </Stack>
                <div
                  className={styles.clauseBadge}
                  style={{
                    background: clauseRiskBgColor(clause.riskLevel),
                    color: clauseRiskTextColor(clause.riskLevel),
                  }}
                >
                  {clause.riskLevel}
                </div>
              </Stack>
            ))}
          </Stack>

          <Stack className={styles.resetActions}>
            <button className={styles.resetButton} onClick={onReset}>
              Analyze Another Contract
            </button>
          </Stack>
        </Stack>
      )}

    </Stack>
  );
};
