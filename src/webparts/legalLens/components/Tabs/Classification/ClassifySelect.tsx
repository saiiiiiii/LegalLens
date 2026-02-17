import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { CLASSIFICATION_TYPES } from '../../../constants';

export interface IClassifySelectProps {
  contracts: IContract[];
  selectedFile: number;
  selectedType: string;
  onFileChange: (index: number) => void;
  onTypeChange: (type: string) => void;
  onClassify: () => void;
}

export const ClassifySelect: React.FC<IClassifySelectProps> = ({
    contracts, selectedFile, selectedType, onFileChange, onTypeChange, onClassify
}) => {
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
              value={selectedFile}
              onChange={e => onFileChange(Number(e.target.value))}
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
                onClick={() => onTypeChange(type.value)}
                style={{
                  padding: '12px 16px',
                  background: selectedType === type.value ?
                    'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedType === type.value ?
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
                    border: '2px solid ' + (selectedType === type.value ?
                      '#818cf8' : 'rgba(255,255,255,0.2)'),
                    background: selectedType === type.value ? '#818cf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedType === type.value && (
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
                      color: selectedType === type.value ? '#818cf8' : '#e2e8f0',
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
            onClick={onClassify}
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
};
