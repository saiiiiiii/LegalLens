import * as React from 'react';

export interface IConfidenceScoreProps {
  value: number;
  label: string;
  sublabel: string;
  color: string;
}

export const ConfidenceScore: React.FC<IConfidenceScoreProps> = ({ value, label, sublabel, color }) => {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color }}>
          {Math.round(value * 100)}%
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
            {label}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>
            {sublabel}
          </div>
        </div>
      </div>
    );
};
