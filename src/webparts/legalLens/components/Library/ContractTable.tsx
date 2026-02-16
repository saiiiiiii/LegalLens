import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { DocumentRegular } from '@fluentui/react-icons';
import { IContract } from '../../models/IContract';

export interface IContractTableProps {
  contracts: IContract[];
}

export const ContractTable: React.FC<IContractTableProps> = ({ contracts }) => {
  
  const riskColor = (risk: number): string => {
    if (risk >= 70) return '#ef4444';
    if (risk >= 40) return '#f59e0b';
    return '#10b981';
  };

  const statusColor = (status: string): string => {
    if (status === 'critical') return '#ef4444';
    if (status === 'warning') return '#f59e0b';
    return '#10b981';
  };

  const columns: IColumn[] = [
    {
      key: 'name',
      name: 'Contract',
      fieldName: 'name',
      minWidth: 200,
      maxWidth: 350,
      isResizable: true,
      onRender: (item: IContract) => (
        <div>
          <div style={{ 
            fontSize: '12px', 
            color: '#e2e8f0', 
            fontWeight: 500, 
            marginBottom: '1px' 
          }}>
            {item.name}
          </div>
          <div style={{ fontSize: '9px', color: '#64748b' }}>
            Expires: {item.expiry}
          </div>
        </div>
      )
    },
    {
      key: 'type',
      name: 'Type',
      fieldName: 'type',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: IContract) => (
        <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
          {item.type}
        </span>
      )
    },
    {
      key: 'jurisdiction',
      name: 'Jurisdiction',
      fieldName: 'jurisdiction',
      minWidth: 100,
      maxWidth: 130,
      isResizable: true,
      onRender: (item: IContract) => (
        <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
          {item.jurisdiction}
        </span>
      )
    },
    {
      key: 'risk',
      name: 'Risk',
      fieldName: 'risk',
      minWidth: 70,
      maxWidth: 90,
      isResizable: true,
      isSorted: false,
      isSortedDescending: false,
      onRender: (item: IContract) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ 
            width: '24px', 
            height: '3px', 
            borderRadius: '2px', 
            background: 'rgba(255,255,255,0.08)', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${item.risk}%`, 
              height: '100%', 
              background: riskColor(item.risk), 
              borderRadius: '2px' 
            }} />
          </div>
          <span style={{ 
            fontSize: '8.5px', 
            color: riskColor(item.risk), 
            fontWeight: 600 
          }}>
            {item.risk}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 90,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: IContract) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            width: '5px', 
            height: '5px', 
            borderRadius: '50%', 
            background: statusColor(item.status) 
          }} />
          <span style={{ 
            fontSize: '9.5px', 
            color: statusColor(item.status), 
            textTransform: 'capitalize' 
          }}>
            {item.status}
          </span>
          {item.flag && (
            <span style={{ 
              fontSize: '7.5px', 
              background: 'rgba(245,158,11,0.12)', 
              color: '#f59e0b', 
              borderRadius: '3px', 
              padding: '1px 4px', 
              marginLeft: '3px' 
            }}>
              {item.flag}
            </span>
          )}
        </div>
      )
    }
  ];

  if (contracts.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: 'rgba(255,255,255,0.03)', 
        backdropFilter: 'blur(10px)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '16px',
        color: '#64748b' 
      }}>
        <DocumentRegular style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
        <div style={{ fontSize: '13px', marginBottom: '8px' }}>
          No contracts match this filter
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)', 
      backdropFilter: 'blur(10px)', 
      WebkitBackdropFilter: 'blur(10px)', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: '16px', 
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
      overflow: 'hidden' 
    }}>
      <DetailsList
        items={contracts}
        columns={columns}
        selectionMode={SelectionMode.none}
        layoutMode={DetailsListLayoutMode.justified}
        isHeaderVisible={true}
        styles={{
          root: {
            '.ms-DetailsHeader': {
              paddingTop: '0px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))',
              backdropFilter: 'blur(10px)'
            },
            '.ms-DetailsHeader-cell': {
              fontSize: '8px',
              color: '#64748b',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              fontWeight: 600,
              height: '40px',
              lineHeight: '40px'
            },
            '.ms-DetailsRow': {
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              minHeight: '52px',
              background: 'transparent'
            },
            '.ms-DetailsRow:hover': {
              background: 'rgba(255,255,255,0.02)'
            },
            '.ms-DetailsRow-cell': {
              display: 'flex',
              alignItems: 'center'
            }
          }
        }}
      />
    </div>
  );
};