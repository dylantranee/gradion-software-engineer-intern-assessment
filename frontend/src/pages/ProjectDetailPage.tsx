import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, StepKey } from '../../../shared/types.js';
import { api } from '../api.js';
import { Link } from '../router.js';
import { Stepper } from '../components/Stepper.js';
import { CharacterCard } from '../components/CharacterCard.js';
import { ChapterCard } from '../components/ChapterCard.js';
import { BookModal } from '../components/BookModal.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import {
  ArrowLeft,
  BookOpen,
  Palette,
  Users,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';

const STUCK_TIMEOUT_MS = 60000;

const STEP_PROGRESS_MESSAGES: Record<StepKey, string[]> = {
  STYLE: [
    'Analyzing narrative tone and themes…',
    'Extracting period lighting and color palette…',
    'Synthesizing cohesive artistic directives…',
    'Finalizing book art style…',
  ],
  CHARACTERS: [
    'Scanning book text for key adult characters…',
    'Extracting physical traits, age, and clothing…',
    'Drafting visual portrait directives…',
    'Finalizing character profiles…',
  ],
  PORTRAITS: [
    'Preparing canvas and mixing palette…',
    'Applying base contours and brushwork…',
    'Painting character features and atmospheric lighting…',
    'Refining delicate textures and linework…',
    'Finalizing high-fidelity portrait…',
  ],
  CHAPTERS: [
    'Analyzing chapters and dramatic narrative arc…',
    'Selecting iconic chapter scene for illustration…',
    'Ensuring character continuity and scene setting…',
    'Finalizing chapter scene composition…',
  ],
  ILLUSTRATIONS: [
    'Composing 16:9 full-bleed scenic layout…',
    'Placing characters with consistent lighting…',
    'Rendering environmental textures and watercolor depth…',
    'Polishing fine artistic brushwork…',
    'Assembling final illustrated edition…',
  ],
};

interface ProjectDetailPageProps {
  projectId: string;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [customStyle, setCustomStyle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressMsgIndex, setProgressMsgIndex] = useState(0);

