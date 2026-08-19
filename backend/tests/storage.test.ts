import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { JsonStore } from '../src/storage/jsonStore.js';

describe('US-1.1 & US-1.2: Local JSON Storage Repository & Advisory Locking', () => {
  let tempDir: string;
  let store: JsonStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradion-test-storage-'));
    store = new JsonStore(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('US-1.1: initializes required directories and empty users file', () => {
    expect(fs.existsSync(path.join(tempDir, 'projects'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'assets'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'users.json'))).toBe(true);
  });

  it('US-1.1: creates and retrieves users with case-insensitive email', async () => {
    const user1 = await store.getOrCreateUser('Alice Writer', 'Alice@Example.Com');
    expect(user1.id).toMatch(/^usr_/);
    expect(user1.email).toBe('alice@example.com');

    const user1Again = await store.getOrCreateUser('Alice Duplicate', 'alice@example.com');
    expect(user1Again.id).toBe(user1.id);
    expect(user1Again.name).toBe('Alice Writer');

    const byEmail = await store.getUserByEmail('ALICE@example.com');
    expect(byEmail?.id).toBe(user1.id);
  });

  it('US-1.1: creates, retrieves, and lists projects isolated by user', async () => {
    const userA = await store.getOrCreateUser('User A', 'userA@test.com');
    const userB = await store.getOrCreateUser('User B', 'userB@test.com');

    const projA1 = await store.createProject(userA.id, 'Wind in the Willows', 'Chapter 1 text...');
    const projA2 = await store.createProject(userA.id, 'Alice in Wonderland', 'Down the rabbit hole...');
    const projB1 = await store.createProject(userB.id, 'Moby Dick', 'Call me Ishmael...');

    const retrievedA1 = await store.getProject(projA1.id);
    expect(retrievedA1?.title).toBe('Wind in the Willows');
    expect(retrievedA1?.status).toBe('CREATED');
    expect(retrievedA1?.stepState).toBe('IDLE');

    const listA = await store.listProjects(userA.id);
    expect(listA).toHaveLength(2);
    expect(listA.map((p) => p.id)).toContain(projA1.id);
    expect(listA.map((p) => p.id)).toContain(projA2.id);
    expect(listA.map((p) => p.id)).not.toContain(projB1.id);
  });

  it('US-1.2: handles concurrent atomic updates safely without corruption', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Race Test Book', 'Initial manuscript...');

    // Run 5 simultaneous concurrent update operations
    const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
      store.updateProject(project.id, (proj) => {
        return {
          ...proj,
          characters: [
            ...proj.characters,
            {
              id: `char_${i}`,
              name: `Character ${i}`,
              prompt: `Prompt ${i}`,
              portraitReady: false,
            },
          ],
        };
      })
    );

    await Promise.all(concurrentUpdates);

    const finalProject = await store.getProject(project.id);
    expect(finalProject).not.toBeNull();
    expect(finalProject?.characters.length).toBe(5);
  });

  it('US-1.3: executes dual state machine transitions accurately', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'State Test Book', 'Manuscript text...');

    // Start Step 1
    const running = await store.startStep(project.id, 'STYLE');
    expect(running.stepState).toBe('RUNNING');
    expect(running.currentRunningStep).toBe('STYLE');
    expect(running.stepStartedAt).toBeTypeOf('number');
    expect(running.status).toBe('CREATED');

    // Complete Step 1
    const completed = await store.completeStep(project.id, 'STYLE', 'STYLE_SET', {
      style: 'Vibrant Watercolor with soft gouache contours',
    });
    expect(completed.status).toBe('STYLE_SET');
    expect(completed.stepState).toBe('IDLE');
    expect(completed.currentRunningStep).toBeUndefined();
    expect(completed.style).toContain('Vibrant Watercolor');

    // Fail Step 2
    await store.startStep(project.id, 'CHARACTERS');
    const failed = await store.failStep(project.id, 'CHARACTERS', 'API Rate Limit Exceeded');
    expect(failed.status).toBe('STYLE_SET'); // Milestone preserved!
    expect(failed.stepState).toBe('FAILED');
    expect(failed.lastError?.step).toBe('CHARACTERS');
    expect(failed.lastError?.message).toBe('API Rate Limit Exceeded');
  });

  it('US-1.1: saves and retrieves binary image assets', async () => {
    const user = await store.getOrCreateUser('Artist', 'artist@test.com');
    const project = await store.createProject(user.id, 'Art Book', 'Book text...');

    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const assetUrl = await store.saveProjectAsset(project.id, 'char_1_portrait.png', fakePng);
    expect(assetUrl).toBe(`/api/projects/${project.id}/assets/char_1_portrait.png`);

    const assetPath = store.getProjectAssetPath(project.id, 'char_1_portrait.png');
    expect(assetPath).not.toBeNull();
    expect(fs.existsSync(assetPath!)).toBe(true);
  });
});
