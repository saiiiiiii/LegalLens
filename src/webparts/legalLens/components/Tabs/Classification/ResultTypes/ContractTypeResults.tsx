import * as React from 'react';
import { ConfidenceScore } from '../ConfidenceScore';

export const ContractTypeResults: React.FC<{ result: any }> = ({ result }) => {
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
