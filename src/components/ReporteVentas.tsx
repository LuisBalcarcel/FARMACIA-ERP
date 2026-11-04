'use client';

import { Printer, X } from 'lucide-react';
import { useMemo } from 'react';
import type { VentaCore } from '@/hooks/useVentasFilter';
import type { BonusCascade } from '@/lib/contabilidad';

type Sucursal = {
  id: string | number;
  nombre: string;
};

type ReporteVentasProps = {
  isOpen: boolean;
  onClose: () => void;
  ventas: VentaCore[];
  sucursales: Sucursal[];
  selectedFarmaciaId: string;
  fechaDesde: string;
  fechaHasta: string;
  cascade: BonusCascade;
};

type PeriodoReporte = {
  key: string;
  label: string;
  ventas: VentaCore[];
  total: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const getDateKey = (venta: VentaCore) =>
  (venta.fecha_inicio_corte ?? venta.fecha_venta ?? '').slice(0, 10);

const getPeriodLabel = (key: string) => {
  const date = new Date(`${key}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? key
    : new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(date);
};

export default function ReporteVentas({
  isOpen,
  onClose,
  ventas,
  sucursales,
  selectedFarmaciaId,
  fechaDesde,
  fechaHasta,
  cascade,
}: ReporteVentasProps) {
  const periodos = useMemo<PeriodoReporte[]>(() => {
    const grouped = new Map<string, VentaCore[]>();

    ventas.forEach((venta) => {
      const dateKey = getDateKey(venta);
      const key = /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey.slice(0, 7) : 'sin-fecha';
      grouped.set(key, [...(grouped.get(key) ?? []), venta]);
    });

    return Array.from(grouped.entries())
      .map(([key, rows]) => ({
        key,
        label: key === 'sin-fecha' ? 'Sin fecha' : getPeriodLabel(key),
        ventas: rows.sort((a, b) => getDateKey(a).localeCompare(getDateKey(b))),
        total: rows.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [ventas]);

  const maxPeriodo = Math.max(...periodos.map((periodo) => periodo.total), 1);
  const farmaciaLabel = selectedFarmaciaId
    ? sucursales.find((sucursal) => String(sucursal.id) === selectedFarmaciaId)?.nombre ?? 'Sucursal seleccionada'
    : 'Todas las sucursales';
  const totalGeneral = ventas.reduce((sum, venta) => sum + Number(venta.monto_bruto ?? 0), 0);
  const sucursalResumen = useMemo(() => {
    const grouped = new Map<string, { nombre: string; total: number; cortes: number }>();

    ventas.forEach((venta) => {
      const id = String(venta.sucursal_id ?? 'sin-sucursal');
      const nombre = sucursales.find((sucursal) => String(sucursal.id) === id)?.nombre ?? 'Sucursal sin nombre';
      const current = grouped.get(id) ?? { nombre, total: 0, cortes: 0 };
      current.total += Number(venta.monto_bruto ?? 0);
      current.cortes += 1;
      grouped.set(id, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [sucursales, ventas]);
  const maxSucursal = Math.max(...sucursalResumen.map((sucursal) => sucursal.total), 1);
  const generatedAt = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const hasBonusDistribution = cascade.bonoBodega > 0 || cascade.bonoDependientes > 0;
  const bonusTotal = cascade.bonoBodega + cascade.bonoDependientes;
  const bodegaShare = bonusTotal > 0 ? (cascade.bonoBodega / bonusTotal) * 100 : 0;
  const chartTitle = ventas.length === 0
    ? 'Visualización'
    : sucursalResumen.length > 1
      ? 'Comparativa por sucursal'
      : periodos.length > 1
        ? 'Tendencia por período'
        : 'Recaudación del período';

  if (!isOpen) return null;

  return (
    <div className="report-print-overlay fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-3 py-4 backdrop-blur-md" data-report-overlay>
      <div id="report-printable-area" className="report-modal report-printable-area relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10 print:rounded-none print:bg-white print:shadow-none print:ring-0" data-report-container data-report-content data-report-modal>
        <div className="report-header-block relative z-10 flex w-full flex-col items-center justify-center rounded-t-2xl border-b-4 border-orange-500 bg-slate-700 px-4 pb-6 pt-6 text-center text-white md:px-8 md:pb-8 md:pt-14 print:rounded-none print:pt-8">
          <div className="z-50 flex w-full items-center justify-end gap-2 p-4 pb-0 md:absolute md:right-4 md:top-4 md:w-auto md:p-0 no-print print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:border-white hover:bg-white/20"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/20 p-1.5 text-white/80 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
            title="Cerrar"
            aria-label="Cerrar reporte"
          >
            <X className="h-5 w-5" />
          </button>
          </div>
          <h1 className="break-words text-center text-2xl font-black uppercase tracking-widest text-white sm:text-3xl md:text-4xl">Reporte de Ventas</h1>
          <p className="mt-2 text-sm font-medium text-white">ERP FARMACIAS - CONTROL Y RECAUDACIÓN</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs text-white sm:flex sm:items-center sm:justify-center sm:gap-6">
            <span><strong className="text-white">Período:</strong> {formatDate(fechaDesde)} - {formatDate(fechaHasta)}</span>
            <span><strong className="text-white">Alcance:</strong> {farmaciaLabel}</span>
            <span><strong className="text-white">Generado:</strong> {generatedAt}</span>
          </div>
        </div>

        <div className="report-scroll-area overflow-y-auto">
          <div className="report-kpi-ribbon grid w-full grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-3 md:grid-cols-5 md:gap-4 md:p-6 print:border-b-2 print:border-slate-300 print:bg-white">
            {[
              ['Total de Cortes', String(ventas.length)],
              ['Venta Consolidada', formatCurrency(totalGeneral)],
              ['Bono Total (1%)', formatCurrency(cascade.bonoTotalFarmacias)],
              ['Bono Bodega (40%)', formatCurrency(cascade.bonoBodega)],
              ['Bono Dependientes', formatCurrency(cascade.bonoDependientes)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 print:text-slate-600">{label}</span>
                <span className="mt-1 font-mono text-lg font-black tabular-nums text-blue-900 dark:text-white print:text-blue-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="report-table-section w-full overflow-x-auto pb-2 p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full min-w-[600px] table-fixed border-collapse border border-slate-300 text-left text-sm dark:border-slate-600 print:border-slate-400">
              <thead className="bg-slate-700">
                <tr>
                  <th className="w-[35%] border border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white dark:border-slate-600 print:border-slate-400">Período</th>
                  <th className="w-[25%] border border-slate-300 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white dark:border-slate-600 print:border-slate-400">Sucursal</th>
                  <th className="w-[15%] border border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white dark:border-slate-600 print:border-slate-400">Cortes</th>
                  <th className="w-[25%] border border-slate-300 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white dark:border-slate-600 print:border-slate-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo) => (
                  <tr key={periodo.key} className="border-b border-slate-300 transition-colors even:bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:even:bg-slate-800/50">
                    <td className="border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200 print:border-slate-400 print:text-slate-800">{periodo.label}</td>
                    <td className="border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200 print:border-slate-400 print:text-slate-800">{farmaciaLabel}</td>
                    <td className="border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200 print:border-slate-400 print:text-slate-800">{periodo.ventas.length}</td>
                    <td className="border border-slate-300 px-4 py-2 text-right text-sm font-mono font-semibold tabular-nums text-slate-700 dark:border-slate-600 dark:text-slate-200 print:border-slate-400 print:text-slate-800">{formatCurrency(periodo.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-orange-500 bg-slate-100 font-bold text-blue-900 dark:bg-slate-800 dark:text-white">
                  <td colSpan={2} className="border border-slate-300 px-4 py-2 font-bold uppercase tracking-wider dark:border-slate-600">Total general</td>
                  <td className="border border-slate-300 px-4 py-2 text-center font-mono font-bold tabular-nums dark:border-slate-600">{ventas.length}</td>
                  <td className="border border-slate-300 px-4 py-2 text-right font-mono font-bold tabular-nums dark:border-slate-600">{formatCurrency(totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <section className="report-chart-container w-full overflow-hidden border-t border-slate-200 p-4 dark:border-slate-700 md:p-6 print:mt-4 print:border-none">
            <h3 className="mb-6 text-center text-lg font-bold uppercase tracking-wide text-blue-900 dark:text-white print:text-blue-900">{chartTitle}</h3>
            <div className="report-chart flex h-64 max-h-64 w-full items-end gap-3 overflow-x-auto border-b border-slate-200 bg-white px-2 pb-2 dark:bg-transparent print:h-[200px] print:max-h-[200px]">
              {ventas.length === 0 ? (
                <p className="m-auto text-sm font-medium text-slate-500">Datos insuficientes para graficar.</p>
              ) : sucursalResumen.length > 1 ? sucursalResumen.map((sucursal) => (
                <div key={sucursal.nombre} className="flex h-full min-w-24 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-mono text-blue-900">{formatCurrency(sucursal.total)}</span>
                  <div className="w-full max-w-16 rounded-t-lg bg-orange-500" style={{ height: `${Math.max((sucursal.total / maxSucursal) * 100, 4)}%` }} title={`${sucursal.nombre}: ${formatCurrency(sucursal.total)}`} />
                  <span className="max-w-24 truncate text-center text-[10px] text-slate-600">{sucursal.nombre}</span>
                </div>
              )) : periodos.length > 0 ? periodos.map((periodo) => (
                <div key={periodo.key} className="flex h-full min-w-20 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-mono text-blue-900">{formatCurrency(periodo.total)}</span>
                  <div className="w-full max-w-16 rounded-t-lg bg-orange-500" style={{ height: `${Math.max((periodo.total / maxPeriodo) * 100, 4)}%` }} title={`${periodo.label}: ${formatCurrency(periodo.total)}`} />
                  <span className="max-w-24 truncate text-center text-[10px] capitalize text-slate-600">{periodo.label}</span>
                </div>
              )) : (
                <p className="m-auto text-sm font-medium text-slate-500">Datos insuficientes para graficar.</p>
              )}
            </div>
            {hasBonusDistribution && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-600">
                <div
                  className="h-16 w-16 rounded-full"
                  style={{ background: `conic-gradient(#2563eb 0 ${bodegaShare}%, #10b981 ${bodegaShare}% 100%)` }}
                  title={`Distribución de bonos: Bodega ${formatCurrency(cascade.bonoBodega)}, Dependientes ${formatCurrency(cascade.bonoDependientes)}`}
                />
                <div className="flex flex-col gap-1">
                  <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Bodega {formatCurrency(cascade.bonoBodega)}</span>
                  <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Dependientes {formatCurrency(cascade.bonoDependientes)}</span>
                </div>
              </div>
            )}
          </section>
        </div>
        <footer className="report-print-footer hidden print:flex">
          <span>ERP FARMACIAS · Generado {generatedAt}</span>
          <span>Página <span className="report-page-number" /></span>
        </footer>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          html,
          body {
            height: auto !important;
            min-height: 0 !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .report-print-overlay,
          [data-report-overlay],
          #report-printable-area,
          #report-printable-area * {
            visibility: visible !important;
          }

          .report-print-overlay,
          [data-report-overlay],
          .fixed.inset-0 {
            position: static !important;
            display: block !important;
            min-height: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          aside,
          nav,
          button,
          .no-print,
          .print-hidden,
          header,
          .no-print {
            display: none !important;
          }

          .report-modal,
          [data-report-modal],
          .report-modal-content,
          [data-report-content],
          [data-report-container] {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            transform: none !important;
          }

          .report-modal > div,
          [data-report-modal] > div {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .report-printable-area {
            margin-top: 0 !important;
            padding-top: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .report-scroll-area {
            overflow: visible !important;
            max-height: none !important;
            scrollbar-width: none !important;
          }

          .report-scroll-area::-webkit-scrollbar {
            display: none !important;
          }

          .report-header-block {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            padding: 1rem !important;
            margin: 0 !important;
            border-bottom: 4px solid #f97316 !important;
            border-radius: 0 !important;
            background: #334155 !important;
            color: #ffffff !important;
          }

          .report-header-block h1 {
            color: #ffffff !important;
            font-size: 24px !important;
            line-height: 1.1 !important;
          }

          .report-header-block p {
            color: #ffffff !important;
            font-size: 10px !important;
          }

          .report-header-block p:last-child {
            color: #ffffff !important;
          }

          .report-header-block span,
          .report-header-block strong {
            color: #ffffff !important;
          }

          .report-kpi-ribbon {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            width: 100% !important;
            gap: 0.5rem !important;
            padding: 0.75rem !important;
            margin: 0 !important;
            background: #ffffff !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }

          .report-kpi-ribbon > div {
            padding: 0 !important;
            page-break-after: avoid;
            break-after: avoid;
            margin-bottom: 0 !important;
          }

          .report-chart-container {
            page-break-inside: avoid;
            break-inside: avoid;
            width: 100% !important;
            max-height: 200px !important;
            margin: 0 !important;
            padding: 1rem !important;
            border-color: #e2e8f0 !important;
            background: #ffffff !important;
          }

          .report-chart-container h3 {
            color: #1e3a8a !important;
            margin-bottom: 0.5rem !important;
          }

          .report-chart {
            height: 160px !important;
            max-height: 160px !important;
            overflow: hidden !important;
            background: white !important;
          }

          .report-chart > div {
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .report-chart > div > div {
            background: #f97316 !important;
          }

          .report-chart span {
            color: #1e3a8a !important;
          }

          .report-table-section {
            overflow: visible !important;
            width: 100% !important;
            padding: 1rem !important;
          }

          table {
            width: 100% !important;
            min-width: 0 !important;
            margin-bottom: 0 !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .report-chart-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
            background: #334155 !important;
            color: #ffffff !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          th,
          td {
            padding: 0.35rem 0.625rem !important;
            border-bottom: 1px solid #e2e8f0 !important;
            font-size: 11px !important;
            overflow: visible !important;
            white-space: normal !important;
            color: #0f172a !important;
          }

          th {
            background: #334155 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          tfoot td {
            background: #f8fafc !important;
            border-top: 2px solid #f97316 !important;
            font-weight: 700 !important;
          }

          #report-printable-area {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .report-print-footer {
            position: fixed !important;
            right: 0 !important;
            bottom: -10mm !important;
            left: 0 !important;
            justify-content: space-between !important;
            border-top: 1px solid #cbd5e1 !important;
            padding-top: 3px !important;
            color: #475569 !important;
            font-size: 9px !important;
          }

          .report-page-number::after {
            content: counter(page);
          }

          /* Preserve vector fills when printing chart bars. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .recharts-bar-rectangle path,
          .recharts-bar-rectangles path,
          .recharts-rectangle,
          path.recharts-rectangle {
            fill: #f97316 !important;
            fill-opacity: 1 !important;
            stroke: none !important;
          }
        }
      `}</style>
    </div>
  );
}
