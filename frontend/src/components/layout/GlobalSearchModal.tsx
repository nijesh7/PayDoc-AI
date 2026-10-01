'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Users, Receipt, CreditCard, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees, payroll, invoices, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full px-3 py-4 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mr-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Searching business records...</span>
            </div>
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
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/60 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{res.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">
              No business records found matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="py-6 px-4 text-xs text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Quick Filters:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {['EMP', 'INV', 'HDFC', 'Contract', 'Engineering'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-[11px] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Navigate with ⌘K</span>
          <span className="flex items-center gap-1">
            <span>ESC to close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
