import * as React from 'react';
import { ConfidenceScore } from '../ConfidenceScore';

export const RiskAssessmentResults: React.FC<{ result: any }> = ({ result }) => {
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
