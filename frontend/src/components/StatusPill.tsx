import { PipelineStatus, StepState } from '../../../shared/types.js';
import { Check } from 'lucide-react';

interface StatusPillProps {
  status: PipelineStatus;
  stepState?: StepState;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, stepState, className = '' }) => {
  if (stepState === 'FAILED') {
    return (
      <span className={`gd-pill whitespace-nowrap flex-shrink-0 bg-red-50 text-red-700 border border-red-200 ${className}`} data-testid="status-pill-failed">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span>Error</span>
      </span>
    );
  }

  if (status === 'DONE') {
    return (
      <span className={`gd-pill whitespace-nowrap flex-shrink-0 done ${className}`} data-testid="status-pill-done">
        <Check className="w-3.5 h-3.5" />
        <span>Done</span>
      </span>
    );
  }

  if (status === 'CREATED' && stepState !== 'RUNNING') {
    return (
      <span className={`gd-pill whitespace-nowrap flex-shrink-0 draft ${className}`} data-testid="status-pill-draft">
        <span>Draft</span>
      </span>
    );
  }

  // All in-flight and intermediate pipeline steps (1 through 4)
  const isRunning = stepState === 'RUNNING';

  return (
    <span className={`gd-pill whitespace-nowrap flex-shrink-0 running ${className}`} data-testid="status-pill-running">
      <span className={`w-2 h-2 rounded-full bg-grad-orange ${isRunning ? 'animate-pulse-dot' : ''}`} />
      <span>In progress</span>
    </span>
  );
};
