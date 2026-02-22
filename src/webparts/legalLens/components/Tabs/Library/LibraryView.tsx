import * as React from 'react';
import { Stack, Text, Spinner, SpinnerSize, MessageBar, MessageBarType } from '@fluentui/react';
import { ISharePointService } from '../../../services/SharePointService';
import { useContracts } from '../../../hooks/useContracts';
import { ContractTable } from './ContractTable';
import { StatsCards } from './StatsCards';
import { TagFilter } from './TagFilter';
import styles from './Library.module.scss';

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

  if (loading) {
    return (
      <Stack horizontalAlign="center" verticalAlign="center" className={styles.loadingWrap}>
        <Spinner
          size={SpinnerSize.large}
          label="Loading contracts..."
          styles={{
            root: { color: '#818cf8' },
            label: { color: '#e2e8f0' }
          }}
        />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack style={{ animation: 'fadeIn 0.35s ease' }}>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          styles={{
            root: { background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '16px' },
            text: { color: '#fca5a5' }
          }}
        >
          {error}
        </MessageBar>
      </Stack>
    );
  }

  return (
    <Stack style={{ animation: 'fadeIn 0.35s ease' }}>
      <TagFilter
        topTags={topTags}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
      />

      <Stack horizontal verticalAlign="end" horizontalAlign="space-between"
        tokens={{ childrenGap: 12 }} className={styles.headerRow}>
        <Stack>
          <h2 className={styles.viewTitle}>
            {selectedTag ? `Contracts tagged: "${selectedTag}"` : 'Governed Contract Library'}
          </h2>
          <Text className={styles.viewSubtitle}>
            {selectedTag
              ? `Showing ${filteredContracts.length} of ${stats.total} contracts`
              : 'Auto-classified · Metadata enriched · Compliance monitored'
            }
          </Text>
        </Stack>

        <StatsCards
          total={stats.total}
          compliant={stats.compliant}
          warnings={stats.warnings}
          alerts={stats.alerts}
        />
      </Stack>

      <ContractTable contracts={filteredContracts} />
    </Stack>
  );
};
