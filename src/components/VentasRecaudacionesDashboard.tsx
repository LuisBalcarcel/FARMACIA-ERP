'use client';

import { Edit3, Eye, Lock, Plus, Store } from 'lucide-react';
import { useMemo } from 'react';
import type { BonusCascade } from '@/lib/contabilidad';
import type { MoneyFilterMode, VentaCore, VentaSucursalResumen } from '@/hooks/useVentasFilter';

type Sucursal = {
  id: string | number;
  nombre: string;
  activa?: boolean;
};

type VentasRecaudacionesDashboardProps = {
  sucursales: Sucursal[];
  resumenPorSucursal: VentaSucursalResumen[];
  ventasActivas: VentaCore[];
  totalGeneral: number;
  selectedFarmaciaId: string;
  onSelectFarmacia: (sucursalId: string) => void;
  onAbrirRegistroVenta: () => void;
  onVerHistorial: (sucursalId: string) => void;
  fechaDesde: string;
  fechaHasta: string;
  onChangeFechaDesde: (value: string) => void;
  onChangeFechaHasta: (value: string) => void;
  moneyMode: MoneyFilterMode;
  onMoneyModeChange: (mode: MoneyFilterMode) => void;
  moneyValue: string;
  onMoneyValueChange: (value: string) => void;
  activeDatePreset: 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';
  onApplyDatePreset: (preset: 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado') => void;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  cascadeGlobal: BonusCascade;
  cascadePorSucursal: Record<string, BonusCascade>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
};

export default function VentasRecaudacionesDashboard({
  sucursales,
  resumenPorSucursal,
  ventasActivas,
  totalGeneral,
  selectedFarmaciaId,
  onSelectFarmacia,
  onAbrirRegistroVenta,
  onVerHistorial,
  fechaDesde,
  fechaHasta,
  onChangeFechaDesde,
  onChangeFechaHasta,
  moneyMode,
  onMoneyModeChange,
  moneyValue,
  onMoneyValueChange,
  activeDatePreset,
  onApplyDatePreset,
  isFrozen,
  onToggleFreeze,
  cascadeGlobal,
  cascadePorSucursal,
}: VentasRecaudacionesDashboardProps) {
  const historiaSucursal = useMemo(() => {
    if (!selectedFarmaciaId) return [];

    return ventasActivas
      .filter((venta) => String(venta.sucursal_id ?? '') === selectedFarmaciaId)
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.fecha_fin_corte ?? a.fecha_venta ?? 0).getTime();
        const bDate = new Date(b.fecha_fin_corte ?? b.fecha_venta ?? 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 8);
  }, [ventasActivas, selectedFarmaciaId]);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-slate-950/30">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">Ingreso y control de ventas</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Ventas y Recaudaciones</h2>
              <p className="mt-2 text-sm text-slate-300">Analisis por sucursal con trazabilidad de cortes y recaudacion consolidada.</p>
            </div>

            <div className="w-full sm:w-auto">
              <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 sm:min-w-[280px]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total general consolidado</p>
                <p className="mt-2 text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalGeneral)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onAbrirRegistroVenta}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              + Registrar Venta / Corte
            </button>

            <button
              type="button"
              onClick={onToggleFreeze}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:w-auto ${
                isFrozen
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-400 hover:text-white'
              }`}
            >
              <Lock className="h-4 w-4" />
              {isFrozen ? 'Vista Congelada' : 'Congelar Vista'}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Esta Semana' },
              { key: 'mes', label: 'Este Mes' },
              { key: 'anio', label: 'Este Ano' },
              { key: 'personalizado', label: 'Rango Libre' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onApplyDatePreset(preset.key as 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado')}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  activeDatePreset === preset.key
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-blue-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              <span>Desde</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(event) => onChangeFechaDesde(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              <span>Hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(event) => onChangeFechaHasta(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              <span>Filtro de monto</span>
              <select
                value={moneyMode}
                onChange={(event) => onMoneyModeChange(event.target.value as MoneyFilterMode)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
              >
                <option value="none">Sin filtro</option>
                <option value="gt">Mayor que</option>
                <option value="lt">Menor que</option>
                <option value="eq">Monto exacto</option>
              </select>
            </label>

            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              <span>Valor Q</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={moneyValue}
                onChange={(event) => onMoneyValueChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
                placeholder="0.00"
              />
            </label>
          </div>

          {isFrozen && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
              <Lock className="h-3.5 w-3.5" />
              Vista congelada para auditoria
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {sucursales.map((sucursal) => {
          const selected = selectedFarmaciaId === String(sucursal.id);
          const resumen = resumenPorSucursal.find((item) => item.sucursalId === String(sucursal.id));

          return (
            <button
              key={String(sucursal.id)}
              type="button"
              onClick={() => onSelectFarmacia(String(sucursal.id))}
              className={`rounded-xl border p-2.5 text-left transition ${
                selected
                  ? 'border-orange-500/40 bg-orange-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-blue-500/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white">{sucursal.nombre}</span>
                <Store className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-400">{resumen?.cortes ?? 0} cortes</p>
            </button>
          );
        })}
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-800 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">Farmacia</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Total Recaudado</th>
              <th className="px-4 py-3 font-medium text-right">Bono Total 1%</th>
              <th className="px-4 py-3 font-medium text-right">Bono Bodega 40%</th>
              <th className="px-4 py-3 font-medium text-right">Bono Dependientes 60%</th>
              <th className="px-4 py-3 font-medium text-right">Efectivo</th>
              <th className="px-4 py-3 font-medium text-right">Tarjetas/Transferencias</th>
              <th className="px-4 py-3 font-medium text-right">Cortes</th>
              <th className="px-4 py-3 font-medium text-right">Promedio por Corte</th>
              <th className="px-4 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resumenPorSucursal.map((row) => {
              const cascade = cascadePorSucursal[row.sucursalId] ?? {
                totalVentasRango: row.totalRecaudado,
                bonoTotalFarmacias: 0,
                bonoBodega: 0,
                bonoDependientes: 0,
              };

              return (
                <tr key={row.sucursalId} className="border-t border-slate-800 bg-slate-900/40">
                  <td className="px-4 py-3 font-semibold text-white">{row.nombre}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        row.activa
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-600 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {row.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(row.totalRecaudado)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(cascade.bonoTotalFarmacias)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(cascade.bonoBodega)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(cascade.bonoDependientes)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.totalEfectivo)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.totalDigital)}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{row.cortes}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatCurrency(row.promedioPorCorte)}</td>
                  <td className="px-4 py-3">
                    <div className="whitespace-nowrap flex items-center gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => onVerHistorial(row.sucursalId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver Historial
                      </button>
                      <button
                        type="button"
                        onClick={onAbrirRegistroVenta}
                        className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-orange-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar Corte
                      </button>
                      <button
                        type="button"
                        onClick={onAbrirRegistroVenta}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Total (1%)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(cascadeGlobal.bonoTotalFarmacias)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Bodega (40%)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(cascadeGlobal.bonoBodega)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Dependientes (60%)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">{formatCurrency(cascadeGlobal.bonoDependientes)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Historial de {sucursales.find((item) => String(item.id) === selectedFarmaciaId)?.nombre ?? 'farmacia'}</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Ultimos cortes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-2">Periodo</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Notas de arqueo</th>
              </tr>
            </thead>
            <tbody>
              {historiaSucursal.map((venta) => (
                <tr key={String(venta.id)} className="border-b border-slate-800/80">
                  <td className="px-3 py-2 text-slate-200">
                    {formatDate(venta.fecha_inicio_corte ?? venta.fecha_venta)} - {formatDate(venta.fecha_fin_corte ?? venta.fecha_venta)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">{formatCurrency(Number(venta.monto_bruto ?? 0))}</td>
                  <td className="px-3 py-2 text-slate-300">{venta.notas_recaudacion?.trim() || 'Sin notas'}</td>
                </tr>
              ))}
              {historiaSucursal.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-sm text-slate-400">
                    No hay cortes registrados para esta farmacia dentro del rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
