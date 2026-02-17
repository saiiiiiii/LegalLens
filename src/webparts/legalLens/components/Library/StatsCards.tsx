import * as React from 'react';

export interface IStatsCardsProps {
  total: number;
  compliant: number;
  warnings: number;
  alerts: number;
}

/**
 * Statistics cards showing contract counts by status
 */
export const StatsCards: React.FC<IStatsCardsProps> = ({
  total,
  compliant,
  warnings,
  alerts
}) => {
  const stats = [
    { label: 'Total', value: total.toString(), color: '#06b6d4' },
    { label: 'Compliant', value: compliant.toString(), color: '#10b981' },
    { label: 'Warnings', value: warnings.toString(), color: '#f59e0b' },
    { label: 'Alerts', value: alerts.toString(), color: '#ef4444' }
  ];

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {stats.map(s => (
        <div 
          key={s.label} 
          style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.07)', 
            borderRadius: '8px', 
            padding: '7px 12px', 
            textAlign: 'center', 
            minWidth: '62px' 
          }}
        >
          <div style={{ 
            fontSize: '17px', 
            fontWeight: 700, 
            color: s.color, 
            lineHeight: 1.2 
          }}>
            {s.value}
          </div>
          <div style={{ 
            fontSize: '8px', 
            color: '#64748b', 
            letterSpacing: '0.5px', 
            textTransform: 'uppercase', 
            marginTop: '1px' 
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
};