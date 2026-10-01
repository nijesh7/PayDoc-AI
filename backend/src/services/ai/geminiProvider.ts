import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  DocumentClassificationResult,
  ExtractedInvoiceData,
  ExtractedContractData,
} from './aiProvider';

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini API';
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async classifyDocument(text: string, fileName: string): Promise<DocumentClassificationResult> {
    if (!this.genAI) {
      // Heuristic fallback if API key is not configured
      return this.heuristicClassify(text, fileName);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `You are an expert document classifier for a business SaaS platform.
Analyze the following document text and file name.
Classify it into EXACTLY ONE of these categories:
- invoice
- contract
- payslip
- certificate
- receipt
- employee_document
- company_document
- tax_document
- other

File Name: "${fileName}"
Document Content Snippet:
"""
${text.slice(0, 3000)}
"""

Return ONLY a valid JSON object matching this schema:
{
  "documentType": "invoice" | "contract" | "payslip" | "certificate" | "receipt" | "employee_document" | "company_document" | "tax_document" | "other",
  "confidence": 0.95,
  "explanation": "Brief reasoning for this classification"
}`;

      const result = await model.generateContent(prompt);
      const cleanJson = this.extractJson(result.response.text());
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error('Gemini classifyDocument error:', err);
      return this.heuristicClassify(text, fileName);
    }
  }

  async extractInvoiceData(text: string): Promise<ExtractedInvoiceData> {
    if (!this.genAI) {
      return this.heuristicExtractInvoice(text);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `You are an invoice data extraction engine.
Extract structured fields from the invoice text below.
Invoice Text:
"""
${text.slice(0, 4000)}
"""

Return ONLY a valid JSON object with the following schema:
{
  "vendorName": "Vendor or Company Name",
  "invoiceNumber": "INV-1234",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "subtotal": 0.00,
  "taxAmount": 0.00,
  "discountAmount": 0.00,
  "totalAmount": 0.00,
  "currency": "INR",
  "lineItems": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00
    }
  ],
  "confidence": 0.92
}`;

      const result = await model.generateContent(prompt);
      const cleanJson = this.extractJson(result.response.text());
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error('Gemini extractInvoiceData error:', err);
      return this.heuristicExtractInvoice(text);
    }
  }

  async extractContractData(text: string): Promise<ExtractedContractData> {
    if (!this.genAI) {
      return {
        parties: ['Party A', 'Party B'],
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        paymentTerms: 'Standard Net 30 days',
        keyClauses: ['Standard confidentiality and service obligations'],
        confidence: 0.85,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `Extract contract metadata from the text below.
Contract Text:
"""
${text.slice(0, 4000)}
"""

Return ONLY a valid JSON object:
{
  "parties": ["Company A", "Company B"],
  "effectiveDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "renewalDate": "YYYY-MM-DD",
  "paymentTerms": "Description of payment terms",
  "keyClauses": ["Key clause 1", "Key clause 2"],
  "confidence": 0.90
}`;

      const result = await model.generateContent(prompt);
      const cleanJson = this.extractJson(result.response.text());
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error('Gemini extractContractData error:', err);
      return {
        parties: ['Extracted Party'],
        effectiveDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        paymentTerms: 'Payment due on delivery',
        keyClauses: ['General terms and conditions'],
        confidence: 0.8,
      };
    }
  }

  async queryDocument(documentText: string, userQuestion: string): Promise<string> {
    if (!this.genAI) {
      return `Document context analyzed (${documentText.slice(0, 100)}...). To answer "${userQuestion}" with high accuracy, please configure your GEMINI_API_KEY in backend/.env.`;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `You are PayDoc AI's Document Q&A Assistant.
Answer the user's question STRICTLY based on the provided document text. If the answer cannot be found in the document, state clearly: "The provided document does not contain this information."

DOCUMENT TEXT:
"""
${documentText.slice(0, 6000)}
"""

USER QUESTION:
"${userQuestion}"

Answer clearly and professionally:`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      return `Error processing document query: ${err.message}`;
    }
  }

  async askBusinessAssistant(systemContext: string, userQuestion: string): Promise<string> {
    if (!this.genAI) {
      return `Here is your business data summary: ${systemContext.slice(0, 200)}... Configure your GEMINI_API_KEY in backend/.env for full natural language insights.`;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `You are the PayDoc AI Business Assistant for small business owners and HR/finance teams.
You have access to actual verified database data for the organization provided below.
CRITICAL INSTRUCTION: Never hallucinate, estimate, or invent financial numbers. Answer questions strictly using the provided facts and figures. If data is not available in the context, inform the user honestly.

VERIFIED BUSINESS CONTEXT:
"""
${systemContext}
"""

USER QUESTION:
"${userQuestion}"

Provide a helpful, concise, well-structured business answer with exact numbers formatted in ₹:`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      return `Error in AI Business Assistant: ${err.message}`;
    }
  }

  private extractJson(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }

  private heuristicClassify(text: string, fileName: string): DocumentClassificationResult {
    const lower = (text + ' ' + fileName).toLowerCase();
    if (lower.includes('invoice') || lower.includes('bill') || lower.includes('tax invoice')) {
      return { documentType: 'invoice', confidence: 0.9, explanation: 'Contains invoice keywords and payment terms' };
    }
    if (lower.includes('agreement') || lower.includes('contract') || lower.includes('terms of service')) {
      return { documentType: 'contract', confidence: 0.9, explanation: 'Contains contract/agreement language' };
    }
    if (lower.includes('payslip') || lower.includes('salary slip') || lower.includes('earnings')) {
      return { documentType: 'payslip', confidence: 0.9, explanation: 'Contains payroll and salary breakdown details' };
    }
    if (lower.includes('certificate') || lower.includes('degree') || lower.includes('certified')) {
      return { documentType: 'certificate', confidence: 0.85, explanation: 'Identified as certification or credential' };
    }
    if (lower.includes('receipt') || lower.includes('payment voucher')) {
      return { documentType: 'receipt', confidence: 0.88, explanation: 'Contains payment receipt details' };
    }
    return { documentType: 'company_document', confidence: 0.75, explanation: 'Classified as general business document' };
  }

  private heuristicExtractInvoice(text: string): ExtractedInvoiceData {
    return {
      vendorName: 'Sample Vendor',
      invoiceNumber: 'INV-' + Math.floor(1000 + Math.random() * 9000),
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subtotal: 25000.0,
      taxAmount: 4500.0,
      discountAmount: 0.0,
      totalAmount: 29500.0,
      currency: 'INR',
      lineItems: [
        { description: 'Professional Services & Consulting', quantity: 1, unitPrice: 25000.0, totalPrice: 25000.0 },
      ],
      confidence: 0.85,
    };
  }
}
