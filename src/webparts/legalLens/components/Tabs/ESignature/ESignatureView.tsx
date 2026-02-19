import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { ISharePointService } from '../../../services/SharePointService';
import { jsPDF } from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'select' | 'author' | 'place' | 'sign';
type SignMode = 'draw' | 'type' | 'upload';

interface ISigner {
  id:    string;
  name:  string;
  title: string;
  email: string;
}

interface ISignatureField {
  id:      string;
  type:    'signature' | 'date' | 'name';
  x:       number;
  y:       number;
  width:   number;
  height:  number;
  signer:  string;
  value?:  string;
}

export interface IESignatureViewProps {
  contracts:         IContract[];
  sharePointService: ISharePointService;
  userDisplayName:   string;
}

const PEN_COLORS = ['#000000', '#0066cc', '#00aa00', '#cc0000'];
const SIG_FONTS = [
  { name: 'Elegant', css: "'Dancing Script', cursive" },
  { name: 'Classic', css: "'Pinyon Script', cursive" },
  { name: 'Refined', css: "'Great Vibes', cursive" },
];

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ESignatureView: React.FC<IESignatureViewProps> = ({
  contracts, sharePointService, userDisplayName,
}) => {
  const [step,      setStep]      = React.useState<Step>('select');
  const [contract,  setContract]  = React.useState<IContract | null>(null);
  const [signers,   setSigners]   = React.useState<ISigner[]>([
    { id: makeId(), name: userDisplayName, title: '', email: '' },
  ]);
  const [fields,    setFields]    = React.useState<ISignatureField[]>([]);
  const [dragField, setDragField] = React.useState<string | null>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);

  // Signature pad state
  const [padField,  setPadField]  = React.useState<ISignatureField | null>(null);
  const [mode,      setMode]      = React.useState<SignMode>('draw');
  const [penColor,  setPenColor]  = React.useState(PEN_COLORS[0]);
  const [sigFont,   setSigFont]   = React.useState(SIG_FONTS[0].css);
  const [typedName, setTypedName] = React.useState(userDisplayName);
  const [uploadImg, setUploadImg] = React.useState<string | null>(null);
  const [canvasEmpty, setCanvasEmpty] = React.useState(true);
  const [saving,    setSaving]    = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [signedPdf, setSignedPdf] = React.useState<any>(null);
  
  // Track signed contracts from SharePoint
  const [signedContractNames, setSignedContractNames] = React.useState<Set<string>>(new Set());
  const [loadingSignedDocs, setLoadingSignedDocs] = React.useState(true);

  const [viewMode, setViewMode] = React.useState<'unsigned' | 'signed'>('unsigned');

  // Load signed documents from SharePoint on mount
  React.useEffect(() => {
    async function loadSignedDocs() {
      try {
        const signedDocs = await sharePointService.getSignedDocuments();
        const names = new Set(signedDocs.map(d => d.contractName));
        setSignedContractNames(names);
        console.log('[ESignature] Loaded', names.size, 'signed documents from SharePoint');
      } catch (err) {
        console.error('[ESignature] Failed to load signed documents:', err);
      } finally {
        setLoadingSignedDocs(false);
      }
    }
    loadSignedDocs();
  }, [sharePointService]);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const docRef    = React.useRef<HTMLDivElement>(null);

  // Drag handlers with useCallback to prevent infinite re-renders
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!dragField || !dragStart || !docRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setFields(prev => prev.map(f => f.id === dragField ? { ...f, x: f.x + dx, y: f.y + dy } : f));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [dragField, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    setDragField(null);
    setDragStart(null);
  }, []);

  // Attach drag event listeners
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

  // Load fonts
  React.useEffect(() => {
    const id = 'll-sig-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pinyon+Script&family=Great+Vibes&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  // Helper to transition to place step with auto-generated signature blocks
  const goToPlaceStep = () => {
    // Auto-generate signature fields for each signer
    const newFields: ISignatureField[] = [];
    
    signers.forEach((signer, index) => {
      const yOffset = 150 + (index * 150); // Space them vertically
      
      // Signature field
      newFields.push({
        id: makeId(),
        type: 'signature',
        signer: signer.id,
        x: 50,
        y: yOffset,
        width: 200,
        height: 60,
      });
      
      // Date field
      newFields.push({
        id: makeId(),
        type: 'date',
        signer: signer.id,
        x: 270,
        y: yOffset + 20,
        width: 120,
        height: 40,
      });
    });
    
    setFields(newFields);
    setStep('place');
  };

  // Helper to transition to sign step with auto-filled fields
  const goToSignStep = () => {
    // Auto-fill date and name fields before entering sign step
    setFields(prev => prev.map(f => {
      if (f.type === 'date' && !f.value) {
        return { ...f, value: new Date().toLocaleDateString() };
      }
      if (f.type === 'name' && !f.value) {
        const signer = signers.find(s => s.id === f.signer);
        return { ...f, value: signer?.name || '' };
      }
      return f;
    }));
    setStep('sign');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1: SELECT DOCUMENT
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'select') {
    // Show loading state while fetching signed docs from SharePoint
    if (loadingSignedDocs) {
      return (
        <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading documents...</div>
        </div>
      );
    }

    // Filter contracts based on whether they've been signed (by contract name)
    const unsignedContracts = contracts.filter(c => !signedContractNames.has(c.name));
    const signedContracts = contracts.filter(c => signedContractNames.has(c.name));
    const displayContracts = viewMode === 'unsigned' ? unsignedContracts : signedContracts;

    // Function to handle viewing/downloading signed document
    const handleViewSigned = async (contractName: string) => {
      try {
        console.log('[ESignature] Downloading signed document:', contractName);
        
        // Fetch signed PDF from SharePoint
        const blob = await sharePointService.getSignedDocumentFile(contractName);
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Signed_${contractName.replace(/\.[^.]+$/, '')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('[ESignature] ✓ Download initiated');
      } catch (err: any) {
        console.error('[ESignature] Download failed:', err);
        alert(`Download failed: ${err.message}\n\nPlease ensure the document exists in the "Signed Documents" library.`);
      }
    };

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader 
          title="Select Document" 
          subtitle={`Choose a contract to sign from your library (${unsignedContracts.length} unsigned, ${signedContracts.length} signed)`} 
        />

        {/* View mode toggle */}
        <div style={{ 
          display: 'flex', gap: 8, marginBottom: 16, padding: '4px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          width: 'fit-content',
        }}>
          <button onClick={() => setViewMode('unsigned')} style={{
            padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: viewMode === 'unsigned' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
            color: viewMode === 'unsigned' ? '#fff' : '#94a3b8',
            fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
          }}>
            📄 Unsigned ({unsignedContracts.length})
          </button>
          <button onClick={() => setViewMode('signed')} style={{
            padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: viewMode === 'signed' ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
            color: viewMode === 'signed' ? '#fff' : '#94a3b8',
            fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
          }}>
            ✓ Signed ({signedContracts.length})
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
          {displayContracts.length === 0 && (
            <div style={{ 
              padding: 40, textAlign: 'center', color: '#64748b', fontSize: 12,
              background: 'rgba(255,255,255,0.02)', borderRadius: 12,
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              {viewMode === 'unsigned' 
                ? '🎉 All documents have been signed!' 
                : '📝 No signed documents yet. Start signing from the "Unsigned" tab.'}
            </div>
          )}
          {displayContracts.map(c => {
            const isSigned = signedContractNames.has(c.name);
            return (
              <div 
                key={c.id} 
                onClick={() => {
                  if (!isSigned) {
                    setContract(c); 
                    setStep('author');
                  }
                }} 
                style={{
                  padding: '16px 20px', borderRadius: 12, 
                  cursor: isSigned ? 'default' : 'pointer',
                  background: 'rgba(255,255,255,0.02)', 
                  border: isSigned 
                    ? '1px solid rgba(16,185,129,0.2)' 
                    : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 14, 
                  transition: 'all 0.2s',
                  opacity: isSigned ? 0.9 : 1,
                }}
                onMouseEnter={e => !isSigned && (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                onMouseLeave={e => !isSigned && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              >
                <span style={{ fontSize: 32 }}>{isSigned ? '✅' : '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{c.name}</div>
                    {isSigned && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)',
                      }}>SIGNED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {c.type} · {c.parties.slice(0, 2).join(', ')}
                  </div>
                </div>
                {!isSigned ? (
                  <div style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                    background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                  }}>SELECT →</div>
                ) : (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleViewSigned(c.name); 
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: '#fff',
                      fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
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

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: AUTHOR DETAILS (Signers)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'author' && contract) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Add Signers"
          subtitle={`Document: ${contract.name}`}
          onBack={() => setStep('select')}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {signers.map((s, i) => (
            <div key={s.id} style={{
              padding: '16px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>
                  Signer {i + 1}
                </span>
                {signers.length > 1 && (
                  <button onClick={() => setSigners(p => p.filter(x => x.id !== s.id))} style={{
                    padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 10,
                  }}>Remove</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input value={s.name} onChange={e => setSigners(p => p.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                    placeholder="Legal name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Title / Role</label>
                  <input value={s.title} onChange={e => setSigners(p => p.map(x => x.id === s.id ? { ...x, title: e.target.value } : x))}
                    placeholder="e.g. CEO" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>Email (optional)</label>
                <input value={s.email} onChange={e => setSigners(p => p.map(x => x.id === s.id ? { ...x, email: e.target.value } : x))}
                  placeholder="email@company.com" style={inputStyle} />
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setSigners(p => [...p, { id: makeId(), name: '', title: '', email: '' }])} style={{
          width: '100%', padding: '10px', borderRadius: 9, cursor: 'pointer',
          border: '1.5px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)',
          color: '#818cf8', fontSize: 11, marginBottom: 20,
        }}>+ Add Another Signer</button>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Btn onClick={() => setStep('select')}>← Back</Btn>
          <Btn disabled={signers.some(s => !s.name.trim())} onClick={goToPlaceStep} primary>
            Place Signature Fields →
          </Btn>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: PLACE FIELDS (Drag & Drop)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'place' && contract) {
    const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
      e.preventDefault();
      setDragField(fieldId);
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const addField = (type: 'signature' | 'date' | 'name') => {
      // Show signer selection if multiple signers
      if (signers.length > 1 && type === 'signature') {
        // We'll handle this in the UI - for now add with first signer
        const signerId = signers[0].id;
        setFields(p => [...p, {
          id: makeId(), type, signer: signerId,
          x: 50, y: 100 + p.length * 60,
          width: type === 'signature' ? 200 : type === 'date' ? 120 : 180,
          height: type === 'signature' ? 60 : 40,
        }]);
      } else {
        setFields(p => [...p, {
          id: makeId(), type, signer: signers[0].id,
          x: 50, y: 100 + p.length * 60,
          width: type === 'signature' ? 200 : type === 'date' ? 120 : 180,
          height: type === 'signature' ? 60 : 40,
        }]);
      }
    };

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Place Signature Fields"
          subtitle="Drag fields onto the document where signatures are needed"
          onBack={() => setStep('author')}
        />

        {/* Toolbar */}
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 14,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, color: '#64748b', marginRight: 4 }}>Add Field:</span>
          <button onClick={() => addField('signature')} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            fontSize: 11, fontWeight: 600,
          }}>✍️ Signature</button>
          <button onClick={() => addField('date')} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(8,145,178,0.15)', color: '#0891b2', fontSize: 11, fontWeight: 600,
          }}>📅 Date</button>
          <button onClick={() => addField('name')} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(5,150,105,0.15)', color: '#059669', fontSize: 11, fontWeight: 600,
          }}>👤 Name</button>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>
            {fields.length} field{fields.length !== 1 ? 's' : ''} placed
          </span>
        </div>

        {/* Document preview with draggable fields */}
        <div
          ref={docRef}
          style={{
            position: 'relative', minHeight: 600, marginBottom: 16,
            background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: '30px 35px',
            border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
          }}
        >
          {/* Contract text */}
          <div style={{
            fontSize: 10.5, color: '#94a3b8', lineHeight: 1.9, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', pointerEvents: 'none', userSelect: 'none',
          }}>
            {(contract as any).fullText
              ? (contract as any).fullText.slice(0, 2500) + '\n\n[Document continues…]'
              : contract.summary || '(No document text)'}
          </div>

          {/* Draggable fields */}
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

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Btn onClick={() => setStep('author')}>← Back</Btn>
          <Btn disabled={fields.length === 0} onClick={goToSignStep} primary green>
            Continue to Sign →
          </Btn>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: SIGN DOCUMENT / SUCCESS
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'sign' && contract) {
    const handleSign = async () => {
      const allSignatures = fields.filter(f => f.type === 'signature').every(f => f.value);
      if (!allSignatures) return;
      setSaving(true);
      try {
        // Generate PDF
        const pdf = await generateSignedPDF(contract, fields, signers);
        const pdfBlob = pdf.output('blob');
        const fileName = `${contract.name.replace(/\.[^.]+$/, '')}_signed_${Date.now()}.pdf`;

        // Save to SharePoint only
        await sharePointService.saveSignedDocument(fileName, pdfBlob, {
          contractName: contract.name,
          signerNames:  signers.map(s => s.name).join('; '),
          signedAt:     new Date().toISOString(),
        });

        // Refresh signed documents list from SharePoint
        const signedDocs = await sharePointService.getSignedDocuments();
        const names = new Set(signedDocs.map(d => d.contractName));
        setSignedContractNames(names);

        // Store PDF for download and show success
        setSignedPdf(pdf);
        setCompleted(true);
      } catch (err: any) {
        console.error('[ESignature] Save failed:', err);
        alert('Error: ' + (err.message || String(err)));
      } finally {
        setSaving(false);
      }
    };

    const handleDownload = () => {
      if (!signedPdf) return;
      const fileName = `${contract.name.replace(/\.[^.]+$/, '')}_signed_${Date.now()}.pdf`;
      signedPdf.save(fileName);
    };

    const handleNewDocument = () => {
      setStep('select');
      setContract(null);
      setSigners([{ id: makeId(), name: userDisplayName, title: '', email: '' }]);
      setFields([]);
      setCompleted(false);
      setSignedPdf(null);
      setViewMode('unsigned'); // Reset to unsigned view
    };

    // Show success screen after signing
    if (completed) {
      return (
        <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', padding: '40px 20px' }}>
          {/* Success checkmark */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'slideUp 0.4s ease',
          }}>
            <span style={{ fontSize: 48, color: '#fff' }}>✓</span>
          </div>

          <div style={{
            fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8,
            fontFamily: "'Cinzel',Georgia,serif",
          }}>Document Signed Successfully!</div>

          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 30 }}>
            Saved to "Signed Documents" library in SharePoint
          </div>

          {/* Document info card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'left',
            maxWidth: 500, margin: '0 auto 24px',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Signed Document
            </div>
            <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 12 }}>
              {contract.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11 }}>
              <div>
                <span style={{ color: '#64748b' }}>Signers:</span>
                <div style={{ color: '#94a3b8', marginTop: 2 }}>
                  {signers.map(s => s.name).join(', ')}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Completed:</span>
                <div style={{ color: '#94a3b8', marginTop: 2 }}>
                  {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownload} style={{
              padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: '#fff',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(8,145,178,0.4)',
            }}>
              <span>⬇</span> Download PDF
            </button>

            <button onClick={handleNewDocument} style={{
              padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}>
              <span>+</span> Sign New Document
            </button>
          </div>

          <div style={{ marginTop: 30, fontSize: 10, color: '#475569' }}>
            💡 Your signed document has been saved to SharePoint and is ready to download
          </div>
        </div>
      );
    }

    // Regular signing screen
    // Calculate signing status
    const currentUserFields = fields.filter(f => {
      const signer = signers.find(s => s.id === f.signer);
      return f.type === 'signature' && signer?.name === userDisplayName;
    });
    const currentUserSigned = currentUserFields.every(f => f.value);
    const allSignatureFields = fields.filter(f => f.type === 'signature');
    const allSigned = allSignatureFields.every(f => f.value);

    // Status message
    let statusMessage = '';
    if (currentUserSigned && !allSigned) {
      const pendingSigners = signers.filter(s => {
        const signerFields = allSignatureFields.filter(f => f.signer === s.id);
        return signerFields.some(f => !f.value);
      }).map(s => s.name);
      statusMessage = `✓ You've signed. Waiting for: ${pendingSigners.join(', ')}`;
    } else if (!currentUserSigned) {
      statusMessage = `Please sign your ${currentUserFields.length} signature field${currentUserFields.length > 1 ? 's' : ''}`;
    } else if (allSigned) {
      statusMessage = '✓ All signatures complete! Ready to save.';
    }

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <StepHeader
          title="Sign Document"
          subtitle={statusMessage || `${fields.filter(f => f.value).length} / ${allSignatureFields.length} signatures completed`}
          onBack={() => setStep('place')}
        />

        {/* Document preview */}
        <div style={{
          position: 'relative', minHeight: 520, marginBottom: 16,
          background: 'rgba(15,23,42,0.95)', borderRadius: 12, padding: '30px 35px',
          border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto',
        }}>
          <div style={{
            fontSize: 10.5, color: '#94a3b8', lineHeight: 1.9, whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {(contract as any).fullText
              ? (contract as any).fullText.slice(0, 2500) + '\n\n[Document continues…]'
              : contract.summary}
          </div>

          {/* Field overlays */}
          {fields.map(f => (
            <FieldOverlay
              key={f.id}
              field={f}
              signers={signers}
              currentUser={userDisplayName}
              onClick={() => f.type === 'signature' && !f.value && setPadField(f)}
            />
          ))}
        </div>

        {/* Complete button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          {/* Multi-signer info */}
          {signers.length > 1 && !allSigned && (
            <div style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: 11, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>ℹ️</span>
              <div>
                {currentUserSigned 
                  ? 'Document requires all signers to complete. Share this link with other signers.'
                  : 'You can only sign fields assigned to you. Other signers must sign their own fields.'}
              </div>
            </div>
          )}

          <button onClick={handleSign} disabled={!allSigned || saving} style={{
            padding: '12px 32px', borderRadius: 10, border: 'none',
            cursor: allSigned && !saving ? 'pointer' : 'not-allowed',
            background: !allSigned || saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#10b981,#059669)',
            color: !allSigned || saving ? '#475569' : '#fff',
            fontSize: 13, fontWeight: 700, opacity: !allSigned || saving ? 0.55 : 1,
            boxShadow: allSigned && !saving ? '0 4px 20px rgba(16,185,129,0.4)' : 'none',
          }}>
            {saving ? '⏳ Saving...' : allSigned ? '✓ Complete & Save to SharePoint' : currentUserSigned ? '⏳ Waiting for Other Signers' : '✓ Complete & Save to SharePoint'}
          </button>
        </div>

        {/* Signature pad modal */}
        {padField && (
          <SignaturePad
            fieldLabel="Your Signature"
            mode={mode} onMode={setMode}
            penColor={penColor} onPenColor={setPenColor}
            canvasRef={canvasRef} canvasEmpty={canvasEmpty} setCanvasEmpty={setCanvasEmpty}
            typedName={typedName} onTypedName={setTypedName}
            sigFont={sigFont} onFont={setSigFont}
            uploadImg={uploadImg} setUploadImg={setUploadImg}
            onApply={value => {
              setFields(p => p.map(f => f.id === padField.id ? { ...f, value } : f));
              setPadField(null);
            }}
            onClose={() => setPadField(null)}
          />
        )}
      </div>
    );
  }

  return <div>Loading...</div>;
};

// ─── Helper Components ────────────────────────────────────────────────────────
function StepHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }): React.ReactElement {
  return (
    <div style={{ marginBottom: 20 }}>
      {onBack && (
        <button onClick={onBack} style={{
          padding: '6px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: 11, marginBottom: 12,
        }}>← Back</button>
      )}
      <div style={{
        fontFamily: "'Cinzel',Georgia,serif", fontSize: 20, fontWeight: 600,
        background: 'linear-gradient(135deg,#fff,#a5b4fc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', marginBottom: 4,
      }}>{title}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</div>
    </div>
  );
}

function DraggableField({ field, isDragging, onMouseDown, onRemove, signers }: {
  field: ISignatureField; isDragging: boolean; signers: ISigner[];
  onMouseDown: (e: React.MouseEvent) => void; onRemove: () => void;
}): React.ReactElement {
  const colors = { signature: '#6366f1', date: '#0891b2', name: '#059669' };
  const labels = { signature: '✍️ Signature', date: '📅 Date', name: '👤 Name' };
  const signer = signers.find(s => s.id === field.signer);
  
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute', left: field.x, top: field.y,
        width: field.width, height: field.height,
        background: isDragging ? `${colors[field.type]}33` : `${colors[field.type]}22`,
        border: `2px dashed ${colors[field.type]}`,
        borderRadius: 6, cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: colors[field.type], fontWeight: 700, userSelect: 'none',
        transition: 'all 0.15s', padding: '4px',
      }}
    >
      <div>{labels[field.type]}</div>
      {signer && (
        <div style={{ fontSize: 8, marginTop: 2, opacity: 0.7 }}>
          {signer.name}
        </div>
      )}
      <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{
        position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: '50%',
        background: '#ef4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>×</button>
    </div>
  );
}

function FieldOverlay({ field, onClick, signers, currentUser }: { 
  field: ISignatureField; 
  onClick: () => void; 
  signers: ISigner[];
  currentUser: string;
}): React.ReactElement {
  const baseColors = { signature: '#6366f1', date: '#0891b2', name: '#059669' };
  const signer = signers.find(s => s.id === field.signer);
  const isCurrentUserField = signer?.name === currentUser;
  const canSign = field.type === 'signature' && !field.value && isCurrentUserField;
  
  // Different colors for different signers
  const signerIndex = signers.findIndex(s => s.id === field.signer);
  const signerColors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899']; // Blue, Amber, Green, Pink
  const signerColor = signerColors[signerIndex % signerColors.length];
  const fieldColor = field.type === 'signature' ? signerColor : baseColors[field.type];
  
  return (
    <div
      onClick={canSign ? onClick : undefined}
      title={signer ? `${signer.name}'s ${field.type}` : field.type}
      style={{
        position: 'absolute', left: field.x, top: field.y,
        width: field.width, height: field.height,
        background: field.value 
          ? 'rgba(16,185,129,0.08)' 
          : isCurrentUserField 
            ? `${fieldColor}20` 
            : `${fieldColor}08`,
        border: field.value 
          ? '2px solid rgba(16,185,129,0.4)' 
          : isCurrentUserField 
            ? `2px solid ${fieldColor}` 
            : `2px dashed ${fieldColor}55`,
        borderRadius: 6, 
        cursor: canSign ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        overflow: 'hidden', padding: '4px',
        fontSize: 9, 
        color: field.value ? '#10b981' : fieldColor, 
        fontWeight: 600,
        opacity: isCurrentUserField ? 1 : 0.5,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (canSign) e.currentTarget.style.opacity = '0.8';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = isCurrentUserField ? '1' : '0.5';
      }}
    >
      {field.value && field.type === 'signature' ? (
        <img src={field.value} alt="sig" style={{ maxHeight: '90%', maxWidth: '95%' }} />
      ) : field.type === 'signature' ? (
        <>
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            {isCurrentUserField ? '✍️ Click to Sign' : '⏳ Awaiting Signature'}
          </div>
          <div style={{ fontSize: 7, marginTop: 3, opacity: 0.8, textAlign: 'center' }}>
            {signer?.name}
          </div>
        </>
      ) : (
        field.value || (field.type === 'date' ? 'Date' : 'Name')
      )}
    </div>
  );
}

function Btn({ children, onClick, disabled, primary, green }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; green?: boolean;
}): React.ReactElement {
  const bg = disabled ? 'rgba(255,255,255,0.04)'
    : green   ? 'linear-gradient(135deg,#10b981,#059669)'
    : primary ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
    : 'rgba(255,255,255,0.07)';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 20px', borderRadius: 9, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: bg, color: disabled ? '#475569' : '#fff',
      fontSize: 11.5, fontWeight: 700, opacity: disabled ? 0.55 : 1,
      boxShadow: !disabled && (primary || green) ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
    }}>{children}</button>
  );
}

// ─── Signature Pad Modal (CSP-safe, no external libraries) ───────────────────
function SignaturePad({ fieldLabel, mode, onMode, penColor, onPenColor, canvasRef, canvasEmpty, setCanvasEmpty,
  typedName, onTypedName, sigFont, onFont, uploadImg, setUploadImg, onApply, onClose }: {
  fieldLabel: string; mode: SignMode; onMode: (m: SignMode) => void;
  penColor: string; onPenColor: (c: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>; canvasEmpty: boolean; setCanvasEmpty: (v: boolean) => void;
  typedName: string; onTypedName: (v: string) => void;
  sigFont: string; onFont: (f: string) => void;
  uploadImg: string | null; setUploadImg: (v: string | null) => void;
  onApply: (value: string) => void; onClose: () => void;
}): React.ReactElement {
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [lastPos, setLastPos] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current || mode !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size (larger for better quality)
    canvas.width = canvas.offsetWidth * 2.5;
    canvas.height = canvas.offsetHeight * 2.5;
    ctx.scale(2.5, 2.5);
    
    // Drawing settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3; // Thicker line for visibility
    ctx.strokeStyle = penColor;
    
    setCanvasEmpty(true);
  }, [canvasRef, mode, penColor, setCanvasEmpty]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDrawing(true);
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCanvasEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d')!;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCanvasEmpty(true);
  };

  const handleApply = () => {
    let value: string | null = null;
    if (mode === 'draw' && !canvasEmpty && canvasRef.current) {
      value = canvasRef.current.toDataURL('image/png');
    } else if (mode === 'type' && typedName.trim()) {
      const c = document.createElement('canvas');
      c.width = 400; c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.font = `48px ${sigFont}`;
      ctx.fillStyle = penColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName.trim(), 200, 50);
      value = c.toDataURL('image/png');
    } else if (mode === 'upload' && uploadImg) {
      value = uploadImg;
    }
    if (value) onApply(value);
  };

  const canApplyNow = (mode === 'draw' && !canvasEmpty) || (mode === 'type' && typedName.trim()) || (mode === 'upload' && uploadImg);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(6,9,18,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, background: '#0f172a', border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 18, padding: 24, boxShadow: '0 28px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 700 }}>Sign: {fieldLabel}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Choose how you want to sign</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer',
          }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {(['draw', 'type', 'upload'] as SignMode[]).map(m => (
            <button key={m} onClick={() => onMode(m)} style={{
              flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: mode === m ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
              color: mode === m ? '#a5b4fc' : '#64748b',
              border: mode === m ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
              fontSize: 11, fontWeight: 600,
            }}>{m === 'draw' ? '✏️ Draw' : m === 'type' ? 'Aa Type' : '⬆ Upload'}</button>
          ))}
        </div>

        {mode === 'draw' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>Pen:</span>
              {PEN_COLORS.map(c => (
                <div key={c} onClick={() => onPenColor(c)} style={{
                  width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: penColor === c ? '2px solid #a5b4fc' : '2px solid transparent',
                }} />
              ))}
              <button onClick={clearCanvas} style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: 10, cursor: 'pointer',
              }}>Clear</button>
            </div>
            <canvas ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{
                width: '100%', height: 150, borderRadius: 10, cursor: 'crosshair',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'block',
              }}
            />
          </div>
        )}

        {mode === 'type' && (
          <div>
            <input value={typedName} onChange={e => onTypedName(e.target.value)}
              placeholder="Type your full name…" style={{
                width: '100%', padding: '10px 13px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 15,
                outline: 'none', marginBottom: 14, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
              {SIG_FONTS.map(f => (
                <button key={f.css} onClick={() => onFont(f.css)} style={{
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: f.css, fontSize: 18,
                  background: sigFont === f.css ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  color: sigFont === f.css ? '#a5b4fc' : '#94a3b8',
                  border: sigFont === f.css ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                }}>{typedName || f.name}</button>
              ))}
            </div>
            {typedName && (
              <div style={{
                height: 80, borderRadius: 10, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: sigFont, fontSize: 36, color: penColor,
              }}>{typedName}</div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <label style={{
            display: 'block', padding: 30, borderRadius: 10, cursor: 'pointer',
            border: '1.5px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)',
            textAlign: 'center',
          }}>
            <input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const r = new FileReader();
              r.onload = ev => setUploadImg(ev.target?.result as string);
              r.readAsDataURL(file);
            }} style={{ display: 'none' }} />
            {uploadImg ? (
              <img src={uploadImg} alt="sig" style={{ maxHeight: 100, maxWidth: '100%' }} />
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⬆️</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Click to upload signature image</div>
              </>
            )}
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: 12, fontWeight: 600,
          }}>Cancel</button>
          <button onClick={handleApply} disabled={!canApplyNow} style={{
            flex: 2, padding: '10px', borderRadius: 9, border: 'none',
            cursor: canApplyNow ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700,
            background: canApplyNow ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
            color: canApplyNow ? '#fff' : '#475569',
            boxShadow: canApplyNow ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
          }}>Apply Signature</button>
        </div>
      </div>
    </div>
  );
}

