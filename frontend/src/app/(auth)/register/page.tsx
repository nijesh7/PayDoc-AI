'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, ROLE_DEFINITIONS } from '@/types/auth';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>('ADMIN');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('Acme Technologies Pvt Ltd');
  const [organizationCode, setOrganizationCode] = useState('ACME-2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    isPending: boolean;
    role: UserRole;
    message: string;
  } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation
    if (!selectedRole) {
      setErrorMessage('Please select an account role.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    if (selectedRole === 'ADMIN' && !organizationName.trim()) {
      setErrorMessage('Please enter your organization name.');
      return;
    }

    if (selectedRole !== 'ADMIN' && !organizationCode.trim()) {
      setErrorMessage('Please enter your Organization Code (provided by your Admin).');
      return;
    }

    setLoading(true);

    try {
      // 2. Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: selectedRole,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        throw new Error('Failed to obtain user identity from Supabase Auth.');
      }

      // 3. Register user profile and organization in backend database
      const response = await fetch('http://localhost:5000/api/auth/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId,
          email: email.trim(),
          fullName: fullName.trim(),
          role: selectedRole,
          organizationName: selectedRole === 'ADMIN' ? organizationName.trim() : undefined,
          organizationCode: selectedRole !== 'ADMIN' ? organizationCode.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to initialize account profile.');
      }

      // 4. Handle Result based on Role
      if (selectedRole === 'ADMIN') {
        setSuccessInfo({
          isPending: false,
          role: selectedRole,
          message: 'Admin account and organization created successfully! You can now log in.',
        });
      } else {
        setSuccessInfo({
          isPending: true,
          role: selectedRole,
          message: `Registration submitted! As a ${selectedRole}, your account has been registered with organization '${result.organizationName || organizationCode}' and is currently pending Admin approval.`,
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0B0F19] relative overflow-hidden transition-colors duration-200">
      {/* Top right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            PAYDOC <span className="text-indigo-600 dark:text-indigo-400">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Create your multi-tenant account
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-gray-800/90 rounded-2xl shadow-xl dark:shadow-2xl p-6 sm:p-8">
          {successInfo ? (
            /* Success Feedback State */
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  successInfo.isPending
                    ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                    : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                }`}
              >
                {successInfo.isPending ? <ShieldCheck className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {successInfo.isPending ? 'Account Created — Pending Approval' : 'Workspace Created Successfully!'}
              </h2>

              <p className="text-xs text-slate-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                {successInfo.message}
              </p>

              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  <span>Return to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create your account</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Select the role you wish to register as.
                </p>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2.5">
                  Select Account Role <span className="text-indigo-600 dark:text-indigo-400">*</span>
                </label>
                <RoleSelector
                  selectedRole={selectedRole}
                  onRoleChange={(r) => {
                    setSelectedRole(r);
                    setErrorMessage(null);
                  }}
                  disabled={loading}
                />
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-800/60 text-rose-700 dark:text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Role-Aware Organization Field */}
                {selectedRole === 'ADMIN' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                      New Organization / Business Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                      Organization Code / ID <span className="text-indigo-600 dark:text-indigo-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={organizationCode}
                        onChange={(e) => setOrganizationCode(e.target.value)}
                        placeholder="e.g. ACME-2026"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                      Ask your company administrator for the organization code to join their workspace.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                    Full Legal Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ananya Deshmukh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                    Work Email Address <span className="text-indigo-600 dark:text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 flex items-center space-x-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Register as {selectedRole}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-gray-800/80 text-center">
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                  >
                    Login to Workspace
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
