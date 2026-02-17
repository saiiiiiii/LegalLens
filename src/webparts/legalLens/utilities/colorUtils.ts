// Status string (Compliant/Partial/Non-Compliant) → solid color
export const statusColor = (status: string): string =>
    status === 'Compliant' ? '#10b981' : status === 'Partial' ? '#f59e0b' : '#ef4444';

// Status string → transparent background
export const statusBgColor = (status: string): string =>
    status === 'Compliant' ? 'rgba(16,185,129,0.15)' :
    status === 'Partial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

// Severity/risk level (High/Medium/Low) → solid color
export const severityColor = (level: string): string =>
    level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#10b981';

// Severity/risk level → transparent background
export const severityBgColor = (level: string): string =>
    level === 'High' ? 'rgba(239,68,68,0.15)' :
    level === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';

// Finding prefix (✓/⚠/✗) → color
export const findingColor = (finding: string): string =>
    finding.startsWith('✓') ? '#10b981' : finding.startsWith('⚠') ? '#f59e0b' : '#ef4444';
