'use client';

import { BarChart3, ChevronDown, Edit3, Eye, Lock, Plus, Store, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BonusCascade } from '@/lib/contabilidad';
import type { MoneyFilterMode, VentaCore, VentaSucursalResumen } from '@/hooks/useVentasFilter';
import ReporteVentas from '@/components/ReporteVentas';

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
  totalCortesTodasSucursales: number;
  selectedFarmaciaId: string;
  onSelectFarmacia: (sucursalId: string) => void;
  onAbrirRegistroVenta: () => void;
  onVerHistorial: (sucursalId: string) => void;
  onEditarVenta: (venta: VentaCore) => void;
  onAnularVenta: (venta: VentaCore) => void;
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
  const dateKey = normalizeDateKey(value);
  const parsed = dateKey
    ? new Date(
        Number(dateKey.slice(0, 4)),
        Number(dateKey.slice(5, 7)) - 1,
        Number(dateKey.slice(8, 10)),
      )
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
};

type HistoriaPeriodo = {
  key: string;
  label: string;
  inicio: string;
  fin: string;
  cortes: VentaCore[];
  total: number;
};

const normalizeDateKey = (value?: string) => {
  const key = value?.slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
};

const nextMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

const getMonthEnd = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;
};

const getCalendarMonthKeys = (fromDate: string, toDate: string) => {
  const from = normalizeDateKey(fromDate);
  const to = normalizeDateKey(toDate);
  if (!from || !to || from > to) return [];

  const keys: string[] = [];
  let current = from.slice(0, 7);
  const last = to.slice(0, 7);
  while (current <= last) {
    keys.push(current);
    current = nextMonthKey(current);
  }
  return keys;
};

