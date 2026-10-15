'use client';

import {
  Banknote,
  LayoutGrid,
  Landmark,
  LibraryBig,
  Pill,
  Plus,
  ReceiptText,
  Scale,
  X,
} from 'lucide-react';

export type SectionKey = 'ventas' | 'planilla' | 'gastos' | 'consolidado' | 'conciliacion';

type SidebarProps = {
  activeSection: SectionKey;
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: SectionKey) => void;
  onQuickAction: (action: 'venta' | 'gasto') => void;
};

const navigationItems: Array<{ key: SectionKey; label: string; description: string; icon: typeof LayoutGrid }> = [
  { key: 'ventas', label: 'Ventas y Recaudaciones', description: 'Núcleo de ventas por período', icon: LayoutGrid },
  { key: 'planilla', label: 'Planilla y Bonificaciones', description: 'Cortes quincenales e IGSS', icon: ReceiptText },
  { key: 'gastos', label: 'Gastos y Gastos Fijos', description: 'Registro con vigencias amplias', icon: LibraryBig },
  { key: 'consolidado', label: 'Consolidado Mensual de Gastos', description: 'Regla del tercio y balance', icon: Scale },
  { key: 'conciliacion', label: 'Conciliación Bancaria', description: 'Boletas y cuadres', icon: Banknote },
];

export default function Sidebar({
  activeSection,
  isOpen,
  onClose,
  onSelectSection,
  onQuickAction,
}: SidebarProps) {
  const handleSectionSelect = (section: SectionKey) => {
    onSelectSection(section);
    onClose();
  };

  return (
    <>
      {isOpen && <button type="button" aria-label="Cerrar menú lateral" onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" />}

      <aside
        className={`fixed left-0 top-0 z-50 flex min-h-screen w-72 max-w-[82vw] flex-col justify-between border-r border-slate-800/80 bg-slate-950 p-5 shadow-2xl shadow-slate-950/60 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:w-64 lg:translate-x-0`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/40 bg-orange-500/10 text-orange-300 shadow-lg shadow-orange-900/20">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-300">ERP FARMACIAS</p>
                <p className="mt-1 text-xs text-slate-400">Consola Administrativa</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-orange-400 hover:text-orange-300 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                onQuickAction('venta');
                onClose();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-400"
            >
              <Plus className="h-4 w-4" />
              + Registrar Venta / Corte
            </button>

            <button
              type="button"
              onClick={() => {
                onQuickAction('gasto');
                onClose();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              + Registrar Gasto
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
                  onClick={() => handleSectionSelect(item.key)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-50 shadow-inner shadow-orange-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive ? 'bg-orange-500/20 text-orange-200' : 'bg-slate-800 text-slate-300'
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
        <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500">
          Motor contable ERP v2
        </div>
      </aside>
    </>
  );
}
