import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineMutex, ConflictError } from '../src/orchestrator/mutex.js';
import { STUCK_TIMEOUT_MS, JsonStore } from '../src/storage/jsonStore.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('US-1.4 & US-1.5: Server-Side Concurrency Mutex & Stranded Lock Recovery', () => {
  let mutex: PipelineMutex;
  let tempDir: string;
  let store: JsonStore;

  beforeEach(() => {
    mutex = new PipelineMutex();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradion-test-mutex-'));
    store = new JsonStore(tempDir);
  });

  it('US-1.4: acquires and releases in-memory lock synchronously', () => {
    const projId = 'proj_test_1';
    expect(mutex.isLocked(projId)).toBe(false);

    expect(mutex.acquireLock(projId)).toBe(true);
    expect(mutex.isLocked(projId)).toBe(true);

    // Immediate duplicate acquisition should fail synchronously
    expect(mutex.acquireLock(projId)).toBe(false);

    mutex.releaseLock(projId);
    expect(mutex.isLocked(projId)).toBe(false);
  });

  it('US-1.4: withLock executes task and releases lock automatically on success and failure', async () => {
    const projId = 'proj_test_2';

    const result = await mutex.withLock(projId, async () => {
      expect(mutex.isLocked(projId)).toBe(true);
      return 'SUCCESS_DATA';
    });

    expect(result).toBe('SUCCESS_DATA');
    expect(mutex.isLocked(projId)).toBe(false);

    // On error
    await expect(
      mutex.withLock(projId, async () => {
        expect(mutex.isLocked(projId)).toBe(true);
        throw new Error('Task Failed');
      })
    ).rejects.toThrow('Task Failed');

    expect(mutex.isLocked(projId)).toBe(false);
  });

  it('US-1.4: withLock rejects concurrent requests with ConflictError (409)', async () => {
    const projId = 'proj_test_3';

    let resolveFirstTask: () => void;
    const firstTaskPromise = new Promise<void>((resolve) => {
      resolveFirstTask = resolve;
    });

    // Start first long task
    const task1 = mutex.withLock(projId, async () => {
      await firstTaskPromise;
      return 'TASK_1_DONE';
    });

    // Attempt second task while first is in-flight
    await expect(
      mutex.withLock(projId, async () => {
        return 'TASK_2_DONE';
      })
    ).rejects.toThrow(ConflictError);

    // Complete task 1
    resolveFirstTask!();
    const task1Result = await task1;
    expect(task1Result).toBe('TASK_1_DONE');
    expect(mutex.isLocked(projId)).toBe(false);
  });

  it('US-1.5: detects stranded locks past STUCK_TIMEOUT_MS', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Timeout Book', 'Manuscript text...');

    // Simulate running step started 65 seconds ago
    await store.updateProject(project.id, (p) => ({
      ...p,
      stepState: 'RUNNING',
      currentRunningStep: 'PORTRAITS',
      stepStartedAt: Date.now() - (STUCK_TIMEOUT_MS + 5_000),
      status: 'CHARACTERS_GENERATED',
    }));

    const strandedProject = (await store.getProject(project.id))!;
    expect(store.isLockStranded(strandedProject)).toBe(true);

    // Fresh running step should NOT be stranded
    await store.updateProject(project.id, (p) => ({
      ...p,
      stepStartedAt: Date.now() - 5_000,
    }));
    const freshProject = (await store.getProject(project.id))!;
    expect(store.isLockStranded(freshProject)).toBe(false);
  });

  it('US-1.5: recovers stranded project lock and preserves completed milestone status', async () => {
    const user = await store.getOrCreateUser('Author', 'author@test.com');
    const project = await store.createProject(user.id, 'Recovery Book', 'Manuscript text...');

    // Simulate stranded project at Step 3 with status CHARACTERS_GENERATED
    await store.updateProject(project.id, (p) => ({
      ...p,
      status: 'CHARACTERS_GENERATED',
      stepState: 'RUNNING',
      currentRunningStep: 'PORTRAITS',
      stepStartedAt: Date.now() - (STUCK_TIMEOUT_MS + 10_000),
    }));

    // Mutex might also have an in-memory lock
    mutex.acquireLock(project.id);
    expect(mutex.isLocked(project.id)).toBe(true);

    // Execute recovery
    mutex.forceUnlock(project.id);
    const recovered = await store.recoverProject(project.id);

    expect(mutex.isLocked(project.id)).toBe(false);
    expect(recovered.status).toBe('CHARACTERS_GENERATED'); // Milestone preserved!
    expect(recovered.stepState).toBe('IDLE');
    expect(recovered.currentRunningStep).toBeUndefined();
    expect(recovered.stepStartedAt).toBeNull();
  });
});
