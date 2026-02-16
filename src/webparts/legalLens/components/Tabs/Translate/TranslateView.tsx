import * as React from 'react';
import { IContract } from "../../../models/IContract";
import { LANGS } from '../../../constants';
import { LocalLanguage24Regular } from '@fluentui/react-icons';
import { TranslatedDocument } from './TranslatedDocument';
import { MultilingualQA } from './MultilingualQA';
import { IAzureAIFoundryService } from '../../../services/AzureAIFoundryService';

export interface ITranslateViewProps {
  contracts: IContract[];
  aiFoundryService: IAzureAIFoundryService;
}

interface ITranslationCache {
  [key: string]: { summary: string; clauses: any[] };
}

export const TranslateView: React.FC<ITranslateViewProps> = ({ contracts, aiFoundryService }) => {
    const [selectedContract, setSelectedContract] = React.useState(0);
    const [selectedLang, setSelectedLang] = React.useState('en');
    const [translating, setTranslating] = React.useState(false);
    const [translateProgress, setTranslateProgress] = React.useState(0);
    const [translateError, setTranslateError] = React.useState<string | null>(null);
    const [cache, setCache] = React.useState<ITranslationCache>({});
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    // Auto-populate English cache (original document, no translation needed)
    React.useEffect(() => {
        if (contracts.length === 0) return;
        const contract = contracts[selectedContract];
        const cacheKey = `${selectedContract}-en`;
        setCache(prev => {
            if (prev[cacheKey]) return prev;
            return {
                ...prev,
                [cacheKey]: {
                    summary: contract.summary,
                    clauses: contract.clauses.map(c => ({ ref: c.ref, translated: `${c.title}: ${c.text}` }))
                }
            };
        });
    }, [selectedContract, contracts]);

    const runTranslation = async (): Promise<void> => {
        const cacheKey = `${selectedContract}-${selectedLang}`;

        if (cache[cacheKey]) return;

        const contract = contracts[selectedContract];

        if (selectedLang === 'en') {
            setCache(prev => ({
                ...prev,
                [cacheKey]: {
                    summary: contract.summary,
                    clauses: contract.clauses.map(c => ({ ref: c.ref, translated: `${c.title}: ${c.text}` }))
                }
            }));
            return;
        }

        setTranslating(true);
        setTranslateProgress(0);
        setTranslateError(null);

        try {
            const transSummary = await aiFoundryService.translate(
                contract.summary, selectedLang, contract.name
            );

            if (mountedRef.current) setTranslateProgress(1);

            const transClauses: Array<{ ref: string; translated: string }> = [];
            for (let i = 0; i < contract.clauses.length; i++) {
                const c = contract.clauses[i];
                const translated = await aiFoundryService.translate(
                    `${c.title}: ${c.text}`, selectedLang, contract.name
                );
                transClauses.push({ ref: c.ref, translated });

                if (mountedRef.current) {
                    setTranslateProgress(2 + (i / contract.clauses.length));
                }
            }

            if (mountedRef.current) {
                setCache(prev => ({
                    ...prev,
                    [cacheKey]: { summary: transSummary, clauses: transClauses }
                }));
                setTranslateProgress(3);
                setTranslating(false);
            }
        } catch (error) {
            console.error('Translation error:', error);
            if (mountedRef.current) {
                setTranslateError('Translation failed. Please try again.');
                setTranslating(false);
            }
        }
    };

    if (contracts.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No contracts available</div>;
    }

    const cacheKey = `${selectedContract}-${selectedLang}`;
    const cached = cache[cacheKey];
    const contract = contracts[selectedContract];

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '24px', fontWeight: 600, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.5px', margin: 0 }}>
              TranslatePro
            </h2>
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.4), 0 0 40px rgba(139,92,246,0.2)', color: '#fff', borderRadius: '4px', padding: '2px 7px' }}>
              AI POWERED
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            Live legal translation via Azure AI Foundry · Multilingual Q&A · Preserves clause references
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Select Contract
              </label>
              <select
                value={selectedContract}
                onChange={e => setSelectedContract(Number(e.target.value))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 34px 9px 12px', color: '#e2e8f0', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
              >
                {contracts.map((c, i) => (
                  <option key={i} value={i} style={{ background: '#1e293b', color: '#e2e8f0' }}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '230px' }}>
              <label style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Translation Language
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {LANGS.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setSelectedLang(l.code)}
                    style={{
                      flex: 1,
                      background: selectedLang === l.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${selectedLang === l.code ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '8px 6px',
                      cursor: 'pointer',
                      outline: 'none',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '2px', color: '#ffffff' }}>{l.flag}</div>
                    <div style={{ fontSize: '8.5px', color: selectedLang === l.code ? '#fff' : '#94a3b8', fontWeight: 600 }}>{l.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runTranslation}
              disabled={translating || !!cached}
              style={{
                background: cached ? 'rgba(16,185,129,0.1)' : translating ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: cached ? '1px solid rgba(16,185,129,0.3)' : translating ? '1px solid rgba(99,102,241,0.3)' : 'none',
                color: cached ? '#10b981' : translating ? '#818cf8' : '#fff',
                borderRadius: '8px',
                padding: '9px 20px',
                cursor: translating || cached ? 'default' : 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              {translating ? <>⏳ Translating...</> : cached ? <>✓ Cached</> : <>🌐 Translate</>}
            </button>
          </div>

          {translateError && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', padding: '8px 12px' }}>
              ⚠ {translateError}
            </div>
          )}
        </div>

        {translating && (
          <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10.5px', color: '#818cf8', fontWeight: 600 }}>Translating contract...</span>
              <span style={{ fontSize: '9px', color: '#64748b' }}>{Math.round((translateProgress / 3) * 100)}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${(translateProgress / 3) * 100}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {cached ? (
          <div>
            <TranslatedDocument contract={contract} cached={cached} selectedLanguage={selectedLang} />
            <MultilingualQA contract={contract} aiFoundryService={aiFoundryService} />
          </div>
        ) : !translating && (
          <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '44px 24px', textAlign: 'center' }}>
            <LocalLanguage24Regular style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2, color: '#94a3b8' }} />
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Select a contract and language above</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>AI will translate the summary and all key clauses in real-time.</div>
          </div>
        )}
      </div>
    );
}
