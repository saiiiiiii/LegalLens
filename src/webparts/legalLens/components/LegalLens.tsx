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
import styles from './LegalLens.module.scss';

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
        <div className={styles.loadingWrap}>
          <div className={styles.loadingCenter}>
            <div className={styles.loadingSpinner} />
            <div className={styles.loadingText}>Loading contracts...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorWrap}>
          <div className={styles.errorCenter}>
            <div className={styles.errorEmoji}>⚠️</div>
            <div className={styles.errorTitle}>Error Loading Contracts</div>
            <div className={styles.errorMessage}>{error}</div>
            <button onClick={() => this.loadContracts()} className={styles.errorRetry}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`legallens-wp ${styles.appWrap}`}>
        <style>{`
          @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(0.95)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
          .legallens-wp .card-row:hover{
            background:rgba(255,255,255,0.05);
            transform:translateX(4px);
          }
          .legallens-wp .card-row{
            transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>

        <header className={styles.appHeader}>
          <div className={styles.headerLogo}>
            <ScalesRegular className={styles.headerIcon} />
            <span className={styles.headerTitle}>LegalLens</span>
          </div>

          <nav className={styles.headerNav}>
            {[
              { key: 'library', label: 'Library', highlight: false, visible: true },
              { key: 'upload', label: 'Upload & Analyze', highlight: true, visible: true },
              { key: 'classify', label: 'Classification', highlight: false, visible: true },
              { key: 'translate', label: 'TranslatePro', highlight: false, visible: this.props.showTranslateTab },
              { key: 'alerts', label: 'Alerts', highlight: false, visible: true },
              { key: 'esignature', label: 'E-Signature', highlight: true, visible: this.props.showESignatureTab }
            ].filter(tab => tab.visible).map(tab => (
              <button
                key={tab.key}
                className={styles.navBtn}
                onClick={() => this.setState({ view: tab.key as any })}
                style={{
                  background: view === tab.key ? (tab.highlight ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  color: view === tab.key ? (tab.highlight ? '#818cf8' : '#10b981') : '#64748b',
                }}
              >
                {tab.key === 'library' && <Library24Regular className={styles.navIcon} />}
                {tab.key === 'upload' && <ArrowUpload24Regular className={styles.navIcon} />}
                {tab.key === 'classify' && <DocumentSearch24Regular className={styles.navIcon} />}
                {tab.key === 'translate' && <LocalLanguage24Regular className={styles.navIcon} />}
                {tab.key === 'alerts' && <Alert24Regular className={styles.navIcon} />}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <main className={styles.appMain}>
          <div className={styles.appContent}>
            {this.renderView()}
          </div>
        </main>
      </div>
    );
  }

  private renderView(): React.ReactElement {
    switch (this.state.view) {
      case 'library':
        return <LibraryView sharePointService={this.props.sharePointService} aiFoundryService={this.props.aiFoundryService} langs={this.props.langs} />;
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
      case 'translate': return <TranslateView contracts={this.state.contracts} aiFoundryService={this.props.aiFoundryService} langs={this.props.langs} />
      case 'alerts': return <AlertsView contracts={this.state.contracts} />;
      case 'esignature': return (
        <ESignatureView
          contracts={this.state.contracts}
          sharePointService={this.props.sharePointService}
          userDisplayName={this.props.userDisplayName}
          userEmail={this.props.userEmail}
          context={this.props.context}
        />
      );
      default: return <LibraryView sharePointService={this.props.sharePointService} aiFoundryService={this.props.aiFoundryService} langs={this.props.langs} />;
    }
  }
}
