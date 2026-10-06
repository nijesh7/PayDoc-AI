-- ============================================================================
-- PAYDOC AI — Seed Data for Local & Supabase Development
-- ============================================================================

-- 1. Demo Organization
INSERT INTO organizations (id, name, slug, currency, fiscal_year_start, address, tax_id, contact_email, contact_phone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Acme Technologies Pvt Ltd',
    'acme-tech',
    'INR',
    4,
    '402, Cyber Tower, Hitec City, Hyderabad, Telangana 500081',
    '36AAACA1234A1Z5',
    'admin@acmetech.com',
    '+91 98765 43210'
) ON CONFLICT (id) DO NOTHING;

-- 2. Departments
INSERT INTO departments (id, organization_id, name, description)
VALUES 
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering', 'Software development, infrastructure and QA'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Human Resources', 'Recruitment, payroll preparation, compliance and employee welfare'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Finance & Operations', 'Accounting, vendor payments, taxation and facilities')
ON CONFLICT (id) DO NOTHING;

-- 3. Employees (10 Realistic Team Members)
INSERT INTO employees (
    id, organization_id, employee_id, first_name, last_name, email, phone,
    department_id, designation, joining_date, employment_type, salary_type,
    basic_salary, status, emergency_contact_name, emergency_contact_phone,
    bank_account_number, bank_name, bank_ifsc, pan_number
) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'EMP-001', 'Aarav', 'Sharma', 'aarav.sharma@acmetech.com', '+91 98111 22334', '10000000-0000-0000-0000-000000000001', 'Principal Engineer', '2022-03-15', 'full_time', 'monthly', 85000.00, 'active', 'Meera Sharma', '+91 98111 22330', '918273645012', 'HDFC Bank', 'HDFC0001234', 'ABCPS1234A'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'EMP-002', 'Priya', 'Nair', 'priya.nair@acmetech.com', '+91 98222 33445', '10000000-0000-0000-0000-000000000001', 'Senior Full Stack Dev', '2022-08-01', 'full_time', 'monthly', 65000.00, 'active', 'Rajan Nair', '+91 98222 33440', '918273645013', 'ICICI Bank', 'ICIC0005678', 'ABCPS1234B'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'EMP-003', 'Rohan', 'Verma', 'rohan.verma@acmetech.com', '+91 98333 44556', '10000000-0000-0000-0000-000000000001', 'Frontend Developer', '2023-01-10', 'full_time', 'monthly', 45000.00, 'active', 'Sunita Verma', '+91 98333 44550', '918273645014', 'State Bank of India', 'SBIN0009988', 'ABCPS1234C'),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'EMP-004', 'Ananya', 'Deshmukh', 'ananya.d@acmetech.com', '+91 98444 55667', '10000000-0000-0000-0000-000000000002', 'HR Manager', '2021-11-01', 'full_time', 'monthly', 55000.00, 'active', 'Vikas Deshmukh', '+91 98444 55660', '918273645015', 'Axis Bank', 'UTIB0001122', 'ABCPS1234D'),
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'EMP-005', 'Karthik', 'Raman', 'karthik.r@acmetech.com', '+91 98555 66778', '10000000-0000-0000-0000-000000000002', 'HR & Talent Specialist', '2023-05-15', 'full_time', 'monthly', 35000.00, 'active', 'Lakshmi Raman', '+91 98555 66770', '918273645016', 'Kotak Mahindra Bank', 'KKBK0003344', 'ABCPS1234E'),
    ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'EMP-006', 'Vikram', 'Mehta', 'vikram.mehta@acmetech.com', '+91 98666 77889', '10000000-0000-0000-0000-000000000003', 'Lead Accountant', '2022-02-01', 'full_time', 'monthly', 60000.00, 'active', 'Neha Mehta', '+91 98666 77880', '918273645017', 'HDFC Bank', 'HDFC0001234', 'ABCPS1234F'),
    ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'EMP-007', 'Sneha', 'Patel', 'sneha.patel@acmetech.com', '+91 98777 88990', '10000000-0000-0000-0000-000000000003', 'Finance Executive', '2023-09-01', 'full_time', 'monthly', 32000.00, 'active', 'Girish Patel', '+91 98777 88999', '918273645018', 'ICICI Bank', 'ICIC0005678', 'ABCPS1234G'),
    ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'EMP-008', 'Amit', 'Kumar', 'amit.kumar@acmetech.com', '+91 98888 99001', '10000000-0000-0000-0000-000000000001', 'DevOps Consultant', '2024-02-01', 'contract', 'monthly', 70000.00, 'active', 'Pooja Kumar', '+91 98888 99000', '918273645019', 'State Bank of India', 'SBIN0009988', 'ABCPS1234H'),
    ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'EMP-009', 'Divya', 'Reddy', 'divya.reddy@acmetech.com', '+91 98999 00112', '10000000-0000-0000-0000-000000000001', 'UI/UX Designer', '2023-10-15', 'part_time', 'monthly', 28000.00, 'active', 'Suresh Reddy', '+91 98999 00110', '918273645020', 'HDFC Bank', 'HDFC0001234', 'ABCPS1234I'),
    ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'EMP-010', 'Ramesh', 'Yadav', 'ramesh.yadav@acmetech.com', '+91 98000 11223', '10000000-0000-0000-0000-000000000003', 'Office Operations Assistant', '2022-06-01', 'daily_wage', 'daily', 800.00, 'active', 'Kiran Yadav', '+91 98000 11220', '918273645021', 'Bank of Baroda', 'BARB0007788', 'ABCPS1234J')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Salary Components (Allowances & Deductions)
