import { Router, Request, Response } from 'express';
import { jsonStore } from '../storage/jsonStore.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Passwordless login/registration via name and email.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { name, email } = req.body || {};

  if (!email || typeof email !== 'string' || email.trim().length === 0 || !email.includes('@')) {
    res.status(400).json({
      error: 'Invalid email address provided.',
    });
    return;
  }

  try {
    const user = await jsonStore.getOrCreateUser(name || email.split('@')[0], email);
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
