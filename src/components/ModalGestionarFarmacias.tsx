'use client';

import { Pencil, Settings, X } from 'lucide-react';

type Sucursal = {
  id: string | number;
  nombre: string;
  direccion?: string | null;
  es_matriz?: boolean;
  activa?: boolean;
  usar_plantilla_fija?: boolean;
  cantidad_colaboradores?: number | null;
};

type ModalGestionarFarmaciasProps = {
  isOpen: boolean;
  onClose: () => void;
  sucursales: Sucursal[];
  onEdit: (sucursal: Sucursal) => void;
};

export default function ModalGestionarFarmacias({
  isOpen,
  onClose,
  sucursales,
  onEdit,
}: ModalGestionarFarmaciasProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4 backdrop-blur-sm">
      <div className="relative mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-orange-300" />
            <div>
              <p className="catalog-modal-kicker text-[11px] font-bold uppercase tracking-widest text-amber-400">Administración</p>
              <h2 className="catalog-modal-title mt-1 text-lg font-extrabold text-white sm:text-xl">Catálogo de Farmacias y Sucursales</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="catalog-modal-close rounded-lg border border-slate-600 p-1.5 text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar catálogo de farmacias"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="catalog-table-head border-b border-slate-700 bg-slate-950/80 text-slate-300">
              <tr>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">Farmacia</th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">Tipo</th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">Plantilla de Colaboradores</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((sucursal) => (
                <tr key={String(sucursal.id)} className="border-t border-slate-800">
                  <td className="catalog-cell-name px-3 py-3 text-sm font-bold text-white">{sucursal.nombre}</td>
                  <td className="px-3 py-3">
                    <span className={`catalog-status inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sucursal.activa === false ? 'catalog-status-inactive border-rose-500/40 bg-rose-500/10 text-rose-300' : 'catalog-status-active border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}`}>
                      {sucursal.activa === false ? 'Inactiva' : 'Activa'}
                    </span>
                  </td>
                  <td className="catalog-cell-secondary px-3 py-3 text-xs font-medium text-slate-300">{sucursal.es_matriz ? 'Matriz' : 'Sucursal'}</td>
                  <td className="catalog-cell-secondary px-3 py-3 text-xs font-medium text-slate-300">
                    {sucursal.usar_plantilla_fija && Number(sucursal.cantidad_colaboradores) > 0
                      ? <span className="catalog-fixed-count font-semibold text-white">Fija: {sucursal.cantidad_colaboradores}</span>
                      : 'Automática'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(sucursal)}
                      className="catalog-edit-button inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm transition-colors hover:bg-indigo-500/20"
                    >
                      <Pencil className="catalog-edit-icon h-3.5 w-3.5 text-indigo-300" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {sucursales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    No hay farmacias registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
