'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Sparkles, User, LogOut, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { supabase } from '@/lib/supabaseClient';
import { fetchApi } from '@/lib/apiClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Compute deterministic initial role matching the URL path on both server and client
  const roleFromPath = pathname?.startsWith('/admin')
    ? 'ADMIN'
    : pathname?.startsWith('/hr')
    ? 'HR'
    : pathname?.startsWith('/accountant')
    ? 'ACCOUNTANT'
    : (pathname === '/employee' || pathname?.startsWith('/employee/'))
    ? 'EMPLOYEE'
    : 'ADMIN';

  const [currentRole, setCurrentRole] = useState<UserRole>(roleFromPath);
  const [userName, setUserName] = useState<string>('');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('paydoc_active_role');
    const name = localStorage.getItem('paydoc_user_name');
    if (saved) {
      setCurrentRole(normalizeRole(saved));
    } else {
      setCurrentRole(roleFromPath);
    }
    if (name) setUserName(name);

    async function loadAlerts() {
      try {
        const usersRes = await fetchApi('/users').catch(() => null);
        if (usersRes?.users) {
          const pend = usersRes.users.filter((u: any) => u.status === 'pending' || u.is_active === false);
          setPendingRequests(pend);
        }
      } catch (err) {
        // ignore
      }
    }
    loadAlerts();

    // Keyboard shortcut for Command+K or Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const handleSwitchRole = (newRole: UserRole) => {
    localStorage.setItem('paydoc_active_role', newRole);
    setCurrentRole(newRole);
    const names: Record<UserRole, string> = {
      ADMIN: 'Rajesh Sharma',
      HR: 'Ananya Deshmukh',
      ACCOUNTANT: 'Vikram Mehta',
      EMPLOYEE: 'Aarav Sharma',
    };
    localStorage.setItem('paydoc_user_name', names[newRole]);
    setUserName(names[newRole]);
    window.location.href = ROLE_DEFINITIONS[newRole].defaultRoute;
  };

  return (
    <>
      <header className="h-16 glass-header sticky top-0 z-30 flex items-center justify-between px-6 transition-colors duration-200">
        {/* Global Search Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 w-64 md:w-96 px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-500 dark:text-slate-400 text-xs font-medium transition-all shadow-2xs group cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          <span className="flex-1 text-left truncate">Search employees, payroll, invoices...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-300 shadow-2xs">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-2.5">
          {/* AI Shortcut Button */}
          <Link
            href="/assistant"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 dark:from-indigo-950/50 dark:to-purple-950/50 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Ask Business AI</span>
          </Link>

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Notifications Center */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 relative transition-colors shadow-2xs cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingRequests.length > 0 ? (
                <span className="absolute top-1 right-1 px-1 min-w-[16px] h-4 text-[9px] font-bold rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {pendingRequests.length}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Notification Dropdown Flyout */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Live Alerts</h4>
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.2 rounded-full">
                      {2 + pendingRequests.length} new
                    </span>
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold hover:underline"
                  >
                    View All
                  </Link>
                </div>

                <div className="py-2.5 space-y-2 max-h-72 overflow-y-auto text-xs">
                  {pendingRequests.map((req) => (
                    <Link
                      key={req.id}
                      href="/admin/users"
                      onClick={() => setShowNotifications(false)}
                      className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex gap-2.5 hover:bg-amber-100/70 transition-colors cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">Access Request: {req.full_name}</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200 uppercase">{req.role}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[10px] mt-0.5">Click to approve or reject in User Controls.</p>
                      </div>
                    </Link>
                  ))}

                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">Tata Communications Invoice INV-2026-081 Overdue</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Amount ₹49,560 was due on 30 Sep 2026.</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 flex gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">September Payroll Ready</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">10 employee records calculated deterministically.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden sm:flex flex-col items-end text-right" suppressHydrationWarning>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" suppressHydrationWarning>
                {userName || (currentRole === 'ADMIN' ? 'Rajesh Sharma' : currentRole === 'HR' ? 'Ananya D.' : currentRole === 'ACCOUNTANT' ? 'Vikram Mehta' : 'Aarav Sharma')}
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={currentRole}
                  onChange={(e) => handleSwitchRole(e.target.value as UserRole)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-transparent border-0 cursor-pointer hover:underline text-right outline-hidden"
                  title="Switch Role"
                  suppressHydrationWarning
                >
                  <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ADMIN</option>
                  <option value="HR" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">HR</option>
                  <option value="ACCOUNTANT" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ACCOUNTANT</option>
                  <option value="EMPLOYEE" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">EMPLOYEE</option>
                </select>
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs cursor-default"
              title={`Logged in as ${currentRole}`}
              suppressHydrationWarning
            >
              {currentRole.substring(0, 2)}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut().catch(() => {});
                localStorage.removeItem('paydoc_active_role');
                localStorage.removeItem('paydoc_user_name');
                localStorage.removeItem('paydoc_user_email');
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Command-K Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
