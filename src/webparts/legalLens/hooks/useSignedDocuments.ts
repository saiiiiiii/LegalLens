import { useState, useEffect } from 'react';
import { ISharePointService } from '../services/SharePointService';
import { ISignedDocument } from '../models/ISignature';

export function useSignedDocuments(sharePointService: ISharePointService) {
  const [signedDocs, setSignedDocs] = useState<ISignedDocument[]>([]);
  const [signedContractNames, setSignedContractNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignedDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await sharePointService.getSignedDocuments();
      setSignedDocs(docs);
      const names = new Set(docs.map(d => d.contractName));
      setSignedContractNames(names);
      console.log('[Signed] Loaded', names.size, 'documents');
    } catch (err: any) {
      console.error('[Signed] Error:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (contractName: string): Promise<void> => {
    try {
      console.log('[Signed] Downloading:', contractName);
      const blob = await sharePointService.getSignedDocumentFile(contractName);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Signed_${contractName.replace(/\.[^.]+$/, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('[Signed] Downloaded');
    } catch (err: any) {
      console.error('[Signed] Download failed:', err);
      throw new Error(`Download failed: ${err.message}`);
    }
  };

  useEffect(() => {
    loadSignedDocuments();
  }, []);

  return {
    signedDocs,
    signedContractNames,
    loading,
    error,
    refresh: loadSignedDocuments,
    downloadDocument,
  };
}