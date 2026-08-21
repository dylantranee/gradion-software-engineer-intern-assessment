import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { JsonStore } from '../src/storage/jsonStore.js';
import { PipelineMutex } from '../src/orchestrator/mutex.js';
import { PipelineOrchestrator } from '../src/orchestrator/pipeline.js';
import { MockGeminiAdapter } from '../src/gemini/mockAdapter.js';
import { IGeminiService } from '../src/gemini/types.js';

describe('US-2.1 - US-2.8: Gemini Integration & 5-Step Pipeline Orchestration', () => {
  let tempDir: string;
  let store: JsonStore;
  let mutex: PipelineMutex;
  let mockGemini: MockGeminiAdapter;
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradion-test-gemini-'));
    store = new JsonStore(tempDir);
    mutex = new PipelineMutex();
    mockGemini = new MockGeminiAdapter();
    orchestrator = new PipelineOrchestrator(store, mutex, mockGemini);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('US-2.8: executes full 5-step pipeline to completion (DONE)', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(
      user.id,
      'The Wind in the Willows',
      'The Mole had been working very hard all the morning, spring-cleaning his little home...'
    );

    expect(project.status).toBe('CREATED');
    expect(project.stepState).toBe('IDLE');

    // Step 1: Style
    const p1 = await orchestrator.executeStep(project.id, 'STYLE');
    expect(p1.status).toBe('STYLE_SET');
    expect(p1.stepState).toBe('IDLE');
    expect(p1.style).toContain('watercolor');

    // Step 2: Characters (Max 2 Adults)
    const p2 = await orchestrator.executeStep(project.id, 'CHARACTERS');
    expect(p2.status).toBe('CHARACTERS_GENERATED');
    expect(p2.characters).toHaveLength(2);
    expect(p2.characters[0].name).toBe('The Mole');
    expect(p2.characters[1].name).toBe('The Water Rat');
    expect(p2.characters[0].portraitReady).toBe(false);

    // Step 3: Portraits (Nano Banana)
    const p3 = await orchestrator.executeStep(project.id, 'PORTRAITS');
    expect(p3.status).toBe('PORTRAITS_GENERATED');
    expect(p3.characters[0].portraitReady).toBe(true);
    expect(p3.characters[0].portraitPath).toMatch(/_portrait\.png$/);
    expect(p3.characters[1].portraitReady).toBe(true);

    // Verify portrait PNG exists on disk
    const filename0 = path.basename(p3.characters[0].portraitPath!);
    expect(store.getProjectAssetPath(project.id, filename0)).not.toBeNull();

    // Step 4: Chapters (Max 1 Scene)
    const p4 = await orchestrator.executeStep(project.id, 'CHAPTERS');
    expect(p4.status).toBe('CHAPTERS_GENERATED');
    expect(p4.chapters).toHaveLength(1);
    expect(p4.chapters[0].name).toBe('Chapter 1: The River Bank');
    expect(p4.chapters[0].illustrationReady).toBe(false);

    // Step 5: Illustrations (Nano Banana)
    const p5 = await orchestrator.executeStep(project.id, 'ILLUSTRATIONS');
    expect(p5.status).toBe('DONE');
    expect(p5.stepState).toBe('IDLE');
    expect(p5.chapters[0].illustrationReady).toBe(true);
    expect(p5.chapters[0].illustrationPath).toMatch(/_illustration\.png$/);

    // Verify illustration PNG exists on disk
    const illFilename = path.basename(p5.chapters[0].illustrationPath!);
    expect(store.getProjectAssetPath(project.id, illFilename)).not.toBeNull();
  });

  it('US-2.3: enriches user custom style in Step 1', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Custom Style Book', 'Some story text...');

    const result = await orchestrator.executeStep(project.id, 'STYLE', {
      customStyle: 'Studio Ghibli Anime with lush greenery',
    });

    expect(result.status).toBe('STYLE_SET');
    expect(result.style).toContain('Studio Ghibli Anime with lush greenery');
    expect(result.style).toContain('Enriched Art Style');
  });

  it('BR-PD-CHAR-04: persists each character portrait to the store individually as it completes, before the next one starts generating', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(
      user.id,
      'The Wind in the Willows',
      'The Mole had been working very hard all the morning, spring-cleaning his little home...'
    );
    await orchestrator.executeStep(project.id, 'STYLE');
    await orchestrator.executeStep(project.id, 'CHARACTERS');

    const original = mockGemini.generatePortrait.bind(mockGemini);
    const char0ReadyAtCallTime: boolean[] = [];
    const spy = vi
      .spyOn(mockGemini, 'generatePortrait')
      .mockImplementation(async (name: string, prompt: string, style: string) => {
        // Snapshot the store's own persisted state right as each portrait generation
        // starts — proving character 0's portrait was already saved to disk before
        // character 1's generation began, not batched together at the end of the step.
        const snapshot = await store.getProject(project.id);
        char0ReadyAtCallTime.push(snapshot!.characters[0].portraitReady);
        return original(name, prompt, style);
      });

    await orchestrator.executeStep(project.id, 'PORTRAITS');

    expect(char0ReadyAtCallTime).toHaveLength(2);
    expect(char0ReadyAtCallTime[0]).toBe(false); // char 0's own portrait isn't ready when its generation starts
    expect(char0ReadyAtCallTime[1]).toBe(true); // already persisted by the time char 1's generation starts

    spy.mockRestore();
  });

  it('US-2.4: enforces hard cap of max 2 adult characters when LLM returns more', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Many Characters Book', 'Story...');
    await orchestrator.executeStep(project.id, 'STYLE');

    // Custom adapter returning 5 characters
    const overzealousGemini: IGeminiService = {
      ...mockGemini,
      generateCharacters: async () => [
        { name: 'Mole', prompt: 'Mole prompt' },
        { name: 'Rat', prompt: 'Rat prompt' },
        { name: 'Toad', prompt: 'Toad prompt' },
        { name: 'Badger', prompt: 'Badger prompt' },
        { name: 'Otter', prompt: 'Otter prompt' },
      ],
    };

    const cappingOrchestrator = new PipelineOrchestrator(store, mutex, overzealousGemini);
    const result = await cappingOrchestrator.executeStep(project.id, 'CHARACTERS');

    expect(result.characters).toHaveLength(2); // Strict cap enforced!
    expect(result.characters.map((c) => c.name)).toEqual(['Mole', 'Rat']);
  });

  it('US-2.6: enforces hard cap of max 1 chapter scene when LLM returns more', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Many Chapters Book', 'Story...');
    await orchestrator.executeStep(project.id, 'STYLE');
    await orchestrator.executeStep(project.id, 'CHARACTERS');

    // Custom adapter returning 3 chapters
    const overzealousGemini: IGeminiService = {
      ...mockGemini,
      generateChapters: async () => [
        { name: 'Chapter 1: The River', prompt: 'River scene' },
        { name: 'Chapter 2: The Open Road', prompt: 'Road scene' },
        { name: 'Chapter 3: The Wild Wood', prompt: 'Wood scene' },
      ],
    };

    const cappingOrchestrator = new PipelineOrchestrator(store, mutex, overzealousGemini);
    const result = await cappingOrchestrator.executeStep(project.id, 'CHAPTERS');

    expect(result.chapters).toHaveLength(1); // Strict cap enforced!
    expect(result.chapters[0].name).toBe('Chapter 1: The River');
  });

  it('US-2.8: validates prerequisite step sequence', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Unsequenced Book', 'Story...');

    // Attempting Step 2 without Step 1
    await expect(orchestrator.executeStep(project.id, 'CHARACTERS')).rejects.toThrow(
      'Step 1 (Style) must be completed before generating characters.'
    );

    // Attempting Step 3 without Step 2
    await orchestrator.executeStep(project.id, 'STYLE');
    await expect(orchestrator.executeStep(project.id, 'PORTRAITS')).rejects.toThrow(
      'Step 2 (Characters) must be completed before generating portraits.'
    );

    // Attempting Step 5 without Step 4
    await orchestrator.executeStep(project.id, 'CHARACTERS');
    await expect(orchestrator.executeStep(project.id, 'ILLUSTRATIONS')).rejects.toThrow(
      'Step 4 (Chapters) must be completed before generating illustrations.'
    );
  });

  it('US-2.8: records error and preserves prior milestones on step failure', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Failing Book', 'Story...');
    await orchestrator.executeStep(project.id, 'STYLE');

    // Failing Gemini adapter on Step 2
    const failingGemini: IGeminiService = {
      ...mockGemini,
      generateCharacters: async () => {
        throw new Error('Gemini Quota Exceeded (RESOURCE_EXHAUSTED)');
      },
    };

    const failingOrchestrator = new PipelineOrchestrator(store, mutex, failingGemini);

    await expect(failingOrchestrator.executeStep(project.id, 'CHARACTERS')).rejects.toThrow(
      'Gemini Quota Exceeded (RESOURCE_EXHAUSTED)'
    );

    const saved = (await store.getProject(project.id))!;
    expect(saved.status).toBe('STYLE_SET'); // Milestone preserved!
    expect(saved.stepState).toBe('FAILED');
    expect(saved.lastError?.step).toBe('CHARACTERS');
    expect(saved.lastError?.message).toContain('Gemini Quota Exceeded');
  });
});
