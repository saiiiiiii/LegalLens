import * as React from 'react';
import { ISharePointService } from '../../services/SharePointService';
import { useContracts } from '../../hooks/useContracts';
import { ContractTable } from './ContractTable';
import { StatsCards } from './StatsCards';
import { TagFilter } from './TagFilter';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

export interface ILibraryViewProps {
  sharePointService: ISharePointService;
}

export const LibraryView: React.FC<ILibraryViewProps> = ({ sharePointService }) => {
  const {
    loading,
    error,
    filteredContracts,
    topTags,
    stats,
    selectedTag,
    setSelectedTag
  } = useContracts(sharePointService);

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spinner 
          size={SpinnerSize.large} 
          label="Loading contracts..." 
          styles={{
            root: { color: '#818cf8' },
            label: { color: '#e2e8f0' }
          }}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ animation: 'fadeIn 0.35s ease' }}>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          styles={{
            root: {
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '8px',
              marginBottom: '16px'
            },
            text: {
              color: '#fca5a5'
            }
          }}
        >
          {error}
        </MessageBar>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {/* Tag Filter Bar */}
      <TagFilter
        topTags={topTags}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
      />
      
      {/* Header with Title and Stats */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ 
            fontFamily: "'Cinzel', Georgia, serif", 
            fontSize: '24px', 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            backgroundClip: 'text', 
            letterSpacing: '0.5px', 
            margin: '0 0 3px' 
          }}>
            {selectedTag ? `Contracts tagged: "${selectedTag}"` : 'Governed Contract Library'}
          </h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            {selectedTag 
              ? `Showing ${filteredContracts.length} of ${stats.total} contracts`
              : 'Auto-classified · Metadata enriched · Compliance monitored'
            }
          </p>
        </div>
        
        <StatsCards
          total={stats.total}
          compliant={stats.compliant}
          warnings={stats.warnings}
          alerts={stats.alerts}
        />
      </div>

      {/* Contract Table */}
      <ContractTable contracts={filteredContracts} />
    </div>
  );
};