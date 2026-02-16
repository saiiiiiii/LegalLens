import * as React from 'react';
import { IAlert } from "../../../models/IAlert";
import { ClockRegular, DocumentBulletListRegular, WarningFilled } from '@fluentui/react-icons';

export interface IAlertTileProps {
  alert: IAlert;
}

export const AlertTile: React.FC<IAlertTileProps> = ({ alert }) => {
    return (
        <div key={alert.id} style={{
                background: alert.severity === 'critical' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)',
                border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: '12px',
                padding: '20px',
                animation: `fadeIn 0.3s ease ${2 * 0.1}s both`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px'
                    }}>
                      {alert.type === 'duplicate' ? <DocumentBulletListRegular style={{ fontSize: '16px', color: '#818cf8' }} /> : alert.type === 'conflict' ? <WarningFilled style={{ fontSize: '16px', color: '#f59e0b' }} /> : <ClockRegular style={{ fontSize: '16px', color: '#ef4444' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', color: '#fff', fontWeight: 600 }}>{alert.title}</div>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                        background: alert.severity === 'critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
                        borderRadius: '3px',
                        padding: '1px 5px'
                      }}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '8.5px', color: '#64748b' }}>{alert.time}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.7 }}>{alert.desc}</p>
              </div>
    );
}