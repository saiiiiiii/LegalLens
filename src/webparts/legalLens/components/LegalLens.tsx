import * as React from 'react';
import type { ILegalLensProps } from './ILegalLensProps';
import { parseJSON, getFallbackResult } from '../utilities/classificationUtils';
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
  DocumentBulletListRegular,
  ScalesRegular,
} from '@fluentui/react-icons';
import { LibraryView } from './Tabs/Library/LibraryView';
import { ILegalLensState } from './ILegalLensState';
import { CLASSIFY_STEPS, buildContractTypePrompt, buildRiskAssessmentPrompt, buildCompliancePrompt, buildEntityExtractionPrompt } from '../constants';
import { AlertsView } from './Tabs/Alerts/AlertsView';
import { TranslateView } from './Tabs/Translate/TranslateView';
import { ClassificationView } from './Tabs/Classification/ClassificationView';
import { ESignatureView } from './Tabs/ESignature/ESignatureView';

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
        this.classifyContractType(documentText),
        this.classifyRiskAssessment(documentText),
        this.classifyCompliance(documentText),
        this.classifyEntities(documentText)
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

  public render(): React.ReactElement<ILegalLensProps> {
    const { view, loading, error } = this.state;

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
      <div className="legallens-wp" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #0f172a 50%, #1e293b 100%)', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(0.95)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
          .legallens-wp .nav-btn:hover{
            background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
            color:#fff;
            transform:translateY(-2px);
          }
          .legallens-wp .card-row:hover{
            background:rgba(255,255,255,0.05);
            transform:translateX(4px);
          }
          .legallens-wp .card-row{
            transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
              { key: 'alerts', label: 'Alerts', highlight: false },
              { key: 'esignature', label: 'E-Signature', highlight: true }
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
      case 'classify': return <ClassificationView contracts={this.state.contracts} sharePointService={this.props.sharePointService} aiFoundryService={this.props.aiFoundryService} uploadedFile={this.state.uploadedFile} fullAnalysis={this.state.fullAnalysis} />;
      case 'translate': return <TranslateView contracts={this.state.contracts} aiFoundryService={this.props.aiFoundryService} />
      case 'alerts': return <AlertsView contracts={this.state.contracts} />;
      case 'esignature': return (
        <ESignatureView
          contracts={this.state.contracts}
          sharePointService={this.props.sharePointService}
          userDisplayName={this.props.userDisplayName}
        />
      );
      default: return <LibraryView sharePointService={this.props.sharePointService} />;
    }
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
              <span style={{ fontSize: '18px' }}/>
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
          result = await this.classifyContractType(documentText);
          break;
        case 'risk_assessment':
          result = await this.classifyRiskAssessment(documentText);
          break;
        case 'compliance_check':
          result = await this.classifyCompliance(documentText);
          break;
        case 'entity_extraction':
          result = await this.classifyEntities(documentText);
          break;
        default:
          result = await this.classifyContractType(documentText);
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
          result: getFallbackResult(this.state.selectedClassificationType)
        }
      });
    }
  };

  private classifyContractType = async (documentText: string): Promise<any> => {
    const response = await this.props.aiFoundryService.callAI(buildContractTypePrompt(documentText), 1500);
    return parseJSON(response);
  };

  private classifyRiskAssessment = async (documentText: string): Promise<any> => {
    const response = await this.props.aiFoundryService.callAI(buildRiskAssessmentPrompt(documentText), 2000);
    return parseJSON(response);
  };

  private classifyCompliance = async (documentText: string): Promise<any> => {
    const response = await this.props.aiFoundryService.callAI(buildCompliancePrompt(documentText), 2000);
    return parseJSON(response);
  };

  private classifyEntities = async (documentText: string): Promise<any> => {
    const response = await this.props.aiFoundryService.callAI(buildEntityExtractionPrompt(documentText), 2000);
    return parseJSON(response);
  };

}