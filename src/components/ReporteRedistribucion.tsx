'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  exportarReporteRedistribucionExcel,
  exportarReporteRedistribucionPDF,
  type RedistribucionExportData,
} from '@/lib/exportUtils';

type VentaLike = {
  id?: string | number;
  monto_bruto?: number;
  anulado?: boolean;
  fecha_venta?: string;
  fecha_inicio_corte?: string;
  fecha_fin_corte?: string;
  tipo_periodo?: string;
};

type GastoLike = {
  id?: string | number;
  categoria?: string;
  descripcion?: string;
  monto?: number;
  es_gasto_general?: boolean;
  anulado?: boolean;
  fecha_gasto?: string;
};

type ReporteRedistribucionProps = {
  ventas: VentaLike[];
  gastos: GastoLike[];
  fechaDesde: string;
  fechaHasta: string;
};

type Socio = {
  nombre: string;
  monto: number;
  porcentaje: number;
};

const formatCurrency = (value: number) =>
  `Q ${value.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const toNumber = (value?: number | string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readableCategory = (category: string) => {
  const normalized = category || 'Gasto';
  return normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const inferSalaryKeywords = /(salario|sueld|planilla|quincena|nomina|nómina|bono|igss|comision|comisión)/i;

export default function ReporteRedistribucion({ ventas, gastos, fechaDesde, fechaHasta }: ReporteRedistribucionProps) {
  const [porcentajeUtilidad, setPorcentajeUtilidad] = useState(33.3333);
  const [ahorroAcumuladoAnterior, setAhorroAcumuladoAnterior] = useState(150000);
  const [socios, setSocios] = useState<Socio[]>([
    { nombre: 'Sussy', monto: 40000, porcentaje: 40 },
    { nombre: 'Alejandro', monto: 25000, porcentaje: 25 },
  ]);

  const ventasActivas = useMemo(
    () => ventas.filter((venta) => !venta.anulado),
    [ventas],
  );

  const gastosActivos = useMemo(
    () => gastos.filter((gasto) => !gasto.anulado),
    [gastos],
  );

  const totalVentas = useMemo(
    () => ventasActivas.reduce((sum, venta) => sum + toNumber(venta.monto_bruto), 0),
    [ventasActivas],
  );

  const utilidades = totalVentas * (porcentajeUtilidad / 100);
  const inversion = totalVentas - utilidades;

  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, number>();

    gastosActivos.forEach((gasto) => {
      const key = (gasto.categoria || 'Gasto General').toLowerCase();
      const amount = toNumber(gasto.monto);
      const existing = map.get(key) ?? 0;
      map.set(key, existing + amount);
    });

    return Array.from(map.entries())
      .map(([categoria, total]) => ({
        categoria,
        total,
        concepto: readableCategory(categoria),
      }))
      .sort((a, b) => b.total - a.total);
  }, [gastosActivos]);

  const salarios = useMemo(
    () =>
      gastosPorCategoria
        .filter((item) => inferSalaryKeywords.test(item.categoria))
        .map((item) => ({ concepto: item.concepto, total: item.total })),
    [gastosPorCategoria],
  );

  const gastosFijos = useMemo(
    () =>
      gastosPorCategoria
        .filter((item) => !inferSalaryKeywords.test(item.categoria))
        .map((item) => ({ concepto: item.concepto, total: item.total })),
    [gastosPorCategoria],
  );

  const totalGastosEmpresariales = useMemo(
    () => gastosActivos.reduce((sum, gasto) => sum + toNumber(gasto.monto), 0),
    [gastosActivos],
  );

  const totalSalarios = salarios.reduce((sum, item) => sum + item.total, 0);
  const totalGastosFijos = gastosFijos.reduce((sum, item) => sum + item.total, 0);
  const utilidadRestante = utilidades - totalGastosEmpresariales;
  const totalAsignado = socios.reduce((sum, socio) => sum + socio.monto, 0);
  const totalPorcentajes = socios.reduce((sum, socio) => sum + socio.porcentaje, 0);
  const ahorroPeriodo = utilidadRestante - totalAsignado;
  const granTotalAhorroHistorico = ahorroAcumuladoAnterior + ahorroPeriodo;

  const exportData: RedistribucionExportData = {
    fechaDesde,
    fechaHasta,
    totalVentas,
    porcentajeUtilidad,
    utilidades,
    inversion,
    totalGastosEmpresariales,
    utilidadRestante,
    totalPorcentajes: totalAsignado,
    ahorroPeriodo,
    ahorroAcumuladoAnterior,
    granTotalAhorroHistorico,
    salarios,
    gastosFijos,
    socios,
  };

  const updateSocio = (index: number, field: 'monto' | 'porcentaje', value: number) => {
    setSocios((current) =>
      current.map((socio, currentIndex) => {
        if (currentIndex !== index) return socio;
        return {
          ...socio,
          [field]: Number.isFinite(value) ? value : 0,
        };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between lg:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-300">Liquidación financiera</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Reporte de Redistribución Financiera y Cierre de Utilidades</h2>
            <p className="mt-2 text-sm text-slate-300">
              Ventas del {formatDate(fechaDesde)} al {formatDate(fechaHasta)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportarReporteRedistribucionExcel(exportData)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:border-blue-500 hover:text-blue-300"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => exportarReporteRedistribucionPDF(exportData)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:border-orange-500 hover:text-orange-300"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Total Ventas</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(totalVentas)}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Utilidades</p>
                <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                  {porcentajeUtilidad.toFixed(4)}%
                </span>
              </div>
              <label className="mt-3 block text-xs text-slate-400">Ajustar % de utilidad</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={porcentajeUtilidad}
                onChange={(event) => setPorcentajeUtilidad(Number(event.target.value || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500"
              />
              <p className="mt-3 text-xl font-semibold text-blue-300">{formatCurrency(utilidades)}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Inversión mercadería</p>
              <p className="mt-3 text-2xl font-semibold text-amber-300">{formatCurrency(inversion)}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Suma ahorro acumulado</p>
              <label className="mt-3 block text-xs text-slate-400">Ahorro acumulado anterior</label>
              <input
                type="number"
                step="100"
                min="0"
                value={ahorroAcumuladoAnterior}
                onChange={(event) => setAhorroAcumuladoAnterior(Number(event.target.value || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
              />
              <p className="mt-3 text-xl font-semibold text-emerald-300">{formatCurrency(granTotalAhorroHistorico)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Salarios y planilla por período</h3>
              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                {formatCurrency(totalSalarios)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-medium">Concepto</th>
                    <th className="px-3 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salarios.length > 0 ? (
                    salarios.map((item) => (
                      <tr key={item.concepto} className="border-t border-slate-800 bg-slate-900/30">
                        <td className="px-3 py-3 text-slate-200">{item.concepto}</td>
                        <td className="px-3 py-3 text-right font-mono text-orange-300">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-sm text-slate-400">Sin salarios registrados en el rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Gastos fijos de operación</h3>
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                {formatCurrency(totalGastosFijos)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-medium">Concepto</th>
                    <th className="px-3 py-3 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFijos.length > 0 ? (
                    gastosFijos.map((item) => (
                      <tr key={item.concepto} className="border-t border-slate-800 bg-slate-900/30">
                        <td className="px-3 py-3 text-slate-200">{item.concepto}</td>
                        <td className="px-3 py-3 text-right font-mono text-cyan-300">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-sm text-slate-400">Sin gastos operativos fijos registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Total general de gastos empresariales</h3>
              <p className="text-right text-xl font-semibold text-rose-300">{formatCurrency(totalGastosEmpresariales)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Resumen de utilidades</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <td className="px-3 py-3 text-slate-300">Utilidades</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-300">{formatCurrency(utilidades)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-900/30">
                    <td className="px-3 py-3 text-slate-300">Gastos empresariales</td>
                    <td className="px-3 py-3 text-right font-mono text-rose-300">{formatCurrency(totalGastosEmpresariales)}</td>
                  </tr>
                  <tr className="bg-slate-950/60">
                    <td className="px-3 py-3 text-slate-200 font-medium">Total margen</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-300 font-semibold">{formatCurrency(utilidadRestante)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Porcentaje a recibir</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-medium">Socio</th>
                    <th className="px-3 py-3 text-right font-medium">Monto</th>
                    <th className="px-3 py-3 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {socios.map((socio, index) => (
                    <tr key={socio.nombre} className="border-t border-slate-800 bg-slate-900/30">
                      <td className="px-3 py-3 text-slate-200">{socio.nombre}</td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          step="100"
                          value={socio.monto}
                          onChange={(event) => updateSocio(index, 'monto', Number(event.target.value || 0))}
                          className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={socio.porcentaje}
                          onChange={(event) => updateSocio(index, 'porcentaje', Number(event.target.value || 0))}
                          className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-800 bg-slate-950/60">
                    <td className="px-3 py-3 font-medium text-white">Total porcentajes</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-300">{formatCurrency(totalAsignado)}</td>
                    <td className="px-3 py-3 text-right font-mono text-cyan-300">{totalPorcentajes.toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Cuentas ahorro / aguinaldo</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <td className="px-3 py-3 text-slate-300">Total restante utilidades</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-300">{formatCurrency(utilidadRestante)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-900/30">
                    <td className="px-3 py-3 text-slate-300">Total porcentajes</td>
                    <td className="px-3 py-3 text-right font-mono text-cyan-300">{formatCurrency(totalAsignado)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <td className="px-3 py-3 text-slate-200 font-medium">Ahorro neto final</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-300 font-semibold">{formatCurrency(ahorroPeriodo)}</td>
                  </tr>
                  <tr className="bg-slate-950/80">
                    <td className="px-3 py-3 text-white font-medium">Gran total ahorro histórico</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-300 font-semibold">{formatCurrency(granTotalAhorroHistorico)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
