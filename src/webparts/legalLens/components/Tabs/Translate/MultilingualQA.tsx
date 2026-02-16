import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { IAzureAIFoundryService } from '../../../services/AzureAIFoundryService';
import { LANGS } from '../../../constants/languages';
import { BotRegular, InfoRegular, PeopleFilled } from '@fluentui/react-icons';

export interface IQAMessage {
  role: string;
  text: string;
  language: string;
  citedClauses?: string[];
}

export interface IMultilingualQAProps {
  contract: IContract;
  aiFoundryService: IAzureAIFoundryService;
}

const EXAMPLE_QUESTIONS: { [key: string]: string[] } = {
    en: [
        "What is the liability cap?",
        "When does this contract expire?",
        "What are the termination conditions?"
    ],
    de: [
        "Was ist die Haftungsgrenze?",
        "Wann läuft dieser Vertrag ab?",
        "Was sind die Kündigungsbedingungen?"
    ],
    es: [
        "¿Cuál es el límite de responsabilidad?",
        "¿Cuándo expira este contrato?",
        "¿Cuáles son las condiciones de terminación?"
    ]
};

const getLanguageName = (code: string): string => {
    switch (code) {
        case 'de': return 'German';
        case 'es': return 'Spanish';
        default: return 'English';
    }
};

export const MultilingualQA: React.FC<IMultilingualQAProps> = ({ contract, aiFoundryService }) => {
    const [qaLanguage, setQaLanguage] = React.useState('en');
    const [qaHistory, setQaHistory] = React.useState<IQAMessage[]>([]);
    const [qaInput, setQaInput] = React.useState('');
    const [qaLoading, setQaLoading] = React.useState(false);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    // Reset history when contract changes
    React.useEffect(() => {
        setQaHistory([]);
        setQaInput('');
    }, [contract.id]);

    const handleLanguageChange = (lang: string): void => {
        setQaLanguage(lang);
        setQaHistory([]);
    };

    const handleSubmit = async (): Promise<void> => {
        if (!qaInput.trim() || qaLoading) return;

        const question = qaInput.trim();
        setQaInput('');
        setQaLoading(true);

        const newHistory = [...qaHistory, { role: 'user', text: question, language: qaLanguage }];
        setQaHistory(newHistory);

        try {
            const answer = await aiFoundryService.askQuestionMultilingual(
                question, qaLanguage, contract, qaHistory
            );

            if (mountedRef.current) {
                setQaHistory(prev => [...prev, {
                    role: 'assistant',
                    text: answer.answer,
                    language: answer.answerLanguage,
                    citedClauses: answer.citedClauses
                }]);
                setQaLoading(false);
            }
        } catch (error) {
            console.error('Q&A error:', error);
            const errorMsg = qaLanguage === 'de' ? 'Ein Fehler ist aufgetreten.' :
                qaLanguage === 'es' ? 'Ocurrió un error.' :
                    'An error occurred.';

            if (mountedRef.current) {
                setQaHistory(prev => [...prev, {
                    role: 'assistant',
                    text: errorMsg,
                    language: qaLanguage
                }]);
                setQaLoading(false);
            }
        }
    };

    return (
      <div style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.4), 0 0 40px rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#818cf8' }}><BotRegular /></div>
            <div>
              <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>Q&A Agent - {contract.name}</div>
              <div style={{ fontSize: '8.5px', color: '#64748b' }}>Ask in your language · Powered by Azure AI Foundry</div>
            </div>
          </div>
          {qaHistory.length > 0 && (
            <button onClick={() => setQaHistory([])} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '9px', fontWeight: 600, outline: 'none' }}>
              Clear Chat
            </button>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <label style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Ask in Your Language
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                style={{
                  flex: 1,
                  background: qaLanguage === l.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${qaLanguage === l.code ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  outline: 'none',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '1px', color: '#ffffff' }}>{l.flag}</div>
                <div style={{ fontSize: '7.5px', color: qaLanguage === l.code ? '#fff' : '#94a3b8', fontWeight: 600 }}>{l.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
          {qaHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <InfoRegular style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.25, color: '#94a3b8' }} />
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                No questions yet about {contract.name}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b', lineHeight: 1.6 }}>
                Ask anything in {getLanguageName(qaLanguage)} —<br />
                liability caps, termination, jurisdiction, parties, obligations
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {qaHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    minWidth: '28px',
                    borderRadius: '50%',
                    background: msg.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(6,182,212,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}>
                    {msg.role === 'user' ? <PeopleFilled style={{ fontSize: '14px', color: '#67e8f9' }} /> : <BotRegular style={{ fontSize: '14px', color: '#818cf8' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '8px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700 }}>{msg.language === 'de' ? 'DE' : msg.language === 'es' ? 'ES' : 'EN'}</span>
                      <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.8px' }}>
                        {msg.role === 'user' ? 'You' : 'Agent'}
                      </span>
                    </div>
                    <div style={{
                      background: msg.role === 'user' ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '10px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ fontSize: '11px', color: msg.role === 'user' ? '#67e8f9' : '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </div>
                      {msg.citedClauses && msg.citedClauses.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '9px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📎</span>
                          <span>{msg.citedClauses.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {qaLoading && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🤖</div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 1.5s ease infinite' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 1.5s ease infinite 0.2s' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 1.5s ease infinite 0.4s' }} />
                      <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '6px' }}>Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.02)' }}>
          <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={qaInput}
                onChange={e => setQaInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                placeholder={
                  qaLanguage === 'de' ? 'Stellen Sie Ihre Frage...' :
                    qaLanguage === 'es' ? 'Haz tu pregunta...' :
                      'Type your question...'
                }
                disabled={qaLoading}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 10px',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!qaInput.trim() || qaLoading}
              style={{
                background: qaInput.trim() && !qaLoading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                color: qaInput.trim() && !qaLoading ? '#fff' : '#64748b',
                borderRadius: '8px',
                padding: '10px 5px',
                cursor: qaInput.trim() && !qaLoading ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minWidth: '70px'
              }}
            >
              {qaLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '8.5px', color: '#64748b' }}>
            💡 {(EXAMPLE_QUESTIONS[qaLanguage] || EXAMPLE_QUESTIONS.en).join(' • ')}
          </div>
        </div>
      </div>
    );
};
