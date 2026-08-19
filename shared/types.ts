export type PipelineStatus =
  | 'CREATED'
  | 'STYLE_SET'
  | 'CHARACTERS_GENERATED'
  | 'PORTRAITS_GENERATED'
  | 'CHAPTERS_GENERATED'
  | 'DONE';

export type StepState = 'IDLE' | 'RUNNING' | 'FAILED';

export type StepKey = 'STYLE' | 'CHARACTERS' | 'PORTRAITS' | 'CHAPTERS' | 'ILLUSTRATIONS';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface CharacterEntity {
  id: string;
  name: string;
  prompt: string;
  portraitPath?: string;
  portraitReady: boolean;
}

export interface ChapterEntity {
  id: string;
  name: string;
  prompt: string;
  illustrationPath?: string;
  illustrationReady: boolean;
}

export interface StepError {
  step: string;
  message: string;
  timestamp: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  bookText: string;
  geminiFileUri?: string;
  createdAt: number;
  updatedAt: number;
  status: PipelineStatus;
  stepState: StepState;
  currentRunningStep?: StepKey;
  stepStartedAt?: number | null;
  lastError?: StepError | null;
  style?: string | null;
  characters: CharacterEntity[];
  chapters: ChapterEntity[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  status: PipelineStatus;
  stepState: StepState;
  createdAt: number;
  updatedAt: number;
  characterCount: number;
  chapterCount: number;
}

export const PIPELINE_STEPS: Array<{ key: StepKey; label: string; number: number }> = [
  { key: 'STYLE', label: 'Style', number: 1 },
  { key: 'CHARACTERS', label: 'Characters', number: 2 },
  { key: 'PORTRAITS', label: 'Portraits', number: 3 },
  { key: 'CHAPTERS', label: 'Chapters', number: 4 },
  { key: 'ILLUSTRATIONS', label: 'Illustrations', number: 5 },
];

export const STATUS_INDEX_MAP: Record<PipelineStatus, number> = {
  CREATED: 0,
  STYLE_SET: 1,
  CHARACTERS_GENERATED: 2,
  PORTRAITS_GENERATED: 3,
  CHAPTERS_GENERATED: 4,
  DONE: 5,
};

export function getStatusIndex(status: PipelineStatus): number {
  return STATUS_INDEX_MAP[status] ?? 0;
}
