import React from 'react';
import { PipelineStatus, StepKey } from '../../../shared/types.js';
import { Check } from 'lucide-react';

interface StepperProps {
  status: PipelineStatus;
  currentRunningStep?: StepKey | null;
}

interface StepMeta {
  key: StepKey;
  num: number;
  label: string;
}

const STEPS: StepMeta[] = [
  { key: 'STYLE', num: 1, label: 'Style' },
  { key: 'CHARACTERS', num: 2, label: 'Characters' },
  { key: 'PORTRAITS', num: 3, label: 'Portraits' },
  { key: 'CHAPTERS', num: 4, label: 'Chapters' },
  { key: 'ILLUSTRATIONS', num: 5, label: 'Illustrations' },
];

export function getStepStatus(
  stepNum: number,
  status: PipelineStatus
): 'done' | 'current' | 'pending' {
  const currentStepNum =
    status === 'CREATED'
      ? 1
      : status === 'STYLE_SET'
      ? 2
      : status === 'CHARACTERS_GENERATED'
      ? 3
      : status === 'PORTRAITS_GENERATED'
      ? 4
      : status === 'CHAPTERS_GENERATED'
      ? 5
      : 6; // All done

  if (stepNum < currentStepNum) return 'done';
  if (stepNum === currentStepNum) return 'current';
  return 'pending';
}

export const Stepper: React.FC<StepperProps> = ({ status, currentRunningStep }) => {
  return (
    <div className="w-full bg-white rounded-r-3 border border-grad-border-2 py-3.5 px-4 sm:px-6 shadow-card mb-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[500px] md:min-w-0">
        {STEPS.map((step, idx) => {
          const stepState = getStepStatus(step.num, status);
          const isRunning = currentRunningStep === step.key;

          return (
            <React.Fragment key={step.key}>
              <div
                className="flex items-center gap-2.5 flex-shrink-0"
                data-testid={`stepper-item-${step.key.toLowerCase()}`}
              >
                {/* Badge */}
                <div
                  className={`gd-num-square ${stepState} ${
                    isRunning ? 'ring-4 ring-grad-orange-pale animate-pulse' : ''
                  }`}
                  data-testid={`stepper-badge-${step.key.toLowerCase()}`}
                >
                  {stepState === 'done' ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  ) : (
                    step.num
                  )}
                </div>

                {/* Text */}
                <p
                  className={`text-sm font-bold tracking-tight leading-none m-0 whitespace-nowrap ${
                    stepState === 'current'
                      ? 'text-grad-orange'
                      : stepState === 'done'
                      ? 'text-grad-ink'
                      : 'text-grad-ink-3'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {/* Auto-stretching Connecting Line Rail between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2.5 sm:mx-4 rounded-full bg-[#e2ded9] overflow-hidden relative"
                  data-testid={`stepper-line-${idx + 1}`}
                >
                  <div
                    className="h-full bg-grad-orange transition-all duration-500 rounded-full"
                    style={{ width: stepState === 'done' ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
