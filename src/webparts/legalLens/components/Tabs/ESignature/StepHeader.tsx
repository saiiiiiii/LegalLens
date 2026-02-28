import * as React from 'react';
import { Text } from '@fluentui/react';
import styles from './ESignature.module.scss';

export interface IStepHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export const StepHeader: React.FC<IStepHeaderProps> = ({ title, subtitle, onBack }) => {
  return (
    <div className={styles.stepHeader}>
      <div className={styles.stepHeaderTitleRow}>
        {onBack && (
          <button className={styles.stepHeaderBackBtn} onClick={onBack}>
            ← Back
          </button>
        )}
        <Text block className={styles.stepHeaderTitle}>{title}</Text>
      </div>
      <Text variant="small" className={styles.stepHeaderSubtitle}>
        {subtitle}
      </Text>
    </div>
  );
};
