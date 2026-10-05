import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { UserRole, UserStatus, normalizeRole } from '../types/auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organization_id: string;
  role: UserRole;
  status: UserStatus;
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
    // 1. Bypass authentication for CORS preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    const orgHeader = req.headers['x-organization-id'] as string;
    const roleHeader = req.headers['x-user-role'] as string;

    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]?.trim()
      : null;

    if (!token || token === 'undefined' || token === 'null' || token === '') {
      // Default to demo session for local development if no auth token provided
      req.organizationId = orgHeader || DEFAULT_ORG_ID;
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@acmetech.com',
        full_name: 'Admin User',
        organization_id: req.organizationId,
        role: roleHeader ? normalizeRole(roleHeader) : 'ADMIN',
        status: 'active',
      };
      return next();
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.warn(`[authMiddleware] Supabase auth.getUser failed: ${error?.message || 'User null'}`);
      return res.status(401).json({
        error: 'Invalid or expired session token',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Fetch user profile from database to get role, status and organization_id
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
        role: normalizeRole(user.user_metadata?.role as any),
        status: (user.user_metadata?.status as any) || 'active',
      };
      return next();
    }

    const userStatus = (profile.status || (profile.is_active === false ? 'disabled' : 'active')) as UserStatus;

    if (userStatus === 'disabled') {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact your administrator.' });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      organization_id: profile.organization_id,
      role: normalizeRole(profile.role),
      status: userStatus,
    };
    req.organizationId = profile.organization_id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}
