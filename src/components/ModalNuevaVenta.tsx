'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Sucursal = {
  id: string | number;
  nombre: string;
};

type Empleado = {
  id: string | number;
  nombre_completo: string;
  area: string;
  sucursal_id: string | number | null;
};

type BatchRow = {
  id: string;
  sucursalId: string;
  montoBruto: string;
  notas: string;
  selected: boolean;
};

type ModalNuevaVentaProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sucursales: Sucursal[];
  empleados: Empleado[];
};

const getToday = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new Date().toISOString().split('T')[0];
};

const tipoCorteOpciones = ['Corte Diario', 'Corte de 2 Días', 'Corte Semanal', 'Rango Personalizado'] as const;

const buildRows = (sucursales: Sucursal[]): BatchRow[] =>
  sucursales.map((sucursal) => ({
    id: `row-${String(sucursal.id)}`,
    sucursalId: String(sucursal.id),
    montoBruto: '',
    notas: '',
    selected: true,
  }));

export default function ModalNuevaVenta({
  isOpen,
  onClose,
  onSuccess,
  sucursales,
}: ModalNuevaVentaProps) {
  const [tipoPeriodo, setTipoPeriodo] = useState<(typeof tipoCorteOpciones)[number]>('Corte Diario');
  const [fechaInicioCorte, setFechaInicioCorte] = useState('');
  const [fechaFinCorte, setFechaFinCorte] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const today = getToday();
    setTipoPeriodo('Corte Diario');
    setFechaInicioCorte(today);
    setFechaFinCorte(today);
    setRows(buildRows(sucursales));
    setError('');
    setLoading(false);
  }, [isOpen, sucursales]);

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);

  const totalRecaudado = useMemo(
    () => selectedRows.reduce((sum, row) => sum + Number(row.montoBruto || 0), 0),
    [selectedRows],
  );

  const updateRow = (rowId: string, patch: Partial<BatchRow>) => {
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  const handleClose = () => {
    setRows([]);
    onClose();
  };

  const handleFechaModalidadChange = (nextValue: (typeof tipoCorteOpciones)[number]) => {
    const today = getToday();

    setTipoPeriodo(nextValue);

    if (nextValue === 'Corte Diario') {
      setFechaInicioCorte(today);
      setFechaFinCorte(today);
      return;
    }

    setFechaInicioCorte(today);
    setFechaFinCorte(today);
  };

  const handleFechaDiariaChange = (value: string) => {
    setFechaInicioCorte(value);
    setFechaFinCorte(value);
  };

  const detectDuplicados = async (): Promise<Array<{ sucursalId: string; nombre: string }>> => {
    if (selectedRows.length === 0) {
      return [];
    }

    const fechaInicio = (fechaInicioCorte || '').trim();
    const fechaFin = (fechaFinCorte || '').trim();

    if (!fechaInicio || !fechaFin) {
      return [];
    }

    const resultados: Array<{ sucursalId: string; nombre: string }> = [];

    for (const row of selectedRows) {
      const sucursalId = String(row.sucursalId ?? '').trim();
      if (!sucursalId) {
        continue;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('id, sucursal_id, monto_bruto')
        .eq('sucursal_id', sucursalId)
        .eq('fecha_inicio_corte', fechaInicio)
        .eq('fecha_fin_corte', fechaFin)
        .eq('anulado', false)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        continue;
      }

      const sucursal = sucursales.find((entry) => String(entry.id) === String(data.sucursal_id));
      resultados.push({
        sucursalId: String(data.sucursal_id ?? ''),
        nombre: sucursal?.nombre ?? 'Sucursal no encontrada',
      });
    }

    return resultados.filter((item, index, array) => array.findIndex((entry) => entry.sucursalId === item.sucursalId) === index);
  };

  const handleGuardarLote = async () => {
    const filasValidas = selectedRows.filter((row) => row.selected && Number(row.montoBruto) > 0);

    if (filasValidas.length === 0) {
      setError('Debes ingresar al menos una venta con monto mayor a 0');
      return;
    }

    const fechaInicio = (fechaInicioCorte || '').trim();
    const fechaFin = (fechaFinCorte || '').trim();

    if (!fechaInicio || !fechaFin) {
      setError('Debes definir la fecha del corte.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      setError('Las fechas del corte deben tener formato YYYY-MM-DD válido.');
      return;
    }

    const inicioDate = new Date(`${fechaInicio}T00:00:00`);
    const finDate = new Date(`${fechaFin}T00:00:00`);

    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
      setError('Las fechas del corte no son válidas.');
      return;
    }

    if (inicioDate > finDate) {
      setError('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const duplicados = await detectDuplicados();

      if (duplicados.length > 0) {
        const lista = duplicados.map((item) => item.nombre).join(', ');
        const shouldOverwrite = window.confirm(
          `Las siguientes farmacias ya tienen registro exacto en este rango: ${lista}. ¿Deseas sobrescribir esos registros?`,
        );

        if (!shouldOverwrite) {
          setLoading(false);
          return;
        }
      }

      for (const row of filasValidas) {
        const sucursalId = String(row.sucursalId ?? '').trim();
        if (!sucursalId) {
          throw new Error('Hay una sucursal sin identificador válido.');
        }

        const nuevoMonto = Number(row.montoBruto);
        const notas = String(row.notas ?? '').trim();

        const { data: registroExistente, error: searchError } = await supabase
          .from('ventas')
          .select('id, sucursal_id, monto_bruto')
          .eq('sucursal_id', sucursalId)
          .eq('fecha_inicio_corte', fechaInicio)
          .eq('fecha_fin_corte', fechaFin)
          .eq('anulado', false)
          .maybeSingle();

        if (searchError) {
          throw searchError;
        }

        if (registroExistente?.id) {
          const { error: updateError } = await supabase
            .from('ventas')
            .update({
              monto_bruto: nuevoMonto,
              notas_recaudacion: notas || null,
              tipo_periodo: tipoPeriodo,
              fecha_venta: fechaFin,
            })
            .eq('id', registroExistente.id);

          if (updateError) {
            throw updateError;
          }

          continue;
        }

        const { error: insertError } = await supabase.from('ventas').insert([
          {
            sucursal_id: sucursalId,
            monto_bruto: nuevoMonto,
            costo_inversion: 0,
            fecha_inicio_corte: fechaInicio,
            fecha_fin_corte: fechaFin,
            fecha_venta: fechaFin,
            tipo_periodo: tipoPeriodo,
            notas_recaudacion: notas || null,
            area: 'farmacia',
          },
        ]);

        if (insertError) {
          throw insertError;
        }
      }

      setRows(buildRows(sucursales));
      setFechaInicioCorte(getToday());
      setFechaFinCorte(getToday());
      setTipoPeriodo('Corte Diario');
      onSuccess();
      onClose();
    } catch (insertError) {
      const message = insertError instanceof Error ? insertError.message : 'No se pudo guardar la venta.';
      console.error('Error al guardar la venta:', insertError);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderDateFields = () => {
    if (tipoPeriodo === 'Corte Diario') {
      return (
        <label className="space-y-2 text-sm text-slate-200">
          <span>Fecha del Día</span>
          <input
            type="date"
            value={fechaInicioCorte}
            onChange={(event) => handleFechaDiariaChange(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
      );
    }

    if (tipoPeriodo === 'Corte de 2 Días') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200">
            <span>Primer Día</span>
            <input
              type="date"
              value={fechaInicioCorte}
              onChange={(event) => setFechaInicioCorte(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span>Segundo Día</span>
            <input
              type="date"
              value={fechaFinCorte}
              onChange={(event) => setFechaFinCorte(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
            />
          </label>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-200">
          <span>Día Inicial</span>
          <input
            type="date"
            value={fechaInicioCorte}
            onChange={(event) => setFechaInicioCorte(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>Día Final</span>
          <input
            type="date"
            value={fechaFinCorte}
            onChange={(event) => setFechaFinCorte(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Lote masivo</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Recaudación Masiva</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-600 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Cerrar modal de recaudación masiva"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[220px_1fr]">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Modalidad</span>
              <select
                value={tipoPeriodo}
                onChange={(event) =>
                  handleFechaModalidadChange(event.target.value as (typeof tipoCorteOpciones)[number])
                }
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                {tipoCorteOpciones.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </label>

            <div className="min-w-0">{renderDateFields()}</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 bg-slate-950/90 text-slate-200">
                  <tr>
                    <th className="w-14 px-3 py-3 font-medium">Incl.</th>
                    <th className="w-56 px-3 py-3 font-medium">Farmacia</th>
                    <th className="w-48 px-3 py-3 font-medium">Total Venta (Q)</th>
                    <th className="min-w-[260px] px-3 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const sucursal = sucursales.find((item) => String(item.id) === row.sucursalId);

                    return (
                      <tr key={row.id} className="border-t border-slate-800 bg-slate-900/40">
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                          />
                        </td>
                        <td className="px-3 py-3 text-slate-100">{sucursal?.nombre ?? 'Sucursal'}</td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={row.montoBruto}
                            onChange={(event) => updateRow(row.id, { montoBruto: event.target.value })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-medium text-emerald-200 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.notas}
                            onChange={(event) => updateRow(row.id, { notas: event.target.value })}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
                            placeholder="Opcional..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-emerald-100">
              <span className="font-semibold">Sucursales seleccionadas:</span> {selectedRows.length}
            </div>
            <div className="font-mono text-lg font-semibold text-emerald-300">
              Gran Total Recaudado: Q {totalRecaudado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleGuardarLote();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Venta'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
