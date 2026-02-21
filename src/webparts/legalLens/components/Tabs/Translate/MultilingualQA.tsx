import * as React from 'react';
import { Stack, Text } from '@fluentui/react';
import { IContract } from '../../../models/IContract';
import { IAzureAIFoundryService } from '../../../services/AzureAIFoundryService';
import { LANGS } from '../../../constants/languages';
import { BotRegular, InfoRegular, PeopleFilled } from '@fluentui/react-icons';
import styles from './Translate.module.scss';

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

const getLangCode = (lang: string): string => lang.toUpperCase();

export const MultilingualQA: React.FC<IMultilingualQAProps> = ({ contract, aiFoundryService }) => {
    const [qaLanguage, setQaLanguage] = React.useState('en');
    const [qaHistory, setQaHistory] = React.useState<IQAMessage[]>([]);
    const [qaInput, setQaInput] = React.useState('');
    const [qaLoading, setQaLoading] = React.useState(false);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    React.useEffect(() => {
        setQaHistory([]);
        setQaInput('');
    }, [contract.id]);

    const handleLanguageChange = (lang: string): void => {
        setQaLanguage(lang);
        setQaHistory([]);
    };

    const submitMessage = async (question: string): Promise<void> => {
        if (!question || qaLoading) return;

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

    const handleSubmit = async (): Promise<void> => {
        const question = qaInput.trim();
        if (!question) return;
        setQaInput('');
        await submitMessage(question);
    };

    return (
      <Stack className={styles.qaPanel}>
        {/* Header */}
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className={styles.qaHeader}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <div className={styles.qaHeaderIcon}><BotRegular /></div>
            <Stack>
              <Text className={styles.qaTitle}>Q&A Agent - {contract.name}</Text>
              <Text className={styles.qaSubtitle}>Ask in your language · Powered by Azure AI Foundry</Text>
            </Stack>
          </Stack>
          {qaHistory.length > 0 && (
            <button onClick={() => setQaHistory([])} className={styles.qaClearBtn}>
              Clear Chat
            </button>
          )}
        </Stack>

        {/* Language selector */}
        <Stack className={styles.qaLangSection}>
          <Text className={styles.qaLangLabel}>Ask in Your Language</Text>
          <div className={styles.qaLangButtonRow}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                className={styles.qaLangBtnQA}
                style={{
                  background: qaLanguage === l.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${qaLanguage === l.code ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`
                }}
              >
                <div className={styles.qaLangBtnFlag}>{l.flag}</div>
                <div
                  className={styles.qaLangBtnLabel}
                  style={{ color: qaLanguage === l.code ? '#fff' : '#94a3b8' }}
                >{l.label}</div>
              </button>
            ))}
          </div>
        </Stack>

        {/* Messages */}
        <Stack className={styles.qaMessages}>
          {qaHistory.length === 0 ? (
            <Stack horizontalAlign="center" className={styles.qaEmptyState}>
              <InfoRegular className={styles.qaEmptyIcon} />
              <Text className={styles.qaEmptyTitle}>
                No questions yet about {contract.name}
              </Text>
              <Text className={styles.qaEmptyHint}>
                Ask anything in {getLanguageName(qaLanguage)} —<br />
                liability caps, termination, jurisdiction, parties, obligations
              </Text>
            </Stack>
          ) : (
            <Stack tokens={{ childrenGap: 12 }}>
              {qaHistory.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={styles.qaMsgRow}>
                    <div className={isUser ? styles.qaMsgAvatarUser : styles.qaMsgAvatarBot}>
                      {isUser
                        ? <PeopleFilled className={styles.qaMsgIconUser} />
                        : <BotRegular className={styles.qaMsgIconBot} />
                      }
                    </div>
                    <Stack grow={1}>
                      <div className={styles.qaMsgMeta}>
                        <Text className={styles.qaMsgLangCode}>{getLangCode(msg.language)}</Text>
                        <Text className={styles.qaMsgRole}>{isUser ? 'You' : 'Agent'}</Text>
                      </div>
                      <Stack className={isUser ? styles.qaMsgBubbleUser : styles.qaMsgBubbleBot}>
                        <Text className={isUser ? styles.qaMsgTextUser : styles.qaMsgTextBot}>
                          {msg.text}
                        </Text>
                        {msg.citedClauses && msg.citedClauses.length > 0 && (
                          <Stack horizontal verticalAlign="center" className={styles.qaCitedClauses}>
                            <Text>📎</Text>
                            <Text className={styles.qaCitedText}>{msg.citedClauses.join(', ')}</Text>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </div>
                );
              })}
              {qaLoading && (
                <div className={styles.qaMsgRow}>
                  <div className={styles.qaMsgAvatarBot}>🤖</div>
                  <Stack grow={1} className={styles.qaMsgBubbleBot}>
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
                      <div className={styles.qaLoadingDot} />
                      <div className={`${styles.qaLoadingDot} ${styles.qaLoadingDotTwo}`} />
                      <div className={`${styles.qaLoadingDot} ${styles.qaLoadingDotThree}`} />
                      <Text className={styles.qaLoadingText}>Agent is thinking...</Text>
                    </Stack>
                  </Stack>
                </div>
              )}
            </Stack>
          )}
        </Stack>

        {/* Input bar */}
        <Stack className={styles.qaInputBar}>
          <Stack horizontal horizontalAlign='center' tokens={{ childrenGap: 12 }} className={styles.qaExamples}>
            {(EXAMPLE_QUESTIONS[qaLanguage] || EXAMPLE_QUESTIONS.en).map((q, i) => (
              <button
                key={i}
                className={styles.qaExampleBtn}
                onClick={() => submitMessage(q)}
                disabled={qaLoading}
              >
                {q}
              </button>
            ))}
          </Stack>
          <div className={styles.qaInputRow}>
            <div className={styles.qaInputWrap}>
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
                className={styles.qaTextInput}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!qaInput.trim() || qaLoading}
              className={styles.qaSubmitBtn}
              style={{
                background: qaInput.trim() && !qaLoading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: qaInput.trim() && !qaLoading ? '#fff' : '#64748b',
                cursor: qaInput.trim() && !qaLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {qaLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
        </Stack>
      </Stack>
    );
};
