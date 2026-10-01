'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Sparkles, User, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { supabase } from '@/lib/supabaseClient';
import { UserRole, normalizeRole } from '@/types/auth';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
  const [userName, setUserName] = useState<string>('');
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('paydoc_active_role');
    const name = localStorage.getItem('paydoc_user_name');
    if (saved) setCurrentRole(normalizeRole(saved));
    if (name) setUserName(name);

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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Notification Dropdown Flyout */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Live Alerts</h4>
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.2 rounded-full">
                      2 new
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
                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">AWS Invoice INV-2026-081 Overdue</p>
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
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                {userName || (currentRole === 'ADMIN' ? 'Rajesh Sharma' : currentRole === 'HR' ? 'Ananya D.' : currentRole === 'ACCOUNTANT' ? 'Vikram Mehta' : 'Aarav Sharma')}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                {currentRole}
              </span>
            </div>
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs cursor-default"
              title={`Logged in as ${currentRole}`}
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
