import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { approvalService } from '../../services/approvals/approvalService';
import { logAuditTrail } from '../../services/audit/auditService';

/**
 * 1. List pending approvals waiting on user's role
 */
export async function listPendingApprovals(req: Request, res: Response) {
  try {
    const pending = await approvalService.getPendingForUser(req);
    res.json({ pending });
  } catch (err: any) {
    console.error('listPendingApprovals error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 2. List full approval history for the organization
 */
export async function listApprovalHistory(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { entity_type, status } = req.query;

    let query = supabaseAdmin
      .from('approvals')
      .select('*, steps:approval_steps(*, approver:users(full_name, email)), creator:users!created_by(full_name, email)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (entity_type) query = query.eq('entity_type', entity_type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ approvals: data || [] });
  } catch (err: any) {
    console.error('listApprovalHistory error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 3. Get single approval record with complete step timeline
 */
export async function getApprovalDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data, error } = await supabaseAdmin
      .from('approvals')
      .select('*, steps:approval_steps(*, approver:users(full_name, email)), workflow:approval_workflows(*), creator:users!created_by(full_name, email)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json({ approval: data });
  } catch (err: any) {
    console.error('getApprovalDetails error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 4. Action an approval step (Approve or Reject with comments)
 */
export async function actionApprovalStep(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be either 'approve' or 'reject'" });
    }

    const result = await approvalService.actionStep(req, {
      approvalId: id,
      action,
      comments,
    });

    // If final approval was granted on a payroll run, update payroll_runs table
    const { data: approval } = await supabaseAdmin
      .from('approvals')
      .select('entity_type, entity_id')
      .eq('id', id)
      .single();

    if (result.isFinal && approval?.entity_type === 'payroll_run') {
      if (result.status === 'approved') {
        await supabaseAdmin
          .from('payroll_runs')
          .update({
            status: 'approved',
            approved_by: req.user?.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', approval.entity_id);

        await supabaseAdmin
          .from('payroll_items')
          .update({ status: 'approved' })
          .eq('payroll_run_id', approval.entity_id);
      } else if (result.status === 'rejected') {
        await supabaseAdmin
          .from('payroll_runs')
          .update({ status: 'draft', notes: `Rejected during approval: ${comments || 'No comment'}` })
          .eq('id', approval.entity_id);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('actionApprovalStep error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 5. List configured approval workflows
 */
export async function listApprovalWorkflows(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('approval_workflows')
      .select('*')
      .eq('organization_id', orgId)
      .order('entity_type', { ascending: true });

    if (error) throw error;
    res.json({ workflows: data || [] });
  } catch (err: any) {
    console.error('listApprovalWorkflows error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 6. Update approval workflow
 */
export async function updateApprovalWorkflow(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const { name, min_amount, max_amount, steps, maker_checker_enforced, is_active } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('approval_workflows')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('approval_workflows')
      .update({
        name,
        min_amount,
        max_amount,
        steps,
        maker_checker_enforced,
        is_active,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'APPROVAL_WORKFLOW_UPDATED',
      entity_type: 'approval_workflows',
      entity_id: id,
      old_values: existing,
      new_values: data,
    });

    res.json({ workflow: data });
  } catch (err: any) {
    console.error('updateApprovalWorkflow error:', err);
    res.status(400).json({ error: err.message });
  }
}
