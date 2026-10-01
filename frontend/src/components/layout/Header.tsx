'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, Sparkles, User, LogOut, Check } from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { supabase } from '../../lib/supabaseClient';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
        {/* Global Search Trigger (Command-K) */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 w-72 md:w-96 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 text-sm transition-all"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-left">Search employees, payroll, invoices...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500">
            ⌘K
          </kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* AI Shortcut Button */}
          <Link
            href="/assistant"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/60 dark:from-indigo-950/40 dark:to-purple-950/40 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Ask Business AI</span>
          </Link>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">Recent Notifications</h4>
                  <Link href="/notifications" className="text-indigo-600 text-[11px] font-medium hover:underline">
                    View All
                  </Link>
                </div>
                <div className="py-2 space-y-2 max-h-64 overflow-y-auto text-xs">
                  <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">AWS Invoice INV-2026-081 Overdue</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Amount ₹49,560 was due on 30 Sep 2026.</p>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">September Payroll Ready for Review</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">10 employee records calculated.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs" title="Admin User">
              AD
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut().catch(() => {});
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
