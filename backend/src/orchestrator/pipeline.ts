import { v4 as uuidv4 } from 'uuid';
import { JsonStore, jsonStore as defaultJsonStore } from '../storage/jsonStore.js';
import { PipelineMutex, pipelineMutex as defaultMutex } from './mutex.js';
import { IGeminiService } from '../gemini/types.js';
import { geminiClient as defaultGeminiClient } from '../gemini/client.js';
import {
  Project,
  StepKey,
  CharacterEntity,
  ChapterEntity,
} from '../../shared/types.js';

export class PipelineOrchestrator {
  private store: JsonStore;
  private mutex: PipelineMutex;
  private gemini: IGeminiService;

  constructor(
    store: JsonStore = defaultJsonStore,
    mutex: PipelineMutex = defaultMutex,
    gemini: IGeminiService = defaultGeminiClient
  ) {
    this.store = store;
    this.mutex = mutex;
    this.gemini = gemini;
  }

  /**
   * Executes a pipeline step under the server mutex lock.
   */
  public async executeStep(
    projectId: string,
    stepKey: StepKey,
    payload?: { customStyle?: string }
  ): Promise<Project> {
    const project = await this.store.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Validate step prerequisite state
    this.validatePrerequisites(project, stepKey);

    return this.mutex.withLock(projectId, async () => {
      // Mark step as RUNNING in store
      await this.store.startStep(projectId, stepKey);

      try {
        let updatedProject: Project;

        switch (stepKey) {
          case 'STYLE':
            updatedProject = await this.runStepStyle(project, payload?.customStyle);
            break;
          case 'CHARACTERS':
            updatedProject = await this.runStepCharacters(project);
            break;
          case 'PORTRAITS':
            updatedProject = await this.runStepPortraits(project);
            break;
          case 'CHAPTERS':
            updatedProject = await this.runStepChapters(project);
            break;
          case 'ILLUSTRATIONS':
            updatedProject = await this.runStepIllustrations(project);
            break;
          default:
            throw new Error(`Unknown pipeline step: ${stepKey}`);
        }

        return updatedProject;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.store.failStep(projectId, stepKey, errorMsg);
        throw err;
      }
    });
  }

  private validatePrerequisites(project: Project, stepKey: StepKey): void {
    switch (stepKey) {
      case 'STYLE':
        // Can be run anytime after project creation
        break;
      case 'CHARACTERS':
        if (!project.style) {
          throw new Error('Step 1 (Style) must be completed before generating characters.');
        }
        break;
      case 'PORTRAITS':
        if (project.characters.length === 0) {
          throw new Error('Step 2 (Characters) must be completed before generating portraits.');
        }
        break;
      case 'CHAPTERS':
        if (project.characters.length === 0) {
          throw new Error('Step 2 (Characters) must be completed before generating chapters.');
        }
        break;
      case 'ILLUSTRATIONS':
        if (project.chapters.length === 0) {
          throw new Error('Step 4 (Chapters) must be completed before generating illustrations.');
        }
        break;
    }
  }

  // --- Step 1: Style — uploads the book once (File API) and starts the text chain ---
  private async runStepStyle(project: Project, customStyle?: string): Promise<Project> {
    let fileUri = project.geminiFileUri;
    let chainId = project.geminiTextInteractionId;

    if (!fileUri || !chainId) {
      const primed = await this.gemini.primeBook(project.bookText);
      fileUri = primed.fileUri;
      chainId = primed.interactionId;

      // Persist immediately: retrying this step after this point must never re-upload the book.
      await this.store.updateProject(project.id, (p) => ({
        ...p,
        geminiFileUri: fileUri,
        geminiTextInteractionId: chainId,
      }));
    }

    const { style, interactionId } = await this.gemini.generateStyle(chainId, customStyle);

    return this.store.completeStep(project.id, 'STYLE', 'STYLE_SET', {
      style,
      geminiFileUri: fileUri,
      geminiTextInteractionId: interactionId,
    });
  }

