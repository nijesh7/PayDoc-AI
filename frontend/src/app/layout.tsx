import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayDoc AI — AI-Powered Payroll, Payment & Document Intelligence Platform',
  description: 'Manage employees, deterministic payroll calculations, payment deadlines, invoices, and business documents with AI intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
