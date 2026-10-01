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
  BadgeDollarSign,
  LogOut,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';

export function Sidebar() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  useEffect(() => {
    // Detect role from path or auth session
    if (pathname?.startsWith('/admin')) setCurrentRole('ADMIN');
    else if (pathname?.startsWith('/hr')) setCurrentRole('HR');
    else if (pathname?.startsWith('/accountant')) setCurrentRole('ACCOUNTANT');
    else if (pathname?.startsWith('/employee')) setCurrentRole('EMPLOYEE');
    else {
      // Default fallback
      const saved = localStorage.getItem('paydoc_active_role');
      if (saved) setCurrentRole(normalizeRole(saved));
    }
  }, [pathname]);

  // Role-specific Navigation matrix
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

  const handleRoleSwitch = (newRole: UserRole) => {
    setCurrentRole(newRole);
    localStorage.setItem('paydoc_active_role', newRole);
    window.location.href = ROLE_DEFINITIONS[newRole].defaultRoute;
  };

  const getRoleBadgeStyle = () => {
    switch (currentRole) {
      case 'ADMIN':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'HR':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'ACCOUNTANT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'EMPLOYEE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-800">
        <Link href={ROLE_DEFINITIONS[currentRole].defaultRoute} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">PAYDOC</span>
            <span className="font-bold text-base tracking-tight text-indigo-400"> AI</span>
          </div>
        </Link>

        {/* Current Active Role Badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle()}`}>
          {currentRole}
        </span>
      </div>

      {/* Role Switcher for Fast Multi-Role Testing */}
      <div className="px-3 pt-3 pb-1 border-b border-gray-800/60">
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5 px-1">
          <span>Active Role View:</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] as UserRole[]).map((r) => {
            const isSelected = currentRole === r;
            return (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                title={`Switch perspective to ${r}`}
                className={`py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {r === 'ACCOUNTANT' ? 'ACCT' : r === 'EMPLOYEE' ? 'EMP' : r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-gray-800">
        <div className="bg-gray-900/90 p-2.5 rounded-xl border border-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {currentRole.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Acme Technologies</p>
              <p className="text-[10px] text-indigo-300 truncate">{currentRole} Account</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut().catch(() => {});
              window.location.href = '/login';
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
