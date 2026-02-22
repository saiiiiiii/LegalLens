import * as React from 'react';
import { Stack, Text } from '@fluentui/react';
import { OpenRegular } from '@fluentui/react-icons';
import { IContract } from '../../../models/IContract';
import styles from './Library.module.scss';
import { MultilingualQA } from '../Translate/MultilingualQA';
import { ILang } from '../../../constants/languages';
import { IAzureAIFoundryService } from '../../../services/AzureAIFoundryService';

export interface IDocumentOverviewProps {
  contract: IContract;
  aiFoundryService: IAzureAIFoundryService;
  langs: ILang[];
}

export const DocumentOverview: React.FC<IDocumentOverviewProps> = ({ contract, aiFoundryService, langs }) => {
  return (
    <Stack className={styles.documentWrap} horizontal tokens={{ childrenGap: 20 }}>

      {/* 2/3 — main content area */}
      <Stack className={styles.columnOne} tokens={{ childrenGap: 0 }}>
        <MultilingualQA contract={contract} aiFoundryService={aiFoundryService} langs={langs} />
        
        {/* <Stack className={styles.documentInfo} horizontal tokens={{ childrenGap: 16 }}>
          <Stack className={styles.infoColA} />
          <Stack className={styles.infoColB} /> 
        </Stack> */}
      </Stack>


      {/* 1/3 — metadata panel */}
      <Stack className={styles.columnTwo} tokens={{ childrenGap: 0 }}>
        <Stack className={styles.documentOverview} tokens={{ childrenGap: 0 }}>
          <Text className={styles.overviewSectionTitle}>Overview</Text>

          {/* subsection: identity fields */}
          <Stack className={styles.overviewSection} horizontal wrap tokens={{ childrenGap: 12 }}>
            <Stack className={styles.overviewField}>
              <Text className={styles.overviewFieldLabel}>Contract Name</Text>
              {contract.fileUrl ? (
                <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.overviewFileLink}>
                  <Text className={styles.overviewFieldValue}>{contract.name}</Text>
                  <OpenRegular className={styles.overviewFileLinkIcon} />
                </a>
              ) : (
                <Text className={styles.overviewFieldValue}>{contract.name}</Text>
              )}
            </Stack>
            <Stack className={styles.overviewField}>
              <Text className={styles.overviewFieldLabel}>Type</Text>
              <Text className={styles.overviewFieldValue}>{contract.type}</Text>
            </Stack>
            <Stack className={styles.overviewField}>
              <Text className={styles.overviewFieldLabel}>Jurisdiction</Text>
              <Text className={styles.overviewFieldValue}>{contract.jurisdiction}</Text>
            </Stack>
            <Stack className={styles.overviewField}>
              <Text className={styles.overviewFieldLabel}>Expiry</Text>
              <Text className={styles.overviewFieldValue}>{contract.expiry}</Text>
            </Stack>
            <Stack className={styles.overviewField}>
              <Text className={styles.overviewFieldLabel}>Uploaded</Text>
              <Text className={styles.overviewFieldValue}>{contract.uploaded}</Text>
            </Stack>
          </Stack>

          {/* subsection: parties */}
          {contract.parties.length > 0 && (
            <Stack className={styles.overviewSection}>
              <Text className={styles.overviewFieldLabel}>Parties</Text>
              <Stack horizontal wrap tokens={{ childrenGap: 6 }} styles={{ root: { marginTop: 4 } }}>
                {contract.parties.map(p => (
                  <Text key={p} className={styles.overviewTag}>{p}</Text>
                ))}
              </Stack>
            </Stack>
          )}

          {/* subsection: tags */}
          {contract.tags.length > 0 && (
            <Stack className={styles.overviewSection}>
              <Text className={styles.overviewFieldLabel}>Tags</Text>
              <Stack horizontal wrap tokens={{ childrenGap: 6 }} styles={{ root: { marginTop: 4 } }}>
                {contract.tags.map(t => (
                  <Text key={t} className={styles.overviewTag}>{t}</Text>
                ))}
              </Stack>
            </Stack>
          )}

          {/* subsection: summary */}
          {contract.summary && (
            <Stack className={styles.overviewSection}>
              <Text className={styles.overviewFieldLabel}>Summary</Text>
              <Text className={styles.overviewSummary}>{contract.summary}</Text>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
};
