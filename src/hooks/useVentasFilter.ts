import { useMemo } from 'react';

export type VentaCore = {
  id: string | number;
  sucursal_id?: string | number | null;
  fecha_venta?: string;
  fecha_inicio_corte?: string;
  fecha_fin_corte?: string;
  anulado?: boolean;
  monto_bruto?: number;
  notas_recaudacion?: string | null;
};

export type SucursalCore = {
  id: string | number;
  nombre: string;
  activa?: boolean;
};

export type DatePreset = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';
export type MoneyFilterMode = 'none' | 'gt' | 'lt' | 'eq';

type VentasFilterParams = {
  ventas: VentaCore[];
  sucursales: SucursalCore[];
  fechaDesde: string;
  fechaHasta: string;
  sucursalId: string;
  moneyMode: MoneyFilterMode;
  moneyValue: string;
};

export type VentaSucursalResumen = {
  sucursalId: string;
  nombre: string;
  activa: boolean;
  totalRecaudado: number;
  totalEfectivo: number;
  totalDigital: number;
  cortes: number;
  promedioPorCorte: number;
};

const parseDateOnly = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeAmount = (value?: number) => Number(value ?? 0);

const normalizeDateKey = (value?: string | null): string | null => {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const normalized = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

const compareDateKeys = (left: string, right: string): number => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const extractMontos = (venta: VentaCore): { efectivo: number; digital: number; total: number } => {
  const rawNotes = String(venta.notas_recaudacion ?? '');
  const efectivoMatch = rawNotes.match(/efectivo\s*:\s*([\d.]+)/i);
  const posMatch = rawNotes.match(/tarjeta\s*pos\s*:\s*([\d.]+)/i);
  const transMatch = rawNotes.match(/transferencia\s*:\s*([\d.]+)/i);

  const efectivo = efectivoMatch ? Number(efectivoMatch[1]) : 0;
  const pos = posMatch ? Number(posMatch[1]) : 0;
  const transferencia = transMatch ? Number(transMatch[1]) : 0;
  const totalDigital = pos + transferencia;
  const totalVenta = normalizeAmount(venta.monto_bruto);

  if (efectivo === 0 && totalDigital === 0) {
    return { efectivo: totalVenta, digital: 0, total: totalVenta };
  }

  const safeTotal = totalVenta > 0 ? totalVenta : efectivo + totalDigital;
  return { efectivo, digital: totalDigital, total: safeTotal };
};

const isInRange = (targetDate: string | undefined, fromDate: string, toDate: string): boolean => {
  const target = normalizeDateKey(targetDate);
  const from = normalizeDateKey(fromDate);
  const to = normalizeDateKey(toDate);

  if (!target) return false;
  if (from && compareDateKeys(target, from) < 0) return false;
  if (to && compareDateKeys(target, to) > 0) return false;
  return true;
};

const isCorteContainedInRange = (venta: VentaCore, fromDate: string, toDate: string): boolean => {
  const from = normalizeDateKey(fromDate);
  const to = normalizeDateKey(toDate);
  const inicio = normalizeDateKey(venta.fecha_inicio_corte);
  const fin = normalizeDateKey(venta.fecha_fin_corte);

  if (inicio && fin) {
    if (from && compareDateKeys(inicio, from) < 0) return false;
    if (to && compareDateKeys(fin, to) > 0) return false;
    return true;
  }

  return isInRange(venta.fecha_venta, fromDate, toDate);
};

const moneyPredicate = (value: number, mode: MoneyFilterMode, rawThreshold: string): boolean => {
  if (mode === 'none') return true;
  const threshold = Number(rawThreshold);
  if (!Number.isFinite(threshold)) return true;

  if (mode === 'gt') return value > threshold;
  if (mode === 'lt') return value < threshold;
  return value === threshold;
};

export const getDateRangeFromPreset = (preset: Exclude<DatePreset, 'personalizado'>): { from: string; to: string } => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === 'hoy') {
    return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }

  if (preset === 'semana') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + mondayOffset);
    end.setDate(start.getDate() + 6);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  if (preset === 'mes') {
    start.setDate(1);
    end.setMonth(now.getMonth() + 1, 0);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  start.setMonth(0, 1);
  end.setMonth(11, 31);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
};

export function useVentasFilter({
  ventas,
  sucursales,
  fechaDesde,
  fechaHasta,
  sucursalId,
  moneyMode,
  moneyValue,
}: VentasFilterParams) {
  const ventasActivas = useMemo(() => {
    return ventas.filter((venta) => {
      if (venta.anulado) return false;
      const branchMatch = sucursalId === 'all' || String(venta.sucursal_id ?? '') === sucursalId;
      if (!branchMatch) return false;

      const inRange = isCorteContainedInRange(venta, fechaDesde, fechaHasta);
      if (!inRange) return false;

      const total = normalizeAmount(venta.monto_bruto);
      return moneyPredicate(total, moneyMode, moneyValue);
    });
  }, [ventas, sucursalId, fechaDesde, fechaHasta, moneyMode, moneyValue]);

  const totalGeneral = useMemo(
    () => ventasActivas.reduce((sum, venta) => sum + normalizeAmount(venta.monto_bruto), 0),
    [ventasActivas],
  );

  const resumenPorSucursal = useMemo<VentaSucursalResumen[]>(() => {
    return sucursales.map((sucursal) => {
      const rows = ventasActivas.filter((venta) => String(venta.sucursal_id ?? '') === String(sucursal.id));
      const acumulado = rows.reduce(
        (acc, venta) => {
          const montos = extractMontos(venta);
          acc.total += montos.total;
          acc.efectivo += montos.efectivo;
          acc.digital += montos.digital;
          return acc;
        },
        { total: 0, efectivo: 0, digital: 0 },
      );

      const cortes = rows.length;
      return {
        sucursalId: String(sucursal.id),
        nombre: sucursal.nombre,
        activa: sucursal.activa !== false,
        totalRecaudado: acumulado.total,
        totalEfectivo: acumulado.efectivo,
        totalDigital: acumulado.digital,
        cortes,
        promedioPorCorte: cortes > 0 ? acumulado.total / cortes : 0,
      };
    });
  }, [sucursales, ventasActivas]);

  return {
    ventasActivas,
    totalGeneral,
    resumenPorSucursal,
  };
}
