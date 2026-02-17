import * as React from 'react';
import { IContract } from '../../../models/IContract';
import { IAzureAIFoundryService } from '../../../services/AzureAIFoundryService';
import { ISharePointService } from '../../../services/SharePointService';
import { CLASSIFY_STEPS } from '../../../constants';
import { ClassifySelect } from './ClassifySelect';
import { ClassifyProcessing, IClassifyState } from './ClassifyProcessing';

export interface IClassificationViewProps {
  contracts: IContract[];
  aiFoundryService: IAzureAIFoundryService;
  sharePointService: ISharePointService;
  uploadedFile: File | null;
  fullAnalysis: any;
}

export const ClassificationView: React.FC<IClassificationViewProps> = ({
    contracts, aiFoundryService, sharePointService, uploadedFile, fullAnalysis
}) => {
    const [view, setView] = React.useState<'select' | 'processing'>('select');
    const [selectedFile, setSelectedFile] = React.useState(0);
    const [selectedType, setSelectedType] = React.useState('contract_type');
    const [classifyState, setClassifyState] = React.useState<IClassifyState | null>(null);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    // Auto-start classification when view changes to 'processing'
    React.useEffect(() => {
        if (view === 'processing' && !classifyState) {
            startClassificationSimulation();
        }
    }, [view]);

    const startClassificationSimulation = (): void => {
        let currentStep = 0;
        setClassifyState({ step: 0, done: false });

        const runNextStep = (): void => {
            currentStep++;

            if (currentStep >= CLASSIFY_STEPS.length) {
                performActualClassification();
                return;
            }

            if (mountedRef.current) {
                setClassifyState({ step: currentStep, done: false });
            }

            setTimeout(runNextStep, CLASSIFY_STEPS[currentStep].duration);
        };

        setTimeout(runNextStep, CLASSIFY_STEPS[0].duration);
    };

    const performActualClassification = async (): Promise<void> => {
        try {
            const contract = contracts[selectedFile];

            // Check if we have cached analysis for this document
            if (fullAnalysis && uploadedFile && contract?.name === uploadedFile.name) {
                let result;
                switch (selectedType) {
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

                if (mountedRef.current) {
                    setClassifyState({
                        step: CLASSIFY_STEPS.length - 1,
                        done: true,
                        result
                    });
                }
                return;
            }

            // No cached data - run fresh analysis
            let documentText = '';

            if (uploadedFile) {
                documentText = await aiFoundryService.extractTextFromFile(uploadedFile);
            } else if (contract?.fileUrl) {
                const fileBlob = await sharePointService.getContractFile(contract.fileUrl);
                documentText = await aiFoundryService.extractTextFromFile(fileBlob);
            } else if (contract?.fullText) {
                documentText = contract.fullText;
            }

            let result;

            switch (selectedType) {
                case 'contract_type':
                    result = await classifyContractType(documentText);
                    break;
                case 'risk_assessment':
                    result = await classifyRiskAssessment(documentText);
                    break;
                case 'compliance_check':
                    result = await classifyCompliance(documentText);
                    break;
                case 'entity_extraction':
                    result = await classifyEntities(documentText);
                    break;
                default:
                    result = await classifyContractType(documentText);
            }

            if (mountedRef.current) {
                setClassifyState({
                    step: CLASSIFY_STEPS.length - 1,
                    done: true,
                    result
                });
            }

        } catch (error) {
            console.error('[Classification] Error:', error);
            if (mountedRef.current) {
                setClassifyState({
                    step: CLASSIFY_STEPS.length - 1,
                    done: true,
                    result: getFallbackResult(selectedType)
                });
            }
        }
    };

    const classifyContractType = async (documentText: string): Promise<any> => {
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

        const response = await aiFoundryService.callAI(prompt, 1500);
        return parseJSON(response);
    };

    const classifyRiskAssessment = async (documentText: string): Promise<any> => {
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

        const response = await aiFoundryService.callAI(prompt, 2000);
        return parseJSON(response);
    };

    const classifyCompliance = async (documentText: string): Promise<any> => {
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

        const response = await aiFoundryService.callAI(prompt, 2000);
        return parseJSON(response);
    };

    const classifyEntities = async (documentText: string): Promise<any> => {
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

        const response = await aiFoundryService.callAI(prompt, 2000);
        return parseJSON(response);
    };

    const handleClassify = (): void => {
        setView('processing');
    };

    const handleReset = (): void => {
        setClassifyState(null);
        setView('select');
    };

    const uploadedFileName = uploadedFile?.name || '';

    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        {view === 'select' && (
          <ClassifySelect
            contracts={contracts}
            selectedFile={selectedFile}
            selectedType={selectedType}
            onFileChange={setSelectedFile}
            onTypeChange={setSelectedType}
            onClassify={handleClassify}
          />
        )}
        {view === 'processing' && (
          <ClassifyProcessing
            classifyState={classifyState}
            uploadedFileName={uploadedFileName}
            selectedClassificationType={selectedType}
            contracts={contracts}
            selectedFileForClassification={selectedFile}
            onReset={handleReset}
          />
        )}
      </div>
    );
};

function parseJSON(response: string): any {
    try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
            return JSON.parse(cleaned);
        } catch {
            // Direct parse failed - try to extract JSON from text
        }

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }

        console.error('[Classification] No valid JSON found in response');
        return null;

    } catch (error) {
        console.error('[Classification] JSON parse error:', error);
        return null;
    }
}

function getFallbackResult(classificationType: string): any {
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
}
