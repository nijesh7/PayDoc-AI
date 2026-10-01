import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { UserRole, normalizeRole } from '../../types/auth';

export class UserController {
  /**
   * Verify authenticated user's stored role against selected role at login
   */
  async verifyRole(req: Request, res: Response) {
    try {
      const { selectedRole, token } = req.body;

      if (!selectedRole) {
        return res.status(400).json({ error: 'Please select your role.' });
      }

      const normalizedSelected = normalizeRole(selectedRole);

      // Get user from token
      let userId = req.user?.id;
      let userEmail = req.user?.email;

      if (token) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
          return res.status(401).json({ error: 'Invalid or expired session token.' });
        }
        userId = user.id;
        userEmail = user.email;
      }

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      // Fetch user profile from database
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*, organizations(*)')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        // Fallback for newly created auth user before profile sync
        return res.json({
          success: true,
          user: {
            id: userId,
            email: userEmail,
            role: normalizedSelected,
            status: 'active',
            full_name: req.user?.full_name || 'Organization Member',
            organization_id: req.user?.organization_id || '00000000-0000-0000-0000-000000000001',
          },
          redirectUrl: `/${normalizedSelected.toLowerCase()}/dashboard`,
        });
      }

      const storedRole = normalizeRole(profile.role);
      const userStatus = profile.status || (profile.is_active === false ? 'disabled' : 'active');

      // Check account status
      if (userStatus === 'pending') {
        return res.status(403).json({
          error: 'Account Pending Approval',
          message: 'Your account has been created and is awaiting administrator approval.',
          status: 'pending',
        });
      }

      if (userStatus === 'disabled') {
        return res.status(403).json({
          error: 'Account Disabled',
          message: 'Your account has been disabled. Please contact your administrator.',
          status: 'disabled',
        });
      }

      // Strict role comparison
      if (storedRole !== normalizedSelected) {
        return res.status(400).json({
          error: 'Role Mismatch',
          storedRole,
          selectedRole: normalizedSelected,
          message: `This account is registered as ${storedRole}. Please select ${storedRole} to continue.`,
        });
      }

      const redirectRoute = `/${storedRole.toLowerCase()}/dashboard`;

      return res.json({
        success: true,
        user: {
          ...profile,
          role: storedRole,
          status: userStatus,
        },
        redirectUrl: redirectRoute,
      });
    } catch (err: any) {
      console.error('Verify role error:', err);
      return res.status(500).json({ error: 'Failed to verify account role: ' + (err.message || 'Server error') });
    }
  }

  /**
   * Register or sync a user profile linked to Supabase Auth & Organization
   */
  async registerProfile(req: Request, res: Response) {
    try {
      const {
        id,
        email,
        full_name,
        role,
        organization_name,
        organization_code,
      } = req.body;

      if (!id || !email || !full_name || !role) {
        return res.status(400).json({ error: 'Missing required profile fields.' });
      }

      const normalizedRole = normalizeRole(role);
      let targetOrgId = '00000000-0000-0000-0000-000000000001'; // Default Acme Tech
      let initialStatus = 'active';

      if (normalizedRole === 'ADMIN' && organization_name) {
        // Create new organization for the Admin
        const slug = organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
        const { data: newOrg, error: orgError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: organization_name,
            slug,
            currency: 'INR',
            contact_email: email,
            invitation_code: slug.toUpperCase().slice(0, 8),
          })
          .select()
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
        } else if (newOrg) {
          targetOrgId = newOrg.id;
        }
      } else if (organization_code) {
        // Find organization by invitation code or slug
        const { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('id, invitation_code')
          .or(`invitation_code.ilike.%${organization_code}%,slug.ilike.%${organization_code}%`)
          .limit(1)
          .single();

        if (existingOrg) {
          targetOrgId = existingOrg.id;
          initialStatus = 'active';
        } else {
          // If code not recognized, place in default org with pending status for security
          initialStatus = 'pending';
        }
      } else {
        // Non-admin without code defaults to pending for review
        if (normalizedRole !== 'ADMIN') {
          initialStatus = 'pending';
        }
      }

      // Upsert into users table
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id,
          organization_id: targetOrgId,
          email,
          full_name,
          role: normalizedRole.toLowerCase(),
          status: initialStatus,
          is_active: initialStatus === 'active',
          updated_at: new Date().toISOString(),
        })
        .select('*, organizations(*)')
        .single();

      if (userError) {
        console.error('Error saving user profile:', userError);
        return res.status(500).json({ error: 'Failed to create user profile: ' + userError.message });
      }

      // Audit log entry
      await supabaseAdmin.from('audit_logs').insert({
        organization_id: targetOrgId,
        user_id: id,
        action: 'USER_REGISTERED',
        entity_type: 'users',
        entity_id: id,
        new_state: { email, full_name, role: normalizedRole, status: initialStatus },
      });

      return res.status(201).json({
        success: true,
        user: {
          ...userProfile,
          role: normalizedRole,
          status: initialStatus,
        },
        requiresApproval: initialStatus === 'pending',
        redirectUrl: `/${normalizedRole.toLowerCase()}/dashboard`,
      });
    } catch (err: any) {
      console.error('Register profile error:', err);
      return res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
    }
  }

  /**
   * Get all organization users (Admin only)
   */
  async getUsers(req: Request, res: Response) {
    try {
      const orgId = req.organizationId;
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const formatted = (users || []).map((u) => ({
        ...u,
        role: normalizeRole(u.role),
        status: u.status || (u.is_active === false ? 'disabled' : 'active'),
      }));

      return res.json({ users: formatted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Update user role (Admin only with audit logging)
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newRole } = req.body;
      const orgId = req.organizationId;
      const adminId = req.user?.id;

      if (!newRole) {
        return res.status(400).json({ error: 'New role is required.' });
      }

      const normalizedRole = normalizeRole(newRole);

      // Get current user data
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      if (fetchError || !existingUser) {
        return res.status(404).json({ error: 'User not found in this organization.' });
      }

      const oldRole = normalizeRole(existingUser.role);

      // Update role
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          role: normalizedRole.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      // Record in audit log
      await supabaseAdmin.from('audit_logs').insert({
        organization_id: orgId,
        user_id: adminId,
        action: 'ROLE_CHANGED',
        entity_type: 'users',
        entity_id: id,
        previous_state: { role: oldRole },
        new_state: { role: normalizedRole },
      });

      return res.json({
        success: true,
        message: `Role changed successfully from ${oldRole} to ${normalizedRole}`,
        user: {
          ...updatedUser,
          role: normalizedRole,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Update user status: approve, activate, disable (Admin only)
   */
  async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const orgId = req.organizationId;
      const adminId = req.user?.id;

      if (!status || !['active', 'pending', 'disabled'].includes(status)) {
        return res.status(400).json({ error: 'Valid status required (active, pending, disabled).' });
      }

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({
          status,
          is_active: status === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        organization_id: orgId,
        user_id: adminId,
        action: 'USER_STATUS_UPDATED',
        entity_type: 'users',
        entity_id: id,
        new_state: { status },
      });

      return res.json({
        success: true,
        message: `User status updated to ${status}`,
        user: updatedUser,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { data: profile, error } = await supabaseAdmin
        .from('users')
        .select('*, organizations(*)')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return res.json({
          user: {
            id: userId,
            email: req.user?.email,
            full_name: req.user?.full_name,
            role: req.user?.role,
            status: req.user?.status || 'active',
            organization_id: req.user?.organization_id,
          },
        });
      }

      return res.json({
        user: {
          ...profile,
          role: normalizeRole(profile.role),
          status: profile.status || (profile.is_active === false ? 'disabled' : 'active'),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Update current user's profile information
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { full_name, phone, avatar_url } = req.body;

      const { data: updated, error } = await supabaseAdmin
        .from('users')
        .update({
          full_name,
          phone,
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*, organizations(*)')
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        success: true,
        user: {
          ...updated,
          role: normalizeRole(updated.role),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export const userController = new UserController();
