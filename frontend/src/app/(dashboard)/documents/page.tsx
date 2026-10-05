'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Search,
  Sparkles,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  FileCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatDate, getStatusBadge } from '../../../lib/utils';

const CATEGORIES = [
  { key: 'all', label: 'All Documents' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'contract', label: 'Contracts & Leases' },
  { key: 'payslip', label: 'Payslips' },
  { key: 'certificate', label: 'Certificates' },
  { key: 'receipt', label: 'Receipts' },
  { key: 'company_document', label: 'Company Policies' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/documents?document_type=${selectedCategory}`);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteDoc) return;
    try {
      setDeletingId(confirmDeleteDoc.id);
      setDeleteError(null);
      await fetchApi(`/documents/${confirmDeleteDoc.id}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDeleteDoc.id));
      setConfirmDeleteDoc(null);
    } catch (err: any) {
      console.error('Delete document failed:', err);
      setDeleteError(err.message || 'Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetchApi('/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setShowUploadModal(false);
      setUploadFile(null);
      // Redirect directly to the document extraction split-view
      window.location.href = `/documents/${res.document.id}`;
    } catch (err: any) {
      alert(`Upload/AI processing error: ${err.message}`);
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    (d.file_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Document Repository & AI Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Secure storage, automated AI classification, structured data extraction, and document Q&A.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload & Analyze</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent outline-hidden text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No documents found in this category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Upload an invoice, contract, or certificate to test automated AI classification and structured data extraction.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(doc.processing_status)}`}>
                      {doc.document_type?.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmDeleteDoc(doc);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-slate-900 dark:text-white mt-3 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {doc.file_name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Uploaded {formatDate(doc.created_at)} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Analyzed
                </span>
                <span className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 flex items-center gap-1 font-medium">
                  Review <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Upload Modal with Dropzone */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Upload & AI Extract Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div className="border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-indigo-50/20 transition-colors">
                <input
                  type="file"
                  id="doc-upload"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="doc-upload" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : 'Click to select or drag PDF / Invoice file'}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF, PNG, JPEG up to 10MB</p>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Automated Multimodal Pipeline
                </p>
                <p className="text-[11px]">PayDoc AI will extract text, classify document type, discover amounts/dates/clauses, and present an editable review form.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Extracting with AI...</span>
                    </>
                  ) : (
                    <span>Upload & Process</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Delete Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Unable to delete document</p>
                    <p className="text-[11px] mt-0.5">{deleteError}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-mono break-all">{confirmDeleteDoc.file_name}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                This will permanently remove the file from private cloud storage along with its AI classifications and extraction metadata. This action cannot be undone.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteDoc(null);
                  setDeleteError(null);
                }}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {deletingId ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
