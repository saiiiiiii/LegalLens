import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { ClockRegular } from '@fluentui/react-icons';
import { ProgressSteps } from './ProgressSteps';
import { ContractTypeResults } from './ResultTypes/ContractTypeResults';
import { RiskAssessmentResults } from './ResultTypes/RiskAssessmentResults';
import { ComplianceResults } from './ResultTypes/ComplianceResults';
import { EntityExtractionResults } from './ResultTypes/EntityExtractionResults';

export interface IClassifyState {
  step: number;
  done: boolean;
  result?: any;
}

export interface IClassifyProcessingProps {
  classifyState: IClassifyState | null;
  uploadedFileName: string;
  selectedClassificationType: string;
  contracts: IContract[];
  selectedFileForClassification: number;
  onReset: () => void;
}

export const ClassifyProcessing: React.FC<IClassifyProcessingProps> = ({
    classifyState, uploadedFileName, selectedClassificationType,
    contracts, selectedFileForClassification, onReset
}) => {
    const contract = contracts[selectedFileForClassification];

    const renderResults = (): React.ReactElement => {
      switch (selectedClassificationType) {
        case 'contract_type':
          return <ContractTypeResults result={classifyState!.result} />;
        case 'risk_assessment':
          return <RiskAssessmentResults result={classifyState!.result} />;
        case 'compliance_check':
          return <ComplianceResults result={classifyState!.result} />;
        case 'entity_extraction':
          return <EntityExtractionResults result={classifyState!.result} />;
        default:
          return <ContractTypeResults result={classifyState!.result} />;
      }
    };

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
              onClick={onReset}
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
            <ProgressSteps
              classifyState={classifyState}
              uploadedFileName={uploadedFileName}
              contract={contract}
            />
          </div>

          {/* RIGHT: Results */}
          <div>
            {classifyState?.done && classifyState.result ? renderResults() : (
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
            )}
          </div>
        </div>
      </>
    );
};
