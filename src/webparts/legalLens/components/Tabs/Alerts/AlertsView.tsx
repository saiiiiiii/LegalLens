import * as React from 'react';
import { CheckmarkCircleFilled } from '@fluentui/react-icons';
import { IContract } from '../../../models/IContract';
import { IAlert } from '../../../models/IAlert';
import { AlertTile } from './AlertTile';

export interface IAlertsViewProps {
  contracts: IContract[];
}

export const AlertsView: React.FC<IAlertsViewProps> = ({ contracts }) => {
    const alerts: IAlert[] = [];

    // Check for expiring contracts
    contracts.forEach(contract => {
        if (contract.flag === 'Expiring soon') {
        alerts.push({
            id: `expiry-${contract.id}`,
            type: 'expiry',
            severity: 'warning',
            title: 'Contract expiring soon',
            desc: `${contract.name} expires on ${contract.expiry}. Review renewal terms.`,
            time: 'Active'
        });
        }
        if (contract.flag === 'Expired') {
        alerts.push({
            id: `expired-${contract.id}`,
            type: 'expiry',
            severity: 'critical',
            title: 'Contract expired',
            desc: `${contract.name} expired on ${contract.expiry}. Immediate action required.`,
            time: 'Active'
        });
        }
    });

    // Check for high-risk contracts
    contracts.forEach(contract => {
        if (contract.risk >= 70) {
        alerts.push({
            id: `risk-${contract.id}`,
            type: 'conflict',
            severity: 'critical',
            title: 'High-risk contract detected',
            desc: `${contract.name} has risk score of ${contract.risk}. Review flagged clauses.`,
            time: 'Active'
        });
        }
    });

    // Check for duplicates (same parties)
    const partyMap: { [key: string]: string[] } = {};
    contracts.forEach(contract => {
        const key = contract.parties.sort().join('|');
        if (!partyMap[key]) partyMap[key] = [];
        partyMap[key].push(contract.name);
    });
    Object.keys(partyMap).forEach(key => {
        if (partyMap[key].length > 1) {
        alerts.push({
            id: `duplicate-${key}`,
            type: 'duplicate',
            severity: 'warning',
            title: 'Multiple contracts with same parties',
            desc: `Contracts: ${partyMap[key].join(', ')}. Review for conflicts.`,
            time: 'Active'
        });
        }
    });


    return (<div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '24px', fontWeight: 600, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.5px', margin: '0 0 3px' }}>
            Alerts & Conflicts
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            Auto-detected from your contracts: expiry monitoring, risk analysis, duplicate detection
          </p>
        </div>
        {alerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '12px'
          }}>
            <CheckmarkCircleFilled style={{ fontSize: '32px', marginBottom: '10px', color: '#10b981' }} />
            <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>All Clear</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '5px' }}>
              No alerts detected. All contracts are in good standing.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {alerts.map((a, i) => (
              <AlertTile key={i} alert={a} />
            ))}
          </div>
        )}
      </div>
    );
}