'use client';

import { BarChart3, Printer, X } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="report-print-overlay fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-3 py-4 backdrop-blur-md" data-report-overlay>
      <div id="report-printable-area" className="report-modal report-printable-area liquid-glass relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10 md:p-8" data-report-container data-report-content data-report-modal>
        <header className="report-executive-header flex flex-nowrap items-start justify-between gap-6 border-b-2 border-orange-500/70 px-5 py-4 sm:px-7 print:flex print:flex-row print:flex-nowrap print:justify-between print:w-full">
          <div className="flex min-w-0 flex-col">
            <p className="text-2xl font-black tracking-wide text-blue-900 dark:text-white md:text-3xl">ERP FARMACIAS</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-600">Control y recaudación</p>
          </div>
          <div className="flex min-w-0 flex-col items-end gap-3 text-right">
            <div className="no-print flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Guardar PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="no-print rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20"
                aria-label="Cerrar reporte"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="report-header-info mt-1 text-right print:block print:text-right">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reporte de Ventas</h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Filtros: {formatDate(fechaDesde)} - {formatDate(fechaHasta)} · {farmaciaLabel}
              </p>
            </div>
          </div>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="report-summary-grid mb-6 flex w-full flex-col gap-6 md:flex-row print:flex print:flex-row print:flex-nowrap print:w-full">
            <section className="report-kpi-panel w-full rounded-2xl bg-blue-800 p-5 text-white shadow-lg shadow-blue-900/20 md:w-5/12 print:w-[45%]">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-orange-200">Resumen de Recaudación</h3>
              <div className="flex flex-col gap-2">
                {[
                  ['Total de Cortes', String(ventas.length)],
                  ['Venta Consolidada', formatCurrency(totalGeneral)],
                  ['Bono Total (1%)', formatCurrency(cascade.bonoTotalFarmacias)],
                  ['Bono Bodega (40%)', formatCurrency(cascade.bonoBodega)],
                  ['Bono Dependientes', formatCurrency(cascade.bonoDependientes)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 border-b border-blue-700/50 pb-1.5 text-sm">
                    <span className="text-blue-100">{label}</span>
                    <span className="font-mono font-bold tabular-nums text-white">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="report-chart-container w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 md:w-7/12 print:w-[55%]">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-semibold text-slate-800">Comparativa por período</h3>
              </div>
              <div className="report-chart flex h-40 max-h-40 w-full items-end gap-3 overflow-x-auto border-b border-slate-200 px-2 pb-2 print:h-[140px] print:max-h-[140px]">
                {periodos.length === 0 ? (
                  <p className="m-auto text-sm text-slate-500">No hay ventas para los filtros seleccionados.</p>
                ) : periodos.map((periodo) => (
                  <div key={periodo.key} className="flex h-full min-w-20 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-mono text-blue-900">{formatCurrency(periodo.total)}</span>
                    <div
                      className="w-full max-w-16 rounded-t-lg bg-blue-600"
                      style={{ height: `${Math.max((periodo.total / maxPeriodo) * 100, 4)}%` }}
                      title={`${periodo.label}: ${formatCurrency(periodo.total)}`}
                    />
                    <span className="max-w-24 truncate text-center text-[10px] capitalize text-slate-600">{periodo.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="report-table-wrapper overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[680px] table-fixed text-left text-sm">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="w-[35%] px-4 py-3 text-xs uppercase tracking-wider">Período</th>
                  <th className="w-[25%] px-4 py-3 text-left text-xs uppercase tracking-wider">Sucursal</th>
                  <th className="w-[15%] px-4 py-3 text-center text-xs uppercase tracking-wider">Cortes</th>
                  <th className="w-[25%] px-4 py-3 text-right text-xs uppercase tracking-wider">Subtotal período</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo) => (
                  <tr key={periodo.key} className="border-b border-slate-100 bg-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold capitalize text-slate-700 dark:text-slate-300">{periodo.label}</td>
                    <td className="px-4 py-3 text-left text-slate-700 dark:text-slate-300">{farmaciaLabel}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{periodo.ventas.length}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(periodo.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-orange-500 bg-slate-50 font-bold text-blue-900 dark:bg-slate-800 dark:text-white">
                  <td colSpan={2} className="px-4 py-3 font-bold uppercase tracking-wider">Total general</td>
                  <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">{ventas.length}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">{formatCurrency(totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 10mm 12mm 8mm 12mm;
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
          header:not(.report-executive-header) {
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

          .report-executive-header {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            padding: 0 0 0.4rem !important;
            margin-bottom: 0.5rem !important;
            border-bottom: 2px solid #f97316 !important;
            background: transparent !important;
            color: #0f172a !important;
          }

          .report-executive-header p:first-child {
            color: #1e3a8a !important;
            font-size: 20px !important;
            line-height: 1 !important;
          }

          .report-executive-header h2 {
            color: #0f172a !important;
            font-size: 16px !important;
          }

          .report-executive-header p {
            color: #475569 !important;
            font-size: 10px !important;
          }

          .report-executive-header .text-blue-900,
          .report-executive-header [class*="text-blue-"] {
            color: #1e3a8a !important;
          }

          .report-executive-header .text-orange-600,
          .report-executive-header [class*="text-orange-"] {
            color: #f97316 !important;
          }

          .report-summary-grid {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
            gap: 0.75rem !important;
            margin-bottom: 0.75rem !important;
          }

          .report-kpi-panel {
            width: 45% !important;
            flex: 0 0 45% !important;
            padding: 0.7rem !important;
            background: #1e3a8a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .report-kpi-panel h3 {
            margin-bottom: 0.45rem !important;
            color: #fed7aa !important;
            font-size: 11px !important;
          }

          .report-kpi-panel > div {
            gap: 0.25rem !important;
          }

          .report-kpi-panel > div > div {
            padding-bottom: 0.2rem !important;
            font-size: 10px !important;
            line-height: 1.15 !important;
          }

          .report-kpi-panel,
          .report-kpi-panel * {
            color: #ffffff !important;
          }

          .report-kpi-panel span:first-child {
            color: #dbeafe !important;
          }

          .report-kpi-panel .text-orange-200,
          .report-kpi-panel [class*="text-orange-"] {
            color: #fed7aa !important;
          }

          .report-kpi-panel .text-white,
          .report-kpi-panel [class*="text-white"] {
            color: #ffffff !important;
          }

          .report-chart-container {
            width: 55% !important;
            flex: 0 0 55% !important;
          }

          .report-header-kpis {
            page-break-after: avoid;
            break-after: avoid;
            margin-bottom: 0.3rem !important;
          }

          .report-chart-container {
            page-break-inside: avoid;
            break-inside: avoid;
            max-height: 160px !important;
            margin-bottom: 0 !important;
            padding: 0.55rem !important;
            border-color: #dbeafe !important;
            background: #ffffff !important;
          }

          .report-chart-container h3,
          .report-chart-container svg {
            color: #1e3a8a !important;
          }

          .report-chart {
            height: 120px !important;
            max-height: 120px !important;
            overflow: hidden !important;
            background: white !important;
          }

          .report-chart > div {
            background: #1e3a8a !important;
            box-shadow: none !important;
          }

          .report-table-wrapper {
            overflow: visible !important;
            border-color: #cbd5e1 !important;
          }

          table {
            width: 100% !important;
            min-width: 0 !important;
            margin-bottom: 0 !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
            background: #1e293b !important;
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
            background: #1e293b !important;
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
        }
      `}</style>
    </div>
  );
}
