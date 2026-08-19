import { Router, Request, Response } from 'express';
import { jsonStore } from '../storage/jsonStore.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Passwordless login/registration via required name and email.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      error: 'Full name is required.',
    });
    return;
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0 || !email.includes('@')) {
    res.status(400).json({
      error: 'A valid email address is required.',
    });
    return;
  }

  try {
    const user = await jsonStore.getOrCreateUser(name.trim(), email.trim().toLowerCase());
    res.status(200).json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile based on x-user-email header.
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({ user: req.user });
});
