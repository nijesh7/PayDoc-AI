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
  Sun,
  Moon,
  Laptop,
  Palette,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatDate } from '../../../lib/utils';
import { useTheme, ThemeMode } from '@/lib/themeProvider';

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'org' | 'departments' | 'members' | 'audits' | 'appearance'>('org');
  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const { theme, setTheme } = useTheme();

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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage multi-tenant business profiles, department taxonomies, team roles, appearance, and audit compliance trails.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold overflow-x-auto">
        {[
          { key: 'org', label: 'Company Profile', icon: Building2 },
          { key: 'appearance', label: 'Appearance & Theme', icon: Palette },
          { key: 'departments', label: 'Departments', icon: Users },
          { key: 'members', label: 'Team & RBAC Roles', icon: Shield },
          { key: 'audits', label: 'Audit Logs', icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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

      {/* Tab: Appearance & Theme */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Appearance</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred interface theme. Preference is saved locally and synchronized across your sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { mode: 'light' as ThemeMode, label: 'Light Mode', desc: 'Crisp white canvas with high contrast', icon: Sun },
              { mode: 'dark' as ThemeMode, label: 'Dark Mode', desc: 'Deep graphite theme easy on the eyes', icon: Moon },
              { mode: 'system' as ThemeMode, label: 'System Default', desc: 'Automatically match OS color preferences', icon: Laptop },
            ].map((opt) => {
              const isSelected = theme === opt.mode;
              const Icon = opt.icon;

              return (
                <div
                  key={opt.mode}
                  onClick={() => setTheme(opt.mode)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Company Profile */}
      {activeTab === 'org' && (
        <form onSubmit={handleSaveOrg} className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax ID / GSTIN / PAN</label>
              <input
                type="text"
                value={orgForm.tax_id}
                onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Address</label>
              <input
                type="text"
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                value={orgForm.contact_email}
                onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={orgForm.contact_phone}
                onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingOrg}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingOrg ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-6 animate-fadeIn">
          <form onSubmit={handleCreateDept} className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Department</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                placeholder="Department Name (e.g. Sales, Marketing)"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Short Description"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Department</span>
              </button>
            </div>
          </form>

          {/* Department List */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.departments?.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{d.description || '—'}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {d.employees?.[0]?.count || 0} Staff
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Members & Roles */}
      {activeTab === 'members' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden animate-fadeIn">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">User Name</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">RBAC Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{u.full_name}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Audits */}
      {activeTab === 'audits' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden animate-fadeIn">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.auditLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{formatDate(log.created_at)}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.entity_type}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
