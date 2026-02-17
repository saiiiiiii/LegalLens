import * as JSZip from 'jszip';

export interface IAzureAIFoundryService {
  analyzeContract(fileBlob: Blob, fileName: string): Promise<IContractAnalysis>;
  classifyDocument(fileBlob: Blob, fileName: string, classificationType: string): Promise<IClassificationResult>;
  translate(text: string, targetLang: string, contractName: string): Promise<string>;
  askQuestionMultilingual(question: string, questionLang: string, contract: any, conversationHistory: any[]): Promise<IMultilingualAnswer>;
  extractTextFromFile(file: File | Blob): Promise<string>;
  callAI(prompt: string, maxTokens: number): Promise<string>;
}

export interface IContractAnalysis {
  fileName: string;
  parties: string[];
  effectiveDate: string;
  expiryDate: string;
  jurisdiction: string;
  contractType: string;
  clauses: Array<{
    ref: string;
    title: string;
    text: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskReason?: string;
  }>;
  overallRiskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  summary: string;
  analyzedAt: string;
}

export interface IClassificationResult {
  classificationType: string;
  confidence: number;
  primaryCategory: string;
  secondaryCategories: string[];
  detectedLanguage: string;
  keyTerms: string[];
  suggestedTags: string[];
  complianceFlags: Array<{
    regulation: string;
    applicable: boolean;
    reason: string;
  }>;
  classifiedAt: string;
}

export interface IMultilingualAnswer {
  question: string;
  questionLanguage: string;
  answer: string;
  answerLanguage: string;
  citedClauses: string[];
  confidence: number;
}

export class AzureAIFoundryService implements IAzureAIFoundryService {
  private projectEndpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private diEndpoint: string;
  private diKey: string;
  private diApiVersion: string = '2024-11-30';

  constructor(
    projectEndpoint: string,
    apiKey: string,
    deploymentName: string = 'gpt-4o',
    documentIntelligenceEndpoint?: string,
    documentIntelligenceKey?: string
  ) {
    this.projectEndpoint = projectEndpoint;
    this.apiKey = apiKey;
    this.deploymentName = deploymentName;
    this.diEndpoint = (documentIntelligenceEndpoint || '').replace(/\/$/, '');
    this.diKey = documentIntelligenceKey || '';

    console.log('[AzureAI] Initialized with:');
    console.log('  Endpoint:', projectEndpoint);
    console.log('  Deployment:', deploymentName);
    console.log('  Document Intelligence:', this.diEndpoint ? 'Enabled ✓' : 'Disabled');
  }

