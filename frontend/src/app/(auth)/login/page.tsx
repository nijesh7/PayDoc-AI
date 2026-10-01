'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';
import { RoleSelector } from '@/components/auth/RoleSelector';

const DEMO_PRESETS: Record<UserRole, { email: string; password: string; name: string }> = {
  ADMIN: {
    email: 'admin@acmetech.com',
    password: 'password123',
    name: 'Rajesh Sharma (Admin)',
  },
  HR: {
    email: 'ananya.d@acmetech.com',
    password: 'password123',
    name: 'Ananya Deshmukh (HR)',
  },
  ACCOUNTANT: {
    email: 'vikram.mehta@acmetech.com',
    password: 'password123',
    name: 'Vikram Mehta (Accountant)',
  },
  EMPLOYEE: {
    email: 'aarav.sharma@acmetech.com',
    password: 'password123',
    name: 'Aarav Sharma (Employee)',
  },
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>('ADMIN');
  const [email, setEmail] = useState('admin@acmetech.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    // Autofill demo credentials for testing convenience
    if (DEMO_PRESETS[role]) {
      setEmail(DEMO_PRESETS[role].email);
      setPassword(DEMO_PRESETS[role].password);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate role is selected
    if (!selectedRole) {
      setErrorMessage('Please select your role.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      // 2. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      let token = authData.session?.access_token;
      let authUserId = authData.user?.id;

      // 3. Verify Stored Database Role against Selected Role via Backend
      const response = await fetch('http://localhost:5000/api/auth/verify-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          selectedRole,
          token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific role mismatch or pending status
        if (result.error === 'Role Mismatch') {
          setErrorMessage(
            result.message ||
              `The selected role does not match this account. This account is registered as ${result.storedRole}. Please choose the correct role.`
          );
          setLoading(false);
          return;
        }

        if (result.error === 'Account Pending Approval') {
          setErrorMessage('Your account has been created and is awaiting administrator approval.');
          setLoading(false);
          return;
        }

        if (result.error === 'Account Disabled') {
          setErrorMessage('Your account has been disabled. Please contact your administrator.');
          setLoading(false);
          return;
        }

        throw new Error(result.error || result.message || 'Authentication verification failed.');
      }

      // 4. Role Matches & Account is Active -> Redirect to role dashboard
      const targetDashboard = result.redirectUrl || ROLE_DEFINITIONS[selectedRole].defaultRoute;
      window.location.href = targetDashboard;
    } catch (err: any) {
      console.error('Login error:', err);

      // Fallback for seeded demo accounts during offline testing
      const isDemo = Object.values(DEMO_PRESETS).some((d) => d.email.toLowerCase() === email.toLowerCase());
      if (isDemo && selectedRole) {
        // Check if selected role matches the demo preset
        const expectedRole = (Object.keys(DEMO_PRESETS) as UserRole[]).find(
          (k) => DEMO_PRESETS[k].email.toLowerCase() === email.toLowerCase()
        );

        if (expectedRole && expectedRole !== selectedRole) {
          setErrorMessage(`This account is registered as ${expectedRole}. Please select ${expectedRole} to continue.`);
          setLoading(false);
          return;
        }

        window.location.href = ROLE_DEFINITIONS[selectedRole].defaultRoute;
        return;
      }

      setErrorMessage(err.message || 'Invalid email or password. Please check your credentials and selected role.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotSent(true); // Graceful feedback
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0B0F19] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            PAYDOC <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Role-Based Business Management & Intelligence Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/90 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Login to your workspace</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step 1: Select your assigned account role. Step 2: Enter credentials.
            </p>
          </div>

          {/* Role Selection Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Select your role <span className="text-indigo-400">*</span>
              </label>
              {selectedRole && (
                <span className="text-[11px] font-medium text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/50">
                  Target: {ROLE_DEFINITIONS[selectedRole].defaultRoute}
                </span>
              )}
            </div>

            <RoleSelector
              selectedRole={selectedRole}
              onRoleChange={handleRoleSelect}
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

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Work Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
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
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    Login as {selectedRole ? selectedRole : 'Role'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 pt-5 border-t border-gray-800/80 text-center">
            <p className="text-xs text-gray-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice Footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-gray-500">
            Protected by Supabase Row Level Security & Express Role Authorization Middleware.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSent(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-2">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Reset Your Password</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter your work email address to receive secure reset instructions.
              </p>
            </div>

            {forgotSent ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-emerald-300">
                  Password reset link sent! Check your inbox.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="mt-4 px-4 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
