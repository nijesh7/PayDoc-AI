'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, AlertTriangle, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatDate } from '../../../lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifRes, remRes] = await Promise.all([
        fetchApi('/notifications'),
        fetchApi('/reminders'),
      ]);
      setNotifications(notifRes.notifications || []);
      setReminders(remRes.reminders || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notification Center & Smart Reminders</h1>
        <p className="text-sm text-slate-500 mt-0.5">Automated deadline tracking, salary due alerts, and document expiration warnings.</p>
      </div>

      {/* Active Deadlines / Reminders */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Operational Deadlines</h3>
        </div>

        <div className="space-y-2">
          {reminders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No upcoming deadlines or reminders.</p>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{r.title}</p>
                    <p className="text-[11px] text-slate-500">Target Due Date: {formatDate(r.due_date)}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 uppercase">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notification Stream */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent In-App Notifications</h3>
          <span className="text-xs text-slate-400">{notifications.length} alerts</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`py-3.5 flex items-start justify-between gap-3 ${
                  n.is_read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
