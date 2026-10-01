import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organization_id: string;
  role: 'admin' | 'hr' | 'accountant' | 'employee';
  full_name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organizationId?: string;
    }
  }
}

// Fallback demo organization ID from seed data
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const orgHeader = req.headers['x-organization-id'] as string;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Default to demo admin session for local development if no auth header provided
      req.organizationId = orgHeader || DEFAULT_ORG_ID;
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@acmetech.com',
        full_name: 'Admin User',
        organization_id: req.organizationId,
        role: 'admin',
      };
      return next();
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    // Fetch user profile from database to get role and organization_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // User exists in Supabase Auth but not in public.users yet; create or fallback
      req.organizationId = orgHeader || DEFAULT_ORG_ID;
      req.user = {
        id: user.id,
        email: user.email || 'user@paydoc.ai',
        full_name: user.user_metadata?.full_name || 'Organization Member',
        organization_id: req.organizationId,
        role: (user.user_metadata?.role as any) || 'admin',
      };
      return next();
    }

    req.user = profile as AuthenticatedUser;
    req.organizationId = profile.organization_id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}
