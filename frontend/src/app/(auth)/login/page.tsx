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
  ShieldCheck,
  Users,
  BadgeDollarSign,
  User,
  Zap,
  BarChart3,
  FileText,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const DEMO_PRESETS: Record<UserRole, { email: string; password: string; name: string; color: string }> = {
  ADMIN: { email: 'admin@acmetech.com', password: 'password123', name: 'Rajesh Sharma', color: 'from-indigo-500 to-violet-600' },
  HR: { email: 'ananya.d@acmetech.com', password: 'password123', name: 'Ananya Deshmukh', color: 'from-blue-500 to-cyan-600' },
  ACCOUNTANT: { email: 'vikram.mehta@acmetech.com', password: 'password123', name: 'Vikram Mehta', color: 'from-emerald-500 to-teal-600' },
  EMPLOYEE: { email: 'aarav.sharma@acmetech.com', password: 'password123', name: 'Aarav Sharma', color: 'from-purple-500 to-pink-600' },
};

const ROLE_CONFIG: Record<UserRole, { icon: React.ReactNode; accent: string; bg: string; border: string; ring: string; label: string; desc: string }> = {
  ADMIN: { icon: <ShieldCheck className="w-4 h-4" />, accent: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-700/60', ring: 'ring-indigo-500/40', label: 'Admin', desc: 'Full platform control' },
  HR: { icon: <Users className="w-4 h-4" />, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-700/60', ring: 'ring-blue-500/40', label: 'HR Manager', desc: 'People & payroll ops' },
  ACCOUNTANT: { icon: <BadgeDollarSign className="w-4 h-4" />, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-700/60', ring: 'ring-emerald-500/40', label: 'Accountant', desc: 'Finance & invoices' },
  EMPLOYEE: { icon: <User className="w-4 h-4" />, accent: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-200 dark:border-purple-700/60', ring: 'ring-purple-500/40', label: 'Employee', desc: 'Payslips & records' },
};

const HERO_FEATURES = [
  { icon: <Zap className="w-4 h-4" />, title: 'AI Document Intelligence', desc: 'Extract invoices, contracts & receipts in seconds', grad: 'from-violet-500/20' },
  { icon: <BarChart3 className="w-4 h-4" />, title: 'Deterministic Payroll Engine', desc: 'EPF, ESI, PT & TDS calculated with exact precision', grad: 'from-indigo-500/20' },
  { icon: <FileText className="w-4 h-4" />, title: 'Form 16 & EPFO ECR', desc: 'One-click official statutory compliance file generation', grad: 'from-blue-500/20' },
  { icon: <Building2 className="w-4 h-4" />, title: 'Multi-Tenant & Secure', desc: 'Row Level Security enforced on every data operation', grad: 'from-cyan-500/20' },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [email, setEmail] = useState('admin@acmetech.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setEmail(DEMO_PRESETS[role].email);
    setPassword(DEMO_PRESETS[role].password);
  };

  const doSignIn = async (emailVal: string, passwordVal: string, role: UserRole) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: emailVal, password: passwordVal });
    if (authError || !authData?.session?.access_token) {
      if (authError?.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials or register an account.');
      }
      throw new Error(authError?.message || 'Authentication failed.');
    }
    const token = authData.session.access_token;
    const response = await fetch('http://localhost:5000/api/auth/verify-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ selectedRole: role, token }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.error === 'Role Mismatch') throw new Error(result.message || `This account is registered as ${result.storedRole}. Select the ${result.storedRole} role.`);
      if (result.error === 'Account Pending Approval') throw new Error('Your account is awaiting administrator approval.');
      if (result.error === 'Account Disabled') throw new Error('Your account has been disabled. Contact your administrator.');
      throw new Error(result.error || result.message || 'Authentication verification failed.');
    }
    const verifiedRole = normalizeRole(result.user?.role || role);
    localStorage.setItem('paydoc_active_role', verifiedRole);
    localStorage.setItem('paydoc_user_email', emailVal);
    localStorage.setItem('paydoc_user_name', result.user?.full_name || emailVal);
    window.location.href = result.redirectUrl || ROLE_DEFINITIONS[verifiedRole].defaultRoute;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) { setErrorMessage('Please enter your email and password.'); return; }
    setLoading(true);
    try { await doSignIn(email.trim(), password, selectedRole); }
    catch (err: any) { setErrorMessage(err.message || 'Sign in failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setErrorMessage(null);
    setLoadingRole(role);
    const p = DEMO_PRESETS[role];
    try { await doSignIn(p.email, p.password, role); }
    catch (err: any) { setErrorMessage(err.message || 'Demo login failed. Check backend connection.'); }
    finally { setLoadingRole(null); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try { await supabase.auth.resetPasswordForEmail(forgotEmail); } finally { setForgotSent(true); }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#080C14] overflow-hidden">

      {/* Top-right: Theme Toggle */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle />
      </div>

      {/* â•â• LEFT HERO PANEL â•â• */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0E1325] via-[#111827] to-[#0B1120]">
        {/* Orbs */}
        <div className="absolute top-0 left-0 w-[480px] h-[480px] rounded-full bg-indigo-600/20 blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-violet-600/20 blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[220px] h-[220px] rounded-full bg-blue-500/10 blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 px-10 pt-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">PAYDOC <span className="text-indigo-400">AI</span></span>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[11px] font-semibold tracking-wider uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Enterprise-Grade MSME Platform
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Smarter Payroll.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                Effortless Compliance.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Deterministic salary calculations, AI-powered document extraction, Form 16 generation
              and EPFO ECR filing â€” all in one secure platform built for Indian MSMEs.
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-2.5">
            {HERO_FEATURES.map((f, i) => (
              <div key={i} className={`flex items-start gap-3.5 p-3.5 rounded-xl border border-white/[0.06] bg-gradient-to-r ${f.grad} to-transparent backdrop-blur-sm`}>
                <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-300">{f.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative z-10 px-10 pb-8">
          <div className="flex items-center gap-4 pt-6 border-t border-white/[0.07]">
            <div className="flex -space-x-2">
              {['R', 'A', 'V', 'P'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#111827] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">{l}</div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Trusted by <span className="text-white font-semibold">4+ roles</span> across Indian MSMEs</p>
          </div>
        </div>
      </div>

      {/* â•â• RIGHT FORM PANEL â•â• */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-12 overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">PAYDOC <span className="text-indigo-600 dark:text-indigo-400">AI</span></span>
        </div>

        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select your role and sign in to your workspace.</p>
          </div>

          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
                const cfg = ROLE_CONFIG[role];
                const isActive = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    disabled={loading || loadingRole !== null}
                    className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? `${cfg.bg} ${cfg.border} ring-2 ${cfg.ring} shadow-sm`
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className={`flex-shrink-0 transition-colors ${isActive ? cfg.accent : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                      {cfg.icon}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold transition-colors ${isActive ? cfg.accent : 'text-slate-700 dark:text-slate-300'}`}>{cfg.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{cfg.desc}</p>
                    </div>
                    {isActive && <CheckCircle2 className={`w-3.5 h-3.5 ml-auto flex-shrink-0 ${cfg.accent}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed flex-1">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto shrink-0 text-rose-400 hover:text-rose-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                <button type="button" onClick={() => setShowForgotModal(true)} className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || loadingRole !== null}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group mt-1"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                : <><span>Sign in as {ROLE_CONFIG[selectedRole].label}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>
          </form>

          {/* Instant Demo Login */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-1">âš¡ Instant Demo</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(DEMO_PRESETS) as UserRole[]).map((role) => {
                const preset = DEMO_PRESETS[role];
                const isThisLoading = loadingRole === role;
                const emoji = role === 'ADMIN' ? 'ðŸ›¡ï¸' : role === 'HR' ? 'ðŸ‘¥' : role === 'ACCOUNTANT' ? 'ðŸ’°' : 'ðŸ‘¤';
                const short = role === 'ACCOUNTANT' ? 'ACCT' : role;
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={loading || loadingRole !== null}
                    onClick={() => handleQuickDemoLogin(role)}
                    title={`Quick login as ${role} â€” ${preset.name}`}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl border border-white/10 shadow-sm text-[10px] font-bold tracking-wide text-white bg-gradient-to-b ${preset.color} hover:scale-[1.04] active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                  >
                    {isThisLoading
                      ? <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      : <span className="text-base">{emoji}</span>
                    }
                    <span>{short}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-600 mt-2">
              Real Supabase auth â€” instant one-click access for each persona
            </p>
          </div>

          {/* Register link */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New to PayDoc AI?{' '}
              <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                Create your workspace â†’
              </Link>
            </p>
          </div>

          <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-4">
            ðŸ”’ Secured by Supabase RLS & Express Role Authorization Middleware
          </p>
        </div>
      </div>

      {/* â•â• FORGOT PASSWORD MODAL â•â• */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => { setShowForgotModal(false); setForgotSent(false); setForgotEmail(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter your work email to receive reset instructions.</p>
            </div>
            {forgotSent ? (
              <div className="text-center py-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Reset link sent!</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Check your inbox for instructions.</p>
                <button onClick={() => setShowForgotModal(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
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

