import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { CLASSIFY_STEPS } from '../../../constants';
import { ClockRegular } from '@fluentui/react-icons';
import { ConfidenceScore } from './ConfidenceScore';

export interface IClassifyState {
  step: number;
  done: boolean;
  result?: any;
}

export interface IClassifyProcessingProps {
  classifyState: IClassifyState | null;
  uploadedFileName: string;
  selectedClassificationType: string;
  contracts: IContract[];
  selectedFileForClassification: number;
  onReset: () => void;
}

export const ClassifyProcessing: React.FC<IClassifyProcessingProps> = ({
    classifyState, uploadedFileName, selectedClassificationType,
    contracts, selectedFileForClassification, onReset
}) => {
    const contract = contracts[selectedFileForClassification];

    return (
      <>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '21px',
              fontWeight: 400,
              color: '#fff',
              margin: '0 0 3px'
            }}>
              Live Classification
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              Knowledge Agent classifies document in real-time
            </p>
          </div>
          {classifyState?.done && (
            <button
              onClick={onReset}
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981',
                borderRadius: '7px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              ↻ Classify Another
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* LEFT: Progress Steps */}
          <div>
            <ProgressSteps
              classifyState={classifyState}
              uploadedFileName={uploadedFileName}
              contract={contract}
            />
          </div>

          {/* RIGHT: Results */}
          <div>
            {classifyState?.done && classifyState.result ? (
              <ClassificationResults result={classifyState.result} classificationType={selectedClassificationType} />
            ) : (
              <ClassificationPending />
            )}
          </div>
        </div>
      </>
    );
};

// ---- Sub-components ----

const ProgressSteps: React.FC<{
  classifyState: IClassifyState | null;
  uploadedFileName: string;
  contract: IContract;
}> = ({ classifyState, uploadedFileName, contract }) => {
    return (
      <>
        {/* File info card */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>
              📄
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
                {uploadedFileName || contract?.name || 'NovaCorp — Vendor Agreement'}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                From SharePoint library
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '3px',
            height: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              borderRadius: '3px',
              background: classifyState?.done ? '#10b981' : 'linear-gradient(90deg,#10b981,#06b6d4)',
              width: classifyState ? `${((classifyState.step + 1) / CLASSIFY_STEPS.length) * 100}%` : '0%',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {CLASSIFY_STEPS.map((step, i) => {
            const done = classifyState && classifyState.step > i;
            const active = classifyState && classifyState.step === i;

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  padding: '9px 12px',
                  background: active ? 'rgba(16,185,129,0.06)' : done ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '8px',
                  transition: 'all 0.3s'
                }}
              >
                {/* Step indicator */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  minWidth: '20px',
                  marginTop: '1px',
                  background: done ? '#10b981' : active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  border: active ? '2px solid #10b981' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {done && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                  {active && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      border: '2px solid #10b981',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                </div>

                {/* Step text */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: done ? '#10b981' : active ? '#e2e8f0' : '#64748b',
                    fontWeight: 500
                  }}>
                    {step.phase}
                  </div>
                  <div style={{
                    fontSize: '9.5px',
                    color: active ? '#94a3b8' : '#64748b',
                    marginTop: '1px'
                  }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
};

const ClassificationPending: React.FC = () => {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '36px 20px',
        textAlign: 'center'
      }}>
        <ClockRegular style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.25, color: '#94a3b8' }} />
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          Extracted metadata will appear here…
        </div>
      </div>
    );
};

const ClassificationResults: React.FC<{ result: any; classificationType: string }> = ({ result, classificationType }) => {
    switch (classificationType) {
      case 'contract_type':
        return <ContractTypeResults result={result} />;
      case 'risk_assessment':
        return <RiskAssessmentResults result={result} />;
      case 'compliance_check':
        return <ComplianceResults result={result} />;
      case 'entity_extraction':
        return <EntityExtractionResults result={result} />;
      default:
        return <ContractTypeResults result={result} />;
    }
};

// ---- Result type renderers ----

const ContractTypeResults: React.FC<{ result: any }> = ({ result }) => {
    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{
              fontSize: '9px',
              color: '#10b981',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Contract Type Classification
            </span>
          </div>

          {[
            ['Document Type', result.documentType],
            ['Parties', (result.parties || []).join(' · ')],
            ['Jurisdiction', result.jurisdiction],
            ['Effective Date', result.effectiveDate],
            ['Expiry Date', result.expiryDate],
            ['Key Clauses', (result.keyClauses || []).join(', ')]
          ].map(([label, value], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none'
              }}
            >
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>{label}</span>
              <span style={{
                fontSize: '10.5px',
                color: '#e2e8f0',
                fontWeight: 500,
                textAlign: 'right',
                maxWidth: '200px'
              }}>
                {value || 'Not specified'}
              </span>
            </div>
          ))}

          {result.autoTags && result.autoTags.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)'
            }}>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>Auto-Tags</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {result.autoTags.map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '8.5px',
                      fontFamily: 'monospace',
                      background: 'rgba(6,182,212,0.1)',
                      border: '1px solid rgba(6,182,212,0.2)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      color: '#67e8f9'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0'
          }}>
            <span style={{ fontSize: '9.5px', color: '#64748b' }}>Duplicate Flag</span>
            <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 500 }}>
              {result.duplicateFlag || 'No duplicates found ✓'}
            </span>
          </div>
        </div>

        <ConfidenceScore value={result.confidence || 0.97} label="Classification Confidence" sublabel="Document Intelligence + semantic analysis" color="#10b981" />
      </div>
    );
};

