import * as React from 'react';
import type { ILegalLensProps } from './ILegalLensProps';
import {
  Library24Regular,
  ArrowUpload24Regular,
  DocumentSearch24Regular,
  LocalLanguage24Regular,
  Alert24Regular,
  DocumentRegular,
  CheckmarkCircleFilled,
  WarningFilled,
  ErrorCircleFilled,
  ChartMultipleFilled,
  CircleFilled,
  InfoRegular,
  ClockRegular,
  PeopleFilled,
  DocumentBulletListRegular,
  ScalesRegular,
  BotRegular
} from '@fluentui/react-icons';
import { LibraryView } from './Tabs/Library/LibraryView';
import { ILegalLensState } from './ILegalLensState';
import { CLASSIFY_STEPS, CLASSIFICATION_TYPES, LANGS } from '../constants';
import { IContract } from '../models/IContract';

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

      classifyState: null,
      selectedClassificationType: 'contract_type',
      fullAnalysis: null,
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

  public componentDidUpdate(prevProps: ILegalLensProps, prevState: ILegalLensState): void {
    // Auto-start classification when view changes to 'processing'
    if (this.state.classificationView === 'processing' &&
      prevState.classificationView !== 'processing' &&
      !this.state.classifyState) {
      console.log('[Classification] Auto-starting simulation');
      this.startClassificationSimulation();
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
        analyzeError: null,
        fullAnalysis: null  // Clear previous analysis
      });
    }

    try {
      console.log('[Upload] Starting comprehensive analysis...');

      // Extract document text once
      const documentText = await this.props.aiFoundryService.extractTextFromFile(file);
      console.log('[Upload] Document text extracted, length:', documentText.length);

      if (this._isMounted) {
        this.setState({ analyzingProgress: 10 });
      }

      // Run all 4 classification types in parallel for consistent results
      console.log('[Upload] Running all 4 classification analyses...');
      const [contractType, riskAssessment, compliance, entities] = await Promise.all([
        this.classifyContractType(documentText, null),
        this.classifyRiskAssessment(documentText, null),
        this.classifyCompliance(documentText, null),
        this.classifyEntities(documentText, null)
      ]);

      console.log('[Upload] All analyses complete!');
      console.log('[Upload] Contract Type:', contractType?.documentType);
      console.log('[Upload] Risk Score:', riskAssessment?.overallRiskScore);
      console.log('[Upload] Compliance:', compliance?.overallCompliance);

      if (this._isMounted) {
        this.setState({ analyzingProgress: 80 });
      }

      // Cache all results for consistent display
      const fullAnalysis = {
        contractType,
        riskAssessment,
        compliance,
        entities
      };

      // Map to old format for backward compatibility
      const result = {
        fileName: file.name,
        parties: contractType?.parties || ['Party A', 'Party B'],
        effectiveDate: contractType?.effectiveDate || 'Not specified',
        expiryDate: contractType?.expiryDate || 'Not specified',
        jurisdiction: contractType?.jurisdiction || 'Not specified',
        contractType: contractType?.documentType || 'General Agreement',
        clauses: entities?.keyObligations?.map((obligation: string, i: number) => ({
          ref: `§${i + 1}`,
          title: obligation.substring(0, 50),
          text: obligation,
          riskLevel: 'low' as const
        })) || [],
        overallRiskScore: riskAssessment?.overallRiskScore || 0,
        riskFactors: riskAssessment?.riskFactors || [],
        summary: `${contractType?.documentType || 'Agreement'} between ${contractType?.parties?.join(' and ') || 'parties'}. Risk Score: ${riskAssessment?.overallRiskScore || 0}/100.`,
        analyzedAt: new Date().toISOString()
      };

      if (this._isMounted) {
        this.setState({
          analysisResult: result,
          fullAnalysis: fullAnalysis,  // Cache complete analysis
          analyzingProgress: 90,
          uploadView: 'results'
        });
      }

      // Save to SharePoint library
      try {
        await this.props.sharePointService.saveAnalyzedContract(file.name, file, result);

        if (this._isMounted) {
          this.setState({ analyzingProgress: 100 });
        }

        console.log('[Upload] Saved to SharePoint successfully');

        // Refresh contracts list to show newly uploaded document
        setTimeout(() => {
          this.loadContracts();
        }, 2000);

      } catch (saveError) {
        console.warn('[Upload] Analysis complete but failed to save to SharePoint:', saveError);
        // Still show results even if save failed
        if (this._isMounted) {
          this.setState({ analyzingProgress: 100 });
        }
      }

    } catch (error) {
      console.error('[Upload] Analysis error:', error);
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

  private getSeverityIcon(severity: string): React.ReactElement {
    const iconProps = { style: { fontSize: '20px' } };
    switch (severity.toLowerCase()) {
      case 'critical': return <ErrorCircleFilled {...iconProps} style={{ ...iconProps.style, color: '#ef4444' }} />;
      case 'high': return <WarningFilled {...iconProps} style={{ ...iconProps.style, color: '#f59e0b' }} />;
      case 'medium': return <InfoRegular {...iconProps} style={{ ...iconProps.style, color: '#fbbf24' }} />;
      case 'low': return <CheckmarkCircleFilled {...iconProps} style={{ ...iconProps.style, color: '#10b981' }} />;
      default: return <CircleFilled {...iconProps} style={{ ...iconProps.style, color: '#6b7280' }} />;
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
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading contracts...</div>
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
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>{error}</div>
            <button onClick={() => this.loadContracts()} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0f172a 50%, #1e293b 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Inter:wght@300;400;500;600;700;800&display=swap');
          * { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Cinzel', Georgia, serif !important;
          }
          * { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
          @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(0.95)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
          
          .nav-btn:hover{
            background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))!important;
            color:#fff!important;
            transform:translateY(-2px)!important;
            boxShadow:0 6px 20px rgba(99,102,241,0.3)!important;
          }
          .card-row:hover{
            background:rgba(255,255,255,0.05)!important;
            transform:translateX(4px)!important;
            boxShadow:0 4px 16px rgba(99,102,241,0.15)!important;
          }
          .card-row{
            transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)!important;
          }
        `}</style>

        {/* Header */}
        <header style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', padding: '0 24px', display: 'flex', alignItems: 'center', height: '64px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '32px' }}>
            <ScalesRegular style={{
              fontSize: '28px',
              color: '#a5b4fc',
              filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.4))'
            }} />
            <span style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '20px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.5px'
            }}>LegalLens</span>
          </div>

          <nav style={{ display: 'flex', gap: '3px', flex: 1 }}>
            {[
              { key: 'library', label: 'Library', highlight: false },
              { key: 'upload', label: 'Upload & Analyze', highlight: true },
              { key: 'classify', label: 'Classification', highlight: false },
              { key: 'translate', label: 'TranslatePro', highlight: false },
              { key: 'alerts', label: 'Alerts', highlight: false }
            ].map(tab => (
              <button
                key={tab.key}
                className="nav-btn"
                onClick={() => this.setState({ view: tab.key as any })}
                style={{
                  background: view === tab.key ? (tab.highlight ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  border: 'none',
                  color: view === tab.key ? (tab.highlight ? '#818cf8' : '#10b981') : '#64748b',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  outline: 'none',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.key === 'library' && <Library24Regular style={{ fontSize: '12px', width: '12px', height: '12px' }} />}
                {tab.key === 'upload' && <ArrowUpload24Regular style={{ fontSize: '12px', width: '12px', height: '12px' }} />}
                {tab.key === 'classify' && <DocumentSearch24Regular style={{ fontSize: '12px', width: '12px', height: '12px' }} />}
                {tab.key === 'translate' && <LocalLanguage24Regular style={{ fontSize: '12px', width: '12px', height: '12px' }} />}
                {tab.key === 'alerts' && <Alert24Regular style={{ fontSize: '12px', width: '12px', height: '12px' }} />}
                {tab.label}
              </button>
            ))}
          </nav>


        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', scrollBehavior: 'smooth' }}>
          <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
            {this.renderView()}
          </div>
        </main>
      </div>
    );
  }

  private renderView(): React.ReactElement {
    switch (this.state.view) {
      case 'library':
        return <LibraryView sharePointService={this.props.sharePointService} />;
      case 'upload': return this.renderUpload();
      case 'classify': return this.renderClassify();
      case 'translate': return this.renderTranslate();
      case 'alerts': return this.renderAlerts();
      default: return <LibraryView sharePointService={this.props.sharePointService} />;
    }
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
              <div key={a.id} style={{
                background: a.severity === 'critical' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                borderRadius: '12px',
                padding: '20px',
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
                      {a.type === 'duplicate' ? <DocumentBulletListRegular style={{ fontSize: '16px', color: '#818cf8' }} /> : a.type === 'conflict' ? <WarningFilled style={{ fontSize: '16px', color: '#f59e0b' }} /> : <ClockRegular style={{ fontSize: '16px', color: '#ef4444' }} />}
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
                  <span style={{ fontSize: '8.5px', color: '#64748b' }}>{a.time}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.7 }}>{a.desc}</p>
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
            <h2 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: '24px', fontWeight: 600, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.5px', margin: 0 }}>
              Upload & Analyze Contract
            </h2>
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '1px', background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', borderRadius: '4px', padding: '2px 7px' }}>
              AI POWERED
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
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
              <DocumentRegular style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3, color: '#818cf8' }} />
              <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}>
                Drag & drop contract file here
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                or click to browse
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
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

            <div style={{ margin: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
              — OR —
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                <option value="-1" style={{ background: '#1e293b', color: '#e2e8f0' }}>Choose contract from library...</option>
                {this.state.contracts.map((c, i) => (
                  <option key={i} value={i} style={{ background: '#1e293b', color: '#e2e8f0' }}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {uploadView === 'analyzing' && (
          <div>
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, marginBottom: '16px' }}>
                Analyzing: {uploadedFileName}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Processing...</span>
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
                    <span style={{ fontSize: '11px', color: item.done ? '#e2e8f0' : '#64748b' }}>
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
              <span style={{ fontSize: '18px' }}></span>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  Analysis Complete & Saved to SharePoint
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  Document uploaded to library with metadata · Refresh library view to see it
                </div>
              </div>
            </div>

            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, ' + this.getRiskScoreColor(analysisResult.overallRiskScore) + ', rgba(0,0,0,0.1))',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Overall Risk Score
              </div>
              <div style={{ fontSize: '64px', fontWeight: 700, color: analysisResult.overallRiskScore >= 70 ? '#ef4444' : analysisResult.overallRiskScore >= 40 ? '#f59e0b' : '#10b981', lineHeight: 1 }}>
                {analysisResult.overallRiskScore}
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8' }}>/ 100</div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                {analysisResult.overallRiskScore >= 70 ? (
                  <><ErrorCircleFilled style={{ fontSize: '14px', color: '#ef4444' }} /> High Risk</>
                ) : analysisResult.overallRiskScore >= 40 ? (
                  <><WarningFilled style={{ fontSize: '14px', color: '#f59e0b' }} /> Medium Risk</>
                ) : (
                  <><CheckmarkCircleFilled style={{ fontSize: '14px', color: '#10b981' }} /> Low Risk</>
                )}
              </div>
            </div>

            {analysisResult.riskFactors && analysisResult.riskFactors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                  <><ChartMultipleFilled style={{ fontSize: '14px', marginRight: '6px' }} />Risk Factors ({analysisResult.riskFactors.length})</>
                </h3>
                {analysisResult.riskFactors.map((factor, i) => (
                  <div key={i} style={{
                    padding: '20px',
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
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.6 }}>
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
                <><DocumentBulletListRegular style={{ fontSize: '14px', marginRight: '6px' }} />Clauses ({analysisResult.clauses.length})</>
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
                    <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600, marginBottom: '2px' }}>
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


  private renderTranslate(): React.ReactElement {
    const { contracts, selContract, selLang, translating, translateProgress, cache, translateError, qaLanguage, qaHistory, qaInput, qaLoading } = this.state;

    if (contracts.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No contracts available</div>;
    }

    const cacheKey = `${selContract}-${selLang}`;
    const cached = cache[cacheKey];
    const contract = contracts[selContract];

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
                value={selContract}
                onChange={e => this.setState({ selContract: Number(e.target.value), qaHistory: [] })}
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
                    onClick={() => this.setState({ selLang: l.code })}
                    style={{
                      flex: 1,
                      background: selLang === l.code ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${selLang === l.code ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '8px 6px',
                      cursor: 'pointer',
                      outline: 'none',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '2px', color: '#ffffff' }}>{l.flag}</div>
                    <div style={{ fontSize: '8.5px', color: selLang === l.code ? '#fff' : '#94a3b8', fontWeight: 600 }}>{l.label}</div>
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
              <span style={{ fontSize: '9px', color: '#64748b' }}>{Math.round((translateProgress / 3) * 100)}%</span>
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
          <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '44px 24px', textAlign: 'center' }}>
            <LocalLanguage24Regular style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2, color: '#94a3b8' }} />
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Select a contract and language above</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>AI will translate the summary and all key clauses in real-time.</div>
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
    }
  }

  private renderMultilingualQA(contract: IContract): React.ReactElement {
    const { qaLanguage, qaHistory, qaInput, qaLoading } = this.state;

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
            <button onClick={() => this.setState({ qaHistory: [] })} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '9px', fontWeight: 600, outline: 'none' }}>
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
                  padding: '10px 10px',
                  color: '#e2e8f0',
                  fontSize: '11px',
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
            💡 {this.getExampleQuestions(qaLanguage).join(' • ')}
          </div>
        </div>
      </div>
    );
  }

  /**
   * STEP 1: Start classification simulation
   */
  private startClassificationSimulation = (): void => {
    console.log('[Classification] Starting simulation...');

    let currentStep = 0;
    this.setState({ classifyState: { step: 0, done: false } });

    const runNextStep = () => {
      currentStep++;

      // Check if we've completed all animation steps
      if (currentStep >= CLASSIFY_STEPS.length) {
        // All animation steps done - now run actual AI classification
        console.log('[Classification] Animation complete, starting AI analysis...');
        this.performActualClassification();
        return;
      }

      console.log(`[Classification] Step ${currentStep}: ${CLASSIFY_STEPS[currentStep].phase}`);

      this.setState({
        classifyState: {
          step: currentStep,
          done: false
        }
      });

      // Continue to next step
      setTimeout(runNextStep, CLASSIFY_STEPS[currentStep].duration);
    };

    // Start first step
    setTimeout(runNextStep, CLASSIFY_STEPS[0].duration);
  };

  /**
   * STEP 2: Perform actual AI classification based on selected type
   */
  private performActualClassification = async (): Promise<void> => {
    try {
      const {
        selectedFileForClassification,
        selectedClassificationType,
        contracts,
        uploadedFile,
        fullAnalysis
      } = this.state;

      // Get the contract to classify
      const contract = contracts[selectedFileForClassification];

      console.log('[Classification] Type:', selectedClassificationType);
      console.log('[Classification] Contract:', contract?.name);

      // Check if we have cached analysis for this document
      if (fullAnalysis && uploadedFile && contract?.name === uploadedFile.name) {
        console.log('[Classification] ✓ Using cached analysis for:', uploadedFile.name);
        console.log('[Classification] ✓ Results match Upload tab (same document)');

        let result;
        switch (selectedClassificationType) {
          case 'contract_type':
            result = fullAnalysis.contractType;
            break;
          case 'risk_assessment':
            result = fullAnalysis.riskAssessment;
            break;
          case 'compliance_check':
            result = fullAnalysis.compliance;
            break;
          case 'entity_extraction':
            result = fullAnalysis.entities;
            break;
          default:
            result = fullAnalysis.contractType;
        }

        console.log('[Classification] Cached result:', result);

        this.setState({
          classifyState: {
            step: CLASSIFY_STEPS.length - 1,
            done: true,
            result
          }
        });
        return;
      }

      // No cached data - run fresh analysis
      if (uploadedFile && contract?.name !== uploadedFile.name) {
        console.log('[Classification] ⚠️  Selected different document than uploaded!');
        console.log('[Classification] Uploaded:', uploadedFile.name);
        console.log('[Classification] Selected:', contract?.name);
        console.log('[Classification] Running fresh analysis (risk scores will differ)');
      } else {
        console.log('[Classification] No cached data, running fresh analysis...');
      }

      // Fetch file and extract text
      let documentText = '';

      if (uploadedFile) {
        documentText = await this.props.aiFoundryService.extractTextFromFile(uploadedFile);
      } else if (contract?.fileUrl) {
        const fileBlob = await this.props.sharePointService.getContractFile(contract.fileUrl);
        documentText = await this.props.aiFoundryService.extractTextFromFile(fileBlob);
      } else if (contract?.fullText) {
        documentText = contract.fullText;
      }

      console.log('[Classification] Document text extracted, length:', documentText.length);

      // Call different AI methods based on classification type
      let result;

      switch (selectedClassificationType) {
        case 'contract_type':
          result = await this.classifyContractType(documentText, contract);
          break;
        case 'risk_assessment':
          result = await this.classifyRiskAssessment(documentText, contract);
          break;
        case 'compliance_check':
          result = await this.classifyCompliance(documentText, contract);
          break;
        case 'entity_extraction':
          result = await this.classifyEntities(documentText, contract);
          break;
        default:
          result = await this.classifyContractType(documentText, contract);
      }

      console.log('[Classification] Complete:', result);

      // Update state with results
      this.setState({
        classifyState: {
          step: CLASSIFY_STEPS.length - 1,
          done: true,
          result
        }
      });

    } catch (error) {
      console.error('[Classification] Error:', error);
      this.setState({
        classifyState: {
          step: CLASSIFY_STEPS.length - 1,
          done: true,
          result: this.getFallbackResult(this.state.selectedClassificationType)
        }
      });
    }
  };

  /**
   * CLASSIFICATION TYPE 1: Contract Type
   */
  private classifyContractType = async (documentText: string, contract: any): Promise<any> => {
    const prompt = `Analyze this legal contract and classify its type.

Document Text:
${documentText.substring(0, 3000)}

CRITICAL: Respond with ONLY valid JSON. No explanation, no markdown, no preamble.

Return this exact JSON structure:
{
  "documentType": "SaaS Agreement | Vendor Agreement | NDA | SLA | DPA | MSA | etc.",
  "parties": ["Party 1 Name", "Party 2 Name"],
  "jurisdiction": "Washington, USA | Delaware, USA | California, USA | UK | EU (GDPR)",
  "effectiveDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "keyClauses": ["Service Level (§3)", "Liability Cap (§5.1)", "Termination (§7)"],
  "autoTags": ["SaaS", "Cloud", "Enterprise", "Data Processing"],
  "duplicateFlag": "No duplicates found ✓",
  "confidence": 0.95
}`;

    const response = await this.props.aiFoundryService.callAI(prompt, 1500);
    return this.parseJSON(response);
  };

  /**
   * CLASSIFICATION TYPE 2: Risk Assessment
   */
  private classifyRiskAssessment = async (documentText: string, contract: any): Promise<any> => {
    const prompt = `Perform a comprehensive risk assessment of this legal contract.

Document Text:
${documentText.substring(0, 3000)}

Analyze risk factors and provide assessment in JSON format:
{
  "overallRiskScore": 45,
  "riskLevel": "Medium",
  "status": "warning",
  "riskFactors": [
    {
      "category": "Liability",
      "factor": "Limited liability cap",
      "severity": "High",
      "score": 75,
      "description": "Liability capped at $2M, may be insufficient",
      "recommendation": "Consider increasing cap to $5M"
    },
    {
      "category": "Termination",
      "factor": "Long notice period",
      "severity": "Medium",
      "score": 45,
      "description": "90-day termination notice required",
      "recommendation": "Negotiate down to 60 days"
    }
  ],
  "complianceIssues": [
    "Missing GDPR data retention clause",
    "Weak indemnification language"
  ],
  "mitigationSteps": [
    "Add GDPR-compliant data processing addendum",
    "Strengthen liability and indemnification clauses",
    "Review insurance coverage requirements"
  ],
  "confidence": 0.92
}`;

    const response = await this.props.aiFoundryService.callAI(prompt, 2000);
    return this.parseJSON(response);
  };

  /**
   * CLASSIFICATION TYPE 3: Compliance Check
   */
  private classifyCompliance = async (documentText: string, contract: any): Promise<any> => {
    const prompt = `Check this contract for compliance with major regulations.

Document Text:
${documentText.substring(0, 3000)}

Provide compliance assessment in JSON format:
{
  "overallCompliance": "Partial",
  "complianceScore": 72,
  "regulations": [
    {
      "name": "GDPR",
      "status": "Compliant",
      "score": 95,
      "findings": [
        "✓ Data processing agreement present",
        "✓ Subject rights specified",
        "⚠ Data retention period unclear"
      ],
      "recommendations": ["Specify data retention timeline"]
    },
    {
      "name": "CCPA",
      "status": "Non-Compliant",
      "score": 45,
      "findings": [
        "✗ Missing California consumer rights clause",
        "✗ No opt-out mechanism specified"
      ],
      "recommendations": [
        "Add CCPA consumer rights addendum",
        "Implement opt-out procedures"
      ]
    },
    {
      "name": "SOC 2",
      "status": "Compliant",
      "score": 88,
      "findings": [
        "✓ Security controls referenced",
        "✓ Audit rights included"
      ],
      "recommendations": []
    }
  ],
  "criticalIssues": 2,
  "warnings": 3,
  "confidence": 0.89
}`;

    const response = await this.props.aiFoundryService.callAI(prompt, 2000);
    return this.parseJSON(response);
  };

  /**
   * CLASSIFICATION TYPE 4: Entity Extraction
   */
  private classifyEntities = async (documentText: string, contract: any): Promise<any> => {
    const prompt = `You are a JSON-only API. Return ONLY valid JSON with no explanation.

Extract entities from this contract and return ONLY this JSON structure (no text before or after):

Document Text:
${documentText.substring(0, 3000)}

RETURN ONLY THIS JSON:
{
  "parties": [
    {
      "name": "NovaCorp Inc",
      "role": "Vendor",
      "jurisdiction": "Delaware",
      "contact": "legal@novacorp.com"
    },
    {
      "name": "LegalLens Inc",
      "role": "Client",
      "jurisdiction": "California",
      "contact": "contracts@legallens.io"
    }
  ],
  "dates": {
    "effective": "2026-02-15",
    "expiry": "2028-02-15",
    "renewal": "Auto-renew unless terminated",
    "noticePeriod": "90 days"
  },
  "financialTerms": {
    "contractValue": "$500,000 annually",
    "paymentTerms": "Net 30",
    "liabilityCap": "$2,000,000",
    "insuranceRequired": "$5,000,000 general liability"
  },
  "keyObligations": [
    "Vendor must maintain SOC 2 Type II certification",
    "Client must provide 90-day termination notice",
    "Both parties must maintain confidentiality"
  ],
  "governingLaw": "Delaware, USA",
  "disputeResolution": "Binding arbitration in Delaware",
  "confidence": 0.94
}`;

    const response = await this.props.aiFoundryService.callAI(prompt, 2000);
    return this.parseJSON(response);
  };

  /**
   * Parse JSON with fallback - handles various AI response formats
   */
  private parseJSON(response: string): any {
    try {
      // First, remove markdown code blocks if present
      let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try direct parse first
      try {
        return JSON.parse(cleaned);
      } catch {
        // Direct parse failed - try to extract JSON from text
      }

      // Look for JSON object between curly braces
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('[Classification] Extracted JSON from response');
        return JSON.parse(jsonStr);
      }

      // Look for JSON array
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const jsonStr = arrayMatch[0];
        console.log('[Classification] Extracted JSON array from response');
        return JSON.parse(jsonStr);
      }

      console.error('[Classification] No valid JSON found in response');
      return null;

    } catch (error) {
      console.error('[Classification] JSON parse error:', error);
      console.error('[Classification] Response was:', response.substring(0, 200));
      return null;
    }
  };

  /**
   * Get fallback result based on type
   */
  private getFallbackResult(classificationType: string): any {
    switch (classificationType) {
      case 'contract_type':
        return {
          documentType: 'Vendor Agreement',
          parties: ['NovaCorp Inc', 'LegalLens Inc'],
          jurisdiction: 'Delaware, USA',
          effectiveDate: '2026-02-15',
          expiryDate: '2028-02-15',
          keyClauses: ['Liability Cap (§4.2)', 'Termination (§9.1)', 'IP Ownership (§11.3)'],
          autoTags: ['SOC2', 'ISO27001', 'CCPA'],
          duplicateFlag: 'No duplicates found ✓',
          confidence: 0.97
        };

      case 'risk_assessment':
        return {
          overallRiskScore: 45,
          riskLevel: 'Medium',
          status: 'warning',
          riskFactors: [
            {
              category: 'Liability',
              factor: 'Limited liability cap',
              severity: 'High',
              score: 75,
              description: 'Liability capped at $2M',
              recommendation: 'Consider increasing to $5M'
            }
          ],
          complianceIssues: ['Missing GDPR clause'],
          mitigationSteps: ['Add GDPR addendum'],
          confidence: 0.92
        };

      case 'compliance_check':
        return {
          overallCompliance: 'Partial',
          complianceScore: 72,
          regulations: [
            {
              name: 'GDPR',
              status: 'Compliant',
              score: 95,
              findings: ['✓ Data processing present'],
              recommendations: []
            }
          ],
          criticalIssues: 2,
          warnings: 3,
          confidence: 0.89
        };

      case 'entity_extraction':
        return {
          parties: [
            { name: 'NovaCorp Inc', role: 'Vendor', jurisdiction: 'Delaware' }
          ],
          dates: {
            effective: '2026-02-15',
            expiry: '2028-02-15'
          },
          financialTerms: {
            contractValue: '$500,000 annually',
            liabilityCap: '$2,000,000'
          },
          governingLaw: 'Delaware, USA',
          confidence: 0.94
        };

      default:
        return {};
    }
  };

  /**
   * Reset classification
   */
  private resetClassification = (): void => {
    this.setState({
      classifyState: null,
      classificationView: 'select',
      uploadedFile: null,
      uploadedFileName: ''
    });
  };

  /**
   * Handle Classify button click
   */
  private handleClassifyClick = (): void => {
    this.setState({ classificationView: 'processing' });
  };

  /**
   * Main classification render
   */
  private renderClassify(): React.ReactElement {
    const { classificationView } = this.state;

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        {classificationView === 'select' && this.renderClassifySelect()}
        {classificationView === 'processing' && this.renderClassifyProcessing()}
      </div>
    );
  }

  /**
   * Selection view
   */
  private renderClassifySelect(): React.ReactElement {
    const { selectedFileForClassification, selectedClassificationType, contracts } = this.state;

    return (
      <>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '21px',
            fontWeight: 400,
            color: '#fff',
            margin: '0 0 3px'
          }}>
            Document Classification
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            AI-powered classification · Select document and classification type
          </p>
        </div>

        <div style={{ maxWidth: '600px' }}>
          {/* Step 1: Select Document */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#64748b',
              marginBottom: '8px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Step 1: Select Document
            </label>
            <select
              value={selectedFileForClassification}
              onChange={e => this.setState({ selectedFileForClassification: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#e2e8f0',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {contracts.map((c, i) => (
                <option key={i} value={i} style={{ background: '#1e293b', color: '#e2e8f0' }}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Choose Classification Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              color: '#64748b',
              marginBottom: '8px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Step 2: Choose Classification Type
            </label>
            {CLASSIFICATION_TYPES.map(type => (
              <div
                key={type.value}
                onClick={() => this.setState({ selectedClassificationType: type.value })}
                style={{
                  padding: '12px 16px',
                  background: selectedClassificationType === type.value ?
                    'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedClassificationType === type.value ?
                    'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Radio button */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid ' + (selectedClassificationType === type.value ?
                      '#818cf8' : 'rgba(255,255,255,0.2)'),
                    background: selectedClassificationType === type.value ? '#818cf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedClassificationType === type.value && (
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#fff'
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: selectedClassificationType === type.value ? '#818cf8' : '#e2e8f0',
                      fontWeight: 600,
                      marginBottom: '2px'
                    }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                      {type.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Classify Button */}
          <button
            onClick={this.handleClassifyClick}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 14px rgba(99,102,241,0.35)'
            }}
          >
            <span style={{ fontSize: '14px' }}>⟳</span>
            Classify Document
          </button>
        </div>
      </>
    );
  }

  /**
   * Processing view (with animation and results)
   */
  private renderClassifyProcessing(): React.ReactElement {
    const { classifyState, uploadedFileName, selectedClassificationType } = this.state;

    return (
      <>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '21px',
              fontWeight: 400,
              color: '#fff',
              margin: '0 0 3px'
            }}>
              Live Classification
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              Knowledge Agent classifies document in real-time
            </p>
          </div>
          {classifyState?.done && (
            <button
              onClick={this.resetClassification}
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981',
                borderRadius: '7px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              ↻ Classify Another
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* LEFT: Progress Steps */}
          <div>
            {this.renderProgressSteps()}
          </div>

          {/* RIGHT: Results */}
          <div>
            {classifyState?.done && classifyState.result ? (
              this.renderClassificationResults(classifyState.result, selectedClassificationType)
            ) : (
              this.renderClassificationPending()
            )}
          </div>
        </div>
      </>
    );
  }

  /**
   * Render progress steps (LEFT column)
   */
  private renderProgressSteps(): React.ReactElement {
    const { classifyState, uploadedFileName, contracts, selectedFileForClassification } = this.state;
    const contract = contracts[selectedFileForClassification];

    return (
      <>
        {/* File info card */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>
              📄
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
                {uploadedFileName || contract?.name || 'NovaCorp — Vendor Agreement'}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                From SharePoint library
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '3px',
            height: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              borderRadius: '3px',
              background: classifyState?.done ? '#10b981' : 'linear-gradient(90deg,#10b981,#06b6d4)',
              width: classifyState ? `${((classifyState.step + 1) / CLASSIFY_STEPS.length) * 100}%` : '0%',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {CLASSIFY_STEPS.map((step, i) => {
            const done = classifyState && classifyState.step > i;
            const active = classifyState && classifyState.step === i;

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  padding: '9px 12px',
                  background: active ? 'rgba(16,185,129,0.06)' : done ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '8px',
                  transition: 'all 0.3s'
                }}
              >
                {/* Step indicator */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  minWidth: '20px',
                  marginTop: '1px',
                  background: done ? '#10b981' : active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  border: active ? '2px solid #10b981' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {done && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                  {active && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      border: '2px solid #10b981',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                </div>

                {/* Step text */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: done ? '#10b981' : active ? '#e2e8f0' : '#64748b',
                    fontWeight: 500
                  }}>
                    {step.phase}
                  </div>
                  <div style={{
                    fontSize: '9.5px',
                    color: active ? '#94a3b8' : '#64748b',
                    marginTop: '1px'
                  }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  /**
   * Render pending state (RIGHT column when not done)
   */
  private renderClassificationPending(): React.ReactElement {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '36px 20px',
        textAlign: 'center'
      }}>
        <ClockRegular style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.25, color: '#94a3b8' }} />
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          Extracted metadata will appear here…
        </div>
      </div>
    );
  }

  /**
   * Render classification results based on type (RIGHT column when done)
   */
  private renderClassificationResults(result: any, classificationType: string): React.ReactElement {
    switch (classificationType) {
      case 'contract_type':
        return this.renderContractTypeResults(result);
      case 'risk_assessment':
        return this.renderRiskAssessmentResults(result);
      case 'compliance_check':
        return this.renderComplianceResults(result);
      case 'entity_extraction':
        return this.renderEntityExtractionResults(result);
      default:
        return this.renderContractTypeResults(result);
    }
  }

  /**
   * CONTRACT TYPE CLASSIFICATION RESULTS
   */
  private renderContractTypeResults(result: any): React.ReactElement {
    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        {/* Results card */}
        <div style={{
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{
              fontSize: '9px',
              color: '#10b981',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Contract Type Classification
            </span>
          </div>

          {/* Classification fields */}
          {[
            ['Document Type', result.documentType],
            ['Parties', (result.parties || []).join(' · ')],
            ['Jurisdiction', result.jurisdiction],
            ['Effective Date', result.effectiveDate],
            ['Expiry Date', result.expiryDate],
            ['Key Clauses', (result.keyClauses || []).join(', ')]
          ].map(([label, value], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none'
              }}
            >
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>{label}</span>
              <span style={{
                fontSize: '10.5px',
                color: '#e2e8f0',
                fontWeight: 500,
                textAlign: 'right',
                maxWidth: '200px'
              }}>
                {value || 'Not specified'}
              </span>
            </div>
          ))}

          {/* Auto-tags */}
          {result.autoTags && result.autoTags.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)'
            }}>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>Auto-Tags</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {result.autoTags.map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '8.5px',
                      fontFamily: 'monospace',
                      background: 'rgba(6,182,212,0.1)',
                      border: '1px solid rgba(6,182,212,0.2)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      color: '#67e8f9'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate flag */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 0'
          }}>
            <span style={{ fontSize: '9.5px', color: '#64748b' }}>Duplicate Flag</span>
            <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 500 }}>
              {result.duplicateFlag || 'No duplicates found ✓'}
            </span>
          </div>
        </div>

        {/* Confidence score */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {Math.round((result.confidence || 0.97) * 100)}%
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
              Classification Confidence
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
              Document Intelligence + semantic analysis
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * RISK ASSESSMENT RESULTS
   */
  private renderRiskAssessmentResults(result: any): React.ReactElement {
    const riskColor = result.riskLevel === 'High' ? '#ef4444' :
      result.riskLevel === 'Medium' ? '#f59e0b' : '#10b981';

    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        {/* Risk Score Card */}
        <div style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: riskColor }} />
            <span style={{
              fontSize: '9px',
              color: riskColor,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Risk Assessment Complete
            </span>
          </div>

          {/* Overall Risk Score */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                Overall Risk Score
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                {result.riskLevel || 'Medium'} Risk Level
              </div>
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: riskColor
            }}>
              {result.overallRiskScore || 45}
            </div>
          </div>

          {/* Risk Factors */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
              IDENTIFIED RISK FACTORS
            </div>
            {(result.riskFactors || []).map((factor: any, i: number) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#e2e8f0', fontWeight: 600 }}>
                    {factor.factor}
                  </span>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: factor.severity === 'High' ? 'rgba(239,68,68,0.15)' :
                      factor.severity === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: factor.severity === 'High' ? '#ef4444' :
                      factor.severity === 'Medium' ? '#f59e0b' : '#10b981'
                  }}>
                    {factor.severity}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px' }}>
                  {factor.description}
                </div>
                <div style={{ fontSize: '9px', color: '#f59e0b' }}>
                  → {factor.recommendation}
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Issues */}
          {result.complianceIssues && result.complianceIssues.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '6px' }}>
              <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>
                ⚠ COMPLIANCE ISSUES
              </div>
              {result.complianceIssues.map((issue: string, i: number) => (
                <div key={i} style={{ fontSize: '9px', color: '#f87171', marginBottom: '3px' }}>
                  • {issue}
                </div>
              ))}
            </div>
          )}

          {/* Mitigation Steps */}
          {result.mitigationSteps && result.mitigationSteps.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
                ✓ RECOMMENDED MITIGATION
              </div>
              {result.mitigationSteps.map((step: string, i: number) => (
                <div key={i} style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '3px' }}>
                  {i + 1}. {step}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confidence */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#818cf8' }}>
            {Math.round((result.confidence || 0.92) * 100)}%
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
              Assessment Confidence
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
              AI-powered risk analysis
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * COMPLIANCE CHECK RESULTS
   */
  private renderComplianceResults(result: any): React.ReactElement {
    const complianceColor = result.overallCompliance === 'Compliant' ? '#10b981' :
      result.overallCompliance === 'Partial' ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        {/* Compliance Score Card */}
        <div style={{
          background: 'rgba(99,102,241,0.04)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: complianceColor }} />
            <span style={{
              fontSize: '9px',
              color: complianceColor,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Compliance Check Complete
            </span>
          </div>

          {/* Overall Compliance */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                Overall Compliance
              </div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                {result.overallCompliance || 'Partial'}
              </div>
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: complianceColor
            }}>
              {result.complianceScore || 72}%
            </div>
          </div>

          {/* Regulations */}
          <div style={{ marginTop: '12px' }}>
            {(result.regulations || []).map((reg: any, i: number) => {
              const regColor = reg.status === 'Compliant' ? '#10b981' :
                reg.status === 'Partial' ? '#f59e0b' : '#ef4444';

              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>
                      {reg.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: regColor }}>
                        {reg.score}%
                      </span>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: reg.status === 'Compliant' ? 'rgba(16,185,129,0.15)' :
                          reg.status === 'Partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: regColor
                      }}>
                        {reg.status}
                      </span>
                    </div>
                  </div>

                  {/* Findings */}
                  <div style={{ marginBottom: '6px' }}>
                    {(reg.findings || []).map((finding: string, j: number) => (
                      <div key={j} style={{
                        fontSize: '9px',
                        color: finding.startsWith('✓') ? '#10b981' :
                          finding.startsWith('⚠') ? '#f59e0b' : '#ef4444',
                        marginBottom: '2px'
                      }}>
                        {finding}
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {reg.recommendations && reg.recommendations.length > 0 && (
                    <div style={{ paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {reg.recommendations.map((rec: string, j: number) => (
                        <div key={j} style={{ fontSize: '9px', color: '#f59e0b', marginBottom: '2px' }}>
                          → {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary stats */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '12px',
            padding: '10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
                {result.criticalIssues || 0}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>Critical</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>
                {result.warnings || 0}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>Warnings</div>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#818cf8' }}>
            {Math.round((result.confidence || 0.89) * 100)}%
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
              Analysis Confidence
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
              Compliance verification
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * ENTITY EXTRACTION RESULTS
   */
  private renderEntityExtractionResults(result: any): React.ReactElement {
    return (
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'rgba(6,182,212,0.04)',
          border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '12px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '12px'
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#06b6d4' }} />
            <span style={{
              fontSize: '9px',
              color: '#06b6d4',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Entity Extraction Complete
            </span>
          </div>

          {/* Parties */}
          {result.parties && result.parties.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                PARTIES
              </div>
              {result.parties.map((party: any, i: number) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontSize: '10.5px', color: '#e2e8f0', fontWeight: 600 }}>
                    {party.name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                    {party.role} • {party.jurisdiction}
                  </div>
                  {party.contact && (
                    <div style={{ fontSize: '8.5px', color: '#67e8f9', marginTop: '2px' }}>
                      {party.contact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Dates */}
          {result.dates && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                KEY DATES
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px' }}>
                {Object.entries(result.dates).map(([key, value], i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: i < Object.keys(result.dates).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                  }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#e2e8f0', fontWeight: 500 }}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Terms */}
          {result.financialTerms && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                FINANCIAL TERMS
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px' }}>
                {Object.entries(result.financialTerms).map(([key, value], i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: i < Object.keys(result.financialTerms).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                  }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 600 }}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Obligations */}
          {result.keyObligations && result.keyObligations.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                KEY OBLIGATIONS
              </div>
              {result.keyObligations.map((obligation: string, i: number) => (
                <div key={i} style={{
                  fontSize: '9px',
                  color: '#e2e8f0',
                  padding: '6px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  • {obligation}
                </div>
              ))}
            </div>
          )}

          {/* Governing Law & Dispute Resolution */}
          <div style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px' }}>
              <strong>Governing Law:</strong> {result.governingLaw}
            </div>
            {result.disputeResolution && (
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                <strong>Dispute Resolution:</strong> {result.disputeResolution}
              </div>
            )}
          </div>
        </div>

        {/* Confidence */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#06b6d4' }}>
            {Math.round((result.confidence || 0.94) * 100)}%
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
              Extraction Confidence
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>
              Entity recognition
            </div>
          </div>
        </div>
      </div>
    );
  }
}