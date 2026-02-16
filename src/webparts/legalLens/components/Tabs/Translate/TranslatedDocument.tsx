import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { LANGS } from '../../../constants/languages';

export interface ITranslatedDocumentProps {
  contract: IContract;
  cached: any;
  selectedLanguage: string;
}

export const TranslatedDocument: React.FC<ITranslatedDocumentProps> = ({ contract, cached, selectedLanguage }) => {
    if (selectedLanguage === 'en') {
      return (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🇬🇧</span>
            <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>English — Original Document</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '8.5px', color: '#64748b', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>📝 Contract Summary</span>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#e2e8f0', lineHeight: 1.8 }}>{contract.summary}</p>
            </div>
          </div>

          {contract.clauses.map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#67e8f9', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '4px', padding: '2px 7px' }}>{c.ref}</span>
                <span style={{ fontSize: '8.5px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{c.title}</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#e2e8f0', lineHeight: 1.8 }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const langData = LANGS.find(l => l.code === selectedLanguage);

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🇬🇧</span>
            <div><div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>English</div></div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{langData?.flag}</span>
            <div><div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{langData?.name}</div></div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: '8.5px', color: '#64748b', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>📝 Contract Summary</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '14px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.75 }}>{contract.summary}</p>
            </div>
            <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.02)' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#a5b4fc', lineHeight: 1.75 }}>{cached.summary}</p>
            </div>
          </div>
        </div>

        {contract.clauses.map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '4px', padding: '2px 7px' }}>{c.ref}</span>
              <span style={{ fontSize: '8.5px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{c.title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '13px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.75 }}>{c.text}</p>
              </div>
              <div style={{ padding: '13px 16px', background: 'rgba(99,102,241,0.02)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#a5b4fc', lineHeight: 1.75 }}>{cached.clauses[i]?.translated || '…'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
};
