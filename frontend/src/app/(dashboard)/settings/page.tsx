'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  History,
  Plus,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatDate } from '../../../lib/utils';

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'org' | 'departments' | 'members' | 'audits'>('org');
  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // Form State
  const [orgForm, setOrgForm] = useState({
    name: '',
    address: '',
    tax_id: '',
    contact_email: '',
    contact_phone: '',
    currency: 'INR',
  });

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/organization/settings');
      setData(res);
      if (res.organization) {
        setOrgForm({
          name: res.organization.name || '',
          address: res.organization.address || '',
          tax_id: res.organization.tax_id || '',
          contact_email: res.organization.contact_email || '',
          contact_phone: res.organization.contact_phone || '',
          currency: res.organization.currency || 'INR',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await fetchApi('/organization/profile', {
        method: 'PUT',
        body: JSON.stringify(orgForm),
      });
      alert('Organization profile updated successfully');
      loadSettings();
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await fetchApi('/organization/departments', {
        method: 'POST',
        body: JSON.stringify({ name: newDeptName, description: newDeptDesc }),
      });
      setNewDeptName('');
      setNewDeptDesc('');
      loadSettings();
    } catch (err: any) {
      alert(`Error creating department: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Organization & Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage multi-tenant business profiles, department taxonomies, team roles, and audit compliance trails.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        {[
          { key: 'org', label: 'Company Profile', icon: Building2 },
          { key: 'departments', label: 'Departments', icon: Users },
          { key: 'members', label: 'Team & RBAC Roles', icon: Shield },
          { key: 'audits', label: 'Immutable Audit Logs', icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Company Profile */}
      {activeTab === 'org' && (
        <form onSubmit={handleSaveOrg} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax ID / GSTIN / PAN</label>
              <input
                type="text"
                value={orgForm.tax_id}
                onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Address</label>
              <input
                type="text"
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                value={orgForm.contact_email}
                onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={orgForm.contact_phone}
                onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingOrg}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{savingOrg ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateDept} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Department</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                placeholder="Department Name (e.g. Sales, Marketing)"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </form>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Department Name</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.departments || []).map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="py-3 px-4 text-slate-500">{d.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Members & RBAC */}
      {activeTab === 'members' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.members || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No members configured.</td>
                </tr>
              ) : (
                data.members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{m.full_name}</td>
                    <td className="py-3 px-4 text-slate-500">{m.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold uppercase text-[10px]">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Immutable Audit Logs */}
      {activeTab === 'audits' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.auditLogs || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">No audit activity recorded yet.</td>
                </tr>
              ) : (
                data.auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">{log.entity_type}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{log.entity_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
