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
    // Get stored role
    const activeRole = normalizeRole(localStorage.getItem('paydoc_active_role') || 'ADMIN');
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
      setRoleNotice(`Access Denied: Role '${activeRole}' does not have permission to access ${pathname}. Redirecting to your dashboard...`);
      const timer = setTimeout(() => {
        router.push(roleDef.defaultRoute);
        setRoleNotice(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F19] text-gray-100">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {roleNotice && (
          <div className="bg-red-950/80 border-b border-red-800/80 px-6 py-3 flex items-center space-x-3 text-red-300 text-xs animate-fadeIn">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{roleNotice}</span>
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
