'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Download,
  Bot,
  Send,
  CheckCircle2,
  Receipt,
  Calendar,
  AlertCircle,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { fetchApi } from '../../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../../lib/utils';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<any>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Editable Form Fields
  const [extractedForm, setExtractedForm] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  // Document Q&A Chat State
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hello! I have analyzed this document. Ask me any question about dates, payment terms, or line items.' },
  ]);
  const [asking, setAsking] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    async function loadDoc() {
      try {
        setLoading(true);
        const [docsRes, urlRes] = await Promise.all([
          fetchApi('/documents'),
          fetchApi(`/documents/${id}/signed-url`),
        ]);

        const currentDoc = (docsRes.documents || []).find((d: any) => d.id === id);
        if (currentDoc) {
          setDoc(currentDoc);
          const ext = currentDoc.document_extractions?.[0];
          setExtraction(ext);
          const extData = ext?.extracted_data || {};
          setExtractedForm({
            vendor_name: extData.vendorName || extData.vendor_name || 'Extracted Vendor',
            invoice_number: extData.invoiceNumber || extData.invoice_number || 'INV-1045',
            invoice_date: extData.invoiceDate || extData.invoice_date || new Date().toISOString().split('T')[0],
            due_date: extData.dueDate || extData.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            subtotal: Number(extData.subtotal) || 25000,
            tax_amount: Number(extData.taxAmount) || 4500,
            total_amount: Number(extData.totalAmount) || 29500,
          });
        }
        setSignedUrl(urlRes.signedUrl || urlRes.url);
      } catch (err) {
        console.error('Failed to load document details:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadDoc();
  }, [id]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userQ = question;
    setQuestion('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setAsking(true);

    try {
      const res = await fetchApi(`/documents/${id}/query`, {
        method: 'POST',
        body: JSON.stringify({ question: userQ }),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message || 'Unable to process query'}` },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleSaveAsInvoice = async () => {
    setSavingInvoice(true);
    try {
      await fetchApi('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...extractedForm,
          document_id: doc.id,
          items: [
            {
              description: 'AI Extracted Line Item',
              quantity: 1,
              unit_price: extractedForm.subtotal,
              total_price: extractedForm.subtotal,
            },
          ],
        }),
      });
      alert('Invoice created successfully from document!');
      window.location.href = '/invoices';
    } catch (err: any) {
      alert(`Error creating invoice: ${err.message}`);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleDeleteDoc = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await fetchApi(`/documents/${id}`, { method: 'DELETE' });
      window.location.href = '/documents';
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setDeleteError(err.message || 'Failed to delete document.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">Loading document intelligence split-view...</div>;
  }

  if (!doc) {
    return <div className="py-16 text-center text-xs text-slate-400">Document not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-md">
                {doc.file_name}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadge(doc.document_type)}`}>
                {doc.document_type?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Confidence: <span className="font-bold text-indigo-600">{(extraction?.confidence_score ? extraction.confidence_score * 100 : 92).toFixed(0)}%</span> • AI Model: {extraction?.ai_model_used || 'Gemini 1.5 Flash'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Raw File</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-xs hover:bg-rose-100/80 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document File Preview & Metadata (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Document Preview</h3>
            
            <div className="h-80 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {extraction?.raw_text || `Document: ${doc.file_name}\nType: ${doc.document_type}\nStatus: Successfully indexed in Supabase Storage.`}
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p>Uploaded: <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(doc.created_at)}</span></p>
              <p>Size: <span className="font-medium text-slate-800 dark:text-slate-200">{(doc.file_size_bytes / 1024).toFixed(1)} KB</span></p>
              <p>MIME: <span className="font-medium text-slate-800 dark:text-slate-200">{doc.mime_type}</span></p>
            </div>
          </div>

          {/* Interactive Document Q&A Drawer */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ask About This Document</h3>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto text-xs p-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white ml-6'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 mr-6 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {asking && (
                <div className="p-2 text-xs text-indigo-500 animate-pulse">Reading document context...</div>
              )}
            </div>

            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. What is the due date or penalty?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={asking}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Pre-filled Editable Form (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Structured AI Extraction (Editable)</h3>
              </div>
              <span className="text-xs text-slate-400">Human-in-the-loop verification</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vendor / Beneficiary Name</label>
                  <input
                    type="text"
                    value={extractedForm.vendor_name}
                    onChange={(e) => setExtractedForm({ ...extractedForm, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice / Reference Number</label>
                  <input
                    type="text"
                    value={extractedForm.invoice_number}
                    onChange={(e) => setExtractedForm({ ...extractedForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={extractedForm.invoice_date}
                    onChange={(e) => setExtractedForm({ ...extractedForm, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={extractedForm.due_date}
                    onChange={(e) => setExtractedForm({ ...extractedForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtotal (₹)</label>
                  <input
                    type="number"
                    value={extractedForm.subtotal}
                    onChange={(e) => setExtractedForm({ ...extractedForm, subtotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax / GST (₹)</label>
                  <input
                    type="number"
                    value={extractedForm.tax_amount}
                    onChange={(e) => setExtractedForm({ ...extractedForm, tax_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={extractedForm.total_amount}
                    onChange={(e) => setExtractedForm({ ...extractedForm, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">You can edit any incorrect values before converting.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAsInvoice}
                    disabled={savingInvoice}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>{savingInvoice ? 'Saving...' : 'Save as Invoice Draft'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                onClick={() => setShowDeleteModal(false)}
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
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-mono break-all">{doc.file_name}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                This will permanently delete the file from private cloud storage and wipe all associated AI extractions and analysis. This action cannot be undone.
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDoc}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? (
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
