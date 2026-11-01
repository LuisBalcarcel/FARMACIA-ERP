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
      {isOpen && <button type="button" aria-label="Cerrar menú lateral" onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[82%] max-w-xs flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-slate-50/90 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-slate-800 shadow-2xl backdrop-blur-2xl transition-all duration-200 ease-out dark:border-white/10 dark:bg-[#0c0f17]/90 dark:text-slate-100 md:inset-y-auto md:left-0 md:top-0 md:m-3 md:flex md:min-h-[calc(100vh-1.5rem)] md:h-auto md:w-64 md:max-w-[82vw] md:overflow-visible md:rounded-3xl md:border-r md:border-slate-200/90 md:bg-white/75 md:p-4 md:pb-4 md:text-slate-800 md:shadow-[4px_0_24px_rgba(0,0,0,0.03),inset_-1px_0_1px_rgba(255,255,255,0.8)] md:backdrop-blur-2xl md:dark:border-white/10 md:dark:bg-[#0c1017]/80 md:dark:text-slate-100 md:dark:shadow-[4px_0_30px_rgba(0,0,0,0.5),inset_-1px_0_1px_rgba(255,255,255,0.05)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100/80 p-2.5 text-orange-600 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05] dark:text-orange-400">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-400">ERP FARMACIAS</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consola Administrativa</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-all duration-200 ease-out hover:border-orange-400 hover:text-orange-300 active:scale-[0.98] md:hidden"
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
                className="sidebar-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_rgba(0,0,0,0.3)] shadow-orange-500/20 transition-all duration-200 ease-out hover:bg-orange-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
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
                className="sidebar-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_14px_rgba(0,0,0,0.3)] shadow-blue-500/20 transition-all duration-200 ease-out hover:bg-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
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
                      ? 'sidebar-nav-active rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_12px_rgba(249,115,22,0.12)] backdrop-blur-xl dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-200 md:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(249,115,22,0.15)]'
                      : 'sidebar-nav-inactive rounded-2xl border border-white/60 bg-white/40 p-3 text-slate-700 backdrop-blur-md transition-all duration-200 hover:bg-white/70 hover:text-slate-900 dark:border-white/5 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive ? 'sidebar-active-icon rounded-xl bg-orange-500 p-2 text-white shadow-sm' : 'sidebar-inactive-icon bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${isActive ? 'sidebar-active-title font-semibold text-orange-950 dark:text-orange-200' : 'sidebar-inactive-title font-medium text-slate-800 dark:text-slate-200'}`}>
                      {item.label}
                    </span>
                    <span className={`mt-1 block text-xs ${isActive ? 'sidebar-active-description text-orange-700/80 dark:text-orange-300/70' : 'sidebar-inactive-description text-slate-500 dark:text-slate-400'}`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-slate-200/80 pb-6 pt-4 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
          Motor contable ERP v2
        </div>
      </aside>

      <nav className={`mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 items-center justify-items-center border-x-0 border-b border-t border-slate-200/90 bg-white/85 px-2 pb-[env(safe-area-inset-bottom,0.5rem)] pt-1 shadow-[0_-4px_25px_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#10141e]/85 dark:shadow-[0_-4px_25px_rgba(0,0,0,0.4),inset_0_1px_1px_0_rgba(255,255,255,0.08)] md:hidden ${isOpen ? 'pointer-events-none hidden' : 'block'}`} aria-label="Navegación principal">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.key;

          return (
            <button
              key={`mobile-${item.key}`}
              type="button"
              onClick={() => handleSectionSelect(item.key)}
              className="group flex h-full w-full flex-col items-center justify-center active:scale-95"
            >
              <span
                className={`flex h-7 w-14 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-600 shadow-sm dark:bg-orange-500/25 dark:text-orange-300'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span
                className={`mt-0.5 text-center text-[10px] tracking-wide transition-colors ${
                  isActive ? 'font-semibold text-orange-600 dark:text-orange-300' : 'font-medium text-slate-600 dark:text-slate-400'
                }`}
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
