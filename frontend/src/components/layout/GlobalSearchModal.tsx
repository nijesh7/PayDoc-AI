'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Users, Receipt, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../lib/apiClient';

interface SearchResult {
  type: 'employee' | 'invoice' | 'payment' | 'document';
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees, payroll, invoices, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full px-3 py-4 text-sm bg-transparent outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">Searching business records...</div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((res) => {
                const Icon =
                  res.type === 'employee' ? Users :
                  res.type === 'invoice' ? Receipt :
                  res.type === 'payment' ? CreditCard : FileText;

                return (
                  <Link
                    key={`${res.type}-${res.id}`}
                    href={res.link}
                    onClick={onClose}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{res.title}</p>
                        <p className="text-[11px] text-slate-500">{res.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">No records found matching "{query}".</div>
          )}

          {!loading && !query.trim() && (
            <div className="py-6 px-4 text-xs text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Quick Searches:</span>
              <div className="flex gap-2 mt-2">
                {['EMP', 'INV', 'HDFC', 'Contract'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
