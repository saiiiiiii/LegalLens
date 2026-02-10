import * as React from 'react';
import type { ILegalLensProps, IContract } from './ILegalLensProps';
import { IContractAnalysis, IClassificationResult } from '../services/AzureAIFoundryService';

// Sample alerts data
// LANGS configuration for multilingual support
const LANGS = [
  { code: 'en', name: 'English', flag: '🇬🇧', label: 'English' },
  { code: 'de', name: 'German', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', label: 'Español' }
];

const CLASSIFICATION_TYPES = [
  { value: 'contract-type', label: 'Contract Type (NDA, MSA, SLA, etc.)' },
  { value: 'compliance', label: 'Compliance Framework (GDPR, SOC2, HIPAA)' },
  { value: 'industry', label: 'Industry Sector (Legal, Healthcare, Finance)' },
  { value: 'risk', label: 'Risk Category (Low, Medium, High)' }
];

export interface ILegalLensState {
  view: 'library' | 'upload' | 'classify' | 'translate' | 'alerts';
  contracts: IContract[];
  loading: boolean;
  error: string | null;
  
  // Upload & Analysis
  uploadView: 'select' | 'analyzing' | 'results';
  uploadedFile: File | null;
  uploadedFileName: string;
  analysisResult: IContractAnalysis | null;
  analyzingProgress: number;
  analyzeError: string | null;
  
  // Classification
  classificationView: 'select' | 'classifying' | 'results';
  selectedFileForClassification: number;
  classificationType: string;
  classificationResult: IClassificationResult | null;
  classifying: boolean;
  classifyError: string | null;
  
  // Translation state
  selContract: number;
  selLang: string;
  translating: boolean;
  translateProgress: number;
  cache: { [key: string]: { summary: string; clauses: any[] } };
  translateError: string | null;
  
  // Q&A state (multilingual)
  qaLanguage: string;
  qaHistory: Array<{ role: string; text: string; language: string; citedClauses?: string[] }>;
  qaInput: string;
  qaLoading: boolean;
  
  pulseAlert: boolean;
}

export default class LegalLens extends React.Component<ILegalLensProps, ILegalLensState> {
  private pulseInterval: any;
  private _isMounted: boolean;
  private fileInputRef: React.RefObject<HTMLInputElement>;

  constructor(props: ILegalLensProps) {
    super(props);
    
    this.state = {
      view: 'library',
      contracts: [],
      loading: true,
      error: null,
      
      uploadView: 'select',
      uploadedFile: null,
      uploadedFileName: '',
      analysisResult: null,
      analyzingProgress: 0,
      analyzeError: null,
      
      classificationView: 'select',
      selectedFileForClassification: 0,
      classificationType: 'contract-type',
      classificationResult: null,
      classifying: false,
      classifyError: null,
      
      selContract: 0,
      selLang: 'en',
      translating: false,
      translateProgress: 0,
      cache: {},
      translateError: null,
      
      qaLanguage: 'en',
      qaHistory: [],
      qaInput: '',
      qaLoading: false,
      
      pulseAlert: false
    };
    
    this._isMounted = false;
    this.fileInputRef = React.createRef();
    
    // Bind methods
    this.loadContracts = this.loadContracts.bind(this);
    this.runTranslation = this.runTranslation.bind(this);
    this.handleMultilingualQuestion = this.handleMultilingualQuestion.bind(this);
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.handleClassification = this.handleClassification.bind(this);
    this.riskColor = this.riskColor.bind(this);
    this.statusColor = this.statusColor.bind(this);
  }

  public componentDidMount(): void {
    this._isMounted = true;
    this.loadContracts();
    this.pulseInterval = setInterval(() => {
      if (this._isMounted) {
        this.setState(prev => ({ pulseAlert: !prev.pulseAlert }));
      }
    }, 2200);
  }

  public componentWillUnmount(): void {
    this._isMounted = false;
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
  }

  private async loadContracts(): Promise<void> {
    try {
      if (this._isMounted) {
        this.setState({ loading: true, error: null });
      }
      
      const contracts = await this.props.sharePointService.getContracts();
      
      if (this._isMounted) {
        this.setState({ contracts, loading: false });
        
        // Auto-populate English cache
        const cache: any = {};
        contracts.forEach((contract, idx) => {
          const key = `${idx}-en`;
          cache[key] = {
            summary: contract.summary,
            clauses: contract.clauses.map(c => ({ ref: c.ref, translated: `${c.title}: ${c.text}` }))
          };
        });
        this.setState({ cache });
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      if (this._isMounted) {
        this.setState({ 
          loading: false, 
          error: 'Failed to load contracts. Please check configuration and try again.' 
        });
      }
    }
  }

  private async runTranslation(): Promise<void> {
    const { selContract, selLang, cache, contracts } = this.state;
    const cacheKey = `${selContract}-${selLang}`;
    
    if (cache[cacheKey]) return;

    if (selLang === 'en') {
      const contract = contracts[selContract];
      if (this._isMounted) {
        this.setState(prev => ({
          cache: {
            ...prev.cache,
            [cacheKey]: {
              summary: contract.summary,
              clauses: contract.clauses.map(c => ({ ref: c.ref, translated: `${c.title}: ${c.text}` }))
            }
          }
        }));
      }
      return;
    }

    if (this._isMounted) {
      this.setState({ translating: true, translateProgress: 0, translateError: null });
    }
    
    const contract = contracts[selContract];

    try {
      const transSummary = await this.props.aiFoundryService.translate(
        contract.summary,
        selLang,
        contract.name
      );
      
      if (this._isMounted) {
        this.setState({ translateProgress: 1 });
      }

      const transClauses: Array<{ ref: string; translated: string }> = [];
      for (let i = 0; i < contract.clauses.length; i++) {
        const c = contract.clauses[i];
        const translated = await this.props.aiFoundryService.translate(
          `${c.title}: ${c.text}`,
          selLang,
          contract.name
        );
        transClauses.push({ ref: c.ref, translated });
        
        if (this._isMounted) {
          this.setState({ translateProgress: 2 + (i / contract.clauses.length) });
        }
      }

      if (this._isMounted) {
        this.setState(prev => ({
          cache: {
            ...prev.cache,
            [cacheKey]: { summary: transSummary, clauses: transClauses }
          },
          translateProgress: 3,
          translating: false
        }));
      }
    } catch (error) {
      console.error('Translation error:', error);
      if (this._isMounted) {
        this.setState({ translateError: 'Translation failed. Please try again.', translating: false });
      }
    }
  }

  private async handleMultilingualQuestion(): Promise<void> {
    const { qaInput, qaLanguage, contracts, selContract, qaHistory } = this.state;
    
    if (!qaInput.trim() || this.state.qaLoading) return;

    const question = qaInput.trim();
    
    if (this._isMounted) {
      this.setState({ qaInput: '', qaLoading: true });
    }

    const newHistory = [...qaHistory, { role: 'user', text: question, language: qaLanguage }];
    
    if (this._isMounted) {
      this.setState({ qaHistory: newHistory });
    }

    try {
      const answer = await this.props.aiFoundryService.askQuestionMultilingual(
        question,
        qaLanguage,
        contracts[selContract],
        qaHistory
      );
      
      if (this._isMounted) {
        this.setState(prev => ({
          qaHistory: [...prev.qaHistory, {
            role: 'assistant',
            text: answer.answer,
            language: answer.answerLanguage,
            citedClauses: answer.citedClauses
          }],
          qaLoading: false
        }));
      }
    } catch (error) {
      console.error('Q&A error:', error);
      const errorMsg = qaLanguage === 'de' ? 'Ein Fehler ist aufgetreten.' :
                       qaLanguage === 'es' ? 'Ocurrió un error.' :
                       'An error occurred.';
      
      if (this._isMounted) {
        this.setState(prev => ({
          qaHistory: [...prev.qaHistory, { 
            role: 'assistant', 
            text: errorMsg,
            language: qaLanguage
          }],
          qaLoading: false
        }));
      }
    }
  }

  private async handleFileUpload(file: File | null): Promise<void> {
    if (!file) return;
    
    if (this._isMounted) {
      this.setState({ 
        uploadedFile: file,
        uploadedFileName: file.name,
        uploadView: 'analyzing',
        analyzingProgress: 0,
        analyzeError: null
      });
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (this._isMounted) {
          this.setState(prev => ({
            analyzingProgress: Math.min(prev.analyzingProgress + 10, 90)
          }));
        }
      }, 500);

      const result = await this.props.aiFoundryService.analyzeContract(file, file.name);
      
      clearInterval(progressInterval);
      
      if (this._isMounted) {
        this.setState({
          analysisResult: result,
          analyzingProgress: 95,
          uploadView: 'results'
        });
      }

      // Save to SharePoint library
      try {
        await this.props.sharePointService.saveAnalyzedContract(file.name, file, result);
        
        if (this._isMounted) {
          this.setState({ analyzingProgress: 100 });
        }

        // Refresh contracts list to show newly uploaded document
        setTimeout(() => {
          this.loadContracts();
        }, 2000);

      } catch (saveError) {
        console.warn('Analysis complete but failed to save to SharePoint:', saveError);
        // Still show results even if save failed
        if (this._isMounted) {
          this.setState({ analyzingProgress: 100 });
        }
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      if (this._isMounted) {
        this.setState({
          analyzeError: 'Analysis failed. Please try again.',
          uploadView: 'select'
        });
      }
    }
  }

  private async handleClassification(): Promise<void> {
    const { selectedFileForClassification, classificationType, contracts } = this.state;
    const contract = contracts[selectedFileForClassification];
    
    if (!contract || !contract.fileUrl) {
      if (this._isMounted) {
        this.setState({ classifyError: 'Contract file not available' });
      }
      return;
    }
    
    if (this._isMounted) {
      this.setState({ classifying: true, classificationView: 'classifying', classifyError: null });
    }
    
    try {
      const fileBlob = await this.props.sharePointService.getContractFile(contract.fileUrl);
      const result = await this.props.aiFoundryService.classifyDocument(
        fileBlob,
        contract.name,
        classificationType
      );
      
      if (this._isMounted) {
        this.setState({ 
          classificationResult: result,
          classifying: false,
          classificationView: 'results'
        });
      }
    } catch (error) {
      console.error('Classification error:', error);
      if (this._isMounted) {
        this.setState({ 
          classifying: false,
          classificationView: 'select',
          classifyError: 'Classification failed. Please try again.'
        });
      }
    }
  }

  private riskColor(r: number): string {
    return r >= 50 ? '#ef4444' : r >= 25 ? '#f59e0b' : '#10b981';
  }

  private statusColor(s: string): string {
    return s === 'compliant' ? '#10b981' : s === 'warning' ? '#f59e0b' : '#ef4444';
  }

  private getRiskScoreColor(score: number): string {
    if (score >= 70) return 'rgba(239,68,68,0.2)';
    if (score >= 40) return 'rgba(245,158,11,0.2)';
    return 'rgba(16,185,129,0.2)';
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private getClauseRiskColor(level: string): string {
    switch (level) {
      case 'high': return 'rgba(239,68,68,0.15)';
      case 'medium': return 'rgba(245,158,11,0.15)';
      case 'low': return 'rgba(16,185,129,0.15)';
      default: return 'rgba(255,255,255,0.05)';
    }
  }

  private getExampleQuestions(lang: string): string[] {
    const examples: { [key: string]: string[] } = {
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
    return examples[lang] || examples.en;
  }

  public render(): React.ReactElement<ILegalLensProps> {
    const { view, loading, error, pulseAlert } = this.state;

    if (loading) {
      return (
        <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060d1a' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '13px', color: '#8899aa' }}>Loading contracts...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '40px 24px', background: '#060d1a', borderRadius: '12px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '16px', color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>Error Loading Contracts</div>
            <div style={{ fontSize: '13px', color: '#8899aa', marginBottom: '20px' }}>{error}</div>
            <button onClick={() => this.loadContracts()} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: '#060d1a', color: '#c2cdd8', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
          @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
          @keyframes spin{to{transform:rotate(360deg)}}
          .nav-btn:hover{background:rgba(16,185,129,0.08)!important;color:#fff!important}
          .card-row:hover{background:rgba(255,255,255,0.03)!important}
        `}</style>

        {/* Header */}
        <header style={{ background: '#07101f', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '32px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>⚖</span>
            </div>
            <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '18px', fontWeight: 400, color: '#fff', letterSpacing: '-0.3px' }}>LegalLens</span>
          </div>

          <nav style={{ display: 'flex', gap: '3px', flex: 1 }}>
            {[
              { key: 'library', label: 'Library', icon: '📂' },
              { key: 'upload', label: 'Upload & Analyze', icon: '📤', highlight: true },
              { key: 'classify', label: 'Classification', icon: '🏷️' },
              { key: 'translate', label: 'TranslatePro', icon: '🌐' },
              { key: 'alerts', label: 'Alerts', icon: '⚠' }
            ].map(n => (
              <button 
                key={n.key}
                className="nav-btn"
                onClick={() => this.setState({ view: n.key as any })}
                style={{
                  background: view === n.key ? (n.highlight ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  border: 'none',
                  color: view === n.key ? (n.highlight ? '#818cf8' : '#10b981') : '#5a6a7e',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  outline: 'none',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: '12px' }}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: '9.5px', color: '#5a6a7e' }}>Knowledge Agent Active</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
            {this.renderView()}
          </div>
        </main>
      </div>
    );
  }

  private renderView(): React.ReactElement {
    switch (this.state.view) {
      case 'library': return this.renderLibrary();
      case 'upload': return this.renderUpload();
      case 'classify': return this.renderClassify();
      case 'translate': return this.renderTranslate();
      case 'alerts': return this.renderAlerts();
      default: return this.renderLibrary();
    }
  }

  private renderLibrary(): React.ReactElement {
    const { contracts } = this.state;
    // Get all unique tags
    const allTagsArray: string[] = [];
    contracts.forEach((c: IContract) => {
      c.tags.forEach(tag => {
        if (allTagsArray.indexOf(tag) === -1) {
          allTagsArray.push(tag);
        }
      });
    });
    const allTags = allTagsArray;

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '21px', fontWeight: 400, color: '#fff', margin: '0 0 3px' }}>
              Governed Contract Library
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#5a6a7e' }}>
              Auto-classified · Metadata enriched · Compliance monitored
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { l: 'Total', v: contracts.length.toString(), c: '#06b6d4' },
              { l: 'Compliant', v: contracts.filter(c => c.status === 'compliant').length.toString(), c: '#10b981' },
              { l: 'Warnings', v: contracts.filter(c => c.status === 'warning').length.toString(), c: '#f59e0b' },
              { l: 'Alerts', v: contracts.filter(c => c.flag === 'Expiring soon' || c.flag === 'Expired' || c.risk >= 70).length.toString(), c: '#ef4444' }
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '7px 12px', textAlign: 'center', minWidth: '62px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: s.c, lineHeight: 1.2 }}>{s.v}</div>
                <div style={{ fontSize: '8px', color: '#5a6a7e', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '1px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 80px 100px', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            {['Contract', 'Type', 'Jurisdiction', 'Risk', 'Status'].map(h => (
              <span key={h} style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>{h}</span>
            ))}
          </div>
          {contracts.map((c, i) => (
            <div key={c.id} className="card-row" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 130px 110px 80px 100px', 
              padding: '11px 16px', 
              borderBottom: i < contracts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', 
              alignItems: 'center', 
              transition: 'background 0.2s',
              animation: `fadeIn 0.3s ease ${i * 0.07}s both`
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500, marginBottom: '1px' }}>{c.name}</div>
                <div style={{ fontSize: '9px', color: '#4a5568' }}>Expires: {c.expiry}</div>
              </div>
              <span style={{ fontSize: '10.5px', color: '#8899aa' }}>{c.type}</span>
              <span style={{ fontSize: '10.5px', color: '#8899aa' }}>{c.jurisdiction}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${c.risk}%`, height: '100%', background: this.riskColor(c.risk), borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '8.5px', color: this.riskColor(c.risk), fontWeight: 600 }}>{c.risk}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: this.statusColor(c.status) }} />
                <span style={{ fontSize: '9.5px', color: this.statusColor(c.status), textTransform: 'capitalize' }}>{c.status}</span>
                {c.flag && (
                  <span style={{ fontSize: '7.5px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderRadius: '3px', padding: '1px 4px', marginLeft: '3px' }}>
                    {c.flag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '8.5px', color: '#4a5568' }}>Auto-tagged:</span>
            {allTags.map(t => (
              <span key={t} style={{ fontSize: '8.5px', fontFamily: 'monospace', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: '3px', padding: '2px 6px', color: '#67e8f9' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  private renderAlerts(): React.ReactElement {
    // Generate alerts dynamically from contract data
    const alerts: any[] = [];
    const contracts = this.state.contracts;
    
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

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '21px', fontWeight: 400, color: '#fff', margin: '0 0 3px' }}>
            Alerts & Conflicts
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#5a6a7e' }}>
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
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>All Clear</div>
            <div style={{ fontSize: '10px', color: '#5a6a7e', marginTop: '5px' }}>
              No alerts detected. All contracts are in good standing.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {alerts.map((a, i) => (
              <div key={a.id} style={{ 
                background: a.severity === 'critical' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)', 
                border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, 
                borderRadius: '12px', 
                padding: '16px',
                animation: `fadeIn 0.3s ease ${i * 0.1}s both`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '26px', 
                      height: '26px', 
                      borderRadius: '7px', 
                      background: a.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '13px' 
                    }}>
                      {a.type === 'duplicate' ? '📋' : a.type === 'conflict' ? '⚡' : '⏰'}
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', color: '#fff', fontWeight: 600 }}>{a.title}</div>
                      <span style={{ 
                        fontSize: '8px', 
                        fontWeight: 700, 
                        letterSpacing: '0.8px', 
                        textTransform: 'uppercase', 
                        color: a.severity === 'critical' ? '#ef4444' : '#f59e0b', 
                        background: a.severity === 'critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)', 
                        borderRadius: '3px', 
                        padding: '1px 5px' 
                      }}>
                        {a.severity}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '8.5px', color: '#5a6a7e' }}>{a.time}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#8899aa', lineHeight: 1.7 }}>{a.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  private renderUpload(): React.ReactElement {
    const { uploadView, uploadedFileName, analysisResult, analyzingProgress, analyzeError } = this.state;

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '21px', fontWeight: 400, color: '#fff', margin: 0 }}>
              Upload & Analyze Contract
            </h2>
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', borderRadius: '4px', padding: '2px 7px' }}>
              AI POWERED
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#5a6a7e' }}>
            Upload contract for instant risk & clause analysis · Powered by Azure AI Foundry
          </p>
        </div>

        {analyzeError && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', color: '#f87171', fontSize: '11px' }}>
            ⚠ {analyzeError}
          </div>
        )}

        {uploadView === 'select' && (
          <div>
            <div 
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) this.handleFileUpload(file);
              }}
              onDragOver={e => e.preventDefault()}
              style={{ 
                border: '2px dashed rgba(99,102,241,0.4)',
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                background: 'rgba(99,102,241,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => this.fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>📄</div>
              <div style={{ fontSize: '14px', color: '#c2cdd8', fontWeight: 600, marginBottom: '8px' }}>
                Drag & drop contract file here
              </div>
              <div style={{ fontSize: '11px', color: '#5a6a7e', marginBottom: '16px' }}>
                or click to browse
              </div>
              <div style={{ fontSize: '10px', color: '#4a5568' }}>
                Supported: PDF, DOCX · Max size: 10MB
              </div>
              <input 
                ref={this.fileInputRef}
                type="file" 
                accept=".pdf,.docx"
                onChange={e => this.handleFileUpload(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ margin: '24px 0', textAlign: 'center', color: '#5a6a7e', fontSize: '11px' }}>
              — OR —
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#5a6a7e', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Select from Library
              </label>
              <select 
                onChange={async e => {
                  const idx = Number(e.target.value);
                  if (idx >= 0) {
                    const contract = this.state.contracts[idx];
                    if (contract.fileUrl) {
                      const blob = await this.props.sharePointService.getContractFile(contract.fileUrl);
                      const file = new File([blob], contract.name, { type: 'application/pdf' });
                      this.handleFileUpload(file);
                    }
                  }
                }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="-1">Choose contract from library...</option>
                {this.state.contracts.map((c, i) => (
                  <option key={i} value={i}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {uploadView === 'analyzing' && (
          <div>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: '#c2cdd8', fontWeight: 600, marginBottom: '16px' }}>
                Analyzing: {uploadedFileName}
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#5a6a7e' }}>Processing...</span>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{analyzingProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${analyzingProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { step: 'Extracting text', done: analyzingProgress > 20 },
                  { step: 'Identifying entities', done: analyzingProgress > 40 },
                  { step: 'Analyzing clauses', done: analyzingProgress > 60 },
                  { step: 'Calculating risk score', done: analyzingProgress > 80 }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      border: '2px solid ' + (item.done ? '#10b981' : 'rgba(255,255,255,0.2)'),
                      background: item.done ? '#10b981' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      transition: 'all 0.3s'
                    }}>
                      {item.done && <span style={{ color: '#fff' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: item.done ? '#c2cdd8' : '#5a6a7e' }}>
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {uploadView === 'results' && analysisResult && (
          <div>
            {/* Success message */}
            <div style={{ 
              padding: '12px 16px', 
              background: 'rgba(16,185,129,0.1)', 
              border: '1px solid rgba(16,185,129,0.3)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  Analysis Complete & Saved to SharePoint
                </div>
                <div style={{ fontSize: '9px', color: '#5a6a7e' }}>
                  Document uploaded to library with metadata · Refresh library view to see it
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '24px',
              background: this.getRiskScoreColor(analysisResult.overallRiskScore),
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#5a6a7e', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Overall Risk Score
              </div>
              <div style={{ fontSize: '64px', fontWeight: 700, color: analysisResult.overallRiskScore >= 70 ? '#ef4444' : analysisResult.overallRiskScore >= 40 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>
                {analysisResult.overallRiskScore}
              </div>
              <div style={{ fontSize: '18px', color: '#8899aa' }}>/ 100</div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#c2cdd8' }}>
                {analysisResult.overallRiskScore >= 70 ? '🔴 High Risk' : analysisResult.overallRiskScore >= 40 ? '🟠 Medium Risk' : '🟢 Low Risk'}
              </div>
            </div>

            {analysisResult.riskFactors && analysisResult.riskFactors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                  📊 Risk Factors ({analysisResult.riskFactors.length})
                </h3>
                {analysisResult.riskFactors.map((factor, i) => (
                  <div key={i} style={{ 
                    padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ fontSize: '24px', lineHeight: 1 }}>
                        {this.getSeverityIcon(factor.severity)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                          {factor.severity} - {factor.factor}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8899aa', marginBottom: '8px', lineHeight: 1.6 }}>
                          {factor.description}
                        </div>
                        <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>→</span>
                          <span>{factor.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                📝 Clauses ({analysisResult.clauses.length})
              </h3>
              {analysisResult.clauses.map((clause, i) => (
                <div key={i} style={{ 
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#c2cdd8', fontWeight: 600, marginBottom: '2px' }}>
                      {clause.ref} — {clause.title}
                    </div>
                    {clause.riskReason && (
                      <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '4px' }}>
                        ⚠ {clause.riskReason}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    padding: '4px 12px',
                    borderRadius: '4px',
                    background: this.getClauseRiskColor(clause.riskLevel),
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: clause.riskLevel === 'high' ? '#ef4444' : clause.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                  }}>
                    {clause.riskLevel}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => this.setState({ uploadView: 'select', analysisResult: null })}
                style={{ 
                  flex: 1,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                Analyze Another Contract
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  private renderClassify(): React.ReactElement {
    const { classificationView, selectedFileForClassification, classificationType, classificationResult, classifying, classifyError, contracts } = this.state;

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '21px', fontWeight: 400, color: '#fff', margin: '0 0 3px' }}>
            Document Classification
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#5a6a7e' }}>
            AI-powered classification with compliance detection · Confidence scoring
          </p>
        </div>

        {classifyError && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', color: '#f87171', fontSize: '11px' }}>
            ⚠ {classifyError}
          </div>
        )}

        {classificationView === 'select' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: '#5a6a7e', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Step 1: Select Document
              </label>
              <select 
                value={selectedFileForClassification}
                onChange={e => this.setState({ selectedFileForClassification: Number(e.target.value) })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
              >
                {contracts.map((c, i) => (
                  <option key={i} value={i}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: '#5a6a7e', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Step 2: Choose Classification Type
              </label>
              {CLASSIFICATION_TYPES.map(type => (
                <div 
                  key={type.value}
                  onClick={() => this.setState({ classificationType: type.value })}
                  style={{ 
                    padding: '12px 16px',
                    background: classificationType === type.value ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${classificationType === type.value ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ 
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid ' + (classificationType === type.value ? '#818cf8' : 'rgba(255,255,255,0.2)'),
                    background: classificationType === type.value ? '#818cf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {classificationType === type.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div style={{ fontSize: '11px', color: classificationType === type.value ? '#818cf8' : '#c2cdd8' }}>
                    {type.label}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => this.handleClassification()}
              disabled={classifying}
              style={{ 
                width: '100%',
                background: classifying ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: classifying ? 'not-allowed' : 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {classifying ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Classifying...
                </>
              ) : (
                <>🏷️ Classify Document</>
              )}
            </button>
          </div>
        )}

        {classificationView === 'classifying' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ fontSize: '13px', color: '#c2cdd8', marginBottom: '8px' }}>Analyzing document...</div>
            <div style={{ fontSize: '11px', color: '#5a6a7e' }}>This may take a few moments</div>
          </div>
        )}

        {classificationView === 'results' && classificationResult && (
          <div>
            <div style={{ padding: '20px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#5a6a7e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Classification Results
                </div>
                <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>
                  {Math.round(classificationResult.confidence * 100)}% Confidence
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                {classificationResult.primaryCategory}
              </div>
              <div style={{ fontSize: '10px', color: '#5a6a7e' }}>
                Type: {CLASSIFICATION_TYPES.find(t => t.value === classificationResult.classificationType)?.label}
              </div>
            </div>

            {classificationResult.secondaryCategories && classificationResult.secondaryCategories.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#5a6a7e', fontWeight: 600, marginBottom: '8px' }}>
                  Secondary Categories:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {classificationResult.secondaryCategories.map((cat, i) => (
                    <span key={i} style={{ 
                      fontSize: '10px',
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: '#a5b4fc'
                    }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {classificationResult.complianceFlags && classificationResult.complianceFlags.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#5a6a7e', fontWeight: 600, marginBottom: '12px' }}>
                  Compliance Flags:
                </div>
                {classificationResult.complianceFlags.map((flag, i) => (
                  <div key={i} style={{ 
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>{flag.applicable ? '✅' : '⚠️'}</span>
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                        {flag.regulation}
                      </span>
                      <span style={{ fontSize: '9px', color: flag.applicable ? '#10b981' : '#5a6a7e', textTransform: 'uppercase', fontWeight: 700 }}>
                        {flag.applicable ? 'Applicable' : 'Not Applicable'}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8899aa', marginLeft: '24px' }}>
                      {flag.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {classificationResult.suggestedTags && classificationResult.suggestedTags.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: '#5a6a7e', fontWeight: 600, marginBottom: '8px' }}>
                  Suggested Tags:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {classificationResult.suggestedTags.map((tag, i) => (
                    <span key={i} style={{ 
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      background: 'rgba(6,182,212,0.08)',
                      border: '1px solid rgba(6,182,212,0.18)',
                      borderRadius: '3px',
                      padding: '3px 8px',
                      color: '#67e8f9'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => this.setState({ classificationView: 'select', classificationResult: null })}
              style={{ 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              Classify Another Document
            </button>
          </div>
        )}
      </div>
    );
  }

  private renderTranslate(): React.ReactElement {
    const { contracts, selContract, selLang, translating, translateProgress, cache, translateError, qaLanguage, qaHistory, qaInput, qaLoading } = this.state;
    
    if (contracts.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#5a6a7e' }}>No contracts available</div>;
    }

    const cacheKey = `${selContract}-${selLang}`;
    const cached = cache[cacheKey];
    const contract = contracts[selContract];

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '21px', fontWeight: 400, color: '#fff', margin: 0 }}>
              TranslatePro
            </h2>
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', borderRadius: '4px', padding: '2px 7px' }}>
              AI POWERED
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#5a6a7e' }}>
            Live legal translation via Azure AI Foundry · Multilingual Q&A · Preserves clause references
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label style={{ fontSize: '9px', color: '#5a6a7e', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Select Contract
              </label>
              <select 
                value={selContract} 
                onChange={e => this.setState({ selContract: Number(e.target.value), qaHistory: [] })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 34px 9px 12px', color: '#e2e8f0', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
              >
                {contracts.map((c, i) => (
                  <option key={i} value={i}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '230px' }}>
              <label style={{ fontSize: '9px', color: '#5a6a7e', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Translation Language
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {LANGS.map(l => (
                  <button 
                    key={l.code}
                    onClick={() => this.setState({ selLang: l.code })}
                    style={{
                      flex: 1,
                      background: selLang === l.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selLang === l.code ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '8px 6px',
                      cursor: 'pointer',
                      outline: 'none',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '2px' }}>{l.flag}</div>
                    <div style={{ fontSize: '8.5px', color: selLang === l.code ? '#818cf8' : '#5a6a7e', fontWeight: 600 }}>{l.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => this.runTranslation()}
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
              <span style={{ fontSize: '9px', color: '#5a6a7e' }}>{Math.round((translateProgress / 3) * 100)}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${(translateProgress / 3) * 100}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {cached ? (
          <div>
            {this.renderTranslatedDocument(contract, cached)}
            {this.renderMultilingualQA(contract)}
          </div>
        ) : !translating && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '44px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2 }}>🌐</div>
            <div style={{ fontSize: '13px', color: '#8899aa', marginBottom: '5px' }}>Select a contract and language above</div>
            <div style={{ fontSize: '10.5px', color: '#5a6a7e' }}>AI will translate the summary and all key clauses in real-time.</div>
          </div>
        )}
      </div>
    );
  }

  private renderTranslatedDocument(contract: IContract, cached: any): React.ReactElement {
    const { selLang } = this.state;

    if (selLang === 'en') {
      return (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🇬🇧</span>
            <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>English — Original Document</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '8.5px', color: '#5a6a7e', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>📝 Contract Summary</span>
            </div>
            <div style={{ padding: '16px' }}>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#c2cdd8', lineHeight: 1.8 }}>{contract.summary}</p>
            </div>
          </div>

          {contract.clauses.map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#67e8f9', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '4px', padding: '2px 7px' }}>{c.ref}</span>
                <span style={{ fontSize: '8.5px', color: '#5a6a7e', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{c.title}</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#c2cdd8', lineHeight: 1.8 }}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      const langData = LANGS.find(l => l.code === selLang);
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

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '8.5px', color: '#5a6a7e', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>📝 Contract Summary</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '14px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#8899aa', lineHeight: 1.75 }}>{contract.summary}</p>
              </div>
              <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.02)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#a5b4fc', lineHeight: 1.75 }}>{cached.summary}</p>
              </div>
            </div>
          </div>

          {contract.clauses.map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '4px', padding: '2px 7px' }}>{c.ref}</span>
                <span style={{ fontSize: '8.5px', color: '#5a6a7e', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{c.title}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '13px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#8899aa', lineHeight: 1.75 }}>{c.text}</p>
                </div>
                <div style={{ padding: '13px 16px', background: 'rgba(99,102,241,0.02)' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#a5b4fc', lineHeight: 1.75 }}>{cached.clauses[i]?.translated || '…'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  private renderMultilingualQA(contract: IContract): React.ReactElement {
    const { qaLanguage, qaHistory, qaInput, qaLoading } = this.state;

    return (
      <div style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🤖</div>
            <div>
              <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>Q&A Agent - {contract.name}</div>
              <div style={{ fontSize: '8.5px', color: '#5a6a7e' }}>Ask in your language · Powered by Azure AI Foundry</div>
            </div>
          </div>
          {qaHistory.length > 0 && (
            <button onClick={() => this.setState({ qaHistory: [] })} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '9px', fontWeight: 600, outline: 'none' }}>
              Clear Chat
            </button>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <label style={{ fontSize: '9px', color: '#5a6a7e', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Ask in Your Language
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {LANGS.map(l => (
              <button 
                key={l.code}
                onClick={() => this.setState({ qaLanguage: l.code, qaHistory: [] })}
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
                <div style={{ fontSize: '14px', marginBottom: '1px' }}>{l.flag}</div>
                <div style={{ fontSize: '7.5px', color: qaLanguage === l.code ? '#818cf8' : '#5a6a7e', fontWeight: 600 }}>{l.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
          {qaHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.25 }}>💬</div>
              <div style={{ fontSize: '11.5px', color: '#5a6a7e', marginBottom: '8px' }}>
                No questions yet about {contract.name}
              </div>
              <div style={{ fontSize: '9.5px', color: '#4a5568', lineHeight: 1.6 }}>
                Ask anything in {qaLanguage === 'de' ? 'German' : qaLanguage === 'es' ? 'Spanish' : 'English'} —<br />
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
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '8px', color: '#5a6a7e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.language === 'de' ? '🇩🇪' : msg.language === 'es' ? '🇪🇸' : '🇬🇧'}
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
                      <div style={{ fontSize: '11px', color: msg.role === 'user' ? '#67e8f9' : '#c2cdd8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
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
                      <span style={{ fontSize: '9px', color: '#5a6a7e', marginLeft: '6px' }}>Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.02)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={qaInput}
                onChange={e => this.setState({ qaInput: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && this.handleMultilingualQuestion()}
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
                  padding: '10px 14px', 
                  color: '#e2e8f0', 
                  fontSize: '11.5px', 
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={() => this.handleMultilingualQuestion()}
              disabled={!qaInput.trim() || qaLoading}
              style={{
                background: qaInput.trim() && !qaLoading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                color: qaInput.trim() && !qaLoading ? '#fff' : '#5a6a7e',
                borderRadius: '8px',
                padding: '10px 18px',
                cursor: qaInput.trim() && !qaLoading ? 'pointer' : 'not-allowed',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {qaLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '8.5px', color: '#4a5568' }}>
            💡 {this.getExampleQuestions(qaLanguage).join(' • ')}
          </div>
        </div>
      </div>
    );
  }
}
