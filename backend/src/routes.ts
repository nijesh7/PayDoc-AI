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
import { userController } from './modules/users/userController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

export const apiRouter = Router();

// Apply Auth Middleware to all API routes
apiRouter.use(authMiddleware);

// --- 0. Authentication & User Management ---
apiRouter.post('/auth/verify-role', (req, res) => userController.verifyRole(req, res));
apiRouter.post('/auth/register-profile', (req, res) => userController.registerProfile(req, res));
apiRouter.get('/users/profile', (req, res) => userController.getProfile(req, res));
apiRouter.put('/users/profile', (req, res) => userController.updateProfile(req, res));
apiRouter.get('/users', requireRole(['ADMIN']), (req, res) => userController.getUsers(req, res));
apiRouter.patch('/users/:id/role', requireRole(['ADMIN']), (req, res) => userController.updateUserRole(req, res));
apiRouter.patch('/users/:id/status', requireRole(['ADMIN']), (req, res) => userController.updateUserStatus(req, res));

// --- 1. Dashboard & Analytics ---
apiRouter.get('/dashboard', analyticsCtrl.getDashboardOverview);
apiRouter.get('/analytics/overview', analyticsCtrl.getDashboardOverview);

// --- 2. Employees ---
apiRouter.get('/employees', employeeCtrl.listEmployees);
apiRouter.get('/employees/:id', employeeCtrl.getEmployee);
apiRouter.post('/employees', requireRole(['ADMIN', 'HR']), employeeCtrl.createEmployee);
apiRouter.put('/employees/:id', requireRole(['ADMIN', 'HR']), employeeCtrl.updateEmployee);
apiRouter.delete('/employees/:id', requireRole(['ADMIN', 'HR']), employeeCtrl.deleteEmployee);

// --- 3. Payroll & Payslips ---
apiRouter.get('/payroll/runs', payrollCtrl.listPayrollRuns);
apiRouter.get('/payroll/runs/:id', payrollCtrl.getPayrollRun);
apiRouter.post('/payroll/runs', requireRole(['ADMIN', 'HR']), payrollCtrl.createPayrollRun);
apiRouter.put('/payroll/items/:id', requireRole(['ADMIN', 'HR']), payrollCtrl.updatePayrollItem);
apiRouter.post('/payroll/runs/:id/approve', requireRole(['ADMIN']), payrollCtrl.approvePayrollRun);
apiRouter.get('/payslips/:itemId/pdf', payrollCtrl.downloadPayslipPDF);

// --- 4. Payments ---
apiRouter.get('/payments', paymentCtrl.listPayments);
apiRouter.get('/payments/summary', paymentCtrl.getPaymentSummary);
apiRouter.post('/payments/:id/pay', requireRole(['ADMIN', 'ACCOUNTANT']), paymentCtrl.recordPayment);

// --- 5. Documents & AI Extraction ---
apiRouter.get('/documents', documentCtrl.listDocuments);
apiRouter.post('/documents/upload', upload.single('file'), documentCtrl.uploadAndProcessDocument);
apiRouter.get('/documents/:id/signed-url', documentCtrl.getDocumentSignedUrl);
apiRouter.post('/documents/:id/query', documentCtrl.queryDocument);

// --- 6. Invoices ---
apiRouter.get('/invoices', invoiceCtrl.listInvoices);
apiRouter.get('/invoices/:id', invoiceCtrl.getInvoice);
apiRouter.post('/invoices', requireRole(['ADMIN', 'ACCOUNTANT']), invoiceCtrl.createInvoice);

// --- 7. AI Business Assistant ---
apiRouter.post('/assistant/query', assistantCtrl.askBusinessAssistant);

// --- 8. Notifications & Reminders ---
apiRouter.get('/notifications', notificationCtrl.listNotifications);
apiRouter.post('/notifications/:id/read', notificationCtrl.markNotificationRead);
apiRouter.get('/reminders', notificationCtrl.listReminders);

// --- 9. Organization & Settings ---
apiRouter.get('/organization', organizationCtrl.getOrganizationSettings);
apiRouter.put('/organization', requireRole(['ADMIN']), organizationCtrl.updateOrganizationProfile);
apiRouter.post('/departments', requireRole(['ADMIN', 'HR']), organizationCtrl.createDepartment);

// --- 10. Global Search ---
apiRouter.get('/search', searchCtrl.globalSearch);