  const charactersSectionRef = useRef<HTMLDivElement>(null);
  const chapterSectionRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);

  const fetchProject = useCallback(async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      setError(null);
      if (data.stepState !== 'RUNNING') {
        setExecuting(false);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number } | undefined)?.status;
      if (status === 403 || status === 404) {
        // Genuine ownership / not-found — BR-PD-OWNER-01 / BR-PD-404-01
        setError(null);
      } else {
        // Network / 5xx failure — distinct from "not found" per BR-PD-FETCH-ERR-01
        setError(err instanceof Error ? err.message : 'Failed to fetch project');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Polling when stepState is RUNNING
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (project?.stepState === 'RUNNING' || executing) {
      interval = setInterval(() => {
        fetchProject();
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project?.stepState, executing, fetchProject]);

  // Coordinated smooth scroll transitions on step completions
  useEffect(() => {
    if (!prevStatusRef.current) {
      prevStatusRef.current = project?.status;
      return;
    }

    if (prevStatusRef.current !== project?.status) {
      if (project?.status === 'CHARACTERS_GENERATED') {
        // Step 2 complete -> reveal extracted characters
        setTimeout(() => {
          charactersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      } else if (project?.status === 'CHAPTERS_GENERATED') {
        // Step 4 complete -> reveal extracted chapter scene
        setTimeout(() => {
          chapterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      }
      // Step 5 (DONE): Stay in place — user is looking at the completed chapter illustration
    }

    prevStatusRef.current = project?.status;
  }, [project?.status]);

  // Determine if running step is stranded past 60s
  const isStranded =
    project?.stepState === 'RUNNING' &&
    project.stepStartedAt &&
    Date.now() - project.stepStartedAt > STUCK_TIMEOUT_MS;

  const getNextStepKey = useCallback((): StepKey | null => {
    if (!project) return null;
    switch (project.status) {
      case 'CREATED':
        return 'STYLE';
      case 'STYLE_SET':
        return 'CHARACTERS';
      case 'CHARACTERS_GENERATED':
        return 'PORTRAITS';
      case 'PORTRAITS_GENERATED':
        return 'CHAPTERS';
      case 'CHAPTERS_GENERATED':
        return 'ILLUSTRATIONS';
      case 'DONE':
      default:
        return null;
    }
  }, [project]);

  // Determine if pipeline is currently running
  const nextStepKey = getNextStepKey();
  const isRunning = project?.stepState === 'RUNNING' || executing;
  const currentRunningStep = project?.currentRunningStep || (executing ? nextStepKey : undefined);

  // Cycle through step micro-progress messages while running
  useEffect(() => {
    if (!isRunning) {
      setProgressMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressMsgIndex((prev) => prev + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, [isRunning, currentRunningStep]);

  const activeStepMessages = currentRunningStep ? STEP_PROGRESS_MESSAGES[currentRunningStep] : [];
  const currentProgressMessage =
    activeStepMessages.length > 0
      ? activeStepMessages[progressMsgIndex % activeStepMessages.length]
      : 'Processing…';

  const handleExecuteStep = async (stepKey: StepKey) => {
    setExecuting(true);
    setError(null);

    try {
      const updated = await api.executeStep(
        projectId,
        stepKey,
        stepKey === 'STYLE' ? customStyle : undefined
      );
      setProject(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Step execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleRecover = async () => {
    try {
      const recovered = await api.recoverProject(projectId);
      setProject(recovered);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="flex items-center gap-3 text-grad-ink-2">
          <Loader2 className="w-6 h-6 animate-spin text-grad-orange" />
          <span className="text-sm font-semibold">Loading Illustration Studio Workspace...</span>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center" data-testid="project-fetch-error">
        <h2 className="text-lg font-bold text-grad-ink mb-2">Couldn't load this project</h2>
        <p className="text-sm text-grad-ink-2 mb-4">{error}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              setLoading(true);
              fetchProject();
            }}
            className="text-xs font-bold text-white bg-grad-orange hover:bg-grad-orange-hover rounded-r-2 px-4 py-2 cursor-pointer"
            data-testid="fetch-error-retry-btn"
          >
            Retry
          </button>
          <Link to="/projects" className="text-xs font-bold text-grad-orange hover:underline">
            Return to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center" data-testid="project-not-found">
        <h2 className="text-lg font-bold text-grad-ink mb-2">Project not found</h2>
        <Link to="/projects" className="text-xs font-bold text-grad-orange hover:underline">
          Return to Projects
        </Link>
      </div>
    );
  }

  const wordCount = project.bookText.trim().split(/\s+/).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Breadcrumb */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-grad-ink-2 hover:text-grad-orange transition-colors mb-3.5 no-underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Projects</span>
      </Link>

      {/* Page Title & Metadata */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-grad-ink tracking-tight m-0">
          {project.title}
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-grad-ink-3 mt-1.5">
          <Clock className="w-3.5 h-3.5 text-grad-ink-3" />
          <span>
            Created {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 5-Step Stepper */}
      <Stepper status={project.status} currentRunningStep={currentRunningStep} />

      {/* Error / Recovery Banner */}
      {(error || project.stepState === 'FAILED' || isStranded) && (
        <ErrorBanner
          errorMessage={
            error || project.lastError?.message || 'A pipeline error occurred during execution.'
          }
          isStranded={Boolean(isStranded)}
          onRetry={nextStepKey && !isRunning ? () => handleExecuteStep(nextStepKey) : undefined}
          onRecover={handleRecover}
        />
      )}

      {/* Workspace Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Context Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Book Text Card */}
          <div className="bg-white rounded-r-3 border border-grad-border-2 p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-grad-ink flex items-center gap-2 m-0">
                <BookOpen className="w-4 h-4 text-grad-orange" />
                <span>Book text</span>
              </h3>
              <span className="text-xs text-grad-ink-3 font-medium">
                {wordCount.toLocaleString()} words
              </span>
            </div>

            <p className="text-sm text-grad-ink-2 font-sans italic leading-relaxed line-clamp-4 border-l-2 border-grad-orange/30 pl-3.5 m-0 py-0.5">
              {project.bookText}
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3.5 text-sm font-bold text-grad-orange hover:text-grad-orange-hover inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              data-testid="read-full-text-btn"
            >
              <span>Read full text</span>
              <span>→</span>
            </button>
          </div>

          {/* Established Art Style Card */}
          {project.style && (
            <div className="bg-white rounded-r-3 border border-grad-border-2 p-5 shadow-card" data-testid="art-style-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-grad-ink flex items-center gap-2 m-0">
                  <Palette className="w-4 h-4 text-grad-orange" />
                  <span>Art style</span>
                </h3>
              </div>
              <p className="text-sm text-grad-ink-2 font-sans leading-relaxed border-l-2 border-grad-orange/30 pl-3.5 m-0 py-0.5">
                {project.style}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Generated Visuals & Bottom-Flowing Action Command */}
        <div className="lg:col-span-8 space-y-6">
          {/* Generated Characters Section (Step 2 & 3 Visuals) */}
          {project.characters.length > 0 && (
            <div ref={charactersSectionRef}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg text-grad-ink tracking-tight flex items-center gap-2 m-0">
                  <Users className="w-5 h-5 text-grad-orange" />
                  <span>Characters ({project.characters.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.characters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    projectId={project.id}
                    isGenerating={isRunning && currentRunningStep === 'PORTRAITS' && !char.portraitReady}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Generated Chapters Section (Step 4 & 5 Visuals) */}
          {project.chapters.length > 0 && (
            <div ref={chapterSectionRef}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg text-grad-ink tracking-tight flex items-center gap-2 m-0">
                  <BookOpen className="w-5 h-5 text-grad-orange" />
                  <span>Chapter scene</span>
                </h3>
              </div>

              <div className="space-y-4">
                {project.chapters.map((chap) => (
                  <ChapterCard
                    key={chap.id}
                    chapter={chap}
                    projectId={project.id}
                    isGenerating={isRunning && currentRunningStep === 'ILLUSTRATIONS' && !chap.illustrationReady}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step Action Command Card (Flows naturally at the bottom of the artwork feed) */}
          {(isRunning || nextStepKey !== null) && (
            <div className="bg-white rounded-r-3 border border-grad-border-2 p-6 shadow-card">
              {isRunning ? (
                /* In-Flight Optimistic UI & Live Captions */
                <div className="py-6 text-center" data-testid="step-running-state">
                  <div className="w-12 h-12 rounded-full bg-grad-orange-subtle text-grad-orange flex items-center justify-center mx-auto mb-3.5">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  {/* Figma-style vertical sliding ticker */}
                  <div
                    className="h-7 overflow-hidden relative max-w-md mx-auto mb-1.5"
                    aria-live="polite"
                    aria-label={currentProgressMessage}
                  >
                    <div
                      key={currentProgressMessage}
                      className="absolute inset-0 flex items-center justify-center animate-[slideUpIn_1.00s_cubic-bezier(0.22,1,0.36,1)_both]"
                    >
                      <span className="text-base font-extrabold text-grad-ink tracking-tight whitespace-nowrap">
                        {currentProgressMessage}
                      </span>
                    </div>
                  </div>
                </div>
              ) : nextStepKey === 'STYLE' ? (
                /* Step 1: Style Action */
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-grad-ink tracking-tight m-0">
                      Art style
                    </h3>
                    <p className="text-sm text-grad-ink-2 mt-1 mb-0">
                      Establish a cohesive visual style for all book illustrations.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="custom-style-input" className="block text-sm font-semibold text-grad-ink mb-1.5">
                      Style description <span className="text-grad-ink-3 font-normal text-xs">(optional)</span>
                    </label>
                    <input
                      id="custom-style-input"
                      type="text"
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      placeholder="e.g. Vintage storybook watercolor with delicate ink line art"
                      className="w-full px-3.5 py-2.5 rounded-r-2 border border-grad-line/60 bg-white text-sm text-grad-ink focus:outline-none focus:ring-2 focus:ring-grad-orange/20 focus:border-grad-orange font-sans transition-all"
                      data-testid="custom-style-input"
                    />
                  </div>

                  <button
                    onClick={() => handleExecuteStep('STYLE')}
                    className="w-full py-3 px-5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    data-testid="execute-step-style"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate art style</span>
                  </button>
                </div>
              ) : nextStepKey === 'CHARACTERS' ? (
                /* Step 2: Characters Action */
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-grad-ink tracking-tight m-0">
                      Characters
                    </h3>
                    <p className="text-sm text-grad-ink-2 mt-1 mb-0">
                      Extract key characters from the book text to establish portrait art.
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecuteStep('CHARACTERS')}
                    className="w-full py-3 px-5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    data-testid="execute-step-characters"
                  >
                    <Users className="w-4 h-4" />
                    <span>Extract characters</span>
                  </button>
                </div>
              ) : nextStepKey === 'PORTRAITS' ? (
                /* Step 3: Portraits Action */
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-grad-ink tracking-tight m-0">
                      Character portraits
                    </h3>
                    <p className="text-sm text-grad-ink-2 mt-1 mb-0">
                      Generate dedicated 3:4 portrait illustrations for extracted characters.
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecuteStep('PORTRAITS')}
                    className="w-full py-3 px-5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    data-testid="execute-step-portraits"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate portraits</span>
                  </button>
                </div>
              ) : nextStepKey === 'CHAPTERS' ? (
                /* Step 4: Chapters Action */
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-grad-ink tracking-tight m-0">
                      Chapter scene
                    </h3>
                    <p className="text-sm text-grad-ink-2 mt-1 mb-0">
                      Identify the most iconic scene from the narrative for full illustration.
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecuteStep('CHAPTERS')}
                    className="w-full py-3 px-5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    data-testid="execute-step-chapters"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Extract chapter scene</span>
                  </button>
                </div>
              ) : nextStepKey === 'ILLUSTRATIONS' ? (
                /* Step 5: Illustrations Action */
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-grad-ink tracking-tight m-0">
                      Chapter illustration
                    </h3>
                    <p className="text-sm text-grad-ink-2 mt-1 mb-0">
                      Render the complete 16:9 full-scene illustration with your art style.
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecuteStep('ILLUSTRATIONS')}
                    className="w-full py-3 px-5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    data-testid="execute-step-illustrations"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate illustration</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Book Manuscript Modal Reader */}
      <BookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={project.title}
        bookText={project.bookText}
      />
    </div>
  );
};
