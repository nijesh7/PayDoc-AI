import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: Array<'admin' | 'hr' | 'accountant' | 'employee'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: Role '${req.user.role}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
