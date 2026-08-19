export class ConflictError extends Error {
  public statusCode = 409;
  constructor(message = 'Pipeline step is already running on this project') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class PipelineMutex {
  private activeLocks: Set<string> = new Set();

  /**
   * Synchronously attempts to acquire the lock for a project.
   * Returns true if lock was successfully acquired, false if already locked.
   * MUST be called synchronously before any async I/O or `await` statements.
   */
  public acquireLock(projectId: string): boolean {
    if (this.activeLocks.has(projectId)) {
      return false;
    }
    this.activeLocks.add(projectId);
    return true;
  }

  /**
   * Releases the in-memory lock for a project.
   */
  public releaseLock(projectId: string): void {
    this.activeLocks.delete(projectId);
  }

  /**
   * Checks if a project is currently locked in memory.
   */
  public isLocked(projectId: string): boolean {
    return this.activeLocks.has(projectId);
  }

  /**
   * Forcibly releases the in-memory lock (used during stranded recovery).
   */
  public forceUnlock(projectId: string): void {
    this.activeLocks.delete(projectId);
  }

  /**
   * Executes an asynchronous task under the protection of the mutex.
   * Rejects immediately with ConflictError (409) if already locked.
   */
  public async withLock<T>(projectId: string, task: () => Promise<T>): Promise<T> {
    const acquired = this.acquireLock(projectId);
    if (!acquired) {
      throw new ConflictError(`Project ${projectId} is already executing a pipeline step.`);
    }

    try {
      return await task();
    } finally {
      this.releaseLock(projectId);
    }
  }
}

// Global Singleton Mutex Instance
export const pipelineMutex = new PipelineMutex();
