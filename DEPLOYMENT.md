# LegalLens Deployment Guide

## Complete Step-by-Step Deployment Instructions

### Phase 1: Environment Preparation (30 minutes)

#### Step 1.1: Install Node.js

1. Download Node.js v18.18.2 LTS from https://nodejs.org/
2. Run the installer
3. Verify installation:
   ```bash
   node --version  # Should show v18.x.x
   npm --version   # Should show 9.x.x or higher
   ```

#### Step 1.2: Install Global Tools

```bash
npm install -g yo gulp-cli @microsoft/generator-sharepoint
```

Verify:
```bash
yo --version
gulp --version
```

#### Step 1.3: Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy and save it securely (you'll need this later)

### Phase 2: SharePoint Setup (15 minutes)

#### Step 2.1: Create Contract Library

1. Navigate to your SharePoint site:
   ```
   https://yourtenant.sharepoint.com/sites/yoursite
   ```

2. Click "New" → "Document library"
3. Name: "Contracts"
4. Click "Create"

#### Step 2.2: Add Metadata Columns

Execute this PowerShell script (or add columns manually):

```powershell
# Install PnP PowerShell if not installed
Install-Module -Name PnP.PowerShell -Force -AllowClobber

# Connect to your site
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/yoursite" -Interactive

# Add columns
Add-PnPField -List "Contracts" -DisplayName "ContractType" -InternalName "ContractType" -Type Choice -Choices "Vendor Agreement","NDA","SLA","DPA","General Agreement" -AddToDefaultView

Add-PnPField -List "Contracts" -DisplayName "Jurisdiction" -InternalName "Jurisdiction" -Type Text -AddToDefaultView

Add-PnPField -List "Contracts" -DisplayName "Status" -InternalName "Status" -Type Choice -Choices "Compliant","Warning","Critical" -AddToDefaultView

Add-PnPField -List "Contracts" -DisplayName "Parties" -InternalName "Parties" -Type Note

Add-PnPField -List "Contracts" -DisplayName "ExpiryDate" -InternalName "ExpiryDate" -Type DateTime -AddToDefaultView

Add-PnPField -List "Contracts" -DisplayName "Tags" -InternalName "Tags" -Type Note

Add-PnPField -List "Contracts" -DisplayName "RiskScore" -InternalName "RiskScore" -Type Number -AddToDefaultView

Write-Host "✓ All columns added successfully!" -ForegroundColor Green
```

#### Step 2.3: Upload Sample Contracts

1. Upload at least one PDF or DOCX contract
2. Edit the item properties:
   - **Title**: "Acme Corp — Master Services Agreement"
   - **ContractType**: Vendor Agreement
   - **Jurisdiction**: Delaware
   - **Status**: Compliant
   - **Parties**: Acme Corp;Your Company Inc
   - **ExpiryDate**: 2027-03-15
   - **Tags**: GDPR;SOC2
   - **RiskScore**: 12
3. Save

#### Step 2.4: Note Your Library URL

Copy the full URL:
```
https://yourtenant.sharepoint.com/sites/yoursite/Contracts
```

### Phase 3: Project Setup (10 minutes)

#### Step 3.1: Extract Project Files

Extract the `legallens-spfx.zip` to your development folder:
```bash
cd C:\Dev
unzip legallens-spfx.zip
cd legallens-spfx
```

#### Step 3.2: Install Dependencies

```bash
npm install
```

This will take 3-5 minutes. You should see:
```
added 1247 packages in 3m
```

#### Step 3.3: Trust Development Certificate

```bash
gulp trust-dev-cert
```

Click "Yes" when prompted.

### Phase 4: Development Testing (15 minutes)

#### Step 4.1: Start Development Server

```bash
gulp serve --nobrowser
```

Wait for:
```
Finished subtask 'reload' after 126 ms
Finished task 'serve' after 5.43 s
```

#### Step 4.2: Open Hosted Workbench

Navigate to:
```
https://yourtenant.sharepoint.com/sites/yoursite/_layouts/15/workbench.aspx
```

#### Step 4.3: Add Web Part

1. Click "+" to add a web part
2. Search for "LegalLens"
3. Click on it to add
4. Click the edit icon (pencil) on the web part
5. Configure:
   - **Description**: "Contract management system"
   - **Contract Library URL**: `https://yourtenant.sharepoint.com/sites/yoursite/Contracts`
   - **Claude API Key**: `sk-ant-api03-...` (your key)
6. Click "Apply"

#### Step 4.4: Verify Functionality

1. Click "Library" tab → Should show your uploaded contract(s)
2. Click "TranslatePro" tab → Select contract → Choose language → Click Translate
3. Type a question in Q&A Agent → Click Ask
4. Verify all features work

**If you see errors**: Check browser console (F12) and verify:
- Library URL is correct
- API key is valid
- You have read access to the library

### Phase 5: Production Build (5 minutes)

#### Step 5.1: Build Solution

```bash
gulp clean
gulp bundle --ship
gulp package-solution --ship
```

You should see:
```
Successfully created package: solution\legallens-spfx.sppkg
```

#### Step 5.2: Locate Package

The file is in:
```
legallens-spfx\sharepoint\solution\legallens-spfx.sppkg
```

### Phase 6: SharePoint Deployment (10 minutes)

#### Step 6.1: Upload to App Catalog

1. Navigate to SharePoint Admin Center:
   ```
   https://yourtenant-admin.sharepoint.com
   ```