export default function VentasRecaudacionesDashboard({
  sucursales,
  resumenPorSucursal,
  ventasActivas,
  totalGeneral,
  totalCortesTodasSucursales,
  selectedFarmaciaId,
  onSelectFarmacia,
  onAbrirRegistroVenta,
  onVerHistorial,
  onEditarVenta,
  onAnularVenta,
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
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const historiaPeriodos = useMemo<HistoriaPeriodo[]>(() => {
    if (!selectedFarmaciaId) return [];

    const grouped = new Map<string, VentaCore[]>();
    ventasActivas
      .filter((venta) => String(venta.sucursal_id ?? '') === selectedFarmaciaId)
      .forEach((venta) => {
        const key = normalizeDateKey(venta.fecha_inicio_corte)?.slice(0, 7);
        if (key) grouped.set(key, [...(grouped.get(key) ?? []), venta]);
      });

    const calendarKeys = getCalendarMonthKeys(fechaDesde, fechaHasta);
    const monthKeys = calendarKeys.length > 0
      ? calendarKeys
      : Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

    return monthKeys
      .map((key) => {
        const cortes = grouped.get(key) ?? [];
        const ordered = cortes.slice().sort((a, b) => {
          const aDate = normalizeDateKey(a.fecha_inicio_corte) ?? '';
          const bDate = normalizeDateKey(b.fecha_inicio_corte) ?? '';
          return aDate.localeCompare(bDate);
        });
        const first = ordered[0];
        const last = ordered[ordered.length - 1];
        const monthDate = new Date(`${key}-01T00:00:00`);
        const theoreticalStart = `${key}-01`;
        const theoreticalEnd = getMonthEnd(key);
        return {
          key,
          label: new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(monthDate),
          inicio: first?.fecha_inicio_corte ?? theoreticalStart,
          fin: last?.fecha_inicio_corte ?? theoreticalEnd,
          cortes: ordered,
          total: ordered.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0),
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [fechaDesde, fechaHasta, ventasActivas, selectedFarmaciaId]);

  const sucursalesVisibles = useMemo(
    () =>
      selectedFarmaciaId
        ? sucursales.filter((sucursal) => String(sucursal.id) === selectedFarmaciaId)
        : sucursales.filter((sucursal) => (resumenPorSucursal.find((row) => row.sucursalId === String(sucursal.id))?.cortes ?? 0) > 0),
    [resumenPorSucursal, selectedFarmaciaId, sucursales],
  );

  const resumenVisible = useMemo(
    () =>
      resumenPorSucursal.filter(
        (row) => (!selectedFarmaciaId || row.sucursalId === selectedFarmaciaId) && row.cortes > 0,
      ),
    [resumenPorSucursal, selectedFarmaciaId],
  );

  return (
    <section className="space-y-5">
      <div className="liquid-glass rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">Ingreso y control de ventas</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Ventas</h2>
              <p className="mt-2 text-sm text-slate-300">Análisis por sucursal con trazabilidad de cortes y recaudación consolidada.</p>
            </div>

            <div className="w-full sm:w-auto">
              <div className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4 shadow-sm sm:min-w-[280px]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total general consolidado</p>
                <p className="mt-2 text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalGeneral)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onAbrirRegistroVenta}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 ease-out hover:bg-orange-400 hover:shadow-xl active:scale-[0.98] sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Registrar Venta
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

            <button
              type="button"
              onClick={() => setReporteAbierto(true)}
              className="liquid-btn inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:shadow-md dark:hover:bg-white/15 sm:w-auto"
            >
              <BarChart3 className="h-4 w-4" />
              Generar Reporte
            </button>
          </div>

          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Esta Semana' },
              { key: 'mes', label: 'Este Mes' },
              { key: 'anio', label: 'Este Año' },
              { key: 'personalizado', label: 'Rango Libre' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onApplyDatePreset(preset.key as 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado')}
                className={`h-9 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-150 ease-out active:scale-[0.98] ${
                  activeDatePreset === preset.key
                    ? 'border-blue-600 bg-blue-600 text-white font-medium shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-300">
              <span>Desde</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(event) => onChangeFechaDesde(event.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition-all duration-200 ease-out focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
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

      <ReporteVentas
        isOpen={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        ventas={ventasActivas}
        sucursales={sucursales}
        selectedFarmaciaId={selectedFarmaciaId}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        cascade={cascadeGlobal}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectFarmacia('')}
          className={`liquid-btn inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-all duration-150 ease-out active:scale-[0.98] ${
            selectedFarmaciaId === ''
              ? 'border-blue-500/50 bg-blue-500/10 text-white'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400'
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          Todas las sucursales
          <span className="text-[10px] font-normal text-slate-400">({totalCortesTodasSucursales} cortes)</span>
        </button>
        {sucursalesVisibles.map((sucursal) => {
          const selected = selectedFarmaciaId === String(sucursal.id);
          const resumen = resumenPorSucursal.find((item) => item.sucursalId === String(sucursal.id));

          if (!resumen || resumen.cortes === 0) return null;
          return (
            <button
              key={String(sucursal.id)}
              type="button"
              onClick={() => onSelectFarmacia(String(sucursal.id))}
              className={`liquid-btn inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-left transition-all duration-150 ease-out active:scale-[0.98] ${
                selected
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 bg-slate-900 hover:border-blue-500/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-xs font-bold ${selected ? 'text-amber-400' : 'text-white'}`}>{sucursal.nombre}</span>
              </div>
              <p className="text-[10px] text-slate-400">{resumen.cortes} cortes</p>
            </button>
          );
        })}
      </div>

      <div className="liquid-glass w-full overflow-hidden rounded-3xl [-webkit-overflow-scrolling:touch]">
        <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-slate-200">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Farmacia</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Estado</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Recaudado</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bono Total 1%</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bono Bodega 40%</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bono Dependientes 60%</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Efectivo</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Transferencias y POS</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cortes</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Promedio por Corte</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resumenVisible.map((row) => {
              const cascade = cascadePorSucursal[row.sucursalId] ?? {
                totalVentasRango: row.totalRecaudado,
                bonoTotalFarmacias: 0,
                bonoBodega: 0,
                bonoDependientes: 0,
              };

              return (
                <tr key={row.sucursalId} className="min-h-12 border-t border-slate-800/70 bg-slate-900/20 transition-colors hover:bg-slate-800/30">
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
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(row.totalRecaudado)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(cascade.bonoTotalFarmacias)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(cascade.bonoBodega)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(cascade.bonoDependientes)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(row.totalEfectivo)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(row.totalDigital)}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{row.cortes}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-emerald-400">{formatCurrency(row.promedioPorCorte)}</td>
                  <td className="px-4 py-3">
                    <div className="whitespace-nowrap flex items-center gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => onVerHistorial(row.sucursalId)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200 transition-all duration-150 ease-out hover:border-blue-400 hover:text-white active:scale-[0.98]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver Historial
                      </button>
                      <button
                        type="button"
                        onClick={onAbrirRegistroVenta}
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-semibold text-white transition-all duration-150 ease-out hover:bg-orange-400 active:scale-[0.98]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar
                      </button>
                      <button
                        type="button"
                        onClick={onAbrirRegistroVenta}
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200 transition-all duration-150 ease-out hover:border-blue-400 hover:text-white active:scale-[0.98]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {resumenVisible.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm font-medium text-slate-300">
                  No hay farmacias con cortes o actividad en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="liquid-glass min-w-0 rounded-3xl p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total Recaudado</p>
          <p className="mt-2 truncate font-mono text-lg font-bold text-emerald-400 sm:text-2xl">{formatCurrency(totalGeneral)}</p>
        </div>
        <div className="liquid-glass min-w-0 rounded-3xl p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Total (1%)</p>
          <p className="mt-2 truncate font-mono text-lg font-bold text-emerald-400 sm:text-2xl">{formatCurrency(cascadeGlobal.bonoTotalFarmacias)}</p>
        </div>
        <div className="liquid-glass min-w-0 rounded-3xl p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Bodega (40%)</p>
          <p className="mt-2 truncate font-mono text-lg font-bold text-emerald-400 sm:text-2xl">{formatCurrency(cascadeGlobal.bonoBodega)}</p>
        </div>
        <div className="liquid-glass min-w-0 rounded-3xl p-3 sm:p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Bono Dependientes (60%)</p>
          <p className="mt-2 truncate font-mono text-lg font-bold text-emerald-400 sm:text-2xl">{formatCurrency(cascadeGlobal.bonoDependientes)}</p>
        </div>
      </div>

      <div className="liquid-glass rounded-3xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Historial de {sucursales.find((item) => String(item.id) === selectedFarmaciaId)?.nombre ?? 'farmacia'}</h3>
          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Resumen por período</span>
        </div>

        <div className="overflow-x-auto rounded-xl [-webkit-overflow-scrolling:touch]">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr className="border-b border-slate-800">
                <th className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Período / Rango</th>
                <th className="whitespace-nowrap px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cortes</th>
                <th className="whitespace-nowrap px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monto Total</th>
                <th className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Detalle / Desglose</th>
              </tr>
            </thead>
            <tbody>
              {historiaPeriodos.map((periodo) => (
                <tr key={periodo.key} className="min-h-12 border-b border-slate-800/70 align-top transition-colors hover:bg-slate-800/30">
                  <td className={`px-3 py-3 ${periodo.cortes.length > 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                    <p className={`font-semibold capitalize ${periodo.cortes.length > 0 ? 'text-slate-100' : 'text-slate-500'}`}>{periodo.label}</p>
                    <p className="mt-1 text-xs">
                      {formatDate(periodo.inicio)} - {formatDate(periodo.fin)}
                    </p>
                  </td>
                  <td className={`px-3 py-3 text-right font-medium tabular-nums ${periodo.cortes.length > 0 ? 'text-slate-200' : 'text-slate-500'}`}>{periodo.cortes.length}</td>
                  <td className={`px-3 py-3 text-right font-mono font-medium tabular-nums ${periodo.cortes.length > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{formatCurrency(periodo.total)}</td>
                  <td className="px-3 py-3">
                    {periodo.cortes.length > 0 ? (
                      <details>
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-2 text-xs font-semibold text-blue-300 transition-all duration-150 ease-out hover:bg-white/5 hover:text-blue-200 active:scale-[0.98]">
                          <ChevronDown className="h-4 w-4" />
                          Ver días
                        </summary>
                        <div className="mt-2 space-y-1 border-l border-slate-700 pl-3">
                          {periodo.cortes.map((venta) => (
                            <div key={String(venta.id)} className="flex items-center justify-between gap-4 text-xs text-slate-300">
                              <span>{formatDate(venta.fecha_venta ?? venta.fecha_inicio_corte)}</span>
                              <span className="ml-auto font-mono text-emerald-300">{formatCurrency(Number(venta.monto_bruto ?? 0))}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onEditarVenta(venta)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-blue-400 hover:text-blue-200"
                                  aria-label={`Editar venta del ${formatDate(venta.fecha_venta ?? venta.fecha_inicio_corte)}`}
                                  title="Editar venta"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onAnularVenta(venta)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/10"
                                  aria-label={`Anular venta del ${formatDate(venta.fecha_venta ?? venta.fecha_inicio_corte)}`}
                                  title="Anular venta"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {historiaPeriodos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm font-medium text-slate-300">
                    {selectedFarmaciaId
                      ? 'No hay cortes registrados para esta farmacia dentro del rango seleccionado.'
                      : 'Selecciona una farmacia con actividad para consultar su historial consolidado.'}
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
