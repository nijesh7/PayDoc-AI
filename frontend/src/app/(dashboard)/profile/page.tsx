'use client';

import React, { useState } from 'react';
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  LogOut,
  Save,
  KeyRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('Rajesh Sharma');
  const [email] = useState('admin@acmetech.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [role] = useState('ADMIN');
  const [orgName] = useState('Acme Technologies Pvt Ltd');
  const [orgCode] = useState('ACME-2026');
  const [status] = useState('active');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Account Profile</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            View your verified credentials, assigned role permissions, and organization details.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-red-950/50 text-slate-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-red-400 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Profile details updated successfully!</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 text-center shadow-xs">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/20 mb-4">
            {fullName.charAt(0)}
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{fullName}</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{email}</p>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Role: {role}</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Account Status: Active</span>
            </span>
          </div>
        </div>

        {/* Right Details & Edit Form */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Organization & Account Details</h3>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Work Email (Immutable Auth UID)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                </div>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Organization</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={orgName}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Organization Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={orgCode}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-gray-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