INSERT INTO salary_components (organization_id, employee_id, component_type, name, amount, is_percentage, percentage_value, is_taxable)
VALUES
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'allowance', 'House Rent Allowance (HRA)', 34000.00, true, 40.00, true),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'allowance', 'Special Allowance', 15000.00, false, null, true),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'deduction', 'Provident Fund (PF)', 1800.00, false, null, false),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'deduction', 'Professional Tax (PT)', 200.00, false, null, false),
    
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'allowance', 'House Rent Allowance (HRA)', 26000.00, true, 40.00, true),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'allowance', 'Conveyance Allowance', 5000.00, false, null, true),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'deduction', 'Provident Fund (PF)', 1800.00, false, null, false),
    ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'deduction', 'Professional Tax (PT)', 200.00, false, null, false);

-- 5. Sample Invoices
INSERT INTO invoices (
    id, organization_id, invoice_number, vendor_name, customer_name,
    invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount,
    currency, status, notes
) VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'INV-2026-081', 'Tata Communications Cloud Services', 'Acme Technologies Pvt Ltd', '2026-09-15', '2026-09-30', 42000.00, 7560.00, 0.00, 49560.00, 'INR', 'overdue', 'Monthly cloud hosting and database backup infrastructure'),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'INV-2026-104', 'Khaitan & Co Legal Advisors', 'Acme Technologies Pvt Ltd', '2026-09-28', '2026-10-15', 25000.00, 4500.00, 0.00, 29500.00, 'INR', 'due_soon', 'Quarterly compliance and legal advisory retainer'),
    ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'INV-2026-112', 'Godrej Office Solutions & Supplies', 'Acme Technologies Pvt Ltd', '2026-09-20', '2026-10-05', 8500.00, 1530.00, 500.00, 9530.00, 'INR', 'paid', 'Ergonomic chairs and stationery consumables')
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Invoice Items
INSERT INTO invoice_items (id, invoice_id, organization_id, description, quantity, unit_price, total_price)
VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tata Comms Cloud & Compute Instances (Sept 2026)', 1.00, 32000.00, 32000.00),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tata Comms Object Storage & Network Bandwidth', 1.00, 10000.00, 10000.00),
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Khaitan & Co Q3 Legal Retainer & ROC Filings', 1.00, 25000.00, 25000.00),
    ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Godrej Ergonomic Desk Chairs (Set of 2)', 2.00, 4250.00, 8500.00)
ON CONFLICT (id) DO NOTHING;

-- 7. Sample Reminders
INSERT INTO reminders (id, organization_id, title, reminder_type, due_date, target_entity_type, target_entity_id, status)
VALUES
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tata Communications Invoice INV-2026-081 is Overdue (₹49,560)', 'invoice_due', '2026-09-30', 'invoices', '40000000-0000-0000-0000-000000000001', 'active'),
    ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Khaitan & Co Legal Retainer Due Soon (₹29,500)', 'invoice_due', '2026-10-15', 'invoices', '40000000-0000-0000-0000-000000000002', 'active'),
    ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cyber Towers Hitec City Lease Agreement expires in 25 days', 'contract_expiry', '2026-10-26', 'documents', '00000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO NOTHING;
