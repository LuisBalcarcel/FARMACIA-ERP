'use client';

import {
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Pill,
  Plus,
  Receipt,
  Search,
  Store,
} from 'lucide-react';

export type SectionKey = 'dashboard' | 'crm' | 'nomina' | 'conciliacion';

type SidebarProps = {
  activeSection: SectionKey;
  onSelectSection: (section: SectionKey) => void;
  onQuickAction: (action: 'venta' | 'gasto' | 'farmacia') => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
};

const navigationItems: Array<{ key: SectionKey; label: string; description: string; icon: typeof LayoutGrid }> = [
  { key: 'dashboard', label: 'Dashboard Financiero', description: 'KPIs y tablas operativas', icon: LayoutGrid },
  { key: 'crm', label: 'Explorador CRM Farmacias', description: 'Auditoría por sucursal', icon: Search },
  { key: 'nomina', label: 'Nómina y Comisiones', description: 'Salarios y metas', icon: Receipt },
  { key: 'conciliacion', label: 'Conciliación Bancaria', description: 'Boletas y cuadres', icon: FileText },
];

export default function Sidebar({
  activeSection,
  onSelectSection,
  onQuickAction,
  onExportExcel,
  onExportPdf,
}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex min-h-screen w-64 flex-col justify-between border-r border-slate-800/80 bg-slate-950 p-5">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-900/20">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">ERP FARMACIAS</p>
            <p className="mt-1 text-xs text-slate-400">Consola Administrativa</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onQuickAction('venta')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            + Venta / Recaudación
          </button>

          <button
            type="button"
            onClick={() => onQuickAction('gasto')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-400"
          >
            <Plus className="h-4 w-4" />
            + Gasto Operativo
          </button>

          <button
            type="button"
            onClick={() => onQuickAction('farmacia')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            <Store className="h-4 w-4" />
            + Nueva Farmacia
          </button>
        </div>

        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectSection(item.key)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100 shadow-inner shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </button>
      </div>
    </aside>
  );
}
