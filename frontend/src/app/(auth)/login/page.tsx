'use client';

import React, { useState, useEffect } from 'react';
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
  KeyRound,
  Check,
  AlertTriangle,
  Info,
  Layers,
  Send,
  Keyboard,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { PayDocLogo } from '@/components/common/PayDocLogo';

const DEMO_PRESETS: Record<
  UserRole,
  { email: string; password: string; name: string; title: string; color: string }
> = {
  ADMIN: {
    email: 'admin@cognivex.com',
    password: 'password123',
    name: 'Rajesh Sharma',
    title: 'Founder & CEO',
    color: 'from-indigo-500 to-violet-600',
  },
  HR: {
    email: 'ananya.d@cognivex.com',
    password: 'password123',
    name: 'Ananya Deshmukh',
    title: 'HR Manager',
    color: 'from-blue-500 to-cyan-600',
  },
  ACCOUNTANT: {
    email: 'vikram.mehta@cognivex.com',
    password: 'password123',
    name: 'Vikram Mehta',
    title: 'Lead Accountant',
    color: 'from-emerald-500 to-teal-600',
  },
  EMPLOYEE: {
    email: 'aarav.sharma@cognivex.com',
    password: 'password123',
    name: 'Aarav Sharma',
    title: 'Senior Software Engineer',
    color: 'from-purple-500 to-pink-600',
  },
};

const ROLE_CONFIG: Record<
  UserRole,
  {
    icon: React.ReactNode;
    accent: string;
    bg: string;
    border: string;
    ring: string;
    label: string;
    desc: string;
    permissions: string[];
  }
> = {
  ADMIN: {
    icon: <ShieldCheck className="w-4 h-4" />,
    accent: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    border: 'border-indigo-200 dark:border-indigo-700/60',
    ring: 'ring-indigo-500/40',
    label: 'Admin',
    desc: 'Executive & owner',
    permissions: ['Full multi-tenant org control', 'Approve payroll runs', 'Manage team & roles', 'AI OCR & invoice processing'],
  },
  HR: {
    icon: <Users className="w-4 h-4" />,
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-700/60',
    ring: 'ring-blue-500/40',
    label: 'HR Manager',
    desc: 'People & operations',
    permissions: ['Employee directory & onboarding', 'Attendance & leave records', 'Draft & prepare payroll', 'Employee contracts & files'],
  },
  ACCOUNTANT: {
    icon: <BadgeDollarSign className="w-4 h-4" />,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-700/60',
    ring: 'ring-emerald-500/40',
    label: 'Accountant',
    desc: 'Finance & compliance',
    permissions: ['Vendor invoices & receipts', 'Record disbursements', 'Form 16 & EPFO/ESI filings', 'Financial analytics & audit'],
  },
  EMPLOYEE: {
    icon: <User className="w-4 h-4" />,
    accent: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-200 dark:border-purple-700/60',
    ring: 'ring-purple-500/40',
    label: 'Employee',
    desc: 'Self-service portal',
    permissions: ['Download official PDF payslips', 'View personal salary breakdowns', 'Upload tax declaration proofs', 'Personal profile & documents'],
  },
};

