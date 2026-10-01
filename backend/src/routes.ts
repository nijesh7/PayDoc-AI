import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from './middleware/auth';
import { requireRole } from './middleware/rbac';

import * as employeeCtrl from './modules/employees/employeeController';
import * as payrollCtrl from './modules/payroll/payrollController';
import * as paymentCtrl from './modules/payments/paymentController';
import * as documentCtrl from './modules/documents/documentController';
import * as invoiceCtrl from './modules/invoices/invoiceController';
import * as assistantCtrl from './modules/assistant/assistantController';
import * as analyticsCtrl from './modules/analytics/analyticsController';
import * as notificationCtrl from './modules/notifications/notificationController';
import * as organizationCtrl from './modules/organization/organizationController';
import * as searchCtrl from './modules/search/searchController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

export const apiRouter = Router();

// Apply Auth Middleware to all API routes
apiRouter.use(authMiddleware);

// --- 1. Dashboard & Analytics ---
apiRouter.get('/dashboard', analyticsCtrl.getDashboardOverview);
apiRouter.get('/analytics/overview', analyticsCtrl.getDashboardOverview);

// --- 2. Employees ---
apiRouter.get('/employees', employeeCtrl.listEmployees);
apiRouter.get('/employees/:id', employeeCtrl.getEmployee);
apiRouter.post('/employees', requireRole(['admin', 'hr']), employeeCtrl.createEmployee);
apiRouter.put('/employees/:id', requireRole(['admin', 'hr']), employeeCtrl.updateEmployee);
apiRouter.delete('/employees/:id', requireRole(['admin', 'hr']), employeeCtrl.deleteEmployee);

// --- 3. Payroll & Payslips ---
apiRouter.get('/payroll/runs', payrollCtrl.listPayrollRuns);
apiRouter.get('/payroll/runs/:id', payrollCtrl.getPayrollRun);
apiRouter.post('/payroll/runs', requireRole(['admin', 'hr']), payrollCtrl.createPayrollRun);
apiRouter.put('/payroll/items/:id', requireRole(['admin', 'hr']), payrollCtrl.updatePayrollItem);
apiRouter.post('/payroll/runs/:id/approve', requireRole(['admin']), payrollCtrl.approvePayrollRun);
apiRouter.get('/payslips/:itemId/pdf', payrollCtrl.downloadPayslipPDF);

// --- 4. Payments ---
apiRouter.get('/payments', paymentCtrl.listPayments);
apiRouter.get('/payments/summary', paymentCtrl.getPaymentSummary);
apiRouter.post('/payments/:id/pay', requireRole(['admin', 'accountant']), paymentCtrl.recordPayment);

// --- 5. Documents & AI Extraction ---
apiRouter.get('/documents', documentCtrl.listDocuments);
apiRouter.post('/documents/upload', upload.single('file'), documentCtrl.uploadAndProcessDocument);
apiRouter.get('/documents/:id/signed-url', documentCtrl.getDocumentSignedUrl);
apiRouter.post('/documents/:id/query', documentCtrl.queryDocument);

// --- 6. Invoices ---
apiRouter.get('/invoices', invoiceCtrl.listInvoices);
apiRouter.get('/invoices/:id', invoiceCtrl.getInvoice);
apiRouter.post('/invoices', requireRole(['admin', 'accountant']), invoiceCtrl.createInvoice);
apiRouter.put('/invoices/:id/status', requireRole(['admin', 'accountant']), invoiceCtrl.updateInvoiceStatus);

// --- 7. AI Business Assistant ---
apiRouter.post('/assistant/query', assistantCtrl.askBusinessAssistant);

// --- 8. Notifications & Reminders ---
apiRouter.get('/notifications', notificationCtrl.listNotifications);
apiRouter.put('/notifications/:id/read', notificationCtrl.markNotificationRead);
apiRouter.get('/reminders', notificationCtrl.listReminders);
apiRouter.put('/reminders/:id/status', notificationCtrl.updateReminderStatus);

// --- 9. Organization & Settings ---
apiRouter.get('/organization/settings', organizationCtrl.getOrganizationSettings);
apiRouter.put('/organization/profile', requireRole(['admin']), organizationCtrl.updateOrganizationProfile);
apiRouter.post('/organization/departments', requireRole(['admin', 'hr']), organizationCtrl.createDepartment);

// --- 10. Global Search ---
apiRouter.get('/search', searchCtrl.globalSearch);
