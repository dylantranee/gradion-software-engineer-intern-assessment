import fs from 'node:fs';
import path from 'node:path';
import lockfile from 'proper-lockfile';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Project,
  ProjectSummary,
  StepKey,
  PipelineStatus,
} from '../../shared/types.js';

export const STUCK_TIMEOUT_MS = 60_000; // 60 seconds stranded lock timeout

export class JsonStore {
  private baseDir: string;
  private projectsDir: string;
  private assetsDir: string;
  private usersFile: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = path.resolve(baseDir);
    } else if (process.env.STORAGE_DIR) {
      this.baseDir = path.resolve(process.env.STORAGE_DIR);
    } else {
      const isBackendSubdir = path.basename(process.cwd()) === 'backend';
      this.baseDir = path.resolve(isBackendSubdir ? path.join(process.cwd(), '..', 'data') : path.join(process.cwd(), 'data'));
    }
    this.projectsDir = path.join(this.baseDir, 'projects');
    this.assetsDir = path.join(this.baseDir, 'assets');
    this.usersFile = path.join(this.baseDir, 'users.json');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
    if (!fs.existsSync(this.usersFile)) {
      fs.writeFileSync(this.usersFile, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  // --- Safe Atomic JSON File Write with Advisory Locks ---
  private async atomicWriteJson<T>(filePath: string, data: T): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return;
    }

    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 10,
          factor: 1.5,
          minTimeout: 20,
          maxTimeout: 200,
        },
      });

      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } finally {
      if (release) {
        try {
          await release();
        } catch {
          // Lock might have already been released
        }
      }
    }
  }

  // --- User Repository Methods ---
  public async getUsers(): Promise<User[]> {
    try {
      const raw = fs.readFileSync(this.usersFile, 'utf-8');
      return JSON.parse(raw) as User[];
    } catch {
      return [];
    }
  }

  public async getOrCreateUser(name: string, email: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = await this.getUsers();

    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return existing;
    }

    const newUser: User = {
      id: `usr_${uuidv4().substring(0, 8)}`,
      name: name.trim() || 'Book Author',
      email: normalizedEmail,
      createdAt: Date.now(),
    };

    users.push(newUser);
    await this.atomicWriteJson(this.usersFile, users);
    return newUser;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const users = await this.getUsers();
    return users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  public async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  // --- Project Repository Methods ---
  private getProjectFilePath(id: string): string {
    return path.join(this.projectsDir, `${id}.json`);
  }

  public async createProject(userId: string, title: string, bookText: string): Promise<Project> {
    const now = Date.now();
    const project: Project = {
      id: `proj_${uuidv4().substring(0, 8)}`,
      userId,
      title: title.trim() || 'Untitled Book',
      bookText: bookText.trim(),
      createdAt: now,
      updatedAt: now,
      status: 'CREATED',
      stepState: 'IDLE',
      currentRunningStep: undefined,
      stepStartedAt: null,
      lastError: null,
      style: null,
      characters: [],
      chapters: [],
    };

    const filePath = this.getProjectFilePath(project.id);
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
    return project;
  }

  public async getProject(id: string): Promise<Project | null> {
    const filePath = this.getProjectFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as Project;
    } catch {
      return null;
    }
  }

  public async listProjects(userId: string): Promise<ProjectSummary[]> {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.projectsDir).filter((f) => f.endsWith('.json'));
    const summaries: ProjectSummary[] = [];

    for (const file of files) {
      const filePath = path.join(this.projectsDir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const proj = JSON.parse(raw) as Project;
        if (proj.userId === userId) {
          summaries.push({
            id: proj.id,
            title: proj.title,
            status: proj.status,
            stepState: proj.stepState,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt,
            characterCount: proj.characters?.length || 0,
            chapterCount: proj.chapters?.length || 0,
          });
        }
      } catch {
        // Skip unreadable files safely
      }
    }

    return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async updateProject(
    id: string,
    mutator: (proj: Project) => Project | Promise<Project>
  ): Promise<Project> {
    const filePath = this.getProjectFilePath(id);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project ${id} not found`);
    }

    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 10,
          minTimeout: 50,
          maxTimeout: 500,
        },
        stale: 10_000,
      });

      const raw = fs.readFileSync(filePath, 'utf-8');
      const current = JSON.parse(raw) as Project;
      const updated = await mutator(current);
      updated.updatedAt = Date.now();

      const tmpFile = `${filePath}.${uuidv4()}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(updated, null, 2), 'utf-8');
      fs.renameSync(tmpFile, filePath);

      return updated;
    } finally {
      if (release) {
        try {
          await release();
        } catch {
          // Lock release safeguard
        }
      }
    }
  }

  // --- Dual State Machine & Recovery Transitions ---

  public isLockStranded(project: Project): boolean {
    if (project.stepState !== 'RUNNING' || !project.stepStartedAt) {
      return false;
    }
    return Date.now() - project.stepStartedAt > STUCK_TIMEOUT_MS;
  }

  public async startStep(id: string, stepKey: StepKey): Promise<Project> {
    return this.updateProject(id, (proj) => {
      if (proj.stepState === 'RUNNING' && !this.isLockStranded(proj)) {
        throw new Error(`Step ${proj.currentRunningStep || 'UNKNOWN'} is already running on project ${id}`);
      }
      return {
        ...proj,
        stepState: 'RUNNING',
        currentRunningStep: stepKey,
        stepStartedAt: Date.now(),
        lastError: null,
      };
    });
  }

  public async completeStep(
    id: string,
    stepKey: StepKey,
    nextStatus: PipelineStatus,
    mutations?: Partial<Project>
  ): Promise<Project> {
    return this.updateProject(id, (proj) => {
      return {
        ...proj,
        ...(mutations || {}),
        status: nextStatus,
        stepState: 'IDLE',
        currentRunningStep: undefined,
        stepStartedAt: null,
        lastError: null,
      };
    });
  }

  public async failStep(id: string, stepKey: StepKey, errorMessage: string): Promise<Project> {
    return this.updateProject(id, (proj) => {
      return {
        ...proj,
        stepState: 'FAILED',
        currentRunningStep: undefined,
        stepStartedAt: null,
        lastError: {
          step: stepKey,
          message: errorMessage,
          timestamp: Date.now(),
        },
      };
    });
  }

  public async recoverProject(id: string): Promise<Project> {
    return this.updateProject(id, (proj) => {
      return {
        ...proj,
        stepState: 'IDLE',
        currentRunningStep: undefined,
        stepStartedAt: null,
      };
    });
  }

  // --- Asset Management ---
  public getProjectAssetDir(projectId: string): string {
    const dir = path.join(this.assetsDir, projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public async saveProjectAsset(
    projectId: string,
    filename: string,
    buffer: Buffer
  ): Promise<string> {
    const assetDir = this.getProjectAssetDir(projectId);
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(assetDir, sanitizedFilename);
    fs.writeFileSync(filePath, buffer);
    return `/api/projects/${projectId}/assets/${sanitizedFilename}`;
  }

  public getProjectAssetPath(projectId: string, filename: string): string | null {
    const assetDir = path.join(this.assetsDir, projectId);
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(assetDir, sanitizedFilename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}

// Global Singleton Instance
export const jsonStore = new JsonStore();
