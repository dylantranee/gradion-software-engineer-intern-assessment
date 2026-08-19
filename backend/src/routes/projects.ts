import { Router, Response } from 'express';
import { jsonStore } from '../storage/jsonStore.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const projectsRouter = Router();

// Apply auth middleware to all project management endpoints
projectsRouter.use(requireAuth);

/**
 * GET /api/projects
 * Lists project summaries belonging strictly to the authenticated user.
 */
projectsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const projects = await jsonStore.listProjects(userId);
    res.status(200).json(projects);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/projects
 * Creates a new project initialized with manuscript text and title.
 */
projectsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { title, bookText } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Project title is required.' });
    return;
  }

  if (!bookText || typeof bookText !== 'string' || bookText.trim().length === 0) {
    res.status(400).json({ error: 'Book manuscript text is required.' });
    return;
  }

  try {
    const project = await jsonStore.createProject(userId, title, bookText);
    res.status(201).json(project);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/projects/:id
 * Fetches full project details with multi-tenant data isolation (403 Forbidden).
 */
projectsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const project = await jsonStore.getProject(id);

    if (!project) {
      res.status(404).json({ error: `Project '${id}' not found.` });
      return;
    }

    // US-3.3 Multi-tenant authorization guard
    if (project.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to access this project.',
      });
      return;
    }

    res.status(200).json(project);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});
