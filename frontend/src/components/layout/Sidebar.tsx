'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Receipt,
  FileSpreadsheet,
  Bot,
  Bell,
  Settings,
  Sparkles,
  UserCheck,
  User,
  Shield,
  LogOut,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';

export function Sidebar() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paydoc_active_role');
      if (saved) return normalizeRole(saved);
      const path = window.location.pathname;
      if (path.startsWith('/admin')) return 'ADMIN';
      if (path.startsWith('/hr')) return 'HR';
      if (path.startsWith('/accountant')) return 'ACCOUNTANT';
      if (path.startsWith('/employee')) return 'EMPLOYEE';
    }
    return 'ADMIN';
  });
  const [userName, setUserName] = useState<string>('Account User');

  useEffect(() => {
    const saved = localStorage.getItem('paydoc_active_role');
    const savedName = localStorage.getItem('paydoc_user_name');

    if (pathname?.startsWith('/admin')) {
      setCurrentRole('ADMIN');
      localStorage.setItem('paydoc_active_role', 'ADMIN');
    } else if (pathname?.startsWith('/hr')) {
      setCurrentRole('HR');
      localStorage.setItem('paydoc_active_role', 'HR');
    } else if (pathname?.startsWith('/accountant')) {
      setCurrentRole('ACCOUNTANT');
      localStorage.setItem('paydoc_active_role', 'ACCOUNTANT');
    } else if (pathname?.startsWith('/employee')) {
      setCurrentRole('EMPLOYEE');
      localStorage.setItem('paydoc_active_role', 'EMPLOYEE');
    } else if (saved) {
      setCurrentRole(normalizeRole(saved));
    }

    if (savedName) {
      setUserName(savedName);
    } else {
      const defaultNames: Record<UserRole, string> = {
        ADMIN: 'Rajesh Sharma (Admin)',
        HR: 'Ananya Deshmukh (HR)',
        ACCOUNTANT: 'Vikram Mehta (Accountant)',
        EMPLOYEE: 'Aarav Sharma (Employee)',
      };
      setUserName(defaultNames[normalizeRole(saved)] || 'Organization User');
    }
  }, [pathname]);

  const getNavItems = () => {
    switch (currentRole) {
      case 'EMPLOYEE':
        return [
          { label: 'Employee Portal', href: '/employee/dashboard', icon: LayoutDashboard },
          { label: 'My Documents', href: '/documents', icon: FileText, badge: 'AI' },
          { label: 'My Profile', href: '/profile', icon: User },
        ];

      case 'ACCOUNTANT':
        return [
          { label: 'Finance Dashboard', href: '/accountant/dashboard', icon: LayoutDashboard },
          { label: 'Invoices', href: '/invoices', icon: Receipt },
          { label: 'Payments Ledger', href: '/payments', icon: CreditCard },
          { label: 'Documents & Bills', href: '/documents', icon: FileText, badge: 'AI' },
          { label: 'AI Assistant', href: '/assistant', icon: Bot, isSpecial: true },
          { label: 'Reports', href: '/reports', icon: Sparkles },
          { label: 'My Profile', href: '/profile', icon: User },
        ];

      case 'HR':
        return [
          { label: 'HR Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
          { label: 'Staff Directory', href: '/employees', icon: Users },
          { label: 'Payroll Preparation', href: '/payroll', icon: FileSpreadsheet },
          { label: 'Payments Overview', href: '/payments', icon: CreditCard },
          { label: 'HR Documents', href: '/documents', icon: FileText, badge: 'AI' },
          { label: 'AI Assistant', href: '/assistant', icon: Bot, isSpecial: true },
          { label: 'Reports', href: '/reports', icon: Sparkles },
          { label: 'My Profile', href: '/profile', icon: User },
        ];

      case 'ADMIN':
      default:
        return [
          { label: 'Executive Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Users & Roles', href: '/admin/users', icon: UserCheck, badge: 'RBAC' },
          { label: 'Employees', href: '/employees', icon: Users },
          { label: 'Payroll & Payslips', href: '/payroll', icon: FileSpreadsheet },
          { label: 'Payments Ledger', href: '/payments', icon: CreditCard },
          { label: 'Documents & AI', href: '/documents', icon: FileText, badge: 'AI' },
          { label: 'Invoices', href: '/invoices', icon: Receipt },
          { label: 'AI Assistant', href: '/assistant', icon: Bot, isSpecial: true },
          { label: 'Reports & Analytics', href: '/reports', icon: Sparkles },
          { label: 'Notifications', href: '/notifications', icon: Bell },
          { label: 'Organization Settings', href: '/settings', icon: Settings },
          { label: 'My Profile', href: '/profile', icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleBadgeStyle = () => {
    switch (currentRole) {
      case 'ADMIN':
        return 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40';
      case 'HR':
        return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40';
      case 'ACCOUNTANT':
        return 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40';
      case 'EMPLOYEE':
        return 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/40';
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#0D121F] border-r border-slate-200 dark:border-slate-800/90 flex flex-col h-screen sticky top-0 transition-colors duration-200 select-none z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/90">
        <Link href={ROLE_DEFINITIONS[currentRole].defaultRoute} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">PAYDOC</span>
            <span className="font-bold text-base tracking-tight text-indigo-600 dark:text-indigo-400"> AI</span>
          </div>
        </Link>

        {/* Active Role Badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle()}`}>
          {currentRole}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Session & Organization Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
              {userName.charAt(0) || currentRole.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate">{currentRole} • Acme Tech</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut().catch(() => {});
              window.location.href = '/login';
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
