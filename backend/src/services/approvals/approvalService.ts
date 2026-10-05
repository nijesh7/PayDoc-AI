/**
 * ============================================================================
 * PAYDOC AI — Generic Approvals Engine Service
 * ============================================================================
 * Supports multi-level workflows, role-based steps, delegation, and strict
 * Maker-Checker enforcement (creator cannot approve their own submitted item).
 */

import { Request } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { logAuditTrail } from '../audit/auditService';

export interface WorkflowStepConfig {
  step: number;
  role: string;
  title: string;
}

export interface InitiateApprovalParams {
  entityType: 'payroll_run' | 'invoice' | 'leave_request' | 'reimbursement';
  entityId: string;
  amount?: number;
  creatorId?: string;
  metadata?: Record<string, any>;
}

export interface ActionApprovalParams {
  approvalId: string;
  action: 'approve' | 'reject';
  comments?: string;
}

export interface ApprovalActionResult {
  status: 'pending' | 'approved' | 'rejected';
  isFinal: boolean;
  currentStep: number;
  totalSteps: number;
  stepActed: number;
  message: string;
}

export class ApprovalService {
  /**
   * Find matching active workflow and initiate approval instance with steps
   */
  async initiateApproval(req: Request, params: InitiateApprovalParams): Promise<any> {
    const orgId = req.organizationId;
    const creatorId = params.creatorId || req.user?.id;
    const amount = Number(params.amount) || 0;

    // 1. Look for matching active workflow by entity_type and amount range
    const { data: workflows, error: wfError } = await supabaseAdmin
      .from('approval_workflows')
      .select('*')
      .eq('organization_id', orgId)
      .eq('entity_type', params.entityType)
      .eq('is_active', true)
      .lte('min_amount', amount)
      .order('min_amount', { ascending: false });

    if (wfError) throw wfError;

    // Filter max_amount in memory if specified
    const matchingWorkflow = (workflows || []).find((w) => {
      if (w.max_amount !== null && w.max_amount !== undefined) {
        return amount <= Number(w.max_amount);
      }
      return true;
    }) || workflows?.[0];

    // If no workflow found, fallback to standard single-step admin approval
    const defaultSteps: WorkflowStepConfig[] = [
      { step: 1, role: 'ADMIN', title: 'Administrator Approval' },
    ];
    const stepsConfig: WorkflowStepConfig[] = matchingWorkflow?.steps?.length
      ? matchingWorkflow.steps
      : defaultSteps;

    // 2. Check if an approval instance already exists for this entity
    const { data: existing } = await supabaseAdmin
      .from('approvals')
      .select('*')
      .eq('organization_id', orgId)
      .eq('entity_type', params.entityType)
      .eq('entity_id', params.entityId)
      .single();

    if (existing) {
      if (existing.status === 'approved') {
        throw new Error('This item has already been fully approved.');
      }
      // Reset steps if rejected and re-submitted
      await supabaseAdmin.from('approval_steps').delete().eq('approval_id', existing.id);
      await supabaseAdmin
        .from('approvals')
        .update({
          current_step: 1,
          status: 'pending',
          created_by: creatorId,
          workflow_id: matchingWorkflow?.id || null,
        })
        .eq('id', existing.id);

      await this.createSteps(existing.id, orgId!, stepsConfig);
      return existing;
    }

    // 3. Create approvals parent record
    const { data: approval, error: appError } = await supabaseAdmin
      .from('approvals')
      .insert({
        organization_id: orgId,
        workflow_id: matchingWorkflow?.id || null,
        entity_type: params.entityType,
        entity_id: params.entityId,
        current_step: 1,
        total_steps: stepsConfig.length,
        status: 'pending',
        created_by: creatorId,
      })
      .select()
      .single();

    if (appError || !approval) throw appError;

    // 4. Create approval steps
    await this.createSteps(approval.id, orgId!, stepsConfig);

    // 5. Audit Log
    await logAuditTrail(req, {
      action: 'APPROVAL_INITIATED',
      entity_type: 'approvals',
      entity_id: approval.id,
      new_values: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        total_steps: stepsConfig.length,
        workflow_id: matchingWorkflow?.id,
      },
    });

