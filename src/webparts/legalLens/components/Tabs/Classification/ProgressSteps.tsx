import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { CLASSIFY_STEPS } from '../../../constants';
import { IClassifyState } from './ClassifyProcessing';

export interface IProgressStepsProps {
  classifyState: IClassifyState | null;
  uploadedFileName: string;
  contract: IContract;
}

export const ProgressSteps: React.FC<IProgressStepsProps> = ({ classifyState, uploadedFileName, contract }) => {
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
};
