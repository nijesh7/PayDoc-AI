import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function listNotifications(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err: any) {
    console.error('listNotifications error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('markNotificationRead error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function listReminders(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('reminders')
      .select('*')
      .eq('organization_id', orgId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json({ reminders: data || [] });
  } catch (err: any) {
    console.error('listReminders error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateReminderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.organizationId;

    const { data, error } = await supabaseAdmin
      .from('reminders')
      .update({ status })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    res.json({ reminder: data });
  } catch (err: any) {
    console.error('updateReminderStatus error:', err);
    res.status(500).json({ error: err.message });
  }
}
