import { Router, Response } from 'express';
import { jsonStore } from '../storage/jsonStore.js';
import { pipelineMutex, ConflictError } from '../orchestrator/mutex.js';
import { pipelineOrchestrator } from '../orchestrator/pipeline.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { StepKey } from '../../shared/types.js';

export const pipelineRouter = Router();

// Apply authentication middleware to all pipeline endpoints
pipelineRouter.use(requireAuth);

const VALID_STEPS: StepKey[] = ['STYLE', 'CHARACTERS', 'PORTRAITS', 'CHAPTERS', 'ILLUSTRATIONS'];

/**
 * POST /api/projects/:id/step/:stepKey
 * Executes a pipeline step under concurrency mutex guard (409 Conflict) and prerequisite checks (400 Bad Request).
 */
pipelineRouter.post('/:id/step/:stepKey', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id: projectId, stepKey } = req.params;
  const userId = req.user!.id;

  if (!VALID_STEPS.includes(stepKey as StepKey)) {
    res.status(400).json({
      error: `Invalid step key '${stepKey}'. Valid steps are: ${VALID_STEPS.join(', ')}`,
    });
    return;
  }

  try {
    const project = await jsonStore.getProject(projectId);

    if (!project) {
      res.status(404).json({ error: `Project '${projectId}' not found.` });
      return;
    }

    // US-3.3 Multi-tenant authorization guard
    if (project.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to execute steps on this project.',
      });
      return;
    }

    const { customStyle } = req.body || {};
    const updated = await pipelineOrchestrator.executeStep(projectId, stepKey as StepKey, {
      customStyle,
    });

    res.status(200).json(updated);
  } catch (err: unknown) {
    if (err instanceof ConflictError) {
      res.status(409).json({
        error: err.message,
        code: 'CONFLICT',
      });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    // Prerequisite state violations
    if (message.includes('must be completed before')) {
      res.status(400).json({ error: message });
      return;
    }

    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/projects/:id/recover
 * Recovers stranded locks and restores stepState = 'IDLE' while preserving completed milestones.
 */
pipelineRouter.post('/:id/recover', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id: projectId } = req.params;
  const userId = req.user!.id;

  try {
    const project = await jsonStore.getProject(projectId);

    if (!project) {
      res.status(404).json({ error: `Project '${projectId}' not found.` });
      return;
    }

    // US-3.3 Multi-tenant authorization guard
    if (project.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to recover this project.',
      });
      return;
    }

    pipelineMutex.forceUnlock(projectId);
    const recovered = await jsonStore.recoverProject(projectId);

    res.status(200).json(recovered);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});
