import * as React from 'react';
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

function getClauseRiskColor(level: string): string {
  switch (level) {
    case 'high': return 'rgba(239,68,68,0.15)';
    case 'medium': return 'rgba(245,158,11,0.15)';
    case 'low': return 'rgba(16,185,129,0.15)';
    default: return 'rgba(255,255,255,0.05)';
  }
}

function getClauseRiskTextColor(level: string): string {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    default: return '#10b981';
  }
}

function getRiskScoreColor(score: number): string {
  if (score >= 70) return 'rgba(239,68,68,0.2)';
  if (score >= 40) return 'rgba(245,158,11,0.2)';
  return 'rgba(16,185,129,0.2)';
}

function getRiskScoreTextColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
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
    <div className={styles.viewWrap}>

      <div className={styles.viewHeader}>
        <div className={styles.viewTitleRow}>
          <h2 className={styles.viewTitle}>Upload & Analyze Contract</h2>
          <span className={styles.aiBadge}>AI POWERED</span>
        </div>
        <p className={styles.viewSubtitle}>
          Upload contract for instant risk & clause analysis · Powered by Azure AI Foundry
        </p>
      </div>

      {analyzeError && (
        <div className={styles.errorBanner}>⚠ {analyzeError}</div>
      )}

      {uploadView === 'select' && (
        <div>
          <div
            className={styles.dropZone}
            onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) onFileUpload(file); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <DocumentRegular className={styles.dropZoneIcon} />
            <div className={styles.dropZoneTitle}>Drag & drop contract file here</div>
            <div className={styles.dropZoneHint}>or click to browse</div>
            <div className={styles.dropZoneNote}>Supported: PDF, DOCX · Max size: 10MB</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={e => onFileUpload(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.orDivider}>— OR —</div>

          <div>
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
          </div>
        </div>
      )}

      {uploadView === 'analyzing' && (
        <div className={styles.analyzingCard}>
          <div className={styles.analyzingTitle}>Analyzing: {uploadedFileName}</div>

          <div className={styles.progressWrap}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Processing...</span>
              <span className={styles.progressPercent}>{analyzingProgress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${analyzingProgress}%` }} />
            </div>
          </div>

          <div className={styles.stepList}>
            {[
              { step: 'Extracting text', done: analyzingProgress > 20 },
              { step: 'Identifying entities', done: analyzingProgress > 40 },
              { step: 'Analyzing clauses', done: analyzingProgress > 60 },
              { step: 'Calculating risk score', done: analyzingProgress > 80 },
            ].map((item, i) => (
              <div key={i} className={styles.stepRow}>
                <div
                  className={styles.stepDot}
                  style={{
                    border: '2px solid ' + (item.done ? '#10b981' : 'rgba(255,255,255,0.2)'),
                    background: item.done ? '#10b981' : 'transparent',
                  }}
                >
                  {item.done && <span className={styles.stepCheck}>✓</span>}
                </div>
                <span style={{ fontSize: '11px', color: item.done ? '#e2e8f0' : '#64748b' }}>
                  {item.step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadView === 'results' && analysisResult && (
        <div>
          <div className={styles.successBanner}>
            <div>
              <div className={styles.successTitle}>Analysis Complete & Saved to SharePoint</div>
              <div className={styles.successHint}>
                Document uploaded to library with metadata · Refresh library view to see it
              </div>
            </div>
          </div>

          <div
            className={styles.riskScoreCard}
            style={{ background: `linear-gradient(135deg, ${getRiskScoreColor(analysisResult.overallRiskScore)}, rgba(0,0,0,0.1))` }}
          >
            <div className={styles.riskScoreLabel}>Overall Risk Score</div>
            <div className={styles.riskScoreNumber} style={{ color: getRiskScoreTextColor(analysisResult.overallRiskScore) }}>
              {analysisResult.overallRiskScore}
            </div>
            <div className={styles.riskScoreTotal}>/ 100</div>
            <div className={styles.riskScoreStatus}>
              {analysisResult.overallRiskScore >= 70 ? (
                <><ErrorCircleFilled style={{ fontSize: '14px', color: '#ef4444' }} /> High Risk</>
              ) : analysisResult.overallRiskScore >= 40 ? (
                <><WarningFilled style={{ fontSize: '14px', color: '#f59e0b' }} /> Medium Risk</>
              ) : (
                <><CheckmarkCircleFilled style={{ fontSize: '14px', color: '#10b981' }} /> Low Risk</>
              )}
            </div>
          </div>

          {analysisResult.riskFactors && analysisResult.riskFactors.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 className={styles.sectionTitle}>
                <ChartMultipleFilled style={{ fontSize: '14px', marginRight: '6px' }} />
                Risk Factors ({analysisResult.riskFactors.length})
              </h3>
              {analysisResult.riskFactors.map((factor, i) => (
                <div key={i} className={styles.riskFactorCard}>
                  <div className={styles.riskFactorContent}>
                    <div className={styles.riskFactorIconWrap}>{getSeverityIcon(factor.severity)}</div>
                    <div className={styles.riskFactorBody}>
                      <div className={styles.riskFactorSeverity}>{factor.severity} - {factor.factor}</div>
                      <div className={styles.riskFactorDesc}>{factor.description}</div>
                      <div className={styles.riskFactorRec}>
                        <span>→</span>
                        <span>{factor.recommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className={styles.sectionTitle}>
              <DocumentBulletListRegular style={{ fontSize: '14px', marginRight: '6px' }} />
              Clauses ({analysisResult.clauses.length})
            </h3>
            {analysisResult.clauses.map((clause, i) => (
              <div key={i} className={styles.clauseRow}>
                <div className={styles.clauseInfo}>
                  <div className={styles.clauseTitle}>{clause.ref} — {clause.title}</div>
                  {clause.riskReason && (
                    <div className={styles.clauseRiskReason}>⚠ {clause.riskReason}</div>
                  )}
                </div>
                <div
                  className={styles.clauseBadge}
                  style={{
                    background: getClauseRiskColor(clause.riskLevel),
                    color: getClauseRiskTextColor(clause.riskLevel),
                  }}
                >
                  {clause.riskLevel}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.resetActions}>
            <button className={styles.resetButton} onClick={onReset}>
              Analyze Another Contract
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
