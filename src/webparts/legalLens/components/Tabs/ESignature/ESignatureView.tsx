import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { ISharePointService } from '../../../services/SharePointService';
import { ISigner, ISignatureField, SignatureStep } from '../../../models/ISignature';
import {
  PEN_COLORS,
  SIGNATURE_FONTS,
  FONTS_CDN_URL,
  FIELD_COLORS,
  FIELD_LABELS,
  CANVAS_SETTINGS,
} from '../../../constants/signatureConstants';
import { useSignatureWorkflow } from '../../../hooks/useSignatureWorkflow';
import { useDraftDocuments } from '../../../hooks/useDraftDocuments';
import { useSignedDocuments } from '../../../hooks/useSignedDocuments';
import { generateTableFields, calculateDocumentMargin } from '../../../utilities/fieldPositioning';
import { generateSignedPDF } from '../../../utilities/pdfGenerator';
import { StepHeader } from './StepHeader';
import { SignatureTable } from './SignatureTable';

export interface IESignatureViewProps {
  contracts: IContract[];
  sharePointService: ISharePointService;
  userDisplayName: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ESignatureView: React.FC<IESignatureViewProps> = ({
  contracts,
  sharePointService,
  userDisplayName,
}) => {
  // Initialize hooks
  const workflow = useSignatureWorkflow(userDisplayName);
  const drafts = useDraftDocuments();
  const signed = useSignedDocuments(sharePointService);

  // Destructure workflow state
  const {
    step,
    viewMode,
    contract,
    signers,
    fields,
    completed,
    saving,
    setStep,
    setViewMode,
    setFields,
    setCompleted,
    setSaving,
    selectContract,
    addSigner,
    removeSigner,
    updateSigner,
    reset,
    makeId,
  } = workflow;

  // Signature pad state
  const [padField, setPadField] = React.useState<ISignatureField | null>(null);
  const [mode, setMode] = React.useState<'draw' | 'type' | 'upload'>('draw');
  const [penColor, setPenColor] = React.useState(PEN_COLORS[0]);
  const [sigFont, setSigFont] = React.useState(SIGNATURE_FONTS[0].css);
  const [typedName, setTypedName] = React.useState(userDisplayName);
  const [uploadImg, setUploadImg] = React.useState<string | null>(null);
  const [canvasEmpty, setCanvasEmpty] = React.useState(true);
  const [signedPdf, setSignedPdf] = React.useState<any>(null);

  // Refs
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const docRef = React.useRef<HTMLDivElement>(null);

  // Drag state
  const [dragField, setDragField] = React.useState<string | null>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);

  // Load Google Fonts
  React.useEffect(() => {
    const fontId = 'll-sig-fonts';
    if (!document.getElementById(fontId)) {
      const l = document.createElement('link');
      l.id = fontId;
      l.rel = 'stylesheet';
      l.href = FONTS_CDN_URL;
      document.head.appendChild(l);
    }
  }, []);