  /**
   * Extract PDF text via Azure Document Intelligence (prebuilt-read)
   */
  private async extractPDFWithDocumentIntelligence(pdfBlob: Blob, fileName: string): Promise<string> {
    console.log('[DocumentIntelligence] Submitting PDF:', fileName, '- Size:', pdfBlob.size, 'bytes');
    const analyzeUrl = `${this.diEndpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=${this.diApiVersion}`;
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'Ocp-Apim-Subscription-Key': this.diKey
      },
      body: pdfBlob
    });
    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      throw new Error(`Document Intelligence submit failed: ${submitResponse.status} - ${errText}`);
    }
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) throw new Error('No Operation-Location header from Document Intelligence');
    console.log('[DocumentIntelligence] Step 2: Document submitted, polling for results...');
    for (let attempt = 1; attempt <= 60; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': this.diKey }
      });
      if (!pollResponse.ok) throw new Error(`DI polling failed: ${pollResponse.status}`);
      const result = await pollResponse.json();
      console.log('[DocumentIntelligence] Polling attempt', attempt, '/ 60');
      console.log('[DocumentIntelligence] Status:', result.status);
      if (result.status === 'succeeded') {
        const content = result.analyzeResult?.content || '';
        console.log('[DocumentIntelligence] ✓ Extracted', content.length, 'characters from', fileName);
        return content;
      }
      if (result.status === 'failed') {
        throw new Error(`DI analysis failed: ${result.error?.message || 'Unknown'}`);
      }
    }
    throw new Error('Document Intelligence timeout after 2 minutes');
  }

  /**
   * Analyze contract from file
   */
  public async analyzeContract(fileBlob: Blob, fileName: string): Promise<IContractAnalysis> {
    console.log('[AzureAI] Analyzing contract:', fileName);

    try {
      // Extract text from file
      const extractedText = await this.extractTextFromFile(fileBlob);

      // Analyze with AI
      const analysisPrompt = `Analyze this legal contract and extract key information.

Contract Text:
${extractedText}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "parties": ["Party 1 name", "Party 2 name"],
  "effectiveDate": "YYYY-MM-DD or Not specified",
  "expiryDate": "YYYY-MM-DD or Not specified",
  "jurisdiction": "jurisdiction name",
  "contractType": "Vendor Agreement, NDA, SLA, etc",
  "clauses": [
    {
      "ref": "§1.1",
      "title": "Clause title",
      "text": "Brief clause summary (max 150 chars)",
      "riskLevel": "low",
      "riskReason": "optional reason if risky"
    }
  ],
  "overallRiskScore": 45,
  "riskFactors": [
    {
      "factor": "Limited liability cap",
      "severity": "medium",
      "description": "Liability capped at $2M",
      "recommendation": "Consider increasing cap"
    }
  ],
  "summary": "Brief 2-sentence contract summary"
}`;

      const result = await this.callAI(analysisPrompt, 2000);
      const analysis = this.parseJSON(result);

      return {
        fileName,
        parties: analysis.parties || ['Party A', 'Party B'],
        effectiveDate: analysis.effectiveDate || 'Not specified',
        expiryDate: analysis.expiryDate || 'Not specified',
        jurisdiction: analysis.jurisdiction || 'Not specified',
        contractType: analysis.contractType || 'General Agreement',
        clauses: analysis.clauses || [],
        overallRiskScore: analysis.overallRiskScore || 0,
        riskFactors: analysis.riskFactors || [],
        summary: analysis.summary || `Analysis of ${fileName}`,
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[AzureAI] Analysis error:', error);
      return this.getFallbackAnalysis(fileName);
    }
  }

  /**
   * Classify document
   */
  public async classifyDocument(
    fileBlob: Blob,
    fileName: string,
    classificationType: string
  ): Promise<IClassificationResult> {
    console.log('[AzureAI] Classifying:', fileName, 'Type:', classificationType);

    try {
      const text = await this.extractTextFromFile(fileBlob);

      const prompt = `Classify this document as "${classificationType}".

Text: ${text.substring(0, 2000)}

Respond with JSON only:
{
  "primaryCategory": "main category",
  "secondaryCategories": ["cat1", "cat2"],
  "confidence": 0.85,
  "detectedLanguage": "en",
  "keyTerms": ["term1", "term2"],
  "suggestedTags": ["tag1", "tag2"],
  "complianceFlags": [{"regulation": "GDPR", "applicable": true, "reason": "reason"}]
}`;

      const result = await this.callAI(prompt, 1500);
      const classification = this.parseJSON(result);

      return {
        classificationType,
        confidence: classification.confidence || 0.85,
        primaryCategory: classification.primaryCategory || 'Uncategorized',
        secondaryCategories: classification.secondaryCategories || [],
        detectedLanguage: classification.detectedLanguage || 'en',
        keyTerms: classification.keyTerms || [],
        suggestedTags: classification.suggestedTags || [],
        complianceFlags: classification.complianceFlags || [],
        classifiedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[AzureAI] Classification error:', error);
      return {
        classificationType,
        confidence: 0.5,
        primaryCategory: 'Uncategorized',
        secondaryCategories: [],
        detectedLanguage: 'en',
        keyTerms: [],
        suggestedTags: [],
        complianceFlags: [],
        classifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Translate text
   */
  public async translate(text: string, targetLang: string, contractName: string): Promise<string> {
    const langNames: { [key: string]: string } = {
      de: 'German',
      es: 'Spanish'
    };

    const prompt = `Translate this legal contract text to ${langNames[targetLang]}.

Keep clause references (§) unchanged.
Maintain formal legal language.

Text: ${text}

Output ONLY the translation, no explanations.`;

    return await this.callAI(prompt, 1500);
  }

  /**
   * Multilingual Q&A - Enhanced to use actual document content
   */
  public async askQuestionMultilingual(
    question: string,
    questionLang: string,
    contract: any,
    conversationHistory: any[]
  ): Promise<IMultilingualAnswer> {
    console.log('[AzureAI] Q&A in', questionLang, ':', question);

    const langNames: { [key: string]: string } = {
      en: 'English',
      de: 'German',
      es: 'Spanish'
    };

    // Build contract info - prefer full text if available
    let contractInfo = '';

    if (contract.fullText && contract.fullText.length > 100) {
      // Use actual document content
      console.log('[AzureAI] Using full document text (length:', contract.fullText.length, ')');
      contractInfo = `Contract: ${contract.name}

FULL CONTRACT TEXT:
${contract.fullText}

Basic Info:
Type: ${contract.type}
Parties: ${contract.parties.join(', ')}
Jurisdiction: ${contract.jurisdiction}`;
    } else {
      // Fallback to metadata summary
      console.log('[AzureAI] Using contract metadata/summary');
      contractInfo = `Contract: ${contract.name}
Type: ${contract.type}
Parties: ${contract.parties.join(', ')}
Jurisdiction: ${contract.jurisdiction}

Summary: ${contract.summary}

Clauses:
${contract.clauses.map((c: any) => `${c.ref} ${c.title}: ${c.text}`).join('\n')}`;
    }

    const systemPrompt = `You are a legal contract assistant. Answer questions about this contract in ${langNames[questionLang]}.

CRITICAL: Respond in ${langNames[questionLang]} (same language as question).
Use information from the contract only.
Cite clause references (§) when applicable.
Be specific and reference actual contract terms.

${contractInfo}`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });

    messages.push({ role: 'user', content: question });

    const answer = await this.callAIWithMessages(messages, 1500);
    const citedClauses = this.extractClauseReferences(answer);

    return {
      question,
      questionLanguage: questionLang,
      answer,
      answerLanguage: questionLang,
      citedClauses,
      confidence: 0.9
    };
  }


  /**
   * Extract text from file - proper extraction for different file types
   */
  public async extractTextFromFile(fileBlob: File | Blob): Promise<string> {
    try {
      const fileName = (fileBlob as File).name || '';
      const fileType = fileBlob.type;

      console.log('[AzureAI] Extracting text from:', fileName, 'Type:', fileType);

      // For .txt files - direct text extraction
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        const text = await fileBlob.text();
        console.log('[AzureAI] Text extracted (length):', text.length);
        return text;
      }

      // For .docx files - extract from XML
      if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')) {
        console.log('[AzureAI] Extracting from .docx file...');
        return await this.extractFromDocx(fileBlob);
      }

      // For .pdf files - use Document Intelligence if configured
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        if (this.diEndpoint && this.diKey) {
          console.log('[AzureAI] Using Document Intelligence for PDF extraction...');
          try {
            const text = await this.extractPDFWithDocumentIntelligence(fileBlob, fileName);
            console.log('[AzureAI] ✓ Extracted', text.length, 'characters via Document Intelligence');
            return text;
          } catch (diErr: any) {
            console.error('[AzureAI] Document Intelligence failed:', diErr.message);
          }
        } else {
          console.warn('[AzureAI] Document Intelligence not configured - set endpoint + key in web part properties');
        }
        return `[PDF: ${fileName}] Configure Document Intelligence endpoint and key in web part settings.`;
      }

      // Default - try text extraction
      const text = await fileBlob.text();
      if (text && text.length > 100 && !text.startsWith('PK')) {
        console.log('[AzureAI] Text extracted (length):', text.length);
        return text;
      }

      console.warn('[AzureAI] Could not extract readable text from file');
      return `[Document: ${fileName}] - Unable to extract text. Please use .txt or .docx format.`;

    } catch (error) {
      console.error('[AzureAI] Text extraction error:', error);
      return '[Document text extraction failed - Please try .txt format]';
    }
  }

  /**
   * Extract text from .docx file (XML-based format)
   */
  private async extractFromDocx(fileBlob: Blob): Promise<string> {
    try {
      // Read as ArrayBuffer
      const arrayBuffer = await fileBlob.arrayBuffer();

      // Use JSZip to extract the document.xml from .docx
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file('word/document.xml')?.async('text');

      if (!documentXml) {
        console.error('[AzureAI] Could not find document.xml in .docx');
        return '[Invalid .docx file format]';
      }

      // Extract text from XML (simple regex-based extraction)
      const textContent = documentXml
        .replace(/<w:t[^>]*>/g, '')
        .replace(/<\/w:t>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('[AzureAI] Extracted text from .docx (length):', textContent.length);
      return textContent || '[No text found in .docx file]';

    } catch (error) {
      console.error('[AzureAI] .docx extraction error:', error);
      return '[.docx extraction failed - Please try saving as .txt]';
    }
  }

  /**
   * Call Azure AI Foundry API - CORRECT FORMAT
   */
  public async callAI(prompt: string, maxTokens: number = 1500): Promise<string> {
    return await this.callAIWithMessages(
      [{ role: 'user', content: prompt }],
      maxTokens
    );
  }

  /**
   * Call AI with message history - Azure OpenAI format for AI Foundry
   */
  private async callAIWithMessages(messages: any[], maxTokens: number = 1500): Promise<string> {

    // Extract resource name from AI Foundry endpoint
    const resourceMatch = this.projectEndpoint.match(/https:\/\/([^.]+)-resource\.services\.ai\.azure\.com/);
    const resourceName = resourceMatch ? resourceMatch[1] : 'legallex';

    // Build Azure OpenAI endpoint
    const azureOpenAIEndpoint = `https://${resourceName}-resource.openai.azure.com`;
    const url = `${azureOpenAIEndpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2024-08-01-preview`;

    console.log('[AzureAI] Resource:', resourceName);
    console.log('[AzureAI] Calling:', url);

    const requestBody: any = {
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7
    };

    // Only use JSON mode for classification (when user message contains "JSON")
    // Don't use it for Q&A which needs natural language responses
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    if (userMessage.toLowerCase().includes('json') || userMessage.toLowerCase().includes('return only this json')) {
      requestBody.response_format = { type: "json_object" };
      console.log('[AzureAI] Using JSON mode for structured response');
    }

    console.log('[AzureAI] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[AzureAI] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AzureAI] Error response:', errorText);
      throw new Error(`AI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AzureAI] Success! Response received');

    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJSON(text: string): any {
    try {
      // Remove markdown code blocks
      const cleaned = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[AzureAI] JSON parse error:', error);
      return {};
    }
  }

  /**
   * Extract clause references from text
   */
  private extractClauseReferences(text: string): string[] {
    const regex = /§\s*[\d.]+/g;
    const matches = text.match(regex) || [];
    const unique: string[] = [];
    matches.forEach(m => {
      if (unique.indexOf(m) === -1) unique.push(m);
    });
    return unique;
  }

  /**
   * Fallback analysis
   */
  private getFallbackAnalysis(fileName: string): IContractAnalysis {
    return {
      fileName,
      parties: ['Party A', 'Party B'],
      effectiveDate: 'Not specified',
      expiryDate: 'Not specified',
      jurisdiction: 'Not specified',
      contractType: 'General Agreement',
      clauses: [
        {
          ref: '§1',
          title: 'General Terms',
          text: 'Standard contract terms apply.',
          riskLevel: 'low'
        }
      ],
      overallRiskScore: 0,
      riskFactors: [],
      summary: `Contract: ${fileName}. AI analysis unavailable - manual review required.`,
      analyzedAt: new Date().toISOString()
    };
  }
}