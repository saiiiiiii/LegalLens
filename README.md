# LegalLens SPFx Solution

AI-powered contract management web part for SharePoint Online with auto-classification, multilingual translation, and Q&A agent capabilities.

## Features

- **Contract Library View**: Auto-classified contracts with risk scoring, status tracking, and metadata enrichment
- **TranslatePro**: AI-powered translation (English, German, Spanish) with clause-level preservation
- **Q&A Agent**: Interactive contract analysis powered by Azure AI
- **SharePoint Integration**: Reads contracts directly from SharePoint document libraries
- **Real-time Processing**: Live translation and Q&A with progress indicators

## SharePoint Document Library Setup

### 1. Create Contract Library

1. Navigate to your SharePoint site
2. Create a new Document Library named "Contracts" (or your preferred name)
3. Add the following columns to the library:

#### Required Columns

| Column Name | Type | Description |
|------------|------|-------------|
| Title | Single line of text | Contract name (default) |
| ContractType | Choice | Options: Vendor Agreement, NDA, SLA, DPA, General Agreement |
| Jurisdiction | Single line of text | Legal jurisdiction (e.g., Delaware, California, EU (GDPR)) |
| Status | Choice | Options: Compliant, Warning, Critical |
| Parties | Multiple lines of text | Semicolon-separated party names |
| ExpiryDate | Date | Contract expiration date |
| Tags | Multiple lines of text | Semicolon-separated tags (e.g., GDPR;SOC2;CCPA) |
| RiskScore | Number | Risk score from 0-100 |
| AI Analysis Complete | Yes/No | AI Analysis Completed or Not |
| Analysis Date | Date | Analysis date |
| Effective Date | Date | Effective Date date |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-10 | Initial release with Library, TranslatePro, Alerts, and Q&A Agent |

## Solution

| Solution | Author(s) |
|----------|-----------|
| LegalLens| [Sai Siva Ram Bandaru](https://github.com/saiiiiiii)