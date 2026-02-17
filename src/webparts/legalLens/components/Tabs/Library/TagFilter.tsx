import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';

export interface ITagFilterProps {
  topTags: Array<{ tag: string; count: number }>;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export const TagFilter: React.FC<ITagFilterProps> = ({
  topTags,
  selectedTag,
  onTagSelect
}) => {
  if (topTags.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      marginBottom: '16px', 
      padding: '12px', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ 
          fontSize: '8.5px', 
          color: '#64748b', 
          fontWeight: 600, 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px' 
        }}>
          Filter by tag:
        </span>
        
        {selectedTag && (
          <DefaultButton
            text="✕ Clear Filter"
            onClick={() => onTagSelect(null)}
            styles={{
              root: {
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                borderRadius: '4px',
                minWidth: 'auto',
                padding: '4px 10px',
                height: 'auto'
              },
              label: {
                fontSize: '8.5px',
                fontWeight: 600
              },
              rootHovered: {
                background: 'rgba(239,68,68,0.2)',
                color: '#ef4444'
              }
            }}
          />
        )}
        
        {topTags.map(({ tag, count }) => {
          const isSelected = selectedTag === tag;
          
          return (
            <DefaultButton
              key={tag}
              onClick={() => onTagSelect(isSelected ? null : tag)}
              title={`${count} contract${count > 1 ? 's' : ''}`}
              styles={{
                root: {
                  fontSize: '8.5px',
                  fontFamily: 'monospace',
                  background: isSelected 
                    ? 'rgba(6,182,212,0.2)' 
                    : 'rgba(6,182,212,0.08)',
                  border: isSelected
                    ? '1px solid rgba(6,182,212,0.4)'
                    : '1px solid rgba(6,182,212,0.18)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  color: isSelected ? '#22d3ee' : '#67e8f9',
                  fontWeight: isSelected ? 600 : 400,
                  minWidth: 'auto',
                  height: 'auto'
                },
                label: {
                  fontSize: '8.5px',
                  fontFamily: 'monospace',
                  margin: 0
                },
                rootHovered: {
                  background: isSelected 
                    ? 'rgba(6,182,212,0.25)' 
                    : 'rgba(6,182,212,0.12)'
                }
              }}
            >
              {tag}
              <span style={{ 
                fontSize: '7px', 
                marginLeft: '4px', 
                opacity: 0.7,
                fontWeight: 700
              }}>
                {`(${count})`}
              </span>
            </DefaultButton>
          );
        })}
      </div>
    </div>
  );
};