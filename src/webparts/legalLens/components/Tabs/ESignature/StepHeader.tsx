import * as React from 'react';

export interface IStepHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export const StepHeader: React.FC<IStepHeaderProps> = ({ title, subtitle, onBack }) => {
  return (
    <div style={{
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#94a3b8',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
          {title}
        </h2>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
        {subtitle}
      </p>
    </div>
  );
};