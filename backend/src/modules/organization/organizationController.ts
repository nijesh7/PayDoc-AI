import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function getOrganizationSettings(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;

    const [
      { data: org, error: orgError },
      { data: departments },
      { data: members },
      { data: auditLogs },
    ] = await Promise.all([
      supabaseAdmin.from('organizations').select('*').eq('id', orgId).single(),
      supabaseAdmin.from('departments').select('*').eq('organization_id', orgId).order('name', { ascending: true }),
      supabaseAdmin.from('users').select('id, email, full_name, role, is_active, created_at').eq('organization_id', orgId),
      supabaseAdmin.from('audit_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(20),
    ]);

    if (orgError && !org) {
      // Fallback demo org object if not in DB
      return res.json({
        organization: {
          id: orgId,
          name: 'Acme Technologies Pvt Ltd',
          slug: 'acme-tech',
          currency: 'INR',
          address: '402, Cyber Tower, Hitec City, Hyderabad',
          tax_id: '36AAACA1234A1Z5',
        },
        departments: departments || [],
        members: members || [],
        auditLogs: auditLogs || [],
      });
    }

    res.json({
      organization: org,
      departments: departments || [],
      members: members || [],
      auditLogs: auditLogs || [],
    });
  } catch (err: any) {
    console.error('getOrganizationSettings error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateOrganizationProfile(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { name, address, tax_id, contact_email, contact_phone, currency } = req.body;

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .update({
        name,
        address,
        tax_id,
        contact_email,
        contact_phone,
        currency: currency || 'INR',
      })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    res.json({ organization: org });
  } catch (err: any) {
    console.error('updateOrganizationProfile error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createDepartment(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Department name is required' });

    const { data: dept, error } = await supabaseAdmin
      .from('departments')
      .insert({
        organization_id: orgId,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ department: dept });
  } catch (err: any) {
    console.error('createDepartment error:', err);
    res.status(500).json({ error: err.message });
  }
}
