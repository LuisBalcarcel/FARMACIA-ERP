import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportSummary = {
  ventasBrutas: number;
  inversion: number;
  gananciaBruta: number;
  gastosTotales: number;
  gananciaNeta: number;
  limiteTercio: number;
  cumplimiento: string;
};

export type ExportEmpleadoRow = {
  colaborador: string;
  puesto: string;
  area: string;
  sucursal?: string;
  ventaIndividual: number;
  salarioBase: number;
  porcentajeComision: number;
  comisionGanada: number;
  bonoMeta?: number;
  retencionIgss?: number;
  liquidoPagar?: number;
  porcentajeMeta?: number;
  totalDevengado: number;
};

export type ExportGastoRow = {
  fecha: string;
  categoria: string;
  descripcion: string;
  tipo: 'Local' | 'Corporativo';
  monto: number;
};

export type ExportReporteData = {
  fechaInicio: string;
  fechaFin: string;
  rangoTexto: string;
  sucursal: string;
  resumen: ExportSummary;
  nomina: ExportEmpleadoRow[];
  gastos: ExportGastoRow[];
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | undefined): string => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getCurrentDateStamp = (): string => new Date().toISOString().slice(0, 10);

const buildResumenSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const summaryRows = [
    ['Reporte Financiero', 'Farmacias ERP'],
    ['Rango de fechas', data.rangoTexto],
    ['Sucursal', data.sucursal],
    ['Ventas Brutas', formatCurrency(data.resumen.ventasBrutas)],
    ['Inversión', formatCurrency(data.resumen.inversion)],
    ['Ganancia Bruta', formatCurrency(data.resumen.gananciaBruta)],
    ['Gastos Totales', formatCurrency(data.resumen.gastosTotales)],
    ['Ganancia Neta', formatCurrency(data.resumen.gananciaNeta)],
    ['Límite del tercio presupuestario', formatCurrency(data.resumen.limiteTercio)],
    ['Estado de cumplimiento', data.resumen.cumplimiento],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(summaryRows);
  sheet['!cols'] = [
    { wch: 28 },
    { wch: 24 },
  ];

  return sheet;
};

const buildNominaSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = data.nomina.map((row) => ({
    Colaborador: row.colaborador,
    Sucursal: row.sucursal ?? 'Sin sucursal',
    Puesto: row.puesto,
    Área: row.area,
    'Venta Registrada': formatCurrency(row.ventaIndividual),
    'Salario Base': formatCurrency(row.salarioBase),
    '% Meta Alcanzado': `${(row.porcentajeMeta ?? 0).toFixed(1)}%`,
    '% Comisión': `${(row.porcentajeComision * 100).toFixed(2)}%`,
    'Comisión Ganada': formatCurrency(row.comisionGanada),
    'Bono Meta': formatCurrency(row.bonoMeta ?? 0),
    'Retención IGSS': formatCurrency(row.retencionIgss ?? 0),
    'Líquido a Pagar': formatCurrency(row.liquidoPagar ?? row.totalDevengado),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      'Colaborador',
      'Sucursal',
      'Puesto',
      'Área',
      'Venta Registrada',
      'Salario Base',
      '% Meta Alcanzado',
      '% Comisión',
      'Comisión Ganada',
      'Bono Meta',
      'Retención IGSS',
      'Líquido a Pagar',
    ],
  });

  sheet['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
  ];

  return sheet;
};

const buildGastosSheet = (data: ExportReporteData): XLSX.WorkSheet => {
  const rows = data.gastos.map((gasto) => ({
    Fecha: formatDate(gasto.fecha),
    Categoría: gasto.categoria,
    Descripción: gasto.descripcion,
    Tipo: gasto.tipo,
    Monto: formatCurrency(gasto.monto),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Fecha', 'Categoría', 'Descripción', 'Tipo', 'Monto'],
  });

  sheet['!cols'] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
  ];

  return sheet;
};

export const exportarReporteExcel = (data: ExportReporteData): void => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildResumenSheet(data), 'Resumen Ejecutivo');
  XLSX.utils.book_append_sheet(workbook, buildNominaSheet(data), 'Nómina y Comisiones');
  XLSX.utils.book_append_sheet(workbook, buildGastosSheet(data), 'Gastos Operativos');

  const filename = `Reporte_Financiero_Farmacias_${getCurrentDateStamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

export const exportarReportePDF = (data: ExportReporteData): void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INFORME EJECUTIVO Y FINANCIERO', pageWidth / 2, 15, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rango evaluado: ${data.rangoTexto}`, 14, 34);
  doc.text(`Sucursal: ${data.sucursal}`, 14, 40);
  doc.text(`Fecha/Hora de emisión: ${new Date().toLocaleString('es-GT')}`, 14, 46);

  const resumenRows = [
    ['Ventas', formatCurrency(data.resumen.ventasBrutas)],
    ['Costos', formatCurrency(data.resumen.inversion)],
    ['Utilidad Bruta', formatCurrency(data.resumen.gananciaBruta)],
    ['Gastos Totales', formatCurrency(data.resumen.gastosTotales)],
    ['Utilidad Neta', formatCurrency(data.resumen.gananciaNeta)],
    ['Límite 33.3%', formatCurrency(data.resumen.limiteTercio)],
    ['Diagnóstico', data.resumen.cumplimiento],
  ];

  autoTable(doc, {
    startY: 54,
    head: [['Indicador', 'Valor']],
    body: resumenRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const firstTableY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 54;

  autoTable(doc, {
    startY: firstTableY + 12,
    head: [['Colaborador', 'Sucursal', 'Puesto', 'Área', 'Venta', 'Salario Base', '% Meta', 'Comisión', 'Bono Meta', 'IGSS', 'Líquido']],
    body: data.nomina.map((row) => [
      row.colaborador,
      row.sucursal ?? 'Sin sucursal',
      row.puesto,
      row.area,
      formatCurrency(row.ventaIndividual),
      formatCurrency(row.salarioBase),
      `${(row.porcentajeMeta ?? 0).toFixed(1)}%`,
      formatCurrency(row.comisionGanada),
      formatCurrency(row.bonoMeta ?? 0),
      formatCurrency(row.retencionIgss ?? 0),
      formatCurrency(row.liquidoPagar ?? row.totalDevengado),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    didDrawPage: (dataTable) => {
      const total = data.nomina.reduce((sum, row) => sum + (row.liquidoPagar ?? row.totalDevengado), 0);
      if (dataTable.pageNumber === doc.getNumberOfPages() && dataTable.cursor) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Total general: ${formatCurrency(total)}`, pageWidth - 14, dataTable.cursor.y + 8, { align: 'right' });
      }
    },
  });

  const secondTableY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 54;
  const gastosAgrupados = data.gastos.reduce<Record<string, number>>((accumulator, gasto) => {
    accumulator[gasto.categoria] = (accumulator[gasto.categoria] ?? 0) + gasto.monto;
    return accumulator;
  }, {});

  const gastosRows = Object.entries(gastosAgrupados).map(([categoria, monto]) => [categoria, formatCurrency(monto)]);
  const totalGastosPDF = Object.values(gastosAgrupados).reduce((sum, value) => sum + value, 0);

  autoTable(doc, {
    startY: secondTableY + 10,
    head: [['Categoría', 'Monto']],
    body: [...gastosRows, ['Total general', formatCurrency(totalGastosPDF)]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [127, 29, 29],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [255, 247, 237],
    },
  });

  doc.save(`Informe_Financiero_Farmacias_${getCurrentDateStamp()}.pdf`);
};
