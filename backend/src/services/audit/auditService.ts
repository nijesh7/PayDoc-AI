/**
 * ============================================================================
 * PAYDOC AI — Centralized Audit Logging Service
 * ============================================================================
 * Records immutable chronological audit trails for all critical mutations.
 * Invariant: Every administrative and financial mutation must produce an audit entry.
 */

import { Request } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export interface AuditLogOptions {
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  organization_id?: string;
  user_id?: string;
}

export async function logAuditTrail(req: Request, options: AuditLogOptions): Promise<void> {
  try {
    const orgId = options.organization_id || req.organizationId;
    const userId = options.user_id || req.user?.id || null;

    if (!orgId) {
      console.warn('[AuditService] Skipping audit log: Missing organizationId');
      return;
    }

    const { error } = await supabaseAdmin.from('audit_logs').insert({
      organization_id: orgId,
      user_id: userId,
      action: options.action,
      entity_type: options.entity_type,
      entity_id: options.entity_id,
      old_values: options.old_values || null,
      new_values: options.new_values || null,
      ip_address: req.ip || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    });

    if (error) {
      console.error('[AuditService] Failed to insert audit log:', error.message);
    }
  } catch (err) {
    console.error('[AuditService] Unexpected error in logAuditTrail:', err);
  }
}