  // Canvas setup
  React.useEffect(() => {
    if (!canvasRef.current || mode !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = canvas.offsetWidth * CANVAS_SETTINGS.scale;
    canvas.height = canvas.offsetHeight * CANVAS_SETTINGS.scale;
    ctx.scale(CANVAS_SETTINGS.scale, CANVAS_SETTINGS.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = CANVAS_SETTINGS.lineWidth;
    ctx.strokeStyle = penColor;
    setCanvasEmpty(true);
  }, [canvasRef, mode, penColor, setCanvasEmpty]);

  // ─── Workflow Actions ─────────────────────────────────────────────────────

  const goToPlaceStep = () => {
    const newFields = generateTableFields(signers);
    setFields(newFields);
    setStep('place');
  };

  const goToSignStep = () => {
    setFields(prev =>
      prev.map(f => {
        if (f.type === 'date' && !f.value) {
          return { ...f, value: new Date().toLocaleDateString() };
        }
        if (f.type === 'name' && !f.value) {
          const signer = signers.find(s => s.id === f.signer);
          return { ...f, value: signer?.name || '' };
        }
        return f;
      })
    );
    setStep('sign');
  };

  const handleResumeInProgress = (contractId: number) => {
    const draft = drafts.getDraft(contractId);
    const contractData = contracts.find(c => c.id === contractId);

    if (!draft || !contractData) {
      alert('Draft not found');
      return;
    }

    workflow.resumeFromDraft(contractData, draft.signers, draft.fields);
  };

  // ─── Signature Actions ────────────────────────────────────────────────────

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCanvasEmpty(true);
  };

  const captureSignature = () => {
    let imgData: string | null = null;

    if (mode === 'draw') {
      if (!canvasRef.current || canvasEmpty) {
        alert('Please draw your signature first');
        return;
      }
      imgData = canvasRef.current.toDataURL('image/png');
    } else if (mode === 'type') {
      if (!typedName.trim()) {
        alert('Please type your name');
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 120);
      ctx.fillStyle = '#000000';
      ctx.font = `48px ${sigFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 200, 60);
      imgData = tempCanvas.toDataURL('image/png');
    } else if (mode === 'upload') {
      if (!uploadImg) {
        alert('Please upload an image');
        return;
      }
      imgData = uploadImg;
    }

    if (imgData && padField) {
      setFields(prev =>
        prev.map(f => (f.id === padField.id ? { ...f, value: imgData! } : f))
      );
      setPadField(null);
      setCanvasEmpty(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      setUploadImg(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    canvasRef.current.onmousemove = draw;
    setCanvasEmpty(false);
  };

  const draw = (e: MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (canvasRef.current) {
      canvasRef.current.onmousemove = null;
    }
  };

  // ─── Drag & Drop Handlers ─────────────────────────────────────────────────

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      e.preventDefault();
      setDragField(fieldId);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!dragField || !dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setFields(prev =>
        prev.map(f =>
          f.id === dragField ? { ...f, x: f.x + dx, y: f.y + dy } : f
        )
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [dragField, dragStart]
  );

  const handleMouseUp = React.useCallback(() => {
    setDragField(null);
    setDragStart(null);
  }, []);

  React.useEffect(() => {
    if (dragField) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragField, handleMouseMove, handleMouseUp]);

  // ─── Save/Complete Actions ────────────────────────────────────────────────

  const handleSign = async () => {
    const allSignatures = fields.filter(f => f.type === 'signature').every(f => f.value);
    const anySignature = fields.filter(f => f.type === 'signature').some(f => f.value);

    if (!anySignature) {
      alert('Please sign at least one signature field');
      return;
    }

    setSaving(true);
    try {
      if (allSignatures && contract) {
        // All signatures complete - save to SharePoint
        const pdf = await generateSignedPDF(contract, fields, signers);
        const pdfBlob = pdf.output('blob');
        const fileName = `${contract.name.replace(/\.[^.]+$/, '')}_signed_${Date.now()}.pdf`;

        await sharePointService.saveSignedDocument(fileName, pdfBlob, {
          contractName: contract.name,
          signerNames: signers.map(s => s.name).join('; '),
          signedAt: new Date().toISOString(),
        });

        // Refresh signed documents
        await signed.refresh();

        // Remove from drafts
        drafts.removeDraft(contract.id);

        // Store PDF and show success
        setSignedPdf(pdf);
        setCompleted(true);
      } else if (contract) {
        // Partial signatures - save as draft
        drafts.saveDraft(contract.id, contract.name, signers, fields);
        alert('✓ Progress saved! Other signers can continue later.');
        reset();
      }
    } catch (err: any) {
      console.error('[Sign] Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (signedPdf && contract) {
      signedPdf.save(`${contract.name.replace(/\.[^.]+$/, '')}_signed.pdf`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── SIGNATURE PAD MODAL (renders on top of everything) ───────────────────
  const renderSignaturePad = () => {
    if (!padField) return null;
    
    console.log('[ESignatureView] Rendering signature pad modal for field:', padField.id);
    
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={() => setPadField(null)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 16,
            padding: 30,
            width: '90%',
            maxWidth: 600,
            border: '1px solid rgba(99,102,241,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#e2e8f0' }}>
            ✍️ Add Your Signature
          </h3>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['draw', 'type', 'upload'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: mode === m ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  color: mode === m ? '#818cf8' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Draw mode */}
          {mode === 'draw' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {PEN_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: penColor === c ? '3px solid #818cf8' : '2px solid rgba(255,255,255,0.2)',
                      background: c,
                      cursor: 'pointer',
                    }}
                  />
                ))}
                <button
                  onClick={clearCanvas}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                style={{
                  width: '100%',
                  height: 200,
                  background: '#fff',
                  borderRadius: 8,
                  border: '2px solid rgba(99,102,241,0.3)',
                  cursor: 'crosshair',
                }}
              />
            </>
          )}

          {/* Type mode */}
          {mode === 'type' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {SIGNATURE_FONTS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setSigFont(f.css)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: sigFont === f.css ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      color: sigFont === f.css ? '#818cf8' : '#94a3b8',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="Type your name"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: 8,
                  border: '2px solid rgba(99,102,241,0.3)',
                  background: '#fff',
                  fontSize: 32,
                  fontFamily: sigFont,
                  textAlign: 'center',
                }}
              />
            </>
          )}

          {/* Upload mode */}
          {mode === 'upload' && (
            <div
              style={{
                padding: 40,
                borderRadius: 8,
                border: '2px dashed rgba(99,102,241,0.3)',
                background: 'rgba(255,255,255,0.02)',
                textAlign: 'center',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'block', margin: '0 auto', color: '#94a3b8', fontSize: 12 }}
              />
              {uploadImg && (
                <img
                  src={uploadImg}
                  alt="uploaded"
                  style={{ marginTop: 20, maxWidth: '100%', maxHeight: 150 }}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={() => setPadField(null)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={captureSignature}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Apply Signature
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── STEP 1: SELECT DOCUMENT ──────────────────────────────────────────────
  if (step === 'select') {
    if (signed.loading) {
      return (
        <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading documents...</div>
        </div>
      );
    }

    const unsignedContracts = contracts.filter(
      c => !signed.signedContractNames.has(c.name) && !drafts.inProgressContractNames.has(c.name)
    );
    const inProgressContracts = contracts.filter(c =>
      drafts.inProgressContractNames.has(c.name)
    );
    const signedContracts = contracts.filter(c => signed.signedContractNames.has(c.name));

    const displayContracts =
      viewMode === 'unsigned'
        ? unsignedContracts
        : viewMode === 'inprogress'
        ? inProgressContracts
        : signedContracts;

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Select Document"
          subtitle={`Choose a contract to sign (${unsignedContracts.length} unsigned, ${inProgressContracts.length} in progress, ${signedContracts.length} signed)`}
        />

        {/* View mode toggle */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            padding: '4px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            width: 'fit-content',
          }}
        >
          <button
            onClick={() => setViewMode('unsigned')}
            style={{
              padding: '8px 16px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              background:
                viewMode === 'unsigned'
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'transparent',
              color: viewMode === 'unsigned' ? '#fff' : '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            📄 Unsigned ({unsignedContracts.length})
          </button>
          <button
            onClick={() => setViewMode('inprogress')}
            style={{
              padding: '8px 16px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              background:
                viewMode === 'inprogress'
                  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                  : 'transparent',
              color: viewMode === 'inprogress' ? '#fff' : '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            ⏳ In Progress ({inProgressContracts.length})
          </button>
          <button
            onClick={() => setViewMode('signed')}
            style={{
              padding: '8px 16px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              background:
                viewMode === 'signed'
                  ? 'linear-gradient(135deg,#10b981,#059669)'
                  : 'transparent',
              color: viewMode === 'signed' ? '#fff' : '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            ✓ Signed ({signedContracts.length})
          </button>
        </div>

        {/* Document list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
          {displayContracts.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#64748b',
                fontSize: 12,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
            >
              {viewMode === 'unsigned'
                ? '🎉 All documents have been signed!'
                : viewMode === 'inprogress'
                ? '📝 No documents in progress'
                : '✓ No signed documents yet'}
            </div>
          )}

          {displayContracts.map(c => {
            const isSigned = signed.signedContractNames.has(c.name);
            const isInProgress = drafts.inProgressContractNames.has(c.name);
            const draft = drafts.getDraft(c.id);
            const progress = isInProgress && draft ? drafts.getProgress(c.id) : null;

            return (
              <div
                key={c.id}
                onClick={() => {
                  if (isInProgress) {
                    handleResumeInProgress(c.id);
                  } else if (!isSigned) {
                    selectContract(c);
                  }
                }}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  cursor: isSigned ? 'default' : 'pointer',
                  background: 'rgba(255,255,255,0.02)',
                  border: isSigned
                    ? '1px solid rgba(16,185,129,0.2)'
                    : isInProgress
                    ? '1px solid rgba(245,158,11,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                  opacity: isSigned ? 0.9 : 1,
                }}
                onMouseEnter={e =>
                  !isSigned &&
                  (e.currentTarget.style.background = isInProgress
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(99,102,241,0.08)')
                }
                onMouseLeave={e =>
                  !isSigned && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')
                }
              >
                <span style={{ fontSize: 32 }}>
                  {isSigned ? '✅' : isInProgress ? '⏳' : '📄'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{c.name}</div>
                    {isSigned && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(16,185,129,0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        SIGNED
                      </span>
                    )}
                    {isInProgress && progress && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(245,158,11,0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}
                      >
                        IN PROGRESS ({progress.signed}/{progress.total})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {c.type} · {c.parties.slice(0, 2).join(', ')}
                    {isInProgress && draft && (
                      <span style={{ marginLeft: 8, color: '#f59e0b' }}>
                        · Last saved: {new Date(draft.savedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {!isSigned && !isInProgress ? (
                  <div
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      background: 'rgba(99,102,241,0.12)',
                      color: '#818cf8',
                    }}
                  >
                    SELECT →
                  </div>
                ) : isInProgress ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleResumeInProgress(c.id);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span>▶</span> Continue Signing
                  </button>
                ) : (
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      try {
                        await signed.downloadDocument(c.name);
                      } catch (err: any) {
                        alert(`Download failed: ${err.message}`);
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span>⬇</span> Download
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── STEP 2: ADD SIGNERS ──────────────────────────────────────────────────
  if (step === 'author' && contract) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Add Signers"
          subtitle="Who needs to sign this document?"
          onBack={() => setStep('select')}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {signers.map((signer, index) => (
            <div
              key={signer.id}
              style={{
                padding: 16,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
                  Signer #{index + 1}
                </span>
                {signers.length > 1 && (
                  <button
                    onClick={() => removeSigner(signer.id)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    × Remove
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={signer.name}
                  onChange={e => updateSigner(signer.id, { name: e.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={signer.title}
                  onChange={e => updateSigner(signer.id, { title: e.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={signer.email}
                  onChange={e => updateSigner(signer.id, { email: e.target.value })}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e2e8f0',
                    fontSize: 12,
                    gridColumn: '1 / -1',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSigner}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.08)',
            color: '#818cf8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          + Add Another Signer
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setStep('select')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            disabled={signers.some(s => !s.name.trim())}
            onClick={goToPlaceStep}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: signers.some(s => !s.name.trim())
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: signers.some(s => !s.name.trim()) ? '#475569' : '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: signers.some(s => !s.name.trim()) ? 'not-allowed' : 'pointer',
              opacity: signers.some(s => !s.name.trim()) ? 0.5 : 1,
            }}
          >
            Place Signature Fields →
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 3: PLACE FIELDS ─────────────────────────────────────────────────
  if (step === 'place' && contract) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Place Signature Fields"
          subtitle="Signature table is auto-generated at the top"
          onBack={() => setStep('author')}
        />

        {/* Document preview with table */}
        <div
          ref={docRef}
          style={{
            position: 'relative',
            minHeight: 600,
            marginBottom: 16,
            background: 'rgba(15,23,42,0.95)',
            borderRadius: 12,
            padding: '30px 35px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Signature Table */}
          <div style={{ position: 'absolute', top: 30, left: 35, right: 35, zIndex: 1 }}>
            <SignatureTable signers={signers} mode="place" />
          </div>

          {/* Draggable fields */}
          <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'auto' }}>
            {fields.map(f => (
              <DraggableField
                key={f.id}
                field={f}
                signers={signers}
                isDragging={dragField === f.id}
                onMouseDown={e => handleMouseDown(e, f.id)}
                onRemove={() => setFields(p => p.filter(x => x.id !== f.id))}
              />
            ))}
          </div>

          {/* Contract text */}
          <div
            style={{
              fontSize: 10.5,
              color: '#94a3b8',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pointerEvents: 'none',
              userSelect: 'none',
              marginTop: calculateDocumentMargin(signers.length),
              paddingTop: 25,
              borderTop: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 15 }}>
              DOCUMENT CONTENT
            </div>
            {(contract as any).fullText
              ? (contract as any).fullText.slice(0, 2500) + '\n\n[Document continues…]'
              : contract.summary || '(No document text)'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setStep('author')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            disabled={fields.length === 0}
            onClick={goToSignStep}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background:
                fields.length === 0
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg,#10b981,#059669)',
              color: fields.length === 0 ? '#475569' : '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: fields.length === 0 ? 'not-allowed' : 'pointer',
              opacity: fields.length === 0 ? 0.5 : 1,
            }}
          >
            Continue to Sign →
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 4: SIGN DOCUMENT ────────────────────────────────────────────────
  if (step === 'sign' && contract) {
    // Success screen
    if (completed) {
      return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(16,185,129,0.08)',
              borderRadius: 16,
              border: '2px solid rgba(16,185,129,0.3)',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#10b981', fontWeight: 700 }}>
              Document Signed Successfully!
            </h2>
            <p style={{ margin: '0 0 30px', fontSize: 13, color: '#94a3b8' }}>
              Your signed document has been saved to SharePoint
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(8,145,178,0.4)',
                }}
              >
                <span>⬇</span> Download PDF
              </button>

              <button
                onClick={reset}
                style={{
                  padding: '12px 28px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                <span>+</span> Sign New Document
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Calculate status
    const currentUserFields = fields.filter(f => {
      const signer = signers.find(s => s.id === f.signer);
      return f.type === 'signature' && signer?.name === userDisplayName;
    });
    const currentUserSigned = currentUserFields.every(f => f.value);
    const allSignatureFields = fields.filter(f => f.type === 'signature');
    const allSigned = allSignatureFields.every(f => f.value);

    let statusMessage = '';
    if (currentUserSigned && !allSigned) {
      const pendingSigners = signers
        .filter(s => {
          const signerFields = allSignatureFields.filter(f => f.signer === s.id);
          return signerFields.some(f => !f.value);
        })
        .map(s => s.name);
      statusMessage = `✓ You've signed. Waiting for: ${pendingSigners.join(', ')}`;
    } else if (!currentUserSigned) {
      statusMessage = `Please sign your ${currentUserFields.length} signature field${
        currentUserFields.length > 1 ? 's' : ''
      }`;
    } else if (allSigned) {
      statusMessage = '✓ All signatures complete! Ready to save.';
    }

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Sign Document"
          subtitle={
            statusMessage ||
            `${fields.filter(f => f.value).length} / ${allSignatureFields.length} signatures completed`
          }
          onBack={() => setStep('place')}
        />

        {/* Document with table */}
        <div
          style={{
            position: 'relative',
            minHeight: 520,
            marginBottom: 16,
            background: 'rgba(15,23,42,0.95)',
            borderRadius: 12,
            padding: '30px 35px',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'auto',
          }}
        >
          <SignatureTable
            signers={signers}
            fields={fields}
            mode="sign"
            currentUser={userDisplayName}
            onFieldClick={field => {
              console.log('[ESignatureView] Opening signature pad for field:', field);
              setPadField(field);
            }}
          />

          <div
            style={{
              fontSize: 10.5,
              color: '#94a3b8',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {(contract as any).fullText
              ? (contract as any).fullText.slice(0, 2500) + '\n\n[Document continues…]'
              : contract.summary}
          </div>
        </div>

        {/* Info & action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          {signers.length > 1 && !allSigned && (
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 11,
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>ℹ️</span>
              <div>
                {currentUserSigned
                  ? 'Document requires all signers to complete. Share this link with other signers.'
                  : 'You can only sign fields assigned to you.'}
              </div>
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!currentUserSigned || saving}
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              cursor: currentUserSigned && !saving ? 'pointer' : 'not-allowed',
              background:
                !currentUserSigned || saving
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg,#10b981,#059669)',
              color: !currentUserSigned || saving ? '#475569' : '#fff',
              fontSize: 13,
              fontWeight: 700,
              opacity: !currentUserSigned || saving ? 0.55 : 1,
              boxShadow:
                currentUserSigned && !saving ? '0 4px 20px rgba(16,185,129,0.4)' : 'none',
            }}
          >
            {saving
              ? '⏳ Saving...'
              : allSigned
              ? '✓ Complete & Save to SharePoint'
              : currentUserSigned
              ? '⏳ Waiting for Other Signers'
              : '✓ Complete & Save to SharePoint'}
          </button>
        </div>
        
        {/* Signature pad modal overlay */}
        {renderSignaturePad()}
      </div>
    );
  }

  // Default return
  return (
    <>
      <div>Component error - invalid step: {step}</div>
      {renderSignaturePad()}
    </>
  );
};
// ─── DraggableField Component ─────────────────────────────────────────────────
function DraggableField({
  field,
  isDragging,
  onMouseDown,
  onRemove,
  signers,
}: {
  field: ISignatureField;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onRemove: () => void;
  signers: ISigner[];
}): React.ReactElement {
  const signer = signers.find(s => s.id === field.signer);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
        background: isDragging ? `${FIELD_COLORS[field.type]}33` : `${FIELD_COLORS[field.type]}22`,
        border: `2px dashed ${FIELD_COLORS[field.type]}`,
        borderRadius: 6,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: FIELD_COLORS[field.type],
        fontWeight: 700,
        userSelect: 'none',
        transition: 'all 0.15s',
        padding: '4px',
      }}
    >
      <div>{FIELD_LABELS[field.type]}</div>
      {signer && (
        <div style={{ fontSize: 8, marginTop: 2, opacity: 0.7 }}>{signer.name}</div>
      )}
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ef4444',
          border: 'none',
          color: '#fff',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}