2. Expand "More features" → Click "Open" under "Apps"

3. Click "App Catalog" (if it doesn't exist, create one)

4. Click "Apps for SharePoint" in the left menu

5. Click "Upload" → Select `legallens-spfx.sppkg`

6. In the dialog:
   - ✅ "Make this solution available to all sites"
   - Click "Deploy"

7. Wait for "Deployed" status

#### Step 6.2: Add to Production Page

1. Go to your site: `https://yourtenant.sharepoint.com/sites/yoursite`

2. Navigate to "Site contents"

3. Click "New" → "App"

4. Find "legallens-spfx-client-side-solution"

5. Click "Add"

6. Navigate to a page or create new page

7. Click "Edit"

8. Click "+" → Search "LegalLens"

9. Add and configure:
   - **Contract Library URL**: Your library URL
   - **Claude API Key**: Your API key

10. Click "Republish"

### Phase 7: User Configuration (5 minutes)

#### Step 7.1: Configure Web Part Defaults

For easier deployment to multiple pages, set default properties:

1. Edit `src/webparts/legalLens/LegalLensWebPart.manifest.json`

2. Update the `properties` section:
```json
"properties": {
  "description": "LegalLens",
  "contractLibraryUrl": "https://yourtenant.sharepoint.com/sites/yoursite/Contracts",
  "claudeApiKey": ""
}
```

3. Rebuild and redeploy (repeat Phase 5 & 6)

#### Step 7.2: Set Permissions

Ensure users have:
- **Read access** to the Contracts library
- **Edit access** to the page where web part is added

### Verification Checklist

Before going live, verify:

- [ ] All contracts visible in Library view
- [ ] Risk scores display correctly
- [ ] Translation works for German and Spanish
- [ ] Q&A agent responds to questions
- [ ] Alerts tab shows sample alerts
- [ ] Web part loads in under 3 seconds
- [ ] Mobile view renders properly
- [ ] Teams integration works (if deployed to Teams)

### Production Hardening

#### Security Enhancements

**Option 1: Azure Function Proxy (Recommended)**

1. Create Azure Function App
2. Add environment variable for Claude API key
3. Create proxy endpoint:

```javascript
// Azure Function
export default async function (context, req) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: req.body
  });
  return await response.json();
}
```

4. Update `ClaudeService.ts` to call Azure Function instead of Claude API directly

**Option 2: Managed Identity**

1. Enable Managed Identity on Azure Function
2. Store API key in Azure Key Vault
3. Grant function access to Key Vault

#### Performance Optimization

1. **Enable caching**:
```typescript
// In ClaudeService.ts
private cache: Map<string, any> = new Map();

public async translate(text: string, targetLang: string): Promise<string> {
  const cacheKey = `${text}-${targetLang}`;
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  const result = await this.translateViaAPI(text, targetLang);
  this.cache.set(cacheKey, result);
  return result;
}
```

2. **Add lazy loading**:
   - Load contracts on scroll
   - Paginate large libraries

3. **Optimize bundle**:
```bash
# Analyze bundle
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer sharepoint/solution/temp/stats.json
```

### Monitoring

#### Step 8.1: Application Insights (Optional)

1. Create Application Insights resource in Azure
2. Add to `LegalLensWebPart.ts`:

```typescript
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: 'YOUR_KEY_HERE'
  }
});
appInsights.loadAppInsights();
appInsights.trackPageView();
```

3. Track events:
```typescript
appInsights.trackEvent({ name: 'ContractTranslated', properties: { lang: targetLang } });
```

#### Step 8.2: Usage Analytics

Monitor in SharePoint Admin Center:
1. Reports → Site usage
2. Track web part usage metrics

### Troubleshooting Common Issues

#### Issue: "Failed to load contracts"

**Solution**:
1. Verify library URL is exact
2. Check permissions
3. Verify columns exist (case-sensitive internal names)
4. Check browser console for specific error

#### Issue: "Translation failed"

**Solution**:
1. Test API key in Postman:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```
2. Check API quota
3. Verify network allows outbound HTTPS

#### Issue: "Web part not showing in Teams"

**Solution**:
1. Verify `supportedHosts` includes `TeamsTab` in manifest
2. Redeploy package
3. Sync app catalog in Teams Admin Center

### Rollback Plan

If issues occur:

1. Remove web part from all pages
2. Delete app from site contents
3. Retract solution from App Catalog
4. Delete .sppkg file
5. Investigate and fix issue
6. Redeploy

### Maintenance

#### Weekly
- Review API usage and costs
- Check error logs
- Verify all features functioning

#### Monthly
- Update dependencies: `npm update`
- Review and rotate API keys
- Check for SPFx updates

#### Quarterly
- Upgrade SPFx version
- Review and optimize bundle size
- User feedback review

### Support Contacts

- **SPFx Issues**: Microsoft 365 Support
- **SharePoint Library**: Your SharePoint Admin
- **Claude API**: Anthropic Support (support@anthropic.com)

## Next Steps

After successful deployment:

1. **Train users**: Create documentation and video tutorials
2. **Expand metadata**: Add more columns based on contract types
3. **Integrate workflows**: Add Power Automate for approval processes
4. **Scale**: Deploy to multiple sites
5. **Enhance**: Add more languages, advanced analytics

---

**Deployment Complete!** 🎉

Your LegalLens solution is now live and ready to transform contract management in your organization.
