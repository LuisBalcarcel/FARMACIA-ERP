'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  exportarCierreMensualExcel,
  exportarCierreMensualPDF,
} from '@/lib/exportUtils';

type VentaLike = {
  id?: string | number;
  monto_bruto?: number;
  anulado?: boolean;
  fecha_venta?: string;
  fecha_inicio_corte?: string;
  fecha_fin_corte?: string;
};

type GastoLike = {
  id?: string | number;
  categoria?: string;
  descripcion?: string;
  monto?: number;
  anulado?: boolean;
  es_gasto_general?: boolean;
};

type ReporteCierreMensualProps = {
  ventas: VentaLike[];
  gastos: GastoLike[];
  fechaDesde: string;
  fechaHasta: string;
};

type Directivo = {
  nombre: string;
  monto: number;
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

const parseNumber = (value?: number | string | null) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeCategory = (value?: string) => (value || 'Gasto general').replace(/_/g, ' ');

const salaryKeywords = /(salario|planilla|quincena|nomina|nómina|bono|igss|comision|comisión)/i;

export default function ReporteCierreMensual({ ventas, gastos, fechaDesde, fechaHasta }: ReporteCierreMensualProps) {
  const [directivos, setDirectivos] = useState<Directivo[]>([
    { nombre: 'Sussy', monto: 40000 },
    { nombre: 'Alejandro', monto: 25000 },
  ]);
  const [ahorroHistoricoAnterior, setAhorroHistoricoAnterior] = useState(150000);

  const ventasActivas = useMemo(() => ventas.filter((venta) => !venta.anulado), [ventas]);
  const gastosActivos = useMemo(() => gastos.filter((gasto) => !gasto.anulado), [gastos]);

  const totalVentas = useMemo(
    () => ventasActivas.reduce((sum, venta) => sum + parseNumber(venta.monto_bruto), 0),
    [ventasActivas],
  );

  const presupuestoParaGastos = totalVentas / 3;

  const gastosAgrupados = useMemo(() => {
    const sal = new Map<string, number>();
    const op = new Map<string, number>();

    gastosActivos.forEach((gasto) => {
      const key = normalizeCategory(gasto.categoria);
      const amount = parseNumber(gasto.monto);
      const bucket = salaryKeywords.test(key) ? sal : op;
      bucket.set(key, (bucket.get(key) ?? 0) + amount);
    });

    return {
      salarios: Array.from(sal.entries()).map(([concepto, total]) => ({ concepto, total })),
      operativos: Array.from(op.entries()).map(([concepto, total]) => ({ concepto, total })),
    };
  }, [gastosActivos]);

  const totalSalarios = gastosAgrupados.salarios.reduce((sum, item) => sum + item.total, 0);
  const totalGastosOperativos = gastosAgrupados.operativos.reduce((sum, item) => sum + item.total, 0);
  const totalGastosMes = totalSalarios + totalGastosOperativos;
  const margenRestante = presupuestoParaGastos - totalGastosMes;
  const totalPorcentajes = directivos.reduce((sum, directivo) => sum + directivo.monto, 0);
  const ahorroMes = margenRestante - totalPorcentajes;
  const sumaTotalAhorroAcumulado = ahorroHistoricoAnterior + ahorroMes;

  const updateDirectivo = (index: number, nextValue: number) => {
    setDirectivos((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        return { ...item, monto: Number.isFinite(nextValue) ? nextValue : 0 };
      }),
    );
  };

  const exportPayload = {
    fechaDesde,
    fechaHasta,
    totalVentas,
    presupuestoParaGastos,
    totalSalarios,
    totalGastosOperativos,
    totalGastosMes,
    margenRestante,
    directivos,
    totalPorcentajes,
    ahorroMes,
    ahorroHistoricoAnterior,
    sumaTotalAhorroAcumulado,
    salarios: gastosAgrupados.salarios,
    gastosOperativos: gastosAgrupados.operativos,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/80 p-4 md:flex-row md:items-center md:justify-between lg:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-300">Cierre mensual</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Cierre Mensual de Utilidades, Bonificaciones y Fondos de Ahorro</h2>
            <p className="mt-2 text-sm text-slate-300">
              Ventas del {formatDate(fechaDesde)} al {formatDate(fechaHasta)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportarCierreMensualExcel(exportPayload)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:border-blue-500 hover:text-blue-300"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => exportarCierreMensualPDF(exportPayload)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:border-orange-500 hover:text-orange-300"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-4 lg:p-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Total ventas</p>
            <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(totalVentas)}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Presupuesto gastos</p>
            <p className="mt-3 text-2xl font-semibold text-blue-300">{formatCurrency(presupuestoParaGastos)}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Margen restante</p>
            <p className={`mt-3 text-2xl font-semibold ${margenRestante >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {formatCurrency(margenRestante)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Ahorro neto</p>
            <p className={`mt-3 text-2xl font-semibold ${ahorroMes >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {formatCurrency(ahorroMes)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Gastos del Mes</h3>
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                {formatCurrency(totalGastosMes)}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-medium">Concepto</th>
                    <th className="px-3 py-3 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-800 bg-slate-900/30">
                    <td className="px-3 py-3 text-slate-200">Salarios y Planillas</td>
                    <td className="px-3 py-3 text-right font-mono text-orange-300">{formatCurrency(totalSalarios)}</td>
                  </tr>

                  {gastosAgrupados.operativos.length > 0 ? (
                    gastosAgrupados.operativos.map((item) => (
                      <tr key={item.concepto} className="border-t border-slate-800 bg-slate-900/20">
                        <td className="px-3 py-3 text-slate-200">{item.concepto}</td>
                        <td className="px-3 py-3 text-right font-mono text-cyan-300">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-800 bg-slate-900/20">
                      <td colSpan={2} className="px-3 py-3 text-sm text-slate-400">Sin gastos operativos registrados.</td>
                    </tr>
                  )}

                  <tr className="border-t border-slate-800 bg-slate-950/70">
                    <td className="px-3 py-3 text-white font-semibold">Total de Gastos del Mes</td>
                    <td className="px-3 py-3 text-right font-mono text-rose-300 font-semibold">{formatCurrency(totalGastosMes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Resumen contable</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <td className="px-3 py-3 text-slate-300">Total de ventas</td>
                    <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(totalVentas)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-900/30">
                    <td className="px-3 py-3 text-slate-300">Presupuesto para gastos</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-300">{formatCurrency(presupuestoParaGastos)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <td className="px-3 py-3 text-slate-300">Total de gastos del mes</td>
                    <td className="px-3 py-3 text-right font-mono text-rose-300">{formatCurrency(totalGastosMes)}</td>
                  </tr>
                  <tr className="bg-slate-950/70">
                    <td className="px-3 py-3 text-slate-200 font-medium">Margen restante</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${margenRestante >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {formatCurrency(margenRestante)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Porcentaje a Recibir</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-medium">Socio</th>
                    <th className="px-3 py-3 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {directivos.map((directivo, index) => (
                    <tr key={directivo.nombre} className="border-t border-slate-800 bg-slate-900/30">
                      <td className="px-3 py-3 text-slate-200">{directivo.nombre}</td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          step="100"
                          value={directivo.monto}
                          onChange={(event) => updateDirectivo(index, Number(event.target.value || 0))}
                          className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-800 bg-slate-950/60">
                    <td className="px-3 py-3 font-medium text-white">Total porcentajes</td>
                    <td className="px-3 py-3 text-right font-mono text-cyan-300">{formatCurrency(totalPorcentajes)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="text-lg font-semibold text-white">Cuentas de Ahorro y Aguinaldo</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-slate-800 bg-slate-950/50">
                    <td className="px-3 py-3 text-slate-300">Ahorro del Mes</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-300">{formatCurrency(ahorroMes)}</td>
                  </tr>
                  <tr className="border-b border-slate-800 bg-slate-900/30">
                    <td className="px-3 py-3 text-slate-300">Ahorro Histórico Anterior</td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        step="100"
                        value={ahorroHistoricoAnterior}
                        onChange={(event) => setAhorroHistoricoAnterior(Number(event.target.value || 0))}
                        className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                  <tr className="bg-slate-950/70">
                    <td className="px-3 py-3 font-medium text-white">Suma Total Ahorro Acumulado</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-300 font-semibold">{formatCurrency(sumaTotalAhorroAcumulado)}</td>
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
