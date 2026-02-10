import { SPFI, spfi, SPFx as spSPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IContract, IClause } from '../components/ILegalLensProps';

export interface ISharePointService {
  getContracts(): Promise<IContract[]>;
  getContractFile(fileUrl: string): Promise<Blob>;
  saveAnalyzedContract(fileName: string, fileBlob: Blob, analysisResult: any): Promise<void>;
}

export class SharePointService implements ISharePointService {
  private sp: SPFI;
  private libraryUrl: string;

  constructor(context: WebPartContext, libraryUrl: string) {
    this.sp = spfi().using(spSPFx(context));
    this.libraryUrl = libraryUrl;
    console.log('[SharePoint] Initialized with library:', libraryUrl);
  }

  /**
   * Get contracts from SharePoint library
   */
  public async getContracts(): Promise<IContract[]> {
    try {
      const listTitle = this.getListTitleFromUrl(this.libraryUrl);
      console.log('[SharePoint] Fetching contracts from:', listTitle);
      
      const items = await this.sp.web.lists
        .getByTitle(listTitle)
        .items
        .select(
          'Id', 'Title', 'FileRef', 'FileLeafRef',
          'ContractType', 'Jurisdiction', 'Status',
          'Parties', 'ExpiryDate', 'Tags', 'RiskScore', 'Created'
        )
        .expand('File')
        .orderBy('Created', false)
        .top(100)();

      console.log('[SharePoint] Found', items.length, 'contracts');
      return items.map((item, index) => this.mapItemToContract(item, index));

    } catch (error) {
      console.error('[SharePoint] Error fetching contracts:', error);
      throw new Error('Failed to load contracts from SharePoint library');
    }
  }

  /**
   * Get contract file as Blob
   */
  public async getContractFile(fileUrl: string): Promise<Blob> {
    try {
      const file = this.sp.web.getFileByServerRelativePath(fileUrl);
      const blob = await file.getBlob();
      return blob;
    } catch (error) {
      console.error('[SharePoint] Error downloading file:', error);
      throw new Error('Failed to download contract file');
    }
  }

  /**
   * Save analyzed contract to SharePoint - WORKING VERSION
   */
  public async saveAnalyzedContract(
    fileName: string,
    fileBlob: Blob,
    analysisResult: any
  ): Promise<void> {
    try {
      const listTitle = this.getListTitleFromUrl(this.libraryUrl);
      console.log('[SharePoint] Uploading to library:', listTitle);
      console.log('[SharePoint] File:', fileName);
      console.log('[SharePoint] Analysis result:', analysisResult);
      
      // Step 1: Upload file
      console.log('[SharePoint] Step 1: Uploading file...');
      await this.sp.web.lists
        .getByTitle(listTitle)
        .rootFolder
        .files
        .addUsingPath(fileName, fileBlob, { Overwrite: true });
      
      console.log('[SharePoint] Step 1: File uploaded successfully');

      // Step 2: Get the file we just uploaded
      console.log('[SharePoint] Step 2: Getting uploaded file...');
      const file = await this.sp.web.lists
        .getByTitle(listTitle)
        .rootFolder
        .files
        .getByUrl(fileName);
      
      console.log('[SharePoint] Step 2: File retrieved');

      // Step 3: Get list item from file
      console.log('[SharePoint] Step 3: Getting list item...');
      const item = await file.getItem();
      console.log('[SharePoint] Step 3: List item retrieved');

      // Step 4: Update metadata
      console.log('[SharePoint] Step 4: Updating metadata...');
      const metadata = {
        Title: analysisResult.fileName || fileName,
        ContractType: analysisResult.contractType || 'General Agreement',
        Jurisdiction: analysisResult.jurisdiction || 'Not specified',
        Status: analysisResult.overallRiskScore >= 70 ? 'Critical' : 
                analysisResult.overallRiskScore >= 40 ? 'Warning' : 'Compliant',
        Parties: analysisResult.parties ? analysisResult.parties.join(';') : '',
        ExpiryDate: analysisResult.expiryDate && analysisResult.expiryDate !== 'Not specified' ? 
                    analysisResult.expiryDate : null,
        Tags: analysisResult.riskFactors && analysisResult.riskFactors.length > 0 ? 
              analysisResult.riskFactors.map((f: any) => f.factor).join(';') : '',
        RiskScore: analysisResult.overallRiskScore || 0
      };

      console.log('[SharePoint] Metadata to update:', metadata);
      
      await item.update(metadata);

      console.log('[SharePoint] ✓ Contract saved successfully:', fileName);

    } catch (error) {
      console.error('[SharePoint] ✗ Error saving contract:', error);
      console.error('[SharePoint] Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to save contract: ${error.message || error}`);
    }
  }

  /**
   * Extract list title from URL
   */
  private getListTitleFromUrl(url: string): string {
    const segments = url.split('/').filter(s => s.length > 0);
    return segments[segments.length - 1];
  }

  /**
   * Map SharePoint item to IContract
   */
  private mapItemToContract(item: any, index: number): IContract {
    const parties = this.parseMultiValue(item.Parties);
    const tags = this.parseMultiValue(item.Tags);
    const clauses = this.generateSampleClauses(item.ContractType || 'General Agreement');
    const flag = this.calculateFlag(item.ExpiryDate);

    return {
      id: item.Id,
      name: item.Title || item.FileLeafRef || `Contract ${item.Id}`,
      type: item.ContractType || 'General Agreement',
      jurisdiction: item.Jurisdiction || 'Not specified',
      status: (item.Status?.toLowerCase() as 'compliant' | 'warning' | 'critical') || 'compliant',
      parties: parties.length > 0 ? parties : ['Party A', 'Party B'],
      expiry: item.ExpiryDate ? new Date(item.ExpiryDate).toISOString().split('T')[0] : '2027-12-31',
      tags: tags.length > 0 ? tags : ['untagged'],
      risk: item.RiskScore ?? 0,
      uploaded: item.Created ? new Date(item.Created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      summary: this.generateSummary(item),
      clauses: clauses,
      flag: flag,
      fileUrl: item.FileRef || item.File?.ServerRelativeUrl
    };
  }

  private parseMultiValue(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(';').map(v => v.trim()).filter(v => v.length > 0);
  }

  private calculateFlag(expiryDate: string | null | undefined): string | undefined {
    if (!expiryDate) return undefined;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry < 90) return 'Expiring soon';
    return undefined;
  }

  private generateSummary(item: any): string {
    const type = item.ContractType || 'agreement';
    const parties = this.parseMultiValue(item.Parties);
    const jurisdiction = item.Jurisdiction || 'unspecified jurisdiction';
    if (parties.length >= 2) {
      return `${type} between ${parties.join(' and ')}. Governing law: ${jurisdiction}.`;
    }
    return `${type} governing business relationship. Jurisdiction: ${jurisdiction}.`;
  }

  private generateSampleClauses(contractType: string): IClause[] {
    const templates: { [key: string]: IClause[] } = {
      'Vendor Agreement': [
        { ref: '§1.1', title: 'Scope of Services', text: 'Vendor shall provide services as outlined in Statement of Work.' },
        { ref: '§4.2', title: 'Liability Cap', text: 'Total liability not to exceed $2,000,000 per year.' }
      ],
      'NDA': [
        { ref: '§1', title: 'Confidential Information', text: 'All non-public business and technical information.' },
        { ref: '§4', title: 'Term', text: 'Agreement effective for three (3) years.' }
      ]
    };
    return templates[contractType] || [
      { ref: '§1', title: 'General Terms', text: 'Standard terms and conditions apply.' }
    ];
  }
}
