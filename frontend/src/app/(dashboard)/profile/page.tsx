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
          <h1 className="text-xl font-bold text-white">My Account Profile</h1>
          <p className="text-xs text-gray-400 mt-1">
            View your verified credentials, assigned role permissions, and organization details.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-gray-800 hover:bg-red-950/50 hover:text-red-400 text-gray-300 text-xs font-semibold rounded-xl border border-gray-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Profile details updated successfully!</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/20 mb-4">
            {fullName.charAt(0)}
          </div>
          <h2 className="text-base font-bold text-white">{fullName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{email}</p>

          <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col items-center space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/60 border border-indigo-800 text-indigo-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Role: {role}</span>
            </span>

            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Account Status: Active</span>
            </span>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 text-left text-xs space-y-2 text-gray-400">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300">{orgName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <span>Org Code: <strong className="text-white">{orgCode}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Member Since: April 2025</span>
            </div>
          </div>
        </div>

        {/* Right Editable Form */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Personal & Contact Details</h3>
          <p className="text-xs text-gray-400 mb-6">
            Your role is assigned by workspace administrators and cannot be self-modified.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Work Email Address (Read-Only)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950/40 border border-gray-800 rounded-xl text-gray-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Assigned Role (Managed by Administrator)
              </label>
              <div className="p-3 bg-gray-950/40 border border-gray-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white">{role}</span>
                </div>
                <span className="text-[11px] text-gray-400">Strictly Enforced by Backend RBAC</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
