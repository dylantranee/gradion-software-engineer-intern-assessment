import React from 'react';
import { AlertTriangle, RefreshCw, Unlock } from 'lucide-react';

interface ErrorBannerProps {
  errorMessage: string;
  onRetry?: () => void;
  onRecover?: () => void;
  isStranded?: boolean;
  retrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  errorMessage,
  onRetry,
  onRecover,
  isStranded,
  retrying,
}) => {
  return (
    <div
      className="p-4 rounded-r-3 bg-red-50 border border-red-200 text-red-800 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      data-testid="error-banner"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-900 uppercase tracking-wider">
            {isStranded ? 'Pipeline Execution Stranded / Stuck' : 'Step Execution Error'}
          </p>
          <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
        {onRecover && (
          <button
            onClick={onRecover}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-r-2 bg-white border border-red-300 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            data-testid="recover-btn"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Recover Lock</span>
          </button>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-r-2 bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            data-testid="retry-step-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying...' : 'Retry Step'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