// ─── PDF Generation with jsPDF ────────────────────────────────────────────────
async function generateSignedPDF(contract: IContract, fields: ISignatureField[], signers: ISigner[]): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 25;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // ─── DOCUMENT TITLE ───
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  
  // Extract title from contract name (remove .docx extension)
  const docTitle = contract.name.replace(/\.(docx|pdf|txt)$/i, '').toUpperCase();
  pdf.text(docTitle, margin, yPos);
  yPos += 12;

  // ─── DOCUMENT CONTENT ───
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const contractText = (contract as any).fullText || contract.summary || '';
  
  // Split into lines while preserving structure
  const allLines = contractText.split('\n');
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    // Check for page break
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = margin;
    }
    
    // Handle empty lines (paragraph breaks)
    if (line.trim() === '') {
      yPos += 5;
      continue;
    }
    
    // Check if line is a section header (starts with §, all caps, or "AND", "BY:")
    const isHeader = /^(§\d|AND$|BY:|TITLE:|DATE:)/i.test(line.trim()) || 
                     (line.trim().length > 0 && line.trim() === line.trim().toUpperCase() && line.trim().length < 60);
    
    if (isHeader) {
      // Section headers
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      
      // Wrap header if needed
      const headerLines = pdf.splitTextToSize(line.trim(), contentWidth);
      for (const headerLine of headerLines) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }
        pdf.text(headerLine, margin, yPos);
        yPos += 6;
      }
      
      yPos += 2; // Extra space after headers
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
    } else {
      // Regular content - wrap to page width
      const wrappedLines = pdf.splitTextToSize(line.trim(), contentWidth);
      
      for (const wrappedLine of wrappedLines) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }
        pdf.text(wrappedLine, margin, yPos);
        yPos += 6;
      }
    }
  }

  // ─── SIGNATURE PAGE (NEW PAGE) ───
  pdf.addPage();
  yPos = 40;

  // Draw header box
  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SIGNATURE PAGE', pageWidth / 2, 15, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);

  // ─── SIGNATURES ───
  const signatureFields = fields.filter(f => f.type === 'signature' && f.value);
  
  if (signers.length === 2 && signatureFields.length === 2) {
    // Two-column layout for 2 signers
    const colWidth = (contentWidth - 15) / 2;
    let maxHeight = 0;
    
    signatureFields.forEach((sigField, index) => {
      const signer = signers.find(s => s.id === sigField.signer);
      if (!signer) return;
      
      const xOffset = margin + (index * (colWidth + 15));
      let sigYPos = yPos;
      
      // Signature image - LARGER SIZE
      if (sigField.value) {
        try {
          // Increased from 20 to 30mm height for better visibility
          pdf.addImage(sigField.value, 'PNG', xOffset, sigYPos, colWidth * 0.85, 30);
        } catch (e) {
          console.warn('Signature image error:', e);
        }
      }
      sigYPos += 35; // Increased spacing
      
      // Signature line
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(xOffset, sigYPos, xOffset + colWidth, sigYPos);
      sigYPos += 7;
      
      // Name
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(signer.name, xOffset, sigYPos);
      sigYPos += 6;
      
      // Title
      if (signer.title) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(signer.title, xOffset, sigYPos);
        sigYPos += 6;
      }
      
      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Date: ${dateStr}`, xOffset, sigYPos);
      
      pdf.setTextColor(0, 0, 0);
      maxHeight = Math.max(maxHeight, sigYPos - yPos);
    });
    
    yPos += maxHeight + 20;
  } else {
    // Stacked layout for 1 or 3+ signers
    for (const sigField of signatureFields) {
      const signer = signers.find(s => s.id === sigField.signer);
      if (!signer) continue;
      
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = margin;
      }
      
      // Signature image - LARGER SIZE
      if (sigField.value) {
        try {
          // Increased from 70x20 to 90x30 for better visibility
          pdf.addImage(sigField.value, 'PNG', margin, yPos, 90, 30);
        } catch (e) {
          console.warn('Signature image error:', e);
        }
      }
      yPos += 35; // Increased spacing
      
      // Signature line
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, yPos, margin + 90, yPos);
      yPos += 7;
      
      // Name
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(signer.name, margin, yPos);
      yPos += 6;
      
      // Title
      if (signer.title) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(signer.title, margin, yPos);
        yPos += 6;
      }
      
      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Date: ${dateStr}`, margin, yPos);
      
      yPos += 25;
      pdf.setTextColor(0, 0, 0);
    }
  }

  // ─── FOOTER ───
  const footerY = pageHeight - 20;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('This document has been electronically signed. The signatures above are legally binding.', 
           pageWidth / 2, footerY, { align: 'center' });
  
  pdf.setFontSize(8);
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Signed on: ${timestamp}`, pageWidth / 2, footerY + 5, { align: 'center' });

  return pdf;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
  background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 12,
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, color: '#64748b', fontWeight: 700,
  letterSpacing: '0.5px', marginBottom: 5, textTransform: 'uppercase',
};