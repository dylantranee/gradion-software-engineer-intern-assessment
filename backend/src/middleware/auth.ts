import { Request, Response, NextFunction } from 'express';
import { jsonStore } from '../storage/jsonStore.js';
import { User } from '../../shared/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const emailHeader = req.headers['x-user-email'];

  if (!emailHeader || typeof emailHeader !== 'string' || emailHeader.trim().length === 0) {
    res.status(401).json({
      error: 'Unauthorized: Missing or empty x-user-email header.',
    });
    return;
  }

  const email = emailHeader.trim().toLowerCase();
  try {
    let user = await jsonStore.getUserByEmail(email);
    if (!user) {
      // Auto-provision local passwordless user if first time seen via header
      const defaultName = email.split('@')[0] || 'Studio Author';
      user = await jsonStore.getOrCreateUser(defaultName, email);
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({
      error: 'Authentication error: Unable to resolve user profile.',
    });
  }
}
