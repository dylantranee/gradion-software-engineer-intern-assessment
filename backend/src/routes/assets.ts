import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import { jsonStore } from '../storage/jsonStore.js';

export const assetsRouter = Router();

/**
 * Public endpoint to stream generated image assets (portraits and illustrations).
 * Does not require auth headers so standard <img> tags load images without custom headers.
 */
assetsRouter.get('/:id/assets/:filename', (req: Request, res: Response): void => {
  const { id: projectId, filename } = req.params;

  if (!projectId || !filename) {
    res.status(400).json({ error: 'Missing projectId or filename parameter.' });
    return;
  }

  const assetPath = jsonStore.getProjectAssetPath(projectId, filename);

  if (!assetPath || !fs.existsSync(assetPath)) {
    res.status(404).json({ error: `Asset '${filename}' for project '${projectId}' not found.` });
    return;
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1-day client cache
  fs.createReadStream(assetPath).pipe(res);
});
