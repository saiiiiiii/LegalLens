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

function getRiskScoreColor(score: number): string {
  if (score >= 70) return 'rgba(239,68,68,0.2)';
  if (score >= 40) return 'rgba(245,158,11,0.2)';
  return 'rgba(16,185,129,0.2)';
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
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '24px', fontWeight: 600, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.5px', margin: 0 }}>
            Upload & Analyze Contract
          </h2>
          <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', borderRadius: '4px', padding: '2px 7px' }}>
            AI POWERED
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
          Upload contract for instant risk & clause analysis · Powered by Azure AI Foundry
        </p>
      </div>

      {analyzeError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', color: '#f87171', fontSize: '11px' }}>
          ⚠ {analyzeError}
        </div>
      )}

      {uploadView === 'select' && (
        <div>
          <div
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) onFileUpload(file);
            }}
            onDragOver={e => e.preventDefault()}
            style={{
              border: '2px dashed rgba(99,102,241,0.4)',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center',
              background: 'rgba(99,102,241,0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <DocumentRegular style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3, color: '#818cf8' }} />
            <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}>
              Drag & drop contract file here
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
              or click to browse
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              Supported: PDF, DOCX · Max size: 10MB
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={e => onFileUpload(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ margin: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
            — OR —
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Select from Library
            </label>
            <select
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
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
        <div>
          <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, marginBottom: '16px' }}>
              Analyzing: {uploadedFileName}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Processing...</span>
                <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{analyzingProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${analyzingProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { step: 'Extracting text', done: analyzingProgress > 20 },
                { step: 'Identifying entities', done: analyzingProgress > 40 },
                { step: 'Analyzing clauses', done: analyzingProgress > 60 },
                { step: 'Calculating risk score', done: analyzingProgress > 80 }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid ' + (item.done ? '#10b981' : 'rgba(255,255,255,0.2)'),
                    background: item.done ? '#10b981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    transition: 'all 0.3s'
                  }}>
                    {item.done && <span style={{ color: '#fff' }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '11px', color: item.done ? '#e2e8f0' : '#64748b' }}>
                    {item.step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {uploadView === 'results' && analysisResult && (
        <div>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px' }}/>
            <div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                Analysis Complete & Saved to SharePoint
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                Document uploaded to library with metadata · Refresh library view to see it
              </div>
            </div>
          </div>

          <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, ' + getRiskScoreColor(analysisResult.overallRiskScore) + ', rgba(0,0,0,0.1))',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Overall Risk Score
            </div>
            <div style={{ fontSize: '64px', fontWeight: 700, color: analysisResult.overallRiskScore >= 70 ? '#ef4444' : analysisResult.overallRiskScore >= 40 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>
              {analysisResult.overallRiskScore}
            </div>
            <div style={{ fontSize: '18px', color: '#94a3b8' }}>/ 100</div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
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
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                <><ChartMultipleFilled style={{ fontSize: '14px', marginRight: '6px' }} />Risk Factors ({analysisResult.riskFactors.length})</>
              </h3>
              {analysisResult.riskFactors.map((factor, i) => (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ fontSize: '24px', lineHeight: 1 }}>
                      {getSeverityIcon(factor.severity)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                        {factor.severity} - {factor.factor}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.6 }}>
                        {factor.description}
                      </div>
                      <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
              <><DocumentBulletListRegular style={{ fontSize: '14px', marginRight: '6px' }} />Clauses ({analysisResult.clauses.length})</>
            </h3>
            {analysisResult.clauses.map((clause, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600, marginBottom: '2px' }}>
                    {clause.ref} — {clause.title}
                  </div>
                  {clause.riskReason && (
                    <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '4px' }}>
                      ⚠ {clause.riskReason}
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  background: getClauseRiskColor(clause.riskLevel),
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: clause.riskLevel === 'high' ? '#ef4444' : clause.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                }}>
                  {clause.riskLevel}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
            <button
              onClick={onReset}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              Analyze Another Contract
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
