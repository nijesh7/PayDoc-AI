import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/themeProvider';

export const metadata: Metadata = {
  title: 'PayDoc AI — AI-Powered Payroll, Payment & Document Intelligence Platform',
  description: 'Manage employees, deterministic payroll calculations, payment deadlines, invoices, and business documents with AI intelligence.',
};

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('paydoc_theme');
      var root = document.documentElement;
      var dark = false;
      if (stored === 'dark') {
        dark = true;
      } else if (stored === 'light') {
        dark = false;
      } else {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      if (dark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full font-sans antialiased bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-500">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
