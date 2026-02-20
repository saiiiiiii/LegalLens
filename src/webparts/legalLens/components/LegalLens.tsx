import * as React from 'react';
import type { ILegalLensProps } from './ILegalLensProps';
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

      uploadedFile: null,
      fullAnalysis: null,

      pulseAlert: false
    };

    this._isMounted = false;
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

  private async loadContracts(silent = false): Promise<void> {
    try {
      if (!silent && this._isMounted) {
        this.setState({ loading: true, error: null });
      }

      const contracts = await this.props.sharePointService.getContracts();

      if (this._isMounted) {
        this.setState({ contracts, loading: false });
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

  private handleAnalysisComplete = (file: File, fullAnalysis: { contractType?: any; riskAssessment?: any; compliance?: any; entities?: any }): void => {
    if (this._isMounted) {
      this.setState({ uploadedFile: file, fullAnalysis });
    }
  };

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
          contracts={this.state.contracts}
          sharePointService={this.props.sharePointService}
          aiFoundryService={this.props.aiFoundryService}
          onAnalysisComplete={this.handleAnalysisComplete}
          onContractSaved={() => this.loadContracts(true)}
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
}