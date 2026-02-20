import * as React from 'react';
import type { ILegalLensProps } from './ILegalLensProps';
import { parseJSON, getFallbackResult } from '../utilities/classificationUtils';
import {
  Library24Regular,
  ArrowUpload24Regular,
  DocumentSearch24Regular,
  LocalLanguage24Regular,
  Alert24Regular,
  ScalesRegular,
} from '@fluentui/react-icons';
import { LibraryView } from './Tabs/Library/LibraryView';
import { ILegalLensState } from './ILegalLensState';
import { CLASSIFY_STEPS, buildContractTypePrompt, buildRiskAssessmentPrompt, buildCompliancePrompt, buildEntityExtractionPrompt } from '../constants';
import { AlertsView } from './Tabs/Alerts/AlertsView';
import { TranslateView } from './Tabs/Translate/TranslateView';
import { ClassificationView } from './Tabs/Classification/ClassificationView';
import { ESignatureView } from './Tabs/ESignature/ESignatureView';
import { UploadView } from './Tabs/Upload/UploadView';

export default class LegalLens extends React.Component<ILegalLensProps, ILegalLensState> {
  private pulseInterval: any;
  private _isMounted: boolean;

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
      case 'upload': return (
        <UploadView
          uploadView={this.state.uploadView}
          uploadedFileName={this.state.uploadedFileName}
          analysisResult={this.state.analysisResult}
          analyzingProgress={this.state.analyzingProgress}
          analyzeError={this.state.analyzeError}
          contracts={this.state.contracts}
          sharePointService={this.props.sharePointService}
          onFileUpload={this.handleFileUpload}
          onReset={() => this.setState({ uploadView: 'select', analysisResult: null })}
        />
      );
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