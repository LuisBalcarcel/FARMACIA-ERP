import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ERP Farmacia',
  description: 'Sistema de ventas y gastos para farmacia',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 dark:bg-[#07090E] dark:text-slate-100">
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-500/15 blur-[120px] dark:bg-blue-600/10" />
          <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-orange-400/15 blur-[130px] dark:bg-orange-500/10" />
          <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-emerald-400/15 blur-[120px] dark:bg-emerald-600/10" />
        </div>
        <div className="relative flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
