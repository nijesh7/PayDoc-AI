'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';
import { ShieldAlert } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  useEffect(() => {
    let activeRole = normalizeRole(localStorage.getItem('paydoc_active_role') || 'ADMIN');

    // If on a dedicated role dashboard route, ensure active role is synced
    if (pathname?.startsWith('/admin')) {
      activeRole = 'ADMIN';
      localStorage.setItem('paydoc_active_role', 'ADMIN');
    } else if (pathname?.startsWith('/hr')) {
      activeRole = 'HR';
      localStorage.setItem('paydoc_active_role', 'HR');
    } else if (pathname?.startsWith('/accountant')) {
      activeRole = 'ACCOUNTANT';
      localStorage.setItem('paydoc_active_role', 'ACCOUNTANT');
    } else if (pathname?.startsWith('/employee')) {
      activeRole = 'EMPLOYEE';
      localStorage.setItem('paydoc_active_role', 'EMPLOYEE');
    }

    const roleDef = ROLE_DEFINITIONS[activeRole];
    if (!pathname) return;

    // Check if current route is unauthorized for this role
    let isUnauthorized = false;

    if (activeRole === 'EMPLOYEE') {
      const forbiddenForEmployee = ['/admin', '/hr', '/accountant', '/payroll', '/invoices', '/settings', '/employees'];
      if (forbiddenForEmployee.some((prefix) => pathname.startsWith(prefix))) {
        isUnauthorized = true;
      }
    } else if (activeRole === 'ACCOUNTANT') {
      const forbiddenForAccountant = ['/admin', '/hr', '/settings'];
      if (forbiddenForAccountant.some((prefix) => pathname.startsWith(prefix))) {
        isUnauthorized = true;
      }
    } else if (activeRole === 'HR') {
      const forbiddenForHR = ['/admin', '/accountant', '/settings'];
      if (forbiddenForHR.some((prefix) => pathname.startsWith(prefix))) {
        isUnauthorized = true;
      }
    }

    if (isUnauthorized) {
      setRoleNotice(`Access Restricted: Role '${activeRole}' does not have permission to access ${pathname}. Redirecting to your dashboard...`);
      const timer = setTimeout(() => {
        router.push(roleDef.defaultRoute);
        setRoleNotice(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {roleNotice && (
          <div className="bg-rose-50 dark:bg-rose-950/80 border-b border-rose-200 dark:border-rose-800/80 px-6 py-3 flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs animate-fadeIn">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold">{roleNotice}</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