const SHOWCASE_TABS = [
  {
    id: 'payroll',
    title: 'Deterministic Payroll',
    icon: <BarChart3 className="w-4 h-4" />,
    tagline: 'Zero Calculation Drift',
    stat: '₹48.2L+',
    statLabel: 'Processed Error-Free',
    desc: 'Formulas run deterministically on Express backend with numeric(12,2) precision. EPF, ESI, Professional Tax & TDS calculated instantly.',
    badge: '100% Indian Compliance',
  },
  {
    id: 'ai-ocr',
    title: 'AI Document OCR',
    icon: <Zap className="w-4 h-4" />,
    tagline: 'Google Gemini & Vision API',
    stat: '1.4s',
    statLabel: 'Avg Extraction Time',
    desc: 'Auto-extract line items, vendor GSTIN, invoice dates, and grand totals from PDFs and scans with editable fallback validation.',
    badge: 'Multi-Model Fallback',
  },
  {
    id: 'compliance',
    title: 'Form 16 & EPFO ECR',
    icon: <FileText className="w-4 h-4" />,
    tagline: 'Statutory Reports',
    stat: '1-Click',
    statLabel: 'ECR Text Generation',
    desc: 'Direct export of Ministry-formatted EPFO Electronic Challan Return (ECR) text files and employee Form 16 Part B PDFs.',
    badge: 'Ministry-Ready Files',
  },
  {
    id: 'security',
    title: 'Multi-Tenant RLS',
    icon: <Building2 className="w-4 h-4" />,
    tagline: 'Bank-Grade Isolation',
    stat: '100%',
    statLabel: 'Row-Level Scoped',
    desc: 'Every organization record is shielded by PostgreSQL Row Level Security (RLS) policies. Employee data is strictly confidential.',
    badge: 'Supabase Protected',
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('admin@cognivex.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showScopeCard, setShowScopeCard] = useState(true);

  // Initialize saved email preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('paydoc_remembered_email');
      const savedRemember = localStorage.getItem('paydoc_remember_me');
      if (savedRemember !== null) {
        setRememberMe(savedRemember === 'true');
      }
      if (savedEmail && savedRemember === 'true') {
        setEmail(savedEmail);
      }
    }
  }, []);

  // Keyboard shortcut listener for power users: Alt+1 = Admin, Alt+2 = HR, Alt+3 = Accountant, Alt+4 = Employee
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleRoleSelect('ADMIN');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRoleSelect('HR');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRoleSelect('ACCOUNTANT');
        } else if (e.key === '4') {
          e.preventDefault();
          handleRoleSelect('EMPLOYEE');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setOtpSentMessage(null);
    setEmail(DEMO_PRESETS[role].email);
    setPassword(DEMO_PRESETS[role].password);
  };

  const doSignIn = async (emailVal: string, passwordVal: string, role: UserRole) => {
    if (rememberMe) {
      localStorage.setItem('paydoc_remembered_email', emailVal);
      localStorage.setItem('paydoc_remember_me', 'true');
    } else {
      localStorage.removeItem('paydoc_remembered_email');
      localStorage.setItem('paydoc_remember_me', 'false');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    });

    if (authError || !authData?.session?.access_token) {
      if (authError?.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials or click a demo account below.');
      }
      throw new Error(authError?.message || 'Authentication failed. Please verify your credentials.');
    }

    const token = authData.session.access_token;
    const response = await fetch('http://localhost:5000/api/auth/verify-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ selectedRole: role, token }),
    });

    const result = await response.json();
    if (!response.ok) {
      if (result.error === 'Role Mismatch') {
        throw new Error(
          result.message || `This account is registered as ${result.storedRole}. Select the ${result.storedRole} role.`
        );
      }
      if (result.error === 'Account Pending Approval') {
        throw new Error('Your account is awaiting administrator approval.');
      }
      if (result.error === 'Account Disabled') {
        throw new Error('Your account has been disabled. Contact your administrator.');
      }
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
    setOtpSentMessage(null);

    if (authMode === 'otp') {
      if (!email.trim()) {
        setErrorMessage('Please enter your work email to receive a sign-in link.');
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
          },
        });
        if (error) throw error;
        setOtpSentMessage(`A secure magic sign-in link has been sent to ${email.trim()}. Please check your inbox.`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to send OTP link.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await doSignIn(email.trim(), password, selectedRole);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please check your credentials or backend server status.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setErrorMessage(null);
    setOtpSentMessage(null);
    setLoadingRole(role);
    setSelectedRole(role);
    const p = DEMO_PRESETS[role];
    try {
      await doSignIn(p.email, p.password, role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed. Make sure backend is running on port 5000.');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail);
    } finally {
      setForgotSent(true);
    }
  };

  const currentRoleCfg = ROLE_CONFIG[selectedRole];
  const currentDemo = DEMO_PRESETS[selectedRole];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#080C14] overflow-hidden">
      {/* Top-right: Theme Toggle & Quick Help */}
      <div className="absolute top-5 right-5 z-30 flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-medium backdrop-blur-sm border border-slate-300/40 dark:border-slate-700/50">
          <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
          <span>Alt + 1..4 switches role</span>
        </div>
        <ThemeToggle />
      </div>

      {/* ── LEFT HERO PANEL (ALWAYS DARK WITH RADIANT GLOW) ── */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0E1528] to-[#0A0D16] p-10 border-r border-indigo-950/40">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[130px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-violet-600/20 blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[90px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Crisp Geometric Grid Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top Header with PayDoc Logo */}
        <div className="relative z-10">
          {/* Luminous PayDoc Logo Container */}
          <div className="mb-10 inline-block">
            <div className="relative p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-xl shadow-indigo-950/50 backdrop-blur-md flex items-center gap-3">
              <PayDocLogo size="lg" showText={true} variant="dark" showBadge={true} />
            </div>
          </div>

          {/* Main Headline */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 absolute" />
              <span>Enterprise MSME Payroll & Document Intelligence</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Deterministic Accuracy.<br />
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
                Autonomous Compliance.
              </span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
              Empowering Indian MSMEs with mathematical salary precision, AI document parsing,
              statutory Form 16 / EPFO ECR generation, and strict Row Level Security.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SHOWCASE_TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap ${
                    activeTab === idx
                      ? 'bg-indigo-600/30 border-indigo-400/50 text-white shadow-md shadow-indigo-900/40'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.title}</span>
                </button>
              ))}
            </div>

            {/* Active Feature Spotlight Card */}
            {(() => {
              const current = SHOWCASE_TABS[activeTab];
              return (
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 backdrop-blur-md shadow-xl relative overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        {current.tagline}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">{current.title}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {current.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">{current.desc}</p>
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-white tracking-tight">{current.stat}</p>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">{current.statLabel}</p>
                    </div>
                    <span className="text-[11px] font-medium text-indigo-300 flex items-center gap-1">
                      Production Ready <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Live Metrics & Compliance Bar */}
        <div className="relative z-10 pt-6 border-t border-white/10">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <p className="text-base font-black text-indigo-300">₹42.8 Lakhs+</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Disbursed This Fiscal</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <p className="text-base font-black text-cyan-300">1,240+</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Invoices Extracted</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <p className="text-base font-black text-emerald-300">0 Drift</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">100% Deterministic</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Supabase Row Level Security Active</span>
            </span>
            <span className="text-slate-500">v2.4 Enterprise Edition</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Prominent PayDoc AI Header (ALWAYS VISIBLE ON ALL SCREENS) */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <PayDocLogo size="md" showText={true} showBadge={true} />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sign in to your Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Organization:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                Cognivex Technologies Pvt Ltd
              </span>
            </p>
          </div>

          {/* Role Selector Grid */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Select Your Role Persona
              </label>
              <button
                type="button"
                onClick={() => setShowScopeCard(!showScopeCard)}
                className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                {showScopeCard ? 'Hide permissions' : 'Show permissions'}
              </button>
            </div>
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
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? `${cfg.bg} ${cfg.border} ring-2 ${cfg.ring} shadow-sm`
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 transition-colors ${
                        isActive
                          ? cfg.accent
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                      }`}
                    >
                      {cfg.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs font-bold transition-colors ${
                            isActive ? cfg.accent : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {cfg.label}
                        </p>
                        {isActive && <Check className={`w-3.5 h-3.5 ${cfg.accent}`} />}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{cfg.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Role Scope & Capability Card */}
          {showScopeCard && (
            <div className="mb-4 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedRole === 'ADMIN' ? 'bg-indigo-500' : selectedRole === 'HR' ? 'bg-blue-500' : selectedRole === 'ACCOUNTANT' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                  {currentRoleCfg.label} Scope ({currentDemo.name})
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(selectedRole)}
                  disabled={loading || loadingRole !== null}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1 hover:underline disabled:opacity-50"
                >
                  ⚡ Instant 1-Click Login
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {currentRoleCfg.permissions.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Login Mode Switcher (Password vs Magic Link) */}
          <div className="flex p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setErrorMessage(null);
                setOtpSentMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('otp');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'otp'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Magic Link / OTP</span>
            </button>
          </div>

          {/* Success OTP Banner */}
          {otpSentMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span className="leading-relaxed flex-1">{otpSentMessage}</span>
              <button
                onClick={() => setOtpSentMessage(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <span className="leading-relaxed">{errorMessage}</span>
                <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-1">
                  Tip: Use the instant demo persona buttons below to sign in automatically.
                </p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            {authMode === 'password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                  >
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
                    onKeyDown={(e) => {
                      if (e.getModifierState) setCapsLockActive(e.getModifierState('CapsLock'));
                    }}
                    onKeyUp={(e) => {
                      if (e.getModifierState) setCapsLockActive(e.getModifierState('CapsLock'));
                    }}
                    placeholder="••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time Caps Lock Warning Indicator */}
                {capsLockActive && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-medium animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warning: Caps Lock is turned ON</span>
                  </div>
                )}
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Remember credentials on this browser</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">AES-256</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingRole !== null}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : authMode === 'otp' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Magic Link to {email || 'Email'}</span>
                </>
              ) : (
                <>
                  <span>Sign in as {ROLE_CONFIG[selectedRole].label}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Instant 1-Click Demo Login Grid */}
          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ⚡ Instant One-Click Demo Access
              </span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">
                No typing required
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(DEMO_PRESETS) as UserRole[]).map((role) => {
                const preset = DEMO_PRESETS[role];
                const isThisLoading = loadingRole === role;
                const emoji = role === 'ADMIN' ? '🛡️' : role === 'HR' ? '👥' : role === 'ACCOUNTANT' ? '💰' : '👤';
                const short = role === 'ACCOUNTANT' ? 'ACCT' : role;
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={loading || loadingRole !== null}
                    onClick={() => handleQuickDemoLogin(role)}
                    title={`Instant login as ${role} (${preset.name} - ${preset.title})`}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl border border-white/10 shadow-sm text-[10px] font-bold tracking-wide text-white bg-gradient-to-b ${preset.color} hover:scale-[1.04] active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                  >
                    {isThisLoading ? (
                      <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="text-base">{emoji}</span>
                    )}
                    <span>{short}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
              Pre-configured test accounts for Indian MSME role verification
            </p>
          </div>

          {/* Create Workspace Register Link */}
          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New to PayDoc AI?{' '}
              <Link
                href="/register"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
              >
                Create your company workspace →
              </Link>
            </p>
          </div>

          {/* Compliance & Security Guarantee Footer */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit TLS</span>
            <span>•</span>
            <span>Deterministic Engine</span>
            <span>•</span>
            <span>PostgreSQL RLS</span>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSent(false);
                setForgotEmail('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your registered work email to receive password reset instructions.
              </p>
            </div>
            {forgotSent ? (
              <div className="text-center py-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Reset Link Dispatched!</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Please check your inbox (and spam folder) for instructions to reset your password.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  Return to Sign In
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
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
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
