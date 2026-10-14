'use client';

import { Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SucursalCRM = {
  id: string | number;
  nombre: string;
};

type VentaCRM = {
  id: string | number;
  sucursal_id?: string | number | null;
  fecha_venta?: string;
  fecha_inicio_corte?: string;
  fecha_fin_corte?: string;
  tipo_periodo?: string;
  notas_recaudacion?: string | null;
  monto_bruto?: number;
  anulado?: boolean;
  no_paquete_remesa?: string | null;
};

type GastoCRM = {
  id: string | number;
  sucursal_id?: string | number | null;
  categoria?: string;
  descripcion?: string;
  fecha_gasto?: string;
  monto?: number;
  es_gasto_general?: boolean;
  anulado?: boolean;
};

type PanelLateralCRMProps = {
  isOpen: boolean;
  onClose: () => void;
  sucursales: SucursalCRM[];
  ventas: VentaCRM[];
  gastos: GastoCRM[];
  fechaDesde?: string;
  fechaHasta?: string;
  onDeleteSucursal?: (sucursalId: string | number, nombreSucursal: string) => void;
};

const formatCurrency = (value: number) =>
  `Q ${value.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string) => {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const renderTipoPeriodo = (periodo?: string) => {
  if (!periodo) {
    return 'Diario';
  }

  return periodo;
};

export default function PanelLateralCRM({
  isOpen,
  onClose,
  sucursales,
  ventas,
  gastos,
  fechaDesde,
  fechaHasta,
  onDeleteSucursal,
}: PanelLateralCRMProps) {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (sucursales.length === 0) {
      setSelectedSucursalId('');
      return;
    }

    setSelectedSucursalId((current) => {
      if (current && sucursales.some((item) => String(item.id) === current)) {
        return current;
      }

      return String(sucursales[0].id);
    });
  }, [isOpen, sucursales]);

  const selectedSucursal = useMemo(
    () =>
      sucursales.find((sucursal) => String(sucursal.id) === String(selectedSucursalId)) ?? sucursales[0] ?? null,
    [selectedSucursalId, sucursales],
  );

  const isWithinRange = (value?: string) => {
    if (!value) {
      return true;
    }

    if (!fechaDesde && !fechaHasta) {
      return true;
    }

    const normalizedValue = new Date(value);
    if (Number.isNaN(normalizedValue.getTime())) {
      return true;
    }

    if (fechaDesde) {
      const start = new Date(fechaDesde);
      if (normalizedValue < start) {
        return false;
      }
    }

    if (fechaHasta) {
      const end = new Date(fechaHasta);
      end.setHours(23, 59, 59, 999);
      if (normalizedValue > end) {
        return false;
      }
    }

    return true;
  };

  const sucursalVentas = useMemo(
    () =>
      ventas.filter((venta) => {
        if (!selectedSucursal) {
          return false;
        }

        if (String(venta.sucursal_id ?? '') !== String(selectedSucursal.id)) {
          return false;
        }

        const baseDate = venta.fecha_fin_corte ?? venta.fecha_venta ?? venta.fecha_inicio_corte;
        return isWithinRange(baseDate);
      }),
    [fechaDesde, fechaHasta, selectedSucursal, ventas],
  );

  const sucursalGastos = useMemo(
    () =>
      gastos.filter((gasto) => {
        if (!selectedSucursal) {
          return false;
        }

        if (String(gasto.sucursal_id ?? '') !== String(selectedSucursal.id)) {
          return false;
        }

        return isWithinRange(gasto.fecha_gasto);
      }),
    [fechaDesde, fechaHasta, gastos, selectedSucursal],
  );

  const summary = useMemo(() => {
    const totalRecaudado = sucursalVentas.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
    const totalGastosAsignados = sucursalGastos.reduce((sum, gasto) => sum + Number(gasto.monto ?? 0), 0);
    const promedio = sucursalVentas.length > 0 ? totalRecaudado / sucursalVentas.length : 0;

    return {
      totalRecaudado,
      totalGastosAsignados,
      promedio,
      entregas: sucursalVentas.length,
    };
  }, [sucursalGastos, sucursalVentas]);

  const historial = useMemo(
    () =>
      [...sucursalVentas]
        .sort((a, b) => {
          const dateA = new Date(a.fecha_fin_corte ?? a.fecha_venta ?? a.fecha_inicio_corte ?? '1970-01-01').getTime();
          const dateB = new Date(b.fecha_fin_corte ?? b.fecha_venta ?? b.fecha_inicio_corte ?? '1970-01-01').getTime();
          return dateB - dateA;
        })
        .map((venta) => ({
          id: String(venta.id),
          rango:
            venta.fecha_inicio_corte && venta.fecha_fin_corte && venta.fecha_inicio_corte !== venta.fecha_fin_corte
              ? `${formatDate(venta.fecha_inicio_corte)} - ${formatDate(venta.fecha_fin_corte)}`
              : formatDate(venta.fecha_venta ?? venta.fecha_inicio_corte ?? venta.fecha_fin_corte),
          modalidad: renderTipoPeriodo(venta.tipo_periodo),
          monto: Number(venta.monto_bruto ?? 0),
          notas: venta.notas_recaudacion?.trim() || null,
          remesa: venta.no_paquete_remesa ?? null,
        })),
    [sucursalVentas],
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Explorador CRM Farmacias</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar panel CRM"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block text-sm text-slate-200">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Sucursal</span>
            <div className="flex items-center gap-2">
              <select
                value={selectedSucursalId}
                onChange={(event) => setSelectedSucursalId(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
              >
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
              {selectedSucursal && onDeleteSucursal ? (
                <button
                  type="button"
                  onClick={() => onDeleteSucursal(selectedSucursal.id, selectedSucursal.nombre)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
                  aria-label={`Eliminar farmacia ${selectedSucursal.nombre}`}
                  title={`Eliminar farmacia ${selectedSucursal.nombre}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </label>

          {selectedSucursal ? (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Resumen de la farmacia</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selectedSucursal.nombre}</h3>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Total recaudado</p>
                    <p className="mt-2 font-mono text-2xl font-semibold text-emerald-300">
                      {formatCurrency(summary.totalRecaudado)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Cortes</p>
                      <p className="mt-2 text-xl font-semibold text-white">{summary.entregas}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Promedio</p>
                      <p className="mt-2 font-mono text-lg font-semibold text-indigo-300">
                        {formatCurrency(summary.promedio)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-rose-300">Gastos asignados</p>
                    <p className="mt-2 font-mono text-xl font-semibold text-rose-300">
                      {formatCurrency(summary.totalGastosAsignados)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Historial cronológico</h3>
                  <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-indigo-200">
                    {historial.length} entregas
                  </span>
                </div>

                {historial.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                    Sin entregas registradas en este período.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historial.map((entrega) => (
                      <div key={entrega.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{entrega.rango}</p>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                            {entrega.modalidad}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-400">Monto</span>
                          <span className="font-mono text-emerald-300">{formatCurrency(entrega.monto)}</span>
                        </div>

                        {entrega.remesa && (
                          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-400">Remesa</span>
                            <span className="text-slate-200">{entrega.remesa}</span>
                          </div>
                        )}

                        {entrega.notas && (
                          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-300">
                            {entrega.notas}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
              Selecciona una sucursal para consultar su historial.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
