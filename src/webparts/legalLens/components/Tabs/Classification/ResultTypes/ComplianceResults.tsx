import * as React from 'react';
import { ConfidenceScore } from '../ConfidenceScore';

export const ComplianceResults: React.FC<{ result: any }> = ({ result }) => {
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