  // --- Step 2: Characters (Max 2 Adults Cap) — chains off the style interaction ---
  private async runStepCharacters(project: Project): Promise<Project> {
    const { characters: rawCharacters, interactionId } = await this.gemini.generateCharacters(
      project.geminiTextInteractionId!
    );

    // Strict server-side cap: Max 2 adult characters
    const capped = rawCharacters.slice(0, 2);
    const characterEntities: CharacterEntity[] = capped.map((c, index) => ({
      id: `char_${index + 1}_${uuidv4().substring(0, 6)}`,
      name: c.name,
      prompt: c.prompt,
      portraitPath: undefined,
      portraitReady: false,
    }));

    return this.store.completeStep(project.id, 'CHARACTERS', 'CHARACTERS_GENERATED', {
      characters: characterEntities,
      geminiTextInteractionId: interactionId,
    });
  }

  // --- Step 3: Portraits (Nano Banana) — starts (or continues) the image chain ---
  private async runStepPortraits(project: Project): Promise<Project> {
    const updatedCharacters: CharacterEntity[] = [...project.characters];
    let imageChainId = project.geminiImageInteractionId;

    for (let i = 0; i < updatedCharacters.length; i++) {
      const char = updatedCharacters[i];
      const { image: imageBuffer, interactionId } = await this.gemini.generatePortrait(
        imageChainId,
        char.name,
        char.prompt,
        project.style || ''
      );
      imageChainId = interactionId;

      const filename = `${char.id}_portrait.png`;
      const relativePath = await this.store.saveProjectAsset(project.id, filename, imageBuffer);

      updatedCharacters[i] = {
        ...char,
        portraitPath: relativePath,
        portraitReady: true,
      };

      // Persist progressive per-item landing immediately so frontend polling displays it in real
      // time, and so a retry after a mid-loop failure resumes the image chain from the right id.
      await this.store.updateProject(project.id, (p) => ({
        ...p,
        characters: [...updatedCharacters],
        geminiImageInteractionId: imageChainId,
      }));
    }

    return this.store.completeStep(project.id, 'PORTRAITS', 'PORTRAITS_GENERATED', {
      characters: updatedCharacters,
      geminiImageInteractionId: imageChainId,
    });
  }

  // --- Step 4: Chapters (Max 1 Chapter Cap) — chains off the characters interaction ---
  private async runStepChapters(project: Project): Promise<Project> {
    const { chapters: rawChapters, interactionId } = await this.gemini.generateChapters(
      project.geminiTextInteractionId!
    );

    // Strict server-side cap: Exactly/Max 1 chapter
    const capped = rawChapters.slice(0, 1);
    const chapterEntities: ChapterEntity[] = capped.map((c, index) => ({
      id: `chap_${index + 1}_${uuidv4().substring(0, 6)}`,
      name: c.name,
      prompt: c.prompt,
      illustrationPath: undefined,
      illustrationReady: false,
    }));

    return this.store.completeStep(project.id, 'CHAPTERS', 'CHAPTERS_GENERATED', {
      chapters: chapterEntities,
      geminiTextInteractionId: interactionId,
    });
  }

  // --- Step 5: Illustrations (Nano Banana) — continues the portraits' image chain for consistency ---
  private async runStepIllustrations(project: Project): Promise<Project> {
    const updatedChapters: ChapterEntity[] = [];
    let imageChainId = project.geminiImageInteractionId;

    for (const chap of project.chapters) {
      const { image: imageBuffer, interactionId } = await this.gemini.generateIllustration(
        imageChainId,
        chap.name,
        chap.prompt,
        project.style || ''
      );
      imageChainId = interactionId;

      const filename = `${chap.id}_illustration.png`;
      const relativePath = await this.store.saveProjectAsset(project.id, filename, imageBuffer);

      updatedChapters.push({
        ...chap,
        illustrationPath: relativePath,
        illustrationReady: true,
      });
    }

    return this.store.completeStep(project.id, 'ILLUSTRATIONS', 'DONE', {
      chapters: updatedChapters,
      geminiImageInteractionId: imageChainId,
    });
  }
}

// Global Orchestrator Singleton
export const pipelineOrchestrator = new PipelineOrchestrator();
