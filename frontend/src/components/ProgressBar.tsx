import React from 'react';
import { PipelineStatus } from '../../../shared/types.js';

interface ProgressBarProps {
  status: PipelineStatus;
  className?: string;
}

export function getCompletedStepsCount(status: PipelineStatus): number {
  switch (status) {
    case 'DONE':
      return 5;
    case 'CHAPTERS_GENERATED':
      return 4;
    case 'PORTRAITS_GENERATED':
      return 3;
    case 'CHARACTERS_GENERATED':
      return 2;
    case 'STYLE_SET':
      return 1;
    case 'CREATED':
    default:
      return 0;
  }
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ status, className = '' }) => {
  const completedCount = getCompletedStepsCount(status);

  return (
    <div className={`flex items-center gap-1.5 w-full ${className}`} data-testid="milestone-progress-bar">
      {[1, 2, 3, 4, 5].map((stepNum) => {
        const isFilled = stepNum <= completedCount;
        return (
          <div
            key={stepNum}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isFilled ? 'bg-grad-orange' : 'bg-grad-line/30'
            }`}
            data-filled={isFilled}
            title={`Step ${stepNum} ${isFilled ? 'Completed' : 'Pending'}`}
          />
        );
      })}
    </div>
  );
};
