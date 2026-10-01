export interface DocumentClassificationResult {
  documentType: 'invoice' | 'contract' | 'payslip' | 'certificate' | 'receipt' | 'employee_document' | 'company_document' | 'tax_document' | 'other';
  confidence: number;
  explanation: string;
}

export interface ExtractedInvoiceData {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  confidence: number;
}

export interface ExtractedContractData {
  parties: string[];
  effectiveDate: string;
  expiryDate: string;
  renewalDate?: string;
  paymentTerms: string;
  keyClauses: string[];
  confidence: number;
}

export interface AIProvider {
  name: string;
  classifyDocument(text: string, fileName: string): Promise<DocumentClassificationResult>;
  extractInvoiceData(text: string): Promise<ExtractedInvoiceData>;
  extractContractData(text: string): Promise<ExtractedContractData>;
  queryDocument(documentText: string, userQuestion: string): Promise<string>;
  askBusinessAssistant(systemContext: string, userQuestion: string): Promise<string>;
}
