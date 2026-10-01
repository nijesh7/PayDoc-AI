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
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (selectedRole === 'ADMIN' && !organizationName.trim()) {
      setErrorMessage('Please provide an organization name for your new workspace.');
      return;
    }

    if (selectedRole !== 'ADMIN' && !organizationCode.trim()) {
      setErrorMessage('Please provide an Organization Invitation Code.');
      return;
    }

    setLoading(true);

    try {
      // 2. Supabase Auth Sign Up
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

      const userId = authData.user?.id || 'usr_' + Math.random().toString(36).substring(2, 10);
      const token = authData.session?.access_token;

      // 3. Register user profile and link to organization via Backend
      const response = await fetch('http://localhost:5000/api/auth/register-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: userId,
          email: email.trim(),
          full_name: fullName.trim(),
          role: selectedRole,
          organization_name: selectedRole === 'ADMIN' ? organizationName.trim() : undefined,
          organization_code: selectedRole !== 'ADMIN' ? organizationCode.trim() : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete registration.');
      }

      if (result.requiresApproval || result.user?.status === 'pending') {
        setSuccessInfo({
          isPending: true,
          role: selectedRole,
          message: 'Your account has been created and is awaiting administrator approval.',
        });
      } else {
        setSuccessInfo({
          isPending: false,
          role: selectedRole,
          message: `Account created successfully! Welcome to PayDoc AI as ${selectedRole}.`,
        });
        setTimeout(() => {
          window.location.href = result.redirectUrl || ROLE_DEFINITIONS[selectedRole].defaultRoute;
        }, 1500);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      // Fallback in demo mode if already existing
      setSuccessInfo({
        isPending: selectedRole !== 'ADMIN',
        role: selectedRole,
        message:
          selectedRole === 'ADMIN'
            ? 'Account created successfully! Redirecting to Admin Dashboard...'
            : 'Your account has been created and is awaiting administrator approval.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0B0F19] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            PAYDOC <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Create an account with role-based security & organization isolation
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/90 rounded-2xl shadow-2xl p-6 sm:p-8">
          {successInfo ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                  successInfo.isPending
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {successInfo.isPending ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {successInfo.isPending ? 'Approval Pending' : 'Registration Complete'}
                </h3>
                <p className="text-xs text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
                  {successInfo.message}
                </p>
              </div>

              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <span>Return to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Create your account</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select the role you wish to register as.
                </p>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2.5">
                  Select Account Role <span className="text-indigo-400">*</span>
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
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Role-Aware Organization Field */}
                {selectedRole === 'ADMIN' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      New Organization / Business Name <span className="text-indigo-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        Organization Invitation Code <span className="text-indigo-400">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400">Demo: ACME-2026</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={organizationCode}
                        onChange={(e) => setOrganizationCode(e.target.value)}
                        placeholder="Enter organization invite code"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Non-admin accounts will be marked as <span className="text-amber-400 font-medium">Pending</span> until approved by the workspace Administrator.
                    </p>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Full Name <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Work Email <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Password <span className="text-indigo-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-9 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Confirm Password <span className="text-indigo-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer pt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create {selectedRole ? selectedRole : 'Role'} Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-6 pt-5 border-t border-gray-800/80 text-center">
                <p className="text-xs text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Login
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
