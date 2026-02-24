import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TokenService } from '../services/TokenService';
import { GraphService } from '../services/GraphService';
import { PDFService } from '../services/PDFService';
import { DocumentConverter } from '../services/DocumentConverter';

interface ISignatureSubmission {
  tokenId: string;
  email: string;
  signature: string;
}

export async function submitSignature(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[SubmitSignature] Request received');
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return { status: 200, headers };

  try {
    const body = await request.json() as ISignatureSubmission;
    const { tokenId, email, signature } = body;
    if (!tokenId || !email || !signature)
      return { status: 400, headers, jsonBody: { error: 'Missing: tokenId, email, signature' } };

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    context.log(`[SubmitSignature] Token: ${tokenId}, Email: ${email}, IP: ${ipAddress}`);

    const tokenService = new TokenService();
    const validation = await tokenService.validateToken(tokenId);
    if (!validation.valid || !validation.token)
      return { status: 400, headers, jsonBody: { error: validation.error || 'Invalid token' } };
    const token = validation.token;

    if (email.toLowerCase() !== token.signerEmail.toLowerCase())
      return { status: 403, headers, jsonBody: { error: 'Email does not match invitation' } };

    const graphService = new GraphService();

    context.log('[SubmitSignature] Downloading document...');
    const fileMetadata = await graphService.getFileByPath(process.env.CONTRACTS_LIBRARY_ID!, token.fileName);
    const originalBuffer = await graphService.downloadFile(process.env.CONTRACTS_LIBRARY_ID!, fileMetadata.id);
    context.log(`[SubmitSignature] Downloaded: ${originalBuffer.length} bytes (${token.fileName})`);

    context.log('[SubmitSignature] Converting to PDF with signature page...');
    const converter = new DocumentConverter();
    const pdfWithSigPage = await converter.toPDFWithSignaturePage(
      originalBuffer, token.fileName, token.contractName,
      [{ name: token.signerName, email: token.signerEmail }]
    );
    context.log(`[SubmitSignature] Converted: ${pdfWithSigPage.length} bytes`);

    const pdfService = new PDFService();
    const signedPDF = await pdfService.addSignatureToPDF(
      pdfWithSigPage, signature, token.signerName, token.signerEmail, 0, 1
    );
    context.log(`[SubmitSignature] Signed PDF: ${signedPDF.length} bytes`);

    const baseName = token.fileName.replace(/\.[^.]+$/, '');
    const signedFileName = `${baseName}_signed_${Date.now()}.pdf`;
    context.log(`[SubmitSignature] Uploading: ${signedFileName}`);
    const uploadedFileId = await graphService.uploadFile(process.env.SIGNED_DOCS_LIBRARY_ID!, signedFileName, signedPDF);

    const signedAt = new Date().toISOString();
    await graphService.updateFileMetadata(process.env.SIGNED_DOCS_LIBRARY_ID!, uploadedFileId, {
      ContractName: token.contractName,
      SignerName:   token.signerName,
      SignerEmail:  token.signerEmail,
      SignedDate:   signedAt,
      IPAddress:    ipAddress,
      ContractType: 'Signed Document',
      Status:       'Completed',
      Parties:      token.signerName,
      Tags:         'Signed;E-Signature;Completed',
      RiskScore:    0,
    });
    context.log('[SubmitSignature] Metadata updated');

    await tokenService.markTokenUsed(token.id, signature.substring(0, 100) + '...', email, ipAddress);
    context.log('[SubmitSignature] ✓ Complete');

    return { status: 200, headers, jsonBody: { success: true, message: 'Signature submitted successfully', signedDocument: signedFileName, signedAt } };

  } catch (error: any) {
    context.error('[SubmitSignature] Error:', error);
    return { status: 500, headers, jsonBody: { error: error.message } };
  }
}

app.http('submitSignature', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sign',
  handler: submitSignature,
});