const RiskAssessmentResults: React.FC<{ result: any }> = ({ result }) => {
    const riskColor = result.riskLevel === 'High' ? '#ef4444' :
      result.riskLevel === 'Medium' ? '#f59e0b' : '#10b981';

    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: riskColor }} />
            <span style={{
              fontSize: '9px',
              color: riskColor,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Risk Assessment Complete
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                Overall Risk Score
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                {result.riskLevel || 'Medium'} Risk Level
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: riskColor }}>
              {result.overallRiskScore || 45}
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
              IDENTIFIED RISK FACTORS
            </div>
            {(result.riskFactors || []).map((factor: any, i: number) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 600 }}>
                    {factor.factor}
                  </span>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: factor.severity === 'High' ? 'rgba(239,68,68,0.15)' :
                      factor.severity === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: factor.severity === 'High' ? '#ef4444' :
                      factor.severity === 'Medium' ? '#f59e0b' : '#10b981'
                  }}>
                    {factor.severity}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px' }}>
                  {factor.description}
                </div>
                <div style={{ fontSize: '9px', color: '#f59e0b' }}>
                  → {factor.recommendation}
                </div>
              </div>
            ))}
          </div>

          {result.complianceIssues && result.complianceIssues.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '6px' }}>
              <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>
                ⚠ COMPLIANCE ISSUES
              </div>
              {result.complianceIssues.map((issue: string, i: number) => (
                <div key={i} style={{ fontSize: '9px', color: '#f87171', marginBottom: '3px' }}>
                  • {issue}
                </div>
              ))}
            </div>
          )}

          {result.mitigationSteps && result.mitigationSteps.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
                ✓ RECOMMENDED MITIGATION
              </div>
              {result.mitigationSteps.map((step: string, i: number) => (
                <div key={i} style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '3px' }}>
                  {i + 1}. {step}
                </div>
              ))}
            </div>
          )}
        </div>

        <ConfidenceScore value={result.confidence || 0.92} label="Assessment Confidence" sublabel="AI-powered risk analysis" color="#818cf8" />
      </div>
    );
};

const ComplianceResults: React.FC<{ result: any }> = ({ result }) => {
    const complianceColor = result.overallCompliance === 'Compliant' ? '#10b981' :
      result.overallCompliance === 'Partial' ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(99,102,241,0.04)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: complianceColor }} />
            <span style={{
              fontSize: '9px',
              color: complianceColor,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Compliance Check Complete
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                Overall Compliance
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                {result.overallCompliance || 'Partial'}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: complianceColor }}>
              {result.complianceScore || 72}%
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            {(result.regulations || []).map((reg: any, i: number) => {
              const regColor = reg.status === 'Compliant' ? '#10b981' :
                reg.status === 'Partial' ? '#f59e0b' : '#ef4444';

              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                      {reg.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: regColor }}>
                        {reg.score}%
                      </span>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: reg.status === 'Compliant' ? 'rgba(16,185,129,0.15)' :
                          reg.status === 'Partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: regColor
                      }}>
                        {reg.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '6px' }}>
                    {(reg.findings || []).map((finding: string, j: number) => (
                      <div key={j} style={{
                        fontSize: '9px',
                        color: finding.startsWith('✓') ? '#10b981' :
                          finding.startsWith('⚠') ? '#f59e0b' : '#ef4444',
                        marginBottom: '2px'
                      }}>
                        {finding}
                      </div>
                    ))}
                  </div>

                  {reg.recommendations && reg.recommendations.length > 0 && (
                    <div style={{ paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {reg.recommendations.map((rec: string, j: number) => (
                        <div key={j} style={{ fontSize: '9px', color: '#f59e0b', marginBottom: '2px' }}>
                          → {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '12px',
            padding: '10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
                {result.criticalIssues || 0}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>Critical</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                {result.warnings || 0}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>Warnings</div>
            </div>
          </div>
        </div>

        <ConfidenceScore value={result.confidence || 0.89} label="Analysis Confidence" sublabel="Compliance verification" color="#818cf8" />
      </div>
    );
};

const EntityExtractionResults: React.FC<{ result: any }> = ({ result }) => {
    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(6,182,212,0.04)',
          border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#06b6d4' }} />
            <span style={{
              fontSize: '9px',
              color: '#06b6d4',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Entity Extraction Complete
            </span>
          </div>

          {result.parties && result.parties.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                PARTIES
              </div>
              {result.parties.map((party: any, i: number) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontSize: '10.5px', color: '#e2e8f0', fontWeight: 600 }}>
                    {party.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                    {party.role} • {party.jurisdiction}
                  </div>
                  {party.contact && (
                    <div style={{ fontSize: '8.5px', color: '#67e8f9', marginTop: '2px' }}>
                      {party.contact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.dates && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                KEY DATES
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px' }}>
                {Object.entries(result.dates).map(([key, value], i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: i < Object.keys(result.dates).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                  }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#e2e8f0', fontWeight: 500 }}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.financialTerms && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                FINANCIAL TERMS
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px' }}>
                {Object.entries(result.financialTerms).map(([key, value], i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: i < Object.keys(result.financialTerms).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                  }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 600 }}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.keyObligations && result.keyObligations.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                KEY OBLIGATIONS
              </div>
              {result.keyObligations.map((obligation: string, i: number) => (
                <div key={i} style={{
                  fontSize: '9px',
                  color: '#e2e8f0',
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  • {obligation}
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px' }}>
              <strong>Governing Law:</strong> {result.governingLaw}
            </div>
            {result.disputeResolution && (
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                <strong>Dispute Resolution:</strong> {result.disputeResolution}
              </div>
            )}
          </div>
        </div>

        <ConfidenceScore value={result.confidence || 0.94} label="Extraction Confidence" sublabel="Entity recognition" color="#06b6d4" />
      </div>
    );
};