    return approval;
  }

  private async createSteps(approvalId: string, orgId: string, steps: WorkflowStepConfig[]): Promise<void> {
    const stepRecords = steps.map((s, idx) => ({
      approval_id: approvalId,
      organization_id: orgId,
      step_number: s.step || idx + 1,
      required_role: s.role.toLowerCase(),
      status: idx === 0 ? 'pending' : 'pending',
    }));

    const { error } = await supabaseAdmin.from('approval_steps').insert(stepRecords);
    if (error) throw error;
  }

  /**
   * Action an approval step (Approve or Reject) with strict Maker-Checker enforcement
   */
  async actionStep(req: Request, params: ActionApprovalParams): Promise<ApprovalActionResult> {
    const orgId = req.organizationId;
    const actorId = req.user?.id;
    const actorRole = (req.user?.role || '').toLowerCase();

    // 1. Fetch approval instance and workflow
    const { data: approval, error: appErr } = await supabaseAdmin
      .from('approvals')
      .select('*, workflow:approval_workflows(*)')
      .eq('id', params.approvalId)
      .eq('organization_id', orgId)
      .single();

    if (appErr || !approval) {
      throw new Error('Approval record not found.');
    }

    if (approval.status !== 'pending') {
      throw new Error(`This request has already been ${approval.status}.`);
    }

    // 2. Strict Maker-Checker Rule: Creator cannot approve their own submission
    const makerCheckerEnforced = approval.workflow?.maker_checker_enforced ?? true;
    if (makerCheckerEnforced && approval.created_by && approval.created_by === actorId) {
      throw new Error('Maker-Checker Violation: You cannot approve or sign off on your own submission.');
    }

    // 3. Fetch active current step
    const { data: currentStep, error: stepErr } = await supabaseAdmin
      .from('approval_steps')
      .select('*')
      .eq('approval_id', approval.id)
      .eq('step_number', approval.current_step)
      .single();

    if (stepErr || !currentStep) {
      throw new Error(`Approval step ${approval.current_step} not found.`);
    }

    // 4. Role Authorization: Does the user hold the required role for this step?
    // Admin has superuser authority unless maker-checker applies
    const requiredRole = currentStep.required_role.toLowerCase();
    const isAuthorizedRole = actorRole === requiredRole || actorRole === 'admin';

    if (!isAuthorizedRole) {
      throw new Error(
        `Unauthorized: Step ${currentStep.step_number} requires '${currentStep.required_role.toUpperCase()}' role.`
      );
    }

    const timestamp = new Date().toISOString();

    // 5. Handle REJECTION
    if (params.action === 'reject') {
      // Mark step rejected
      await supabaseAdmin
        .from('approval_steps')
        .update({
          status: 'rejected',
          approver_id: actorId,
          comments: params.comments || 'Rejected by approver',
          acted_at: timestamp,
        })
        .eq('id', currentStep.id);

      // Mark overall approval rejected
      await supabaseAdmin
        .from('approvals')
        .update({
          status: 'rejected',
        })
        .eq('id', approval.id);

      await logAuditTrail(req, {
        action: 'APPROVAL_REJECTED',
        entity_type: 'approvals',
        entity_id: approval.id,
        new_values: {
          step: approval.current_step,
          rejected_by: actorId,
          comments: params.comments,
        },
      });

      return {
        status: 'rejected',
        isFinal: true,
        currentStep: approval.current_step,
        totalSteps: approval.total_steps,
        stepActed: approval.current_step,
        message: `Step ${approval.current_step} rejected. The item has been sent back.`,
      };
    }

    // 6. Handle APPROVAL
    await supabaseAdmin
      .from('approval_steps')
      .update({
        status: 'approved',
        approver_id: actorId,
        comments: params.comments || 'Approved',
        acted_at: timestamp,
      })
      .eq('id', currentStep.id);

    const isLastStep = approval.current_step >= approval.total_steps;

    if (isLastStep) {
      // Final Approval reached!
      await supabaseAdmin
        .from('approvals')
        .update({
          status: 'approved',
        })
        .eq('id', approval.id);

      await logAuditTrail(req, {
        action: 'APPROVAL_FULLY_APPROVED',
        entity_type: 'approvals',
        entity_id: approval.id,
        new_values: {
          step: approval.current_step,
          approved_by: actorId,
          is_final: true,
        },
      });

      return {
        status: 'approved',
        isFinal: true,
        currentStep: approval.current_step,
        totalSteps: approval.total_steps,
        stepActed: approval.current_step,
        message: 'Final approval granted successfully.',
      };
    } else {
      // Advance to next step
      const nextStepNum = approval.current_step + 1;
      await supabaseAdmin
        .from('approvals')
        .update({
          current_step: nextStepNum,
        })
        .eq('id', approval.id);

      await logAuditTrail(req, {
        action: 'APPROVAL_STEP_APPROVED',
        entity_type: 'approvals',
        entity_id: approval.id,
        new_values: {
          step_completed: approval.current_step,
          next_step: nextStepNum,
          approved_by: actorId,
        },
      });

      return {
        status: 'pending',
        isFinal: false,
        currentStep: nextStepNum,
        totalSteps: approval.total_steps,
        stepActed: approval.current_step,
        message: `Step ${approval.current_step} approved. Advanced to step ${nextStepNum}.`,
      };
    }
  }

  /**
   * Fetch all pending approvals requiring the current user's action
   */
  async getPendingForUser(req: Request): Promise<any[]> {
    const orgId = req.organizationId;
    const actorRole = (req.user?.role || '').toLowerCase();
    const actorId = req.user?.id;

    // Fetch pending approvals for this organization
    const { data: pendingApprovals, error } = await supabaseAdmin
      .from('approvals')
      .select('*, steps:approval_steps(*)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter to items where current_step matches the user's role and maker-checker allows action
    const actionable = (pendingApprovals || []).filter((item: any) => {
      const activeStep = item.steps?.find((s: any) => s.step_number === item.current_step);
      if (!activeStep) return false;

      // Cannot approve own submission
      if (item.created_by && item.created_by === actorId) {
        return false;
      }

      // Check role permission
      const reqRole = activeStep.required_role.toLowerCase();
      return actorRole === 'admin' || actorRole === reqRole;
    });

    return actionable;
  }
}

export const approvalService = new ApprovalService();
