import { Request, Response, NextFunction } from 'express';
import { UserRole, normalizeRole } from '../types/auth';

export function requireRole(allowedRoles: Array<UserRole | string>) {
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Access forbidden: Role '${userRole}' is not authorized for this action. Required: ${normalizedAllowed.join(', ')}`,
      });
    }

    next();
  };
}
