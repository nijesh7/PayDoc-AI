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
import * as salaryCompCtrl from './modules/salaryComponents/salaryComponentController';
import * as approvalCtrl from './modules/approvals/approvalController';
import * as leaveCtrl from './modules/leave/leaveController';
import * as attendanceCtrl from './modules/attendance/attendanceController';
import * as taxCtrl from './modules/tax/taxController';
import * as bankingCtrl from './modules/banking/bankingController';
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
apiRouter.get('/payroll/runs/:id/ecr', payrollCtrl.downloadEPFOECRFile);

// --- 4. Payments ---
apiRouter.get('/payments', paymentCtrl.listPayments);
apiRouter.get('/payments/summary', paymentCtrl.getPaymentSummary);
apiRouter.post('/payments/:id/pay', requireRole(['ADMIN', 'ACCOUNTANT']), paymentCtrl.recordPayment);

// --- 5. Documents & AI Extraction ---
apiRouter.get('/documents', documentCtrl.listDocuments);
apiRouter.post('/documents/upload', upload.single('file'), documentCtrl.uploadAndProcessDocument);
apiRouter.get('/documents/:id/signed-url', documentCtrl.getDocumentSignedUrl);
apiRouter.post('/documents/:id/query', documentCtrl.queryDocument);
apiRouter.delete('/documents/:id', documentCtrl.deleteDocument);

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
apiRouter.get('/organization/settings', organizationCtrl.getOrganizationSettings);
apiRouter.put('/organization', requireRole(['ADMIN']), organizationCtrl.updateOrganizationProfile);
apiRouter.put('/organization/profile', requireRole(['ADMIN']), organizationCtrl.updateOrganizationProfile);
apiRouter.post('/departments', requireRole(['ADMIN', 'HR']), organizationCtrl.createDepartment);
apiRouter.post('/organization/departments', requireRole(['ADMIN', 'HR']), organizationCtrl.createDepartment);

// --- 10. Global Search ---
apiRouter.get('/search', searchCtrl.globalSearch);

// --- 11. Configurable Salary Components & CTC Templates ---
apiRouter.get('/salary-components/definitions', salaryCompCtrl.listComponentDefinitions);
apiRouter.post('/salary-components/definitions', requireRole(['ADMIN', 'HR']), salaryCompCtrl.createComponentDefinition);
apiRouter.put('/salary-components/definitions/:id', requireRole(['ADMIN', 'HR']), salaryCompCtrl.updateComponentDefinition);
apiRouter.get('/salary-components/preview', salaryCompCtrl.calculateCTCPreview);

apiRouter.get('/ctc-templates', salaryCompCtrl.listCTCTemplates);
apiRouter.post('/ctc-templates', requireRole(['ADMIN', 'HR']), salaryCompCtrl.createCTCTemplate);

apiRouter.get('/employees/:id/salary-structure', salaryCompCtrl.getEmployeeSalaryStructure);
apiRouter.post('/employees/:id/salary-revision', requireRole(['ADMIN', 'HR']), salaryCompCtrl.reviseEmployeeSalary);

// --- 12. Generic Approvals Engine ---
apiRouter.get('/approvals/pending', approvalCtrl.listPendingApprovals);
apiRouter.get('/approvals/history', approvalCtrl.listApprovalHistory);
apiRouter.get('/approvals/:id', approvalCtrl.getApprovalDetails);
apiRouter.post('/approvals/:id/action', requireRole(['ADMIN', 'HR', 'ACCOUNTANT']), approvalCtrl.actionApprovalStep);
apiRouter.get('/approval-workflows', requireRole(['ADMIN']), approvalCtrl.listApprovalWorkflows);
apiRouter.put('/approval-workflows/:id', requireRole(['ADMIN']), approvalCtrl.updateApprovalWorkflow);

// --- 13. Leave & Attendance Management ---
apiRouter.get('/leave-types', leaveCtrl.getLeaveTypes);
apiRouter.get('/leave-balances/:employeeId', leaveCtrl.getEmployeeLeaveBalances);
apiRouter.get('/leave-requests', leaveCtrl.getLeaveRequests);
apiRouter.post('/leave-requests', leaveCtrl.createLeaveRequest);
apiRouter.patch('/leave-requests/:id/action', requireRole(['ADMIN', 'HR']), leaveCtrl.actionLeaveRequest);
apiRouter.get('/holidays', leaveCtrl.getHolidays);

apiRouter.get('/attendance', attendanceCtrl.getAttendance);
apiRouter.post('/attendance', requireRole(['ADMIN', 'HR']), attendanceCtrl.recordAttendance);
apiRouter.post('/attendance/bulk', requireRole(['ADMIN', 'HR']), attendanceCtrl.bulkRecordAttendance);
apiRouter.get('/attendance/summary/:employeeId', attendanceCtrl.getEmployeeAttendanceSummary);

// --- 14. Indian Statutory Tax & Compliance (TDS, PF, ESI, PT) ---
apiRouter.get('/tax/regime-comparison', taxCtrl.simulateTaxRegimes);
apiRouter.get('/tax/declarations/:employeeId', taxCtrl.getEmployeeTaxDeclaration);
apiRouter.post('/tax/declarations', taxCtrl.saveEmployeeTaxDeclaration);
apiRouter.patch('/tax/declarations/:id/verify', requireRole(['ADMIN', 'HR', 'ACCOUNTANT']), taxCtrl.verifyTaxDeclaration);
apiRouter.get('/tax/statutory-details/:employeeId', taxCtrl.getEmployeeStatutoryDetails);
apiRouter.post('/tax/statutory-details', requireRole(['ADMIN', 'HR']), taxCtrl.saveEmployeeStatutoryDetails);
apiRouter.get('/tax/pt-slabs', taxCtrl.getPtStateSlabs);
apiRouter.get('/tax/form16/:employeeId/pdf', taxCtrl.downloadForm16PDF);

// --- 15. Banking & Payout Engine (HDFC, ICICI, SBI, NEFT, UTR) ---
apiRouter.get('/banking/accounts', bankingCtrl.listBankAccounts);
apiRouter.post('/banking/accounts', requireRole(['ADMIN', 'ACCOUNTANT']), bankingCtrl.createBankAccount);
apiRouter.get('/banking/batches', bankingCtrl.listPayoutBatches);
apiRouter.post('/banking/batches', requireRole(['ADMIN', 'HR', 'ACCOUNTANT']), bankingCtrl.generatePayoutBatch);
apiRouter.get('/banking/batches/:id', bankingCtrl.getPayoutBatch);
apiRouter.post('/banking/batches/:id/reconcile', requireRole(['ADMIN', 'ACCOUNTANT']), bankingCtrl.reconcilePayoutBatch);
