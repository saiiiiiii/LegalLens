import * as React from 'react';
import { ConfidenceScore } from '../ConfidenceScore';

export const EntityExtractionResults: React.FC<{ result: any }> = ({ result }) => {
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
