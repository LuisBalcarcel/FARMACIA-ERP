'use client';

import {
  LayoutGrid,
  LibraryBig,
  Pill,
  Plus,
  ReceiptText,
  Scale,
  X,
} from 'lucide-react';

export type SectionKey = 'ventas' | 'planilla' | 'gastos' | 'consolidado';

type SidebarProps = {
  activeSection: SectionKey;
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: SectionKey) => void;
  onQuickAction: (action: 'venta' | 'gasto') => void;
};

const navigationItems: Array<{ key: SectionKey; label: string; description: string; icon: typeof LayoutGrid }> = [
  { key: 'ventas', label: 'Ventas', description: 'Núcleo de ventas por período', icon: LayoutGrid },
  { key: 'planilla', label: 'Planilla y Bonificaciones', description: 'Cortes quincenales e IGSS', icon: ReceiptText },
  { key: 'gastos', label: 'Gastos', description: 'Registro con vigencias amplias', icon: LibraryBig },
  { key: 'consolidado', label: 'Consolidado de Gastos', description: 'Regla del tercio y balance', icon: Scale },
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
        className={`liquid-glass fixed left-0 top-0 z-50 m-3 flex min-h-[calc(100vh-1.5rem)] w-72 max-w-[82vw] flex-col justify-between rounded-3xl bg-white p-4 shadow-2xl shadow-slate-950/60 transition-all duration-200 ease-out dark:bg-[#121622] lg:w-64 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-all duration-200 ease-out hover:border-orange-400 hover:text-orange-300 active:scale-[0.98] lg:hidden"
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
                className="sidebar-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-all duration-200 ease-out hover:bg-orange-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Registrar Venta
            </button>

            <button
              type="button"
              onClick={() => {
                onQuickAction('gasto');
                onClose();
              }}
                className="sidebar-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-all duration-200 ease-out hover:bg-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Registrar Gasto
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
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ease-out ${
                      isActive
                      ? 'sidebar-nav-active border-l-2 border-y-0 border-r-0 border-orange-500 bg-orange-100 text-orange-900 shadow-inner shadow-orange-500/10 dark:bg-[#4a2818] dark:text-orange-200'
                      : 'sidebar-nav-inactive border border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:border-white/10 dark:bg-[#1a2230] dark:text-slate-300 dark:hover:bg-[#253044] dark:hover:text-slate-100'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive ? 'sidebar-active-icon bg-orange-500 text-white' : 'sidebar-inactive-icon bg-slate-200 text-slate-700 dark:bg-[#273244] dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${isActive ? 'sidebar-active-title font-bold text-orange-50' : 'sidebar-inactive-title font-semibold text-slate-100'}`}>
                      {item.label}
                    </span>
                    <span className={`mt-1 block text-xs ${isActive ? 'sidebar-active-description font-medium text-slate-400' : 'sidebar-inactive-description text-slate-400'}`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-slate-800 pb-6 pt-4 text-[11px] text-slate-500">
          Motor contable ERP v2
        </div>
      </aside>

      <nav className={`liquid-glass fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around rounded-t-3xl border-x-0 border-b-0 border-t border-slate-300/80 bg-white/98 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#121622]/98 lg:hidden ${isOpen ? 'pointer-events-none hidden' : 'flex'}`} aria-label="Navegación principal">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.key;

          return (
            <button
              key={`mobile-${item.key}`}
              type="button"
              onClick={() => handleSectionSelect(item.key)}
              className={`flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1 text-[10px] font-medium transition-all duration-150 ease-out active:scale-[0.98] ${
                isActive ? 'bg-orange-500/20 font-semibold text-orange-600 dark:bg-orange-500/25 dark:text-orange-400' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
              }`}
            >
              <span
                className={`flex h-7 items-center rounded-full px-3 ${isActive ? 'bg-orange-500/20' : ''}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span
                className="mt-0.5 text-center"
              >
                {item.key === 'consolidado' ? 'Balance' : item.key === 'planilla' ? 'Planilla' : item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
